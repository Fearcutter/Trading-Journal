import type { Prob } from './summary';

export const money = (x: number) => `${x < 0 ? '-' : ''}$${Math.abs(Math.round(x)).toLocaleString('en-US')}`;
export const pct = (x: number, digits = 1) => `${(x * 100).toFixed(digits)}%`;
/** "62.1% (60.8–63.4%)": the chance and its 95% range. */
export const probText = (p: Prob) => `${pct(p.p)}`;
export const rangeText = (p: Prob) => `${(p.lo * 100).toFixed(1)}–${(p.hi * 100).toFixed(1)}%`;
