import { useBacktest } from '../../context/BacktestContext';
import type { BacktestSession } from '../../types/backtest';

/**
 * Handles the "Move to folder" dropdown: an existing folder, out of folders, or a new folder
 * (asks for its name). Moving into a practice folder asks first, since it becomes an attempt.
 */
export function useMoveSession() {
  const { folders, addSession, moveToFolder } = useBacktest();
  return (session: BacktestSession, target: string | null | 'new') => {
    if (target === 'new') {
      const name = window.prompt('Name for the new folder:', '')?.trim();
      if (!name) return;
      const folder = addSession(name, '', undefined, session.color, { kind: 'folder', hiddenFromCoach: session.hiddenFromCoach });
      moveToFolder(session.id, folder.id);
      return;
    }
    const folder = target ? folders.find(f => f.id === target) : undefined;
    if (folder?.firmRules && !window.confirm(
      `"${folder.name}" is a practice folder, so "${session.name}" will become its next attempt and be checked against the firm's rules. Move it?`,
    )) return;
    moveToFolder(session.id, target);
  };
}
