import type { Trade } from '../types/trade';
import type { CustomCategory } from '../types/settings';

export function exportTradesToCSV(trades: Trade[], customCategories: CustomCategory[] = []): string {
  const headers = [
    'Date', 'Time', 'Instrument', 'Direction', 'Entry', 'Stop Loss',
    'Take Profit', 'Exit Price', 'Contracts', 'Result', 'Points P&L',
    'Dollar P&L', 'R:R', 'MAE', 'MFE', 'Drawback from 1R', 'Drawback from 2R',
    'Setup Type', 'Confluences', 'Confluences Against', 'Emotion Before',
    'Emotion After', 'Grade', 'Pre-Trade Notes', 'Post-Trade Notes', 'Tags',
    ...customCategories.map(c => c.name),
  ];

  const rows = trades.map(t => {
    const base = [
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
      t.mae ?? '',
      t.mfe ?? '',
      t.drawback1R ?? '',
      t.drawback2R ?? '',
      t.setupType,
      t.confluences.join('; '),
      (t.confluencesAgainst ?? []).join('; '),
      t.emotionBefore,
      t.emotionAfter,
      t.grade,
      `"${(t.preTradeNotes || '').replace(/"/g, '""')}"`,
      `"${(t.postTradeNotes || '').replace(/"/g, '""')}"`,
      t.tags.join('; '),
    ];
    const customCols = customCategories.map(c => {
      const val = t.customFields?.[c.id];
      if (!val) return '';
      return val.join('; ');
    });
    return [...base, ...customCols];
  });

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
