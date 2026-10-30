import type { Instrument } from './instrument';

export interface CustomCategory {
  id: string;
  name: string;
  options: string[];
  /** Shown inside the Confluences box on the trade page instead of under Custom Fields. */
  showUnderConfluences?: boolean;
}

export interface DashboardWidgetConfig {
  [key: string]: boolean;
}

export interface Settings {
  confluences: string[];
  confluencesAgainst: string[];
  setupTypes: string[];
  grades: string[];
  instruments: Instrument[];
  defaultContracts: number;
  defaultInstrument: string;
  plDisplayMode: 'dollar' | 'points' | 'r';
  dashboardWidgets: DashboardWidgetConfig;
  customCategories: CustomCategory[];
  customHabitCategories: { key: string; label: string }[];
  tradingTimezone: string;
  categorySectionOrder: string[];
}
