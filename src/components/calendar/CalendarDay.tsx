interface CalendarDayProps {
  day: number;
  date: string;
  pl: number;
  tradeCount: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isSelected: boolean;
  hasHabitCheckIn?: boolean;
  onClick: () => void;
}

export default function CalendarDay({ day, pl, tradeCount, isCurrentMonth, isToday, isSelected, hasHabitCheckIn, onClick }: CalendarDayProps) {
  const getBgColor = () => {
    if (!isCurrentMonth) return 'bg-slate-900/30';
    if (tradeCount === 0) return 'bg-slate-800/30';
    if (pl > 0) {
      const intensity = Math.min(Math.abs(pl) / 5, 1);
      return intensity > 0.5 ? 'bg-emerald-400/25' : 'bg-emerald-400/10';
    }
    if (pl < 0) {
      const intensity = Math.min(Math.abs(pl) / 5, 1);
      return intensity > 0.5 ? 'bg-rose-400/25' : 'bg-rose-400/10';
    }
    return 'bg-amber-400/10';
  };

  const formatR = (value: number) => {
    const rounded = Math.round(value * 100) / 100;
    const str = rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(2);
    return `${rounded > 0 ? '+' : ''}${str}R`;
  };

  return (
    <button
      onClick={onClick}
      className={`p-2 min-h-[80px] rounded-lg border transition-all text-left ${
        isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-700/50 hover:border-slate-600'
      } ${getBgColor()} ${!isCurrentMonth ? 'opacity-40' : ''}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs font-medium ${isToday ? 'text-blue-400' : 'text-slate-400'}`}>
          {day}
        </span>
        <div className="flex items-center gap-1">
          {hasHabitCheckIn && (
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
          {tradeCount > 0 && (
            <span className="text-[10px] text-slate-500">{tradeCount}t</span>
          )}
        </div>
      </div>
      {tradeCount > 0 && (
        <p className={`font-mono text-xs font-medium ${pl > 0 ? 'text-emerald-400' : pl < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
          {formatR(pl)}
        </p>
      )}
    </button>
  );
}
