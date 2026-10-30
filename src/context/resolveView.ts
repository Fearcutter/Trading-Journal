import { SECTION_KEYS, type SectionKey } from '../constants/coachSections';

export interface CoachAccessLookup {
  owner_id: string;
  owner_email: string;
  sections: string[];
  active: boolean;
}

export interface ViewValue {
  mode: 'owner' | 'coach';
  journalOwnerId: string;
  ownerLabel: string;
  sharedSections: readonly SectionKey[];
  readOnly: boolean;
  /** Label of the other journal this login can switch to, or null if there is none. */
  otherJournalLabel: string | null;
}

export type ResolvedView =
  | { status: 'ready'; value: ViewValue }
  | { status: 'revoked'; ownerLabel: string };

/**
 * Decide which journal this login sees. An invite never traps anyone:
 * `preferOwn` (the user's saved choice) always wins and opens their own journal.
 */
export function resolveView(
  user: { id: string; email: string },
  invite: CoachAccessLookup | null,
  preferOwn: boolean,
): ResolvedView {
  const own = (otherJournalLabel: string | null): ResolvedView => ({
    status: 'ready',
    value: {
      mode: 'owner',
      journalOwnerId: user.id,
      ownerLabel: user.email,
      sharedSections: SECTION_KEYS,
      readOnly: false,
      otherJournalLabel,
    },
  });

  if (!invite) return own(null);
  if (preferOwn) return own(invite.active ? `${invite.owner_email}'s journal` : null);
  if (!invite.active) return { status: 'revoked', ownerLabel: invite.owner_email };

  return {
    status: 'ready',
    value: {
      mode: 'coach',
      journalOwnerId: invite.owner_id,
      ownerLabel: invite.owner_email,
      sharedSections: invite.sections.filter((s): s is SectionKey => (SECTION_KEYS as readonly string[]).includes(s)),
      readOnly: true,
      otherJournalLabel: 'my own journal',
    },
  };
}
