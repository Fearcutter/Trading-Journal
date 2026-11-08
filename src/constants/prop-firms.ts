import type { FirmConfig, DrawdownRule } from '../utils/prop-ev';

/**
 * Starting rules for each firm, researched 2026-11-07 from third-party guides
 * (firms' own pages couldn't be read directly). Sources disagreed in places;
 * anything uncertain is listed in `verify` and shown on the page. Every number
 * is editable on the Prop Firm EV page, and edits are saved in settings.
 */

const CHECKED = '2026-11-07';
const eod = (amount: number, lockAboveStart: number | null = null): DrawdownRule => ({ amount, type: 'eod_trailing', lockAboveStart });
const intraday = (amount: number, lockAboveStart: number | null = null): DrawdownRule => ({ amount, type: 'intraday_trailing', lockAboveStart });

export const DEFAULT_PROP_FIRMS: FirmConfig[] = [
  {
    id: 'topstep-50k',
    firm: 'Topstep', plan: 'Trading Combine', size: 50000,
    eval: { fee: 49, billing: 'monthly', profitTarget: 3000, drawdown: eod(2000, 0), dailyLossLimit: null, consistencyPct: 50, minDays: 2, maxDays: null },
    funded: {
      activationFee: 149, drawdown: eod(2000, 0), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 5, minDayProfit: 150, buffer: 0, minPayout: 125, payoutCaps: [5000],
      payoutShareOfProfit: 0.5, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Monthly price and activation fee', 'Combine best-day rule: sources say 50% or 55%', 'Payout: 5 winning days of $150+, up to 50% of balance'],
    notes: 'No 25K Combine. Maximum Loss Limit stops trailing at the starting balance. Optional $1,000 daily loss limit not modelled.',
  },
  {
    id: 'apex-25k',
    firm: 'Apex', plan: 'EOD evaluation', size: 25000,
    eval: { fee: 99, billing: 'one_time', profitTarget: 1500, drawdown: eod(1000), dailyLossLimit: null, consistencyPct: null, minDays: 1, maxDays: 21 },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: 50,
      minDaysPerPayout: 5, minDayProfit: 100, buffer: 1100, minPayout: 500, payoutCaps: [1000],
      payoutShareOfProfit: null, split: 1, maxPayouts: 6,
    },
    lastChecked: CHECKED,
    verify: ['Price (estimate: enter what you pay; discounts are common)', 'Drawdown: sources say $1,000 or $1,500', 'Payout caps by payout number', 'Profit split (100% vs 90% after the first $25K)', 'Activation fee'],
    notes: 'Evaluation limited to 30 calendar days (about 21 trading days). Buffer = safety net (drawdown + $100).',
  },
  {
    id: 'apex-50k',
    firm: 'Apex', plan: 'EOD evaluation', size: 50000,
    eval: { fee: 139, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000), dailyLossLimit: null, consistencyPct: null, minDays: 1, maxDays: 21 },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: 50,
      minDaysPerPayout: 5, minDayProfit: 250, buffer: 2100, minPayout: 500, payoutCaps: [1500, 1750, 2000, 2500, 2750, 3000],
      payoutShareOfProfit: null, split: 1, maxPayouts: 6,
    },
    lastChecked: CHECKED,
    verify: ['Price (estimate: enter what you pay; discounts are common)', 'Drawdown: sources say $2,000 or $2,500', 'Middle payout caps (first $1,500 and sixth $3,000 confirmed; ones between estimated)', 'Profit split', 'Activation fee'],
    notes: 'Evaluation limited to 30 calendar days (about 21 trading days). Buffer = safety net (drawdown + $100).',
  },
  {
    id: 'lucid-flex-25k',
    firm: 'Lucid', plan: 'LucidFlex', size: 25000,
    eval: { fee: 100, billing: 'one_time', profitTarget: 1250, drawdown: eod(1000), dailyLossLimit: null, consistencyPct: 50, minDays: 2, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 5, minDayProfit: 100, buffer: 0, minPayout: 500, payoutCaps: [1000],
      payoutShareOfProfit: 0.5, split: 0.9, maxPayouts: 5,
    },
    lastChecked: CHECKED,
    verify: ['Evaluation best-day rule: sources say 40% or 50%', 'Minimum trading days to pass', 'Minimum payout'],
    notes: 'After 5 payouts the account moves to live; the simulation stops there.',
  },
  {
    id: 'lucid-flex-50k',
    firm: 'Lucid', plan: 'LucidFlex', size: 50000,
    eval: { fee: 130, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000), dailyLossLimit: null, consistencyPct: 50, minDays: 2, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 5, minDayProfit: 150, buffer: 0, minPayout: 500, payoutCaps: [2000],
      payoutShareOfProfit: 0.5, split: 0.9, maxPayouts: 5,
    },
    lastChecked: CHECKED,
    verify: ['Evaluation best-day rule: sources say 40% or 50%', 'Minimum trading days to pass', 'Minimum payout'],
    notes: 'After 5 payouts the account moves to live; the simulation stops there.',
  },
  {
    id: 'mffu-rapid-50k',
    firm: 'MFFU', plan: 'Rapid', size: 50000,
    eval: { fee: 157, billing: 'monthly', profitTarget: 3000, drawdown: eod(2000), dailyLossLimit: null, consistencyPct: 50, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: intraday(2000, 100), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 1, minDayProfit: 0, buffer: 2100, minPayout: 500, payoutCaps: [],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Monthly price', 'Activation fee', 'Payout cap per request', 'Where the funded drawdown stops trailing', 'Whether a 25K Rapid exists'],
    notes: 'Funded drawdown is intraday (live high including open profit); the simulation can only see closed trades, so it is a bit optimistic here.',
  },
  {
    id: 'fundednext-rapid-25k',
    firm: 'FundedNext', plan: 'Rapid Pro', size: 25000,
    eval: { fee: 79.99, billing: 'one_time', profitTarget: 1500, drawdown: eod(1000), dailyLossLimit: null, consistencyPct: null, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: 40,
      minDaysPerPayout: 3, minDayProfit: 0, minCycleProfit: 500, buffer: 0, minPayout: 250, payoutCaps: [800, 800, 800, 800, 800, 0],
      payoutShareOfProfit: null, split: 0.8, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Price', 'Best-day rule: FundedNext says 40% after passing only; some reviews say during the challenge too', 'Profit split (80% or 90%)', 'Whether the payout cap lifts after 5 payouts', 'Where the funded drawdown stops trailing'],
    notes: 'Payouts every 3 trading days with at least $500 profit in the cycle. No daily loss limit.',
  },
  {
    id: 'fundednext-rapid-daily-25k',
    firm: 'FundedNext', plan: 'Rapid Daily', size: 25000,
    eval: { fee: 79.99, billing: 'one_time', profitTarget: 1500, drawdown: eod(1000), dailyLossLimit: 500, consistencyPct: null, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: 500, consistencyPct: null,
      minDaysPerPayout: 1, minDayProfit: 0, buffer: 1100, minPayout: 250, payoutCaps: [800],
      payoutShareOfProfit: null, split: 0.8, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Buffer amount (estimate: drawdown + $100)', 'Price', 'Whether the daily loss limit also applies during the challenge', 'Profit split (80% or 90%)', 'Where the funded drawdown stops trailing'],
    notes: 'Daily payouts above the buffer. No best-day rule. Daily loss limit pauses the day.',
  },
  {
    id: 'fundednext-rapid-50k',
    firm: 'FundedNext', plan: 'Rapid Pro', size: 50000,
    eval: { fee: 149.99, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000), dailyLossLimit: null, consistencyPct: null, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: 40,
      minDaysPerPayout: 3, minDayProfit: 0, minCycleProfit: 500, buffer: 0, minPayout: 250, payoutCaps: [1200, 1200, 1200, 1200, 1200, 0],
      payoutShareOfProfit: null, split: 0.8, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Price', 'Best-day rule: FundedNext says 40% after passing only; some reviews say during the challenge too', 'Profit split (80% or 90%)', 'Whether the payout cap lifts after 5 payouts', 'Where the funded drawdown stops trailing'],
    notes: 'Payouts every 3 trading days with at least $500 profit in the cycle. No daily loss limit.',
  },
  {
    id: 'fundednext-rapid-daily-50k',
    firm: 'FundedNext', plan: 'Rapid Daily', size: 50000,
    eval: { fee: 149.99, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000), dailyLossLimit: 1000, consistencyPct: null, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: 1000, consistencyPct: null,
      minDaysPerPayout: 1, minDayProfit: 0, buffer: 2100, minPayout: 250, payoutCaps: [1200],
      payoutShareOfProfit: null, split: 0.8, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Buffer amount (estimate: drawdown + $100)', 'Price', 'Whether the daily loss limit also applies during the challenge', 'Profit split (80% or 90%)', 'Where the funded drawdown stops trailing'],
    notes: 'Daily payouts above the buffer. No best-day rule. Daily loss limit pauses the day.',
  },
  {
    id: 'tradeify-growth-25k',
    firm: 'Tradeify', plan: 'Growth', size: 25000,
    eval: { fee: 99, billing: 'one_time', profitTarget: 1500, drawdown: eod(1000), dailyLossLimit: 600, consistencyPct: null, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: 600, consistencyPct: 35,
      minDaysPerPayout: 5, minDayProfit: 100, buffer: 1500, minPayout: 500, payoutCaps: [1000],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['25K numbers could not be confirmed: price, target, drawdown, daily limit, payout caps are estimates', 'Balance needed before a payout'],
    notes: 'Daily loss limit pauses the day; it does not fail the account.',
  },
  {
    id: 'tradeify-growth-50k',
    firm: 'Tradeify', plan: 'Growth', size: 50000,
    eval: { fee: 145, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000), dailyLossLimit: 1250, consistencyPct: null, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: 1250, consistencyPct: 35,
      minDaysPerPayout: 5, minDayProfit: 150, buffer: 3000, minPayout: 500, payoutCaps: [1500, 2000, 2500, 3000],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Balance needed before a payout ($53,000 per one source; modelled as a $3,000 buffer)', 'Where the funded drawdown stops trailing', 'Funded daily loss limit'],
    notes: 'Daily loss limit pauses the day; it does not fail the account.',
  },
];
