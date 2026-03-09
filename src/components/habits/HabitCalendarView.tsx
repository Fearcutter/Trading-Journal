import { format, startOfMonth, endOfMonth, eachDayOfInterval, getDay, subMonths, addMonths, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { DailyHabitCheckIn } from '../../types/habit';
import type { DailyJournalEntry } from '../../types/journal';

interface HabitCalendarViewProps {
  currentMonth: Date;
  onMonthChange: (date: Date) => void;
  checkIns: DailyHabitCheckIn[];
  selectedDate: string;
  onSelectDate: (date: string) => void;
  journalEntries?: DailyJournalEntry[];
}

export default function HabitCalendarView({ currentMonth, onMonthChange, checkIns, selectedDate, onSelectDate, journalEntries }: HabitCalendarViewProps) {
  const start = startOfMonth(currentMonth);
  const end = endOfMonth(currentMonth);
  const days = eachDayOfInterval({ start, end });
  const startDay = getDay(start); // 0=Sun

  const checkInDates = new Set(checkIns.map(c => c.date));
  const journalDates = new Set(journalEntries?.map(e => e.date) ?? []);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <button onClick={() => onMonthChange(subMonths(currentMonth, 1))} className="p-1 hover:bg-slate-700 rounded">
          <ChevronLeft size={16} className="text-slate-400" />
        </button>
        <span className="text-sm font-medium text-slate-200">{format(currentMonth, 'MMMM yyyy')}</span>
        <button onClick={() => onMonthChange(addMonths(currentMonth, 1))} className="p-1 hover:bg-slate-700 rounded">
          <ChevronRight size={16} className="text-slate-400" />
        </button>
      </div>

      <div className="grid grid-cols-7 gap-1 mb-1">
        {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(d => (
          <div key={d} className="text-center text-[10px] text-slate-500 font-medium">{d}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {Array.from({ length: startDay }).map((_, i) => (
          <div key={`empty-${i}`} />
        ))}
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const hasCheckIn = checkInDates.has(dateStr);
          const hasJournal = journalDates.has(dateStr);
          const isSelected = dateStr === selectedDate;
          const today = isToday(day);

          return (
            <button
              key={dateStr}
              onClick={() => onSelectDate(dateStr)}
              className={`relative h-8 w-full rounded text-xs font-medium transition-colors ${
                isSelected
                  ? 'bg-blue-600 text-white'
                  : today
                    ? 'bg-slate-700 text-blue-400'
                    : 'text-slate-400 hover:bg-slate-700'
              }`}
            >
              {format(day, 'd')}
              {(hasCheckIn || hasJournal) && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 flex gap-0.5">
                  {hasCheckIn && <span className="w-1 h-1 rounded-full bg-emerald-400" />}
                  {hasJournal && !hasCheckIn && <span className="w-1 h-1 rounded-full bg-blue-400" />}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
