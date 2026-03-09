import type { Trade } from '../types/trade';

export type PLField = 'dollarPL' | 'pointsPL' | 'r';

export function getTradeRMultiple(trade: Trade): number {
  const risk = Math.abs(trade.entry - trade.stopLoss);
  if (risk === 0) return 0;
  return trade.pointsPL / risk;
}

export function getTradeValue(trade: Trade, plField: PLField): number {
  if (plField === 'r') return getTradeRMultiple(trade);
  return trade[plField];
}
