import { formatPercent } from '../../utils/formatters';
import { formatR, MIN_SAMPLE, type EdgeRow } from '../../utils/confluence-insights';
import ShowNumbers from './ShowNumbers';
import EdgeTable from './EdgeTable';

/** Each confluence as a bar from the middle: green right = helps, red left = hurts. Best first. */
export default function EdgeBars({ data, title, subtitle }: { data: EdgeRow[]; title: string; subtitle: string }) {
  const ranked = [...data].sort((a, b) => (b.edgeR ?? -Infinity) - (a.edgeR ?? -Infinity));
  const maxAbs = Math.max(0.01, ...ranked.map(r => Math.abs(r.edgeR ?? 0)));

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <div>
        <h3 className="text-sm font-medium text-slate-300">{title}</h3>
        <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
      </div>
      {ranked.length === 0 ? (
        <p className="py-8 text-center text-sm text-slate-500">No trades with these confluences yet.</p>
      ) : (
        <div className="space-y-1.5">
          {ranked.map(row => {
            const edge = row.edgeR ?? 0;
            const width = `${(Math.abs(edge) / maxAbs) * 50}%`;
            const tip = [
              row.name,
              `${row.with.trades} trades with it, ${row.without.trades} without`,
              `Win %: ${formatPercent(row.with.winRate)} with / ${formatPercent(row.without.winRate)} without`,
              `R per trade: ${formatR(row.with.rPerTrade)} with / ${formatR(row.without.rPerTrade)} without`,
              row.sufficient ? '' : `Small sample (fewer than ${MIN_SAMPLE} trades) — could be luck`,
            ].filter(Boolean).join('\n');
            return (
              <div key={row.name} className="flex items-center gap-2 text-xs" title={tip}>
                <span className="w-32 sm:w-44 shrink-0 text-right text-slate-300 truncate">{row.name}</span>
                <div className="relative flex-1 h-4">
                  <div className="absolute left-1/2 -top-1 -bottom-1 border-l border-dashed border-slate-600" />
                  {row.edgeR !== null && (
                    <div
                      className={`absolute top-0 h-4 rounded-sm ${edge >= 0 ? 'left-1/2 bg-emerald-500' : 'right-1/2 bg-rose-500'} ${row.sufficient ? '' : 'opacity-35'}`}
                      style={{ width }}
                    />
                  )}
                </div>
                <span className={`w-24 shrink-0 font-mono ${row.sufficient ? 'text-slate-300' : 'text-slate-500'}`}>
                  {formatR(row.edgeR)}{!row.sufficient && '*'} <span className="text-slate-500">· {row.with.trades}</span>
                </span>
              </div>
            );
          })}
          <p className="text-xs text-slate-500 pt-1">Number after the R = trades with it. Faded with * = fewer than {MIN_SAMPLE} trades. Hover a bar for details.</p>
        </div>
      )}
      {ranked.length > 0 && (
        <ShowNumbers>
          <EdgeTable data={data} title={title} />
        </ShowNumbers>
      )}
    </div>
  );
}
