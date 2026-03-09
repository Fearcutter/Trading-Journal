import type { Trade } from '../types/trade';
import type { DailyHabitCheckIn, TradingTendency } from '../types/habit';
import { format, parseISO, subDays, startOfWeek, endOfWeek } from 'date-fns';

interface HabitPLCorrelation {
  habitId: string;
  habitName: string;
  followedDays: number;
  notFollowedDays: number;
  avgPLWhenFollowed: number;
  avgPLWhenNotFollowed: number;
}

interface TendencyFrequency {
  tendency: TradingTendency;
  count: number;
  avgPL: number;
}

interface WeeklyAdherence {
  weekStart: string;
  adherenceRate: number;
}

export function correlateHabitsWithPL(
  checkIns: DailyHabitCheckIn[],
  trades: Trade[],
  habitNames: Record<string, string>
): HabitPLCorrelation[] {
  const tradesByDate = new Map<string, Trade[]>();
  for (const trade of trades) {
    const date = trade.date;
    if (!tradesByDate.has(date)) tradesByDate.set(date, []);
    tradesByDate.get(date)!.push(trade);
  }

  const habitMap = new Map<string, { followedPLs: number[]; notFollowedPLs: number[] }>();

  for (const checkIn of checkIns) {
    const dayTrades = tradesByDate.get(checkIn.date);
    if (!dayTrades || dayTrades.length === 0) continue;
    const dayPL = dayTrades.reduce((sum, t) => sum + t.dollarPL, 0);

    for (const completion of checkIn.habitCompletions) {
      if (!habitMap.has(completion.habitId)) {
        habitMap.set(completion.habitId, { followedPLs: [], notFollowedPLs: [] });
      }
      const entry = habitMap.get(completion.habitId)!;
      if (completion.completed) {
        entry.followedPLs.push(dayPL);
      } else {
        entry.notFollowedPLs.push(dayPL);
      }
    }
  }

  const results: HabitPLCorrelation[] = [];
  for (const [habitId, data] of habitMap) {
    const avg = (arr: number[]) => arr.length > 0 ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
    results.push({
      habitId,
      habitName: habitNames[habitId] || habitId,
      followedDays: data.followedPLs.length,
      notFollowedDays: data.notFollowedPLs.length,
      avgPLWhenFollowed: avg(data.followedPLs),
      avgPLWhenNotFollowed: avg(data.notFollowedPLs),
    });
  }

  return results.sort((a, b) =>
    (b.avgPLWhenFollowed - b.avgPLWhenNotFollowed) - (a.avgPLWhenFollowed - a.avgPLWhenNotFollowed)
  );
}

export function correlateTendenciesWithPL(
  checkIns: DailyHabitCheckIn[],
  trades: Trade[]
): TendencyFrequency[] {
  const tradesByDate = new Map<string, Trade[]>();
  for (const trade of trades) {
    if (!tradesByDate.has(trade.date)) tradesByDate.set(trade.date, []);
    tradesByDate.get(trade.date)!.push(trade);
  }

  const tendencyMap = new Map<TradingTendency, { count: number; totalPL: number }>();

  for (const checkIn of checkIns) {
    const dayTrades = tradesByDate.get(checkIn.date);
    if (!dayTrades || dayTrades.length === 0) continue;
    const dayPL = dayTrades.reduce((sum, t) => sum + t.dollarPL, 0);

    for (const tendency of checkIn.tendencies) {
      if (!tendencyMap.has(tendency)) tendencyMap.set(tendency, { count: 0, totalPL: 0 });
      const entry = tendencyMap.get(tendency)!;
      entry.count++;
      entry.totalPL += dayPL;
    }
  }

  return Array.from(tendencyMap.entries())
    .map(([tendency, data]) => ({
      tendency,
      count: data.count,
      avgPL: data.count > 0 ? data.totalPL / data.count : 0,
    }))
    .sort((a, b) => b.count - a.count);
}

export function getAdherenceTimeSeries(checkIns: DailyHabitCheckIn[]): WeeklyAdherence[] {
  if (checkIns.length === 0) return [];

  const sorted = [...checkIns].sort((a, b) => a.date.localeCompare(b.date));
  const weeks = new Map<string, { completed: number; total: number }>();

  for (const checkIn of sorted) {
    const weekStartDate = startOfWeek(parseISO(checkIn.date), { weekStartsOn: 1 });
    const weekKey = format(weekStartDate, 'yyyy-MM-dd');

    if (!weeks.has(weekKey)) weeks.set(weekKey, { completed: 0, total: 0 });
    const week = weeks.get(weekKey)!;

    for (const completion of checkIn.habitCompletions) {
      week.total++;
      if (completion.completed) week.completed++;
    }
  }

  return Array.from(weeks.entries())
    .map(([weekStart, data]) => ({
      weekStart,
      adherenceRate: data.total > 0 ? data.completed / data.total : 0,
    }))
    .sort((a, b) => a.weekStart.localeCompare(b.weekStart));
}
