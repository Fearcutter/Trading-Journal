import type { Trade } from '../types/trade';
import { getRealizedR, getStopDistance } from './r-multiple';

/** Profit targets replayed in the "Lower RR" table, in R. */
export const RR_TARGETS = [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3];

/**
 * The trade's result in R had the target been `target` R. Null without MFE or a stop.
 * - Price reached the target (MFE): exactly `target`.
 * - It didn't, and the trade really lost or broke even: keeps its real result.
 * - It didn't, but you really took profit (below this target): you'd still have been
 *   in when it turned, so breakeven if it had reached 1R (stop moved to BE), else -1R.
 */
export function replayR(t: Trade, target: number): number | null {
  const risk = getStopDistance(t);
  if (t.mfe == null || risk <= 0) return null;
  const mfeR = t.mfe / risk;
  if (mfeR >= target) return target;
  const actual = getRealizedR(t)!;
  if (actual <= 0) return actual;
  return mfeR >= 1 ? 0 : -1;
}

export interface RRVarianceRow {
  label: string;
  trades: number;
  /** Trades that ended above 0R. */
  winRate: number;
  totalR: number;
  rPerTrade: number | null;
  /** Biggest drop from a high point of the running total (starting at 0), in R. */
  maxDrawdownR: number;
  longestLosingStreak: number;
  /** Standard deviation of R per trade: how far a typical trade lands from the average. */
  swing: number | null;
}

/** Stats for a run of R results, in the order they were taken. */
export function rrVarianceRow(label: string, rs: number[]): RRVarianceRow {
  let total = 0, peak = 0, maxDrawdownR = 0, streak = 0, longestLosingStreak = 0, wins = 0;
  for (const r of rs) {
    total += r;
    peak = Math.max(peak, total);
    maxDrawdownR = Math.max(maxDrawdownR, peak - total);
    streak = r < 0 ? streak + 1 : 0;
    longestLosingStreak = Math.max(longestLosingStreak, streak);
    if (r > 0) wins++;
  }
  const mean = rs.length ? total / rs.length : null;
  return {
    label,
    trades: rs.length,
    winRate: rs.length ? (wins / rs.length) * 100 : 0,
    totalR: total,
    rPerTrade: mean,
    maxDrawdownR,
    longestLosingStreak,
    swing: mean === null ? null : Math.sqrt(rs.reduce((s, r) => s + (r - mean) ** 2, 0) / rs.length),
  };
}

/** One row per target in RR_TARGETS plus "What you did", over trades with MFE and a stop, oldest first. */
export function analyzeLowerRR(trades: Trade[]) {
  const usable = trades
    .filter(t => t.mfe != null && getStopDistance(t) > 0)
    .sort((a, b) => `${a.date} ${a.time || ''}`.localeCompare(`${b.date} ${b.time || ''}`));
  const rows = [
    ...RR_TARGETS.map(target => rrVarianceRow(`${target}R`, usable.map(t => replayR(t, target)!))),
    rrVarianceRow('What you did', usable.map(t => getRealizedR(t)!)),
  ];
  return {
    rows,
    used: usable.length,
    missingMFE: trades.filter(t => t.mfe == null).length,
  };
}
