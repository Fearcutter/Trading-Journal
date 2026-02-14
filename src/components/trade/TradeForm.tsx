import { useState, useEffect, useMemo } from 'react';
import { format } from 'date-fns';
import type { TradeFormData, TradeDirection, TradeResult, EmotionBefore, EmotionAfter } from '../../types/trade';
import { useSettings } from '../../context/SettingsContext';
import { calculatePointsPL, calculateDollarPL, calculateRiskReward } from '../../utils/pnl-calculator';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import StarRating from '../ui/StarRating';
import TagInput from '../ui/TagInput';
import ImageUpload from '../ui/ImageUpload';
import ConfluenceSelector from './ConfluenceSelector';
import { EMOTIONS_BEFORE, EMOTIONS_AFTER } from '../../constants/emotions';

interface TradeFormProps {
  initialData?: Partial<TradeFormData>;
  onSubmit: (data: TradeFormData) => void;
  submitLabel?: string;
}

function getDefaultFormData(settings: { defaultInstrument: string; defaultContracts: number }): TradeFormData {
  return {
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    instrument: settings.defaultInstrument,
    direction: 'long',
    entry: '',
    stopLoss: '',
    takeProfit: '',
    exitPrice: '',
    contracts: settings.defaultContracts,
    result: 'win',
    setupType: '',
    confluences: [],
    emotionBefore: '',
    emotionAfter: '',
    rating: 0,
    preTradeNotes: '',
    postTradeNotes: '',
    setupScreenshot: '',
    resultScreenshot: '',
    tags: [],
  };
}

export default function TradeForm({ initialData, onSubmit, submitLabel = 'Save Trade' }: TradeFormProps) {
  const settings = useSettings();
  const [form, setForm] = useState<TradeFormData>(() => ({
    ...getDefaultFormData(settings),
    ...initialData,
  }));

  useEffect(() => {
    if (initialData) {
      setForm(prev => ({ ...prev, ...initialData }));
    }
  }, [initialData]);

  const update = <K extends keyof TradeFormData>(key: K, value: TradeFormData[K]) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  const instrument = useMemo(
    () => settings.getInstrument(form.instrument),
    [settings, form.instrument]
  );

  const computed = useMemo(() => {
    const entry = Number(form.entry);
    const stopLoss = Number(form.stopLoss);
    const takeProfit = Number(form.takeProfit);
    const exitPrice = Number(form.exitPrice);
    if (!entry) return null;

    const pointsPL = exitPrice ? calculatePointsPL(entry, exitPrice, form.direction) : 0;
    const dollarPL = instrument && exitPrice ? calculateDollarPL(pointsPL, instrument, form.contracts) : 0;
    const rr = entry && stopLoss && takeProfit ? calculateRiskReward(entry, stopLoss, takeProfit, form.direction) : 0;

    return { pointsPL, dollarPL, rr };
  }, [form.entry, form.stopLoss, form.takeProfit, form.exitPrice, form.direction, form.contracts, instrument]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(form);
  };

  const instrumentOptions = settings.instruments.map(i => ({ value: i.symbol, label: `${i.symbol} — ${i.name}` }));
  const directionOptions = [
    { value: 'long', label: 'Long' },
    { value: 'short', label: 'Short' },
  ];
  const resultOptions = [
    { value: 'win', label: 'Win' },
    { value: 'loss', label: 'Loss' },
    { value: 'breakeven', label: 'Breakeven' },
  ];
  const setupOptions = [
    { value: '', label: 'None' },
    ...settings.setupTypes.map(s => ({ value: s, label: s })),
  ];
  const emotionBeforeOptions = [
    { value: '', label: 'None' },
    ...EMOTIONS_BEFORE.map(e => ({ value: e, label: e })),
  ];
  const emotionAfterOptions = [
    { value: '', label: 'None' },
    ...EMOTIONS_AFTER.map(e => ({ value: e, label: e })),
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl">
      {/* Date/Time/Instrument */}
      <div className="grid grid-cols-4 gap-4">
        <Input label="Date" type="date" value={form.date} onChange={e => update('date', e.target.value)} />
        <Input label="Time" type="time" value={form.time} onChange={e => update('time', e.target.value)} />
        <Select label="Instrument" value={form.instrument} onValueChange={v => update('instrument', v)} options={instrumentOptions} />
        <Input
          label="Contracts"
          type="number"
          min={1}
          value={form.contracts}
          onChange={e => update('contracts', parseInt(e.target.value) || 1)}
        />
      </div>

      {/* Direction & Prices */}
      <div className="grid grid-cols-5 gap-4">
        <Select label="Direction" value={form.direction} onValueChange={v => update('direction', v as TradeDirection)} options={directionOptions} />
        <Input label="Entry" type="number" step="any" mono value={form.entry} onChange={e => update('entry', e.target.value === '' ? '' : Number(e.target.value))} />
        <Input label="Stop Loss" type="number" step="any" mono value={form.stopLoss} onChange={e => update('stopLoss', e.target.value === '' ? '' : Number(e.target.value))} />
        <Input label="Take Profit" type="number" step="any" mono value={form.takeProfit} onChange={e => update('takeProfit', e.target.value === '' ? '' : Number(e.target.value))} />
        <Input label="Exit Price" type="number" step="any" mono value={form.exitPrice} onChange={e => update('exitPrice', e.target.value === '' ? '' : Number(e.target.value))} />
      </div>

      {/* Computed values display */}
      {computed && (
        <div className="flex gap-6 p-3 bg-slate-800/50 border border-slate-700 rounded-lg">
          <div>
            <span className="text-xs text-slate-500">Points P&L</span>
            <p className={`font-mono font-medium ${computed.pointsPL > 0 ? 'text-emerald-400' : computed.pointsPL < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {computed.pointsPL > 0 ? '+' : ''}{computed.pointsPL.toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Dollar P&L</span>
            <p className={`font-mono font-medium ${computed.dollarPL > 0 ? 'text-emerald-400' : computed.dollarPL < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
              {computed.dollarPL > 0 ? '+' : ''}${computed.dollarPL.toFixed(2)}
            </p>
          </div>
          <div>
            <span className="text-xs text-slate-500">Risk:Reward</span>
            <p className="font-mono font-medium text-slate-300">
              {computed.rr ? `1:${computed.rr.toFixed(2)}` : '—'}
            </p>
          </div>
        </div>
      )}

      {/* Result & Setup */}
      <div className="grid grid-cols-3 gap-4">
        <Select label="Result" value={form.result} onValueChange={v => update('result', v as TradeResult)} options={resultOptions} />
        <Select label="Setup Type" value={form.setupType} onValueChange={v => update('setupType', v)} options={setupOptions} />
        <StarRating label="Trade Rating" value={form.rating} onChange={v => update('rating', v)} />
      </div>

      {/* Confluences */}
      <ConfluenceSelector
        available={settings.confluences}
        selected={form.confluences}
        onChange={v => update('confluences', v)}
      />

      {/* Emotions */}
      <div className="grid grid-cols-2 gap-4">
        <Select label="Emotion (Before)" value={form.emotionBefore} onValueChange={v => update('emotionBefore', v as EmotionBefore | '')} options={emotionBeforeOptions} />
        <Select label="Emotion (After)" value={form.emotionAfter} onValueChange={v => update('emotionAfter', v as EmotionAfter | '')} options={emotionAfterOptions} />
      </div>

      {/* Notes */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">Pre-Trade Notes</label>
          <textarea
            value={form.preTradeNotes}
            onChange={e => update('preTradeNotes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="What was your thesis?"
          />
        </div>
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">Post-Trade Notes</label>
          <textarea
            value={form.postTradeNotes}
            onChange={e => update('postTradeNotes', e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="What did you learn?"
          />
        </div>
      </div>

      {/* Screenshots */}
      <div className="grid grid-cols-2 gap-4">
        <ImageUpload label="Setup Screenshot" value={form.setupScreenshot} onChange={v => update('setupScreenshot', v)} />
        <ImageUpload label="Result Screenshot" value={form.resultScreenshot} onChange={v => update('resultScreenshot', v)} />
      </div>

      {/* Tags */}
      <TagInput label="Tags" tags={form.tags} onChange={v => update('tags', v)} placeholder="Add tags..." />

      {/* Submit */}
      <div className="flex justify-end gap-3 pt-4 border-t border-slate-700">
        <Button type="submit" size="lg">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
