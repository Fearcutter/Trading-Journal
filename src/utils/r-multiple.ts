import type { Trade } from '../types/trade';

/** Points between entry and stop. Zero when the trade has no usable stop. */
export function getStopDistance(trade: Trade): number {
  return Math.abs(trade.entry - trade.stopLoss);
}

/**
 * R actually earned: points won or lost divided by the distance risked.
 *
 * This is deliberately different from `Trade.riskReward`, which is the
 * *planned* target-to-stop ratio fixed at entry and identical for a winner
 * and a loser with the same levels. Planned R:R cannot compare stop methods
 * fairly, because a wider stop mechanically scores lower on it even when it
 * is the more profitable method.
 *
 * Returns null when the stop distance is zero, so callers skip the trade
 * rather than folding a meaningless 0R into an average.
 */
export function getRealizedR(trade: Trade): number | null {
  const stopDistance = getStopDistance(trade);
  if (stopDistance <= 0) return null;
  return trade.pointsPL / stopDistance;
}
