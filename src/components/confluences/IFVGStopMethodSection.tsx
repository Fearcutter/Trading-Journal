import { useMemo, useState } from 'react';
import type { Trade } from '../../types/trade';
import { useSettings } from '../../context/SettingsContext';
import { categoryExtractors } from '../../utils/confluence-analyzer';
import {
  suggestCutoffs, buildBands, buildMatrix, buildScatterPoints, countIneligible,
} from '../../utils/ifvg-sl-analyzer';
import IFVGStopMethodScatter from './IFVGStopMethodScatter';
import IFVGStopMethodGrid from './IFVGStopMethodGrid';
import Card from '../ui/Card';

const CATEGORY_KEY = 'ifvg-sl-category';
const BANDS_KEY = 'ifvg-sl-bands';

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
  const [loInput, setLoInput] = useState<string>(() => loadStored(BANDS_KEY)?.split(',')[0] ?? '');
  const [hiInput, setHiInput] = useState<string>(() => loadStored(BANDS_KEY)?.split(',')[1] ?? '');

  // The trader's own pick wins whenever it is still a real category; otherwise
  // fall back to the first one, which also covers the pre-fetch empty list.
  const categoryId = chosenId && categories.some(c => c.id === chosenId)
    ? chosenId
    : (categories[0]?.id ?? '');

  const suggested = useMemo(() => suggestCutoffs(trades), [trades]);

  // A blank box falls back to the suggestion, which is also its placeholder.
  const lo = loInput.trim() === '' || Number.isNaN(Number(loInput)) ? suggested[0] : Number(loInput);
  const hi = hiInput.trim() === '' || Number.isNaN(Number(hiInput)) ? suggested[1] : Number(hiInput);

  const extractor = useMemo(
    () => categoryId ? categoryExtractors.customField(categoryId) : () => [],
    [categoryId]
  );

  const bands = useMemo(() => buildBands(lo, hi), [lo, hi]);
  const rows = useMemo(() => buildMatrix(trades, extractor, bands), [trades, extractor, bands]);
  const points = useMemo(() => buildScatterPoints(trades, extractor), [trades, extractor]);
  const ineligible = useMemo(() => countIneligible(trades, extractor), [trades, extractor]);

  const updateCategory = (id: string) => {
    setChosenId(id);
    store(CATEGORY_KEY, id);
  };
  const updateBands = (nextLo: string, nextHi: string) => {
    setLoInput(nextLo);
    setHiInput(nextHi);
    store(BANDS_KEY, `${nextLo},${nextHi}`);
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
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Small / medium cutoff</label>
          <input
            type="number" step="any" value={loInput} placeholder={String(suggested[0])}
            onChange={e => updateBands(e.target.value, hiInput)}
            className="w-32 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm font-mono text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-400 mb-1">Medium / large cutoff</label>
          <input
            type="number" step="any" value={hiInput} placeholder={String(suggested[1])}
            onChange={e => updateBands(loInput, e.target.value)}
            className="w-32 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm font-mono text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {lo === hi && (
        <p className="text-xs text-amber-400">
          Both cutoffs are {lo}, so the middle band is empty. Move one to open it up.
        </p>
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
          <IFVGStopMethodScatter points={points} lo={lo} hi={hi} />
          <IFVGStopMethodGrid rows={rows} bands={bands} />
        </>
      )}
    </div>
  );
}
