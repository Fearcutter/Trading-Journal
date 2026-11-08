import type { Instrument } from './instrument';
import type { FirmConfig } from '../utils/prop-ev';
import type { PracticeBankState } from '../utils/practice-bank';

export interface CustomCategory {
  id: string;
  name: string;
  options: string[];
  /** Join the trade page's FOR or AGAINST confluences instead of Custom Fields (null = off). */
  confluenceGroup?: 'for' | 'against' | null;
  /** Earlier on/off version of confluenceGroup; true meant FOR. */
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
  /** Prop Firm EV page: the user's edits to the built-in firm rules, by firm id. */
  propFirmOverrides?: Record<string, FirmConfig>;
  /** Practice bank: money moved in, allocated to and returned from practice folders. */
  practiceBank?: PracticeBankState;
}
