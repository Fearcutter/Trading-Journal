import { useState } from 'react';
import Card from '../ui/Card';
import PlanFields from './PlanFields';
import { Pct } from './fields';
import DynamicSizingExplainer from './DynamicSizingExplainer';
import { DEFAULT_STRATEGIES } from '../../utils/ror-sim/presets';
import type { Odds, SimSetup, Strategy, TradePlan } from '../../utils/ror-sim/types';

/** The evaluation plan and each funded strategy's rules. */
export default function StrategyEditor({ evalPlan, onEvalPlan, strategies, onStrategies, odds, setup }: {
  evalPlan: TradePlan; onEvalPlan: (p: TradePlan) => void;
  strategies: Strategy[]; onStrategies: (s: Strategy[]) => void;
  odds: Odds; setup: SimSetup;
}) {
  const maxContracts = setup.maxContracts;
  const [openId, setOpenId] = useState(strategies[0]?.id ?? 'A');
  const s = strategies.find(x => x.id === openId) ?? strategies[0];
  const update = (patch: Partial<Strategy>) => onStrategies(strategies.map(x => (x.id === s.id ? { ...x, ...patch } : x)));

  return (
    <Card className="space-y-5">
      <h3 className="text-sm font-semibold text-slate-50">How you trade</h3>
      <PlanFields title="Evaluation" plan={evalPlan} onChange={onEvalPlan} odds={odds} maxContracts={maxContracts} />

      <div className="space-y-3 pt-4 border-t border-slate-700">
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Funded strategies (all five are run and compared)</p>
        <div className="flex flex-wrap gap-1">
          {strategies.map(x => (
            <button
              key={x.id}
              onClick={() => setOpenId(x.id)}
              className={`px-3 py-1.5 text-sm rounded-lg ${x.id === s.id ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              {x.name}
            </button>
          ))}
        </div>
        <p className="text-sm text-slate-400">{DEFAULT_STRATEGIES.find(d => d.id === s.id)?.description ?? s.description} Once the payout goal is reached, the qualifying-day trade below is used until the payout.</p>

        {s.id === 'D' ? (
          <>
            <Pct
              label="Risk this share of the room to the floor"
              value={s.dynamicShare ?? 0.5}
              onChange={v => update({ dynamicShare: v ?? 0.5 })}
              hint="Of the room to the floor, on every trade"
            />
            <DynamicSizingExplainer share={s.dynamicShare ?? 0.5} setup={setup} odds={odds} />
            <PlanFields title="Trades a day" plan={s.build} onChange={build => update({ build })} odds={odds} maxContracts={maxContracts} sizeless />
          </>
        ) : (
          <>
            <PlanFields title={s.afterFirstWin ? 'Until the first win' :'Building to the first payout goal'} plan={s.build} onChange={build => update({ build })} odds={odds} maxContracts={maxContracts} />
            {s.afterFirstWin && (
              <PlanFields title="After the first win" plan={s.afterFirstWin} onChange={afterFirstWin => update({ afterFirstWin })} odds={odds} maxContracts={maxContracts} />
            )}
            <PlanFields title="Building to later payouts (after the first payout)" plan={s.afterPayout} onChange={afterPayout => update({ afterPayout })} odds={odds} maxContracts={maxContracts} />
          </>
        )}
      </div>
    </Card>
  );
}
