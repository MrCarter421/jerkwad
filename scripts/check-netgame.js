#!/usr/bin/env node
// ============================================================================
// End-to-end TWO-PEER netgame test — the real WASM engine, two real browser
// pages, and a local port of the Cloudflare relay's routing logic.
//
// This reproduces the "joiner sits on a black screen and the game never
// starts" bug without needing Cloudflare, and proves whether a fix works.
//
// Pass condition: BOTH peers print `doom: 10, game started`.
//
//   node scripts/check-netgame.js            # headless, ~90s
//   HEADFUL=1 node scripts/check-netgame.js  # watch it
//
// Needs puppeteer + a chromium binary; exits 2 (SKIPPED) without them.
// ============================================================================
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');

let puppeteer, WebSocketServer;
try { puppeteer = require(process.env.PUPPETEER || 'puppeteer'); }
catch (e) { try { puppeteer = require('/tmp/node_modules/puppeteer'); } catch (e2) {
  console.log('SKIPPED — puppeteer not installed'); process.exit(2); } }
try { ({ WebSocketServer } = require('ws')); }
catch (e) { try { ({ WebSocketServer } = require('/tmp/node_modules/ws')); } catch (e2) {
  console.log('SKIPPED — `ws` not installed (npm install ws)'); process.exit(2); } }

const ROOT = path.join(__dirname, '..');
const CHROME = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
if (!fs.existsSync(CHROME)) {
  try { puppeteer.executablePath(); }
  catch (e) { console.log('SKIPPED — no chromium binary'); process.exit(2); }
}
const PORT = +(process.env.PORT || 8188);
const BUDGET_MS = +(process.env.BUDGET_MS || 90000);

const tty = process.stdout.isTTY;
const c = (n, s) => (tty ? `\x1b[${n}m${s}\x1b[0m` : s);
const bold = s => c('1', s), dim = s => c('2', s), green = s => c('32', s), red = s => c('31', s);

// ---- static server: the real play page, engine and IWAD --------------------
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = http.createServer((rq, rs) => {
  let p = path.join(ROOT, decodeURIComponent(rq.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { rs.writeHead(404); return rs.end('nf'); }
  rs.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(rs);
});

// ---- local relay: same routing as workers/doom-relay/index.mjs -------------
// Packets are [to:u32][from:u32][payload]; the relay strips `to` and forwards
// [from][payload] to whoever registered that uid. A packet from uid 1 to uid 0
// is the server announcing itself, and resets the room.
let sessions = [];
const relayLog = [];
const allSockets = [];   // for the blip scenario
const LEGACY = !!process.env.RELAY_LEGACY;
let overlayStuck = false;
function startRelay() {
  const wss = new WebSocketServer({ server, path: '/api/ws/room' });
  wss.on('connection', (ws) => {
    ws.binaryType = 'arraybuffer';
    ws.on('message', (raw) => {
      const buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
      if (buf.length < 8) return;
      const to = buf.readUInt32LE(0), from = buf.readUInt32LE(4);
      if (from === 1 && to === 0) {
        relayLog.push('server announced (uid 1) — resetting room');
        sessions.forEach(s => { if (s.ws !== ws) { try { s.ws.close(1011, 'closing'); } catch (e) {} } });
        sessions = [];
      }
      // Mirrors workers/doom-relay: bind OR REBIND the uid to the socket the
      // packet arrived on. The engine reconnects with the same uid after any
      // blip, and only-add-if-unknown left the relay routing to a dead socket.
      // RELAY_LEGACY reproduces the pre-fix worker for the negative control.
      const known = sessions.find(s => s.from === from);
      if (!known) { sessions.push({ ws, from }); relayLog.push('registered uid ' + from); }
      else if (known.ws !== ws && !LEGACY) { known.ws = ws; relayLog.push('REBOUND uid ' + from); }
      const dst = sessions.find(s => s.from === to);
      if (dst) {
        try { dst.ws.send(buf.slice(4)); }
        catch (e) { sessions = sessions.filter(s => s !== dst); }
      }
    });
    // The pre-fix worker assigned an UNDECLARED `i` here. Worker modules are
    // strict mode, so this handler threw ReferenceError on every close and the
    // session was never removed — leaving a corpse the relay kept routing to.
    ws.on('close', () => { if (!LEGACY) sessions = sessions.filter(s => s.ws !== ws); });
    allSockets.push(ws);
  });
}

// ---- run one peer ----------------------------------------------------------
async function peer(browser, label, url) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const st = { label, codes: [], started: false, uid: null, lastMsg: '', errors: [] };
  page.on('console', (m) => {
    const t = m.text();
    const dm = t.match(/^doom: (\d+),\s*(.*)$/);
    if (dm) {
      st.codes.push(+dm[1]); st.lastMsg = dm[2];
      if (+dm[1] === 8) st.uid = dm[2];
      if (+dm[1] === 10) st.started = true;
      console.log(dim(`    [${label}] doom ${dm[1]}: ${dm[2].slice(0, 70)}`));
    } else if (/I_Error|error:/i.test(t)) {
      st.errors.push(t.slice(0, 120));
      console.log(dim(`    [${label}] ! ${t.slice(0, 90)}`));
    }
  });
  page.on('pageerror', e => st.errors.push('PAGEERROR ' + e.message));
  await page.goto(url, { waitUntil: 'domcontentloaded' });
  st.page = page;
  return st;
}

(async () => {
  await new Promise(r => server.listen(PORT, r));
  startRelay();
  const WS = `ws://localhost:${PORT}/api/ws/room`;
  const browser = await puppeteer.launch({
    headless: !process.env.HEADFUL,
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
  });

  console.log('\n' + bold('TWO-PEER NETGAME TEST') + dim('  real engine, real relay routing\n'));
  console.log('  starting HOST (-server -nodes 2)…');
  const host = await peer(browser, 'HOST',
    `http://localhost:${PORT}/play/?ws=${encodeURIComponent(WS)}&server=1&nodes=2`);

  // Let the host boot and announce before the joiner arrives.
  await new Promise(r => setTimeout(r, 12000));

  // SCENARIO=earlystart reproduces the host tapping START before anyone has
  // joined. The host's waiting screen is invisible in this build (the
  // textscreen does not render to the canvas), so a real user stares at black
  // and presses the START button that the page helpfully provides.
  const tapStart = (times) => host.page.evaluate((n) => {
    const b = document.querySelector('#netstatus button');
    if (!b) return 'no start control';
    for (let i = 0; i < n; i++) b.click();
    return b.textContent;
  }, times);
  if (process.env.SCENARIO === 'earlystart') {
    console.log('  HOST taps START once before the joiner arrives… ' + dim(await tapStart(1)));
    await new Promise(r => setTimeout(r, 6000));
  }
  // The deliberate override: two taps really does start without everyone. The
  // joiner must then get a clear explanation and a solo escape, not black.
  if (process.env.SCENARIO === 'forcestart') {
    console.log('  HOST taps START TWICE (deliberate override)… ' + dim(await tapStart(2)));
    await new Promise(r => setTimeout(r, 8000));
  }
  console.log('  starting JOINER (-connect 1)…');
  const join = await peer(browser, 'JOIN',
    `http://localhost:${PORT}/play/?ws=${encodeURIComponent(WS)}&join=1`);

  const t0 = Date.now();
  while (Date.now() - t0 < BUDGET_MS && !(host.started && join.started)) {
    await new Promise(r => setTimeout(r, 1500));
  }

  // SCENARIO=blip: once both are in, sever a socket from the RELAY side, the
  // way a transient Cloudflare hiccup would. The engine reconnects with the
  // SAME uid, so the relay must rebind that uid to the new socket. If it keeps
  // routing to the corpse, both peers fall silent and Doom times them out —
  // "the game runs a few seconds then everyone gets booted".
  if (process.env.SCENARIO === 'blip' && host.started && join.started) {
    console.log('  severing a relay socket mid-game…');
    const before = host.codes.length + join.codes.length;
    for (const ws of allSockets) { try { ws.close(1011, 'simulated blip'); } catch (e) {} }
    await new Promise(r => setTimeout(r, 25000));
    const dropped = [...host.codes, ...join.codes].slice(before)
      .filter(c => c === 9 || c === 12 || c === 7);
    const rebound = relayLog.filter(l => /REBOUND/.test(l)).length;
    console.log('\n' + bold('BLIP RECOVERY'));
    // The assertion that matters is simply: did the game survive? (rebind
    // count is informational — with a working close handler the reconnect
    // re-registers instead of rebinding, and either route is fine.)
    console.log(dim('  relay: ' + rebound + ' rebind(s), ' +
      relayLog.filter(l => /registered/.test(l)).length + ' registration(s)'));
    console.log('  ' + (dropped.length === 0 ? green('✓') : red('✗')) +
      ' no peer disconnected after the blip  ' + dim('codes ' + JSON.stringify(dropped)));
    await browser.close(); server.close();
    process.exit(dropped.length === 0 ? 0 : 1);
  }

  // Sustained play: the game must still be alive well after launch, not just
  // reach "game started" and die.
  if (process.env.SCENARIO === 'sustain' && host.started && join.started) {
    const before = host.codes.length + join.codes.length;
    console.log('  holding the game for 40s…');
    await new Promise(r => setTimeout(r, 40000));
    const dropped = [...host.codes, ...join.codes].slice(before)
      .filter(c => c === 9 || c === 12 || c === 7);
    console.log('\n' + bold('SUSTAIN') + '  ' +
      (dropped.length === 0 ? green('✓ still connected') : red('✗ dropped: ' + dropped)));
    await browser.close(); server.close();
    process.exit(dropped.length === 0 ? 0 : 1);
  }

  // Did the browser event loop keep turning on each peer, or is the page
  // wedged in a non-yielding C loop? A wedged page cannot answer evaluate().
  const responsive = async (st) => {
    try {
      return await Promise.race([
        st.page.evaluate(() => 1 + 1).then(v => v === 2),
        new Promise(r => setTimeout(() => r('WEDGED'), 5000)),
      ]);
    } catch (e) { return 'WEDGED'; }
  };
  const hostAlive = await responsive(host), joinAlive = await responsive(join);

  // The overlays MUST get out of the way once the game starts. A stuck
  // "WAITING FOR PLAYERS" panel looks exactly like a game that never
  // launched, even though it is running underneath.
  for (const st of [host, join]) {
    try {
      const ui = await st.page.evaluate(() => ({
        netstatus: !!document.getElementById('netstatus'),
        netText: (document.getElementById('netstatus') || {}).innerText || '',
        bootShown: !document.getElementById('boot').classList.contains('hidden'),
        bootMsg: (document.getElementById('bootmsg') || {}).textContent || '',
      }));
      const clean = !ui.netstatus && !ui.bootShown;
      console.log('  ' + (clean ? green('✓') : red('✗')) + ` ${st.label} overlays cleared` +
        dim(`  netstatus=${ui.netstatus ? JSON.stringify(ui.netText.slice(0,40)) : 'gone'}` +
            `  boot=${ui.bootShown ? JSON.stringify(ui.bootMsg.slice(0,50)) : 'hidden'}`));
      if (!clean) overlayStuck = true;
    } catch (e) { console.log('  ? ' + st.label + ' overlay check failed: ' + e.message); }
  }

  console.log('\n' + bold('RESULT'));
  for (const [st, alive] of [[host, hostAlive], [join, joinAlive]]) {
    const ok = st.started;
    console.log('  ' + (ok ? green('✓') : red('✗')) + ` ${st.label.padEnd(5)} ` +
      `started=${ok}  uid=${st.uid || '—'}  codes=[${st.codes.join(',')}]  ` +
      `page=${alive === true ? 'responsive' : red('WEDGED (JS event loop blocked)')}`);
    if (st.errors.length) console.log(dim('        ' + st.errors.slice(0, 2).join(' | ')));
  }
  console.log(dim('\n  relay: ' + (relayLog.join('; ') || 'no traffic')));

  // In forcestart the joiner is SUPPOSED to fail — but gracefully.
  if (process.env.SCENARIO === 'forcestart') {
    const ui = await join.page.evaluate(() => ({
      msg: (document.getElementById('bootmsg') || {}).textContent || '',
      solo: !!document.getElementById('solo-esc'),
      bootVisible: !document.getElementById('boot').classList.contains('hidden'),
    }));
    const good = host.started && !join.started && ui.solo && ui.bootVisible &&
      /already started/i.test(ui.msg);
    console.log('\n' + bold('FORCESTART CHECK') + ' (joiner must fail GRACEFULLY)');
    console.log('  ' + (good ? green('✓') : red('✗')) +
      ' explanation shown: ' + JSON.stringify(ui.msg.slice(0, 80)));
    console.log('  ' + (ui.solo ? green('✓') : red('✗')) + ' solo escape offered');
    await browser.close(); server.close();
    process.exit(good ? 0 : 1);
  }

  const pass = host.started && join.started && !overlayStuck;
  if (!pass) {
    console.log('\n' + bold('DIAGNOSIS'));
    if (relayLog.length < 2) {
      console.log('  Peers never both registered with the relay — the transport never');
      console.log('  carried traffic. Check the engine actually opened the socket.');
    } else if (joinAlive !== true || hostAlive !== true) {
      console.log('  A peer is WEDGED: its JS event loop is blocked, so the WebSocket');
      console.log('  onmessage callback can never run and packets are never delivered.');
      console.log('  NET_WaitForLaunch() spins on TXT_Sleep(100) — a busy loop of');
      console.log('  SDL_Delay(1) that never yields to the browser. Upstream had');
      console.log('  emscripten_sleep(100) there (net_gui.c:327, now commented out),');
      console.log('  which DOES yield under ASYNCIFY. The engine must be rebuilt with');
      console.log('  that restored: scripts/build-doom-wasm.sh applies the patch.');
    } else {
      console.log('  Both pages are responsive and the relay carried traffic, but the');
      console.log('  launch never fired. Look at the codes above:');
      console.log('    9 = disconnected from server, 7 = connect failed, 3 = out of addrs');
    }
  }
  console.log();
  await browser.close();
  server.close();
  process.exit(pass ? 0 : 1);
})().catch(e => { console.error(e); process.exit(1); });
