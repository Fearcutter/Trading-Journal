import { Flame } from 'lucide-react';
import type { HabitStreak } from '../../types/habit';

interface StreakCardProps {
  habitName: string;
  streak: HabitStreak;
  adherenceRate: number;
}

export default function StreakCard({ habitName, streak, adherenceRate }: StreakCardProps) {
  return (
    <div className="bg-slate-800/50 border border-slate-700 rounded-lg p-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-300 font-medium truncate mr-2">{habitName}</span>
        <div className="flex items-center gap-1">
          <Flame size={14} className={streak.currentStreak > 0 ? 'text-orange-400' : 'text-slate-600'} />
          <span className={`text-sm font-bold ${streak.currentStreak > 0 ? 'text-orange-400' : 'text-slate-600'}`}>
            {streak.currentStreak}
          </span>
        </div>
      </div>
      <div className="flex items-center justify-between text-[10px] text-slate-500">
        <span>Best: {streak.longestStreak}d</span>
        <span>{Math.round(adherenceRate * 100)}% rate</span>
      </div>
      <div className="mt-1.5 h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all"
          style={{ width: `${Math.round(adherenceRate * 100)}%` }}
        />
      </div>
    </div>
  );
}
