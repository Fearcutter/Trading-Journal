import { format, subDays, differenceInCalendarDays, parseISO, startOfDay } from 'date-fns';
import { v4 as uuidv4 } from 'uuid';
import type { DailyHabitCheckIn, HabitDefinition, HabitStreak, EarnedBadge, BadgeType } from '../types/habit';

export function computeStreaks(checkIns: DailyHabitCheckIn[], definitions: HabitDefinition[]): HabitStreak[] {
  const activeHabits = definitions.filter(d => d.isActive);
  const sortedCheckIns = [...checkIns].sort((a, b) => b.date.localeCompare(a.date));

  return activeHabits.map(habit => {
    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;
    let lastCompletedDate = '';
    let expectedDate = format(new Date(), 'yyyy-MM-dd');

    for (const checkIn of sortedCheckIns) {
      const completion = checkIn.habitCompletions.find(c => c.habitId === habit.id);
      if (!completion?.completed) {
        if (tempStreak > 0) {
          longestStreak = Math.max(longestStreak, tempStreak);
          if (currentStreak === 0 && tempStreak === currentStreak) {
            // reset
          }
          tempStreak = 0;
        }
        continue;
      }

      if (!lastCompletedDate) lastCompletedDate = checkIn.date;

      const dayDiff = differenceInCalendarDays(parseISO(expectedDate), parseISO(checkIn.date));

      if (dayDiff <= 1) {
        tempStreak++;
        expectedDate = checkIn.date;
      } else {
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
        expectedDate = checkIn.date;
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    // Compute current streak from today backwards
    currentStreak = 0;
    let checkDate = format(new Date(), 'yyyy-MM-dd');
    for (let i = 0; i < 365; i++) {
      const checkIn = sortedCheckIns.find(c => c.date === checkDate);
      const completion = checkIn?.habitCompletions.find(c => c.habitId === habit.id);
      if (completion?.completed) {
        currentStreak++;
        checkDate = format(subDays(parseISO(checkDate), 1), 'yyyy-MM-dd');
      } else {
        // Allow today to be incomplete (streak continues from yesterday)
        if (i === 0) {
          checkDate = format(subDays(parseISO(checkDate), 1), 'yyyy-MM-dd');
          continue;
        }
        break;
      }
    }

    return { habitId: habit.id, currentStreak, longestStreak, lastCompletedDate };
  });
}

export function evaluateBadges(
  checkIns: DailyHabitCheckIn[],
  activeHabits: HabitDefinition[],
  existingBadges: EarnedBadge[]
): EarnedBadge[] {
  const newBadges: EarnedBadge[] = [];
  const existingTypes = new Set(existingBadges.map(b => b.type));
  const now = new Date().toISOString();

  // Check overall streak badges (all active habits completed)
  const sortedCheckIns = [...checkIns].sort((a, b) => b.date.localeCompare(a.date));
  let overallStreak = 0;
  let checkDate = format(new Date(), 'yyyy-MM-dd');

  for (let i = 0; i < 365; i++) {
    const checkIn = sortedCheckIns.find(c => c.date === checkDate);
    if (!checkIn) {
      if (i === 0) {
        checkDate = format(subDays(parseISO(checkDate), 1), 'yyyy-MM-dd');
        continue;
      }
      break;
    }
    const allCompleted = activeHabits.every(h =>
      checkIn.habitCompletions.some(c => c.habitId === h.id && c.completed)
    );
    if (allCompleted) {
      overallStreak++;
      checkDate = format(subDays(parseISO(checkDate), 1), 'yyyy-MM-dd');
    } else {
      if (i === 0) {
        checkDate = format(subDays(parseISO(checkDate), 1), 'yyyy-MM-dd');
        continue;
      }
      break;
    }
  }

  const streakBadges: [number, BadgeType][] = [
    [3, 'streak-3'], [7, 'streak-7'], [14, 'streak-14'],
    [30, 'streak-30'], [60, 'streak-60'], [100, 'streak-100'],
  ];

  for (const [threshold, badgeType] of streakBadges) {
    if (overallStreak >= threshold && !existingTypes.has(badgeType)) {
      newBadges.push({ id: uuidv4(), type: badgeType, earnedAt: now });
      existingTypes.add(badgeType);
    }
  }

  // Perfect week: 7 consecutive days with all habits
  if (overallStreak >= 7 && !existingTypes.has('perfect-week')) {
    newBadges.push({ id: uuidv4(), type: 'perfect-week', earnedAt: now });
  }

  // Perfect month: 30 consecutive days with all habits
  if (overallStreak >= 30 && !existingTypes.has('perfect-month')) {
    newBadges.push({ id: uuidv4(), type: 'perfect-month', earnedAt: now });
  }

  return newBadges;
}

export function getAdherenceRate(checkIns: DailyHabitCheckIn[], habitId: string): number {
  const relevant = checkIns.filter(c =>
    c.habitCompletions.some(h => h.habitId === habitId)
  );
  if (relevant.length === 0) return 0;

  const completed = relevant.filter(c =>
    c.habitCompletions.some(h => h.habitId === habitId && h.completed)
  ).length;

  return completed / relevant.length;
}

export function getHeatmapData(checkIns: DailyHabitCheckIn[]): Map<string, number> {
  const heatmap = new Map<string, number>();
  const today = startOfDay(new Date());

  // Initialize last 365 days with 0
  for (let i = 0; i < 365; i++) {
    const date = format(subDays(today, i), 'yyyy-MM-dd');
    heatmap.set(date, 0);
  }

  for (const checkIn of checkIns) {
    if (!heatmap.has(checkIn.date)) continue;
    const total = checkIn.habitCompletions.length;
    if (total === 0) continue;
    const completed = checkIn.habitCompletions.filter(c => c.completed).length;
    heatmap.set(checkIn.date, completed / total);
  }

  return heatmap;
}
