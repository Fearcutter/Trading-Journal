import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { useJournal } from '../context/JournalContext';
import { useTrades } from '../context/TradeContext';
import JournalCalendarView from '../components/journal/JournalCalendarView';
import JournalEntryForm from '../components/journal/JournalEntryForm';
import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../utils/formatters';

export default function JournalPage() {
  const { entries, addEntry, updateEntry, getEntryByDate } = useJournal();
  const { trades } = useTrades();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));

  const existingEntry = useMemo(() => getEntryByDate(selectedDate), [getEntryByDate, selectedDate]);

  const dayTrades = useMemo(() => {
    return trades.filter(t => t.date === selectedDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [trades, selectedDate]);

  const handleSubmit = (data: Parameters<typeof addEntry>[0]) => {
    if (existingEntry) {
      updateEntry(existingEntry.id, data);
    } else {
      addEntry(data);
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-bold text-slate-50 flex items-center gap-2">
        <FileText size={22} /> Daily Journal
      </h1>

      <div className="flex gap-6">
        <div className="w-72 shrink-0">
          <JournalCalendarView
            currentMonth={currentMonth}
            onMonthChange={setCurrentMonth}
            entries={entries}
            selectedDate={selectedDate}
            onSelectDate={setSelectedDate}
          />
        </div>

        <div className="flex-1 space-y-4">
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <JournalEntryForm
              key={selectedDate + (existingEntry?.id ?? '')}
              initialData={existingEntry}
              onSubmit={handleSubmit}
              date={selectedDate}
            />
          </div>

          {dayTrades.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-semibold text-slate-300 mb-3">Trades on this day</h3>
              <div className="space-y-2">
                {dayTrades.map(trade => (
                  <Link
                    key={trade.id}
                    to={`/trades/${trade.id}`}
                    className="flex items-center justify-between p-2 rounded-lg hover:bg-slate-700/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-slate-500">{trade.time}</span>
                      <span className="text-sm text-slate-200">{trade.instrument}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${trade.direction === 'long' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                        {trade.direction}
                      </span>
                      {trade.setupType && (
                        <span className="text-xs text-slate-400">{trade.setupType}</span>
                      )}
                    </div>
                    <span className={`text-sm font-mono ${trade.dollarPL > 0 ? 'text-emerald-400' : trade.dollarPL < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                      {trade.dollarPL > 0 ? '+' : ''}{formatCurrency(trade.dollarPL)}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
