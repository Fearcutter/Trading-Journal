-- Fix: Change id columns from uuid to text to support preset string IDs

alter table public.habit_definitions alter column id type text;
alter table public.habit_checkins alter column id type text;
alter table public.habit_badges alter column id type text;
alter table public.trades alter column id type text;
alter table public.apex_accounts alter column id type text;
alter table public.playbook_entries alter column id type text;
alter table public.journal_entries alter column id type text;
alter table public.backtest_sessions alter column id type text;
