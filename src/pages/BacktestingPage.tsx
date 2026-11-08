import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FlaskConical, Trash2, Plus, X, Folder, FolderPlus } from 'lucide-react';
import { useBacktest } from '../context/BacktestContext';
import { useView } from '../context/ViewContext';
import Button from '../components/ui/Button';
import EmptyState from '../components/ui/EmptyState';
import CoachShareToggle from '../components/ui/CoachShareToggle';
import SessionForm, { type SessionFormValues } from '../components/backtest/SessionForm';
import { SESSION_DOT_COLORS } from '../components/backtest/colors';
import SessionCard from '../components/backtest/SessionCard';
import { useSessionStats, useTradesBySession } from '../components/backtest/usePractice';
import { firmLabel } from '../components/backtest/usePropFirms';
import { useMoveSession } from '../components/backtest/useMoveSession';
import { trackEval } from '../utils/prop-tracker';
import PracticeBankCard from '../components/backtest/PracticeBankCard';
import { usePracticeBank } from '../components/backtest/usePracticeBank';
import { bankMoney, copiesOf } from '../utils/practice-bank';
import type { BacktestSession } from '../types/backtest';

export default function BacktestingPage() {
  const { sessions, folders, addSession, updateSession, deleteSession } = useBacktest();
  const { readOnly } = useView();
  const moveSession = useMoveSession();
  const statsFor = useSessionStats();
  const bySession = useTradesBySession();
  const bank = usePracticeBank();
  const [showForm, setShowForm] = useState<'session' | 'folder' | null>(null);

  const create = (kind: 'session' | 'folder') => (v: SessionFormValues) => {
    addSession(v.name, v.description, v.instrument, v.color, kind === 'folder'
      ? { kind: 'folder', ...(v.firmRules ? { firmRules: v.firmRules, attemptGoal: v.attemptGoal } : {}) }
      : {});
    setShowForm(null);
  };

  const handleDelete = (s: BacktestSession) => {
    if (!confirm(`Delete session "${s.name}"? Trades in this session will not be deleted.`)) return;
    deleteSession(s.id);
  };

  const handleDeleteFolder = (f: BacktestSession) => {
    if (!confirm(`Delete folder "${f.name}"? Its sessions move back to the main list; no sessions or trades are deleted.`)) return;
    deleteSession(f.id);
  };

  // Sharing a folder with the coach shares (or hides) everything inside it
  const setFolderHidden = (f: BacktestSession, hidden: boolean) => {
    updateSession(f.id, { hiddenFromCoach: hidden });
    for (const s of sessions) if (s.folderId === f.id) updateSession(s.id, { hiddenFromCoach: hidden });
  };

  const looseSessions = sessions.filter(s => !s.folderId || !folders.some(f => f.id === s.folderId));

  const folderSummary = (f: BacktestSession) => {
    const inside = sessions.filter(s => s.folderId === f.id);
    if (!f.firmRules) return `${inside.length} session${inside.length === 1 ? '' : 's'}`;
    const attempts = inside.filter(s => s.stage === 'eval');
    const statuses = attempts.map(s => trackEval(bySession.get(s.id) ?? [], f.firmRules!).status);
    const passed = statuses.filter(s => s === 'passed').length;
    const blown = statuses.filter(s => s === 'blown').length;
    const money = bank.started && f.id in bank.folders ? ` · ${bankMoney(bank.folders[f.id])} in folder` : '';
    return `${attempts.reduce((n, s) => n + copiesOf(s), 0)} of ${f.attemptGoal ?? '?'} attempts · ${passed} passed · ${blown} blown${money}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <FlaskConical size={24} className="text-slate-400" />
          <h1 className="text-xl font-bold text-slate-50">Backtesting</h1>
        </div>
        {!readOnly && (
          <div className="flex gap-2">
            <Button size="sm" variant="secondary" onClick={() => setShowForm(showForm === 'folder' ? null : 'folder')}>
              {showForm === 'folder' ? <><X size={14} /> Cancel</> : <><FolderPlus size={14} /> New Folder</>}
            </Button>
            <Button size="sm" onClick={() => setShowForm(showForm === 'session' ? null : 'session')}>
              {showForm === 'session' ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New Session</>}
            </Button>
          </div>
        )}
      </div>

      {showForm && !readOnly && <SessionForm key={showForm} kind={showForm} onCreate={create(showForm)} />}

      {(bank.started || folders.some(f => f.firmRules)) && <PracticeBankCard bank={bank} readOnly={readOnly} />}

      {folders.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Folders</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {folders.map(f => (
              <Link
                key={f.id}
                to={`/backtesting/folder/${f.id}`}
                className="relative bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors group"
              >
                {!readOnly && (
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); handleDeleteFolder(f); }}
                    className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 size={14} />
                  </button>
                )}
                <div className="flex items-center gap-2 mb-1">
                  <Folder size={16} className="text-slate-400" />
                  <span className={`w-2.5 h-2.5 rounded-full ${SESSION_DOT_COLORS[f.color] || 'bg-blue-500'}`} />
                  <h3 className="font-bold text-slate-50 truncate">{f.name}</h3>
                </div>
                {f.firmRules && <p className="text-xs text-sky-300 mb-1">Practice: {firmLabel(f.firmRules)}</p>}
                <p className="text-xs text-slate-400">{folderSummary(f)}</p>
                {!readOnly && (
                  <div className="mt-3">
                    <CoachShareToggle hidden={!!f.hiddenFromCoach} onChange={hidden => setFolderHidden(f, hidden)} />
                  </div>
                )}
              </Link>
            ))}
          </div>
        </div>
      )}

      {sessions.length === 0 && folders.length === 0 && !showForm ? (
        <EmptyState
          icon={<FlaskConical size={48} />}
          title="No backtest sessions"
          description={readOnly ? 'No backtest sessions yet.' : 'Create a backtesting session to start testing strategies with simulated trades.'}
        />
      ) : looseSessions.length > 0 && (
        <div className="space-y-2">
          {folders.length > 0 && <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Sessions</h2>}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {looseSessions.map(session => (
              <SessionCard
                key={session.id}
                session={session}
                stats={statsFor(session.id)}
                readOnly={readOnly}
                folders={folders}
                onMove={target => moveSession(session, target)}
                onDelete={() => handleDelete(session)}
                onUpdate={updates => updateSession(session.id, updates)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
