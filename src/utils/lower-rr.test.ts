import { describe, it, expect } from 'vitest';
import { replayR, rrVarianceRow, analyzeLowerRR, RR_TARGETS } from './lower-rr';
import type { Trade } from '../types/trade';

let n = 0;
// Stop distance 10 points: pointsPL 10 = +1R, mfe 20 = price went 2R in favour.
const t = (pointsPL: number, mfe: number | undefined, p: Partial<Trade> = {}): Trade => ({
  id: `t${n++}`, date: '2026-01-01', time: '09:30', entry: 100, stopLoss: 90, pointsPL, mfe, ...p,
} as Trade);

describe('replayR', () => {
  it('takes the target when price reached it, otherwise keeps what really happened', () => {
    expect(replayR(t(30, 35), 1)).toBe(1);      // ran to 3.5R, real +3R → +1R at a 1R target
    expect(replayR(t(-10, 8), 1)).toBe(-1);     // only got to 0.8R, stopped out → keeps -1R
    expect(replayR(t(0, 8), 1)).toBe(0);        // got to 0.8R, breakeven → keeps 0R
    expect(replayR(t(-10, 10), 1)).toBe(1);     // touched exactly 1R → counts as hit
  });

  it('a trade you took profit on early does not stay a win at a bigger target', () => {
    // Went 1.2R in favour, you took +1R. With a 3R target you'd still be in when it turned:
    // it had reached 1R, so the stop was at breakeven → 0R.
    expect(replayR(t(10, 12), 3)).toBe(0);
    // Went 0.6R, you took +0.5R. With a 2R target it never reached 1R → stopped out, -1R.
    expect(replayR(t(5, 6), 2)).toBe(-1);
    // Same trade at a 0.5R target: reached it → +0.5R.
    expect(replayR(t(5, 6), 0.5)).toBe(0.5);
  });

  it('win rate drops as the target grows when winners exit early', () => {
    const trades = [t(10, 12), t(10, 15), t(20, 25), t(-10, 3)];
    const { rows } = analyzeLowerRR(trades);
    const wr = (label: string) => rows.find(r => r.label === label)!.winRate;
    expect(wr('1R')).toBe(75);
    expect(wr('1.5R')).toBe(50);
    expect(wr('3R')).toBe(0);
  });

  it('is null without MFE or a stop', () => {
    expect(replayR(t(10, undefined), 1)).toBeNull();
    expect(replayR(t(10, 20, { stopLoss: 100 }), 1)).toBeNull();
  });
});

describe('rrVarianceRow', () => {
  it('works out win %, totals, worst drawdown, losing streak and swing from a list of R', () => {
    const row = rrVarianceRow('x', [1, -1, -1, -1, 2, 0, -1, 1]);
    expect(row.trades).toBe(8);
    expect(row.winRate).toBe(37.5);           // 3 of 8 above 0R; breakeven isn't a win
    expect(row.totalR).toBe(0);
    expect(row.rPerTrade).toBe(0);
    expect(row.maxDrawdownR).toBe(3);          // peak +1 → low -2
    expect(row.longestLosingStreak).toBe(3);
    expect(row.swing).toBeCloseTo(Math.sqrt(10 / 8), 5);
  });

  it('counts a drop from the start as drawdown', () => {
    expect(rrVarianceRow('x', [-1, -1, 3]).maxDrawdownR).toBe(2);
  });

  it('handles no trades', () => {
    const row = rrVarianceRow('x', []);
    expect(row.trades).toBe(0);
    expect(row.rPerTrade).toBeNull();
    expect(row.swing).toBeNull();
  });
});

describe('analyzeLowerRR', () => {
  it('one row per target plus what you did, trades in date and time order, and counts left-out trades', () => {
    const trades = [
      t(-10, 5, { date: '2026-01-02' }),
      t(30, 30, { date: '2026-01-01', time: '10:00' }),
      t(-10, 15, { date: '2026-01-01', time: '09:00' }),
      t(10, undefined),
    ];
    const { rows, used, missingMFE } = analyzeLowerRR(trades);
    expect(rows.map(r => r.label)).toEqual([...RR_TARGETS.map(x => `${x}R`), 'What you did']);
    expect(used).toBe(3);
    expect(missingMFE).toBe(1);
    const oneR = rows.find(r => r.label === '1R')!;
    expect(oneR.totalR).toBe(1);               // +1, +1, -1
    const actual = rows[rows.length - 1];
    expect(actual.totalR).toBe(1);             // -1, +3, -1
    expect(actual.maxDrawdownR).toBe(1);
  });
});
