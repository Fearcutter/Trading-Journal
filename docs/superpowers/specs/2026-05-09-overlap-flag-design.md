# Overlap Flag — Design

**Date:** 2026-05-09
**Status:** Approved, ready for implementation plan

## Goal

Let the user mark a trade as "overlapping" — i.e. opened while another trade was still open — so analytics don't double-count the same market move. Common during backtesting where multiple setup opportunities appear concurrently. The user wants to record every spotted setup but keep aggregate stats (P&L, win rate, expectancy, etc.) honest.

## Non-goals

- No automatic detection of overlap from timestamps. The user marks it manually.
- No retroactive scan / migration of existing trades. New flag, default-undefined.
- No effect on the chart components themselves; charts continue to render whatever scoped trade pool they receive.

## Data model

Single optional boolean on `Trade` and `TradeFormData`.

```ts
// src/types/trade.ts
export interface Trade {
  // ...existing fields...
  overlap?: boolean;
}

export interface TradeFormData {
  // ...existing fields...
  overlap?: boolean;
}
```

**Semantics**
- `overlap === true` → trade is flagged as concurrent with another open trade.
- `overlap === false` or `undefined` → not flagged. Both treated identically by analytics.

**Why a 2-state boolean (not 3-state like `returnedToBE`)**
"Unmarked" is a meaningful synonym for "not overlapping." There's no distinct "I haven't checked" state worth modeling — most trades aren't overlapping, and the user only flips the flag when they actively notice the overlap.

**Wire-through (matches the addTrade pattern fix from `f29b0a3`)**
Both `addTrade` (in `TradeContext`) and `handleUpdate` (in `TradeDetailPage`) enumerate fields by hand. Both must include `overlap` to avoid a repeat of the drawback/returnedToBE bug.

## Form UI

Existing 3-column row in `TradeForm.tsx` (Drawback 1R / Drawback 2R / Returned to BE) becomes 4-column with the Overlap button group appended.

```
┌──────────────┬──────────────┬───────────────────┬──────────────┐
│ Drawback 1R  │ Drawback 2R  │ Returned to BE?   │ Overlap?     │
│ [____]       │ [____]       │ [N/A][Yes][No]    │ [Yes][No]    │
└──────────────┴──────────────┴───────────────────┴──────────────┘
```

**Visual**
- Same inline-flex pill group as Returned-to-BE (rounded border, button row).
- **Yes**: amber-600 active state. Distinct from emerald (Returned-to-BE Yes) and rose (Returned-to-BE No). Reads as "informational caution."
- **No**: neutral slate active state.
- Default on a fresh form: neither button highlighted (`overlap: undefined`).
- Clicking the active button toggles back to undefined.

**Form scope**
Shown in both live and backtest forms — the form is shared. No conditional gating.

## Per-page toggle & filter logic

Local `useState<'exclude' | 'include'>` per page, mirroring the existing Live/All scope pattern. Default is `'exclude'`.

**Toggle placement** (one toggle per analytics page, sitting next to existing Live/All where applicable):

| Page | Has toggle? | Position |
|---|---|---|
| `DashboardPage` | yes | next to Live/All |
| `AnalyticsPage` | yes | header |
| `MFEMAEPage` | yes | header |
| `CalendarPage` | yes | header (above month nav) |
| `LiveTradingSessionPage` (analytics tab) | yes | analytics tab header |
| `BacktestSessionPage` (analytics tab) | yes | analytics tab header |
| `ConfluencesPage` | yes | header |
| `TradeDetailPage` | no | single trade, no aggregation |
| `LiveTradingPage`, `BacktestingPage` | no | session lists, not stats |
| `PlaybookPage`, `HabitsPage`, `ApexAccountsPage`, `RiskCalculatorPage`, `SettingsPage` | no | unrelated |

**Wording:** `Exclude overlaps` / `Include overlaps`.

**Filter logic** — applied after Live/All scoping and before `useFilteredTrades`, so it composes:

```ts
const overlapScoped = excludeOverlaps
  ? scopedTrades.filter(t => !t.overlap)
  : scopedTrades;
```

Trades with `overlap === undefined` or `overlap === false` pass through. Only `overlap === true` is dropped when Exclude is on.

## Display surfaces

**Trade list rows** (`LiveTradingSessionPage`, `BacktestSessionPage` trade tables) — small amber pill labelled "Overlap" next to the instrument symbol when `t.overlap === true`. Hidden otherwise.

**Trade detail** (`TradeDetail` component) — show "Overlap: Yes" in the metadata strip when true; row is hidden when undefined/false (matches how Returned-to-BE is shown).

**FilterBar** (`src/components/filters/FilterBar.tsx`) — new dropdown filter "Overlap": `All` / `Yes` / `No`. Independent of the per-page Exclude toggle. The toggle controls the default analytics pool; the FilterBar lets the user actively find overlapping trades when reviewing the trade list.

**CSV export** (`src/utils/` exporters used in commit `bcc2cb1`) — add an `overlap` column. Boolean → `"Yes"` / `""` so Excel renders it cleanly.

**Calendar** — no per-day indicator. The day cells aggregate, and a per-trade visual mark on day cells would clutter without payoff. The Exclude-overlaps toggle on Calendar handles the data-integrity goal.

**Charts** — no special treatment. Charts consume whatever scoped trade pool they receive.

## Files affected

| File | Change |
|---|---|
| `src/types/trade.ts` | Add `overlap?: boolean` to `Trade` and `TradeFormData`. |
| `src/components/trade/TradeForm.tsx` | Add `overlap: undefined` to default form data; add 4th column with Yes/No button group. |
| `src/context/TradeContext.tsx` | Wire `overlap: data.overlap` into `addTrade`'s constructed `Trade`. |
| `src/pages/TradeDetailPage.tsx` | Wire `overlap: data.overlap` into `handleUpdate`'s update payload; pass `overlap: trade.overlap` into `TradeForm`'s `initialData`. |
| `src/components/trade/TradeDetail.tsx` | Display "Overlap: Yes" row when `trade.overlap === true`. |
| `src/components/filters/FilterBar.tsx` | New filter: All / Yes / No. |
| `src/hooks/useFilteredTrades.ts` | Add `overlap: '' \| 'yes' \| 'no'` to `TradeFilters`; apply filter in the loop. |
| `src/pages/DashboardPage.tsx` | Add Exclude/Include toggle. Apply filter between Live/All scoping and `useFilteredTrades`. |
| `src/pages/AnalyticsPage.tsx` | Same toggle + filter integration. |
| `src/pages/MFEMAEPage.tsx` | Same. |
| `src/pages/CalendarPage.tsx` | Same — toggle in header row. |
| `src/pages/LiveTradingSessionPage.tsx` | Same on analytics tab. |
| `src/pages/BacktestSessionPage.tsx` | Same on analytics tab. |
| `src/pages/ConfluencesPage.tsx` | Same. |
| Trade list components (within session pages) | Render the amber "Overlap" badge on rows where `t.overlap === true`. |
| CSV export utility | Add `overlap` column. |

If a shared toggle component makes sense, factor a small `OverlapScopeToggle` into `src/components/filters/` rather than copy-pasting the JSX 7 times.

## Open questions

None — all resolved during brainstorming.

## Acceptance criteria

1. New trades can be marked Overlap: Yes/No (or left unset) in the form, persisting through create and update.
2. The 4 missing-field bug class doesn't recur — `addTrade` and `handleUpdate` both wire `overlap` through.
3. On all 7 analytics pages, an Exclude/Include toggle is visible and functional. Default is Exclude.
4. With Exclude on, trades flagged Overlap: Yes are dropped from every stat (Net P&L, win rate, R-multiple chart, MFE/MAE, etc.).
5. Trade list rows show an amber "Overlap" badge when flagged.
6. Trade detail page shows the field when flagged.
7. FilterBar can filter to All / Yes / No.
8. CSV export includes the column.
9. Existing trades (overlap=undefined) behave identically to before in every code path.
