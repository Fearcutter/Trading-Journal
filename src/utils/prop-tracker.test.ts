import { describe, it, expect } from 'vitest';
import type { Trade } from '../types/trade';
import { trackEval, scoreEvals, evalFees, groupTradesByDay, trackFunded, scorePractice } from './prop-tracker';
import type { FirmConfig, DrawdownRule } from './prop-ev';

const dd = (amount: number, type: DrawdownRule['type'] = 'eod_trailing', lockAboveStart: number | null = null): DrawdownRule =>
  ({ amount, type, lockAboveStart });

function firm(over: Partial<FirmConfig['eval']> = {}): FirmConfig {
  return {
    id: 'x', firm: 'Test', plan: 'Plan', size: 50000, lastChecked: '', verify: [], notes: '',
    eval: { fee: 100, billing: 'one_time', profitTarget: 3000, drawdown: dd(2000), dailyLossLimit: null, consistencyPct: null, minDays: 1, maxDays: null, ...over },
    funded: {
      activationFee: 0, drawdown: dd(2000), dailyLossLimit: null, consistencyPct: null, minDaysPerPayout: 5, minDayProfit: 0,
      buffer: 0, minPayout: 500, payoutCaps: [], payoutShareOfProfit: null, split: 0.9, maxPayouts: null,
    },
  };
}

let n = 0;
const t = (date: string, dollarPL: number, time = '09:30') => ({ id: `t${n++}`, date, time, dollarPL } as Trade);

describe('trackEval', () => {
  it('in progress: balance, profit, trailing floor', () => {
    const tr = trackEval([t('2026-01-01', 800), t('2026-01-02', -300)], firm());
    expect(tr.status).toBe('active');
    expect(tr.balance).toBe(50500);
    expect(tr.floor).toBe(48800);     // high close 50,800 − 2,000
    expect(tr.days).toBe(2);
    expect(tr.fees).toBe(100);
  });

  it('passes on the day the target is reached; later trades are ignored', () => {
    const tr = trackEval([t('2026-01-01', 1500), t('2026-01-02', 1600), t('2026-01-03', -500)], firm());
    expect(tr.status).toBe('passed');
    expect(tr.endedOn).toBe('2026-01-02');
    expect(tr.ignoredTrades).toBe(1);
    expect(tr.balance).toBe(53100);
  });

  it('blows when a trade reaches the floor, using real $ in time order', () => {
    const tr = trackEval([t('2026-01-01', -1500, '10:00'), t('2026-01-01', 900, '09:00'), t('2026-01-02', -1500)], firm());
    // day 1: +900 then -1,500 = -600, close 49,400 (high close stays 50,000 → floor 48,000); day 2: 47,900 → blown
    expect(tr.status).toBe('blown');
    expect(tr.endedOn).toBe('2026-01-02');
  });

  it('best-day rule holds the pass back until profit catches up', () => {
    const tr = trackEval([t('2026-01-01', 2500), t('2026-01-02', 600)], firm({ consistencyPct: 50 }));
    expect(tr.status).toBe('active');        // best day 2,500 is 81% of 3,100
    expect(tr.consistencyOk).toBe(false);
    expect(tr.profitNeededForConsistency).toBe(5000);
  });

  it('daily loss limit stops the day; trades after it are ignored', () => {
    const tr = trackEval([t('2026-01-01', -700, '09:30'), t('2026-01-01', -700, '10:00'), t('2026-01-01', 2000, '11:00')], firm({ dailyLossLimit: 1000 }));
    expect(tr.balance).toBe(49000);
    expect(tr.ignoredTrades).toBe(1);
    expect(tr.lastDay!.dailyLimitHit).toBe(true);
    expect(tr.status).toBe('active');
  });

  it('runs out of days', () => {
    const tr = trackEval([t('2026-01-01', 100), t('2026-01-02', 100)], firm({ maxDays: 2 }));
    expect(tr.status).toBe('timeout');
  });

  it('monthly fees renew every 20 trading days', () => {
    const cfg = firm({ billing: 'monthly' });
    expect(evalFees(cfg, 0)).toBe(100);
    expect(evalFees(cfg, 20)).toBe(100);
    expect(evalFees(cfg, 21)).toBe(200);
    expect(evalFees(cfg, 41)).toBe(300);
  });

  it('groups by date in time order', () => {
    const g = groupTradesByDay([t('2026-01-02', 1), t('2026-01-01', 2, '11:00'), t('2026-01-01', 3, '09:00')]);
    expect(g.map(d => d.trades.map(x => x.dollarPL))).toEqual([[3, 2], [1]]);
  });
});

describe('scoreEvals', () => {
  it('pass rate counts finished attempts only', () => {
    const cfg = firm();
    const passed = trackEval([t('2026-01-01', 3000)], cfg);
    const blown = trackEval([t('2026-01-01', -2000)], cfg);
    const active = trackEval([t('2026-01-01', 100)], cfg);
    const s = scoreEvals([passed, blown, active]);
    expect(s).toMatchObject({ attempts: 3, passed: 1, blown: 1, active: 1, passRate: 0.5, medianDaysToPass: 1, fees: 300 });
  });
});

describe('trackFunded', () => {
  const funded = (over: Partial<FirmConfig['funded']> = {}): FirmConfig => {
    const f = firm();
    return { ...f, funded: { ...f.funded, drawdown: dd(2000, 'eod_trailing', 100), minDaysPerPayout: 2, minDayProfit: 150, payoutCaps: [1000], split: 0.9, activationFee: 50, ...over } };
  };

  it('counts qualifying days and works out the payout available', () => {
    const tr = trackFunded([t('2026-02-01', 1200), t('2026-02-02', 100), t('2026-02-03', 900)], funded());
    expect(tr.cycleDays).toBe(2);              // the $100 day is below the $150 minimum
    expect(tr.balance).toBe(52200);
    expect(tr.floor).toBe(50100);             // trailed to 50,200 then stopped at start + 100
    expect(tr.available).toBe(1000);          // 2,100 above the floor, capped at 1,000
    expect(tr.availableReceived).toBe(900);
    expect(tr.eligible).toBe(true);
    expect(tr.fees).toBe(50);
  });

  it('a recorded payout lowers the balance and starts a new cycle', () => {
    const tr = trackFunded(
      [t('2026-02-01', 1200), t('2026-02-02', 900), t('2026-02-03', 300)],
      funded(),
      [{ date: '2026-02-02', gross: 1000, received: 900 }],
    );
    expect(tr.payoutsTaken).toBe(1);
    expect(tr.received).toBe(900);
    expect(tr.balance).toBe(51400);
    expect(tr.cycleDays).toBe(1);             // only 02-03 counts in the new cycle
    expect(tr.eligible).toBe(false);
  });

  it('blows at the floor and stops after the last allowed payout', () => {
    expect(trackFunded([t('2026-02-01', -2000)], funded()).status).toBe('blown');
    const done = trackFunded([t('2026-02-01', 1200), t('2026-02-02', 900), t('2026-02-03', 500)], funded({ maxPayouts: 1 }),
      [{ date: '2026-02-02', gross: 1000, received: 900 }]);
    expect(done.status).toBe('finished');
    expect(done.ignoredTrades).toBe(1);
  });

  it('cycle profit minimum and best-day rule hold a payout back', () => {
    const tr = trackFunded([t('2026-02-01', 1500), t('2026-02-02', 200)], funded({ consistencyPct: 40 }));
    expect(tr.consistencyOk).toBe(false);     // 1,500 is 88% of 1,700
    expect(tr.eligible).toBe(false);
    const low = trackFunded([t('2026-02-01', 200), t('2026-02-02', 200)], funded({ minCycleProfit: 500 }));
    expect(low.eligible).toBe(false);
  });
});

describe('scorePractice', () => {
  it('EV per attempt = money kept − all fees, over all attempts', () => {
    const cfg = firm();
    const pass = trackEval([t('2026-01-01', 3000)], cfg);
    const blow = trackEval([t('2026-01-01', -2000)], cfg);
    const f = { ...trackFunded([], cfg), received: 900, payoutsTaken: 1, fees: 50 };
    const s = scorePractice([{ evalTrack: pass, funded: f }, { evalTrack: blow }]);
    expect(s.totalFees).toBe(250);
    expect(s.evPerAttempt).toBe((900 - 250) / 2);
    expect(s.paidRate).toBe(0.5);
  });
});

describe('instant funded accounts', () => {
  it('the "evaluation" counts as passed straight away with no trading days', () => {
    const tr = trackEval([], { ...firm(), instant: true });
    expect(tr.status).toBe('passed');
    expect(tr.days).toBe(0);
    expect(tr.fees).toBe(100);
  });
});
