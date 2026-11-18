import { Trophy } from 'lucide-react';
import Card from '../ui/Card';
import { money, pct } from '../../utils/ror-sim/format';
import type { StrategyResult } from '../../utils/ror-sim/summary';
import type { EvalSizeRow } from '../../workers/ror-sim.worker';

/** A–E side by side, best net EV marked, plus evaluation risk sizes. */
export default function StrategyComparison({ results, bestId, selected, onSelect, evalSizes, bestName }: {
  results: StrategyResult[]; bestId: string | null; selected: string; onSelect: (id: string) => void;
  evalSizes: EvalSizeRow[]; bestName: string | undefined;
}) {
  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-50">Strategy comparison</h3>
        <p className="text-xs text-slate-500">Ranked by net cash per evaluation bought (payouts kept minus all fees), not by win rate. Per eval bought = eval pass × 1st payout once funded. Payout timing counts funded trading days and trades, for accounts that got there. Click a row for its full results.</p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
              <th className="py-2 pr-3 font-medium">Strategy</th>
              <th className="py-2 pr-3 font-medium">Net per eval</th>
              <th className="py-2 pr-3 font-medium">Eval pass</th>
              <th className="py-2 pr-3 font-medium">1st payout (funded)</th>
              <th className="py-2 pr-3 font-medium">1st payout per eval bought</th>
              <th className="py-2 pr-3 font-medium">Blown before payout</th>
              <th className="py-2 pr-3 font-medium">Avg payouts</th>
              <th className="py-2 pr-3 font-medium">To 1st payout</th>
              <th className="py-2 pr-3 font-medium">Between payouts</th>
              <th className="py-2 pr-3 font-medium">Money to a payout</th>
              <th className="py-2 font-medium">Bad / typical / good</th>
            </tr>
          </thead>
          <tbody>
            {[...results].sort((a, b) => b.money.perEval.mean - a.money.perEval.mean).map(r => (
              <tr
                key={r.id}
                onClick={() => onSelect(r.id)}
                className={`border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/30 ${r.id === selected ? 'bg-blue-500/10' : ''}`}
              >
                <td className="py-2 pr-3 text-slate-100">
                  <span className="inline-flex items-center gap-1.5">{r.id === bestId && <Trophy size={13} className="text-amber-300" />}{r.name}</span>
                </td>
                <td className={`py-2 pr-3 font-mono ${r.money.perEval.mean >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {money(r.money.perEval.mean)}
                  <span className="block text-[11px] text-slate-500">{money(r.money.perEval.lo)} to {money(r.money.perEval.hi)}</span>
                </td>
                <td className="py-2 pr-3 font-mono text-slate-400">{pct(r.eval.pass.p)}</td>
                <td className="py-2 pr-3 font-mono text-slate-200">{pct(r.funded.atLeastIfFunded[0].p)}</td>
                <td className="py-2 pr-3 font-mono text-slate-50">{pct(r.funded.atLeast[0].p)}</td>
                <td className="py-2 pr-3 font-mono text-slate-200">{pct(r.funded.ruinBeforePayout.p)}</td>
                <td className="py-2 pr-3 font-mono text-slate-200">{r.funded.avgPayouts.toFixed(2)}</td>
                <td className="py-2 pr-3 font-mono text-slate-200">
                  {r.funded.avgDaysToFirst === null ? '—' : `${r.funded.avgDaysToFirst.toFixed(1)} days`}
                  {r.funded.avgTradesToFirst !== null && <span className="block text-[11px] text-slate-500">{r.funded.avgTradesToFirst.toFixed(1)} trades</span>}
                </td>
                <td className="py-2 pr-3 font-mono text-slate-200">
                  {r.funded.avgDaysBetween === null ? '—' : `${r.funded.avgDaysBetween.toFixed(1)} days`}
                  {r.funded.avgTradesBetween !== null && <span className="block text-[11px] text-slate-500">{r.funded.avgTradesBetween.toFixed(1)} trades</span>}
                </td>
                <td className="py-2 pr-3 font-mono text-slate-200">{money(r.untilPayout.avgSpent)}</td>
                <td className="py-2 font-mono text-slate-400 text-xs">{money(r.money.p10)} / {money(r.money.p50)} / {money(r.money.p90)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {evalSizes.length > 0 && (
        <div className="pt-3 border-t border-slate-700/60 space-y-2">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Evaluation risk sizes{bestName ? `, then ${bestName} once funded` : ''}</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
                  <th className="py-1.5 pr-3 font-medium">Risk / reward</th>
                  <th className="py-1.5 pr-3 font-medium">Pass</th>
                  <th className="py-1.5 pr-3 font-medium">Avg days to pass</th>
                  <th className="py-1.5 pr-3 font-medium">Avg trades to pass</th>
                  <th className="py-1.5 font-medium">Net per eval</th>
                </tr>
              </thead>
              <tbody>
                {evalSizes.map(row => (
                  <tr key={row.risk} className="border-b border-slate-700/50">
                    <td className="py-1.5 pr-3 font-mono text-slate-200">{money(row.risk)} / {money(row.reward)}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-200">{pct(row.pass.p)}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-300">{row.avgDays.toFixed(1)}</td>
                    <td className="py-1.5 pr-3 font-mono text-slate-300">{row.avgTrades.toFixed(1)}</td>
                    <td className={`py-1.5 font-mono ${row.perEval.mean >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{money(row.perEval.mean)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </Card>
  );
}
