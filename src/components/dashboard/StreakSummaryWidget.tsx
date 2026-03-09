import { useMemo } from 'react';
import { Flame } from 'lucide-react';
import { useHabitStats } from '../../hooks/useHabitStats';

export default function StreakSummaryWidget() {
  const { overallAdherence, streaks, activeDefinitions } = useHabitStats();

  const adherencePct = Math.round(overallAdherence * 100);
  const color = adherencePct >= 80 ? 'text-emerald-400' : adherencePct >= 50 ? 'text-amber-400' : 'text-rose-400';
  const strokeColor = adherencePct >= 80 ? '#34d399' : adherencePct >= 50 ? '#fbbf24' : '#fb7185';

  const topStreaks = useMemo(() => {
    return [...streaks]
      .sort((a, b) => b.currentStreak - a.currentStreak)
      .slice(0, 3)
      .map(s => ({
        ...s,
        name: activeDefinitions.find(d => d.id === s.habitId)?.name || 'Unknown',
      }));
  }, [streaks, activeDefinitions]);

  // SVG donut params
  const radius = 36;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (adherencePct / 100) * circumference;

  if (streaks.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Streak Summary</h3>
        <p className="text-xs text-slate-500">Complete check-ins to build streaks.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <h3 className="text-sm font-semibold text-slate-300 mb-3">Streak Summary</h3>

      <div className="flex items-center gap-4">
        {/* Donut */}
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-full h-full -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r={radius} fill="none" stroke="#334155" strokeWidth="6" />
            <circle
              cx="40" cy="40" r={radius}
              fill="none"
              stroke={strokeColor}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={`text-sm font-bold ${color}`}>{adherencePct}%</span>
          </div>
        </div>

        {/* Top streaks */}
        <div className="flex-1 space-y-2">
          {topStreaks.map(streak => (
            <div key={streak.habitId} className="flex items-center gap-2">
              <Flame size={12} className="text-orange-400 shrink-0" />
              <span className="text-xs text-slate-300 truncate flex-1">{streak.name}</span>
              <span className="text-xs font-mono text-slate-400">{streak.currentStreak}d</span>
              <div className="w-12 h-1.5 bg-slate-700 rounded-full overflow-hidden">
                <div
                  className="h-full bg-orange-400 rounded-full"
                  style={{ width: `${Math.min(100, (streak.currentStreak / Math.max(streak.longestStreak, 1)) * 100)}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
