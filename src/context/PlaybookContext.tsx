import { createContext, useContext, type ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { PlaybookEntry } from '../types/playbook';
import { useIndexedDB } from '../hooks/useIndexedDB';

interface PlaybookContextValue {
  entries: PlaybookEntry[];
  addEntry: (data: Omit<PlaybookEntry, 'id' | 'createdAt' | 'updatedAt'>) => PlaybookEntry;
  updateEntry: (id: string, updates: Partial<PlaybookEntry>) => void;
  deleteEntry: (id: string) => void;
}

const PlaybookContext = createContext<PlaybookContextValue | null>(null);

export function PlaybookProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useIndexedDB<PlaybookEntry[]>('playbook', 'trading-journal-playbook', []);

  const addEntry = useCallback((data: Omit<PlaybookEntry, 'id' | 'createdAt' | 'updatedAt'>): PlaybookEntry => {
    const now = new Date().toISOString();
    const entry: PlaybookEntry = {
      ...data,
      id: uuidv4(),
      createdAt: now,
      updatedAt: now,
    };
    setEntries(prev => [entry, ...prev]);
    return entry;
  }, [setEntries]);

  const updateEntry = useCallback((id: string, updates: Partial<PlaybookEntry>) => {
    setEntries(prev =>
      prev.map(e =>
        e.id === id ? { ...e, ...updates, updatedAt: new Date().toISOString() } : e
      )
    );
  }, [setEntries]);

  const deleteEntry = useCallback((id: string) => {
    setEntries(prev => prev.filter(e => e.id !== id));
  }, [setEntries]);

  return (
    <PlaybookContext.Provider value={{ entries, addEntry, updateEntry, deleteEntry }}>
      {children}
    </PlaybookContext.Provider>
  );
}

export function usePlaybook() {
  const context = useContext(PlaybookContext);
  if (!context) throw new Error('usePlaybook must be used within PlaybookProvider');
  return context;
}
