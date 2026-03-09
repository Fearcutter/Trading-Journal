import type { DashboardStats } from '../../utils/stats-calculator';
import StatCard from './StatCard';
import { formatPercent } from '../../utils/formatters';
import { usePLFormatter, getTradeValue } from '../../hooks/usePLFormatter';
import { TrendingUp, TrendingDown, Target, BarChart3, Trophy, Flame, DollarSign, Percent } from 'lucide-react';

interface StatsBarProps {
  stats: DashboardStats;
}

export default function StatsBar({ stats }: StatsBarProps) {
  const pl = usePLFormatter();

  return (
    <div className="grid grid-cols-4 gap-4">
      <StatCard
        label="Total P&L"
        value={pl.formatPLValue(stats.totalPL)}
        color={stats.totalPL > 0 ? 'win' : stats.totalPL < 0 ? 'loss' : 'default'}
        icon={<DollarSign size={16} />}
      />
      <StatCard
        label="Win Rate"
        value={formatPercent(stats.winRate)}
        icon={<Percent size={16} />}
        subValue={`${stats.totalTrades} trades`}
      />
      <StatCard
        label="Profit Factor"
        value={stats.profitFactor === Infinity ? '∞' : stats.profitFactor.toFixed(2)}
        icon={<BarChart3 size={16} />}
      />
      <StatCard
        label="Avg R:R"
        value={stats.avgRR ? `1:${stats.avgRR.toFixed(2)}` : '—'}
        icon={<Target size={16} />}
      />
      <StatCard
        label="Avg Win"
        value={`+${pl.formatPLAbs(stats.avgWin)}`}
        color="win"
        icon={<TrendingUp size={16} />}
      />
      <StatCard
        label="Avg Loss"
        value={`-${pl.formatPLAbs(stats.avgLoss)}`}
        color="loss"
        icon={<TrendingDown size={16} />}
      />
      <StatCard
        label="Current Streak"
        value={`${stats.currentStreak.count} ${stats.currentStreak.type}${stats.currentStreak.count !== 1 ? 's' : ''}`}
        color={stats.currentStreak.type === 'win' ? 'win' : 'loss'}
        icon={<Flame size={16} />}
      />
      <StatCard
        label="Best Trade"
        value={stats.bestTrade ? pl.formatPLValue(getTradeValue(stats.bestTrade, pl.plField)) : '—'}
        color="win"
        icon={<Trophy size={16} />}
        subValue={stats.bestTrade ? `${stats.bestTrade.instrument} ${stats.bestTrade.date}` : undefined}
      />
    </div>
  );
}
