import type { TradingPlanComparison } from '../../hooks/useTradingPlanStats';
import { usePLFormatter } from '../../hooks/usePLFormatter';
import Card from '../ui/Card';

interface Props {
  comparison: TradingPlanComparison;
}

export default function MissedTradesBreakdown({ comparison }: Props) {
  const pl = usePLFormatter();
  const { skippedStats } = comparison;

  if (skippedStats.totalTrades === 0) return null;

  const wins = comparison.skippedTrades.filter(t => t.result === 'win').length;
  const losses = comparison.skippedTrades.filter(t => t.result === 'loss').length;
  const be = skippedStats.totalTrades - wins - losses;
  const netPL = skippedStats.totalPL;
  const leavingMoney = netPL > 0;

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300 mb-2">Skipped Trades Summary</h3>
      <p className="text-sm text-slate-400 mb-3">
        You would skip <span className="text-slate-200 font-medium">{skippedStats.totalTrades}</span> trade{skippedStats.totalTrades !== 1 ? 's' : ''}:{' '}
        <span className="text-emerald-400">{wins}W</span>
        {' / '}
        <span className="text-rose-400">{losses}L</span>
        {be > 0 && <>{' / '}<span className="text-amber-400">{be}BE</span></>}
        {' = '}
        <span className={netPL > 0 ? 'text-emerald-400' : netPL < 0 ? 'text-rose-400' : 'text-slate-300'}>
          {pl.formatPLValue(netPL)}
        </span>
      </p>
      <p className={`text-xs ${leavingMoney ? 'text-amber-400' : 'text-emerald-400'}`}>
        {leavingMoney
          ? 'You\'re leaving money on the table with your current plan limit.'
          : 'Your plan is protecting you from net-losing trades.'}
      </p>
    </Card>
  );
}
