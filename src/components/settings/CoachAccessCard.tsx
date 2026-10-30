import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { SECTION_KEYS, SECTION_LABELS, type SectionKey } from '../../constants/coachSections';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

interface CoachAccessRow {
  coach_email: string;
  sections: SectionKey[];
  active: boolean;
}

export default function CoachAccessCard() {
  const { user } = useAuth();
  const [row, setRow] = useState<CoachAccessRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('coach_access')
      .select('coach_email, sections, active')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(`Failed to load coach access: ${error.message}`);
        setRow((data as CoachAccessRow | null) ?? null);
        setLoading(false);
      });
  }, [user]);

  const save = async (changes: Partial<CoachAccessRow>) => {
    if (!user || !row) return;
    const next = { ...row, ...changes };
    const { error } = await supabase
      .from('coach_access')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('owner_id', user.id);
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      return;
    }
    setRow(next);
  };

  const invite = async () => {
    if (!user) return;
    const coachEmail = email.trim().toLowerCase();
    if (!coachEmail.includes('@')) { toast.error('Enter a valid email'); return; }
    if (coachEmail === (user.email ?? '').toLowerCase()) { toast.error("That's your own email"); return; }
    const newRow: CoachAccessRow = { coach_email: coachEmail, sections: [...SECTION_KEYS], active: true };
    const { error } = await supabase
      .from('coach_access')
      .insert({ owner_id: user.id, owner_email: user.email ?? '', ...newRow });
    if (error) { toast.error(`Failed to invite: ${error.message}`); return; }
    setRow(newRow);
    setEmail('');
    toast.success('Coach invited');
  };

  const remove = async () => {
    if (!user) return;
    const { error } = await supabase.from('coach_access').delete().eq('owner_id', user.id);
    if (error) { toast.error(`Failed to remove: ${error.message}`); return; }
    setRow(null);
    setConfirmRemove(false);
    toast.success('Coach removed');
  };

  const toggleSection = (key: SectionKey) => {
    if (!row) return;
    const sections = row.sections.includes(key)
      ? row.sections.filter(s => s !== key)
      : SECTION_KEYS.filter(s => s === key || row.sections.includes(s));
    save({ sections });
  };

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300 mb-1">Coach Access</h3>
      <p className="text-xs text-slate-500 mb-4">
        Your coach signs up for the journal with this exact email, then sees a read-only view of the sections you tick and can comment on trades.
        Analytics, MFE/MAE, Category Analytics, Backtesting, Risk Calculator and Settings are never shared.
      </p>

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : !row ? (
        <div className="flex items-end gap-2 max-w-md">
          <div className="flex-1">
            <Input label="Coach email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="coach@example.com" />
          </div>
          <Button onClick={invite}>Invite</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-200">{row.coach_email}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${row.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
              {row.active ? 'Access on' : 'Access off'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SECTION_KEYS.map(key => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.sections.includes(key)}
                  onChange={() => toggleSection(key)}
                  className="rounded border-slate-600 bg-slate-800"
                />
                {SECTION_LABELS[key]}
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            {row.active ? (
              <Button variant="danger" size="sm" onClick={() => save({ active: false })}>Revoke access</Button>
            ) : (
              <>
                <Button size="sm" onClick={() => save({ active: true })}>Restore access</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>Remove coach</Button>
              </>
            )}
          </div>
        </div>
      )}

      <Modal open={confirmRemove} onOpenChange={setConfirmRemove} title="Remove coach?">
        <p className="text-sm text-slate-300 mb-4">
          This deletes {row?.coach_email}'s access settings. Their comments on your trades stay. You can invite a coach again later.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirmRemove(false)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={remove}>Remove</Button>
        </div>
      </Modal>
    </Card>
  );
}
