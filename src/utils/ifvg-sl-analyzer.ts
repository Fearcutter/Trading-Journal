import type { Trade } from '../types/trade';
import { getRealizedR, getStopDistance } from './r-multiple';

/** Cells built on fewer trades than this are flagged as unreliable. */
export const THIN_SAMPLE_THRESHOLD = 5;

/** Used when there is too little size data to derive sensible cutoffs. */
const FALLBACK_CUTOFFS: [number, number] = [8, 15];

export interface SizeBand {
  label: string;
  min: number | null; // null = unbounded below (first band)
  max: number | null; // null = unbounded above (last band)
}

export interface MatrixCell {
  avgR: number | null;
  count: number;
  thin: boolean;
}

export interface MatrixRow {
  method: string;
  cells: MatrixCell[]; // one per band, same order as the bands passed in
  all: MatrixCell;     // every band combined
  totalCount: number;
}

export interface ScatterPoint {
  size: number;
  r: number;
  method: string;
  date: string;
  instrument: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Trim a trailing ".0" so labels read "8" rather than "8.0". */
function fmt(n: number): string {
  return String(Number(n.toFixed(2)));
}

function percentile(sorted: number[], fraction: number): number {
  const idx = Math.round(fraction * (sorted.length - 1));
  return sorted[Math.min(sorted.length - 1, Math.max(0, idx))];
}

/**
 * Starting cutoffs derived from the trader's own gap sizes, splitting them
 * into three roughly even groups.
 *
 * Deliberately ignores the selected stop-method category: the bands describe
 * the size axis alone, and making them category-dependent would shift the
 * columns every time the dropdown changed.
 */
export function suggestCutoffs(trades: Trade[]): [number, number] {
  const sizes = trades
    .map(t => t.ifvgSize)
    .filter((s): s is number => s != null)
    .sort((a, b) => a - b);

  if (sizes.length < 3) return FALLBACK_CUTOFFS;
  return [round1(percentile(sizes, 1 / 3)), round1(percentile(sizes, 2 / 3))];
}

/**
 * Three bands from two cutoffs. The inputs are sorted, so entering them in
 * either order gives the same result. Equal cutoffs produce an empty middle
 * band — a valid state the UI explains rather than rejects.
 */
export function buildBands(lo: number, hi: number): SizeBand[] {
  const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
  return [
    { label: `< ${fmt(a)}`, min: null, max: a },
    { label: `${fmt(a)} – ${fmt(b)}`, min: a, max: b },
    { label: `≥ ${fmt(b)}`, min: b, max: null },
  ];
}

function bandIndexOf(size: number, bands: SizeBand[]): number {
  for (let i = 0; i < bands.length; i++) {
    const { min, max } = bands[i];
    if ((min === null || size >= min) && (max === null || size < max)) return i;
  }
  return -1;
}

interface Acc { sum: number; count: number }
const emptyAcc = (): Acc => ({ sum: 0, count: 0 });

function toCell(a: Acc): MatrixCell {
  return {
    avgR: a.count > 0 ? a.sum / a.count : null,
    count: a.count,
    thin: a.count > 0 && a.count < THIN_SAMPLE_THRESHOLD,
  };
}

/**
 * Average realized R per stop method per size band.
 *
 * A trade carrying several methods is counted under each of them, matching
 * how analyzeConfluences treats multi-value fields. Counts across a row can
 * therefore exceed the number of distinct trades.
 */
export function buildMatrix(
  trades: Trade[],
  extractor: (t: Trade) => string[],
  bands: SizeBand[],
): MatrixRow[] {
  const methods = new Map<string, { bands: Acc[]; all: Acc }>();

  for (const trade of trades) {
    if (trade.ifvgSize == null) continue;
    const r = getRealizedR(trade);
    if (r === null) continue;
    const idx = bandIndexOf(trade.ifvgSize, bands);
    if (idx < 0) continue;

    for (const method of extractor(trade)) {
      let entry = methods.get(method);
      if (!entry) {
        entry = { bands: bands.map(emptyAcc), all: emptyAcc() };
        methods.set(method, entry);
      }
      entry.bands[idx].sum += r;
      entry.bands[idx].count++;
      entry.all.sum += r;
      entry.all.count++;
    }
  }

  return [...methods.entries()]
    .map(([method, acc]) => ({
      method,
      cells: acc.bands.map(toCell),
      all: toCell(acc.all),
      totalCount: acc.all.count,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);
}

/** One point per (trade, method) pair, on the same eligibility rules as the matrix. */
export function buildScatterPoints(
  trades: Trade[],
  extractor: (t: Trade) => string[],
): ScatterPoint[] {
  const points: ScatterPoint[] = [];
  for (const trade of trades) {
    if (trade.ifvgSize == null) continue;
    const r = getRealizedR(trade);
    if (r === null) continue;
    for (const method of extractor(trade)) {
      points.push({
        size: trade.ifvgSize,
        r,
        method,
        date: trade.date,
        instrument: trade.instrument,
      });
    }
  }
  return points;
}

/**
 * Why trades were left out, so the empty state can say what backfilling buys.
 * Each trade is attributed to at most one reason.
 */
export function countIneligible(
  trades: Trade[],
  extractor: (t: Trade) => string[],
): { missingSize: number; missingMethod: number; noStopDistance: number } {
  let missingSize = 0;
  let missingMethod = 0;
  let noStopDistance = 0;

  for (const trade of trades) {
    const hasSize = trade.ifvgSize != null;
    const hasMethod = extractor(trade).length > 0;
    if (!hasSize && hasMethod) missingSize++;
    else if (hasSize && !hasMethod) missingMethod++;
    else if (hasSize && hasMethod && getStopDistance(trade) <= 0) noStopDistance++;
  }

  return { missingSize, missingMethod, noStopDistance };
}
