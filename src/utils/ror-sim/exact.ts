import { EVAL_DAY_LIMIT, type SimSetup, type TradePlan } from './types';

export interface ExactEval { pass: number; fail: number; unfinished: number }

/** The exact check only covers one trade a day at a fixed size with no daily loss limit. */
export function exactApplies(setup: SimSetup, plan: TradePlan): boolean {
  return setup.eval.dailyLossLimit === null && (plan.maxTradesPerDay === 1 || plan.extraChance === 0);
}

/**
 * Exact chance of passing the evaluation, by following every possible path's probability
 * day by day (no randomness). State: profit, best close (for the trailing floor) and best day.
 * With one trade a day, intraday and close-only breach give the same answer.
 */
export function exactEvalPass(setup: SimSetup, plan: TradePlan, winChance: number, cost: number): ExactEval | null {
  if (!exactApplies(setup, plan)) return null;
  const ev = setup.eval;
  const dd = ev.drawdown;
  const lock = dd.lockAboveStart;
  const floorOf = (high: number) => {
    if (dd.type === 'static') return -dd.amount;
    const f = high - dd.amount;
    return lock !== null ? Math.min(Math.max(f, -dd.amount), lock) : Math.max(f, -dd.amount);
  };
  const win = plan.reward - cost;
  const loss = -plan.risk - cost;
  const r = (x: number) => Math.round(x * 100) / 100;

  // key: profit|high|best
  let states = new Map<string, number>([['0|0|0', 1]]);
  let pass = 0, fail = 0;
  for (let day = 1; day <= EVAL_DAY_LIMIT && states.size; day++) {
    const next = new Map<string, number>();
    for (const [key, pr] of states) {
      const [profit, high, best] = key.split('|').map(Number);
      const floor = floorOf(high);
      for (const [pl, q] of [[win, winChance], [loss, 1 - winChance]] as const) {
        if (q === 0) continue;
        const p2 = r(profit + pl);
        const mass = pr * q;
        if (p2 <= floor + 1e-9) { fail += mass; continue; }
        const b2 = Math.max(best, pl);
        if (p2 >= ev.profitTarget && day >= ev.minDays && (ev.consistencyPct === null || (p2 > 0 && b2 <= (ev.consistencyPct / 100) * p2 + 1e-9))) {
          pass += mass;
          continue;
        }
        const h2 = dd.type === 'static' ? 0 : Math.max(high, p2);
        const k2 = `${p2}|${h2}|${b2}`;
        next.set(k2, (next.get(k2) ?? 0) + mass);
      }
    }
    states = next;
  }
  let unfinished = 0;
  for (const v of states.values()) unfinished += v;
  return { pass, fail, unfinished };
}
