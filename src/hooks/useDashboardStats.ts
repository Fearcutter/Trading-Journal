import { useMemo } from 'react';
import type { Trade } from '../types/trade';
import {
  calculateDashboardStats,
  calculatePLBySetup,
  calculatePLByEmotion,
  calculateWinRateByConfluenceCount,
  calculatePLByTimeOfDay,
  calculateCumulativePL,
  calculateDailyPL,
  calculateRRDistribution,
} from '../utils/stats-calculator';

export function useDashboardStats(trades: Trade[]) {
  return useMemo(() => ({
    stats: calculateDashboardStats(trades),
    plBySetup: calculatePLBySetup(trades),
    plByEmotion: calculatePLByEmotion(trades),
    winRateByConfluences: calculateWinRateByConfluenceCount(trades),
    plByTimeOfDay: calculatePLByTimeOfDay(trades),
    cumulativePL: calculateCumulativePL(trades),
    dailyPL: calculateDailyPL(trades),
    rrDistribution: calculateRRDistribution(trades),
    winCount: trades.filter(t => t.result === 'win').length,
    lossCount: trades.filter(t => t.result === 'loss').length,
    beCount: trades.filter(t => t.result === 'breakeven').length,
  }), [trades]);
}
