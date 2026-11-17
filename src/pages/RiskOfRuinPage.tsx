import { useMemo, useState } from 'react';
import { Play, Loader2, Save, Trash2, RotateCcw } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import NumberInput from '../components/ui/NumberInput';
import SetupEditor from '../components/ror-sim/SetupEditor';
import OddsCard from '../components/ror-sim/OddsCard';
import StrategyEditor from '../components/ror-sim/StrategyEditor';
import QualifyTable from '../components/ror-sim/QualifyTable';
import ResultsDashboard from '../components/ror-sim/ResultsDashboard';
import StrategyComparison from '../components/ror-sim/StrategyComparison';
import AssumptionsCard from '../components/ror-sim/AssumptionsCard';
import { fieldCls } from '../components/ror-sim/fields';
import { useRorResults } from '../components/ror-sim/useRorResults';
import { useSettings } from '../context/SettingsContext';
import { DEFAULT_PROP_FIRMS } from '../constants/prop-firms';
import { firmLabel } from '../components/backtest/usePropFirms';
import {
  DEFAULT_EVAL_PLAN, DEFAULT_ODDS, DEFAULT_QUALIFY, DEFAULT_STRATEGIES, LUCID_FLEX_50K, setupFromFirm,
} from '../utils/ror-sim/presets';
import type { SimInputs } from '../utils/ror-sim/types';

const STORE_KEY = 'rorSim.inputs';
const RUN_OPTIONS = [1000, 10000, 100000];

interface PageState extends SimInputs {
  /** Your own win rates for qualifying stop/target pairs. */
  customRates: Record<string, number>;
}

const DEFAULTS: PageState = {
  setup: LUCID_FLEX_50K, odds: DEFAULT_ODDS, evalPlan: DEFAULT_EVAL_PLAN, qualify: DEFAULT_QUALIFY,
  strategies: DEFAULT_STRATEGIES, runs: 10000, seed: 12345, budget: 1000, customRates: {},
};

function load(): PageState {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

export default function RiskOfRuinPage() {
  const { rorSetups, propFirmOverrides, updateSettings } = useSettings();
  const [state, setStateRaw] = useState<PageState>(load);
  const [selected, setSelected] = useState<string | null>(null);
  const { results, progress, run, ranWith } = useRorResults();

  const setState = (patch: Partial<PageState>) => setStateRaw(prev => {
    const next = { ...prev, ...patch };
    try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
    return next;
  });

  const inputs: SimInputs = useMemo(() => ({
    setup: state.setup, odds: state.odds, evalPlan: state.evalPlan, qualify: state.qualify,
    strategies: state.strategies, runs: state.runs, seed: state.seed, budget: state.budget,
  }), [state]);
  const stale = ranWith !== null && ranWith !== JSON.stringify(inputs);

  const saved = rorSetups ?? [];
  const firms = useMemo(() => DEFAULT_PROP_FIRMS.map(f => propFirmOverrides?.[f.id] ?? f), [propFirmOverrides]);
  const isSaved = saved.some(s => s.id === state.setup.id);

  const strategyResults = state.strategies.map(s => results.strategies[s.id]).filter(Boolean);
  const shownId = selected ?? results.bestId ?? strategyResults[0]?.id;
  const shown = strategyResults.find(r => r.id === shownId);
  const bestName = state.strategies.find(s => s.id === results.bestId)?.name;

  const pickSetup = (value: string) => {
    if (value === '__lucid') setState({ setup: LUCID_FLEX_50K });
    else if (value.startsWith('firm:')) {
      const f = firms.find(x => x.id === value.slice(5));
      if (f) setState({ setup: setupFromFirm(f) });
    } else {
      const s = saved.find(x => x.id === value);
      if (s) setState({ setup: s });
    }
  };
  const saveSetup = () => {
    const s = state.setup;
    updateSettings({ rorSetups: isSaved ? saved.map(x => (x.id === s.id ? s : x)) : [...saved, s] });
  };

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <p className="text-sm text-slate-400">
          Plays out thousands of complete prop firm accounts from your odds and plan: evaluation, funding, payouts, and failure.
          Compare strategies by the cash they actually pay you, and see how often accounts are lost on the way.
        </p>
      </div>

      <Card className="flex items-end gap-3 flex-wrap">
        <label className="space-y-1">
          <span className="block text-xs text-slate-400">Account setup</span>
          <select className={`${fieldCls} min-w-64`} value="" onChange={e => e.target.value && pickSetup(e.target.value)}>
            <option value="">{state.setup.name}{isSaved ? ' (saved)' : ''}: switch…</option>
            {saved.length > 0 && (
              <optgroup label="Your saved setups">
                {saved.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
              </optgroup>
            )}
            <optgroup label="Defaults">
              <option value="__lucid">Lucid Flex 50K (your numbers)</option>
            </optgroup>
            <optgroup label="Start from a Prop Firm EV firm">
              {firms.filter(f => !f.instant).map(f => <option key={f.id} value={`firm:${f.id}`}>{firmLabel(f)}</option>)}
            </optgroup>
          </select>
        </label>
        <Button size="sm" variant="secondary" onClick={saveSetup}><Save size={14} /> {isSaved ? 'Save changes' : 'Save setup'}</Button>
        {isSaved && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => { if (confirm(`Delete the saved setup "${state.setup.name}"?`)) updateSettings({ rorSetups: saved.filter(x => x.id !== state.setup.id) }); }}
          >
            <Trash2 size={14} /> Delete
          </Button>
        )}
        <Button
          size="sm"
          variant="secondary"
          onClick={() => { if (confirm('Put every number on this page back to the starting values? Saved setups are kept.')) setState(DEFAULTS); }}
        >
          <RotateCcw size={14} /> Start over
        </Button>
      </Card>

      <SetupEditor setup={state.setup} onChange={setup => setState({ setup })} />
      <OddsCard odds={state.odds} onChange={odds => setState({ odds })} evalRisk={state.evalPlan.risk} />
      <StrategyEditor
        evalPlan={state.evalPlan}
        onEvalPlan={evalPlan => setState({ evalPlan })}
        strategies={state.strategies}
        onStrategies={strategies => setState({ strategies })}
        odds={state.odds}
        setup={state.setup}
      />
      <QualifyTable
        qualify={state.qualify}
        onChange={qualify => setState({ qualify })}
        odds={state.odds}
        minDayProfit={state.setup.funded.minDayProfit}
        maxContracts={state.setup.maxContracts}
        customRates={state.customRates}
        onCustomRates={customRates => setState({ customRates })}
      />

      <Card className="flex items-end gap-4 flex-wrap">
        <label className="space-y-1">
          <span className="block text-xs text-slate-400">Accounts to simulate (per strategy)</span>
          <div className="flex rounded-lg overflow-hidden border border-slate-600">
            {RUN_OPTIONS.map(n => (
              <button
                key={n}
                onClick={() => setState({ runs: n })}
                className={`px-3 py-1.5 text-sm ${state.runs === n ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
              >
                {n.toLocaleString()}
              </button>
            ))}
          </div>
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-slate-400">Seed (same seed, same results)</span>
          <NumberInput className={`${fieldCls} w-28`} value={state.seed} integer minValue={1} fallback={1} onChange={v => setState({ seed: v ?? 1 })} />
        </label>
        <label className="space-y-1">
          <span className="block text-xs text-slate-400">Budget for buying accounts ($)</span>
          <NumberInput className={`${fieldCls} w-28`} value={state.budget} minValue={0} fallback={0} onChange={v => setState({ budget: v ?? 0 })} />
        </label>
        <Button onClick={() => run(inputs)} disabled={progress !== null}>
          {progress ? <Loader2 size={16} className="animate-spin" /> : <Play size={16} />}
          {progress ? `Running… ${Math.round((progress.done / progress.total) * 100)}%` : 'Run simulation'}
        </Button>
        {stale && !progress && <span className="text-xs text-amber-300 pb-2">Numbers changed since the last run: run again to update.</span>}
      </Card>

      {strategyResults.length > 0 && (
        <StrategyComparison
          results={strategyResults}
          bestId={results.bestId}
          selected={shownId ?? ''}
          onSelect={setSelected}
          evalSizes={results.evalSizes}
          bestName={bestName}
        />
      )}
      {shown && (
        <div className="space-y-2">
          <h2 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">{shown.name}</h2>
          <ResultsDashboard r={shown} exact={results.exact} budget={state.budget} />
        </div>
      )}
      {!ranWith && (
        <p className="text-sm text-slate-500">Press <span className="text-slate-300">Run simulation</span> to see the results.</p>
      )}

      <AssumptionsCard setup={state.setup} />
    </div>
  );
}
