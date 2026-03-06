import { createContext, useContext, type ReactNode, useCallback } from 'react';
import type { Instrument } from '../types/instrument';
import type { Settings } from '../types/settings';
import { useLocalStorage } from '../hooks/useLocalStorage';
import { DEFAULT_INSTRUMENTS } from '../constants/instruments';
import { DEFAULT_CONFLUENCES } from '../constants/confluences';
import { DEFAULT_SETUP_TYPES } from '../constants/setupTypes';
import { DEFAULT_GRADES } from '../constants/grades';

interface SettingsContextValue extends Settings {
  addConfluence: (name: string) => void;
  removeConfluence: (name: string) => void;
  addSetupType: (name: string) => void;
  removeSetupType: (name: string) => void;
  addGrade: (name: string) => void;
  removeGrade: (name: string) => void;
  addInstrument: (instrument: Instrument) => void;
  removeInstrument: (symbol: string) => void;
  updateDefaultContracts: (n: number) => void;
  updateDefaultInstrument: (symbol: string) => void;
  getInstrument: (symbol: string) => Instrument | undefined;
  updateSettings: (settings: Partial<Settings>) => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

const DEFAULT_SETTINGS: Settings = {
  confluences: DEFAULT_CONFLUENCES,
  setupTypes: DEFAULT_SETUP_TYPES,
  grades: DEFAULT_GRADES,
  instruments: DEFAULT_INSTRUMENTS,
  defaultContracts: 1,
  defaultInstrument: 'NQ',
};

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useLocalStorage<Settings>('trading-journal-settings', DEFAULT_SETTINGS);

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

  return (
    <SettingsContext.Provider value={{
      ...settings,
      addConfluence,
      removeConfluence,
      addSetupType,
      removeSetupType,
      addGrade,
      removeGrade,
      addInstrument,
      removeInstrument,
      updateDefaultContracts,
      updateDefaultInstrument,
      getInstrument,
      updateSettings,
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
