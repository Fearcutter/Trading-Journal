import type { Trade } from '../types/trade';
import { getRealizedR, getStopDistance } from './r-multiple';
import type { PLField } from './pl-helpers';
import { timingRow, type TimingRow } from './trade-timing';

/** Cells built on fewer trades than this can't be ringed as the best method. */
export const THIN_SAMPLE_THRESHOLD = 5;

/** Used when there is too little size data to derive sensible cutoffs. */
const FALLBACK_CUTOFFS: [number, number] = [8, 15];

/** One size group: `from` included, `to` not; `to: null` = no upper limit. */
export interface SizeRange {
  from: number;
  to: number | null;
}

const RANGE_NAMES = ['Small', 'Medium', 'Large'];

export interface SizeBand {
  /** Group name, e.g. "Small" (stop method grid only). */
  name?: string;
  label: string;
  min: number | null; // null = unbounded below (first band)
  max: number | null; // null = unbounded above (last band)
}

export interface MatrixCell {
  avgR: number | null;
  winRate: number | null;
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
 * Starting Small / Medium / Large ranges derived from the trader's own gap
 * sizes, splitting them into three roughly even groups: 0 to the first third,
 * then to the second third, then no upper limit.
 *
 * Deliberately ignores the selected stop-method category: the groups describe
 * the size axis alone, and making them category-dependent would shift the
 * columns every time the dropdown changed.
 */
export function suggestRanges(trades: Trade[]): SizeRange[] {
  const sizes = trades
    .map(t => t.ifvgSize)
    .filter((s): s is number => s != null)
    .sort((a, b) => a - b);

  const [a, b] = sizes.length < 3
    ? FALLBACK_CUTOFFS
    : [round1(percentile(sizes, 1 / 3)), round1(percentile(sizes, 2 / 3))];
  return [{ from: 0, to: a }, { from: a, to: b }, { from: b, to: null }];
}

/**
 * Small / Medium / Large from the trader's own from–to ranges. Gaps are allowed
 * (sizes in a gap are left out) and so are overlaps (a size counts in each group
 * it fits).
 */
export function buildRangeBands(ranges: readonly SizeRange[]): SizeBand[] {
  return ranges.map((r, i) => ({
    name: RANGE_NAMES[i],
    label: r.to === null ? `${fmt(r.from)}+` : `${fmt(r.from)} – ${fmt(r.to)}`,
    min: r.from,
    max: r.to,
  }));
}

/** Fixed point ranges for the "Win rate by iFVG size" table (lower edge included). */
const SIZE_TABLE_EDGES = [0, 2.5, 5, 7.5, 10, 15, 20, 30, 40, 50];
export const SIZE_TABLE_BANDS: SizeBand[] = SIZE_TABLE_EDGES.map((min, i) => {
  const max = SIZE_TABLE_EDGES[i + 1] ?? null;
  return { label: max === null ? `${fmt(min)}+` : `${fmt(min)}–${fmt(max)}`, min, max };
});

function inBand(size: number, { min, max }: SizeBand): boolean {
  return (min === null || size >= min) && (max === null || size < max);
}

/** Trades with an iFVG size that fit none of the groups. */
export function countOutsideBands(trades: Trade[], bands: SizeBand[]): number {
  return trades.filter(t => t.ifvgSize != null && !bands.some(b => inBand(t.ifvgSize!, b))).length;
}

function bandIndexOf(size: number, bands: SizeBand[]): number {
  for (let i = 0; i < bands.length; i++) {
    const { min, max } = bands[i];
    if ((min === null || size >= min) && (max === null || size < max)) return i;
  }
  return -1;
}

interface Acc { sum: number; count: number; wins: number }
const emptyAcc = (): Acc => ({ sum: 0, count: 0, wins: 0 });

function toCell(a: Acc): MatrixCell {
  return {
    avgR: a.count > 0 ? a.sum / a.count : null,
    winRate: a.count > 0 ? (a.wins / a.count) * 100 : null,
    count: a.count,
    thin: a.count > 0 && a.count < THIN_SAMPLE_THRESHOLD,
  };
}

/**
 * Average realized R per stop method per size band. A trade fitting several
 * (overlapping) bands counts in each; the "all" column counts it once.
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
    const size = trade.ifvgSize;
    const fits = bands.map((b, i) => (inBand(size, b) ? i : -1)).filter(i => i >= 0);
    if (fits.length === 0) continue;

    for (const method of extractor(trade)) {
      let entry = methods.get(method);
      if (!entry) {
        entry = { bands: bands.map(emptyAcc), all: emptyAcc() };
        methods.set(method, entry);
      }
      const won = trade.result === 'win' ? 1 : 0;
      for (const idx of fits) {
        entry.bands[idx].sum += r;
        entry.bands[idx].count++;
        entry.bands[idx].wins += won;
      }
      entry.all.sum += r;
      entry.all.count++;
      entry.all.wins += won;
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

/** Win rate and net R per size band, every trade with an iFVG size (any stop method). */
export function buildSizeRows(trades: Trade[], bands: SizeBand[], plField: PLField): TimingRow[] {
  const sized = trades.filter(t => t.ifvgSize != null);
  return bands.map((band, i) =>
    timingRow(`${band.label} pts`, sized.filter(t => bandIndexOf(t.ifvgSize!, bands) === i), plField));
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
