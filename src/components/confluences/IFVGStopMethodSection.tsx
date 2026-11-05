import { useMemo, useState } from 'react';
import type { Trade } from '../../types/trade';
import { useSettings } from '../../context/SettingsContext';
import { categoryExtractors } from '../../utils/confluence-analyzer';
import {
  suggestRanges, buildRangeBands, countOutsideBands, type SizeRange, buildMatrix, buildScatterPoints, countIneligible, buildSizeRows, SIZE_TABLE_BANDS,
} from '../../utils/ifvg-sl-analyzer';
import IFVGStopMethodScatter from './IFVGStopMethodScatter';
import IFVGStopMethodGrid from './IFVGStopMethodGrid';
import Card from '../ui/Card';
import TimingTable from '../analytics/TimingTable';
import { usePLFormatter } from '../../hooks/usePLFormatter';

const CATEGORY_KEY = 'ifvg-sl-category';
const RANGES_KEY = 'ifvg-sl-ranges';
const SIZE_NAMES = ['Small', 'Medium', 'Large'] as const;
const boxClass = 'w-24 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm font-mono text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

/** A typed number, or the fallback when the box is blank or not a number. */
function numberOr<T>(text: string, fallback: T): number | T {
  return text.trim() === '' || Number.isNaN(Number(text)) ? fallback : Number(text);
}

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
  // Six boxes: Small from/to, Medium from/to, Large from/to.
  const [rangeInputs, setRangeInputs] = useState<string[]>(() => {
    const saved = loadStored(RANGES_KEY)?.split(',') ?? [];
    return [0, 1, 2, 3, 4, 5].map(i => saved[i] ?? '');
  });

  // The trader's own pick wins whenever it is still a real category; otherwise
  // fall back to the first one, which also covers the pre-fetch empty list.
  const categoryId = chosenId && categories.some(c => c.id === chosenId)
    ? chosenId
    : (categories[0]?.id ?? '');

  const suggested = useMemo(() => suggestRanges(trades), [trades]);

  // A blank box falls back to the suggestion, which is also its placeholder.
  const ranges: SizeRange[] = suggested.map((sug, i) => ({
    from: numberOr(rangeInputs[i * 2], sug.from),
    to: numberOr(rangeInputs[i * 2 + 1], sug.to),
  }));
  const rangesKey = JSON.stringify(ranges);

  const extractor = useMemo(
    () => categoryId ? categoryExtractors.customField(categoryId) : () => [],
    [categoryId]
  );

  // eslint-disable-next-line react-hooks/exhaustive-deps -- rangesKey stands in for the ranges array
  const bands = useMemo(() => buildRangeBands(ranges), [rangesKey]);
  const outside = useMemo(() => countOutsideBands(trades, bands), [trades, bands]);
  const backwards = ranges.map((r, i) => (r.to !== null && r.to <= r.from ? SIZE_NAMES[i] : null)).filter(Boolean);
  const edges = [...new Set(ranges.flatMap(r => (r.to === null ? [r.from] : [r.from, r.to])).filter(x => x > 0))];
  const rows = useMemo(() => buildMatrix(trades, extractor, bands), [trades, extractor, bands]);
  const points = useMemo(() => buildScatterPoints(trades, extractor), [trades, extractor]);
  const ineligible = useMemo(() => countIneligible(trades, extractor), [trades, extractor]);
  const { plField } = usePLFormatter();
  const sizeRows = useMemo(() => buildSizeRows(trades, SIZE_TABLE_BANDS, plField), [trades, plField]);

  const updateCategory = (id: string) => {
    setChosenId(id);
    store(CATEGORY_KEY, id);
  };
  const updateRange = (index: number, value: string) => {
    const next = rangeInputs.map((v, i) => (i === index ? value : v));
    setRangeInputs(next);
    store(RANGES_KEY, next.join(','));
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
            <label className="block text-sm font-medium text-slate-400 mb-1">{name} (pts)</label>
            <div className="flex items-center gap-1.5 text-sm text-slate-500">
              <input
                type="number" step="any" aria-label={`${name} from`} value={rangeInputs[i * 2]}
                placeholder={String(suggested[i].from)}
                onChange={e => updateRange(i * 2, e.target.value)}
                className={boxClass}
              />
              to
              <input
                type="number" step="any" aria-label={`${name} to`} value={rangeInputs[i * 2 + 1]}
                placeholder={suggested[i].to === null ? 'no limit' : String(suggested[i].to)}
                onChange={e => updateRange(i * 2 + 1, e.target.value)}
                className={boxClass}
              />
            </div>
          </div>
        ))}
      </div>
      <p className="text-xs text-slate-500 -mt-2">
        "From" is included, "to" is not: 0 to 8 holds 7.9 but not 8. An empty "to" box for Large means no upper limit.
      </p>

      {backwards.length > 0 && (
        <p className="text-xs text-amber-400">
          {backwards.join(' and ')}: the "to" number needs to be bigger than the "from" number.
        </p>
      )}
      {outside > 0 && (
        <p className="text-xs text-slate-400">
          {outside} {outside === 1 ? 'trade has an iFVG size' : 'trades have an iFVG size'} outside all three ranges, so {outside === 1 ? "it isn't" : "they aren't"} in the grid below.
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
          <IFVGStopMethodScatter points={points} cutoffs={edges} />
        </>
      )}
    </div>
  );
}
