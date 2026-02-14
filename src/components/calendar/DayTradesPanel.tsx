import { Link } from 'react-router-dom';
import type { Trade } from '../../types/trade';
import Badge from '../ui/Badge';
import { formatCurrency, formatDate, formatTime, formatPoints } from '../../utils/formatters';
import { X } from 'lucide-react';

interface DayTradesPanelProps {
  date: string;
  trades: Trade[];
  onClose: () => void;
}

export default function DayTradesPanel({ date, trades, onClose }: DayTradesPanelProps) {
  const totalPL = trades.reduce((sum, t) => sum + t.dollarPL, 0);

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium text-slate-50">{formatDate(date)}</h3>
          <p className="text-xs text-slate-500">{trades.length} trade{trades.length !== 1 ? 's' : ''}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className={`font-mono font-medium ${totalPL > 0 ? 'text-emerald-400' : totalPL < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
            {totalPL > 0 ? '+' : ''}{formatCurrency(totalPL)}
          </span>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 transition-colors">
            <X size={16} />
          </button>
        </div>
      </div>

      {trades.length === 0 ? (
        <p className="text-sm text-slate-500 py-4 text-center">No trades on this day</p>
      ) : (
        <div className="space-y-2">
          {trades.map(trade => (
            <Link
              key={trade.id}
              to={`/trades/${trade.id}`}
              className="block p-3 bg-slate-700/50 rounded-lg hover:bg-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-sm font-medium text-slate-200">{trade.instrument}</span>
                  <Badge variant={trade.direction === 'long' ? 'long' : 'short'}>
                    {trade.direction.toUpperCase()}
                  </Badge>
                  <Badge variant={trade.result === 'win' ? 'win' : trade.result === 'loss' ? 'loss' : 'breakeven'}>
                    {trade.result.toUpperCase()}
                  </Badge>
                </div>
                <span className={`font-mono text-sm font-medium ${trade.dollarPL > 0 ? 'text-emerald-400' : trade.dollarPL < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
                  {trade.dollarPL > 0 ? '+' : ''}{formatCurrency(trade.dollarPL)}
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500">
                {trade.time && <span>{formatTime(trade.time)}</span>}
                <span>{formatPoints(trade.pointsPL)} pts</span>
                {trade.setupType && <span>{trade.setupType}</span>}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
