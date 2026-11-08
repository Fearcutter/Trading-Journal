import type { Trade } from '../types/trade';
import {
  Account, playDay, consistencyOk, countsTowardPayout, payoutCycleReady, payoutAvailable, cycleProfitNeeded,
  TRADING_DAYS_PER_MONTH, type FirmConfig,
} from './prop-ev';
import type { PracticePayout } from '../types/backtest';

/**
 * Practice tracking: runs a backtest attempt's real trades (their $ P&L) through a firm's
 * rules the same way the Prop Firm EV simulator does, so practice and simulation agree.
 */

export type EvalStatus = 'active' | 'passed' | 'blown' | 'timeout';

export interface DayResult {
  date: string;
  pl: number;
  /** Trades that day the firm wouldn't have allowed (after the daily loss limit or the end). */
  ignored: number;
  dailyLimitHit: boolean;
}

export interface EvalTrack {
  status: EvalStatus;
  start: number;
  balance: number;
  profit: number;
  floor: number;
  floorLocked: boolean;
  target: number;
  days: number;
  maxDays: number | null;
  minDays: number;
  bestDay: number;
  consistencyPct: number | null;
  consistencyOk: boolean;
  /** Profit needed for the best day to fit the best-day rule. */
  profitNeededForConsistency: number | null;
  dailyLossLimit: number | null;
  lastDay: DayResult | null;
  dayResults: DayResult[];
  /** Date the attempt passed, blew or ran out of days. */
  endedOn: string | null;
  /** Trades after the attempt ended or after a daily limit stop; they don't count. */
  ignoredTrades: number;
  fees: number;
}

/** Trades grouped by date, oldest first, in time order within a day. */
export function groupTradesByDay(trades: Trade[]): { date: string; trades: Trade[] }[] {
  const byDate = new Map<string, Trade[]>();
  for (const t of trades) {
    const list = byDate.get(t.date) ?? [];
    list.push(t);
    byDate.set(t.date, list);
  }
  return [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, list]) => ({ date, trades: [...list].sort((a, b) => (a.time || '').localeCompare(b.time || '')) }));
}

/** Evaluation fees after `days` trading days: the price, plus a renewal every 20 trading days if monthly. */
export function evalFees(cfg: FirmConfig, days: number): number {
  if (cfg.eval.billing !== 'monthly') return cfg.eval.fee;
  return cfg.eval.fee * (1 + Math.floor(Math.max(0, days - 1) / TRADING_DAYS_PER_MONTH));
}

export function trackEval(trades: Trade[], cfg: FirmConfig): EvalTrack {
  const ev = cfg.eval;
  const acct = new Account(cfg.size, ev.drawdown);
  const dayResults: DayResult[] = [];
  let status: EvalStatus = 'active';
  let endedOn: string | null = null;
  let bestDay = 0;
  let ignoredTrades = 0;
  if (cfg.instant) status = 'passed';

  for (const { date, trades: dayTrades } of groupTradesByDay(trades)) {
    if (status !== 'active') {
      ignoredTrades += dayTrades.length;
      continue;
    }
    const { pl, blown, stoppedAt } = playDay(acct, dayTrades.map(t => t.dollarPL || 0), x => x, ev.dailyLossLimit);
    const ignored = stoppedAt === null ? 0 : dayTrades.length - stoppedAt - 1;
    ignoredTrades += ignored;
    dayResults.push({ date, pl, ignored, dailyLimitHit: !blown && stoppedAt !== null });
    bestDay = Math.max(bestDay, pl);
    const profit = acct.balance - cfg.size;
    if (blown) {
      status = 'blown';
      endedOn = date;
    } else if (profit >= ev.profitTarget && dayResults.length >= ev.minDays && consistencyOk(bestDay, profit, ev.consistencyPct)) {
      status = 'passed';
      endedOn = date;
    } else if (ev.maxDays !== null && dayResults.length >= ev.maxDays) {
      status = 'timeout';
      endedOn = date;
    }
  }

  const profit = acct.balance - cfg.size;
  return {
    status,
    start: cfg.size,
    balance: acct.balance,
    profit,
    floor: acct.floor,
    floorLocked: acct.locked,
    target: ev.profitTarget,
    days: dayResults.length,
    maxDays: ev.maxDays,
    minDays: ev.minDays,
    bestDay,
    consistencyPct: ev.consistencyPct,
    consistencyOk: consistencyOk(bestDay, profit, ev.consistencyPct),
    profitNeededForConsistency: ev.consistencyPct ? bestDay / (ev.consistencyPct / 100) : null,
    dailyLossLimit: ev.dailyLossLimit,
    lastDay: dayResults[dayResults.length - 1] ?? null,
    dayResults,
    endedOn,
    ignoredTrades,
    fees: evalFees(cfg, dayResults.length),
  };
}

export type FundedStatus = 'active' | 'blown' | 'finished';

export interface FundedTrack {
  status: FundedStatus;
  start: number;
  balance: number;
  floor: number;
  floorLocked: boolean;
  days: number;
  dailyLossLimit: number | null;
  lastDay: DayResult | null;
  endedOn: string | null;
  ignoredTrades: number;
  /** Current payout cycle. */
  cycleDays: number;
  cycleDaysNeeded: number;
  cycleProfit: number;
  cycleProfitNeeded: number;
  cycleBest: number;
  consistencyPct: number | null;
  consistencyOk: boolean;
  /** Could take a payout right now. */
  eligible: boolean;
  /** Most that could be withdrawn now (before the split), even if not yet eligible. */
  available: number;
  /** What the trader would keep of `available`. */
  availableReceived: number;
  minPayout: number;
  payoutsTaken: number;
  maxPayouts: number | null;
  received: number;
  fees: number;
}

/**
 * The funded account: its own trades in date order, then any trades copied from another
 * account after linking (in their date order). A payout counts at the end of its trading day:
 * `dayIndex` when recorded on a copy-traded account, otherwise its date among the account's own days.
 * Payout eligibility uses the same rules as the simulator.
 */
export function trackFunded(trades: Trade[], cfg: FirmConfig, payouts: PracticePayout[] = [], copied: Trade[] = []): FundedTrack {
  const f = cfg.funded;
  const acct = new Account(cfg.size, f.drawdown);
  const ownDays = groupTradesByDay(trades);
  const allDays = [...ownDays, ...groupTradesByDay(copied)];
  // Trading days played before each payout
  const at = (po: PracticePayout) => (copied.length && po.dayIndex !== undefined
    ? po.dayIndex
    : ownDays.filter(d => d.date <= po.date).length);
  const queue = payouts.map((po, i) => ({ po, idx: at(po), i })).sort((a, b) => a.idx - b.idx || a.i - b.i);
  let status: FundedStatus = 'active';
  let endedOn: string | null = null;
  let ignoredTrades = 0;
  let days = 0;
  let lastDay: DayResult | null = null;
  let cycleDays = 0, cycleProfit = 0, cycleBest = 0;
  let taken = 0;
  let received = 0;
  let p = 0;

  // Apply recorded payouts due after `played` trading days
  const applyPayouts = (played: number) => {
    while (status === 'active' && p < queue.length && queue[p].idx <= played) {
      const po = queue[p++].po;
      acct.balance -= po.gross;
      acct.freeze();
      received += po.received;
      taken++;
      cycleDays = 0; cycleProfit = 0; cycleBest = 0;
      if (f.maxPayouts !== null && taken >= f.maxPayouts) { status = 'finished'; endedOn = po.date; }
    }
  };

  for (const { date, trades: dayTrades } of allDays) {
    applyPayouts(days);
    if (status !== 'active') { ignoredTrades += dayTrades.length; continue; }
    const { pl, blown, stoppedAt } = playDay(acct, dayTrades.map(t => t.dollarPL || 0), x => x, f.dailyLossLimit);
    const ignored = stoppedAt === null ? 0 : dayTrades.length - stoppedAt - 1;
    ignoredTrades += ignored;
    lastDay = { date, pl, ignored, dailyLimitHit: !blown && stoppedAt !== null };
    days++;
    if (blown) { status = 'blown'; endedOn = date; continue; }
    cycleProfit += pl;
    cycleBest = Math.max(cycleBest, pl);
    if (countsTowardPayout(pl, f)) cycleDays++;
  }
  applyPayouts(Infinity);

  const available = status === 'active' ? payoutAvailable(acct.balance, acct.floor, cfg.size, f, taken) : 0;
  const ready = payoutCycleReady(cycleDays, cycleProfit, cycleBest, f, taken);
  return {
    status,
    start: cfg.size,
    balance: acct.balance,
    floor: acct.floor,
    floorLocked: acct.locked,
    days,
    dailyLossLimit: f.dailyLossLimit,
    lastDay,
    endedOn,
    ignoredTrades,
    cycleDays,
    cycleDaysNeeded: f.minDaysPerPayout,
    cycleProfit,
    cycleProfitNeeded: cycleProfitNeeded(f, taken),
    cycleBest,
    consistencyPct: f.consistencyPct,
    consistencyOk: consistencyOk(cycleBest, cycleProfit, f.consistencyPct),
    eligible: status === 'active' && ready && available >= Math.max(f.minPayout, 1),
    available,
    availableReceived: Math.round(available * f.split * 100) / 100,
    minPayout: f.minPayout,
    payoutsTaken: taken,
    maxPayouts: f.maxPayouts,
    received,
    fees: f.activationFee,
  };
}

export interface FolderScore {
  attempts: number;
  passed: number;
  blown: number;
  timedOut: number;
  active: number;
  /** Of finished attempts (passed, blown or out of days). */
  passRate: number | null;
  medianDaysToPass: number | null;
  fees: number;
}

export function scoreEvals(tracks: EvalTrack[]): FolderScore {
  const count = (s: EvalStatus) => tracks.filter(t => t.status === s).length;
  const passed = count('passed');
  const blown = count('blown');
  const timedOut = count('timeout');
  const finished = passed + blown + timedOut;
  const passDays = tracks.filter(t => t.status === 'passed').map(t => t.days).sort((a, b) => a - b);
  return {
    attempts: tracks.length,
    passed,
    blown,
    timedOut,
    active: count('active'),
    passRate: finished ? passed / finished : null,
    medianDaysToPass: passDays.length ? passDays[Math.floor(passDays.length / 2)] : null,
    fees: tracks.reduce((s, t) => s + t.fees, 0),
  };
}

export interface PracticeScore extends FolderScore {
  fundedStarted: number;
  fundedBlown: number;
  payouts: number;
  /** Money kept from payouts, after the split. */
  received: number;
  /** Attempts that led to at least one payout. */
  gotPaid: number;
  /** Of all attempts. */
  paidRate: number | null;
  /** Evaluation fees plus activation fees. */
  totalFees: number;
  /** (Received − all fees) ÷ attempts: what each evaluation was worth. */
  evPerAttempt: number | null;
}

/** Copy-traded attempts count once per copy: same trades, so same result on each account. */
export function scorePractice(input: { evalTrack: EvalTrack; funded?: FundedTrack; copies?: number }[]): PracticeScore {
  const attempts = input.flatMap(a => Array.from({ length: Math.max(1, Math.round(a.copies ?? 1)) }, () => a));
  const base = scoreEvals(attempts.map(a => a.evalTrack));
  const funded = attempts.map(a => a.funded).filter((f): f is FundedTrack => !!f);
  const received = funded.reduce((s, f) => s + f.received, 0);
  const totalFees = base.fees + funded.reduce((s, f) => s + f.fees, 0);
  const gotPaid = funded.filter(f => f.payoutsTaken > 0).length;
  const n = attempts.length;
  return {
    ...base,
    fundedStarted: funded.length,
    fundedBlown: funded.filter(f => f.status === 'blown').length,
    payouts: funded.reduce((s, f) => s + f.payoutsTaken, 0),
    received,
    gotPaid,
    paidRate: n ? gotPaid / n : null,
    totalFees,
    evPerAttempt: n ? (received - totalFees) / n : null,
  };
}
