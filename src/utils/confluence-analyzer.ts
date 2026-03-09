import type { Trade } from '../types/trade';
import type { PLField } from './pl-helpers';
import { getTradeValue } from './pl-helpers';

export interface ConfluenceStats {
  name: string;
  timesUsed: number;
  winRate: number;
  avgPL: number;
  avgRR: number;
  totalPL: number;
  hasSufficientData: boolean; // >= 10 trades
}

export function analyzeConfluences(trades: Trade[], plField: PLField = 'dollarPL', field: 'confluences' | 'confluencesAgainst' = 'confluences'): ConfluenceStats[] {
  const confluenceMap: Record<string, { wins: number; total: number; totalPL: number; totalRR: number; rrCount: number }> = {};

  for (const trade of trades) {
    for (const conf of (trade[field] ?? [])) {
      if (!confluenceMap[conf]) {
        confluenceMap[conf] = { wins: 0, total: 0, totalPL: 0, totalRR: 0, rrCount: 0 };
      }
      confluenceMap[conf].total++;
      confluenceMap[conf].totalPL += getTradeValue(trade, plField);
      if (trade.result === 'win') confluenceMap[conf].wins++;
      if (trade.riskReward > 0) {
        confluenceMap[conf].totalRR += trade.riskReward;
        confluenceMap[conf].rrCount++;
      }
    }
  }

  return Object.entries(confluenceMap)
    .map(([name, data]) => ({
      name,
      timesUsed: data.total,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      avgPL: data.total > 0 ? data.totalPL / data.total : 0,
      avgRR: data.rrCount > 0 ? data.totalRR / data.rrCount : 0,
      totalPL: data.totalPL,
      hasSufficientData: data.total >= 10,
    }))
    .sort((a, b) => b.timesUsed - a.timesUsed);
}

export function analyzeConfluenceCombinations(
  trades: Trade[], plField: PLField = 'dollarPL'
): { combo: string[]; winRate: number; count: number; avgPL: number }[] {
  const comboMap: Record<string, { wins: number; total: number; totalPL: number }> = {};

  for (const trade of trades) {
    if (trade.confluences.length < 2) continue;

    // Generate all pairs
    const sorted = [...trade.confluences].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}|||${sorted[j]}`;
        if (!comboMap[key]) comboMap[key] = { wins: 0, total: 0, totalPL: 0 };
        comboMap[key].total++;
        comboMap[key].totalPL += getTradeValue(trade, plField);
        if (trade.result === 'win') comboMap[key].wins++;
      }
    }
  }

  return Object.entries(comboMap)
    .filter(([, data]) => data.total >= 3) // Minimum 3 trades for combo
    .map(([key, data]) => ({
      combo: key.split('|||'),
      winRate: (data.wins / data.total) * 100,
      count: data.total,
      avgPL: data.totalPL / data.total,
    }))
    .sort((a, b) => b.winRate - a.winRate);
}

export function analyzeCategoryField(
  trades: Trade[],
  plField: PLField = 'dollarPL',
  extractor: (t: Trade) => string[]
): ConfluenceStats[] {
  const map: Record<string, { wins: number; total: number; totalPL: number; totalRR: number; rrCount: number }> = {};

  for (const trade of trades) {
    for (const val of extractor(trade)) {
      if (!map[val]) map[val] = { wins: 0, total: 0, totalPL: 0, totalRR: 0, rrCount: 0 };
      map[val].total++;
      map[val].totalPL += getTradeValue(trade, plField);
      if (trade.result === 'win') map[val].wins++;
      if (trade.riskReward > 0) {
        map[val].totalRR += trade.riskReward;
        map[val].rrCount++;
      }
    }
  }

  return Object.entries(map)
    .map(([name, data]) => ({
      name,
      timesUsed: data.total,
      winRate: data.total > 0 ? (data.wins / data.total) * 100 : 0,
      avgPL: data.total > 0 ? data.totalPL / data.total : 0,
      avgRR: data.rrCount > 0 ? data.totalRR / data.rrCount : 0,
      totalPL: data.totalPL,
      hasSufficientData: data.total >= 10,
    }))
    .sort((a, b) => b.timesUsed - a.timesUsed);
}

export function analyzeCategoryCombinations(
  trades: Trade[],
  plField: PLField = 'dollarPL',
  extractor: (t: Trade) => string[]
): { combo: string[]; winRate: number; count: number; avgPL: number }[] {
  const comboMap: Record<string, { wins: number; total: number; totalPL: number }> = {};

  for (const trade of trades) {
    const values = extractor(trade);
    if (values.length < 2) continue;
    const sorted = [...values].sort();
    for (let i = 0; i < sorted.length; i++) {
      for (let j = i + 1; j < sorted.length; j++) {
        const key = `${sorted[i]}|||${sorted[j]}`;
        if (!comboMap[key]) comboMap[key] = { wins: 0, total: 0, totalPL: 0 };
        comboMap[key].total++;
        comboMap[key].totalPL += getTradeValue(trade, plField);
        if (trade.result === 'win') comboMap[key].wins++;
      }
    }
  }

  return Object.entries(comboMap)
    .filter(([, data]) => data.total >= 3)
    .map(([key, data]) => ({
      combo: key.split('|||'),
      winRate: (data.wins / data.total) * 100,
      count: data.total,
      avgPL: data.totalPL / data.total,
    }))
    .sort((a, b) => b.winRate - a.winRate);
}

// Extractors for built-in and custom fields
export const categoryExtractors = {
  confluences: (t: Trade) => t.confluences || [],
  confluencesAgainst: (t: Trade) => t.confluencesAgainst || [],
  setupType: (t: Trade) => t.setupType ? [t.setupType] : [],
  grade: (t: Trade) => t.grade ? [t.grade] : [],
  customField: (categoryId: string) => (t: Trade) => {
    const val = t.customFields?.[categoryId];
    return val || [];
  },
};
