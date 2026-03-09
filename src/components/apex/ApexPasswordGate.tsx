import { useState, useEffect, useCallback, type ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { hashPassword, verifyPassword } from '../../utils/password';
import Card from '../ui/Card';
import Button from '../ui/Button';
import { Landmark, Lock, KeyRound } from 'lucide-react';
import toast from 'react-hot-toast';

interface ApexPasswordGateProps {
  children: ReactNode;
  onLockStateChange?: (unlocked: boolean) => void;
  showChangePassword?: boolean;
  onChangePasswordDone?: () => void;
  requestLock?: boolean;
}

export default function ApexPasswordGate({ children, onLockStateChange, showChangePassword = false, onChangePasswordDone, requestLock = false }: ApexPasswordGateProps) {
  const { user } = useAuth();
  const [passwordHash, setPasswordHashState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('user_settings')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        const hash = (data?.data as Record<string, unknown>)?.fundedAccountsPasswordHash as string | null;
        setPasswordHashState(hash ?? null);
        setLoading(false);
      });
  }, [user]);

  const setPasswordHash = useCallback(async (hash: string | null) => {
    setPasswordHashState(hash);
    if (!user) return;
    const { data: existing } = await supabase
      .from('user_settings')
      .select('data')
      .eq('user_id', user.id)
      .maybeSingle();
    const current = (existing?.data ?? {}) as Record<string, unknown>;
    await supabase
      .from('user_settings')
      .upsert({ user_id: user.id, data: { ...current, fundedAccountsPasswordHash: hash } }, { onConflict: 'user_id' });
  }, [user]);

  // Parent can request re-lock
  useEffect(() => {
    if (requestLock && unlocked) {
      setUnlocked(false);
      onLockStateChange?.(false);
    }
  }, [requestLock]);

  const handleUnlock = (val: boolean) => {
    setUnlocked(val);
    onLockStateChange?.(val);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <span className="text-sm text-slate-500">Loading...</span>
      </div>
    );
  }

  // No password set yet — show setup form
  if (!passwordHash) {
    return <SetPasswordForm onSet={async (password) => {
      const hash = await hashPassword(password);
      setPasswordHash(hash);
      handleUnlock(true);
      toast.success('Password set');
    }} />;
  }

  // Password set but not unlocked — show enter form
  if (!unlocked) {
    return <EnterPasswordForm hash={passwordHash} onSuccess={() => handleUnlock(true)} />;
  }

  // Unlocked — show content with lock/change controls
  return (
    <>
      {showChangePassword && (
        <ChangePasswordForm
          currentHash={passwordHash}
          onChanged={async (newPassword) => {
            const hash = await hashPassword(newPassword);
            setPasswordHash(hash);
            onChangePasswordDone?.();
            toast.success('Password changed');
          }}
          onCancel={() => onChangePasswordDone?.()}
        />
      )}
      {children}
    </>
  );
}

// Exported so the page can render lock/change buttons in its header
export function ApexLockControls({ onLock, onChangePassword }: { onLock: () => void; onChangePassword: () => void }) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onChangePassword}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
      >
        <KeyRound size={14} />
        Change Password
      </button>
      <button
        onClick={onLock}
        className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700 rounded-lg transition-colors"
        title="Lock page"
      >
        <Lock size={14} />
        Lock
      </button>
    </div>
  );
}

function SetPasswordForm({ onSet }: { onSet: (password: string) => void }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password.length < 4) { setError('Password must be at least 4 characters'); return; }
    if (password !== confirm) { setError('Passwords do not match'); return; }
    onSet(password);
  };

  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center mb-2">
            <Landmark size={32} className="mx-auto text-blue-400 mb-2" />
            <h2 className="text-lg font-semibold text-slate-50">Funded Accounts</h2>
            <p className="text-xs text-slate-400 mt-1">Set a password to protect this page</p>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Confirm Password</label>
            <input
              type="password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <Button type="submit" className="w-full">Set Password</Button>
        </form>
      </Card>
    </div>
  );
}

function EnterPasswordForm({ hash, onSuccess }: { hash: string; onSuccess: () => void }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const valid = await verifyPassword(password, hash);
    if (valid) {
      onSuccess();
    } else {
      setError('Incorrect password');
      setPassword('');
    }
  };

  return (
    <div className="flex items-center justify-center py-16">
      <Card className="w-full max-w-sm">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="text-center mb-2">
            <Lock size={32} className="mx-auto text-slate-400 mb-2" />
            <h2 className="text-lg font-semibold text-slate-50">Funded Accounts</h2>
            <p className="text-xs text-slate-400 mt-1">Enter password to unlock</p>
          </div>
          <div className="space-y-1">
            <label className="block text-sm font-medium text-slate-300">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoFocus
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
          <Button type="submit" className="w-full">Unlock</Button>
        </form>
      </Card>
    </div>
  );
}

function ChangePasswordForm({ currentHash, onChanged, onCancel }: {
  currentHash: string;
  onChanged: (newPassword: string) => void;
  onCancel: () => void;
}) {
  const [current, setCurrent] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const valid = await verifyPassword(current, currentHash);
    if (!valid) { setError('Current password is incorrect'); return; }
    if (newPass.length < 4) { setError('New password must be at least 4 characters'); return; }
    if (newPass !== confirm) { setError('New passwords do not match'); return; }
    onChanged(newPass);
  };

  return (
    <Card className="mb-4">
      <form onSubmit={handleSubmit} className="space-y-3">
        <h3 className="text-sm font-medium text-slate-300">Change Password</h3>
        <div className="grid grid-cols-3 gap-3">
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-400">Current</label>
            <input type="password" value={current} onChange={e => setCurrent(e.target.value)} autoFocus
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-400">New</label>
            <input type="password" value={newPass} onChange={e => setNewPass(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="space-y-1">
            <label className="block text-xs font-medium text-slate-400">Confirm</label>
            <input type="password" value={confirm} onChange={e => setConfirm(e.target.value)}
              className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
        </div>
        {error && <p className="text-xs text-rose-400">{error}</p>}
        <div className="flex gap-2">
          <Button type="submit" size="sm">Save</Button>
          <Button type="button" size="sm" variant="secondary" onClick={onCancel}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
