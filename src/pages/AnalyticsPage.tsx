import { useTrades } from '../context/TradeContext';
import { useAdvancedStats } from '../hooks/useAdvancedStats';
import { usePLFormatter } from '../hooks/usePLFormatter';
import DrawdownChart from '../components/analytics/DrawdownChart';
import RollingWinRateChart from '../components/analytics/RollingWinRateChart';
import DayOfWeekChart from '../components/analytics/DayOfWeekChart';
import InstrumentComparisonChart from '../components/analytics/InstrumentComparisonChart';
import StreakChart from '../components/analytics/StreakChart';
import MonteCarloChart from '../components/analytics/MonteCarloChart';

export default function AnalyticsPage() {
  const { trades } = useTrades();
  const pl = usePLFormatter();
  const stats = useAdvancedStats(trades, pl.plField);

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
      <h2 className="text-2xl font-bold text-slate-50">Advanced Analytics</h2>

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
      </div>
    </div>
  );
}
