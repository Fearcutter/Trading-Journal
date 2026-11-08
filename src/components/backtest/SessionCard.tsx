import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import CoachShareToggle from '../ui/CoachShareToggle';
import type { BacktestSession } from '../../types/backtest';
import { formatPercent } from '../../utils/formatters';
import { usePLFormatter } from '../../hooks/usePLFormatter';
import { SESSION_DOT_COLORS } from './colors';
import FolderMoveSelect from './FolderMoveSelect';

export interface SessionStats { count: number; wins: number; totalPL: number }

interface Props {
  session: BacktestSession;
  stats: SessionStats;
  readOnly: boolean;
  /** Folders it can be moved to; omit to hide the mover. */
  folders?: BacktestSession[];
  /** Move to a folder id, out of folders (null), or into a new folder ('new'). */
  onMove?: (target: string | null | 'new') => void;
  onDelete: () => void;
  onUpdate: (updates: Partial<BacktestSession>) => void;
  /** Extra line under the title, e.g. a practice status. */
  badge?: ReactNode;
}

const stop = (e: React.SyntheticEvent) => { e.preventDefault(); e.stopPropagation(); };

export default function SessionCard({ session, stats, readOnly, folders, onMove, onDelete, onUpdate, badge }: Props) {
  const pl = usePLFormatter();
  const winRate = stats.count > 0 ? (stats.wins / stats.count) * 100 : 0;

  return (
    <Link
      to={`/backtesting/${session.id}`}
      className="relative bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 transition-colors group"
    >
      {!readOnly && (
        <button
          onClick={e => { stop(e); onDelete(); }}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-slate-700 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          <Trash2 size={14} />
        </button>
      )}
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-2.5 h-2.5 rounded-full ${SESSION_DOT_COLORS[session.color] || 'bg-blue-500'}`} />
        <h3 className="font-bold text-slate-50 truncate">{session.name}</h3>
      </div>
      {badge && <div className="mb-2">{badge}</div>}
      {session.description && <p className="text-sm text-slate-400 truncate mb-3">{session.description}</p>}
      <div className="flex items-center gap-4 text-xs text-slate-400">
        <span>{stats.count} trade{stats.count !== 1 ? 's' : ''}</span>
        <span>{formatPercent(winRate)} win</span>
        <span className={stats.totalPL > 0 ? 'text-emerald-400' : stats.totalPL < 0 ? 'text-rose-400' : ''}>
          {pl.formatPLValue(stats.totalPL)}
        </span>
      </div>
      {!readOnly && (
        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <CoachShareToggle hidden={!!session.hiddenFromCoach} onChange={hidden => onUpdate({ hiddenFromCoach: hidden })} />
          {folders && onMove && <FolderMoveSelect session={session} folders={folders} onMove={onMove} />}
        </div>
      )}
    </Link>
  );
}
