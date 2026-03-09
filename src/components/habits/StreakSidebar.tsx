import { useHabitStats } from '../../hooks/useHabitStats';
import StreakCard from './StreakCard';

export default function StreakSidebar() {
  const { activeDefinitions, streaks, adherenceRates } = useHabitStats();

  if (activeDefinitions.length === 0) return null;

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Streaks</h3>
      {activeDefinitions.map(def => {
        const streak = streaks.find(s => s.habitId === def.id);
        if (!streak) return null;
        return (
          <StreakCard
            key={def.id}
            habitName={def.name}
            streak={streak}
            adherenceRate={adherenceRates[def.id] || 0}
          />
        );
      })}
    </div>
  );
}
