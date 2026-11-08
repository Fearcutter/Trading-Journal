import { useMemo } from 'react';
import { useBacktest } from '../../context/BacktestContext';
import { useTrades } from '../../context/TradeContext';
import type { BacktestSession } from '../../types/backtest';
import type { Trade } from '../../types/trade';
import { trackEval, type EvalTrack } from '../../utils/prop-tracker';
import { usePLFormatter, getTradeValue } from '../../hooks/usePLFormatter';
import type { SessionStats } from './SessionCard';

export interface PracticeAttempt {
  session: BacktestSession;
  trades: Trade[];
  track: EvalTrack;
}

/** Trades for each session id. */
export function useTradesBySession(): Map<string, Trade[]> {
  const { trades } = useTrades();
  return useMemo(() => {
    const map = new Map<string, Trade[]>();
    for (const t of trades) {
      if (!t.sessionId) continue;
      const list = map.get(t.sessionId) ?? [];
      list.push(t);
      map.set(t.sessionId, list);
    }
    return map;
  }, [trades]);
}

/** The folder's evaluation attempts, each run through the folder's firm rules, by attempt number. */
export function usePracticeAttempts(folder: BacktestSession | undefined): PracticeAttempt[] {
  const { sessions } = useBacktest();
  const bySession = useTradesBySession();
  return useMemo(() => {
    const rules = folder?.firmRules;
    if (!folder || !rules) return [];
    return sessions
      .filter(s => s.folderId === folder.id && s.stage === 'eval')
      .sort((a, b) => (a.attempt ?? 0) - (b.attempt ?? 0))
      .map(session => {
        const trades = bySession.get(session.id) ?? [];
        return { session, trades, track: trackEval(trades, rules) };
      });
  }, [folder, sessions, bySession]);
}

/** Trade count, wins and P&L per session, in the user's chosen P&L unit. */
export function useSessionStats(): (sessionId: string) => SessionStats {
  const bySession = useTradesBySession();
  const { plField } = usePLFormatter();
  const stats = useMemo(() => {
    const map = new Map<string, SessionStats>();
    for (const [id, list] of bySession) {
      map.set(id, {
        count: list.length,
        wins: list.filter(t => t.result === 'win').length,
        totalPL: list.reduce((sum, t) => sum + getTradeValue(t, plField), 0),
      });
    }
    return map;
  }, [bySession, plField]);
  return (id: string) => stats.get(id) ?? { count: 0, wins: 0, totalPL: 0 };
}
