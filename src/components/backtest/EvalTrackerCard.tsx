import type { ReactNode } from 'react';
import { CheckCircle2, XCircle, Clock, Lock } from 'lucide-react';
import Card from '../ui/Card';
import type { EvalTrack } from '../../utils/prop-tracker';
import type { FirmConfig } from '../../utils/prop-ev';
import { firmLabel } from './usePropFirms';

const money = (x: number) => `${x < 0 ? '-' : ''}$${Math.abs(Math.round(x)).toLocaleString('en-US')}`;

function Bar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
      <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

export function StatusBadge({ status }: { status: EvalTrack['status'] }) {
  const map = {
    active: { cls: 'bg-sky-500/15 text-sky-300', label: 'In progress', Icon: Clock },
    passed: { cls: 'bg-emerald-500/15 text-emerald-300', label: 'Passed', Icon: CheckCircle2 },
    blown: { cls: 'bg-rose-500/15 text-rose-300', label: 'Blown', Icon: XCircle },
    timeout: { cls: 'bg-amber-500/15 text-amber-300', label: 'Out of days', Icon: Clock },
  } as const;
  const { cls, label, Icon } = map[status];
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cls}`}><Icon size={12} />{label}</span>;
}

/** Live rule check for one practice evaluation. */
export default function EvalTrackerCard({ track, rules, action }: { track: EvalTrack; rules: FirmConfig; action?: ReactNode }) {
  const cushion = track.balance - track.floor;
  const ddAmount = rules.eval.drawdown.amount;
  const today = track.lastDay;

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-slate-50">{firmLabel(rules)} evaluation</h3>
          <p className="text-xs text-slate-500">Uses each trade's real $ P&L, in date and time order.</p>
        </div>
        <StatusBadge status={track.status} />
      </div>

      {track.status !== 'active' && (
        <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${track.status === 'passed' ? 'bg-emerald-500/10 text-emerald-200' : 'bg-rose-500/10 text-rose-200'}`}>
          <Lock size={14} className="mt-0.5 shrink-0" />
          <p>
            {track.status === 'passed' && `Passed on ${track.endedOn} after ${track.days} trading day${track.days === 1 ? '' : 's'}. `}
            {track.status === 'blown' && `Blown on ${track.endedOn}: the balance reached the drawdown floor. `}
            {track.status === 'timeout' && `Ran out of days on ${track.endedOn}. `}
            This attempt is locked. If a trade was entered wrong, fix or delete it and the attempt reopens.
          </p>
        </div>
      )}
      {action}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-500">Profit / target</p>
          <p className="font-mono text-slate-50">{money(track.profit)} / {money(track.target)}</p>
          <Bar value={track.profit / track.target} tone="bg-emerald-500" />
        </div>
        <div>
          <p className="text-xs text-slate-500">Room to drawdown floor</p>
          <p className={`font-mono ${cushion < ddAmount * 0.25 ? 'text-rose-300' : 'text-slate-50'}`}>{money(cushion)}</p>
          <Bar value={cushion / ddAmount} tone={cushion < ddAmount * 0.25 ? 'bg-rose-500' : 'bg-sky-500'} />
          <p className="text-[11px] text-slate-500 mt-1">
            Floor {money(track.floor)}{track.floorLocked ? ' (stopped trailing)' : rules.eval.drawdown.type === 'static' ? ' (fixed)' : ' (trailing)'}
          </p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Last day{today ? ` (${today.date})` : ''}</p>
          <p className={`font-mono ${today && today.pl < 0 ? 'text-rose-300' : 'text-slate-50'}`}>{today ? money(today.pl) : '—'}</p>
          {track.dailyLossLimit !== null && (
            <>
              <Bar value={today && today.pl < 0 ? -today.pl / track.dailyLossLimit : 0} tone="bg-amber-500" />
              <p className="text-[11px] text-slate-500 mt-1">Daily loss limit {money(track.dailyLossLimit)}{today?.dailyLimitHit ? ' — hit' : ''}</p>
            </>
          )}
        </div>
        <div>
          <p className="text-xs text-slate-500">Trading days</p>
          <p className="font-mono text-slate-50">
            {track.days}{track.maxDays !== null ? ` / ${track.maxDays} max` : ''}
          </p>
          <p className="text-[11px] text-slate-500 mt-1">{track.minDays > 1 ? `At least ${track.minDays} needed to pass` : 'No minimum'}</p>
        </div>
      </div>

      {track.consistencyPct !== null && (
        <p className={`text-xs ${track.consistencyOk || track.profit <= 0 ? 'text-slate-400' : 'text-amber-300'}`}>
          Best-day rule ({track.consistencyPct}%): best day {money(track.bestDay)}
          {track.profit > 0 && ` = ${Math.round((track.bestDay / track.profit) * 100)}% of profit`}.
          {!track.consistencyOk && track.profitNeededForConsistency !== null && track.profit > 0 &&
            ` You need ${money(track.profitNeededForConsistency)} total profit before you can pass.`}
        </p>
      )}
      {track.ignoredTrades > 0 && (
        <p className="text-xs text-amber-300">
          {track.ignoredTrades} trade{track.ignoredTrades === 1 ? '' : 's'} don't count: taken after a daily loss limit stop or after the attempt ended.
        </p>
      )}
      <p className="text-xs text-slate-500">Fees so far: {money(track.fees)}{rules.eval.billing === 'monthly' ? ' (renews every 20 trading days)' : ''}.</p>
    </Card>
  );
}
