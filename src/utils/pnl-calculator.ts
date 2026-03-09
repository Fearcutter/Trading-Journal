import type { Instrument } from '../types/instrument';
import type { TradeResult } from '../types/trade';

export function calculatePointsPL(
  entry: number,
  exitPrice: number,
  direction: 'long' | 'short'
): number {
  const pl = direction === 'long' ? exitPrice - entry : entry - exitPrice;
  return Math.round(pl * 100) / 100;
}

export function calculateDollarPL(
  pointsPL: number,
  instrument: Instrument,
  contracts: number
): number {
  return Math.round(pointsPL * instrument.pointValue * contracts * 100) / 100;
}

export function computeResult(
  entry: number,
  exitPrice: number,
  direction: 'long' | 'short',
  stopLoss?: number,
  takeProfit?: number,
): TradeResult {
  if (stopLoss && takeProfit) {
    if (direction === 'long') {
      if (exitPrice >= takeProfit) return 'win';
      if (exitPrice <= stopLoss) return 'loss';
    } else {
      if (exitPrice <= takeProfit) return 'win';
      if (exitPrice >= stopLoss) return 'loss';
    }
    return 'breakeven';
  }
  const pl = calculatePointsPL(entry, exitPrice, direction);
  return pl > 0 ? 'win' : pl < 0 ? 'loss' : 'breakeven';
}

export function calculateRiskReward(
  entry: number,
  stopLoss: number,
  takeProfit: number,
  direction: 'long' | 'short'
): number {
  const risk = Math.abs(entry - stopLoss);
  if (risk === 0) return 0;
  const reward = direction === 'long'
    ? takeProfit - entry
    : entry - takeProfit;
  return Math.round((reward / risk) * 100) / 100;
}
