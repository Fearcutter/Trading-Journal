import type { Trade } from '../types/trade';

const VALID_DIRECTIONS = ['long', 'short'];
const VALID_RESULTS = ['win', 'loss', 'breakeven'];

export function validateTrade(trade: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!trade || typeof trade !== 'object') {
    return { valid: false, errors: ['Trade must be an object'] };
  }

  const t = trade as Record<string, unknown>;

  if (!t.id || typeof t.id !== 'string') errors.push('id must be a non-empty string');
  if (!t.date || typeof t.date !== 'string') errors.push('date must be a non-empty string');
  if (typeof t.time !== 'string') errors.push('time must be a string');
  if (!t.instrument || typeof t.instrument !== 'string') errors.push('instrument must be a non-empty string');
  if (!VALID_DIRECTIONS.includes(t.direction as string)) errors.push('direction must be "long" or "short"');
  if (typeof t.entry !== 'number' || t.entry <= 0) errors.push('entry must be a positive number');
  if (typeof t.contracts !== 'number' || t.contracts < 1) errors.push('contracts must be >= 1');
  if (!VALID_RESULTS.includes(t.result as string)) errors.push('result must be "win", "loss", or "breakeven"');
  if (typeof t.stopLoss !== 'number') errors.push('stopLoss must be a number');
  if (typeof t.takeProfit !== 'number') errors.push('takeProfit must be a number');
  if (typeof t.exitPrice !== 'number') errors.push('exitPrice must be a number');
  if (typeof t.pointsPL !== 'number') errors.push('pointsPL must be a number');
  if (typeof t.dollarPL !== 'number') errors.push('dollarPL must be a number');
  if (typeof t.riskReward !== 'number') errors.push('riskReward must be a number');

  // Validate mae/mfe if present
  if (t.mae !== undefined && (typeof t.mae !== 'number' || t.mae < 0)) {
    errors.push('mae must be a number >= 0');
  }
  if (t.mfe !== undefined && (typeof t.mfe !== 'number' || t.mfe < 0)) {
    errors.push('mfe must be a number >= 0');
  }

  return { valid: errors.length === 0, errors };
}

export function sanitizeImport(data: unknown): { trades: Trade[]; errors: string[]; skipped: number } {
  const errors: string[] = [];
  let skipped = 0;

  if (!data || typeof data !== 'object') {
    return { trades: [], errors: ['Invalid data format'], skipped: 0 };
  }

  let rawTrades: unknown[];
  if (Array.isArray(data)) {
    rawTrades = data;
  } else if ((data as Record<string, unknown>).trades && Array.isArray((data as Record<string, unknown>).trades)) {
    rawTrades = (data as Record<string, unknown>).trades as unknown[];
  } else {
    return { trades: [], errors: ['No trades array found'], skipped: 0 };
  }

  const trades: Trade[] = [];
  for (let i = 0; i < rawTrades.length; i++) {
    const item = rawTrades[i];
    const validation = validateTrade(item);
    if (!validation.valid) {
      errors.push(`Trade ${i}: ${validation.errors.join(', ')}`);
      skipped++;
      continue;
    }

    const t = item as Record<string, unknown>;
    trades.push({
      id: String(t.id),
      date: String(t.date),
      time: String(t.time || ''),
      instrument: String(t.instrument),
      direction: t.direction as Trade['direction'],
      entry: Number(t.entry),
      stopLoss: Number(t.stopLoss),
      takeProfit: Number(t.takeProfit),
      exitPrice: Number(t.exitPrice),
      contracts: Number(t.contracts),
      result: t.result as Trade['result'],
      pointsPL: Number(t.pointsPL),
      dollarPL: Number(t.dollarPL),
      riskReward: Number(t.riskReward),
      setupType: String(t.setupType || ''),
      confluences: Array.isArray(t.confluences) ? t.confluences.map(String) : [],
      confluencesAgainst: Array.isArray(t.confluencesAgainst) ? t.confluencesAgainst.map(String) : [],
      emotionBefore: (t.emotionBefore as Trade['emotionBefore']) || '',
      emotionAfter: (t.emotionAfter as Trade['emotionAfter']) || '',
      grade: String(t.grade || ''),
      preTradeNotes: String(t.preTradeNotes || ''),
      postTradeNotes: String(t.postTradeNotes || ''),
      setupScreenshot: String(t.setupScreenshot || ''),
      resultScreenshot: String(t.resultScreenshot || ''),
      tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
      customFields: (t.customFields && typeof t.customFields === 'object') ? t.customFields as Record<string, string[]> : {},
      createdAt: String(t.createdAt || new Date().toISOString()),
      updatedAt: String(t.updatedAt || new Date().toISOString()),
    });
  }

  return { trades, errors, skipped };
}
