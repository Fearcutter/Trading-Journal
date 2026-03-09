import type { HabitDefinition, BadgeType, TradingTendency } from '../types/habit';
import { v4 as uuidv4 } from 'uuid';

export const PRESET_HABITS: Omit<HabitDefinition, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'preset-risk-management',
    name: 'Followed Risk Management Rules',
    description: 'Maintained proper position sizing and stop losses',
    category: 'risk',
    isPreset: true,
    isActive: true,
  },
  {
    id: 'preset-max-loss',
    name: 'Respected Max Daily Loss',
    description: 'Did not exceed maximum daily loss limit',
    category: 'risk',
    isPreset: true,
    isActive: true,
  },
  {
    id: 'preset-waited-for-setup',
    name: 'Waited for A+ Setup',
    description: 'Only took trades that met all entry criteria',
    category: 'execution',
    isPreset: true,
    isActive: true,
  },
  {
    id: 'preset-followed-plan',
    name: 'Followed Trading Plan',
    description: 'Executed according to pre-market plan',
    category: 'execution',
    isPreset: true,
    isActive: true,
  },
  {
    id: 'preset-managed-emotions',
    name: 'Managed Emotions Well',
    description: 'Stayed calm and disciplined throughout the session',
    category: 'psychology',
    isPreset: true,
    isActive: true,
  },
  {
    id: 'preset-accepted-losses',
    name: 'Accepted Losses Gracefully',
    description: 'Did not revenge trade or tilt after losses',
    category: 'psychology',
    isPreset: true,
    isActive: true,
  },
  {
    id: 'preset-pre-market-prep',
    name: 'Completed Pre-Market Prep',
    description: 'Reviewed levels, news, and market conditions before trading',
    category: 'preparation',
    isPreset: true,
    isActive: true,
  },
  {
    id: 'preset-journaled-trades',
    name: 'Journaled All Trades',
    description: 'Documented every trade with notes and screenshots',
    category: 'preparation',
    isPreset: true,
    isActive: true,
  },
];

export const TRADING_TENDENCIES: TradingTendency[] = [
  'Overtrading',
  'Revenge Trading',
  'Moving Stop Loss',
  'Early Exit',
  'Chasing Entry',
  'Ignoring Plan',
  'Position Sizing Error',
  'Trading During News',
];

export const BADGE_DEFINITIONS: Record<BadgeType, { name: string; description: string; emoji: string }> = {
  'streak-3': { name: '3-Day Streak', description: 'Completed habits 3 days in a row', emoji: '🔥' },
  'streak-7': { name: 'Weekly Warrior', description: 'Completed habits 7 days in a row', emoji: '⚡' },
  'streak-14': { name: 'Two-Week Titan', description: 'Completed habits 14 days in a row', emoji: '💪' },
  'streak-30': { name: 'Monthly Master', description: 'Completed habits 30 days in a row', emoji: '🏆' },
  'streak-60': { name: 'Diamond Hands', description: 'Completed habits 60 days in a row', emoji: '💎' },
  'streak-100': { name: 'Century Club', description: 'Completed habits 100 days in a row', emoji: '👑' },
  'perfect-week': { name: 'Perfect Week', description: 'All habits completed every day for a week', emoji: '⭐' },
  'perfect-month': { name: 'Perfect Month', description: 'All habits completed every day for a month', emoji: '🌟' },
};

export const HABIT_CATEGORY_LABELS: Record<string, string> = {
  risk: 'Risk Management',
  execution: 'Execution',
  psychology: 'Psychology',
  preparation: 'Preparation',
};

export const HABIT_CATEGORY_COLORS: Record<string, string> = {
  risk: 'text-rose-400',
  execution: 'text-blue-400',
  psychology: 'text-purple-400',
  preparation: 'text-amber-400',
};

const CUSTOM_CATEGORY_COLORS = [
  'text-teal-400',
  'text-cyan-400',
  'text-emerald-400',
  'text-orange-400',
  'text-pink-400',
  'text-indigo-400',
  'text-lime-400',
  'text-sky-400',
];

export function getHabitCategoryColor(key: string, index: number = 0): string {
  return HABIT_CATEGORY_COLORS[key] || CUSTOM_CATEGORY_COLORS[index % CUSTOM_CATEGORY_COLORS.length];
}

export function createHabitDefinition(data: { name: string; description: string; category: string }): HabitDefinition {
  const now = new Date().toISOString();
  return {
    id: uuidv4(),
    name: data.name,
    description: data.description,
    category: data.category as HabitDefinition['category'],
    isPreset: false,
    isActive: true,
    createdAt: now,
    updatedAt: now,
  };
}
