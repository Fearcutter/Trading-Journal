import { describe, it, expect } from 'vitest';
import { tradeDurationMinutes, formatDuration, byDayOfWeek, byTimeBlock, byDuration, averageHold } from './trade-timing';
import type { Trade } from '../types/trade';

let n = 0;
const t = (p: Partial<Trade>): Trade => ({
  id: `t${n++}`, date: '2026-09-07', time: '09:30', entry: 100, stopLoss: 90, pointsPL: 0, dollarPL: 0, result: 'loss',
  ...p,
} as Trade);
const win = (r: number, p: Partial<Trade> = {}) => t({ result: 'win', pointsPL: r * 10, dollarPL: r * 100, ...p });
const loss = (p: Partial<Trade> = {}) => t({ result: 'loss', pointsPL: -10, dollarPL: -100, ...p });

describe('tradeDurationMinutes', () => {
  it('is exit time minus entry time', () => {
    expect(tradeDurationMinutes(t({ time: '13:46', exitTime: '14:03' }))).toBe(17);
  });
  it('wraps past midnight', () => {
    expect(tradeDurationMinutes(t({ time: '23:50', exitTime: '00:10' }))).toBe(20);
  });
  it('is null without both times', () => {
    expect(tradeDurationMinutes(t({ exitTime: undefined }))).toBeNull();
    expect(tradeDurationMinutes(t({ time: '', exitTime: '10:00' }))).toBeNull();
  });
});

describe('formatDuration', () => {
  it('reads like a trader would say it', () => {
    expect(formatDuration(0)).toBe('<1m');
    expect(formatDuration(17)).toBe('17m');
    expect(formatDuration(60)).toBe('1h');
    expect(formatDuration(135)).toBe('2h 15m');
  });
});

describe('byDayOfWeek', () => {
  it('groups Monday to Friday with win rate, net R and R per trade', () => {
    // 2026-09-07 is a Monday, 2026-09-08 a Tuesday
    const rows = byDayOfWeek([win(2, { date: '2026-09-07' }), loss({ date: '2026-09-07' }), loss({ date: '2026-09-08' })], 'dollarPL');
    expect(rows.map(r => r.label)).toEqual(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
    expect(rows[0].trades).toBe(2);
    expect(rows[0].winRate).toBe(50);
    expect(rows[0].netR).toBe(1);
    expect(rows[0].rPerTrade).toBe(0.5);
    expect(rows[1].netR).toBe(-1);
    expect(rows[2].trades).toBe(0);
  });
  it('adds weekend days only if traded', () => {
    const rows = byDayOfWeek([loss({ date: '2026-09-06' })], 'dollarPL'); // Sunday
    expect(rows.map(r => r.label)).toContain('Sunday');
  });
});

describe('byTimeBlock', () => {
  it('uses 15-minute blocks of entry time, in time order, only blocks with trades', () => {
    const rows = byTimeBlock([loss({ time: '10:14' }), loss({ time: '09:30' }), loss({ time: '09:44' }), loss({ time: '09:45' }), loss({ time: '' })], 'dollarPL', 15);
    expect(rows.map(r => [r.label, r.trades])).toEqual([['09:30–09:44', 2], ['09:45–09:59', 1], ['10:00–10:14', 1]]);
  });
});

describe('byDuration', () => {
  it('buckets trades by time held, only trades with an exit time', () => {
    const rows = byDuration([
      loss({ time: '09:30', exitTime: '09:33' }),   // 3m
      win(1, { time: '09:30', exitTime: '09:45' }), // 15m → 15–30
      loss({ time: '09:30', exitTime: '11:31' }),   // 2h+
      loss({ time: '09:30' }),                      // no exit time
    ], 'dollarPL');
    expect(rows.map(r => r.label)).toEqual(['Under 5m', '5–15m', '15–30m', '30–60m', '1–2h', '2h+']);
    expect(rows.map(r => r.trades)).toEqual([1, 0, 1, 0, 0, 1]);
  });
});

describe('averageHold', () => {
  it('averages time held for winners and losers', () => {
    const r = averageHold([
      win(1, { time: '09:30', exitTime: '09:50' }),
      win(1, { time: '09:30', exitTime: '10:10' }),
      loss({ time: '09:30', exitTime: '09:35' }),
      loss({ time: '09:30' }),
    ]);
    expect(r.winners).toEqual({ minutes: 30, trades: 2 });
    expect(r.losers).toEqual({ minutes: 5, trades: 1 });
    expect(r.withExitTime).toBe(3);
  });
});
