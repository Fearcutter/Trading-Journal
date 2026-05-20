# Account Filter — Design

**Date:** 2026-05-20
**Status:** Approved, ready for implementation plan

## Goal

Filter trades by the Apex account(s) they were taken on, so the user can slice analytics by account. A trade is already taggable with one *or more* `accountIds` at entry (mirror trading across paired accounts); the filter respects that multi-account model and shows trades that match *any* of the selected accounts.

## Non-goals

- No change to how accounts are tagged at trade entry. `TradeForm` already provides chip selection of active accounts; that stays as-is.
- No new per-account analytics views beyond what the existing filterable pages already render. The filter just narrows the trade pool; charts render whatever pool they receive.
- No effect on the existing per-account balance / payout / drawdown tracking on `ApexAccountsPage`.
- No retroactive backfill of `accountIds` on existing trades. Trades without `accountIds` are treated as "untagged."

## Data model

Already present on `Trade` and `TradeFormData`:

```ts
accountIds?: string[];   // ids referencing ApexAccount.id
```

No schema change required.

## Filter type & default

`src/hooks/useFilteredTrades.ts`:

```ts
export interface TradeFilters {
  // ...existing fields...
  accountIds: string[];   // empty array = no account filter
}

export const defaultFilters: TradeFilters = {
  // ...existing fields...
  accountIds: [],
};
```

## Filter logic

Applied inside `useFilteredTrades`'s loop:

```ts
if (filters.accountIds.length > 0) {
  if (!trade.accountIds || trade.accountIds.length === 0) return false;
  if (!trade.accountIds.some(id => filters.accountIds.includes(id))) return false;
}
```

**Semantics**
- Empty `filters.accountIds` → no filtering by account (default).
- One or more accounts selected → show only trades whose `accountIds` includes at least one of them. Untagged trades (no `accountIds`, or empty array) are excluded.

## UI component: MultiSelect

No multi-select primitive exists in `src/components/ui/`. Build a small one at `src/components/ui/MultiSelect.tsx` using existing dependencies:

- `@radix-ui/react-popover` for the dropdown panel.
- Existing `Checkbox` (`src/components/ui/Checkbox.tsx`) for each option row.
- Trigger button visually matches the existing `Select` trigger (`src/components/ui/Select.tsx`) for consistency in the FilterBar row.

Props:

```ts
interface MultiSelectProps<T extends string> {
  label: string;
  value: T[];
  onChange: (next: T[]) => void;
  options: { value: T; label: string; sublabel?: string }[];
  placeholder?: string;  // shown when value is empty, e.g. "All"
}
```

Behavior:
- Trigger label: `placeholder` when empty, otherwise summarized (e.g., "2 selected" or the single label when count is 1).
- Each option row is a click target: clicking toggles its presence in `value`.
- A "Clear" link inside the panel resets to `[]`.
- Closes on outside click / Escape.

## FilterBar integration

`src/components/filters/FilterBar.tsx` gains a new control:

```
[Date] [Instrument] [Direction] [Result] [Overlap] [Setup] [R Multiple] [Account ▾] [Clear]
```

The Account dropdown is only rendered when at least one account exists in `useApexAccounts()`. If there are no accounts at all (new user, or backtest-only environment), the control is hidden — no orphan filter.

**Option list ordering**
- Active accounts first, blown next, completed last, alphabetical within each group.
- Each row shows: `<sizeLabel> <label>` plus a status sublabel for non-active (`blown`, `completed`).
- Example: `150K Cobra`, `100K Viper (blown)`.

**Clearing the FilterBar** — the existing "Clear" button must reset `accountIds: []` along with the other fields. `hasFilters` logic already checks each filter key against `defaultFilters`; this works automatically with array comparison if we update the check, or we can adjust it explicitly:

```ts
const hasFilters =
  filters.dateFrom !== '' || filters.dateTo !== '' ||
  filters.instrument !== '' || filters.direction !== '' ||
  filters.result !== '' || filters.setupType !== '' ||
  filters.rMultiple !== '' || filters.search !== '' ||
  filters.overlap !== '' || filters.accountIds.length > 0;
```

(The current `Object.entries`-based check incidentally compares the array reference against `defaultFilters.accountIds`, which would always read as "has filter" — explicit check is safer.)

## Per-page integration

The filter integrates differently depending on whether the page already uses `FilterBar`. Confirmed by inspection:

| Page | Uses FilterBar today? | Integration |
|---|---|---|
| `DashboardPage` | yes | Filter is part of FilterBar — flows through existing `filters` state. No structural change. |
| `LiveTradingSessionPage` | yes (per-session) | Same — sessionStorage already persists the filter object. |
| `AnalyticsPage` | **no** — consumes `trades` directly with only `OverlapScopeToggle` | Add a standalone account `MultiSelect` to the header row, alongside `OverlapScopeToggle`. Do not retrofit a full FilterBar. |
| `MFEMAEPage` | **no** — same pattern as AnalyticsPage | Same — standalone account `MultiSelect` in the header. |
| `BacktestSessionPage` | yes | Pass `hideAccountFilter={true}` to FilterBar so the Account control is suppressed (backtest trades don't carry accountIds). |

**Why standalone on Analytics/MFE-MAE instead of FilterBar:** the user explicitly asked for account filtering, not for the full set of filters on those pages. Adding a full FilterBar there would surface seven other controls that weren't requested and aren't currently visible. The standalone MultiSelect keeps the change scoped.

**State on Analytics / MFEMAEPage:**

```ts
const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
const accountScopedTrades = useMemo(() => {
  if (selectedAccountIds.length === 0) return overlapScopedTrades;
  return overlapScopedTrades.filter(t =>
    t.accountIds?.some(id => selectedAccountIds.includes(id))
  );
}, [overlapScopedTrades, selectedAccountIds]);
```

Apply this between overlap scoping and the stats hook, so the existing pipeline order is preserved: `trades → overlap scope → account scope → stats`.

**LiveTradingSessionPage composition:** session scoping happens before `useFilteredTrades` reads the trade pool; `useFilteredTrades` then applies all filters including `accountIds`. Filtering to "150K Cobra" inside session "April 2025 NQ" yields April trades on the 150K Cobra account.

**BacktestSessionPage:** `hideAccountFilter` prop on FilterBar suppresses the Account control. The `filters.accountIds` field stays in the type (so the FilterBar component is uniform) but is never populated on backtest pages. The filter loop tolerates an empty array (no-op), so this is safe even if a stale persisted value sneaks through.

## Files affected

| File | Change |
|---|---|
| `src/hooks/useFilteredTrades.ts` | Add `accountIds: string[]` to `TradeFilters`; default `[]`; apply filter in the loop. |
| `src/components/ui/MultiSelect.tsx` | New component (Radix Popover + Checkbox). |
| `src/components/filters/FilterBar.tsx` | Add `Account` MultiSelect; consume `useApexAccounts`; hide when no accounts exist or when `hideAccountFilter` prop is set; update `hasFilters` to explicitly include `accountIds.length > 0`. |
| `src/pages/DashboardPage.tsx` | No structural change — the filter flows through the existing `filters` state. Just verify Clear behavior. |
| `src/pages/AnalyticsPage.tsx` | Add a standalone account `MultiSelect` in the header alongside `OverlapScopeToggle`; apply account scoping in the trade pipeline. |
| `src/pages/MFEMAEPage.tsx` | Same — standalone `MultiSelect` in the header. |
| `src/pages/LiveTradingSessionPage.tsx` | No structural change; sessionStorage already persists the filter object. |
| `src/pages/BacktestSessionPage.tsx` | Pass `hideAccountFilter` to FilterBar. |
| `src/utils/csv-export.ts` | No change. Existing callers (`LiveTradingSessionPage`, `BacktestSessionPage`) already pass the `filtered` array, so the account filter flows through automatically. |

## Acceptance criteria

1. `TradeFilters` carries `accountIds: string[]`, default `[]`, with array equality respected by Clear.
2. `FilterBar` shows a new `Account` MultiSelect when at least one account exists and `hideAccountFilter` is not set.
3. Selecting one or more accounts narrows the trade pool to trades whose `accountIds` includes at least one selected account; untagged trades are hidden.
4. All accounts (active, blown, completed) appear in the dropdown, grouped by status.
5. The filter works on: `DashboardPage`, `AnalyticsPage`, `MFEMAEPage`, `LiveTradingSessionPage`.
6. The filter does not appear on `BacktestSessionPage`.
7. `LiveTradingSessionPage` continues to scope to its session; the account filter composes with the session scope.
8. Clearing the FilterBar resets `accountIds` to `[]`.
9. With no accounts selected, behavior is identical to today.
10. No schema or migration change; existing trades render unchanged.

## Open questions

None — all resolved during brainstorming.
