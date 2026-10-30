import type { Trade } from '../types/trade';
import type { CustomCategory } from '../types/settings';
import type { PLField } from './pl-helpers';
import { getTradeValue } from './pl-helpers';
import { splitCustomFields } from './custom-field-groups';

/** Fewer trades than this (on either side of a comparison) is a small sample. */
export const MIN_SAMPLE = 10;

export type TradeScope = 'live' | 'backtest' | 'all';
type LabelsOf = (t: Trade) => string[];

/** Result in R (points / stop distance), or null when the trade has no stop distance. */
export function tradeR(t: Trade): number | null {
  const risk = Math.abs(t.entry - t.stopLoss);
  if (!risk || !Number.isFinite(risk)) return null;
  return t.pointsPL / risk;
}

export interface Summary {
  trades: number;
  winRate: number;
  /** Trades with a stop, i.e. the ones R per trade is based on. */
  rTrades: number;
  rPerTrade: number | null;
  totalPL: number;
}

export function summarize(trades: Trade[], plField: PLField): Summary {
  let wins = 0, rSum = 0, rTrades = 0, totalPL = 0;
  for (const t of trades) {
    if (t.result === 'win') wins++;
    totalPL += getTradeValue(t, plField);
    const r = tradeR(t);
    if (r !== null) { rSum += r; rTrades++; }
  }
  return {
    trades: trades.length,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    rTrades,
    rPerTrade: rTrades ? rSum / rTrades : null,
    totalPL,
  };
}

/** FOR / AGAINST lists per trade, including custom fields set to count as confluences ("TDI: Cross"). */
export function confluenceLists(categories: CustomCategory[] | undefined, sectionOrder: string[] | undefined) {
  const groups = splitCustomFields(categories, sectionOrder);
  const fieldLabels = (t: Trade, cats: CustomCategory[]) =>
    cats.flatMap(cat => (t.customFields?.[cat.id] ?? []).map(v => `${cat.name}: ${v}`));
  return {
    forOf: (t: Trade) => [...(t.confluences ?? []), ...fieldLabels(t, groups.for)],
    againstOf: (t: Trade) => [...(t.confluencesAgainst ?? []), ...fieldLabels(t, groups.against)],
  };
}

export interface EdgeRow {
  name: string;
  with: Summary;
  without: Summary;
  /** R per trade with it minus without it. */
  edgeR: number | null;
  sufficient: boolean;
}

/** Each confluence: trades with it vs trades without it. Most used first. */
export function analyzeEdge(trades: Trade[], labelsOf: LabelsOf, plField: PLField): EdgeRow[] {
  const names = new Set(trades.flatMap(labelsOf));
  return [...names]
    .map(name => {
      const withIt = trades.filter(t => labelsOf(t).includes(name));
      const withoutIt = trades.filter(t => !labelsOf(t).includes(name));
      const w = summarize(withIt, plField);
      const wo = summarize(withoutIt, plField);
      return {
        name,
        with: w,
        without: wo,
        edgeR: w.rPerTrade !== null && wo.rPerTrade !== null ? w.rPerTrade - wo.rPerTrade : null,
        sufficient: w.trades >= MIN_SAMPLE && wo.trades >= MIN_SAMPLE,
      };
    })
    .sort((a, b) => b.with.trades - a.with.trades);
}

export interface BucketRow { label: string; stats: Summary }

function bucketBy(trades: Trade[], labels: string[], bucketOf: (t: Trade) => string, plField: PLField): BucketRow[] {
  return labels.map(label => ({ label, stats: summarize(trades.filter(t => bucketOf(t) === label), plField) }));
}

/** Results by number of FOR confluences: 0, 1, 2, 3, 4+. */
export function analyzeForCount(trades: Trade[], forOf: LabelsOf, plField: PLField): BucketRow[] {
  return bucketBy(trades, ['0', '1', '2', '3', '4+'], t => {
    const n = forOf(t).length;
    return n >= 4 ? '4+' : String(n);
  }, plField);
}

/** Results by FOR count minus AGAINST count: ≤ -1, 0, 1, 2, 3, 4+. */
export function analyzeNetScore(trades: Trade[], forOf: LabelsOf, againstOf: LabelsOf, plField: PLField): BucketRow[] {
  return bucketBy(trades, ['≤ -1', '0', '1', '2', '3', '4+'], t => {
    const n = forOf(t).length - againstOf(t).length;
    return n <= -1 ? '≤ -1' : n >= 4 ? '4+' : String(n);
  }, plField);
}

/** Trades by number of AGAINST confluences present, and the R cost of taking trades with any. */
export function analyzeAgainstCost(trades: Trade[], againstOf: LabelsOf, plField: PLField) {
  const count = (t: Trade) => againstOf(t).length;
  const none = summarize(trades.filter(t => count(t) === 0), plField);
  const anyAgainst = summarize(trades.filter(t => count(t) > 0), plField);
  return {
    none,
    one: summarize(trades.filter(t => count(t) === 1), plField),
    twoPlus: summarize(trades.filter(t => count(t) >= 2), plField),
    anyAgainst,
    costR: none.rPerTrade !== null && anyAgainst.rPerTrade !== null ? anyAgainst.rPerTrade - none.rPerTrade : null,
    sufficient: none.trades >= MIN_SAMPLE && anyAgainst.trades >= MIN_SAMPLE,
  };
}

export interface ComboRow { combo: string[]; count: number; winRate: number; avgPL: number; rPerTrade: number | null }

/** Pairs of FOR confluences seen at least minCount times, best win rate first. */
export function analyzeCombos(trades: Trade[], forOf: LabelsOf, plField: PLField, minCount = 3): ComboRow[] {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const labels = [...new Set(forOf(t))].sort();
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) {
        const key = `${labels[i]}|||${labels[j]}`;
        const list = map.get(key);
        if (list) list.push(t); else map.set(key, [t]);
      }
    }
  }
  return [...map.entries()]
    .filter(([, ts]) => ts.length >= minCount)
    .map(([key, ts]) => {
      const s = summarize(ts, plField);
      return { combo: key.split('|||'), count: s.trades, winRate: s.winRate, avgPL: s.totalPL / s.trades, rPerTrade: s.rPerTrade };
    })
    .sort((a, b) => b.winRate - a.winRate);
}

/**
 * Grid of the `limit` most-used FOR confluences: grid[i][j] is trades that had both names[i] and names[j]
 * (null on the diagonal). totalNames is how many confluences there are before the limit.
 */
export function analyzePairGrid(trades: Trade[], forOf: LabelsOf, plField: PLField, limit = 8) {
  const usage = new Map<string, number>();
  const labelSets = trades.map(t => new Set(forOf(t)));
  for (const set of labelSets) for (const name of set) usage.set(name, (usage.get(name) ?? 0) + 1);
  const ranked = [...usage.entries()].sort((a, b) => b[1] - a[1]).map(([name]) => name);
  const names = ranked.slice(0, limit);
  const grid: (Summary | null)[][] = names.map(() => names.map(() => null));
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const both = trades.filter((_, k) => labelSets[k].has(names[i]) && labelSets[k].has(names[j]));
      grid[i][j] = grid[j][i] = summarize(both, plField);
    }
  }
  return { names, grid, totalNames: ranked.length };
}

/** Live = no session or a live session (same as the Dashboard). Backtest = a current backtest session. */
export function scopeTrades(trades: Trade[], scope: TradeScope, liveSessionIds: Set<string>, backtestSessionIds: Set<string>): Trade[] {
  if (scope === 'live') return trades.filter(t => !t.sessionId || liveSessionIds.has(t.sessionId));
  if (scope === 'backtest') return trades.filter(t => !!t.sessionId && backtestSessionIds.has(t.sessionId));
  return trades;
}

/** "+0.42R", "-1.00R", or "—" when there's no R. */
export function formatR(r: number | null): string {
  if (r === null) return '—';
  return `${r >= 0 ? '+' : ''}${r.toFixed(2)}R`;
}
