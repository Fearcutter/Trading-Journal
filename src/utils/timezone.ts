/**
 * Get current date and time in a given IANA timezone.
 */
export function nowInTimezone(tz: string): { date: string; time: string } {
  return formatInTimezone(new Date(), tz);
}

/**
 * Convert a Unix timestamp (seconds) to date + time in a given timezone.
 */
export function unixToTimezone(unixSeconds: number, tz: string): { date: string; time: string } {
  return formatInTimezone(new Date(unixSeconds * 1000), tz);
}

function formatInTimezone(dt: Date, tz: string): { date: string; time: string } {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });

  const parts = formatter.formatToParts(dt);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find(p => p.type === type)?.value || '00';

  const date = `${get('year')}-${get('month')}-${get('day')}`;
  // Intl may return "24" for midnight in some locales — normalize to "00"
  const hour = get('hour') === '24' ? '00' : get('hour');
  const time = `${hour}:${get('minute')}`;

  return { date, time };
}
