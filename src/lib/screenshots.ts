import { supabase } from './supabase';

const BUCKET = 'screenshots';
/** How long a signed screenshot link works. Links are re-signed well before this (see useSupabaseList). */
export const SIGNED_URL_EXPIRY = 24 * 3600;
const SIGNED_MARKER = `/object/sign/${BUCKET}/`;

export function base64ToBlob(base64: string): Blob {
  // Handle both raw base64 and data URI formats
  const parts = base64.split(',');
  const isDataUri = parts.length > 1;
  const raw = isDataUri ? parts[1] : parts[0];
  const mime = isDataUri
    ? (parts[0].match(/:(.*?);/)?.[1] ?? 'image/png')
    : 'image/png';

  const bytes = atob(raw);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    arr[i] = bytes.charCodeAt(i);
  }
  return new Blob([arr], { type: mime });
}

/** A pasted image not yet uploaded. Signed links are long too, so anything starting with http is not one. */
function isBase64(value: string): boolean {
  return value.startsWith('data:') || (!value.startsWith('http') && value.length > 200);
}

/**
 * The storage path behind a screenshot value: a stored path as-is, or the path inside one of
 * our signed links (so an expired link can be signed again). Null for pasted images and other links.
 */
export function storagePathOf(value: unknown): string | null {
  if (typeof value !== 'string' || !value || isBase64(value)) return null;
  if (!value.startsWith('http')) return value;
  const i = value.indexOf(SIGNED_MARKER);
  if (i < 0) return null;
  return decodeURIComponent(value.slice(i + SIGNED_MARKER.length).split('?')[0]);
}

export async function uploadScreenshot(
  userId: string,
  category: string,
  entityId: string,
  fileName: string,
  base64: string
): Promise<string> {
  const blob = base64ToBlob(base64);
  const path = `${userId}/${category}/${entityId}/${fileName}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, blob, { upsert: true });

  if (error) throw error;
  return path;
}

/** Signed links for many paths at once, keyed by path. Paths that fail to sign are left out. */
export async function getSignedUrls(paths: string[]): Promise<Map<string, string>> {
  const urls = new Map<string, string>();
  const unique = [...new Set(paths)];
  for (let i = 0; i < unique.length; i += 500) {
    const { data, error } = await supabase.storage
      .from(BUCKET)
      .createSignedUrls(unique.slice(i, i + 500), SIGNED_URL_EXPIRY);
    if (error) throw error;
    for (const d of data) if (d.path && d.signedUrl && !d.error) urls.set(d.path, d.signedUrl);
  }
  return urls;
}

export async function deleteScreenshot(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}

export { isBase64 };
