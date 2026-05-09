import { useState, useMemo } from 'react';
import { useTrades } from '../context/TradeContext';
import { useMFEMAEStats } from '../hooks/useMFEMAEStats';
import { usePLFormatter } from '../hooks/usePLFormatter';
import MFEMAEPanel from '../components/analytics/MFEMAEPanel';
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';

export default function MFEMAEPage() {
  const { trades } = useTrades();
  const { plField } = usePLFormatter();
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
  const overlapScopedTrades = useMemo(
    () => overlapScope === 'exclude' ? trades.filter(t => !t.overlap) : trades,
    [trades, overlapScope]
  );
  const stats = useMFEMAEStats(overlapScopedTrades, plField);

  if (trades.length === 0) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold text-slate-50 mb-4">MFE / MAE Analysis</h2>
        <p className="text-slate-400">Add some trades to see MFE/MAE analysis.</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-50">MFE / MAE Analysis</h2>
        <OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
      </div>
      <MFEMAEPanel trades={overlapScopedTrades} stats={stats} />
    </div>
  );
}
