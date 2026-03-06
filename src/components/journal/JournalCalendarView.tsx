import { useMemo } from 'react';
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isToday,
  addMonths,
  subMonths,
} from 'date-fns';
import type { DailyJournalEntry } from '../../types/journal';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface JournalCalendarViewProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  entries: DailyJournalEntry[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function JournalCalendarView({
  currentMonth,
  onMonthChange,
  entries,
  selectedDate,
  onSelectDate,
}: JournalCalendarViewProps) {
  const entryMap = useMemo(() => {
    const map = new Map<string, DailyJournalEntry>();
    for (const e of entries) map.set(e.date, e);
    return map;
  }, [entries]);

  const days = useMemo(() => {
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(currentMonth);
    const calStart = startOfWeek(monthStart);
    const calEnd = endOfWeek(monthEnd);
    return eachDayOfInterval({ start: calStart, end: calEnd });
  }, [currentMonth]);

  const getRatingColor = (entry: DailyJournalEntry | undefined) => {
    if (!entry) return '';
    if (entry.rating >= 4) return 'bg-emerald-500/20 border-emerald-500/40';
    if (entry.rating === 3) return 'bg-amber-500/20 border-amber-500/40';
    return 'bg-rose-500/20 border-rose-500/40';
  };

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => onMonthChange(subMonths(currentMonth, 1))}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronLeft size={18} />
        </button>
        <h3 className="text-sm font-semibold text-slate-50">
          {format(currentMonth, 'MMMM yyyy')}
        </h3>
        <button
          onClick={() => onMonthChange(addMonths(currentMonth, 1))}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-slate-500 py-1">
            {day}
          </div>
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, currentMonth);
          const entry = entryMap.get(dateStr);
          const ratingColor = getRatingColor(entry);
          const isSelected = dateStr === selectedDate;

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`
                relative aspect-square flex items-center justify-center text-xs rounded-lg border transition-colors
                ${!inMonth ? 'text-slate-600 border-transparent' : 'text-slate-300 border-transparent hover:border-slate-600'}
                ${ratingColor}
                ${isSelected ? 'ring-2 ring-blue-500 border-transparent' : ''}
                ${isToday(day) && !isSelected ? 'font-bold text-blue-400' : ''}
              `}
            >
              {format(day, 'd')}
              {entry && (
                <span className={`absolute bottom-0.5 w-1 h-1 rounded-full ${
                  entry.rating >= 4 ? 'bg-emerald-400' : entry.rating === 3 ? 'bg-amber-400' : 'bg-rose-400'
                }`} />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
