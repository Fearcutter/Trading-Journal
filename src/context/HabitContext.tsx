import { createContext, useContext, type ReactNode, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { HabitDefinition, DailyHabitCheckIn, EarnedBadge } from '../types/habit';
import { useSupabaseList } from '../hooks/useSupabaseList';
import { PRESET_HABITS, BADGE_DEFINITIONS } from '../constants/habits';
import { evaluateBadges } from '../utils/habit-stats';
import toast from 'react-hot-toast';

interface HabitContextValue {
  definitions: HabitDefinition[];
  checkIns: DailyHabitCheckIn[];
  badges: EarnedBadge[];
  addDefinition: (data: Omit<HabitDefinition, 'id' | 'createdAt' | 'updatedAt'>) => HabitDefinition;
  updateDefinition: (id: string, updates: Partial<HabitDefinition>) => void;
  deleteDefinition: (id: string) => void;
  saveCheckIn: (data: Omit<DailyHabitCheckIn, 'id' | 'createdAt' | 'updatedAt'>) => DailyHabitCheckIn;
  updateCheckIn: (id: string, updates: Partial<DailyHabitCheckIn>) => void;
  deleteCheckIn: (id: string) => void;
  getCheckInByDate: (date: string) => DailyHabitCheckIn | undefined;
}

const HabitContext = createContext<HabitContextValue | null>(null);

function initializeDefinitions(stored: HabitDefinition[]): HabitDefinition[] {
  if (stored.length > 0) return stored;
  const now = new Date().toISOString();
  return PRESET_HABITS.map(h => ({ ...h, createdAt: now, updatedAt: now }));
}

export function HabitProvider({ children }: { children: ReactNode }) {
  const [storedDefs, setDefinitions] = useSupabaseList<HabitDefinition>('habit_definitions');
  const [checkIns, setCheckIns] = useSupabaseList<DailyHabitCheckIn>('habit_checkins');
  const [badges, setBadges] = useSupabaseList<EarnedBadge>('habit_badges');

  const definitions = useMemo(() => initializeDefinitions(storedDefs), [storedDefs]);

  const addDefinition = useCallback((data: Omit<HabitDefinition, 'id' | 'createdAt' | 'updatedAt'>): HabitDefinition => {
    const now = new Date().toISOString();
    const def: HabitDefinition = { ...data, id: uuidv4(), createdAt: now, updatedAt: now };
    setDefinitions(prev => [...initializeDefinitions(prev), def]);
    return def;
  }, [setDefinitions]);

  const updateDefinition = useCallback((id: string, updates: Partial<HabitDefinition>) => {
    setDefinitions(prev =>
      initializeDefinitions(prev).map(d =>
        d.id === id ? { ...d, ...updates, updatedAt: new Date().toISOString() } : d
      )
    );
  }, [setDefinitions]);

  const deleteDefinition = useCallback((id: string) => {
    setDefinitions(prev => initializeDefinitions(prev).filter(d => d.id !== id));
  }, [setDefinitions]);

  const checkForNewBadges = useCallback((updatedCheckIns: DailyHabitCheckIn[], currentBadges: EarnedBadge[]) => {
    const activeHabits = definitions.filter(d => d.isActive);
    const newBadges = evaluateBadges(updatedCheckIns, activeHabits, currentBadges);
    if (newBadges.length > 0) {
      setBadges(prev => [...prev, ...newBadges]);
      for (const badge of newBadges) {
        const def = BADGE_DEFINITIONS[badge.type];
        toast.success(`${def.emoji} Badge earned: ${def.name}!`);
      }
    }
  }, [definitions, setBadges]);

  const saveCheckIn = useCallback((data: Omit<DailyHabitCheckIn, 'id' | 'createdAt' | 'updatedAt'>): DailyHabitCheckIn => {
    const now = new Date().toISOString();
    const existing = checkIns.find(c => c.date === data.date);

    if (existing) {
      const updated = { ...existing, ...data, updatedAt: now };
      const updatedList = checkIns.map(c => c.id === existing.id ? updated : c);
      setCheckIns(updatedList);
      checkForNewBadges(updatedList, badges);
      return updated;
    }

    const checkIn: DailyHabitCheckIn = { ...data, id: uuidv4(), createdAt: now, updatedAt: now };
    const updatedList = [checkIn, ...checkIns];
    setCheckIns(updatedList);
    checkForNewBadges(updatedList, badges);
    return checkIn;
  }, [checkIns, setCheckIns, badges, checkForNewBadges]);

  const updateCheckIn = useCallback((id: string, updates: Partial<DailyHabitCheckIn>) => {
    setCheckIns(prev =>
      prev.map(c =>
        c.id === id ? { ...c, ...updates, updatedAt: new Date().toISOString() } : c
      )
    );
  }, [setCheckIns]);

  const deleteCheckIn = useCallback((id: string) => {
    setCheckIns(prev => prev.filter(c => c.id !== id));
  }, [setCheckIns]);

  const getCheckInByDate = useCallback((date: string) => {
    return checkIns.find(c => c.date === date);
  }, [checkIns]);

  return (
    <HabitContext.Provider value={{
      definitions, checkIns, badges,
      addDefinition, updateDefinition, deleteDefinition,
      saveCheckIn, updateCheckIn, deleteCheckIn, getCheckInByDate,
    }}>
      {children}
    </HabitContext.Provider>
  );
}

export function useHabits() {
  const context = useContext(HabitContext);
  if (!context) throw new Error('useHabits must be used within HabitProvider');
  return context;
}
