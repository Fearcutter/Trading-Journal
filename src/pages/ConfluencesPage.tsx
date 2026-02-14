import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTrades } from '../context/TradeContext';
import { analyzeConfluences, analyzeConfluenceCombinations } from '../utils/confluence-analyzer';
import ConfluenceTable from '../components/confluences/ConfluenceTable';
import CombinationAnalysis from '../components/confluences/CombinationAnalysis';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { Layers, PlusCircle } from 'lucide-react';

export default function ConfluencesPage() {
  const { trades } = useTrades();

  const confluenceStats = useMemo(() => analyzeConfluences(trades), [trades]);
  const combos = useMemo(() => analyzeConfluenceCombinations(trades), [trades]);

  if (trades.length === 0) {
    return (
      <EmptyState
        icon={<Layers size={48} />}
        title="No trades yet"
        description="Confluence analytics will appear here once you tag confluences on your trades."
        action={
          <Link to="/trades/new">
            <Button><PlusCircle size={16} /> Add First Trade</Button>
          </Link>
        }
      />
    );
  }

  return (
    <div className="space-y-6">
      <ConfluenceTable data={confluenceStats} />
      <CombinationAnalysis data={combos} />
    </div>
  );
}
