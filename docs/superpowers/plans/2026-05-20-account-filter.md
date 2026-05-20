# Account Filter Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the user filter trades by the Apex account(s) they were taken on, across the Live Session page, Dashboard, Analytics, and MFE/MAE — without touching the existing per-account balance/payout views.

**Architecture:** Add `accountIds: string[]` to the existing `TradeFilters` (default `[]`) with an OR-match rule inside `useFilteredTrades`. Build a small `MultiSelect` primitive following the existing custom `Select` pattern (no Radix Popover). Wire a new `Account` dropdown into `FilterBar` — Dashboard and Live Session pages get it for free. Analytics and MFE/MAE (which don't use FilterBar) get a *standalone* MultiSelect in their header. Backtest opts out via a new `hideAccountFilter` prop.

**Tech Stack:** React 19, TypeScript 5.9, Tailwind v4, Radix Checkbox (for option rows), Vite 7. No new dependencies.

**Reference spec:** `docs/superpowers/specs/2026-05-20-account-filter-design.md`

---

## File structure

| File | Status | Responsibility |
|---|---|---|
| `src/hooks/useFilteredTrades.ts` | modify | Add `accountIds: string[]` to `TradeFilters`; default `[]`; apply OR-match filter |
| `src/components/ui/MultiSelect.tsx` | **create** | Reusable multi-select dropdown (custom, matches existing `Select` style) |
| `src/components/filters/FilterBar.tsx` | modify | New `Account` dropdown; `hideAccountFilter` prop; array-aware `hasFilters` |
| `src/pages/BacktestSessionPage.tsx` | modify | Pass `hideAccountFilter` to FilterBar |
| `src/pages/AnalyticsPage.tsx` | modify | Standalone account `MultiSelect` in header; account scoping in trade pipeline |
| `src/pages/MFEMAEPage.tsx` | modify | Same — standalone `MultiSelect` in header |

Dashboard and LiveTradingSession require no source change: they already use FilterBar, so the new Account dropdown appears automatically once Task 3 lands.

## Verification approach

The project has no JS/TS unit-test runner configured. Each task verifies via:

1. **Typecheck:** `cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json` — must exit 0.
2. **Lint** (where touched files are non-trivial): `cd /Users/fearcutter/projects/trading-journal && npx eslint <file>` — exit 0; pre-existing warnings (e.g. `react-refresh/only-export-components` on context files) are acceptable.
3. **Manual smoke** at the end (Task 7) in `npm run dev` on `localhost:5173`.

## Conventions

- Each task ends with a single `git commit` on `main` matching the project's small-commit style.
- Commit subject: imperative, sentence-case, no period (e.g. `Add accountIds field to TradeFilters`).
- Co-authored trailer: `Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>`.
- Do NOT push between tasks. The final task pushes the whole feature.

---

## Task 1: Add `accountIds` to `TradeFilters` and the filter loop

**Files:**
- Modify: `src/hooks/useFilteredTrades.ts`

- [ ] **Step 1: Add `accountIds` to the `TradeFilters` interface**

In `src/hooks/useFilteredTrades.ts`, find the `TradeFilters` interface (around line 6) and add `accountIds` as the last interface field before `sessionId?: string;`:

```ts
export interface TradeFilters {
  dateFrom: string;
  dateTo: string;
  instrument: string;
  direction: TradeDirection | '';
  result: TradeResult | '';
  setupType: string;
  rMultiple: RMultipleFilter;
  search: string;
  overlap: '' | 'yes' | 'no';
  accountIds: string[];
  sessionId?: string;
}
```

- [ ] **Step 2: Add `accountIds: []` to `defaultFilters`**

In the same file, find `defaultFilters` (around line 19) and add the field:

```ts
export const defaultFilters: TradeFilters = {
  dateFrom: '',
  dateTo: '',
  instrument: '',
  direction: '',
  result: '',
  setupType: '',
  rMultiple: '',
  search: '',
  overlap: '',
  accountIds: [],
};
```

- [ ] **Step 3: Apply the filter rule inside `useFilteredTrades`**

In the same file, find the filter loop (the body of `trades.filter(trade => { ... })` around line 33). Insert this block immediately after the `overlap` filter and before the `setupType` filter (right after the line `if (filters.overlap === 'no' && trade.overlap === true) return false;`):

```ts
      if (filters.accountIds.length > 0) {
        if (!trade.accountIds || trade.accountIds.length === 0) return false;
        if (!trade.accountIds.some(id => filters.accountIds.includes(id))) return false;
      }
```

- [ ] **Step 4: Typecheck**

Run:
```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exits with code 0. (Existing call sites — `DashboardPage`, `BacktestSessionPage`, `LiveTradingSessionPage` — spread `defaultFilters` or set `defaultFilters` directly, so the new required field is provided automatically.)

- [ ] **Step 5: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/hooks/useFilteredTrades.ts && git commit -m "$(cat <<'EOF'
Add accountIds field to TradeFilters

Empty array = no filter. When non-empty, only trades whose accountIds
includes at least one selected id pass through; untagged trades are
excluded.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 2: Create the `MultiSelect` UI primitive

**Files:**
- Create: `src/components/ui/MultiSelect.tsx`

- [ ] **Step 1: Create the component file**

Write `src/components/ui/MultiSelect.tsx` with this content:

```tsx
import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

export interface MultiSelectOption {
  value: string;
  label: string;
  sublabel?: string;
}

interface MultiSelectProps {
  label?: string;
  value: string[];
  onChange: (next: string[]) => void;
  options: MultiSelectOption[];
  placeholder?: string;
}

export default function MultiSelect({
  label,
  value,
  onChange,
  options,
  placeholder = 'All',
}: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [open]);

  const toggle = (v: string) => {
    if (value.includes(v)) onChange(value.filter(x => x !== v));
    else onChange([...value, v]);
  };

  const triggerLabel = (() => {
    if (value.length === 0) return placeholder;
    if (value.length === 1) {
      const match = options.find(o => o.value === value[0]);
      return match?.label ?? '1 selected';
    }
    return `${value.length} selected`;
  })();

  return (
    <div className="space-y-1">
      {label && <label className="block text-sm font-medium text-slate-300">{label}</label>}
      <div className="relative" ref={containerRef}>
        <button
          type="button"
          onClick={() => setOpen(prev => !prev)}
          className="w-full flex items-center justify-between gap-2 px-3 py-2 bg-slate-800 border border-slate-600 rounded-lg text-sm text-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <span className={value.length === 0 ? 'text-slate-500' : ''}>{triggerLabel}</span>
          <ChevronDown size={16} className="text-slate-400" />
        </button>
        {open && (
          <div className="absolute z-50 mt-1 min-w-full w-max bg-slate-800 border border-slate-600 rounded-lg shadow-xl max-h-60 overflow-y-auto p-1">
            {value.length > 0 && (
              <button
                type="button"
                onClick={() => onChange([])}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 rounded-md hover:bg-slate-700"
              >
                Clear selection
              </button>
            )}
            <ul>
              {options.length === 0 && (
                <li className="px-3 py-2 text-sm text-slate-500">No options</li>
              )}
              {options.map(opt => {
                const checked = value.includes(opt.value);
                return (
                  <li
                    key={opt.value}
                    onClick={() => toggle(opt.value)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-slate-200 rounded-md cursor-pointer hover:bg-slate-700 whitespace-nowrap"
                  >
                    <span className="w-3.5 flex-shrink-0">
                      {checked && <Check size={14} className="text-blue-400" />}
                    </span>
                    <span>{opt.label}</span>
                    {opt.sublabel && (
                      <span className="ml-1 text-xs text-slate-500">{opt.sublabel}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
```

Design notes baked into the code:
- Mirrors the existing `Select` (`src/components/ui/Select.tsx`) — same colors, same click-outside logic — so it visually fits FilterBar.
- Trigger label collapses: `placeholder` when empty, the single option's label when count is 1, `"N selected"` otherwise.
- `Clear selection` row appears only when there is something to clear.
- Escape key closes the panel (the existing `Select` doesn't bother, but multi-select panels stay open longer so this is worth having).

- [ ] **Step 2: Typecheck**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exits 0.

- [ ] **Step 3: Lint**

```bash
cd /Users/fearcutter/projects/trading-journal && npx eslint src/components/ui/MultiSelect.tsx
```
Expected: exits 0 with no output.

- [ ] **Step 4: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/components/ui/MultiSelect.tsx && git commit -m "$(cat <<'EOF'
Add MultiSelect UI primitive

Custom multi-select dropdown matching the existing Select component's
style. Click-outside and Escape both close. Trigger label collapses to
"N selected" beyond one choice.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 3: Wire `Account` dropdown into `FilterBar`

**Files:**
- Modify: `src/components/filters/FilterBar.tsx`

- [ ] **Step 1: Replace `FilterBar.tsx` with the updated version**

The current file has a brittle `hasFilters` check (`Object.entries(filters).some(...)` against `defaultFilters`) that compares the new `accountIds: []` array by reference and would always read as "has filter." Rewrite the check explicitly and add the Account dropdown. Replace the entire contents of `src/components/filters/FilterBar.tsx` with:

```tsx
import { useMemo } from 'react';
import { useSettings } from '../../context/SettingsContext';
import { useApexAccounts } from '../../context/ApexAccountContext';
import type { TradeFilters } from '../../hooks/useFilteredTrades';
import Select from '../ui/Select';
import MultiSelect, { type MultiSelectOption } from '../ui/MultiSelect';
import DateRangePicker from '../ui/DateRangePicker';
import { RotateCcw } from 'lucide-react';
import { defaultFilters } from '../../hooks/useFilteredTrades';

interface FilterBarProps {
  filters: TradeFilters;
  onChange: (filters: TradeFilters) => void;
  hideAccountFilter?: boolean;
}

const STATUS_ORDER: Record<string, number> = { active: 0, blown: 1, completed: 2 };

export default function FilterBar({ filters, onChange, hideAccountFilter }: FilterBarProps) {
  const settings = useSettings();
  const { accounts } = useApexAccounts();

  const update = <K extends keyof TradeFilters>(key: K, value: TradeFilters[K]) => {
    onChange({ ...filters, [key]: value });
  };

  const hasFilters =
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.instrument !== '' ||
    filters.direction !== '' ||
    filters.result !== '' ||
    filters.setupType !== '' ||
    filters.rMultiple !== '' ||
    filters.search !== '' ||
    filters.overlap !== '' ||
    filters.accountIds.length > 0;

  const accountOptions: MultiSelectOption[] = useMemo(() => {
    const formatSize = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n));
    return [...accounts]
      .sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return a.label.localeCompare(b.label);
      })
      .map(a => ({
        value: a.id,
        label: `${formatSize(a.accountSize)} ${a.label}`,
        sublabel: a.status === 'active' ? undefined : `(${a.status})`,
      }));
  }, [accounts]);

  const showAccountFilter = !hideAccountFilter && accountOptions.length > 0;

  const clearAll = () => {
    onChange({ ...defaultFilters, sessionId: filters.sessionId });
  };

  return (
    <div className="flex items-end gap-3 flex-wrap">
      <DateRangePicker
        from={filters.dateFrom}
        to={filters.dateTo}
        onFromChange={v => update('dateFrom', v)}
        onToChange={v => update('dateTo', v)}
      />
      <Select
        label="Instrument"
        value={filters.instrument}
        onValueChange={v => update('instrument', v)}
        options={[
          { value: '', label: 'All' },
          ...settings.instruments.map(i => ({ value: i.symbol, label: i.symbol })),
        ]}
      />
      <Select
        label="Direction"
        value={filters.direction}
        onValueChange={v => update('direction', v as TradeFilters['direction'])}
        options={[
          { value: '', label: 'All' },
          { value: 'long', label: 'Long' },
          { value: 'short', label: 'Short' },
        ]}
      />
      <Select
        label="Result"
        value={filters.result}
        onValueChange={v => update('result', v as TradeFilters['result'])}
        options={[
          { value: '', label: 'All' },
          { value: 'win', label: 'Win' },
          { value: 'loss', label: 'Loss' },
          { value: 'breakeven', label: 'Breakeven' },
        ]}
      />
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
      <Select
        label="Setup"
        value={filters.setupType}
        onValueChange={v => update('setupType', v)}
        options={[
          { value: '', label: 'All' },
          ...settings.setupTypes.map(s => ({ value: s, label: s })),
        ]}
      />
      <Select
        label="R Multiple"
        value={filters.rMultiple}
        onValueChange={v => update('rMultiple', v as TradeFilters['rMultiple'])}
        options={[
          { value: '', label: 'All' },
          { value: 'reached3R', label: '3R+' },
          { value: 'reached2R', label: '2R' },
          { value: 'be', label: 'BE (1R)' },
          { value: 'loss', label: 'Loss (<1R)' },
        ]}
      />
      {showAccountFilter && (
        <MultiSelect
          label="Account"
          value={filters.accountIds}
          onChange={v => update('accountIds', v)}
          options={accountOptions}
          placeholder="All"
        />
      )}
      {hasFilters && (
        <button
          onClick={clearAll}
          className="flex items-center gap-1.5 px-3 py-2 text-sm text-slate-400 hover:text-slate-200 transition-colors"
        >
          <RotateCcw size={14} />
          Clear
        </button>
      )}
    </div>
  );
}
```

Key changes vs the existing file:
- New `hideAccountFilter?: boolean` prop.
- New `Account` `MultiSelect` rendered after `R Multiple`, only when not hidden and at least one account exists.
- Account options are sorted active → blown → completed, alphabetical within group, with a `(blown)` / `(completed)` sublabel for non-active.
- `hasFilters` is now an explicit boolean expression (the old `Object.entries(...).some(...)` comparison broke on array fields).
- `Clear` resets to `defaultFilters` but preserves `sessionId` if present (the old `onChange(defaultFilters)` blew away `sessionId`, which a session-scoped page would not want).

- [ ] **Step 2: Typecheck**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exits 0.

- [ ] **Step 3: Lint**

```bash
cd /Users/fearcutter/projects/trading-journal && npx eslint src/components/filters/FilterBar.tsx
```
Expected: exits 0.

- [ ] **Step 4: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/components/filters/FilterBar.tsx && git commit -m "$(cat <<'EOF'
Add Account multi-select to FilterBar

Sorted active → blown → completed with status sublabels.
Hidden when no accounts exist or hideAccountFilter is set.
Rewrite hasFilters as explicit boolean (the old Object.entries
comparison broke for array fields).
Clear preserves sessionId so session-scoped pages don't lose scope.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 4: Suppress the Account filter on `BacktestSessionPage`

**Files:**
- Modify: `src/pages/BacktestSessionPage.tsx`

- [ ] **Step 1: Pass `hideAccountFilter` to FilterBar**

In `src/pages/BacktestSessionPage.tsx` find the line (around line 457):

```tsx
      <FilterBar filters={filters} onChange={setFilters} />
```

Replace it with:

```tsx
      <FilterBar filters={filters} onChange={setFilters} hideAccountFilter />
```

(Backtest trades don't carry `accountIds`; suppressing the control matches the spec.)

- [ ] **Step 2: Typecheck**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json
```
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/pages/BacktestSessionPage.tsx && git commit -m "$(cat <<'EOF'
Hide Account filter on backtest session pages

Backtest trades don't carry accountIds — the control would only
yield empty results.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 5: Add standalone Account `MultiSelect` to `AnalyticsPage`

**Files:**
- Modify: `src/pages/AnalyticsPage.tsx`

`AnalyticsPage` consumes `trades` directly with only `OverlapScopeToggle` — it does not use `FilterBar`. Add a standalone `MultiSelect` next to the overlap toggle and apply account scoping in the pipeline between overlap scope and the stats hook.

- [ ] **Step 1: Update imports**

In `src/pages/AnalyticsPage.tsx`, replace the import block at the top of the file (lines 1–12) with:

```tsx
import { useState, useMemo } from 'react';
import { useTrades } from '../context/TradeContext';
import { useApexAccounts } from '../context/ApexAccountContext';
import { useAdvancedStats } from '../hooks/useAdvancedStats';
import { usePLFormatter } from '../hooks/usePLFormatter';
import DrawdownChart from '../components/analytics/DrawdownChart';
import RollingWinRateChart from '../components/analytics/RollingWinRateChart';
import DayOfWeekChart from '../components/analytics/DayOfWeekChart';
import InstrumentComparisonChart from '../components/analytics/InstrumentComparisonChart';
import StreakChart from '../components/analytics/StreakChart';
import MonteCarloChart from '../components/analytics/MonteCarloChart';
import PlanComplianceWidget from '../components/trading-plan/PlanComplianceWidget';
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';
import MultiSelect, { type MultiSelectOption } from '../components/ui/MultiSelect';
```

(Two new imports: `useApexAccounts` and `MultiSelect`.)

- [ ] **Step 2: Add accounts state, options, and pipeline**

Find the existing body of `AnalyticsPage` (the lines starting with `const { trades } = useTrades();`). Replace the block from `const { trades } = useTrades();` through the line `const stats = useAdvancedStats(overlapScopedTrades, pl.plField);` with:

```tsx
  const { trades } = useTrades();
  const { accounts } = useApexAccounts();
  const pl = usePLFormatter();
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const overlapScopedTrades = useMemo(
    () => overlapScope === 'exclude' ? trades.filter(t => !t.overlap) : trades,
    [trades, overlapScope]
  );

  const accountScopedTrades = useMemo(() => {
    if (selectedAccountIds.length === 0) return overlapScopedTrades;
    return overlapScopedTrades.filter(t =>
      t.accountIds?.some(id => selectedAccountIds.includes(id))
    );
  }, [overlapScopedTrades, selectedAccountIds]);

  const accountOptions: MultiSelectOption[] = useMemo(() => {
    const STATUS_ORDER: Record<string, number> = { active: 0, blown: 1, completed: 2 };
    const formatSize = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n));
    return [...accounts]
      .sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return a.label.localeCompare(b.label);
      })
      .map(a => ({
        value: a.id,
        label: `${formatSize(a.accountSize)} ${a.label}`,
        sublabel: a.status === 'active' ? undefined : `(${a.status})`,
      }));
  }, [accounts]);

  const stats = useAdvancedStats(accountScopedTrades, pl.plField);
```

Notes:
- The pipeline is `trades → overlapScopedTrades → accountScopedTrades → stats`. Each layer is its own `useMemo` so a change in one filter doesn't invalidate the others unnecessarily.
- `accountOptions` is computed inline here rather than refactored into a shared util — the same sort logic also lives in `FilterBar` (Task 3). If a third page picks it up later, extract then.

- [ ] **Step 3: Render the MultiSelect in the header**

Find the header `<div>` (currently `<div className="flex items-center justify-between">` containing the title and `OverlapScopeToggle`). Replace it with:

```tsx
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-50">Advanced Analytics</h2>
        <div className="flex items-center gap-3">
          {accountOptions.length > 0 && (
            <MultiSelect
              label="Account"
              value={selectedAccountIds}
              onChange={setSelectedAccountIds}
              options={accountOptions}
              placeholder="All accounts"
            />
          )}
          <OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
        </div>
      </div>
```

- [ ] **Step 4: Pass the account-scoped pool to `PlanComplianceWidget`**

In the same file, find:

```tsx
        <PlanComplianceWidget trades={overlapScopedTrades} />
```

Replace with:

```tsx
        <PlanComplianceWidget trades={accountScopedTrades} />
```

(So the plan-compliance widget respects the account filter too — otherwise it would silently ignore it.)

- [ ] **Step 5: Typecheck and lint**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json && npx eslint src/pages/AnalyticsPage.tsx
```
Expected: both exit 0.

- [ ] **Step 6: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/pages/AnalyticsPage.tsx && git commit -m "$(cat <<'EOF'
Add account filter to AnalyticsPage

Standalone MultiSelect in header (page doesn't use FilterBar).
Pipeline: trades → overlap scope → account scope → stats.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 6: Add standalone Account `MultiSelect` to `MFEMAEPage`

**Files:**
- Modify: `src/pages/MFEMAEPage.tsx`

Same structure as Task 5 but for the simpler MFE/MAE page.

- [ ] **Step 1: Update imports**

In `src/pages/MFEMAEPage.tsx`, replace the import block (lines 1–6) with:

```tsx
import { useState, useMemo } from 'react';
import { useTrades } from '../context/TradeContext';
import { useApexAccounts } from '../context/ApexAccountContext';
import { useMFEMAEStats } from '../hooks/useMFEMAEStats';
import { usePLFormatter } from '../hooks/usePLFormatter';
import MFEMAEPanel from '../components/analytics/MFEMAEPanel';
import OverlapScopeToggle, { type OverlapScope } from '../components/filters/OverlapScopeToggle';
import MultiSelect, { type MultiSelectOption } from '../components/ui/MultiSelect';
```

- [ ] **Step 2: Add accounts state, options, and pipeline**

Replace the block starting with `const { trades } = useTrades();` through `const stats = useMFEMAEStats(overlapScopedTrades, plField);` with:

```tsx
  const { trades } = useTrades();
  const { accounts } = useApexAccounts();
  const { plField } = usePLFormatter();
  const [overlapScope, setOverlapScope] = useState<OverlapScope>('exclude');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const overlapScopedTrades = useMemo(
    () => overlapScope === 'exclude' ? trades.filter(t => !t.overlap) : trades,
    [trades, overlapScope]
  );

  const accountScopedTrades = useMemo(() => {
    if (selectedAccountIds.length === 0) return overlapScopedTrades;
    return overlapScopedTrades.filter(t =>
      t.accountIds?.some(id => selectedAccountIds.includes(id))
    );
  }, [overlapScopedTrades, selectedAccountIds]);

  const accountOptions: MultiSelectOption[] = useMemo(() => {
    const STATUS_ORDER: Record<string, number> = { active: 0, blown: 1, completed: 2 };
    const formatSize = (n: number) => (n >= 1000 ? `${n / 1000}K` : String(n));
    return [...accounts]
      .sort((a, b) => {
        const sa = STATUS_ORDER[a.status] ?? 99;
        const sb = STATUS_ORDER[b.status] ?? 99;
        if (sa !== sb) return sa - sb;
        return a.label.localeCompare(b.label);
      })
      .map(a => ({
        value: a.id,
        label: `${formatSize(a.accountSize)} ${a.label}`,
        sublabel: a.status === 'active' ? undefined : `(${a.status})`,
      }));
  }, [accounts]);

  const stats = useMFEMAEStats(accountScopedTrades, plField);
```

- [ ] **Step 3: Render the MultiSelect in the header and update the panel input**

Find the existing `return (...)` JSX and replace the body with:

```tsx
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-50">MFE / MAE Analysis</h2>
        <div className="flex items-center gap-3">
          {accountOptions.length > 0 && (
            <MultiSelect
              label="Account"
              value={selectedAccountIds}
              onChange={setSelectedAccountIds}
              options={accountOptions}
              placeholder="All accounts"
            />
          )}
          <OverlapScopeToggle value={overlapScope} onChange={setOverlapScope} />
        </div>
      </div>
      <MFEMAEPanel trades={accountScopedTrades} stats={stats} />
    </div>
  );
```

(Note: `MFEMAEPanel` now receives `accountScopedTrades` instead of `overlapScopedTrades`.)

- [ ] **Step 4: Typecheck and lint**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json && npx eslint src/pages/MFEMAEPage.tsx
```
Expected: both exit 0.

- [ ] **Step 5: Commit**

```bash
cd /Users/fearcutter/projects/trading-journal && git add src/pages/MFEMAEPage.tsx && git commit -m "$(cat <<'EOF'
Add account filter to MFEMAEPage

Standalone MultiSelect in header. Pipeline matches AnalyticsPage:
trades → overlap scope → account scope → stats.

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
EOF
)"
```

---

## Task 7: End-to-end smoke test and push

- [ ] **Step 1: Confirm dev server is alive**

```bash
lsof -i :5173 | grep LISTEN
```
If empty, start it:
```bash
cd /Users/fearcutter/projects/trading-journal && npm run dev
```
(run in background; wait until `Local:` appears in output)

- [ ] **Step 2: Final typecheck and lint**

```bash
cd /Users/fearcutter/projects/trading-journal && npx tsc --noEmit -p tsconfig.app.json && npx eslint src && echo OK
```
Expected: prints `OK`. Pre-existing warnings (e.g., `react-refresh/only-export-components` in context files) are acceptable, but no new errors.

- [ ] **Step 3: Manual smoke test**

Open `http://localhost:5173`, hard-refresh (Cmd+Shift+R), and walk through:

1. **Pre-req:** at least two active Apex accounts exist (`Settings → Apex Accounts` or equivalent), and there are live trades tagged with at least one of them. If not, log a couple of test trades with different account selections so the filter has data to operate on.

2. **FilterBar — Dashboard** — Go to Dashboard. After `R Multiple` in the FilterBar there should be a new `Account` dropdown showing "All". Open it: every account appears, active first, then blown, then completed, with `(blown)`/`(completed)` sublabel where applicable. Pick one account. Stats, charts, and trade row counts narrow to only that account's trades. Pick a second — pool widens to the union. Click `Clear selection` inside the dropdown — back to all.

3. **Clear (Dashboard)** — Set a date range AND an account filter, then click the top-level `Clear` button. Both reset.

4. **FilterBar — Live Session** — Open any live session via Live Trading → click a session. Same `Account` dropdown is present and operates on the session's trade pool. Refresh the page (Cmd+R). The selection persists (sessionStorage). Click Clear — selection clears but the page stays scoped to the same session.

5. **Backtest Session** — Open any backtest session. The `Account` dropdown is **not** present in the FilterBar.

6. **AnalyticsPage** — Go to `Analytics`. A standalone `Account` dropdown appears in the header to the left of the Exclude/Include overlap toggle. Pick an account. The summary cards (Sharpe / Expectancy / Max Drawdown / Longest Win Streak), all six charts, and the `PlanComplianceWidget` reflect only that account's trades. Pick another — union. Clear inside dropdown — full pool.

7. **MFEMAEPage** — Go to `MFE/MAE`. Same standalone `Account` dropdown in the header. Picking an account narrows the MFE/MAE panel.

8. **Untagged-trade behavior** — Pick an account in any of the four surfaces above. Any trade with no `accountIds` (e.g., one logged before account tagging existed, or one you never tagged) should not appear in the stats. Toggle the filter off — those trades reappear.

9. **Console** — DevTools console should be free of new errors at every step.

- [ ] **Step 4: Push**

```bash
cd /Users/fearcutter/projects/trading-journal && git push origin main
```
Expected: shows 7 new commits being pushed (1 spec + 6 implementation). Vercel auto-deploys.

- [ ] **Step 5: Verify on Vercel after deploy**

Wait ~1–2 minutes. Open `https://trading-journal-legit.vercel.app/`, hard-refresh. Repeat smoke-test steps 2–8 against the deployed build.

---

## Acceptance criteria mapping

| Spec criterion | Task |
|---|---|
| 1. `accountIds: string[]` in `TradeFilters` with array-aware Clear | 1, 3 |
| 2. `Account` MultiSelect in FilterBar with hide rules | 3 |
| 3. OR-match filter; untagged trades hidden when active | 1 |
| 4. All accounts shown, grouped by status | 3 (and replicated in 5, 6) |
| 5. Filter on Dashboard, Analytics, MFE/MAE, LiveTradingSession | 3 (Dashboard + LiveSession via FilterBar), 5 (Analytics), 6 (MFE/MAE) |
| 6. Filter suppressed on BacktestSessionPage | 4 |
| 7. LiveTradingSession composes with session scope | 3 (no code change — natural composition via `useFilteredTrades`) |
| 8. Clearing FilterBar resets `accountIds` | 3 |
| 9. No accounts selected = same as today | 1 (filter rule short-circuits on empty array) |
| 10. No schema/migration; existing trades unchanged | n/a — no schema touched |
