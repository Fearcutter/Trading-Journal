import type { Trade } from '../types/trade';

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

export function calculateDashboardStats(trades: Trade[]): DashboardStats {
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
  const totalPL = trades.reduce((sum, t) => sum + t.dollarPL, 0);
  const totalWins = wins.reduce((sum, t) => sum + t.dollarPL, 0);
  const totalLosses = Math.abs(losses.reduce((sum, t) => sum + t.dollarPL, 0));

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
    bestTrade: sorted.reduce<Trade | null>((best, t) => !best || t.dollarPL > best.dollarPL ? t : best, null),
    worstTrade: sorted.reduce<Trade | null>((worst, t) => !worst || t.dollarPL < worst.dollarPL ? t : worst, null),
  };
}

export function calculatePLBySetup(trades: Trade[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const t of trades) {
    const key = t.setupType || 'Unspecified';
    result[key] = (result[key] || 0) + t.dollarPL;
  }
  return result;
}

export function calculatePLByEmotion(trades: Trade[]): Record<string, number> {
  const result: Record<string, number> = {};
  for (const t of trades) {
    const key = t.emotionBefore || 'Unspecified';
    result[key] = (result[key] || 0) + t.dollarPL;
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

export function calculatePLByTimeOfDay(trades: Trade[]): { hour: number; pl: number; count: number }[] {
  const groups: Record<number, { pl: number; count: number }> = {};
  for (const t of trades) {
    if (!t.time) continue;
    const hour = parseInt(t.time.split(':')[0]);
    if (!groups[hour]) groups[hour] = { pl: 0, count: 0 };
    groups[hour].pl += t.dollarPL;
    groups[hour].count++;
  }
  return Object.entries(groups)
    .map(([hour, { pl, count }]) => ({ hour: Number(hour), pl, count }))
    .sort((a, b) => a.hour - b.hour);
}

export function calculateCumulativePL(trades: Trade[]): { date: string; pl: number }[] {
  const sorted = [...trades].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : (a.time || '').localeCompare(b.time || '');
  });
  let cumulative = 0;
  return sorted.map(t => {
    cumulative += t.dollarPL;
    return { date: t.date, pl: cumulative };
  });
}

export function calculateDailyPL(trades: Trade[]): { date: string; pl: number }[] {
  const daily: Record<string, number> = {};
  for (const t of trades) {
    daily[t.date] = (daily[t.date] || 0) + t.dollarPL;
  }
  return Object.entries(daily)
    .map(([date, pl]) => ({ date, pl }))
    .sort((a, b) => a.date.localeCompare(b.date));
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
