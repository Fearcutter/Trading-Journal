# Coach Access Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the journal owner invite one coach who logs in with their own account, sees a live read-only view of the owner's selected journal sections (never backtests), and can leave comments on trades.

**Architecture:** Access is enforced in Supabase with Row Level Security (new `coach_access` + `trade_comments` tables, select-only coach policies, security-definer helper functions). In the app, a new `ViewContext` decides "owner" vs "coach" mode at login; the two data hooks load the *viewed* journal's rows and become no-op writers in coach mode; layout/nav/edit buttons follow the shared sections.

**Tech Stack:** React 19 + Vite + TypeScript, react-router 7, Supabase (Postgres RLS + Storage), Tailwind, Vitest (added in Task 2 for pure-logic tests), Node probe script for database-rule tests.

**Spec:** `docs/superpowers/specs/2026-10-29-coach-access-design.md`

## Global Constraints

- Shareable section keys, exactly: `dashboard`, `live_trading`, `trade_details`, `calendar`, `journal`, `playbook`, `apex_accounts`. All seven ticked by default on invite.
- Never visible to a coach: Analytics, MFE/MAE, Category Analytics, Backtesting, Risk Calculator, Settings page, `backtest_sessions` rows, trades whose `sessionId` is a backtest session, and their screenshots.
- One coach per owner (`coach_access.owner_id` is the primary key).
- Coach access requires the coach's email to be **confirmed** in Supabase Auth.
- Coach writes nothing except their own rows in `trade_comments`. Owner cannot edit/delete coach comments; owner can only mark them read.
- Comments are one-way (coach → owner) and only on trades.
- No browser `confirm()`/`alert()` in new code — use the in-app `Modal`.
- Owner's own experience unchanged except the Settings "Coach Access" card and the unread-comment marker.
- **Deviation from spec (security):** the coach does **not** get a select policy on `user_settings`. Settings reach the coach through the `get_shared_settings` function, which strips `fundedAccountsPasswordHash` (an unsalted SHA-256 of the owner's Funded Accounts password). Task 1 updates the spec to say so.

## Review Focus

1. **Coach opens a link to an unshared page** (e.g. a bookmarked `/analytics`, or `/trades/:id` with Trade Details unticked) → sees "Not shared", never the page. Pinned by `canViewPath` tests in Task 2 and probe in Task 9.
2. **Coach lands on `/` when Dashboard is unticked** → redirected to the first shared section, not a blank "Not shared". Pinned by `firstSharedPath` tests in Task 2.
3. **A coach somehow triggers a save** (a control we forgot to hide, a habit form auto-save) → nothing is written. Pinned by the read-only no-op in Task 4 and the write probes in Task 9.
4. **Owner revokes while the coach is logged in** → on next load the coach sees "access turned off"; every direct query returns zero rows. Pinned by probe step `--expect-revoked` in Task 9.
5. **Someone else registers with the coach's email first and never confirms it** → no access. Pinned by `current_confirmed_email()` in Task 1; manual check in Task 9 (and a Supabase Auth setting check, since auto-confirm would defeat it).

---

## File Structure

| File | Responsibility |
|---|---|
| `supabase-coach-access.sql` (create) | All database changes for this feature. Run once in Supabase SQL editor. |
| `scripts/coach-probe.mjs` (create) | Logs in as owner and coach, asserts what the coach can/can't read/write. |
| `src/constants/coachSections.ts` (create) | Section keys, labels, path→section map, `canViewPath`, `firstSharedPath`. Pure. |
| `src/constants/coachSections.test.ts` (create) | Vitest tests for the above. |
| `src/context/ViewContext.tsx` (create) | Decides owner/coach mode; loading + "access off" screens; `useView()`. |
| `src/hooks/useSupabaseList.ts` (modify) | Load by `journalOwnerId`; no-op writes when `readOnly`. |
| `src/hooks/useSupabaseSingleton.ts` (modify) | Coach mode loads via `get_shared_settings`; no-op writes. |
| `src/App.tsx` (modify) | Wrap in `ViewProvider`; skip `MigrationGate` for coach. |
| `src/components/layout/AppLayout.tsx`, `Sidebar.tsx` (modify) | Coach banner, filtered nav, Not-shared guard, `/` redirect. |
| Shared pages (modify) | Hide edit controls when `readOnly`; Apex page skips password gate for coach. |
| `src/components/settings/CoachAccessCard.tsx` (create) | Owner invite/sections/revoke/restore/remove UI. |
| `src/hooks/useTradeComments.ts` (create) | Load/add/edit/delete comments for one trade; mark read. |
| `src/hooks/useUnreadCommentTradeIds.ts` (create) | Set of trade ids with unread coach comments (owner). |
| `src/components/trade/CoachFeedback.tsx` (create) | Comments panel on the trade detail page. |
| `src/components/trade/TradeRow.tsx` (modify) | Unread marker; hide Edit link for coach. |

---

### Task 1: Database rules (tables, functions, policies)

**Files:**
- Create: `supabase-coach-access.sql`
- Modify: `docs/superpowers/specs/2026-10-29-coach-access-design.md` (settings deviation)

**Interfaces:**
- Produces (SQL, used by app tasks):
  - table `coach_access(owner_id uuid pk, owner_email text, coach_email text, sections text[], active bool, created_at, updated_at)`
  - table `trade_comments(id uuid, owner_id uuid, trade_id uuid, author_id uuid, body text, read_by_owner bool, created_at, updated_at)`
  - `rpc get_shared_settings(p_owner uuid) → jsonb | null`
  - `rpc mark_trade_comments_read(p_trade uuid) → void`

- [ ] **Step 1: Write the migration file**

`supabase-coach-access.sql`:

```sql
-- Coach Access: one coach can view selected sections of an owner's journal
-- and comment on trades. Run once in the Supabase SQL Editor.

-- ===== Tables =====
create table if not exists public.coach_access (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  owner_email text not null,
  coach_email text not null,
  sections text[] not null default '{dashboard,live_trading,trade_details,calendar,journal,playbook,apex_accounts}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint coach_email_lowercase check (coach_email = lower(coach_email))
);
alter table public.coach_access enable row level security;

create table if not exists public.trade_comments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  trade_id uuid not null references public.trades(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  read_by_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.trade_comments enable row level security;
create index if not exists idx_trade_comments_trade on public.trade_comments(trade_id);
create index if not exists idx_trade_comments_owner_unread on public.trade_comments(owner_id) where not read_by_owner;

-- ===== Helper functions (security definer: they read tables the caller can't) =====
create or replace function public.current_confirmed_email() returns text
language sql stable security definer set search_path = public, auth as $$
  select lower(email) from auth.users
  where id = auth.uid() and email_confirmed_at is not null
$$;

create or replace function public.coach_can_view_any(p_owner uuid, p_sections text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_access ca
    where ca.owner_id = p_owner
      and ca.active
      and ca.sections && p_sections
      and ca.coach_email = public.current_confirmed_email()
  )
$$;

create or replace function public.coach_can_view(p_owner uuid, p_section text) returns boolean
language sql stable security definer set search_path = public as $$
  select public.coach_can_view_any(p_owner, array[p_section])
$$;

create or replace function public.is_backtest_trade(p_owner uuid, p_data jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_data->>'sessionId', '') <> ''
     and exists (
       select 1 from public.backtest_sessions b
       where b.user_id = p_owner and b.id::text = p_data->>'sessionId'
     )
$$;

-- Trade sections: any of these being shared lets the coach read (non-backtest) trades.
create or replace function public.coach_can_view_trade_row(p_owner uuid, p_data jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select public.coach_can_view_any(p_owner, array['dashboard','live_trading','trade_details','calendar'])
     and not public.is_backtest_trade(p_owner, p_data)
$$;

create or replace function public.coach_can_comment_on_trade(p_trade uuid, p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select public.coach_can_view(p_owner, 'trade_details')
     and exists (
       select 1 from public.trades t
       where t.id = p_trade and t.user_id = p_owner
         and not public.is_backtest_trade(t.user_id, t.data)
     )
$$;

create or replace function public.coach_can_view_screenshot(p_name text) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare
  parts text[] := string_to_array(p_name, '/');
begin
  if coalesce(array_length(parts, 1), 0) < 3 then
    return false;
  end if;
  if parts[2] = 'trades' then
    return exists (
      select 1 from public.trades t
      where t.id::text = parts[3] and t.user_id::text = parts[1]
        and public.coach_can_view_trade_row(t.user_id, t.data)
    );
  elsif parts[2] = 'playbook_entries' then
    return exists (
      select 1 from public.coach_access ca
      where ca.owner_id::text = parts[1]
        and public.coach_can_view(ca.owner_id, 'playbook')
    );
  end if;
  return false;
end
$$;

-- Settings for a coach, minus the Funded Accounts password hash.
create or replace function public.get_shared_settings(p_owner uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select us.data - 'fundedAccountsPasswordHash'
  from public.user_settings us
  where us.user_id = p_owner
    and exists (
      select 1 from public.coach_access ca
      where ca.owner_id = p_owner and ca.active
        and ca.coach_email = public.current_confirmed_email()
    )
$$;

-- Owner marks coach comments on one of their trades as read.
create or replace function public.mark_trade_comments_read(p_trade uuid) returns void
language sql volatile security definer set search_path = public as $$
  update public.trade_comments
  set read_by_owner = true
  where trade_id = p_trade and owner_id = auth.uid() and not read_by_owner
$$;

-- ===== coach_access policies =====
create policy "Owner manages coach access" on public.coach_access
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "Coach reads own coach access row" on public.coach_access
  for select using (coach_email = public.current_confirmed_email());

-- ===== Coach read policies on journal tables (existing owner policies untouched) =====
create policy "Coach reads shared trades" on public.trades
  for select using (public.coach_can_view_trade_row(user_id, data));
create policy "Coach reads shared live sessions" on public.live_trading_sessions
  for select using (public.coach_can_view(user_id, 'live_trading'));
create policy "Coach reads shared journal entries" on public.journal_entries
  for select using (public.coach_can_view(user_id, 'journal'));
create policy "Coach reads shared habit definitions" on public.habit_definitions
  for select using (public.coach_can_view(user_id, 'journal'));
create policy "Coach reads shared habit badges" on public.habit_badges
  for select using (public.coach_can_view(user_id, 'journal'));
create policy "Coach reads shared habit checkins" on public.habit_checkins
  for select using (public.coach_can_view_any(user_id, array['journal','calendar']));
create policy "Coach reads shared playbook" on public.playbook_entries
  for select using (public.coach_can_view(user_id, 'playbook'));
create policy "Coach reads shared apex accounts" on public.apex_accounts
  for select using (public.coach_can_view(user_id, 'apex_accounts'));
-- NOTE: no coach policy on user_settings or backtest_sessions (on purpose).

create policy "Coach views shared screenshots" on storage.objects
  for select using (bucket_id = 'screenshots' and public.coach_can_view_screenshot(name));

-- ===== trade_comments policies =====
create policy "Owner reads comments on own trades" on public.trade_comments
  for select using (auth.uid() = owner_id);
create policy "Coach reads own comments" on public.trade_comments
  for select using (author_id = auth.uid() and public.coach_can_view(owner_id, 'trade_details'));
create policy "Coach adds comments" on public.trade_comments
  for insert with check (
    author_id = auth.uid()
    and read_by_owner = false
    and public.coach_can_comment_on_trade(trade_id, owner_id)
  );
create policy "Coach edits own comments" on public.trade_comments
  for update using (author_id = auth.uid() and public.coach_can_view(owner_id, 'trade_details'))
  with check (author_id = auth.uid());
create policy "Coach deletes own comments" on public.trade_comments
  for delete using (author_id = auth.uid() and public.coach_can_view(owner_id, 'trade_details'));

-- Only body/updated_at may be changed by a normal update (read flag goes through the function).
revoke update on public.trade_comments from authenticated, anon;
grant update (body, updated_at) on public.trade_comments to authenticated;
```

- [ ] **Step 2: Update the spec's settings rule**

In `docs/superpowers/specs/2026-10-29-coach-access-design.md`, replace the paragraph starting "`user_settings` is readable by an active coach" with:

```markdown
`user_settings` is **not** directly readable by the coach. Settings reach the coach through the security-definer function `get_shared_settings(owner)`, which returns the settings minus `fundedAccountsPasswordHash`. The Funded Accounts password gate is skipped in coach mode (the owner chose to share that section).
```

And in the "Access rules" list, replace the `user_settings:` bullet with `- user_settings: no coach policy (see get_shared_settings).`

- [ ] **Step 3: Run the migration**

This is the user's database. Ask the user to paste `supabase-coach-access.sql` into Supabase → SQL Editor → Run (or drive it via Claude in Chrome with their go-ahead). Expected: "Success. No rows returned".

- [ ] **Step 4: Verify it really exists**

Run in the SQL editor:

```sql
select tablename, policyname from pg_policies
where policyname ilike '%coach%' or tablename in ('coach_access','trade_comments')
order by tablename, policyname;
```

Expected: 16 rows — `apex_accounts`(1), `coach_access`(2), `habit_badges`(1), `habit_checkins`(1), `habit_definitions`(1), `journal_entries`(1), `live_trading_sessions`(1), `objects`(1), `playbook_entries`(1), `trade_comments`(5), `trades`(1). Also check Supabase → Authentication → Providers → Email: **"Confirm email" must be ON** (otherwise `email_confirmed_at` is set at signup and the confirmed-email check is meaningless). Report its state to the user.

- [ ] **Step 5: Commit**

```bash
git add supabase-coach-access.sql docs/superpowers/specs/2026-10-29-coach-access-design.md
git commit -m "Add coach access database rules"
```

---

### Task 2: Section map (pure logic) + Vitest

**Files:**
- Modify: `package.json` (add `vitest` dev dep + `test` script)
- Create: `src/constants/coachSections.ts`
- Test: `src/constants/coachSections.test.ts`

**Interfaces:**
- Produces:
  - `SECTION_KEYS: readonly SectionKey[]`, `type SectionKey`
  - `SECTION_LABELS: Record<SectionKey, string>`
  - `sectionForPath(path: string): SectionKey | null`
  - `canViewPath(path: string, mode: 'owner' | 'coach', shared: readonly SectionKey[]): boolean`
  - `firstSharedPath(shared: readonly SectionKey[]): string | null`
  - `SECTION_NAV_PATH: Record<SectionKey, string | null>` (`trade_details` → `null`, no nav item)

- [ ] **Step 1: Install Vitest**

```bash
npm install -D vitest@^3
npm pkg set scripts.test="vitest run"
```

- [ ] **Step 2: Write the failing tests**

`src/constants/coachSections.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SECTION_KEYS, sectionForPath, canViewPath, firstSharedPath } from './coachSections';

describe('sectionForPath', () => {
  it.each([
    ['/', 'dashboard'],
    ['/live-trading', 'live_trading'],
    ['/live-trading/abc-123', 'live_trading'],
    ['/trades/abc-123', 'trade_details'],
    ['/calendar', 'calendar'],
    ['/journal', 'journal'],
    ['/habits', 'journal'],
    ['/playbook', 'playbook'],
    ['/apex-accounts', 'apex_accounts'],
  ])('%s → %s', (path, section) => {
    expect(sectionForPath(path)).toBe(section);
  });

  it.each(['/analytics', '/mfe-mae', '/confluences', '/category-analytics', '/backtesting', '/backtesting/x', '/risk-calculator', '/settings', '/nope'])(
    '%s is never shareable',
    path => { expect(sectionForPath(path)).toBeNull(); },
  );
});

describe('canViewPath', () => {
  it('owner can view everything', () => {
    expect(canViewPath('/backtesting', 'owner', [])).toBe(true);
    expect(canViewPath('/settings', 'owner', [])).toBe(true);
  });
  it('coach can view a shared section', () => {
    expect(canViewPath('/trades/1', 'coach', ['trade_details'])).toBe(true);
  });
  it('coach cannot view an unshared section', () => {
    expect(canViewPath('/trades/1', 'coach', ['dashboard'])).toBe(false);
  });
  it('coach cannot view never-shareable pages even with everything shared', () => {
    expect(canViewPath('/analytics', 'coach', SECTION_KEYS)).toBe(false);
    expect(canViewPath('/settings', 'coach', SECTION_KEYS)).toBe(false);
  });
});

describe('firstSharedPath', () => {
  it('prefers the dashboard', () => {
    expect(firstSharedPath(SECTION_KEYS)).toBe('/');
  });
  it('skips to the next shared section with a page', () => {
    expect(firstSharedPath(['trade_details', 'calendar'])).toBe('/calendar');
  });
  it('returns null when only trade details (no nav page) is shared', () => {
    expect(firstSharedPath(['trade_details'])).toBeNull();
  });
  it('returns null when nothing is shared', () => {
    expect(firstSharedPath([])).toBeNull();
  });
});
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npm test`
Expected: FAIL — cannot resolve `./coachSections`.

- [ ] **Step 4: Implement**

`src/constants/coachSections.ts`:

```ts
export const SECTION_KEYS = [
  'dashboard',
  'live_trading',
  'trade_details',
  'calendar',
  'journal',
  'playbook',
  'apex_accounts',
] as const;

export type SectionKey = typeof SECTION_KEYS[number];

export const SECTION_LABELS: Record<SectionKey, string> = {
  dashboard: 'Dashboard',
  live_trading: 'Live Trading',
  trade_details: 'Trade Details',
  calendar: 'Calendar',
  journal: 'Journal / Habits',
  playbook: 'Playbook',
  apex_accounts: 'Funded Accounts',
};

/** Sidebar page for each section, in display order. Trade Details has no nav page. */
export const SECTION_NAV_PATH: Record<SectionKey, string | null> = {
  dashboard: '/',
  live_trading: '/live-trading',
  trade_details: null,
  calendar: '/calendar',
  journal: '/journal',
  playbook: '/playbook',
  apex_accounts: '/apex-accounts',
};

export function sectionForPath(path: string): SectionKey | null {
  if (path === '/') return 'dashboard';
  if (path === '/live-trading' || path.startsWith('/live-trading/')) return 'live_trading';
  if (path.startsWith('/trades/')) return 'trade_details';
  if (path === '/calendar') return 'calendar';
  if (path === '/journal' || path === '/habits') return 'journal';
  if (path === '/playbook') return 'playbook';
  if (path === '/apex-accounts') return 'apex_accounts';
  return null;
}

export function canViewPath(path: string, mode: 'owner' | 'coach', shared: readonly SectionKey[]): boolean {
  if (mode === 'owner') return true;
  const section = sectionForPath(path);
  return section !== null && shared.includes(section);
}

export function firstSharedPath(shared: readonly SectionKey[]): string | null {
  for (const key of SECTION_KEYS) {
    const path = SECTION_NAV_PATH[key];
    if (path && shared.includes(key)) return path;
  }
  return null;
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npm test`
Expected: PASS (all).

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json src/constants/coachSections.ts src/constants/coachSections.test.ts
git commit -m "Add coach section map with tests"
```

---

### Task 3: ViewContext (owner vs coach mode) + App wiring

**Files:**
- Create: `src/context/ViewContext.tsx`
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: `SectionKey`, `SECTION_KEYS` (Task 2); table `coach_access` (Task 1).
- Produces: `ViewProvider`, `useView(): { mode: 'owner' | 'coach'; journalOwnerId: string; ownerLabel: string; sharedSections: readonly SectionKey[]; readOnly: boolean }`

- [ ] **Step 1: Create the context**

`src/context/ViewContext.tsx`:

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import { SECTION_KEYS, type SectionKey } from '../constants/coachSections';

export interface ViewValue {
  mode: 'owner' | 'coach';
  journalOwnerId: string;
  ownerLabel: string;
  sharedSections: readonly SectionKey[];
  readOnly: boolean;
}

type ViewState =
  | { status: 'loading' }
  | { status: 'ready'; value: ViewValue }
  | { status: 'revoked'; ownerLabel: string };

const ViewContext = createContext<ViewValue | null>(null);

export function ViewProvider({ children }: { children: ReactNode }) {
  const { user, signOut } = useAuth();
  const [state, setState] = useState<ViewState>({ status: 'loading' });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const ownerView: ViewValue = {
      mode: 'owner',
      journalOwnerId: user.id,
      ownerLabel: user.email ?? '',
      sharedSections: SECTION_KEYS,
      readOnly: false,
    };

    async function detect() {
      const email = (user!.email ?? '').toLowerCase();
      const { data, error } = await supabase
        .from('coach_access')
        .select('owner_id, owner_email, sections, active')
        .eq('coach_email', email)
        .neq('owner_id', user!.id)
        .maybeSingle();

      if (cancelled) return;
      if (error || !data) {
        setState({ status: 'ready', value: ownerView });
        return;
      }
      if (!data.active) {
        setState({ status: 'revoked', ownerLabel: data.owner_email });
        return;
      }
      setState({
        status: 'ready',
        value: {
          mode: 'coach',
          journalOwnerId: data.owner_id,
          ownerLabel: data.owner_email,
          sharedSections: (data.sections as string[]).filter((s): s is SectionKey =>
            (SECTION_KEYS as readonly string[]).includes(s)),
          readOnly: true,
        },
      });
    }

    detect();
    return () => { cancelled = true; };
  }, [user]);

  if (state.status === 'loading') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  if (state.status === 'revoked') {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-lg font-semibold text-slate-50">Access turned off</h1>
          <p className="text-sm text-slate-400">
            Your access to {state.ownerLabel}'s journal has been turned off.
          </p>
          <button onClick={signOut} className="text-sm text-blue-400 hover:text-blue-300">Sign out</button>
        </div>
      </div>
    );
  }

  return <ViewContext.Provider value={state.value}>{children}</ViewContext.Provider>;
}

export function useView(): ViewValue {
  const context = useContext(ViewContext);
  if (!context) throw new Error('useView must be used within ViewProvider');
  return context;
}
```

- [ ] **Step 2: Wire into App**

In `src/App.tsx` add imports:

```tsx
import { ViewProvider, useView } from './context/ViewContext';
import type { ReactNode } from 'react';
```

Add above `function AuthGate()`:

```tsx
/** Local-data migration only ever runs for the owner's own journal. */
function OwnerMigrationGate({ children }: { children: ReactNode }) {
  const { readOnly } = useView();
  if (readOnly) return <>{children}</>;
  return <MigrationGate>{children}</MigrationGate>;
}
```

In `AuthGate`'s final `return`, replace the outer `<MigrationGate>` … `</MigrationGate>` with `<ViewProvider><OwnerMigrationGate>` … `</OwnerMigrationGate></ViewProvider>` (children unchanged).

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: succeeds. (`useView` is consumed by later tasks.)

- [ ] **Step 4: Manual check as owner**

Ensure the dev server is running (check port 5173 first: `lsof -i :5173`; only start `npx vite dev` if nothing is listening). Load the app logged in as the owner — journal looks exactly as before.

- [ ] **Step 5: Commit**

```bash
git add src/context/ViewContext.tsx src/App.tsx
git commit -m "Add owner/coach view context"
```

---

### Task 4: Data hooks load the viewed journal and are read-only for coach

**Files:**
- Modify: `src/hooks/useSupabaseList.ts`
- Modify: `src/hooks/useSupabaseSingleton.ts`

**Interfaces:**
- Consumes: `useView()` (Task 3); `rpc get_shared_settings` (Task 1).
- Produces: unchanged hook signatures. In coach mode setters silently do nothing.

- [ ] **Step 1: `useSupabaseList`**

Add import `import { useView } from '../context/ViewContext';` and after `const { user } = useAuth();` add:

```ts
  const { journalOwnerId, readOnly } = useView();
```

In the load effect replace `.eq('user_id', user!.id);` with `.eq('user_id', journalOwnerId);` and change the dependency list `}, [user, table]);` to `}, [user, table, journalOwnerId]);`.

In `updateItems`, replace `if (!loadedRef.current) return;` with:

```ts
    // Coach view is read-only: never change or persist the owner's data
    if (!loadedRef.current || readOnly) return;
```

and its dependency list `}, [persist]);` with `}, [persist, readOnly]);`.

- [ ] **Step 2: `useSupabaseSingleton`**

Add import `import { useView } from '../context/ViewContext';`, and after `const { user } = useAuth();`:

```ts
  const { journalOwnerId, readOnly } = useView();
```

Replace the body of `load()`'s `try { … }` block with:

```ts
        const { data, error } = readOnly
          ? await supabase.rpc('get_shared_settings', { p_owner: journalOwnerId })
              .then(r => ({ data: r.data ? { data: r.data } : null, error: r.error }))
          : await supabase
              .from('user_settings')
              .select('data')
              .eq('user_id', user!.id)
              .maybeSingle();

        if (!cancelled) {
          if (!error && data?.data) {
            setValue({ ...defaultValue, ...data.data as T });
          }
          loadedRef.current = true;
          setLoading(false);
        }
```

Change the effect deps to `}, [user, journalOwnerId, readOnly]);`. In `updateValue` replace `if (!loadedRef.current) return;` with `if (!loadedRef.current || readOnly) return;` and deps to `}, [persist, readOnly]);`.

- [ ] **Step 3: Build + lint**

Run: `npm run build && npm run lint`
Expected: both pass.

- [ ] **Step 4: Owner regression check**

In the browser as owner: edit a trade note and save, refresh — change persists. Toggle a dashboard widget in the customizer, refresh — persists.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/useSupabaseList.ts src/hooks/useSupabaseSingleton.ts
git commit -m "Load viewed journal in data hooks; read-only in coach mode"
```

---

### Task 5: Coach navigation — banner, filtered sidebar, Not-shared guard

**Files:**
- Modify: `src/components/layout/AppLayout.tsx`
- Modify: `src/components/layout/Sidebar.tsx`

**Interfaces:**
- Consumes: `useView()`; `canViewPath`, `firstSharedPath`, `sectionForPath` (Task 2).

- [ ] **Step 1: AppLayout guard + banner**

In `src/components/layout/AppLayout.tsx` change the router import to `import { Outlet, useLocation, Navigate } from 'react-router-dom';` and add:

```tsx
import { useView } from '../../context/ViewContext';
import { canViewPath, firstSharedPath } from '../../constants/coachSections';
import { Eye } from 'lucide-react';
```

Inside `AppLayout` after `const { show, dismiss, unseen } = useWhatsNew();` add:

```tsx
  const view = useView();
  const allowed = canViewPath(path, view.mode, view.sharedSections);
  if (!allowed && path === '/') {
    const home = firstSharedPath(view.sharedSections);
    if (home) return <Navigate to={home} replace />;
  }
```

Replace `<TopBar title={title} />` with:

```tsx
        {view.mode === 'coach' && (
          <div className="flex items-center gap-2 px-6 py-2 bg-amber-500/10 border-b border-amber-500/30 text-sm text-amber-300">
            <Eye size={16} /> Viewing {view.ownerLabel}'s journal — read-only
          </div>
        )}
        <TopBar title={title} />
```

Replace `<Outlet />` with:

```tsx
          {allowed ? <Outlet /> : (
            <div className="py-24 text-center text-sm text-slate-400">This section isn't shared with you.</div>
          )}
```

Keep the `WhatsNewModal` owner-only: wrap it as `{view.mode === 'owner' && <WhatsNewModal … />}`.

- [ ] **Step 2: Sidebar filtering**

In `src/components/layout/Sidebar.tsx` add:

```tsx
import { useView } from '../../context/ViewContext';
import { canViewPath } from '../../constants/coachSections';
```

In `Sidebar()` after `const { signOut, user } = useAuth();`:

```tsx
  const view = useView();
  const visibleItems = navItems.filter(item => canViewPath(item.to, view.mode, view.sharedSections));
```

and change `{navItems.map(` to `{visibleItems.map(`.

- [ ] **Step 3: Build**

Run: `npm run build`
Expected: passes.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/AppLayout.tsx src/components/layout/Sidebar.tsx
git commit -m "Coach banner, filtered sidebar and not-shared guard"
```

---

### Task 6: Hide edit controls for coach; Apex gate skipped for coach

**Files:**
- Modify: `src/pages/TradeDetailPage.tsx`, `src/components/trade/TradeRow.tsx`, `src/pages/LiveTradingPage.tsx`, `src/pages/LiveTradingSessionPage.tsx`, `src/pages/DashboardPage.tsx`, `src/pages/CalendarPage.tsx`, `src/pages/HabitsPage.tsx`, `src/pages/PlaybookPage.tsx`, `src/pages/ApexAccountsPage.tsx`

**Interfaces:**
- Consumes: `useView()` → `readOnly`.

In **each** file below add `import { useView } from '../context/ViewContext';` (`'../../context/ViewContext'` for `TradeRow.tsx`) and, at the top of the component, `const { readOnly } = useView();`. (Hiding is cosmetic; Task 1 rules + Task 4 no-ops are the real guard.)

- [ ] **Step 1: TradeDetailPage**

- `const [editing, setEditing] = useState(searchParams.has('edit'));` → `const [editing, setEditing] = useState(searchParams.has('edit') && !readOnly);` (move `const { readOnly } = useView();` above it).
- `{!editing && (` → `{!editing && !readOnly && (`.

- [ ] **Step 2: TradeRow** — wrap the separator span and Edit link:

```tsx
        {!readOnly && (
          <>
            <span className="text-slate-600 mx-1">·</span>
            <Link
              to={`/trades/${trade.id}?edit`}
              className="text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              Edit
            </Link>
          </>
        )}
```

- [ ] **Step 3: LiveTradingPage**

- Wrap the `<Button size="sm" onClick={() => setShowForm(!showForm)}>…</Button>` in `{!readOnly && ( … )}`.
- Wrap the session-card delete `<button onClick={e => { e.preventDefault(); … handleDelete(…) }}>…</button>` in `{!readOnly && ( … )}`.
- Change `{unsortedCount > 0 && (` → `{unsortedCount > 0 && !readOnly && (`.

- [ ] **Step 4: LiveTradingSessionPage** (both components that use these controls need their own `const { readOnly } = useView();`)

- Header pencil: `<button onClick={startEditing} …><Pencil size={14} /></button>` → wrap in `{!readOnly && ( … )}`.
- Wrap the "Add Trade" `<button>` and the "Paste Trade" `<button>` together in `{!readOnly && (<> … </>)}`.
- `{selectedIds.size > 0 && (` → `{selectedIds.size > 0 && !readOnly && (`.
- Empty state description: `description={readOnly ? 'No trades in this session yet.' : "Click 'Add Trade' or 'Paste Trade' to get started."}`.

- [ ] **Step 5: DashboardPage and CalendarPage**

- In both, the `EmptyState` `action={…}` becomes `action={readOnly ? undefined : ( <Link …>…</Link> )}`.
- DashboardPage: wrap the `title="Customize widgets"` `<button>` in `{!readOnly && ( … )}`.

- [ ] **Step 6: HabitsPage**

- Replace the `tabs` array usage: render `tabs.filter(t => !readOnly || t.key !== 'habits')` in the tab bar `.map(`.
- Wrap `<UnifiedDailyForm … />` as:

```tsx
              <fieldset disabled={readOnly} className="contents">
                <UnifiedDailyForm
                  key={selectedDate + (existingCheckIn?.id ?? '') + (existingJournalEntry?.id ?? '')}
                  date={selectedDate}
                  existingCheckIn={existingCheckIn}
                  existingJournalEntry={existingJournalEntry}
                />
              </fieldset>
```

- [ ] **Step 7: PlaybookPage**

- Wrap `<Button onClick={handleCreate}>…Add Strategy</Button>` in `{!readOnly && ( … )}`.
- Modal title: `title={readOnly ? 'Strategy' : editingEntry ? 'Edit Strategy' : 'New Strategy'}`.
- Wrap `<PlaybookEditor … />` in `<fieldset disabled={readOnly}>` … `</fieldset>`.
- `{editingEntry && (` (delete block) → `{editingEntry && !readOnly && (`.

- [ ] **Step 8: ApexAccountsPage**

- Extract the page body: rename the current JSX between `<ApexPasswordGate …>` and `</ApexPasswordGate>` into `const content = ( <div className="space-y-6 max-w-5xl"> … </div> );` and return:

```tsx
  if (readOnly) return content;  // owner chose to share this section; coach has no password
  return (
    <ApexPasswordGate
      onLockStateChange={(val) => { setUnlocked(val); if (val) setRequestLock(false); }}
      showChangePassword={showChangePassword}
      onChangePasswordDone={() => setShowChangePassword(false)}
      requestLock={requestLock}
    >
      {content}
    </ApexPasswordGate>
  );
```

- Wrap the header "Add Account" `<Button>` in `{!readOnly && ( … )}`.
- Wrap the active-card `{/* Edit/status controls */}` `<div className="absolute bottom-3 right-4 …">…</div>` in `{!readOnly && ( … )}`.
- Empty state: `{accounts.length === 0 && !showForm && (` keep, but wrap its `<Button onClick={() => setShowForm(true)}>` in `{!readOnly && ( … )}`.
- Inactive rows: wrap `<div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">…</div>` in `{!readOnly && ( … )}`.

- [ ] **Step 9: Build + lint**

Run: `npm run build && npm run lint`
Expected: pass.

- [ ] **Step 10: Commit**

```bash
git add src/pages src/components/trade/TradeRow.tsx
git commit -m "Hide edit controls in coach view"
```

---

### Task 7: Owner's Coach Access card in Settings

**Files:**
- Create: `src/components/settings/CoachAccessCard.tsx`
- Modify: `src/pages/SettingsPage.tsx` (render card first)

**Interfaces:**
- Consumes: table `coach_access` (Task 1); `SECTION_KEYS`, `SECTION_LABELS` (Task 2); `Card`, `Button`, `Input`, `Modal` UI components.

- [ ] **Step 1: Create the card**

`src/components/settings/CoachAccessCard.tsx`:

```tsx
import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { SECTION_KEYS, SECTION_LABELS, type SectionKey } from '../../constants/coachSections';
import Card from '../ui/Card';
import Button from '../ui/Button';
import Input from '../ui/Input';
import Modal from '../ui/Modal';

interface CoachAccessRow {
  coach_email: string;
  sections: SectionKey[];
  active: boolean;
}

export default function CoachAccessCard() {
  const { user } = useAuth();
  const [row, setRow] = useState<CoachAccessRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState('');
  const [confirmRemove, setConfirmRemove] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from('coach_access')
      .select('coach_email, sections, active')
      .eq('owner_id', user.id)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) toast.error(`Failed to load coach access: ${error.message}`);
        setRow((data as CoachAccessRow | null) ?? null);
        setLoading(false);
      });
  }, [user]);

  const save = async (changes: Partial<CoachAccessRow>) => {
    if (!user || !row) return;
    const next = { ...row, ...changes };
    const { error } = await supabase
      .from('coach_access')
      .update({ ...changes, updated_at: new Date().toISOString() })
      .eq('owner_id', user.id);
    if (error) {
      toast.error(`Failed to save: ${error.message}`);
      return;
    }
    setRow(next);
  };

  const invite = async () => {
    if (!user) return;
    const coachEmail = email.trim().toLowerCase();
    if (!coachEmail.includes('@')) { toast.error('Enter a valid email'); return; }
    if (coachEmail === (user.email ?? '').toLowerCase()) { toast.error("That's your own email"); return; }
    const newRow: CoachAccessRow = { coach_email: coachEmail, sections: [...SECTION_KEYS], active: true };
    const { error } = await supabase
      .from('coach_access')
      .insert({ owner_id: user.id, owner_email: user.email ?? '', ...newRow });
    if (error) { toast.error(`Failed to invite: ${error.message}`); return; }
    setRow(newRow);
    setEmail('');
    toast.success('Coach invited');
  };

  const remove = async () => {
    if (!user) return;
    const { error } = await supabase.from('coach_access').delete().eq('owner_id', user.id);
    if (error) { toast.error(`Failed to remove: ${error.message}`); return; }
    setRow(null);
    setConfirmRemove(false);
    toast.success('Coach removed');
  };

  const toggleSection = (key: SectionKey) => {
    if (!row) return;
    const sections = row.sections.includes(key)
      ? row.sections.filter(s => s !== key)
      : SECTION_KEYS.filter(s => s === key || row.sections.includes(s));
    save({ sections });
  };

  return (
    <Card>
      <h3 className="text-sm font-medium text-slate-300 mb-1">Coach Access</h3>
      <p className="text-xs text-slate-500 mb-4">
        Your coach signs up for the journal with this exact email, then sees a read-only view of the sections you tick and can comment on trades.
        Analytics, MFE/MAE, Category Analytics, Backtesting, Risk Calculator and Settings are never shared.
      </p>

      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : !row ? (
        <div className="flex items-end gap-2 max-w-md">
          <div className="flex-1">
            <Input label="Coach email" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="coach@example.com" />
          </div>
          <Button onClick={invite}>Invite</Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center gap-3 text-sm">
            <span className="text-slate-200">{row.coach_email}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${row.active ? 'bg-emerald-500/20 text-emerald-400' : 'bg-slate-700 text-slate-400'}`}>
              {row.active ? 'Access on' : 'Access off'}
            </span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {SECTION_KEYS.map(key => (
              <label key={key} className="flex items-center gap-2 text-sm text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={row.sections.includes(key)}
                  onChange={() => toggleSection(key)}
                  className="rounded border-slate-600 bg-slate-800"
                />
                {SECTION_LABELS[key]}
              </label>
            ))}
          </div>

          <div className="flex gap-2">
            {row.active ? (
              <Button variant="danger" size="sm" onClick={() => save({ active: false })}>Revoke access</Button>
            ) : (
              <>
                <Button size="sm" onClick={() => save({ active: true })}>Restore access</Button>
                <Button variant="ghost" size="sm" onClick={() => setConfirmRemove(true)}>Remove coach</Button>
              </>
            )}
          </div>
        </div>
      )}

      <Modal open={confirmRemove} onOpenChange={setConfirmRemove} title="Remove coach?">
        <p className="text-sm text-slate-300 mb-4">
          This deletes {row?.coach_email}'s access settings. Their comments on your trades stay. You can invite a coach again later.
        </p>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" size="sm" onClick={() => setConfirmRemove(false)}>Cancel</Button>
          <Button variant="danger" size="sm" onClick={remove}>Remove</Button>
        </div>
      </Modal>
    </Card>
  );
}
```

- [ ] **Step 2: Render it**

In `src/pages/SettingsPage.tsx` add `import CoachAccessCard from '../components/settings/CoachAccessCard';` and insert `<CoachAccessCard />` as the first child of `<div className="space-y-6 max-w-5xl">` in `SettingsPage`'s return (just above `{/* Display Mode */}`).

- [ ] **Step 3: Build + manual check**

Run: `npm run build && npm run lint` → pass. In the browser (owner): Settings → invite a test email → all seven boxes ticked, "Access on". Untick one, refresh → stays unticked. Revoke → "Access off" + Restore/Remove. Restore → back on. Leave it invited for Task 9.

Verify in Supabase SQL editor: `select owner_email, coach_email, sections, active from public.coach_access;` shows the row.

- [ ] **Step 4: Commit**

```bash
git add src/components/settings/CoachAccessCard.tsx src/pages/SettingsPage.tsx
git commit -m "Add Coach Access card to Settings"
```

---

### Task 8: Trade comments (coach writes, owner reads + unread marker)

**Files:**
- Create: `src/hooks/useTradeComments.ts`
- Create: `src/hooks/useUnreadCommentTradeIds.ts`
- Create: `src/components/trade/CoachFeedback.tsx`
- Modify: `src/pages/TradeDetailPage.tsx`, `src/components/trade/TradeRow.tsx`, `src/pages/LiveTradingSessionPage.tsx`

**Interfaces:**
- Consumes: table `trade_comments`, `rpc mark_trade_comments_read` (Task 1); `useView()`.
- Produces:
  - `useTradeComments(tradeId: string): { comments: TradeComment[]; loading: boolean; add(body: string): Promise<boolean>; edit(id: string, body: string): Promise<boolean>; remove(id: string): Promise<void> }`
  - `type TradeComment = { id: string; trade_id: string; author_id: string; body: string; read_by_owner: boolean; created_at: string; updated_at: string }`
  - `useUnreadCommentTradeIds(): Set<string>`
  - `TradeRow` new optional prop `hasUnreadComments?: boolean`

- [ ] **Step 1: `useTradeComments`**

```ts
import { useCallback, useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { useView } from '../context/ViewContext';

export interface TradeComment {
  id: string;
  trade_id: string;
  author_id: string;
  body: string;
  read_by_owner: boolean;
  created_at: string;
  updated_at: string;
}

export function useTradeComments(tradeId: string) {
  const { user } = useAuth();
  const { mode, journalOwnerId } = useView();
  const [comments, setComments] = useState<TradeComment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    supabase
      .from('trade_comments')
      .select('*')
      .eq('trade_id', tradeId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) toast.error(`Failed to load comments: ${error.message}`);
        setComments((data as TradeComment[]) ?? []);
        setLoading(false);
        // Owner opening the trade marks coach feedback as read
        if (mode === 'owner' && data?.some(c => !c.read_by_owner)) {
          supabase.rpc('mark_trade_comments_read', { p_trade: tradeId });
        }
      });
    return () => { cancelled = true; };
  }, [tradeId, mode]);

  const add = useCallback(async (body: string) => {
    if (!user || !body.trim()) return false;
    const { data, error } = await supabase
      .from('trade_comments')
      .insert({ trade_id: tradeId, owner_id: journalOwnerId, author_id: user.id, body: body.trim() })
      .select()
      .single();
    if (error) { toast.error(`Failed to save comment: ${error.message}`); return false; }
    setComments(prev => [...prev, data as TradeComment]);
    return true;
  }, [user, tradeId, journalOwnerId]);

  const edit = useCallback(async (id: string, body: string) => {
    if (!body.trim()) return false;
    const updated_at = new Date().toISOString();
    const { error } = await supabase.from('trade_comments').update({ body: body.trim(), updated_at }).eq('id', id);
    if (error) { toast.error(`Failed to update comment: ${error.message}`); return false; }
    setComments(prev => prev.map(c => (c.id === id ? { ...c, body: body.trim(), updated_at } : c)));
    return true;
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from('trade_comments').delete().eq('id', id);
    if (error) { toast.error(`Failed to delete comment: ${error.message}`); return; }
    setComments(prev => prev.filter(c => c.id !== id));
  }, []);

  return { comments, loading, add, edit, remove };
}
```

- [ ] **Step 2: `useUnreadCommentTradeIds`**

```ts
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useView } from '../context/ViewContext';

/** Trade ids with coach comments the owner hasn't opened yet. Always empty for a coach. */
export function useUnreadCommentTradeIds(): Set<string> {
  const { mode, journalOwnerId } = useView();
  const [ids, setIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (mode !== 'owner') return;
    let cancelled = false;
    supabase
      .from('trade_comments')
      .select('trade_id')
      .eq('owner_id', journalOwnerId)
      .eq('read_by_owner', false)
      .then(({ data }) => {
        if (!cancelled && data) setIds(new Set(data.map(r => r.trade_id as string)));
      });
    return () => { cancelled = true; };
  }, [mode, journalOwnerId]);

  return ids;
}
```

- [ ] **Step 3: `CoachFeedback` panel**

```tsx
import { useState } from 'react';
import { format } from 'date-fns';
import { MessageSquare, Pencil, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useView } from '../../context/ViewContext';
import { useTradeComments, type TradeComment } from '../../hooks/useTradeComments';
import Button from '../ui/Button';

const textareaClass = 'w-full min-h-[80px] px-3 py-2 bg-slate-900 border border-slate-600 rounded-lg text-sm text-slate-50 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500';

function CommentItem({ comment, canEdit, onEdit, onDelete }: {
  comment: TradeComment;
  canEdit: boolean;
  onEdit: (id: string, body: string) => Promise<boolean>;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);

  return (
    <div className="p-3 bg-slate-900/50 border border-slate-700 rounded-lg">
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-slate-500">
          Coach · {format(new Date(comment.created_at), 'MMM d, yyyy h:mm a')}
          {comment.updated_at !== comment.created_at && ' (edited)'}
        </span>
        {canEdit && !editing && (
          <div className="flex gap-1">
            <button onClick={() => setEditing(true)} className="p-1 text-slate-500 hover:text-blue-400"><Pencil size={13} /></button>
            <button onClick={() => onDelete(comment.id)} className="p-1 text-slate-500 hover:text-rose-400"><Trash2 size={13} /></button>
          </div>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          <textarea value={draft} onChange={e => setDraft(e.target.value)} className={textareaClass} />
          <div className="flex gap-2">
            <Button size="sm" onClick={async () => { if (await onEdit(comment.id, draft)) setEditing(false); }}>Save</Button>
            <Button size="sm" variant="ghost" onClick={() => { setDraft(comment.body); setEditing(false); }}>Cancel</Button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-slate-200 whitespace-pre-wrap">{comment.body}</p>
      )}
    </div>
  );
}

export default function CoachFeedback({ tradeId }: { tradeId: string }) {
  const { user } = useAuth();
  const { mode } = useView();
  const { comments, loading, add, edit, remove } = useTradeComments(tradeId);
  const [draft, setDraft] = useState('');
  const isCoach = mode === 'coach';

  if (!isCoach && !loading && comments.length === 0) return null;

  return (
    <div className="bg-slate-800 border border-slate-700 rounded-xl p-4 space-y-3">
      <h3 className="text-sm font-semibold text-slate-300 flex items-center gap-2">
        <MessageSquare size={16} /> Coach Feedback
      </h3>
      {loading ? (
        <div className="text-sm text-slate-500">Loading...</div>
      ) : (
        <>
          {comments.map(c => (
            <CommentItem key={c.id} comment={c} canEdit={isCoach && c.author_id === user?.id} onEdit={edit} onDelete={remove} />
          ))}
          {isCoach && (
            <div className="space-y-2">
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                placeholder="Leave feedback on this trade..."
                className={textareaClass}
              />
              <Button size="sm" disabled={!draft.trim()} onClick={async () => { if (await add(draft)) setDraft(''); }}>
                Add Comment
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Show it on the trade page**

In `src/pages/TradeDetailPage.tsx` add `import CoachFeedback from '../components/trade/CoachFeedback';` and replace

```tsx
      ) : (
        <TradeDetail trade={trade} />
      )}
```

with

```tsx
      ) : (
        <>
          <TradeDetail trade={trade} />
          {!isBacktestTrade && <CoachFeedback tradeId={trade.id} />}
        </>
      )}
```

- [ ] **Step 5: Unread marker in trade log**

`TradeRow.tsx`: add `hasUnreadComments?: boolean;` to `TradeRowProps`, destructure it, add `import { MessageSquare } from 'lucide-react';`, and inside the date cell's `<div className="flex items-center gap-1.5">` append as the last child:

```tsx
          {hasUnreadComments && (
            <span title="New coach feedback" className="text-amber-400"><MessageSquare size={13} /></span>
          )}
```

`LiveTradingSessionPage.tsx`: in the trades-tab component add `import { useUnreadCommentTradeIds } from '../hooks/useUnreadCommentTradeIds';` and `const unreadCommentIds = useUnreadCommentTradeIds();`, then pass `hasUnreadComments={unreadCommentIds.has(trade.id)}` to `<TradeRow … />`.

- [ ] **Step 6: Build + lint**

Run: `npm run build && npm run lint && npm test`
Expected: all pass.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/useTradeComments.ts src/hooks/useUnreadCommentTradeIds.ts src/components/trade/CoachFeedback.tsx src/pages/TradeDetailPage.tsx src/components/trade/TradeRow.tsx src/pages/LiveTradingSessionPage.tsx
git commit -m "Add coach comments on trades with unread marker"
```

---

### Task 9: Database-rule probe + end-to-end verification

**Files:**
- Create: `scripts/coach-probe.mjs`

**Interfaces:**
- Consumes: everything above. Env: `OWNER_EMAIL`, `OWNER_PASSWORD`, `COACH_EMAIL`, `COACH_PASSWORD` (typed by the user in their own terminal with `!` — never written to files). Reads Supabase URL + anon key from `.env.local`.

- [ ] **Step 1: Write the probe**

`scripts/coach-probe.mjs`:

```js
// Checks what a coach account can and can't do against the real database.
// Usage: OWNER_EMAIL=… OWNER_PASSWORD=… COACH_EMAIL=… COACH_PASSWORD=… node scripts/coach-probe.mjs [--expect-revoked]
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim()]),
);
const expectRevoked = process.argv.includes('--expect-revoked');
const mk = () => createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

const owner = mk();
const coach = mk();
const o = await owner.auth.signInWithPassword({ email: process.env.OWNER_EMAIL, password: process.env.OWNER_PASSWORD });
const c = await coach.auth.signInWithPassword({ email: process.env.COACH_EMAIL, password: process.env.COACH_PASSWORD });
if (o.error || c.error) { console.error('Login failed', o.error?.message, c.error?.message); process.exit(1); }
const ownerId = o.data.user.id;

// Owner-side ground truth
const { data: access } = await owner.from('coach_access').select('*').eq('owner_id', ownerId).single();
const shared = expectRevoked ? [] : (access?.active ? access.sections : []);
const { data: backtests } = await owner.from('backtest_sessions').select('id').eq('user_id', ownerId);
const backtestIds = new Set((backtests ?? []).map(b => b.id));
const { data: ownerTrades } = await owner.from('trades').select('id, data, setup_screenshot_path').eq('user_id', ownerId);
const liveTrades = ownerTrades.filter(t => !backtestIds.has(t.data?.sessionId));
const btTrades = ownerTrades.filter(t => backtestIds.has(t.data?.sessionId));
const tradeShared = ['dashboard', 'live_trading', 'trade_details', 'calendar'].some(s => shared.includes(s));

console.log(`Shared sections: ${shared.join(', ') || '(none)'} | live trades ${liveTrades.length}, backtest trades ${btTrades.length}`);

// 1. Backtests never visible
const { data: cBt } = await coach.from('backtest_sessions').select('id').eq('user_id', ownerId);
check('backtest_sessions hidden', (cBt ?? []).length === 0);
if (btTrades.length) {
  const { data } = await coach.from('trades').select('id').in('id', btTrades.slice(0, 50).map(t => t.id));
  check('backtest trades hidden', (data ?? []).length === 0, `${(data ?? []).length} leaked`);
}

// 2. Trades visible iff a trade section is shared
const { data: cTrades } = await coach.from('trades').select('id').eq('user_id', ownerId);
check('live trade count', (cTrades ?? []).length === (tradeShared ? liveTrades.length : 0), `coach sees ${(cTrades ?? []).length}`);

// 3. Each table follows its section
const tables = [
  ['live_trading_sessions', ['live_trading']],
  ['journal_entries', ['journal']],
  ['habit_definitions', ['journal']],
  ['habit_badges', ['journal']],
  ['habit_checkins', ['journal', 'calendar']],
  ['playbook_entries', ['playbook']],
  ['apex_accounts', ['apex_accounts']],
];
for (const [table, sections] of tables) {
  const { count: ownerCount } = await owner.from(table).select('id', { count: 'exact', head: true }).eq('user_id', ownerId);
  const { count: coachCount } = await coach.from(table).select('id', { count: 'exact', head: true }).eq('user_id', ownerId);
  const expected = sections.some(s => shared.includes(s)) ? ownerCount : 0;
  check(`${table} follows sharing`, coachCount === expected, `coach ${coachCount}, expected ${expected}`);
}

// 4. Settings: no direct read; shared copy has no password hash
const { data: cSettings } = await coach.from('user_settings').select('user_id').eq('user_id', ownerId);
check('user_settings not directly readable', (cSettings ?? []).length === 0);
const { data: shSettings } = await coach.rpc('get_shared_settings', { p_owner: ownerId });
check('shared settings strip password hash', !shSettings || !('fundedAccountsPasswordHash' in shSettings));
check('shared settings follow access', expectRevoked || !access?.active ? shSettings === null : shSettings !== null);

// 5. Writes refused
if (liveTrades[0]) {
  const { data } = await coach.from('trades').update({ data: liveTrades[0].data }).eq('id', liveTrades[0].id).select();
  check('coach cannot update trades', (data ?? []).length === 0);
  const { data: del } = await coach.from('trades').delete().eq('id', liveTrades[0].id).select();
  check('coach cannot delete trades', (del ?? []).length === 0);
}
const { error: insErr } = await coach.from('journal_entries').insert({ id: crypto.randomUUID(), user_id: ownerId, data: {} });
check('coach cannot insert journal entries', !!insErr);

// 6. Screenshots
const btShot = btTrades.find(t => t.setup_screenshot_path);
if (btShot) {
  const { error } = await coach.storage.from('screenshots').createSignedUrl(btShot.setup_screenshot_path, 60);
  check('backtest screenshot hidden', !!error);
}
const liveShot = liveTrades.find(t => t.setup_screenshot_path);
if (liveShot) {
  const { error } = await coach.storage.from('screenshots').createSignedUrl(liveShot.setup_screenshot_path, 60);
  check('live screenshot follows sharing', tradeShared ? !error : !!error, error?.message);
}

// 7. Comments
const coachId = c.data.user.id;
if (btTrades[0]) {
  const { error } = await coach.from('trade_comments').insert({ trade_id: btTrades[0].id, owner_id: ownerId, author_id: coachId, body: 'probe' });
  check('cannot comment on backtest trade', !!error);
}
if (liveTrades[0]) {
  const { data, error } = await coach.from('trade_comments')
    .insert({ trade_id: liveTrades[0].id, owner_id: ownerId, author_id: coachId, body: 'probe comment' }).select().single();
  check('comment on live trade follows trade_details', shared.includes('trade_details') ? !error : !!error, error?.message);
  if (data) {
    const { data: ownerEdit } = await owner.from('trade_comments').update({ body: 'owner edit' }).eq('id', data.id).select();
    check('owner cannot edit coach comment', (ownerEdit ?? []).length === 0);
    const { data: flip } = await coach.from('trade_comments').update({ read_by_owner: true }).eq('id', data.id).select();
    check('coach cannot set read flag', (flip ?? []).length === 0);
    await coach.from('trade_comments').delete().eq('id', data.id);
  }
}

console.log(failures ? `\n${failures} FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
```

> Note on "coach cannot set read flag": the column grant makes that update an error (permission denied), so `data` is null → passes. Same for "owner cannot edit coach comment" (no owner update policy → 0 rows).

- [ ] **Step 2: Set up a test coach account**

Ask the user for a throwaway email they control (or their coach's, if they're ready). Owner invites it in Settings (Task 7). The user signs up as that email in a private browser window and clicks the confirmation link.

- [ ] **Step 3: Run the probe — all sections shared**

Ask the user to run in their terminal (so passwords never land in files):
`! OWNER_EMAIL=… OWNER_PASSWORD=… COACH_EMAIL=… COACH_PASSWORD=… node scripts/coach-probe.mjs`
Expected: `All checks passed`.

- [ ] **Step 4: Run it with sections unticked**

Owner unticks Apex Accounts, Playbook and Trade Details. Re-run. Expected: `All checks passed` (the probe derives expectations from the live sharing settings; those three tables now expect 0 and commenting is refused).

- [ ] **Step 5: Run it revoked**

Owner clicks Revoke. Re-run with `--expect-revoked`. Expected: `All checks passed`. Then Restore access and re-tick all sections.

- [ ] **Step 6: UI walkthrough as coach (private window)**

- Banner reads "Viewing <owner email>'s journal — read-only".
- Sidebar: Dashboard, Live Trading, Journal, Calendar, Playbook, Funded Accounts only.
- Type `/analytics`, `/backtesting`, `/settings` in the address bar → "This section isn't shared with you."
- Dashboard totals equal owner's **Live** scope totals.
- No Add/Edit/Delete/Paste/New Session/Customize buttons anywhere; journal form fields greyed out; Funded Accounts opens with no password prompt.
- Open a trade → Coach Feedback box → add a comment, edit it, delete it, add one more.
- Owner window: that trade shows the amber feedback icon in the session trade log; open it → comment visible without edit/delete; back → icon gone after refresh.
- Unticked Dashboard test: untick Dashboard, coach reloads `/` → lands on Live Trading.

- [ ] **Step 7: Final checks**

Run: `npm run build && npm run lint && npm test`
Expected: all pass.

- [ ] **Step 8: Commit**

```bash
git add scripts/coach-probe.mjs
git commit -m "Add coach access database probe"
```
