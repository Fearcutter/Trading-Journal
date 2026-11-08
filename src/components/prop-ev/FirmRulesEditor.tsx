import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import type { FirmConfig, DrawdownRule, DrawdownType } from '../../utils/prop-ev';

interface Props {
  firm: FirmConfig;
  edited: boolean;
  onSave: (next: FirmConfig) => void;
  onReset: () => void;
}

const DD_TYPES: { value: DrawdownType; label: string }[] = [
  { value: 'eod_trailing', label: 'End-of-day trailing' },
  { value: 'intraday_trailing', label: 'Intraday trailing' },
  { value: 'static', label: 'Static' },
];

const fieldCls = 'w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded-md text-sm font-mono text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500';

/** A number box; blank means "none" when `blank` is given. */
function Num({ label, value, onChange, blank, hint }: {
  label: string; value: number | null; onChange: (v: number | null) => void; blank?: string; hint?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="block text-xs text-slate-400">{label}</span>
      <input
        type="number"
        step="any"
        className={fieldCls}
        value={value ?? ''}
        placeholder={blank}
        onChange={e => {
          const raw = e.target.value;
          if (raw === '') onChange(blank !== undefined ? null : 0);
          else if (Number.isFinite(Number(raw))) onChange(Number(raw));
        }}
      />
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

function DrawdownFields({ value, onChange }: { value: DrawdownRule; onChange: (v: DrawdownRule) => void }) {
  return (
    <>
      <Num label="Drawdown ($)" value={value.amount} onChange={v => onChange({ ...value, amount: v ?? 0 })} />
      <label className="block space-y-1">
        <span className="block text-xs text-slate-400">Drawdown type</span>
        <select className={fieldCls} value={value.type} onChange={e => onChange({ ...value, type: e.target.value as DrawdownType })}>
          {DD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>
      <Num
        label="Stops trailing at start + ($)"
        value={value.lockAboveStart}
        blank="never"
        onChange={v => onChange({ ...value, lockAboveStart: v })}
        hint="e.g. 100 = floor stops at $50,100 on a 50K"
      />
    </>
  );
}

/** Every rule the simulation uses for one firm, editable. */
export default function FirmRulesEditor({ firm, edited, onSave, onReset }: Props) {
  const [draft, setDraft] = useState<FirmConfig>(firm);
  const [capsText, setCapsText] = useState(firm.funded.payoutCaps.join(', '));
  const dirty = JSON.stringify(draft) !== JSON.stringify(firm) || capsText !== firm.funded.payoutCaps.join(', ');

  const ev = (patch: Partial<FirmConfig['eval']>) => setDraft(d => ({ ...d, eval: { ...d.eval, ...patch } }));
  const fu = (patch: Partial<FirmConfig['funded']>) => setDraft(d => ({ ...d, funded: { ...d.funded, ...patch } }));

  const save = (extra: Partial<FirmConfig> = {}) => {
    const caps = capsText.split(',').map(s => Number(s.trim())).filter(n => Number.isFinite(n) && n >= 0 && capsText.trim() !== '');
    onSave({ ...draft, ...extra, funded: { ...draft.funded, payoutCaps: caps } });
  };

  return (
    <div className="space-y-4">
      {firm.verify.length > 0 && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm text-amber-200">
          <p className="flex items-center gap-2 font-medium"><AlertTriangle size={14} /> Check these on the firm's site</p>
          <ul className="mt-1 ml-5 list-disc text-xs text-amber-200/80 space-y-0.5">
            {firm.verify.map(v => <li key={v}>{v}</li>)}
          </ul>
        </div>
      )}
      <p className="text-xs text-slate-500">
        Last checked {firm.lastChecked}{edited ? ' · edited by you' : ''}. {firm.notes}
      </p>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Evaluation</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Num label="Price ($)" value={draft.eval.fee} onChange={v => ev({ fee: v ?? 0 })} />
          <label className="block space-y-1">
            <span className="block text-xs text-slate-400">Billing</span>
            <select className={fieldCls} value={draft.eval.billing} onChange={e => ev({ billing: e.target.value as 'monthly' | 'one_time' })}>
              <option value="one_time">One-time</option>
              <option value="monthly">Monthly</option>
            </select>
          </label>
          <Num label="Profit target ($)" value={draft.eval.profitTarget} onChange={v => ev({ profitTarget: v ?? 0 })} />
          <DrawdownFields value={draft.eval.drawdown} onChange={drawdown => ev({ drawdown })} />
          <Num label="Daily loss limit ($)" value={draft.eval.dailyLossLimit} blank="none" onChange={v => ev({ dailyLossLimit: v })} hint="Stops the day, doesn't fail" />
          <Num label="Best-day rule (%)" value={draft.eval.consistencyPct} blank="none" onChange={v => ev({ consistencyPct: v })} hint="Best day ≤ this % of profit" />
          <Num label="Min trading days" value={draft.eval.minDays} onChange={v => ev({ minDays: v ?? 0 })} />
          <Num label="Max trading days" value={draft.eval.maxDays} blank="no limit" onChange={v => ev({ maxDays: v })} />
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Funded account</h4>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <Num label="Activation fee ($)" value={draft.funded.activationFee} onChange={v => fu({ activationFee: v ?? 0 })} />
          <DrawdownFields value={draft.funded.drawdown} onChange={drawdown => fu({ drawdown })} />
          <Num label="Daily loss limit ($)" value={draft.funded.dailyLossLimit} blank="none" onChange={v => fu({ dailyLossLimit: v })} />
          <Num label="Best-day rule (%)" value={draft.funded.consistencyPct} blank="none" onChange={v => fu({ consistencyPct: v })} hint="Per payout cycle" />
          <Num label="Days per payout" value={draft.funded.minDaysPerPayout} onChange={v => fu({ minDaysPerPayout: v ?? 0 })} />
          <Num label="Min profit for a day to count ($)" value={draft.funded.minDayProfit} onChange={v => fu({ minDayProfit: v ?? 0 })} hint="0 = any trading day" />
          <Num label="Min profit per cycle ($)" value={draft.funded.minCycleProfit ?? 0} onChange={v => fu({ minCycleProfit: v ?? 0 })} hint="Whole payout cycle" />
          <Num label="Buffer ($)" value={draft.funded.buffer} onChange={v => fu({ buffer: v ?? 0 })} hint="Balance must stay above start + this" />
          <Num label="Min payout ($)" value={draft.funded.minPayout} onChange={v => fu({ minPayout: v ?? 0 })} />
          <label className="block space-y-1">
            <span className="block text-xs text-slate-400">Payout caps ($)</span>
            <input className={fieldCls} value={capsText} placeholder="no cap" onChange={e => setCapsText(e.target.value)} />
            <span className="block text-[11px] text-slate-500">1st, 2nd, …; last repeats; 0 = no cap</span>
          </label>
          <Num
            label="Max share of profit (%)"
            value={draft.funded.payoutShareOfProfit === null ? null : Math.round(draft.funded.payoutShareOfProfit * 100)}
            blank="no limit"
            onChange={v => fu({ payoutShareOfProfit: v === null ? null : v / 100 })}
          />
          <Num label="Your split (%)" value={Math.round(draft.funded.split * 100)} onChange={v => fu({ split: (v ?? 0) / 100 })} />
          <Num label="Max payouts" value={draft.funded.maxPayouts} blank="no limit" onChange={v => fu({ maxPayouts: v })} hint="Sim ends after this (e.g. moved to live)" />
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!dirty}
          onClick={() => save()}
          className="px-3 py-1.5 text-sm font-medium rounded-lg bg-blue-600 text-white disabled:opacity-40 hover:bg-blue-500"
        >
          Save rules
        </button>
        {firm.verify.length > 0 && (
          <button
            type="button"
            onClick={() => save({ verify: [], lastChecked: new Date().toISOString().slice(0, 10) })}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-700 text-slate-200 hover:bg-slate-600"
          >
            Save and mark as checked
          </button>
        )}
        {edited && (
          <button
            type="button"
            onClick={() => { onReset(); }}
            className="px-3 py-1.5 text-sm font-medium rounded-lg bg-slate-700 text-slate-400 hover:text-slate-200"
          >
            Reset to researched rules
          </button>
        )}
      </div>
    </div>
  );
}
