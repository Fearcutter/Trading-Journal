import type { ConfluenceStats } from '../../utils/confluence-analyzer';
import { formatCurrency, formatPercent } from '../../utils/formatters';
import { AlertTriangle } from 'lucide-react';

interface ConfluenceTableProps {
  data: ConfluenceStats[];
}

export default function ConfluenceTable({ data }: ConfluenceTableProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300">Individual Confluence Performance</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Confluence</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Times Used</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Win Rate</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Avg P&L</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Total P&L</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Avg R:R</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-center">Sample</th>
            </tr>
          </thead>
          <tbody>
            {data.map(row => (
              <tr key={row.name} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3 text-sm text-slate-200">{row.name}</td>
                <td className="px-4 py-3 text-sm font-mono text-slate-300 text-right">{row.timesUsed}</td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono text-sm ${row.winRate >= 50 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {formatPercent(row.winRate)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono text-sm ${row.avgPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {row.avgPL >= 0 ? '+' : ''}{formatCurrency(row.avgPL)}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`font-mono text-sm font-medium ${row.totalPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {row.totalPL >= 0 ? '+' : ''}{formatCurrency(row.totalPL)}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-slate-300 text-right">
                  {row.avgRR > 0 ? `1:${row.avgRR.toFixed(2)}` : '—'}
                </td>
                <td className="px-4 py-3 text-center">
                  {!row.hasSufficientData && (
                    <span className="inline-flex items-center gap-1 text-xs text-amber-400" title="Less than 10 trades — limited statistical significance">
                      <AlertTriangle size={12} />
                      Low
                    </span>
                  )}
                  {row.hasSufficientData && (
                    <span className="text-xs text-emerald-400">OK</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="py-12 text-center text-sm text-slate-500">
          No confluence data available. Tag confluences on your trades to see analytics.
        </div>
      )}
    </div>
  );
}
