import type { TradingPlanComparison } from '../../hooks/useTradingPlanStats';
import { usePLFormatter } from '../../hooks/usePLFormatter';
import { formatPercent } from '../../utils/formatters';
import Card from '../ui/Card';

interface Props {
  comparison: TradingPlanComparison;
}

interface Row {
  label: string;
  first: number;
  best: number;
  format: (v: number) => string;
}

export default function BestVsFirstComparison({ comparison }: Props) {
  const pl = usePLFormatter();
  const { planStats, bestNStats } = comparison;

  const rows: Row[] = [
    { label: 'Total P&L', first: planStats.totalPL, best: bestNStats.totalPL, format: pl.formatPLValue },
    { label: 'Win Rate', first: planStats.winRate, best: bestNStats.winRate, format: v => formatPercent(v) },
    { label: 'Profit Factor', first: planStats.profitFactor, best: bestNStats.profitFactor, format: v => v === Infinity ? '---' : v.toFixed(2) },
    { label: 'Avg Win', first: planStats.avgWin, best: bestNStats.avgWin, format: pl.formatPLValue },
  ];

  const gap = bestNStats.totalPL - planStats.totalPL;

  return (
    <Card className="md:col-span-2">
      <h3 className="text-sm font-medium text-slate-300 mb-1">Best N vs First N per Day</h3>
      <p className="text-xs text-slate-500 mb-3">Do your best setups come early or late in the session?</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase">Metric</th>
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase text-right">First N (by time)</th>
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase text-right">Best N (by P&L)</th>
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase text-right">Gap</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const diff = r.best - r.first;
              const color = diff > 0 ? 'text-amber-400' : diff < 0 ? 'text-emerald-400' : 'text-slate-400';
              return (
                <tr key={r.label} className="border-b border-slate-700/50">
                  <td className="py-2 text-slate-300">{r.label}</td>
                  <td className="py-2 text-right text-slate-200 font-mono">{r.format(r.first)}</td>
                  <td className="py-2 text-right text-slate-200 font-mono">{r.format(r.best)}</td>
                  <td className={`py-2 text-right font-mono ${color}`}>
                    {diff === 0 ? '—' : r.label === 'Win Rate' ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}%` : `${diff > 0 ? '+' : ''}${r.format(diff)}`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {gap > 0 ? (
        <p className="text-xs text-amber-400 mt-3">
          Your best trades are often later in the session. Performance gap: {pl.formatPLValue(gap)}.
        </p>
      ) : gap === 0 ? (
        <p className="text-xs text-emerald-400 mt-3">
          Your first trades are your best trades — perfect timing.
        </p>
      ) : (
        <p className="text-xs text-emerald-400 mt-3">
          Your early trades outperform cherry-picked results — great execution timing.
        </p>
      )}
    </Card>
  );
}
