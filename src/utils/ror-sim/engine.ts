import { consistencyOk, countsTowardPayout, payoutAvailable, payoutCycleReady } from '../prop-ev';
import { SimAccount } from './account';
import { estimateWinRate } from './price-path';
import { EVAL_DAY_LIMIT, FUNDED_DAY_LIMIT, type Odds, type SimSetup, type Strategy, type TradePlan } from './types';

export interface PayoutRecord {
  gross: number;
  /** What you keep after the profit split. */
  net: number;
  /** Funded trading day it was taken on. */
  day: number;
  /** Funded trades taken up to and including that day. */
  trades: number;
  balanceAfter: number;
  roomAfter: number;
}

export interface Lifecycle {
  evalEnd: 'passed' | 'failed' | 'unfinished';
  evalTrades: number;
  evalDays: number;
  /** Evaluation price plus activation fee, if funded. */
  fees: number;
  fundedEnd: 'blown' | 'finished' | 'unfinished' | null;
  fundedTrades: number;
  fundedDays: number;
  payouts: PayoutRecord[];
  tradesToFirstPayout: number | null;
  daysToFirstPayout: number | null;
  /** Paid out to you after the split. */
  paid: number;
  /** Paid out minus fees. Account balance never counts: only payouts are money. */
  net: number;
}

/** Contracts a trade needs at your usual stop. */
export function contractsFor(risk: number, odds: Odds): number {
  if (odds.riskPerContract <= 0) return 1;
  return Math.max(1, Math.ceil(risk / odds.riskPerContract - 1e-9));
}

/** Commission and slippage for one trade. */
export function tradeCost(risk: number, odds: Odds): number {
  return contractsFor(risk, odds) * (odds.commissionPerContract + odds.slippagePerContract);
}

/** Win chance of a trade: your number for it, or the price-path estimate from your base odds. */
export function makeWinChance(odds: Odds): (plan: Pick<TradePlan, 'risk' | 'reward' | 'winRate'>) => number {
  const cache = new Map<string, number>();
  return plan => {
    if (plan.winRate !== null) return plan.winRate;
    const key = `${plan.risk}/${plan.reward}`;
    let p = cache.get(key);
    if (p === undefined) {
      p = estimateWinRate(odds.winRate, odds.rewardRisk, plan.risk, plan.reward);
      cache.set(key, p);
    }
    return p;
  };
}

/** Whether another trade is taken today, given how many were taken and how the last one went. */
function mayTrade(plan: TradePlan, taken: number, lastWon: boolean | null, rand: () => number): boolean {
  if (taken >= plan.maxTradesPerDay) return false;
  if (taken === 0) return true;
  if (lastWon && plan.stopAfterWin) return false;
  if (lastWon === false && plan.stopAfterLoss) return false;
  return rand() < plan.extraChance;
}

export interface Ctx {
  setup: SimSetup;
  odds: Odds;
  win: (plan: TradePlan) => number;
}

/** Plays the evaluation. */
export function runEval(ctx: Ctx, plan: TradePlan, rand: () => number): { end: Lifecycle['evalEnd']; trades: number; days: number } {
  const { setup } = ctx;
  const ev = setup.eval;
  const acct = new SimAccount(setup.size, ev.drawdown, setup.breach);
  const dll = ev.dailyLossLimit;
  const p = ctx.win(plan);
  const cost = tradeCost(plan.risk, ctx.odds);
  let best = 0;
  let trades = 0;
  for (let day = 1; day <= EVAL_DAY_LIMIT; day++) {
    let pl = 0;
    let taken = 0;
    let lastWon: boolean | null = null;
    while (mayTrade(plan, taken, lastWon, rand)) {
      const won = rand() < p;
      let tradePL = (won ? plan.reward : -plan.risk) - cost;
      if (dll !== null && pl + tradePL <= -dll) tradePL = -dll - pl;
      pl += tradePL;
      taken++;
      trades++;
      lastWon = won;
      if (acct.trade(tradePL)) return { end: 'failed', trades, days: day };
      if (dll !== null && pl <= -dll) break;
      // Target reached: no reason to keep trading today
      if (acct.balance - setup.size >= ev.profitTarget) break;
    }
    if (acct.close()) return { end: 'failed', trades, days: day };
    best = Math.max(best, pl);
    const profit = acct.balance - setup.size;
    if (profit >= ev.profitTarget && day >= ev.minDays && consistencyOk(best, profit, ev.consistencyPct)) {
      return { end: 'passed', trades, days: day };
    }
  }
  return { end: 'unfinished', trades, days: EVAL_DAY_LIMIT };
}

/** Payout this cycle aims for: the biggest allowed (if there's a cap and you wait for it) or the minimum. */
export function payoutGoal(setup: SimSetup, payoutsTaken: number): number {
  const f = setup.funded;
  const cap = f.payoutCaps.length ? f.payoutCaps[Math.min(payoutsTaken, f.payoutCaps.length - 1)] : 0;
  const min = Math.max(f.minPayout, 1);
  return setup.payoutTiming === 'max' && cap > 0 ? Math.max(cap, min) : min;
}

/** Balance needed before the payout goal can be withdrawn. */
export function targetBalance(setup: SimSetup, floor: number, payoutsTaken: number): number {
  const f = setup.funded;
  const goal = payoutGoal(setup, payoutsTaken);
  const aboveFloor = Math.max(setup.size + f.buffer, floor) + goal;
  const byShare = f.payoutShareOfProfit ? setup.size + goal / f.payoutShareOfProfit : 0;
  return Math.max(aboveFloor, byShare);
}

const roundTo = (x: number, step: number) => Math.max(step, Math.round(x / step) * step);

/**
 * Strategy D's trade size: a share of the room to the floor, no more than the contract
 * limit allows, and no bigger than needed to reach the payout goal. Rounded to $10.
 */
export function dynamicSize(share: number, room: number, remaining: number, rewardRisk: number, maxRisk: number): { risk: number; reward: number } {
  let risk = Math.min(share * room, maxRisk || Infinity);
  if (risk * rewardRisk > remaining) risk = remaining / rewardRisk;
  risk = roundTo(risk, 10);
  return { risk, reward: roundTo(risk * rewardRisk, 10) };
}

function dynamicPlan(s: Strategy, ctx: Ctx, room: number, remaining: number): TradePlan {
  const size = dynamicSize(s.dynamicShare ?? 0.5, room, remaining, ctx.odds.rewardRisk, ctx.setup.maxContracts * ctx.odds.riskPerContract);
  return { ...s.build, ...size, winRate: null };
}

export interface FundedRun {
  end: 'blown' | 'finished' | 'unfinished';
  trades: number;
  days: number;
  payouts: PayoutRecord[];
  tradesToFirst: number | null;
}

/** Plays the funded account until it blows, reaches the payout limit or the day limit. */
export function runFunded(ctx: Ctx, strategy: Strategy, qualify: TradePlan, rand: () => number): FundedRun {
  const { setup } = ctx;
  const f = setup.funded;
  const acct = new SimAccount(setup.size, f.drawdown, setup.breach);
  const dll = f.dailyLossLimit;
  const payouts: PayoutRecord[] = [];
  let cycleDays = 0, cycleProfit = 0, cycleBest = 0, cycleWins = 0;
  let trades = 0;
  let tradesToFirst: number | null = null;

  const stage = (): 'build' | 'qualify' => (acct.balance < targetBalance(setup, acct.floor, payouts.length) - 1e-9 ? 'build' : 'qualify');
  const planFor = (st: 'build' | 'qualify'): TradePlan => {
    if (st === 'qualify') return qualify;
    if (strategy.id === 'D') return dynamicPlan(strategy, ctx, acct.room, targetBalance(setup, acct.floor, payouts.length) - acct.balance);
    if (payouts.length > 0) return strategy.afterPayout;
    if (strategy.afterFirstWin && cycleWins > 0) return strategy.afterFirstWin;
    return strategy.build;
  };

  for (let day = 1; day <= FUNDED_DAY_LIMIT; day++) {
    const startStage = stage();
    let pl = 0;
    let taken = 0;
    let lastWon: boolean | null = null;
    while (true) {
      // A day ends when the stage changes (payout goal reached, or dropped back below it)
      const st = stage();
      if (st !== startStage) break;
      // Qualifying: stop once today already counts
      if (st === 'qualify' && taken > 0 && pl >= f.minDayProfit) break;
      const plan = planFor(st);
      if (!mayTrade(plan, taken, lastWon, rand)) break;
      const won = rand() < ctx.win(plan);
      let tradePL = (won ? plan.reward : -plan.risk) - tradeCost(plan.risk, ctx.odds);
      if (dll !== null && pl + tradePL <= -dll) tradePL = -dll - pl;
      pl += tradePL;
      taken++;
      trades++;
      lastWon = won;
      if (won) cycleWins++;
      if (acct.trade(tradePL)) return { end: 'blown', trades, days: day, payouts, tradesToFirst };
      if (dll !== null && pl <= -dll) break;
    }
    if (acct.close()) return { end: 'blown', trades, days: day, payouts, tradesToFirst };

    cycleProfit += pl;
    cycleBest = Math.max(cycleBest, pl);
    if (taken > 0 && countsTowardPayout(pl, f)) cycleDays++;
    if (!payoutCycleReady(cycleDays, cycleProfit, cycleBest, f, payouts.length)) continue;
    const available = payoutAvailable(acct.balance, acct.floor, setup.size, f, payouts.length);
    if (available < payoutGoal(setup, payouts.length) - 1e-9 || available < Math.max(f.minPayout, 1)) continue;

    acct.withdraw(available);
    payouts.push({ gross: available, net: available * f.split, day, trades, balanceAfter: acct.balance, roomAfter: acct.room });
    if (tradesToFirst === null) tradesToFirst = trades;
    cycleDays = 0; cycleProfit = 0; cycleBest = 0; cycleWins = 0;
    if (f.maxPayouts !== null && payouts.length >= f.maxPayouts) return { end: 'finished', trades, days: day, payouts, tradesToFirst };
  }
  return { end: 'unfinished', trades, days: FUNDED_DAY_LIMIT, payouts, tradesToFirst };
}

/** One evaluation bought, played through funding, payouts and failure or the end. */
export function simulateLifecycle(
  setup: SimSetup, odds: Odds, evalPlan: TradePlan, qualify: TradePlan, strategy: Strategy, rand: () => number,
  win = makeWinChance(odds), evalPrice = setup.eval.fee,
): Lifecycle {
  const ctx: Ctx = { setup, odds, win };
  const ev = runEval(ctx, evalPlan, rand);
  let fees = evalPrice;
  if (ev.end !== 'passed') {
    return {
      evalEnd: ev.end, evalTrades: ev.trades, evalDays: ev.days, fees, fundedEnd: null, fundedTrades: 0, fundedDays: 0,
      payouts: [], tradesToFirstPayout: null, daysToFirstPayout: null, paid: 0, net: -fees,
    };
  }
  fees += setup.funded.activationFee;
  const fu = runFunded(ctx, strategy, qualify, rand);
  const paid = fu.payouts.reduce((s, p) => s + p.net, 0);
  return {
    evalEnd: 'passed', evalTrades: ev.trades, evalDays: ev.days, fees,
    fundedEnd: fu.end, fundedTrades: fu.trades, fundedDays: fu.days, payouts: fu.payouts,
    tradesToFirstPayout: fu.tradesToFirst, daysToFirstPayout: fu.payouts[0]?.day ?? null,
    paid, net: paid - fees,
  };
}

/**
 * Accounts bought one after another until one pays out. A failed evaluation is reset
 * (reset fee); a funded account lost without a payout means buying a new evaluation.
 * Returns the fees spent up to and including the account that paid.
 */
export function simulateUntilPayout(
  setup: SimSetup, odds: Odds, evalPlan: TradePlan, qualify: TradePlan, strategy: Strategy, rand: () => number,
  win = makeWinChance(odds), maxAccounts = 100,
): { spent: number; accounts: number; paid: boolean } {
  let spent = 0;
  let price = setup.eval.fee;
  for (let i = 1; i <= maxAccounts; i++) {
    const life = simulateLifecycle(setup, odds, evalPlan, qualify, strategy, rand, win, price);
    spent += life.fees;
    if (life.payouts.length > 0) return { spent, accounts: i, paid: true };
    price = life.evalEnd === 'passed' ? setup.eval.fee : setup.eval.resetFee;
  }
  return { spent, accounts: maxAccounts, paid: false };
}
