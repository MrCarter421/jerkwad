#!/usr/bin/env node
// ============================================================================
// SESSION SOAK — play a real two-player arena game and report exactly when,
// and why, anyone gets dropped.
//
// check-netgame.js answers "does a game START?". This answers the question
// that one could not: "does it STAY up?". It drives the real pages the way two
// people do — the host through arena/ (GENERATE, PLAY), the joiner rebuilding
// the level from the seed the way the lobby's JOIN does — then holds the game
// for minutes while both players move, and records every engine status line
// and every WebSocket open/close with a timestamp.
//
//   node scripts/check-session.js                 # the LIVE site, 3 minutes
//   DURATION=600 node scripts/check-session.js    # ten minutes
//   node scripts/check-session.js --local         # THIS checkout: the real
//                                                 # pages, the real engine, and
//                                                 # the real Worker under workerd
//
// A game that merely survives being left alone proves little, so it can also
// do to the game what the real world does. One fault per run:
//
//  in the page (works against the live site too)
//   STALL=6             freeze the joiner's page for 6 s — a hidden tab, a
//                       notification shade, a phone that locked
//   STALL_WHO=host      …freeze the host instead
//   DROP=1              close the joiner's game socket from under the engine
//   OFFLINE=6           the joiner's browser goes offline for 6 s
//   LEAVE=join|host     that player navigates away mid-game
//   HARD=1              …with LEAVE: their browser is killed instead (no goodbye)
//   MISMATCH=1          the joiner builds a slightly DIFFERENT level
//
//  on the wire (needs --local: a chaos proxy sits in front of the relay)
//   NETSTALL=5          every byte to and from the relay is held for 5 s, then
//                       delivered — congestion, a wifi→cellular handover
//   ZOMBIE=join|host    that player's connection goes silent forever without
//                       closing — a NAT that forgot it, a path that died
//   RESET=1             every game connection is torn down (TCP reset)
//
// What should happen is derived from the fault (override with EXPECT=…):
//
//   hold      nobody is dropped and the game is still advancing at the end
//   refused   the joiner is turned away BEFORE launch, with the reason (MISMATCH)
//   left      the others learn of a departure promptly and play on (LEAVE=join)
//   ended     the joiner is told the host ended the game, promptly (LEAVE=host)
//   drop      the silent player is dropped — only once the engine's timeout
//             has really expired (STALL longer than the timeout, HARD leave)
//
// Mixed deployments — what happens if only half of it ships:
//   RELAY=doom.yuccabucca.com node scripts/check-session.js --local
//                                this checkout's pages + engine, the LIVE relay
//
// Negative controls — the same scenario against the code that was live:
//   WORKER=/path/old-index.mjs   another relay build   (git show <rev>:workers/doom-relay/index.mjs)
//   ENGINE=/dir/with/old/engine  another engine build  (git show <rev>:play/websockets-doom.wasm …)
//
// Exit 0 = what should happen, happened. 1 = it did not. 2 = SKIPPED (no
// browser tooling installed).
// ============================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const { loadDep, startStack } = require('./lib/stack');

let puppeteer = null;
if (process.env.PUPPETEER) { try { puppeteer = require(process.env.PUPPETEER); } catch (e) {} }
puppeteer = puppeteer || loadDep('puppeteer') || loadDep('puppeteer-core');
if (!puppeteer) { console.log('SKIPPED — puppeteer not installed (npm install)'); process.exit(2); }

const env = process.env;
const who = (v) => (String(v || '').toLowerCase() === 'host' ? 'HOST' : 'JOIN');
const CHROME = env.CHROMIUM || '/opt/pw-browsers/chromium';
const LOCAL = process.argv.includes('--local') || !!env.LOCAL;
let BASE = (env.BASE || 'https://yuccabucca.com/jerkwad').replace(/\/$/, '');
let RELAY = env.RELAY || '';                     // host or full origin; '' = the page's default
const ROOMS = +(env.ROOMS || 8);
const ENEMIES = +(env.ENEMIES || 10);
const START_BUDGET = +(env.START_BUDGET || 150) * 1000;
const FAULT_AT = +(env.FAULT_AT || 20);          // seconds after game start
const SHOTS = env.SHOTS || '';                   // directory for screenshots
const QUIET = !!env.QUIET;

// ---- the fault, and what it ought to produce ---------------------------------
const F = {
  stall: +(env.STALL || 0), stallWho: who(env.STALL_WHO),
  drop: !!+(env.DROP || 0), offline: +(env.OFFLINE || 0),
  leave: env.LEAVE ? who(env.LEAVE) : null, hard: !!+(env.HARD || 0),
  mismatch: !!+(env.MISMATCH || 0),
  netstall: +(env.NETSTALL || 0), zombie: env.ZOMBIE ? who(env.ZOMBIE) : null, reset: !!+(env.RESET || 0),
};
const NEEDS_CHAOS = !!(F.netstall || F.zombie || F.reset);
if (NEEDS_CHAOS && !LOCAL) {
  console.log('NETSTALL / ZOMBIE / RESET act on the wire and need the local stack: add --local');
  process.exit(1);
}
const EXPECT = env.EXPECT || (F.mismatch ? 'refused'
  : F.leave ? (F.hard ? 'drop' : F.leave === 'JOIN' ? 'left' : 'ended') : 'hold');
const DURATION = +(env.DURATION || (EXPECT === 'refused' ? 20 : 180));

const isLocal = (u) => /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:|\/|$)/.test(u);
// A hosted site or relay may only be reachable through an HTTPS proxy (CI,
// sandboxes); the browser never proxies localhost, so mixing the two is fine.
const proxyFor = () => ((isLocal(BASE) && (!RELAY || isLocal(RELAY))) ? '' : (env.SESSION_PROXY || env.HTTPS_PROXY || ''));

const tty = process.stdout.isTTY;
const c = (n, s) => (tty ? `\x1b[${n}m${s}\x1b[0m` : s);
const bold = s => c('1', s), dim = s => c('2', s);
const green = s => c('32', s), red = s => c('31', s), yellow = s => c('33', s);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const T0 = Date.now();
let gameT0 = 0;                       // when BOTH peers reported "game started"
const gameSecs = () => (gameT0 ? (Date.now() - gameT0) / 1000 : null);
const stamp = () => {
  const s = ((Date.now() - (gameT0 || T0)) / 1000).toFixed(1).padStart(6);
  return (gameT0 ? 'game+' : 'boot+') + s + 's';
};
const timeline = [];
function note(label, text, level) {
  timeline.push({ at: Date.now(), game: gameSecs(), who: label, text });
  if (QUIET && !level) return;
  const paint = level === 'bad' ? red : level === 'warn' ? yellow : level === 'good' ? green : dim;
  console.log('  ' + dim(stamp()) + ' ' + label.padEnd(5) + ' ' + paint(text));
}

async function launch() {
  const args = ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader',
    '--autoplay-policy=no-user-gesture-required',
    // Two real players each have a focused, foreground tab. Without these a
    // headless browser may throttle a page it considers hidden, which would
    // inject exactly the stall this test exists to measure.
    '--disable-background-timer-throttling', '--disable-renderer-backgrounding',
    '--disable-backgrounding-occluded-windows'];
  if (proxyFor()) args.push('--proxy-server=' + proxyFor());
  return puppeteer.launch({
    headless: !env.HEADFUL, args,
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    defaultViewport: { width: 960, height: 600 },
  });
}

// The engine's status codes that mean "this player is out of the netgame":
//   7 connect failed · 9 disconnected · 12 (host) a player timed out
//   13 refused by the host · 17 fatal engine error
const OUT = new Set([7, 9, 12, 13, 17]);

// One player. Wires a play/ page for logging: engine status lines, socket
// lifecycle (from CDP, so it is the browser's own account of who closed what).
async function instrument(page, label) {
  const st = { label, page, codes: [], lines: [], started: false, out: [], wsOpens: 0, wsCloses: 0,
    reconnects: 0, rx: 0, tx: 0, lastRx: 0, maxRxGap: 0, errors: [], gone: false, console: [], requests: [] };
  page.on('console', (m) => {
    const t = m.text();
    st.console.push(t.slice(0, 200));
    if (st.console.length > 40) st.console.shift();
    const dm = t.match(/^doom: (\d+),\s*(.*)$/);
    if (dm) {
      const code = +dm[1];
      st.codes.push(code);
      st.lines.push({ code, msg: dm[2], game: gameSecs(), at: Date.now() });
      if (code === 10) st.started = true;
      if (code === 2 && st.started) st.reconnects++;
      if (OUT.has(code)) st.out.push({ code, game: gameSecs(), msg: dm[2] });
      const level = OUT.has(code) || code === 1 ? 'bad'
        : [4, 5, 6, 14, 15, 18].includes(code) ? 'warn' : [10, 16].includes(code) ? 'good' : undefined;
      note(label, `doom ${code}: ${dm[2].slice(0, 110)}`, level);
    } else if (/consistency failure|I_Error|RuntimeError|unreachable|out of bounds/i.test(t) &&
               !/recursive call to I_Error/.test(t)) {
      st.errors.push(t.slice(0, 160));
      note(label, '! ' + t.slice(0, 140), 'bad');
    }
  });
  page.on('pageerror', (e) => {
    if (/Pointer Lock/.test(e.message)) return;          // headless has no gesture; harmless
    st.errors.push('PAGEERROR ' + e.message);
    note(label, 'PAGEERROR ' + e.message.slice(0, 120), 'bad');
  });

  const cdp = await page.target().createCDPSession();
  st.cdp = cdp;
  await cdp.send('Network.enable');
  // What the page asked the network for, and what came back — if a boot
  // stalls, this says on which file.
  cdp.on('Network.requestWillBeSent', (e) => { st.requests.push({ id: e.requestId, url: e.request.url.replace(/^.*\/(?=[^/]*$)/, '').slice(0, 60), t: Date.now() }); });
  cdp.on('Network.responseReceived', (e) => { const r = st.requests.find(x => x.id === e.requestId); if (r) r.status = e.response.status; });
  cdp.on('Network.dataReceived', (e) => { const r = st.requests.find(x => x.id === e.requestId); if (r) r.bytes = (r.bytes || 0) + e.dataLength; });
  cdp.on('Network.loadingFinished', (e) => { const r = st.requests.find(x => x.id === e.requestId); if (r) r.done = Date.now() - r.t; });
  cdp.on('Network.loadingFailed', (e) => { const r = st.requests.find(x => x.id === e.requestId); if (r) r.failed = e.errorText; });
  const sockets = new Map();
  cdp.on('Network.webSocketCreated', (e) => {
    sockets.set(e.requestId, Date.now());
    st.wsOpens++;
    note(label, 'socket #' + st.wsOpens + ' opening');
  });
  cdp.on('Network.webSocketClosed', (e) => {
    const t = sockets.get(e.requestId);
    st.wsCloses++;
    note(label, 'socket closed after ' + (t ? ((Date.now() - t) / 1000).toFixed(1) + 's' : '?'), 'warn');
  });
  cdp.on('Network.webSocketFrameReceived', () => {
    const now = Date.now();
    if (st.started && st.lastRx) st.maxRxGap = Math.max(st.maxRxGap, now - st.lastRx);
    st.lastRx = now; st.rx++;
  });
  cdp.on('Network.webSocketFrameSent', () => { st.tx++; });
  return st;
}

// Wander like a player: hold a direction, turn, fire, open doors.
function wander(st) {
  let stop = false;
  (async () => {
    const moves = [['ArrowUp', 900], ['ArrowLeft', 350], ['ArrowUp', 700], ['ArrowRight', 420],
      ['Space', 120], ['ArrowUp', 600], ['ControlLeft', 150], ['ArrowDown', 300], ['ArrowLeft', 500]];
    let i = 0;
    while (!stop && !st.gone) {
      const [key, ms] = moves[i++ % moves.length];
      try { await st.page.keyboard.down(key); await sleep(ms); await st.page.keyboard.up(key); } catch (e) { break; }
      await sleep(120);
    }
  })();
  return () => { stop = true; };
}

// evaluate() that cannot hang the test on a frozen or closed page
const peek = async (st, fn, ...args) => {
  if (st.gone) return null;
  try { return await Promise.race([st.page.evaluate(fn, ...args), sleep(4000).then(() => null)]); }
  catch (e) { return null; }
};
const screen = (st) => peek(st, () => {
  const text = (id) => ((document.getElementById(id) || {}).innerText || '').replace(/\s+/g, ' ').trim();
  const shown = (id) => { const el = document.getElementById(id); return !!el && getComputedStyle(el).display !== 'none'; };
  return {
    hint: text('hint'),
    netlost: text('netlost'), stopped: text('enginestopped'),
    banner: shown('netbanner') ? text('netbanner') : '',
    boot: document.getElementById('boot').classList.contains('hidden') ? '' : text('bootmsg'),
    waiting: text('netstatus'),
  };
});

// Is the game itself moving? Game traffic only flows while the lockstep
// advances (an idle link carries one keepalive a second), so a steady stream
// of frames from the peer is the netgame's pulse.
async function pulse(st, ms = 3000) {
  const a = st.rx; await sleep(ms); return (st.rx - a) / (ms / 1000);
}

// Relay queries run INSIDE the arena page rather than from Node: the browser
// already has whatever proxy/network path the game itself uses, so this
// measures the same route the players are on.
async function relayGet(arenaPage, url) {
  try {
    return await Promise.race([
      arenaPage.evaluate(async (u) => {
        try { const r = await fetch(u, { cache: 'no-store' }); return r.ok ? await r.json() : null; }
        catch (e) { return null; }
      }, url),
      sleep(8000).then(() => null),
    ]);
  } catch (e) { return null; }
}

(async () => {
  let stack = null;
  if (LOCAL) {
    try {
      stack = await startStack({ port: +(env.PORT || 8188), relayPort: +(env.RELAY_PORT || 8787),
        worker: env.WORKER ? path.resolve(env.WORKER) : undefined,
        engineDir: env.ENGINE ? path.resolve(env.ENGINE) : undefined,
        chaos: NEEDS_CHAOS, chaosPort: +(env.CHAOS_PORT || 8786) });
    } catch (e) {
      if (e.code === 'NO_DEP') { console.log('SKIPPED — ' + e.message); process.exit(2); }
      throw e;
    }
    // RELAY=<host> with --local: this checkout's pages and engine against a
    // DEPLOYED relay — "what if only the site were deployed?"
    BASE = stack.base; RELAY = env.RELAY || stack.relayOrigin;
  }
  const faultName = Object.entries({ STALL: F.stall && F.stall + 's ' + F.stallWho, DROP: F.drop, OFFLINE: F.offline && F.offline + 's',
    LEAVE: F.leave && F.leave + (F.hard ? ' (killed)' : ''), MISMATCH: F.mismatch, NETSTALL: F.netstall && F.netstall + 's',
    ZOMBIE: F.zombie, RESET: F.reset }).filter(([, v]) => v).map(([k, v]) => k + (v === true ? '' : '=' + v)).join(' ') || 'none';
  console.log('\n' + bold('SESSION SOAK') + dim('  ' + BASE + (RELAY ? '  relay ' + RELAY : '') + (proxyFor() ? '  via proxy' : '') +
    (env.WORKER ? '  worker ' + path.basename(env.WORKER) : '') + (env.ENGINE ? '  engine ' + path.basename(env.ENGINE) : '')));
  console.log(dim('  fault: ') + faultName + dim('   expect: ') + EXPECT + dim('   hold: ' + DURATION + 's') + '\n');

  const hostBrowser = await launch(), joinBrowser = await launch();
  const cleanup = async () => {
    try { await hostBrowser.close(); } catch (e) {}
    try { await joinBrowser.close(); } catch (e) {}
    if (stack) await stack.close();
  };
  const arenaUrl = BASE + '/arena/' + (RELAY ? '?relay=' + encodeURIComponent(RELAY) : '');

  // ---- HOST: the real arena page, the real buttons ------------------------
  const hostArena = await hostBrowser.newPage();
  await hostArena.goto(arenaUrl, { waitUntil: 'domcontentloaded' });
  await hostArena.waitForFunction(() => /relay online/.test(document.getElementById('relaystat').textContent),
    { timeout: 30000 }).catch(() => {});
  const relayUp = await hostArena.evaluate(() => document.getElementById('relaystat').textContent);
  note('ARENA', relayUp.trim().slice(0, 110));
  if (!/relay online/.test(relayUp)) {
    console.log(red('\n  The arena reports the relay offline — nothing to soak.\n'));
    await cleanup(); process.exit(1);
  }
  await hostArena.evaluate((rooms, enemies) => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.oninput && el.oninput(); };
    set('rooms', rooms); set('enemies', enemies);
    document.getElementById('players').value = '2';
    document.getElementById('pub').checked = false;      // private: nothing published
  }, ROOMS, ENEMIES);
  await hostArena.click('#generate');
  await hostArena.waitForFunction(() => !document.getElementById('play').disabled, { timeout: 60000 });
  const level = await hostArena.evaluate(() => ({ seed: current.seed, rooms: current.roomCount,
    enemies: current.enemyCount, stat: document.getElementById('genstat').textContent }));
  note('ARENA', 'generated: ' + level.stat);

  const popup = new Promise((resolve) => hostBrowser.once('targetcreated', async (t) => resolve(await t.page())));
  await hostArena.click('#play');
  const hostPage = await popup;
  const host = await instrument(hostPage, 'HOST');
  await hostPage.waitForFunction(() => /[?&]ws=/.test(location.search), { timeout: 60000 });
  const wsUrl = new URL(hostPage.url()).searchParams.get('ws');
  const room = (wsUrl.match(/\/api\/ws\/([^/?]+)/) || [])[1];
  const apiOrigin = wsUrl.replace(/^ws/, 'http').replace(/\/api\/ws\/.*$/, '');
  const playBuild = await hostPage.evaluate(() => (document.querySelector('#boot .msg[style]') || {}).textContent || '?');
  const health = await relayGet(hostArena, apiOrigin + '/api/health');
  note('HOST', 'page: ' + playBuild + '   relay: ' + (health ? health.build : '?') + '   room ' + room.slice(0, 12) + '…');

  // Let the host boot and announce itself before the joiner arrives.
  const hostBoot = Date.now();
  while (Date.now() - hostBoot < 60000 && !host.codes.includes(8)) await sleep(500);
  await sleep(3000);

  // ---- JOINER: rebuild the same level from the seed, exactly as JOIN does ---
  const joinArena = await joinBrowser.newPage();
  await joinArena.goto(arenaUrl, { waitUntil: 'domcontentloaded' });
  await joinArena.waitForFunction(() => window.JerkwadEngine && typeof generate === 'function', { timeout: 30000 });
  if (F.mismatch) note('JOIN', 'FAULT: building a DIFFERENT level than the host (one extra monster)', 'warn');
  await joinArena.evaluate(async (lv, mismatch) => {
    const set = (id, v) => { const el = document.getElementById(id); el.value = v; el.oninput && el.oninput(); };
    set('rooms', lv.rooms); set('enemies', lv.enemies + (mismatch ? 1 : 0));
    generate(lv.seed);
    await saveWad(current.wadBuf);
  }, level, F.mismatch);
  const joinPage = await joinBrowser.newPage();
  const join = await instrument(joinPage, 'JOIN');
  await joinPage.goto(BASE + '/play/?wait=1&join=1&ws=' + encodeURIComponent(wsUrl), { waitUntil: 'domcontentloaded' });

  // ---- wait for launch -----------------------------------------------------
  const t0 = Date.now();
  while (Date.now() - t0 < START_BUDGET && !(host.started && join.started) && !join.out.length) {
    // The host's START control only matters if the engine is waiting on it.
    if (!host.started && join.codes.includes(8)) {
      await hostPage.evaluate(() => {
        const b = document.querySelector('#netstatus button');
        if (b && /START NOW/.test(b.textContent)) b.click();
      }).catch(() => {});
    }
    await sleep(1000);
  }

  // ---- MISMATCH: the right outcome is that there is no game ------------------
  if (EXPECT === 'refused') {
    await sleep(4000);
    const js = await screen(join), hs = await screen(host);
    const refusedLine = join.lines.find(l => l.code === 13);
    const checks = [
      [!!refusedLine && /LEVEL MISMATCH/i.test(refusedLine.msg), 'the host\'s engine refused the joiner, and said why',
        refusedLine ? refusedLine.msg : 'no "doom: 13" line — codes [' + join.codes + ']'],
      [!join.started, 'the joiner never entered a game it could not stay in step with'],
      [!!js && /LEVEL MISMATCH/i.test(js.boot), 'the joiner\'s screen explains it', js ? JSON.stringify(js.boot.slice(0, 90)) : 'page not readable'],
      [host.codes.includes(14), 'the host is told a player was turned away', 'host codes [' + host.codes + ']'],
      [!!hs && /turned away/i.test(hs.waiting), 'the host\'s waiting screen says so', hs ? JSON.stringify(hs.waiting.slice(0, 60)) : ''],
      [!host.out.length, 'the host is unaffected and still waiting'],
    ];
    console.log('\n' + bold('RESULT') + dim('  expect: refused'));
    let bad = 0;
    for (const [ok, label, detail] of checks) {
      if (!ok) bad++;
      console.log('  ' + (ok ? green('✓') : red('✗')) + ' ' + label + (detail ? dim('  ' + detail) : ''));
    }
    if (join.started && host.started) console.log(dim('  (the game LAUNCHED with mismatched levels — keep watching: DURATION=120 EXPECT=hold shows what follows)'));
    console.log();
    await cleanup(); process.exit(bad ? 1 : 0);
  }

  if (!(host.started && join.started)) {
    console.log('\n' + bold('RESULT') + '  ' + red('✗ the game never started') +
      dim(`  host codes [${host.codes}]  join codes [${join.codes}]`));
    // Say where each page got to: a boot that hangs is otherwise just silence.
    for (const st of [host, join]) {
      const v = await screen(st);
      console.log(dim(`  ${st.label} boot screen: ` + JSON.stringify(v ? (v.boot || v.waiting || v.hint).slice(0, 200) : 'page not responding')));
      // Only what did not finish, with how far it got: status and bytes
      // separate "never answered" from "answered, then stalled mid-body".
      const stuck = st.requests.filter(r => r.failed || r.done == null);
      console.log(dim(`  ${st.label} requests: ${st.requests.length} sent, ` + (stuck.length
        ? 'UNFINISHED: ' + stuck.map(r => r.url + (r.failed ? ' FAILED ' + r.failed
          : ` …pending ${((Date.now() - r.t) / 1000).toFixed(0)}s (HTTP ${r.status || 'no response'}, ${r.bytes || 0} bytes)`)).join(', ').slice(0, 500)
        : 'all finished')));
      console.log(dim(`  ${st.label} last console: ` + st.console.slice(-6).join(' | ').slice(0, 500)));
    }
    console.log();
    await cleanup(); process.exit(1);
  }
  gameT0 = Date.now();
  note('BOTH', 'game started — holding for ' + DURATION + 's', 'good');
  for (const st of [host, join]) { st.rx = 0; st.tx = 0; st.lastRx = Date.now(); st.maxRxGap = 0; }
  const stopHost = wander(host), stopJoin = wander(join);
  const byLabel = { HOST: host, JOIN: join };

  // ---- hold, inject the fault, sample ---------------------------------------
  let faultAt = null, shot = 0, lastSample = Date.now();
  while (gameSecs() < DURATION) {
    await sleep(1000);

    if (faultAt === null && gameSecs() >= FAULT_AT && faultName !== 'none') {
      faultAt = Date.now();
      if (F.stall) {
        const v = byLabel[F.stallWho];
        note(v.label, `FAULT: page frozen for ${F.stall}s (hidden tab / locked phone)`, 'warn');
        // A synchronous busy-wait is what a frozen tab is to the engine: no
        // frames, no timers, no socket callbacks — and the sockets stay open.
        v.page.evaluate((ms) => { const end = performance.now() + ms; while (performance.now() < end) {} },
          F.stall * 1000).catch(() => {});
      } else if (F.offline) {
        note('JOIN', `FAULT: browser offline for ${F.offline}s`, 'warn');
        await join.cdp.send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
        setTimeout(() => join.cdp.send('Network.emulateNetworkConditions',
          { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 }).catch(() => {}), F.offline * 1000);
      } else if (F.drop) {
        note('JOIN', 'FAULT: game socket closed from under the engine', 'warn');
        await joinPage.evaluate(() => {
          const t = (typeof WS !== 'undefined' && WS.sockets) || [];
          for (const s of t) { if (s && s.readyState === 1) { try { s.close(); } catch (e) {} } }
        }).catch(() => {});
      } else if (F.leave) {
        const v = byLabel[F.leave];
        note(v.label, F.hard ? 'FAULT: browser killed (no chance to say goodbye)' : 'FAULT: player navigates away', 'warn');
        v.gone = true;
        if (F.hard) { try { (v === host ? hostBrowser : joinBrowser).process().kill('SIGKILL'); } catch (e) {} }
        else v.page.goto('about:blank').catch(() => {});
      } else if (F.netstall) {
        note('WIRE', `FAULT: all relay traffic held for ${F.netstall}s`, 'warn');
        stack.chaos.stall(F.netstall * 1000);
      } else if (F.zombie) {
        const n = stack.chaos.kill(F.zombie === 'HOST' ? 0 : 1);
        note('WIRE', `FAULT: ${F.zombie}'s connection went silent without closing (${n} socket)`, 'warn');
      } else if (F.reset) {
        note('WIRE', `FAULT: ${stack.chaos.reset()} game connection(s) reset`, 'warn');
      }
    }

    if (Date.now() - lastSample >= 15000) {
      lastSample = Date.now();
      const rs = await relayGet(hostArena, apiOrigin + '/api/room/' + room);
      note('STAT', `relay players=${rs ? rs.players : '?'}  host rx/tx ${host.rx}/${host.tx} gap ${host.maxRxGap}ms` +
        `  |  join rx/tx ${join.rx}/${join.tx} gap ${join.maxRxGap}ms`);
      if (SHOTS) {
        fs.mkdirSync(SHOTS, { recursive: true });
        for (const st of [host, join]) {
          if (st.gone) continue;
          try { await st.page.screenshot({ path: path.join(SHOTS, `${st.label.toLowerCase()}-${String(shot).padStart(2, '0')}.png`) }); } catch (e) {}
        }
        shot++;
      }
    }
    // Nothing more to learn once both are out, or once the expected ending has happened.
    if (host.out.length && join.out.length && !env.KEEP_GOING) { await sleep(3000); break; }
    if (faultAt && EXPECT === 'left' && host.codes.includes(18) && Date.now() - faultAt > 12000) break;
    if (faultAt && EXPECT === 'ended' && join.out.length && Date.now() - faultAt > 6000) break;
    if (faultAt && EXPECT === 'drop' && (host.out.length || join.out.length) && !env.KEEP_GOING) { await sleep(4000); break; }
  }
  const beat = { HOST: host.gone ? 0 : await pulse(host), JOIN: join.gone ? 0 : await pulse(join) };
  stopHost(); stopJoin();
  const view = { HOST: await screen(host), JOIN: await screen(join) };
  if (SHOTS) for (const st of [host, join]) { if (!st.gone) { try { await st.page.screenshot({ path: path.join(SHOTS, st.label.toLowerCase() + '-final.png') }); } catch (e) {} } }

  // ---- verdict ---------------------------------------------------------------
  console.log('\n' + bold('RESULT') + dim('  expect: ' + EXPECT + '   held ' + gameSecs().toFixed(0) + 's'));
  const checks = [];
  const add = (ok, label, detail) => checks.push([ok, label, detail]);
  const since = (st, code) => { const l = st.lines.find(x => x.code === code && faultAt && x.at >= faultAt); return l ? (l.at - faultAt) / 1000 : null; };
  const outText = (st) => st.out.map(o => `doom ${o.code} at game+${(o.game || 0).toFixed(1)}s "${o.msg.slice(0, 50)}"`).join('; ');

  if (EXPECT === 'hold') {
    for (const st of [host, join]) {
      add(!st.out.length, `${st.label} stayed in the game`, st.out.length ? outText(st) : `sockets ${st.wsOpens}  reconnects ${st.reconnects}  longest silence ${st.maxRxGap}ms`);
      add(beat[st.label] >= 15, `${st.label}'s game is still advancing`, beat[st.label].toFixed(0) + ' packets/s from the other player');
      add(!st.errors.length, `${st.label} engine raised no errors`, st.errors[0]);
      const v = view[st.label];
      if (v) add(!v.netlost && !v.stopped && !v.boot, `${st.label}'s screen shows a game, not a failure`,
        (v.netlost || v.stopped || v.boot || '').slice(0, 80));
    }
    if (F.stall || F.netstall) {
      const waiter = F.netstall ? host : byLabel[F.stallWho === 'HOST' ? 'JOIN' : 'HOST'];
      if (waiter.codes.includes(15)) add(waiter.codes.includes(16), `${waiter.label} was told it was waiting, and then that play resumed`);
    }
  } else if (EXPECT === 'left') {
    const t = since(host, 18);
    add(t !== null && t < 10, 'the host learned the joiner had left within seconds', t === null ? 'no "doom: 18" — codes [' + host.codes + ']' : t.toFixed(1) + 's after they went');
    add(!host.codes.includes(12), 'nobody had to wait for a timeout');
    add(!host.out.length, 'the host is still in its game', outText(host));
    add(!host.errors.length, 'the host engine raised no errors', host.errors[0]);
  } else if (EXPECT === 'ended') {
    const t = since(join, 9);
    const l = join.lines.find(x => x.code === 9);
    add(t !== null && t < 10, 'the joiner was told within seconds', t === null ? 'no "doom: 9" — codes [' + join.codes + ']' : t.toFixed(1) + 's after the host went');
    add(!!l && /ended the game/.test(l.msg), 'and told WHY: the host ended the game', l ? l.msg : '');
    add(!!view.JOIN && /NO LONGER IN THE NETGAME/i.test(view.JOIN.netlost), 'the joiner\'s screen explains it and offers a way on',
      view.JOIN ? JSON.stringify(view.JOIN.netlost.slice(0, 70)) : '');
    add(!join.errors.length, 'the joiner engine raised no errors', join.errors[0]);
  } else if (EXPECT === 'drop') {
    const victim = F.leave ? byLabel[F.leave] : byLabel[F.stallWho];
    const other = victim === host ? join : host;
    const code = other === host ? 12 : 9;
    const t = since(other, code);
    add(t !== null, `${other.label} dropped the silent player`, t === null ? 'codes [' + other.codes + ']' : t.toFixed(1) + 's after they went quiet');
    if (t !== null) add(t > 8, 'but only after really waiting for them', t.toFixed(1) + 's (the old engine gave up after 4)');
    add(!other.errors.length, `${other.label} engine raised no errors`, other.errors[0]);
  }

  let bad = 0;
  for (const [ok, label, detail] of checks) {
    if (!ok) bad++;
    console.log('  ' + (ok ? green('✓') : red('✗')) + ' ' + label + (detail ? dim('  ' + detail) : ''));
  }
  // Not a failure, but worth seeing: a page whose big download stalled and
  // had to be restarted got into the game late.
  for (const st of [host, join]) {
    const big = st.requests.filter(r => /freedoom2\.wad/.test(r.url));
    if (big.length > 1) {
      console.log('  ' + yellow('!') + ` ${st.label}'s game-data download stalled and was retried ` +
        dim(big.map(r => r.failed ? `aborted after ${r.bytes || 0} bytes (HTTP ${r.status || 'no response'})` : r.done != null ? `ok in ${r.done}ms` : 'pending').join(' → ')));
    }
  }
  for (const st of [host, join]) {
    const v = view[st.label];
    if (v && (v.netlost || v.stopped || v.banner || v.boot)) {
      console.log(dim(`  ${st.label} screen: ` + JSON.stringify((v.netlost || v.stopped || v.boot || v.banner).slice(0, 120))));
    }
  }
  console.log();
  if (env.TIMELINE) fs.writeFileSync(env.TIMELINE, JSON.stringify(timeline, null, 1));
  await cleanup();
  process.exit(bad ? 1 : 0);
})().catch(async (e) => { console.error(e); process.exit(1); });
