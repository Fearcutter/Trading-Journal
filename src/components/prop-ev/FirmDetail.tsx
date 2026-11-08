import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, ReferenceLine } from 'recharts';
import Card from '../ui/Card';
import FirmRulesEditor from './FirmRulesEditor';
import type { FirmConfig, SimSummary } from '../../utils/prop-ev';
import type { PropEvFirmResult } from '../../workers/prop-ev.worker';

const pct = (x: number) => `${Math.round(x * 100)}%`;
const money = (x: number) => `${x < 0 ? '-' : ''}$${Math.abs(Math.round(x)).toLocaleString('en-US')}`;

interface Props {
  firm: FirmConfig;
  result: PropEvFirmResult | undefined;
  shown: SimSummary | null;
  accounts: number;
  edited: boolean;
  onSave: (next: FirmConfig) => void;
  onReset: () => void;
}

/** One firm: EV at each risk size, the spread of outcomes, and its editable rules. */
export default function FirmDetail({ firm, result, shown, accounts, edited, onSave, onReset }: Props) {
  const sweep = result?.sweep ?? [];
  const bestRisk = result?.best?.riskPerTrade;

  return (
    <Card className="space-y-5">
      <div>
        <h3 className="text-base font-semibold text-slate-50">{firm.firm} {firm.plan} {firm.size / 1000}K</h3>
        <p className="text-xs text-slate-500">Each risk size below is 1,000 simulated evaluations; the headline numbers use 5,000.</p>
      </div>

      {shown && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
          <div><p className="text-xs text-slate-500">Median days to pass</p><p className="font-mono text-slate-50">{shown.medianDaysToPass ?? '—'}</p></div>
          <div><p className="text-xs text-slate-500">Ran out of days</p><p className="font-mono text-slate-50">{pct(shown.evalTimeoutRate)}</p></div>
          <div><p className="text-xs text-slate-500">Blown after funding</p><p className="font-mono text-slate-50">{pct(shown.fundedBlowRate)}</p><p className="text-[11px] text-slate-500">of passed accounts</p></div>
          <div><p className="text-xs text-slate-500">Avg payouts per eval</p><p className="font-mono text-slate-50">{shown.avgPayouts.toFixed(2)}</p></div>
          <div>
            <p className="text-xs text-slate-500">Bad / typical / good eval</p>
            <p className="font-mono text-slate-50">{money(shown.p10)} / {money(shown.p50)} / {money(shown.p90)}</p>
            <p className="text-[11px] text-slate-500">10th / 50th / 90th percentile</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">× {accounts} copied accounts</p>
            <p className={`font-mono ${shown.ev >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{money(shown.ev * accounts)}</p>
            <p className="text-[11px] text-slate-500">worst 10%: {money(shown.p10 * accounts)}</p>
          </div>
        </div>
      )}

      {sweep.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-300 mb-2">EV per evaluation by risk per trade</p>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={sweep.map(p => ({ risk: p.riskPerTrade, ev: Math.round(p.ev) }))}>
                <XAxis dataKey="risk" tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => `$${v}`} />
                <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} tickLine={false} axisLine={false} tickFormatter={v => money(v)} />
                <Tooltip
                  contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                  labelStyle={{ color: '#94a3b8' }}
                  labelFormatter={v => `Risk $${v} per trade`}
                  formatter={(value: number | undefined) => [money(value ?? 0), 'EV']}
                />
                <ReferenceLine y={0} stroke="#475569" />
                {bestRisk !== undefined && <ReferenceLine x={bestRisk} stroke="#34d399" strokeDasharray="4 4" />}
                <Line type="monotone" dataKey="ev" stroke="#2dd4bf" strokeWidth={2} dot={{ r: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
                  <th className="py-1.5">Risk / trade</th>
                  <th className="py-1.5 text-right">Pass</th>
                  <th className="py-1.5 text-right">Blown in eval</th>
                  <th className="py-1.5 text-right">Got paid</th>
                  <th className="py-1.5 text-right">EV</th>
                </tr>
              </thead>
              <tbody>
                {sweep.map(p => (
                  <tr key={p.riskPerTrade} className={`border-t border-slate-700/50 ${p.riskPerTrade === bestRisk ? 'bg-emerald-900/25' : ''}`}>
                    <td className="py-1 font-mono text-slate-200">${p.riskPerTrade}</td>
                    <td className="py-1 text-right font-mono text-slate-300">{pct(p.passRate)}</td>
                    <td className="py-1 text-right font-mono text-slate-300">{pct(p.evalBlowRate)}</td>
                    <td className="py-1 text-right font-mono text-slate-300">{pct(p.payoutRate)}</td>
                    <td className={`py-1 text-right font-mono ${p.ev >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{money(p.ev)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <div className="border-t border-slate-700 pt-4">
        <h3 className="text-sm font-medium text-slate-300 mb-3">Rules used</h3>
        <FirmRulesEditor key={JSON.stringify(firm)} firm={firm} edited={edited} onSave={onSave} onReset={onReset} />
      </div>
    </Card>
  );
}
