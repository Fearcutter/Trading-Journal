import { createContext, useContext, type ReactNode, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Trade, TradeFormData } from '../types/trade';
import { useSupabaseList } from '../hooks/useSupabaseList';

/** Map legacy `returnedTo1R` → `returnedToBE` for existing Supabase records */
function normalizeTrade(trade: Trade): Trade {
  const raw = trade as unknown as Record<string, unknown>;
  if ('returnedTo1R' in raw && !('returnedToBE' in raw)) {
    const { returnedTo1R, ...rest } = raw;
    return { ...rest, returnedToBE: returnedTo1R } as Trade;
  }
  return trade;
}

interface TradeContextValue {
  trades: Trade[];
  loading: boolean;
  addTrade: (data: TradeFormData) => Trade;
  updateTrade: (id: string, updates: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  deleteTrades: (ids: string[]) => void;
  importTrades: (trades: Trade[]) => void;
  clearAllTrades: () => void;
}

const TradeContext = createContext<TradeContextValue | null>(null);

export function TradeProvider({ children }: { children: ReactNode }) {
  const [rawTrades, setTrades, loading] = useSupabaseList<Trade>('trades', { screenshotFields: ['setupScreenshot', 'resultScreenshot'] });
  const trades = useMemo(() => rawTrades.map(normalizeTrade), [rawTrades]);

  const addTrade = useCallback((data: TradeFormData): Trade => {
    const now = new Date().toISOString();
    const trade: Trade = {
      id: uuidv4(),
      date: data.date,
      time: data.time,
      instrument: data.instrument,
      direction: data.direction,
      entry: Number(data.entry),
      stopLoss: Number(data.stopLoss),
      takeProfit: Number(data.takeProfit),
      exitPrice: Number(data.exitPrice),
      contracts: data.contracts,
      result: data.result,
      pointsPL: data.pointsPL ?? 0,
      dollarPL: data.dollarPL ?? 0,
      riskReward: data.riskReward ?? 0,
      setupType: data.setupType,
      confluences: data.confluences,
      confluencesAgainst: data.confluencesAgainst || [],
      emotionBefore: data.emotionBefore,
      emotionAfter: data.emotionAfter,
      grade: data.grade,
      preTradeNotes: data.preTradeNotes,
      postTradeNotes: data.postTradeNotes,
      setupScreenshot: data.setupScreenshot,
      resultScreenshot: data.resultScreenshot,
      tags: data.tags,
      customFields: data.customFields || {},
      mae: data.mae ? Number(data.mae) : undefined,
      mfe: data.mfe ? Number(data.mfe) : undefined,
      drawback1R: data.drawback1R ? Number(data.drawback1R) : undefined,
      drawback2R: data.drawback2R ? Number(data.drawback2R) : undefined,
      returnedToBE: data.returnedToBE ?? undefined,
      accountIds: data.accountIds?.length ? data.accountIds : undefined,
      sessionId: data.sessionId || undefined,
      createdAt: now,
      updatedAt: now,
    };
    setTrades(prev => [trade, ...prev]);
    return trade;
  }, [setTrades]);

  const updateTrade = useCallback((id: string, updates: Partial<Trade>) => {
    setTrades(prev =>
      prev.map(t =>
        t.id === id ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
      )
    );
  }, [setTrades]);

  const deleteTrade = useCallback((id: string) => {
    setTrades(prev => prev.filter(t => t.id !== id));
  }, [setTrades]);

  const deleteTrades = useCallback((ids: string[]) => {
    const idSet = new Set(ids);
    setTrades(prev => prev.filter(t => !idSet.has(t.id)));
  }, [setTrades]);

  const importTrades = useCallback((newTrades: Trade[]) => {
    setTrades(prev => {
      const existingIds = new Set(prev.map(t => t.id));
      const unique = newTrades.filter(t => !existingIds.has(t.id));
      return [...prev, ...unique];
    });
  }, [setTrades]);

  const clearAllTrades = useCallback(() => {
    setTrades([]);
  }, [setTrades]);

  return (
    <TradeContext.Provider value={{ trades, loading, addTrade, updateTrade, deleteTrade, deleteTrades, importTrades, clearAllTrades }}>
      {children}
    </TradeContext.Provider>
  );
}

export function useTrades() {
  const context = useContext(TradeContext);
  if (!context) throw new Error('useTrades must be used within TradeProvider');
  return context;
}
