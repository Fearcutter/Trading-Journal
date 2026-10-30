import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrades } from '../context/TradeContext';
import { useLiveSession } from '../context/LiveSessionContext';
import { useBacktest } from '../context/BacktestContext';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { Layers, PlusCircle } from 'lucide-react';
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';
import ConfluencesTab from '../components/confluences/ConfluencesTab';
import { scopeTrades, type TradeScope } from '../utils/confluence-insights';

const SCOPES: { key: TradeScope; label: string }[] = [
  { key: 'live', label: 'Live' },
  { key: 'backtest', label: 'Backtest' },
  { key: 'all', label: 'All' },
];

export default function ConfluencesPage() {
  const { trades } = useTrades();
  const { sessions: liveSessions } = useLiveSession();
  const { sessions: backtestSessions } = useBacktest();
  const [tradeScope, setTradeScope] = useState<TradeScope>('live');
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');

  const scopedTrades = useMemo(() => {
    const inScope = scopeTrades(
      trades,
      tradeScope,
      new Set(liveSessions.map(s => s.id)),
      new Set(backtestSessions.map(s => s.id)),
    );
    return overlapScope === 'exclude' ? inScope.filter(t => !t.overlap) : inScope;
  }, [trades, tradeScope, liveSessions, backtestSessions, overlapScope]);

  if (trades.length === 0) {
    return (
      <EmptyState
        icon={<Layers size={48} />}
        title="No trades yet"
        description="Category analytics will appear here once you add trades."
        action={
          <Link to="/live-trading">
            <Button><PlusCircle size={16} /> Add First Trade</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex rounded-lg overflow-hidden border border-slate-600">
          {SCOPES.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTradeScope(key)}
              className={`px-3 py-1.5 text-sm font-medium transition-colors ${tradeScope === key ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'}`}
            >
              {label}
            </button>
          ))}
        </div>
        <OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
      </div>
      <ConfluencesTab trades={scopedTrades} />
    </div>
  );
}
