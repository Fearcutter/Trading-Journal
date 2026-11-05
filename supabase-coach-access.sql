-- Coach Access: one coach can view selected sections of an owner's journal
-- and comment on trades. Run in the Supabase SQL Editor. Safe to re-run.
--
-- Helper functions live in the `private` schema, which the Supabase API does not
-- expose, so they can be used by policies but not called directly by anyone.
-- Ids are compared as text so this works whether trades.id is uuid or text
-- (supabase-fix-ids.sql changed it to text).

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
  trade_id text not null,
  author_id uuid not null references auth.users(id) on delete cascade,
  body text not null check (length(trim(body)) > 0),
  read_by_owner boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.trade_comments enable row level security;
create index if not exists idx_trade_comments_trade on public.trade_comments(trade_id);
create index if not exists idx_trade_comments_owner_unread on public.trade_comments(owner_id) where not read_by_owner;

-- ===== Private helper functions (security definer: they read tables the caller can't) =====
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.current_confirmed_email() returns text
language sql stable security definer set search_path = public, auth as $$
  select lower(email) from auth.users
  where id = auth.uid() and email_confirmed_at is not null
$$;

create or replace function private.coach_can_view_any(p_owner uuid, p_sections text[]) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.coach_access ca
    where ca.owner_id = p_owner
      and ca.active
      and ca.sections && p_sections
      and ca.coach_email = private.current_confirmed_email()
  )
$$;

create or replace function private.coach_can_view(p_owner uuid, p_section text) returns boolean
language sql stable security definer set search_path = public as $$
  select private.coach_can_view_any(p_owner, array[p_section])
$$;

-- A session the owner switched off with "Shared with coach" (data.hiddenFromCoach = true).
create or replace function private.session_shared(p_data jsonb) returns boolean
language sql immutable as $$
  select coalesce(p_data->>'hiddenFromCoach', '') <> 'true'
$$;

-- Allow-list: a trade is "live" only if it has no session or belongs to one of the
-- owner's live sessions that is shared with the coach. Backtest trades, and trades
-- left behind by a deleted session, are never live.
create or replace function private.is_live_trade(p_owner uuid, p_data jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_data->>'sessionId', '') = ''
      or exists (
        select 1 from public.live_trading_sessions l
        where l.user_id = p_owner and l.id::text = p_data->>'sessionId'
          and private.session_shared(l.data)
      )
$$;

-- A trade is a backtest trade only if its session is one of the owner's existing
-- backtest sessions shared with the coach. Trades left behind by a deleted session
-- are neither, so stay hidden.
create or replace function private.is_backtest_trade(p_owner uuid, p_data jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce(p_data->>'sessionId', '') <> ''
     and exists (
       select 1 from public.backtest_sessions b
       where b.user_id = p_owner and b.id::text = p_data->>'sessionId'
         and private.session_shared(b.data)
     )
$$;

-- Live trades: any trade section shared. Backtest trades: backtesting shared.
create or replace function private.coach_can_view_trade_row(p_owner uuid, p_data jsonb) returns boolean
language sql stable security definer set search_path = public as $$
  select (private.coach_can_view_any(p_owner, array['dashboard','live_trading','trade_details','calendar'])
          and private.is_live_trade(p_owner, p_data))
      or (private.coach_can_view(p_owner, 'backtesting')
          and private.is_backtest_trade(p_owner, p_data))
$$;

-- Comments: live trades follow trade_details, backtest trades follow backtesting.
create or replace function private.coach_can_comment_on_trade(p_trade text, p_owner uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trades t
    where t.id::text = p_trade and t.user_id = p_owner
      and (
        (private.coach_can_view(p_owner, 'trade_details') and private.is_live_trade(t.user_id, t.data))
        or (private.coach_can_view(p_owner, 'backtesting') and private.is_backtest_trade(t.user_id, t.data))
      )
  )
$$;

create or replace function private.coach_can_view_screenshot(p_name text) returns boolean
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
        and private.coach_can_view_trade_row(t.user_id, t.data)
    );
  elsif parts[2] = 'playbook_entries' then
    return exists (
      select 1 from public.coach_access ca
      where ca.owner_id::text = parts[1]
        and private.coach_can_view(ca.owner_id, 'playbook')
    );
  end if;
  return false;
end
$$;

revoke all on all functions in schema private from public;
grant execute on all functions in schema private to authenticated;

-- ===== Public functions the app calls =====
-- Settings for a coach, minus the Funded Accounts password hash.
create or replace function public.get_shared_settings(p_owner uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select us.data - 'fundedAccountsPasswordHash'
  from public.user_settings us
  where us.user_id = p_owner
    and exists (
      select 1 from public.coach_access ca
      where ca.owner_id = p_owner and ca.active
        and ca.coach_email = private.current_confirmed_email()
    )
$$;

-- Owner marks coach comments on one of their trades as read.
create or replace function public.mark_trade_comments_read(p_trade text) returns void
language sql volatile security definer set search_path = public as $$
  update public.trade_comments
  set read_by_owner = true
  where trade_id = p_trade and owner_id = auth.uid() and not read_by_owner
$$;

revoke all on function public.get_shared_settings(uuid) from public, anon;
grant execute on function public.get_shared_settings(uuid) to authenticated;
revoke all on function public.mark_trade_comments_read(text) from public, anon;
grant execute on function public.mark_trade_comments_read(text) to authenticated;

-- ===== coach_access policies =====
drop policy if exists "Owner manages coach access" on public.coach_access;
create policy "Owner manages coach access" on public.coach_access
  for all to authenticated using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
drop policy if exists "Coach reads own coach access row" on public.coach_access;
create policy "Coach reads own coach access row" on public.coach_access
  for select to authenticated using (coach_email = private.current_confirmed_email());

-- ===== Coach read policies on journal tables (existing owner policies untouched) =====
-- `user_id <> auth.uid()` first: the owner's own queries skip the coach checks.
drop policy if exists "Coach reads shared trades" on public.trades;
create policy "Coach reads shared trades" on public.trades
  for select to authenticated using (user_id <> (select auth.uid()) and private.coach_can_view_trade_row(user_id, data));
drop policy if exists "Coach reads shared live sessions" on public.live_trading_sessions;
create policy "Coach reads shared live sessions" on public.live_trading_sessions
  for select to authenticated using (user_id <> (select auth.uid()) and private.coach_can_view(user_id, 'live_trading') and private.session_shared(data));
drop policy if exists "Coach reads shared journal entries" on public.journal_entries;
create policy "Coach reads shared journal entries" on public.journal_entries
  for select to authenticated using (user_id <> (select auth.uid()) and private.coach_can_view(user_id, 'journal'));
drop policy if exists "Coach reads shared habit definitions" on public.habit_definitions;
create policy "Coach reads shared habit definitions" on public.habit_definitions
  for select to authenticated using (user_id <> (select auth.uid()) and private.coach_can_view(user_id, 'journal'));
drop policy if exists "Coach reads shared habit badges" on public.habit_badges;
create policy "Coach reads shared habit badges" on public.habit_badges
  for select to authenticated using (user_id <> (select auth.uid()) and private.coach_can_view(user_id, 'journal'));
drop policy if exists "Coach reads shared habit checkins" on public.habit_checkins;
create policy "Coach reads shared habit checkins" on public.habit_checkins
  for select to authenticated using (user_id <> (select auth.uid()) and private.coach_can_view_any(user_id, array['journal','calendar']));
drop policy if exists "Coach reads shared playbook" on public.playbook_entries;
create policy "Coach reads shared playbook" on public.playbook_entries
  for select to authenticated using (user_id <> (select auth.uid()) and private.coach_can_view(user_id, 'playbook'));
drop policy if exists "Coach reads shared apex accounts" on public.apex_accounts;
create policy "Coach reads shared apex accounts" on public.apex_accounts
  for select to authenticated using (user_id <> (select auth.uid()) and private.coach_can_view(user_id, 'apex_accounts'));
drop policy if exists "Coach reads shared backtest sessions" on public.backtest_sessions;
create policy "Coach reads shared backtest sessions" on public.backtest_sessions
  for select to authenticated using (user_id <> (select auth.uid()) and private.coach_can_view(user_id, 'backtesting') and private.session_shared(data));
-- NOTE: no coach policy on user_settings (on purpose; see get_shared_settings).

drop policy if exists "Coach views shared screenshots" on storage.objects;
create policy "Coach views shared screenshots" on storage.objects
  for select to authenticated using (bucket_id = 'screenshots' and private.coach_can_view_screenshot(name));

-- ===== trade_comments policies =====
drop policy if exists "Owner reads comments on own trades" on public.trade_comments;
create policy "Owner reads comments on own trades" on public.trade_comments
  for select to authenticated using (auth.uid() = owner_id);
drop policy if exists "Coach reads own comments" on public.trade_comments;
create policy "Coach reads own comments" on public.trade_comments
  for select to authenticated using (author_id = auth.uid() and private.coach_can_comment_on_trade(trade_id, owner_id));
drop policy if exists "Coach adds comments" on public.trade_comments;
create policy "Coach adds comments" on public.trade_comments
  for insert to authenticated with check (
    author_id = auth.uid()
    and read_by_owner = false
    and private.coach_can_comment_on_trade(trade_id, owner_id)
  );
drop policy if exists "Coach edits own comments" on public.trade_comments;
create policy "Coach edits own comments" on public.trade_comments
  for update to authenticated using (author_id = auth.uid() and private.coach_can_comment_on_trade(trade_id, owner_id))
  with check (author_id = auth.uid());
drop policy if exists "Coach deletes own comments" on public.trade_comments;
create policy "Coach deletes own comments" on public.trade_comments
  for delete to authenticated using (author_id = auth.uid() and private.coach_can_comment_on_trade(trade_id, owner_id));

-- Only body/updated_at may be changed by a normal update (read flag goes through the function).
revoke update on public.trade_comments from authenticated, anon;
grant update (body, updated_at) on public.trade_comments to authenticated;
