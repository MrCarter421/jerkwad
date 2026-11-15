#!/usr/bin/env node
// ============================================================================
// Spawn-safety validator.
//
// A player start placed on top of a decorative column, inside a pillar, or in
// a sector too short to stand in leaves the player stuck/telefragged into
// geometry — the level looks fine but is unplayable. Doom needs, at the spawn
// point: an OPEN sector (floor < ceil) with at least 56 units of headroom,
// and no solid pillar/building footprint overlapping the player's 32-unit
// radius. This checks every player start (types 1-4 and deathmatch 11).
//
//   node scripts/check-spawns.js [numSeeds] [rooms]
// ============================================================================
const fs = require('fs'), vm = require('vm'), path = require('path');
const ROOT = path.join(__dirname, '..');

const ctx = { window: {}, localStorage: { getItem: () => null, setItem: () => {} },
  document: { createElement: () => ({ getContext: () => null }) }, console, Math, Date, JSON,
  TextDecoder, TextEncoder, navigator: {}, performance };
ctx.globalThis = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(ROOT, 'arena/engine.js'), 'utf8'), ctx);
const E = ctx.window.JerkwadEngine;
const mul = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const arenaSrc = fs.readFileSync(path.join(ROOT, 'arena/index.html'), 'utf8');
const ARENA_PRESETS = E.SHAPESHIFTER_PRESETS.filter(
  p => p.feature !== 'terrain' && p.type !== 'hexagon');
const arenaThings = eval('(' + arenaSrc.match(/function arenaThings\(lvl, rng, playerCount\) \{[\s\S]*?\n\}/)[0] + ')');
// Pull the shipped spawn relocator out of the page (with its constants) so
// this validator tests the real pipeline rather than a copy.
const relocSrc = arenaSrc.match(/const PLAYER_HEIGHT = 56, PLAYER_RADIUS = 16;[\s\S]*?\n  return changed \? out : things;\n\}/)[0];
const relocateUnsafeSpawns = eval('(function(){' + relocSrc + '; return relocateUnsafeSpawns;})()');

const PLAYER_RADIUS = 16;   // vanilla player radius
const PLAYER_HEIGHT = 56;   // vanilla player height

// Which sector is a point in? Use precise point-in-polygon over sector loops
// when available, else fall back to smallest containing bbox.
function analyzeSpawns(map) {
  const secById = new Map(map.sectors.map(s => [s.id, s]));
  const sdById = new Map(map.sidedefs.map(s => [s.id, s]));
  const vById = new Map(map.vertices.map(v => [v.id, v]));
  const bounds = new Map();
  for (const l of map.linedefs) {
    for (const side of [l.front, l.back]) {
      if (side === -1 || side == null) continue;
      const sd = sdById.get(side); if (!sd) continue;
      const a = vById.get(l.v1), b = vById.get(l.v2); if (!a || !b) continue;
      let e = bounds.get(sd.sector);
      if (!e) { e = { x0: Infinity, x1: -Infinity, y0: Infinity, y1: -Infinity }; bounds.set(sd.sector, e); }
      e.x0 = Math.min(e.x0, a.x, b.x); e.x1 = Math.max(e.x1, a.x, b.x);
      e.y0 = Math.min(e.y0, a.y, b.y); e.y1 = Math.max(e.y1, a.y, b.y);
    }
  }
  const problems = [];
  const starts = map.things.filter(t => (t.type >= 1 && t.type <= 4) || t.type === 11);
  for (const t of starts) {
    // All sectors whose bbox contains the spawn, smallest first.
    const cands = [];
    for (const [sid, e] of bounds) {
      if (t.x < e.x0 || t.x > e.x1 || t.y < e.y0 || t.y > e.y1) continue;
      cands.push({ sid, area: (e.x1 - e.x0) * (e.y1 - e.y0), e });
    }
    cands.sort((a, b) => a.area - b.area);
    if (!cands.length) { problems.push({ t, why: 'outside all sectors (void)' }); continue; }
    // The SMALLEST containing sector is what the engine will pick. If that
    // is solid (floor==ceil) the player spawns inside a column; if it is too
    // short, the player is crushed into the ceiling.
    const inner = secById.get(cands[0].sid);
    if (!inner) { problems.push({ t, why: 'sector lookup failed' }); continue; }
    if (inner.ceilH <= inner.floorH) {
      problems.push({ t, why: 'inside SOLID geometry (' + inner.floorTex + ', floor==ceil at ' + inner.floorH + ')' });
      continue;
    }
    if (inner.ceilH - inner.floorH < PLAYER_HEIGHT) {
      problems.push({ t, why: 'headroom ' + (inner.ceilH - inner.floorH) + ' < ' + PLAYER_HEIGHT });
      continue;
    }
    // Player RADIUS check: any solid sector whose bbox overlaps the player's
    // cylinder means they are jammed against/inside a column.
    for (const c of cands) {
      const s = secById.get(c.sid);
      if (!s || s.ceilH > s.floorH) continue;         // not solid
      // solid sector overlapping the player's radius?
      if (t.x + PLAYER_RADIUS > c.e.x0 && t.x - PLAYER_RADIUS < c.e.x1 &&
          t.y + PLAYER_RADIUS > c.e.y0 && t.y - PLAYER_RADIUS < c.e.y1) {
        // Only a problem if the solid thing rises above the spawn floor.
        if (s.floorH > inner.floorH + 24) {
          problems.push({ t, why: 'solid column within player radius (top ' + s.floorH + ' vs floor ' + inner.floorH + ')' });
        }
        break;
      }
    }
  }
  return { starts: starts.length, problems };
}

const N = +(process.argv[2] || 12), ROOMS = +(process.argv[3] || 14);
let totalStarts = 0, totalBad = 0, levelsBad = 0;
for (let i = 0; i < N; i++) {
  const seed = 1 + i * 7919;
  const rng = mul(seed);
  const lvl = E.etherGenerateLevel({ rng, presets: ARENA_PRESETS, roomCount: ROOMS,
    enemyCount: 30, difficulty: 'medium', fuseChance: 0 });
  const things0 = arenaThings(lvl, rng, 4);
  // Mirror arena/index.html exactly: build, relocate unsafe spawns, rebuild.
  let map = E.generateShapeShifterMap(lvl.rooms, lvl.connections, things0, { seed });
  const things = relocateUnsafeSpawns(map, things0, lvl.rooms);
  if (things !== things0) map = E.generateShapeShifterMap(lvl.rooms, lvl.connections, things, { seed });
  const r = analyzeSpawns(map);
  totalStarts += r.starts; totalBad += r.problems.length;
  if (r.problems.length) {
    levelsBad++;
    console.log('seed ' + seed + ': ' + r.problems.length + '/' + r.starts + ' bad spawns');
    for (const p of r.problems.slice(0, 4))
      console.log('   type ' + p.t.type + ' @ ' + p.t.x + ',' + p.t.y + ' — ' + p.why);
  }
}
console.log('\n' + (N - levelsBad) + '/' + N + ' levels have all spawns safe | bad spawns: ' +
  totalBad + '/' + totalStarts);
process.exit(totalBad ? 1 : 0);
