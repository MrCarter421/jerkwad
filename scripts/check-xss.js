#!/usr/bin/env node
// ============================================================================
// Arena XSS regression test.
//
// Two places on the arena page render text that an outsider controls:
//
//  1. THE LOBBY. It lists levels published by anyone on the internet, with a
//     free-text level NAME. Interpolating that into innerHTML was a stored XSS
//     on the hosting domain: every visitor reading the public arena list ran
//     the publisher's JavaScript, same-origin with the rest of the site.
//
//  2. THE RELAY STATUS LINE. It shows the relay's host, which comes from the
//     ?relay= query parameter — and was also assembled into innerHTML. A
//     crafted link naming a relay the attacker runs ("relay online (<img …>)")
//     ran script on this origin for whoever clicked it.
//
// This serves the real arena/index.html against a stub relay that is hostile
// in both ways, drives the page's REAL render paths, and asserts each payload
// produced zero elements — that it stayed a text node.
//
// A test like this is easy to pass by accident: if the page decides the relay
// is offline, nothing hostile is ever rendered and "0 elements injected" is
// true and meaningless. (That happened — twice.) So each case first proves the
// hostile text REACHED the page: it must be visible, verbatim, as text.
//
// Negative control (must FAIL): put the innerHTML build back in refreshLobby /
// checkRelay and rerun; the payloads execute and set window.__pwned.
//
//   node scripts/check-xss.js          # needs puppeteer + a chromium binary
//   CHROMIUM=/path/to/chrome node scripts/check-xss.js
//
// Exit 0 = inert. 1 = injected, or the hostile text never rendered (which
// proves nothing). 2 = SKIPPED (no browser).
// ============================================================================
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');
const { loadDep } = require('./lib/stack');

// Needs a real browser. Exit 2 = SKIPPED (reported as skipped, never as
// passed) so a machine without puppeteer can't silently green-light a deploy.
let puppeteer = null;
if (process.env.PUPPETEER) { try { puppeteer = require(process.env.PUPPETEER); } catch (e) {} }
puppeteer = puppeteer || loadDep('puppeteer') || loadDep('puppeteer-core');
if (!puppeteer) { console.log('SKIPPED — puppeteer not installed (npm install to run this)'); process.exit(2); }
const CHROME = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
if (!fs.existsSync(CHROME)) {
  try { puppeteer.executablePath(); }
  catch (e) { console.log('SKIPPED — no chromium binary found (set CHROMIUM=/path/to/chrome)'); process.exit(2); }
}

const ROOT = path.join(__dirname, '..'), PORT = +(process.env.PORT || 8196);
const NAME_PAYLOAD = '<img src=x onerror=window.__pwned=1>';
const HOST_PAYLOAD = '<img src=x onerror=window.__pwned=2>';

// The stub answers /api/* under ANY path prefix, because the hostile relay
// value below puts markup into the path.
const srv = http.createServer((rq, rs) => {
  const u = decodeURIComponent(rq.url.split('?')[0]);
  const cors = { 'Access-Control-Allow-Origin': '*', 'content-type': 'application/json' };
  if (u.endsWith('/api/health')) { rs.writeHead(200, cors); return rs.end(JSON.stringify({ ok: true, build: 'relay-4' })); }
  if (u.endsWith('/api/lobby/list')) {
    rs.writeHead(200, cors);
    return rs.end(JSON.stringify({ levels: [
      { room: 'r1-aaaa', name: NAME_PAYLOAD, seed: 1, rooms: 12, enemies: 30, maxPlayers: 4, dm: true, created: Date.now() }] }));
  }
  let p = path.join(ROOT, u);
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!p.startsWith(ROOT) || !fs.existsSync(p)) { rs.writeHead(404); return rs.end('nf'); }
  rs.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html' : p.endsWith('.js') ? 'text/javascript' : 'application/octet-stream' });
  fs.createReadStream(p).pipe(rs);
});

(async () => {
  await new Promise(r => srv.listen(PORT, r));
  const b = await puppeteer.launch({ args: ['--no-sandbox'], executablePath: fs.existsSync(CHROME) ? CHROME : undefined });
  const stub = 'http://localhost:' + PORT;
  let failed = false;
  const report = (ok, label, detail) => {
    if (!ok) failed = true;
    console.log('  ' + (ok ? '✓' : '✗') + ' ' + label + (detail ? '  ' + detail : ''));
  };
  const load = async (relay) => {
    const pg = await b.newPage();
    await pg.goto(stub + '/arena/?relay=' + encodeURIComponent(relay), { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 2500));
    const res = await pg.evaluate(() => ({
      pwned: window.__pwned || 0,
      lobbyText: document.getElementById('lobby').innerText.replace(/\s+/g, ' '),
      lobbyInjected: document.querySelectorAll('#lobby img, #lobby svg, #lobby script, #lobby iframe').length,
      statText: document.getElementById('relaystat').innerText,
      statInjected: document.querySelectorAll('#relaystat img, #relaystat svg, #relaystat script, #relaystat iframe').length,
    }));
    await pg.close();
    return res;
  };

  console.log('\nARENA XSS\n');

  // ---- 1. a hostile level name in the lobby ---------------------------------
  const a = await load(stub);
  report(/relay online/.test(a.statText), 'the page reached the stub relay', JSON.stringify(a.statText.slice(0, 60)));
  report(a.lobbyText.includes(NAME_PAYLOAD), 'the hostile level name was rendered (the test is not vacuous)',
    JSON.stringify(a.lobbyText.slice(0, 70)));
  report(a.lobbyInjected === 0 && !a.pwned, 'lobby: the name stayed text',
    a.lobbyInjected + ' element(s) injected, script ran: ' + (a.pwned ? 'YES' : 'no'));

  // ---- 2. a hostile ?relay= value in the status line ------------------------
  const h = await load(stub + '/' + HOST_PAYLOAD);
  report(/relay online/.test(h.statText) && h.statText.includes(HOST_PAYLOAD),
    'the hostile relay value was rendered (the test is not vacuous)', JSON.stringify(h.statText.slice(0, 90)));
  report(h.statInjected === 0 && !h.pwned, 'status line: the relay value stayed text',
    h.statInjected + ' element(s) injected, script ran: ' + (h.pwned ? 'YES' : 'no'));

  await b.close(); srv.close();
  console.log(failed ? '\nFAIL — see above' : '\nOK — hostile text rendered inert in both places');
  process.exit(failed ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
