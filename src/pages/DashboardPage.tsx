import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrades } from '../context/TradeContext';
import { useFilteredTrades, defaultFilters } from '../hooks/useFilteredTrades';
import type { TradeFilters } from '../hooks/useFilteredTrades';
import { useDashboardStats } from '../hooks/useDashboardStats';
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
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { LayoutDashboard, PlusCircle } from 'lucide-react';

export default function DashboardPage() {
  const { trades } = useTrades();
  const [filters, setFilters] = useState<TradeFilters>(defaultFilters);
  const filtered = useFilteredTrades(trades, filters);
  const dashboard = useDashboardStats(filtered);

  if (trades.length === 0) {
    return (
      <EmptyState
        icon={<LayoutDashboard size={48} />}
        title="No trades yet"
        description="Start logging trades to see your analytics dashboard."
        action={
          <Link to="/trades/new">
            <Button><PlusCircle size={16} /> Add First Trade</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onChange={setFilters} />
      <StatsBar stats={dashboard.stats} />
      <div className="grid grid-cols-2 gap-4">
        <CumulativePLChart data={dashboard.cumulativePL} />
        <DailyPLChart data={dashboard.dailyPL} />
        <WinLossChart wins={dashboard.winCount} losses={dashboard.lossCount} breakeven={dashboard.beCount} />
        <PLBySetupChart data={dashboard.plBySetup} />
        <PLByEmotionChart data={dashboard.plByEmotion} />
        <WinRateByConfluences data={dashboard.winRateByConfluences} />
        <TimeOfDayChart data={dashboard.plByTimeOfDay} />
        <RRDistributionChart data={dashboard.rrDistribution} />
      </div>
    </div>
  );
}
