import Card from '../ui/Card';
import { chanceOfLosingStreak, type EdgeStats } from '../../utils/prop-ev';
import { formatR } from '../../utils/confluence-insights';

const pct = (x: number) => `${(x * 100).toFixed(x < 0.1 && x > 0 ? 1 : 0)}%`;
const money = (x: number) => `$${Math.round(x).toLocaleString('en-US')}`;

const STREAKS = [3, 4, 5, 6, 8, 10];
const HORIZONS = [50, 100, 250];

function Stat({ label, value, sub, tone = 'text-slate-50' }: { label: string; value: string; sub?: string; tone?: string }) {
  return (
    <div>
      <p className="text-xs text-slate-500">{label}</p>
      <p className={`text-lg font-semibold font-mono ${tone}`}>{value}</p>
      {sub && <p className="text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

/** Win rate, average R with its likely range, Kelly and losing-streak odds for the picked trades. */
export default function EdgeSummary({ stats, yourRisk }: { stats: EdgeStats; yourRisk: number }) {
  const edgeTone = stats.avgR > 0 ? 'text-emerald-400' : stats.avgR < 0 ? 'text-rose-400' : 'text-slate-300';
  const kellyDollars = (drawdown: number) => money(Math.max(0, stats.kelly) * drawdown);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-3">Your edge</h3>
        <div className="grid grid-cols-3 gap-4">
          <Stat label="Win rate" value={pct(stats.winRate)} sub={`likely ${pct(stats.winRateLow)}–${pct(stats.winRateHigh)}`} />
          <Stat label="EV per trade" value={formatR(stats.avgR)} tone={edgeTone} sub={`likely ${formatR(stats.avgRLow)} to ${formatR(stats.avgRHigh)}`} />
          <Stat label="EV per trade at your risk" value={`${stats.avgR >= 0 ? '+' : '-'}${money(Math.abs(stats.avgR * yourRisk))}`} tone={edgeTone} sub={`at ${money(yourRisk)} per trade, before costs`} />
          <Stat label="Avg win / avg loss" value={`${stats.avgWinR.toFixed(2)}R / ${stats.avgLossR.toFixed(2)}R`} />
          <Stat label="Swing per trade" value={`${stats.stdR.toFixed(2)}R`} sub="how far a typical trade lands from the average" />
          <Stat label="Chance there's no real edge" value={pct(stats.chanceNoEdge)} tone={stats.chanceNoEdge > 0.2 ? 'text-amber-400' : 'text-slate-50'} sub={`from ${stats.trades} trades`} />
        </div>
        <div className="mt-4 pt-3 border-t border-slate-700 text-sm text-slate-300 space-y-1">
          {stats.kelly > 0 ? (
            <>
              <p>
                <span className="font-semibold">Kelly:</span> risk {pct(stats.kelly)} of your bankroll per trade
                (half Kelly {pct(stats.kelly / 2)}). Against a $1,000 drawdown that's {kellyDollars(1000)}, against $2,000 it's {kellyDollars(2000)}.
              </p>
              <p className="text-xs text-slate-500">
                Kelly assumes the bankroll is yours and keeps growing. In a prop account the drawdown is the whole bankroll and blowing it ends the game, so treat this as a ceiling. The firm table below finds the risk that actually earns the most.
              </p>
            </>
          ) : (
            <p><span className="font-semibold">Kelly:</span> 0%. On these trades there's no edge to size up, so the math says don't bet.</p>
          )}
          <p className="text-xs text-slate-500">"Likely" ranges are 95% ranges: with this many trades, the true numbers are probably inside them.</p>
        </div>
      </Card>

      <Card>
        <h3 className="text-sm font-medium text-slate-300 mb-1">Losing streak odds</h3>
        <p className="text-xs text-slate-500 mb-3">
          Chance of at least one run of this many losses in a row, with your {pct(stats.lossRate)} loss rate (binomial math, each trade independent).
        </p>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 uppercase tracking-wider">
              <th className="py-1.5">Losses in a row</th>
              {HORIZONS.map(h => <th key={h} className="py-1.5 text-right">Next {h} trades</th>)}
              <th className="py-1.5 text-right">Cost at your risk</th>
            </tr>
          </thead>
          <tbody>
            {STREAKS.map(k => (
              <tr key={k} className="border-t border-slate-700/50">
                <td className="py-1.5 text-slate-200">{k}+</td>
                {HORIZONS.map(h => {
                  const p = chanceOfLosingStreak(h, k, stats.lossRate);
                  return <td key={h} className={`py-1.5 text-right font-mono ${p >= 0.5 ? 'text-rose-300' : 'text-slate-300'}`}>{pct(p)}</td>;
                })}
                <td className="py-1.5 text-right font-mono text-slate-400">-{money(k * stats.avgLossR * yourRisk)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
