#!/usr/bin/env node
// ============================================================================
// Cross-browser determinism — does every JavaScript engine build the SAME
// level from the same seed?
//
// The arena never sends a level over the network. Each player's browser
// rebuilds it from {seed, rooms, enemies}, and Doom's lockstep netcode then
// assumes all of them are simulating an identical map. If two builds differ
// by one byte the engines drift apart, hit "consistency failure", and quit —
// which the players see as everyone being kicked, a few seconds to a minute
// in, with nothing on screen but "disconnected from server".
//
// That is not hypothetical. Before V0.57 the same seed gave different WADs in
// Chrome (V8) and Safari / every iOS browser (JavaScriptCore) for 37% of
// levels, and in Firefox (SpiderMonkey) for 100% — because of one
// `sort(() => rand() - 0.5)` shuffle and the native Math.sin/cos/atan2/hypot,
// both of which are allowed to behave differently per engine, and do.
//
// This runs the SHIPPED pipeline (lifted from arena/index.html + engine.js)
// under Node's V8 and under every other engine it can find, and compares the
// bytes. It also lints the sources for the constructs that caused it.
//
//   node scripts/check-determinism.js [numSeeds=6] [rooms=8,14,24]
//   JS_ENGINES=/path/to/jsc:/path/to/js node scripts/check-determinism.js
//   JERKWAD_ENGINE=<old engine.js> …      # negative control: must FAIL
//
// Engines: `jsc` (JavaScriptCore — on macOS it ships with the OS; on Debian /
// Ubuntu `apt install libjavascriptcoregtk-bin`) and `js` / `js115` …
// (SpiderMonkey — `apt install libmozjs-115-dev`).
//
// Exit 0 = identical everywhere. 1 = a difference (or a lint hit).
// 2 = SKIPPED: no second engine on this machine, so nothing was compared.
// ============================================================================
'use strict';
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const { spawn, spawnSync } = require('child_process');
const { ROOT, ENGINE, portableScript, pipelineSource } = require('./lib/arena-level');

const N = Math.max(1, +(process.argv[2] || 6));
const ROOMS = String(process.argv[3] || '8,14,24').split(',').map(Number).filter(Boolean);
const ENEMIES = [0, 30, 80];           // easy / medium / hard difficulty tiers
const ENGINE_PATH = process.env.JERKWAD_ENGINE || ENGINE;

const tty = process.stdout.isTTY;
const c = (n, s) => (tty ? `\x1b[${n}m${s}\x1b[0m` : s);
const bold = s => c('1', s), dim = s => c('2', s);
const green = s => c('32', s), red = s => c('31', s), yellow = s => c('33', s);

// ---- 1. source lint --------------------------------------------------------
// Catches the regression at review time, with or without a second engine.
function lint() {
  const NATIVE = /\bMath\.(sin|cos|tan|asin|acos|atan2?|sinh|cosh|tanh|asinh|acosh|atanh|hypot|pow|exp|expm1|log|log1p|log2|log10|cbrt)\s*\(/;
  const RANDOM_SORT = /\.sort\(\s*(\([^)]*\)|\w*)\s*=>[^;]*\b(rand|rng|random)\s*\(/;
  const hits = [];
  const scan = (label, text, firstLine) => {
    text.split('\n').forEach((raw, i) => {
      const line = raw.replace(/(^|\s)\/\/.*$/, '');        // drop line comments
      const where = label + ':' + (firstLine + i);
      const m = line.match(NATIVE);
      if (m) hits.push(where + '  native Math.' + m[1] + '() — differs per engine; use DMath.' +
        (['sin', 'cos', 'atan2', 'hypot'].includes(m[1]) ? m[1] : '… / plain arithmetic'));
      if (/[^*]\*\*[^*]/.test(line)) hits.push(where + '  `**` — exponentiation is implementation-approximated; multiply instead');
      if (RANDOM_SORT.test(line)) hits.push(where + '  sort() with a random comparator — comparator call count is engine-specific; use Fisher-Yates');
    });
  };
  const src = fs.readFileSync(path.join(ROOT, 'wad_editor.jsx'), 'utf8');
  scan('wad_editor.jsx', src, 1);
  const html = fs.readFileSync(path.join(ROOT, 'arena', 'index.html'), 'utf8');
  const block = pipelineSource();
  scan('arena/index.html', block, html.slice(0, html.indexOf(block)).split('\n').length);
  if (/\bMath\.random\b|\bDate\b|\bdocument\b|\$\(/.test(block.replace(/(^|\s)\/\/.*$/gm, ''))) {
    hits.push('arena/index.html  LEVEL PIPELINE block touches Math.random / Date / the DOM — it must depend on the seed alone');
  }
  return hits;
}

// ---- 2. the portable test body --------------------------------------------
// ES5-ish and self-contained so it runs in any shell. Prints one line per
// fact; the harness compares the lines engine against engine.
function testBody(cfg) {
  return `
;(function () {
  var out = (typeof print === 'function') ? print : function (s) { console.log(s); };
  var CFG = ${JSON.stringify(cfg)};
  function fnv(bytes, h) { for (var i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); } return h >>> 0; }
  var hex = function (n) { return ('0000000' + n.toString(16)).slice(-8); };

  // (a) DMath, bit for bit — and the native functions for contrast.
  var DM = E.DMath;
  if (DM) {
    var f64 = new Float64Array(1), u32 = new Uint32Array(f64.buffer);
    var hd = 0x811c9dc5, hn = 0x811c9dc5, worst = 0, s = 987654321;
    var rnd = function () { s |= 0; s = (s + 0x6D2B79F5) | 0; var t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    var mixD = function (v) { f64[0] = v; hd ^= u32[0]; hd = Math.imul(hd, 0x01000193); hd ^= u32[1]; hd = Math.imul(hd, 0x01000193); };
    var mixN = function (v) { f64[0] = v; hn ^= u32[0]; hn = Math.imul(hn, 0x01000193); hn ^= u32[1]; hn = Math.imul(hn, 0x01000193); };
    for (var i = 0; i < 200000; i++) {
      var x = (rnd() - 0.5) * (i % 3 === 0 ? 14 : i % 3 === 1 ? 2000 : 0.5);
      var a = (rnd() - 0.5) * 8192, b = (rnd() - 0.5) * 8192;
      if (i % 97 === 0) { a = Math.round(a / 32) * 32; b = Math.round(b / 32) * 32; x = (i % 24) * Math.PI / 12; }
      var ds = DM.sin(x), dc = DM.cos(x), da = DM.atan2(a, b), dh = DM.hypot(a, b);
      var ns = Math.sin(x), nc = Math.cos(x), na = Math.atan2(a, b), nh = Math.hypot(a, b);
      mixD(ds); mixD(dc); mixD(da); mixD(dh); mixN(ns); mixN(nc); mixN(na); mixN(nh);
      worst = Math.max(worst, Math.abs(ds - ns), Math.abs(dc - nc), Math.abs(da - na), Math.abs(dh - nh) / (nh || 1));
    }
    out('DMATH ' + hex(hd >>> 0));
    out('NATIVE ' + hex(hn >>> 0));
    out('DMATHERR ' + (worst < 1e-15 ? 'ok' : 'TOO-FAR ' + worst));
  } else out('DMATH absent');

  // (b) the levels.
  for (var ri = 0; ri < CFG.rooms.length; ri++) for (var ei = 0; ei < CFG.enemies.length; ei++) for (var k = 1; k <= CFG.seeds; k++) {
    var seed = (Math.imul(k + 1000 * ri + 100000 * ei, 2654435761) >>> 1) || 1;
    var line;
    try {
      var lvl = buildArenaLevel(seed, CFG.rooms[ri], CFG.enemies[ei]);
      var bytes = new Uint8Array(lvl.wadBuf);
      line = bytes.length + ' ' + hex(fnv(bytes, 0x811c9dc5)) + hex(fnv(bytes, 0x9747b28c));
    } catch (e) { line = 'THROW ' + String(e && e.message || e).slice(0, 90); }
    out('LEVEL ' + seed + ' ' + CFG.rooms[ri] + ' ' + CFG.enemies[ei] + ' ' + line);
  }
  out('DONE');
})();
`;
}

// ---- 3. find engines -------------------------------------------------------
function findEngines() {
  const names = [
    ['JavaScriptCore', ['jsc',
      '/System/Library/Frameworks/JavaScriptCore.framework/Versions/Current/Helpers/jsc',
      '/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Helpers/jsc',
      '/System/Library/Frameworks/JavaScriptCore.framework/Versions/A/Resources/jsc',
      '/usr/lib/jsc', '/usr/libexec/jsc']],
    ['SpiderMonkey', ['js140', 'js128', 'js115', 'js102', 'js91', 'js78', 'spidermonkey', 'js']],
  ];
  const probeFile = path.join(os.tmpdir(), 'jerkwad-probe-' + process.pid + '.js');
  // print() is what a JS shell has and Node does not — `js` is sometimes Node.
  fs.writeFileSync(probeFile, 'print("jw-probe-" + (1 + 1));');
  const works = (bin) => {
    try {
      const r = spawnSync(bin, [probeFile], { encoding: 'utf8', timeout: 15000 });
      return r.status === 0 && /jw-probe-2/.test(r.stdout || '');
    } catch (e) { return false; }
  };
  const found = [];
  for (const [label, bins] of names) {
    for (const bin of bins) { if (works(bin)) { found.push({ label, bin }); break; } }
  }
  for (const bin of (process.env.JS_ENGINES || '').split(path.delimiter).filter(Boolean)) {
    if (works(bin)) found.push({ label: path.basename(bin), bin });
    else console.log(yellow('  ! JS_ENGINES entry does not run as a JS shell: ' + bin));
  }
  try { fs.unlinkSync(probeFile); } catch (e) {}
  return found;
}

const parse = (text) => {
  const r = { levels: new Map(), dmath: null, native: null, err: null, done: false, raw: text };
  for (const l of text.split('\n')) {
    const p = l.trim().split(' ');
    if (p[0] === 'LEVEL') r.levels.set(p.slice(1, 4).join(' '), p.slice(4).join(' '));
    else if (p[0] === 'DMATH') r.dmath = p[1];
    else if (p[0] === 'NATIVE') r.native = p[1];
    else if (p[0] === 'DMATHERR') r.err = p.slice(1).join(' ');
    else if (p[0] === 'DONE') r.done = true;
  }
  return r;
};

(async function main() {
  console.log('\n' + bold('CROSS-BROWSER DETERMINISM') +
    dim('  ' + (N * ROOMS.length * ENEMIES.length) + ' levels  (seeds ' + N + ' × rooms ' + ROOMS.join('/') +
      ' × enemies ' + ENEMIES.join('/') + ')' + (process.env.JERKWAD_ENGINE ? '  engine ' + ENGINE_PATH : '')) + '\n');
  let failed = false;

  if (!process.env.JERKWAD_ENGINE) {
    const hits = lint();
    if (hits.length) {
      failed = true;
      console.log('  ' + red('✗') + ' source lint: ' + hits.length + ' engine-dependent construct(s)');
      hits.slice(0, 20).forEach(h => console.log(dim('      ' + h)));
    } else console.log('  ' + green('✓') + ' source lint  ' + dim('no native trig / hypot / ** / random-comparator sort in level code'));
  }

  const script = portableScript({ enginePath: ENGINE_PATH, tail: testBody({ seeds: N, rooms: ROOMS, enemies: ENEMIES }) });
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'jerkwad-det-'));
  const file = path.join(dir, 'pipeline.js');
  fs.writeFileSync(file, script);

  const engines = findEngines();
  const runs = engines.map(e => new Promise((resolve) => {
    let outText = '', errText = '';
    const t0 = Date.now();
    const child = spawn(e.bin, [file], { stdio: ['ignore', 'pipe', 'pipe'] });
    child.stdout.on('data', d => { outText += d; });
    child.stderr.on('data', d => { errText += d; });
    child.on('error', (err) => resolve({ ...e, result: parse(''), errText: String(err), ms: Date.now() - t0 }));
    child.on('close', () => resolve({ ...e, result: parse(outText), errText, ms: Date.now() - t0 }));
  }));

  // V8, in-process, is the reference.
  const lines = [];
  const t0 = Date.now();
  const ctx = { print: (s) => lines.push(String(s)), console, TextEncoder, TextDecoder, performance: { now: () => 0 } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(script, ctx, { filename: 'pipeline.js' });
  const ref = parse(lines.join('\n'));
  const throws = [...ref.levels.values()].filter(v => /^THROW/.test(v));
  console.log('  ' + (throws.length ? red('✗') : green('✓')) + ' V8 ' + dim('(node ' + process.versions.node + ', v8 ' +
    process.versions.v8.split('-')[0] + ')') + '  built ' + ref.levels.size + ' levels' +
    dim('  ' + ((Date.now() - t0) / 1000).toFixed(1) + 's') + (throws.length ? red('  ' + throws.length + ' threw: ' + throws[0]) : ''));
  if (throws.length) failed = true;
  if (ref.err && ref.err !== 'ok') { failed = true; console.log('  ' + red('✗') + ' DMath strays from native Math by more than 1e-15: ' + ref.err); }

  const others = await Promise.all(runs);
  const natives = new Set([ref.native]);
  for (const o of others) {
    const r = o.result;
    if (!r.done) {
      failed = true;
      console.log('  ' + red('✗') + ' ' + o.label + dim('  ' + o.bin) + '  did not finish' +
        dim('  ' + (o.errText || r.raw).trim().split('\n').slice(-2).join(' | ').slice(0, 200)));
      continue;
    }
    if (r.native) natives.add(r.native);
    const diff = [];
    for (const [key, v] of ref.levels) if (r.levels.get(key) !== v) diff.push(key);
    const mathSame = r.dmath === ref.dmath;
    const ok = diff.length === 0 && mathSame && r.levels.size === ref.levels.size;
    if (!ok) failed = true;
    console.log('  ' + (ok ? green('✓') : red('✗')) + ' ' + o.label + dim('  ' + o.bin) + '  ' +
      (diff.length === 0 ? 'all ' + r.levels.size + ' levels byte-identical to V8'
        : red(diff.length + ' of ' + ref.levels.size + ' levels DIFFER from V8')) +
      (mathSame ? '' : red('  DMath bits differ (' + r.dmath + ' vs ' + ref.dmath + ')')) +
      dim('  ' + (o.ms / 1000).toFixed(1) + 's'));
    if (diff.length) {
      const [seed, rooms, enemies] = diff[0].split(' ');
      console.log(dim(`      first: seed ${seed}, ${rooms} rooms, ${enemies} enemies — V8 ${ref.levels.get(diff[0])}  vs  ${r.levels.get(diff[0])}`));
    }
  }
  try { fs.rmSync(dir, { recursive: true, force: true }); } catch (e) {}

  if (others.length && ref.native) {
    // The control that shows this test can see a difference at all: if the
    // engines' NATIVE functions hash the same, they share a math library and
    // agreeing on DMath proves little.
    console.log(dim('    native Math.sin/cos/atan2/hypot ' + (natives.size > 1
      ? 'differ between these engines (' + natives.size + ' distinct results) — DMath is doing real work'
      : 'happen to agree between these engines — add another engine for a stronger test')));
  }

  console.log('\n' + bold('RESULT') + '  ' + (failed ? red('✗ levels are NOT reproducible across engines')
    : others.length ? green('✓ every engine builds the same bytes')
      : yellow('SKIPPED — no second JavaScript engine found; only the lint ran')));
  if (!others.length && !failed) {
    console.log(dim('  Install one to compare:  macOS has jsc built in (not found at the usual paths);'));
    console.log(dim('  Debian/Ubuntu: apt install libjavascriptcoregtk-bin libmozjs-115-dev'));
  }
  console.log();
  process.exit(failed ? 1 : others.length ? 0 : 2);
})().catch(e => { console.error(e); process.exit(1); });
