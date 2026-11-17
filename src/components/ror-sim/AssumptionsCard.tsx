import Card from '../ui/Card';
import { EVAL_DAY_LIMIT, FUNDED_DAY_LIMIT, type SimSetup } from '../../utils/ror-sim/types';

/** What the simulator assumes, in words, with where to change it. */
export default function AssumptionsCard({ setup }: { setup: SimSetup }) {
  const items: [string, string][] = [
    ['Each trade is independent', 'Wins and losses are drawn like a weighted coin. No hot or cold streaks beyond chance, and no link between days. Real trading can be streakier, which makes ruin more likely than shown.'],
    ['Win rate at other sizes', 'Trades with a different reward:risk use your own number if you typed one, otherwise the price-path estimate (marked "est."). The estimate assumes your edge works the same way at every size.'],
    ['Only payouts are money', 'Balance in a funded account is never counted as income. Net = payouts kept after the split, minus evaluation, reset and activation fees.'],
    ['Costs', 'Commission and slippage come off every trade: contracts = risk ÷ risk per contract, rounded up.'],
    ['Drawdown', setup.breach === 'intraday'
      ? 'A trade that takes the balance to the floor ends the account at once. End-of-day floors only move up at the close.'
      : 'Close-only: the account is only checked against the floor at the close (for comparison; most firms check intraday).'],
    ['Only closed trades', 'Price moving against you inside a trade (before its stop) is not modelled: a trade either hits its target or its stop.'],
    ['Best-day rule', 'Biggest winning day ÷ total profit. If the target is hit but this fails, the evaluation keeps trading.'],
    ['Payouts', 'Taken at the end of a day once the qualifying days and profit are in. Each withdrawal lowers the balance; the floor stays where it is.'],
    ['Accounts that never finish', `Evaluations still going after ${EVAL_DAY_LIMIT} trading days count as not passed; funded accounts after ${FUNDED_DAY_LIMIT} days stop there and count only the payouts taken.`],
    ['Account failure vs budget ruin', 'Account failure is one account blowing. Budget ruin is your money for buying accounts running out before any payout (failed evaluations are reset at the reset fee).'],
    ['Ranges', 'Each chance shows the range the true figure is very likely in (95%) given the number of runs. More runs, narrower ranges.'],
  ];
  return (
    <Card className="space-y-2">
      <h3 className="text-sm font-semibold text-slate-50">Assumptions</h3>
      <dl className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-xs">
        {items.map(([t, d]) => (
          <div key={t}>
            <dt className="text-slate-300 font-medium">{t}</dt>
            <dd className="text-slate-500">{d}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}
