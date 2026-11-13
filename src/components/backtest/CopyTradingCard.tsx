import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Link2Off, AlertTriangle, X } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import MultiSelect from '../ui/MultiSelect';
import { useBacktest } from '../../context/BacktestContext';
import { useTradesBySession, copiedTrades } from './usePractice';
import { trackFunded, type FundedStatus } from '../../utils/prop-tracker';
import type { BacktestSession } from '../../types/backtest';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const following = (s: BacktestSession) => (s.copyLinks ?? []).find(l => !l.until);
const endLinks = (s: BacktestSession) => {
  const now = new Date().toISOString();
  return (s.copyLinks ?? []).map(l => (l.until ? l : { ...l, until: now }));
};

/**
 * Copy groups for practice funded accounts: one account you trade, any number
 * that copy it. Trades logged on the lead account count on every copying account.
 */
export default function CopyTradingCard({ session, readOnly }: { session: BacktestSession; readOnly: boolean }) {
  const { sessions, getSession, updateSession } = useBacktest();
  const bySession = useTradesBySession();
  const [pick, setPick] = useState('');
  const [add, setAdd] = useState<string[]>([]);

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
      return { s, status, follows: following(s)?.sessionId };
    }), [sessions, session.id, getSession, bySession]);

  const links = session.copyLinks ?? [];
  const active = links.find(l => !l.until);
  const leader = active ? accounts.find(a => a.s.id === active.sessionId) : undefined;
  const copiedCount = copiedTrades(session, bySession).length;
  const followers = accounts.filter(a => a.follows === session.id);
  const leaders = new Set(accounts.map(a => a.follows).filter(Boolean));
  // Free accounts: not copying anyone and not copied by anyone (groups don't chain)
  const free = accounts.filter(a => !a.follows && !leaders.has(a.s.id) && a.status === 'active');

  const statusLabel = (status: FundedStatus | null) => (status === 'blown' ? ' (blown)' : status === 'finished' ? ' (finished)' : '');

  const copyFrom = () => {
    if (!pick) return;
    updateSession(session.id, { copyLinks: [...links, { sessionId: pick, from: new Date().toISOString() }] });
    setPick('');
  };
  const addFollowers = () => {
    const from = new Date().toISOString();
    for (const id of add) {
      const s = accounts.find(a => a.s.id === id)?.s;
      if (s) updateSession(id, { copyLinks: [...(s.copyLinks ?? []), { sessionId: session.id, from }] });
    }
    setAdd([]);
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
              <AlertTriangle size={14} /> That account is {leader.status === 'blown' ? 'blown' : 'finished'}, so no new trades will come from it. Leave the group, then pick another account to copy.
            </p>
          )}
          {!readOnly && <Button size="sm" variant="secondary" onClick={() => updateSession(session.id, { copyLinks: endLinks(session) })}><Link2Off size={14} /> Leave group</Button>}
        </div>
      ) : (
        <div className="space-y-3">
          {followers.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-sm text-slate-300">
                This account leads a copy group. Every trade you log here also counts on:
              </p>
              <ul className="space-y-1">
                {followers.map(({ s, status }) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm">
                    <Link to={`/backtesting/${s.id}`} className="text-sky-300 hover:underline">{name(s)}</Link>
                    <span className="text-xs text-slate-500">{statusLabel(status)}</span>
                    {!readOnly && (
                      <button
                        onClick={() => updateSession(s.id, { copyLinks: endLinks(s) })}
                        title="Stop copying to this account"
                        className="text-slate-500 hover:text-rose-300"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          ) : readOnly ? (
            <p className="text-sm text-slate-500">Not in a copy group.</p>
          ) : (
            <p className="text-sm text-slate-400">
              Copy-trade several funded accounts: trade this one, and every trade you log here also counts on the accounts you add, each with its own balance, drawdown and payouts.
            </p>
          )}

          {!readOnly && (
            <div className="flex items-center gap-2 flex-wrap">
              <MultiSelect
                value={add}
                onChange={setAdd}
                options={free.map(({ s }) => ({ value: s.id, label: name(s) }))}
                placeholder={followers.length ? 'Add more accounts…' : 'Accounts that copy this one…'}
              />
              <Button size="sm" onClick={addFollowers} disabled={add.length === 0}>
                {followers.length ? 'Add to group' : 'Start copying'}
              </Button>
              {free.length === 0 && <span className="text-xs text-slate-500">No other active funded accounts free to add.</span>}
            </div>
          )}

          {!readOnly && followers.length === 0 && (
            <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-slate-700/60">
              <span className="text-xs text-slate-500">Or have this account copy another:</span>
              <select
                value={pick}
                onChange={e => setPick(e.target.value)}
                className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Copy trades from…</option>
                {accounts.filter(a => !a.follows).map(({ s, status }) => (
                  <option key={s.id} value={s.id} disabled={status !== 'active'}>{name(s)}{statusLabel(status)}</option>
                ))}
              </select>
              <Button size="sm" variant="secondary" onClick={copyFrom} disabled={!pick}>Join</Button>
            </div>
          )}
        </div>
      )}

      {copiedCount > 0 && (
        <p className="text-xs text-slate-500">
          {copiedCount} copied trade{copiedCount === 1 ? '' : 's'} count on this account. They stay in the lead account's trade log, so your stats don't count them twice.
        </p>
      )}
    </Card>
  );
}
