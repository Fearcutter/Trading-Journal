import { useState } from 'react';
import { Banknote, Lock, Undo2 } from 'lucide-react';
import Card from '../ui/Card';
import type { FundedTrack } from '../../utils/prop-tracker';
import type { FirmConfig } from '../../utils/prop-ev';
import type { PracticePayout } from '../../types/backtest';
import { firmLabel } from './usePropFirms';

const money = (x: number) => `${x < 0 ? '-' : ''}$${Math.abs(Math.round(x)).toLocaleString('en-US')}`;

function Bar({ value, tone }: { value: number; tone: string }) {
  return (
    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
      <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, value * 100))}%` }} />
    </div>
  );
}

interface Props {
  track: FundedTrack;
  rules: FirmConfig;
  payouts: PracticePayout[];
  readOnly: boolean;
  /** Date to record a payout on: the last trading day. */
  payoutDate: string | null;
  onPayoutsChange: (next: PracticePayout[]) => void;
  /** Copy-traded accounts: each payout happens on every copy. */
  copies?: number;
}

/** Live rule check and payout tracker for a practice funded account. */
export default function FundedTrackerCard({ track, rules, payouts, readOnly, payoutDate, onPayoutsChange, copies = 1 }: Props) {
  const [amount, setAmount] = useState('');
  const ddAmount = rules.funded.drawdown.amount;
  const cushion = track.balance - track.floor;
  const split = rules.funded.split;
  const gross = amount === '' ? track.available : Math.min(track.available, Math.max(0, Math.floor(Number(amount) || 0)));
  const canTake = track.eligible && payoutDate !== null && gross >= Math.max(track.minPayout, 1);

  const take = () => {
    if (!canTake || !payoutDate) return;
    onPayoutsChange([...payouts, { date: payoutDate, gross, received: Math.round(gross * split * 100) / 100, recordedAt: new Date().toISOString(), dayIndex: track.days }]);
    setAmount('');
  };

  const waitingFor: string[] = [];
  if (track.cycleDays < track.cycleDaysNeeded) waitingFor.push(`${track.cycleDaysNeeded - track.cycleDays} more qualifying day${track.cycleDaysNeeded - track.cycleDays === 1 ? '' : 's'}`);
  if (track.cycleProfit < track.cycleProfitNeeded) waitingFor.push(`${money(track.cycleProfitNeeded - track.cycleProfit)} more profit this cycle`);
  if (!track.consistencyOk && track.cycleProfit > 0) waitingFor.push(`best day under ${track.consistencyPct}% of the cycle's profit`);
  if (track.available < Math.max(track.minPayout, 1)) waitingFor.push(`at least ${money(track.minPayout)} available above the buffer`);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-slate-50">{firmLabel(rules)} funded account</h3>
          <p className="text-xs text-slate-500">
            Uses each trade's real $ P&L. A payout counts at the end of the day it's dated.{copies > 1 ? ` Copy-traded on ${copies} accounts: the numbers below are for one.` : ''}
          </p>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
          track.status === 'active' ? 'bg-sky-500/15 text-sky-300' : track.status === 'blown' ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'
        }`}>
          {track.status === 'active' ? 'Funded' : track.status === 'blown' ? 'Blown' : 'All payouts taken'}
        </span>
      </div>

      {track.status !== 'active' && (
        <div className={`flex items-start gap-2 rounded-lg p-3 text-sm ${track.status === 'blown' ? 'bg-rose-500/10 text-rose-200' : 'bg-emerald-500/10 text-emerald-200'}`}>
          <Lock size={14} className="mt-0.5 shrink-0" />
          <p>
            {track.status === 'blown' ? `Blown on ${track.endedOn}. ` : `Reached the firm's ${track.maxPayouts} payouts on ${track.endedOn}. `}
            This account is locked. If a trade or payout was entered wrong, fix it and the account reopens.
          </p>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-xs text-slate-500">Balance</p>
          <p className="font-mono text-slate-50">{money(track.balance)}</p>
          <p className="text-[11px] text-slate-500 mt-1">{money(track.balance - track.start)} vs start</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">Room to drawdown floor</p>
          <p className={`font-mono ${cushion < ddAmount * 0.25 ? 'text-rose-300' : 'text-slate-50'}`}>{money(cushion)}</p>
          <Bar value={cushion / ddAmount} tone={cushion < ddAmount * 0.25 ? 'bg-rose-500' : 'bg-sky-500'} />
          <p className="text-[11px] text-slate-500 mt-1">Floor {money(track.floor)}{track.floorLocked ? ' (stopped trailing)' : ''}</p>
        </div>
        <div>
          <p className="text-xs text-slate-500">This payout cycle</p>
          <p className="font-mono text-slate-50">{track.cycleDays} / {track.cycleDaysNeeded} days · {money(track.cycleProfit)}</p>
          <Bar value={track.cycleDaysNeeded ? track.cycleDays / track.cycleDaysNeeded : 1} tone="bg-emerald-500" />
          {rules.funded.minDayProfit > 0 && <p className="text-[11px] text-slate-500 mt-1">Days of {money(rules.funded.minDayProfit)}+ count</p>}
        </div>
        <div>
          <p className="text-xs text-slate-500">Payouts</p>
          <p className="font-mono text-emerald-300">{track.payoutsTaken}{track.maxPayouts !== null ? ` / ${track.maxPayouts}` : ''} · {money(track.received)} kept</p>
          <p className="text-[11px] text-slate-500 mt-1">Activation fee {money(track.fees)}</p>
        </div>
      </div>

      {track.dailyLossLimit !== null && track.lastDay && (
        <p className="text-xs text-slate-400">
          Last day ({track.lastDay.date}): {money(track.lastDay.pl)} of a {money(track.dailyLossLimit)} daily loss limit{track.lastDay.dailyLimitHit ? ' — hit' : ''}.
        </p>
      )}
      {track.ignoredTrades > 0 && (
        <p className="text-xs text-amber-300">
          {track.ignoredTrades} trade{track.ignoredTrades === 1 ? '' : 's'} don't count: taken after a daily loss limit stop or after the account ended.
        </p>
      )}

      {track.status === 'active' && (
        <div className={`rounded-lg border p-3 ${track.eligible ? 'border-emerald-500/40 bg-emerald-500/10' : 'border-slate-700'}`}>
          {track.eligible ? (
            <div className="flex items-end gap-3 flex-wrap">
              <div className="text-sm text-emerald-200">
                <p className="font-medium">Payout available: up to {money(track.available)}</p>
                <p className="text-xs text-emerald-200/80">
                  You keep {Math.round(split * 100)}%: {money(gross * split)}{copies > 1 ? ` on each of ${copies} copied accounts (${money(gross * split * copies)} in all)` : ''}{payoutDate ? `, dated ${payoutDate}` : ''}.
                </p>
              </div>
              {!readOnly && (
                <>
                  <input
                    type="number"
                    min={track.minPayout}
                    max={track.available}
                    value={amount}
                    placeholder={String(track.available)}
                    onChange={e => setAmount(e.target.value)}
                    className="w-28 px-2 py-1.5 bg-slate-900 border border-slate-600 rounded-md text-sm font-mono text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    title="Amount to withdraw (leave blank for the most allowed)"
                  />
                  <button
                    onClick={take}
                    disabled={!canTake}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white disabled:opacity-40"
                  >
                    <Banknote size={14} /> Take payout
                  </button>
                </>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-400">
              Not eligible for a payout yet{waitingFor.length ? `: needs ${waitingFor.join(', ')}` : ''}.
            </p>
          )}
        </div>
      )}

      {payouts.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">Payouts taken</p>
          <ul className="text-sm space-y-1">
            {payouts.map((p, i) => (
              <li key={`${p.date}-${i}`} className="flex items-center gap-3 text-slate-300">
                <span className="font-mono text-slate-400">{p.date}</span>
                <span className="font-mono">{money(p.gross)} withdrawn · {money(p.received)} kept</span>
                {!readOnly && i === payouts.length - 1 && (
                  <button onClick={() => onPayoutsChange(payouts.slice(0, -1))} className="flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
                    <Undo2 size={12} /> Undo
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
