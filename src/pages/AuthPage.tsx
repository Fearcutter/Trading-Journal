import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { pendingInviteToken } from '../utils/coach-invite';

export default function AuthPage() {
  const { signIn, signUp } = useAuth();
  const [inviteToken] = useState(pendingInviteToken);
  const [mode, setMode] = useState<'signin' | 'signup'>(inviteToken ? 'signup' : 'signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [signUpSuccess, setSignUpSuccess] = useState(false);
  // undefined while checking, null if the link is used/expired, otherwise who sent it
  const [inviter, setInviter] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!inviteToken) return;
    supabase.rpc('get_coach_invite', { p_token: inviteToken }).then(({ data }) => {
      setInviter(typeof data === 'string' && data ? data : null);
    });
  }, [inviteToken]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = mode === 'signin'
      ? await signIn(email, password)
      : await signUp(email, password);

    if (result.error) {
      setError(result.error);
    } else if (mode === 'signup') {
      setSignUpSuccess(true);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-bold text-slate-50 text-center mb-8">Trading Journal</h1>

        {inviteToken && inviter !== undefined && (
          <div className={`mb-4 rounded-xl border p-4 text-sm ${inviter ? 'border-blue-500/40 bg-blue-500/10 text-slate-200' : 'border-rose-500/40 bg-rose-500/10 text-rose-200'}`}>
            {inviter ? (
              <>
                <p className="font-medium text-slate-50 mb-1">You've been invited to coach {inviter}'s journal.</p>
                <p className="text-slate-400">
                  Create an account with any email (or sign in if you have one). After confirming your email, sign in on this
                  device, or open the invite link again, and you'll be connected.
                </p>
              </>
            ) : (
              <p>This invite link has expired, been used, or been cancelled. Ask for a new one.</p>
            )}
          </div>
        )}

        <div className="bg-slate-800 border border-slate-700 rounded-xl p-6">
          {/* Tabs */}
          <div className="flex border-b border-slate-700 mb-6">
            <button
              type="button"
              onClick={() => { setMode('signin'); setError(null); setSignUpSuccess(false); }}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                mode === 'signin'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setError(null); setSignUpSuccess(false); }}
              className={`flex-1 pb-3 text-sm font-medium border-b-2 transition-colors ${
                mode === 'signup'
                  ? 'border-blue-500 text-blue-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign Up
            </button>
          </div>

          {signUpSuccess ? (
            <div className="text-center py-4">
              <p className="text-emerald-400 text-sm font-medium mb-2">Account created!</p>
              <p className="text-slate-400 text-sm">Check your email for a confirmation link, then sign in.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-slate-300">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Min 6 characters"
                />
              </div>

              {error && (
                <p className="text-rose-400 text-sm">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-sm font-medium rounded-lg transition-colors"
              >
                {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
