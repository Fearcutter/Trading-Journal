import { createContext, useContext, type ReactNode, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { BacktestSession } from '../types/backtest';
import { useSupabaseList } from '../hooks/useSupabaseList';

interface BacktestContextValue {
  /** Backtest sessions (folders left out). */
  sessions: BacktestSession[];
  folders: BacktestSession[];
  loading: boolean;
  addSession: (name: string, description: string, instrument: string | undefined, color: string, extra?: Partial<BacktestSession>) => BacktestSession;
  updateSession: (id: string, updates: Partial<BacktestSession>) => void;
  deleteSession: (id: string) => void;
  getSession: (id: string) => BacktestSession | undefined;
}

const BacktestContext = createContext<BacktestContextValue | null>(null);

export function BacktestProvider({ children }: { children: ReactNode }) {
  const [all, setSessions, loading] = useSupabaseList<BacktestSession>('backtest_sessions');
  const sessions = useMemo(() => all.filter(s => s.kind !== 'folder'), [all]);
  const folders = useMemo(() => all.filter(s => s.kind === 'folder'), [all]);

  const addSession = useCallback((name: string, description: string, instrument: string | undefined, color: string, extra: Partial<BacktestSession> = {}): BacktestSession => {
    const now = new Date().toISOString();
    const session: BacktestSession = {
      id: uuidv4(),
      name,
      description,
      instrument,
      color,
      createdAt: now,
      updatedAt: now,
      ...extra,
    };
    setSessions(prev => [session, ...prev]);
    return session;
  }, [setSessions]);

  const updateSession = useCallback((id: string, updates: Partial<BacktestSession>) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === id ? { ...s, ...updates, updatedAt: new Date().toISOString() } : s
      )
    );
  }, [setSessions]);

  // Deleting a folder moves its sessions out of it; their trades are never touched
  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev
      .filter(s => s.id !== id)
      .map(s => (s.folderId === id ? { ...s, folderId: undefined } : s)));
  }, [setSessions]);

  const getSession = useCallback((id: string) => {
    return all.find(s => s.id === id);
  }, [all]);

  return (
    <BacktestContext.Provider value={{ sessions, folders, loading, addSession, updateSession, deleteSession, getSession }}>
      {children}
    </BacktestContext.Provider>
  );
}

export function useBacktest() {
  const context = useContext(BacktestContext);
  if (!context) throw new Error('useBacktest must be used within BacktestProvider');
  return context;
}
