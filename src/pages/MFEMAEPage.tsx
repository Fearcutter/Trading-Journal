import { useTrades } from '../context/TradeContext';
import { useMFEMAEStats } from '../hooks/useMFEMAEStats';
import { usePLFormatter } from '../hooks/usePLFormatter';
import MFEMAEPanel from '../components/analytics/MFEMAEPanel';

export default function MFEMAEPage() {
  const { trades } = useTrades();
  const { plField } = usePLFormatter();
  const stats = useMFEMAEStats(trades, plField);

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
      <h2 className="text-2xl font-bold text-slate-50">MFE / MAE Analysis</h2>
      <MFEMAEPanel trades={trades} stats={stats} />
    </div>
  );
}
