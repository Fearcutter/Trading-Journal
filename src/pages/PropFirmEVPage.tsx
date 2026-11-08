import { Fragment, useMemo, useState } from 'react';
import { Dices, AlertTriangle, Loader2 } from 'lucide-react';
import Card from '../components/ui/Card';
import MultiSelect from '../components/ui/MultiSelect';
import EdgeSummary from '../components/prop-ev/EdgeSummary';
import FirmDetail from '../components/prop-ev/FirmDetail';
import { usePropEvResults } from '../components/prop-ev/usePropEvResults';
import { useTrades } from '../context/TradeContext';
import { useLiveSession } from '../context/LiveSessionContext';
import { useBacktest } from '../context/BacktestContext';
import { useSettings } from '../context/SettingsContext';
import { DEFAULT_PROP_FIRMS } from '../constants/prop-firms';
import { edgeStats, tradesToDays, type FirmConfig, type SimSummary } from '../utils/prop-ev';
import { getRealizedR } from '../utils/r-multiple';
import { scorePractice, type PracticeScore } from '../utils/prop-tracker';
import { useAllPractice } from '../components/backtest/usePractice';

const STANDALONE = '__standalone__';
const STORE_KEY = 'propEv.inputs';

interface Inputs { sessionIds: string[] | null; risk: number | null; cost: number; accounts: number; mode: 'best' | 'yours' }
const DEFAULT_INPUTS: Inputs = { sessionIds: null, risk: null, cost: 0, accounts: 2, mode: 'best' };

function loadInputs(): Inputs {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? { ...DEFAULT_INPUTS, ...JSON.parse(raw) } : DEFAULT_INPUTS;
  } catch {
    return DEFAULT_INPUTS;
  }
}

const pct = (x: number) => `${Math.round(x * 100)}%`;
const money = (x: number) => `${x < 0 ? '-' : ''}$${Math.abs(Math.round(x)).toLocaleString('en-US')}`;

export default function PropFirmEVPage() {
  const { trades } = useTrades();
  const { sessions: liveSessions } = useLiveSession();
  const { sessions: btSessions, folders } = useBacktest();
  const practice = useAllPractice();
  const { propFirmOverrides, updateSettings } = useSettings();
  const [inputs, setInputsState] = useState<Inputs>(loadInputs);
  const [openId, setOpenId] = useState<string | null>(null);

  const setInputs = (patch: Partial<Inputs>) => {
    setInputsState(prev => {
      const next = { ...prev, ...patch };
      try { localStorage.setItem(STORE_KEY, JSON.stringify(next)); } catch { /* storage unavailable */ }
      return next;
    });
  };

  const hasStandalone = trades.some(t => !t.sessionId);
  const options = useMemo(() => [
    ...(hasStandalone ? [{ value: STANDALONE, label: 'Live trades not in a session', sublabel: 'Live' }] : []),
    ...liveSessions.map(s => ({ value: s.id, label: s.name, sublabel: 'Live' })),
    ...btSessions.map(s => {
      const folder = s.folderId ? folders.find(f => f.id === s.folderId) : undefined;
      return { value: s.id, label: s.name, sublabel: folder ? `Backtest · ${folder.name}` : 'Backtest' };
    }),
  ], [hasStandalone, liveSessions, btSessions, folders]);

  // Practice folders' real results, combined per firm
  const practiceByFirm = useMemo(() => {
    const map = new Map<string, PracticeScore>();
    const groups = new Map<string, Parameters<typeof scorePractice>[0]>();
    for (const { folder, attempts } of practice) {
      const id = folder.firmRules!.id;
      groups.set(id, [...(groups.get(id) ?? []), ...attempts.map(a => ({ evalTrack: a.track, funded: a.funded?.track }))]);
    }
    for (const [id, list] of groups) if (list.length) map.set(id, scorePractice(list));
    return map;
  }, [practice]);

  // Default: every live session (and live trades outside sessions). Deleted sessions drop out.
  const validIds = new Set(options.map(o => o.value));
  const selected = (inputs.sessionIds ?? [STANDALONE, ...liveSessions.map(s => s.id)]).filter(id => validIds.has(id));
  const selectedKey = selected.join(',');
  const btIds = useMemo(() => new Set(btSessions.map(s => s.id)), [btSessions]);
  const hasBacktest = selected.some(id => btIds.has(id));

  const picked = useMemo(() => {
    const ids = new Set(selectedKey.split(','));
    return trades.filter(t => (t.sessionId ? ids.has(t.sessionId) : ids.has(STANDALONE)));
  }, [trades, selectedKey]);

  const { days, used, skipped } = useMemo(() => tradesToDays(picked), [picked]);
  const stats = useMemo(() => edgeStats(days.flat()), [days]);

  // What you usually risk: median $ per 1R on the picked trades
  const suggestedRisk = useMemo(() => {
    const perR = picked
      .map(t => { const r = getRealizedR(t); return r && t.dollarPL ? Math.abs(t.dollarPL / r) : null; })
      .filter((x): x is number => x !== null && Number.isFinite(x) && x > 0)
      .sort((a, b) => a - b);
    return perR.length ? Math.round(perR[Math.floor(perR.length / 2)] / 10) * 10 || 10 : 200;
  }, [picked]);
  const yourRisk = inputs.risk ?? suggestedRisk;

  const firms = useMemo(
    () => DEFAULT_PROP_FIRMS.map(f => propFirmOverrides?.[f.id] ?? f),
    [propFirmOverrides],
  );
  const { results, running } = usePropEvResults(days, firms, inputs.cost, yourRisk);

  const shownFor = (id: string): SimSummary | null => {
    const r = results[id];
    if (!r) return null;
    return inputs.mode === 'best' ? r.best : r.atYourRisk;
  };
  const rows = [...firms].sort((a, b) => (shownFor(b.id)?.ev ?? -Infinity) - (shownFor(a.id)?.ev ?? -Infinity));

  const saveFirm = (next: FirmConfig) => updateSettings({ propFirmOverrides: { ...(propFirmOverrides ?? {}), [next.id]: next } });
  const resetFirm = (id: string) => {
    const rest = { ...(propFirmOverrides ?? {}) };
    delete rest[id];
    updateSettings({ propFirmOverrides: rest });
  };

  const th = 'px-3 py-2.5 text-xs font-medium text-slate-400 uppercase tracking-wider';
  const openFirm = firms.find(f => f.id === openId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-50 flex items-center gap-2"><Dices size={24} /> Prop Firm EV</h1>
        <p className="text-slate-400 mt-1">
          Your real trades, replayed thousands of times through each firm's rules: how often you'd pass, blow, get paid, and what each evaluation is worth.
        </p>
      </div>

      <Card>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <MultiSelect
            label="Trades from"
            value={selected}
            onChange={ids => setInputs({ sessionIds: ids })}
            options={options}
            placeholder="Nothing picked"
          />
          <label className="block space-y-1">
            <span className="block text-sm font-medium text-slate-300">Your risk per trade ($)</span>
            <input
              type="number" min={1} step={5}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-50 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.risk ?? ''}
              placeholder={`${suggestedRisk} (your usual)`}
              onChange={e => setInputs({ risk: e.target.value === '' ? null : Math.max(1, Number(e.target.value)) })}
            />
          </label>
          <label className="block space-y-1">
            <span className="block text-sm font-medium text-slate-300">Costs per trade ($)</span>
            <input
              type="number" min={0} step={0.5}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-50 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.cost}
              onChange={e => setInputs({ cost: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
          <label className="block space-y-1">
            <span className="block text-sm font-medium text-slate-300">Copied accounts</span>
            <input
              type="number" min={1} step={1}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-slate-50 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={inputs.accounts}
              onChange={e => setInputs({ accounts: Math.max(1, Math.round(Number(e.target.value) || 1)) })}
            />
          </label>
        </div>
        <p className="text-xs text-slate-500 mt-3">
          {used} trades over {days.length} trading days{skipped > 0 && ` (${skipped} without a stop left out)`}.
          Costs = commissions and fees per round trip at your usual size.
          Copied accounts take the same trades, so they pass and blow together: EV, fees and swings all multiply.
        </p>
        {hasBacktest && (
          <p className="text-xs text-amber-300/90 mt-1 flex items-center gap-1.5">
            <AlertTriangle size={12} /> Backtest trades included. Backtests usually look better than live trading, so treat these numbers as a best case.
          </p>
        )}
      </Card>

      {stats.trades === 0 ? (
        <Card><p className="py-8 text-center text-sm text-slate-500">No trades with a stop in the picked sessions yet.</p></Card>
      ) : (
        <>
          <EdgeSummary stats={stats} yourRisk={yourRisk} />

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-lg font-semibold text-slate-50 flex items-center gap-2">
                  Firm comparison {running && <Loader2 size={16} className="animate-spin text-slate-400" />}
                </h2>
                <p className="text-xs text-slate-500">
                  Per evaluation bought. EV = payouts you receive − all fees (evaluation, monthly renewals, activation). Click a firm for detail and its rules.
                </p>
              </div>
              <div className="flex rounded-lg overflow-hidden border border-slate-600">
                {(['best', 'yours'] as const).map(m => (
                  <button
                    key={m}
                    onClick={() => setInputs({ mode: m })}
                    className={`px-3 py-1.5 text-sm font-medium transition-colors ${inputs.mode === m ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
                  >
                    {m === 'best' ? 'Best risk for each firm' : `At your $${yourRisk} risk`}
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-slate-800 border border-slate-700 rounded-xl overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-700 text-left">
                    <th className={th}>Firm</th>
                    <th className={`${th} text-right`}>Risk / trade</th>
                    <th className={`${th} text-right`}>Pass</th>
                    <th className={`${th} text-right`}>Blown in eval</th>
                    <th className={`${th} text-right`}>Got paid</th>
                    <th className={`${th} text-right`}>Avg paid</th>
                    <th className={`${th} text-right`}>Avg fees</th>
                    <th className={`${th} text-right`}>EV per eval</th>
                    <th className={`${th} text-right`}>× {inputs.accounts} accounts</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(f => {
                    const s = shownFor(f.id);
                    const edited = !!propFirmOverrides?.[f.id];
                    const mine = practiceByFirm.get(f.id);
                    return (
                      <Fragment key={f.id}>
                      <tr
                        onClick={() => setOpenId(openId === f.id ? null : f.id)}
                        className={`border-b border-slate-700/50 cursor-pointer hover:bg-slate-700/30 ${openId === f.id ? 'bg-slate-700/40' : ''}`}
                      >
                        <td className="px-3 py-2 text-sm text-slate-200 whitespace-nowrap">
                          {f.firm} <span className="text-slate-400">{f.plan}</span> {f.size / 1000}K
                          {f.verify.length > 0 && <AlertTriangle size={12} className="inline ml-1.5 text-amber-400" aria-label="Some rules need checking" />}
                          {edited && <span className="ml-1.5 text-[10px] uppercase text-sky-400">edited</span>}
                        </td>
                        {s ? (
                          <>
                            <td className="px-3 py-2 text-sm font-mono text-right text-slate-300">${s.riskPerTrade}</td>
                            <td className="px-3 py-2 text-sm font-mono text-right text-slate-300">{pct(s.passRate)}</td>
                            <td className="px-3 py-2 text-sm font-mono text-right text-rose-300">{pct(s.evalBlowRate)}</td>
                            <td className="px-3 py-2 text-sm font-mono text-right text-slate-300">{pct(s.payoutRate)}</td>
                            <td className="px-3 py-2 text-sm font-mono text-right text-slate-300">{money(s.avgPaid)}</td>
                            <td className="px-3 py-2 text-sm font-mono text-right text-slate-400">{money(s.avgFees)}</td>
                            <td className={`px-3 py-2 text-sm font-mono text-right font-semibold ${s.ev >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{money(s.ev)}</td>
                            <td className={`px-3 py-2 text-sm font-mono text-right ${s.ev >= 0 ? 'text-emerald-400/80' : 'text-rose-400/80'}`}>{money(s.ev * inputs.accounts)}</td>
                          </>
                        ) : (
                          <td colSpan={8} className="px-3 py-2 text-sm text-slate-500 text-right">Working it out…</td>
                        )}
                      </tr>
                      {mine && (
                        <tr className="border-b border-slate-700/50 bg-sky-950/30 text-xs">
                          <td className="px-3 py-1.5 pl-6 text-sky-300 whitespace-nowrap">↳ Your practice ({mine.attempts} attempt{mine.attempts === 1 ? '' : 's'})</td>
                          <td className="px-3 py-1.5 text-right text-slate-500">real $</td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-300">{mine.passRate === null ? '—' : pct(mine.passRate)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-rose-300">{pct(mine.attempts ? mine.blown / mine.attempts : 0)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-300">{mine.paidRate === null ? '—' : pct(mine.paidRate)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-300">{money(mine.received / mine.attempts)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-400">{money(mine.totalFees / mine.attempts)}</td>
                          <td className={`px-3 py-1.5 text-right font-mono font-semibold ${(mine.evPerAttempt ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>{money(mine.evPerAttempt ?? 0)}</td>
                          <td className="px-3 py-1.5 text-right font-mono text-slate-400">{money((mine.evPerAttempt ?? 0) * inputs.accounts)}</td>
                        </tr>
                      )}
                      </Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {openFirm && (
              <FirmDetail
                firm={openFirm}
                result={results[openFirm.id]}
                shown={shownFor(openFirm.id)}
                accounts={inputs.accounts}
                edited={!!propFirmOverrides?.[openFirm.id]}
                onSave={saveFirm}
                onReset={() => resetFirm(openFirm.id)}
              />
            )}

            <div className="text-xs text-slate-500 space-y-1">
              {practiceByFirm.size > 0 && (
                <p>
                  "Your practice" rows are your real results from practice folders in Backtesting (pass rate is of finished evaluations; got paid and EV are per attempt, including attempts still running).
                  Few attempts swing a lot: 25+ gives a much steadier number.
                </p>
              )}
              <p>
                How it works: each simulated evaluation picks your real trading days at random (whole days, so daily limits and best-day rules behave like they would for you), at a fixed $ risk per trade.
                It trades until it passes, blows, or runs out of days (60 trading days, monthly fees every 20), then trades the funded account for up to 120 trading days, taking the biggest payout allowed each time it qualifies.
              </p>
              <p>
                Limits: the drawdown only sees closed trades, so intraday trailing drawdowns are a bit kinder here than in real life. Rules marked with ⚠ couldn't be fully confirmed: check them on the firm's site and fix them in the firm's rules.
                The answer is only as good as your sample: a few dozen trades can swing these numbers a lot.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
