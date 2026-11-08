import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Link2Off, AlertTriangle } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { useBacktest } from '../../context/BacktestContext';
import { useTradesBySession, copiedTrades } from './usePractice';
import { trackFunded, type FundedStatus } from '../../utils/prop-tracker';
import type { BacktestSession } from '../../types/backtest';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Link a practice funded account to another one, so trades logged there count here too. */
export default function CopyTradingCard({ session, readOnly }: { session: BacktestSession; readOnly: boolean }) {
  const { sessions, getSession, updateSession } = useBacktest();
  const bySession = useTradesBySession();
  const [pick, setPick] = useState('');

  const name = (s: BacktestSession) => {
    const folder = s.folderId ? getSession(s.folderId) : undefined;
    return folder ? `${folder.name} · ${s.name}` : s.name;
  };

  // Every other practice funded account, with whether it can still be traded
  const accounts = useMemo(() => sessions
    .filter(s => s.stage === 'funded' && s.id !== session.id)
    .map(s => {
      const rules = s.folderId ? getSession(s.folderId)?.firmRules : undefined;
      const status: FundedStatus | null = rules
        ? trackFunded(bySession.get(s.id) ?? [], rules, s.payouts, copiedTrades(s, bySession)).status
        : null;
      return { s, status, following: (s.copyLinks ?? []).some(l => !l.until) };
    }), [sessions, session.id, getSession, bySession]);

  const links = session.copyLinks ?? [];
  const active = links.find(l => !l.until);
  const leader = active ? accounts.find(a => a.s.id === active.sessionId) : undefined;
  const copiedCount = copiedTrades(session, bySession).length;
  const followers = accounts.filter(a => (a.s.copyLinks ?? []).some(l => !l.until && l.sessionId === session.id));
  const choices = accounts.filter(a => !a.following && !followers.includes(a));

  const link = () => {
    if (!pick) return;
    updateSession(session.id, { copyLinks: [...links, { sessionId: pick, from: new Date().toISOString() }] });
    setPick('');
  };
  const unlink = () => {
    const now = new Date().toISOString();
    updateSession(session.id, { copyLinks: links.map(l => (l.until ? l : { ...l, until: now })) });
  };

  return (
    <Card className="space-y-3">
      <h3 className="text-sm font-semibold text-slate-50 flex items-center gap-2"><Copy size={15} /> Copy trading</h3>

      {active ? (
        <div className="space-y-2">
          <p className="text-sm text-slate-300">
            Copying trades from{' '}
            <Link to={`/backtesting/${active.sessionId}`} className="text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline">
              {leader ? name(leader.s) : 'a deleted account'}
            </Link>{' '}
            since {day(active.from)}. Log trades there; they count on this account too, under this account's own rules.
          </p>
          {leader && leader.status !== 'active' && (
            <p className="text-sm text-amber-300 flex items-center gap-1.5">
              <AlertTriangle size={14} /> That account is {leader.status === 'blown' ? 'blown' : 'finished'}, so no new trades will come from it. Unlink, then pick another account to copy.
            </p>
          )}
          {!readOnly && <Button size="sm" variant="secondary" onClick={unlink}><Link2Off size={14} /> Unlink</Button>}
        </div>
      ) : readOnly ? (
        <p className="text-sm text-slate-500">Not copying another account.</p>
      ) : (
        <div className="space-y-2">
          <p className="text-sm text-slate-400">
            Copy another funded account: from now on, every trade you log there also counts here, with this account's own balance, drawdown and payouts.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={pick}
              onChange={e => setPick(e.target.value)}
              className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Copy trades from…</option>
              {choices.map(({ s, status }) => (
                <option key={s.id} value={s.id} disabled={status !== 'active'}>
                  {name(s)}{status === 'blown' ? ' (blown)' : status === 'finished' ? ' (finished)' : ''}
                </option>
              ))}
            </select>
            <Button size="sm" onClick={link} disabled={!pick}>Start copying</Button>
          </div>
          {choices.length === 0 && <p className="text-xs text-slate-500">No other funded practice accounts yet.</p>}
        </div>
      )}

      {copiedCount > 0 && (
        <p className="text-xs text-slate-500">
          {copiedCount} copied trade{copiedCount === 1 ? '' : 's'} count on this account. They stay in the other account's trade log, so your stats don't count them twice.
        </p>
      )}
      {followers.length > 0 && (
        <p className="text-xs text-slate-400">
          Copied to:{' '}
          {followers.map(({ s }, i) => (
            <span key={s.id}>
              {i > 0 && ', '}
              <Link to={`/backtesting/${s.id}`} className="text-sky-300 hover:underline">{name(s)}</Link>
            </span>
          ))}. Trades you log here count there too.
        </p>
      )}
    </Card>
  );
}
