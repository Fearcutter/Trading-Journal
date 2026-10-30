import { describe, it, expect } from 'vitest';
import { splitCustomFields } from './custom-field-groups';
import type { CustomCategory } from '../types/settings';

const cat = (id: string, showUnderConfluences?: boolean): CustomCategory => ({ id, name: id.toUpperCase(), options: [], showUnderConfluences });

describe('splitCustomFields', () => {
  it('puts switched-on fields under Confluences and the rest under Custom Fields', () => {
    const r = splitCustomFields([cat('tdi', true), cat('session'), cat('bias', false)], []);
    expect(r.underConfluences.map(c => c.id)).toEqual(['tdi']);
    expect(r.other.map(c => c.id)).toEqual(['session', 'bias']);
  });

  it('follows the Settings card order', () => {
    const r = splitCustomFields([cat('a', true), cat('b', true), cat('c')], ['confluences', 'b', 'c', 'a']);
    expect(r.underConfluences.map(c => c.id)).toEqual(['b', 'a']);
  });

  it('keeps fields missing from the order, after the ordered ones', () => {
    const r = splitCustomFields([cat('new', true), cat('old', true)], ['old']);
    expect(r.underConfluences.map(c => c.id)).toEqual(['old', 'new']);
  });

  it('handles no custom fields', () => {
    expect(splitCustomFields(undefined, undefined)).toEqual({ underConfluences: [], other: [] });
  });
});
