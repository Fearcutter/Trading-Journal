import { useMemo } from 'react';
import type { Trade } from '../types/trade';
import type { PLField } from './usePLFormatter';
import type { TradingPlanState } from './useTradingPlanMode';
import type { DashboardStats } from '../utils/stats-calculator';
import { calculateDashboardStats } from '../utils/stats-calculator';
import { filterFirstNPerDay, getSkippedTrades, filterBestNPerDay } from '../utils/trading-plan-filter';

export interface TradingPlanComparison {
  planTrades: Trade[];
  allTrades: Trade[];
  skippedTrades: Trade[];
  bestNTrades: Trade[];
  planStats: DashboardStats;
  allStats: DashboardStats;
  skippedStats: DashboardStats;
  bestNStats: DashboardStats;
  skippedTradeIds: Set<string>;
}

export function useTradingPlanStats(
  trades: Trade[],
  planState: TradingPlanState,
  plField: PLField,
): TradingPlanComparison | null {
  return useMemo(() => {
    if (!planState.enabled) return null;

    const n = planState.tradesPerDay;
    const planTrades = filterFirstNPerDay(trades, n);
    const skippedTrades = getSkippedTrades(trades, n);
    const bestNTrades = filterBestNPerDay(trades, n, plField);

    return {
      planTrades,
      allTrades: trades,
      skippedTrades,
      bestNTrades,
      planStats: calculateDashboardStats(planTrades, plField),
      allStats: calculateDashboardStats(trades, plField),
      skippedStats: calculateDashboardStats(skippedTrades, plField),
      bestNStats: calculateDashboardStats(bestNTrades, plField),
      skippedTradeIds: new Set(skippedTrades.map(t => t.id)),
    };
  }, [trades, planState.enabled, planState.tradesPerDay, plField]);
}
