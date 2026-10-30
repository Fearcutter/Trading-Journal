import { AlertTriangle } from 'lucide-react';
import { formatPercent } from '../../utils/formatters';
import { formatR, MIN_SAMPLE } from '../../utils/confluence-insights';
import type { TimingRow } from '../../utils/trade-timing';

/** Plain table; best and worst Net R (among rows with enough trades) tinted green / red. */
export default function TimingTable({ title, subtitle, labelHeader, rows }: { title: string; subtitle?: string; labelHeader: string; rows: TimingRow[] }) {
  const ranked = rows.filter(r => r.trades >= MIN_SAMPLE && r.netR !== null);
  const best = ranked.length > 1 ? ranked.reduce((a, b) => (b.netR! > a.netR! ? b : a)) : null;
  const worst = ranked.length > 1 ? ranked.reduce((a, b) => (b.netR! < a.netR! ? b : a)) : null;
  const th = 'px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider';
  const rColor = (r: number | null, thin: boolean) => r === null || thin ? 'text-slate-400' : r >= 0 ? 'text-emerald-400' : 'text-rose-400';

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
              <th className={th}>{labelHeader}</th>
              <th className={`${th} text-right`}>Trades</th>
              <th className={`${th} text-right`}>Win %</th>
              <th className={`${th} text-right`}>Net R</th>
              <th className={`${th} text-right`}>R per trade</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const thin = r.trades > 0 && r.trades < MIN_SAMPLE;
              const tint = r === best ? 'bg-emerald-900/25' : r === worst ? 'bg-rose-900/25' : '';
              return (
                <tr key={r.label} className={`border-b border-slate-700/50 ${tint} ${r.trades === 0 ? 'opacity-40' : ''}`}>
                  <td className="px-4 py-2 text-sm text-slate-200 whitespace-nowrap">
                    {r.label}
                    {r === best && <span className="ml-2 text-[10px] font-semibold text-emerald-400 uppercase">best</span>}
                    {r === worst && <span className="ml-2 text-[10px] font-semibold text-rose-400 uppercase">worst</span>}
                  </td>
                  <td className="px-4 py-2 text-sm font-mono text-slate-300 text-right whitespace-nowrap">
                    {r.trades}
                    {thin && <span className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-amber-400" title={`Fewer than ${MIN_SAMPLE} trades — could be luck`}><AlertTriangle size={11} /> small</span>}
                  </td>
                  <td className="px-4 py-2 text-sm font-mono text-slate-300 text-right">{r.trades ? formatPercent(r.winRate) : '—'}</td>
                  <td className={`px-4 py-2 text-sm font-mono text-right font-semibold ${rColor(r.netR, thin)}`}>{formatR(r.netR)}</td>
                  <td className={`px-4 py-2 text-sm font-mono text-right ${rColor(r.rPerTrade, thin)}`}>{formatR(r.rPerTrade)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {rows.every(r => r.trades === 0) && <div className="py-8 text-center text-sm text-slate-500">No trades yet.</div>}
    </div>
  );
}
