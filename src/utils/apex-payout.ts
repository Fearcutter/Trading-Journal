import type { ApexAccount } from '../types/apex-account';
import { APEX_ACCOUNT_CONFIGS } from '../types/apex-account';
import type { Trade } from '../types/trade';

export interface DayPL {
  date: string;
  dollarPL: number;
  tradeCount: number;
}

export interface PayoutCycle {
  tradingDays: DayPL[];
  totalProfit: number;
  currentBalance: number;
  drawdownFloor: number; // computed: startingBalance - drawdownRemaining
  cushion: number; // currentBalance - drawdownFloor (auto-updates with trades)
  safetyNet: number;
  aboveSafetyNet: boolean;
  profitDaysCount: number;
  tradingDaysCount: number;
  consistencyViolations: { date: string; percentage: number }[];
  inPayoutWindow: boolean;
  nextWindowStart: string | null;
}

export interface EligibilityResult {
  eligible: boolean;
  reasons: string[];
  progress: number; // 0-100
}

function getAccountTrades(account: ApexAccount, trades: Trade[]): Trade[] {
  return trades.filter(t => t.accountIds?.includes(account.id) && !t.sessionId);
}

function groupByDate(trades: Trade[]): DayPL[] {
  const map = new Map<string, { dollarPL: number; tradeCount: number }>();
  for (const t of trades) {
    const existing = map.get(t.date) || { dollarPL: 0, tradeCount: 0 };
    existing.dollarPL += t.dollarPL;
    existing.tradeCount += 1;
    map.set(t.date, existing);
  }
  return Array.from(map.entries())
    .map(([date, data]) => ({ date, ...data }))
    .sort((a, b) => a.date.localeCompare(b.date));
}

function isInPayoutWindow(date: Date): boolean {
  const day = date.getDate();
  return (day >= 1 && day <= 5) || (day >= 15 && day <= 20);
}

function getNextPayoutWindow(date: Date): string {
  const day = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();

  if (day < 1) return formatDate(new Date(year, month, 1));
  if (day > 5 && day < 15) return formatDate(new Date(year, month, 15));
  if (day > 20) return formatDate(new Date(year, month + 1, 1));
  return formatDate(date);
}

function formatDate(d: Date): string {
  return d.toISOString().split('T')[0];
}

export function computeCurrentCycle(account: ApexAccount, trades: Trade[]): PayoutCycle {
  const accountTrades = getAccountTrades(account, trades);
  const allDays = groupByDate(accountTrades);

  // For the current cycle, we use all trades since start (or last payout tracking would be external)
  const tradingDays = allDays;
  const tradePL = tradingDays.reduce((sum, d) => sum + d.dollarPL, 0);
  const currentBalance = (account.startingBalance ?? account.initialBalance) + tradePL;
  const config = APEX_ACCOUNT_CONFIGS[account.accountSize];
  const startBal = account.startingBalance ?? config.initialBalance;
  const remaining = account.drawdownRemaining ?? config.drawdownLimit;
  const drawdownFloor = startBal - remaining;
  const cushion = currentBalance - drawdownFloor;
  const safetyNet = config.safetyNet;
  const aboveSafetyNet = currentBalance >= safetyNet;
  const totalProfit = tradePL;

  const minProfitPerDay = account.ruleSet === 'legacy' ? 50 : 100;
  const profitDaysCount = tradingDays.filter(d => d.dollarPL >= minProfitPerDay).length;

  // 30% consistency rule (legacy only, through payout #5)
  const consistencyViolations: { date: string; percentage: number }[] = [];
  if (account.ruleSet === 'legacy' && account.payoutsCompleted < 6 && totalProfit > 0) {
    const threshold = totalProfit * 0.3;
    for (const day of tradingDays) {
      if (day.dollarPL > threshold) {
        const pct = (day.dollarPL / totalProfit) * 100;
        consistencyViolations.push({ date: day.date, percentage: pct });
      }
    }
  }

  const now = new Date();
  const inWindow = isInPayoutWindow(now);
  const nextWindowStart = inWindow ? null : getNextPayoutWindow(now);

  return {
    tradingDays,
    totalProfit,
    currentBalance,
    drawdownFloor,
    cushion,
    safetyNet,
    aboveSafetyNet,
    profitDaysCount,
    tradingDaysCount: tradingDays.length,
    consistencyViolations,
    inPayoutWindow: inWindow,
    nextWindowStart,
  };
}

export function checkEligibility(cycle: PayoutCycle, account: ApexAccount): EligibilityResult {
  const reasons: string[] = [];
  const requiredDays = 8;
  const requiredProfitDays = 5;
  const minPayout = 500;

  // Trading days check
  if (cycle.tradingDaysCount < requiredDays) {
    reasons.push(`Need ${requiredDays - cycle.tradingDaysCount} more trading day${requiredDays - cycle.tradingDaysCount !== 1 ? 's' : ''} (${cycle.tradingDaysCount}/${requiredDays})`);
  }

  // Profit days check
  const minProfitLabel = account.ruleSet === 'legacy' ? '$50' : '$100';
  if (cycle.profitDaysCount < requiredProfitDays) {
    reasons.push(`Need ${requiredProfitDays - cycle.profitDaysCount} more ${minProfitLabel}+ profit day${requiredProfitDays - cycle.profitDaysCount !== 1 ? 's' : ''} (${cycle.profitDaysCount}/${requiredProfitDays})`);
  }

  // Consistency rule (legacy, payouts 0-5)
  if (cycle.consistencyViolations.length > 0) {
    for (const v of cycle.consistencyViolations) {
      reasons.push(`${v.date} is ${v.percentage.toFixed(0)}% of total profit (max 30%)`);
    }
  }

  // Payout window check (legacy only)
  if (account.ruleSet === 'legacy' && !cycle.inPayoutWindow) {
    reasons.push(`Not in payout window (next: ${cycle.nextWindowStart})`);
  }

  // Minimum payout amount
  if (cycle.totalProfit < minPayout) {
    reasons.push('Below $500 minimum profit');
  }

  // Progress calculation: weight days (40%), profit days (40%), profit amount (20%)
  const dayProgress = Math.min(cycle.tradingDaysCount / requiredDays, 1);
  const profitDayProgress = Math.min(cycle.profitDaysCount / requiredProfitDays, 1);
  const profitProgress = Math.min(cycle.totalProfit / Math.max(account.payoutTarget, minPayout), 1);
  const progress = Math.round((dayProgress * 0.4 + profitDayProgress * 0.4 + profitProgress * 0.2) * 100);

  return {
    eligible: reasons.length === 0,
    reasons,
    progress: Math.max(0, Math.min(100, progress)),
  };
}
