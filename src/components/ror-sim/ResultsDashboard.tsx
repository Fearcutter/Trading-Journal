import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, ReferenceLine } from 'recharts';
import Card from '../ui/Card';
import { Stat } from './fields';
import { money, pct, rangeText } from '../../utils/ror-sim/format';
import type { Prob, StrategyResult } from '../../utils/ror-sim/summary';
import type { ExactEval } from '../../utils/ror-sim/exact';

function ProbStat({ label, p, sub, tone }: { label: string; p: Prob; sub?: string; tone?: string }) {
  return <Stat label={label} value={pct(p.p)} sub={`${rangeText(p)}${sub ? ` · ${sub}` : ''}`} tone={tone} />;
}

/** Everything about one strategy: evaluation, funded account, money and the spread of outcomes. */
export default function ResultsDashboard({ r, exact, budget }: { r: StrategyResult; exact: ExactEval | null; budget: number }) {
  const f = r.funded;
  const m = r.money;
  const u = r.untilPayout;
  const chart = r.histogram.map(b => ({ label: money(b.from), mid: (b.from + b.to) / 2, share: b.count / r.runs }));

  return (
    <div className="space-y-4">
      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-50">Evaluation</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <ProbStat label="Pass" p={r.eval.pass} tone="text-emerald-400" sub={exact ? `exact ${pct(exact.pass)}` : undefined} />
          <ProbStat label="Fail" p={r.eval.fail} tone="text-rose-400" />
          <Stat label="Avg trades to pass" value={r.eval.avgTrades.toFixed(1)} />
          <Stat label="Avg days to pass" value={r.eval.avgDays.toFixed(1)} />
          <Stat label="Eval cost per funded account" value={r.eval.costPerFunded === null ? '—' : money(r.eval.costPerFunded)} sub="counting resets" />
        </div>
        {r.eval.unfinished.p > 0 && <p className="text-xs text-slate-500">{pct(r.eval.unfinished.p)} were still going after 120 trading days and count as not passed.</p>}
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-50">Funded account <span className="text-xs font-normal text-slate-500">(of {f.count.toLocaleString()} that passed)</span></h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <ProbStat label="Reach the 1st payout" p={f.atLeastIfFunded[0]} tone="text-emerald-400" />
          <ProbStat label="Blown before any payout" p={f.ruinBeforePayout} tone="text-rose-400" />
          <ProbStat label="Blown at some point" p={f.eventuallyBlown} />
          <Stat label="Avg payouts" value={f.avgPayouts.toFixed(2)} />
          <Stat label="Lifetime payouts" value={money(f.netPerFunded)} sub={`${money(f.grossPerFunded)} before the split`} />
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
                <th className="py-1.5 pr-3 font-medium">Payout</th>
                <th className="py-1.5 pr-3 font-medium">Chance once funded</th>
                <th className="py-1.5 pr-3 font-medium">Chance per eval bought</th>
                <th className="py-1.5 pr-3 font-medium">Avg balance after</th>
                <th className="py-1.5 font-medium">Avg room to floor after</th>
              </tr>
            </thead>
            <tbody>
              {f.atLeastIfFunded.map((p, k) => (
                <tr key={k} className="border-b border-slate-700/50">
                  <td className="py-1.5 pr-3 text-slate-300">{k + 1}{['st', 'nd', 'rd'][k] ?? 'th'}</td>
                  <td className="py-1.5 pr-3 font-mono text-slate-50">{pct(p.p)} <span className="text-[11px] text-slate-500">{rangeText(p)}</span></td>
                  <td className="py-1.5 pr-3 font-mono text-slate-300">{pct(f.atLeast[k].p)}</td>
                  <td className="py-1.5 pr-3 font-mono text-slate-300">{f.afterPayout[k] ? money(f.afterPayout[k].balance) : '—'}</td>
                  <td className="py-1.5 font-mono text-slate-300">{f.afterPayout[k] ? money(f.afterPayout[k].room) : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-slate-500">
          {f.avgDaysToFirst !== null && `First payout after ${f.avgDaysToFirst.toFixed(1)} funded days (${f.avgTradesToFirst?.toFixed(1)} trades) on average. `}
          {f.unfinished.p > 0 && `${pct(f.unfinished.p)} were still trading after 500 days; they count only the payouts they took.`}
        </p>
      </Card>

      <Card className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-50">Money</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat
            label="Net per evaluation bought"
            value={money(m.perEval.mean)}
            sub={`likely ${money(m.perEval.lo)} to ${money(m.perEval.hi)}`}
            tone={m.perEval.mean >= 0 ? 'text-emerald-400' : 'text-rose-400'}
          />
          <Stat label="Back per $1 of fees" value={`$${m.perDollar.toFixed(2)}`} />
          <Stat label="Fees per payout" value={m.costPerPayout === null ? '—' : money(m.costPerPayout)} />
          <Stat label="Bad / typical / good account" value={`${money(m.p10)} / ${money(m.p50)} / ${money(m.p90)}`} sub="10th / 50th / 90th percentile" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-3 border-t border-slate-700/60">
          {u.lose.map(l => <ProbStat key={l.amount} label={`Spend ${money(l.amount)}+ before a payout`} p={l.p} />)}
          <ProbStat label={`Budget ruin (${money(budget)})`} p={u.budgetRuin} tone="text-rose-300" sub="fees run out before a payout" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Stat label="Money needed to reach a payout" value={money(u.avgSpent)} sub={`average · typical ${money(u.medianSpent)}`} />
          <Stat label="Accounts bought per payout" value={u.avgAccounts.toFixed(1)} />
          {r.streaks.map(s => <Stat key={s.k} label={`${s.k} accounts in a row fail`} value={pct(s.p)} sub="without any payout" />)}
        </div>
        {u.neverPaid.p > 0 && <p className="text-xs text-amber-300">{pct(u.neverPaid.p)} of runs bought 100 accounts without a single payout.</p>}
      </Card>

      <Card>
        <h3 className="text-sm font-semibold text-slate-50">Where results land</h3>
        <p className="text-xs text-slate-500 mb-3">Net cash per evaluation bought, across all {r.runs.toLocaleString()} runs. Red bars lost money.</p>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={chart}>
            <XAxis dataKey="label" tick={{ fill: '#94a3b8', fontSize: 10 }} interval="preserveStartEnd" />
            <YAxis tick={{ fill: '#94a3b8', fontSize: 11 }} width={40} tickFormatter={v => `${Math.round(v * 100)}%`} />
            <ReferenceLine x={chart.find(b => b.mid >= 0)?.label} stroke="#475569" strokeDasharray="4 4" />
            <Tooltip
              contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
              formatter={v => [`${(Number(v) * 100).toFixed(1)}%`, 'Share of runs']}
            />
            <Bar dataKey="share">
              {chart.map(b => <Cell key={b.label} fill={b.mid < 0 ? '#f43f5e' : '#10b981'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </Card>
    </div>
  );
}
