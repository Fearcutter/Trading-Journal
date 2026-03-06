import { createContext, useContext, type ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { BacktestSession } from '../types/backtest';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface BacktestContextValue {
  sessions: BacktestSession[];
  addSession: (name: string, description: string, instrument: string | undefined, color: string) => BacktestSession;
  updateSession: (id: string, updates: Partial<BacktestSession>) => void;
  deleteSession: (id: string) => void;
  getSession: (id: string) => BacktestSession | undefined;
}

const BacktestContext = createContext<BacktestContextValue | null>(null);

export function BacktestProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions] = useLocalStorage<BacktestSession[]>('trading-journal-backtest-sessions', []);

  const addSession = useCallback((name: string, description: string, instrument: string | undefined, color: string): BacktestSession => {
    const now = new Date().toISOString();
    const session: BacktestSession = {
      id: uuidv4(),
      name,
      description,
      instrument,
      color,
      createdAt: now,
      updatedAt: now,
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

  const deleteSession = useCallback((id: string) => {
    setSessions(prev => prev.filter(s => s.id !== id));
  }, [setSessions]);

  const getSession = useCallback((id: string) => {
    return sessions.find(s => s.id === id);
  }, [sessions]);

  return (
    <BacktestContext.Provider value={{ sessions, addSession, updateSession, deleteSession, getSession }}>
      {children}
    </BacktestContext.Provider>
  );
}

export function useBacktest() {
  const context = useContext(BacktestContext);
  if (!context) throw new Error('useBacktest must be used within BacktestProvider');
  return context;
}
