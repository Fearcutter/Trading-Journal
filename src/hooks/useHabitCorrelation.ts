import { useMemo } from 'react';
import { useHabits } from '../context/HabitContext';
import { useTrades } from '../context/TradeContext';
import { correlateHabitsWithPL, correlateTendenciesWithPL, getAdherenceTimeSeries } from '../utils/habit-correlation';

export function useHabitCorrelation() {
  const { definitions, checkIns } = useHabits();
  const { trades } = useTrades();

  const habitNames = useMemo(() => {
    const map: Record<string, string> = {};
    for (const d of definitions) map[d.id] = d.name;
    return map;
  }, [definitions]);

  const habitCorrelations = useMemo(
    () => correlateHabitsWithPL(checkIns, trades, habitNames),
    [checkIns, trades, habitNames]
  );

  const tendencyCorrelations = useMemo(
    () => correlateTendenciesWithPL(checkIns, trades),
    [checkIns, trades]
  );

  const adherenceTimeSeries = useMemo(
    () => getAdherenceTimeSeries(checkIns),
    [checkIns]
  );

  return { habitCorrelations, tendencyCorrelations, adherenceTimeSeries };
}
