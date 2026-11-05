import { useMemo, useState } from 'react';
import type { Trade } from '../../types/trade';
import { useSettings } from '../../context/SettingsContext';
import { categoryExtractors } from '../../utils/confluence-analyzer';
import {
  suggestCutoffs, buildBands, type Cutoffs, buildMatrix, buildScatterPoints, countIneligible, buildSizeRows, SIZE_TABLE_BANDS,
} from '../../utils/ifvg-sl-analyzer';
import IFVGStopMethodScatter from './IFVGStopMethodScatter';
import IFVGStopMethodGrid from './IFVGStopMethodGrid';
import Card from '../ui/Card';
import TimingTable from '../analytics/TimingTable';
import { usePLFormatter } from '../../hooks/usePLFormatter';

const CATEGORY_KEY = 'ifvg-sl-category';
const BANDS_KEY = 'ifvg-sl-cutoffs';
const SIZE_NAMES = ['Small', 'Medium', 'Large'] as const;

interface Props {
  trades: Trade[];
}

function loadStored(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Private browsing or blocked storage — the section still works, it just forgets.
  }
}

export default function IFVGStopMethodSection({ trades }: Props) {
  const settings = useSettings();
  const categories = useMemo(() => settings.customCategories || [], [settings.customCategories]);

  // Remembered choices are read once, when state is first created — never in an
  // effect. Settings arrive asynchronously from Supabase, so categories start
  // empty and fill in later; the selection is therefore *derived* each render
  // rather than synced into state, which would cascade renders as the fetch
  // resolves.
  const [chosenId, setChosenId] = useState<string | null>(() => loadStored(CATEGORY_KEY));
  const [cutoffInputs, setCutoffInputs] = useState<string[]>(() => {
    const saved = loadStored(BANDS_KEY)?.split(',') ?? [];
    return [0, 1, 2].map(i => saved[i] ?? '');
  });

  // The trader's own pick wins whenever it is still a real category; otherwise
  // fall back to the first one, which also covers the pre-fetch empty list.
  const categoryId = chosenId && categories.some(c => c.id === chosenId)
    ? chosenId
    : (categories[0]?.id ?? '');

  const suggested = useMemo(() => suggestCutoffs(trades), [trades]);

  // A blank box falls back to the suggestion, which is also its placeholder.
  const cutoffs = cutoffInputs.map((v, i) =>
    v.trim() === '' || Number.isNaN(Number(v)) ? suggested[i] : Number(v)) as Cutoffs;
  const cutoffsKey = cutoffs.join(',');

  const extractor = useMemo(
    () => categoryId ? categoryExtractors.customField(categoryId) : () => [],
    [categoryId]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- cutoffsKey stands in for the cutoffs array
  const bands = useMemo(() => buildBands(cutoffs), [cutoffsKey]);
  const rows = useMemo(() => buildMatrix(trades, extractor, bands), [trades, extractor, bands]);
  const points = useMemo(() => buildScatterPoints(trades, extractor), [trades, extractor]);
  const ineligible = useMemo(() => countIneligible(trades, extractor), [trades, extractor]);
  const { plField } = usePLFormatter();
  const sizeRows = useMemo(() => buildSizeRows(trades, SIZE_TABLE_BANDS, plField), [trades, plField]);

  const updateCategory = (id: string) => {
    setChosenId(id);
    store(CATEGORY_KEY, id);
  };
  const updateCutoff = (index: number, value: string) => {
    const next = cutoffInputs.map((v, i) => (i === index ? value : v));
    setCutoffInputs(next);
    store(BANDS_KEY, next.join(','));
  };

  if (categories.length === 0) {
    return (
      <div className="border-t border-slate-700 pt-6">
        <Card>
          <h3 className="text-sm font-medium text-slate-300">iFVG Size vs Stop Method</h3>
          <p className="text-sm text-slate-500 mt-2">
            This comparison needs your stop-loss methods in a category. Add one in Settings, then tag your trades with the method you used.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="border-t border-slate-700 pt-6 space-y-4">
      <div className="flex flex-wrap items-end gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Stop method category</label>
          <select
            value={categoryId}
            onChange={e => updateCategory(e.target.value)}
            className="px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>
        {SIZE_NAMES.map((name, i) => (
          <div key={name}>
            <label className="block text-sm font-medium text-slate-400 mb-1">{name} up to (pts)</label>
            <input
              type="number" step="any" value={cutoffInputs[i]} placeholder={String(suggested[i])}
              onChange={e => updateCutoff(i, e.target.value)}
              className="w-28 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm font-mono text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        ))}
        <p className="text-xs text-slate-500 pb-2.5">Anything bigger than Large is Extra large.</p>
      </div>

      {new Set(cutoffs).size < 3 && (
        <p className="text-xs text-amber-400">
          Two of your limits are the same number, so one group is empty. Change one to open it up.
        </p>
      )}

      {sizeRows.some(r => r.trades > 0) && (
        <TimingTable
          title="Win rate by iFVG size"
          subtitle="Every trade with an iFVG size, all stop methods together. Ranges include the lower number, e.g. 2.5 counts in 2.5–5."
          labelHeader="iFVG size"
          rows={sizeRows}
        />
      )}

      {rows.length === 0 ? (
        <Card>
          <h3 className="text-sm font-medium text-slate-300">iFVG Size vs Stop Method</h3>
          <p className="text-sm text-slate-500 mt-2">
            No trades yet with both an iFVG size and a stop method. Log a few and this fills in.
          </p>
          <ul className="text-sm text-slate-400 mt-3 space-y-1">
            <li>{ineligible.missingSize} with a stop method but no iFVG size</li>
            <li>{ineligible.missingMethod} with an iFVG size but no stop method</li>
            <li>{ineligible.noStopDistance} with both, but no gap between entry and stop</li>
          </ul>
        </Card>
      ) : (
        <>
          <IFVGStopMethodGrid rows={rows} bands={bands} />
          <IFVGStopMethodScatter points={points} cutoffs={cutoffs} />
        </>
      )}
    </div>
  );
}
