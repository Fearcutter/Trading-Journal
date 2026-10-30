import { describe, it, expect } from 'vitest';
import { SECTION_KEYS, sectionForPath, canViewPath, firstSharedPath } from './coachSections';

describe('sectionForPath', () => {
  it.each([
    ['/', 'dashboard'],
    ['/live-trading', 'live_trading'],
    ['/live-trading/abc-123', 'live_trading'],
    ['/trades/abc-123', 'trade_details'],
    ['/calendar', 'calendar'],
    ['/journal', 'journal'],
    ['/habits', 'journal'],
    ['/playbook', 'playbook'],
    ['/apex-accounts', 'apex_accounts'],
  ])('%s → %s', (path, section) => {
    expect(sectionForPath(path)).toBe(section);
  });

  it.each(['/analytics', '/mfe-mae', '/confluences', '/category-analytics', '/backtesting', '/backtesting/x', '/risk-calculator', '/settings', '/nope'])(
    '%s is never shareable',
    path => { expect(sectionForPath(path)).toBeNull(); },
  );
});

describe('canViewPath', () => {
  it('owner can view everything', () => {
    expect(canViewPath('/backtesting', 'owner', [])).toBe(true);
    expect(canViewPath('/settings', 'owner', [])).toBe(true);
  });
  it('coach can view a shared section', () => {
    expect(canViewPath('/trades/1', 'coach', ['trade_details'])).toBe(true);
  });
  it('coach cannot view an unshared section', () => {
    expect(canViewPath('/trades/1', 'coach', ['dashboard'])).toBe(false);
  });
  it('coach cannot view never-shareable pages even with everything shared', () => {
    expect(canViewPath('/analytics', 'coach', SECTION_KEYS)).toBe(false);
    expect(canViewPath('/settings', 'coach', SECTION_KEYS)).toBe(false);
  });
});

describe('firstSharedPath', () => {
  it('prefers the dashboard', () => {
    expect(firstSharedPath(SECTION_KEYS)).toBe('/');
  });
  it('skips to the next shared section with a page', () => {
    expect(firstSharedPath(['trade_details', 'calendar'])).toBe('/calendar');
  });
  it('returns null when only trade details (no nav page) is shared', () => {
    expect(firstSharedPath(['trade_details'])).toBeNull();
  });
  it('returns null when nothing is shared', () => {
    expect(firstSharedPath([])).toBeNull();
  });
});
