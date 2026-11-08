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
  /**
   * Move a session into a folder (or out with null). Into a practice folder it becomes the next
   * attempt; leaving one, it goes back to a normal session.
   */
  moveToFolder: (id: string, folderId: string | null) => void;
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

  const moveToFolder = useCallback((id: string, folderId: string | null) => {
    setSessions(prev => {
      const target = folderId ? prev.find(s => s.id === folderId) : undefined;
      const nextAttempt = Math.max(0, ...prev.filter(s => s.folderId === folderId).map(s => s.attempt ?? 0)) + 1;
      return prev.map(s => {
        // An attempt's funded stage moves with it, and stays funded only inside a practice folder
        if (s.evalSessionId === id) {
          return target?.firmRules
            ? { ...s, folderId: folderId ?? undefined, attempt: nextAttempt }
            : { ...s, folderId: folderId ?? undefined, stage: undefined, attempt: undefined };
        }
        if (s.id !== id) return s;
        const { stage: _stage, attempt: _attempt, ...plain } = s;
        void _stage; void _attempt;
        const base = { ...plain, folderId: folderId ?? undefined, updatedAt: new Date().toISOString() };
        return target?.firmRules ? { ...base, stage: 'eval' as const, attempt: nextAttempt } : base;
      });
    });
  }, [setSessions]);

  const getSession = useCallback((id: string) => {
    return all.find(s => s.id === id);
  }, [all]);

  return (
    <BacktestContext.Provider value={{ sessions, folders, loading, addSession, updateSession, deleteSession, moveToFolder, getSession }}>
      {children}
    </BacktestContext.Provider>
  );
}

export function useBacktest() {
  const context = useContext(BacktestContext);
  if (!context) throw new Error('useBacktest must be used within BacktestProvider');
  return context;
}
