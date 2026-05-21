import { useState, useMemo } from 'react';
import { useTrades } from '../context/TradeContext';
import { useApexAccounts } from '../context/ApexAccountContext';
import { useAdvancedStats } from '../hooks/useAdvancedStats';
import { usePLFormatter } from '../hooks/usePLFormatter';
import DrawdownChart from '../components/analytics/DrawdownChart';
import RollingWinRateChart from '../components/analytics/RollingWinRateChart';
import DayOfWeekChart from '../components/analytics/DayOfWeekChart';
import InstrumentComparisonChart from '../components/analytics/InstrumentComparisonChart';
import StreakChart from '../components/analytics/StreakChart';
import MonteCarloChart from '../components/analytics/MonteCarloChart';
import PlanComplianceWidget from '../components/trading-plan/PlanComplianceWidget';
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';
import MultiSelect, { type MultiSelectOption } from '../components/ui/MultiSelect';

export default function AnalyticsPage() {
  const { trades } = useTrades();
  const { accounts } = useApexAccounts();
  const pl = usePLFormatter();
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const overlapScopedTrades = useMemo(
    () => overlapScope === 'exclude' ? trades.filter(t => !t.overlap) : trades,
    [trades, overlapScope]
  );

  const accountScopedTrades = useMemo(() => {
    if (selectedAccountIds.length === 0) return overlapScopedTrades;
    return overlapScopedTrades.filter(t =>
      t.accountIds?.some(id => selectedAccountIds.includes(id))
    );
  }, [overlapScopedTrades, selectedAccountIds]);

  const accountOptions: MultiSelectOption[] = useMemo(() => {
    const STATUS_ORDER: Record<string, number> = { active: 0, blown: 1, completed: 2 };
    const formatSize = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n));
    return [...accounts]
      .sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return a.label.localeCompare(b.label);
      })
      .map(a => ({
        value: a.id,
        label: `${formatSize(a.accountSize)} ${a.label}`,
        sublabel: a.status === 'active' ? undefined : `(${a.status})`,
      }));
  }, [accounts]);

  const stats = useAdvancedStats(accountScopedTrades, pl.plField);

  if (trades.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-50 mb-4">Advanced Analytics</h2>
        <p className="text-slate-400">Add some trades to see analytics.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-50">Advanced Analytics</h2>
        <div className="flex items-center gap-3">
          {accountOptions.length > 0 && (
            <MultiSelect
              label="Account"
              value={selectedAccountIds}
              onChange={setSelectedAccountIds}
              options={accountOptions}
              placeholder="All accounts"
            />
          )}
          <OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Sharpe Ratio</p>
          <p className={`text-2xl font-bold ${stats.sharpeRatio >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {stats.sharpeRatio.toFixed(2)}
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Expectancy</p>
          <p className={`text-2xl font-bold ${stats.expectancy.expectancy >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {pl.formatPLValue(stats.expectancy.expectancy)}
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Max Drawdown</p>
          <p className="text-2xl font-bold text-rose-400">
            {pl.formatPLAbs(stats.drawdown.maxDrawdown)}
          </p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Longest Win Streak</p>
          <p className="text-2xl font-bold text-emerald-400">
            {stats.streaks.longestWin}
          </p>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-2 gap-6">
        <DrawdownChart data={stats.drawdown.series} />
        <RollingWinRateChart data={stats.rollingWinRate} />
        <DayOfWeekChart data={stats.performanceByDay} />
        <InstrumentComparisonChart data={stats.performanceByInstrument} />
        <StreakChart data={stats.streaks.streaks} />
        <MonteCarloChart simulations={stats.monteCarlo.simulations} percentiles={stats.monteCarlo.percentiles} />
        <PlanComplianceWidget trades={accountScopedTrades} />
      </div>
    </div>
  );
}
