# Overlap Flag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a per-trade `overlap` boolean flag plus a per-page Exclude/Include toggle on analytics surfaces so concurrent backtest setups don't inflate aggregate stats.

**Architecture:** `Trade.overlap?: boolean` is stored in the existing `trades.data` JSONB column (no migration). A reusable `OverlapScopeToggle` component is dropped onto seven analytics pages; each page's trade pool gets filtered by `t.overlap !== true` when the toggle is in `Exclude` mode (default). The trade form gets a Yes/No amber pill group; the trade row and detail surfaces show a small badge when flagged. FilterBar gets a corresponding dropdown and CSV export gets a column.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind v4, Radix UI, Vite 7, Supabase JS client. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-05-09-overlap-flag-design.md`

---

## File structure

| File | Status | Responsibility |
|---|---|---|
| `src/types/trade.ts` | modify | Add `overlap?: boolean` to `Trade` and `TradeFormData` |
| `src/context/TradeContext.tsx` | modify | Wire `overlap` through `addTrade` |
| `src/pages/TradeDetailPage.tsx` | modify | Pass `overlap` into form `initialData` and through `handleUpdate` |
| `src/components/trade/TradeForm.tsx` | modify | Default `overlap: undefined`; add Yes/No button group |
| `src/components/trade/TradeDetail.tsx` | modify | Show Overlap row in the Runner Drawback card |
| `src/components/trade/TradeRow.tsx` | modify | Inline amber `Overlap` pill next to instrument |
| `src/components/filters/OverlapScopeToggle.tsx` | **create** | Reusable Exclude/Include button group |
| `src/hooks/useFilteredTrades.ts` | modify | Add `overlap: '' \| 'yes' \| 'no'` filter |
| `src/components/filters/FilterBar.tsx` | modify | New `Overlap` dropdown |
| `src/pages/DashboardPage.tsx` | modify | Toggle + filter |
| `src/pages/AnalyticsPage.tsx` | modify | Toggle + filter |
| `src/pages/MFEMAEPage.tsx` | modify | Toggle + filter |
| `src/pages/CalendarPage.tsx` | modify | Toggle + filter |
| `src/pages/LiveTradingSessionPage.tsx` | modify | Toggle + filter on analytics tab |
| `src/pages/BacktestSessionPage.tsx` | modify | Toggle + filter on analytics tab |
| `src/pages/ConfluencesPage.tsx` | modify | Toggle + filter |
| `src/utils/csv-export.ts` | modify | New `Overlap` column |

## Verification approach

The project has no JS/TS unit-test runner configured (no `test` script in `package.json`, no test files). Each task verifies via:

1. **Typecheck:** `cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json` — must exit 0.
2. **Lint** (where touched files are non-trivial): `cd /Users/fearcutter/projects/trading-journal && npx eslint <file>` — exit 0; pre-existing warnings (e.g. `react-refresh/only-export-components` on context files) are acceptable.
3. **Manual smoke** — at the end (Task 17). The dev server should already be running on `localhost:5173` (PID 13731 if it was running before this session). If not: `cd /Users/fearcutter/projects/trading-journal && npm run dev` in the background.

## Conventions

- Each task ends with a single `git commit` on `main` matching the project's small-commit style.
- Commit subject: imperative, sentence-case, no period (e.g. `Add overlap flag to Trade types`).
- Co-authored trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- Do NOT push between tasks. The final task pushes the whole feature.

---

## Task 1: Add `overlap` to Trade types

**Files:**
- Modify: `src/types/trade.ts`

- [ ] **Step 1: Add `overlap` to `Trade` interface**

In `src/types/trade.ts`, find the line `afterBeOutcome?: 'hit_sl' | 'reversed_to_tp';` inside `interface Trade` and insert after it:

```ts
  overlap?: boolean;
```

- [ ] **Step 2: Add `overlap` to `TradeFormData` interface**

In the same file, find the line `afterBeOutcome?: 'hit_sl' | 'reversed_to_tp';` inside `interface TradeFormData` and insert after it:

```ts
  overlap?: boolean;
```

- [ ] **Step 3: Typecheck**

Run:
```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exits with code 0. (No new errors. The new field is optional, so existing call sites compile unchanged.)

- [ ] **Step 4: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/types/trade.ts && git commit -m "$(cat <<'EOF'
Add overlap flag to Trade types

Optional boolean to mark concurrent setups during backtesting.
Undefined/false = not overlapping; only true is treated as flagged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Wire `overlap` through `addTrade`

**Files:**
- Modify: `src/context/TradeContext.tsx`

This avoids the same bug class we fixed in commit `f29b0a3` (`addTrade` enumerates fields explicitly; missing fields get silently dropped on create).

- [ ] **Step 1: Add `overlap` field to constructed Trade**

In `src/context/TradeContext.tsx`, find the line `afterBeOutcome: data.afterBeOutcome,` inside `addTrade`'s `const trade: Trade = { ... }` block and insert after it:

```ts
      overlap: data.overlap,
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/context/TradeContext.tsx && git commit -m "$(cat <<'EOF'
Wire overlap through addTrade

Mirror the drawback/returnedToBE fix — addTrade enumerates fields by
hand, so the new flag must be added explicitly to avoid silent drop.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wire `overlap` through `TradeDetailPage`

**Files:**
- Modify: `src/pages/TradeDetailPage.tsx`

- [ ] **Step 1: Add `overlap` to `handleUpdate` payload**

In `src/pages/TradeDetailPage.tsx`, find inside `handleUpdate` the line:
```ts
      returnedToBE: data.returnedToBE,
```
Insert after it:
```ts
      overlap: data.overlap,
```

- [ ] **Step 2: Add `overlap` to `initialData` for the form**

In the same file, find inside the `<TradeForm initialData={{ ... }} />` block the line:
```ts
            returnedToBE: trade.returnedToBE,
```
Insert after it:
```ts
            overlap: trade.overlap,
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/pages/TradeDetailPage.tsx && git commit -m "$(cat <<'EOF'
Wire overlap through TradeDetail update path

Both initialData and handleUpdate enumerate fields explicitly.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Add Overlap button group to `TradeForm`

**Files:**
- Modify: `src/components/trade/TradeForm.tsx`

The button group lives in the existing drawback row (currently 3 columns). Switch the row to 4 columns and append the Overlap pill. The form already spreads `...form` into the submit payload, so no `handleSubmit` change is needed for the new field.

- [ ] **Step 1: Add `overlap` to default form data**

In `src/components/trade/TradeForm.tsx`, find inside `getDefaultFormData` the line:
```ts
    afterBeOutcome: undefined,
```
Insert after it:
```ts
    overlap: undefined,
```

- [ ] **Step 2: Switch the drawback row to 4 columns and append the Overlap button group**

In the same file, find the wrapper div that begins:
```tsx
      {/* Runner Drawback Tracking (Optional) */}
      <div className="grid grid-cols-3 gap-4">
```
Change `grid-cols-3` to `grid-cols-4`. Then, after the existing "Returned to BE?" `<div className="space-y-1">` block (the one containing the N/A / Yes / No button group, ending around the closing `</div>` for that section), insert this new block as a sibling — before the closing `</div>` of the row:

```tsx
        <div className="space-y-1">
          <label className="block text-sm font-medium text-slate-300">Overlap?</label>
          <div className="inline-flex rounded-lg border border-slate-600 overflow-hidden mt-1">
            <button
              type="button"
              onClick={() => update('overlap', form.overlap === true ? undefined : true)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                form.overlap === true
                  ? 'bg-amber-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => update('overlap', form.overlap === false ? undefined : false)}
              className={`px-3 py-2 text-sm font-medium transition-colors ${
                form.overlap === false
                  ? 'bg-slate-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              No
            </button>
          </div>
        </div>
```

The toggle-back-to-undefined behavior (clicking the active button clears it) matches what the design specified.

- [ ] **Step 3: Typecheck**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exit 0.

- [ ] **Step 4: Manual smoke**

Open `http://localhost:5173`, hard-refresh, navigate to a trade form (Live Trading session → Add Trade, or paste flow). Verify the new "Overlap?" pill group appears in the same row as Drawback 1R / Drawback 2R / Returned to BE. Click Yes → it goes amber. Click Yes again → it clears. Click No → grey. Click No again → it clears.

- [ ] **Step 5: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/components/trade/TradeForm.tsx && git commit -m "$(cat <<'EOF'
Add Overlap Yes/No button group to TradeForm

Amber pill in the drawback row. Click active button to clear.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Show Overlap in `TradeDetail`

**Files:**
- Modify: `src/components/trade/TradeDetail.tsx`

The existing Runner Drawback card has a 3-column grid. Add Overlap as a 4th column and extend the conditional that decides whether to render the card at all.

- [ ] **Step 1: Extend the card conditional**

In `src/components/trade/TradeDetail.tsx`, find the line:
```tsx
      {(trade.drawback1R != null || trade.drawback2R != null || trade.returnedToBE != null) && (
```
Change to:
```tsx
      {(trade.drawback1R != null || trade.drawback2R != null || trade.returnedToBE != null || trade.overlap != null) && (
```

- [ ] **Step 2: Switch grid to 4 columns and add the Overlap field**

In the same Runner Drawback card, find:
```tsx
          <div className="grid grid-cols-3 gap-4">
```
Change `grid-cols-3` to `grid-cols-4`. Then, after the existing "Returned to BE?" `<div>` block (the one with `trade.returnedToBE === true ? 'Yes' : ...`), add a 4th sibling `<div>`:

```tsx
            <div>
              <p className="text-xs text-slate-500">Overlap?</p>
              <p className={`text-sm font-medium ${trade.overlap === true ? 'text-amber-400' : trade.overlap === false ? 'text-slate-300' : 'text-slate-500'}`}>
                {trade.overlap === true ? 'Yes' : trade.overlap === false ? 'No' : '—'}
              </p>
            </div>
```

- [ ] **Step 3: Typecheck**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/components/trade/TradeDetail.tsx && git commit -m "$(cat <<'EOF'
Show Overlap field on TradeDetail

Added as 4th column in the Runner Drawback card.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Add Overlap badge to `TradeRow`

**Files:**
- Modify: `src/components/trade/TradeRow.tsx`

A small amber pill inline with the instrument name. Hidden when not overlapping (no extra row height for the common case).

- [ ] **Step 1: Add inline badge next to instrument**

In `src/components/trade/TradeRow.tsx`, find the cell:
```tsx
      <td className="px-3 py-3">
        <span className="font-mono text-sm font-medium text-slate-200">{trade.instrument}</span>
      </td>
```
Replace with:
```tsx
      <td className="px-3 py-3">
        <span className="font-mono text-sm font-medium text-slate-200">{trade.instrument}</span>
        {trade.overlap === true && (
          <span className="ml-2 inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-400/15 text-amber-300 border border-amber-700/40">
            Overlap
          </span>
        )}
      </td>
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/components/trade/TradeRow.tsx && git commit -m "$(cat <<'EOF'
Show Overlap badge on TradeRow

Inline amber pill next to instrument when flagged.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: Create reusable `OverlapScopeToggle` component

**Files:**
- Create: `src/components/filters/OverlapScopeToggle.tsx`

Mirror the visual style of the Live/All toggle in `DashboardPage.tsx` (rounded pills, blue when active).

- [ ] **Step 1: Create the file**

Write `src/components/filters/OverlapScopeToggle.tsx` with this exact contents:

```tsx
export type OverlapScope = 'exclude' | 'include';

interface OverlapScopeToggleProps {
  value: OverlapScope;
  onChange: (next: OverlapScope) => void;
}

export default function OverlapScopeToggle({ value, onChange }: OverlapScopeToggleProps) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => onChange('exclude')}
        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
          value === 'exclude' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'
        }`}
      >
        Exclude overlaps
      </button>
      <button
        onClick={() => onChange('include')}
        className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
          value === 'include' ? 'bg-blue-600 text-white' : 'bg-slate-700 text-slate-400 hover:text-slate-200'
        }`}
      >
        Include overlaps
      </button>
    </div>
  );
}
```

- [ ] **Step 2: Typecheck**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exit 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/components/filters/OverlapScopeToggle.tsx && git commit -m "$(cat <<'EOF'
Add reusable OverlapScopeToggle component

Two-pill Exclude/Include button group. Same visual style as the
Live/All toggle on Dashboard.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 8: Apply toggle + filter to `DashboardPage`

**Files:**
- Modify: `src/pages/DashboardPage.tsx`

This page already has a Live/All toggle. The Overlap toggle sits next to it.

- [ ] **Step 1: Import the toggle**

Find the existing imports block. Add (alphabetical-friendly placement near other component imports):
```ts
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';
```

- [ ] **Step 2: Add scope state**

Find the line `const [tradeScope, setTradeScope] = useState<'live' | 'all'>('live');` and insert after it:
```ts
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
```

- [ ] **Step 3: Apply the filter**

Find the line:
```ts
  const scopedTrades = tradeScope === 'live'
    ? trades.filter(t => !t.sessionId || liveSessionIds.has(t.sessionId))
    : trades;
  const filtered = useFilteredTrades(scopedTrades, filters);
```
Change to:
```ts
  const scopedTrades = tradeScope === 'live'
    ? trades.filter(t => !t.sessionId || liveSessionIds.has(t.sessionId))
    : trades;
  const overlapScopedTrades = overlapScope === 'exclude'
    ? scopedTrades.filter(t => !t.overlap)
    : scopedTrades;
  const filtered = useFilteredTrades(overlapScopedTrades, filters);
```

- [ ] **Step 4: Render the toggle**

Find the JSX block containing the Live and All buttons (`<button onClick={() => setTradeScope('live')} ...>Live</button>` and the All button). After the closing `</button>` of the All button, before the closing `</div>` of that flex container, insert:
```tsx
          <div className="ml-2 pl-2 border-l border-slate-700">
            <OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
          </div>
```

- [ ] **Step 5: Typecheck**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exit 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/pages/DashboardPage.tsx && git commit -m "$(cat <<'EOF'
Apply Overlap scope toggle to Dashboard

Default Exclude. Filter applied between Live/All scoping and
useFilteredTrades.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 9: Apply toggle + filter to `AnalyticsPage`

**Files:**
- Modify: `src/pages/AnalyticsPage.tsx`

This page does not have a Live/All toggle. The Overlap toggle is the only scope toggle here.

- [ ] **Step 1: Read the current page header**

```bash
cd /Users/fearcutter/projects/trading-journal && head -60 src/pages/AnalyticsPage.tsx
```
Identify (a) where `useTrades()` is destructured, (b) the variable holding the trade pool that feeds `useFilteredTrades` (or the equivalent), and (c) the JSX area where a page header / FilterBar is rendered.

- [ ] **Step 2: Import the toggle**

Add to imports:
```ts
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';
```

- [ ] **Step 3: Add scope state**

Inside the component, after other `useState` calls, add:
```ts
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
```

- [ ] **Step 4: Apply the filter**

Locate the line that creates the trade pool fed to `useFilteredTrades` or to stat hooks. Wrap that pool in the filter. For a pool variable named `someTrades`:
```ts
  const overlapScopedTrades = overlapScope === 'exclude'
    ? someTrades.filter(t => !t.overlap)
    : someTrades;
```
Then use `overlapScopedTrades` everywhere `someTrades` was used downstream (filter, hooks, charts).

- [ ] **Step 5: Render the toggle**

In the page header area (above charts, near the FilterBar if present), add:
```tsx
        <OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
```

- [ ] **Step 6: Typecheck**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exit 0.

- [ ] **Step 7: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/pages/AnalyticsPage.tsx && git commit -m "$(cat <<'EOF'
Apply Overlap scope toggle to Analytics page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 10: Apply toggle + filter to `MFEMAEPage`

**Files:**
- Modify: `src/pages/MFEMAEPage.tsx`

Same pattern as Task 9.

- [ ] **Step 1: Read the page**

```bash
cd /Users/fearcutter/projects/trading-journal && head -60 src/pages/MFEMAEPage.tsx
```

- [ ] **Step 2: Import**
```ts
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';
```

- [ ] **Step 3: Add state**
```ts
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
```

- [ ] **Step 4: Apply filter**

Wrap the trade pool fed to MFE/MAE stats:
```ts
  const overlapScopedTrades = overlapScope === 'exclude'
    ? <existingPool>.filter(t => !t.overlap)
    : <existingPool>;
```
Use `overlapScopedTrades` downstream.

- [ ] **Step 5: Render toggle in page header**
```tsx
<OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
```

- [ ] **Step 6: Typecheck**
```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```

- [ ] **Step 7: Commit**
```bash
cd /Users/fearcutter/projects/trading-journal && git add src/pages/MFEMAEPage.tsx && git commit -m "$(cat <<'EOF'
Apply Overlap scope toggle to MFE/MAE page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 11: Apply toggle + filter to `CalendarPage`

**Files:**
- Modify: `src/pages/CalendarPage.tsx`

CalendarPage already filters to `liveTrades` (live-session trades only). Add the overlap filter on top of that.

- [ ] **Step 1: Import**

Add to existing imports:
```ts
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';
```

- [ ] **Step 2: Add state**

After existing `useState` lines (e.g. `currentMonth`, `selectedDate`), add:
```ts
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
```

- [ ] **Step 3: Apply filter**

Find the existing `liveTrades` `useMemo` block:
```ts
  const liveTrades = useMemo(() => {
    const liveIds = new Set(liveSessions.map(s => s.id));
    return allTrades.filter(t => t.sessionId && liveIds.has(t.sessionId));
  }, [allTrades, liveSessions]);
```
Add a follow-up `useMemo`:
```ts
  const scopedLiveTrades = useMemo(() => {
    return overlapScope === 'exclude' ? liveTrades.filter(t => !t.overlap) : liveTrades;
  }, [liveTrades, overlapScope]);
```
Then replace every downstream use of `liveTrades` (in `monthTrades`, `selectedTrades`, the empty-state check, and the `<CalendarGrid trades={liveTrades} />` prop) with `scopedLiveTrades`.

- [ ] **Step 4: Render toggle in the month-nav header row**

Find the header row containing the chevron buttons and the month label. Wrap the existing flex container (`<div className="flex items-center justify-between">`) in a vertical stack and insert the toggle above it, OR insert the toggle to the right of the `</button>` that holds the right chevron, before the closing `</div>`. Simplest: above the month nav, add a row:
```tsx
      <div className="flex items-center justify-end">
        <OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
      </div>
```

- [ ] **Step 5: Typecheck**
```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```

- [ ] **Step 6: Commit**
```bash
cd /Users/fearcutter/projects/trading-journal && git add src/pages/CalendarPage.tsx && git commit -m "$(cat <<'EOF'
Apply Overlap scope toggle to Calendar

Filters on top of the existing live-session scoping.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 12: Apply toggle + filter to `LiveTradingSessionPage` analytics tab

**Files:**
- Modify: `src/pages/LiveTradingSessionPage.tsx`

This page has an analytics tab inside the session detail. The toggle lives only on the analytics tab, not the trade-log tab.

- [ ] **Step 1: Read the page**
```bash
cd /Users/fearcutter/projects/trading-journal && grep -n "Tabs\|analytics\|Analytics" src/pages/LiveTradingSessionPage.tsx | head -30
```
Identify (a) the tab component, (b) the analytics-tab content area, (c) the trade pool used for analytics on this page.

- [ ] **Step 2: Import**
```ts
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';
```

- [ ] **Step 3: Add state**
```ts
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
```

- [ ] **Step 4: Apply filter to the analytics-tab trade pool**

Wrap the session-trades pool used for analytics:
```ts
  const overlapScopedSessionTrades = overlapScope === 'exclude'
    ? <existingSessionTradesPool>.filter(t => !t.overlap)
    : <existingSessionTradesPool>;
```
Use `overlapScopedSessionTrades` for stats hooks / charts within the analytics tab only. Keep the trade-log tab on the unscoped pool so users can see the row-level "Overlap" badge there.

- [ ] **Step 5: Render the toggle in the analytics tab header**
```tsx
<OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
```

- [ ] **Step 6: Typecheck**
```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```

- [ ] **Step 7: Commit**
```bash
cd /Users/fearcutter/projects/trading-journal && git add src/pages/LiveTradingSessionPage.tsx && git commit -m "$(cat <<'EOF'
Apply Overlap scope toggle to live session analytics tab

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 13: Apply toggle + filter to `BacktestSessionPage` analytics tab

**Files:**
- Modify: `src/pages/BacktestSessionPage.tsx`

Same pattern as Task 12 for backtest sessions.

- [ ] **Step 1: Read the page**
```bash
cd /Users/fearcutter/projects/trading-journal && grep -n "Tabs\|analytics\|Analytics" src/pages/BacktestSessionPage.tsx | head -30
```

- [ ] **Step 2: Import**
```ts
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';
```

- [ ] **Step 3: Add state**
```ts
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
```

- [ ] **Step 4: Apply filter to the analytics-tab trade pool**
```ts
  const overlapScopedSessionTrades = overlapScope === 'exclude'
    ? <existingSessionTradesPool>.filter(t => !t.overlap)
    : <existingSessionTradesPool>;
```

- [ ] **Step 5: Render the toggle in the analytics tab header**
```tsx
<OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
```

- [ ] **Step 6: Typecheck**
```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```

- [ ] **Step 7: Commit**
```bash
cd /Users/fearcutter/projects/trading-journal && git add src/pages/BacktestSessionPage.tsx && git commit -m "$(cat <<'EOF'
Apply Overlap scope toggle to backtest session analytics tab

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 14: Apply toggle + filter to `ConfluencesPage`

**Files:**
- Modify: `src/pages/ConfluencesPage.tsx`

Same pattern as Tasks 9–10.

- [ ] **Step 1: Read the page**
```bash
cd /Users/fearcutter/projects/trading-journal && head -60 src/pages/ConfluencesPage.tsx
```

- [ ] **Step 2: Import**
```ts
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';
```

- [ ] **Step 3: Add state**
```ts
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
```

- [ ] **Step 4: Apply filter**
```ts
  const overlapScopedTrades = overlapScope === 'exclude'
    ? <existingPool>.filter(t => !t.overlap)
    : <existingPool>;
```
Use `overlapScopedTrades` downstream.

- [ ] **Step 5: Render toggle in page header**
```tsx
<OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
```

- [ ] **Step 6: Typecheck**
```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```

- [ ] **Step 7: Commit**
```bash
cd /Users/fearcutter/projects/trading-journal && git add src/pages/ConfluencesPage.tsx && git commit -m "$(cat <<'EOF'
Apply Overlap scope toggle to Confluences page

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 15: Add Overlap filter to `useFilteredTrades` and `FilterBar`

**Files:**
- Modify: `src/hooks/useFilteredTrades.ts`
- Modify: `src/components/filters/FilterBar.tsx`

This filter is independent of the per-page Exclude/Include toggle: it lets users actively *find* overlapping trades when reviewing the trade list.

- [ ] **Step 1: Add `overlap` to the `TradeFilters` interface**

In `src/hooks/useFilteredTrades.ts`, find the `TradeFilters` interface. After `search: string;` and before `sessionId?: string;`, add:
```ts
  overlap: '' | 'yes' | 'no';
```

- [ ] **Step 2: Add `overlap: ''` to `defaultFilters`**

In the same file, find `defaultFilters` and add (matching insertion order):
```ts
  overlap: '',
```

- [ ] **Step 3: Apply the filter in the loop**

In the same file, inside the `useFilteredTrades` filter function, after the `if (filters.result && trade.result !== filters.result) return false;` line, insert:
```ts
      if (filters.overlap === 'yes' && trade.overlap !== true) return false;
      if (filters.overlap === 'no' && trade.overlap === true) return false;
```

- [ ] **Step 4: Add Select dropdown to FilterBar**

In `src/components/filters/FilterBar.tsx`, after the `Result` Select and before the `Setup` Select, insert:
```tsx
      <Select
        label="Overlap"
        value={filters.overlap}
        onValueChange={v => update('overlap', v as TradeFilters['overlap'])}
        options={[
          { value: '', label: 'All' },
          { value: 'yes', label: 'Yes' },
          { value: 'no', label: 'No' },
        ]}
      />
```

- [ ] **Step 5: Typecheck**
```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exit 0.

- [ ] **Step 6: Commit**
```bash
cd /Users/fearcutter/projects/trading-journal && git add src/hooks/useFilteredTrades.ts src/components/filters/FilterBar.tsx && git commit -m "$(cat <<'EOF'
Add Overlap filter to FilterBar and useFilteredTrades

All / Yes / No dropdown. Independent of the per-page Exclude toggle.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 16: Add Overlap column to CSV export

**Files:**
- Modify: `src/utils/csv-export.ts`

- [ ] **Step 1: Add header**

In `src/utils/csv-export.ts`, find the `headers` array. After `'Drawback from 2R',` (before `'Setup Type',`), insert:
```ts
    'Overlap',
```

- [ ] **Step 2: Add row value**

In the same file, find the `base` row array. After `t.drawback2R ?? '',` (before `t.setupType,`), insert:
```ts
      t.overlap === true ? 'Yes' : '',
```

- [ ] **Step 3: Typecheck**
```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```

- [ ] **Step 4: Commit**
```bash
cd /Users/fearcutter/projects/trading-journal && git add src/utils/csv-export.ts && git commit -m "$(cat <<'EOF'
Add Overlap column to CSV export

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 17: End-to-end smoke and push

- [ ] **Step 1: Confirm dev server is alive**

```bash
lsof -i :5173 | grep LISTEN
```
If empty, start it:
```bash
cd /Users/fearcutter/projects/trading-journal && npm run dev
```
(run in background; wait until `Local:` appears in output)

- [ ] **Step 2: Final typecheck**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json && echo OK
```
Expected: prints `OK`.

- [ ] **Step 3: Manual smoke test**

Open `http://localhost:5173`, hard-refresh (Cmd+Shift+R), and walk through:

1. **Form input** — Add a new trade in a backtest session, set Overlap=Yes. Save. Open the trade detail. Field should show as Yes.
2. **Form input — live** — Add a new trade in a live session, set Overlap=Yes. Save. Open detail. Same.
3. **Edit** — From the detail page, click Edit. Verify the Yes button is highlighted (initialData wired correctly). Click No, save. Field updates.
4. **Toggle (Dashboard)** — Go to Dashboard. Confirm the Overlap toggle appears next to Live/All. Default is Exclude. Net P&L and trade count should drop the overlap-flagged trades. Flip to Include — counts go back up.
5. **Toggle (Analytics, MFE/MAE, Calendar, Confluences)** — Same toggle present, defaults to Exclude, flipping changes stats.
6. **Toggle (session analytics tabs)** — Open a backtest session → Analytics tab. Toggle present. Same behavior.
7. **TradeRow badge** — In any session's trade log, the overlap-flagged trade should show a small amber `Overlap` pill next to its instrument.
8. **FilterBar** — On Dashboard or Analytics, set the Overlap filter to Yes. Trade list narrows to only flagged trades. Set to No. Narrows to non-flagged. Set to All. All show.
9. **CSV export** — Trigger CSV export from wherever it's surfaced (Settings or Backtest Session). Open the CSV. Confirm an `Overlap` column appears with `Yes` for flagged trades and empty for the rest.
10. **Console** — DevTools console should be free of new errors at every step.

- [ ] **Step 4: Push**

```bash
cd /Users/fearcutter/projects/trading-journal && git push origin main
```
Expected: shows the 16 new commits being pushed (or however many tasks completed). Vercel auto-deploys.

- [ ] **Step 5: Verify on Vercel after deploy**

Wait ~1–2 minutes. Open `https://trading-journal-legit.vercel.app/`, hard-refresh. Repeat steps 4–9 from the manual smoke (deployed-build verification).

---

## Acceptance criteria mapping

| Spec criterion | Task |
|---|---|
| 1. Overlap savable on create + update | 1, 2, 3, 4 |
| 2. addTrade and handleUpdate both wire it | 2, 3 |
| 3. Toggle on 7 analytics pages, default Exclude | 7, 8, 9, 10, 11, 12, 13, 14 |
| 4. Exclude drops flagged trades from every stat | 8, 9, 10, 11, 12, 13, 14 |
| 5. Trade list rows show amber Overlap badge | 6 |
| 6. Trade detail shows the field when flagged | 5 |
| 7. FilterBar filter (All / Yes / No) | 15 |
| 8. CSV export includes the column | 16 |
| 9. Existing trades (`overlap=undefined`) behave identically | covered transitively — every filter only drops `t.overlap === true` |
