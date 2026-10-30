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
