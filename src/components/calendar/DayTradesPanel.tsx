import { Link } from 'react-router-dom';
import type { Trade } from '../../types/trade';
import Badge from '../ui/Badge';
import { formatDate, formatTime } from '../../utils/formatters';
import { usePLFormatter, getTradeValue } from '../../hooks/usePLFormatter';
import { X } from 'lucide-react';

interface DayTradesPanelProps {
  date: string;
  trades: Trade[];
  onClose: () => void;
}

export default function DayTradesPanel({ date, trades, onClose }: DayTradesPanelProps) {
  const pl = usePLFormatter();
  const totalPL = trades.reduce((sum, t) => sum + getTradeValue(t, pl.plField), 0);
  const wins = trades.filter(t => t.result === 'win').length;
  const losses = trades.filter(t => t.result === 'loss').length;
  const breakevens = trades.filter(t => t.result === 'breakeven').length;
  const winRate = trades.length > 0 ? Math.round((wins / trades.length) * 100) : 0;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <div>
          <h3 className="font-semibold text-slate-50">{formatDate(date)}</h3>
          <p className="text-xs text-slate-500">{trades.length} trade{trades.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono font-semibold text-lg ${totalPL > 0 ? 'text-emerald-400' : totalPL < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
            {pl.formatPLValue(totalPL)}
          </span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Daily stats */}
      {trades.length > 0 && (
        <div className="grid grid-cols-4 divide-x divide-slate-700 border-b border-slate-700">
          <div className="flex flex-col items-center py-2 px-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Win Rate</span>
            <span className="text-sm font-semibold text-slate-200">{winRate}%</span>
          </div>
          <div className="flex flex-col items-center py-2 px-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Wins</span>
            <span className="text-sm font-semibold text-emerald-400">{wins}</span>
          </div>
          <div className="flex flex-col items-center py-2 px-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">Losses</span>
            <span className="text-sm font-semibold text-rose-400">{losses}</span>
          </div>
          <div className="flex flex-col items-center py-2 px-1">
            <span className="text-[10px] text-slate-500 uppercase tracking-wide mb-0.5">BE</span>
            <span className="text-sm font-semibold text-amber-400">{breakevens}</span>
          </div>
        </div>
      )}

      {/* Trade list */}
      <div className="p-3 space-y-2 max-h-[400px] overflow-y-auto">
        {trades.length === 0 ? (
          <p className="text-sm text-slate-500 py-4 text-center">No trades on this day</p>
        ) : (
          trades.map(trade => (
            <Link
              key={trade.id}
              to={`/trades/${trade.id}`}
              className="block p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono text-sm font-medium text-slate-200">{trade.instrument}</span>
                  <Badge variant={trade.direction === 'long' ? 'long' : 'short'}>
                    {trade.direction.toUpperCase()}
                  </Badge>
                  <Badge variant={trade.result === 'win' ? 'win' : trade.result === 'loss' ? 'loss' : 'breakeven'}>
                    {trade.result.toUpperCase()}
                  </Badge>
                </div>
                <span className={`font-mono text-sm font-semibold shrink-0 ${pl.getPL(trade) > 0 ? 'text-emerald-400' : pl.getPL(trade) < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {pl.formatPLValue(pl.getPL(trade))}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {trade.time && <span>{formatTime(trade.time)}</span>}
                {trade.setupType && <span>{trade.setupType}</span>}
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
