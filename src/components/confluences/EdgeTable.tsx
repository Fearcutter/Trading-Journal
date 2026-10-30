import { AlertTriangle } from 'lucide-react';
import { formatPercent } from '../../utils/formatters';
import { usePLFormatter } from '../../hooks/usePLFormatter';
import { formatR, MIN_SAMPLE, type EdgeRow } from '../../utils/confluence-insights';

/** Green/red only when there's enough data; grey otherwise. */
function edgeColor(value: number | null, sufficient: boolean) {
  if (value === null || !sufficient) return 'text-slate-500';
  return value > 0 ? 'text-emerald-400' : value < 0 ? 'text-rose-400' : 'text-slate-300';
}

export default function EdgeTable({ data, title, subtitle }: { data: EdgeRow[]; title: string; subtitle?: string }) {
  const pl = usePLFormatter();
  const th = 'px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider';

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className={th}>Confluence</th>
              <th className={`${th} text-right`}>Trades</th>
              <th className={`${th} text-right`}>Win % <span className="normal-case text-slate-500">with / without</span></th>
              <th className={`${th} text-right`}>R per trade <span className="normal-case text-slate-500">with / without</span></th>
              <th className={`${th} text-right`}>Edge</th>
              <th className={`${th} text-right`}>Total P&L</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.name} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-200">{row.name}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-300 text-right">{row.with.trades}</td>
                <td className="px-4 py-3 text-sm font-mono text-right">
                  <span className="text-slate-200">{formatPercent(row.with.winRate)}</span>
                  <span className="text-slate-500"> / {formatPercent(row.without.winRate)}</span>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-right">
                  <span className="text-slate-200">{formatR(row.with.rPerTrade)}</span>
                  <span className="text-slate-500"> / {formatR(row.without.rPerTrade)}</span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono text-sm font-semibold ${edgeColor(row.edgeR, row.sufficient)}`}>{formatR(row.edgeR)}</span>
                  {!row.sufficient && (
                    <span className="ml-1.5 inline-flex items-center gap-1 text-xs text-amber-400" title={`Fewer than ${MIN_SAMPLE} trades with or without it — could be luck`}>
                      <AlertTriangle size={12} /> small sample
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono text-sm ${row.with.totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{pl.formatPLValue(row.with.totalPL)}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && <div className="py-12 text-center text-sm text-slate-500">No trades with these confluences yet.</div>}
    </div>
  );
}
