import { formatPercent } from '../../utils/formatters';
import { usePLFormatter } from '../../hooks/usePLFormatter';
import { formatR, type BucketRow } from '../../utils/confluence-insights';

export default function StackingTable({ rows, title, subtitle, labelHeader }: { rows: BucketRow[]; title: string; subtitle: string; labelHeader: string }) {
  const pl = usePLFormatter();
  const th = 'px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider';

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      <table className="w-full">
        <thead>
          <tr className="border-b border-slate-700 text-left">
            <th className={th}>{labelHeader}</th>
            <th className={`${th} text-right`}>Trades</th>
            <th className={`${th} text-right`}>Win %</th>
            <th className={`${th} text-right`}>R per trade</th>
            <th className={`${th} text-right`}>Total P&L</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(({ label, stats }) => {
            return (
              <tr key={label} className={`border-b border-slate-700/50 ${stats.trades === 0 ? 'opacity-40' : ''}`}>
                <td className="px-4 py-2.5 text-sm font-mono text-slate-200">{label}</td>
                <td className="px-4 py-2.5 text-sm font-mono text-slate-300 text-right">
                  {stats.trades}
                </td>
                <td className="px-4 py-2.5 text-sm font-mono text-slate-300 text-right">{stats.trades ? formatPercent(stats.winRate) : '—'}</td>
                <td className={`px-4 py-2.5 text-sm font-mono text-right ${stats.rPerTrade === null ? 'text-slate-400' : stats.rPerTrade >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {formatR(stats.rPerTrade)}
                </td>
                <td className="px-4 py-2.5 text-sm font-mono text-right text-slate-300">{stats.trades ? pl.formatPLValue(stats.totalPL) : '—'}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
