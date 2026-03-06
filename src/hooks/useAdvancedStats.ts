import { useMemo } from 'react';
import type { Trade } from '../types/trade';
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

export function useAdvancedStats(trades: Trade[]) {
  return useMemo(() => ({
    drawdown: calculateDrawdownSeries(trades),
    rollingWinRate: calculateRollingWinRate(trades),
    performanceByDay: calculatePerformanceByDayOfWeek(trades),
    performanceByInstrument: calculatePerformanceByInstrument(trades),
    streaks: calculateStreakAnalysis(trades),
    sharpeRatio: calculateSharpeRatio(trades),
    expectancy: calculateExpectancy(trades),
    monteCarlo: calculateMonteCarloSimulation(trades),
  }), [trades]);
}
