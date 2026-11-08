import { useMemo, useState } from 'react';
import { useTrades } from '../../context/TradeContext';
import { useLiveSession } from '../../context/LiveSessionContext';
import { useBacktest } from '../../context/BacktestContext';
import { tradesToDays } from '../../utils/prop-ev';
import { getRealizedR } from '../../utils/r-multiple';

const STANDALONE = '__standalone__';
const STORE_KEY = 'propEv.inputs';

export interface PropEvInputs {
  sessionIds: string[] | null; risk: number | null; cost: number; accounts: number; mode: 'best' | 'yours';
  /** Firm to show ('' = all firms) and the plans picked to compare (null = all of them). */
  firm: string; planIds: string[] | null;
}
const DEFAULT_INPUTS: PropEvInputs = { sessionIds: null, risk: null, cost: 0, accounts: 2, mode: 'best', firm: '', planIds: null };

function loadInputs(): PropEvInputs {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULT_INPUTS, ...JSON.parse(raw) } : DEFAULT_INPUTS;
  } catch {
    return DEFAULT_INPUTS;
  }
}

/**
 * The Prop Firm EV page's inputs (saved in this browser) and the trades they pick:
 * shared so practice folders can compare against the same expectations.
 */
export function usePropEvInputs() {
  const { trades } = useTrades();
  const { sessions: liveSessions } = useLiveSession();
  const { sessions: btSessions, folders } = useBacktest();
  const [inputs, setInputsState] = useState<PropEvInputs>(loadInputs);

  const setInputs = (patch: Partial<PropEvInputs>) => {
    setInputsState(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };

  const hasStandalone = trades.some(t => !t.sessionId);
  const options = useMemo(() => [
    ...(hasStandalone ? [{ value: STANDALONE, label: 'Live trades not in a session', sublabel: 'Live' }] : []),
    ...liveSessions.map(s => ({ value: s.id, label: s.name, sublabel: 'Live' })),
    ...btSessions.map(s => {
      const folder = s.folderId ? folders.find(f => f.id === s.folderId) : undefined;
      return { value: s.id, label: s.name, sublabel: folder ? `Backtest · ${folder.name}` : 'Backtest' };
    }),
  ], [hasStandalone, liveSessions, btSessions, folders]);

  // Default: every live session (and live trades outside sessions). Deleted sessions drop out.
  const validIds = new Set(options.map(o => o.value));
  const selected = (inputs.sessionIds ?? [STANDALONE, ...liveSessions.map(s => s.id)]).filter(id => validIds.has(id));
  const selectedKey = selected.join(',');
  const btIds = useMemo(() => new Set(btSessions.map(s => s.id)), [btSessions]);
  const hasBacktest = selected.some(id => btIds.has(id));

  const picked = useMemo(() => {
    const ids = new Set(selectedKey.split(','));
    return trades.filter(t => (t.sessionId ? ids.has(t.sessionId) : ids.has(STANDALONE)));
  }, [trades, selectedKey]);

  const { days, used, skipped } = useMemo(() => tradesToDays(picked), [picked]);

  // What you usually risk: median $ per 1R on the picked trades
  const suggestedRisk = useMemo(() => {
    const perR = picked
      .map(t => { const r = getRealizedR(t); return r && t.dollarPL ? Math.abs(t.dollarPL / r) : null; })
      .filter((x): x is number => x !== null && Number.isFinite(x) && x > 0)
      .sort((a, b) => a - b);
    return perR.length ? Math.round(perR[Math.floor(perR.length / 2)] / 10) * 10 || 10 : 200;
  }, [picked]);
  const yourRisk = inputs.risk ?? suggestedRisk;

  return { inputs, setInputs, options, selected, hasBacktest, picked, days, used, skipped, suggestedRisk, yourRisk };
}
