import { useMemo } from 'react';
import { useBacktest } from '../../context/BacktestContext';
import { useTrades } from '../../context/TradeContext';
import type { BacktestSession } from '../../types/backtest';
import type { Trade } from '../../types/trade';
import { trackEval, trackFunded, type EvalTrack, type FundedTrack } from '../../utils/prop-tracker';
import { usePLFormatter, getTradeValue } from '../../hooks/usePLFormatter';
import type { SessionStats } from './SessionCard';

export interface PracticeAttempt {
  session: BacktestSession;
  trades: Trade[];
  track: EvalTrack;
  /** The funded stage, once started. */
  funded?: { session: BacktestSession; trades: Trade[]; track: FundedTrack };
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

/** A practice folder's attempts (evaluation plus funded stage), run through its firm rules. */
export function buildPracticeAttempts(folder: BacktestSession, sessions: BacktestSession[], bySession: Map<string, Trade[]>): PracticeAttempt[] {
  const rules = folder.firmRules;
  if (!rules) return [];
  const inside = sessions.filter(s => s.folderId === folder.id);
  return inside
    .filter(s => s.stage === 'eval')
    .sort((a, b) => (a.attempt ?? 0) - (b.attempt ?? 0))
    .map(session => {
      const trades = bySession.get(session.id) ?? [];
      const fundedSession = inside.find(s => s.stage === 'funded' && s.evalSessionId === session.id);
      const fundedTrades = fundedSession ? bySession.get(fundedSession.id) ?? [] : [];
      return {
        session,
        trades,
        track: trackEval(trades, rules),
        funded: fundedSession
          ? { session: fundedSession, trades: fundedTrades, track: trackFunded(fundedTrades, rules, fundedSession.payouts) }
          : undefined,
      };
    });
}

export function usePracticeAttempts(folder: BacktestSession | undefined): PracticeAttempt[] {
  const { sessions } = useBacktest();
  const bySession = useTradesBySession();
  return useMemo(() => (folder ? buildPracticeAttempts(folder, sessions, bySession) : []), [folder, sessions, bySession]);
}

/** Every practice folder's attempts, for the Prop Firm EV page. */
export function useAllPractice(): { folder: BacktestSession; attempts: PracticeAttempt[] }[] {
  const { sessions, folders } = useBacktest();
  const bySession = useTradesBySession();
  return useMemo(
    () => folders.filter(f => f.firmRules).map(folder => ({ folder, attempts: buildPracticeAttempts(folder, sessions, bySession) })),
    [folders, sessions, bySession],
  );
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
