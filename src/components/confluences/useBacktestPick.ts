import { useMemo } from 'react';
import { useBacktest } from '../../context/BacktestContext';

/** The backtest session ids a pick covers (a folder covers every session in it). Empty pick = null (all). */
export function useBacktestPick(ids: string[]): Set<string> | null {
  const { sessions } = useBacktest();
  return useMemo(() => {
    if (ids.length === 0) return null;
    const picked = new Set(ids);
    return new Set(sessions.filter(s => picked.has(s.id) || (s.folderId && picked.has(s.folderId))).map(s => s.id));
  }, [ids, sessions]);
}
