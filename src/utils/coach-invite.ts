/** Coach invite links: /coach-invite/<token>, one use, set up in supabase-coach-invite-link.sql. */

const STORAGE_KEY = 'pendingCoachInvite';
const PATH_PREFIX = '/coach-invite/';

export const INVITE_DAYS = 7;

/** 32 random bytes as hex: 64 characters, not guessable. */
export function makeInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
}

export function inviteLink(origin: string, token: string): string {
  return `${origin}${PATH_PREFIX}${token}`;
}

/** The token in an invite path, or null if the path isn't an invite link. */
export function tokenFromPath(pathname: string): string | null {
  if (!pathname.startsWith(PATH_PREFIX)) return null;
  const token = pathname.slice(PATH_PREFIX.length).replace(/\/+$/, '');
  return /^[0-9a-f]{32,}$/i.test(token) ? token.toLowerCase() : null;
}

/**
 * The invite this browser is holding: from the current address if it's an
 * invite link (kept so it survives sign-up and email confirmation), otherwise
 * one saved earlier.
 */
export function pendingInviteToken(): string | null {
  const fromPath = tokenFromPath(window.location.pathname);
  try {
    if (fromPath) {
      localStorage.setItem(STORAGE_KEY, fromPath);
      return fromPath;
    }
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return fromPath;
  }
}

export function clearPendingInvite() {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Storage blocked: nothing was saved
  }
}
