import { AlertTriangle } from 'lucide-react';
import { Num, Pct, Toggle } from './fields';
import { contractsFor } from '../../utils/ror-sim/engine';
import { estimateWinRate } from '../../utils/ror-sim/price-path';
import { pct } from '../../utils/ror-sim/format';
import type { Odds, TradePlan } from '../../utils/ror-sim/types';

/** The boxes for one kind of trade: size, win chance and how many a day. */
export default function PlanFields({ title, plan, onChange, odds, maxContracts, sizeless }: {
  title: string; plan: TradePlan; onChange: (p: TradePlan) => void; odds: Odds; maxContracts: number;
  /** Strategy D sizes trades itself. */
  sizeless?: boolean;
}) {
  const estimate = estimateWinRate(odds.winRate, odds.rewardRisk, plan.risk, plan.reward);
  const contracts = contractsFor(plan.risk, odds);
  const set = (patch: Partial<TradePlan>) => onChange({ ...plan, ...patch });

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{title}</p>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {!sizeless && <Num label="Risk ($)" value={plan.risk} onChange={v => set({ risk: v ?? 0 })} />}
        {!sizeless && <Num label="Reward ($)" value={plan.reward} onChange={v => set({ reward: v ?? 0 })} />}
        {!sizeless && (
          <Pct
            label="Win rate"
            value={plan.winRate}
            blank={`est. ${pct(estimate)}`}
            onChange={v => set({ winRate: v })}
            hint={plan.winRate === null ? 'Estimated. Type to use your own.' : 'Your own number. Clear for the estimate.'}
          />
        )}
        <Num label="Max trades a day" value={plan.maxTradesPerDay} integer onChange={v => set({ maxTradesPerDay: Math.max(1, v ?? 1) })} />
        {plan.maxTradesPerDay > 1 && (
          <Pct label="Chance of another setup" value={plan.extraChance} onChange={v => set({ extraChance: v ?? 0 })} hint="For each trade after the first" />
        )}
      </div>
      {plan.maxTradesPerDay > 1 && (
        <div className="flex gap-5 flex-wrap">
          <Toggle label="Stop for the day after a win" checked={plan.stopAfterWin} onChange={v => set({ stopAfterWin: v })} />
          <Toggle label="Stop for the day after a loss" checked={plan.stopAfterLoss} onChange={v => set({ stopAfterLoss: v })} />
        </div>
      )}
      {!sizeless && odds.riskPerContract > 0 && (
        <p className={`text-[11px] flex items-center gap-1 ${contracts > maxContracts ? 'text-amber-300' : 'text-slate-500'}`}>
          {contracts > maxContracts && <AlertTriangle size={11} />}
          {contracts} contract{contracts === 1 ? '' : 's'} at your usual stop{contracts > maxContracts ? `: more than the ${maxContracts} allowed. Use a tighter stop or a smaller risk.` : ''}
        </p>
      )}
    </div>
  );
}
