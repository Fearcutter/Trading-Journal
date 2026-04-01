import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useTrades } from '../context/TradeContext';
import { useHabits } from '../context/HabitContext';
import { usePLFormatter } from '../hooks/usePLFormatter';
import CalendarGrid from '../components/calendar/CalendarGrid';
import DayTradesPanel from '../components/calendar/DayTradesPanel';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

export default function CalendarPage() {
  const { trades: allTrades } = useTrades();
  const { checkIns: habitCheckIns } = useHabits();
  const pl = usePLFormatter();
  const liveTrades = allTrades;
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthTrades = useMemo(() => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    return liveTrades.filter(t => t.date >= start && t.date <= end);
  }, [liveTrades, currentMonth]);

  const monthStats = useMemo(() => {
    const totalPL = monthTrades.reduce((sum, t) => sum + pl.getPL(t), 0);
    const wins = monthTrades.filter(t => t.result === 'win').length;
    const losses = monthTrades.filter(t => t.result === 'loss').length;
    const tradingDays = new Set(monthTrades.map(t => t.date)).size;

    const byDate: Record<string, number> = {};
    for (const t of monthTrades) {
      byDate[t.date] = (byDate[t.date] || 0) + pl.getPL(t);
    }
    const greenDays = Object.values(byDate).filter(v => v > 0).length;
    const redDays = Object.values(byDate).filter(v => v < 0).length;

    const winRate = monthTrades.length > 0 ? Math.round((wins / monthTrades.length) * 100) : 0;

    return { totalPL, wins, losses, winRate, tradingDays, greenDays, redDays, totalTrades: monthTrades.length };
  }, [monthTrades, pl]);

  const selectedTrades = useMemo(() => {
    if (!selectedDate) return [];
    return liveTrades.filter(t => t.date === selectedDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [liveTrades, selectedDate]);

  if (liveTrades.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={48} />}
        title="No trades yet"
        description="Your calendar heat map will appear here once you log trades."
        action={
          <Link to="/live-trading">
            <Button><PlusCircle size={16} /> Add First Trade</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-4">
      {/* Month navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => { setCurrentMonth(prev => subMonths(prev, 1)); setSelectedDate(null); }}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold text-slate-50">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => { setCurrentMonth(prev => addMonths(prev, 1)); setSelectedDate(null); }}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Monthly stats bar */}
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
        {[
          { label: 'Net P&L', value: pl.formatPLValue(monthStats.totalPL), color: monthStats.totalPL > 0 ? 'text-emerald-400' : monthStats.totalPL < 0 ? 'text-rose-400' : 'text-slate-300' },
          { label: 'Trades', value: String(monthStats.totalTrades), color: 'text-slate-200' },
          { label: 'Win Rate', value: monthStats.totalTrades > 0 ? `${monthStats.winRate}%` : '—', color: 'text-slate-200' },
          { label: 'Days Traded', value: String(monthStats.tradingDays), color: 'text-slate-200' },
          { label: 'Green Days', value: String(monthStats.greenDays), color: 'text-emerald-400' },
          { label: 'Red Days', value: String(monthStats.redDays), color: 'text-rose-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-slate-800/60 rounded-lg px-3 py-2 text-center">
            <p className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">{stat.label}</p>
            <p className={`font-mono text-sm font-semibold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Calendar + Day Panel */}
      <div className="flex gap-4 items-start">
        <div className="flex-1 min-w-0">
          <CalendarGrid
            currentMonth={currentMonth}
            trades={liveTrades}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
            habitCheckIns={habitCheckIns}
          />
        </div>
        {selectedDate && (
          <div className="w-72 shrink-0">
            <DayTradesPanel
              date={selectedDate}
              trades={selectedTrades}
              onClose={() => setSelectedDate(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
