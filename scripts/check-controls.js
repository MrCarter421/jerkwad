#!/usr/bin/env node
// ============================================================================
// Control-mapping test for play/index.html.
//
// The engine only ever sees synthetic KeyboardEvents dispatched by sendKey(),
// so this instruments sendKey and asserts the keyCodes it emits — not the
// button labels. Doom's relevant codes:
//
//   38/40  forward/back      37/39  turn left/right
//   188    strafe left (,)   190    strafe right (.)
//   16     run (Shift)       17 fire (Ctrl)   32 use (Space)
//
//   node scripts/check-controls.js
// ============================================================================
'use strict';
const http = require('http'), fs = require('fs'), path = require('path');

let puppeteer;
try { puppeteer = require(process.env.PUPPETEER || 'puppeteer'); }
catch (e) { try { puppeteer = require('/tmp/node_modules/puppeteer'); } catch (e2) {
  console.log('SKIPPED — puppeteer not installed'); process.exit(2); } }
const CHROME = process.env.CHROMIUM || '/opt/pw-browsers/chromium';
if (!fs.existsSync(CHROME)) {
  try { puppeteer.executablePath(); }
  catch (e) { console.log('SKIPPED — no chromium binary'); process.exit(2); }
}

const ROOT = path.join(__dirname, '..');
const PORT = +(process.env.PORT || 8187);
const STUB = `Module.addRunDependency=function(){};Module.removeRunDependency=function(){};
window.FS={createDataFile:function(){}};var c=Module.canvas;c.width=640;c.height=400;
try{(Module.preRun||[]).forEach(function(f){f()})}catch(e){}
if(Module.onRuntimeInitialized)Module.onRuntimeInitialized();
(Module.postRun||[]).forEach(function(f){f()});`;

// PLAY_PAGE aims the harness at an alternative page — the negative control.
const PLAY_PAGE = process.env.PLAY_PAGE || null;
const server = http.createServer((rq, rs) => {
  const u = rq.url.split('?')[0];
  if (PLAY_PAGE && /\/play\/(index\.html)?$/.test(u)) {
    rs.writeHead(200, { 'Content-Type': 'text/html' });
    return rs.end(fs.readFileSync(PLAY_PAGE));
  }
  if (/doom\.js$/.test(u)) { rs.writeHead(200, { 'Content-Type': 'text/javascript' }); return rs.end(STUB); }
  if (/freedoom2\.wad$/.test(u)) { rs.writeHead(200); return rs.end(Buffer.alloc(64)); }
  let p = path.join(ROOT, decodeURIComponent(u));
  if (fs.existsSync(p) && fs.statSync(p).isDirectory()) p = path.join(p, 'index.html');
  if (!fs.existsSync(p)) { rs.writeHead(404); return rs.end('nf'); }
  rs.writeHead(200, { 'Content-Type': /\.html$|\/$/.test(u) ? 'text/html' : 'text/javascript' });
  fs.createReadStream(p).pipe(rs);
});

const tty = process.stdout.isTTY;
const c = (n, s) => (tty ? `\x1b[${n}m${s}\x1b[0m` : s);
const bold = s => c('1', s), dim = s => c('2', s), green = s => c('32', s), red = s => c('31', s);
let fails = 0;
const report = (ok, label, detail) => {
  console.log('  ' + (ok ? green('✓') : red('✗')) + ' ' + label + (detail ? '  ' + dim(detail) : ''));
  if (!ok) fails++;
};

(async () => {
  await new Promise(r => server.listen(PORT, r));
  const browser = await puppeteer.launch({ args: ['--no-sandbox'],
    executablePath: fs.existsSync(CHROME) ? CHROME : undefined });

  // ---- mobile: touch pad + run lock ---------------------------------------
  console.log('\n' + bold('TOUCH PAD') + dim('  (mobile viewport)'));
  const mctx = await browser.createBrowserContext();
  const m = await mctx.newPage();
  await m.emulate({ viewport: { width: 844, height: 390, isMobile: true, hasTouch: true },
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Mobile/15E148' });
  await m.goto(`http://localhost:${PORT}/play/`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 700));
  await m.evaluate(() => {
    // Record sendKey() CALLS, not window events: sendKey dispatches the same
    // event on window, document and canvas, so a window listener sees every
    // key three times and made a single press look like a repeat storm.
    window.__keys = [];
    const real = window.sendKey;
    window.sendKey = function (type, kc) {
      window.__keys.push((type === 'keydown' ? 'D' : 'U') + kc);
      return real.apply(this, arguments);
    };
  });

  // Tolerate a missing control so the negative control still reports fully
  // instead of throwing on the first absent button.
  const tap = async (sel) => {
    const found = await m.evaluate((s) => {
      window.__keys = [];
      const b = document.querySelector(s);
      if (!b) return false;
      b.dispatchEvent(new TouchEvent('touchstart', { bubbles: true, cancelable: true }));
      b.dispatchEvent(new TouchEvent('touchend', { bubbles: true, cancelable: true }));
      return true;
    }, sel);
    if (!found) return ['(no such control)'];
    return m.evaluate(() => window.__keys.slice());
  };
  for (const [sel, want, what] of [
    ['#dpad .l', 'D188', 'main LEFT  = strafe left'],
    ['#dpad .r', 'D190', 'main RIGHT = strafe right'],
    ['#dpad .tl', 'D37', 'corner TL  = turn left'],
    ['#dpad .tr', 'D39', 'corner TR  = turn right'],
    ['#dpad .u', 'D38', 'UP         = forward'],
    ['#dpad .d', 'D40', 'DOWN       = back'],
  ]) {
    const got = await tap(sel);
    report(got.includes(want), what, 'sent ' + JSON.stringify(got));
  }

  // RUN latches Shift down, and only releases on a second tap.
  const runOn = await m.evaluate(() => {
    const b = document.getElementById('btn-run');
    if (!b) return { keys: ['(no RUN button)'], on: false };
    window.__keys = []; b.click();
    return { keys: window.__keys.slice(), on: b.classList.contains('on') };
  });
  report(runOn.keys.includes('D16') && !runOn.keys.includes('U16') && runOn.on,
    'RUN tap 1   = Shift held down (latched)', JSON.stringify(runOn.keys));
  const runOff = await m.evaluate(() => {
    const b = document.getElementById('btn-run');
    if (!b) return { keys: ['(no RUN button)'], on: false };
    window.__keys = []; b.click();
    return { keys: window.__keys.slice(), on: b.classList.contains('on') };
  });
  report(runOff.keys.includes('U16') && !runOff.on,
    'RUN tap 2   = Shift released', JSON.stringify(runOff.keys));

  // Nothing may overlap: a mis-tap during a firefight is a lost game.
  const overlaps = await m.evaluate(() => {
    const bs = [...document.querySelectorAll('.pad button')];
    const bad = [];
    for (let i = 0; i < bs.length; i++) for (let j = i + 1; j < bs.length; j++) {
      const a = bs[i].getBoundingClientRect(), b = bs[j].getBoundingClientRect();
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom)
        bad.push((bs[i].id || bs[i].className) + ' / ' + (bs[j].id || bs[j].className));
    }
    return bad;
  });
  report(overlaps.length === 0, 'no touch buttons overlap',
    overlaps.length ? overlaps.join(', ') : 'all clear');
  await mctx.close();

  // ---- desktop: WASD + arrows ---------------------------------------------
  console.log('\n' + bold('KEYBOARD') + dim('  (desktop viewport, real key events)'));
  const dctx = await browser.createBrowserContext();
  const d = await dctx.newPage();
  await d.setViewport({ width: 1280, height: 800 });
  await d.goto(`http://localhost:${PORT}/play/`, { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 700));
  await d.evaluate(() => {
    // Record sendKey() CALLS, not window events: sendKey dispatches the same
    // event on window, document and canvas, so a window listener sees every
    // key three times and made a single press look like a repeat storm.
    window.__keys = [];
    const real = window.sendKey;
    window.sendKey = function (type, kc) {
      window.__keys.push((type === 'keydown' ? 'D' : 'U') + kc);
      return real.apply(this, arguments);
    };
  });
  const press = async (key) => {
    await d.evaluate(() => { window.__keys = []; });
    await d.keyboard.down(key);
    await new Promise(r => setTimeout(r, 60));
    await d.keyboard.up(key);
    await new Promise(r => setTimeout(r, 60));
    return d.evaluate(() => window.__keys.slice());
  };
  for (const [key, down, up, what] of [
    ['w', 'D38', 'U38', 'W = forward'],
    ['s', 'D40', 'U40', 'S = back'],
    ['a', 'D188', 'U188', 'A = strafe left'],
    ['d', 'D190', 'U190', 'D = strafe right'],
  ]) {
    const got = await press(key);
    report(got.includes(down) && got.includes(up), what, 'sent ' + JSON.stringify(got));
  }
  // Arrows are NOT translated — they already are what the engine binds, so
  // they reach it directly and never pass through sendKey. What must hold is
  // that our WASD handler leaves them completely alone: no synthetic
  // duplicate (which would double every turn) and no preventDefault.
  await d.evaluate(() => {
    window.__raw = [];
    window.addEventListener('keydown', e => window.__raw.push(
      { code: e.code, prevented: e.defaultPrevented }), true);
  });
  const arrowSynthetic = await press('ArrowLeft');
  const raw = await d.evaluate(() => window.__raw.filter(r => r.code === 'ArrowLeft'));
  report(arrowSynthetic.length === 0 && raw.length > 0 && !raw[0].prevented,
    'ArrowLeft passes straight through, untranslated',
    `synthetic=${JSON.stringify(arrowSynthetic)} raw=${JSON.stringify(raw)}`);

  // Auto-repeat must not spam the engine with extra keydowns.
  await d.evaluate(() => { window.__keys = []; });
  await d.keyboard.down('w');
  await new Promise(r => setTimeout(r, 600));      // hold: OS/browser repeat
  const held = await d.evaluate(() => window.__keys.filter(k => k === 'D38').length);
  await d.keyboard.up('w');
  report(held === 1, 'holding W sends ONE keydown, not a repeat storm', held + ' keydown(s)');

  // Ctrl+W (close tab) must not be swallowed as a movement key.
  await d.evaluate(() => { window.__keys = []; });
  await d.keyboard.down('Control'); await d.keyboard.down('w');
  await new Promise(r => setTimeout(r, 60));
  await d.keyboard.up('w'); await d.keyboard.up('Control');
  const ctrlW = await d.evaluate(() => window.__keys.filter(k => k === 'D38').length);
  report(ctrlW === 0, 'Ctrl+W is left to the browser', ctrlW + ' movement keydown(s)');
  await dctx.close();

  await browser.close(); server.close();
  console.log(fails ? '\n' + red('FAIL') + ` — ${fails} assertion(s)\n`
                    : '\n' + green('OK') + ' — control mapping correct\n');
  process.exit(fails ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
