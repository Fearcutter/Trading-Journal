import { AlertTriangle, Check } from 'lucide-react';
import Card from '../ui/Card';
import { Field, Num, Pct, fieldCls } from './fields';
import type { DrawdownRule, DrawdownType } from '../../utils/prop-ev';
import type { SimSetup } from '../../utils/ror-sim/types';
import { money } from '../../utils/ror-sim/format';

const DD_TYPES: { value: DrawdownType; label: string }[] = [
  { value: 'eod_trailing', label: 'End-of-day trailing' },
  { value: 'intraday_trailing', label: 'Intraday trailing' },
  { value: 'static', label: 'Static' },
];

function Drawdown({ value, onChange, size, lockFlag }: { value: DrawdownRule; onChange: (v: DrawdownRule) => void; size: number; lockFlag?: string }) {
  return (
    <>
      <Num label="Max drawdown ($)" value={value.amount} onChange={v => onChange({ ...value, amount: v ?? 0 })} />
      <Field label="Drawdown type">
        <select className={fieldCls} value={value.type} onChange={e => onChange({ ...value, type: e.target.value as DrawdownType })}>
          {DD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </Field>
      <Num
        label="Final floor (stops trailing at)"
        value={value.lockAboveStart === null ? null : size + value.lockAboveStart}
        blank="never"
        flag={lockFlag}
        onChange={v => onChange({ ...value, lockAboveStart: v === null ? null : v - size })}
        hint={value.lockAboveStart === null ? 'Empty: the floor never stops trailing' : undefined}
      />
    </>
  );
}

/** Every rule of the account, editable, with ⚠ on anything not yet confirmed. */
export default function SetupEditor({ setup, onChange }: { setup: SimSetup; onChange: (s: SimSetup) => void }) {
  const flag = (word: string) => setup.verify.find(v => v.toLowerCase().includes(word));
  const ev = setup.eval;
  const f = setup.funded;
  const setEval = (patch: Partial<SimSetup['eval']>) => onChange({ ...setup, eval: { ...ev, ...patch } });
  const setFunded = (patch: Partial<SimSetup['funded']>) => onChange({ ...setup, funded: { ...f, ...patch } });

  return (
    <Card className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Field label="Name">
          <input className={fieldCls} value={setup.name} onChange={e => onChange({ ...setup, name: e.target.value })} />
        </Field>
        <Num label="Starting balance ($)" value={setup.size} onChange={v => onChange({ ...setup, size: v ?? 0 })} />
        <Num label="Max contracts (minis)" value={setup.maxContracts} integer onChange={v => onChange({ ...setup, maxContracts: v ?? 1 })} />
        <Field label="Can a loss during the day break the account?" hint="Most firms, Lucid included: yes">
          <select className={fieldCls} value={setup.breach} onChange={e => onChange({ ...setup, breach: e.target.value as SimSetup['breach'] })}>
            <option value="intraday">Yes, the moment it touches the floor</option>
            <option value="close">Only checked at the close</option>
          </select>
        </Field>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Evaluation</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Num label="Evaluation price ($)" value={ev.fee} flag={flag('price')} onChange={v => setEval({ fee: v ?? 0 })} />
          <Num label="Reset fee ($)" value={ev.resetFee} flag={flag('reset')} onChange={v => setEval({ resetFee: v ?? 0 })} />
          <Num label="Profit target ($)" value={ev.profitTarget} onChange={v => setEval({ profitTarget: v ?? 0 })} />
          <Num label="Best-day rule (%)" value={ev.consistencyPct} blank="none" onChange={v => setEval({ consistencyPct: v })} hint="Best day ÷ total profit" />
          <Drawdown value={ev.drawdown} size={setup.size} onChange={drawdown => setEval({ drawdown })} />
          <Num label="Minimum days to pass" value={ev.minDays} integer flag={flag('minimum days')} onChange={v => setEval({ minDays: v ?? 0 })} />
          <Num label="Daily loss limit ($)" value={ev.dailyLossLimit} blank="none" onChange={v => setEval({ dailyLossLimit: v })} />
        </div>
      </div>

      <div>
        <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Funded account</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Num label="Activation fee ($)" value={f.activationFee} flag={flag('activation')} onChange={v => setFunded({ activationFee: v ?? 0 })} />
          <Drawdown value={f.drawdown} size={setup.size} lockFlag={flag('floor')} onChange={drawdown => setFunded({ drawdown })} />
          <Num label="Qualifying days per payout" value={f.minDaysPerPayout} integer flag={flag('qualifying')} onChange={v => setFunded({ minDaysPerPayout: v ?? 0 })} />
          <Num label="Qualifying day: at least ($)" value={f.minDayProfit} onChange={v => setFunded({ minDayProfit: v ?? 0 })} />
          <Num label="Max payout ($)" value={f.payoutCaps[0] ?? null} blank="no cap" onChange={v => setFunded({ payoutCaps: v ? [v] : [] })} />
          <Pct
            label="Payout at most this share of profit"
            value={f.payoutShareOfProfit}
            blank="no limit"
            flag={flag('half your profit')}
            onChange={v => setFunded({ payoutShareOfProfit: v })}
            hint={f.payoutShareOfProfit && f.payoutCaps[0] ? `Full ${money(f.payoutCaps[0])} needs ${money(f.payoutCaps[0] / f.payoutShareOfProfit)} profit` : undefined}
          />
          <Num label="Minimum payout ($)" value={f.minPayout} flag={flag('minimum payout')} onChange={v => setFunded({ minPayout: v ?? 0 })} />
          <Num label="Buffer kept above start ($)" value={f.buffer} onChange={v => setFunded({ buffer: v ?? 0 })} />
          <Pct label="Your profit split" value={f.split} onChange={v => setFunded({ split: v ?? 0 })} />
          <Num label="Number of payouts allowed" value={f.maxPayouts} blank="no limit" integer flag={flag('payouts')} onChange={v => setFunded({ maxPayouts: v })} />
          <Num label="Best-day rule per payout (%)" value={f.consistencyPct} blank="none" onChange={v => setFunded({ consistencyPct: v })} />
          <Num label="Daily loss limit ($)" value={f.dailyLossLimit} blank="none" onChange={v => setFunded({ dailyLossLimit: v })} />
          <Field label="When to take a payout">
            <select className={fieldCls} value={setup.payoutTiming} onChange={e => onChange({ ...setup, payoutTiming: e.target.value as SimSetup['payoutTiming'] })}>
              <option value="max">Wait for the biggest allowed</option>
              <option value="asap">As soon as allowed</option>
            </select>
          </Field>
        </div>
      </div>

      {setup.verify.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 space-y-1.5">
          <p className="text-sm text-amber-300 flex items-center gap-1.5"><AlertTriangle size={14} /> Still to confirm with the firm. Tick one off once you've checked it.</p>
          <ul className="space-y-1">
            {setup.verify.map(v => (
              <li key={v} className="flex items-center gap-2 text-xs text-slate-300">
                <button
                  onClick={() => onChange({ ...setup, verify: setup.verify.filter(x => x !== v) })}
                  title="Mark as checked"
                  className="w-4 h-4 rounded border border-slate-500 hover:border-emerald-400 hover:text-emerald-300 flex items-center justify-center text-transparent"
                >
                  <Check size={11} />
                </button>
                {v}
              </li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}
