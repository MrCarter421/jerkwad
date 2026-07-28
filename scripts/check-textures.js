#!/usr/bin/env node
// ============================================================================
// Texture/flat namespace validator.
//
// Doom keeps WALL TEXTURES and FLOOR/CEILING FLATS in separate namespaces.
// Using a wall texture name as a sector floorTex/ceilTex makes vanilla
// (Chocolate Doom) abort at level load with:
//     R_FlatNumForName: <NAME> not found
// which presents as a level that never loads — a silent hang after
// "game started". This script generates levels, extracts every flat and
// texture name they actually emit, and verifies each against the real
// freedoom2.wad namespaces.
//
//   node scripts/check-textures.js [numSeeds] [rooms]
// ============================================================================
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');

// ---- read the IWAD namespaces ----
const iwad = fs.readFileSync(path.join(ROOT, 'play/freedoom2.wad'));
const numL = iwad.readInt32LE(4), dirOff = iwad.readInt32LE(8);
const dir = [];
for (let i = 0; i < numL; i++) {
  const o = dirOff + i * 16;
  let n = ''; for (let j = 0; j < 8; j++) { const c = iwad[o + 8 + j]; if (c) n += String.fromCharCode(c); }
  dir.push({ name: n, off: iwad.readInt32LE(o), size: iwad.readInt32LE(o + 4) });
}
const FLATS = new Set(); let inFlats = false;
for (const e of dir) {
  if (/^(F|FF|F1|F2|F3)_START$/.test(e.name)) { inFlats = true; continue; }
  if (/^(F|FF|F1|F2|F3)_END$/.test(e.name)) { inFlats = false; continue; }
  if (inFlats && e.name) FLATS.add(e.name);
}
const TEXTURES = new Set();
for (const lumpName of ['TEXTURE1', 'TEXTURE2']) {
  const t = dir.find(e => e.name === lumpName);
  if (!t) continue;
  const count = iwad.readInt32LE(t.off);
  for (let i = 0; i < count; i++) {
    const tOff = t.off + iwad.readInt32LE(t.off + 4 + i * 4);
    let n = ''; for (let j = 0; j < 8; j++) { const c = iwad[tOff + j]; if (c) n += String.fromCharCode(c); }
    TEXTURES.add(n.toUpperCase());
  }
}

// ---- generate levels and inspect what they emit ----
const ctx = { window: {}, localStorage: { getItem: () => null, setItem: () => {} },
  document: { createElement: () => ({ getContext: () => null }) }, console, Math, Date, JSON,
  TextDecoder, TextEncoder, navigator: {}, performance };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'arena/engine.js'), 'utf8'), ctx);
const E = ctx.window.JerkwadEngine;
const mul = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const presets = E.SHAPESHIFTER_PRESETS;
const arenaSrc = fs.readFileSync(path.join(ROOT, 'arena/index.html'), 'utf8');
const arenaThings = eval('(' + arenaSrc.match(/function arenaThings\(lvl, rng, playerCount\) \{[\s\S]*?\n\}/)[0] + ')');

const N = +(process.argv[2] || 25), ROOMS = +(process.argv[3] || 14);
const badFlats = new Map(), badTex = new Map();
for (let i = 0; i < N; i++) {
  const seed = 1 + i * 7919;
  const rng = mul(seed);
  const lvl = E.etherGenerateLevel({ rng, presets, roomCount: ROOMS, enemyCount: 30,
    difficulty: 'medium', fuseChance: 0 });
  const things = arenaThings(lvl, rng, 4);
  const map = E.generateShapeShifterMap(lvl.rooms, lvl.connections, things, { seed });
  for (const s of map.sectors) {
    for (const f of [s.floorTex, s.ceilTex]) {
      if (!f || f === 'F_SKY1' || f === '-') continue;
      if (!FLATS.has(f)) badFlats.set(f, (badFlats.get(f) || 0) + 1);
    }
  }
  for (const sd of map.sidedefs) {
    for (const t of [sd.upper, sd.lower, sd.middle]) {
      if (!t || t === '-') continue;
      if (!TEXTURES.has(t.toUpperCase())) badTex.set(t, (badTex.get(t) || 0) + 1);
    }
  }
}
console.log('checked ' + N + ' levels x ' + ROOMS + ' rooms against freedoom2.wad');
console.log('  IWAD namespaces: ' + FLATS.size + ' flats, ' + TEXTURES.size + ' textures');
let bad = false;
if (badFlats.size) {
  bad = true;
  console.log('\n*** INVALID FLATS (used as floorTex/ceilTex, will crash vanilla) ***');
  for (const [n, c] of [...badFlats].sort((a, b) => b[1] - a[1]))
    console.log('   ' + n + '  x' + c + (TEXTURES.has(n) ? '   (it is a WALL TEXTURE)' : '   (missing entirely)'));
}
if (badTex.size) {
  bad = true;
  console.log('\n*** INVALID WALL TEXTURES ***');
  for (const [n, c] of [...badTex].sort((a, b) => b[1] - a[1]))
    console.log('   ' + n + '  x' + c + (FLATS.has(n) ? '   (it is a FLAT)' : '   (missing entirely)'));
}
console.log(bad ? '\nFAIL' : '\nOK — every flat and texture exists in the IWAD namespace');
process.exit(bad ? 1 : 0);
