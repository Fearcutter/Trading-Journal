/// <reference lib="webworker" />
import { summarize, type Mean, type Prob, type StrategyResult } from '../utils/ror-sim/summary';
import { exactEvalPass, type ExactEval } from '../utils/ror-sim/exact';
import { makeWinChance, tradeCost } from '../utils/ror-sim/engine';
import type { SimInputs } from '../utils/ror-sim/types';

export interface RorRequest { requestId: number; inputs: SimInputs }

export interface EvalSizeRow { risk: number; reward: number; pass: Prob; avgDays: number; avgTrades: number; perEval: Mean }

export type RorMessage =
  | { requestId: number; kind: 'strategy'; result: StrategyResult; done: number; total: number }
  | { requestId: number; kind: 'done'; exact: ExactEval | null; evalSizes: EvalSizeRow[]; bestId: string | null };

export const EVAL_SIZES = [250, 500, 750, 1000];

self.onmessage = (e: MessageEvent<RorRequest>) => {
  const { requestId, inputs } = e.data;
  const total = inputs.strategies.length + EVAL_SIZES.length;
  const results: StrategyResult[] = [];
  inputs.strategies.forEach((s, i) => {
    const result = summarize(inputs, s);
    results.push(result);
    self.postMessage({ requestId, kind: 'strategy', result, done: i + 1, total } satisfies RorMessage);
  });

  const best = results.reduce<StrategyResult | null>((b, r) => (!b || r.money.perEval.mean > b.money.perEval.mean ? r : b), null);
  const bestStrategy = inputs.strategies.find(s => s.id === best?.id);

  // Evaluation risk sizes, each followed by the best strategy once funded
  const ratio = inputs.evalPlan.risk > 0 ? inputs.evalPlan.reward / inputs.evalPlan.risk : 1;
  const sizeRuns = { ...inputs, runs: Math.min(inputs.runs, 20000) };
  const evalSizes: EvalSizeRow[] = bestStrategy
    ? EVAL_SIZES.map((risk, i) => {
      const plan = { ...inputs.evalPlan, risk, reward: Math.round(risk * ratio) };
      const r = summarize(sizeRuns, bestStrategy, plan);
      self.postMessage({ requestId, kind: 'strategy', result: { ...r, id: `size-${risk}` }, done: inputs.strategies.length + i + 1, total } satisfies RorMessage);
      return { risk, reward: plan.reward, pass: r.eval.pass, avgDays: r.eval.avgDays, avgTrades: r.eval.avgTrades, perEval: r.money.perEval };
    })
    : [];

  const p = inputs.evalPlan;
  const exact = exactEvalPass(inputs.setup, p, makeWinChance(inputs.odds)(p), tradeCost(p.risk, inputs.odds));
  self.postMessage({ requestId, kind: 'done', exact, evalSizes, bestId: best?.id ?? null } satisfies RorMessage);
};
