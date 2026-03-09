import { useMemo } from 'react';
import type { Trade } from '../types/trade';
import type { PLField } from './usePLFormatter';
import {
  calculateDrawdownSeries,
  calculateRollingWinRate,
  calculatePerformanceByDayOfWeek,
  calculatePerformanceByInstrument,
  calculateStreakAnalysis,
  calculateSharpeRatio,
  calculateExpectancy,
  calculateMonteCarloSimulation,
} from '../utils/advanced-stats';

export function useAdvancedStats(trades: Trade[], plField: PLField = 'dollarPL') {
  return useMemo(() => ({
    drawdown: calculateDrawdownSeries(trades, plField),
    rollingWinRate: calculateRollingWinRate(trades),
    performanceByDay: calculatePerformanceByDayOfWeek(trades, plField),
    performanceByInstrument: calculatePerformanceByInstrument(trades, plField),
    streaks: calculateStreakAnalysis(trades, plField),
    sharpeRatio: calculateSharpeRatio(trades, 0, plField),
    expectancy: calculateExpectancy(trades, plField),
    monteCarlo: calculateMonteCarloSimulation(trades, 1000, 100, plField),
  }), [trades, plField]);
}
