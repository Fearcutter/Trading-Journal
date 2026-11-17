import { mulberry32, wilsonInterval } from '../prop-ev';
import { makeWinChance, simulateLifecycle, simulateUntilPayout } from './engine';
import type { SimInputs, Strategy, TradePlan } from './types';

/** A probability with its 95% range. */
export interface Prob { p: number; lo: number; hi: number }
/** An average with its 95% range. */
export interface Mean { mean: number; lo: number; hi: number }

const prob = (k: number, n: number): Prob => {
  const [lo, hi] = wilsonInterval(k, n);
  return { p: n ? k / n : 0, lo, hi };
};
const avg = (sum: number, n: number) => (n ? sum / n : 0);

export const PAYOUT_LEVELS = 5;
export const LOSS_LEVELS = [500, 1000, 2000];
export const STREAKS = [3, 5, 10];

export interface StrategyResult {
  id: string;
  name: string;
  runs: number;
  eval: {
    pass: Prob;
    fail: Prob;
    unfinished: Prob;
    avgTrades: number;
    avgDays: number;
    /** Evaluation money spent per funded account, counting resets after failures. */
    costPerFunded: number | null;
  };
  funded: {
    /** Count of evaluations that passed. */
    count: number;
    /** P(at least k payouts) per evaluation bought, k = 1..5. */
    atLeast: Prob[];
    /** P(at least k payouts) once funded. */
    atLeastIfFunded: Prob[];
    /** Funded accounts lost before any payout. */
    ruinBeforePayout: Prob;
    /** Funded accounts lost at some point (before or after payouts). */
    eventuallyBlown: Prob;
    finished: Prob;
    unfinished: Prob;
    avgPayouts: number;
    grossPerFunded: number;
    netPerFunded: number;
    avgTradesToFirst: number | null;
    avgDaysToFirst: number | null;
    /** Between one payout and the next, for accounts that got more than one. */
    avgDaysBetween: number | null;
    avgTradesBetween: number | null;
    /** Average balance and room to the floor after payout 1, 2, ... */
    afterPayout: { n: number; balance: number; room: number }[];
  };
  money: {
    /** Net cash per evaluation bought: payouts kept minus fees. */
    perEval: Mean;
    /** Payouts kept per $1 of fees. */
    perDollar: number;
    /** Fees spent per payout received. */
    costPerPayout: number | null;
    avgFees: number;
    p10: number;
    p50: number;
    p90: number;
  };
  /** Buying accounts one after another until one pays out. */
  untilPayout: {
    runs: number;
    /** Chance of spending at least this much on fees before the first payout. */
    lose: { amount: number; p: Prob }[];
    budgetRuin: Prob;
    avgSpent: number;
    medianSpent: number;
    avgAccounts: number;
    /** Never paid within the account limit. */
    neverPaid: Prob;
  };
  /** Chance the next k accounts in a row all end without a payout. */
  streaks: { k: number; p: number }[];
  histogram: { from: number; to: number; count: number }[];
}

/** Buckets for the outcome chart. */
function histogram(sorted: Float64Array, bins = 24): StrategyResult['histogram'] {
  if (!sorted.length) return [];
  const lo = sorted[0], hi = sorted[sorted.length - 1];
  if (hi - lo < 1) return [{ from: lo, to: hi, count: sorted.length }];
  const raw = (hi - lo) / bins;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const width = [1, 2, 2.5, 5, 10].map(m => m * mag).find(w => w >= raw) ?? raw;
  const start = Math.floor(lo / width) * width;
  const out: StrategyResult['histogram'] = [];
  for (let x = start; x <= hi; x += width) out.push({ from: x, to: x + width, count: 0 });
  for (const v of sorted) out[Math.min(out.length - 1, Math.floor((v - start) / width))].count++;
  return out;
}

/** Runs one strategy many times and sums up the results. */
export function summarize(inp: SimInputs, strategy: Strategy, evalPlan: TradePlan = inp.evalPlan): StrategyResult {
  const { setup, odds, qualify, runs, seed, budget } = inp;
  const win = makeWinChance(odds);
  const rand = mulberry32(seed);
  const n = Math.max(1, runs);
  const nets = new Float64Array(n);
  let passed = 0, failed = 0, unfinishedEval = 0, evalTrades = 0, evalDays = 0;
  let blown = 0, blownBefore = 0, finished = 0, unfinishedFunded = 0;
  let gapDays = 0, gapTrades = 0, gaps = 0;
  let payoutCount = 0, gross = 0, kept = 0, fees = 0, firstTrades = 0, firstDays = 0, withFirst = 0, noPayout = 0;
  const atLeast = new Array(PAYOUT_LEVELS).fill(0);
  const after: { n: number; balance: number; room: number }[] = [];

  for (let i = 0; i < n; i++) {
    const life = simulateLifecycle(setup, odds, evalPlan, qualify, strategy, rand, win);
    nets[i] = life.net;
    fees += life.fees;
    if (life.payouts.length === 0) noPayout++;
    if (life.evalEnd === 'failed') { failed++; continue; }
    if (life.evalEnd === 'unfinished') { unfinishedEval++; continue; }
    passed++;
    evalTrades += life.evalTrades;
    evalDays += life.evalDays;
    if (life.fundedEnd === 'blown') { blown++; if (!life.payouts.length) blownBefore++; }
    else if (life.fundedEnd === 'finished') finished++;
    else unfinishedFunded++;
    payoutCount += life.payouts.length;
    life.payouts.forEach((p, k) => {
      gross += p.gross;
      kept += p.net;
      if (k < PAYOUT_LEVELS) atLeast[k]++;
      if (k > 0) {
        gaps++;
        gapDays += p.day - life.payouts[k - 1].day;
        gapTrades += p.trades - life.payouts[k - 1].trades;
      }
      after[k] ??= { n: 0, balance: 0, room: 0 };
      after[k].n++;
      after[k].balance += p.balanceAfter;
      after[k].room += p.roomAfter;
    });
    if (life.tradesToFirstPayout !== null) {
      withFirst++;
      firstTrades += life.tradesToFirstPayout;
      firstDays += life.daysToFirstPayout ?? 0;
    }
  }

  nets.sort();
  const mean = avg(nets.reduce((s, x) => s + x, 0), n);
  const sd = n > 1 ? Math.sqrt(nets.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1)) : 0;
  const se = sd / Math.sqrt(n);
  const pct = (q: number) => nets[Math.min(n - 1, Math.floor(n * q))];
  const passRate = passed / n;

  // Buying accounts until one pays out: fewer runs, since each can use several accounts
  const chainRuns = Math.min(n, 5000);
  const chainRand = mulberry32(seed + 1);
  const spent = new Float64Array(chainRuns);
  let accounts = 0, never = 0, ruined = 0;
  const lose = LOSS_LEVELS.map(() => 0);
  for (let i = 0; i < chainRuns; i++) {
    const c = simulateUntilPayout(setup, odds, evalPlan, qualify, strategy, chainRand, win);
    spent[i] = c.spent;
    accounts += c.accounts;
    if (!c.paid) never++;
    if (c.spent > budget) ruined++;
    LOSS_LEVELS.forEach((x, j) => { if (c.spent >= x) lose[j]++; });
  }
  spent.sort();

  const q = noPayout / n;
  return {
    id: strategy.id,
    name: strategy.name,
    runs: n,
    eval: {
      pass: prob(passed, n),
      fail: prob(failed, n),
      unfinished: prob(unfinishedEval, n),
      avgTrades: avg(evalTrades, passed),
      avgDays: avg(evalDays, passed),
      costPerFunded: passRate > 0 ? setup.eval.fee + (setup.eval.resetFee * (1 - passRate)) / passRate : null,
    },
    funded: {
      count: passed,
      atLeast: atLeast.map(k => prob(k, n)),
      atLeastIfFunded: atLeast.map(k => prob(k, passed)),
      ruinBeforePayout: prob(blownBefore, passed),
      eventuallyBlown: prob(blown, passed),
      finished: prob(finished, passed),
      unfinished: prob(unfinishedFunded, passed),
      avgPayouts: avg(payoutCount, passed),
      grossPerFunded: avg(gross, passed),
      netPerFunded: avg(kept, passed),
      avgTradesToFirst: withFirst ? firstTrades / withFirst : null,
      avgDaysToFirst: withFirst ? firstDays / withFirst : null,
      avgDaysBetween: gaps ? gapDays / gaps : null,
      avgTradesBetween: gaps ? gapTrades / gaps : null,
      afterPayout: after.map(a => ({ n: a.n, balance: a.balance / a.n, room: a.room / a.n })),
    },
    money: {
      perEval: { mean, lo: mean - 1.96 * se, hi: mean + 1.96 * se },
      perDollar: fees > 0 ? kept / fees : 0,
      costPerPayout: payoutCount ? fees / payoutCount : null,
      avgFees: fees / n,
      p10: pct(0.1),
      p50: pct(0.5),
      p90: pct(0.9),
    },
    untilPayout: {
      runs: chainRuns,
      lose: LOSS_LEVELS.map((amount, j) => ({ amount, p: prob(lose[j], chainRuns) })),
      budgetRuin: prob(ruined, chainRuns),
      avgSpent: avg(spent.reduce((s, x) => s + x, 0), chainRuns),
      medianSpent: spent[Math.floor(chainRuns / 2)],
      avgAccounts: avg(accounts, chainRuns),
      neverPaid: prob(never, chainRuns),
    },
    // Accounts are independent of each other, so k failures in a row is q^k
    streaks: STREAKS.map(k => ({ k, p: q ** k })),
    histogram: histogram(nets),
  };
}
