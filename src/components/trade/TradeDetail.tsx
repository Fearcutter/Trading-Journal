import type { Trade } from '../../types/trade';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import { formatCurrency, formatDate, formatTime, formatPoints } from '../../utils/formatters';
import { Star } from 'lucide-react';

interface TradeDetailProps {
  trade: Trade;
}

export default function TradeDetail({ trade }: TradeDetailProps) {
  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <span className="font-mono text-2xl font-bold text-slate-50">{trade.instrument}</span>
        <Badge variant={trade.direction === 'long' ? 'long' : 'short'}>
          {trade.direction.toUpperCase()}
        </Badge>
        <Badge variant={trade.result === 'win' ? 'win' : trade.result === 'loss' ? 'loss' : 'breakeven'}>
          {trade.result.toUpperCase()}
        </Badge>
        <span className={`font-mono text-xl font-bold ${trade.dollarPL > 0 ? 'text-emerald-400' : trade.dollarPL < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
          {trade.dollarPL > 0 ? '+' : ''}{formatCurrency(trade.dollarPL)}
        </span>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-4 gap-4">
        <Card>
          <p className="text-xs text-slate-500 mb-1">Date & Time</p>
          <p className="text-sm font-medium text-slate-200">
            {formatDate(trade.date)} {trade.time && formatTime(trade.time)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 mb-1">Entry / Exit</p>
          <p className="font-mono text-sm text-slate-200">
            {trade.entry.toFixed(2)} → {trade.exitPrice.toFixed(2)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 mb-1">Points P&L</p>
          <p className={`font-mono text-sm font-medium ${trade.pointsPL > 0 ? 'text-emerald-400' : trade.pointsPL < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {formatPoints(trade.pointsPL)}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 mb-1">Risk:Reward</p>
          <p className="font-mono text-sm text-slate-200">
            {trade.riskReward ? `1:${trade.riskReward.toFixed(2)}` : '—'}
          </p>
        </Card>
      </div>

      {/* Price Levels */}
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Price Levels</h3>
        <div className="grid grid-cols-4 gap-4">
          <div>
            <p className="text-xs text-slate-500">Entry</p>
            <p className="font-mono text-slate-200">{trade.entry.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Stop Loss</p>
            <p className="font-mono text-rose-400">{trade.stopLoss.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Take Profit</p>
            <p className="font-mono text-emerald-400">{trade.takeProfit.toFixed(2)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Exit Price</p>
            <p className="font-mono text-slate-200">{trade.exitPrice.toFixed(2)}</p>
          </div>
        </div>
      </Card>

      {/* Setup & Confluences */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Setup</h3>
          <p className="text-slate-200">{trade.setupType || 'Not specified'}</p>
          <div className="mt-2">
            <p className="text-xs text-slate-500 mb-1">Contracts</p>
            <p className="font-mono text-slate-200">{trade.contracts}</p>
          </div>
          {trade.rating > 0 && (
            <div className="mt-2 flex gap-0.5">
              {[1, 2, 3, 4, 5].map(s => (
                <Star key={s} size={14} className={s <= trade.rating ? 'text-amber-400 fill-amber-400' : 'text-slate-600'} />
              ))}
            </div>
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Confluences</h3>
          {trade.confluences.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {trade.confluences.map(c => (
                <Badge key={c}>{c}</Badge>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">None selected</p>
          )}
        </Card>
      </div>

      {/* Emotions */}
      {(trade.emotionBefore || trade.emotionAfter) && (
        <div className="grid grid-cols-2 gap-4">
          <Card>
            <p className="text-xs text-slate-500 mb-1">Emotion Before</p>
            <p className="text-slate-200">{trade.emotionBefore || '—'}</p>
          </Card>
          <Card>
            <p className="text-xs text-slate-500 mb-1">Emotion After</p>
            <p className="text-slate-200">{trade.emotionAfter || '—'}</p>
          </Card>
        </div>
      )}

      {/* Notes */}
      {(trade.preTradeNotes || trade.postTradeNotes) && (
        <div className="grid grid-cols-2 gap-4">
          {trade.preTradeNotes && (
            <Card>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Pre-Trade Notes</h3>
              <p className="text-sm text-slate-400 whitespace-pre-wrap">{trade.preTradeNotes}</p>
            </Card>
          )}
          {trade.postTradeNotes && (
            <Card>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Post-Trade Notes</h3>
              <p className="text-sm text-slate-400 whitespace-pre-wrap">{trade.postTradeNotes}</p>
            </Card>
          )}
        </div>
      )}

      {/* Screenshots */}
      {(trade.setupScreenshot || trade.resultScreenshot) && (
        <div className="grid grid-cols-2 gap-4">
          {trade.setupScreenshot && (
            <Card>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Setup Screenshot</h3>
              <img src={trade.setupScreenshot} alt="Setup" className="w-full rounded-lg" />
            </Card>
          )}
          {trade.resultScreenshot && (
            <Card>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Result Screenshot</h3>
              <img src={trade.resultScreenshot} alt="Result" className="w-full rounded-lg" />
            </Card>
          )}
        </div>
      )}

      {/* Tags */}
      {trade.tags.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">Tags:</span>
          {trade.tags.map(t => (
            <Badge key={t}>{t}</Badge>
          ))}
        </div>
      )}
    </div>
  );
}
