import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Folder, Plus, X, ChevronDown, ChevronRight } from 'lucide-react';
import { useBacktest } from '../context/BacktestContext';
import { useView } from '../context/ViewContext';
import Button from '../components/ui/Button';
import Card from '../components/ui/Card';
import EmptyState from '../components/ui/EmptyState';
import CoachShareToggle from '../components/ui/CoachShareToggle';
import SessionForm, { type SessionFormValues } from '../components/backtest/SessionForm';
import SessionCard from '../components/backtest/SessionCard';
import { StatusBadge } from '../components/backtest/EvalTrackerCard';
import FirmRulesEditor from '../components/prop-ev/FirmRulesEditor';
import { usePracticeAttempts, useSessionStats } from '../components/backtest/usePractice';
import { firmLabel } from '../components/backtest/usePropFirms';
import { scorePractice } from '../utils/prop-tracker';
import type { BacktestSession } from '../types/backtest';

const pct = (x: number | null) => (x === null ? '—' : `${Math.round(x * 100)}%`);
const money = (x: number) => `${x < 0 ? '-' : ''}$${Math.abs(Math.round(x)).toLocaleString('en-US')}`;

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-lg font-semibold font-mono text-slate-50">{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

export default function BacktestFolderPage() {
  const { folderId } = useParams<{ folderId: string }>();
  const navigate = useNavigate();
  const { sessions, folders, getSession, addSession, updateSession, deleteSession, loading } = useBacktest();
  const { readOnly } = useView();
  const statsFor = useSessionStats();
  const folder = folderId ? getSession(folderId) : undefined;
  const attempts = usePracticeAttempts(folder);
  const [showForm, setShowForm] = useState(false);
  const [showRules, setShowRules] = useState(false);

  if (loading) return null;
  if (!folder || folder.kind !== 'folder') {
    return (
      <div className="space-y-4">
        <Link to="/backtesting" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200"><ArrowLeft size={16} /> Backtesting</Link>
        <EmptyState icon={<Folder size={48} />} title="Folder not found" description="This folder doesn't exist or has been deleted." />
      </div>
    );
  }

  const rules = folder.firmRules;
  const inside = sessions.filter(s => s.folderId === folder.id);
  const others = inside.filter(s => !(rules && (s.stage === 'eval' || s.stage === 'funded')));
  const score = scorePractice(attempts.map(a => ({ evalTrack: a.track, funded: a.funded?.track })));

  const newAttempt = () => {
    const n = Math.max(0, ...inside.map(s => s.attempt ?? 0)) + 1;
    const s = addSession(`Attempt ${n}`, '', undefined, folder.color, {
      folderId: folder.id, stage: 'eval', attempt: n, hiddenFromCoach: folder.hiddenFromCoach,
    });
    navigate(`/backtesting/${s.id}`);
  };

  const createSession = (v: SessionFormValues) => {
    addSession(v.name, v.description, v.instrument, v.color, { folderId: folder.id, hiddenFromCoach: folder.hiddenFromCoach });
    setShowForm(false);
  };

  const remove = (s: BacktestSession) => {
    if (!confirm(`Delete "${s.name}"? Trades in it will not be deleted.`)) return;
    deleteSession(s.id);
  };

  const setHidden = (hidden: boolean) => {
    updateSession(folder.id, { hiddenFromCoach: hidden });
    for (const s of inside) updateSession(s.id, { hiddenFromCoach: hidden });
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/backtesting" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-slate-200 transition-colors mb-3">
          <ArrowLeft size={16} /> Backtesting
        </Link>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <Folder size={20} className="text-slate-400" />
            <h1 className="text-xl font-bold text-slate-50">{folder.name}</h1>
            {!readOnly && <CoachShareToggle hidden={!!folder.hiddenFromCoach} onChange={setHidden} />}
          </div>
          {!readOnly && (
            <div className="flex gap-2">
              {rules && <Button size="sm" onClick={newAttempt}><Plus size={14} /> New attempt</Button>}
              <Button size="sm" variant={rules ? 'secondary' : 'primary'} onClick={() => setShowForm(!showForm)}>
                {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Session</>}
              </Button>
            </div>
          )}
        </div>
        {rules && <p className="text-sm text-sky-300 mt-1">Practising {firmLabel(rules)}</p>}
        {folder.description && <p className="text-sm text-slate-400 mt-1">{folder.description}</p>}
      </div>

      {showForm && !readOnly && <SessionForm kind="session" onCreate={createSession} />}

      {rules && (
        <>
          <Card>
            <h3 className="text-sm font-medium text-slate-300 mb-3">Scoreboard</h3>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <Stat label="Attempts" value={`${score.attempts} / ${folder.attemptGoal ?? '?'}`} sub={`${score.active} evaluation${score.active === 1 ? '' : 's'} in progress`} />
              <Stat label="Passed" value={String(score.passed)} sub={score.medianDaysToPass === null ? undefined : `median ${score.medianDaysToPass} days`} />
              <Stat label="Blown in eval" value={String(score.blown)} sub={score.timedOut ? `${score.timedOut} ran out of days` : undefined} />
              <Stat label="Pass rate" value={pct(score.passRate)} sub="of finished evaluations" />
              <Stat label="Funded blown" value={String(score.fundedBlown)} sub={`of ${score.fundedStarted} funded`} />
              <Stat label="Got paid" value={`${score.gotPaid}`} sub={`${pct(score.paidRate)} of attempts · ${score.payouts} payout${score.payouts === 1 ? '' : 's'}`} />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mt-4 pt-4 border-t border-slate-700">
              <Stat label="Money kept" value={money(score.received)} sub="after the split" />
              <Stat label="Fees" value={money(score.totalFees)} sub="evaluations + activations" />
              <div>
                <p className="text-xs text-slate-500">Your EV per evaluation</p>
                <p className={`text-lg font-semibold font-mono ${score.evPerAttempt === null ? 'text-slate-50' : score.evPerAttempt >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {score.evPerAttempt === null ? '—' : money(score.evPerAttempt)}
                </p>
                <p className="text-[11px] text-slate-500">(kept − fees) ÷ attempts{score.active ? '; includes attempts still running' : ''}</p>
              </div>
            </div>
          </Card>

          {attempts.length === 0 ? (
            <EmptyState icon={<Folder size={48} />} title="No attempts yet" description={readOnly ? 'No attempts yet.' : 'Press "New attempt" to start your first evaluation.'} />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {attempts.map(({ session, track, funded }) => (
                <SessionCard
                  key={session.id}
                  session={session}
                  stats={statsFor(session.id)}
                  readOnly={readOnly}
                  onDelete={() => remove(session)}
                  onUpdate={updates => updateSession(session.id, updates)}
                  badge={
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <StatusBadge status={track.status} />
                      <span>{money(track.profit)} of {money(track.target)} · {track.days} day{track.days === 1 ? '' : 's'}</span>
                      {funded && (
                        <span
                          role="link"
                          onClick={e => { e.preventDefault(); e.stopPropagation(); navigate(`/backtesting/${funded.session.id}`); }}
                          className={`cursor-pointer px-2 py-0.5 rounded-full font-medium ${funded.track.status === 'blown' ? 'bg-rose-500/15 text-rose-300' : 'bg-emerald-500/15 text-emerald-300'}`}
                        >
                          Funded{funded.track.status === 'blown' ? ' · blown' : ''}{funded.track.payoutsTaken ? ` · ${funded.track.payoutsTaken} paid (${money(funded.track.received)})` : ''}
                        </span>
                      )}
                    </div>
                  }
                />
              ))}
            </div>
          )}

          <Card>
            <button onClick={() => setShowRules(v => !v)} className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-slate-50">
              {showRules ? <ChevronDown size={16} /> : <ChevronRight size={16} />} Rules for this folder
            </button>
            {showRules && (
              <div className="mt-4">
                <p className="text-xs text-slate-500 mb-3">
                  This folder's own copy of the rules. Changing them re-checks every attempt in this folder; the Prop Firm EV page isn't affected.
                </p>
                {readOnly ? (
                  <p className="text-sm text-slate-400">Rules can only be edited by the journal owner.</p>
                ) : (
                  <FirmRulesEditor
                    key={JSON.stringify(rules)}
                    firm={rules}
                    edited={false}
                    onSave={next => updateSession(folder.id, { firmRules: next })}
                    onReset={() => {}}
                  />
                )}
              </div>
            )}
          </Card>
        </>
      )}

      {others.length > 0 && (
        <div className="space-y-2">
          {rules && <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Other sessions in this folder</h2>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {others.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                stats={statsFor(session.id)}
                readOnly={readOnly}
                folders={rules ? undefined : folders.filter(f => !f.firmRules)}
                onDelete={() => remove(session)}
                onUpdate={updates => updateSession(session.id, updates)}
              />
            ))}
          </div>
        </div>
      )}

      {!rules && others.length === 0 && !showForm && (
        <EmptyState icon={<Folder size={48} />} title="Empty folder" description="Create a session here, or move sessions in from the Backtesting page." />
      )}
    </div>
  );
}
