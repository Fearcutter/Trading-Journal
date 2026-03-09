import { useMemo } from 'react';
import type { Trade, TradeDirection, TradeResult } from '../types/trade';

export interface TradeFilters {
  dateFrom: string;
  dateTo: string;
  instrument: string;
  direction: TradeDirection | '';
  result: TradeResult | '';
  setupType: string;
  search: string;
  sessionId?: string;
}

export const defaultFilters: TradeFilters = {
  dateFrom: '',
  dateTo: '',
  instrument: '',
  direction: '',
  result: '',
  setupType: '',
  search: '',
};

export function useFilteredTrades(trades: Trade[], filters: TradeFilters): Trade[] {
  return useMemo(() => {
    return trades.filter(trade => {
      if (filters.sessionId) {
        if (filters.sessionId === 'live') {
          if (trade.sessionId) return false;
        } else if (filters.sessionId === 'all-backtest') {
          if (!trade.sessionId) return false;
        } else {
          if (trade.sessionId !== filters.sessionId) return false;
        }
      }
      if (filters.dateFrom && trade.date < filters.dateFrom) return false;
      if (filters.dateTo && trade.date > filters.dateTo) return false;
      if (filters.instrument && trade.instrument !== filters.instrument) return false;
      if (filters.direction && trade.direction !== filters.direction) return false;
      if (filters.result && trade.result !== filters.result) return false;
      if (filters.setupType && trade.setupType !== filters.setupType) return false;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        const searchable = [
          trade.instrument,
          trade.setupType,
          trade.direction,
          trade.preTradeNotes,
          trade.postTradeNotes,
          ...trade.tags,
          ...trade.confluences,
          ...(trade.confluencesAgainst ?? []),
          ...Object.values(trade.customFields ?? {}).flat(),
        ].join(' ').toLowerCase();
        if (!searchable.includes(q)) return false;
      }
      return true;
    }).sort((a, b) => {
      // Most recent first
      const dateCompare = b.date.localeCompare(a.date);
      if (dateCompare !== 0) return dateCompare;
      return (b.time || '').localeCompare(a.time || '');
    });
  }, [trades, filters]);
}
