import { describe, it, expect } from 'vitest';
import { comparePotential } from './potential-trades';
import type { Trade } from '../types/trade';

let n = 0;
// Stop distance 10 points, so pointsPL 20 = +2R.
const t = (pointsPL: number, p: Partial<Trade> = {}): Trade => ({
  id: `t${n++}`, entry: 100, stopLoss: 90, pointsPL, dollarPL: pointsPL * 20,
  result: pointsPL > 0 ? 'win' : pointsPL < 0 ? 'loss' : 'breakeven', ...p,
} as Trade);
const dollars = (tr: Trade) => tr.dollarPL;

describe('comparePotential', () => {
  it('splits taken from potential trades and adds them together', () => {
    const c = comparePotential([t(20), t(-10), t(30, { potential: true }), t(0, { potential: true })], dollars);
    expect(c.taken).toMatchObject({ count: 2, wins: 1, winRate: 50, totalPL: 200, totalR: 1, avgR: 0.5 });
    expect(c.potential).toMatchObject({ count: 2, wins: 1, winRate: 50, totalPL: 600, totalR: 3, avgR: 1.5 });
    expect(c.combined).toMatchObject({ count: 4, wins: 2, winRate: 50, totalPL: 800, totalR: 4, avgR: 1 });
  });

  it('leaves trades without a stop out of R but keeps them in the count and P&L', () => {
    const c = comparePotential([t(20, { potential: true, stopLoss: 100 })], dollars);
    expect(c.potential).toMatchObject({ count: 1, totalPL: 400, totalR: 0, avgR: null });
  });

  it('handles no potential trades', () => {
    const c = comparePotential([t(20)], dollars);
    expect(c.potential).toMatchObject({ count: 0, winRate: 0, avgR: null });
  });
});
