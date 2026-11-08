import type { BacktestSession } from '../../types/backtest';

interface Props {
  session: BacktestSession;
  folders: BacktestSession[];
  /** A folder id, out of folders (null), or a new folder ('new'). */
  onMove: (target: string | null | 'new') => void;
}

/** "Move to folder" dropdown, safe to use inside a card link. */
export default function FolderMoveSelect({ session, folders, onMove }: Props) {
  return (
    <select
      value={session.folderId ?? ''}
      onClick={e => { e.preventDefault(); e.stopPropagation(); }}
      onChange={e => onMove(e.target.value === '' ? null : e.target.value)}
      className="px-2 py-1 bg-slate-900 border border-slate-600 rounded-md text-xs text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
      title="Move to folder"
    >
      <option value="">{session.folderId ? 'Move out of folder' : 'No folder'}</option>
      {folders.map(f => (
        <option key={f.id} value={f.id}>{f.id === session.folderId ? f.name : `Move to: ${f.name}`}{f.firmRules ? ' (practice)' : ''}</option>
      ))}
      <option value="new">+ New folder…</option>
    </select>
  );
}
