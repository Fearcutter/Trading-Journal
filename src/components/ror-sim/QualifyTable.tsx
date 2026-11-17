import Card from '../ui/Card';
import Button from '../ui/Button';
import NumberInput from '../ui/NumberInput';
import PlanFields from './PlanFields';
import { breakEven, estimateWinRate } from '../../utils/ror-sim/price-path';
import { tradeCost } from '../../utils/ror-sim/engine';
import { QUALIFY_ROWS } from '../../utils/ror-sim/presets';
import { money, pct } from '../../utils/ror-sim/format';
import type { Odds, TradePlan } from '../../utils/ror-sim/types';

const key = (risk: number, reward: number) => `${risk}/${reward}`;

/**
 * Qualifying-day trades: stop/target pairs with their break-even, estimated and your own
 * win rates, and the one in use.
 */
export default function QualifyTable({ qualify, onChange, odds, minDayProfit, maxContracts, customRates, onCustomRates }: {
  qualify: TradePlan; onChange: (p: TradePlan) => void; odds: Odds; minDayProfit: number; maxContracts: number;
  customRates: Record<string, number>; onCustomRates: (r: Record<string, number>) => void;
}) {
  const rows = QUALIFY_ROWS.some(([r, w]) => r === qualify.risk && w === qualify.reward) ? QUALIFY_ROWS : [...QUALIFY_ROWS, [qualify.risk, qualify.reward] as [number, number]];
  const netTarget = qualify.reward - tradeCost(qualify.risk, odds);

  return (
    <Card className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold text-slate-50">Qualifying days</h3>
        <p className="text-xs text-slate-500">
          Once the payout goal is reached, these trades collect the remaining qualifying days. A smaller target doesn't keep your {pct(odds.winRate, 0)}:
          the estimate assumes price drifts your way at the strength that gives your win rate at {odds.rewardRisk}:1, with the stop the same distance as usual. It's an estimate; type your own number if you have one.
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
              <th className="py-2 pr-3 font-medium">Stop</th>
              <th className="py-2 pr-3 font-medium">Target</th>
              <th className="py-2 pr-3 font-medium">Break-even</th>
              <th className="py-2 pr-3 font-medium">Estimate</th>
              <th className="py-2 pr-3 font-medium">Your win rate</th>
              <th className="py-2 pr-3 font-medium">Per trade</th>
              <th className="py-2 font-medium" />
            </tr>
          </thead>
          <tbody>
            {rows.map(([risk, reward]) => {
              const k = key(risk, reward);
              const est = estimateWinRate(odds.winRate, odds.rewardRisk, risk, reward);
              const own = customRates[k];
              const p = own ?? est;
              const ev = p * reward - (1 - p) * risk - tradeCost(risk, odds);
              const inUse = qualify.risk === risk && qualify.reward === reward;
              return (
                <tr key={k} className={`border-b border-slate-700/50 ${inUse ? 'bg-blue-500/5' : ''}`}>
                  <td className="py-2 pr-3 font-mono text-slate-200">{money(risk)}</td>
                  <td className="py-2 pr-3 font-mono text-slate-200">{money(reward)}</td>
                  <td className="py-2 pr-3 font-mono text-slate-400">{pct(breakEven(risk, reward))}</td>
                  <td className="py-2 pr-3 font-mono text-slate-400">{pct(est)}</td>
                  <td className="py-2 pr-3">
                    <NumberInput
                      step="any"
                      value={own === undefined ? null : Math.round(own * 1000) / 10}
                      placeholder="—"
                      minValue={0}
                      onChange={v => {
                        const next = { ...customRates };
                        if (v === null) delete next[k]; else next[k] = Math.min(100, v) / 100;
                        onCustomRates(next);
                        if (inUse) onChange({ ...qualify, winRate: v === null ? null : Math.min(100, v) / 100 });
                      }}
                      className="w-20 px-2 py-1 bg-slate-900 border border-slate-600 rounded-md text-sm font-mono text-slate-50"
                    />
                  </td>
                  <td className={`py-2 pr-3 font-mono ${ev >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{money(ev)}</td>
                  <td className="py-2">
                    {inUse
                      ? <span className="text-xs text-blue-300">In use</span>
                      : <Button size="sm" variant="secondary" onClick={() => onChange({ ...qualify, risk, reward, winRate: own ?? null })}>Use</Button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <PlanFields title="Qualifying trade in use" plan={qualify} onChange={onChange} odds={odds} maxContracts={maxContracts} />
      {netTarget < minDayProfit && (
        <p className="text-xs text-amber-300">
          After costs a win nets {money(netTarget)}, under the {money(minDayProfit)} a qualifying day needs, so one win alone won't count.
        </p>
      )}
    </Card>
  );
}
