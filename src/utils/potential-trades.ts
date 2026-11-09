import type { Trade } from '../types/trade';
import { getRealizedR } from './r-multiple';

export interface PotentialGroupStats {
  count: number;
  wins: number;
  /** Wins out of all trades, breakevens included. */
  winRate: number;
  totalPL: number;
  /** Sum of realized R over trades with a stop. */
  totalR: number;
  avgR: number | null;
}

export interface PotentialComparison {
  taken: PotentialGroupStats;
  potential: PotentialGroupStats;
  combined: PotentialGroupStats;
}

function groupStats(trades: Trade[], getPL: (t: Trade) => number): PotentialGroupStats {
  const rs = trades.map(getRealizedR).filter((r): r is number => r != null);
  const wins = trades.filter(t => t.result === 'win').length;
  const totalR = rs.reduce((a, r) => a + r, 0);
  return {
    count: trades.length,
    wins,
    winRate: trades.length ? (wins / trades.length) * 100 : 0,
    totalPL: trades.reduce((a, t) => a + getPL(t), 0),
    totalR,
    avgR: rs.length ? totalR / rs.length : null,
  };
}

/** What was taken, what was there but not taken, and the two together. */
export function comparePotential(trades: Trade[], getPL: (t: Trade) => number): PotentialComparison {
  const taken = trades.filter(t => !t.potential);
  const potential = trades.filter(t => t.potential);
  return {
    taken: groupStats(taken, getPL),
    potential: groupStats(potential, getPL),
    combined: groupStats(trades, getPL),
  };
}
