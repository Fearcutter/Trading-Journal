import { createContext, useContext, type ReactNode, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import type { LiveSession } from '../types/live-session';
import { useSupabaseList } from '../hooks/useSupabaseList';

interface LiveSessionContextValue {
  sessions: LiveSession[];
  loading: boolean;
  addSession: (name: string, description: string, instrument: string | undefined, color: string) => LiveSession;
  updateSession: (id: string, updates: Partial<LiveSession>) => void;
  deleteSession: (id: string) => void;
  getSession: (id: string) => LiveSession | undefined;
}

const LiveSessionContext = createContext<LiveSessionContextValue | null>(null);

export function LiveSessionProvider({ children }: { children: ReactNode }) {
  const [sessions, setSessions, loading] = useSupabaseList<LiveSession>('live_trading_sessions');

  const addSession = useCallback((name: string, description: string, instrument: string | undefined, color: string): LiveSession => {
    const now = new Date().toISOString();
    const session: LiveSession = {
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

  const updateSession = useCallback((id: string, updates: Partial<LiveSession>) => {
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
    <LiveSessionContext.Provider value={{ sessions, loading, addSession, updateSession, deleteSession, getSession }}>
      {children}
    </LiveSessionContext.Provider>
  );
}

export function useLiveSession() {
  const context = useContext(LiveSessionContext);
  if (!context) throw new Error('useLiveSession must be used within LiveSessionProvider');
  return context;
}
