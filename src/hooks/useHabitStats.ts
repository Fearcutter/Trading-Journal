import { useMemo } from 'react';
import { useHabits } from '../context/HabitContext';
import { computeStreaks, getAdherenceRate, getHeatmapData } from '../utils/habit-stats';

export function useHabitStats() {
  const { definitions, checkIns, badges } = useHabits();

  const activeDefinitions = useMemo(
    () => definitions.filter(d => d.isActive),
    [definitions]
  );

  const streaks = useMemo(
    () => computeStreaks(checkIns, definitions),
    [checkIns, definitions]
  );

  const adherenceRates = useMemo(() => {
    const rates: Record<string, number> = {};
    for (const def of activeDefinitions) {
      rates[def.id] = getAdherenceRate(checkIns, def.id);
    }
    return rates;
  }, [checkIns, activeDefinitions]);

  const heatmapData = useMemo(
    () => getHeatmapData(checkIns),
    [checkIns]
  );

  const overallAdherence = useMemo(() => {
    if (checkIns.length === 0) return 0;
    let totalCompleted = 0;
    let totalPossible = 0;
    for (const checkIn of checkIns) {
      totalCompleted += checkIn.habitCompletions.filter(c => c.completed).length;
      totalPossible += checkIn.habitCompletions.length;
    }
    return totalPossible > 0 ? totalCompleted / totalPossible : 0;
  }, [checkIns]);

  return {
    activeDefinitions,
    streaks,
    adherenceRates,
    heatmapData,
    overallAdherence,
    badges,
    checkIns,
  };
}
