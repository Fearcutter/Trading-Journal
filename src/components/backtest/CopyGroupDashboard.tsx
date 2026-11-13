import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Users } from 'lucide-react';
import Card from '../ui/Card';
import { useBacktest } from '../../context/BacktestContext';
import { useTradesBySession, copiedTrades } from './usePractice';
import { trackFunded, type FundedTrack } from '../../utils/prop-tracker';
import { copiesOf } from '../../utils/practice-bank';
import { firmLabel } from './usePropFirms';
import type { FirmConfig } from '../../utils/prop-ev';
import type { BacktestSession } from '../../types/backtest';

const money = (x: number) => `${x < 0 ? '-' : ''}$${Math.abs(Math.round(x)).toLocaleString('en-US')}`;

interface Row { session: BacktestSession; rules: FirmConfig; track: FundedTrack; lead: boolean }

/** On the lead account of a copy group: where every account in the group stands. */
export default function CopyGroupDashboard({ session, rules, track }: { session: BacktestSession; rules: FirmConfig; track: FundedTrack }) {
  const { sessions, getSession } = useBacktest();
  const bySession = useTradesBySession();

  const rows = useMemo(() => {
    const followers: Row[] = sessions
      .filter(s => s.stage === 'funded' && (s.copyLinks ?? []).some(l => !l.until && l.sessionId === session.id))
      .flatMap(s => {
        const r = s.folderId ? getSession(s.folderId)?.firmRules : undefined;
        if (!r) return [];
        return [{ session: s, rules: r, lead: false, track: trackFunded(bySession.get(s.id) ?? [], r, s.payouts, copiedTrades(s, bySession)) }];
      });
    return followers.length ? [{ session, rules, track, lead: true }, ...followers] : [];
  }, [sessions, session, rules, track, getSession, bySession]);

  if (rows.length === 0) return null;

  const name = (s: BacktestSession) => {
    const folder = s.folderId ? getSession(s.folderId) : undefined;
    return folder ? `${folder.name} · ${s.name}` : s.name;
  };
  const room = (r: Row) => r.track.balance - r.track.floor;
  const live = rows.filter(r => r.track.status === 'active');
  const tightest = live.length ? live.reduce((a, b) => (room(b) < room(a) ? b : a)) : null;
  const ready = live.filter(r => r.track.eligible);

  return (
    <Card className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-50 flex items-center gap-2"><Users size={15} /> Copy group</h3>
        {tightest && (
          <p className="text-xs text-slate-400">
            Least room: <span className={`font-mono ${room(tightest) < tightest.rules.funded.drawdown.amount * 0.25 ? 'text-rose-300' : 'text-slate-50'}`}>{money(room(tightest))}</span> on {tightest.lead ? 'this account' : name(tightest.session)}. Every trade here hits all of them.
          </p>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
              <th className="py-2 pr-3 font-medium">Account</th>
              <th className="py-2 pr-3 font-medium">Balance</th>
              <th className="py-2 pr-3 font-medium">Room to floor</th>
              <th className="py-2 pr-3 font-medium">Daily limit left</th>
              <th className="py-2 pr-3 font-medium">Payout cycle</th>
              <th className="py-2 font-medium">Payouts</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => {
              const t = r.track;
              const dd = r.rules.funded.drawdown.amount;
              const left = room(r);
              const tight = left < dd * 0.25;
              const today = t.lastDay && t.dailyLossLimit !== null ? t.dailyLossLimit + Math.min(0, t.lastDay.pl) : null;
              return (
                <tr key={r.session.id} className="border-b border-slate-700/50 align-top">
                  <td className="py-2 pr-3">
                    {r.lead
                      ? <span className="text-slate-100">This account <span className="text-xs text-slate-500">(lead)</span></span>
                      : <Link to={`/backtesting/${r.session.id}`} className="text-sky-300 hover:underline">{name(r.session)}</Link>}
                    <p className="text-[11px] text-slate-500">
                      {firmLabel(r.rules)}{copiesOf(r.session) > 1 ? ` · ×${copiesOf(r.session)}` : ''}
                    </p>
                    {t.status !== 'active' && (
                      <span className={`text-[11px] font-medium ${t.status === 'blown' ? 'text-rose-300' : 'text-emerald-300'}`}>
                        {t.status === 'blown' ? `Blown ${t.endedOn ?? ''}` : 'All payouts taken'}
                      </span>
                    )}
                  </td>
                  <td className="py-2 pr-3 font-mono text-slate-50">
                    {money(t.balance)}
                    <p className={`text-[11px] ${t.balance >= t.start ? 'text-emerald-400' : 'text-rose-400'}`}>{money(t.balance - t.start)} vs start</p>
                  </td>
                  <td className="py-2 pr-3 min-w-32">
                    <span className={`font-mono ${tight ? 'text-rose-300' : 'text-slate-50'}`}>{money(left)}</span>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden mt-1">
                      <div className={`h-full ${tight ? 'bg-rose-500' : 'bg-sky-500'}`} style={{ width: `${Math.max(0, Math.min(100, (left / dd) * 100))}%` }} />
                    </div>
                    <p className="text-[11px] text-slate-500">Floor {money(t.floor)}{t.floorLocked ? ' (locked)' : ''}</p>
                  </td>
                  <td className="py-2 pr-3 font-mono text-slate-300">
                    {t.dailyLossLimit === null ? <span className="text-slate-500">none</span> : today === null ? money(t.dailyLossLimit) : money(today)}
                    {t.dailyLossLimit !== null && t.lastDay && <p className="text-[11px] text-slate-500 font-sans">after {t.lastDay.date}</p>}
                  </td>
                  <td className="py-2 pr-3">
                    <span className="font-mono text-slate-50">{t.cycleDays} / {t.cycleDaysNeeded} days</span>
                    <p className="text-[11px] text-slate-500">
                      {money(t.cycleProfit)}{t.cycleProfitNeeded > 0 ? ` of ${money(t.cycleProfitNeeded)}` : ''} this cycle
                      {!t.consistencyOk && t.cycleProfit > 0 ? ` · best day over ${t.consistencyPct}%` : ''}
                    </p>
                  </td>
                  <td className="py-2">
                    {t.status === 'active' && t.eligible ? (
                      <Link
                        to={`/backtesting/${r.session.id}`}
                        className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                      >
                        Ready · up to {money(t.available)}
                      </Link>
                    ) : (
                      <span className="text-xs text-slate-500">Not yet</span>
                    )}
                    <p className="text-[11px] text-slate-500">{t.payoutsTaken}{t.maxPayouts !== null ? ` / ${t.maxPayouts}` : ''} taken · {money(t.received)} kept</p>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {ready.length > 0 && (
        <p className="text-xs text-emerald-300">
          {ready.length === 1 ? '1 account can' : `${ready.length} accounts can`} take a payout now. Payouts are taken on each account's own page.
        </p>
      )}
    </Card>
  );
}
