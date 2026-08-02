#!/usr/bin/env node
// ============================================================================
// play/index.html layout + audio wiring test.
//
// Loads the real player page at real phone viewports with touch emulation
// (so `pointer: coarse` matches) and measures the ACTUAL canvas box against
// the visible viewport. A stub engine stands in for the 30 MB WASM boot and
// mimics the one behaviour that matters here: SDL rewriting the canvas's
// inline width/height/backing store, which the page has to survive.
//
// Asserts, per viewport:
//   - nothing full-screen covers the game (the old rotate-hint blocked
//     portrait play entirely)
//   - the canvas box fills the visible viewport (not a tiny letterbox)
//   - FIT = object-fit: contain (browser-guaranteed no distortion),
//     FILL = object-fit: fill (edge-to-edge stretch)
//   - the canvas survives SDL rewriting its inline styles
//   - an AudioContext exists before the engine loads and SDL adopts it
//   - the resume handler is persistent, not emscripten's one-shot listenOnce
//
//   node scripts/check-player-layout.js
// ============================================================================
const http = require('http'), fs = require('fs'), path = require('path');

// This is the one validator that needs a real browser. If puppeteer or a
// chromium binary isn't installed, exit 2 = SKIPPED -- reported as skipped,
// never as passed, so a missing browser can't quietly green-light a deploy.
let puppeteer;
try { puppeteer = require(process.env.PUPPETEER || 'puppeteer'); }
catch (e) {
  try { puppeteer = require('/tmp/node_modules/puppeteer'); }
  catch (e2) {
    console.log('SKIPPED — puppeteer not installed (npm install puppeteer to run this)');
    process.exit(2);
  }
}
const CHROME = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
if (!fs.existsSync(CHROME) && !process.env.PUPPETEER_EXECUTABLE_PATH) {
  try { puppeteer.executablePath(); }
  catch (e) {
    console.log('SKIPPED — no chromium binary found (set CHROMIUM=/path/to/chrome)');
    process.exit(2);
  }
}

const ROOT = path.join(__dirname, '..');
const PORT = +(process.env.PORT || 8195);
const DOOM_ASPECT = 4 / 3;

// Real device viewports (CSS px), landscape and portrait.
const VIEWPORTS = [
  { name: 'iPhone 14 landscape', width: 844, height: 390 },
  { name: 'iPhone 14 portrait',  width: 390, height: 844 },
  { name: 'Pixel 7 landscape',   width: 915, height: 412 },
  { name: 'Pixel 7 portrait',    width: 412, height: 915 },
  { name: 'iPad landscape',      width: 1024, height: 768 },
];

// Stands in for fast-doom.js. Emscripten calls preRun/postRun and SDL keeps
// writing inline size onto the canvas — reproduce just that.
const STUB_ENGINE = `
  (function () {
    // Emscripten runtime surface the page's preRun actually calls. Without
    // these the stub threw on Module.addRunDependency and never got as far as
    // touching the canvas, which made the SDL-rewrite assertion vacuous.
    Module.addRunDependency = function () {};
    Module.removeRunDependency = function () {};
    window.FS = { createDataFile: function () {} };
    var c = Module.canvas;
    c.width = 640; c.height = 400;                 // backing store
    try { (Module.preRun || []).forEach(function (f) { f(); }); } catch (e) {
      window.__stubError = String(e && e.message || e);
    }
    // SDL_SetWindowSize: rewrite inline CSS size, exactly what fought the
    // old !important rules. The page must re-assert its own layout.
    c.style.width = '640px';
    c.style.height = '400px';
    window.__sdlRewroteCanvas = true;
    if (Module.onRuntimeInitialized) Module.onRuntimeInitialized();
    (Module.postRun || []).forEach(function (f) { f(); });
  })();
`;

// PLAY_PAGE points the harness at an alternative player page -- used as the
// negative control, to confirm this test actually fails on the old build.
const PLAY_PAGE = process.env.PLAY_PAGE || null;
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.wasm': 'application/wasm' };
const server = http.createServer((rq, rs) => {
  const u = rq.url.split('?')[0];
  if (PLAY_PAGE && (u === '/play/' || u === '/play/index.html')) {
    rs.writeHead(200, { 'Content-Type': 'text/html' });
    return rs.end(fs.readFileSync(PLAY_PAGE));
  }
  if (/(fast-doom|websockets-doom)\.js$/.test(u)) {
    rs.writeHead(200, { 'Content-Type': 'text/javascript' });
    return rs.end(STUB_ENGINE);
  }
  if (u === '/play/freedoom2.wad') {           // don't ship 28 MB into the test
    rs.writeHead(200, { 'Content-Type': 'application/octet-stream' });
    return rs.end(Buffer.alloc(64));
  }
  let p = path.join(ROOT, decodeURIComponent(u));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { rs.writeHead(404); return rs.end('nf'); }
  rs.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
  fs.createReadStream(p).pipe(rs);
});

const near = (a, b, tol) => Math.abs(a - b) <= tol;

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await puppeteer.launch({
    args: ['--no-sandbox', '--autoplay-policy=document-user-activation-required'],
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
  });

  let failures = 0;
  const report = (okFlag, label, detail) => {
    console.log('   ' + (okFlag ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m') + ' ' + label +
      (detail ? '  \x1b[2m' + detail + '\x1b[0m' : ''));
    if (!okFlag) failures++;
  };

  for (const vp of VIEWPORTS) {
    console.log('\n\x1b[1m' + vp.name + '\x1b[0m \x1b[2m' + vp.width + 'x' + vp.height + '\x1b[0m');
    // A FRESH browsing context per viewport. Sharing one leaked the FIT/FILL
    // choice through localStorage, so later viewports started in whatever
    // mode the previous test's button click left behind.
    const ctx = await browser.createBrowserContext();
    const page = await ctx.newPage();
    await page.emulate({
      viewport: { width: vp.width, height: vp.height, isMobile: true, hasTouch: true, deviceScaleFactor: 2 },
      userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148',
    });
    await page.goto(`http://localhost:${PORT}/play/`, { waitUntil: 'networkidle2' });
    await new Promise(r => setTimeout(r, 900));

    const m = await page.evaluate(() => {
      const c = document.getElementById('canvas');
      const r = c.getBoundingClientRect();
      // Anything covering the middle of the screen blocks play. Walk up from
      // the centre point and find the topmost full-screen opaque element.
      const cx = window.innerWidth / 2, cy = window.innerHeight / 2;
      const top = document.elementFromPoint(cx, cy);
      const blockers = [...document.querySelectorAll('body *')].filter(el => {
        const s = getComputedStyle(el), b = el.getBoundingClientRect();
        return s.display !== 'none' && s.visibility !== 'hidden' &&
          +s.opacity > 0.05 && s.pointerEvents !== 'none' &&
          b.width >= window.innerWidth * 0.9 && b.height >= window.innerHeight * 0.9 &&
          !['CANVAS', 'DIV#stage'].includes(el.tagName) && el.id !== 'stage';
      }).map(el => el.tagName + (el.id ? '#' + el.id : ''));
      return {
        cw: r.width, ch: r.height, cx: r.x, cy: r.y,
        vw: window.innerWidth, vh: window.innerHeight,
        topAtCentre: top ? top.tagName + (top.id ? '#' + top.id : '') : null,
        blockers,
        backingW: c.width, backingH: c.height,
        objectFit: getComputedStyle(c).objectFit,
        bodyFill: document.body.classList.contains('fill'),
        sdlRewrote: !!window.__sdlRewroteCanvas,
        stubError: window.__stubError || null,
        hasAudioCtx: !!(window.Module && Module.SDL2 && Module.SDL2.audioContext),
        audioState: (window.Module && Module.SDL2 && Module.SDL2.audioContext)
          ? Module.SDL2.audioContext.state : null,
        fitLabel: (document.getElementById('btn-fit') || {}).textContent,
      };
    });

    report(m.blockers.length === 0, 'no full-screen overlay blocking the game',
      m.blockers.length ? 'blocked by ' + m.blockers.join(', ') : 'centre shows ' + m.topAtCentre);
    report(m.sdlRewrote && !m.stubError, 'stub engine ran and rewrote the canvas inline size',
      m.stubError ? 'stub threw: ' + m.stubError : '');
    // The canvas box fills the visible viewport on both axes; object-fit does
    // the aspect work, so the ELEMENT should be viewport-sized, not tiny.
    report(near(m.cw, m.vw, 2) && near(m.ch, m.vh, 2), 'canvas fills the visible viewport',
      `${Math.round(m.cw)}x${Math.round(m.ch)} vs ${m.vw}x${m.vh}`);
    // FIT = object-fit: contain -> the browser guarantees no distortion,
    // whatever resolution the engine chose. This is the property that was
    // broken before (the old code stretched with object-fit: fill).
    report(m.objectFit === 'contain' && !m.bodyFill,
      'FIT uses object-fit: contain (no distortion, largest undistorted size)',
      'object-fit=' + m.objectFit);
    report(m.hasAudioCtx, 'AudioContext handed to SDL before engine load',
      'state=' + m.audioState);

    // FILL toggles to object-fit: fill (edge to edge). Tolerate the button
    // being absent so the negative control still produces a full report.
    let f = null;
    try {
      await page.click('#btn-fit');
      await new Promise(r => setTimeout(r, 300));
      f = await page.evaluate(() => {
        const c = document.getElementById('canvas');
        return { fit: getComputedStyle(c).objectFit,
          label: document.getElementById('btn-fit').textContent,
          bodyFill: document.body.classList.contains('fill') };
      });
    } catch (e) { f = null; }
    report(!!f && f.fit === 'fill' && f.label === 'FILL' && f.bodyFill,
      'FILL toggles to object-fit: fill (edge to edge)',
      f ? 'object-fit=' + f.fit + ' label=' + f.label : 'no FIT/FILL control on the page');

    await page.close();
    await ctx.close();
  }

  // ---- audio: the resume handler must be PERSISTENT ----------------------
  console.log('\n\x1b[1maudio resume durability\x1b[0m');
  const page = await browser.newPage();
  await page.emulate({ viewport: { width: 844, height: 390, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148' });
  await page.goto(`http://localhost:${PORT}/play/`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 600));
  const audio = await page.evaluate(async () => {
    const ctx = Module.SDL2 && Module.SDL2.audioContext;
    if (!ctx) return { ok: false, why: 'no context' };
    const fire = () => window.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const settle = () => new Promise(r => setTimeout(r, 120));
    const states = [ctx.state];
    // Gesture 1 starts it. Then SUSPEND (what backgrounding the tab does) and
    // gesture again -- emscripten's listenOnce handler is spent after the
    // first gesture, so this is the round that used to stay silent for the
    // rest of the game. Repeat to show it is durable, not just twice-armed.
    fire(); await settle(); states.push(ctx.state);
    await ctx.suspend(); states.push(ctx.state);
    fire(); await settle(); states.push(ctx.state);
    await ctx.suspend(); states.push(ctx.state);
    fire(); await settle(); states.push(ctx.state);
    return { ok: true, states, recovered: states[3] === 'running' && states[5] === 'running' };
  });
  report(audio.ok && audio.recovered,
    'audio recovers after EVERY re-suspend (not emscripten one-shot)',
    audio.states ? audio.states.join(' -> ') : audio.why);
  await page.close();

  await browser.close();
  server.close();
  console.log(failures ? `\n\x1b[31mFAIL\x1b[0m — ${failures} assertion(s)\n`
                       : '\n\x1b[32mOK\x1b[0m — layout and audio wiring correct on all viewports\n');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
