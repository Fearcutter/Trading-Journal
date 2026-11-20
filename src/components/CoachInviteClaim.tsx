import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { clearPendingInvite } from '../utils/coach-invite';

/** Signed in with an invite link waiting: connect this login as the coach, then load fresh. */
export default function CoachInviteClaim({ token }: { token: string }) {
  const { signOut } = useAuth();
  const [result, setResult] = useState<{ ok: true; owner: string } | { ok: false; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.rpc('claim_coach_invite', { p_token: token }).then(({ data, error }) => {
      if (cancelled) return;
      clearPendingInvite();
      setResult(error ? { ok: false, message: error.message } : { ok: true, owner: String(data ?? '') });
    });
    return () => { cancelled = true; };
  }, [token]);

  // A fresh load from the home page lets the app pick up the new coach view
  const open = () => window.location.assign('/');

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
      <div className="max-w-md text-center space-y-4">
        {!result ? (
          <p className="text-slate-400">Accepting coach invite...</p>
        ) : result.ok ? (
          <>
            <h1 className="text-lg font-semibold text-slate-50">You're now a coach</h1>
            <p className="text-sm text-slate-400">
              You can view {result.owner || 'their'}'s journal (the sections they share) and comment on their trades.
            </p>
            <button onClick={open} className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg">
              Open their journal
            </button>
          </>
        ) : (
          <>
            <h1 className="text-lg font-semibold text-slate-50">Couldn't accept the invite</h1>
            <p className="text-sm text-slate-400">{result.message}</p>
            <div className="flex justify-center gap-4">
              <button onClick={open} className="text-sm text-blue-400 hover:text-blue-300">Continue</button>
              <button onClick={signOut} className="text-sm text-slate-400 hover:text-slate-300">Sign out</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
