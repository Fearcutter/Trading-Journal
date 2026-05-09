import { useMemo } from 'react';
import type { Trade, TradeDirection, TradeResult } from '../types/trade';

export type RMultipleFilter = '' | 'reached2R' | 'reached3R' | 'be' | 'loss';

export interface TradeFilters {
  dateFrom: string;
  dateTo: string;
  instrument: string;
  direction: TradeDirection | '';
  result: TradeResult | '';
  setupType: string;
  rMultiple: RMultipleFilter;
  search: string;
  overlap: '' | 'yes' | 'no';
  sessionId?: string;
}

export const defaultFilters: TradeFilters = {
  dateFrom: '',
  dateTo: '',
  instrument: '',
  direction: '',
  result: '',
  setupType: '',
  rMultiple: '',
  search: '',
  overlap: '',
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
      if (filters.overlap === 'yes' && trade.overlap !== true) return false;
      if (filters.overlap === 'no' && trade.overlap === true) return false;
      if (filters.setupType && trade.setupType !== filters.setupType) return false;
      if (filters.rMultiple) {
        const stopDistance = Math.abs(trade.entry - trade.stopLoss);
        if (!stopDistance || trade.mfe == null) {
          if (filters.rMultiple !== 'loss') return false;
        } else {
          const mfeR = trade.mfe / stopDistance;
          if (filters.rMultiple === 'reached3R' && mfeR < 3) return false;
          if (filters.rMultiple === 'reached2R' && (mfeR < 2 || mfeR >= 3)) return false;
          if (filters.rMultiple === 'be' && (mfeR < 1 || mfeR >= 2)) return false;
          if (filters.rMultiple === 'loss' && mfeR >= 1) return false;
        }
      }
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
