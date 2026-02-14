import type { Trade } from '../types/trade';

export function exportTradesToCSV(trades: Trade[]): string {
  const headers = [
    'Date', 'Time', 'Instrument', 'Direction', 'Entry', 'Stop Loss',
    'Take Profit', 'Exit Price', 'Contracts', 'Result', 'Points P&L',
    'Dollar P&L', 'R:R', 'Setup Type', 'Confluences', 'Emotion Before',
    'Emotion After', 'Rating', 'Pre-Trade Notes', 'Post-Trade Notes', 'Tags',
  ];

  const rows = trades.map(t => [
    t.date,
    t.time,
    t.instrument,
    t.direction,
    t.entry,
    t.stopLoss,
    t.takeProfit,
    t.exitPrice,
    t.contracts,
    t.result,
    t.pointsPL,
    t.dollarPL,
    t.riskReward,
    t.setupType,
    t.confluences.join('; '),
    t.emotionBefore,
    t.emotionAfter,
    t.rating,
    `"${(t.preTradeNotes || '').replace(/"/g, '""')}"`,
    `"${(t.postTradeNotes || '').replace(/"/g, '""')}"`,
    t.tags.join('; '),
  ]);

  const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  return csv;
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
