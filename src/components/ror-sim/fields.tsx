import type { ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import NumberInput from '../ui/NumberInput';

export const fieldCls = 'w-full px-2 py-1.5 bg-slate-900 border border-slate-600 rounded-md text-sm font-mono text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500';

/** A labelled box. A ⚠ shows when the rule still needs checking with the firm. */
export function Field({ label, hint, flag, children }: { label: string; hint?: string; flag?: string; children: ReactNode }) {
  return (
    <label className="block space-y-1">
      <span className="flex items-center gap-1 text-xs text-slate-400">
        {label}
        {flag && <span title={`Needs checking: ${flag}`}><AlertTriangle size={12} className="text-amber-400" /></span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-slate-500">{hint}</span>}
    </label>
  );
}

/** A dollar or count box. With `blank`, an empty box means "none". */
export function Num({ label, value, onChange, blank, hint, flag, integer }: {
  label: string; value: number | null; onChange: (v: number | null) => void; blank?: string; hint?: string; flag?: string; integer?: boolean;
}) {
  return (
    <Field label={label} hint={hint} flag={flag}>
      <NumberInput
        step="any"
        className={fieldCls}
        value={value}
        placeholder={blank}
        fallback={blank !== undefined ? undefined : 0}
        minValue={0}
        integer={integer}
        onChange={onChange}
      />
    </Field>
  );
}

/** A percentage box for a 0–1 number. */
export function Pct({ label, value, onChange, blank, hint, flag }: {
  label: string; value: number | null; onChange: (v: number | null) => void; blank?: string; hint?: string; flag?: string;
}) {
  return (
    <Field label={label} hint={hint} flag={flag}>
      <div className="relative">
        <NumberInput
          step="any"
          className={`${fieldCls} pr-6`}
          value={value === null ? null : Math.round(value * 10000) / 100}
          placeholder={blank}
          fallback={blank !== undefined ? undefined : 0}
          minValue={0}
          onChange={v => onChange(v === null ? null : Math.min(100, v) / 100)}
        />
        <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-slate-500">%</span>
      </div>
    </Field>
  );
}

export function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="accent-blue-500" />
      {label}
    </label>
  );
}

export function Stat({ label, value, sub, tone = 'text-slate-50' }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-semibold font-mono ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}
