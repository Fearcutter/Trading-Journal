import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Star } from 'lucide-react';
import { useJournal } from '../../context/JournalContext';
import { useHabits } from '../../context/HabitContext';

export default function RecentReflectionsWidget() {
  const { entries } = useJournal();
  const { checkIns } = useHabits();

  const recentEntries = useMemo(() => {
    // Merge journal entries and check-ins by date, take last 3
    const dateMap = new Map<string, { date: string; rating: number; reflection: string; tendencies: string[] }>();

    for (const entry of entries) {
      dateMap.set(entry.date, {
        date: entry.date,
        rating: entry.rating,
        reflection: entry.lessonsLearned,
        tendencies: [],
      });
    }

    for (const checkIn of checkIns) {
      const existing = dateMap.get(checkIn.date);
      if (existing) {
        existing.rating = existing.rating || checkIn.dayRating;
        existing.reflection = existing.reflection || checkIn.reflection;
        existing.tendencies = checkIn.tendencies;
      } else {
        dateMap.set(checkIn.date, {
          date: checkIn.date,
          rating: checkIn.dayRating,
          reflection: checkIn.reflection,
          tendencies: checkIn.tendencies,
        });
      }
    }

    return [...dateMap.values()]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 3);
  }, [entries, checkIns]);

  if (recentEntries.length === 0) {
    return (
      <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-300 mb-2">Recent Reflections</h3>
        <p className="text-xs text-slate-500">No journal entries yet.</p>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">Recent Reflections</h3>
        <Link to="/journal" className="text-xs text-blue-400 hover:text-blue-300 transition-colors">
          View All
        </Link>
      </div>

      <div className="space-y-3">
        {recentEntries.map(entry => (
          <div key={entry.date} className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-slate-500">
                {new Date(entry.date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
              {entry.rating > 0 && (
                <div className="flex gap-0.5">
                  {[1, 2, 3, 4, 5].map(s => (
                    <Star key={s} size={8} className={s <= entry.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />
                  ))}
                </div>
              )}
            </div>
            {entry.reflection && (
              <p className="text-xs text-slate-400 line-clamp-2">{entry.reflection}</p>
            )}
            {entry.tendencies.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {entry.tendencies.map(t => (
                  <span key={t} className="text-[9px] px-1 py-0.5 rounded bg-rose-600/20 text-rose-400">{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
