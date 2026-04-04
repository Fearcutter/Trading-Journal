import { useState, useMemo } from 'react';
import type { TradeFormData, TradeDirection, TradeResult, EmotionBefore, EmotionAfter } from '../../types/trade';
import { useSettings } from '../../context/SettingsContext';
import { useApexAccounts } from '../../context/ApexAccountContext';
import { calculatePointsPL, calculateDollarPL, calculateRiskReward, computeResult } from '../../utils/pnl-calculator';
import Input from '../ui/Input';
import Select from '../ui/Select';
import Button from '../ui/Button';
import TagInput from '../ui/TagInput';
import ImageUpload from '../ui/ImageUpload';
import ConfluenceSelector from './ConfluenceSelector';
import { EMOTIONS_BEFORE, EMOTIONS_AFTER } from '../../constants/emotions';
import { nowInTimezone } from '../../utils/timezone';

interface TradeFormProps {
  initialData?: Partial<TradeFormData>;
  onSubmit: (data: TradeFormData) => void;
  submitLabel?: string;
  sessionId?: string;
  hideAccounts?: boolean;
}

function getDefaultFormData(settings: { defaultInstrument: string; defaultContracts: number; tradingTimezone: string }): TradeFormData {
  const now = nowInTimezone(settings.tradingTimezone);
  return {
    date: now.date,
    time: now.time,
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
    confluencesAgainst: [],
    emotionBefore: '',
    emotionAfter: '',
    grade: '',
    preTradeNotes: '',
    postTradeNotes: '',
    setupScreenshot: '',
    resultScreenshot: '',
    additionalScreenshots: [],
    tags: [],
    customFields: {},
    mae: '',
    mfe: '',
    drawback1R: '',
    drawback2R: '',
    returnedToBE: undefined,
  };
}

export default function TradeForm({ initialData, onSubmit, submitLabel = 'Save Trade', sessionId, hideAccounts }: TradeFormProps) {
  const settings = useSettings();
  const { accounts } = useApexAccounts();
  const activeAccounts = useMemo(() => accounts.filter(a => a.status === 'active'), [accounts]);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>(initialData?.accountIds ?? []);

  const toggleAccountId = (id: string) => {
    setSelectedAccountIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const [form, setForm] = useState<TradeFormData>(() => ({
    ...getDefaultFormData(settings),
    ...initialData,
    ...(sessionId ? { sessionId } : {}),
  }));

  const update = <K extends keyof TradeFormData>(key: K, value: TradeFormData[K]) => {
    setForm(prev => {
      const next = { ...prev, [key]: value };
      if (key === 'entry' || key === 'exitPrice' || key === 'direction' || key === 'stopLoss' || key === 'takeProfit') {
        const entry = Number(next.entry);
        const exitPrice = Number(next.exitPrice);
        if (entry && exitPrice) {
          next.result = computeResult(entry, exitPrice, next.direction, Number(next.stopLoss) || undefined, Number(next.takeProfit) || undefined);
        }
      }
      return next;
    });
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
    onSubmit({
      ...form,
      pointsPL: computed?.pointsPL ?? 0,
      dollarPL: computed?.dollarPL ?? 0,
      riskReward: computed?.rr ?? 0,
      mae: form.mae === '' ? undefined : Number(form.mae),
      mfe: form.mfe === '' ? undefined : Number(form.mfe),
      drawback1R: form.drawback1R === '' ? undefined : Number(form.drawback1R),
      drawback2R: form.drawback2R === '' ? undefined : Number(form.drawback2R),
      customFields: form.customFields || {},
      returnedToBE: form.returnedToBE,
      accountIds: selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
      sessionId: form.sessionId,
    });
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
  const gradeOptions = [
    { value: '', label: 'None' },
    ...settings.grades.map(g => ({ value: g, label: g })),
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

      {/* Apex Account Selector */}
      {!hideAccounts && activeAccounts.length > 0 && (
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">Apex Accounts</label>
          <div className="flex flex-wrap gap-2">
            {activeAccounts.map(acc => {
              const selected = selectedAccountIds.includes(acc.id);
              const sizeLabel = acc.accountSize >= 1000 ? `${acc.accountSize / 1000}K` : acc.accountSize;
              return (
                <button
                  key={acc.id}
                  type="button"
                  onClick={() => toggleAccountId(acc.id)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
                    selected
                      ? 'bg-blue-600/20 border-blue-500 text-blue-300'
                      : 'bg-slate-800 border-slate-600 text-slate-400 hover:text-slate-200 hover:border-slate-500'
                  }`}
                >
                  {sizeLabel} {acc.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Direction & Prices */}
      <div className="grid grid-cols-5 gap-4">
        <Select label="Direction" value={form.direction} onValueChange={v => update('direction', v as TradeDirection)} options={directionOptions} />
        <Input label="Entry" type="number" step="any" mono value={form.entry} onChange={e => update('entry', e.target.value === '' ? '' : Number(e.target.value))} />
        <Input label="Stop Loss" type="number" step="any" mono value={form.stopLoss} onChange={e => update('stopLoss', e.target.value === '' ? '' : Number(e.target.value))} />
        <Input label="Take Profit" type="number" step="any" mono value={form.takeProfit} onChange={e => update('takeProfit', e.target.value === '' ? '' : Number(e.target.value))} />
        <Input label="Exit Price" type="number" step="any" mono value={form.exitPrice} onChange={e => update('exitPrice', e.target.value === '' ? '' : Number(e.target.value))} />
      </div>

      {/* Excursion Tracking (Optional) */}
      <div className="grid grid-cols-2 gap-4">
        <Input label="MAE (points)" type="number" step="any" mono value={form.mae} onChange={e => update('mae', e.target.value === '' ? '' : Number(e.target.value))} placeholder="Max Adverse Excursion" />
        <Input label="MFE (points)" type="number" step="any" mono value={form.mfe} onChange={e => update('mfe', e.target.value === '' ? '' : Number(e.target.value))} placeholder="Max Favorable Excursion" />
      </div>

      {/* Runner Drawback Tracking (Optional) */}
      <div className="grid grid-cols-3 gap-4">
        <Input label="Drawback from 1R (pts)" type="number" step="any" mono value={form.drawback1R} onChange={e => update('drawback1R', e.target.value === '' ? '' : Number(e.target.value))} placeholder="Max pullback after reaching 1R" />
        <Input label="Drawback from 2R (pts)" type="number" step="any" mono value={form.drawback2R} onChange={e => update('drawback2R', e.target.value === '' ? '' : Number(e.target.value))} placeholder="Max pullback after reaching 2R" />
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">Returned to BE?</label>
          <div className="inline-flex rounded-lg border border-slate-600 overflow-hidden mt-1">
            <button
              type="button"
              onClick={() => update('returnedToBE', undefined)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                form.returnedToBE === undefined
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              N/A
            </button>
            <button
              type="button"
              onClick={() => update('returnedToBE', true)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                form.returnedToBE === true
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => update('returnedToBE', false)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                form.returnedToBE === false
                  ? 'bg-rose-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              No
            </button>
          </div>
        </div>
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
          {settings.plDisplayMode === 'dollar' && (
            <div>
              <span className="text-xs text-slate-500">Dollar P&L</span>
              <p className={`font-mono font-medium ${computed.dollarPL > 0 ? 'text-emerald-400' : computed.dollarPL < 0 ? 'text-rose-400' : 'text-slate-300'}`}>
                {computed.dollarPL > 0 ? '+' : ''}${computed.dollarPL.toFixed(2)}
              </p>
            </div>
          )}
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
        <Select label="Grade" value={form.grade} onValueChange={v => update('grade', v)} options={gradeOptions} />
      </div>

      {/* Confluences & Categories — ordered by settings */}
      <div className="grid grid-cols-2 gap-4">
        {(settings.categorySectionOrder || ['confluences', 'confluencesAgainst']).map(sectionId => {
          if (sectionId === 'confluences') {
            return (
              <ConfluenceSelector
                key="confluences"
                label="Confluences (FOR)"
                available={settings.confluences}
                selected={form.confluences}
                onChange={v => update('confluences', v)}
              />
            );
          }
          if (sectionId === 'confluencesAgainst') {
            if (settings.confluencesAgainst.length === 0) return null;
            return (
              <ConfluenceSelector
                key="confluencesAgainst"
                label="Confluences (AGAINST)"
                available={settings.confluencesAgainst}
                selected={form.confluencesAgainst}
                onChange={v => update('confluencesAgainst', v)}
              />
            );
          }
          const cat = (settings.customCategories || []).find(c => c.id === sectionId);
          if (!cat) return null;
          const value = (form.customFields?.[cat.id]) || [];
          return (
            <ConfluenceSelector
              key={cat.id}
              label={cat.name}
              available={cat.options}
              selected={value}
              onChange={v => {
                setForm(prev => ({
                  ...prev,
                  customFields: { ...(prev.customFields || {}), [cat.id]: v },
                }));
              }}
            />
          );
        })}
      </div>

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
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <ImageUpload label="Setup Screenshot" value={form.setupScreenshot} onChange={v => update('setupScreenshot', v)} />
          <ImageUpload label="Result Screenshot" value={form.resultScreenshot} onChange={v => update('resultScreenshot', v)} />
        </div>
        {/* Additional screenshots — rendered in pairs, always one empty slot at end */}
        {(() => {
          const slots = [...(form.additionalScreenshots ?? []), ''];
          const pairs: [number, number | null][] = [];
          for (let i = 0; i < slots.length; i += 2) {
            pairs.push([i, i + 1 < slots.length ? i + 1 : null]);
          }
          return pairs.map(([a, b]) => (
            <div key={a} className="grid grid-cols-2 gap-4">
              {[a, b].map(i => {
                if (i === null) return <div key="empty" />;
                const src = slots[i] ?? '';
                return (
                  <ImageUpload
                    key={i}
                    label={`Additional Screenshot ${i + 1}`}
                    value={src}
                    onChange={v => {
                      const next = [...(form.additionalScreenshots ?? [])];
                      if (i >= next.length) next.push(v);
                      else next[i] = v;
                      while (next.length > 0 && next[next.length - 1] === '') next.pop();
                      update('additionalScreenshots', next);
                    }}
                  />
                );
              })}
            </div>
          ));
        })()}
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
