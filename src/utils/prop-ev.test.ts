import { describe, it, expect } from 'vitest';
import type { Trade } from '../types/trade';
import {
  normalCdf, kellyFraction, wilsonInterval, binomialAtLeast, binomialPmf, chanceOfLosingStreak,
  edgeStats, tradesToDays, simulateRun, simulateFirm, riskSweep, tidyRisk, mulberry32,
  type FirmConfig, type DrawdownRule,
} from './prop-ev';

const dd = (amount: number, type: DrawdownRule['type'] = 'static', lockAboveStart: number | null = null): DrawdownRule =>
  ({ amount, type, lockAboveStart });

function firm(over: { eval?: Partial<FirmConfig['eval']>; funded?: Partial<FirmConfig['funded']> } = {}): FirmConfig {
  return {
    id: 'x', firm: 'Test', plan: 'Plan', size: 50000, lastChecked: '2026-11-07', verify: [], notes: '',
    eval: {
      fee: 100, billing: 'one_time', profitTarget: 3000, drawdown: dd(2000), dailyLossLimit: null,
      consistencyPct: null, minDays: 1, maxDays: null, ...over.eval,
    },
    funded: {
      activationFee: 0, drawdown: dd(2000), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 1, minDayProfit: 0, buffer: 0, minPayout: 1, payoutCaps: [],
      payoutShareOfProfit: null, split: 1, maxPayouts: 1, ...over.funded,
    },
  };
}

/** A "random" source that picks the given day indexes in order (from a pool of `poolSize` days). */
const picks = (poolSize: number, ...idx: number[]) => {
  let i = 0;
  return () => (idx[Math.min(i++, idx.length - 1)] + 0.5) / poolSize;
};

const opts = (riskPerTrade: number, costPerTrade = 0) => ({ riskPerTrade, costPerTrade });

describe('stats formulas', () => {
  it('normal curve', () => {
    expect(normalCdf(0)).toBeCloseTo(0.5, 6);
    expect(normalCdf(1.96)).toBeCloseTo(0.975, 3);
    expect(normalCdf(-1.96)).toBeCloseTo(0.025, 3);
  });

  it('Kelly: f = W − (1−W)/b', () => {
    expect(kellyFraction(0.5, 2, 1)).toBeCloseTo(0.25);   // 50% at 2:1
    expect(kellyFraction(0.6, 1, 1)).toBeCloseTo(0.2);    // 60% at 1:1
    expect(kellyFraction(0.4, 1, 1)).toBeCloseTo(-0.2);   // no edge → negative
  });

  it('Wilson range for 50 wins out of 100', () => {
    const [lo, hi] = wilsonInterval(50, 100);
    expect(lo).toBeCloseTo(0.404, 3);
    expect(hi).toBeCloseTo(0.596, 3);
  });

  it('binomial', () => {
    expect(binomialPmf(4, 2, 0.5)).toBeCloseTo(6 / 16);
    expect(binomialAtLeast(10, 5, 0.5)).toBeCloseTo(638 / 1024);
    expect(binomialAtLeast(10, 0, 0.3)).toBeCloseTo(1);
  });

  it('losing streak odds match counting by hand', () => {
    expect(chanceOfLosingStreak(2, 2, 0.5)).toBeCloseTo(0.25);
    expect(chanceOfLosingStreak(3, 2, 0.5)).toBeCloseTo(3 / 8);  // LLW, LLL, WLL
    expect(chanceOfLosingStreak(4, 1, 0.5)).toBeCloseTo(1 - 1 / 16);
    expect(chanceOfLosingStreak(3, 4, 0.5)).toBe(0);
  });

  it('edge stats', () => {
    const s = edgeStats([2, -1, 2, -1]);
    expect(s.winRate).toBe(0.5);
    expect(s.avgR).toBe(0.5);
    expect(s.avgWinR).toBe(2);
    expect(s.avgLossR).toBe(1);
    expect(s.kelly).toBeCloseTo(0.25);
    expect(s.stdR).toBeCloseTo(Math.sqrt(9 / 3));   // sample std dev
    expect(s.chanceNoEdge).toBeGreaterThan(0);
    expect(s.chanceNoEdge).toBeLessThan(0.5);
  });
});

describe('tradesToDays', () => {
  const t = (date: string, time: string, pointsPL: number, stopLoss = 90) =>
    ({ id: date + time, date, time, entry: 100, stopLoss, pointsPL } as Trade);
  it('groups by date in time order and skips trades without a stop', () => {
    const { days, used, skipped } = tradesToDays([
      t('2026-01-02', '10:00', 10), t('2026-01-01', '11:00', -10), t('2026-01-01', '09:30', 20), t('2026-01-03', '09:30', 5, 100),
    ]);
    expect(days).toEqual([[2, -1], [1]]);
    expect(used).toBe(3);
    expect(skipped).toBe(1);
  });
});

describe('evaluation', () => {
  it('passes once the target is reached', () => {
    const r = simulateRun([[1]], firm(), opts(1000), picks(1, 0));
    expect(r.evalEnd).toBe('passed');
    expect(r.daysToPass).toBe(3);
  });

  it('consistency: a single big day has to be balanced by more profit', () => {
    // +3R day = $3,000 = 100% of profit; second +3R day makes it 50%
    const r = simulateRun([[3]], firm({ eval: { consistencyPct: 50 } }), opts(1000), picks(1, 0));
    expect(r.daysToPass).toBe(2);
  });

  it('static drawdown: blown when losses reach the limit', () => {
    const r = simulateRun([[-1]], firm(), opts(600), picks(1, 0));
    expect(r.evalEnd).toBe('blown');   // -600 x4 = -2,400 passes the -2,000 floor
  });

  it('end-of-day trailing floor follows new closing highs', () => {
    const days = [[1], [-1]];
    const seq = () => picks(2, 0, 0, 1, 1);
    const trailing = simulateRun(days, firm({ eval: { drawdown: dd(2000, 'eod_trailing'), profitTarget: 9000 } }), opts(1000), seq());
    expect(trailing.evalEnd).toBe('blown');   // high 52,000 → floor 50,000; back to 50,000 = blown
    const fixed = simulateRun(days, firm({ eval: { profitTarget: 9000, maxDays: 4 } }), opts(1000), seq());
    expect(fixed.evalEnd).toBe('timeout');
  });

  it('trailing stops at the lock level', () => {
    const days = [[1], [-1]];
    // floor would trail to 51,000 but locks at start + 0 = 50,000; ending at 50,500 survives
    const r = simulateRun(days, firm({ eval: { drawdown: dd(2000, 'eod_trailing', 0), profitTarget: 9000, maxDays: 5 } }), opts(1000),
      picks(2, 0, 0, 0, 1, 1));
    expect(r.evalEnd).toBe('timeout');
  });

  it('intraday trailing reacts inside the day, end-of-day does not', () => {
    const days = [[2, -2.5]];
    const intraday = simulateRun(days, firm({ eval: { drawdown: dd(2000, 'intraday_trailing'), maxDays: 1 } }), opts(1000), picks(1, 0));
    const eod = simulateRun(days, firm({ eval: { drawdown: dd(2000, 'eod_trailing'), maxDays: 1 } }), opts(1000), picks(1, 0));
    expect(intraday.evalEnd).toBe('blown');
    expect(eod.evalEnd).toBe('timeout');
  });

  it('daily loss limit stops the day at the limit without failing', () => {
    const r = simulateRun([[-1, -1, -1]], firm({ eval: { dailyLossLimit: 1000, drawdown: dd(5000), maxDays: 2 } }), opts(500), picks(1, 0));
    expect(r.evalEnd).toBe('timeout');   // -1,000 a day, two days = -2,000, still above -5,000
    const noLimit = simulateRun([[-1, -1, -1]], firm({ eval: { drawdown: dd(2900), maxDays: 2 } }), opts(500), picks(1, 0));
    expect(noLimit.evalEnd).toBe('blown');   // -1,500 a day
  });

  it('monthly fees are charged every 20 trading days until it ends', () => {
    const flat = [[0]];
    expect(simulateRun(flat, firm({ eval: { billing: 'monthly' } }), opts(100), picks(1, 0)).fees).toBe(300);  // 60 days → 3 bills
    expect(simulateRun(flat, firm(), opts(100), picks(1, 0)).fees).toBe(100);
  });
});

describe('funded account', () => {
  it('pays the capped amount at the split, after the qualifying days', () => {
    const cfg = firm({ eval: { profitTarget: 1000 }, funded: { minDaysPerPayout: 2, minDayProfit: 100, payoutCaps: [500], split: 0.9, activationFee: 50 } });
    const r = simulateRun([[1]], cfg, opts(1000), picks(1, 0));
    expect(r.payouts).toBe(1);
    expect(r.paid).toBeCloseTo(450);
    expect(r.fees).toBe(150);
  });

  it('buffer and share-of-profit limit the payout', () => {
    // After 3 days of +1,000: profit 3,000. Buffer 2,000 → 1,000 available; 50% of profit = 1,500 → 1,000
    const cfg = firm({ eval: { profitTarget: 1000 }, funded: { minDaysPerPayout: 3, buffer: 2000, payoutShareOfProfit: 0.5 } });
    expect(simulateRun([[1]], cfg, opts(1000), picks(1, 0)).paid).toBe(1000);
  });

  it('days below the minimum profit do not count toward a payout', () => {
    const cfg = firm({ eval: { profitTarget: 100 }, funded: { minDaysPerPayout: 1, minDayProfit: 200 } });
    // +0.1R days at $1,000 = $100: never qualify, so no payout before the funded cap
    expect(simulateRun([[0.1]], cfg, opts(1000), picks(1, 0)).payouts).toBe(0);
  });
});

describe('simulateFirm and riskSweep', () => {
  const winning = [[1], [1], [-1], [2], [-1]];   // +0.4R per trade
  const losing = [[1], [-1], [-1], [-1], [1]];   // -0.2R per trade

  it('same seed gives the same answer', () => {
    const a = simulateFirm(winning, firm(), { riskPerTrade: 400, costPerTrade: 0, runs: 300, seed: 7 });
    const b = simulateFirm(winning, firm(), { riskPerTrade: 400, costPerTrade: 0, runs: 300, seed: 7 });
    expect(a).toEqual(b);
  });

  it('rates add up and a real edge beats a losing one', () => {
    const cfg = firm({ funded: { maxPayouts: 5, minDaysPerPayout: 5, payoutCaps: [2000] } });
    const win = simulateFirm(winning, cfg, { riskPerTrade: 300, costPerTrade: 0, runs: 2000 });
    const lose = simulateFirm(losing, cfg, { riskPerTrade: 300, costPerTrade: 0, runs: 2000 });
    expect(win.passRate + win.evalBlowRate + win.evalTimeoutRate).toBeCloseTo(1);
    expect(win.passRate).toBeGreaterThan(0.6);
    expect(win.ev).toBeGreaterThan(0);
    expect(lose.ev).toBeLessThan(win.ev);
    expect(lose.passRate).toBeLessThan(0.2);
  });

  it('bigger risk blows the evaluation more often', () => {
    const cfg = firm({ eval: { drawdown: dd(2000, 'eod_trailing') } });
    const small = simulateFirm(winning, cfg, { riskPerTrade: 150, costPerTrade: 0, runs: 2000 });
    const big = simulateFirm(winning, cfg, { riskPerTrade: 800, costPerTrade: 0, runs: 2000 });
    expect(big.evalBlowRate).toBeGreaterThan(small.evalBlowRate);
  });

  it('per-trade costs lower the EV', () => {
    const cfg = firm({ funded: { maxPayouts: 3, minDaysPerPayout: 5 } });
    const free = simulateFirm(winning, cfg, { riskPerTrade: 300, costPerTrade: 0, runs: 1000 });
    const costly = simulateFirm(winning, cfg, { riskPerTrade: 300, costPerTrade: 60, runs: 1000 });
    expect(costly.ev).toBeLessThan(free.ev);
  });

  it('sweep tries tidy risk sizes and marks the best EV', () => {
    const { points, best } = riskSweep(winning, firm(), { costPerTrade: 0, runs: 200 });
    expect(points.length).toBeGreaterThan(5);
    expect(best!.ev).toBe(Math.max(...points.map(p => p.ev)));
    expect(tidyRisk(43)).toBe(45);
    expect(tidyRisk(247)).toBe(250);
  });

  it('no trades: just the fee', () => {
    const s = simulateFirm([], firm(), { riskPerTrade: 100, costPerTrade: 0, runs: 10 });
    expect(s.ev).toBe(-100);
    expect(s.passRate).toBe(0);
  });

  it('seeded random is between 0 and 1', () => {
    const r = mulberry32(1);
    for (let i = 0; i < 100; i++) { const x = r(); expect(x).toBeGreaterThanOrEqual(0); expect(x).toBeLessThan(1); }
  });
});

describe('minimum profit per payout cycle', () => {
  it('waits until the cycle has made enough', () => {
    // +$200 days: after 3 days the cycle has $600 ≥ $500 → pays on day 3; with $700 needed it waits for day 4
    const run = (minCycleProfit: number) => {
      const cfg = firm({ eval: { profitTarget: 100 }, funded: { minDaysPerPayout: 3, minCycleProfit, payoutCaps: [100] } });
      let days = 0;
      const rand = picks(1, 0);
      const counting = () => { days++; return rand(); };
      simulateRun([[0.2]], cfg, opts(1000), counting);
      return days - 1;   // minus the evaluation day
    };
    expect(run(500)).toBe(3);
    expect(run(700)).toBe(4);
  });
});
