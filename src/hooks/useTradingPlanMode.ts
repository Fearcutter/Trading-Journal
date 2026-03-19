import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

export interface TradingPlanState {
  enabled: boolean;
  tradesPerDay: number;
}

const DEFAULT_STATE: TradingPlanState = { enabled: false, tradesPerDay: 2 };

export function useTradingPlanMode(sessionId: string) {
  const [planState, setPlanState] = useLocalStorage<TradingPlanState>(
    `trading-plan-${sessionId}`,
    DEFAULT_STATE,
  );

  const setEnabled = useCallback(
    (enabled: boolean) => setPlanState(prev => ({ ...prev, enabled })),
    [setPlanState],
  );

  const setTradesPerDay = useCallback(
    (tradesPerDay: number) => setPlanState(prev => ({ ...prev, tradesPerDay })),
    [setPlanState],
  );

  return { planState, setEnabled, setTradesPerDay };
}
