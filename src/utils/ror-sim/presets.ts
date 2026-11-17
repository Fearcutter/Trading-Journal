import type { FirmConfig } from '../prop-ev';
import type { Odds, SimSetup, Strategy, TradePlan } from './types';

const plan = (risk: number, reward: number, more: Partial<TradePlan> = {}): TradePlan => ({
  risk, reward, winRate: null, maxTradesPerDay: 1, stopAfterWin: true, stopAfterLoss: true, extraChance: 0, ...more,
});

/** Lucid Flex 50K with the numbers you gave. Anything not confirmed is listed in `verify`. */
export const LUCID_FLEX_50K: SimSetup = {
  id: 'lucid-flex-50k',
  name: 'Lucid Flex 50K',
  size: 50000,
  eval: {
    fee: 112,
    resetFee: 112,
    profitTarget: 3000,
    drawdown: { amount: 2000, type: 'eod_trailing', lockAboveStart: null },
    consistencyPct: 40,
    minDays: 2,
    dailyLossLimit: null,
  },
  funded: {
    activationFee: 0,
    drawdown: { amount: 2000, type: 'eod_trailing', lockAboveStart: 100 },
    dailyLossLimit: null,
    consistencyPct: null,
    minDaysPerPayout: 5,
    minDayProfit: 150,
    buffer: 0,
    minPayout: 500,
    payoutCaps: [2000],
    payoutShareOfProfit: 0.5,
    split: 0.9,
    maxPayouts: 5,
  },
  breach: 'intraday',
  payoutTiming: 'max',
  maxContracts: 4,
  verify: [
    'Reset fee, and whether a reset gives a fresh $50,000 account',
    'Payout limited to half your profit ($4,000 profit for the full $2,000), on every payout',
    'Minimum payout request ($500)',
    'Floor stays locked at $50,100 after a payout',
    'Qualifying $150 days reset after each payout',
    'Account ends after 5 payouts',
    'Minimum days to pass the evaluation (2)',
    'Activation fee ($0)',
  ],
};

/** A simulator setup started from a firm on the Prop Firm EV page. */
export function setupFromFirm(f: FirmConfig): SimSetup {
  return {
    id: `${f.id}-${Date.now().toString(36)}`,
    name: `${f.firm} ${f.plan} ${f.size / 1000}K`,
    size: f.size,
    eval: {
      fee: f.eval.fee,
      resetFee: f.eval.fee,
      profitTarget: f.eval.profitTarget,
      drawdown: f.eval.drawdown,
      consistencyPct: f.eval.consistencyPct,
      minDays: f.eval.minDays,
      dailyLossLimit: f.eval.dailyLossLimit,
    },
    funded: { ...f.funded },
    breach: 'intraday',
    payoutTiming: 'max',
    maxContracts: Math.max(1, Math.round(f.size / 12500)),
    verify: [...f.verify, 'Reset fee (set to the evaluation price)', 'Contract limit'],
  };
}

export const DEFAULT_ODDS: Odds = {
  winRate: 0.65,
  rewardRisk: 1,
  commissionPerContract: 0,
  slippagePerContract: 0,
  // NQ at a 25-point stop: $20 a point
  riskPerContract: 500,
};

/** Evaluation: $1,000 to make $1,000, stop after the first win; a second setup half the time. */
export const DEFAULT_EVAL_PLAN: TradePlan = plan(1000, 1000, { maxTradesPerDay: 2, stopAfterLoss: false, extraChance: 0.5 });

/** Qualifying days: a small target once the payout goal is reached. */
export const DEFAULT_QUALIFY: TradePlan = plan(150, 150);

/** Stop / target pairs to compare for qualifying days. */
export const QUALIFY_ROWS: [number, number][] = [[150, 150], [300, 150], [500, 150], [1000, 150], [2000, 150]];

export const DEFAULT_STRATEGIES: Strategy[] = [
  {
    id: 'A', name: 'A · Same-day double',
    description: 'Risk $2,000 to make $2,000. If it wins and a second setup shows up the same day, take it too.',
    build: plan(2000, 2000, { maxTradesPerDay: 2, stopAfterWin: false, extraChance: 0.5 }),
    afterPayout: plan(1000, 1000),
  },
  {
    id: 'B', name: 'B · Two days in a row',
    description: 'Risk $2,000 to make $2,000, one trade a day, until the payout goal is reached.',
    build: plan(2000, 2000),
    afterPayout: plan(1000, 1000),
  },
  {
    id: 'C', name: 'C · One big trade, then smaller',
    description: 'Risk $2,000 to make $2,000 once. After the first win, smaller trades to the payout goal.',
    build: plan(2000, 2000),
    afterFirstWin: plan(500, 500),
    afterPayout: plan(500, 500),
  },
  {
    id: 'D', name: 'D · Automatic sizing',
    description: 'Trade size changes by itself, trade by trade: you risk a fixed share of whatever room is left above the drawdown floor, so you size down after losses and back up after wins.',
    build: plan(0, 0),
    afterPayout: plan(0, 0),
    dynamicShare: 0.5,
  },
  {
    id: 'E', name: 'E · Custom',
    description: 'Your own rules for each stage.',
    build: plan(1000, 1000, { maxTradesPerDay: 2, stopAfterLoss: false, extraChance: 0.5 }),
    afterPayout: plan(500, 500),
  },
  {
    id: 'F', name: 'F · Fixed size',
    description: 'The same trade size on every trade, from the first day through every payout. No sizing up or down, and no switch to a smaller qualifying trade unless you turn it on.',
    build: plan(500, 500, { maxTradesPerDay: 2, stopAfterLoss: false, extraChance: 0.5 }),
    afterPayout: plan(500, 500),
    fixed: true,
    useQualify: false,
  },
];
