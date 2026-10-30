import { useState } from 'react';
import { formatPercent } from '../../utils/formatters';
import { formatR, type ComboRow, type analyzePairGrid } from '../../utils/confluence-insights';
import ShowNumbers from './ShowNumbers';
import CombinationAnalysis from './CombinationAnalysis';

/** Fewer trades together than this and the square stays blank. */
const MIN_PAIR = 3;

function cellColor(r: number, maxAbs: number) {
  const strength = Math.min(1, Math.abs(r) / maxAbs);
  const alpha = 0.2 + strength * 0.7;
  return r >= 0 ? `rgba(16, 185, 129, ${alpha})` : `rgba(244, 63, 94, ${alpha})`;
}

export default function ComboHeatmap({ top, all, combos }: {
  top: ReturnType<typeof analyzePairGrid>;
  all: ReturnType<typeof analyzePairGrid>;
  combos: ComboRow[];
}) {
  const [showAll, setShowAll] = useState(false);
  const { names, grid, totalNames } = showAll ? all : top;
  const values = grid.flat().filter(c => c && c.trades >= MIN_PAIR && c.rPerTrade !== null).map(c => Math.abs(c!.rPerTrade!));
  const maxAbs = Math.max(0.01, ...values);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium text-slate-300">Which confluences work together?</h3>
          <p className="text-xs text-slate-500 mt-0.5">Each square = trades with both confluences: R per trade, and number of trades. Blank = fewer than {MIN_PAIR} trades together.</p>
        </div>
        {totalNames > top.names.length && (
          <button type="button" onClick={() => setShowAll(v => !v)} className="shrink-0 text-xs text-blue-400 hover:text-blue-300">
            {showAll ? `Top ${top.names.length} only` : `Show all ${totalNames}`}
          </button>
        )}
      </div>
      {names.length < 2 ? (
        <p className="py-8 text-center text-sm text-slate-500">Need trades with 2+ FOR confluences.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="border-separate" style={{ borderSpacing: 3 }}>
            <thead>
              <tr>
                <th />
                {names.map(n => (
                  <th key={n} className="text-[11px] font-normal text-slate-400 px-1 align-bottom max-w-[90px]">
                    <span className="block truncate" title={n}>{n}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {names.map((rowName, i) => (
                <tr key={rowName}>
                  <th className="text-[11px] font-normal text-slate-400 text-right pr-2 max-w-[140px]">
                    <span className="block truncate" title={rowName}>{rowName}</span>
                  </th>
                  {names.map((colName, j) => {
                    const cell = grid[i][j];
                    if (i === j) return <td key={colName} className="w-16 h-11 rounded bg-slate-700/60" />;
                    const enough = cell && cell.trades >= MIN_PAIR && cell.rPerTrade !== null;
                    return (
                      <td
                        key={colName}
                        className="w-16 h-11 rounded text-center align-middle"
                        style={{ background: enough ? cellColor(cell!.rPerTrade!, maxAbs) : 'rgba(51, 65, 85, 0.3)' }}
                        title={cell ? `${rowName} + ${colName}\n${cell.trades} trades · ${formatPercent(cell.winRate)} win · ${formatR(cell.rPerTrade)} per trade` : undefined}
                      >
                        {enough && (
                          <>
                            <div className="text-[11px] font-mono font-semibold text-slate-50">{formatR(cell!.rPerTrade)}</div>
                            <div className="text-[10px] text-slate-200/80">{cell!.trades}</div>
                          </>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ShowNumbers>
        <CombinationAnalysis data={combos} title="All pairs" subtitle={`Pairs seen ${MIN_PAIR}+ times, best win rate first`} />
      </ShowNumbers>
    </div>
  );
}
