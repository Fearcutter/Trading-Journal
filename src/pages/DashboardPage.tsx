import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrades } from '../context/TradeContext';
import { useSettings } from '../context/SettingsContext';
import { useLiveSession } from '../context/LiveSessionContext';
import { useFilteredTrades, defaultFilters } from '../hooks/useFilteredTrades';
import type { TradeFilters } from '../hooks/useFilteredTrades';
import { useDashboardStats } from '../hooks/useDashboardStats';
import { usePLFormatter } from '../hooks/usePLFormatter';
import FilterBar from '../components/filters/FilterBar';
import StatsBar from '../components/dashboard/StatsBar';
import CumulativePLChart from '../components/dashboard/CumulativePLChart';
import DailyPLChart from '../components/dashboard/DailyPLChart';
import WinLossChart from '../components/dashboard/WinLossChart';
import PLBySetupChart from '../components/dashboard/PLBySetupChart';
import PLByEmotionChart from '../components/dashboard/PLByEmotionChart';
import WinRateByConfluences from '../components/dashboard/WinRateByConfluences';
import TimeOfDayChart from '../components/dashboard/TimeOfDayChart';
import RRDistributionChart from '../components/dashboard/RRDistributionChart';
import TodayCheckInWidget from '../components/dashboard/TodayCheckInWidget';
import StreakSummaryWidget from '../components/dashboard/StreakSummaryWidget';
import RecentReflectionsWidget from '../components/dashboard/RecentReflectionsWidget';
import DayRatingTrendWidget from '../components/dashboard/DayRatingTrendWidget';
import WidgetCustomizer from '../components/dashboard/WidgetCustomizer';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { LayoutDashboard, PlusCircle, Settings2 } from 'lucide-react';

export default function DashboardPage() {
  const { trades } = useTrades();
  const { sessions: liveSessions } = useLiveSession();
  const { dashboardWidgets } = useSettings();
  const [filters, setFilters] = useState<TradeFilters>(defaultFilters);
  const [tradeScope, setTradeScope] = useState<'live' | 'all'>('live');
  const [customizerOpen, setCustomizerOpen] = useState(false);
  const liveSessionIds = new Set(liveSessions.map(s => s.id));
  const scopedTrades = tradeScope === 'live'
    ? trades.filter(t => !t.sessionId || liveSessionIds.has(t.sessionId))
    : trades;
  const filtered = useFilteredTrades(scopedTrades, filters);
  const { plField } = usePLFormatter();
  const dashboard = useDashboardStats(filtered, plField);

  const w = (key: string) => dashboardWidgets[key] !== false;

  if (trades.length === 0) {
    return (
      <EmptyState
        icon={<LayoutDashboard size={48} />}
        title="No trades yet"
        description="Start logging trades to see your analytics dashboard."
        action={
          <Link to="/live-trading">
            <Button><PlusCircle size={16} /> Add First Trade</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTradeScope('live')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              tradeScope === 'live' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            Live
          </button>
          <button
            onClick={() => setTradeScope('all')}
            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
              tradeScope === 'all' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
        </div>
        <button
          onClick={() => setCustomizerOpen(true)}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-700 transition-colors"
          title="Customize widgets"
        >
          <Settings2 size={18} />
        </button>
      </div>
      <FilterBar filters={filters} onChange={setFilters} />
      <StatsBar stats={dashboard.stats} />

      {/* Journal & Habits widgets row */}
      {(w('todayCheckIn') || w('streakSummary') || w('recentReflections')) && (
        <div className="grid grid-cols-3 gap-4">
          {w('todayCheckIn') && <TodayCheckInWidget />}
          {w('streakSummary') && <StreakSummaryWidget />}
          {w('recentReflections') && <RecentReflectionsWidget />}
        </div>
      )}

      {w('dayRatingTrend') && <DayRatingTrendWidget />}

      <div className="grid grid-cols-2 gap-4">
        {w('cumulativePL') && <CumulativePLChart data={dashboard.cumulativePL} />}
        {w('dailyPL') && <DailyPLChart data={dashboard.dailyPL} />}
        {w('winLoss') && <WinLossChart wins={dashboard.winCount} losses={dashboard.lossCount} breakeven={dashboard.beCount} />}
        {w('plBySetup') && <PLBySetupChart data={dashboard.plBySetup} />}
        {w('plByEmotion') && <PLByEmotionChart data={dashboard.plByEmotion} />}
        {w('winRateByConfluences') && <WinRateByConfluences data={dashboard.winRateByConfluences} />}
        {w('timeOfDay') && <TimeOfDayChart data={dashboard.plByTimeOfDay} />}
        {w('rrDistribution') && <RRDistributionChart data={dashboard.rrDistribution} />}
      </div>

      <WidgetCustomizer open={customizerOpen} onOpenChange={setCustomizerOpen} />
    </div>
  );
}
