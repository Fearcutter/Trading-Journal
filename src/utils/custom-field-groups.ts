import type { CustomCategory } from '../types/settings';

/**
 * Splits custom fields into those shown inside the trade's Confluences box and the rest,
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
    underConfluences: sorted.filter(c => c.showUnderConfluences),
    other: sorted.filter(c => !c.showUnderConfluences),
  };
}
