import type { EmotionBefore, EmotionAfter } from './trade';

export type TradingTendency =
  | 'Overtrading'
  | 'Revenge Trading'
  | 'Moving Stop Loss'
  | 'Early Exit'
  | 'Chasing Entry'
  | 'Ignoring Plan'
  | 'Position Sizing Error'
  | 'Trading During News';

export type HabitCategory = string;

export interface HabitDefinition {
  id: string;
  name: string;
  description: string;
  category: HabitCategory;
  isPreset: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface HabitCompletion {
  habitId: string;
  completed: boolean;
  note: string;
}

export interface RuleAdherenceItem {
  playbookEntryId: string;
  ruleName: string;
  ruleType: 'entry' | 'exit' | 'risk';
  followed: boolean;
}

export interface DailyHabitCheckIn {
  id: string;
  date: string; // YYYY-MM-DD
  emotionBefore: EmotionBefore | '';
  emotionAfter: EmotionAfter | '';
  tendencies: TradingTendency[];
  habitCompletions: HabitCompletion[];
  ruleAdherence: RuleAdherenceItem[];
  dayRating: number; // 1-5
  reflection: string;
  createdAt: string;
  updatedAt: string;
}

export type BadgeType =
  | 'streak-3'
  | 'streak-7'
  | 'streak-14'
  | 'streak-30'
  | 'streak-60'
  | 'streak-100'
  | 'perfect-week'
  | 'perfect-month';

export interface EarnedBadge {
  type: BadgeType;
  earnedAt: string;
  habitId?: string; // which habit triggered it, if applicable
}

export interface HabitStreak {
  habitId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string;
}
