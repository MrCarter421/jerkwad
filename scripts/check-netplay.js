#!/usr/bin/env node
// ============================================================================
// THE NETPLAY BATTERY — every way a two-player game has been seen to die, each
// one played for real (real pages, real WASM engine, the real Worker under
// workerd) and checked for the outcome it SHOULD have.
//
//   node scripts/check-netplay.js            # ~10 minutes
//   node scripts/check-netplay.js --full     # + the two 30-second timeout cases
//   node scripts/check-netplay.js stall drop # only scenarios whose name matches
//
// Each line is one run of scripts/check-session.js --local; see that script
// for what the faults do. A failing scenario's log is kept and its path
// printed — the timeline in it says what happened, second by second.
//
// The last two scenarios run THIS engine against the relay that was live
// before relay-4 (taken from git history). They are there because the two
// halves deploy separately: the site goes to the web host, the Worker to
// Cloudflare, and "site updated, Worker forgotten" has already happened once.
// The new engine must still start and hold a game on the old relay.
//
// Exit 0 = all as expected, 1 = something was not, 2 = SKIPPED (no browser /
// miniflare).
// ============================================================================
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const args = process.argv.slice(2);
const FULL = args.includes('--full');
const only = args.filter(a => !a.startsWith('--'));

const tty = process.stdout.isTTY;
const c = (n, s) => (tty ? `\x1b[${n}m${s}\x1b[0m` : s);
const bold = s => c('1', s), dim = s => c('2', s);
const green = s => c('32', s), red = s => c('31', s), yellow = s => c('33', s);

// The last commit whose worker was relay-2 — what doom.yuccabucca.com served
// while "players get kicked after about a minute" was being reported.
const OLD_RELAY_REV = '954c39e';
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'jerkwad-netplay-'));
let oldRelay = null;
{
  const r = spawnSync('git', ['show', OLD_RELAY_REV + ':workers/doom-relay/index.mjs'], { cwd: ROOT, encoding: 'utf8' });
  if (r.status === 0 && /relay-2/.test(r.stdout)) {
    oldRelay = path.join(tmp, 'relay-2.mjs');
    fs.writeFileSync(oldRelay, r.stdout);
  }
}

// name, what it models, env for check-session, what "right" looks like
const SCENARIOS = [
  ['baseline',      'two players, nothing goes wrong',                         { DURATION: 60 },                        'the game holds'],
  ['stall-joiner',  'a player\'s tab is hidden / phone locks for 6 s',         { STALL: 6, DURATION: 35 },              'everyone waits, then play resumes'],
  ['stall-host',    'the HOST\'s tab is hidden for 6 s',                       { STALL: 6, STALL_WHO: 'host', DURATION: 35 }, 'everyone waits, then play resumes'],
  ['net-stall',     'the network stalls for 5 s (congestion, handover)',       { NETSTALL: 5, DURATION: 35 },           'everyone waits, then play resumes'],
  ['drop',          'a player\'s socket is closed under the engine',           { DROP: 1, DURATION: 35 },               'it reconnects; nobody notices'],
  ['reset',         'every connection is reset at once',                       { RESET: 1, DURATION: 35 },              'both reconnect; play continues'],
  ['zombie-joiner', 'a player\'s connection dies silently (no close)',         { ZOMBIE: 'join', DURATION: 40 },        'noticed in ~6 s and reopened'],
  ['zombie-host',   'the HOST\'s connection dies silently',                    { ZOMBIE: 'host', DURATION: 40 },        'noticed in ~6 s and reopened'],
  ['leave-joiner',  'a player closes their tab',                               { LEAVE: 'join', DURATION: 40 },         'the host is told in seconds, plays on'],
  ['leave-host',    'the host closes their tab',                               { LEAVE: 'host', DURATION: 40 },         'the joiner is told at once, and why'],
  ['mismatch',      'a player\'s browser built a different level',             { MISMATCH: 1 },                         'refused before launch, with the reason'],
  ['timeout',       'a player is gone for 40 s',                               { STALL: 40, EXPECT: 'drop', DURATION: 70 }, 'dropped after a real 30 s wait', 'full'],
  ['killed',        'a player\'s browser is killed outright',                  { LEAVE: 'join', HARD: 1, DURATION: 60 }, 'dropped after a real 30 s wait', 'full'],
  ['old-relay',     'this engine on the PREVIOUS relay build',                 { DURATION: 40, WORKER: '@old' },        'the game still starts and holds', 'oldrelay'],
  ['old-relay-stall', '…and a 6 s stall there',                                { STALL: 6, DURATION: 35, WORKER: '@old' }, 'still survives', 'oldrelay'],
];

console.log('\n' + bold('NETPLAY BATTERY') + dim('  real pages · real engine · real Worker under workerd') + '\n');
let failed = 0, ran = 0, skipped = 0;
const t0 = Date.now();
for (const [name, models, envs, right, tag] of SCENARIOS) {
  if (only.length && !only.some(o => name.includes(o))) continue;
  if (tag === 'full' && !FULL && !only.length) continue;
  if (tag === 'oldrelay' && !oldRelay) {
    console.log('  ' + yellow('–') + ' ' + name.padEnd(16) + dim(' skipped: no git history for the previous relay build')); skipped++; continue;
  }
  const env = { ...process.env, FAULT_AT: '10', START_BUDGET: '60', QUIET: '1' };
  for (const [k, v] of Object.entries(envs)) env[k] = v === '@old' ? oldRelay : String(v);
  const started = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, 'check-session.js'), '--local'], { cwd: ROOT, env, encoding: 'utf8' });
  const out = (r.stdout || '') + (r.stderr || '');
  if (r.status === 2) { console.log('\n' + out.trim().split('\n').pop() + '\n'); process.exit(2); }
  ran++;
  const secs = ((Date.now() - started) / 1000).toFixed(0).padStart(3) + 's';
  if (r.status === 0) {
    console.log('  ' + green('✓') + ' ' + name.padEnd(16) + ' ' + models.padEnd(52) + dim(' → ' + right + '  ' + secs));
  } else {
    failed++;
    const log = path.join(tmp, name + '.log');
    fs.writeFileSync(log, out);
    console.log('  ' + red('✗') + ' ' + name.padEnd(16) + ' ' + models.padEnd(52) + red(' → NOT: ' + right) + dim('  ' + secs));
    out.split('\n').filter(l => /✗|never started|boot screen|screen:/.test(l)).slice(0, 6)
      .forEach(l => console.log(dim('        ' + l.trim().slice(0, 170))));
    console.log(dim('        full timeline: ' + log));
  }
}
if (!failed) { try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (e) {} }
console.log('\n' + bold('RESULT') + '  ' + (failed ? red(`✗ ${failed} of ${ran} scenarios did not go as they should`)
  : green(`✓ all ${ran} scenarios went as they should`)) + (skipped ? dim(`  (${skipped} skipped)`) : '') +
  dim('  ' + ((Date.now() - t0) / 60000).toFixed(1) + ' min') + '\n');
process.exit(failed ? 1 : 0);
