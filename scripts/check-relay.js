#!/usr/bin/env node
// ============================================================================
// Relay diagnostic — run this from YOUR machine (it needs to reach Cloudflare).
//
//   node scripts/check-relay.js                     # doom.yuccabucca.com
//   node scripts/check-relay.js my.other.host
//   node scripts/check-relay.js http://localhost:8191   # local testing
//
// Tests the four layers separately so "cannot connect" becomes a specific
// cause instead of a shrug:
//
//   1 HEALTH   GET  /api/health     DNS + Cloudflare route + worker running
//   2 NEWROOM  GET  /api/newroom    DOOM_KEY set, room signing works
//   3 ECHO     WS   /api/echo       WebSockets actually UPGRADE through
//                                   Cloudflare (an HTTPS check cannot see this)
//   4 GAME WS  WS   /api/ws/<room>  the room Durable Object accepts a socket
//
// Layers 1-2 are plain HTTPS; 3-4 are WebSockets. If 1-2 pass and 3-4 fail,
// the HTTP path is healthy and only the WebSocket path is broken — which is
// the signature of a worker still running the pre-fix code that called
// routerObject.fetch(path, request) with a relative URL string.
//
// No dependencies: minimal RFC6455 client over tls/net, works on any Node 14+.
// ============================================================================
'use strict';
const tls = require('tls');
const net = require('net');
const https = require('https');
const http = require('http');
const crypto = require('crypto');

const raw = process.argv[2] || 'doom.yuccabucca.com';
const base = /^https?:\/\//.test(raw) ? new URL(raw) : new URL('https://' + raw);
const secure = base.protocol === 'https:';
const PORT = base.port ? +base.port : (secure ? 443 : 80);
const HOST = base.hostname;
const ORIGIN = `${base.protocol}//${HOST}${base.port ? ':' + base.port : ''}`;
const WS_ORIGIN = ORIGIN.replace(/^http/, 'ws');

const tty = process.stdout.isTTY;
const c = (n, s) => (tty ? `\x1b[${n}m${s}\x1b[0m` : s);
const bold = s => c('1', s), dim = s => c('2', s);
const green = s => c('32', s), red = s => c('31', s), yellow = s => c('33', s);
const pass = (t, d) => { console.log('  ' + green('✓') + ' ' + t + (d ? '  ' + dim(d) : '')); };
const failed = (t, d) => { console.log('  ' + red('✗') + ' ' + t + (d ? '  ' + dim(d) : '')); };

function getJson(path, timeoutMs = 12000) {
  return new Promise((resolve) => {
    const lib = secure ? https : http;
    const req = lib.get({ host: HOST, port: PORT, path, timeout: timeoutMs,
      headers: { 'user-agent': 'jerkwad-relay-check' } }, (res) => {
      let body = '';
      res.on('data', d => { body += d; });
      res.on('end', () => {
        let json = null;
        try { json = JSON.parse(body); } catch (e) {}
        resolve({ status: res.statusCode, body: body.slice(0, 200), json });
      });
    });
    req.on('timeout', () => { req.destroy(); resolve({ error: 'timeout after ' + timeoutMs + 'ms' }); });
    req.on('error', (e) => resolve({ error: e.message }));
  });
}

// ---- minimal WebSocket client ---------------------------------------------
// Client frames must be masked; server frames are not. Only small frames are
// needed here (a 4-byte probe), but the reader handles the 126/127 length
// forms so a chatty server can't desync it.
function wsProbe(path, { send = Buffer.from([1, 2, 3, 4]), expectEcho = true, timeoutMs = 12000 } = {}) {
  return new Promise((resolve) => {
    const key = crypto.randomBytes(16).toString('base64');
    const accept = crypto.createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11').digest('base64');
    const connect = secure ? tls.connect : net.connect;
    const opts = secure ? { host: HOST, port: PORT, servername: HOST } : { host: HOST, port: PORT };
    let done = false;
    const finish = (r) => { if (!done) { done = true; try { sock.destroy(); } catch (e) {} resolve(r); } };
    const sock = connect(opts, () => {
      sock.write(
        `GET ${path} HTTP/1.1\r\nHost: ${HOST}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n` +
        `Sec-WebSocket-Key: ${key}\r\nSec-WebSocket-Version: 13\r\nOrigin: ${ORIGIN}\r\n\r\n`);
    });
    const timer = setTimeout(() => finish({ error: 'timeout after ' + timeoutMs + 'ms' }), timeoutMs);
    let buf = Buffer.alloc(0), upgraded = false, statusLine = '';

    sock.on('data', (d) => {
      buf = Buffer.concat([buf, d]);
      if (!upgraded) {
        const end = buf.indexOf('\r\n\r\n');
        if (end === -1) return;
        const head = buf.slice(0, end).toString();
        buf = buf.slice(end + 4);
        statusLine = head.split('\r\n')[0];
        if (!/ 101 /.test(statusLine)) {
          clearTimeout(timer);
          return finish({ upgraded: false, status: statusLine, head: head.slice(0, 400) });
        }
        if (!new RegExp('sec-websocket-accept:\\s*' + accept.replace(/[+/=]/g, m => '\\' + m), 'i').test(head)) {
          clearTimeout(timer);
          return finish({ upgraded: false, status: statusLine, head: 'bad Sec-WebSocket-Accept' });
        }
        upgraded = true;
        if (!expectEcho) { clearTimeout(timer); return finish({ upgraded: true, status: statusLine }); }
        // masked client frame
        const mask = crypto.randomBytes(4);
        const payload = Buffer.from(send);
        const masked = Buffer.alloc(payload.length);
        for (let i = 0; i < payload.length; i++) masked[i] = payload[i] ^ mask[i % 4];
        sock.write(Buffer.concat([Buffer.from([0x82, 0x80 | payload.length]), mask, masked]));
      }
      // parse server frames
      while (upgraded && buf.length >= 2) {
        const op = buf[0] & 0x0f;
        let len = buf[1] & 0x7f, off = 2;
        if (len === 126) { if (buf.length < 4) return; len = buf.readUInt16BE(2); off = 4; }
        else if (len === 127) { if (buf.length < 10) return; len = Number(buf.readBigUInt64BE(2)); off = 10; }
        if (buf.length < off + len) return;
        const payload = buf.slice(off, off + len);
        buf = buf.slice(off + len);
        if (op === 0x8) { clearTimeout(timer); return finish({ upgraded: true, status: statusLine, closed: true }); }
        if (op === 0x1 || op === 0x2) {
          clearTimeout(timer);
          return finish({ upgraded: true, status: statusLine, echo: Buffer.from(payload) });
        }
      }
    });
    sock.on('error', (e) => { clearTimeout(timer); finish({ error: e.message }); });
    sock.on('close', () => { clearTimeout(timer); finish({ upgraded, status: statusLine, closedEarly: true }); });
  });
}

(async function main() {
  console.log('\n' + bold('JERKWAD RELAY CHECK') + dim('  ' + ORIGIN) + '\n');
  const notes = [];

  // 1 ---- health
  const h = await getJson('/api/health');
  let healthOk = false, build = null;
  if (h.error) failed('HEALTH  ' + dim('GET /api/health'), h.error);
  else if (h.status === 200 && h.json && h.json.ok) {
    healthOk = true; build = h.json.build;
    pass('HEALTH  ' + dim('GET /api/health'), 'build ' + build);
  } else if (h.status === 404 || /notfound|api not found/.test(h.body)) {
    failed('HEALTH  ' + dim('GET /api/health'), 'HTTP ' + h.status + ' — endpoint missing');
    notes.push('The deployed worker predates /api/health, so it is NOT running the current code. Redeploy it.');
  } else failed('HEALTH  ' + dim('GET /api/health'), 'HTTP ' + h.status + ' ' + h.body);

  // 2 ---- newroom (proves DOOM_KEY + signing)
  const nr = await getJson('/api/newroom');
  let room = null;
  if (nr.error) failed('NEWROOM ' + dim('GET /api/newroom'), nr.error);
  else if (nr.status === 200 && nr.json && nr.json.room) {
    room = nr.json.room;
    pass('NEWROOM ' + dim('GET /api/newroom'), room.slice(0, 20) + '…');
  } else {
    failed('NEWROOM ' + dim('GET /api/newroom'), 'HTTP ' + nr.status + ' ' + nr.body);
    notes.push('Room signing failed — is the DOOM_KEY secret set? (npx wrangler secret put DOOM_KEY)');
  }

  // 3 ---- websocket echo (transport)
  const e = await wsProbe('/api/echo');
  let echoOk = false;
  if (e.error) failed('ECHO    ' + dim('WS  /api/echo'), e.error);
  else if (e.echo) { echoOk = true; pass('ECHO    ' + dim('WS  /api/echo'), 'round-trip ' + [...e.echo].join(',')); }
  else if (e.upgraded) failed('ECHO    ' + dim('WS  /api/echo'), 'upgraded but no echo (endpoint missing → old worker)');
  else failed('ECHO    ' + dim('WS  /api/echo'), (e.status || 'no upgrade') + (e.head ? ' — ' + e.head.split('\n')[0] : ''));

  // 4 ---- the real game socket
  let gameOk = false;
  if (room) {
    const g = await wsProbe('/api/ws/' + room, { expectEcho: false });
    if (g.error) failed('GAME WS ' + dim('WS  /api/ws/<room>'), g.error);
    else if (g.upgraded) { gameOk = true; pass('GAME WS ' + dim('WS  /api/ws/<room>'), 'Durable Object accepted the socket'); }
    else failed('GAME WS ' + dim('WS  /api/ws/<room>'), (g.status || 'no upgrade') + (g.head ? ' — ' + g.head.split('\n')[0] : ''));
  } else {
    console.log('  ' + yellow('–') + ' GAME WS ' + dim('skipped (no room id)'));
  }

  // ---- verdict -------------------------------------------------------------
  const httpOk = healthOk || !!room;
  console.log('\n' + bold('VERDICT'));
  if (gameOk && echoOk) {
    console.log('  ' + green('The relay is fully working, WebSockets included.'));
    console.log('  If a game still will not start, the fault is in the Doom netgame');
    console.log('  layer, not the relay. Check both players are on the SAME deployed');
    console.log('  site build — Chocolate Doom SHA1-compares WADs between peers and');
    console.log('  refuses a mismatch. Hard-refresh both, then retry.');
  } else if (httpOk && !echoOk && !gameOk) {
    console.log('  ' + yellow('HTTP works, WebSockets do not.'));
    console.log('  That is the signature of a worker running the PRE-FIX code, which');
    console.log('  called routerObject.fetch(path, request) with a relative URL — the');
    console.log('  modern runtime rejects that and 500s every upgrade, while plain');
    console.log('  HTTPS routes keep working (which is why the arena shows green).');
    console.log('  ' + bold('Fix: cd workers/doom-relay && npx wrangler deploy'));
    console.log('  Then re-run this; HEALTH should report build relay-2.');
  } else if (!httpOk) {
    console.log('  ' + red('The relay is not reachable at all.'));
    console.log('  Check the DNS record for this subdomain is Proxied (orange cloud)');
    console.log('  and that wrangler.toml routes ' + HOST + '/* to the worker.');
  } else {
    console.log('  ' + yellow('Mixed result — see the failing line above.'));
  }
  for (const n of notes) console.log('  ' + yellow('note: ') + n);
  console.log();
  process.exit(gameOk && echoOk ? 0 : 1);
})();
