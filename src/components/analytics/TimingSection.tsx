import { useMemo, useState } from 'react';
import type { Trade } from '../../types/trade';
import { useLiveSession } from '../../context/LiveSessionContext';
import { usePLFormatter } from '../../hooks/usePLFormatter';
import { byDayOfWeek, byTimeBlock, byDuration, averageHold, formatDuration } from '../../utils/trade-timing';
import TimingTable from './TimingTable';

/**
 * "When do I trade best?" — results by day, 15-minute entry block, and time held.
 * showScope adds the Live/All switch (off inside a session, which holds one kind of trade).
 */
export default function TimingSection({ trades, showScope = true }: { trades: Trade[]; showScope?: boolean }) {
  const { sessions: liveSessions } = useLiveSession();
  const { plField } = usePLFormatter();
  const [scope, setScope] = useState<'live' | 'all'>('live');

  const scoped = useMemo(() => {
    if (!showScope || scope === 'all') return trades;
    const liveIds = new Set(liveSessions.map(s => s.id));
    return trades.filter(t => !t.sessionId || liveIds.has(t.sessionId));
  }, [trades, scope, liveSessions, showScope]);

  const days = useMemo(() => byDayOfWeek(scoped, plField), [scoped, plField]);
  const blocks = useMemo(() => byTimeBlock(scoped, plField, 15), [scoped, plField]);
  const durations = useMemo(() => byDuration(scoped, plField), [scoped, plField]);
  const hold = useMemo(() => averageHold(scoped), [scoped]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap border-t border-slate-700 pt-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-50">When do I trade best?</h2>
          <p className="text-xs text-slate-500">Net R = total R won or lost. Green / red rows = best / worst Net R among rows with 10+ trades.</p>
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        <TimingTable title="By day of week" labelHeader="Day" rows={days} />
        <div className="space-y-6">
          <TimingTable
            title="By how long the trade took"
            subtitle={`Only trades with an exit time: ${hold.withExitTime} of ${scoped.length}`}
            labelHeader="Time in trade"
            rows={durations}
          />
          <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
            <h3 className="text-sm font-medium text-slate-300 mb-3">Average time in trade</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Winners</p>
                <p className="text-lg font-bold font-mono text-emerald-400">{hold.winners.minutes === null ? '—' : formatDuration(hold.winners.minutes)}</p>
                <p className="text-xs text-slate-500">{hold.winners.trades} trades</p>
              </div>
              <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
                <p className="text-xs text-slate-500 mb-1">Losers</p>
                <p className="text-lg font-bold font-mono text-rose-400">{hold.losers.minutes === null ? '—' : formatDuration(hold.losers.minutes)}</p>
                <p className="text-xs text-slate-500">{hold.losers.trades} trades</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <TimingTable title="By time of day" subtitle="15-minute blocks, by entry time" labelHeader="Entry time" rows={blocks} />
    </div>
  );
}
