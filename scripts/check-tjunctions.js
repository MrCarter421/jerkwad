#!/usr/bin/env node
// ============================================================================
// T-junction / overlapping-line validator.
//
// A T-junction is a vertex sitting in the INTERIOR of another linedef. Doom's
// renderer assumes edges meet only at shared endpoints, so a T-junction shows
// up in game as a crack or a missing stretch of wall — "some trim has missing
// linedefs".
//
// The one this was written for: HEADER_DEPTH and TRIM_W are both 16, so a
// corridor door's header inner edge lands exactly on trim ring 1. The header
// emitted that edge (64 units wide) and the ring loop separately emitted the
// full-width ring edge straight over the top of it. Two lines claiming the
// same span, four T-junctions per doorway, and holes in the trim.
//
// Note this is invisible to check-load.js: BOTH sectors still close into
// valid loops, so a topology check passes while the geometry is wrong. That
// is exactly why this needed its own validator.
//
//   node scripts/check-tjunctions.js [numSeeds] [rooms]
//   FUSE=0.25 node scripts/check-tjunctions.js   # the editor's fused path
//   JERKWAD_ENGINE=<path> …                      # negative control
// ============================================================================
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');

const ctx = { window: {}, localStorage: { getItem: () => null, setItem: () => {} },
  document: { createElement: () => ({ getContext: () => null }) }, console, Math, Date, JSON,
  TextDecoder, TextEncoder, navigator: {}, performance };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(process.env.JERKWAD_ENGINE || path.join(ROOT, 'arena/engine.js'), 'utf8'), ctx);
const E = ctx.window.JerkwadEngine;
const mul = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const arenaSrc = fs.readFileSync(path.join(ROOT, 'arena/index.html'), 'utf8');
const arenaThings = eval('(' + arenaSrc.match(/function arenaThings\(lvl, rng, playerCount\) \{[\s\S]*?\n\}/)[0] + ')');

const EPS = 0.6;   // everything snaps to 32, so anything closer is coincident

function tjunctions(map) {
  const V = new Map(map.vertices.map(v => [v.id, v]));
  const sd = new Map(map.sidedefs.map(s => [s.id, s]));
  const hits = [];
  for (const l of map.linedefs) {
    const a = V.get(l.v1), b = V.get(l.v2);
    if (!a || !b) continue;
    const dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
    if (len < 1) continue;
    const minx = Math.min(a.x, b.x) - EPS, maxx = Math.max(a.x, b.x) + EPS;
    const miny = Math.min(a.y, b.y) - EPS, maxy = Math.max(a.y, b.y) + EPS;
    for (const p of map.vertices) {
      if (p.id === l.v1 || p.id === l.v2) continue;
      if (p.x < minx || p.x > maxx || p.y < miny || p.y > maxy) continue;
      if (Math.abs((p.x - a.x) * dy - (p.y - a.y) * dx) / len > EPS) continue;
      const along = ((p.x - a.x) * dx + (p.y - a.y) * dy) / len;
      if (along < EPS || along > len - EPS) continue;      // strictly interior
      const f = sd.get(l.front), bk = l.back !== -1 ? sd.get(l.back) : null;
      hits.push({ line: l.id, at: p.x + ',' + p.y,
        sectors: (f ? f.sector : '?') + (bk ? '/' + bk.sector : ' (one-sided)') });
    }
  }
  return hits;
}

const N = +(process.argv[2] || 12), ROOMS = +(process.argv[3] || 14);
const FUSE = +(process.env.FUSE || 0);
let total = 0, bad = 0;
const samples = [];
for (let i = 0; i < N; i++) {
  const seed = 1 + i * 7919, rng = mul(seed);
  const lvl = E.etherGenerateLevel({ rng, presets: E.SHAPESHIFTER_PRESETS,
    roomCount: ROOMS, enemyCount: 30, difficulty: 'medium', fuseChance: FUSE });
  const map = E.generateShapeShifterMap(lvl.rooms, lvl.connections,
    arenaThings(lvl, rng, 4), { seed });
  const h = tjunctions(map);
  if (h.length) { bad++; total += h.length; if (samples.length < 6) samples.push(...h.slice(0, 3)); }
}
console.log(`checked ${N} levels x ${ROOMS} rooms` + (FUSE ? `  (fuseChance ${FUSE})` : ''));
console.log(`  levels with T-junctions: ${bad}/${N}   total: ${total}`);
if (samples.length) {
  console.log('\n*** VERTICES LYING MID-LINEDEF (cracks / missing wall) ***');
  for (const s of samples) console.log(`   ${s.line} at ${s.at}  sectors ${s.sectors}`);
}
console.log(total ? '\nFAIL' : '\nOK — every linedef meets its neighbours only at shared endpoints');
process.exit(total ? 1 : 0);
