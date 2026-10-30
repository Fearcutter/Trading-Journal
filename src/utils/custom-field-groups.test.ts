import { describe, it, expect } from 'vitest';
import { splitCustomFields, confluenceGroupOf } from './custom-field-groups';
import type { CustomCategory } from '../types/settings';

const cat = (id: string, extra: Partial<CustomCategory> = {}): CustomCategory => ({ id, name: id.toUpperCase(), options: [], ...extra });

describe('confluenceGroupOf', () => {
  it('reads the FOR/AGAINST choice', () => {
    expect(confluenceGroupOf(cat('a', { confluenceGroup: 'for' }))).toBe('for');
    expect(confluenceGroupOf(cat('a', { confluenceGroup: 'against' }))).toBe('against');
    expect(confluenceGroupOf(cat('a'))).toBeNull();
  });
  it('treats the earlier on/off switch as FOR', () => {
    expect(confluenceGroupOf(cat('a', { showUnderConfluences: true }))).toBe('for');
    expect(confluenceGroupOf(cat('a', { showUnderConfluences: true, confluenceGroup: null }))).toBeNull();
  });
});

describe('splitCustomFields', () => {
  it('sorts fields into FOR, AGAINST and Custom Fields', () => {
    const r = splitCustomFields([cat('tdi', { confluenceGroup: 'for' }), cat('news', { confluenceGroup: 'against' }), cat('session')], []);
    expect(r.for.map(c => c.id)).toEqual(['tdi']);
    expect(r.against.map(c => c.id)).toEqual(['news']);
    expect(r.other.map(c => c.id)).toEqual(['session']);
  });

  it('follows the Settings card order', () => {
    const r = splitCustomFields([cat('a', { confluenceGroup: 'for' }), cat('b', { confluenceGroup: 'for' }), cat('c')], ['confluences', 'b', 'c', 'a']);
    expect(r.for.map(c => c.id)).toEqual(['b', 'a']);
  });

  it('keeps fields missing from the order, after the ordered ones', () => {
    const r = splitCustomFields([cat('new', { confluenceGroup: 'for' }), cat('old', { confluenceGroup: 'for' })], ['old']);
    expect(r.for.map(c => c.id)).toEqual(['old', 'new']);
  });

  it('handles no custom fields', () => {
    expect(splitCustomFields(undefined, undefined)).toEqual({ for: [], against: [], other: [] });
  });
});
