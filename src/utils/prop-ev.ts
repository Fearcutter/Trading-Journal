import type { Trade } from '../types/trade';
import { getRealizedR } from './r-multiple';

// ---------------------------------------------------------------------------
// Firm rules
// ---------------------------------------------------------------------------

export type DrawdownType = 'eod_trailing' | 'intraday_trailing' | 'static';

export interface DrawdownRule {
  /** Distance from the high point (or the start, if static) to the floor, in $. */
  amount: number;
  type: DrawdownType;
  /** The floor stops trailing once it reaches start + this ($). Null = never stops. */
  lockAboveStart: number | null;
}

export interface EvalRules {
  fee: number;
  billing: 'monthly' | 'one_time';
  profitTarget: number;
  drawdown: DrawdownRule;
  /** Soft limit: trading stops for the day at this loss; the account isn't failed. */
  dailyLossLimit: number | null;
  /** Best day must be at most this % of total profit to pass. */
  consistencyPct: number | null;
  minDays: number;
  /** Trading days allowed before the attempt counts as not passed. Null = the simulator's cap. */
  maxDays: number | null;
}

export interface FundedRules {
  activationFee: number;
  drawdown: DrawdownRule;
  dailyLossLimit: number | null;
  /** Best day in a payout cycle must be at most this % of the cycle's profit. */
  consistencyPct: number | null;
  /** Qualifying days needed per payout cycle. */
  minDaysPerPayout: number;
  /** A day qualifies only with at least this profit ($). 0 = any trading day. */
  minDayProfit: number;
  /** The payout cycle as a whole must have made at least this ($). Missing = 0. */
  minCycleProfit?: number;
  /** Balance must stay at least start + buffer after a payout. */
  buffer: number;
  minPayout: number;
  /** Cap per payout, by payout number; the last value repeats. Empty or 0 = no cap. */
  payoutCaps: number[];
  /** Each payout is at most this share of profit above the start (e.g. 0.5). Null = no limit. */
  payoutShareOfProfit: number | null;
  /** Trader's share of each payout (0–1). */
  split: number;
  /** The sim account ends (e.g. moves to live) after this many payouts. Null = no limit. */
  maxPayouts: number | null;
}

export interface FirmConfig {
  id: string;
  firm: string;
  plan: string;
  size: number;
  eval: EvalRules;
  funded: FundedRules;
  /** Date the rules were last checked against the firm's site (YYYY-MM-DD). */
  lastChecked: string;
  /** Rules the sources disagreed on or that couldn't be confirmed. */
  verify: string[];
  notes: string;
}

// ---------------------------------------------------------------------------
// Turning trades into trading days
// ---------------------------------------------------------------------------

/** Each trading day's results in R, in the order taken. Trades without a stop are left out. */
export function tradesToDays(trades: Trade[]): { days: number[][]; used: number; skipped: number } {
  const byDate = new Map<string, { time: string; r: number }[]>();
  let skipped = 0;
  for (const t of trades) {
    const r = getRealizedR(t);
    if (r === null || !Number.isFinite(r)) { skipped++; continue; }
    const list = byDate.get(t.date) ?? [];
    list.push({ time: t.time || '', r });
    byDate.set(t.date, list);
  }
  const days = [...byDate.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, list]) => list.sort((a, b) => a.time.localeCompare(b.time)).map(x => x.r));
  return { days, used: trades.length - skipped, skipped };
}

// ---------------------------------------------------------------------------
// Edge stats, Kelly, binomial and streak odds
// ---------------------------------------------------------------------------

export interface EdgeStats {
  trades: number;
  winRate: number;          // 0–1, trades above 0R
  lossRate: number;         // 0–1, trades below 0R
  avgR: number;
  avgWinR: number;
  avgLossR: number;         // positive number
  stdR: number;
  /** 95% range for the true win rate (Wilson interval). */
  winRateLow: number;
  winRateHigh: number;
  /** 95% range for the true average R (normal approximation). */
  avgRLow: number;
  avgRHigh: number;
  /** Chance the true average R is 0 or below, given this sample. */
  chanceNoEdge: number;
  /** Kelly fraction of bankroll per trade; can be negative (no edge). */
  kelly: number;
}

/** Standard normal cumulative probability. */
export function normalCdf(z: number): number {
  // Abramowitz & Stegun 7.1.26 on erf, error < 1.5e-7
  const x = Math.abs(z) / Math.SQRT2;
  const t = 1 / (1 + 0.3275911 * x);
  const erf = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-x * x);
  return z >= 0 ? (1 + erf) / 2 : (1 - erf) / 2;
}

/**
 * Kelly fraction f* = W − (1 − W) / b, where b = average win / average loss.
 * The share of a bankroll to risk per trade that grows it fastest.
 */
export function kellyFraction(winRate: number, avgWin: number, avgLoss: number): number {
  if (avgLoss <= 0) return winRate > 0 ? 1 : 0;
  if (avgWin <= 0) return -1;
  return winRate - (1 - winRate) / (avgWin / avgLoss);
}

/** Wilson 95% interval for a proportion. */
export function wilsonInterval(successes: number, n: number, z = 1.96): [number, number] {
  if (n === 0) return [0, 1];
  const p = successes / n;
  const denom = 1 + (z * z) / n;
  const centre = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return [Math.max(0, centre - half), Math.min(1, centre + half)];
}

export function edgeStats(rs: number[]): EdgeStats {
  const n = rs.length;
  const wins = rs.filter(r => r > 0);
  const losses = rs.filter(r => r < 0);
  const avg = (xs: number[]) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);
  const avgR = avg(rs);
  const stdR = n > 1 ? Math.sqrt(rs.reduce((s, r) => s + (r - avgR) ** 2, 0) / (n - 1)) : 0;
  const se = n > 0 ? stdR / Math.sqrt(n) : 0;
  const winRate = n ? wins.length / n : 0;
  const lossRate = n ? losses.length / n : 0;
  const avgWinR = avg(wins);
  const avgLossR = Math.abs(avg(losses));
  const [winRateLow, winRateHigh] = wilsonInterval(wins.length, n);
  return {
    trades: n,
    winRate,
    lossRate,
    avgR,
    avgWinR,
    avgLossR,
    stdR,
    winRateLow,
    winRateHigh,
    avgRLow: avgR - 1.96 * se,
    avgRHigh: avgR + 1.96 * se,
    chanceNoEdge: se > 0 ? normalCdf(-avgR / se) : avgR > 0 ? 0 : 1,
    kelly: kellyFraction(winRate, avgWinR, avgLossR),
  };
}

/** P(exactly k successes in n tries) with success chance p. */
export function binomialPmf(n: number, k: number, p: number): number {
  if (k < 0 || k > n) return 0;
  let logC = 0;
  for (let i = 1; i <= k; i++) logC += Math.log(n - k + i) - Math.log(i);
  if (p === 0) return k === 0 ? 1 : 0;
  if (p === 1) return k === n ? 1 : 0;
  return Math.exp(logC + k * Math.log(p) + (n - k) * Math.log(1 - p));
}

/** P(at least k successes in n tries). */
export function binomialAtLeast(n: number, k: number, p: number): number {
  let total = 0;
  for (let i = Math.max(0, k); i <= n; i++) total += binomialPmf(n, i, p);
  return Math.min(1, total);
}

/**
 * Chance of at least one run of `k` or more losses in a row within `n` trades,
 * each trade losing with chance `q` independently.
 */
export function chanceOfLosingStreak(n: number, k: number, q: number): number {
  if (k <= 0) return 1;
  if (k > n || q <= 0) return 0;
  // state[j] = chance the current run of losses is j and no run of k has happened yet
  let state = new Array(k).fill(0);
  state[0] = 1;
  for (let i = 0; i < n; i++) {
    const next = new Array(k).fill(0);
    for (let j = 0; j < k; j++) {
      if (!state[j]) continue;
      next[0] += state[j] * (1 - q);
      if (j + 1 < k) next[j + 1] += state[j] * q;
    }
    state = next;
  }
  return 1 - state.reduce((s, x) => s + x, 0);
}

// ---------------------------------------------------------------------------
// Account simulation
// ---------------------------------------------------------------------------

/** Small fast seeded random generator, so results don't jump between renders. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Trading days per monthly bill. */
export const TRADING_DAYS_PER_MONTH = 20;
export const EVAL_DAY_CAP = 60;
export const FUNDED_DAY_CAP = 120;

export interface SimOptions {
  riskPerTrade: number;
  /** Round-trip cost per trade in $ (commissions, fees). */
  costPerTrade: number;
  runs: number;
  seed?: number;
}

/** A running account balance with a drawdown floor. */
class Account {
  balance: number;
  high: number;
  floor: number;
  locked = false;
  readonly start: number;
  readonly rule: DrawdownRule;
  constructor(start: number, rule: DrawdownRule) {
    this.start = start;
    this.rule = rule;
    this.balance = start;
    this.high = start;
    this.floor = start - rule.amount;
    this.updateLock();
  }
  private updateLock() {
    const { lockAboveStart } = this.rule;
    if (lockAboveStart !== null && this.floor >= this.start + lockAboveStart) {
      this.floor = this.start + lockAboveStart;
      this.locked = true;
    }
  }
  /** Move the floor up from a new high. */
  trail() {
    if (this.rule.type === 'static' || this.locked) return;
    this.high = Math.max(this.high, this.balance);
    this.floor = Math.max(this.floor, this.high - this.rule.amount);
    this.updateLock();
  }
  /** Stop the floor where it is (after a payout). */
  freeze() { this.locked = true; }
}

/**
 * Play one day on an account. Returns the day's P&L and whether the account was blown.
 * Losses past the daily limit are cut at the limit (the firm flattens you there).
 */
function playDay(acct: Account, day: number[], risk: number, cost: number, dll: number | null): { pl: number; blown: boolean } {
  let pl = 0;
  for (const r of day) {
    let tradePL = r * risk - cost;
    if (dll !== null && pl + tradePL <= -dll) tradePL = -dll - pl;
    pl += tradePL;
    acct.balance += tradePL;
    if (acct.balance <= acct.floor) {
      acct.balance = acct.floor;
      return { pl, blown: true };
    }
    if (acct.rule.type === 'intraday_trailing') acct.trail();
    if (dll !== null && pl <= -dll) break;
  }
  if (acct.rule.type === 'eod_trailing') acct.trail();
  return { pl, blown: false };
}

function consistencyOk(bestDay: number, profit: number, pct: number | null): boolean {
  if (pct === null) return true;
  if (profit <= 0) return false;
  return bestDay <= (pct / 100) * profit + 1e-9;
}

export interface RunResult {
  evalEnd: 'passed' | 'blown' | 'timeout';
  passed: boolean;
  daysToPass: number | null;
  fundedBlown: boolean;
  payouts: number;
  paid: number;
  fees: number;
}

/** One evaluation bought, then (if passed) the funded account until it blows, ends or the cap is reached. */
export function simulateRun(days: number[][], cfg: FirmConfig, opts: Omit<SimOptions, 'runs' | 'seed'>, rand: () => number): RunResult {
  const { riskPerTrade: risk, costPerTrade: cost } = opts;
  const pick = () => days[Math.floor(rand() * days.length)];
  const ev = cfg.eval;
  let fees = ev.fee;

  // Evaluation
  const evalAcct = new Account(cfg.size, ev.drawdown);
  const maxDays = Math.min(ev.maxDays ?? EVAL_DAY_CAP, EVAL_DAY_CAP);
  let bestDay = 0;
  let passed = false;
  let evalBlown = false;
  let day = 0;
  while (day < maxDays) {
    if (ev.billing === 'monthly' && day > 0 && day % TRADING_DAYS_PER_MONTH === 0) fees += ev.fee;
    const { pl, blown } = playDay(evalAcct, pick(), risk, cost, ev.dailyLossLimit);
    day++;
    if (blown) { evalBlown = true; break; }
    bestDay = Math.max(bestDay, pl);
    const profit = evalAcct.balance - cfg.size;
    if (profit >= ev.profitTarget && day >= ev.minDays && consistencyOk(bestDay, profit, ev.consistencyPct)) {
      passed = true;
      break;
    }
  }
  if (!passed) return { evalEnd: evalBlown ? 'blown' : 'timeout', passed, daysToPass: null, fundedBlown: false, payouts: 0, paid: 0, fees };

  // Funded
  const f = cfg.funded;
  fees += f.activationFee;
  const acct = new Account(cfg.size, f.drawdown);
  let payouts = 0;
  let paid = 0;
  let fundedBlown = false;
  let cycleDays = 0;
  let cycleProfit = 0;
  let cycleBest = 0;
  for (let d = 0; d < FUNDED_DAY_CAP; d++) {
    const { pl, blown } = playDay(acct, pick(), risk, cost, f.dailyLossLimit);
    if (blown) { fundedBlown = true; break; }
    cycleProfit += pl;
    cycleBest = Math.max(cycleBest, pl);
    // A day counts toward the payout cycle if it made at least the firm's minimum (any trading day when 0)
    if (f.minDayProfit === 0 || pl >= f.minDayProfit) cycleDays++;

    if (cycleDays < f.minDaysPerPayout || cycleProfit < (f.minCycleProfit ?? 0)) continue;
    if (!consistencyOk(cycleBest, cycleProfit, f.consistencyPct)) continue;
    const profitAboveStart = acct.balance - cfg.size;
    let gross = acct.balance - Math.max(cfg.size + f.buffer, acct.floor);
    if (f.payoutShareOfProfit !== null) gross = Math.min(gross, profitAboveStart * f.payoutShareOfProfit);
    const cap = f.payoutCaps.length ? f.payoutCaps[Math.min(payouts, f.payoutCaps.length - 1)] : 0;
    if (cap > 0) gross = Math.min(gross, cap);
    gross = Math.floor(gross);
    if (gross < Math.max(f.minPayout, 1)) continue;

    acct.balance -= gross;
    acct.freeze();
    paid += gross * f.split;
    payouts++;
    cycleDays = 0;
    cycleProfit = 0;
    cycleBest = 0;
    if (f.maxPayouts !== null && payouts >= f.maxPayouts) break;
  }
  return { evalEnd: 'passed', passed, daysToPass: day, fundedBlown, payouts, paid, fees };
}

export interface SimSummary {
  riskPerTrade: number;
  runs: number;
  passRate: number;
  evalBlowRate: number;
  /** Ran out of days without passing or blowing. */
  evalTimeoutRate: number;
  medianDaysToPass: number | null;
  /** Of passed accounts, the share that blew while funded. */
  fundedBlowRate: number;
  /** Chance an eval you buy leads to at least one payout. */
  payoutRate: number;
  avgPayouts: number;
  avgPaid: number;
  avgFees: number;
  /** Expected value per evaluation bought: payouts received − fees. */
  ev: number;
  /** Net result per eval, 10th / 50th / 90th percentile. */
  p10: number;
  p50: number;
  p90: number;
}

export function simulateFirm(days: number[][], cfg: FirmConfig, opts: SimOptions): SimSummary {
  const rand = mulberry32(opts.seed ?? 12345);
  const nets: number[] = [];
  const passDays: number[] = [];
  let passed = 0, evalBlown = 0, timeouts = 0, fundedBlown = 0, withPayout = 0, payouts = 0, paid = 0, fees = 0;
  for (let i = 0; i < opts.runs; i++) {
    const r: RunResult = days.length
      ? simulateRun(days, cfg, opts, rand)
      : { evalEnd: 'timeout', passed: false, daysToPass: null, fundedBlown: false, payouts: 0, paid: 0, fees: cfg.eval.fee };
    if (r.evalEnd === 'passed') { passed++; passDays.push(r.daysToPass!); }
    else if (r.evalEnd === 'blown') evalBlown++;
    else timeouts++;
    if (r.fundedBlown) fundedBlown++;
    if (r.payouts > 0) withPayout++;
    payouts += r.payouts;
    paid += r.paid;
    fees += r.fees;
    nets.push(r.paid - r.fees);
  }
  const n = opts.runs || 1;
  nets.sort((a, b) => a - b);
  passDays.sort((a, b) => a - b);
  const pct = (p: number) => nets[Math.min(nets.length - 1, Math.floor(nets.length * p))] ?? 0;
  return {
    riskPerTrade: opts.riskPerTrade,
    runs: opts.runs,
    passRate: passed / n,
    evalBlowRate: evalBlown / n,
    evalTimeoutRate: timeouts / n,
    medianDaysToPass: passDays.length ? passDays[Math.floor(passDays.length / 2)] : null,
    fundedBlowRate: passed ? fundedBlown / passed : 0,
    payoutRate: withPayout / n,
    avgPayouts: payouts / n,
    avgPaid: paid / n,
    avgFees: fees / n,
    ev: (paid - fees) / n,
    p10: pct(0.1),
    p50: pct(0.5),
    p90: pct(0.9),
  };
}

/** Risk levels to try, as shares of the evaluation drawdown. */
export const SWEEP_SHARES = [0.02, 0.03, 0.04, 0.05, 0.06, 0.08, 0.1, 0.125, 0.15, 0.2, 0.25, 0.3, 0.4];

/** Rounds to a tidy $ amount: $5 steps under $100, $10 steps above. */
export function tidyRisk(x: number): number {
  const step = x < 100 ? 5 : 10;
  return Math.max(step, Math.round(x / step) * step);
}

/** Simulate each risk level; returns all results and the one with the highest EV. */
export function riskSweep(days: number[][], cfg: FirmConfig, opts: Omit<SimOptions, 'riskPerTrade'>): { points: SimSummary[]; best: SimSummary | null } {
  const risks = [...new Set(SWEEP_SHARES.map(s => tidyRisk(s * cfg.eval.drawdown.amount)))];
  const points = risks.map(riskPerTrade => simulateFirm(days, cfg, { ...opts, riskPerTrade }));
  const best = points.reduce<SimSummary | null>((b, p) => (!b || p.ev > b.ev ? p : b), null);
  return { points, best };
}
