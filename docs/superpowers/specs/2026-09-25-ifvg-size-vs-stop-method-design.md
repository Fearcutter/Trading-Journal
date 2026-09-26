# iFVG Size vs Stop Method — Design

**Date:** 2026-09-25
**Status:** Approved for planning

## Problem

The trader selects a stop-loss method based on the size of the iFVG being
entered off. The stop methods are logged as a custom category; iFVG size is
logged as `Trade.ifvgSize` (points, added 2026-09-25). Nothing in the journal
cross-references two attributes against each other — every existing analysis
answers "how does this one tag perform." The trader needs a two-way comparison
to find which stop method performs best at which gap size, and to test whether
the size thresholds they currently use by feel are the right ones.

## Yardstick: realized R

Existing `Trade.riskReward` is **planned** R:R — `calculateRiskReward(entry,
stopLoss, takeProfit)`, fixed at entry, identical for a winner and a loser with
the same levels. It is unusable for comparing stop methods: a wider stop
mechanically produces a smaller planned R:R even when it is the more profitable
method, so ranking by it always favours the tightest stop.

This design introduces **realized R**:

```
realizedR = pointsPL / |entry - stopLoss|
```

`pointsPL` is signed, so a win yields positive R and a loss negative. Trades
whose stop distance is 0 are excluded (not counted as zero). Computed from
fields every trade already has, so it works retroactively over the full history
with no re-logging.

New module `src/utils/r-multiple.ts`:

- `getStopDistance(trade: Trade): number` — `Math.abs(entry - stopLoss)`
- `getRealizedR(trade: Trade): number | null` — `null` when stop distance is 0

`mfe-mae-analyzer.ts` has a private `getStopDistance` with identical behaviour.
It is refactored to import the shared one. No behavioural change.

**No existing page's numbers change.** Realized R is additive; nothing currently
displayed is recalculated or replaced.

## Placement

A new section at the bottom of `ConfluencesPage`, after the existing tables and
category analysis. It consumes the page's existing `scopedTrades`, so the
page-level **Overlap scope toggle** applies to it unchanged.

## Choosing the stop-method source

A dropdown lists the trader's custom categories (from
`settings.customCategories`). Values are read with the existing
`categoryExtractors.customField(categoryId)`, which returns
`trade.customFields?.[categoryId] ?? []`.

- Default selection: the first custom category.
- Selection persisted to `localStorage` under `ifvg-sl-category`.
- If the stored id no longer matches a category, fall back to the first one.
- If the trader has no custom categories, the section shows a message pointing
  at Settings and renders nothing else.

## Size bands

**Two cutoffs, three bands** — `< c1`, `c1 – c2`, `≥ c2`.

Band membership, given sorted cutoffs `lo ≤ hi`:

| Band | Range |
|---|---|
| 1 | `ifvgSize < lo` |
| 2 | `lo ≤ ifvgSize < hi` |
| 3 | `ifvgSize ≥ hi` |

**Defaults.** On first load, cutoffs are the 33rd and 67th percentiles of
`ifvgSize`, rounded to 1 decimal place — so the starting split comes from the
trader's own data. The population for this calculation is every scoped trade
with `ifvgSize != null`, regardless of stop method or stop distance: the bands
describe the size axis alone, and making them depend on the selected category
would shift the columns every time the dropdown changed. When fewer than 3 such
trades exist, fall back to fixed defaults of `8` and `15`.

**Editing.** Two number inputs. Changes recompute both charts live. Values
persist to `localStorage` under `ifvg-sl-bands`.

**Degenerate input.** The two values are sorted internally, so entering them in
either order works. If they are equal, band 2 is empty; an inline note says so
rather than blocking input. A blank box falls back to its auto-suggested value
for calculation, with that value shown as placeholder text. There is no
invalid state and no stored "last valid" bands.

## Eligible trades

A trade is included when **all** hold:

1. `ifvgSize != null`
2. the chosen category yields at least one value
3. `getStopDistance(trade) > 0`
4. it survives the page's overlap scope filter

A trade tagged with **multiple** stop methods counts once under **each** method —
consistent with how `analyzeConfluences` already treats multi-value fields.
Cell counts therefore may exceed the number of distinct trades; this is
intentional and matches existing behaviour elsewhere in the app.

## The scatter (top)

`recharts` `ScatterChart`, following the `MFEMAEScatterPlot` pattern.

- X: `ifvgSize` (pts). Y: realized R.
- One `<Scatter>` series per stop method, each a distinct colour from a fixed
  palette, cycling if methods outnumber colours.
- `ReferenceLine` at `y = 0`, solid.
- `ReferenceLine` at `x = lo` and `x = hi`, dashed, labelled with the value.
- Tooltip: date, instrument, gap size, stop method, realized R.
- Legend naming each method. Height 320.

Purpose: show whether the methods genuinely separate at a given size, or
whether the dots are scattered noise. It is what makes moving the cutoffs an
evidence-based act rather than a guess.

## The grid (below)

Rows: every stop-method value present in eligible trades, sorted by total trade
count descending. Columns: band 1, band 2, band 3, **All sizes**.

Each cell shows average realized R to 2 decimal places with an explicit sign,
and the trade count beneath it. Empty cells show `—`.

**Colour.** Emerald when avg R > 0, rose when < 0, neutral slate at exactly 0.
Intensity in three tiers by `|avgR|`: under 0.5 light, 0.5 to 1.5 medium, above
1.5 strong.

**Thin samples.** A cell with **fewer than 5 trades** is rendered muted (reduced
opacity) and carries a marker, with a legend line explaining it. The number is
still shown — it is flagged, not hidden — so an eye-catching average built on
three trades is not mistaken for an edge. This matters most early on, when
`ifvgSize` coverage is sparse.

**Best in band.** Within each band column, the cell with the highest average R
gets a highlight ring — but only among cells with **at least 5 trades**. If no
cell in a band clears that bar, no ring is drawn for that band.

## Empty state

When no trades are eligible, the section replaces the charts with a plain
message plus diagnostic counts. These are counted over the same scoped trades
the section analyses — so they respect the Overlap toggle and never describe
trades the section would have ignored anyway. They let the trader see what
backfilling would buy:

- trades with a stop method but no iFVG size
- trades with an iFVG size but no stop method
- trades with both but no usable stop distance

## Files

**New**

| File | Responsibility |
|---|---|
| `src/utils/r-multiple.ts` | `getStopDistance`, `getRealizedR` |
| `src/utils/ifvg-sl-analyzer.ts` | percentile defaults, band assignment, matrix build |
| `src/components/confluences/IFVGStopMethodSection.tsx` | container: category dropdown, cutoff inputs, empty state |
| `src/components/confluences/IFVGStopMethodScatter.tsx` | the scatter |
| `src/components/confluences/IFVGStopMethodGrid.tsx` | the grid |

**Modified**

| File | Change |
|---|---|
| `src/pages/ConfluencesPage.tsx` | render the new section, pass `scopedTrades` |
| `src/utils/mfe-mae-analyzer.ts` | import shared `getStopDistance` |

The analyzer holds all arithmetic as pure functions taking trades and returning
plain data; the components only render. This keeps the maths testable
independently of React and keeps each file focused.

## Analyzer interface

```ts
export interface SizeBand {
  label: string;
  min: number | null;  // null = unbounded below (first band)
  max: number | null;  // null = unbounded above (last band)
}

export interface MatrixCell {
  avgR: number | null;
  count: number;
  thin: boolean;        // count < 5
}

export interface MatrixRow {
  method: string;
  cells: MatrixCell[];  // one per band
  all: MatrixCell;      // "All sizes"
  totalCount: number;
}

export function suggestCutoffs(trades: Trade[]): [number, number];
export function buildBands(lo: number, hi: number): SizeBand[];
export function buildMatrix(
  trades: Trade[],
  extractor: (t: Trade) => string[],
  bands: SizeBand[],
): MatrixRow[];
export function countIneligible(
  trades: Trade[],
  extractor: (t: Trade) => string[],
): { missingSize: number; missingMethod: number; noStopDistance: number };
```

## Verification

The repo has **no test framework** (no runner in `package.json`). Verification is:

1. `npx tsc -b` — clean
2. `npx eslint` on all touched files — no new errors (one pre-existing
   `react-refresh` error in `TradeContext.tsx` is out of scope)
3. Manual checks in the browser:
   - section shows the empty state with correct diagnostic counts on a journal
     with no `ifvgSize` data
   - after logging trades with gap sizes and stop methods, dots appear in the
     scatter coloured per method, and cutoff lines sit at the entered values
   - editing a cutoff moves the lines and recomputes the grid
   - entering cutoffs in reverse order behaves identically to correct order
   - equal cutoffs empty band 2 and show the inline note
   - a cell with 4 trades renders muted and takes no highlight ring
   - reloading the page restores the chosen category and cutoffs
   - toggling Overlap scope changes the numbers

## Out of scope

- **Backfilling** old trades with gap sizes — the cost is re-measuring charts,
  not data entry
- **More than three bands** — the analyzer takes a band array, so extending is
  cheap when wanted
- **Click-through** from a scatter dot to the trade
- **Filtering the rest of the journal** by iFVG size
- Changing any existing page's numbers or adding a test framework
