import { Link } from 'react-router-dom';
import type { Trade } from '../../types/trade';
import Badge from '../ui/Badge';
import { formatCurrency, formatDate, formatTime, formatPoints } from '../../utils/formatters';

interface TradeRowProps {
  trade: Trade;
  selected: boolean;
  onSelect: (id: string) => void;
}

export default function TradeRow({ trade, selected, onSelect }: TradeRowProps) {
  return (
    <tr className="border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors">
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(trade.id)}
          className="rounded border-slate-600 bg-slate-800"
        />
      </td>
      <td className="px-3 py-3 text-sm text-slate-300">
        <div>{formatDate(trade.date)}</div>
        {trade.time && <div className="text-xs text-slate-500">{formatTime(trade.time)}</div>}
      </td>
      <td className="px-3 py-3">
        <span className="font-mono text-sm font-medium text-slate-200">{trade.instrument}</span>
      </td>
      <td className="px-3 py-3">
        <Badge variant={trade.direction === 'long' ? 'long' : 'short'}>
          {trade.direction.toUpperCase()}
        </Badge>
      </td>
      <td className="px-3 py-3 font-mono text-sm text-slate-300">{trade.entry.toFixed(2)}</td>
      <td className="px-3 py-3 font-mono text-sm text-slate-300">{trade.exitPrice.toFixed(2)}</td>
      <td className="px-3 py-3">
        <span className={`font-mono text-sm font-medium ${trade.pointsPL > 0 ? 'text-emerald-400' : trade.pointsPL < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
          {formatPoints(trade.pointsPL)}
        </span>
      </td>
      <td className="px-3 py-3">
        <span className={`font-mono text-sm font-medium ${trade.dollarPL > 0 ? 'text-emerald-400' : trade.dollarPL < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
          {trade.dollarPL > 0 ? '+' : ''}{formatCurrency(trade.dollarPL)}
        </span>
      </td>
      <td className="px-3 py-3">
        <Badge variant={trade.result === 'win' ? 'win' : trade.result === 'loss' ? 'loss' : 'breakeven'}>
          {trade.result.toUpperCase()}
        </Badge>
      </td>
      <td className="px-3 py-3 text-sm text-slate-400">{trade.setupType || '—'}</td>
      <td className="px-3 py-3">
        <Link
          to={`/trades/${trade.id}`}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          View
        </Link>
      </td>
    </tr>
  );
}
