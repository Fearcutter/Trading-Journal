import { describe, it, expect } from 'vitest';
import { buildRangeBands, buildMatrix, buildSizeRows, countOutsideBands, suggestRanges, SIZE_TABLE_BANDS } from './ifvg-sl-analyzer';
import type { Trade } from '../types/trade';

let n = 0;
const t = (p: Partial<Trade>): Trade => ({
  id: `t${n++}`, entry: 100, stopLoss: 90, pointsPL: 0, dollarPL: 0, result: 'loss', customFields: {}, ...p,
} as Trade);
const win = (r: number, p: Partial<Trade> = {}) => t({ result: 'win', pointsPL: r * 10, dollarPL: r * 100, ...p });
const loss = (p: Partial<Trade> = {}) => t({ result: 'loss', pointsPL: -10, dollarPL: -100, ...p });
const methodOf = (x: Trade) => x.customFields?.sl ?? [];
const bands = buildRangeBands([{ from: 0, to: 8 }, { from: 8, to: 15 }, { from: 15, to: 25 }, { from: 25, to: null }]);

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
    expect(rows[0].cells[3].winRate).toBeNull();
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
    expect(rows.map(r => r.label)).toEqual(['0 – 8 pts', '8 – 15 pts', '15 – 25 pts', '25+ pts']);
    expect(rows.map(r => r.trades)).toEqual([2, 1, 0, 1]);
    expect(rows[0].winRate).toBe(50);
    expect(rows[0].netR).toBe(1);
    expect(rows[3].netR).toBe(-1);
  });
});

describe('SIZE_TABLE_BANDS', () => {
  it('uses the fixed point ranges, lower edge included', () => {
    expect(SIZE_TABLE_BANDS.map(b => b.label)).toEqual(['0–2.5', '2.5–5', '5–7.5', '7.5–10', '10–15', '15–20', '20–30', '30–40', '40–50', '50+']);
    const rows = buildSizeRows([loss({ ifvgSize: 2.5 }), loss({ ifvgSize: 2.49 }), loss({ ifvgSize: 50 }), loss({ ifvgSize: 120 })], SIZE_TABLE_BANDS, 'dollarPL');
    expect(rows.map(r => r.trades)).toEqual([1, 1, 0, 0, 0, 0, 0, 0, 0, 2]);
  });
});

describe('buildRangeBands', () => {
  it('names the groups Small / Medium / Large and leaves gaps out', () => {
    const b = buildRangeBands([{ from: 0, to: 8 }, { from: 10, to: 20 }, { from: 20, to: 50 }]);
    expect(b.map(x => x.name)).toEqual(['Small', 'Medium', 'Large']);
    expect(b.map(x => x.label)).toEqual(['0 – 8', '10 – 20', '20 – 50']);
    const sized = [7.9, 8, 9, 10, 20, 49, 50, 60].map(s => loss({ ifvgSize: s, customFields: { sl: ['Hard'] } }));
    const rows = buildMatrix(sized, methodOf, b);
    expect(rows[0].cells.map(c => c.count)).toEqual([1, 1, 2]);
    expect(rows[0].all.count).toBe(4);
    expect(countOutsideBands(sized, b)).toBe(4); // 8, 9, 50, 60
  });

  it('a blank "to" means no upper limit', () => {
    const b = buildRangeBands([{ from: 0, to: 8 }, { from: 8, to: 20 }, { from: 20, to: null }]);
    expect(b[2].label).toBe('20+');
    expect(countOutsideBands([loss({ ifvgSize: 500 })], b)).toBe(0);
  });

  it('counts a trade in every group it fits when ranges overlap', () => {
    const b = buildRangeBands([{ from: 0, to: 10 }, { from: 5, to: 20 }, { from: 20, to: null }]);
    const rows = buildMatrix([loss({ ifvgSize: 7, customFields: { sl: ['Hard'] } })], methodOf, b);
    expect(rows[0].cells.map(c => c.count)).toEqual([1, 1, 0]);
    expect(rows[0].all.count).toBe(1);
  });
});

describe('suggestRanges', () => {
  it('splits your own iFVG sizes into three groups, the last with no upper limit', () => {
    const r = suggestRanges([2, 4, 6, 8, 10, 12, 14, 16, 18].map(s => loss({ ifvgSize: s })));
    expect(r[0].from).toBe(0);
    expect(r[0].to).toBe(r[1].from);
    expect(r[1].to).toBe(r[2].from);
    expect(r[2].to).toBeNull();
    expect(r[0].to!).toBeLessThan(r[1].to!);
  });

  it('falls back to 0–8 / 8–15 / 15+ with too few sizes', () => {
    expect(suggestRanges([loss({ ifvgSize: 3 })])).toEqual([{ from: 0, to: 8 }, { from: 8, to: 15 }, { from: 15, to: null }]);
  });
});
