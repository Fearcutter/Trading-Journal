import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ClipboardPaste, AlertCircle, ArrowRight, Keyboard } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { parseTradingViewClipboard, parseTradingViewHTML } from '../../utils/tradingview-parser';
import { useSettings } from '../../context/SettingsContext';
import type { ParsedTradeData } from '../../utils/tradingview-parser';

interface PasteTradeModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId?: string;
  onParsed?: (data: ParsedTradeData) => void;
}

export default function PasteTradeModal({ open, onOpenChange, sessionId, onParsed }: PasteTradeModalProps) {
  const navigate = useNavigate();
  const settings = useSettings();
  const [parsed, setParsed] = useState<ParsedTradeData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showManual, setShowManual] = useState(false);
  const [manualText, setManualText] = useState('');

  const handlePaste = async () => {
    setLoading(true);
    setError('');
    setParsed(null);
    try {
      let result: ParsedTradeData | null = null;

      // Try rich clipboard API first
      if (navigator.clipboard.read) {
        try {
          const items = await navigator.clipboard.read();
          for (const item of items) {
            console.log('[PasteTradeModal] Clipboard item types:', item.types);

            // Try text/html first (most likely to have structured data)
            if (item.types.includes('text/html')) {
              const htmlBlob = await item.getType('text/html');
              const html = await htmlBlob.text();
              console.log('[PasteTradeModal] HTML content:', html);
              result = parseTradingViewHTML(html, settings.instruments, settings.tradingTimezone);
              if (result) break;
            }

            // Fallback to text/plain
            if (!result && item.types.includes('text/plain')) {
              const textBlob = await item.getType('text/plain');
              const text = await textBlob.text();
              console.log('[PasteTradeModal] Plain text content:', text);
              result = parseTradingViewClipboard(text);
              if (result) break;
            }
          }
        } catch {
          // Rich clipboard read failed, fall back to readText
          const text = await navigator.clipboard.readText();
          result = parseTradingViewClipboard(text);
        }
      } else {
        // Browser doesn't support read(), use readText()
        const text = await navigator.clipboard.readText();
        result = parseTradingViewClipboard(text);
      }

      if (result) {
        setParsed(result);
      } else {
        setError('Could not parse clipboard content. Try the manual input below, or make sure you copied from TradingView Position Tool.');
        setShowManual(true);
      }
    } catch {
      setError('Failed to read clipboard. Please allow clipboard access or use manual input below.');
      setShowManual(true);
    }
    setLoading(false);
  };

  const handleManualParse = () => {
    setError('');
    setParsed(null);
    const result = parseTradingViewClipboard(manualText);
    if (result) {
      setParsed(result);
    } else {
      setError('Could not parse the text. Expected format:\nLong 21234.50\nStop 21209.50\nTarget 21284.50');
    }
  };

  const handleContinue = () => {
    if (parsed) {
      onOpenChange(false);
      if (onParsed) {
        onParsed(parsed);
      } else if (sessionId) {
        navigate(`/backtesting/${sessionId}`, { state: { parsedTrade: parsed } });
      } else {
        navigate('/live-trading', { state: { parsedTrade: parsed } });
      }
      setParsed(null);
      setManualText('');
      setShowManual(false);
    }
  };

  const handleClose = (open: boolean) => {
    if (!open) {
      setParsed(null);
      setError('');
      setManualText('');
      setShowManual(false);
    }
    onOpenChange(open);
  };

  return (
    <Modal open={open} onOpenChange={handleClose} title="Paste Trade from TradingView">
      <div className="space-y-4">
        <p className="text-sm text-slate-400">
          Copy trade data from TradingView's Position Tool, then click the button below.
          {sessionId && (
            <span className="block mt-1 text-blue-400">This trade will be added to the current backtest session.</span>
          )}
        </p>

        <Button onClick={handlePaste} disabled={loading} className="w-full">
          <ClipboardPaste size={16} />
          {loading ? 'Reading clipboard...' : 'Paste from Clipboard'}
        </Button>

        {error && (
          <div className="flex items-start gap-2 p-3 bg-rose-400/10 border border-rose-400/20 rounded-lg">
            <AlertCircle size={16} className="text-rose-400 mt-0.5 shrink-0" />
            <p className="text-sm text-rose-300 whitespace-pre-line">{error}</p>
          </div>
        )}

        {/* Manual text input fallback */}
        {!parsed && (
          <div className="space-y-2">
            {!showManual ? (
              <button
                onClick={() => setShowManual(true)}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                <Keyboard size={14} />
                Or enter trade data manually
              </button>
            ) : (
              <>
                <label className="block text-sm font-medium text-slate-400">Manual input</label>
                <textarea
                  value={manualText}
                  onChange={e => setManualText(e.target.value)}
                  placeholder={"Long 21234.50\nStop 21209.50\nTarget 21284.50\nRisk/Reward 1:2.00"}
                  rows={5}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none font-mono"
                />
                <Button onClick={handleManualParse} disabled={!manualText.trim()} className="w-full">
                  Parse Text
                </Button>
              </>
            )}
          </div>
        )}

        {parsed && (
          <div className="space-y-3">
            <div className="p-3 bg-slate-700/50 rounded-lg space-y-2">
              <h4 className="text-sm font-medium text-slate-300">Parsed Data Preview</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-slate-500">Direction:</span>{' '}
                  <span className={parsed.direction === 'long' ? 'text-blue-400' : 'text-purple-400'}>
                    {parsed.direction.toUpperCase()}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">Entry:</span>{' '}
                  <span className="font-mono text-slate-200">{parsed.entry}</span>
                </div>
                <div>
                  <span className="text-slate-500">Stop Loss:</span>{' '}
                  <span className="font-mono text-slate-200">{parsed.stopLoss}</span>
                </div>
                <div>
                  <span className="text-slate-500">Take Profit:</span>{' '}
                  <span className="font-mono text-slate-200">{parsed.takeProfit}</span>
                </div>
                <div>
                  <span className="text-slate-500">Exit Price:</span>{' '}
                  <span className="font-mono text-slate-200">{parsed.exitPrice}</span>
                </div>
                <div>
                  <span className="text-slate-500">Points P&L:</span>{' '}
                  <span className={`font-mono ${parsed.pointsPL >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {parsed.pointsPL >= 0 ? '+' : ''}{parsed.pointsPL}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500">R:R:</span>{' '}
                  <span className="font-mono text-slate-200">{parsed.riskReward.toFixed(2)}</span>
                </div>
                {parsed.date && (
                  <div>
                    <span className="text-slate-500">Date:</span>{' '}
                    <span className="font-mono text-slate-200">{parsed.date}</span>
                  </div>
                )}
                {parsed.time && (
                  <div>
                    <span className="text-slate-500">Time:</span>{' '}
                    <span className="font-mono text-slate-200">{parsed.time}</span>
                  </div>
                )}
              </div>
            </div>
            <Button onClick={handleContinue} className="w-full">
              Continue to Form
              <ArrowRight size={16} />
            </Button>
          </div>
        )}
      </div>
    </Modal>
  );
}
