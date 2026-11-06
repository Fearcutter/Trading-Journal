import { useMemo, useState } from 'react';
import type { Trade } from '../../types/trade';
import { useLiveSession } from '../../context/LiveSessionContext';
import { formatPercent } from '../../utils/formatters';
import { formatR } from '../../utils/confluence-insights';
import { analyzeLowerRR, type RRVarianceRow } from '../../utils/lower-rr';

/**
 * "Lower RR: win rate and variance" — replays every trade with smaller fixed targets
 * (using MFE) and shows win %, R and how bumpy each choice is.
 * showScope adds the Live/All switch (off inside a session, which holds one kind of trade).
 */
export default function LowerRRSection({ trades, showScope = true }: { trades: Trade[]; showScope?: boolean }) {
  const { sessions: liveSessions } = useLiveSession();
  const [scope, setScope] = useState<'live' | 'all'>('live');

  const scoped = useMemo(() => {
    if (!showScope || scope === 'all') return trades;
    const liveIds = new Set(liveSessions.map(s => s.id));
    return trades.filter(t => !t.sessionId || liveIds.has(t.sessionId));
  }, [trades, scope, liveSessions, showScope]);

  const { rows, used, missingMFE } = useMemo(() => analyzeLowerRR(scoped), [scoped]);
  const pick = (better: (a: RRVarianceRow, b: RRVarianceRow) => boolean) =>
    used ? rows.reduce((a, b) => (better(b, a) ? b : a)) : null;
  const mostR = pick((a, b) => a.totalR > b.totalR);
  const smoothest = pick((a, b) => a.maxDrawdownR < b.maxDrawdownR);

  const th = 'px-4 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider';
  const rColor = (r: number | null) => r === null ? 'text-slate-400' : r >= 0 ? 'text-emerald-400' : 'text-rose-400';

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap border-t border-slate-700 pt-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">Lower RR: win rate and variance</h2>
          <p className="text-xs text-slate-500">
            Each row replays your trades with that profit target. Reached it (your MFE): exactly that many R. Didn't reach it: losses and breakevens keep their real result; trades you took profit on early become breakeven if they'd reached 1R, otherwise −1R.
          </p>
        </div>
        {showScope && <div className="flex rounded-lg overflow-hidden border border-slate-600">
          {(['live', 'all'] as const).map(s => (
            <button
              key={s}
              onClick={() => setScope(s)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${scope === s ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              {s === 'live' ? 'Live' : 'All'}
            </button>
          ))}
        </div>}
      </div>

      <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-700 text-left">
                <th className={th}>Target</th>
                <th className={`${th} text-right`}>Win %</th>
                <th className={`${th} text-right`}>R per trade</th>
                <th className={`${th} text-right`}>Total R</th>
                <th className={`${th} text-right`}>Worst drawdown</th>
                <th className={`${th} text-right`}>Longest losing streak</th>
                <th className={`${th} text-right`}>Swing per trade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const actual = r.label === 'What you did';
                const tint = r === mostR ? 'bg-emerald-900/25' : r === smoothest ? 'bg-sky-900/25' : '';
                return (
                  <tr key={r.label} className={`border-b border-slate-700/50 ${tint} ${actual ? 'border-t-2 border-t-slate-600' : ''}`}>
                    <td className={`px-4 py-2 text-sm whitespace-nowrap ${actual ? 'font-semibold text-slate-50' : 'text-slate-200'}`}>
                      {r.label}
                      {r === mostR && <span className="ml-2 text-[10px] font-semibold text-emerald-400 uppercase">most R</span>}
                      {r === smoothest && <span className="ml-2 text-[10px] font-semibold text-sky-400 uppercase">smallest drawdown</span>}
                    </td>
                    <td className="px-4 py-2 text-sm font-mono text-slate-300 text-right">{r.trades ? formatPercent(r.winRate) : '—'}</td>
                    <td className={`px-4 py-2 text-sm font-mono text-right ${rColor(r.rPerTrade)}`}>{formatR(r.rPerTrade)}</td>
                    <td className={`px-4 py-2 text-sm font-mono text-right font-semibold ${rColor(r.trades ? r.totalR : null)}`}>{r.trades ? formatR(r.totalR) : '—'}</td>
                    <td className="px-4 py-2 text-sm font-mono text-right text-rose-300">{r.trades ? (r.maxDrawdownR > 0 ? `−${r.maxDrawdownR.toFixed(2)}R` : '0R') : '—'}</td>
                    <td className="px-4 py-2 text-sm font-mono text-right text-slate-300">{r.trades ? r.longestLosingStreak : '—'}</td>
                    <td className="px-4 py-2 text-sm font-mono text-right text-slate-300">{r.swing === null ? '—' : `${r.swing.toFixed(2)}R`}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {used === 0 && <div className="py-8 text-center text-sm text-slate-500">No trades with MFE and a stop yet.</div>}
      </div>

      <div className="text-xs text-slate-500 space-y-1">
        <p>
          Based on {used} {used === 1 ? 'trade' : 'trades'} with MFE and a stop
          {missingMFE > 0 && <>; {missingMFE} without MFE {missingMFE === 1 ? 'is' : 'are'} left out</>}.
          Win % counts trades that ended above 0R (breakevens aren't wins).
        </p>
        <p>
          Worst drawdown = biggest drop from a high point, trades in date order. Swing per trade = how far a typical trade lands from the average; lower means a smoother equity curve.
          The replay assumes the target would have been hit before anything else happened in the trade.
        </p>
      </div>
    </div>
  );
}
