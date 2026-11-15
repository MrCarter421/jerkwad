#!/usr/bin/env node
// ============================================================================
// Sky-bleed validator.
//
// On a two-sided linedef whose two sectors have DIFFERENT ceiling heights,
// the sidedef facing the taller sector must carry an UPPER texture, otherwise
// the renderer leaves the gap unpainted. In vanilla Doom that gap shows the
// sky flat, so you get a strip of sky in the middle of a wall — most visibly
// as "SKY trim" above corridor doors.
//
// The one legitimate exception is sky-on-both-sides: Doom deliberately skips
// the upper there so an open sky plane reads as continuous across a height
// change (r_segs.c markceiling suppression). Any OTHER missing upper is a bug.
//
// This reproduced the door-lintel bug: header (door soffit) sectors inherited
// the room's ceilTex, which is F_SKY1 in skylit rooms, so the both-sky test
// fired on a strip that is really the solid underside of a lintel.
//
//   node scripts/check-skybleed.js [numSeeds] [rooms]
// ============================================================================
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');

const ctx = { window: {}, localStorage: { getItem: () => null, setItem: () => {} },
  document: { createElement: () => ({ getContext: () => null }) }, console, Math, Date, JSON,
  TextDecoder, TextEncoder, navigator: {}, performance };
ctx.globalThis = ctx; vm.createContext(ctx);
// JERKWAD_ENGINE lets the negative control (scripts/check-skybleed.js's own
// "does this validator actually fire?" test) point at a deliberately broken build.
const ENGINE = process.env.JERKWAD_ENGINE || path.join(ROOT, 'arena/engine.js');
vm.runInContext(fs.readFileSync(ENGINE, 'utf8'), ctx);
const E = ctx.window.JerkwadEngine;
const mul = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const presets = E.SHAPESHIFTER_PRESETS;
const arenaSrc = fs.readFileSync(path.join(ROOT, 'arena/index.html'), 'utf8');
const arenaThings = eval('(' + arenaSrc.match(/function arenaThings\(lvl, rng, playerCount\) \{[\s\S]*?\n\}/)[0] + ')');

// Every two-sided line with a ceiling-height mismatch and no upper on the
// taller side. Grouped by what the two sectors are, so a systemic source
// (e.g. all door headers) is obvious rather than a list of line numbers.
function findSkyBleed(map) {
  const sec = new Map(map.sectors.map(s => [s.id, s]));
  const sd = new Map(map.sidedefs.map(s => [s.id, s]));
  const hits = [];
  for (const l of map.linedefs) {
    if (!l.front || l.front === -1 || !l.back || l.back === -1) continue;
    const fsd = sd.get(l.front), bsd = sd.get(l.back);
    if (!fsd || !bsd) continue;
    const fs_ = sec.get(fsd.sector), bs_ = sec.get(bsd.sector);
    if (!fs_ || !bs_ || fs_.ceilH === bs_.ceilH) continue;
    if (fs_.ceilTex === 'F_SKY1' && bs_.ceilTex === 'F_SKY1') continue;  // legal
    const hiSd = fs_.ceilH > bs_.ceilH ? fsd : bsd;
    const hiSec = fs_.ceilH > bs_.ceilH ? fs_ : bs_;
    const loSec = fs_.ceilH > bs_.ceilH ? bs_ : fs_;
    if (hiSd.upper && hiSd.upper !== '-') continue;
    hits.push({ line: l.id, gap: hiSec.ceilH - loSec.ceilH,
      hi: hiSec.ceilH + '/' + hiSec.ceilTex, lo: loSec.ceilH + '/' + loSec.ceilTex,
      sky: hiSec.ceilTex === 'F_SKY1' });
  }
  return hits;
}

// Check A above cannot flag the door bug by itself: sky-to-sky is exactly the
// case it has to forgive, and the broken build made the lintel look like open
// sky. So assert the structural rule directly.
//
// The sectors touching a DR-1 line are the door body (closed: floor == ceil)
// and the lintel soffit / throat next to it (ceil == floor + 72, just enough
// for the 56-tall player). Both are enclosed by construction — the soffit is
// the SOLID underside of a doorway header, not a hole in the roof — so neither
// may carry a sky ceiling. A room's own sector may of course be sky; it is not
// on the DR-1 line, it is one line further out.
const DOOR_HEADROOM = 72;
function findSkyDoorSoffits(map) {
  const sec = new Map(map.sectors.map(s => [s.id, s]));
  const sd = new Map(map.sidedefs.map(s => [s.id, s]));
  const hits = [];
  const flagged = new Set();
  for (const l of map.linedefs) {
    if (l.special !== 1) continue;               // DR-1 "open door, wait, close"
    for (const side of [l.front, l.back]) {
      if (!side || side === -1) continue;
      const s = sec.get(sd.get(side).sector);
      if (!s || s.ceilH - s.floorH > DOOR_HEADROOM) continue;
      if (s.ceilTex !== 'F_SKY1' || flagged.has(s.id)) continue;
      flagged.add(s.id);
      hits.push({ line: l.id, sector: s.id, ceilH: s.ceilH, floorH: s.floorH });
    }
  }
  return hits;
}

const N = +(process.argv[2] || 20), ROOMS = +(process.argv[3] || 14);
let total = 0, levelsBad = 0, soffit = 0, soffitLevels = 0;
const kinds = new Map();
for (let i = 0; i < N; i++) {
  const seed = 1 + i * 7919;
  const rng = mul(seed);
  const lvl = E.etherGenerateLevel({ rng, presets, roomCount: ROOMS, enemyCount: 30,
    difficulty: 'medium', fuseChance: +(process.env.FUSE || 0) });
  const things = arenaThings(lvl, rng, 4);
  const map = E.generateShapeShifterMap(lvl.rooms, lvl.connections, things, { seed });
  const hits = findSkyBleed(map);
  if (hits.length) {
    levelsBad++; total += hits.length;
    for (const h of hits) {
      const k = h.lo + ' -> ' + h.hi + (h.sky ? '  [SKY SHOWS THROUGH]' : '  [unpainted gap]');
      kinds.set(k, (kinds.get(k) || 0) + 1);
    }
  }
  const soff = findSkyDoorSoffits(map);
  if (soff.length) { soffitLevels++; soffit += soff.length; }
}
console.log('checked ' + N + ' levels x ' + ROOMS + ' rooms');
console.log('A. unpainted ceiling gaps');
console.log('     levels affected: ' + levelsBad + '/' + N + '   offending lines: ' + total);
if (kinds.size) {
  console.log('   *** MISSING UPPER TEXTURES (lowCeil/flat -> highCeil/flat) ***');
  for (const [k, c] of [...kinds].sort((a, b) => b[1] - a[1]).slice(0, 20))
    console.log('     x' + String(c).padEnd(5) + k);
}
console.log('B. door lintel soffits with a sky ceiling (= SKY trim above the door)');
console.log('     levels affected: ' + soffitLevels + '/' + N + '   offending lines: ' + soffit);
const bad = total + soffit;
console.log(bad ? '\nFAIL' : '\nOK — ceiling changes painted, no door opens onto a sky lintel');
process.exit(bad ? 1 : 0);
