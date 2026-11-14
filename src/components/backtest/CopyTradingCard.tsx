import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Copy, Link2Off, AlertTriangle, X, SlidersHorizontal } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import MultiSelect from '../ui/MultiSelect';
import { useBacktest } from '../../context/BacktestContext';
import { useTradesBySession, copiedTrades, copyResult } from './usePractice';
import { trackFunded, type FundedStatus } from '../../utils/prop-tracker';
import type { BacktestSession, CopyLink } from '../../types/backtest';

const day = (iso: string) => new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
const money = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;
const following = (s: BacktestSession) => (s.copyLinks ?? []).find(l => !l.until);
const endLinks = (s: BacktestSession, now = new Date().toISOString()) =>
  (s.copyLinks ?? []).map(l => (l.until ? l : { ...l, until: now }));

/** "at 50% size, stopping for the day at +$1,000"; empty at full size with no cap. */
function sizing(link: Pick<CopyLink, 'ratio' | 'dailyCap'>): string {
  const parts: string[] = [];
  if (link.ratio !== undefined && link.ratio !== 1) parts.push(`at ${Math.round(link.ratio * 100)}% size`);
  if (link.dailyCap) parts.push(`stopping for the day at +${money(link.dailyCap)}`);
  return parts.join(', ');
}

/** Size and daily-cap inputs; turns the typed values into a link's settings (or an error). */
function useSizingInputs(initial?: Pick<CopyLink, 'ratio' | 'dailyCap'>) {
  const [pct, setPct] = useState(String(Math.round((initial?.ratio ?? 1) * 100)));
  const [cap, setCap] = useState(initial?.dailyCap ? String(initial.dailyCap) : '');
  const p = Number(pct);
  const c = cap.trim() === '' ? undefined : Number(cap);
  const error = !Number.isFinite(p) || p <= 0 || p > 1000
    ? 'Size must be between 1% and 1000%.'
    : c !== undefined && (!Number.isFinite(c) || c <= 0)
      ? 'Daily cap must be a positive dollar amount, or blank for none.'
      : null;
  const settings: Pick<CopyLink, 'ratio' | 'dailyCap'> = {
    ...(p !== 100 ? { ratio: p / 100 } : {}),
    ...(c !== undefined ? { dailyCap: c } : {}),
  };
  const inputs = (
    <>
      <label className="flex items-center gap-1.5 text-xs text-slate-400">
        Size
        <input
          type="number" min={1} max={1000} step={5} value={pct} onChange={e => setPct(e.target.value)}
          className="w-16 px-2 py-1 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-50 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        %
      </label>
      <label className="flex items-center gap-1.5 text-xs text-slate-400" title="Stop copying for the day once this account is up this much from copied trades. Leave blank for no cap.">
        Daily cap $
        <input
          type="number" min={0} step={100} value={cap} onChange={e => setCap(e.target.value)} placeholder="none"
          className="w-20 px-2 py-1 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-50 font-mono placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </label>
    </>
  );
  const reset = (link?: Pick<CopyLink, 'ratio' | 'dailyCap'>) => {
    setPct(String(Math.round((link?.ratio ?? 1) * 100)));
    setCap(link?.dailyCap ? String(link.dailyCap) : '');
  };
  return { inputs, settings, error, reset };
}

/**
 * Copy groups for practice accounts: one funded account you trade, any number that copy it.
 * Trades logged on the lead account count on every copying account. Funded accounts and
 * evaluations can copy; each copy can be sized down (ratio) and stopped for the day at a cap,
 * e.g. an evaluation with a daily profit goal copying a funded account with no such limit.
 */
export default function CopyTradingCard({ session, readOnly }: { session: BacktestSession; readOnly: boolean }) {
  const { sessions, getSession, updateSession } = useBacktest();
  const bySession = useTradesBySession();
  const isEval = session.stage === 'eval';
  const [pick, setPick] = useState('');
  const [add, setAdd] = useState<string[]>([]);
  const [editing, setEditing] = useState(false);

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
  const { trades: copied, skipped } = copyResult(session, bySession);
  const followers = sessions
    .filter(s => s.id !== session.id && following(s)?.sessionId === session.id)
    .map(s => ({ s, link: following(s)!, status: accounts.find(a => a.s.id === s.id)?.status ?? null }));
  // Accounts that lead a group (copied by a funded account or an evaluation)
  const leaders = new Set(sessions.map(s => following(s)?.sessionId).filter(Boolean));
  // Free accounts: not copying anyone and not copied by anyone (groups don't chain)
  const free = accounts.filter(a => !a.follows && !leaders.has(a.s.id) && a.status === 'active');

  const statusLabel = (status: FundedStatus | null) => (status === 'blown' ? ' (blown)' : status === 'finished' ? ' (finished)' : '');

  const join = useSizingInputs();
  const edit = useSizingInputs(active);

  const copyFrom = () => {
    if (!pick || join.error) return;
    updateSession(session.id, { copyLinks: [...links, { sessionId: pick, from: new Date().toISOString(), ...join.settings }] });
    setPick('');
  };
  // New sizing applies from now on; trades already copied keep the sizing they had
  const saveSizing = () => {
    if (!active || edit.error) return;
    const now = new Date().toISOString();
    updateSession(session.id, { copyLinks: [...endLinks(session, now), { sessionId: active.sessionId, from: now, ...edit.settings }] });
    setEditing(false);
  };
  const addFollowers = () => {
    const from = new Date().toISOString();
    for (const id of add) {
      const s = accounts.find(a => a.s.id === id)?.s;
      if (s) updateSession(id, { copyLinks: [...(s.copyLinks ?? []), { sessionId: session.id, from }] });
    }
    setAdd([]);
  };

  const joinRow = (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <select
          value={pick}
          onChange={e => setPick(e.target.value)}
          className="px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">{isEval ? 'Copy trades from a funded account…' : 'Copy trades from…'}</option>
          {accounts.filter(a => !a.follows).map(({ s, status }) => (
            <option key={s.id} value={s.id} disabled={status !== 'active'}>{name(s)}{statusLabel(status)}</option>
          ))}
        </select>
        {join.inputs}
        <Button size="sm" variant={isEval ? 'primary' : 'secondary'} onClick={copyFrom} disabled={!pick || !!join.error}>
          {isEval ? 'Start copying' : 'Join'}
        </Button>
      </div>
      {join.error && <p className="text-xs text-rose-300">{join.error}</p>}
      {isEval && accounts.length === 0 && <p className="text-xs text-slate-500">No funded practice accounts yet to copy from.</p>}
    </div>
  );

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
            since {day(active.from)}{sizing(active) ? `, ${sizing(active)}` : ''}. Log trades there; they count on this account too, under this account's own rules.
          </p>
          {leader && leader.status !== 'active' && (
            <p className="text-sm text-amber-300 flex items-center gap-1.5">
              <AlertTriangle size={14} /> That account is {leader.status === 'blown' ? 'blown' : 'finished'}, so no new trades will come from it. Leave the group, then pick another account to copy.
            </p>
          )}
          {!readOnly && editing && (
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                {edit.inputs}
                <Button size="sm" onClick={saveSizing} disabled={!!edit.error}>Save</Button>
                <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
              </div>
              {edit.error
                ? <p className="text-xs text-rose-300">{edit.error}</p>
                : <p className="text-xs text-slate-500">Applies to trades logged from now on. Trades already copied keep their size.</p>}
            </div>
          )}
          {!readOnly && !editing && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button size="sm" variant="secondary" onClick={() => { edit.reset(active); setEditing(true); }}><SlidersHorizontal size={14} /> Change size or cap</Button>
              <Button size="sm" variant="secondary" onClick={() => updateSession(session.id, { copyLinks: endLinks(session) })}><Link2Off size={14} /> {isEval ? 'Stop copying' : 'Leave group'}</Button>
            </div>
          )}
        </div>
      ) : isEval ? (
        <div className="space-y-3">
          <p className="text-sm text-slate-400">
            {readOnly
              ? 'Not copying another account.'
              : "Run this evaluation alongside a funded account: trades you log there count here too. Size them down and set a daily cap to fit the evaluation's rules, e.g. 50% size and stop for the day at +$1,000."}
          </p>
          {!readOnly && joinRow}
        </div>
      ) : (
        <div className="space-y-3">
          {followers.length > 0 ? (
            <div className="space-y-1.5">
              <p className="text-sm text-slate-300">
                This account leads a copy group. Every trade you log here also counts on:
              </p>
              <ul className="space-y-1">
                {followers.map(({ s, link, status }) => (
                  <li key={s.id} className="flex items-center gap-2 text-sm flex-wrap">
                    <Link to={`/backtesting/${s.id}`} className="text-sky-300 hover:underline">{name(s)}</Link>
                    {s.stage === 'eval' && <span className="text-[11px] px-1.5 py-0.5 rounded bg-slate-700 text-slate-300">eval</span>}
                    {sizing(link) && <span className="text-xs text-slate-400">{sizing(link)}</span>}
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
              Copy-trade several funded accounts: trade this one, and every trade you log here also counts on the accounts you add, each with its own balance, drawdown and payouts. Evaluations can copy this account too, from their own page.
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
            <div className="space-y-2 pt-2 border-t border-slate-700/60">
              <span className="text-xs text-slate-500">Or have this account copy another:</span>
              {joinRow}
            </div>
          )}
        </div>
      )}

      {(copied.length > 0 || skipped > 0) && (
        <p className="text-xs text-slate-500">
          {copied.length} copied trade{copied.length === 1 ? '' : 's'} count on this account.
          {skipped > 0 && ` ${skipped} more ${skipped === 1 ? 'was' : 'were'} left out because the daily cap had been reached.`}
          {' '}They stay in the lead account's trade log, so your stats don't count them twice.
        </p>
      )}
    </Card>
  );
}
