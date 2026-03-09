import { useMemo } from 'react';
import type { PlaybookEntry } from '../../types/playbook';
import type { Trade } from '../../types/trade';
import { usePLFormatter, getTradeValue } from '../../hooks/usePLFormatter';

interface PlaybookCardProps {
  entry: PlaybookEntry;
  trades: Trade[];
  onClick: () => void;
}

export default function PlaybookCard({ entry, trades, onClick }: PlaybookCardProps) {
  const pl = usePLFormatter();

  const stats = useMemo(() => {
    if (!entry.setupType) return null;
    const matching = trades.filter(t => t.setupType === entry.setupType);
    if (matching.length === 0) return null;
    const wins = matching.filter(t => t.result === 'win').length;
    const totalPL = matching.reduce((sum, t) => sum + getTradeValue(t, pl.plField), 0);
    return {
      totalTrades: matching.length,
      winRate: ((wins / matching.length) * 100).toFixed(0),
      avgPL: totalPL / matching.length,
    };
  }, [entry.setupType, trades, pl.plField]);

  return (
    <button
      onClick={onClick}
      className="w-full text-left bg-slate-800 border border-slate-700 rounded-xl p-4 hover:border-slate-600 hover:bg-slate-800/80 transition-colors"
    >
      <h3 className="text-sm font-semibold text-slate-50 mb-1">{entry.name}</h3>
      {entry.description && (
        <p className="text-xs text-slate-400 mb-3 line-clamp-2">{entry.description}</p>
      )}

      <div className="flex gap-3 text-xs text-slate-500 mb-3">
        <span>{entry.entryRules.length} entry rules</span>
        <span>{entry.exitRules.length} exit rules</span>
        <span>{entry.riskRules.length} risk rules</span>
      </div>

      {stats && (
        <div className="flex gap-4 text-xs pt-2 border-t border-slate-700">
          <div>
            <span className="text-slate-500">Trades: </span>
            <span className="text-slate-300">{stats.totalTrades}</span>
          </div>
          <div>
            <span className="text-slate-500">Win: </span>
            <span className="text-slate-300">{stats.winRate}%</span>
          </div>
          <div>
            <span className="text-slate-500">Avg P&L: </span>
            <span className={stats.avgPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
              {pl.formatPLValue(stats.avgPL)}
            </span>
          </div>
        </div>
      )}

      {entry.tags.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-3">
          {entry.tags.map(tag => (
            <span key={tag} className="px-1.5 py-0.5 bg-slate-700 text-slate-300 text-[10px] rounded">
              {tag}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}
