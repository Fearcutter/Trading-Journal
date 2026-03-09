import { useMemo } from 'react';
import { format } from 'date-fns';
import { Link } from 'react-router-dom';
import { Star, CheckCircle2, ArrowRight } from 'lucide-react';
import { useHabits } from '../../context/HabitContext';
import { useJournal } from '../../context/JournalContext';
import { useTrades } from '../../context/TradeContext';
import { usePLFormatter } from '../../hooks/usePLFormatter';

export default function TodayCheckInWidget() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const { getCheckInByDate } = useHabits();
  const { getEntryByDate } = useJournal();
  const { trades } = useTrades();
  const pl = usePLFormatter();

  const checkIn = useMemo(() => getCheckInByDate(today), [getCheckInByDate, today]);
  const journalEntry = useMemo(() => getEntryByDate(today), [getEntryByDate, today]);

  const todayTrades = useMemo(
    () => trades.filter(t => t.date === today && !t.sessionId),
    [trades, today]
  );
  const todayPL = useMemo(
    () => todayTrades.reduce((sum, t) => sum + pl.getPL(t), 0),
    [todayTrades, pl]
  );

  const isCompleted = !!checkIn || !!journalEntry;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-slate-300">Today's Check-In</h3>
        {isCompleted && <CheckCircle2 size={16} className="text-emerald-400" />}
      </div>

      {isCompleted ? (
        <div className="space-y-2">
          {checkIn && checkIn.dayRating > 0 && (
            <div className="flex items-center gap-1">
              {[1, 2, 3, 4, 5].map(s => (
                <Star
                  key={s}
                  size={14}
                  className={s <= checkIn.dayRating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}
                />
              ))}
            </div>
          )}
          {checkIn && checkIn.habitCompletions.length > 0 && (
            <div className="text-xs text-slate-400">
              Habits: {checkIn.habitCompletions.filter(c => c.completed).length}/{checkIn.habitCompletions.length} completed
            </div>
          )}
          {checkIn?.emotionBefore && (
            <div className="flex gap-1">
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-600/20 text-blue-400">{checkIn.emotionBefore}</span>
              {checkIn.emotionAfter && (
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-purple-600/20 text-purple-400">{checkIn.emotionAfter}</span>
              )}
            </div>
          )}
          {(checkIn?.reflection || journalEntry?.lessonsLearned) && (
            <p className="text-xs text-slate-500 line-clamp-2">
              {(checkIn?.reflection || journalEntry?.lessonsLearned || '').slice(0, 80)}
              {(checkIn?.reflection || journalEntry?.lessonsLearned || '').length > 80 ? '...' : ''}
            </p>
          )}
          <div className="flex items-center gap-4 pt-1 text-xs text-slate-400">
            <span>{todayTrades.length} trade{todayTrades.length !== 1 ? 's' : ''}</span>
            {todayTrades.length > 0 && (
              <span className={todayPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                {pl.formatPLValue(todayPL)}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="text-center py-3">
          <p className="text-xs text-slate-500 mb-3">No check-in yet today</p>
          <Link
            to="/journal"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-lg transition-colors"
          >
            Start Check-In <ArrowRight size={12} />
          </Link>
          {todayTrades.length > 0 && (
            <div className="mt-2 text-xs text-slate-400">
              {todayTrades.length} trade{todayTrades.length !== 1 ? 's' : ''} today
              {' '}
              <span className={todayPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                ({pl.formatPLValue(todayPL)})
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
