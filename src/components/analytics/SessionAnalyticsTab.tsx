import { useMemo } from 'react';
import { LineChart as LineChartIcon } from 'lucide-react';
import Card from '../ui/Card';
import EmptyState from '../ui/EmptyState';
import BestVsFirstComparison from '../trading-plan/BestVsFirstComparison';
import { calculateAfterBEAnalysis } from '../../utils/mfe-mae-analyzer';
import type { useAdvancedStats } from '../../hooks/useAdvancedStats';
import type { TradingPlanComparison } from '../../hooks/useTradingPlanStats';
import type { Trade } from '../../types/trade';

/** Analytics tab of a backtest session, also used for a whole folder. */
export default function SessionAnalyticsTab({ advanced, trades, tradeCount, planComparison }: { advanced: ReturnType<typeof useAdvancedStats>; trades: Trade[]; tradeCount: number; planComparison?: TradingPlanComparison | null }) {
  const mfeReachData = useMemo(() => {
    const thresholds = [1, 1.5, 2, 2.5, 3];
    const tradesWithMFE = trades.filter(t => t.mfe != null && Math.abs(t.entry - t.stopLoss) > 0);
    if (tradesWithMFE.length === 0) return null;
    return {
      total: tradesWithMFE.length,
      rows: thresholds.map(r => {
        const wins = tradesWithMFE.filter(t => {
          const stop = Math.abs(t.entry - t.stopLoss);
          return t.mfe! >= r * stop;
        });
        const losses = tradesWithMFE.filter(t => {
          const stop = Math.abs(t.entry - t.stopLoss);
          return t.mfe! < stop; // never reached 1R — true loss
        });
        return {
          threshold: `${r}R`,
          wins: wins.length,
          losses: losses.length,
          be: tradesWithMFE.length - wins.length - losses.length,
          netR: (wins.length * r) - losses.length,
          rawWinRate: (wins.length / tradesWithMFE.length) * 100,
          trueWinRate: wins.length + losses.length > 0 ? (wins.length / (wins.length + losses.length)) * 100 : 0,
        };
      }),
    };
  }, [trades]);

  const afterBEData = useMemo(() => {
    const result = calculateAfterBEAnalysis(trades);
    return result.total > 0 ? result : null;
  }, [trades]);

  const oneRStats = useMemo(() => {
    const valid = trades.filter(t => Math.abs(t.entry - t.stopLoss) > 0);
    if (valid.length === 0) return null;
    const stopDists = valid.map(t => Math.abs(t.entry - t.stopLoss));
    const avg = stopDists.reduce((s, v) => s + v, 0) / stopDists.length;
    const min = Math.min(...stopDists);
    const max = Math.max(...stopDists);
    return { avg, min, max, count: valid.length };
  }, [trades]);

  if (tradeCount < 2) {
    return <EmptyState icon={<LineChartIcon size={48} />} title="Need more trades for analytics" description="Add at least 2 trades to see analytics." />;
  }

  const { streaks } = advanced;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {planComparison && <BestVsFirstComparison comparison={planComparison} />}

      {mfeReachData && (
        <Card className="md:col-span-2">
          <h3 className="text-sm font-medium text-slate-300 mb-4">MFE Reach Analysis <span className="text-slate-500 font-normal">({mfeReachData.total} trades)</span></h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Threshold</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">W</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">BE</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">L</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Net R</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Raw WR</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">True WR</th>
                </tr>
              </thead>
              <tbody>
                {mfeReachData.rows.map(row => (
                  <tr key={row.threshold} className="border-b border-slate-700/50">
                    <td className="px-3 py-2 text-sm font-mono font-medium text-slate-200">{row.threshold}</td>
                    <td className="px-3 py-2 text-sm text-center text-emerald-400">{row.wins}</td>
                    <td className="px-3 py-2 text-sm text-center text-amber-400">{row.be}</td>
                    <td className="px-3 py-2 text-sm text-center text-rose-400">{row.losses}</td>
                    <td className="px-3 py-2 text-sm text-center">
                      <span className={`font-mono font-medium ${row.netR > 0 ? 'text-emerald-400' : row.netR < 0 ? 'text-rose-400' : 'text-slate-200'}`}>{row.netR > 0 ? '+' : ''}{row.netR % 1 === 0 ? row.netR.toFixed(0) : row.netR.toFixed(1)}R</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center">
                      <span className="font-mono font-medium text-slate-200">{row.rawWinRate.toFixed(1)}%</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-center">
                      <span className="font-mono font-medium text-slate-200">{row.trueWinRate.toFixed(1)}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {oneRStats && (
        <Card className="md:col-span-2">
          <h3 className="text-sm font-medium text-slate-300 mb-3">1R Risk per Trade <span className="text-slate-500 font-normal">({oneRStats.count} trades)</span></h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Avg 1R (pts)</p>
              <p className="text-lg font-bold text-slate-50 font-mono">{oneRStats.avg % 1 === 0 ? oneRStats.avg.toFixed(0) : oneRStats.avg.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Min 1R (pts)</p>
              <p className="text-lg font-bold text-slate-50 font-mono">{oneRStats.min % 1 === 0 ? oneRStats.min.toFixed(0) : oneRStats.min.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Max 1R (pts)</p>
              <p className="text-lg font-bold text-slate-50 font-mono">{oneRStats.max % 1 === 0 ? oneRStats.max.toFixed(0) : oneRStats.max.toFixed(2)}</p>
            </div>
          </div>
        </Card>
      )}

      {afterBEData && (
        <Card className="md:col-span-2">
          <h3 className="text-sm font-medium text-slate-300 mb-1">After-BE Outcome</h3>
          <p className="text-xs text-slate-500 mb-3">Trades that hit 1R then returned to breakeven ({afterBEData.total} total)</p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-700">
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Outcome</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">Count</th>
                  <th className="px-3 py-2 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">%</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-slate-700/50">
                  <td className="px-3 py-2 text-sm text-slate-300">Reversed from BE → continued to win</td>
                  <td className="px-3 py-2 text-sm text-center font-mono text-emerald-400">{afterBEData.wonFromBE}</td>
                  <td className="px-3 py-2 text-sm text-center font-mono text-emerald-400">{afterBEData.wonPct.toFixed(1)}%</td>
                </tr>
                <tr className="border-b border-slate-700/50">
                  <td className="px-3 py-2 text-sm text-slate-300">Stopped at BE → reversed toward TP</td>
                  <td className="px-3 py-2 text-sm text-center font-mono text-amber-400">{afterBEData.reversedAtBE}</td>
                  <td className="px-3 py-2 text-sm text-center font-mono text-amber-400">{afterBEData.reversedPct.toFixed(1)}%</td>
                </tr>
                <tr className={afterBEData.unknownAfterBE > 0 ? 'border-b border-slate-700/50' : ''}>
                  <td className="px-3 py-2 text-sm text-slate-300">Stopped at BE → ran to original SL</td>
                  <td className="px-3 py-2 text-sm text-center font-mono text-rose-400">{afterBEData.hitSLAfterBE}</td>
                  <td className="px-3 py-2 text-sm text-center font-mono text-rose-400">{afterBEData.hitSLPct.toFixed(1)}%</td>
                </tr>
                {afterBEData.unknownAfterBE > 0 && (
                  <tr>
                    <td className="px-3 py-2 text-sm text-slate-500">Stopped at BE → outcome unknown</td>
                    <td className="px-3 py-2 text-sm text-center font-mono text-slate-500">{afterBEData.unknownAfterBE}</td>
                    <td className="px-3 py-2 text-sm text-center font-mono text-slate-500">—</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Streak Analysis */}
      <Card className="md:col-span-2">
        <h3 className="text-sm font-medium text-slate-300 mb-4">Streak Analysis</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Longest Win Streak</p>
            <p className="text-lg font-bold text-emerald-400">{streaks.longestWin}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Longest Loss Streak</p>
            <p className="text-lg font-bold text-rose-400">{streaks.longestLoss}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Avg Win Streak</p>
            <p className="text-lg font-bold text-slate-50">{streaks.avgWinStreak.toFixed(1)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Avg Loss Streak</p>
            <p className="text-lg font-bold text-slate-50">{streaks.avgLossStreak.toFixed(1)}</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
