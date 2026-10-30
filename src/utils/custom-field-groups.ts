import type { CustomCategory } from '../types/settings';

/** Which confluence list a custom field joins on the trade page, or null for Custom Fields. */
export function confluenceGroupOf(cat: CustomCategory): 'for' | 'against' | null {
  if (cat.confluenceGroup !== undefined) return cat.confluenceGroup;
  return cat.showUnderConfluences ? 'for' : null; // earlier on/off switch meant FOR
}

/**
 * Splits custom fields into those joining the trade's FOR / AGAINST confluences and the rest,
 * each in Settings card order (fields not in the order keep their place, after the ordered ones).
 */
export function splitCustomFields(categories: CustomCategory[] | undefined, sectionOrder: string[] | undefined) {
  const order = sectionOrder ?? [];
  const rank = (c: CustomCategory) => {
    const i = order.indexOf(c.id);
    return i === -1 ? order.length : i;
  };
  const sorted = [...(categories ?? [])].sort((a, b) => rank(a) - rank(b));
  return {
    for: sorted.filter(c => confluenceGroupOf(c) === 'for'),
    against: sorted.filter(c => confluenceGroupOf(c) === 'against'),
    other: sorted.filter(c => confluenceGroupOf(c) === null),
  };
}
