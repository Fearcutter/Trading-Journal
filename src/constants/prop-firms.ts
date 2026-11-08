import type { FirmConfig, DrawdownRule, EvalRules } from '../utils/prop-ev';

/**
 * Starting rules for each firm and plan, researched from third-party guides
 * (firms' own pages couldn't be read directly). Sources disagreed in places;
 * anything uncertain is listed in `verify` and shown on the page. Every number
 * is editable on the Prop Firm EV page, and edits are saved in settings.
 * Ids are what saved edits and practice folders are keyed by: never rename one.
 */

const CHECKED = '2026-11-08';
const eod = (amount: number, lockAboveStart: number | null = null): DrawdownRule => ({ amount, type: 'eod_trailing', lockAboveStart });
const intraday = (amount: number, lockAboveStart: number | null = null): DrawdownRule => ({ amount, type: 'intraday_trailing', lockAboveStart });

/** "Evaluation" of an instant funded account: just the price. */
const noEval = (fee: number, drawdown: DrawdownRule): EvalRules => ({
  fee, billing: 'one_time', profitTarget: 0, drawdown, dailyLossLimit: null, consistencyPct: null, minDays: 0, maxDays: null,
});

const PRICE = 'Price (list price; enter what you actually pay, discounts are common)';

export const DEFAULT_PROP_FIRMS: FirmConfig[] = [
  // ---------------------------------------------------------------- Topstep
  {
    id: 'topstep-50k',
    firm: 'Topstep', plan: 'Combine (Standard)', size: 50000,
    eval: { fee: 49, billing: 'monthly', profitTarget: 3000, drawdown: eod(2000, 0), dailyLossLimit: null, consistencyPct: 50, minDays: 2, maxDays: null },
    funded: {
      activationFee: 149, drawdown: eod(2000, 0), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 5, minDayProfit: 150, buffer: 0, minPayout: 125, payoutCaps: [2000],
      payoutShareOfProfit: 0.5, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Monthly price and activation fee', 'Combine best-day rule: sources say 50% or 55%', 'Payout cap: $2,000 per one source (from 28 April 2026); others list more'],
    notes: 'No 25K Combine. Maximum Loss Limit stops trailing at the starting balance. Optional daily loss limit not modelled. Payouts use the Standard path (5 winning days of $150+, up to 50% of the balance); the Consistency payout path isn\'t modelled.',
  },
  {
    id: 'topstep-naf-50k',
    firm: 'Topstep', plan: 'Combine (No Activation Fee)', size: 50000,
    eval: { fee: 95, billing: 'monthly', profitTarget: 3000, drawdown: eod(2000, 0), dailyLossLimit: null, consistencyPct: 50, minDays: 2, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 0), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 5, minDayProfit: 150, buffer: 0, minPayout: 125, payoutCaps: [2000],
      payoutShareOfProfit: 0.5, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Monthly price ($95 list; $85 with a daily loss limit was a limited offer)', 'Combine best-day rule: sources say 50% or 55%', 'Payout cap: $2,000 per request (Standard path)'],
    notes: 'Same Combine, higher monthly price, no fee when you pass. Optional daily loss limit not modelled.',
  },

  // ---------------------------------------------------------------- Apex
  {
    id: 'apex-25k',
    firm: 'Apex', plan: 'EOD', size: 25000,
    eval: { fee: 99, billing: 'one_time', profitTarget: 1500, drawdown: eod(1000), dailyLossLimit: 500, consistencyPct: null, minDays: 1, maxDays: 21 },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: 50,
      minDaysPerPayout: 5, minDayProfit: 100, buffer: 1100, minPayout: 500, payoutCaps: [1000],
      payoutShareOfProfit: null, split: 1, maxPayouts: 6,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Activation fee', 'Minimum profit for a qualifying day on 25K', 'Funded daily loss limit (tier-based, amounts not published)'],
    notes: 'Rules for accounts bought after 1 March 2026. Evaluation limited to 30 calendar days (about 21 trading days). The EOD evaluation has a daily loss limit that pauses the day. Buffer = safety net (drawdown + $100).',
  },
  {
    id: 'apex-50k',
    firm: 'Apex', plan: 'EOD', size: 50000,
    eval: { fee: 139, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000), dailyLossLimit: 1000, consistencyPct: null, minDays: 1, maxDays: 21 },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: 50,
      minDaysPerPayout: 5, minDayProfit: 250, buffer: 2100, minPayout: 500, payoutCaps: [1500, 1750, 2000, 2500, 2750, 3000],
      payoutShareOfProfit: null, split: 1, maxPayouts: 6,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Middle payout caps (first $1,500 and sixth $3,000 confirmed; ones between estimated)', 'Activation fee', 'Funded daily loss limit (tier-based, amounts not published)'],
    notes: 'Rules for accounts bought after 1 March 2026. Evaluation limited to 30 calendar days (about 21 trading days). The EOD evaluation has a daily loss limit that pauses the day. Buffer = safety net (drawdown + $100).',
  },
  {
    id: 'apex-intraday-25k',
    firm: 'Apex', plan: 'Intraday', size: 25000,
    eval: { fee: 99, billing: 'one_time', profitTarget: 1500, drawdown: intraday(1000), dailyLossLimit: null, consistencyPct: null, minDays: 1, maxDays: 21 },
    funded: {
      activationFee: 0, drawdown: intraday(1000, 100), dailyLossLimit: null, consistencyPct: 50,
      minDaysPerPayout: 5, minDayProfit: 100, buffer: 1100, minPayout: 500, payoutCaps: [1000],
      payoutShareOfProfit: null, split: 1, maxPayouts: 6,
    },
    lastChecked: CHECKED,
    verify: [PRICE + ' (estimated same as EOD)', 'Activation fee', 'Minimum profit for a qualifying day on 25K'],
    notes: 'No daily loss limit, but the drawdown trails your live high (including open profit) until it locks at start + $100; the simulation only sees closed trades, so it is a bit optimistic here.',
  },
  {
    id: 'apex-intraday-50k',
    firm: 'Apex', plan: 'Intraday', size: 50000,
    eval: { fee: 139, billing: 'one_time', profitTarget: 3000, drawdown: intraday(2000), dailyLossLimit: null, consistencyPct: null, minDays: 1, maxDays: 21 },
    funded: {
      activationFee: 0, drawdown: intraday(2000, 100), dailyLossLimit: null, consistencyPct: 50,
      minDaysPerPayout: 5, minDayProfit: 200, buffer: 2100, minPayout: 500, payoutCaps: [1500, 1750, 2000, 2500, 2750, 3000],
      payoutShareOfProfit: null, split: 1, maxPayouts: 6,
    },
    lastChecked: CHECKED,
    verify: [PRICE + ' (estimated same as EOD)', 'Payout caps (estimated same as EOD)', 'Activation fee'],
    notes: 'No daily loss limit, but the drawdown trails your live high (including open profit) until it locks at start + $100; the simulation only sees closed trades, so it is a bit optimistic here.',
  },

  // ---------------------------------------------------------------- Lucid
  {
    id: 'lucid-flex-25k',
    firm: 'Lucid', plan: 'LucidFlex', size: 25000,
    eval: { fee: 65, billing: 'one_time', profitTarget: 1250, drawdown: eod(1000), dailyLossLimit: null, consistencyPct: 40, minDays: 2, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 5, minDayProfit: 100, buffer: 0, minPayout: 500, payoutCaps: [1000],
      payoutShareOfProfit: 0.5, split: 0.9, maxPayouts: 5,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Evaluation best-day rule: 40% by default, 50% with a paid add-on', 'Minimum trading days to pass'],
    notes: 'After 5 payouts the account moves to live; the simulation stops there.',
  },
  {
    id: 'lucid-flex-50k',
    firm: 'Lucid', plan: 'LucidFlex', size: 50000,
    eval: { fee: 115, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000), dailyLossLimit: null, consistencyPct: 40, minDays: 2, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 5, minDayProfit: 150, buffer: 0, minPayout: 500, payoutCaps: [2000],
      payoutShareOfProfit: 0.5, split: 0.9, maxPayouts: 5,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Evaluation best-day rule: 40% by default, 50% with a paid add-on', 'Minimum trading days to pass'],
    notes: 'After 5 payouts the account moves to live; the simulation stops there.',
  },
  {
    id: 'lucid-pro-25k',
    firm: 'Lucid', plan: 'LucidPro', size: 25000,
    eval: { fee: 120, billing: 'one_time', profitTarget: 1250, drawdown: eod(1000), dailyLossLimit: null, consistencyPct: null, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: 40,
      minDaysPerPayout: 1, minDayProfit: 0, minCycleProfit: 250, buffer: 1100, minPayout: 500, payoutCaps: [1000, 1500],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: 5,
    },
    lastChecked: CHECKED,
    verify: ['Price (estimate)', 'Evaluation target, drawdown and best-day rule (assumed same as LucidFlex, no best-day rule)', 'Days needed per payout cycle'],
    notes: 'Payout once the balance is above $26,100 with $250+ profit in the cycle and the best day under 40% of it. Live review after the 5th payout; the simulation stops there.',
  },
  {
    id: 'lucid-pro-50k',
    firm: 'Lucid', plan: 'LucidPro', size: 50000,
    eval: { fee: 172, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000), dailyLossLimit: null, consistencyPct: null, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: 40,
      minDaysPerPayout: 1, minDayProfit: 0, minCycleProfit: 500, buffer: 2100, minPayout: 500, payoutCaps: [2000, 2500],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: 5,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Evaluation target, drawdown and best-day rule (assumed same as LucidFlex, no best-day rule)', 'Days needed per payout cycle'],
    notes: 'Payout once the balance is above $52,100 with $500+ profit in the cycle and the best day under 40% of it. Live review after the 5th payout; the simulation stops there.',
  },
  {
    id: 'lucid-direct-25k',
    firm: 'Lucid', plan: 'LucidDirect (instant)', size: 25000, instant: true,
    eval: noEval(350, eod(1000)),
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: 20,
      minDaysPerPayout: 5, minDayProfit: 0, firstCycleProfit: 1500, minCycleProfit: 1250, buffer: 0, minPayout: 500, payoutCaps: [1000],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: 5,
    },
    lastChecked: CHECKED,
    verify: ['Price (estimate)', 'Days needed per payout (5 per the pricing page only)', 'Drawdown and where it stops trailing'],
    notes: 'No evaluation: bought funded. First payout needs $1,500 profit, later ones $1,250, with the best day under 20% of the cycle. Live review after the 5th payout.',
  },
  {
    id: 'lucid-direct-50k',
    firm: 'Lucid', plan: 'LucidDirect (instant)', size: 50000, instant: true,
    eval: noEval(515, eod(2000)),
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: 20,
      minDaysPerPayout: 5, minDayProfit: 0, firstCycleProfit: 3000, minCycleProfit: 2500, buffer: 0, minPayout: 500, payoutCaps: [2000, 2000, 2000, 2500],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: 5,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Days needed per payout (5 per the pricing page only)', 'Drawdown and where it stops trailing'],
    notes: 'No evaluation: bought funded. First payout needs $3,000 profit, later ones $2,500, with the best day under 20% of the cycle. Live review after the 5th payout.',
  },

  // ---------------------------------------------------------------- MFFU
  {
    id: 'mffu-rapid-25k',
    firm: 'MFFU', plan: 'Rapid', size: 25000,
    eval: { fee: 145, billing: 'one_time', profitTarget: 1500, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: 50, minDays: 2, maxDays: null },
    funded: {
      activationFee: 0, drawdown: intraday(1000, 100), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 1, minDayProfit: 0, buffer: 1100, minPayout: 500, payoutCaps: [],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Profit split (90% per two sources)'],
    notes: 'The original Rapid: end-of-day drawdown in the evaluation, intraday (live high including open profit) once funded; the simulation can only see closed trades, so it is a bit optimistic there. Daily payouts above the buffer, no cap.',
  },
  {
    id: 'mffu-rapid-50k',
    firm: 'MFFU', plan: 'Rapid', size: 50000,
    eval: { fee: 209, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: 50, minDays: 2, maxDays: null },
    funded: {
      activationFee: 0, drawdown: intraday(2000, 100), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 1, minDayProfit: 0, buffer: 2100, minPayout: 500, payoutCaps: [],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Profit split (90% per two sources)'],
    notes: 'The original Rapid: end-of-day drawdown in the evaluation, intraday (live high including open profit) once funded; the simulation can only see closed trades, so it is a bit optimistic there. Daily payouts above the buffer, no cap.',
  },
  {
    id: 'mffu-rapid-eod-25k',
    firm: 'MFFU', plan: 'Rapid EOD', size: 25000,
    eval: { fee: 145, billing: 'one_time', profitTarget: 1500, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: 30, minDays: 4, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 1, minDayProfit: 0, firstCycleProfit: 0, minCycleProfit: 250, buffer: 1100, minPayout: 500, payoutCaps: [],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: [PRICE],
    notes: 'End-of-day drawdown in both stages, but a stricter evaluation: best day under 30% of profit and at least 4 days. Daily payouts above the buffer; after the first, $250 profit since the last payout.',
  },
  {
    id: 'mffu-rapid-eod-50k',
    firm: 'MFFU', plan: 'Rapid EOD', size: 50000,
    eval: { fee: 209, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: 30, minDays: 4, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 1, minDayProfit: 0, firstCycleProfit: 0, minCycleProfit: 500, buffer: 2100, minPayout: 500, payoutCaps: [],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: [PRICE],
    notes: 'End-of-day drawdown in both stages, but a stricter evaluation: best day under 30% of profit and at least 4 days. Daily payouts above the buffer; after the first, $500 profit since the last payout.',
  },
  {
    id: 'mffu-builder-25k',
    firm: 'MFFU', plan: 'Builder', size: 25000,
    eval: { fee: 105, billing: 'one_time', profitTarget: 1500, drawdown: eod(1000, 100), dailyLossLimit: 600, consistencyPct: null, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: 600, consistencyPct: 50,
      minDaysPerPayout: 2, minDayProfit: 0, minCycleProfit: 250, buffer: 1100, minPayout: 250, payoutCaps: [1000],
      payoutShareOfProfit: null, split: 0.8, maxPayouts: 5,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Profit split (80%)'],
    notes: 'Daily loss limit pauses the day in both stages. Payout cycles of 2+ trading days with $250+ profit and the best day under 50% of it. Live after 5 payouts; the simulation stops there.',
  },
  {
    id: 'mffu-builder-50k',
    firm: 'MFFU', plan: 'Builder', size: 50000,
    eval: { fee: 153, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000, 100), dailyLossLimit: 1000, consistencyPct: null, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: 1000, consistencyPct: 50,
      minDaysPerPayout: 2, minDayProfit: 0, minCycleProfit: 500, buffer: 2100, minPayout: 500, payoutCaps: [2000],
      payoutShareOfProfit: null, split: 0.8, maxPayouts: 5,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Profit split (80%)', 'Drawdown: a $1,500 option also exists'],
    notes: 'Daily loss limit pauses the day in both stages. Payout cycles of 2+ trading days with $500+ profit and the best day under 50% of it. Live after 5 payouts; the simulation stops there.',
  },
  {
    id: 'mffu-pro-50k',
    firm: 'MFFU', plan: 'Pro', size: 50000,
    eval: { fee: 265, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: 50, minDays: 2, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 10, minDayProfit: 0, buffer: 2100, minPayout: 1000, payoutCaps: [],
      payoutShareOfProfit: null, split: 0.8, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Payout timing (every 14 calendar days, modelled as 10 trading days)', 'Profit split (80%)'],
    notes: 'No 25K Pro. Payouts every 14 days above the buffer, no cap, $1,000 minimum. After the first payout the floor moves up to $50,100; modelled as the floor stopping where it is.',
  },

  // ---------------------------------------------------------------- FundedNext
  {
    id: 'fundednext-legacy-25k',
    firm: 'FundedNext', plan: 'Legacy', size: 25000,
    eval: { fee: 120, billing: 'one_time', profitTarget: 1250, drawdown: eod(1000, 0), dailyLossLimit: null, consistencyPct: 40, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1000, 0), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 5, minDayProfit: 100, buffer: 0, minPayout: 250, payoutCaps: [3000],
      payoutShareOfProfit: 0.5, split: 0.8, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Price (estimate)', 'Best-day rule: help center says 40% in the challenge; some reviews say none for accounts after Nov 2025', 'Profit needed for a benchmark day (estimate)'],
    notes: 'Drawdown stops trailing at the starting balance. Payouts after 5 benchmark days, up to 50% of profit (max $3,000 until 30 benchmark days, then no cap).',
  },
  {
    id: 'fundednext-legacy-50k',
    firm: 'FundedNext', plan: 'Legacy', size: 50000,
    eval: { fee: 180, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000, 0), dailyLossLimit: null, consistencyPct: 40, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 0), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 5, minDayProfit: 200, buffer: 0, minPayout: 250, payoutCaps: [6000],
      payoutShareOfProfit: 0.5, split: 0.8, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Price ($180 one-time per one source; another says $149 a month)', 'Best-day rule: help center says 40% in the challenge; some reviews say none for accounts after Nov 2025', 'Profit needed for a benchmark day (estimate)'],
    notes: 'Drawdown stops trailing at the starting balance. Payouts after 5 benchmark days, up to 50% of profit (max $6,000 until 30 benchmark days, then no cap).',
  },
  {
    id: 'fundednext-flex-50k',
    firm: 'FundedNext', plan: 'Flex', size: 50000,
    eval: { fee: 150, billing: 'one_time', profitTarget: 2500, drawdown: eod(1500, 0), dailyLossLimit: null, consistencyPct: 40, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1500, 0), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 5, minDayProfit: 200, minCycleProfit: 500, buffer: 0, minPayout: 250, payoutCaps: [1500],
      payoutShareOfProfit: 0.5, split: 0.8, maxPayouts: 5,
    },
    lastChecked: CHECKED,
    verify: ['Price (estimate)', 'Profit split (80%, 90% with an add-on)'],
    notes: 'New in May 2026, 50K only. $1,500 drawdown that stops trailing at the start. Payouts after 5 days of $200+, up to 50% of profit (max $1,500). The account ends after the 5th payout.',
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
    verify: ['No longer sold: FundedNext stopped selling Rapid on 10 July 2026', 'Price', 'Profit split (80% or 90%)', 'Whether the payout cap lifts after 5 payouts'],
    notes: 'No longer sold to new buyers. Payouts every 3 trading days with at least $500 profit in the cycle. No daily loss limit.',
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
    verify: ['No longer sold: FundedNext stopped selling Rapid on 10 July 2026', 'Price', 'Profit split (80% or 90%)', 'Whether the payout cap lifts after 5 payouts'],
    notes: 'No longer sold to new buyers. Payouts every 3 trading days with at least $500 profit in the cycle. No daily loss limit.',
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
    verify: ['No longer sold: FundedNext stopped selling Rapid on 10 July 2026', 'Buffer amount (estimate: drawdown + $100)', 'Profit split (80% or 90%)'],
    notes: 'No longer sold to new buyers. Daily payouts above the buffer. No best-day rule. Daily loss limit pauses the day.',
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
    verify: ['No longer sold: FundedNext stopped selling Rapid on 10 July 2026', 'Buffer amount (estimate: drawdown + $100)', 'Profit split (80% or 90%)'],
    notes: 'No longer sold to new buyers. Daily payouts above the buffer. No best-day rule. Daily loss limit pauses the day.',
  },

  // ---------------------------------------------------------------- Tradeify
  {
    id: 'tradeify-growth-25k',
    firm: 'Tradeify', plan: 'Growth', size: 25000,
    eval: { fee: 99, billing: 'one_time', profitTarget: 1500, drawdown: eod(1000, 100), dailyLossLimit: 600, consistencyPct: null, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: 600, consistencyPct: 35,
      minDaysPerPayout: 5, minDayProfit: 100, buffer: 1500, minPayout: 250, payoutCaps: [1000],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Funded best-day rule: one guide says 35%, another says none', 'Funded daily loss limit'],
    notes: 'Daily loss limit pauses the day; it does not fail the account. Payouts need a $26,500 balance.',
  },
  {
    id: 'tradeify-growth-50k',
    firm: 'Tradeify', plan: 'Growth', size: 50000,
    eval: { fee: 145, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000, 100), dailyLossLimit: 1250, consistencyPct: null, minDays: 1, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: 1250, consistencyPct: 35,
      minDaysPerPayout: 5, minDayProfit: 150, buffer: 3000, minPayout: 500, payoutCaps: [1500, 2000, 2500, 3000],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: ['Funded best-day rule: one guide says 35%, another says none', 'Funded daily loss limit (it rises to $2,000 at a $53,000 balance)'],
    notes: 'Daily loss limit pauses the day; it does not fail the account. Payouts need a $53,000 balance.',
  },
  {
    id: 'tradeify-select-flex-25k',
    firm: 'Tradeify', plan: 'Select Flex', size: 25000,
    eval: { fee: 109, billing: 'one_time', profitTarget: 1500, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: 40, minDays: 3, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 5, minDayProfit: 100, buffer: 0, minPayout: 250, payoutCaps: [1250],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Where the funded drawdown stops trailing (locks at $26,100 after the first payout)'],
    notes: 'Select evaluation (no daily loss limit, best day under 40%, 3+ days), then the Flex funded path: no daily loss limit, payouts every 5 winning days of $100+.',
  },
  {
    id: 'tradeify-select-flex-50k',
    firm: 'Tradeify', plan: 'Select Flex', size: 50000,
    eval: { fee: 165, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: 40, minDays: 3, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: null,
      minDaysPerPayout: 5, minDayProfit: 150, buffer: 0, minPayout: 250, payoutCaps: [2500],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Where the funded drawdown stops trailing (locks at $52,100 after the first payout)'],
    notes: 'Select evaluation (no daily loss limit, best day under 40%, 3+ days), then the Flex funded path: no daily loss limit, payouts every 5 winning days of $150+.',
  },
  {
    id: 'tradeify-select-daily-25k',
    firm: 'Tradeify', plan: 'Select Daily', size: 25000,
    eval: { fee: 109, billing: 'one_time', profitTarget: 1500, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: 40, minDays: 3, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: 500, consistencyPct: null,
      minDaysPerPayout: 1, minDayProfit: 0, buffer: 1100, minPayout: 250, payoutCaps: [600],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: [PRICE],
    notes: 'Select evaluation (no daily loss limit, best day under 40%, 3+ days), then the Daily funded path: $500 daily loss limit, daily payouts above the buffer up to $600.',
  },
  {
    id: 'tradeify-select-daily-50k',
    firm: 'Tradeify', plan: 'Select Daily', size: 50000,
    eval: { fee: 165, billing: 'one_time', profitTarget: 3000, drawdown: eod(2000, 100), dailyLossLimit: null, consistencyPct: 40, minDays: 3, maxDays: null },
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: 1000, consistencyPct: null,
      minDaysPerPayout: 1, minDayProfit: 0, buffer: 2100, minPayout: 250, payoutCaps: [1250],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: [PRICE],
    notes: 'Select evaluation (no daily loss limit, best day under 40%, 3+ days), then the Daily funded path: $1,000 daily loss limit, daily payouts above the buffer up to $1,250.',
  },
  {
    id: 'tradeify-lightning-25k',
    firm: 'Tradeify', plan: 'Lightning (instant)', size: 25000, instant: true,
    eval: noEval(345, eod(1000)),
    funded: {
      activationFee: 0, drawdown: eod(1000, 100), dailyLossLimit: null, consistencyPct: 20,
      minDaysPerPayout: 1, minDayProfit: 0, firstCycleProfit: 1500, minCycleProfit: 1000, buffer: 0, minPayout: 1000, payoutCaps: [1000],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Where the drawdown stops trailing', 'Best-day rule loosens to 25% on the 2nd payout and 30% after; modelled as 20% throughout'],
    notes: 'No evaluation: bought funded. First payout needs $1,500 profit, later ones $1,000 each, with the best day under 20% of the cycle.',
  },
  {
    id: 'tradeify-lightning-50k',
    firm: 'Tradeify', plan: 'Lightning (instant)', size: 50000, instant: true,
    eval: noEval(492, eod(2000)),
    funded: {
      activationFee: 0, drawdown: eod(2000, 100), dailyLossLimit: 1250, consistencyPct: 20,
      minDaysPerPayout: 1, minDayProfit: 0, firstCycleProfit: 3000, minCycleProfit: 2000, buffer: 0, minPayout: 1000, payoutCaps: [2000, 2000, 2000, 2500],
      payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
    lastChecked: CHECKED,
    verify: [PRICE, 'Where the drawdown stops trailing', 'Best-day rule loosens to 25% on the 2nd payout and 30% after; modelled as 20% throughout'],
    notes: 'No evaluation: bought funded. First payout needs $3,000 profit, later ones $2,000 each, with the best day under 20% of the cycle. $1,250 daily loss limit pauses the day.',
  },
];
