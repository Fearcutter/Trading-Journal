import type { Trade } from '../types/trade';
import type { PLField } from './pl-helpers';
import { summarize } from './confluence-insights';

export interface TimingRow {
  label: string;
  trades: number;
  winRate: number;
  /** Sum of R over trades with a stop. */
  netR: number | null;
  rPerTrade: number | null;
  totalPL: number;
}

/** One table row: trades, win %, net R, R per trade and total P&L for a group of trades. */
export function timingRow(label: string, trades: Trade[], plField: PLField): TimingRow {
  const s = summarize(trades, plField);
  return {
    label,
    trades: s.trades,
    winRate: s.winRate,
    netR: s.rPerTrade === null ? null : s.rPerTrade * s.rTrades,
    rPerTrade: s.rPerTrade,
    totalPL: s.totalPL,
  };
}

function minutesOf(time: string | undefined): number | null {
  const m = /^(\d{1,2}):(\d{2})/.exec(time ?? '');
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

/** Minutes from entry time to exit time (wrapping past midnight), or null if either is missing. */
export function tradeDurationMinutes(t: Trade): number | null {
  const start = minutesOf(t.time);
  const end = minutesOf(t.exitTime);
  if (start === null || end === null) return null;
  return (end - start + 24 * 60) % (24 * 60);
}

/** 17 → "17m", 135 → "2h 15m". */
export function formatDuration(minutes: number): string {
  const m = Math.round(minutes);
  if (m < 1) return '<1m';
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  const rest = m % 60;
  return rest ? `${h}h ${rest}m` : `${h}h`;
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Monday–Friday always; Saturday/Sunday only if there are trades on them. */
export function byDayOfWeek(trades: Trade[], plField: PLField): TimingRow[] {
  const dayOf = (t: Trade) => new Date(`${t.date}T12:00:00Z`).getUTCDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  return order
    .map(d => ({ d, ts: trades.filter(t => dayOf(t) === d) }))
    .filter(({ d, ts }) => (d >= 1 && d <= 5) || ts.length > 0)
    .map(({ d, ts }) => timingRow(DAY_NAMES[d], ts, plField));
}

const hhmm = (mins: number) => `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/** Entry time in blocks of `blockMinutes` (e.g. "09:30–09:44"), in time order, only blocks with trades. */
export function byTimeBlock(trades: Trade[], plField: PLField, blockMinutes = 15): TimingRow[] {
  const groups = new Map<number, Trade[]>();
  for (const t of trades) {
    const m = minutesOf(t.time);
    if (m === null) continue;
    const start = Math.floor(m / blockMinutes) * blockMinutes;
    const list = groups.get(start);
    if (list) list.push(t); else groups.set(start, [t]);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([start, ts]) => timingRow(`${hhmm(start)}–${hhmm(start + blockMinutes - 1)}`, ts, plField));
}

const DURATION_BUCKETS: { label: string; max: number }[] = [
  { label: 'Under 5m', max: 5 },
  { label: '5–15m', max: 15 },
  { label: '15–30m', max: 30 },
  { label: '30–60m', max: 60 },
  { label: '1–2h', max: 120 },
  { label: '2h+', max: Infinity },
];

/** Trades by time held. Only trades with an exit time count. */
export function byDuration(trades: Trade[], plField: PLField): TimingRow[] {
  const timed = trades.map(t => ({ t, d: tradeDurationMinutes(t) })).filter(x => x.d !== null) as { t: Trade; d: number }[];
  return DURATION_BUCKETS.map((bucket, i) => {
    const min = i === 0 ? 0 : DURATION_BUCKETS[i - 1].max;
    return timingRow(bucket.label, timed.filter(x => x.d >= min && x.d < bucket.max).map(x => x.t), plField);
  });
}

/** Average minutes held for winners and for losers (trades with an exit time only). */
export function averageHold(trades: Trade[]) {
  const avg = (result: Trade['result']) => {
    const ds = trades.filter(t => t.result === result).map(tradeDurationMinutes).filter((d): d is number => d !== null);
    return { minutes: ds.length ? ds.reduce((a, b) => a + b, 0) / ds.length : null, trades: ds.length };
  };
  return {
    winners: avg('win'),
    losers: avg('loss'),
    withExitTime: trades.filter(t => tradeDurationMinutes(t) !== null).length,
  };
}
