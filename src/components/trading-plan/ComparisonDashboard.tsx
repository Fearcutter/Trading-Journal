import type { TradingPlanComparison } from '../../hooks/useTradingPlanStats';
import { usePLFormatter } from '../../hooks/usePLFormatter';
import { formatPercent } from '../../utils/formatters';
import Card from '../ui/Card';

interface Props {
  comparison: TradingPlanComparison;
}

interface MetricRow {
  label: string;
  plan: number;
  all: number;
  format: (v: number) => string;
  higherIsBetter: boolean;
}

export default function ComparisonDashboard({ comparison }: Props) {
  const pl = usePLFormatter();
  const { planStats, allStats } = comparison;

  const metrics: MetricRow[] = [
    { label: 'Total P&L', plan: planStats.totalPL, all: allStats.totalPL, format: pl.formatPLValue, higherIsBetter: true },
    { label: 'Win Rate', plan: planStats.winRate, all: allStats.winRate, format: v => formatPercent(v), higherIsBetter: true },
    { label: 'Profit Factor', plan: planStats.profitFactor, all: allStats.profitFactor, format: v => v === Infinity ? '---' : v.toFixed(2), higherIsBetter: true },
    { label: 'Avg Win', plan: planStats.avgWin, all: allStats.avgWin, format: pl.formatPLValue, higherIsBetter: true },
    { label: 'Avg Loss', plan: planStats.avgLoss, all: allStats.avgLoss, format: v => pl.formatPLAbs(v), higherIsBetter: false },
    { label: 'Total Trades', plan: planStats.totalTrades, all: allStats.totalTrades, format: v => String(v), higherIsBetter: false },
  ];

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300 mb-3">Plan vs All Trades</h3>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase">Metric</th>
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase text-right">First {comparison.planStats.totalTrades > 0 ? `${comparison.planTrades.length}` : 'N'}/day</th>
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase text-right">All Trades</th>
              <th className="pb-2 text-xs font-medium text-slate-500 uppercase text-right">Delta</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => {
              const delta = m.plan - m.all;
              const isBetter = m.higherIsBetter ? delta > 0 : delta < 0;
              const isWorse = m.higherIsBetter ? delta < 0 : delta > 0;
              const deltaColor = isBetter ? 'text-emerald-400' : isWorse ? 'text-rose-400' : 'text-slate-400';
              const deltaStr = m.label === 'Total Trades'
                ? String(delta)
                : m.label === 'Win Rate'
                  ? `${delta > 0 ? '+' : ''}${delta.toFixed(1)}%`
                  : m.label === 'Profit Factor'
                    ? `${delta > 0 ? '+' : ''}${delta.toFixed(2)}`
                    : `${delta > 0 ? '+' : ''}${m.format(delta)}`;

              return (
                <tr key={m.label} className="border-b border-slate-700/50">
                  <td className="py-2 text-slate-300">{m.label}</td>
                  <td className="py-2 text-right text-slate-200 font-mono">{m.format(m.plan)}</td>
                  <td className="py-2 text-right text-slate-400 font-mono">{m.format(m.all)}</td>
                  <td className={`py-2 text-right font-mono ${deltaColor}`}>{delta === 0 ? '—' : deltaStr}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
