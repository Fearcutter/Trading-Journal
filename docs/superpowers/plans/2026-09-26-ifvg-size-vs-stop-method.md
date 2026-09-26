# iFVG Size vs Stop Method Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a section to the Confluences page that compares stop-loss method performance across iFVG size bands, judged on realized R.

**Architecture:** Two new pure-function utility modules hold all arithmetic (`r-multiple.ts` for the R calculation, `ifvg-sl-analyzer.ts` for banding and aggregation); three new presentational components render it. The container component owns UI state (chosen category, cutoffs) and persists it to `localStorage`. The page passes its already-overlap-scoped trades down, so the existing Overlap toggle governs the new section with no extra wiring.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Tailwind 4, recharts 3, lucide-react

**Spec:** `docs/superpowers/specs/2026-09-25-ifvg-size-vs-stop-method-design.md`

## Global Constraints

- **Realized R** is `pointsPL / |entry - stopLoss|`. Trades with a stop distance of 0 are **excluded**, never counted as 0R.
- **Never change existing displayed numbers.** Realized R is additive only. `riskReward` (planned R:R) keeps every current meaning and stays on every page that shows it.
- **Thin-sample threshold is 5.** A cell with 1–4 trades is flagged, not hidden, and is ineligible for the best-in-band ring.
- **Three bands, two cutoffs.** Cutoffs are sorted internally, so reverse order behaves identically. Equal cutoffs leave band 2 empty and show an inline note — this is a valid state, not an error.
- **A trade tagged with multiple stop methods counts once under each**, matching `analyzeConfluences`. Cell counts may therefore exceed the distinct trade count.
- **Band defaults** are the 33rd/67th percentiles of `ifvgSize` over scoped trades that have a size, rounded to 1dp — independent of the selected category, so columns don't shift when the dropdown changes. Fewer than 3 such trades falls back to `8` and `15`.
- **The repo has no test framework.** Verification per task is `npx tsc -b`, `npx eslint <files>`, and for pure functions a throwaway script under the scratchpad run with `npx tsx`. Never add a test framework or a test dependency.
- **One pre-existing eslint error** (`react-refresh/only-export-components` in `src/context/TradeContext.tsx`) is out of scope. It must neither be fixed nor counted as a regression.
- Branch: `ifvg-size-analysis`. Commit after every task.

---

### Task 1: Realized R helper

**Files:**
- Create: `src/utils/r-multiple.ts`
- Modify: `src/utils/mfe-mae-analyzer.ts:4-6` (replace the private `getStopDistance` with an import)

**Interfaces:**
- Consumes: nothing from earlier tasks
- Produces: `getStopDistance(trade: Trade): number`, `getRealizedR(trade: Trade): number | null`

- [ ] **Step 1: Create the module**

Create `src/utils/r-multiple.ts`:

```ts
import type { Trade } from '../types/trade';

/** Points between entry and stop. Zero when the trade has no usable stop. */
export function getStopDistance(trade: Trade): number {
  return Math.abs(trade.entry - trade.stopLoss);
}

/**
 * R actually earned: points won or lost divided by the distance risked.
 *
 * This is deliberately different from `Trade.riskReward`, which is the
 * *planned* target-to-stop ratio fixed at entry and identical for a winner
 * and a loser with the same levels. Planned R:R cannot compare stop methods
 * fairly, because a wider stop mechanically scores lower on it even when it
 * is the more profitable method.
 *
 * Returns null when the stop distance is zero, so callers skip the trade
 * rather than folding a meaningless 0R into an average.
 */
export function getRealizedR(trade: Trade): number | null {
  const stopDistance = getStopDistance(trade);
  if (stopDistance <= 0) return null;
  return trade.pointsPL / stopDistance;
}
```

- [ ] **Step 2: Point the MFE/MAE analyzer at the shared helper**

In `src/utils/mfe-mae-analyzer.ts`, delete these lines:

```ts
function getStopDistance(trade: Trade): number {
  return Math.abs(trade.entry - trade.stopLoss);
}
```

and add to the imports at the top of the file:

```ts
import { getStopDistance } from './r-multiple';
```

The behaviour is byte-for-byte identical, so every existing call site keeps working untouched.

- [ ] **Step 3: Verify the maths against known numbers**

Create `tmp-check-r.ts` **in the project root** (deleted at the end of this step — it is scratch, never committed).

Run it with `npx tsx`, not `node --experimental-strip-types`: Node's native type
stripping cannot resolve this codebase's extensionless imports, whereas `tsx`
can and adds nothing to `package.json`.

```ts
import { getRealizedR, getStopDistance } from './src/utils/r-multiple';
import type { Trade } from './src/types/trade';

const base = { id: 'x', date: '2026-01-01', time: '09:30', instrument: 'NQ',
  direction: 'long', takeProfit: 0, exitPrice: 0, contracts: 1, result: 'win',
  dollarPL: 0, riskReward: 0, setupType: '', confluences: [], confluencesAgainst: [],
  emotionBefore: '', emotionAfter: '', grade: '', preTradeNotes: '', postTradeNotes: '',
  setupScreenshot: '', resultScreenshot: '', tags: [], createdAt: '', updatedAt: '' } as unknown as Trade;

const cases: [string, Partial<Trade>, number | null][] = [
  ['risk 10 make 20 = +2R',    { entry: 100, stopLoss: 90,  pointsPL: 20 },  2],
  ['risk 10 lose 10 = -1R',    { entry: 100, stopLoss: 90,  pointsPL: -10 }, -1],
  ['wide stop, same $ = less R', { entry: 100, stopLoss: 80, pointsPL: 20 }, 1],
  ['short: stop above entry',  { entry: 100, stopLoss: 110, pointsPL: 5 },   0.5],
  ['no stop distance = null',  { entry: 100, stopLoss: 100, pointsPL: 20 },  null],
  ['breakeven = 0R',           { entry: 100, stopLoss: 90,  pointsPL: 0 },   0],
];

let failed = 0;
for (const [name, patch, expected] of cases) {
  const got = getRealizedR({ ...base, ...patch } as Trade);
  const ok = got === expected;
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}: got ${got}, expected ${expected}`);
}
console.log(`stop distance short trade: ${getStopDistance({ ...base, entry: 100, stopLoss: 110 } as Trade)} (expect 10)`);
console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
```

Run: `npx tsx tmp-check-r.ts`
Expected: `ALL PASS`, and stop distance prints `10`.

Then delete it: `rm tmp-check-r.ts`

Note the third case — it is the whole reason this module exists. Two trades that both made 20 points score +2R and +1R because one risked twice as much.

- [ ] **Step 4: Typecheck and lint**

Run: `npx tsc -b`
Expected: no output, exit 0

Run: `npx eslint src/utils/r-multiple.ts src/utils/mfe-mae-analyzer.ts`
Expected: no output

- [ ] **Step 5: Confirm the MFE/MAE page is unchanged**

Start the dev server if it is not already up (`lsof -ti:5173` to check; `npx vite dev` to start). Open the MFE/MAE page and confirm the numbers render as before. The refactor is behaviour-preserving, so any change here is a bug.

- [ ] **Step 6: Commit**

```bash
git add src/utils/r-multiple.ts src/utils/mfe-mae-analyzer.ts
git commit -m "Add shared realized-R helper

Realized R is points P&L over stop distance, unlike the existing planned
R:R which is fixed at entry and mechanically favours tighter stops. Needed
to compare stop-loss methods fairly.

mfe-mae-analyzer now imports the shared getStopDistance instead of holding
a private copy. Behaviour is unchanged."
```

---

### Task 2: Banding and matrix analyzer

**Files:**
- Create: `src/utils/ifvg-sl-analyzer.ts`

**Interfaces:**
- Consumes: `getRealizedR`, `getStopDistance` from `src/utils/r-multiple` (Task 1)
- Produces:
  - `THIN_SAMPLE_THRESHOLD: 5`
  - `SizeBand { label: string; min: number | null; max: number | null }`
  - `MatrixCell { avgR: number | null; count: number; thin: boolean }`
  - `MatrixRow { method: string; cells: MatrixCell[]; all: MatrixCell; totalCount: number }`
  - `ScatterPoint { size: number; r: number; method: string; date: string; instrument: string }`
  - `suggestCutoffs(trades: Trade[]): [number, number]`
  - `buildBands(lo: number, hi: number): SizeBand[]`
  - `buildMatrix(trades: Trade[], extractor: (t: Trade) => string[], bands: SizeBand[]): MatrixRow[]`
  - `buildScatterPoints(trades: Trade[], extractor: (t: Trade) => string[]): ScatterPoint[]`
  - `countIneligible(trades: Trade[], extractor: (t: Trade) => string[]): { missingSize: number; missingMethod: number; noStopDistance: number }`

`buildScatterPoints` and `ScatterPoint` are additions beyond the interface list
in the spec. The spec assigns all arithmetic to the analyzer and leaves
components rendering only; building scatter rows in the component would have
broken that split.

- [ ] **Step 1: Create the module**

Create `src/utils/ifvg-sl-analyzer.ts`:

```ts
import type { Trade } from '../types/trade';
import { getRealizedR, getStopDistance } from './r-multiple';

/** Cells built on fewer trades than this are flagged as unreliable. */
export const THIN_SAMPLE_THRESHOLD = 5;

/** Used when there is too little size data to derive sensible cutoffs. */
const FALLBACK_CUTOFFS: [number, number] = [8, 15];

export interface SizeBand {
  label: string;
  min: number | null; // null = unbounded below (first band)
  max: number | null; // null = unbounded above (last band)
}

export interface MatrixCell {
  avgR: number | null;
  count: number;
  thin: boolean;
}

export interface MatrixRow {
  method: string;
  cells: MatrixCell[]; // one per band, same order as the bands passed in
  all: MatrixCell;     // every band combined
  totalCount: number;
}

export interface ScatterPoint {
  size: number;
  r: number;
  method: string;
  date: string;
  instrument: string;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Trim a trailing ".0" so labels read "8" rather than "8.0". */
function fmt(n: number): string {
  return String(Number(n.toFixed(2)));
}

function percentile(sorted: number[], fraction: number): number {
  const idx = Math.round(fraction * (sorted.length - 1));
  return sorted[Math.min(sorted.length - 1, Math.max(0, idx))];
}

/**
 * Starting cutoffs derived from the trader's own gap sizes, splitting them
 * into three roughly even groups.
 *
 * Deliberately ignores the selected stop-method category: the bands describe
 * the size axis alone, and making them category-dependent would shift the
 * columns every time the dropdown changed.
 */
export function suggestCutoffs(trades: Trade[]): [number, number] {
  const sizes = trades
    .map(t => t.ifvgSize)
    .filter((s): s is number => s != null)
    .sort((a, b) => a - b);

  if (sizes.length < 3) return FALLBACK_CUTOFFS;
  return [round1(percentile(sizes, 1 / 3)), round1(percentile(sizes, 2 / 3))];
}

/**
 * Three bands from two cutoffs. The inputs are sorted, so entering them in
 * either order gives the same result. Equal cutoffs produce an empty middle
 * band — a valid state the UI explains rather than rejects.
 */
export function buildBands(lo: number, hi: number): SizeBand[] {
  const [a, b] = lo <= hi ? [lo, hi] : [hi, lo];
  return [
    { label: `< ${fmt(a)}`, min: null, max: a },
    { label: `${fmt(a)} – ${fmt(b)}`, min: a, max: b },
    { label: `≥ ${fmt(b)}`, min: b, max: null },
  ];
}

function bandIndexOf(size: number, bands: SizeBand[]): number {
  for (let i = 0; i < bands.length; i++) {
    const { min, max } = bands[i];
    if ((min === null || size >= min) && (max === null || size < max)) return i;
  }
  return -1;
}

interface Acc { sum: number; count: number }
const emptyAcc = (): Acc => ({ sum: 0, count: 0 });

function toCell(a: Acc): MatrixCell {
  return {
    avgR: a.count > 0 ? a.sum / a.count : null,
    count: a.count,
    thin: a.count > 0 && a.count < THIN_SAMPLE_THRESHOLD,
  };
}

/**
 * Average realized R per stop method per size band.
 *
 * A trade carrying several methods is counted under each of them, matching
 * how analyzeConfluences treats multi-value fields. Counts across a row can
 * therefore exceed the number of distinct trades.
 */
export function buildMatrix(
  trades: Trade[],
  extractor: (t: Trade) => string[],
  bands: SizeBand[],
): MatrixRow[] {
  const methods = new Map<string, { bands: Acc[]; all: Acc }>();

  for (const trade of trades) {
    if (trade.ifvgSize == null) continue;
    const r = getRealizedR(trade);
    if (r === null) continue;
    const idx = bandIndexOf(trade.ifvgSize, bands);
    if (idx < 0) continue;

    for (const method of extractor(trade)) {
      let entry = methods.get(method);
      if (!entry) {
        entry = { bands: bands.map(emptyAcc), all: emptyAcc() };
        methods.set(method, entry);
      }
      entry.bands[idx].sum += r;
      entry.bands[idx].count++;
      entry.all.sum += r;
      entry.all.count++;
    }
  }

  return [...methods.entries()]
    .map(([method, acc]) => ({
      method,
      cells: acc.bands.map(toCell),
      all: toCell(acc.all),
      totalCount: acc.all.count,
    }))
    .sort((a, b) => b.totalCount - a.totalCount);
}

/** One point per (trade, method) pair, on the same eligibility rules as the matrix. */
export function buildScatterPoints(
  trades: Trade[],
  extractor: (t: Trade) => string[],
): ScatterPoint[] {
  const points: ScatterPoint[] = [];
  for (const trade of trades) {
    if (trade.ifvgSize == null) continue;
    const r = getRealizedR(trade);
    if (r === null) continue;
    for (const method of extractor(trade)) {
      points.push({
        size: trade.ifvgSize,
        r,
        method,
        date: trade.date,
        instrument: trade.instrument,
      });
    }
  }
  return points;
}

/**
 * Why trades were left out, so the empty state can say what backfilling buys.
 * Each trade is attributed to at most one reason.
 */
export function countIneligible(
  trades: Trade[],
  extractor: (t: Trade) => string[],
): { missingSize: number; missingMethod: number; noStopDistance: number } {
  let missingSize = 0;
  let missingMethod = 0;
  let noStopDistance = 0;

  for (const trade of trades) {
    const hasSize = trade.ifvgSize != null;
    const hasMethod = extractor(trade).length > 0;
    if (!hasSize && hasMethod) missingSize++;
    else if (hasSize && !hasMethod) missingMethod++;
    else if (hasSize && hasMethod && getStopDistance(trade) <= 0) noStopDistance++;
  }

  return { missingSize, missingMethod, noStopDistance };
}
```

- [ ] **Step 2: Verify the banding and aggregation against known numbers**

Create `tmp-check-bands.ts` **in the project root** (deleted at the end of this step — scratch, never committed):

```ts
import { buildBands, buildMatrix, suggestCutoffs, countIneligible, buildScatterPoints } from './src/utils/ifvg-sl-analyzer';
import type { Trade } from './src/types/trade';

let failed = 0;
const check = (name: string, got: unknown, expected: unknown) => {
  const ok = JSON.stringify(got) === JSON.stringify(expected);
  if (!ok) failed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n      got      ${JSON.stringify(got)}\n      expected ${JSON.stringify(expected)}`);
};

const t = (ifvgSize: number | undefined, pointsPL: number, methods: string[], stop = 90): Trade => ({
  entry: 100, stopLoss: stop, pointsPL, ifvgSize,
  customFields: { sl: methods },
  date: '2026-01-01', instrument: 'NQ',
} as unknown as Trade);

const sl = (tr: Trade) => tr.customFields?.sl ?? [];

// Bands: reverse order and equal cutoffs
check('bands sorted regardless of input order',
  buildBands(15, 8).map(b => b.label),
  buildBands(8, 15).map(b => b.label));
check('equal cutoffs leave an empty middle band',
  buildMatrix([t(8, 10, ['A'])], sl, buildBands(8, 8))[0].cells.map(c => c.count),
  [0, 0, 1]);

// Boundaries are inclusive-low, exclusive-high
const bands = buildBands(8, 15);
check('size exactly on lower cutoff lands in band 2',
  buildMatrix([t(8, 10, ['A'])], sl, bands)[0].cells.map(c => c.count), [0, 1, 0]);
check('size exactly on upper cutoff lands in band 3',
  buildMatrix([t(15, 10, ['A'])], sl, bands)[0].cells.map(c => c.count), [0, 0, 1]);
check('size just below lower cutoff lands in band 1',
  buildMatrix([t(7.9, 10, ['A'])], sl, bands)[0].cells.map(c => c.count), [1, 0, 0]);

// Averaging and the thin flag
const rows = buildMatrix([t(5, 10, ['A']), t(6, 20, ['A'])], sl, bands);
check('averages realized R (+1R and +2R = +1.5R)', rows[0].cells[0].avgR, 1.5);
check('flags a 2-trade cell as thin', rows[0].cells[0].thin, true);
const five = buildMatrix(Array.from({ length: 5 }, () => t(5, 10, ['A'])), sl, bands);
check('5 trades is not thin', five[0].cells[0].thin, false);
check('empty cell has null avgR and is not thin',
  [rows[0].cells[1].avgR, rows[0].cells[1].thin], [null, false]);

// Multi-method trades count under each method
const multi = buildMatrix([t(5, 10, ['A', 'B'])], sl, bands);
check('a two-method trade counts under both', multi.map(r => [r.method, r.totalCount]), [['A', 1], ['B', 1]]);

// Rows sorted by volume
const sorted = buildMatrix([t(5, 10, ['A']), t(5, 10, ['B']), t(5, 10, ['B'])], sl, bands);
check('rows sorted by trade count descending', sorted.map(r => r.method), ['B', 'A']);

// Exclusions
check('zero stop distance excluded from matrix',
  buildMatrix([t(5, 10, ['A'], 100)], sl, bands).length, 0);
check('missing size excluded from matrix',
  buildMatrix([t(undefined, 10, ['A'])], sl, bands).length, 0);
check('missing method excluded from matrix',
  buildMatrix([t(5, 10, [])], sl, bands).length, 0);

// Cutoff suggestions
check('too little data falls back to 8/15', suggestCutoffs([t(5, 10, ['A'])]), [8, 15]);
check('cutoffs split sizes into thirds',
  suggestCutoffs([1, 2, 3, 4, 5, 6, 7, 8, 9].map(s => t(s, 10, ['A']))), [4, 6]);

// Diagnostics
check('ineligible counts attribute one reason each',
  countIneligible([t(undefined, 10, ['A']), t(5, 10, []), t(5, 10, ['A'], 100)], sl),
  { missingSize: 1, missingMethod: 1, noStopDistance: 1 });

// Scatter
check('scatter emits one point per trade-method pair',
  buildScatterPoints([t(5, 10, ['A', 'B'])], sl).map(p => [p.size, p.r, p.method]),
  [[5, 1, 'A'], [5, 1, 'B']]);

console.log(failed === 0 ? '\nALL PASS' : `\n${failed} FAILED`);
```

Run: `npx tsx tmp-check-bands.ts`
Expected: `ALL PASS`

Then delete it: `rm tmp-check-bands.ts`

Sizes 1–9 sit at indices 0–8: a third of 8 is 2.67 → index 3 → value 4; two thirds is 5.33 → index 5 → value 6. Hence `[4, 6]`. If this case fails, fix `percentile`, not the expectation.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc -b`
Expected: no output, exit 0

Run: `npx eslint src/utils/ifvg-sl-analyzer.ts`
Expected: no output

- [ ] **Step 4: Commit**

```bash
git add src/utils/ifvg-sl-analyzer.ts
git commit -m "Add iFVG size vs stop method analyzer

Pure functions for deriving size bands from the trader's own data,
assigning trades to bands, and averaging realized R per stop method per
band. Trades with several methods count under each, matching existing
confluence analysis."
```

---

### Task 3: The grid

**Files:**
- Create: `src/components/confluences/IFVGStopMethodGrid.tsx`

**Interfaces:**
- Consumes: `MatrixRow`, `MatrixCell`, `SizeBand`, `THIN_SAMPLE_THRESHOLD` from `src/utils/ifvg-sl-analyzer` (Task 2)
- Produces: default export `IFVGStopMethodGrid`, props `{ rows: MatrixRow[]; bands: SizeBand[] }`

- [ ] **Step 1: Create the component**

Create `src/components/confluences/IFVGStopMethodGrid.tsx`:

```tsx
import Card from '../ui/Card';
import { THIN_SAMPLE_THRESHOLD, type MatrixRow, type MatrixCell, type SizeBand } from '../../utils/ifvg-sl-analyzer';

interface Props {
  rows: MatrixRow[];
  bands: SizeBand[];
}

/** Three intensity tiers so a +2R cell reads louder than a +0.2R one. */
function cellColour(avgR: number): string {
  const magnitude = Math.abs(avgR);
  const tier = magnitude < 0.5 ? 0 : magnitude <= 1.5 ? 1 : 2;
  const positive = [
    'bg-emerald-500/10 text-emerald-300',
    'bg-emerald-500/25 text-emerald-200',
    'bg-emerald-500/40 text-emerald-100',
  ];
  const negative = [
    'bg-rose-500/10 text-rose-300',
    'bg-rose-500/25 text-rose-200',
    'bg-rose-500/40 text-rose-100',
  ];
  if (avgR === 0) return 'bg-slate-700/40 text-slate-300';
  return avgR > 0 ? positive[tier] : negative[tier];
}

function Cell({ cell, best }: { cell: MatrixCell; best: boolean }) {
  if (cell.avgR === null) {
    return (
      <td className="px-4 py-3 text-center">
        <span className="text-slate-600">—</span>
      </td>
    );
  }
  return (
    <td className="px-2 py-2">
      <div
        className={`rounded-lg px-3 py-2 text-center ${cellColour(cell.avgR)} ${cell.thin ? 'opacity-50' : ''} ${best ? 'ring-2 ring-sky-400' : ''}`}
      >
        <p className="font-mono text-sm font-semibold">
          {cell.avgR > 0 ? '+' : ''}{cell.avgR.toFixed(2)}R{cell.thin ? '*' : ''}
        </p>
        <p className="text-[11px] opacity-70">{cell.count} {cell.count === 1 ? 'trade' : 'trades'}</p>
      </div>
    </td>
  );
}

export default function IFVGStopMethodGrid({ rows, bands }: Props) {
  // Best method per band, ignoring thin cells so a 3-trade fluke cannot win.
  const bestRowPerBand = bands.map((_, bandIdx) => {
    let bestIdx = -1;
    let bestR = -Infinity;
    rows.forEach((row, rowIdx) => {
      const cell = row.cells[bandIdx];
      if (cell.avgR === null || cell.thin) return;
      if (cell.avgR > bestR) {
        bestR = cell.avgR;
        bestIdx = rowIdx;
      }
    });
    return bestIdx;
  });

  return (
    <Card padding={false}>
      <div className="p-4 pb-0">
        <h3 className="text-sm font-medium text-slate-300">Average Realized R by Stop Method and iFVG Size</h3>
        <p className="text-xs text-slate-500 mt-1">
          Points made or lost divided by the distance risked. Ringed cell is the best method in that band.
        </p>
      </div>
      <div className="overflow-x-auto p-4">
        <table className="w-full">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase tracking-wider">Stop Method</th>
              {bands.map(band => (
                <th key={band.label} className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
                  {band.label} pts
                </th>
              ))}
              <th className="px-4 py-3 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">All Sizes</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, rowIdx) => (
              <tr key={row.method} className="border-t border-slate-700">
                <td className="px-4 py-3 text-sm text-slate-200">{row.method}</td>
                {row.cells.map((cell, bandIdx) => (
                  <Cell key={bands[bandIdx].label} cell={cell} best={bestRowPerBand[bandIdx] === rowIdx} />
                ))}
                <Cell cell={row.all} best={false} />
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-xs text-slate-500 mt-3">
          * Fewer than {THIN_SAMPLE_THRESHOLD} trades — shown faded, and never ringed as best. Treat as not yet meaningful.
        </p>
      </div>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc -b`
Expected: no output, exit 0

Run: `npx eslint src/components/confluences/IFVGStopMethodGrid.tsx`
Expected: no output

- [ ] **Step 3: Commit**

```bash
git add src/components/confluences/IFVGStopMethodGrid.tsx
git commit -m "Add iFVG size vs stop method grid

Heatmap of average realized R per method per size band, with an All Sizes
column. Cells under the thin-sample threshold are faded and excluded from
the best-in-band highlight."
```

---

### Task 4: The scatter

**Files:**
- Create: `src/components/confluences/IFVGStopMethodScatter.tsx`

**Interfaces:**
- Consumes: `ScatterPoint` from `src/utils/ifvg-sl-analyzer` (Task 2)
- Produces: default export `IFVGStopMethodScatter`, props `{ points: ScatterPoint[]; lo: number; hi: number }`

- [ ] **Step 1: Create the component**

Create `src/components/confluences/IFVGStopMethodScatter.tsx`. Follow the existing `MFEMAEScatterPlot` conventions (dark grid `#334155`, axis text `#94a3b8`, tooltip on `#1e293b`):

```tsx
import { ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, Tooltip, CartesianGrid, ZAxis, ReferenceLine, Legend } from 'recharts';
import Card from '../ui/Card';
import type { ScatterPoint } from '../../utils/ifvg-sl-analyzer';

interface Props {
  points: ScatterPoint[];
  lo: number;
  hi: number;
}

const METHOD_COLOURS = ['#38bdf8', '#f472b6', '#a78bfa', '#fbbf24', '#34d399', '#fb7185', '#60a5fa', '#f97316'];

interface TooltipPayload { payload: ScatterPoint }

function PointTooltip({ active, payload }: { active?: boolean; payload?: TooltipPayload[] }) {
  if (!active || !payload?.length) return null;
  const p = payload[0].payload;
  return (
    <div className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs">
      <p className="text-slate-200 font-medium">{p.method}</p>
      <p className="text-slate-400">{p.date} · {p.instrument}</p>
      <p className="text-slate-300 font-mono mt-1">
        {p.size} pt gap · {p.r > 0 ? '+' : ''}{p.r.toFixed(2)}R
      </p>
    </div>
  );
}

export default function IFVGStopMethodScatter({ points, lo, hi }: Props) {
  const methods = [...new Set(points.map(p => p.method))].sort();
  const [low, high] = lo <= hi ? [lo, hi] : [hi, lo];

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300">Every Trade by Gap Size and Realized R</h3>
      <p className="text-xs text-slate-500 mt-1 mb-3">
        Each dot is one trade. Dashed lines are your cutoffs — check the dots actually separate before trusting a band.
      </p>
      <ResponsiveContainer width="100%" height={320}>
        <ScatterChart margin={{ top: 8, right: 16, bottom: 16, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
          <XAxis
            type="number"
            dataKey="size"
            name="iFVG size"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'iFVG Size (pts)', fill: '#94a3b8', position: 'insideBottom', offset: -8 }}
          />
          <YAxis
            type="number"
            dataKey="r"
            name="Realized R"
            tick={{ fill: '#94a3b8', fontSize: 12 }}
            label={{ value: 'Realized R', fill: '#94a3b8', angle: -90, position: 'insideLeft' }}
          />
          <ZAxis range={[45, 45]} />
          <Tooltip content={<PointTooltip />} cursor={{ strokeDasharray: '3 3' }} />
          <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
          <ReferenceLine y={0} stroke="#64748b" />
          <ReferenceLine x={low} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: String(low), fill: '#94a3b8', fontSize: 11, position: 'top' }} />
          <ReferenceLine x={high} stroke="#94a3b8" strokeDasharray="4 4" label={{ value: String(high), fill: '#94a3b8', fontSize: 11, position: 'top' }} />
          {methods.map((method, i) => (
            <Scatter
              key={method}
              name={method}
              data={points.filter(p => p.method === method)}
              fill={METHOD_COLOURS[i % METHOD_COLOURS.length]}
            />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </Card>
  );
}
```

- [ ] **Step 2: Typecheck and lint**

Run: `npx tsc -b`
Expected: no output, exit 0

Run: `npx eslint src/components/confluences/IFVGStopMethodScatter.tsx`
Expected: no output

If eslint objects to the `PointTooltip` prop types, widen them rather than reaching for `any` — recharts passes extra props this component ignores.

- [ ] **Step 3: Commit**

```bash
git add src/components/confluences/IFVGStopMethodScatter.tsx
git commit -m "Add iFVG size vs realized R scatter

One dot per trade-method pair, coloured by stop method, with the size
cutoffs drawn as dashed reference lines so band boundaries can be judged
against where the data actually sits."
```

---

### Task 5: Container and page wiring

**Files:**
- Create: `src/components/confluences/IFVGStopMethodSection.tsx`
- Modify: `src/pages/ConfluencesPage.tsx` (import, and render before the closing `</div>` of the returned fragment)

**Interfaces:**
- Consumes: everything produced by Tasks 2–4; `categoryExtractors.customField` from `src/utils/confluence-analyzer`; `useSettings` from `src/context/SettingsContext`
- Produces: default export `IFVGStopMethodSection`, props `{ trades: Trade[] }`

- [ ] **Step 1: Create the container**

Create `src/components/confluences/IFVGStopMethodSection.tsx`:

```tsx
import { useMemo, useState, useEffect } from 'react';
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
  const categories = settings.customCategories || [];

  const [categoryId, setCategoryId] = useState<string>('');
  const [loInput, setLoInput] = useState<string>('');
  const [hiInput, setHiInput] = useState<string>('');

  // Settings arrive asynchronously from Supabase, so categories start empty and
  // fill in later. Pick a category once a list exists, and only while nothing is
  // selected — so this never overwrites the trader's own choice.
  useEffect(() => {
    if (categoryId !== '' || categories.length === 0) return;
    const stored = loadStored(CATEGORY_KEY);
    setCategoryId(
      stored && categories.some(c => c.id === stored) ? stored : categories[0].id
    );
  }, [categories, categoryId]);

  // Cutoffs depend on nothing async, so restoring them once on mount is safe.
  useEffect(() => {
    const storedBands = loadStored(BANDS_KEY);
    if (!storedBands) return;
    const [storedLo, storedHi] = storedBands.split(',');
    if (storedLo) setLoInput(storedLo);
    if (storedHi) setHiInput(storedHi);
  }, []);

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
    setCategoryId(id);
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
```

- [ ] **Step 2: Render it on the Confluences page**

In `src/pages/ConfluencesPage.tsx`, add to the imports:

```tsx
import IFVGStopMethodSection from '../components/confluences/IFVGStopMethodSection';
```

Then in the returned JSX, insert the section immediately before the final `</div>` — after the whole `{categoryOptions.length > 0 && (...)}` block:

```tsx
      <IFVGStopMethodSection trades={scopedTrades} />
    </div>
  );
}
```

`scopedTrades` is the overlap-filtered list the rest of the page already uses, so the Overlap toggle governs the new section with no further wiring.

- [ ] **Step 3: Typecheck and lint**

Run: `npx tsc -b`
Expected: no output, exit 0

Run: `npx eslint src/components/confluences/IFVGStopMethodSection.tsx src/pages/ConfluencesPage.tsx`
Expected: no output

- [ ] **Step 4: Check it in the browser**

Check whether the dev server is up with `lsof -ti:5173`; start it with `npx vite dev` only if it is not. Open the Confluences page and work through:

- the section appears at the bottom, under the existing category analysis
- with no iFVG sizes logged, the empty state shows and its three counts look right against the journal
- log two or three trades with a gap size and a stop method, then confirm dots appear, coloured per method, and the dashed lines sit at the cutoff values
- type a new cutoff — lines move, grid recomputes
- enter the cutoffs backwards (e.g. 15 then 8) — identical result to the right way round
- set both cutoffs equal — amber note appears, middle column empties
- a cell with 4 trades renders faded with `*` and takes no ring
- reload the page — chosen category and cutoffs come back
- flip the Overlap toggle — numbers change
- switch the category dropdown — columns stay put, rows change

- [ ] **Step 5: Commit**

```bash
git add src/components/confluences/IFVGStopMethodSection.tsx src/pages/ConfluencesPage.tsx
git commit -m "Wire iFVG size vs stop method section into Confluences page

Container owns the category choice and the two cutoffs, both remembered in
localStorage. Consumes the page's overlap-scoped trades, so the existing
Overlap toggle applies unchanged."
```

---

## Done when

- `npx tsc -b` clean, `npx eslint src` shows only the pre-existing `TradeContext.tsx` react-refresh error
- Both scratchpad verification scripts print `ALL PASS`
- The browser checklist in Task 5 Step 4 passes end to end
- No existing page's numbers have moved
