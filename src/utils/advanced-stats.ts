import type { Trade } from '../types/trade';
import type { PLField } from './pl-helpers';
import { getTradeValue } from './pl-helpers';

export function calculateDrawdownSeries(trades: Trade[], plField: PLField = 'dollarPL') {
  const sorted = [...trades].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : (a.time || '').localeCompare(b.time || '');
  });

  let cumPL = 0;
  let peak = 0;
  let maxDrawdown = 0;
  let maxDrawdownStart = 0;
  let maxDrawdownEnd = 0;
  let drawdownStart = 0;

  const series = sorted.map((t, i) => {
    cumPL += getTradeValue(t, plField);
    if (cumPL > peak) {
      peak = cumPL;
      drawdownStart = i;
    }
    const drawdown = peak - cumPL;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
      maxDrawdownStart = drawdownStart;
      maxDrawdownEnd = i;
    }
    return { date: t.date, drawdown: -drawdown, peak, cumPL };
  });

  const maxDrawdownDuration = maxDrawdownEnd > maxDrawdownStart && sorted.length > 0
    ? Math.round((new Date(sorted[maxDrawdownEnd]?.date).getTime() - new Date(sorted[maxDrawdownStart]?.date).getTime()) / 86400000)
    : 0;

  return { series, maxDrawdown, maxDrawdownDuration, recoveryTime: maxDrawdownDuration };
}

export function calculateRollingWinRate(trades: Trade[], windows: number[] = [10, 20, 50]) {
  const sorted = [...trades].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : (a.time || '').localeCompare(b.time || '');
  });

  return sorted.map((t, i) => {
    const entry: Record<string, number | string> = {
      tradeIndex: i,
      date: t.date,
    };
    for (const w of windows) {
      if (i + 1 >= w) {
        const slice = sorted.slice(i + 1 - w, i + 1);
        const wins = slice.filter(s => s.result === 'win').length;
        entry[`winRate${w}`] = (wins / w) * 100;
      }
    }
    return entry;
  });
}

export function calculatePerformanceByDayOfWeek(trades: Trade[], plField: PLField = 'dollarPL') {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const groups: Record<number, { trades: number; wins: number; totalPL: number }> = {};

  for (const t of trades) {
    const dayNum = new Date(t.date + 'T12:00:00').getDay();
    if (!groups[dayNum]) groups[dayNum] = { trades: 0, wins: 0, totalPL: 0 };
    groups[dayNum].trades++;
    if (t.result === 'win') groups[dayNum].wins++;
    groups[dayNum].totalPL += getTradeValue(t, plField);
  }

  return Object.entries(groups)
    .map(([dayNum, g]) => ({
      day: days[Number(dayNum)],
      dayNum: Number(dayNum),
      trades: g.trades,
      wins: g.wins,
      winRate: g.trades > 0 ? (g.wins / g.trades) * 100 : 0,
      totalPL: g.totalPL,
      avgPL: g.trades > 0 ? g.totalPL / g.trades : 0,
    }))
    .sort((a, b) => a.dayNum - b.dayNum);
}

export function calculatePerformanceByInstrument(trades: Trade[], plField: PLField = 'dollarPL') {
  const groups: Record<string, { trades: number; wins: number; totalPL: number; grossWins: number; grossLosses: number }> = {};

  for (const t of trades) {
    const key = t.instrument || 'Unknown';
    if (!groups[key]) groups[key] = { trades: 0, wins: 0, totalPL: 0, grossWins: 0, grossLosses: 0 };
    groups[key].trades++;
    if (t.result === 'win') groups[key].wins++;
    groups[key].totalPL += getTradeValue(t, plField);
    if (getTradeValue(t, plField) > 0) groups[key].grossWins += getTradeValue(t, plField);
    else groups[key].grossLosses += Math.abs(getTradeValue(t, plField));
  }

  return Object.entries(groups)
    .map(([instrument, g]) => ({
      instrument,
      trades: g.trades,
      wins: g.wins,
      winRate: g.trades > 0 ? (g.wins / g.trades) * 100 : 0,
      totalPL: g.totalPL,
      avgPL: g.trades > 0 ? g.totalPL / g.trades : 0,
      profitFactor: g.grossLosses > 0 ? g.grossWins / g.grossLosses : g.grossWins > 0 ? Infinity : 0,
    }))
    .sort((a, b) => b.totalPL - a.totalPL);
}

export function calculateStreakAnalysis(trades: Trade[], plField: PLField = 'dollarPL') {
  const sorted = [...trades].sort((a, b) => {
    const d = a.date.localeCompare(b.date);
    return d !== 0 ? d : (a.time || '').localeCompare(b.time || '');
  });

  const streaks: { type: 'win' | 'loss'; length: number; pl: number }[] = [];
  let currentType: 'win' | 'loss' | null = null;
  let currentLength = 0;
  let currentPL = 0;

  for (const t of sorted) {
    if (t.result === 'breakeven') continue;
    const type = t.result as 'win' | 'loss';
    if (type === currentType) {
      currentLength++;
      currentPL += getTradeValue(t, plField);
    } else {
      if (currentType) streaks.push({ type: currentType, length: currentLength, pl: currentPL });
      currentType = type;
      currentLength = 1;
      currentPL = getTradeValue(t, plField);
    }
  }
  if (currentType) streaks.push({ type: currentType, length: currentLength, pl: currentPL });

  const winStreaks = streaks.filter(s => s.type === 'win');
  const lossStreaks = streaks.filter(s => s.type === 'loss');

  return {
    longestWin: winStreaks.reduce((max, s) => Math.max(max, s.length), 0),
    longestLoss: lossStreaks.reduce((max, s) => Math.max(max, s.length), 0),
    avgWinStreak: winStreaks.length > 0 ? winStreaks.reduce((sum, s) => sum + s.length, 0) / winStreaks.length : 0,
    avgLossStreak: lossStreaks.length > 0 ? lossStreaks.reduce((sum, s) => sum + s.length, 0) / lossStreaks.length : 0,
    streaks,
  };
}

export function calculateSharpeRatio(trades: Trade[], riskFreeRate: number = 0, plField: PLField = 'dollarPL'): number {
  const dailyPL: Record<string, number> = {};
  for (const t of trades) {
    dailyPL[t.date] = (dailyPL[t.date] || 0) + getTradeValue(t, plField);
  }
  const returns = Object.values(dailyPL);
  if (returns.length < 2) return 0;

  const mean = returns.reduce((s, r) => s + r, 0) / returns.length;
  const variance = returns.reduce((s, r) => s + (r - mean) ** 2, 0) / (returns.length - 1);
  const stddev = Math.sqrt(variance);
  if (stddev === 0) return 0;

  const dailyRiskFree = riskFreeRate / 252;
  return ((mean - dailyRiskFree) / stddev) * Math.sqrt(252);
}

export function calculateExpectancy(trades: Trade[], plField: PLField = 'dollarPL') {
  const wins = trades.filter(t => t.result === 'win');
  const losses = trades.filter(t => t.result === 'loss');
  const winRate = trades.length > 0 ? wins.length / trades.length : 0;
  const lossRate = 1 - winRate;
  const avgWin = wins.length > 0 ? wins.reduce((s, t) => s + getTradeValue(t, plField), 0) / wins.length : 0;
  const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((s, t) => s + getTradeValue(t, plField), 0) / losses.length) : 0;

  return {
    expectancy: (winRate * avgWin) - (lossRate * avgLoss),
    winRate: winRate * 100,
    avgWin,
    avgLoss,
  };
}

export function calculateMonteCarloSimulation(trades: Trade[], numSimulations: number = 1000, numTrades: number = 100, plField: PLField = 'dollarPL') {
  const pls = trades.map(t => getTradeValue(t, plField));
  if (pls.length === 0) return { percentiles: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 }, simulations: [] };

  const simulations: number[][] = [];
  for (let s = 0; s < numSimulations; s++) {
    const sim: number[] = [0];
    let cumPL = 0;
    for (let i = 0; i < numTrades; i++) {
      cumPL += pls[Math.floor(Math.random() * pls.length)];
      sim.push(cumPL);
    }
    simulations.push(sim);
  }

  const finalValues = simulations.map(s => s[s.length - 1]).sort((a, b) => a - b);
  const pct = (p: number) => finalValues[Math.floor(finalValues.length * p / 100)] || 0;

  return {
    percentiles: { p5: pct(5), p25: pct(25), p50: pct(50), p75: pct(75), p95: pct(95) },
    simulations,
  };
}
