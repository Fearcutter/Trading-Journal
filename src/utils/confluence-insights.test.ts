import { describe, it, expect } from 'vitest';
import {
  tradeR, summarize, confluenceLists, analyzeEdge, analyzeForCount, analyzeNetScore,
  analyzeAgainstCost, analyzeCombos, scopeTrades,
} from './confluence-insights';
import type { Trade } from '../types/trade';
import type { CustomCategory } from '../types/settings';

// entry 100, stop 90 → 10 points of risk; pointsPL 20 → +2R
let n = 0;
const t = (p: Partial<Trade>): Trade => ({
  id: `t${n++}`, entry: 100, stopLoss: 90, pointsPL: 0, dollarPL: 0, result: 'loss',
  confluences: [], confluencesAgainst: [], customFields: {}, ...p,
} as Trade);
const win = (r: number, p: Partial<Trade> = {}) => t({ result: 'win', pointsPL: r * 10, dollarPL: r * 100, ...p });
const loss = (p: Partial<Trade> = {}) => t({ result: 'loss', pointsPL: -10, dollarPL: -100, ...p });

describe('tradeR', () => {
  it('is points over risk', () => {
    expect(tradeR(win(2))).toBe(2);
    expect(tradeR(loss())).toBe(-1);
  });
  it('is null when there is no stop distance', () => {
    expect(tradeR(t({ stopLoss: 100, pointsPL: 5 }))).toBeNull();
  });
});

describe('summarize', () => {
  it('counts win rate, R per trade and total P&L, leaving no-stop trades out of R', () => {
    const s = summarize([win(2), loss(), t({ stopLoss: 100, result: 'win', dollarPL: 50 })], 'dollarPL');
    expect(s.trades).toBe(3);
    expect(s.winRate).toBeCloseTo(66.67, 1);
    expect(s.rTrades).toBe(2);
    expect(s.rPerTrade).toBe(0.5); // (2 + -1) / 2
    expect(s.totalPL).toBe(150);
  });
  it('has no R per trade when nothing has a stop', () => {
    expect(summarize([], 'dollarPL').rPerTrade).toBeNull();
  });
});

describe('confluenceLists', () => {
  const cats: CustomCategory[] = [
    { id: 'tdi', name: 'TDI', options: [], confluenceGroup: 'for' },
    { id: 'news', name: 'News', options: [], confluenceGroup: 'against' },
    { id: 'sess', name: 'Session', options: [] },
  ];
  it('adds FOR/AGAINST custom fields as "Field: value"', () => {
    const { forOf, againstOf } = confluenceLists(cats, []);
    const trade = t({ confluences: ['Sweep'], customFields: { tdi: ['Cross'], news: ['CPI'], sess: ['NY'] } });
    expect(forOf(trade)).toEqual(['Sweep', 'TDI: Cross']);
    expect(againstOf(trade)).toEqual(['News: CPI']);
  });
});

describe('analyzeEdge', () => {
  it('compares trades with and without each confluence', () => {
    // Sweep: 2 wins of +2R. Without: 2 losses.
    const trades = [win(2, { confluences: ['Sweep'] }), win(2, { confluences: ['Sweep'] }), loss(), loss()];
    const [row] = analyzeEdge(trades, x => x.confluences, 'dollarPL');
    expect(row.name).toBe('Sweep');
    expect(row.with.trades).toBe(2);
    expect(row.with.winRate).toBe(100);
    expect(row.with.rPerTrade).toBe(2);
    expect(row.without.rPerTrade).toBe(-1);
    expect(row.edgeR).toBe(3);
    expect(row.sufficient).toBe(false);
  });
  it('needs 10 trades on both sides to count as enough data', () => {
    const trades = [
      ...Array.from({ length: 10 }, () => win(1, { confluences: ['A'] })),
      ...Array.from({ length: 10 }, () => loss()),
    ];
    expect(analyzeEdge(trades, x => x.confluences, 'dollarPL')[0].sufficient).toBe(true);
  });
  it('sorts by most used', () => {
    const trades = [loss({ confluences: ['A'] }), loss({ confluences: ['B'] }), loss({ confluences: ['B'] })];
    expect(analyzeEdge(trades, x => x.confluences, 'dollarPL').map(r => r.name)).toEqual(['B', 'A']);
  });
});

describe('stacking', () => {
  const forOf = (x: Trade) => x.confluences;
  const againstOf = (x: Trade) => x.confluencesAgainst;
  it('groups by number of FOR confluences, 4+ together', () => {
    const trades = [loss(), win(1, { confluences: ['a'] }), win(1, { confluences: ['a', 'b', 'c', 'd'] }), win(1, { confluences: ['a', 'b', 'c', 'd', 'e'] })];
    const rows = analyzeForCount(trades, forOf, 'dollarPL');
    expect(rows.map(r => r.label)).toEqual(['0', '1', '2', '3', '4+']);
    expect(rows.map(r => r.stats.trades)).toEqual([1, 1, 0, 0, 2]);
  });
  it('groups by FOR minus AGAINST, -1 or less together', () => {
    const trades = [
      loss({ confluencesAgainst: ['x', 'y'] }),            // -2
      loss({ confluences: ['a'], confluencesAgainst: ['x'] }), // 0
      win(1, { confluences: ['a', 'b'] }),                  // 2
    ];
    const rows = analyzeNetScore(trades, forOf, againstOf, 'dollarPL');
    expect(rows.map(r => r.label)).toEqual(['≤ -1', '0', '1', '2', '3', '4+']);
    expect(rows.map(r => r.stats.trades)).toEqual([1, 1, 0, 1, 0, 0]);
  });
});

describe('analyzeAgainstCost', () => {
  it('splits trades by how many warnings were present', () => {
    const trades = [win(2), loss({ confluencesAgainst: ['x'] }), loss({ confluencesAgainst: ['x', 'y'] }), loss({ confluencesAgainst: ['x', 'y', 'z'] })];
    const r = analyzeAgainstCost(trades, x => x.confluencesAgainst, 'dollarPL');
    expect([r.none.trades, r.one.trades, r.twoPlus.trades]).toEqual([1, 1, 2]);
    expect(r.anyAgainst.trades).toBe(3);
    expect(r.costR).toBe(-3); // -1R with a warning vs +2R without
  });
});

describe('analyzeCombos', () => {
  it('finds pairs seen enough times, with R per trade', () => {
    const trades = [
      win(2, { confluences: ['A', 'B'] }), win(2, { confluences: ['B', 'A'] }), loss({ confluences: ['A', 'B', 'C'] }),
    ];
    const combos = analyzeCombos(trades, x => x.confluences, 'dollarPL', 3);
    expect(combos).toHaveLength(1);
    expect(combos[0].combo).toEqual(['A', 'B']);
    expect(combos[0].count).toBe(3);
    expect(combos[0].rPerTrade).toBe(1); // (2 + 2 - 1) / 3
  });
});

describe('scopeTrades', () => {
  const live = t({}); const inLive = t({ sessionId: 'L' }); const bt = t({ sessionId: 'B' }); const orphan = t({ sessionId: 'gone' });
  const all = [live, inLive, bt, orphan];
  it('live = no session or a live session', () => {
    expect(scopeTrades(all, 'live', new Set(['L']), new Set(['B']))).toEqual([live, inLive]);
  });
  it('backtest = a current backtest session', () => {
    expect(scopeTrades(all, 'backtest', new Set(['L']), new Set(['B']))).toEqual([bt]);
  });
  it('all = everything', () => {
    expect(scopeTrades(all, 'all', new Set(['L']), new Set(['B']))).toEqual(all);
  });
});
