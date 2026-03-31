-- Supabase SQL Schema for Trading Journal
-- Run this in the Supabase SQL Editor

-- 1. Enable RLS on all tables
-- 2. Create tables with JSONB data columns

-- User Settings (singleton per user)
create table public.user_settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_settings enable row level security;
create policy "Users own their settings" on public.user_settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Trades
create table public.trades (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  setup_screenshot_path text,
  result_screenshot_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.trades enable row level security;
create policy "Users own their trades" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_trades_user_id on public.trades(user_id);

-- Apex Accounts
create table public.apex_accounts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.apex_accounts enable row level security;
create policy "Users own their apex accounts" on public.apex_accounts
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_apex_accounts_user_id on public.apex_accounts(user_id);

-- Habit Definitions
create table public.habit_definitions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.habit_definitions enable row level security;
create policy "Users own their habit definitions" on public.habit_definitions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_habit_definitions_user_id on public.habit_definitions(user_id);

-- Habit Check-ins
create table public.habit_checkins (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);
alter table public.habit_checkins enable row level security;
create policy "Users own their habit checkins" on public.habit_checkins
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_habit_checkins_user_id on public.habit_checkins(user_id);

-- Habit Badges
create table public.habit_badges (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
alter table public.habit_badges enable row level security;
create policy "Users own their habit badges" on public.habit_badges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_habit_badges_user_id on public.habit_badges(user_id);

-- Playbook Entries
create table public.playbook_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  screenshot_paths text[],
  example_screenshots_paths text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.playbook_entries enable row level security;
create policy "Users own their playbook entries" on public.playbook_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_playbook_entries_user_id on public.playbook_entries(user_id);

-- Journal Entries
create table public.journal_entries (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(user_id, date)
);
alter table public.journal_entries enable row level security;
create policy "Users own their journal entries" on public.journal_entries
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_journal_entries_user_id on public.journal_entries(user_id);

-- Backtest Sessions
create table public.backtest_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.backtest_sessions enable row level security;
create policy "Users own their backtest sessions" on public.backtest_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_backtest_sessions_user_id on public.backtest_sessions(user_id);

-- Additional screenshots column for trades
alter table public.trades add column if not exists additional_screenshots_paths text[];

-- Live Trading Sessions
create table public.live_trading_sessions (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.live_trading_sessions enable row level security;
create policy "Users own their live trading sessions" on public.live_trading_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create index idx_live_trading_sessions_user_id on public.live_trading_sessions(user_id);

-- Storage bucket for screenshots
insert into storage.buckets (id, name, public) values ('screenshots', 'screenshots', false);

-- Storage policies: users can only access their own folder
create policy "Users can upload screenshots" on storage.objects
  for insert with check (
    bucket_id = 'screenshots' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can view their screenshots" on storage.objects
  for select using (
    bucket_id = 'screenshots' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can update their screenshots" on storage.objects
  for update using (
    bucket_id = 'screenshots' and
    auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete their screenshots" on storage.objects
  for delete using (
    bucket_id = 'screenshots' and
    auth.uid()::text = (storage.foldername(name))[1]
  );
