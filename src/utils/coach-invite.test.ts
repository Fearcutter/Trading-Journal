import { describe, it, expect } from 'vitest';
import { inviteLink, makeInviteToken, tokenFromPath } from './coach-invite';

describe('coach invite links', () => {
  it('makes a long random token each time', () => {
    const a = makeInviteToken();
    expect(a).toMatch(/^[0-9a-f]{64}$/);
    expect(makeInviteToken()).not.toBe(a);
  });

  it('reads the token back out of the link', () => {
    const t = makeInviteToken();
    const url = new URL(inviteLink('https://journal.example', t));
    expect(tokenFromPath(url.pathname)).toBe(t);
    expect(tokenFromPath(`${url.pathname}/`)).toBe(t);
  });

  it('ignores other pages and short or odd tokens', () => {
    expect(tokenFromPath('/settings')).toBeNull();
    expect(tokenFromPath('/coach-invite/')).toBeNull();
    expect(tokenFromPath('/coach-invite/abc123')).toBeNull();
    expect(tokenFromPath(`/coach-invite/${'z'.repeat(64)}`)).toBeNull();
  });
});
