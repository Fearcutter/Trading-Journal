import { createContext, useContext, ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { Trade, TradeFormData } from '../types/trade';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface TradeContextValue {
  trades: Trade[];
  addTrade: (data: TradeFormData) => Trade;
  updateTrade: (id: string, updates: Partial<Trade>) => void;
  deleteTrade: (id: string) => void;
  deleteTrades: (ids: string[]) => void;
  importTrades: (trades: Trade[]) => void;
  clearAllTrades: () => void;
}

const TradeContext = createContext<TradeContextValue | null>(null);

export function TradeProvider({ children }: { children: ReactNode }) {
  const [trades, setTrades] = useLocalStorage<Trade[]>('trading-journal-trades', []);

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
      pointsPL: 0,
      dollarPL: 0,
      riskReward: 0,
      setupType: data.setupType,
      confluences: data.confluences,
      emotionBefore: data.emotionBefore,
      emotionAfter: data.emotionAfter,
      rating: data.rating,
      preTradeNotes: data.preTradeNotes,
      postTradeNotes: data.postTradeNotes,
      setupScreenshot: data.setupScreenshot,
      resultScreenshot: data.resultScreenshot,
      tags: data.tags,
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
    <TradeContext.Provider value={{ trades, addTrade, updateTrade, deleteTrade, deleteTrades, importTrades, clearAllTrades }}>
      {children}
    </TradeContext.Provider>
  );
}

export function useTrades() {
  const context = useContext(TradeContext);
  if (!context) throw new Error('useTrades must be used within TradeProvider');
  return context;
}
