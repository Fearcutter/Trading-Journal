import { describe, it, expect } from 'vitest';
import { resolveView, type CoachAccessLookup } from './resolveView';
import { SECTION_KEYS } from '../constants/coachSections';

const me = { id: 'me', email: 'me@t.co' };
const row = (over: Partial<CoachAccessLookup> = {}): CoachAccessLookup => ({
  owner_id: 'owner', owner_email: 'owner@t.co', sections: ['dashboard', 'calendar'], active: true, ...over,
});

describe('resolveView', () => {
  it('no invite → my own journal, nothing to switch to', () => {
    expect(resolveView(me, null, false)).toEqual({
      status: 'ready',
      value: { mode: 'owner', journalOwnerId: 'me', ownerLabel: 'me@t.co', sharedSections: SECTION_KEYS, readOnly: false, otherJournalLabel: null },
    });
  });

  it('active invite → coach view of the owner, can switch back to my own', () => {
    expect(resolveView(me, row(), false)).toEqual({
      status: 'ready',
      value: { mode: 'coach', journalOwnerId: 'owner', ownerLabel: 'owner@t.co', sharedSections: ['dashboard', 'calendar'], readOnly: true, otherJournalLabel: 'my own journal' },
    });
  });

  it('invite but I chose my own journal → owner view with a way to switch to theirs', () => {
    const r = resolveView(me, row(), true);
    expect(r.status === 'ready' && r.value.mode).toBe('owner');
    expect(r.status === 'ready' && r.value.journalOwnerId).toBe('me');
    expect(r.status === 'ready' && r.value.otherJournalLabel).toBe("owner@t.co's journal");
  });

  it('revoked invite → access-off screen, unless I chose my own journal', () => {
    expect(resolveView(me, row({ active: false }), false)).toEqual({ status: 'revoked', ownerLabel: 'owner@t.co' });
    const own = resolveView(me, row({ active: false }), true);
    expect(own.status === 'ready' && own.value.mode).toBe('owner');
    expect(own.status === 'ready' && own.value.otherJournalLabel).toBeNull();
  });

  it('ignores unknown section names', () => {
    const r = resolveView(me, row({ sections: ['dashboard', 'analytics', 'settings'] }), false);
    expect(r.status === 'ready' && r.value.sharedSections).toEqual(['dashboard']);
  });
});
