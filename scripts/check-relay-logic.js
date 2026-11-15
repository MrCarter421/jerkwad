#!/usr/bin/env node
// ============================================================================
// Relay protocol test — workers/doom-relay/index.mjs, UNMODIFIED, running
// under workerd (Cloudflare's runtime) on localhost, driven by raw sockets.
//
// check-relay.js asks "is the DEPLOYED relay reachable?". This asks "is the
// relay's LOGIC right?" — before it is deployed, in two seconds, no browser:
// routing, the rebind that keeps a game alive across a reconnect, the ping
// the engine uses to tell a dead link from a frozen player, the close
// handshake, room reset and cleanup.
//
//   node scripts/check-relay-logic.js
//   WORKER=/path/to/old-index.mjs node scripts/check-relay-logic.js   # negative control
//
// (Get the build that is live right now with
//    git show <commit>:workers/doom-relay/index.mjs > /tmp/old.mjs
//  — relay-2 fails the rebind, ping, close and cleanup checks.)
//
// Exit 0 = all pass, 1 = a failure, 2 = SKIPPED (miniflare / ws not installed).
// ============================================================================
'use strict';
const path = require('path');
const { loadDep, startRelay } = require('./lib/stack');

const wsLib = loadDep('ws');
if (!wsLib) { console.log('SKIPPED — `ws` not installed (npm install)'); process.exit(2); }
const WebSocket = wsLib.WebSocket || wsLib;

const tty = process.stdout.isTTY;
const c = (n, s) => (tty ? `\x1b[${n}m${s}\x1b[0m` : s);
const bold = s => c('1', s), dim = s => c('2', s), green = s => c('32', s), red = s => c('31', s);
const sleep = ms => new Promise(r => setTimeout(r, ms));

let failures = 0;
function check(ok, label, detail) {
  if (!ok) failures++;
  console.log('  ' + (ok ? green('✓') : red('✗')) + ' ' + label + (detail ? dim('  ' + detail) : ''));
}

const frame = (to, from, payload = []) => {
  const b = Buffer.alloc(8 + payload.length);
  b.writeUInt32LE(to >>> 0, 0); b.writeUInt32LE(from >>> 0, 4);
  Buffer.from(payload).copy(b, 8);
  return b;
};
const PING_ADDR = 0xffffffff;

// A socket that remembers what it received and when it closed.
function open(url) {
  return new Promise((resolve, reject) => {
    const ws = new WebSocket(url);
    ws.binaryType = 'nodebuffer';
    const st = { ws, got: [], closed: null };
    ws.on('message', (m, isBinary) => st.got.push(isBinary ? Buffer.from(m).toString('hex') : 'TEXT:' + m));
    ws.on('close', (code, reason) => { st.closed = { code, reason: String(reason), at: Date.now() }; });
    ws.on('error', () => {});
    ws.on('open', () => resolve(st));
    setTimeout(() => reject(new Error('socket did not open')), 5000);
  });
}

(async () => {
  let relay;
  try {
    relay = await startRelay({ port: +(process.env.RELAY_PORT || 8797),
      worker: process.env.WORKER ? path.resolve(process.env.WORKER) : undefined });
  } catch (e) {
    if (e.code === 'NO_DEP') { console.log('SKIPPED — ' + e.message); process.exit(2); }
    throw e;
  }
  const api = relay.origin;
  const getJson = async (p) => { const r = await fetch(api + p); return { status: r.status, json: await r.json().catch(() => null) }; };

  const health = await getJson('/api/health');
  console.log('\n' + bold('RELAY PROTOCOL') + dim('  ' + (process.env.WORKER || 'workers/doom-relay/index.mjs') +
    '  build ' + ((health.json && health.json.build) || '?') + '  (workerd)') + '\n');
  check(health.status === 200 && health.json && health.json.ok, 'health endpoint answers');

  const room = (await getJson('/api/newroom')).json.room;
  const wsUrl = api.replace(/^http/, 'ws') + '/api/ws/' + room;
  const players = async () => ((await getJson('/api/room/' + room)).json || {}).players;
  check((await getJson('/api/room/' + room.slice(0, -1) + 'x')).status === 404, 'a forged room id is refused');
  check(await players() === 0, 'new room is empty');

  // ---- routing --------------------------------------------------------------
  const HOST = 1, B = 0x12345678;
  const host = await open(wsUrl), b1 = await open(wsUrl);
  host.ws.send(frame(0, HOST));                       // server announce
  await sleep(120);
  b1.ws.send(frame(HOST, B, [0xaa, 0xbb]));
  await sleep(120);
  host.ws.send(frame(B, HOST, [0xcc]));
  await sleep(150);
  check(host.got.includes('78563412aabb'), 'joiner → host is delivered as [from][payload]', host.got.join(' '));
  check(b1.got.includes('01000000cc'), 'host → joiner is delivered', b1.got.join(' '));
  check(await players() === 2, 'room reports 2 players');

  // ---- hostile / malformed frames must not break the room ---------------------
  b1.ws.send('this is text, not a packet');
  b1.ws.send(Buffer.from([1, 2, 3]));
  await sleep(100);
  host.got.length = 0;
  b1.ws.send(frame(HOST, B, [0x01]));
  await sleep(150);
  check(host.got.includes('7856341201'), 'text and runt frames are ignored, routing survives');

  // ---- ping -----------------------------------------------------------------
  b1.got.length = 0;
  b1.ws.send(frame(PING_ADDR, B));
  await sleep(150);
  check(b1.got.includes('ffffffff'), 'a ping is answered by the relay itself', 'got: ' + (b1.got.join(' ') || 'nothing'));
  check(!host.got.includes('78563412'), 'a ping is not forwarded to any player');

  // ---- the rebind: same uid, new socket ---------------------------------------
  // This is what a reconnect looks like from the relay's side, and it is the
  // case that used to end games.
  const b2 = await open(wsUrl);
  b2.ws.send(frame(PING_ADDR, B));                    // engine's hello on a new socket
  await sleep(150);
  b1.got.length = 0; b2.got.length = 0;
  host.ws.send(frame(B, HOST, [0xdd]));
  await sleep(200);
  check(b2.got.includes('01000000dd'), 'after a reconnect, packets follow the uid to its NEW socket',
    'new socket got: ' + (b2.got.join(' ') || 'nothing') + '   old socket got: ' + (b1.got.join(' ') || 'nothing'));
  check(!b1.got.includes('01000000dd'), 'the old socket no longer receives that uid\'s traffic');
  check(!!b1.closed, 'the replaced socket is retired by the relay', b1.closed ? 'code ' + b1.closed.code : 'still open');
  check(await players() === 2, 'a reconnect does not inflate the player count', 'players=' + await players());

  // ---- close handshake + cleanup ----------------------------------------------
  const t0 = Date.now();
  b2.ws.close();
  for (let i = 0; i < 30 && !b2.closed; i++) await sleep(100);
  check(!!b2.closed && b2.closed.code === 1000, 'a client close is ANSWERED (clean close, not a hang)',
    b2.closed ? 'code ' + b2.closed.code + ' in ' + (Date.now() - t0) + ' ms' : 'no close after 3 s — the browser would sit in CLOSING forever');
  await sleep(150);
  check(await players() === 1, 'a closed socket leaves the room', 'players=' + await players());

  // ---- new game clears the room, but not the announcing host --------------------
  const stale = await open(wsUrl);
  stale.ws.send(frame(HOST, 0x0abcdef0, [0x00]));
  await sleep(120);
  const host2 = await open(wsUrl);
  host2.ws.send(frame(0, HOST));
  await sleep(250);
  check(!!stale.closed, 'a new-game announce clears the previous occupants');
  check(!host2.closed, 'the announcing host\'s own socket stays open');
  check(await players() === 1, 'room holds just the new host', 'players=' + await players());

  for (const s of [host, b1, b2, stale, host2]) { try { s.ws.terminate(); } catch (e) {} }
  await relay.close();

  console.log('\n' + bold('RESULT') + '  ' + (failures ? red('✗ ' + failures + ' check(s) failed')
    : green('✓ relay logic is sound')) + '\n');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
