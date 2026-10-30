import { useMemo, useState } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { analyzeCategoryField, analyzeCategoryCombinations, categoryExtractors } from '../../utils/confluence-analyzer';
import { confluenceLists, analyzeEdge, analyzeForCount, analyzeNetScore, analyzeAgainstCost, analyzeCombos, analyzePairGrid } from '../../utils/confluence-insights';
import EdgeBars from './EdgeBars';
import StackingColumns from './StackingColumns';
import AgainstCost from './AgainstCost';
import ComboHeatmap from './ComboHeatmap';
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

  // FOR / AGAINST include custom fields set to count as confluences (e.g. "TDI: Cross")
  const { forOf, againstOf } = useMemo(
    () => confluenceLists(settings.customCategories, settings.categorySectionOrder),
    [settings.customCategories, settings.categorySectionOrder]
  );
  const forEdge = useMemo(() => analyzeEdge(trades, forOf, plField), [trades, forOf, plField]);
  const againstEdge = useMemo(() => analyzeEdge(trades, againstOf, plField), [trades, againstOf, plField]);
  const forCount = useMemo(() => analyzeForCount(trades, forOf, plField), [trades, forOf, plField]);
  const netScore = useMemo(() => analyzeNetScore(trades, forOf, againstOf, plField), [trades, forOf, againstOf, plField]);
  const againstCost = useMemo(() => analyzeAgainstCost(trades, againstOf, plField), [trades, againstOf, plField]);
  const combos = useMemo(() => analyzeCombos(trades, forOf, plField, 3), [trades, forOf, plField]);
  const pairGridTop = useMemo(() => analyzePairGrid(trades, forOf, plField, 8), [trades, forOf, plField]);
  const pairGridAll = useMemo(() => analyzePairGrid(trades, forOf, plField, Infinity), [trades, forOf, plField]);

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
      <EdgeBars
        data={forEdge}
        title="Confluences (FOR): which ones give me an edge?"
        subtitle="Edge = R per trade with the confluence minus R per trade without it. Green helps, red hurts."
      />
      {againstEdge.length > 0 && (
        <EdgeBars
          data={againstEdge}
          title="Confluences (AGAINST)"
          subtitle="Red = trades with this warning did worse than trades without it."
        />
      )}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StackingColumns rows={forCount} title="Does stacking help?" subtitle="R per trade by number of FOR confluences" labelHeader="FOR count" />
        <StackingColumns rows={netScore} title="Net confluence score" subtitle="R per trade by FOR count minus AGAINST count" labelHeader="Net score" />
      </div>
      <AgainstCost data={againstCost} />
      <ComboHeatmap top={pairGridTop} all={pairGridAll} combos={combos} />

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
