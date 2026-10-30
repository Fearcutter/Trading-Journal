import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { resolveView, type CoachAccessLookup, type ResolvedView, type ViewValue } from './resolveView';

export type { ViewValue } from './resolveView';

interface ViewContextValue extends ViewValue {
  /** Open the other journal this login has access to (see otherJournalLabel). */
  switchJournal: () => void;
}

const ViewContext = createContext<ViewContextValue | null>(null);

const prefKey = (userId: string) => `journal-view-own-${userId}`;

function readPreferOwn(userId: string): boolean {
  try {
    return localStorage.getItem(prefKey(userId)) === '1';
  } catch {
    return false;
  }
}

function savePreferOwnAndReload(userId: string, preferOwn: boolean) {
  try {
    if (preferOwn) localStorage.setItem(prefKey(userId), '1');
    else localStorage.removeItem(prefKey(userId));
  } catch {
    // Storage blocked: the switch just won't be remembered
  }
  // Every data provider loads for one journal, so a fresh load is the clean switch
  window.location.assign('/');
}

export function ViewProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<ResolvedView | null>(null);
  const [preferOwn, setPreferOwn] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const prefersOwn = readPreferOwn(user.id);

    async function detect() {
      const email = (user!.email ?? '').toLowerCase();
      const { data, error } = await supabase
        .from('coach_access')
        .select('owner_id, owner_email, sections, active')
        .eq('coach_email', email)
        .neq('owner_id', user!.id)
        .order('created_at', { ascending: true })
        .limit(1);

      if (cancelled) return;
      const invite = !error && data && data.length > 0 ? (data[0] as CoachAccessLookup) : null;
      setPreferOwn(prefersOwn);
      setState(resolveView({ id: user!.id, email: user!.email ?? '' }, invite, prefersOwn));
    }

    detect();
    return () => { cancelled = true; };
  }, [user]);

  if (!state || !user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (state.status === 'revoked') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-lg font-semibold text-slate-50">Access turned off</h1>
          <p className="text-sm text-slate-400">
            Your access to {state.ownerLabel}'s journal has been turned off.
          </p>
          <div className="flex justify-center gap-4">
            <button onClick={() => savePreferOwnAndReload(user.id, true)} className="text-sm text-blue-400 hover:text-blue-300">
              Go to my own journal
            </button>
            <button onClick={signOut} className="text-sm text-slate-400 hover:text-slate-300">Sign out</button>
          </div>
        </div>
      </div>
    );
  }

  const value: ViewContextValue = {
    ...state.value,
    switchJournal: () => savePreferOwnAndReload(user.id, !preferOwn),
  };
  return <ViewContext.Provider value={value}>{children}</ViewContext.Provider>;
}

export function useView(): ViewContextValue {
  const context = useContext(ViewContext);
  if (!context) throw new Error('useView must be used within ViewProvider');
  return context;
}
