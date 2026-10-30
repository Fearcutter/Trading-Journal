import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { SECTION_KEYS, type SectionKey } from '../constants/coachSections';

export interface ViewValue {
  mode: 'owner' | 'coach';
  journalOwnerId: string;
  ownerLabel: string;
  sharedSections: readonly SectionKey[];
  readOnly: boolean;
}

type ViewState =
  | { status: 'loading' }
  | { status: 'ready'; value: ViewValue }
  | { status: 'revoked'; ownerLabel: string };

const ViewContext = createContext<ViewValue | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const ownerView: ViewValue = {
      mode: 'owner',
      journalOwnerId: user.id,
      ownerLabel: user.email ?? '',
      sharedSections: SECTION_KEYS,
      readOnly: false,
    };

    async function detect() {
      const email = (user!.email ?? '').toLowerCase();
      const { data, error } = await supabase
        .from('coach_access')
        .select('owner_id, owner_email, sections, active')
        .eq('coach_email', email)
        .neq('owner_id', user!.id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setState({ status: 'ready', value: ownerView });
        return;
      }
      if (!data.active) {
        setState({ status: 'revoked', ownerLabel: data.owner_email });
        return;
      }
      setState({
        status: 'ready',
        value: {
          mode: 'coach',
          journalOwnerId: data.owner_id,
          ownerLabel: data.owner_email,
          sharedSections: (data.sections as string[]).filter((s): s is SectionKey =>
            (SECTION_KEYS as readonly string[]).includes(s)),
          readOnly: true,
        },
      });
    }

    detect();
    return () => { cancelled = true; };
  }, [user]);

  if (state.status === 'loading') {
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
          <button onClick={signOut} className="text-sm text-blue-400 hover:text-blue-300">Sign out</button>
        </div>
      </div>
    );
  }

  return <ViewContext.Provider value={state.value}>{children}</ViewContext.Provider>;
}

export function useView(): ViewValue {
  const context = useContext(ViewContext);
  if (!context) throw new Error('useView must be used within ViewProvider');
  return context;
}
