import type { DrawdownRule, FundedRules } from '../prop-ev';

/** When a loss can break the account: the moment the balance touches the floor, or only at the close. */
export type BreachMode = 'intraday' | 'close';

/** A prop firm account, evaluation and funded stage, as the simulator plays it. */
export interface SimSetup {
  id: string;
  name: string;
  size: number;
  eval: {
    fee: number;
    /** Price to restart a failed evaluation. */
    resetFee: number;
    profitTarget: number;
    drawdown: DrawdownRule;
    /** Best day must be at most this % of total profit to pass. Null = no rule. */
    consistencyPct: number | null;
    minDays: number;
    /** Soft limit: trading stops for the day at this loss. Null = none. */
    dailyLossLimit: number | null;
  };
  funded: FundedRules;
  breach: BreachMode;
  /** Wait until the biggest allowed payout is available, or take one as soon as allowed. */
  payoutTiming: 'max' | 'asap';
  maxContracts: number;
  /** Rules still to be confirmed with the firm. */
  verify: string[];
}

/** One kind of trade and how it's taken during a day. */
export interface TradePlan {
  risk: number;
  reward: number;
  /** Chance it wins. Null = estimated from your base odds with the price-path model. */
  winRate: number | null;
  maxTradesPerDay: number;
  stopAfterWin: boolean;
  stopAfterLoss: boolean;
  /** Chance another valid setup shows up for each trade after the first in a day. */
  extraChance: number;
}

export type StrategyId = 'A' | 'B' | 'C' | 'D' | 'E' | 'F';

/**
 * A funded-account strategy. Every strategy has the same stages: build to the payout
 * goal, then collect qualifying days, then (after a payout) build again.
 */
export interface Strategy {
  id: StrategyId;
  name: string;
  description: string;
  /** Building toward the payout goal. */
  build: TradePlan;
  /** C: the plan after the first win of a payout cycle. */
  afterFirstWin?: TradePlan;
  /** Building toward later payouts (after the first payout). */
  afterPayout: TradePlan;
  /** D: risk this share of the room to the floor on each trade. */
  dynamicShare?: number;
  /** F: one trade size from start to finish, before and after payouts. */
  fixed?: boolean;
  /** F: switch to the qualifying-day trade once the payout goal is reached (off = stay fixed). */
  useQualify?: boolean;
}

/** Your trading odds. */
export interface Odds {
  /** Chance a trade wins at the base reward:risk. */
  winRate: number;
  /** Base reward:risk the win rate was measured at (1 = 1:1). */
  rewardRisk: number;
  commissionPerContract: number;
  slippagePerContract: number;
  /** Dollars at risk per contract at your usual stop (stop in points × $ per point). */
  riskPerContract: number;
  /** What riskPerContract was worked out from (display only). */
  instrument?: string;
  stopPoints?: number;
}

export interface SimInputs {
  setup: SimSetup;
  odds: Odds;
  evalPlan: TradePlan;
  /** The trade used to collect qualifying days once the payout goal is reached. */
  qualify: TradePlan;
  strategies: Strategy[];
  runs: number;
  seed: number;
  /** Money set aside for buying accounts (budget ruin). */
  budget: number;
}

export const EVAL_DAY_LIMIT = 120;
export const FUNDED_DAY_LIMIT = 500;
