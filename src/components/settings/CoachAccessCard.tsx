import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { SECTION_KEYS, DEFAULT_INVITE_SECTIONS, SECTION_LABELS, type SectionKey } from '../../constants/coachSections';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';
import { INVITE_DAYS, inviteLink, makeInviteToken } from '../../utils/coach-invite';

interface CoachAccessRow {
  /** Empty while an invite link is waiting to be used. */
  coach_email: string | null;
  sections: SectionKey[];
  active: boolean;
  invite_token: string | null;
  invite_expires_at: string | null;
}

const freshInvite = () => ({
  invite_token: makeInviteToken(),
  invite_expires_at: new Date(Date.now() + INVITE_DAYS * 86_400_000).toISOString(),
});

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
      .select('coach_email, sections, active, invite_token, invite_expires_at')
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
    const newRow: CoachAccessRow = {
      coach_email: coachEmail, sections: [...DEFAULT_INVITE_SECTIONS], active: true, invite_token: null, invite_expires_at: null,
    };
    const { error } = await supabase
      .from('coach_access')
      .insert({ owner_id: user.id, owner_email: user.email ?? '', ...newRow });
    if (error) { toast.error(`Failed to invite: ${error.message}`); return; }
    setRow(newRow);
    setEmail('');
    toast.success('Coach invited');
  };

  const createLink = async () => {
    if (!user) return;
    const newRow: CoachAccessRow = { coach_email: null, sections: [...DEFAULT_INVITE_SECTIONS], active: true, ...freshInvite() };
    const { error } = await supabase
      .from('coach_access')
      .insert({ owner_id: user.id, owner_email: user.email ?? '', ...newRow });
    if (error) {
      toast.error(error.message.includes('null value') || error.message.includes('invite_token')
        ? 'Run supabase-coach-invite-link.sql in Supabase first'
        : `Failed to create link: ${error.message}`);
      return;
    }
    setRow(newRow);
    toast.success('Invite link created');
  };

  const copyLink = async (token: string) => {
    try {
      await navigator.clipboard.writeText(inviteLink(window.location.origin, token));
      toast.success('Link copied');
    } catch {
      toast.error('Could not copy. Select the link and copy it by hand.');
    }
  };

  const remove = async () => {
    if (!user) return;
    const { error } = await supabase.from('coach_access').delete().eq('owner_id', user.id);
    if (error) { toast.error(`Failed to remove: ${error.message}`); return; }
    const wasLink = !row?.coach_email;
    setRow(null);
    setConfirmRemove(false);
    toast.success(wasLink ? 'Invite link cancelled' : 'Coach removed');
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
        Invite your coach by email, or send them an invite link if you don't know it. Your coach signs up, then sees a read-only view of the sections you tick and can comment on trades.
        Analytics, MFE/MAE, Category Analytics, Backtesting, Risk Calculator and Settings are never shared.
      </p>

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : !row ? (
        <div className="space-y-3 max-w-md">
          <div className="flex items-end gap-2">
            <div className="flex-1">
              <Input label="Coach email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="coach@example.com" />
            </div>
            <Button onClick={invite}>Invite</Button>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-500">Don't know their email?</span>
            <Button variant="secondary" size="sm" onClick={createLink}>Create invite link</Button>
          </div>
        </div>
      ) : !row.coach_email ? (
        <PendingInvite
          row={row}
          onCopy={copyLink}
          onRenew={() => save(freshInvite())}
          onCancel={remove}
        />
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

function PendingInvite({ row, onCopy, onRenew, onCancel }: {
  row: CoachAccessRow;
  onCopy: (token: string) => void;
  onRenew: () => void;
  onCancel: () => void;
}) {
  const [now] = useState(() => Date.now());
  const expires = row.invite_expires_at ? new Date(row.invite_expires_at) : null;
  const expired = !row.invite_token || !expires || expires.getTime() < now;
  return (
    <div className="space-y-3 max-w-xl">
      <div className="flex items-center gap-3 text-sm">
        <span className="text-slate-200">Invite link</span>
        <span className={`text-xs px-2 py-0.5 rounded-full ${expired ? 'bg-rose-500/20 text-rose-400' : 'bg-amber-500/20 text-amber-400'}`}>
          {expired ? 'Expired' : 'Waiting to be used'}
        </span>
      </div>
      {!expired && row.invite_token && (
        <>
          <div className="flex gap-2">
            <input
              readOnly
              value={inviteLink(window.location.origin, row.invite_token)}
              onFocus={e => e.target.select()}
              className="flex-1 min-w-0 px-3 py-1.5 bg-slate-900 border border-slate-600 rounded-lg text-xs font-mono text-slate-300"
            />
            <Button size="sm" onClick={() => onCopy(row.invite_token!)}>Copy</Button>
          </div>
          <p className="text-xs text-slate-500">
            Send this privately. The first person to sign up through it becomes your coach, and the link then stops working.
            Expires {expires!.toLocaleDateString()}. Once they join, their email shows here and you choose which sections they see.
          </p>
        </>
      )}
      <div className="flex gap-2">
        <Button variant="secondary" size="sm" onClick={onRenew}>Make a new link</Button>
        <Button variant="ghost" size="sm" onClick={onCancel}>Cancel link</Button>
      </div>
    </div>
  );
}
