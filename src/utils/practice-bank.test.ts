import { describe, it, expect } from 'vitest';
import { computeBank, spendable, type BankAttempt, type BankEntry } from './practice-bank';
import type { EvalTrack, FundedTrack } from './prop-tracker';
import type { BacktestSession } from '../types/backtest';

const session = (over: Partial<BacktestSession>): BacktestSession =>
  ({ id: 's', name: 'Attempt 1', description: '', color: 'blue', createdAt: '2026-11-01T10:00:00Z', updatedAt: '2026-11-01T10:00:00Z', ...over });
const evalTrack = (over: Partial<EvalTrack> = {}) => ({ status: 'active', days: 3, fees: 100, ...over } as EvalTrack);
const fundedTrack = (over: Partial<FundedTrack> = {}) => ({ status: 'active', fees: 0, payoutsTaken: 0, ...over } as FundedTrack);
const deposit = (amount: number, at = '2026-10-01T00:00:00Z'): BankEntry => ({ id: at, at, kind: 'deposit', amount });
const names = { f1: 'Lucid practice', f2: 'Tradeify practice' };

describe('computeBank', () => {
  it('not started without entries', () => {
    expect(computeBank(undefined, [], names).started).toBe(false);
  });

  it('a folder without its own money pays from the main bank', () => {
    const a: BankAttempt = { folderId: 'f1', session: session({}), track: evalTrack(), evalPrice: 100 };
    const b = computeBank({ entries: [deposit(1000)] }, [a], names);
    expect(b.main).toBe(900);
    expect(b.folders).toEqual({});
    expect(b.total).toBe(900);
    expect(b.fees).toBe(100);
    expect(b.profit).toBe(-100);
    expect(spendable(b, 'f1')).toEqual({ amount: 900, fromMain: true });
  });

  it('allocating gives a folder its own balance; its fees and payouts land there', () => {
    const entries: BankEntry[] = [
      deposit(1000),
      { id: 'a', at: '2026-10-02T00:00:00Z', kind: 'allocate', amount: 400, folderId: 'f1' },
    ];
    const a: BankAttempt = {
      folderId: 'f1', session: session({}), track: evalTrack({ status: 'passed', fees: 150 }), evalPrice: 100,
      funded: {
        session: session({ id: 'fu', createdAt: '2026-11-05T00:00:00Z', payouts: [{ date: '2025-03-01', gross: 1000, received: 900, recordedAt: '2026-11-07T00:00:00Z' }] }),
        track: fundedTrack({ fees: 50, payoutsTaken: 1 }),
      },
    };
    const b = computeBank({ entries }, [a], names);
    expect(b.main).toBe(600);
    expect(b.folders.f1).toBe(400 - 100 - 50 - 50 + 900);   // price, renewals, activation, payout
    expect(b.total).toBe(1000 - 200 + 900);
    expect(b.received).toBe(900);
    expect(b.fees).toBe(200);
    expect(spendable(b, 'f1').fromMain).toBe(false);
    expect(b.badges.find(x => x.id === 'first-pass')!.earned).toBe(true);
    expect(b.badges.find(x => x.id === 'fees-back')!.earned).toBe(true);
  });

  it('returning money moves it back without changing the total', () => {
    const entries: BankEntry[] = [
      deposit(1000),
      { id: 'a', at: '2026-10-02T00:00:00Z', kind: 'allocate', amount: 400, folderId: 'f1' },
      { id: 'r', at: '2026-10-03T00:00:00Z', kind: 'return', amount: 150, folderId: 'f1' },
    ];
    const b = computeBank({ entries }, [], names);
    expect(b.main).toBe(750);
    expect(b.folders.f1).toBe(250);
    expect(b.total).toBe(1000);
    expect(b.events.map(e => e.totalAfter)).toEqual([1000, 1000, 1000, 1000, 1000]);
  });

  it('copies multiply fees and payouts', () => {
    const a: BankAttempt = {
      folderId: 'f1', session: session({ copies: 3 }), track: evalTrack({ status: 'passed' }), evalPrice: 100,
      funded: { session: session({ id: 'fu', payouts: [{ date: 'x', gross: 500, received: 450 }] }), track: fundedTrack({ payoutsTaken: 1 }) },
    };
    const b = computeBank({ entries: [deposit(1000)] }, [a], names);
    expect(b.fees).toBe(300);
    expect(b.received).toBe(1350);
    expect(b.total).toBe(2050);
    expect(b.badges.find(x => x.id === 'doubled')!.earned).toBe(true);
  });

  it('worst drop is the biggest fall of the total from a high; top-ups count as money put in', () => {
    const at = (d: string) => `2026-11-${d}T00:00:00Z`;
    const attempts: BankAttempt[] = [
      { folderId: 'f1', session: session({ id: '1', createdAt: at('02') }), track: evalTrack({ status: 'blown' }), evalPrice: 300 },
      { folderId: 'f1', session: session({ id: '2', createdAt: at('03') }), track: evalTrack({ status: 'blown' }), evalPrice: 300 },
    ];
    const b = computeBank({ entries: [deposit(500, at('01')), deposit(200, at('04'))] }, attempts, names);
    expect(b.deposited).toBe(700);
    expect(b.total).toBe(100);
    expect(b.worstDrop).toBe(600);
  });

  it('instant accounts are not a pass', () => {
    const a: BankAttempt = { folderId: 'f1', session: session({}), track: evalTrack({ status: 'passed', days: 0 }), evalPrice: 400 };
    expect(computeBank({ entries: [deposit(1000)] }, [a], names).badges.find(x => x.id === 'first-pass')!.earned).toBe(false);
  });
});
