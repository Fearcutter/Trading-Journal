import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import Card from '../ui/Card';
import Button from '../ui/Button';
import MultiSelect from '../ui/MultiSelect';
import { Field, Num, Pct, fieldCls } from './fields';
import { useTrades } from '../../context/TradeContext';
import { useLiveSession } from '../../context/LiveSessionContext';
import { useBacktest } from '../../context/BacktestContext';
import { useSettings } from '../../context/SettingsContext';
import { edgeStats, tradesToDays } from '../../utils/prop-ev';
import { money, pct } from '../../utils/ror-sim/format';
import type { Odds } from '../../utils/ror-sim/types';

const STANDALONE = '__standalone__';

/** Your win rate and costs: typed in, or read from picked journal sessions and then overridden. */
export default function OddsCard({ odds, onChange, evalRisk }: { odds: Odds; onChange: (o: Odds) => void; evalRisk: number }) {
  const { trades } = useTrades();
  const { sessions: live } = useLiveSession();
  const { sessions: bt, folders } = useBacktest();
  const { instruments } = useSettings();
  const [picked, setPicked] = useState<string[]>([]);
  const [showImport, setShowImport] = useState(false);

  const options = useMemo(() => [
    ...(trades.some(t => !t.sessionId) ? [{ value: STANDALONE, label: 'Live trades not in a session', sublabel: 'Live' }] : []),
    ...live.map(s => ({ value: s.id, label: s.name, sublabel: 'Live' })),
    ...bt.map(s => {
      const folder = s.folderId ? folders.find(f => f.id === s.folderId) : undefined;
      return { value: s.id, label: s.name, sublabel: folder ? `Backtest · ${folder.name}` : 'Backtest' };
    }),
  ], [trades, live, bt, folders]);

  const journal = useMemo(() => {
    if (!picked.length) return null;
    const ids = new Set(picked);
    const list = trades.filter(t => (t.sessionId ? ids.has(t.sessionId) : ids.has(STANDALONE)));
    const { days, used, skipped } = tradesToDays(list);
    const stats = edgeStats(days.flat());
    const dollars = list.map(t => t.dollarPL).filter(Number.isFinite);
    return {
      stats, used, skipped,
      perDay: days.length ? used / days.length : 0,
      avgDollar: dollars.length ? dollars.reduce((s, x) => s + x, 0) / dollars.length : 0,
      rewardRisk: stats.avgLossR > 0 ? stats.avgWinR / stats.avgLossR : 1,
    };
  }, [picked, trades]);

  const instrument = instruments.find(i => i.symbol === odds.instrument);
  const setContract = (symbol: string | undefined, stopPoints: number | undefined) => {
    const inst = instruments.find(i => i.symbol === symbol);
    onChange({ ...odds, instrument: symbol, stopPoints, riskPerContract: inst && stopPoints ? inst.pointValue * stopPoints : odds.riskPerContract });
  };

  const evR = odds.winRate * odds.rewardRisk - (1 - odds.winRate);
  const be = 1 / (1 + odds.rewardRisk);

  return (
    <Card className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <h3 className="text-sm font-semibold text-slate-50">Your odds</h3>
        <Button size="sm" variant="secondary" onClick={() => setShowImport(v => !v)}><Download size={14} /> Use my journal stats</Button>
      </div>

      {showImport && (
        <div className="rounded-lg border border-slate-700 p-3 space-y-3">
          <MultiSelect label="Sessions to read" value={picked} onChange={setPicked} options={options} placeholder="Pick sessions…" />
          {journal && (journal.used === 0 ? (
            <p className="text-sm text-slate-400">No trades with a stop in those sessions, so there's no R to read.</p>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                <div><p className="text-xs text-slate-500">Win rate</p><p className="font-mono text-slate-50">{pct(journal.stats.winRate)}</p><p className="text-[11px] text-slate-500">likely {pct(journal.stats.winRateLow, 0)}–{pct(journal.stats.winRateHigh, 0)}</p></div>
                <div><p className="text-xs text-slate-500">Avg win / avg loss</p><p className="font-mono text-slate-50">{journal.stats.avgWinR.toFixed(2)}R / {journal.stats.avgLossR.toFixed(2)}R</p><p className="text-[11px] text-slate-500">= {journal.rewardRisk.toFixed(2)} reward:risk</p></div>
                <div><p className="text-xs text-slate-500">Avg result</p><p className="font-mono text-slate-50">{journal.stats.avgR.toFixed(2)}R · {money(journal.avgDollar)}</p></div>
                <div><p className="text-xs text-slate-500">Trades per day</p><p className="font-mono text-slate-50">{journal.perDay.toFixed(1)}</p></div>
                <div><p className="text-xs text-slate-500">Trades used</p><p className="font-mono text-slate-50">{journal.used}</p>{journal.skipped > 0 && <p className="text-[11px] text-slate-500">{journal.skipped} without a stop left out</p>}</div>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <Button size="sm" onClick={() => onChange({ ...odds, winRate: Math.round(journal.stats.winRate * 1000) / 1000, rewardRisk: Math.round(journal.rewardRisk * 100) / 100 })}>
                  Use this win rate and reward:risk
                </Button>
                <p className="text-xs text-slate-500">Your journal doesn't record commissions separately: enter them below. You can still change any number after.</p>
              </div>
            </>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Pct label="Win rate" value={odds.winRate} onChange={v => onChange({ ...odds, winRate: v ?? 0 })} />
        <Num label="…at reward:risk of" value={odds.rewardRisk} onChange={v => onChange({ ...odds, rewardRisk: v || 1 })} hint="1 = 1:1. Other sizes are estimated from this." />
        <Num label="Commission per contract ($)" value={odds.commissionPerContract} onChange={v => onChange({ ...odds, commissionPerContract: v ?? 0 })} hint="Round trip" />
        <Num label="Slippage per contract ($)" value={odds.slippagePerContract} onChange={v => onChange({ ...odds, slippagePerContract: v ?? 0 })} />
        <Field label="Instrument">
          <select className={fieldCls} value={odds.instrument ?? ''} onChange={e => setContract(e.target.value || undefined, odds.stopPoints)}>
            <option value="">Not set</option>
            {instruments.map(i => <option key={i.symbol} value={i.symbol}>{i.symbol}</option>)}
          </select>
        </Field>
        <Num label="Usual stop (points)" value={odds.stopPoints ?? null} blank="—" onChange={v => setContract(odds.instrument, v ?? undefined)} />
        <Num
          label="Risk per contract ($)"
          value={odds.riskPerContract}
          onChange={v => onChange({ ...odds, riskPerContract: v ?? 0 })}
          hint={instrument && odds.stopPoints ? `${odds.stopPoints} pts × ${money(instrument.pointValue)}` : 'Used to count contracts and costs'}
        />
      </div>

      <p className="text-xs text-slate-400">
        Each trade: {evR >= 0 ? '+' : ''}{evR.toFixed(2)}R before costs ({money(evR * evalRisk)} at {money(evalRisk)} risk). Break-even win rate at this reward:risk is {pct(be)}.
        {' '}This is the edge per trade, not money you can withdraw: only payouts count as income below.
      </p>
    </Card>
  );
}
