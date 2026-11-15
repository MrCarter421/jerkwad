// ============================================================================
// Local test stack — the whole multiplayer system on localhost:
//
//   static server   the real arena/ and play/ pages, engine and IWAD
//   relay           workers/doom-relay/index.mjs, UNMODIFIED, running under
//                   workerd (Cloudflare's own runtime) via Miniflare — real
//                   Durable Objects, real WebSocketPair, strict-mode modules
//
// The earlier netgame test used a hand-written port of the relay's routing.
// A port can only reproduce the bugs its author already knows about: the
// undeclared `i` that threw on every close was invisible to it until someone
// re-typed the mistake on purpose. Running the actual file under the actual
// runtime removes that gap.
//
// Used by scripts/dev-stack.js (play it yourself in two browser windows) and
// scripts/check-session.js --local (the automated soak).
// ============================================================================
'use strict';
const http = require('http');
const net = require('net');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');
// JERKWAD_SITE=<dir> serves the pages, engine and IWAD from ANOTHER checkout
// while the tests and the relay come from this one — the way to run today's
// tests against yesterday's site (`git worktree add /tmp/old <rev>`), which is
// the only real proof that a test can fail.
const SITE = process.env.JERKWAD_SITE ? path.resolve(process.env.JERKWAD_SITE) : ROOT;

// Same idea as lib/esbuild.js: find a dev dependency wherever it lives, and
// say how to get it when it is missing rather than throwing a stack trace.
function loadDep(name) {
  const candidates = [
    process.env['JERKWAD_' + name.toUpperCase().replace(/[^A-Z0-9]/g, '_')],  // explicit override
    name,
    path.join(ROOT, 'node_modules', name),
    path.join(ROOT, '.deploy-tools', 'node_modules', name),
    '/tmp/node_modules/' + name,
  ].filter(Boolean);
  if (process.env.JERKWAD_NODE_MODULES) candidates.unshift(path.join(process.env.JERKWAD_NODE_MODULES, name));
  for (const c of candidates) {
    try { return require(c); } catch (e) { /* next */ }
  }
  return null;
}

const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript',
  '.wasm': 'application/wasm', '.json': 'application/json', '.css': 'text/css',
  '.png': 'image/png', '.svg': 'image/svg+xml',
};

// engineDir: serve play/*-doom.{js,wasm} from another directory. The pages and
// the relay stay as they are while the ENGINE is swapped — which is how to
// show what a fix actually changed (run the same scenario against the old
// binaries: `git show <commit>:play/websockets-doom.wasm > dir/…`).
//
// hang: { match: /regex/, times: N, afterBytes: M } — the first N requests
// whose path matches get their headers and M bytes, then nothing, ever: a
// download that stalls mid-transfer on a bad connection. For testing that
// the player page notices and starts again (scripts/check-boot.js).
function startStatic(port, { engineDir, hang } = {}) {
  let hangsLeft = hang ? (hang.times == null ? 1 : hang.times) : 0;
  const server = http.createServer((rq, rs) => {
    let rel;
    try { rel = decodeURIComponent(rq.url.split('?')[0]); } catch (e) { rs.writeHead(400); return rs.end('bad path'); }
    const engineFile = engineDir && (rel.match(/^\/play\/((?:websockets|fast)-doom\.(?:js|wasm))$/) || [])[1];
    if (engineFile && fs.existsSync(path.join(engineDir, engineFile))) {
      rs.writeHead(200, { 'Content-Type': MIME[path.extname(engineFile)], 'Cache-Control': 'no-store' });
      return fs.createReadStream(path.join(engineDir, engineFile)).pipe(rs);
    }
    // Stay inside the repo, and never serve the things a real deploy would
    // not publish either.
    const p0 = path.normalize(path.join(SITE, rel));
    if (!p0.startsWith(SITE) || /(^|[\\/])(\.git|node_modules|workers)([\\/]|$)/.test(path.relative(SITE, p0))) {
      rs.writeHead(404); return rs.end('nf');
    }
    let p = p0;
    if (fs.existsSync(p) && fs.statSync(p).isDirectory()) {
      if (!rel.endsWith('/')) { rs.writeHead(301, { Location: rel + '/' }); return rs.end(); }
      p = path.join(p, 'index.html');
    }
    if (!fs.existsSync(p)) { rs.writeHead(404); return rs.end('nf'); }
    rs.writeHead(200, {
      'Content-Type': MIME[path.extname(p)] || 'application/octet-stream',
      // As a real static host does — the player page sizes its download
      // buffer and its progress bar from this.
      'Content-Length': fs.statSync(p).size,
      // Test iterations must never see a stale page or engine.
      'Cache-Control': 'no-store',
    });
    if (hangsLeft > 0 && hang.match.test(rel)) {
      hangsLeft--;
      const n = Math.min(hang.afterBytes || 0, fs.statSync(p).size - 1);
      if (n > 0) fs.createReadStream(p, { start: 0, end: n - 1 }).pipe(rs, { end: false });
      return;                                  // …and never finish
    }
    fs.createReadStream(p).pipe(rs);
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve(server));
  });
}

async function startRelay({ port = 8787, worker, key = 'local-dev-key-not-a-secret' } = {}) {
  const mfLib = loadDep('miniflare');
  if (!mfLib) throw Object.assign(new Error('miniflare not installed (npm install miniflare)'), { code: 'NO_DEP' });
  const workerPath = worker || path.join(ROOT, 'workers', 'doom-relay', 'index.mjs');
  const mf = new mfLib.Miniflare({
    host: '127.0.0.1', port,
    // An explicit module list: workerd refuses module names containing "..",
    // which is what a scriptPath outside the cwd turns into.
    modules: [{ type: 'ESModule', path: 'index.mjs', contents: fs.readFileSync(workerPath, 'utf8') }],
    // Keep in step with workers/doom-relay/wrangler.toml.
    compatibilityDate: '2024-01-01',
    durableObjects: {
      router: { className: 'Router', useSQLite: true },
      lobby: { className: 'Lobby', useSQLite: true },
    },
    bindings: { DOOM_KEY: key },
  });
  await mf.ready;
  return { mf, origin: 'http://localhost:' + port, close: () => mf.dispose() };
}

// ---------------------------------------------------------------------------
// Chaos proxy — a plain TCP pass-through in front of the relay that can be
// told to misbehave the way real networks do. Page-level faults (freeze a tab,
// close a socket from script) cannot produce these; they happen BELOW the
// browser, and they are what a phone on a train actually experiences.
//
//   stall(ms)        hold every byte, both ways, then deliver it all late.
//                    A congested link, a wifi→cellular handover, one lost
//                    segment on a weak signal: nothing is closed, nothing
//                    arrives, and then everything arrives.
//   kill(which)      the connection goes silent FOREVER and is never closed.
//                    A NAT that forgot the mapping, a path that died without
//                    a FIN. Neither end is told; only a new connection works.
//   reset(which)     the connection is torn down (RST). The honest failure.
//
// `which` picks game sockets in the order they connected (0 = the host, since
// the tests start it first); omit it for all of them.
// ---------------------------------------------------------------------------
function startChaosProxy({ port = 8786, targetPort = 8787 } = {}) {
  const conns = new Set();
  let holdUntil = 0, held = [];
  const flush = () => { const q = held; held = []; for (const [sock, chunk] of q) { try { sock.write(chunk); } catch (e) {} } };

  const server = net.createServer((client) => {
    const upstream = net.connect(targetPort, '127.0.0.1');
    const c = { client, upstream, dead: false, game: false, sniffed: false };
    conns.add(c);
    const forward = (from, to) => from.on('data', (chunk) => {
      if (!c.sniffed && from === client) {
        c.sniffed = true;
        c.game = /^GET \/api\/ws\//.test(chunk.toString('latin1', 0, 24));
        if (c.game) c.order = [...conns].filter(x => x.game).length - 1;
      }
      if (c.dead) return;                                   // swallowed, silently
      if (Date.now() < holdUntil) { held.push([to, chunk]); return; }
      try { to.write(chunk); } catch (e) {}
    });
    forward(client, upstream); forward(upstream, client);
    const done = () => { conns.delete(c); if (!c.dead) { client.destroy(); upstream.destroy(); } };
    client.on('close', done); upstream.on('close', done);
    client.on('error', () => {}); upstream.on('error', () => {});
  });

  const pick = (which) => [...conns].filter(c => c.game && !c.dead && (which == null || c.order === which));
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => resolve({
      origin: 'http://localhost:' + port,
      stall(ms) { holdUntil = Date.now() + ms; setTimeout(flush, ms + 5); },
      kill(which) { const v = pick(which); v.forEach(c => { c.dead = true; }); return v.length; },
      reset(which) { const v = pick(which); v.forEach(c => { c.client.destroy(); c.upstream.destroy(); }); return v.length; },
      gameSockets: () => pick().length,
      close() { for (const c of conns) { try { c.client.destroy(); c.upstream.destroy(); } catch (e) {} } server.close(); },
    }));
  });
}

// Bring up both halves. Returns the URLs to open and a close() for teardown.
// chaos: true puts the chaos proxy in front of the relay (stack.chaos).
async function startStack({ port = 8188, relayPort = 8787, worker, engineDir, chaos = false, chaosPort = 8786 } = {}) {
  const site = await startStatic(port, { engineDir });
  let relay, proxy = null;
  try {
    relay = await startRelay({ port: relayPort, worker });
    if (chaos) proxy = await startChaosProxy({ port: chaosPort, targetPort: relayPort });
  } catch (e) { site.close(); if (relay) await relay.close(); throw e; }
  const base = 'http://localhost:' + port;
  const relayOrigin = proxy ? proxy.origin : relay.origin;
  return {
    base,
    relayOrigin,
    chaos: proxy,
    arenaUrl: base + '/arena/?relay=' + encodeURIComponent(relayOrigin),
    worker: worker || path.join(ROOT, 'workers', 'doom-relay', 'index.mjs'),
    async close() {
      try { site.close(); } catch (e) {}
      try { if (proxy) proxy.close(); } catch (e) {}
      try { await relay.close(); } catch (e) {}
    },
  };
}

module.exports = { ROOT, SITE, loadDep, startStatic, startRelay, startChaosProxy, startStack };
