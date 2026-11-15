// ============================================================================
// The arena's level pipeline, lifted out of the page.
//
// arena/index.html marks the code that decides a level's bytes with
//   // ==== LEVEL PIPELINE — BEGIN …   and   // ==== LEVEL PIPELINE — END …
// Everything that wants "the level for this seed" outside a browser comes
// through here, so it runs the SHIPPED code rather than a copy that can drift.
//
//   const { buildArenaLevel, E } = require('./lib/arena-level').load();
//   const { map, wadBuf } = buildArenaLevel(seed, rooms, enemies);
//
// portableScript() returns the same thing as one self-contained source file
// with no Node in it, for running the pipeline under OTHER JavaScript engines
// (JavaScriptCore, SpiderMonkey) — which is the whole point of
// scripts/check-determinism.js.
// ============================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');
const ARENA = path.join(ROOT, 'arena', 'index.html');
const ENGINE = path.join(ROOT, 'arena', 'engine.js');

const BEGIN = /^\/\/ ==== LEVEL PIPELINE — BEGIN.*$/m;
const END = /^\/\/ ==== LEVEL PIPELINE — END.*$/m;

function pipelineSource(arenaPath = ARENA) {
  const html = fs.readFileSync(arenaPath, 'utf8');
  const a = html.search(BEGIN), b = html.search(END);
  if (a < 0 || b < 0 || b <= a) {
    throw new Error('LEVEL PIPELINE markers not found in ' + path.relative(ROOT, arenaPath) +
      ' — the validators need them to extract the shipped level code.');
  }
  return html.slice(a, b);
}

// What the engine bundle and the pipeline expect of a browser. Assigned onto
// the global object rather than declared, because the bundle is a classic
// script whose own top-level names (it is minified: G, E, …) share that scope.
const SHIMS = `
(function () {
  var g = (typeof globalThis !== 'undefined') ? globalThis : this;
  if (typeof g.window === 'undefined') g.window = g;
  if (typeof g.console === 'undefined') g.console = { log: function () {}, warn: function () {}, error: function () {} };
  if (typeof g.localStorage === 'undefined') g.localStorage = { getItem: function () { return null; }, setItem: function () {} };
  if (typeof g.document === 'undefined') g.document = { createElement: function () { return { getContext: function () { return null; } }; } };
  if (typeof g.navigator === 'undefined') g.navigator = {};
  if (typeof g.performance === 'undefined') g.performance = { now: function () { return 0; } };
  if (typeof g.TextEncoder === 'undefined') {
    g.TextEncoder = function () {};
    g.TextEncoder.prototype.encode = function (s) { var a = new Uint8Array(s.length); for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i) & 255; return a; };
    g.TextDecoder = function () {};
    g.TextDecoder.prototype.decode = function (a) { var s = ''; for (var i = 0; i < a.length; i++) s += String.fromCharCode(a[i]); return s; };
  }
})();
`;

// One source file: shims + engine bundle + pipeline (+ whatever the caller
// appends). Runs unchanged in node's vm, jsc and the SpiderMonkey shell.
function portableScript({ enginePath = ENGINE, arenaPath = ARENA, tail = '' } = {}) {
  return SHIMS + '\n' + fs.readFileSync(enginePath, 'utf8') +
    '\n;const E = window.JerkwadEngine;\n' + pipelineSource(arenaPath) + '\n' + tail;
}

function load(opts = {}) {
  const ctx = { console, TextEncoder, TextDecoder, performance: { now: () => Date.now() } };
  ctx.globalThis = ctx;
  vm.createContext(ctx);
  vm.runInContext(portableScript({ ...opts,
    tail: 'globalThis.__arena = { E: E, buildArenaLevel: buildArenaLevel, arenaThings: arenaThings, ' +
      'relocateUnsafeSpawns: relocateUnsafeSpawns, mulberry32: mulberry32, ARENA_PRESETS: ARENA_PRESETS };' }),
    ctx, { filename: 'arena-level-pipeline.js' });
  return ctx.__arena;
}

module.exports = { ROOT, ARENA, ENGINE, pipelineSource, portableScript, load };
