import { useMemo } from 'react';
import type { Trade } from '../types/trade';
import type { PLField } from './usePLFormatter';
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

export function useDashboardStats(trades: Trade[], plField: PLField = 'dollarPL') {
  return useMemo(() => ({
    stats: calculateDashboardStats(trades, plField),
    plBySetup: calculatePLBySetup(trades, plField),
    plByEmotion: calculatePLByEmotion(trades, plField),
    winRateByConfluences: calculateWinRateByConfluenceCount(trades),
    plByTimeOfDay: calculatePLByTimeOfDay(trades, plField),
    cumulativePL: calculateCumulativePL(trades, plField),
    dailyPL: calculateDailyPL(trades, plField),
    rrDistribution: calculateRRDistribution(trades),
    winCount: trades.filter(t => t.result === 'win').length,
    lossCount: trades.filter(t => t.result === 'loss').length,
    beCount: trades.filter(t => t.result === 'breakeven').length,
  }), [trades, plField]);
}
