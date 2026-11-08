export const COLOR_OPTIONS = [
  { name: 'blue', bg: 'bg-blue-500', ring: 'ring-blue-500' },
  { name: 'emerald', bg: 'bg-emerald-500', ring: 'ring-emerald-500' },
  { name: 'violet', bg: 'bg-violet-500', ring: 'ring-violet-500' },
  { name: 'amber', bg: 'bg-amber-500', ring: 'ring-amber-500' },
  { name: 'rose', bg: 'bg-rose-500', ring: 'ring-rose-500' },
  { name: 'cyan', bg: 'bg-cyan-500', ring: 'ring-cyan-500' },
];

export const SESSION_DOT_COLORS: Record<string, string> = Object.fromEntries(COLOR_OPTIONS.map(c => [c.name, c.bg]));
