export const SECTION_KEYS = [
  'dashboard',
  'live_trading',
  'trade_details',
  'calendar',
  'journal',
  'playbook',
  'apex_accounts',
  'backtesting',
] as const;

export type SectionKey = typeof SECTION_KEYS[number];

/** Ticked on a new invite. Backtesting is opt-in. Matches the coach_access.sections default in SQL. */
export const DEFAULT_INVITE_SECTIONS: SectionKey[] = SECTION_KEYS.filter(k => k !== 'backtesting');

export const SECTION_LABELS: Record<SectionKey, string> = {
  dashboard: 'Dashboard',
  live_trading: 'Live Trading',
  trade_details: 'Trade Details',
  calendar: 'Calendar',
  journal: 'Journal / Habits',
  playbook: 'Playbook',
  apex_accounts: 'Funded Accounts',
  backtesting: 'Backtesting',
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
  backtesting: '/backtesting',
};

export function sectionForPath(path: string): SectionKey | null {
  if (path === '/') return 'dashboard';
  if (path === '/live-trading' || path.startsWith('/live-trading/')) return 'live_trading';
  if (path.startsWith('/trades/')) return 'trade_details';
  if (path === '/calendar') return 'calendar';
  if (path === '/journal' || path === '/habits') return 'journal';
  if (path === '/playbook') return 'playbook';
  if (path === '/apex-accounts') return 'apex_accounts';
  if (path === '/backtesting' || path.startsWith('/backtesting/')) return 'backtesting';
  return null;
}

export function canViewPath(path: string, mode: 'owner' | 'coach', shared: readonly SectionKey[]): boolean {
  if (mode === 'owner') return true;
  const section = sectionForPath(path);
  // Backtest trades open on the trade page too, so backtesting alone unlocks it
  // (the database only returns the trades the coach may see).
  if (section === 'trade_details' && shared.includes('backtesting')) return true;
  return section !== null && shared.includes(section);
}

/** Opening and commenting on a trade: live trades follow Trade Details, backtest trades follow Backtesting. */
export function canOpenTrade(isBacktestTrade: boolean, shared: readonly SectionKey[]): boolean {
  return shared.includes(isBacktestTrade ? 'backtesting' : 'trade_details');
}

export function firstSharedPath(shared: readonly SectionKey[]): string | null {
  for (const key of SECTION_KEYS) {
    const path = SECTION_NAV_PATH[key];
    if (path && shared.includes(key)) return path;
  }
  return null;
}
