import { formatCurrency, formatPercent } from '../../utils/formatters';

interface CombinationData {
  combo: string[];
  winRate: number;
  count: number;
  avgPL: number;
}

interface CombinationAnalysisProps {
  data: CombinationData[];
}

export default function CombinationAnalysis({ data }: CombinationAnalysisProps) {
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-700">
        <h3 className="text-sm font-medium text-slate-300">Confluence Pair Analysis</h3>
        <p className="text-xs text-slate-500 mt-0.5">Combinations with 3+ occurrences</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-700 text-left">
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider">Combination</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Count</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Win Rate</th>
              <th className="px-4 py-3 text-xs font-medium text-slate-400 uppercase tracking-wider text-right">Avg P&L</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr key={i} className="border-b border-slate-700/50 hover:bg-slate-700/30 transition-colors">
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-1">
                    {row.combo.map(c => (
                      <span key={c} className="inline-flex px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded-md">
                        {c}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-4 py-3 text-sm font-mono text-slate-300 text-right">{row.count}</td>
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
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {data.length === 0 && (
        <div className="py-12 text-center text-sm text-slate-500">
          Not enough data for combination analysis. Need trades with 2+ confluences (3+ occurrences per combination).
        </div>
      )}
    </div>
  );
}
