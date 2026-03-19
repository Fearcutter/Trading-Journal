import type { Trade } from '../types/trade';
import type { PLField } from './pl-helpers';
import { getTradeValue } from './pl-helpers';

/**
 * Groups trades by date, sorts each group by time ASC (tiebreak on createdAt),
 * returns only the first N trades per day.
 */
export function filterFirstNPerDay(trades: Trade[], n: number): Trade[] {
  const byDate = groupByDate(trades);
  const result: Trade[] = [];
  for (const group of byDate.values()) {
    const sorted = sortByTimeAsc(group);
    result.push(...sorted.slice(0, n));
  }
  return result;
}

/**
 * Returns the trades that would be skipped (N+1, N+2, etc. per day).
 */
export function getSkippedTrades(trades: Trade[], n: number): Trade[] {
  const byDate = groupByDate(trades);
  const result: Trade[] = [];
  for (const group of byDate.values()) {
    const sorted = sortByTimeAsc(group);
    result.push(...sorted.slice(n));
  }
  return result;
}

/**
 * Groups by date, sorts by P&L descending, returns the top N per day.
 * Used for "Best N vs First N" comparison.
 */
export function filterBestNPerDay(trades: Trade[], n: number, plField: PLField): Trade[] {
  const byDate = groupByDate(trades);
  const result: Trade[] = [];
  for (const group of byDate.values()) {
    const sorted = [...group].sort((a, b) => getTradeValue(b, plField) - getTradeValue(a, plField));
    result.push(...sorted.slice(0, n));
  }
  return result;
}

function groupByDate(trades: Trade[]): Map<string, Trade[]> {
  const map = new Map<string, Trade[]>();
  for (const t of trades) {
    const group = map.get(t.date);
    if (group) group.push(t);
    else map.set(t.date, [t]);
  }
  return map;
}

function sortByTimeAsc(trades: Trade[]): Trade[] {
  return [...trades].sort((a, b) => {
    const timeCompare = (a.time || '').localeCompare(b.time || '');
    if (timeCompare !== 0) return timeCompare;
    return (a.createdAt || '').localeCompare(b.createdAt || '');
  });
}

export interface PlanComplianceResult {
  totalDays: number;
  compliantDays: number;
  compliancePercent: number;
  overtradedDays: number;
  extraTradesPL: number;
  avgExtraTradesPL: number;
  extraTradesCount: number;
}

export function calculatePlanCompliance(trades: Trade[], n: number, plField: PLField): PlanComplianceResult {
  const byDate = groupByDate(trades);
  let totalDays = 0;
  let compliantDays = 0;
  let overtradedDays = 0;
  let extraTradesPL = 0;
  let extraTradesCount = 0;

  for (const group of byDate.values()) {
    totalDays++;
    if (group.length <= n) {
      compliantDays++;
    } else {
      overtradedDays++;
      const sorted = sortByTimeAsc(group);
      const extras = sorted.slice(n);
      extraTradesCount += extras.length;
      for (const t of extras) {
        extraTradesPL += getTradeValue(t, plField);
      }
    }
  }

  return {
    totalDays,
    compliantDays,
    compliancePercent: totalDays > 0 ? (compliantDays / totalDays) * 100 : 0,
    overtradedDays,
    extraTradesPL,
    avgExtraTradesPL: extraTradesCount > 0 ? extraTradesPL / extraTradesCount : 0,
    extraTradesCount,
  };
}
