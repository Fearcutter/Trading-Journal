import { useMemo } from 'react';
import type { Trade } from '../types/trade';
import {
  calculateMFEMAEAverages,
  calculateRunnerAnalysis,
  calculateRunnerSurvival,
  calculateGradeAnalysis,
  calculateExitStrategyComparison,
} from '../utils/mfe-mae-analyzer';

export function useMFEMAEStats(trades: Trade[]) {
  return useMemo(() => ({
    averages: calculateMFEMAEAverages(trades),
    runnerAnalysis: calculateRunnerAnalysis(trades),
    runnerSurvival: calculateRunnerSurvival(trades),
    gradeAnalysis: calculateGradeAnalysis(trades),
    exitStrategies: calculateExitStrategyComparison(trades),
  }), [trades]);
}
