import { useMemo } from 'react';
import type { Trade } from '../types/trade';
import type { PLField } from '../utils/pl-helpers';
import {
  calculateMFEMAEAverages,
  calculateRunnerAnalysis,
  calculateRunnerSurvival,
  calculateGradeAnalysis,
  calculateExitStrategyComparison,
  calculateAfterBEAnalysis,
} from '../utils/mfe-mae-analyzer';

export function useMFEMAEStats(trades: Trade[], plField: PLField) {
  return useMemo(() => ({
    averages: calculateMFEMAEAverages(trades),
    runnerAnalysis: calculateRunnerAnalysis(trades),
    runnerSurvival: calculateRunnerSurvival(trades),
    gradeAnalysis: calculateGradeAnalysis(trades, plField),
    exitStrategies: calculateExitStrategyComparison(trades),
    afterBEAnalysis: calculateAfterBEAnalysis(trades),
  }), [trades, plField]);
}
