import { Link } from 'react-router-dom';
import type { Trade } from '../../types/trade';
import Badge from '../ui/Badge';
import { formatDate, formatTime, formatPoints } from '../../utils/formatters';
import { usePLFormatter } from '../../hooks/usePLFormatter';

export type HiddenColumns = {
  points?: boolean;
  pl?: boolean;
  setup?: boolean;
  reached2R?: boolean;
  reached3R?: boolean;
};

interface TradeRowProps {
  trade: Trade;
  selected: boolean;
  onSelect: (id: string) => void;
  hiddenColumns?: HiddenColumns;
  skipped?: boolean;
}

export default function TradeRow({ trade, selected, onSelect, hiddenColumns, skipped }: TradeRowProps) {
  const pl = usePLFormatter();

  return (
    <tr className={`border-b border-slate-700/50 hover:bg-slate-800/50 transition-colors ${skipped ? 'opacity-50' : ''}`}>
      <td className="px-3 py-3">
        <input
          type="checkbox"
          checked={selected}
          onChange={() => onSelect(trade.id)}
          className="rounded border-slate-600 bg-slate-800"
        />
      </td>
      <td className="px-3 py-3 text-sm text-slate-300">
        <div className="flex items-center gap-1.5">
          {formatDate(trade.date)}
          {skipped && <span className="text-[10px] font-medium text-amber-400 bg-amber-400/10 px-1 py-px rounded">Skipped</span>}
        </div>
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
      <td className="px-3 py-3 text-sm text-slate-300">{trade.grade || '—'}</td>
      <td className="px-3 py-3">
        {(() => {
          const risk = Math.abs(trade.entry - trade.stopLoss);
          if (!risk) return <span className="text-sm text-slate-300">—</span>;
          const pnl = trade.direction === 'long' ? trade.exitPrice - trade.entry : trade.entry - trade.exitPrice;
          const r = pnl / risk;
          const rStr = r % 1 === 0 ? r.toFixed(0) : r.toFixed(2);
          return <span className={`font-mono text-sm font-medium ${r > 0 ? 'text-emerald-400' : r < 0 ? 'text-rose-400' : 'text-amber-400'}`}>{r > 0 ? '+' : ''}{rStr}R</span>;
        })()}
      </td>
      {!hiddenColumns?.reached2R && (
        <td className="px-3 py-3 text-sm text-center">
          {(() => {
            const stopDistance = Math.abs(trade.entry - trade.stopLoss);
            if (!stopDistance || trade.mfe == null) return <span className="text-slate-500">—</span>;
            if (trade.mfe >= 2 * stopDistance) return <span className="font-mono font-medium text-emerald-400">+2R</span>;
            if (trade.mfe >= stopDistance) return <span className="font-mono font-medium text-amber-400">BE</span>;
            return <span className="text-slate-500">—</span>;
          })()}
        </td>
      )}
      {!hiddenColumns?.reached3R && (
        <td className="px-3 py-3 text-sm text-center">
          {(() => {
            const stopDistance = Math.abs(trade.entry - trade.stopLoss);
            if (!stopDistance || trade.mfe == null) return <span className="text-slate-500">—</span>;
            if (trade.mfe >= 3 * stopDistance) return <span className="font-mono font-medium text-emerald-400">+3R</span>;
            if (trade.mfe >= stopDistance) return <span className="font-mono font-medium text-amber-400">BE</span>;
            return <span className="text-slate-500">—</span>;
          })()}
        </td>
      )}
      {!hiddenColumns?.points && (
        <td className="px-3 py-3">
          <span className={`font-mono text-sm font-medium ${trade.pointsPL > 0 ? 'text-emerald-400' : trade.pointsPL < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
            {formatPoints(trade.pointsPL)}
          </span>
        </td>
      )}
      {!hiddenColumns?.pl && (
        <td className="px-3 py-3">
          <span className={`font-mono text-sm font-medium ${pl.getPL(trade) > 0 ? 'text-emerald-400' : pl.getPL(trade) < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
            {pl.formatPLValue(pl.getPL(trade))}
          </span>
        </td>
      )}
      <td className="px-3 py-3">
        <Badge variant={trade.result === 'win' ? 'win' : trade.result === 'loss' ? 'loss' : 'breakeven'}>
          {trade.result.toUpperCase()}
        </Badge>
      </td>
      {!hiddenColumns?.setup && <td className="px-3 py-3 text-sm text-slate-400">{trade.setupType || '—'}</td>}
      <td className="px-3 py-3">
        <Link
          to={`/trades/${trade.id}`}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          View
        </Link>
        <span className="text-slate-600 mx-1">·</span>
        <Link
          to={`/trades/${trade.id}?edit`}
          className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
        >
          Edit
        </Link>
      </td>
    </tr>
  );
}
