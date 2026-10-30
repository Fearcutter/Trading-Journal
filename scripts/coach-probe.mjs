// Checks what a coach account can and can't do against the real database.
// Usage: node scripts/coach-probe.mjs [--expect-revoked]
// Asks for the two logins (passwords hidden); OWNER_EMAIL etc. env vars skip the questions.
import { readFileSync } from 'node:fs';
import readline from 'node:readline';
import { createClient } from '@supabase/supabase-js';

const env = Object.fromEntries(
  readFileSync(new URL('../.env.local', import.meta.url), 'utf8')
    .split('\n').filter(l => l.includes('=')).map(l => [l.slice(0, l.indexOf('=')).trim(), l.slice(l.indexOf('=') + 1).trim().replace(/^["']|["']$/g, '')]),
);
const expectRevoked = process.argv.includes('--expect-revoked');
const mk = () => createClient(env.VITE_SUPABASE_URL, env.VITE_SUPABASE_ANON_KEY, { auth: { persistSession: false } });

// The API returns at most 1000 rows per request, so page through everything.
async function fetchAll(client, table, cols, ownerId) {
  const rows = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await client.from(table).select(cols).eq('user_id', ownerId).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}

let failures = 0;
const check = (name, ok, detail = '') => {
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}${detail ? `  (${detail})` : ''}`);
  if (!ok) failures++;
};

function ask(question, hidden = false) {
  return new Promise(resolve => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    if (hidden) rl._writeToOutput = (str) => { if (str.startsWith(question)) process.stdout.write(question); };
    rl.question(question, answer => { rl.close(); if (hidden) process.stdout.write('\n'); resolve(answer.trim()); });
  });
}
const OWNER_EMAIL = process.env.OWNER_EMAIL || await ask('Your email: ');
const OWNER_PASSWORD = process.env.OWNER_PASSWORD || await ask('Your password (hidden): ', true);
const COACH_EMAIL = process.env.COACH_EMAIL || await ask('Coach email: ');
const COACH_PASSWORD = process.env.COACH_PASSWORD || await ask('Coach password (hidden): ', true);

const owner = mk();
const coach = mk();
const o = await owner.auth.signInWithPassword({ email: OWNER_EMAIL, password: OWNER_PASSWORD });
const c = await coach.auth.signInWithPassword({ email: COACH_EMAIL, password: COACH_PASSWORD });
if (o.error || c.error) { console.error('Login failed', o.error?.message, c.error?.message); process.exit(1); }
const ownerId = o.data.user.id;

// Owner-side ground truth
const { data: access } = await owner.from('coach_access').select('*').eq('owner_id', ownerId).single();
const shared = expectRevoked ? [] : (access?.active ? access.sections : []);
// Same rule as the database: live = no session, or one of the owner's live sessions.
// Backtest = one of the owner's backtest sessions (visible only when Backtesting is shared).
// Trades left behind by a deleted session are neither and must always stay hidden.
const liveSessions = await fetchAll(owner, 'live_trading_sessions', 'id', ownerId);
const liveSessionIds = new Set(liveSessions.map(l => String(l.id)));
const ownerTrades = await fetchAll(owner, 'trades', 'id, data, setup_screenshot_path', ownerId);
const isLive = t => !t.data?.sessionId || liveSessionIds.has(String(t.data.sessionId));
const btSessions = await fetchAll(owner, 'backtest_sessions', 'id', ownerId);
const btSessionIds = new Set(btSessions.map(b => String(b.id)));
const isBacktest = t => !!t.data?.sessionId && btSessionIds.has(String(t.data.sessionId));
const liveTrades = ownerTrades.filter(isLive);
const btTrades = ownerTrades.filter(isBacktest);
const orphanTrades = ownerTrades.filter(t => !isLive(t) && !isBacktest(t));
const tradeShared = ['dashboard', 'live_trading', 'trade_details', 'calendar'].some(s => shared.includes(s));
const btShared = shared.includes('backtesting');

console.log(`Shared sections: ${shared.join(', ') || '(none)'} | live trades ${liveTrades.length}, backtest trades ${btTrades.length}, orphaned trades ${orphanTrades.length}`);

// 1. Backtests follow Backtesting; orphaned trades never visible
const { data: cBt } = await coach.from('backtest_sessions').select('id').eq('user_id', ownerId);
check('backtest_sessions follow sharing', (cBt ?? []).length === (btShared ? btSessions.length : 0), `coach ${(cBt ?? []).length}, expected ${btShared ? btSessions.length : 0}`);
if (btTrades.length) {
  const sample = btTrades.slice(0, 50);
  const { data } = await coach.from('trades').select('id').in('id', sample.map(t => t.id));
  check('backtest trades follow sharing', (data ?? []).length === (btShared ? sample.length : 0), `coach sees ${(data ?? []).length} of ${sample.length} sampled`);
}
if (orphanTrades.length) {
  const { data } = await coach.from('trades').select('id').in('id', orphanTrades.slice(0, 50).map(t => t.id));
  check('orphaned trades hidden', (data ?? []).length === 0, `${(data ?? []).length} leaked`);
}

// 2. Total trades the coach can see
const expectedTrades = (tradeShared ? liveTrades.length : 0) + (btShared ? btTrades.length : 0);
const { count: cTradeCount } = await coach.from('trades').select('id', { count: 'exact', head: true }).eq('user_id', ownerId);
check('trade count', cTradeCount === expectedTrades, `coach sees ${cTradeCount}, expected ${expectedTrades}`);

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
for (const fn of ['is_live_trade', 'is_backtest_trade', 'coach_can_view', 'coach_can_view_screenshot']) {
  const { error } = await coach.rpc(fn, {});
  check(`helper ${fn} not callable through the API`, !!error);
}

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
  check('backtest screenshot follows sharing', btShared ? !error : !!error, error?.message);
}
const orphanShot = orphanTrades.find(t => t.setup_screenshot_path);
if (orphanShot) {
  const { error } = await coach.storage.from('screenshots').createSignedUrl(orphanShot.setup_screenshot_path, 60);
  check('orphaned-trade screenshot hidden', !!error);
}
const liveShot = liveTrades.find(t => t.setup_screenshot_path);
if (liveShot) {
  const { error } = await coach.storage.from('screenshots').createSignedUrl(liveShot.setup_screenshot_path, 60);
  check('live screenshot follows sharing', tradeShared ? !error : !!error, error?.message);
}

// 7. Comments
const coachId = c.data.user.id;
if (btTrades[0]) {
  const { data, error } = await coach.from('trade_comments')
    .insert({ trade_id: btTrades[0].id, owner_id: ownerId, author_id: coachId, body: 'probe' }).select().single();
  check('comment on backtest trade follows backtesting', btShared ? !error : !!error, error?.message);
  if (data) await coach.from('trade_comments').delete().eq('id', data.id);
}
if (orphanTrades[0]) {
  const { error } = await coach.from('trade_comments').insert({ trade_id: orphanTrades[0].id, owner_id: ownerId, author_id: coachId, body: 'probe' });
  check('cannot comment on orphaned trade', !!error);
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
