import type { Trade } from '../types/trade';
import type { PLField } from './pl-helpers';
import { getTradeValue } from './pl-helpers';

export interface DashboardStats {
  totalPL: number;
  winRate: number;
  totalTrades: number;
  profitFactor: number;
  avgWin: number;
  avgLoss: number;
  avgRR: number;
  currentStreak: { type: 'win' | 'loss'; count: number };
  bestTrade: Trade | null;
  worstTrade: Trade | null;
}

export function calculateDashboardStats(trades: Trade[], plField: PLField = 'dollarPL'): DashboardStats {
  if (trades.length === 0) {
    return {
      totalPL: 0,
      winRate: 0,
      totalTrades: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      avgRR: 0,
      currentStreak: { type: 'win', count: 0 },
      bestTrade: null,
      worstTrade: null,
    };
  }

  const wins = trades.filter(t => t.result === 'win');
  const losses = trades.filter(t => t.result === 'loss');
  const totalPL = trades.reduce((sum, t) => sum + getTradeValue(t, plField), 0);
  const totalWins = wins.reduce((sum, t) => sum + getTradeValue(t, plField), 0);
  const totalLosses = Math.abs(losses.reduce((sum, t) => sum + getTradeValue(t, plField), 0));

  // Current streak (trades sorted most recent first)
  const sorted = [...trades].sort((a, b) => {
    const d = b.date.localeCompare(a.date);
    return d !== 0 ? d : (b.time || '').localeCompare(a.time || '');
  });
  let streakType: 'win' | 'loss' = sorted[0]?.result === 'loss' ? 'loss' : 'win';
  let streakCount = 0;
  for (const t of sorted) {
    if (t.result === 'breakeven') continue;
    if (streakCount === 0) {
      streakType = t.result as 'win' | 'loss';
      streakCount = 1;
    } else if (t.result === streakType) {
      streakCount++;
    } else {
      break;
    }
  }

  const tradesWithRR = trades.filter(t => t.riskReward > 0);

  return {
    totalPL,
    winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    totalTrades: trades.length,
    profitFactor: totalLosses > 0 ? totalWins / totalLosses : totalWins > 0 ? Infinity : 0,
    avgWin: wins.length > 0 ? totalWins / wins.length : 0,
    avgLoss: losses.length > 0 ? totalLosses / losses.length : 0,
    avgRR: tradesWithRR.length > 0
      ? tradesWithRR.reduce((sum, t) => sum + t.riskReward, 0) / tradesWithRR.length
      : 0,
    currentStreak: { type: streakType, count: streakCount },
    bestTrade: sorted.reduce<Trade | null>((best, t) => !best || getTradeValue(t, plField) > getTradeValue(best, plField) ? t : best, null),
    worstTrade: sorted.reduce<Trade | null>((worst, t) => !worst || getTradeValue(t, plField) < getTradeValue(worst, plField) ? t : worst, null),
  };
}

export function calculatePLBySetup(trades: Trade[], plField: PLField = 'dollarPL'): Record<string, number> {
  const result: Record<string, number> = {};
  for (const t of trades) {
    const key = t.setupType || 'Unspecified';
    result[key] = (result[key] || 0) + getTradeValue(t, plField);
  }
  return result;
}

export function calculatePLByEmotion(trades: Trade[], plField: PLField = 'dollarPL'): Record<string, number> {
  const result: Record<string, number> = {};
  for (const t of trades) {
    const key = t.emotionBefore || 'Unspecified';
    result[key] = (result[key] || 0) + getTradeValue(t, plField);
  }
  return result;
}

export function calculateWinRateByConfluenceCount(trades: Trade[]): { count: number; winRate: number; total: number }[] {
  const groups: Record<number, { wins: number; total: number }> = {};
  for (const t of trades) {
    const count = t.confluences.length;
    if (!groups[count]) groups[count] = { wins: 0, total: 0 };
    groups[count].total++;
    if (t.result === 'win') groups[count].wins++;
  }
  return Object.entries(groups)
    .map(([count, { wins, total }]) => ({
      count: Number(count),
      winRate: (wins / total) * 100,
      total,
    }))
    .sort((a, b) => a.count - b.count);
}

export function calculatePLByTimeOfDay(trades: Trade[], plField: PLField = 'dollarPL'): { hour: number; pl: number; count: number }[] {
  const groups: Record<number, { pl: number; count: number }> = {};
  for (const t of trades) {
    if (!t.time) continue;
    const hour = parseInt(t.time.split(':')[0]);
    if (!groups[hour]) groups[hour] = { pl: 0, count: 0 };
    groups[hour].pl += getTradeValue(t, plField);
    groups[hour].count++;
  }
  return Object.entries(groups)
    .map(([hour, { pl, count }]) => ({ hour: Number(hour), pl, count }))
    .sort((a, b) => a.hour - b.hour);
}

export function calculateCumulativePL(trades: Trade[], plField: PLField = 'dollarPL'): { date: string; pl: number }[] {
  const sorted = [...trades].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : (a.time || '').localeCompare(b.time || '');
  });
  let cumulative = 0;
  return sorted.map(t => {
    cumulative += getTradeValue(t, plField);
    return { date: t.date, pl: cumulative };
  });
}

export function calculateDailyPL(trades: Trade[], plField: PLField = 'dollarPL'): { date: string; pl: number }[] {
  const daily: Record<string, number> = {};
  for (const t of trades) {
    daily[t.date] = (daily[t.date] || 0) + getTradeValue(t, plField);
  }
  return Object.entries(daily)
    .map(([date, pl]) => ({ date, pl }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

// Thresholds match Analytics tab's calculateRunnerAnalysis: [1.5, 2, 2.5, 3, 4]
export type RMultipleBucket = 'loss' | 'r1' | 'r1_5' | 'r2' | 'r2_5' | 'r3' | 'r4plus';

export const R_BUCKET_LABELS: Record<RMultipleBucket, string> = {
  loss: 'Loss',
  r1: '1R',
  r1_5: '1.5R',
  r2: '2R',
  r2_5: '2.5R',
  r3: '3R',
  r4plus: '4R+',
};

function classifyRBucket(trade: Trade): RMultipleBucket {
  const stopDistance = Math.abs(trade.entry - trade.stopLoss);
  if (!stopDistance || trade.mfe == null) {
    return trade.result === 'loss' ? 'loss' : 'r1';
  }
  const mfeR = trade.mfe / stopDistance;
  if (mfeR >= 4) return 'r4plus';
  if (mfeR >= 3) return 'r3';
  if (mfeR >= 2.5) return 'r2_5';
  if (mfeR >= 2) return 'r2';
  if (mfeR >= 1.5) return 'r1_5';
  if (mfeR >= 1) return 'r1';
  return 'loss';
}

export function calculateCumulativePLByRMultiple(
  trades: Trade[],
  plField: PLField = 'dollarPL',
): { index: number; date: string; loss: number; r1: number; r1_5: number; r2: number; r2_5: number; r3: number; r4plus: number }[] {
  const sorted = [...trades].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : (a.time || '').localeCompare(b.time || '');
  });
  const cum = { loss: 0, r1: 0, r1_5: 0, r2: 0, r2_5: 0, r3: 0, r4plus: 0 };
  return sorted.map((t, i) => {
    const bucket = classifyRBucket(t);
    cum[bucket] += getTradeValue(t, plField);
    return { index: i + 1, date: t.date, ...cum };
  });
}

// Cumulative thresholds matching the Analytics tab's MFE Reach Analysis (thresholds [1, 1.5, 2, 2.5, 3])
// "≥1R" = all trades where MFE >= 1R (same as Analytics W column at 1R)
// "Loss" = trades where MFE < 1R (same as Analytics L column)
export function calculatePLByRMultiple(trades: Trade[], plField: PLField = 'dollarPL'): { bucket: string; label: string; pl: number; count: number }[] {
  const thresholds = [1, 1.5, 2, 2.5, 3] as const;
  const withMFE = trades.filter(t => t.mfe != null && Math.abs(t.entry - t.stopLoss) > 0);
  const noMFE = trades.filter(t => t.mfe == null || Math.abs(t.entry - t.stopLoss) === 0);
  const lossTrades = withMFE.filter(t => t.mfe! < Math.abs(t.entry - t.stopLoss));
  const allLoss = [...lossTrades, ...noMFE];

  return [
    {
      bucket: 'loss',
      label: 'Loss',
      pl: allLoss.reduce((s, t) => s + getTradeValue(t, plField), 0),
      count: allLoss.length,
    },
    ...thresholds.map(r => {
      const key = `r${String(r).replace('.', '_')}`;
      const reached = withMFE.filter(t => t.mfe! >= r * Math.abs(t.entry - t.stopLoss));
      return {
        bucket: key,
        label: `≥${r}R`,
        pl: reached.reduce((s, t) => s + getTradeValue(t, plField), 0),
        count: reached.length,
      };
    }),
  ];
}

export function calculateRRDistribution(trades: Trade[]): { bin: string; count: number }[] {
  const bins: Record<string, number> = {};
  for (const t of trades) {
    if (!t.riskReward) continue;
    const rr = t.riskReward;
    let bin: string;
    if (rr < 0.5) bin = '<0.5';
    else if (rr < 1) bin = '0.5-1';
    else if (rr < 1.5) bin = '1-1.5';
    else if (rr < 2) bin = '1.5-2';
    else if (rr < 3) bin = '2-3';
    else bin = '3+';
    bins[bin] = (bins[bin] || 0) + 1;
  }
  const order = ['<0.5', '0.5-1', '1-1.5', '1.5-2', '2-3', '3+'];
  return order.filter(b => bins[b]).map(bin => ({ bin, count: bins[bin] }));
}
