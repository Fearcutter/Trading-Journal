export const SECTION_KEYS = [
  'dashboard',
  'live_trading',
  'trade_details',
  'calendar',
  'journal',
  'playbook',
  'apex_accounts',
] as const;

export type SectionKey = typeof SECTION_KEYS[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  dashboard: 'Dashboard',
  live_trading: 'Live Trading',
  trade_details: 'Trade Details',
  calendar: 'Calendar',
  journal: 'Journal / Habits',
  playbook: 'Playbook',
  apex_accounts: 'Funded Accounts',
};

/** Sidebar page for each section, in display order. Trade Details has no nav page. */
export const SECTION_NAV_PATH: Record<SectionKey, string | null> = {
  dashboard: '/',
  live_trading: '/live-trading',
  trade_details: null,
  calendar: '/calendar',
  journal: '/journal',
  playbook: '/playbook',
  apex_accounts: '/apex-accounts',
};

export function sectionForPath(path: string): SectionKey | null {
  if (path === '/') return 'dashboard';
  if (path === '/live-trading' || path.startsWith('/live-trading/')) return 'live_trading';
  if (path.startsWith('/trades/')) return 'trade_details';
  if (path === '/calendar') return 'calendar';
  if (path === '/journal' || path === '/habits') return 'journal';
  if (path === '/playbook') return 'playbook';
  if (path === '/apex-accounts') return 'apex_accounts';
  return null;
}

export function canViewPath(path: string, mode: 'owner' | 'coach', shared: readonly SectionKey[]): boolean {
  if (mode === 'owner') return true;
  const section = sectionForPath(path);
  return section !== null && shared.includes(section);
}

export function firstSharedPath(shared: readonly SectionKey[]): string | null {
  for (const key of SECTION_KEYS) {
    const path = SECTION_NAV_PATH[key];
    if (path && shared.includes(key)) return path;
  }
  return null;
}
