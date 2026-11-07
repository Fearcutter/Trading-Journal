import { describe, it, expect, vi } from 'vitest';

vi.mock('./supabase', () => ({ supabase: {} }));
const { storagePathOf, isBase64 } = await import('./screenshots');

const token = 'eyJ' + 'a'.repeat(300);
const signed = (path: string) =>
  `https://abc.supabase.co/storage/v1/object/sign/screenshots/${encodeURI(path)}?token=${token}`;

describe('storagePathOf', () => {
  it('keeps a stored path as-is', () => {
    expect(storagePathOf('u1/trades/t1/setupScreenshot.png')).toBe('u1/trades/t1/setupScreenshot.png');
  });

  it('gets the path back out of a signed link, even an expired one', () => {
    expect(storagePathOf(signed('u1/trades/t1/additionalScreenshots_0.png'))).toBe('u1/trades/t1/additionalScreenshots_0.png');
    expect(storagePathOf(signed('u1/trades/t 1/a.png'))).toBe('u1/trades/t 1/a.png');
  });

  it('is null for pasted images, other links and empty values', () => {
    expect(storagePathOf('data:image/png;base64,iVBORw0KGgo=')).toBeNull();
    expect(storagePathOf('https://example.com/chart.png')).toBeNull();
    expect(storagePathOf('')).toBeNull();
    expect(storagePathOf(undefined)).toBeNull();
  });
});

describe('isBase64', () => {
  it('does not mistake a long signed link for a pasted image', () => {
    expect(isBase64(signed('u1/trades/t1/setupScreenshot.png'))).toBe(false);
    expect(isBase64('data:image/png;base64,iVBORw0KGgo=')).toBe(true);
  });
});
