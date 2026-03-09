import { useState } from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { X } from 'lucide-react';
import type { Trade } from '../../types/trade';
import { useSettings } from '../../context/SettingsContext';
import Badge from '../ui/Badge';
import Card from '../ui/Card';
import { formatDate, formatTime } from '../../utils/formatters';
import { usePLFormatter, getTradeRMultiple } from '../../hooks/usePLFormatter';

interface TradeDetailProps {
  trade: Trade;
}

export default function TradeDetail({ trade }: TradeDetailProps) {
  const pl = usePLFormatter();
  const settings = useSettings();
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);

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
        <span className={`font-mono text-xl font-bold ${pl.getPL(trade) > 0 ? 'text-emerald-400' : pl.getPL(trade) < 0 ? 'text-rose-400' : 'text-amber-400'}`}>
          {pl.formatPLValue(pl.getPL(trade))}
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
          <p className="text-xs text-slate-500 mb-1">{pl.plLabel.replace('P&L ', '')}</p>
          <p className={`font-mono text-sm font-medium ${pl.getPL(trade) > 0 ? 'text-emerald-400' : pl.getPL(trade) < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {pl.formatPLValue(pl.getPL(trade))}
          </p>
        </Card>
        <Card>
          <p className="text-xs text-slate-500 mb-1">Actual R</p>
          <p className={`font-mono text-sm font-medium ${getTradeRMultiple(trade) > 0 ? 'text-emerald-400' : getTradeRMultiple(trade) < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
            {`${getTradeRMultiple(trade) > 0 ? '+' : ''}${getTradeRMultiple(trade).toFixed(2)}R`}
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

      {/* Runner Drawback */}
      {(trade.drawback1R != null || trade.drawback2R != null || trade.returnedTo1R != null) && (
        <Card>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Runner Drawback</h3>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-slate-500">Drawback from 1R</p>
              <p className="font-mono text-sm text-slate-200">
                {trade.drawback1R != null ? `${trade.drawback1R.toFixed(2)} pts` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Drawback from 2R</p>
              <p className="font-mono text-sm text-slate-200">
                {trade.drawback2R != null ? `${trade.drawback2R.toFixed(2)} pts` : '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Returned to 1R?</p>
              <p className={`text-sm font-medium ${trade.returnedTo1R === true ? 'text-emerald-400' : trade.returnedTo1R === false ? 'text-rose-400' : 'text-slate-500'}`}>
                {trade.returnedTo1R === true ? 'Yes' : trade.returnedTo1R === false ? 'No' : '—'}
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Setup & Confluences */}
      <div className="grid grid-cols-2 gap-4">
        <Card>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Setup</h3>
          <p className="text-slate-200">{trade.setupType || 'Not specified'}</p>
          <div className="mt-2">
            <p className="text-xs text-slate-500 mb-1">Contracts</p>
            <p className="font-mono text-slate-200">{trade.contracts}</p>
          </div>
          {trade.grade && (
            <div className="mt-2">
              <p className="text-xs text-slate-500">Grade</p>
              <p className="text-sm font-medium text-slate-200">{trade.grade}</p>
            </div>
          )}
        </Card>
        <Card>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Confluences</h3>
          {trade.confluences.length > 0 && (
            <div className="mb-2">
              <p className="text-xs text-slate-500 mb-1">FOR</p>
              <div className="flex flex-wrap gap-1.5">
                {trade.confluences.map(c => (
                  <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-900/40 text-emerald-300 border border-emerald-700/50">{c}</span>
                ))}
              </div>
            </div>
          )}
          {(trade.confluencesAgainst ?? []).length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-1">AGAINST</p>
              <div className="flex flex-wrap gap-1.5">
                {trade.confluencesAgainst.map(c => (
                  <span key={c} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-rose-900/40 text-rose-300 border border-rose-700/50">{c}</span>
                ))}
              </div>
            </div>
          )}
          {trade.confluences.length === 0 && (trade.confluencesAgainst ?? []).length === 0 && (
            <p className="text-sm text-slate-500">None selected</p>
          )}
        </Card>
      </div>

      {/* Custom Fields */}
      {trade.customFields && Object.keys(trade.customFields).length > 0 && (settings.customCategories || []).length > 0 && (
        <Card>
          <h3 className="text-sm font-medium text-slate-300 mb-3">Custom Fields</h3>
          <div className="grid grid-cols-2 gap-4">
            {(settings.customCategories || []).map(cat => {
              const value = trade.customFields?.[cat.id];
              if (!value || value.length === 0) return null;
              return (
                <div key={cat.id}>
                  <p className="text-xs text-slate-500 mb-1">{cat.name}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {value.map(v => (
                      <span key={v} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium bg-blue-900/40 text-blue-300 border border-blue-700/50">{v}</span>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      )}

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
              <img src={trade.setupScreenshot} alt="Setup" className="w-full rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxSrc(trade.setupScreenshot!)} />
            </Card>
          )}
          {trade.resultScreenshot && (
            <Card>
              <h3 className="text-sm font-medium text-slate-300 mb-2">Result Screenshot</h3>
              <img src={trade.resultScreenshot} alt="Result" className="w-full rounded-lg cursor-pointer hover:opacity-80 transition-opacity" onClick={() => setLightboxSrc(trade.resultScreenshot!)} />
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
      <Dialog.Root open={!!lightboxSrc} onOpenChange={(open) => { if (!open) setLightboxSrc(null); }}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40" />
          <Dialog.Content className="fixed inset-0 z-50 flex items-center justify-center p-8" onClick={() => setLightboxSrc(null)}>
            <Dialog.Title className="sr-only">Screenshot preview</Dialog.Title>
            <img
              src={lightboxSrc!}
              alt="Screenshot"
              className="max-w-full max-h-full object-contain rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
            <Dialog.Close className="absolute top-4 right-4 p-2 rounded-full bg-slate-900/80 text-slate-300 hover:text-white transition-colors">
              <X size={20} />
            </Dialog.Close>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </div>
  );
}
