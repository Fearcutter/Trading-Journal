import { supabase } from './supabase';

const BUCKET = 'screenshots';
const SIGNED_URL_EXPIRY = 3600; // 1 hour

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

function isBase64(value: string): boolean {
  return value.startsWith('data:') || value.length > 200;
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

export async function getSignedUrl(path: string): Promise<string> {
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_EXPIRY);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteScreenshot(path: string): Promise<void> {
  await supabase.storage.from(BUCKET).remove([path]);
}

export { isBase64 };
