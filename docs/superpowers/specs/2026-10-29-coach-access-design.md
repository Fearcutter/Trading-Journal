# Coach Access — Design

**Date:** 2026-10-29
**Status:** Approved in conversation, awaiting written-spec review

## Goal

Make the journal coaching-friendly: the user's trading coach logs in with their own account and sees a live, read-only view of selected sections of the user's journal, and can leave feedback comments on individual trades. The user decides which sections are shared and can revoke access instantly.

## Non-goals

- No two-way comment threads — the coach comments, the user reads. (Replies may come later.)
- No comments on anything other than trades (no journal-day / playbook comments yet).
- No weekly recap feature yet. This design is the foundation for it.
- No hiding of individual trades/entries inside a shared section. Sharing is all-or-nothing per section.
- One coach per journal. No multi-coach, no coach dashboard listing many students.
- No change to the owner's experience other than the new Settings card and the unread-comment marker.

## Sections

The shareable sections, each a checkbox (all ticked by default on invite):

| Key | Page(s) | Tables read |
|---|---|---|
| `dashboard` | `/` | `trades` |
| `live_trading` | `/live-trading`, `/live-trading/:sessionId` | `trades`, `live_trading_sessions` |
| `trade_details` | `/trades/:id` (+ comments) | `trades` |
| `calendar` | `/calendar` | `trades`, `habit_checkins` |
| `journal` | `/journal`, `/habits` | `journal_entries`, `habit_definitions`, `habit_checkins`, `habit_badges` |
| `playbook` | `/playbook` | `playbook_entries` |
| `apex_accounts` | `/apex-accounts` | `apex_accounts` |

Never shareable: Analytics, MFE/MAE, Category Analytics, Backtesting, Risk Calculator, Settings page. `backtest_sessions` is never readable by the coach.

`user_settings` is **not** directly readable by the coach. Settings reach the coach through the security-definer function `get_shared_settings(owner)`, which returns the settings minus `fundedAccountsPasswordHash`. The Funded Accounts password gate is skipped in coach mode (the owner chose to share that section).

## Data model

### `coach_access` (new)

```sql
create table public.coach_access (
  owner_id uuid primary key references auth.users(id) on delete cascade,  -- one coach per owner
  coach_email text not null,           -- stored lowercased
  sections text[] not null default '{dashboard,live_trading,trade_details,calendar,journal,playbook,apex_accounts}',
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- Owner: full read/write on own row.
- Coach: read-only on rows where `coach_email` matches their **confirmed** email (so they can discover whose journal they view and which sections). Revoke = `active = false`; Remove coach = delete the row. The coach's select policy matches on email regardless of `active`, so a revoked coach can see that access is off.

### `trade_comments` (new)

```sql
create table public.trade_comments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,  -- journal owner
  trade_id uuid not null references public.trades(id) on delete cascade,
  author_id uuid not null references auth.users(id) on delete cascade,  -- the coach
  body text not null,
  read_by_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

- Coach: insert/update/delete own comments (`author_id = auth.uid()`), only on trades the coach can currently read (see trade rule below) and only while `trade_details` is shared.
- Owner: select all comments on own trades; update **only** `read_by_owner` (enforced with a column-level grant or a security-definer `mark_comments_read(trade_id)` function). Owner cannot edit or delete coach comments.

## Access rules (Row Level Security)

Helper functions (`security definer`, `stable`):

- `coach_can_view(owner uuid, section text) returns boolean` — true when a `coach_access` row exists with `owner_id = owner`, `active`, `section = any(sections)`, and `coach_email` equals the caller's email from `auth.users` **with `email_confirmed_at is not null`**. (Prevents someone registering the coach's email before the coach does and inheriting access.)
- `is_backtest_trade(trade_row_data jsonb) returns boolean` — true when `data->>'sessionId'` matches an id in `backtest_sessions`. Security definer so it can look this up even though the coach cannot read `backtest_sessions`.

New **select-only** policies added alongside the existing "Users own their X" policies (existing policies untouched):

- `trades`: `coach_can_view(user_id, any of dashboard/live_trading/trade_details/calendar) and not is_backtest_trade(data)`.
- `live_trading_sessions`: `coach_can_view(user_id, 'live_trading')`.
- `journal_entries`, `habit_definitions`, `habit_badges`: `coach_can_view(user_id, 'journal')`.
- `habit_checkins`: `coach_can_view(user_id, 'journal') or coach_can_view(user_id, 'calendar')`.
- `playbook_entries`: `coach_can_view(user_id, 'playbook')`.
- `apex_accounts`: `coach_can_view(user_id, 'apex_accounts')`.
- `user_settings`: no coach policy (see `get_shared_settings`).
- `storage.objects` (bucket `screenshots`): select only, where the path's first folder is an owner the caller coaches and:
  - `trades/<id>/…` → that trade passes the trades rule above (so backtest-trade screenshots stay private);
  - `playbook_entries/<id>/…` → `coach_can_view(owner, 'playbook')`;
  - anything else → denied.

No coach insert/update/delete policies on any journal table.

Migration file: `supabase-coach-access.sql` at repo root (matching existing `supabase-*.sql` convention), run once in the Supabase SQL editor. After running, verify both tables and all policies exist (`select * from pg_policies where policyname ilike '%coach%'`).

## App changes

### Viewing context

New `ViewContext` (`src/context/ViewContext.tsx`) provided inside `AuthProvider`, exposing:

```ts
{
  mode: 'owner' | 'coach';
  journalOwnerId: string;        // user.id in owner mode; owner_id in coach mode
  ownerLabel: string;            // shown in coach banner (owner email)
  sharedSections: SectionKey[];  // all sections in owner mode
  readOnly: boolean;             // true in coach mode
}
```

On login it queries `coach_access` for a row where the caller is the coach. Found and active → coach mode. Otherwise owner mode. (A coach account that also keeps its own journal is out of scope; an invited coach always lands in coach mode.)

### Data hooks

- `useSupabaseList` and `useSupabaseSingleton`: filter by `journalOwnerId` instead of `user.id`. When `readOnly`, the setter is a no-op (never persists, never uploads screenshots).
- Contexts that the coach cannot read (`BacktestContext`) load as empty in coach mode — the RLS denial returns no rows; suppress the "Failed to load" toast for expected empty/denied loads in coach mode.
- `MigrationGate` is skipped in coach mode (no local-data upload into someone else's journal).

### Routing & navigation

- `Sidebar`: in coach mode, show only nav items whose section is shared; hide Settings. Show banner "Viewing <owner>'s journal — read-only".
- `App.tsx` routes: in coach mode, routes for unshared sections render a simple "Not shared" screen.
- Edit affordances: all add/edit/delete/import buttons and forms hidden when `readOnly` (trade form, session create, journal editor, habit check-in toggles, playbook editor, apex account editor, drag-to-reorder dashboard widgets). Hiding is cosmetic; RLS + no-op setters are the real guard.

### Owner: Coach Access card (Settings page)

- Empty state: email input + **Invite** → inserts `coach_access` row.
- With a coach: shows email, seven section checkboxes (save on change), **Revoke access** button (sets `active = false`). When revoked the card shows **Restore access** and **Remove coach** (deletes the row, after an in-app confirm modal — not a browser dialog).
- Explains that the coach must sign up with that exact email.

### Comments

- `TradeDetailPage`: "Coach Feedback" section at the bottom.
  - Coach mode: list of comments + textarea to add; edit/delete own comments.
  - Owner mode: read-only list (author, timestamp, body). Opening the page marks that trade's comments read.
- `useTradeComments(tradeId)` hook for load/insert/update/delete.
- Owner trade log (Live Trading session trade list): small marker on trades with unread coach comments. One query on load: `select trade_id from trade_comments where owner_id = me and not read_by_owner`.

## Error handling

- Coach logs in but access was revoked → owner-mode empty journal would be confusing; instead show a "Your access to this journal has been turned off" screen when a `coach_access` row exists but `active = false`. If the row was deleted, they see an empty own journal (acceptable).
- Owner invites an email that never signs up → nothing breaks; the card just shows the invited email (the app can't see whether that person has signed up).
- Comment save fails → toast, keep text in the box.

## Testing

Manual verification with a throwaway coach account against the real Supabase project:

1. Owner invites coach email; coach signs up and confirms email; coach lands in coach mode with banner.
2. Coach sidebar shows exactly the seven sections; hidden pages show "Not shared".
3. Coach sees live trades, no backtest trades (dashboard totals match owner's live-only numbers).
4. Direct database probes from the coach's session (browser console): `backtest_sessions`, backtest trades by id, and an unticked section's table all return zero rows; any insert/update/delete on journal tables is refused.
5. Coach cannot load a backtest trade's screenshot URL.
6. Untick a section → coach loses it on reload, and the direct probe returns zero rows.
7. Coach comments on a trade; owner sees unread marker in trade log, opens trade, marker clears; owner has no edit/delete on the comment.
8. Revoke → coach sees the "access turned off" screen; all probes return zero rows.
9. Owner experience regression: log a trade, edit journal, reorder dashboard — all still save.

`npm run build` and `npm run lint` pass.

## Revisions after final review (2026-10-29)

- **Live-trade allow-list.** A trade is visible to the coach only if `data->>'sessionId'` is empty or matches one of the owner's `live_trading_sessions` (the same rule the dashboard's "Live" scope uses). This replaces the `is_backtest_trade` deny-list, which let trades left behind by a deleted backtest session through.
- **Id types.** `trade_comments.trade_id` is `text` with no foreign key, and ids are compared as text, because `supabase-fix-ids.sql` changed `trades.id` to text.
- **Private helpers.** Policy helper functions live in a `private` schema that the Supabase API does not expose; `get_shared_settings` / `mark_trade_comments_read` are executable by `authenticated` only. Coach policies are `to authenticated` and start with `user_id <> auth.uid()` so the owner's own queries skip them. The migration is re-runnable.
- **No lock-in.** Any login that has an invite can switch to its own journal (sidebar "Switch to…", and a "Go to my own journal" button on the access-off screen); the choice is remembered per browser. This stops a stranger trapping someone in a journal by inviting their email, and lets a coach keep their own journal.
