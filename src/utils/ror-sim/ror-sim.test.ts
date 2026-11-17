import { describe, it, expect } from 'vitest';
import { mulberry32 } from '../prop-ev';
import { SimAccount } from './account';
import { breakEven, calibrateTheta, estimateWinRate, hitChance } from './price-path';
import { makeWinChance, runEval, runFunded, simulateLifecycle, targetBalance, tradeCost } from './engine';
import { exactEvalPass } from './exact';
import { summarize } from './summary';
import { DEFAULT_EVAL_PLAN, DEFAULT_ODDS, DEFAULT_QUALIFY, DEFAULT_STRATEGIES, LUCID_FLEX_50K } from './presets';
import type { SimInputs, SimSetup, TradePlan } from './types';

const eodRule = { amount: 2000, type: 'eod_trailing' as const, lockAboveStart: 100 };
const onePerDay: TradePlan = { ...DEFAULT_EVAL_PLAN, maxTradesPerDay: 1, extraChance: 0 };
const inputs = (over: Partial<SimInputs> = {}): SimInputs => ({
  setup: LUCID_FLEX_50K, odds: DEFAULT_ODDS, evalPlan: DEFAULT_EVAL_PLAN, qualify: DEFAULT_QUALIFY,
  strategies: DEFAULT_STRATEGIES, runs: 2000, seed: 7, budget: 1000, ...over,
});

describe('end-of-day trailing drawdown', () => {
  it('+$2,000 then -$2,000 the same day survives, and the floor stays at $48,000', () => {
    const a = new SimAccount(50000, eodRule, 'intraday');
    expect(a.trade(2000)).toBe(false);
    expect(a.balance).toBe(52000);
    expect(a.floor).toBe(48000);
    expect(a.room).toBe(4000);
    expect(a.trade(-2000)).toBe(false);
    a.close();
    expect(a.balance).toBe(50000);
    expect(a.floor).toBe(48000);
  });

  it('a close at $52,000 moves the floor to $50,000, and a $2,000 loss then breaks it', () => {
    const a = new SimAccount(50000, eodRule, 'intraday');
    a.trade(2000);
    a.close();
    expect(a.floor).toBe(50000);
    expect(a.trade(-2000)).toBe(true);
  });

  it('close-only mode lets a dip below the floor survive if the day closes above it', () => {
    const a = new SimAccount(50000, eodRule, 'close');
    expect(a.trade(-2500)).toBe(false);
    a.trade(1000);
    expect(a.close()).toBe(false);
    const b = new SimAccount(50000, eodRule, 'intraday');
    expect(b.trade(-2500)).toBe(true);
  });

  it('locks at $50,100', () => {
    const a = new SimAccount(50000, eodRule, 'intraday');
    a.trade(2500);
    a.close();
    expect(a.floor).toBe(50100);
    expect(a.locked).toBe(true);
    a.trade(1000);
    a.close();
    expect(a.floor).toBe(50100);
  });
});

describe('price-path model', () => {
  it('no drift gives the break-even rate', () => {
    expect(hitChance(1, 0)).toBeCloseTo(0.5);
    expect(hitChance(0.15, 0)).toBeCloseTo(1 / 1.15);
  });
  it('recovers the 1:1 win rate it was calibrated to', () => {
    expect(hitChance(1, calibrateTheta(0.65, 1))).toBeCloseTo(0.65, 6);
    expect(hitChance(2, calibrateTheta(0.45, 2))).toBeCloseTo(0.45, 6);
  });
  it('$1,000 stop and $150 target needs 87% to break even, and the estimate sits above it with an edge', () => {
    expect(breakEven(1000, 150)).toBeCloseTo(0.8696, 4);
    const est = estimateWinRate(0.65, 1, 1000, 150);
    expect(est).toBeGreaterThan(0.8696);
    expect(est).toBeLessThan(1);
    expect(estimateWinRate(0.65, 1, 150, 150)).toBe(0.65);
  });
});

describe('evaluation', () => {
  it('best-day rule: target hit with one big day keeps the account trading', () => {
    const setup: SimSetup = { ...LUCID_FLEX_50K, eval: { ...LUCID_FLEX_50K.eval, profitTarget: 3000, consistencyPct: 40, minDays: 1 } };
    // One trade a day of $2,000 reward, all wins: day 2 is $4,000 profit with a 50% best day, day 3 passes
    const plan: TradePlan = { ...onePerDay, risk: 2000, reward: 2000, winRate: 1 };
    const ctx = { setup, odds: DEFAULT_ODDS, win: makeWinChance(DEFAULT_ODDS) };
    expect(runEval(ctx, plan, mulberry32(1))).toMatchObject({ end: 'passed', days: 3 });
  });

  it('Monte Carlo agrees with the exact calculation', () => {
    const exact = exactEvalPass(LUCID_FLEX_50K, onePerDay, 0.65, 0)!;
    expect(exact.pass + exact.fail + exact.unfinished).toBeCloseTo(1, 9);
    const r = summarize(inputs({ runs: 10000, evalPlan: onePerDay }), DEFAULT_STRATEGIES[1]);
    expect(exact.pass).toBeGreaterThanOrEqual(r.eval.pass.lo - 0.005);
    expect(exact.pass).toBeLessThanOrEqual(r.eval.pass.hi + 0.005);
  });
});

describe('funded account and payouts', () => {
  it('half-of-profit rule: $4,000 profit is needed for the full $2,000', () => {
    expect(targetBalance(LUCID_FLEX_50K, 50100, 0)).toBe(54000);
  });

  it('every trade wins: five $2,000 payouts, each lowering the balance', () => {
    const always = { ...DEFAULT_QUALIFY, winRate: 1 };
    const s = { ...DEFAULT_STRATEGIES[1], build: { ...DEFAULT_STRATEGIES[1].build, winRate: 1 }, afterPayout: { ...DEFAULT_STRATEGIES[1].afterPayout, winRate: 1 } };
    const run = runFunded({ setup: LUCID_FLEX_50K, odds: DEFAULT_ODDS, win: makeWinChance(DEFAULT_ODDS) }, s, always, mulberry32(3));
    expect(run.end).toBe('finished');
    expect(run.payouts).toHaveLength(5);
    expect(run.payouts[0].gross).toBe(2000);
    expect(run.payouts[0].net).toBe(1800);
    expect(run.payouts[0].balanceAfter).toBeLessThan(54500);
    expect(run.payouts[0].roomAfter).toBe(run.payouts[0].balanceAfter - 50100);
  });

  it('fixed size keeps the same trade through the qualifying days', () => {
    const f = DEFAULT_STRATEGIES.find(s => s.id === 'F')!;
    const s = { ...f, build: { ...f.build, maxTradesPerDay: 1, winRate: 1 } };
    // A qualifying trade that always loses: a fixed strategy never uses it
    const neverQualify = { ...DEFAULT_QUALIFY, winRate: 0 };
    const run = runFunded({ setup: LUCID_FLEX_50K, odds: DEFAULT_ODDS, win: makeWinChance(DEFAULT_ODDS) }, s, neverQualify, mulberry32(4));
    expect(run.end).toBe('finished');
    // $4,000 at $500 a day = 8 days to the first payout
    expect(run.payouts[0].day).toBe(8);
    expect(run.payouts[0].gross).toBe(2000);
  });

  it('a lifecycle that never pays counts only fees, never the balance', () => {
    const lose = { ...onePerDay, winRate: 0 };
    const life = simulateLifecycle(LUCID_FLEX_50K, DEFAULT_ODDS, lose, DEFAULT_QUALIFY, DEFAULT_STRATEGIES[0], mulberry32(1));
    expect(life.evalEnd).toBe('failed');
    expect(life.net).toBe(-112);
  });
});

describe('summaries', () => {
  it('same seed, same results', () => {
    const a = summarize(inputs({ runs: 500 }), DEFAULT_STRATEGIES[0]);
    const b = summarize(inputs({ runs: 500 }), DEFAULT_STRATEGIES[0]);
    expect(a.money.perEval.mean).toBe(b.money.perEval.mean);
  });

  it('a coin flip at 1:1 with costs loses money', () => {
    const odds = { ...DEFAULT_ODDS, winRate: 0.5, commissionPerContract: 4 };
    const r = summarize(inputs({ runs: 3000, odds }), DEFAULT_STRATEGIES[1]);
    expect(r.money.perEval.mean).toBeLessThan(0);
  });

  it('costs scale with contracts', () => {
    expect(tradeCost(2000, { ...DEFAULT_ODDS, commissionPerContract: 4 })).toBe(16);
  });
});
