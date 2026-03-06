import { createContext, useContext, type ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { DailyJournalEntry } from '../types/journal';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface JournalContextValue {
  entries: DailyJournalEntry[];
  addEntry: (data: Omit<DailyJournalEntry, 'id' | 'createdAt' | 'updatedAt'>) => DailyJournalEntry;
  updateEntry: (id: string, updates: Partial<DailyJournalEntry>) => void;
  deleteEntry: (id: string) => void;
  getEntryByDate: (date: string) => DailyJournalEntry | undefined;
}

const JournalContext = createContext<JournalContextValue | null>(null);

export function JournalProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useLocalStorage<DailyJournalEntry[]>('trading-journal-journal', []);

  const addEntry = useCallback((data: Omit<DailyJournalEntry, 'id' | 'createdAt' | 'updatedAt'>): DailyJournalEntry => {
    const now = new Date().toISOString();
    const entry: DailyJournalEntry = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    setEntries(prev => [entry, ...prev]);
    return entry;
  }, [setEntries]);

  const updateEntry = useCallback((id: string, updates: Partial<DailyJournalEntry>) => {
    setEntries(prev =>
      prev.map(e =>
        e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
      )
    );
  }, [setEntries]);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, [setEntries]);

  const getEntryByDate = useCallback((date: string) => {
    return entries.find(e => e.date === date);
  }, [entries]);

  return (
    <JournalContext.Provider value={{ entries, addEntry, updateEntry, deleteEntry, getEntryByDate }}>
      {children}
    </JournalContext.Provider>
  );
}

export function useJournal() {
  const context = useContext(JournalContext);
  if (!context) throw new Error('useJournal must be used within JournalProvider');
  return context;
}
