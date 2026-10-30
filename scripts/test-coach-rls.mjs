// Runs the real schema + coach-access migration in an in-memory Postgres with a
// minimal Supabase stand-in (auth.users, auth.uid(), storage.objects), then checks
// what a coach / stranger / owner can see and do.
// Usage: npm run test:db   (or: node scripts/test-coach-rls.mjs [path-to-coach-access.sql])
import { PGlite } from '@electric-sql/pglite';
import { readFileSync } from 'node:fs';

const repo = new URL('..', import.meta.url).pathname;
const migration = readFileSync(process.argv[2] ?? `${repo}supabase-coach-access.sql`, 'utf8');
const db = new PGlite();

const O = '00000000-0000-0000-0000-00000000000a'; // owner
const C = '00000000-0000-0000-0000-00000000000c'; // confirmed coach
const S = '00000000-0000-0000-0000-00000000000b'; // stranger (own account)
const U = '00000000-0000-0000-0000-00000000000d'; // unconfirmed account using an invited email

await db.exec(`
  create role anon nologin; create role authenticated nologin;
  create schema auth; create schema storage;
  create table auth.users (id uuid primary key, email text, email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as
    $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
  create table storage.buckets (id text primary key, name text, public boolean);
  create table storage.objects (id serial primary key, bucket_id text, name text);
  alter table storage.objects enable row level security;
  create function storage.foldername(name text) returns text[] language sql immutable as
    $$ select (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'),1)-1] $$;
  grant usage on schema public, auth, storage to authenticated, anon;
  grant select on storage.objects to authenticated, anon;
  alter default privileges in schema public grant all on tables to authenticated, anon;
`);
await db.exec(readFileSync(`${repo}supabase-schema.sql`, 'utf8'));
await db.exec(readFileSync(`${repo}supabase-fix-ids.sql`, 'utf8'));

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

try {
  await db.exec(migration);
  if (!process.env.ONCE) await db.exec(migration); // must be re-runnable
  check('migration runs (twice) on text trade ids', true);
} catch (e) {
  check('migration runs (twice) on text trade ids', false, e.message);
  console.log(`\n${failures} FAILED`);
  process.exit(1);
}

await db.exec(`
  insert into auth.users values
    ('${O}', 'owner@t.co', now()), ('${C}', 'coach@t.co', now()),
    ('${S}', 'stranger@t.co', now()), ('${U}', 'pending@t.co', null);
  insert into public.backtest_sessions (id, user_id, data) values ('bt1', '${O}', '{}');
  insert into public.live_trading_sessions (id, user_id, data) values ('11111111-1111-1111-1111-111111111111', '${O}', '{}');
  insert into public.trades (id, user_id, data, setup_screenshot_path) values
    ('t-nosession', '${O}', '{}', '${O}/trades/t-nosession/setupScreenshot.png'),
    ('t-livesession', '${O}', '{"sessionId":"11111111-1111-1111-1111-111111111111"}', null),
    ('t-backtest', '${O}', '{"sessionId":"bt1"}', '${O}/trades/t-backtest/setupScreenshot.png'),
    ('t-orphan', '${O}', '{"sessionId":"deleted-backtest-session"}', '${O}/trades/t-orphan/setupScreenshot.png');
  insert into storage.objects (bucket_id, name) values
    ('screenshots', '${O}/trades/t-nosession/setupScreenshot.png'),
    ('screenshots', '${O}/trades/t-backtest/setupScreenshot.png'),
    ('screenshots', '${O}/trades/t-orphan/setupScreenshot.png'),
    ('screenshots', '${O}/backtest_sessions/bt1/x.png');
  insert into public.user_settings (user_id, data) values ('${O}', '{"tradingTimezone":"NY","fundedAccountsPasswordHash":"secret"}');
  insert into public.journal_entries (id, user_id, data) values ('j1', '${O}', '{}');
  insert into public.apex_accounts (id, user_id, data) values ('a1', '${O}', '{}');
  insert into public.coach_access (owner_id, owner_email, coach_email, sections)
    values ('${O}', 'owner@t.co', 'coach@t.co', '{dashboard,live_trading,trade_details,calendar,journal,playbook}');
  insert into public.coach_access (owner_id, owner_email, coach_email)
    values ('${S}', 'stranger@t.co', 'pending@t.co');
`);

async function as(uid, fn) {
  await db.exec(`set role authenticated; select set_config('request.jwt.claim.sub', '${uid}', false);`);
  try { return await fn(); } finally { await db.exec('reset role;'); }
}
const rows = async (sql) => (await db.query(sql)).rows;
const tryq = async (sql) => { try { return { rows: (await db.query(sql)).rows }; } catch (e) { return { error: e.message }; } };

// ---- Coach
await as(C, async () => {
  const ids = (await rows(`select id from public.trades order by id`)).map(r => r.id);
  check('coach sees only live trades', JSON.stringify(ids) === JSON.stringify(['t-livesession', 't-nosession']), ids.join(','));
  check('coach cannot see backtest sessions', (await rows(`select * from public.backtest_sessions`)).length === 0);
  check('coach cannot see unshared apex accounts', (await rows(`select * from public.apex_accounts`)).length === 0);
  check('coach sees shared journal', (await rows(`select * from public.journal_entries`)).length === 1);
  check('coach cannot read user_settings', (await rows(`select * from public.user_settings`)).length === 0);
  const [{ s }] = await rows(`select public.get_shared_settings('${O}') as s`);
  check('shared settings strip password hash', s && s.tradingTimezone === 'NY' && !('fundedAccountsPasswordHash' in s), JSON.stringify(s));
  const shots = (await rows(`select name from storage.objects order by name`)).map(r => r.name);
  check('coach sees only live-trade screenshots', JSON.stringify(shots) === JSON.stringify([`${O}/trades/t-nosession/setupScreenshot.png`]), shots.join(','));
  const upd = await tryq(`update public.trades set data = '{}' where id = 't-nosession' returning id`);
  check('coach cannot update trades', upd.error || upd.rows.length === 0);
  const ins = await tryq(`insert into public.journal_entries (id, user_id, data) values ('j2', '${O}', '{}')`);
  check('coach cannot insert journal entries', !!ins.error);
  const c1 = await tryq(`insert into public.trade_comments (owner_id, trade_id, author_id, body) values ('${O}', 't-nosession', '${C}', 'nice') returning id`);
  check('coach can comment on live trade', !c1.error, c1.error);
  const c2 = await tryq(`insert into public.trade_comments (owner_id, trade_id, author_id, body) values ('${O}', 't-orphan', '${C}', 'x')`);
  check('coach cannot comment on orphaned backtest trade', !!c2.error);
  const c3 = await tryq(`insert into public.trade_comments (owner_id, trade_id, author_id, body) values ('${O}', 't-backtest', '${C}', 'x')`);
  check('coach cannot comment on backtest trade', !!c3.error);
  const flip = await tryq(`update public.trade_comments set read_by_owner = true`);
  check('coach cannot set read flag', !!flip.error);
});

// ---- Helper exposure: private schema is not in the API, and anon can't execute
const anonHelper = await (async () => {
  await db.exec(`set role anon;`);
  try { await db.query(`select private.coach_can_view('${O}', 'dashboard')`); return 'callable'; }
  catch (e) { return e.message; } finally { await db.exec('reset role;'); }
})();
check('anon cannot execute private helpers', anonHelper !== 'callable', anonHelper);
const anonSettings = await (async () => {
  await db.exec(`set role anon;`);
  try { await db.query(`select public.get_shared_settings('${O}')`); return 'callable'; }
  catch (e) { return e.message; } finally { await db.exec('reset role;'); }
})();
check('anon cannot call get_shared_settings', anonSettings !== 'callable', anonSettings);

// ---- Unconfirmed account with an invited email gets nothing
await as(U, async () => {
  check('unconfirmed invitee sees no access row', (await rows(`select * from public.coach_access`)).length === 0);
  check('unconfirmed invitee sees no trades', (await rows(`select * from public.trades`)).length === 0);
});

// ---- Stranger sees nothing of the owner
await as(S, async () => {
  check('stranger sees no owner trades', (await rows(`select * from public.trades where user_id = '${O}'`)).length === 0);
  const [{ s }] = await rows(`select public.get_shared_settings('${O}') as s`);
  check('stranger gets no settings', s === null);
});

// ---- Owner
await as(O, async () => {
  check('owner still sees all own trades', (await rows(`select * from public.trades`)).length === 4);
  const com = await rows(`select * from public.trade_comments`);
  check('owner sees coach comment', com.length === 1);
  const edit = await tryq(`update public.trade_comments set body = 'edited' returning id`);
  check('owner cannot edit coach comment', edit.error || edit.rows.length === 0);
  const del = await tryq(`delete from public.trade_comments returning id`);
  check('owner cannot delete coach comment', del.error || del.rows.length === 0);
  await db.query(`select public.mark_trade_comments_read('t-nosession')`);
  const [{ r }] = await rows(`select read_by_owner as r from public.trade_comments`);
  check('owner can mark comments read', r === true);
});

// ---- Backtesting shared (on its own: no trade sections)
await db.exec(`update public.coach_access set sections = '{journal,backtesting}' where owner_id = '${O}'`);
await as(C, async () => {
  const ids = (await rows(`select id from public.trades order by id`)).map(r => r.id);
  check('backtesting only: coach sees backtest trades, not live or orphaned', JSON.stringify(ids) === JSON.stringify(['t-backtest']), ids.join(','));
  check('backtesting only: coach sees backtest sessions', (await rows(`select * from public.backtest_sessions`)).length === 1);
  check('backtesting only: no live sessions', (await rows(`select * from public.live_trading_sessions`)).length === 0);
  const shots = (await rows(`select name from storage.objects order by name`)).map(r => r.name);
  check('backtesting only: only backtest-trade screenshots', JSON.stringify(shots) === JSON.stringify([`${O}/trades/t-backtest/setupScreenshot.png`]), shots.join(','));
  const ok = await tryq(`insert into public.trade_comments (owner_id, trade_id, author_id, body) values ('${O}', 't-backtest', '${C}', 'bt note') returning id`);
  check('backtesting only: coach can comment on backtest trade', !ok.error, ok.error);
  const orphan = await tryq(`insert into public.trade_comments (owner_id, trade_id, author_id, body) values ('${O}', 't-orphan', '${C}', 'x')`);
  check('backtesting only: still no comments on orphaned trade', !!orphan.error);
  const live = await tryq(`insert into public.trade_comments (owner_id, trade_id, author_id, body) values ('${O}', 't-nosession', '${C}', 'x')`);
  check('backtesting only: no comments on live trade', !!live.error);
  const mine = (await rows(`select trade_id from public.trade_comments order by trade_id`)).map(r => r.trade_id);
  check('backtesting only: coach sees only comments on trades they can see', JSON.stringify(mine) === JSON.stringify(['t-backtest']), mine.join(','));
  const upd = await tryq(`update public.backtest_sessions set data = '{}' returning id`);
  check('backtesting only: coach cannot change backtest sessions', upd.error || upd.rows.length === 0);
  const del = await tryq(`delete from public.trades where id = 't-backtest' returning id`);
  check('backtesting only: coach cannot delete backtest trades', del.error || del.rows.length === 0);
});
await db.exec(`update public.coach_access set sections = '{dashboard,live_trading,trade_details,calendar,journal,playbook,apex_accounts,backtesting}' where owner_id = '${O}'`);
await as(C, async () => {
  const ids = (await rows(`select id from public.trades order by id`)).map(r => r.id);
  check('everything shared: live + backtest trades, never orphaned', JSON.stringify(ids) === JSON.stringify(['t-backtest', 't-livesession', 't-nosession']), ids.join(','));
  check('everything shared: user_settings still not directly readable', (await rows(`select * from public.user_settings`)).length === 0);
});
await as(O, async () => {
  check('owner sees backtest comment', (await rows(`select * from public.trade_comments where trade_id = 't-backtest'`)).length === 1);
});

// ---- Revoke
await db.exec(`update public.coach_access set active = false where owner_id = '${O}'`);
await as(C, async () => {
  check('revoked coach sees no trades', (await rows(`select * from public.trades`)).length === 0);
  check('revoked coach still sees access row (for message)', (await rows(`select active from public.coach_access`)).length === 1);
  const [{ s }] = await rows(`select public.get_shared_settings('${O}') as s`);
  check('revoked coach gets no settings', s === null);
});

console.log(failures ? `\n${failures} FAILED` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
