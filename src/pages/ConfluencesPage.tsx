import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTrades } from '../context/TradeContext';
import { useSettings } from '../context/SettingsContext';
import { analyzeConfluences, analyzeConfluenceCombinations, analyzeCategoryField, analyzeCategoryCombinations, categoryExtractors } from '../utils/confluence-analyzer';
import { usePLFormatter } from '../hooks/usePLFormatter';
import ConfluenceTable from '../components/confluences/ConfluenceTable';
import CombinationAnalysis from '../components/confluences/CombinationAnalysis';
import EmptyState from '../components/ui/EmptyState';
import Button from '../components/ui/Button';
import { Layers, PlusCircle } from 'lucide-react';
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';

type CategoryOption = {
  id: string;
  label: string;
  isMulti: boolean;
  extractor: (t: import('../types/trade').Trade) => string[];
};

export default function ConfluencesPage() {
  const { trades } = useTrades();
  const settings = useSettings();
  const { plField } = usePLFormatter();
  const [selectedCategory, setSelectedCategory] = useState('');
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
  const scopedTrades = useMemo(
    () => overlapScope === 'exclude' ? trades.filter(t => !t.overlap) : trades,
    [trades, overlapScope]
  );

  // Original confluence analytics
  const confluenceStats = useMemo(() => analyzeConfluences(scopedTrades, plField, 'confluences'), [scopedTrades, plField]);
  const confluenceAgainstStats = useMemo(() => analyzeConfluences(scopedTrades, plField, 'confluencesAgainst'), [scopedTrades, plField]);
  const combos3 = useMemo(() => analyzeConfluenceCombinations(scopedTrades, plField, 3), [scopedTrades, plField]);
  const combos2 = useMemo(() => analyzeConfluenceCombinations(scopedTrades, plField, 2).filter(c => c.count < 3), [scopedTrades, plField]);

  // Additional category options (excluding confluences which are shown above)
  const categoryOptions: CategoryOption[] = useMemo(() => {
    const builtIn: CategoryOption[] = [
      { id: 'setupType', label: 'Setup Types', isMulti: false, extractor: categoryExtractors.setupType },
      { id: 'grade', label: 'Grades', isMulti: false, extractor: categoryExtractors.grade },
    ];
    const custom: CategoryOption[] = (settings.customCategories || []).map(cat => ({
      id: `custom_${cat.id}`,
      label: cat.name,
      isMulti: true,
      extractor: categoryExtractors.customField(cat.id),
    }));
    return [...builtIn, ...custom];
  }, [settings.customCategories]);

  const active = selectedCategory ? categoryOptions.find(c => c.id === selectedCategory) : null;

  const categoryStats = useMemo(
    () => active ? analyzeCategoryField(scopedTrades, plField, active.extractor) : [],
    [scopedTrades, plField, active]
  );

  const categoryCombos = useMemo(
    () => active?.isMulti ? analyzeCategoryCombinations(scopedTrades, plField, active.extractor) : [],
    [scopedTrades, plField, active]
  );

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
      <div className="flex items-center justify-end">
        <OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
      </div>
      {/* Original Confluences Section */}
      <ConfluenceTable data={confluenceStats} title="Confluences (FOR) Performance" />
      {confluenceAgainstStats.length > 0 && (
        <ConfluenceTable data={confluenceAgainstStats} title="Confluences (AGAINST) Performance" />
      )}
      <CombinationAnalysis data={combos3} />
      <CombinationAnalysis data={combos2} title="Confluence Pair Analysis (Emerging)" subtitle="Combinations with 2 occurrences" />

      {/* Additional Category Analytics */}
      {categoryOptions.length > 0 && (
        <>
          <div className="border-t border-slate-700 pt-6">
            <div className="flex items-center gap-3">
              <label className="text-sm font-medium text-slate-400">Analyze additional category:</label>
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a category...</option>
                {categoryOptions.map(opt => (
                  <option key={opt.id} value={opt.id}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>

          {active && categoryStats.length > 0 && (
            <>
              <ConfluenceTable data={categoryStats} title={`${active.label} Performance`} />
              {active.isMulti && categoryCombos.length > 0 && (
                <CombinationAnalysis data={categoryCombos} />
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}
