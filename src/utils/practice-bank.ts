import type { EvalTrack, FundedTrack } from './prop-tracker';
import type { BacktestSession } from '../types/backtest';

/**
 * The practice bank: play money that pays for practice evaluations and collects their payouts.
 * Only the money the user moves (deposits, allocations, returns) is stored; every fee and payout
 * is worked out from the attempts themselves, so fixing a trade fixes the bank too.
 *
 * A folder the user has never allocated money to pays from (and is paid into) the main bank.
 * Once a folder has had an allocation it has its own balance.
 */

export interface BankEntry {
  id: string;
  /** When it happened (ISO timestamp). */
  at: string;
  kind: 'deposit' | 'allocate' | 'return';
  amount: number;
  /** Allocate / return: the folder the money goes to or comes from. */
  folderId?: string;
}

export interface PracticeBankState {
  entries: BankEntry[];
}

/** One practice attempt, as the bank needs it. */
export interface BankAttempt {
  folderId: string;
  session: BacktestSession;
  track: EvalTrack;
  /** Price of one evaluation (the account price for instant accounts). */
  evalPrice: number;
  funded?: { session: BacktestSession; track: FundedTrack };
}

export interface BankEvent {
  at: string;
  label: string;
  /** + money in, − money out. */
  amount: number;
  /** 'main' or the folder id whose balance it changes. */
  account: string;
  /** Folder the event relates to, if any. */
  folderId?: string;
  /** Money put in from the user's pocket. */
  deposit?: boolean;
  /** Money moved between the main bank and a folder: doesn't change the total. */
  move?: boolean;
  /** Total of all balances after this event. */
  totalAfter: number;
}

export interface BankBadge {
  id: string;
  label: string;
  description: string;
  earned: boolean;
}

export interface BankSummary {
  started: boolean;
  main: number;
  /** Balances of folders with their own money, by folder id. */
  folders: Record<string, number>;
  /** Main + every folder balance. */
  total: number;
  /** Money put in from your pocket (start + top-ups). */
  deposited: number;
  fees: number;
  /** Payouts kept, after the split. */
  received: number;
  /** total − deposited. */
  profit: number;
  /** Biggest fall of the total balance from a high, in $. */
  worstDrop: number;
  events: BankEvent[];
  badges: BankBadge[];
}

export const copiesOf = (s: BacktestSession) => Math.max(1, Math.round(s.copies ?? 1));

/** Folders that have their own balance (they have had an allocation). */
export function foldersWithOwnMoney(entries: BankEntry[]): Set<string> {
  return new Set(entries.filter(e => e.kind === 'allocate' && e.folderId).map(e => e.folderId!));
}

/** The money events an attempt causes: purchase, renewals, activation, payouts. */
export function attemptEvents(a: BankAttempt, folderName: string): Omit<BankEvent, 'account' | 'totalAfter'>[] {
  const n = copiesOf(a.session);
  const times = n > 1 ? ` ×${n}` : '';
  const name = `${folderName} · ${a.session.name}`;
  const out: Omit<BankEvent, 'account' | 'totalAfter'>[] = [];
  out.push({ at: a.session.createdAt, label: `${name}: bought${times}`, amount: -a.evalPrice * n, folderId: a.folderId });
  const renewals = a.track.fees - a.evalPrice;
  if (renewals > 0.005) {
    out.push({ at: a.session.updatedAt || a.session.createdAt, label: `${name}: monthly renewals${times}`, amount: -renewals * n, folderId: a.folderId });
  }
  if (a.funded) {
    const f = a.funded;
    if (f.track.fees > 0) out.push({ at: f.session.createdAt, label: `${name}: activation fee${times}`, amount: -f.track.fees * n, folderId: a.folderId });
    (f.session.payouts ?? []).forEach((p, i) => {
      out.push({
        at: p.recordedAt ?? f.session.updatedAt ?? f.session.createdAt,
        label: `${name}: payout ${i + 1}${times}`,
        amount: p.received * n,
        folderId: a.folderId,
      });
    });
  }
  return out;
}

export function computeBank(state: PracticeBankState | undefined, attempts: BankAttempt[], folderNames: Record<string, string>): BankSummary {
  const entries = state?.entries ?? [];
  const own = foldersWithOwnMoney(entries);
  const raw: Omit<BankEvent, 'totalAfter'>[] = [];

  for (const e of entries) {
    const name = e.folderId ? folderNames[e.folderId] ?? 'Deleted folder' : '';
    if (e.kind === 'deposit') raw.push({ at: e.at, label: 'Money added', amount: e.amount, account: 'main', deposit: true });
    if (e.kind === 'allocate' && e.folderId) {
      raw.push({ at: e.at, label: `Allocated to ${name}`, amount: -e.amount, account: 'main', folderId: e.folderId, move: true });
      raw.push({ at: e.at, label: `Allocated from bank`, amount: e.amount, account: e.folderId, folderId: e.folderId, move: true });
    }
    if (e.kind === 'return' && e.folderId) {
      raw.push({ at: e.at, label: `Returned to bank`, amount: -e.amount, account: e.folderId, folderId: e.folderId, move: true });
      raw.push({ at: e.at, label: `Returned from ${name}`, amount: e.amount, account: 'main', folderId: e.folderId, move: true });
    }
  }
  for (const a of attempts) {
    for (const ev of attemptEvents(a, folderNames[a.folderId] ?? 'Folder')) {
      raw.push({ ...ev, account: own.has(a.folderId) ? a.folderId : 'main' });
    }
  }

  // Stable sort by time: entries first at equal times, so a deposit made "now" pays for a purchase made "now"
  const sorted = raw.map((e, i) => ({ e, i })).sort((x, y) => x.e.at.localeCompare(y.e.at) || x.i - y.i).map(x => x.e);

  const balances: Record<string, number> = { main: 0 };
  for (const id of own) balances[id] = 0;
  let total = 0, high = 0, worstDrop = 0;
  let deposited = 0, fees = 0, received = 0;
  const events: BankEvent[] = sorted.map(e => {
    balances[e.account] = (balances[e.account] ?? 0) + e.amount;
    // Moves between main and folders net to zero; only deposits, fees and payouts change the total
    if (!e.move) {
      total += e.amount;
      if (e.deposit) deposited += e.amount;
      else if (e.amount < 0) fees -= e.amount;
      else received += e.amount;
    }
    high = Math.max(high, total);
    worstDrop = Math.max(worstDrop, high - total);
    return { ...e, totalAfter: total };
  });

  const { main, ...folders } = balances;
  // Instant accounts start "passed" with no trading days; they don't count as a pass
  const passed = attempts.some(a => a.track.status === 'passed' && a.track.days > 0);
  const payoutsOnOne = Math.max(0, ...attempts.map(a => a.funded?.track.payoutsTaken ?? 0));
  const badges: BankBadge[] = [
    { id: 'first-pass', label: 'First pass', description: 'Passed an evaluation', earned: passed },
    { id: 'first-payout', label: 'First payout', description: 'Got paid from a funded account', earned: received > 0 },
    { id: 'fees-back', label: 'Fees paid back', description: 'Payouts have covered every fee so far', earned: received > 0 && received >= fees },
    { id: 'five-payouts', label: '5 payouts', description: 'Five payouts from one funded account', earned: payoutsOnOne >= 5 },
    { id: 'doubled', label: 'Bank doubled', description: 'Total balance is twice what you put in', earned: deposited > 0 && total >= 2 * deposited },
  ];

  return {
    started: entries.length > 0,
    main,
    folders,
    total,
    deposited,
    fees,
    received,
    profit: total - deposited,
    worstDrop,
    events,
    badges,
  };
}

/** Money a folder can spend right now: its own balance, or the main bank's if it has none. */
export function spendable(bank: BankSummary, folderId: string): { amount: number; fromMain: boolean } {
  return folderId in bank.folders ? { amount: bank.folders[folderId], fromMain: false } : { amount: bank.main, fromMain: true };
}

/** $ with cents only when there are any. */
export const bankMoney = (x: number) =>
  `${x < -0.004 ? '-' : ''}$${Math.abs(Math.round(x * 100) / 100).toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
