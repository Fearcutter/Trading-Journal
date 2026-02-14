import { useState, useMemo } from 'react';
import { format, addMonths, subMonths, startOfMonth, endOfMonth } from 'date-fns';
import { useTrades } from '../context/TradeContext';
import CalendarGrid from '../components/calendar/CalendarGrid';
import DayTradesPanel from '../components/calendar/DayTradesPanel';
import { formatCurrency } from '../utils/formatters';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { Link } from 'react-router-dom';
import { PlusCircle } from 'lucide-react';

export default function CalendarPage() {
  const { trades } = useTrades();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const monthTrades = useMemo(() => {
    const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
    const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
    return trades.filter(t => t.date >= start && t.date <= end);
  }, [trades, currentMonth]);

  const monthStats = useMemo(() => {
    const totalPL = monthTrades.reduce((sum, t) => sum + t.dollarPL, 0);
    const wins = monthTrades.filter(t => t.result === 'win').length;
    const tradingDays = new Set(monthTrades.map(t => t.date)).size;
    const greenDays = Object.values(
      monthTrades.reduce<Record<string, number>>((acc, t) => {
        acc[t.date] = (acc[t.date] || 0) + t.dollarPL;
        return acc;
      }, {})
    ).filter(pl => pl > 0).length;

    return { totalPL, wins, totalTrades: monthTrades.length, tradingDays, greenDays };
  }, [monthTrades]);

  const selectedTrades = useMemo(() => {
    if (!selectedDate) return [];
    return trades.filter(t => t.date === selectedDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [trades, selectedDate]);

  if (trades.length === 0) {
    return (
      <EmptyState
        icon={<Calendar size={48} />}
        title="No trades yet"
        description="Your calendar heat map will appear here once you log trades."
        action={
          <Link to="/trades/new">
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
          onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ChevronLeft size={20} />
        </button>
        <h2 className="text-lg font-semibold text-slate-50">
          {format(currentMonth, 'MMMM yyyy')}
        </h2>
        <button
          onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* Monthly summary */}
      <div className="flex gap-6 text-sm">
        <div>
          <span className="text-slate-500">P&L: </span>
          <span className={`font-mono font-medium ${monthStats.totalPL > 0 ? 'text-emerald-400' : monthStats.totalPL < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {monthStats.totalPL > 0 ? '+' : ''}{formatCurrency(monthStats.totalPL)}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Trades: </span>
          <span className="text-slate-300">{monthStats.totalTrades}</span>
        </div>
        <div>
          <span className="text-slate-500">Win Rate: </span>
          <span className="text-slate-300">
            {monthStats.totalTrades > 0 ? `${((monthStats.wins / monthStats.totalTrades) * 100).toFixed(0)}%` : '—'}
          </span>
        </div>
        <div>
          <span className="text-slate-500">Trading Days: </span>
          <span className="text-slate-300">{monthStats.tradingDays}</span>
        </div>
        <div>
          <span className="text-slate-500">Green Days: </span>
          <span className="text-emerald-400">{monthStats.greenDays}</span>
          <span className="text-slate-500"> / {monthStats.tradingDays}</span>
        </div>
      </div>

      {/* Calendar + Day Panel */}
      <div className="flex gap-4">
        <div className="flex-1">
          <CalendarGrid
            currentMonth={currentMonth}
            trades={trades}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>
        {selectedDate && (
          <div className="w-80 shrink-0">
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
