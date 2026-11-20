-- Coach invite link: invite a coach without knowing their email.
-- The owner creates a one-use link; whoever opens it and signs in with a
-- confirmed email becomes the coach. Run after supabase-coach-access.sql.
-- Safe to re-run. Existing coach rows, comments and policies are unchanged.

-- A pending invite has no coach email yet, only a token.
alter table public.coach_access alter column coach_email drop not null;
alter table public.coach_access add column if not exists invite_token text;
alter table public.coach_access add column if not exists invite_expires_at timestamptz;
create unique index if not exists idx_coach_access_invite_token
  on public.coach_access(invite_token) where invite_token is not null;

-- Who sent this invite (shown on the sign-in page). Only answers for a link
-- that is still open, so a used, cancelled or expired link reveals nothing.
create or replace function public.get_coach_invite(p_token text) returns text
language sql stable security definer set search_path = public as $$
  select ca.owner_email from public.coach_access ca
  where ca.invite_token = p_token
    and length(p_token) >= 32
    and ca.coach_email is null
    and ca.invite_expires_at > now()
$$;

-- The signed-in person becomes the coach for the link's owner. One use only.
create or replace function public.claim_coach_invite(p_token text) returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_email text := private.current_confirmed_email();
  v_row public.coach_access;
begin
  if v_email is null then
    raise exception 'Confirm your email address first, then open the invite link again.';
  end if;
  if p_token is null or length(p_token) < 32 then
    raise exception 'This invite link is not valid.';
  end if;

  select * into v_row from public.coach_access
  where invite_token = p_token
  for update;

  if not found or v_row.coach_email is not null then
    raise exception 'This invite link has already been used or was cancelled. Ask for a new one.';
  end if;
  if v_row.invite_expires_at is null or v_row.invite_expires_at < now() then
    raise exception 'This invite link has expired. Ask for a new one.';
  end if;
  if v_row.owner_id = auth.uid() then
    raise exception 'This is your own invite link. Send it to your coach instead.';
  end if;

  update public.coach_access
  set coach_email = v_email,
      invite_token = null,
      invite_expires_at = null,
      active = true,
      updated_at = now()
  where owner_id = v_row.owner_id;

  return v_row.owner_email;
end
$$;

revoke all on function public.get_coach_invite(text) from public;
grant execute on function public.get_coach_invite(text) to anon, authenticated;
revoke all on function public.claim_coach_invite(text) from public, anon;
grant execute on function public.claim_coach_invite(text) to authenticated;
