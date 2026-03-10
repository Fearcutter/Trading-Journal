import { createContext, useContext, type ReactNode, useCallback } from 'react';
import type { Instrument } from '../types/instrument';
import type { Settings, CustomCategory } from '../types/settings';
import { useSupabaseSingleton } from '../hooks/useSupabaseSingleton';
import { DEFAULT_INSTRUMENTS } from '../constants/instruments';
import { DEFAULT_CONFLUENCES, DEFAULT_CONFLUENCES_AGAINST } from '../constants/confluences';
import { DEFAULT_SETUP_TYPES } from '../constants/setupTypes';
import { DEFAULT_GRADES } from '../constants/grades';

interface SettingsContextValue extends Settings {
  addConfluence: (name: string) => void;
  removeConfluence: (name: string) => void;
  reorderConfluences: (confluences: string[]) => void;
  addConfluenceAgainst: (name: string) => void;
  removeConfluenceAgainst: (name: string) => void;
  reorderConfluencesAgainst: (confluencesAgainst: string[]) => void;
  addSetupType: (name: string) => void;
  removeSetupType: (name: string) => void;
  reorderSetupTypes: (setupTypes: string[]) => void;
  addGrade: (name: string) => void;
  removeGrade: (name: string) => void;
  reorderGrades: (grades: string[]) => void;
  addInstrument: (instrument: Instrument) => void;
  removeInstrument: (symbol: string) => void;
  updateDefaultContracts: (n: number) => void;
  updateDefaultInstrument: (symbol: string) => void;
  getInstrument: (symbol: string) => Instrument | undefined;
  updateSettings: (settings: Partial<Settings>) => void;
  addCustomCategory: (category: CustomCategory) => void;
  updateCustomCategory: (id: string, updates: Partial<CustomCategory>) => void;
  removeCustomCategory: (id: string) => void;
  addCustomCategoryOption: (categoryId: string, option: string) => void;
  removeCustomCategoryOption: (categoryId: string, option: string) => void;
  reorderCustomCategoryOptions: (categoryId: string, options: string[]) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const DEFAULT_DASHBOARD_WIDGETS: Record<string, boolean> = {
  cumulativePL: true,
  dailyPL: true,
  winLoss: true,
  plBySetup: true,
  plByEmotion: true,
  winRateByConfluences: true,
  timeOfDay: true,
  rrDistribution: true,
  todayCheckIn: true,
  streakSummary: true,
  recentReflections: true,
  dayRatingTrend: true,
};

const DEFAULT_SETTINGS: Settings = {
  confluences: DEFAULT_CONFLUENCES,
  confluencesAgainst: DEFAULT_CONFLUENCES_AGAINST,
  setupTypes: DEFAULT_SETUP_TYPES,
  grades: DEFAULT_GRADES,
  instruments: DEFAULT_INSTRUMENTS,
  defaultContracts: 1,
  defaultInstrument: 'NQ',
  plDisplayMode: 'dollar',
  dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS,
  customCategories: [],
  customHabitCategories: [],
  tradingTimezone: 'America/New_York',
  categorySectionOrder: ['confluences', 'confluencesAgainst'],
};

function migrateSettings(settings: Settings): Settings {
  let migrated = settings;
  // Ensure default instruments
  const existing = new Set(migrated.instruments.map(i => i.symbol));
  const missing = DEFAULT_INSTRUMENTS.filter(i => !existing.has(i.symbol));
  if (missing.length > 0) {
    migrated = { ...migrated, instruments: [...migrated.instruments, ...missing] };
  }
  // Ensure confluencesAgainst exists
  if (!migrated.confluencesAgainst) {
    migrated = { ...migrated, confluencesAgainst: [] };
  }
  // Ensure dashboardWidgets exists with all keys
  if (!migrated.dashboardWidgets) {
    migrated = { ...migrated, dashboardWidgets: DEFAULT_DASHBOARD_WIDGETS };
  } else {
    const merged = { ...DEFAULT_DASHBOARD_WIDGETS, ...migrated.dashboardWidgets };
    if (Object.keys(merged).length !== Object.keys(migrated.dashboardWidgets).length) {
      migrated = { ...migrated, dashboardWidgets: merged };
    }
  }
  // Ensure customCategories exists
  if (!migrated.customCategories) {
    migrated = { ...migrated, customCategories: [] };
  }
  // Ensure customHabitCategories exists
  if (!migrated.customHabitCategories) {
    migrated = { ...migrated, customHabitCategories: [] };
  }
  // Ensure tradingTimezone exists
  if (!migrated.tradingTimezone) {
    migrated = { ...migrated, tradingTimezone: 'America/New_York' };
  }
  // Ensure categorySectionOrder exists and is in sync
  if (!migrated.categorySectionOrder) {
    migrated = { ...migrated, categorySectionOrder: ['confluences', 'confluencesAgainst'] };
  }
  // Add any custom categories not yet in the order
  const orderSet = new Set(migrated.categorySectionOrder);
  const missingCats = (migrated.customCategories || [])
    .filter(c => !orderSet.has(c.id))
    .map(c => c.id);
  if (missingCats.length > 0) {
    migrated = { ...migrated, categorySectionOrder: [...migrated.categorySectionOrder, ...missingCats] };
  }
  // Remove entries for deleted custom categories
  const validIds = new Set(['confluences', 'confluencesAgainst', ...(migrated.customCategories || []).map(c => c.id)]);
  const filtered = migrated.categorySectionOrder.filter(id => validIds.has(id));
  if (filtered.length !== migrated.categorySectionOrder.length) {
    migrated = { ...migrated, categorySectionOrder: filtered };
  }
  return migrated;
}

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [rawSettings, setSettings] = useSupabaseSingleton<Settings>(DEFAULT_SETTINGS);
  const settings = migrateSettings(rawSettings);

  const addConfluence = useCallback((name: string) => {
    setSettings(prev => ({
      ...prev,
      confluences: prev.confluences.includes(name) ? prev.confluences : [...prev.confluences, name],
    }));
  }, [setSettings]);

  const removeConfluence = useCallback((name: string) => {
    setSettings(prev => ({
      ...prev,
      confluences: prev.confluences.filter(c => c !== name),
    }));
  }, [setSettings]);

  const reorderConfluences = useCallback((confluences: string[]) => {
    setSettings(prev => ({ ...prev, confluences }));
  }, [setSettings]);

  const addConfluenceAgainst = useCallback((name: string) => {
    setSettings(prev => ({
      ...prev,
      confluencesAgainst: prev.confluencesAgainst.includes(name) ? prev.confluencesAgainst : [...prev.confluencesAgainst, name],
    }));
  }, [setSettings]);

  const removeConfluenceAgainst = useCallback((name: string) => {
    setSettings(prev => ({
      ...prev,
      confluencesAgainst: prev.confluencesAgainst.filter(c => c !== name),
    }));
  }, [setSettings]);

  const reorderConfluencesAgainst = useCallback((confluencesAgainst: string[]) => {
    setSettings(prev => ({ ...prev, confluencesAgainst }));
  }, [setSettings]);

  const addSetupType = useCallback((name: string) => {
    setSettings(prev => ({
      ...prev,
      setupTypes: prev.setupTypes.includes(name) ? prev.setupTypes : [...prev.setupTypes, name],
    }));
  }, [setSettings]);

  const removeSetupType = useCallback((name: string) => {
    setSettings(prev => ({
      ...prev,
      setupTypes: prev.setupTypes.filter(s => s !== name),
    }));
  }, [setSettings]);

  const reorderSetupTypes = useCallback((setupTypes: string[]) => {
    setSettings(prev => ({ ...prev, setupTypes }));
  }, [setSettings]);

  const addGrade = useCallback((name: string) => {
    setSettings(prev => ({
      ...prev,
      grades: prev.grades.includes(name) ? prev.grades : [...prev.grades, name],
    }));
  }, [setSettings]);

  const removeGrade = useCallback((name: string) => {
    setSettings(prev => ({
      ...prev,
      grades: prev.grades.filter(g => g !== name),
    }));
  }, [setSettings]);

  const reorderGrades = useCallback((grades: string[]) => {
    setSettings(prev => ({ ...prev, grades }));
  }, [setSettings]);

  const addInstrument = useCallback((instrument: Instrument) => {
    setSettings(prev => ({
      ...prev,
      instruments: prev.instruments.some(i => i.symbol === instrument.symbol)
        ? prev.instruments
        : [...prev.instruments, instrument],
    }));
  }, [setSettings]);

  const removeInstrument = useCallback((symbol: string) => {
    setSettings(prev => ({
      ...prev,
      instruments: prev.instruments.filter(i => i.symbol !== symbol),
    }));
  }, [setSettings]);

  const updateDefaultContracts = useCallback((n: number) => {
    setSettings(prev => ({ ...prev, defaultContracts: n }));
  }, [setSettings]);

  const updateDefaultInstrument = useCallback((symbol: string) => {
    setSettings(prev => ({ ...prev, defaultInstrument: symbol }));
  }, [setSettings]);

  const getInstrument = useCallback((symbol: string) => {
    return settings.instruments.find(i => i.symbol === symbol);
  }, [settings.instruments]);

  const updateSettings = useCallback((partial: Partial<Settings>) => {
    setSettings(prev => ({ ...prev, ...partial }));
  }, [setSettings]);

  const addCustomCategory = useCallback((category: CustomCategory) => {
    setSettings(prev => ({
      ...prev,
      customCategories: [...(prev.customCategories || []), category],
    }));
  }, [setSettings]);

  const updateCustomCategory = useCallback((id: string, updates: Partial<CustomCategory>) => {
    setSettings(prev => ({
      ...prev,
      customCategories: (prev.customCategories || []).map(c => c.id === id ? { ...c, ...updates } : c),
    }));
  }, [setSettings]);

  const removeCustomCategory = useCallback((id: string) => {
    setSettings(prev => ({
      ...prev,
      customCategories: (prev.customCategories || []).filter(c => c.id !== id),
    }));
  }, [setSettings]);

  const addCustomCategoryOption = useCallback((categoryId: string, option: string) => {
    setSettings(prev => ({
      ...prev,
      customCategories: (prev.customCategories || []).map(c =>
        c.id === categoryId && !c.options.includes(option)
          ? { ...c, options: [...c.options, option] }
          : c
      ),
    }));
  }, [setSettings]);

  const removeCustomCategoryOption = useCallback((categoryId: string, option: string) => {
    setSettings(prev => ({
      ...prev,
      customCategories: (prev.customCategories || []).map(c =>
        c.id === categoryId ? { ...c, options: c.options.filter(o => o !== option) } : c
      ),
    }));
  }, [setSettings]);

  const reorderCustomCategoryOptions = useCallback((categoryId: string, options: string[]) => {
    setSettings(prev => ({
      ...prev,
      customCategories: (prev.customCategories || []).map(c =>
        c.id === categoryId ? { ...c, options } : c
      ),
    }));
  }, [setSettings]);

  return (
    <SettingsContext.Provider value={{
      ...settings,
      addConfluence,
      removeConfluence,
      reorderConfluences,
      addConfluenceAgainst,
      removeConfluenceAgainst,
      reorderConfluencesAgainst,
      addSetupType,
      removeSetupType,
      reorderSetupTypes,
      addGrade,
      removeGrade,
      reorderGrades,
      addInstrument,
      removeInstrument,
      updateDefaultContracts,
      updateDefaultInstrument,
      getInstrument,
      updateSettings,
      addCustomCategory,
      updateCustomCategory,
      removeCustomCategory,
      addCustomCategoryOption,
      removeCustomCategoryOption,
      reorderCustomCategoryOptions,
    }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used within SettingsProvider');
  return context;
}
