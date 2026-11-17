/**
 * Price-path model: price as a random walk with a steady push in your favour (drift).
 * Distances are measured in units of the stop: the stop is assumed to sit the same distance
 * from entry as on your usual trade, and dollar size changes through the number of contracts.
 *
 * With drift strength θ, the chance of reaching +b before −a (a = 1 stop) is
 *   (1 − e^(−θa)) / (1 − e^(−θ(a + b)))
 * and with no drift (θ = 0) it is a / (a + b), which is also the break-even win rate.
 */

/** Chance of hitting the target before the stop, target given as a multiple of the stop. */
export function hitChance(ratio: number, theta: number): number {
  if (ratio <= 0) return 1;
  if (Math.abs(theta) < 1e-9) return 1 / (1 + ratio);
  return (1 - Math.exp(-theta)) / (1 - Math.exp(-theta * (1 + ratio)));
}

/** Win rate needed to break even (before costs): stop ÷ (stop + target). */
export function breakEven(risk: number, reward: number): number {
  return risk / (risk + reward);
}

/** The drift that makes a trade with this reward:risk win at this rate. */
export function calibrateTheta(winRate: number, ratio: number): number {
  const p = Math.min(0.999, Math.max(0.001, winRate));
  if (Math.abs(ratio - 1) < 1e-9) return Math.log(p / (1 - p));
  // hitChance rises with theta: bisect
  let lo = -50, hi = 50;
  for (let i = 0; i < 100; i++) {
    const mid = (lo + hi) / 2;
    if (hitChance(ratio, mid) < p) lo = mid; else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Estimated win rate for a trade with this risk and reward, from your base odds. */
export function estimateWinRate(baseWinRate: number, baseRatio: number, risk: number, reward: number): number {
  if (risk <= 0) return 1;
  const ratio = reward / risk;
  if (Math.abs(ratio - baseRatio) < 1e-9) return baseWinRate;
  return hitChance(ratio, calibrateTheta(baseWinRate, baseRatio));
}
