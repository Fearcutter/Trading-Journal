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

  const getBgClass = () => {
    if (!hasTrades) return 'bg-slate-800/30 hover:bg-slate-800/50';
    const intensity = Math.min(Math.abs(pl) / 5, 1);
    if (pl > 0) return intensity > 0.5 ? 'bg-emerald-400/25 hover:bg-emerald-400/35' : 'bg-emerald-400/10 hover:bg-emerald-400/20';
    if (pl < 0) return intensity > 0.5 ? 'bg-rose-400/25 hover:bg-rose-400/35' : 'bg-rose-400/10 hover:bg-rose-400/20';
    return 'bg-amber-400/10 hover:bg-amber-400/20';
  };
  const bgClass = getBgClass();

  const dateColor = isToday
    ? 'text-blue-400'
    : hasTrades
      ? 'text-slate-300'
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
        <span className={`text-xs font-semibold leading-none ${dateColor}`}>
          {day}
        </span>
        <div className="flex items-center gap-1">
          {hasHabitCheckIn && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
          {hasTrades && (
            <span className="text-[10px] font-medium text-slate-500 leading-none">
              {tradeCount}t
            </span>
          )}
        </div>
      </div>

      {/* P&L — pushed to bottom */}
      <div className="flex-1 flex items-end">
        {hasTrades && formattedPL && (
          <p className={`font-mono text-xs font-semibold leading-none ${pl > 0 ? 'text-emerald-400' : pl < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
            {formattedPL}
          </p>
        )}
      </div>
    </button>
  );
}
