import type { Trade } from '../types/trade';

interface ExportData {
  version: 1;
  exportDate: string;
  trades: Trade[];
}

export function exportToJSON(trades: Trade[]): string {
  const data: ExportData = {
    version: 1,
    exportDate: new Date().toISOString(),
    trades,
  };
  return JSON.stringify(data, null, 2);
}

export function downloadJSON(json: string, filename: string) {
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function validateImportData(data: unknown): { valid: boolean; trades: Trade[]; error?: string } {
  if (!data || typeof data !== 'object') {
    return { valid: false, trades: [], error: 'Invalid data format' };
  }

  const obj = data as Record<string, unknown>;

  // Handle both wrapped format and raw array
  let trades: unknown[];
  if (Array.isArray(obj)) {
    trades = obj;
  } else if (obj.trades && Array.isArray(obj.trades)) {
    trades = obj.trades;
  } else {
    return { valid: false, trades: [], error: 'No trades array found in import data' };
  }

  // Validate each trade has minimum required fields
  const validTrades: Trade[] = [];
  for (const item of trades) {
    if (!item || typeof item !== 'object') continue;
    const t = item as Record<string, unknown>;

    if (!t.id || !t.date || !t.instrument || !t.direction) {
      continue; // Skip invalid trades
    }

    validTrades.push({
      id: String(t.id),
      date: String(t.date),
      time: String(t.time || ''),
      instrument: String(t.instrument),
      direction: t.direction as 'long' | 'short',
      entry: Number(t.entry) || 0,
      stopLoss: Number(t.stopLoss) || 0,
      takeProfit: Number(t.takeProfit) || 0,
      exitPrice: Number(t.exitPrice) || 0,
      contracts: Number(t.contracts) || 1,
      result: (t.result as 'win' | 'loss' | 'breakeven') || 'breakeven',
      pointsPL: Number(t.pointsPL) || 0,
      dollarPL: Number(t.dollarPL) || 0,
      riskReward: Number(t.riskReward) || 0,
      setupType: String(t.setupType || ''),
      confluences: Array.isArray(t.confluences) ? t.confluences.map(String) : [],
      emotionBefore: (t.emotionBefore as Trade['emotionBefore']) || '',
      emotionAfter: (t.emotionAfter as Trade['emotionAfter']) || '',
      rating: Number(t.rating) || 0,
      preTradeNotes: String(t.preTradeNotes || ''),
      postTradeNotes: String(t.postTradeNotes || ''),
      setupScreenshot: String(t.setupScreenshot || ''),
      resultScreenshot: String(t.resultScreenshot || ''),
      tags: Array.isArray(t.tags) ? t.tags.map(String) : [],
      createdAt: String(t.createdAt || new Date().toISOString()),
      updatedAt: String(t.updatedAt || new Date().toISOString()),
    });
  }

  if (validTrades.length === 0) {
    return { valid: false, trades: [], error: 'No valid trades found in import data' };
  }

  return { valid: true, trades: validTrades };
}

export function readFileAsJSON(file: File): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        resolve(JSON.parse(reader.result as string));
      } catch {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
}
