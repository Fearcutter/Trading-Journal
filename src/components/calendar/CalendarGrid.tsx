import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  format,
  isSameMonth,
  isToday,
} from 'date-fns';
import type { Trade } from '../../types/trade';
import CalendarDay from './CalendarDay';

interface CalendarGridProps {
  currentMonth: Date;
  trades: Trade[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export default function CalendarGrid({ currentMonth, trades, selectedDate, onSelectDate }: CalendarGridProps) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const days = eachDayOfInterval({ start: calStart, end: calEnd });

  // Group trades by date
  const tradesByDate: Record<string, Trade[]> = {};
  for (const t of trades) {
    if (!tradesByDate[t.date]) tradesByDate[t.date] = [];
    tradesByDate[t.date].push(t);
  }

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAYS.map(day => (
          <div key={day} className="text-center text-xs font-medium text-slate-500 py-2">
            {day}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7 gap-1">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayTrades = tradesByDate[dateStr] || [];
          const pl = dayTrades.reduce((sum, t) => sum + t.dollarPL, 0);

          return (
            <CalendarDay
              key={dateStr}
              day={day.getDate()}
              date={dateStr}
              pl={pl}
              tradeCount={dayTrades.length}
              isCurrentMonth={isSameMonth(day, currentMonth)}
              isToday={isToday(day)}
              isSelected={selectedDate === dateStr}
              onClick={() => onSelectDate(dateStr)}
            />
          );
        })}
      </div>
    </div>
  );
}
