#!/usr/bin/env node
// ============================================================================
// Does the player page BOOT — including when its big download does not behave?
//
// Before a game there is a 28 MB IWAD to fetch. On a phone that is the step
// most likely to stall, and it used to fail in the worst way available: a
// bare `await fetch()` waits forever, and the loading screen hid itself half
// a second after page load (it tested `canvas.width > 64`, and a canvas is
// 300 wide before anything touches it) — so a stalled boot was a black
// rectangle with nothing to say.
//
// Three boots of the real page, against a test server that can be told to
// stall a transfer mid-body:
//
//   1  a healthy boot      progress is VISIBLE while downloading; the game
//                          starts; the loading screen then gets out of the way
//   2  the download stalls the page notices, says so, starts again, and boots
//   3  it never recovers   the page gives up with a readable message that
//                          stays on screen — not a black rectangle
//
//   node scripts/check-boot.js
//
// Exit 0 = all three behave. 1 = one does not. 2 = SKIPPED (no browser).
// ============================================================================
'use strict';
const fs = require('fs');
const { loadDep, startStatic } = require('./lib/stack');

let puppeteer = null;
if (process.env.PUPPETEER) { try { puppeteer = require(process.env.PUPPETEER); } catch (e) {} }
puppeteer = puppeteer || loadDep('puppeteer') || loadDep('puppeteer-core');
if (!puppeteer) { console.log('SKIPPED — puppeteer not installed (npm install)'); process.exit(2); }
const CHROME = process.env.CHROMIUM || '/opt/pw-browsers/chromium';

const tty = process.stdout.isTTY;
const c = (n, s) => (tty ? `\x1b[${n}m${s}\x1b[0m` : s);
const bold = s => c('1', s), dim = s => c('2', s), green = s => c('32', s), red = s => c('31', s);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const PORT = +(process.env.PORT || 8193);

let failures = 0;
const check = (ok, label, detail) => {
  if (!ok) failures++;
  console.log('  ' + (ok ? green('✓') : red('✗')) + ' ' + label + (detail ? dim('  ' + detail) : ''));
};

// Load play/ and record everything the loading screen ever said.
async function boot(browser, query, budgetMs) {
  const page = await browser.newPage();
  let started = false;
  page.on('console', (m) => { if (/^doom: 10/.test(m.text())) started = true; });
  await page.evaluateOnNewDocument(() => {
    window.__boot = [];
    const watch = () => {
      const el = document.getElementById('bootmsg');
      if (!el) return setTimeout(watch, 5);
      const push = () => { const t = el.textContent; if (window.__boot[window.__boot.length - 1] !== t) window.__boot.push(t); };
      push();
      new MutationObserver(push).observe(el, { childList: true, characterData: true, subtree: true });
    };
    watch();
  });
  const t0 = Date.now();
  await page.goto(`http://localhost:${PORT}/play/?engine=websockets-doom${query}`, { waitUntil: 'domcontentloaded' });
  while (!started && Date.now() - t0 < budgetMs) await sleep(200);
  await sleep(1200);
  const ui = await page.evaluate(() => ({
    said: window.__boot,
    bootVisible: !document.getElementById('boot').classList.contains('hidden'),
    bootNow: document.getElementById('bootmsg').textContent,
  }));
  await page.close();
  return { started, secs: (Date.now() - t0) / 1000, ...ui };
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true, executablePath: fs.existsSync(CHROME) ? CHROME : undefined,
    args: ['--no-sandbox', '--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
    defaultViewport: { width: 960, height: 600 },
  });
  console.log('\n' + bold('PLAYER BOOT') + '\n');

  // ---- 1. healthy -------------------------------------------------------------
  let server = await startStatic(PORT);
  let r = await boot(browser, '', 40000);
  console.log(dim('  healthy boot'));
  check(r.started, 'the game starts', r.secs.toFixed(1) + 's');
  check(r.said.some(t => /downloading game data/.test(t)), 'download progress was shown while it loaded',
    JSON.stringify((r.said.find(t => /downloading/.test(t)) || r.said.slice(0, 3).join(' | ')).slice(0, 60)));
  check(!r.bootVisible, 'the loading screen clears once the game is running');
  server.close();

  // ---- 2. one stall, then fine --------------------------------------------------
  server = await startStatic(PORT, { hang: { match: /freedoom2\.wad$/, times: 1, afterBytes: 3 << 20 } });
  r = await boot(browser, '&stallms=3000', 40000);
  console.log(dim('\n  the download stalls 3 MB in'));
  check(r.said.some(t => /stalled.*trying again/.test(t)), 'the page notices and says so',
    JSON.stringify((r.said.find(t => /trying again/.test(t)) || 'never mentioned').slice(0, 70)));
  check(r.started, 'it starts again and the game boots', r.secs.toFixed(1) + 's');
  check(!r.bootVisible, 'the loading screen clears');
  server.close();

  // ---- 3. it never recovers -------------------------------------------------------
  server = await startStatic(PORT, { hang: { match: /freedoom2\.wad$/, times: 99, afterBytes: 1 << 20 } });
  r = await boot(browser, '&stallms=2000', 16000);
  console.log(dim('\n  every attempt stalls'));
  check(!r.started, 'no game (there is nothing to run)');
  check(/BOOT FAILED.*could not be downloaded/.test(r.bootNow), 'the page gives up with a readable reason',
    JSON.stringify(r.bootNow.slice(0, 80)));
  check(r.bootVisible, 'and the message STAYS on screen');
  check(r.said.filter(t => /trying again/.test(t)).length === 2, 'after two retries', r.said.filter(t => /trying again/.test(t)).length + ' retries');
  server.close();

  await browser.close();
  console.log('\n' + bold('RESULT') + '  ' + (failures ? red('✗ ' + failures + ' check(s) failed') : green('✓ the page boots, and fails readably')) + '\n');
  process.exit(failures ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
