import { useTrades } from '../context/TradeContext';
import { useMFEMAEStats } from '../hooks/useMFEMAEStats';
import { usePLFormatter } from '../hooks/usePLFormatter';
import MFEMAEScatterPlot from '../components/analytics/MFEMAEScatterPlot';
import ExitStrategyChart from '../components/analytics/ExitStrategyChart';

export default function MFEMAEPage() {
  const { trades } = useTrades();
  const pl = usePLFormatter();
  const stats = useMFEMAEStats(trades);
  const { averages, runnerAnalysis, runnerSurvival, gradeAnalysis, exitStrategies } = stats;

  if (trades.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-50 mb-4">MFE / MAE Analysis</h2>
        <p className="text-slate-400">Add some trades to see MFE/MAE analysis.</p>
      </div>
    );
  }

  const hasData = averages.tradesWithData > 0;

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-2xl font-bold text-slate-50">MFE / MAE Analysis</h2>

      {/* Overview Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Total Trades</p>
          <p className="text-2xl font-bold text-slate-50">{averages.totalTrades}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Trades with MFE/MAE Data</p>
          <p className="text-2xl font-bold text-slate-50">{averages.tradesWithData}</p>
        </div>
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
          <p className="text-xs text-slate-500 mb-1">Win Rate</p>
          <p className="text-2xl font-bold text-emerald-400">
            {trades.length > 0 ? ((trades.filter(t => t.result === 'win').length / trades.length) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {!hasData ? (
        <div className="bg-slate-800 border border-slate-700 rounded-xl p-8 text-center">
          <p className="text-slate-400 text-lg mb-2">No MFE/MAE Data Yet</p>
          <p className="text-slate-500 text-sm">Add MAE and MFE values when entering trades to unlock exit strategy analysis, runner analysis, and more.</p>
        </div>
      ) : (
        <>
          {/* MFE/MAE Averages */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">MFE/MAE Averages</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Metric</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Points</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">R-Multiple</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  <tr className="border-b border-slate-700/50">
                    <td className="py-2 px-3">Avg MAE</td>
                    <td className="text-right py-2 px-3 font-mono">{averages.avgMAE.toFixed(2)}</td>
                    <td className="text-right py-2 px-3 font-mono">{averages.avgMAER.toFixed(2)}R</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-2 px-3">Max MAE</td>
                    <td className="text-right py-2 px-3 font-mono">{averages.maxMAE.toFixed(2)}</td>
                    <td className="text-right py-2 px-3 font-mono">{averages.maxMAER.toFixed(2)}R</td>
                  </tr>
                  <tr className="border-b border-slate-700/50">
                    <td className="py-2 px-3">Avg MFE</td>
                    <td className="text-right py-2 px-3 font-mono">{averages.avgMFE.toFixed(2)}</td>
                    <td className="text-right py-2 px-3 font-mono">{averages.avgMFER.toFixed(2)}R</td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3">Max MFE</td>
                    <td className="text-right py-2 px-3 font-mono">{averages.maxMFE.toFixed(2)}</td>
                    <td className="text-right py-2 px-3 font-mono">{averages.maxMFER.toFixed(2)}R</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Runner Analysis */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Runner Analysis by R-Threshold</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700">
                    <th className="text-left py-2 px-3 text-slate-400 font-medium">Threshold</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Trades Reaching</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">% Reaching</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Wins</th>
                    <th className="text-right py-2 px-3 text-slate-400 font-medium">Win Rate</th>
                  </tr>
                </thead>
                <tbody className="text-slate-300">
                  {runnerAnalysis.map(r => (
                    <tr key={r.threshold} className="border-b border-slate-700/50">
                      <td className="py-2 px-3 font-medium">{r.thresholdLabel}</td>
                      <td className="text-right py-2 px-3 font-mono">{r.tradesReaching}</td>
                      <td className="text-right py-2 px-3 font-mono">{r.percentReaching.toFixed(1)}%</td>
                      <td className="text-right py-2 px-3 font-mono">{r.wins}</td>
                      <td className="text-right py-2 px-3 font-mono">{r.winRate.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Runner Survival */}
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Runner Survival</h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-slate-500">Trades reaching 1R (target)</p>
                <p className="text-lg font-bold text-slate-50">{runnerSurvival.runnersFromTarget}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Survived to close above 1R</p>
                <p className="text-lg font-bold text-emerald-400">{runnerSurvival.survivedToClose}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Stopped at breakeven</p>
                <p className="text-lg font-bold text-amber-400">{runnerSurvival.stoppedAtBreakeven}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg drawback from 1R</p>
                <p className="text-lg font-bold text-rose-400">{runnerSurvival.avgDrawbackFrom1R.toFixed(2)}R</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg drawback from 2R</p>
                <p className="text-lg font-bold text-rose-400">{runnerSurvival.avgDrawbackFrom2R.toFixed(2)}R</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Avg extra pts per runner</p>
                <p className="text-lg font-bold text-emerald-400">{runnerSurvival.avgExtraDollarPerRunner.toFixed(2)}</p>
              </div>
            </div>
          </div>

          {/* Grade Analysis */}
          {gradeAnalysis.length > 0 && (
            <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
              <h3 className="text-sm font-medium text-slate-300 mb-3">Grade Analysis</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left py-2 px-3 text-slate-400 font-medium">Grade</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">Trades</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">Win Rate</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">Avg MFE (R)</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">Avg P&L</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">% to 2R</th>
                      <th className="text-right py-2 px-3 text-slate-400 font-medium">% to 3R</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-300">
                    {gradeAnalysis.map(g => (
                      <tr key={g.grade} className="border-b border-slate-700/50">
                        <td className="py-2 px-3 font-medium">{g.grade}</td>
                        <td className="text-right py-2 px-3 font-mono">{g.totalTrades}</td>
                        <td className="text-right py-2 px-3 font-mono">{g.winRate.toFixed(1)}%</td>
                        <td className="text-right py-2 px-3 font-mono">{g.avgMFER.toFixed(2)}R</td>
                        <td className={`text-right py-2 px-3 font-mono ${g.avgDollarPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{pl.formatPLValue(g.avgDollarPL)}</td>
                        <td className="text-right py-2 px-3 font-mono">{g.pctReaching2R.toFixed(1)}%</td>
                        <td className="text-right py-2 px-3 font-mono">{g.pctReaching3R.toFixed(1)}%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Exit Strategy + Scatter */}
          <div className="grid grid-cols-2 gap-6">
            <ExitStrategyChart data={exitStrategies} />
            <MFEMAEScatterPlot trades={trades} />
          </div>
        </>
      )}
    </div>
  );
}
