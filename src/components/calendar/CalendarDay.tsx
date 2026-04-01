interface CalendarDayProps {
  day: number;
  pl: number;
  formattedPL: string | null;
  tradeCount: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasHabitCheckIn?: boolean;
  onClick: () => void;
}

export default function CalendarDay({
  day, pl, formattedPL, tradeCount, isCurrentMonth, isToday, isSelected, hasHabitCheckIn, onClick,
}: CalendarDayProps) {
  const hasTrades = tradeCount > 0 && isCurrentMonth;

  const bgClass = hasTrades
    ? pl > 0
      ? 'bg-emerald-600 hover:bg-emerald-500'
      : pl < 0
        ? 'bg-rose-600 hover:bg-rose-500'
        : 'bg-slate-500 hover:bg-slate-400'
    : 'bg-slate-800/50 hover:bg-slate-800';

  const dateColor = hasTrades
    ? 'text-white/80'
    : isToday
      ? 'text-blue-400'
      : 'text-slate-500';

  return (
    <button
      onClick={onClick}
      className={`
        relative flex flex-col p-2 min-h-[88px] rounded-lg transition-all text-left w-full
        ${bgClass}
        ${!isCurrentMonth ? 'opacity-25 pointer-events-none' : ''}
        ${isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''}
      `}
    >
      {/* Top row: date + indicators */}
      <div className="flex items-start justify-between w-full">
        <span className={`text-xs font-semibold leading-none ${dateColor} ${isToday && hasTrades ? '!text-white font-bold' : ''}`}>
          {day}
        </span>
        <div className="flex items-center gap-1">
          {hasHabitCheckIn && (
            <span className={`w-1.5 h-1.5 rounded-full ${hasTrades ? 'bg-white/70' : 'bg-emerald-400'}`} />
          )}
          {hasTrades && (
            <span className="text-[10px] font-medium text-white/50 leading-none">
              {tradeCount}t
            </span>
          )}
        </div>
      </div>

      {/* P&L — pushed to bottom */}
      <div className="flex-1 flex items-end">
        {hasTrades && formattedPL && (
          <p className="font-mono text-sm font-bold text-white leading-none">
            {formattedPL}
          </p>
        )}
      </div>
    </button>
  );
}
