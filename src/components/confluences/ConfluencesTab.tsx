import { useMemo, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { analyzeConfluences, analyzeConfluenceCombinations, analyzeCategoryField, analyzeCategoryCombinations, categoryExtractors } from '../../utils/confluence-analyzer';
import { usePLFormatter } from '../../hooks/usePLFormatter';
import ConfluenceTable from './ConfluenceTable';
import CombinationAnalysis from './CombinationAnalysis';
import EmptyState from '../ui/EmptyState';
import { Layers } from 'lucide-react';
import type { Trade } from '../../types/trade';

type CategoryOption = {
  id: string;
  label: string;
  isMulti: boolean;
  extractor: (t: Trade) => string[];
};

export default function ConfluencesTab({ trades }: { trades: Trade[] }) {
  const settings = useSettings();
  const { plField } = usePLFormatter();
  const [selectedCategory, setSelectedCategory] = useState('');

  const confluenceStats = useMemo(() => analyzeConfluences(trades, plField, 'confluences'), [trades, plField]);
  const confluenceAgainstStats = useMemo(() => analyzeConfluences(trades, plField, 'confluencesAgainst'), [trades, plField]);
  const combos3 = useMemo(() => analyzeConfluenceCombinations(trades, plField, 3), [trades, plField]);
  const combos2 = useMemo(() => analyzeConfluenceCombinations(trades, plField, 2).filter(c => c.count < 3), [trades, plField]);

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
    () => active ? analyzeCategoryField(trades, plField, active.extractor) : [],
    [trades, plField, active]
  );

  const categoryCombos = useMemo(
    () => active?.isMulti ? analyzeCategoryCombinations(trades, plField, active.extractor) : [],
    [trades, plField, active]
  );

  if (trades.length === 0) {
    return (
      <EmptyState
        icon={<Layers size={48} />}
        title="No trades yet"
        description="Add trades to see confluence and category analytics."
      />
    );
  }

  return (
    <div className="space-y-6">
      <ConfluenceTable data={confluenceStats} title="Confluences (FOR) Performance" />
      {confluenceAgainstStats.length > 0 && (
        <ConfluenceTable data={confluenceAgainstStats} title="Confluences (AGAINST) Performance" />
      )}
      <CombinationAnalysis data={combos3} />
      <CombinationAnalysis data={combos2} title="Confluence Pair Analysis (Emerging)" subtitle="Combinations with 2 occurrences" />

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
