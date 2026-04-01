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
import type { DailyHabitCheckIn } from '../../types/habit';
import { usePLFormatter } from '../../hooks/usePLFormatter';
import CalendarDay from './CalendarDay';

interface CalendarGridProps {
  currentMonth: Date;
  trades: Trade[];
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
  habitCheckIns?: DailyHabitCheckIn[];
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function WeekSummary({ pl, tradingDays, formattedPL }: { pl: number; tradingDays: number; formattedPL: string }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[88px] rounded-lg bg-slate-700/20 border border-slate-700/30 px-1 py-2 gap-1">
      <span className="text-[9px] uppercase tracking-wide text-slate-600 font-medium">Wk</span>
      {tradingDays > 0 ? (
        <>
          <span className={`font-mono text-xs font-bold leading-none ${pl > 0 ? 'text-emerald-400' : pl < 0 ? 'text-rose-400' : 'text-slate-400'}`}>
            {formattedPL}
          </span>
          <span className="text-[9px] text-slate-600">{tradingDays}d</span>
        </>
      ) : (
        <span className="text-[10px] text-slate-700">—</span>
      )}
    </div>
  );
}

export default function CalendarGrid({ currentMonth, trades, selectedDate, onSelectDate, habitCheckIns = [] }: CalendarGridProps) {
  const { getPL, formatPLValue } = usePLFormatter();

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calStart = startOfWeek(monthStart);
  const calEnd = endOfWeek(monthEnd);
  const allDays = eachDayOfInterval({ start: calStart, end: calEnd });

  // Group into weeks
  const weeks: Date[][] = [];
  for (let i = 0; i < allDays.length; i += 7) {
    weeks.push(allDays.slice(i, i + 7));
  }

  // Group trades by date
  const tradesByDate: Record<string, Trade[]> = {};
  for (const t of trades) {
    if (!tradesByDate[t.date]) tradesByDate[t.date] = [];
    tradesByDate[t.date].push(t);
  }

  const habitCheckInDates = new Set(habitCheckIns.map(c => c.date));

  const getDayPL = (dateStr: string) =>
    (tradesByDate[dateStr] || []).reduce((sum, t) => sum + getPL(t), 0);

  return (
    <div>
      {/* Weekday headers */}
      <div className="grid grid-cols-[repeat(7,minmax(0,1fr))_56px] gap-1 mb-1">
        {WEEKDAYS.map(d => (
          <div key={d} className="text-center text-xs font-medium text-slate-500 py-2">
            {d}
          </div>
        ))}
        <div className="text-center text-[10px] font-medium text-slate-600 py-2 uppercase tracking-wide">Wk</div>
      </div>

      {/* Week rows */}
      <div className="space-y-1">
        {weeks.map((week, wi) => {
          let weekPL = 0;
          let weekTradingDays = 0;

          for (const day of week) {
            if (!isSameMonth(day, currentMonth)) continue;
            const dateStr = format(day, 'yyyy-MM-dd');
            const dayTrades = tradesByDate[dateStr] || [];
            if (dayTrades.length > 0) {
              weekPL += getDayPL(dateStr);
              weekTradingDays++;
            }
          }

          return (
            <div key={wi} className="grid grid-cols-[repeat(7,minmax(0,1fr))_56px] gap-1">
              {week.map(day => {
                const dateStr = format(day, 'yyyy-MM-dd');
                const dayTrades = tradesByDate[dateStr] || [];
                const dayPL = getDayPL(dateStr);
                const inMonth = isSameMonth(day, currentMonth);

                return (
                  <CalendarDay
                    key={dateStr}
                    day={day.getDate()}
                    pl={dayPL}
                    formattedPL={dayTrades.length > 0 && inMonth ? formatPLValue(dayPL) : null}
                    tradeCount={dayTrades.length}
                    isCurrentMonth={inMonth}
                    isToday={isToday(day)}
                    isSelected={selectedDate === dateStr}
                    hasHabitCheckIn={habitCheckInDates.has(dateStr)}
                    onClick={() => inMonth && onSelectDate(dateStr)}
                  />
                );
              })}
              <WeekSummary
                pl={weekPL}
                tradingDays={weekTradingDays}
                formattedPL={formatPLValue(weekPL)}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
