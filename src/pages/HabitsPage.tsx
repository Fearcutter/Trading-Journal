import { useState, useMemo } from 'react';
import { format } from 'date-fns';
import { FileText } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useHabits } from '../context/HabitContext';
import { useJournal } from '../context/JournalContext';
import { useTrades } from '../context/TradeContext';
import { usePLFormatter } from '../hooks/usePLFormatter';
import { useHabitStats } from '../hooks/useHabitStats';
import HabitCalendarView from '../components/habits/HabitCalendarView';
import UnifiedDailyForm from '../components/habits/UnifiedDailyForm';
import StreakSidebar from '../components/habits/StreakSidebar';
import BadgeShowcase from '../components/habits/BadgeShowcase';
import HabitManagementList from '../components/habits/HabitManagementList';
import HabitHeatmap from '../components/habits/HabitHeatmap';
import HabitCorrelationChart from '../components/habits/HabitCorrelationChart';
import TendencyFrequencyChart from '../components/habits/TendencyFrequencyChart';
import AdherenceOverTimeChart from '../components/habits/AdherenceOverTimeChart';

type Tab = 'checkin' | 'habits' | 'insights';

export default function HabitsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('checkin');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const { checkIns, getCheckInByDate, badges } = useHabits();
  const { entries, getEntryByDate } = useJournal();
  const { trades } = useTrades();
  const pl = usePLFormatter();
  const { overallAdherence } = useHabitStats();

  const existingCheckIn = useMemo(() => getCheckInByDate(selectedDate), [getCheckInByDate, selectedDate]);
  const existingJournalEntry = useMemo(() => getEntryByDate(selectedDate), [getEntryByDate, selectedDate]);

  const dayTrades = useMemo(() => {
    return trades.filter(t => t.date === selectedDate).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
  }, [trades, selectedDate]);

  const tabs: { key: Tab; label: string }[] = [
    { key: 'checkin', label: 'Daily Check-In' },
    { key: 'habits', label: 'My Habits' },
    { key: 'insights', label: 'Insights' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-slate-50 flex items-center gap-2">
          <FileText size={22} /> Daily Journal
        </h1>
        <div className="flex items-center gap-3 text-xs text-slate-400">
          <span>{checkIns.length} check-ins</span>
          <span>{Math.round(overallAdherence * 100)}% overall adherence</span>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-slate-800 border border-slate-700 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-slate-700 text-slate-50'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'checkin' && (
        <div className="flex gap-6">
          <div className="w-72 shrink-0 space-y-4">
            <HabitCalendarView
              currentMonth={currentMonth}
              onMonthChange={setCurrentMonth}
              checkIns={checkIns}
              selectedDate={selectedDate}
              onSelectDate={setSelectedDate}
              journalEntries={entries}
            />
            <StreakSidebar />
            <BadgeShowcase earnedBadges={badges} />
          </div>
          <div className="flex-1 space-y-4">
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <UnifiedDailyForm
                key={selectedDate + (existingCheckIn?.id ?? '') + (existingJournalEntry?.id ?? '')}
                date={selectedDate}
                existingCheckIn={existingCheckIn}
                existingJournalEntry={existingJournalEntry}
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
                      <span className={`text-sm font-mono ${pl.getPL(trade) > 0 ? 'text-emerald-400' : pl.getPL(trade) < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                        {pl.formatPLValue(pl.getPL(trade))}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'habits' && (
        <div className="max-w-2xl">
          <HabitManagementList />
        </div>
      )}

      {activeTab === 'insights' && (
        <div className="space-y-6">
          <HabitHeatmap />
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            <HabitCorrelationChart />
            <TendencyFrequencyChart />
          </div>
          <AdherenceOverTimeChart />
        </div>
      )}
    </div>
  );
}
