import { dynamicSize, targetBalance } from '../../utils/ror-sim/engine';
import { money, pct } from '../../utils/ror-sim/format';
import type { Odds, SimSetup } from '../../utils/ror-sim/types';

/** Strategy D in plain words, with a worked example at the current settings. */
export default function DynamicSizingExplainer({ share, setup, odds }: { share: number; setup: SimSetup; odds: Odds }) {
  const dd = setup.funded.drawdown.amount;
  const floor = setup.size - dd;
  const goal = targetBalance(setup, floor, 0) - setup.size;
  const maxRisk = setup.maxContracts * odds.riskPerContract;
  const rr = odds.rewardRisk;
  const size = (room: number, remaining = goal) => dynamicSize(share, room, remaining, rr, maxRisk);

  // A sample path: start, then two losses in a row, then close to the goal
  const start = size(dd);
  const room1 = dd - start.risk;
  const after1 = size(room1);
  const room2 = room1 - after1.risk;
  const after2 = size(room2);
  const nearLeft = Math.round(goal * 0.075 / 10) * 10 || 10;
  const near = size(dd, nearLeft);

  const rows: [string, string, { risk: number; reward: number }][] = [
    ['First trade', `${money(dd)} room`, start],
    ['After a loss', `${money(room1)} room`, after1],
    ['After a second loss', `${money(room2)} room`, after2],
    [`Only ${money(nearLeft)} left to the payout goal`, `${money(dd)} room`, near],
  ];

  return (
    <div className="rounded-lg border border-slate-700 bg-slate-900/40 p-3 space-y-3 text-sm">
      <div className="space-y-1.5 text-slate-300">
        <p><span className="text-slate-50 font-medium">How it sizes each trade.</span> Before every trade it looks at your <em>room</em>: the distance from your balance down to the drawdown floor. It risks {pct(share, 0)} of that room, and aims for {rr}× that as profit (your reward:risk).</p>
        <p>Two limits on top:</p>
        <ul className="list-disc pl-5 space-y-0.5 text-slate-400">
          <li>Never more than your contract limit allows: {setup.maxContracts} contracts × {money(odds.riskPerContract)} = {money(maxRisk)} risk.</li>
          <li>Never aims for more profit than is still needed to reach the payout goal ({money(goal)} above the start for the first payout).</li>
        </ul>
        <p className="text-slate-400">
          So it shrinks after losses (less room, smaller trades, so it's harder to blow the account) and grows back after wins.
          With an end-of-day floor, a win moves the floor up at the close, so the room goes back to {money(dd)} until the floor locks; after that, wins add room.
          Once the payout goal is reached it switches to the qualifying-day trade, like every strategy.
        </p>
      </div>

      <div>
        <p className="text-xs text-slate-500 mb-1">Example with your current numbers:</p>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-700 text-left text-xs text-slate-500">
              <th className="py-1 pr-3 font-medium">Situation</th>
              <th className="py-1 pr-3 font-medium">Room</th>
              <th className="py-1 pr-3 font-medium">Risk</th>
              <th className="py-1 font-medium">Aiming for</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([what, room, s]) => (
              <tr key={what} className="border-b border-slate-700/50">
                <td className="py-1 pr-3 text-slate-300">{what}</td>
                <td className="py-1 pr-3 font-mono text-slate-400">{room}</td>
                <td className="py-1 pr-3 font-mono text-rose-300">{money(s.risk)}</td>
                <td className="py-1 font-mono text-emerald-300">{money(s.reward)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-slate-500">
        Higher share = bigger trades, faster to the payout, more accounts blown. Lower share = slower, safer. Try a few and compare the results.
      </p>
    </div>
  );
}
