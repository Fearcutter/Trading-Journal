import { describe, it, expect } from 'vitest';
import { buildBands, buildMatrix, buildSizeRows } from './ifvg-sl-analyzer';
import type { Trade } from '../types/trade';

let n = 0;
const t = (p: Partial<Trade>): Trade => ({
  id: `t${n++}`, entry: 100, stopLoss: 90, pointsPL: 0, dollarPL: 0, result: 'loss', customFields: {}, ...p,
} as Trade);
const win = (r: number, p: Partial<Trade> = {}) => t({ result: 'win', pointsPL: r * 10, dollarPL: r * 100, ...p });
const loss = (p: Partial<Trade> = {}) => t({ result: 'loss', pointsPL: -10, dollarPL: -100, ...p });
const methodOf = (x: Trade) => x.customFields?.sl ?? [];
const bands = buildBands(8, 15); // < 8 | 8 – 15 | ≥ 15

describe('buildMatrix win rate', () => {
  it('gives each method × size square a win rate', () => {
    const rows = buildMatrix([
      win(2, { ifvgSize: 5, customFields: { sl: ['Hard below iFVG'] } }),
      loss({ ifvgSize: 6, customFields: { sl: ['Hard below iFVG'] } }),
      loss({ ifvgSize: 20, customFields: { sl: ['Hard below iFVG'] } }),
    ], methodOf, bands);
    expect(rows[0].cells[0].winRate).toBe(50);
    expect(rows[0].cells[1].winRate).toBeNull();
    expect(rows[0].cells[2].winRate).toBe(0);
    expect(rows[0].all.winRate).toBeCloseTo(33.33, 1);
  });
});

describe('buildSizeRows', () => {
  it('gives win rate and net R per size band across all stop methods', () => {
    const rows = buildSizeRows([
      win(2, { ifvgSize: 5 }), loss({ ifvgSize: 7 }),
      win(1, { ifvgSize: 10, customFields: { sl: ['Soft'] } }),
      loss({ ifvgSize: 30 }),
      win(3, {}), // no iFVG size: left out
    ], bands, 'dollarPL');
    expect(rows.map(r => r.label)).toEqual(['< 8 pts', '8 – 15 pts', '≥ 15 pts']);
    expect(rows.map(r => r.trades)).toEqual([2, 1, 1]);
    expect(rows[0].winRate).toBe(50);
    expect(rows[0].netR).toBe(1);
    expect(rows[2].netR).toBe(-1);
  });
});
