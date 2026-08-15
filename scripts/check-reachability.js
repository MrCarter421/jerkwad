// ============================================================================
// Reachability validator. Builds the sector adjacency graph the way the Doom
// PLAYER experiences it, floods from the P1 start, and reports what fraction
// of the level is actually reachable + which doors are broken.
//
// A line is traversable if it is two-sided AND either:
//   - not impassable (flag 1), with a walkable height relationship, OR
//   - a door (special 1/DR or 31/D1): the doorBody opens on use.
// Step-up limit is 24 units (vanilla); doors/lifts handled specially.
// ============================================================================
const fs = require('fs'); const vm = require('vm'); const path = require('path');
// Repo-relative: this used to read an absolute path from the machine it was
// written on, which crashed the deploy gate with ENOENT everywhere else.
const ROOT = path.join(__dirname, '..');
function loadEngine() {
  const ctx = { window: {}, localStorage: { getItem: () => null, setItem: () => {} },
    document: { createElement: () => ({ getContext: () => null }) }, console, Math, Date, JSON,
    TextDecoder, TextEncoder, navigator: {}, performance };
  ctx.globalThis = ctx; vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(process.env.JERKWAD_ENGINE || path.join(ROOT, 'arena/engine.js'), 'utf8'), ctx);
  return ctx.window.JerkwadEngine;
}
const mulberry32 = (a) => () => { a |= 0; a = (a + 0x6D2B79F5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };

function analyze(map, opts) {
  const secById = new Map(map.sectors.map(s => [s.id, s]));
  const sdById = new Map(map.sidedefs.map(s => [s.id, s]));
  const vById = new Map(map.vertices.map(v => [v.id, v]));
  // Sector adjacency through traversable two-sided lines.
  const adj = new Map();
  const addEdge = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a).add(b);
  };
  let doorLines = 0, brokenDoors = 0, blockedByHeight = 0;
  for (const l of map.linedefs) {
    if (l.back === -1 || l.back == null) continue;
    const fs_ = sdById.get(l.front), bs_ = sdById.get(l.back);
    if (!fs_ || !bs_) continue;
    const A = secById.get(fs_.sector), B = secById.get(bs_.sector);
    if (!A || !B) continue;
    const isDoor = l.special === 1 || l.special === 31 || l.special === 117 || l.special === 118;
    if (isDoor) doorLines++;
    // A closed door sector (floor==ceil) opens on use -> treat as passable,
    // but ONLY if the door actually has headroom to open into.
    const closed = (s) => s.ceilH === s.floorH;
    if (isDoor) {
      // A DR door's closed body (floor==ceil) RISES on use, so the opening is
      // governed by the two OPEN sectors either side of the body, not by the
      // body's closed state. Model the door as passable when the neighbour
      // that isn't the body has room for the player, and the step from the
      // body's floor is climbable.
      const body = closed(A) ? A : closed(B) ? B : null;
      const other = body === A ? B : (body === B ? A : null);
      if (body && other) {
        const openH = other.ceilH - body.floorH;      // headroom once raised
        const step = Math.abs(other.floorH - body.floorH);
        if (openH < 56 || step > 24) { brokenDoors++; continue; }
      }
      addEdge(A.id, B.id); addEdge(B.id, A.id);
      continue;
    }
    if (l.flags & 1) continue;                  // impassable
    // A closed sector reached via a DOOR line is a door body (it opens); a
    // closed sector with no door special is a solid pillar/slab. Door bodies
    // are handled above, so anything closed here really is solid.
    if (closed(A) || closed(B)) continue;       // solid pillar/slab
    const gap = Math.min(A.ceilH, B.ceilH) - Math.max(A.floorH, B.floorH);
    if (gap < 56) { blockedByHeight++; continue; }
    const stepAB = B.floorH - A.floorH, stepBA = A.floorH - B.floorH;
    if (stepAB <= 24) addEdge(A.id, B.id);
    if (stepBA <= 24) addEdge(B.id, A.id);
  }
  // Which sector contains a point? Use the loop bboxes via linedef membership.
  // Sector bboxes (shared by the thing lookup and the room probe).
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
  const secOfThing = (t) => {
    // Find the smallest OPEN sector whose bbox contains the point. Closed
    // (floor==ceil) sectors are solid — a thing is never inside one, and
    // picking one as the flood start silently produced 0% reachability.
    let best = null, bestArea = Infinity;
    for (const [sid, e] of bounds) {
      if (t.x < e.x0 || t.x > e.x1 || t.y < e.y0 || t.y > e.y1) continue;
      const sec = secById.get(sid);
      if (!sec || sec.ceilH <= sec.floorH) continue;   // skip solid sectors
      const area = (e.x1 - e.x0) * (e.y1 - e.y0);
      if (area < bestArea) { bestArea = area; best = sid; }
    }
    return best;
  };
  // Teleport lines: special 97 (WR) / 39 (W1). The line's tag names the
  // DESTINATION sector; walking the pad moves you there. Add directed edges.
  const secsByTag = new Map();
  for (const s of map.sectors) {
    if (!s.tag) continue;
    if (!secsByTag.has(s.tag)) secsByTag.set(s.tag, []);
    secsByTag.get(s.tag).push(s.id);
  }
  for (const l of map.linedefs) {
    if (l.special !== 97 && l.special !== 39) continue;
    const dests = secsByTag.get(l.tag) || [];
    for (const side of [l.front, l.back]) {
      if (side === -1 || side == null) continue;
      const sd = sdById.get(side);
      if (!sd) continue;
      for (const d of dests) addEdge(sd.sector, d);
    }
  }

  const p1 = map.things.find(t => t.type === 1);
  if (!p1) return { error: 'no P1 start' };
  // Start from the LARGEST open sector containing P1 (the room floor), not
  // the smallest (which resolves to decorative furniture the player is
  // standing beside rather than on).
  let start = null, startArea = -1;
  for (const [sid, e] of bounds) {
    if (p1.x < e.x0 || p1.x > e.x1 || p1.y < e.y0 || p1.y > e.y1) continue;
    const sec = secById.get(sid);
    if (!sec || sec.ceilH <= sec.floorH) continue;
    const area = (e.x1 - e.x0) * (e.y1 - e.y0);
    if (area > startArea) { startArea = area; start = sid; }
  }
  if (!start) start = secOfThing(p1);
  if (!start) return { error: 'P1 not inside any sector' };
  // BFS
  const seen = new Set([start]);
  const q = [start];
  while (q.length) {
    const cur = q.shift();
    for (const nx of (adj.get(cur) || [])) if (!seen.has(nx)) { seen.add(nx); q.push(nx); }
  }
  // Which sectors matter? Ignore closed (solid) sectors — players can't enter.
  const open = map.sectors.filter(s => s.ceilH > s.floorH);
  const reachedOpen = open.filter(s => seen.has(s.id));
  // Are key things reachable?
  const keyTypes = { 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4' };
  const thingReach = {};
  for (const t of map.things) {
    if (!keyTypes[t.type]) continue;
    const sid = secOfThing(t);
    thingReach[keyTypes[t.type]] = sid ? seen.has(sid) : false;
  }
  // Exit switch reachable?
  let exitReachable = false;
  for (const l of map.linedefs) {
    if (l.special !== 11) continue;
    const f = sdById.get(l.front);
    if (f && seen.has(f.sector)) { exitReachable = true; break; }
  }
  // ROOM-level reachability (the metric that matters): can the player reach
  // the floor of every room? Decorative sub-sectors (building roofs, plinths,
  // skyscraper tiers) are deliberately unreachable and must not count.
  let roomsTotal = 0, roomsReached = 0, unreachedRooms = [];
  if (opts && opts.rooms) {
    for (const r of opts.rooms) {
      roomsTotal++;
      const span = (r.type === 'square' ? Math.min(r.w, r.h) : 2 * r.r) / 2;
      const probes = [{ x: r.cx, y: r.cy }];
      for (const f of [0.45, 0.7]) {
        for (let k = 0; k < 8; k++) {
          const a = k * Math.PI / 4;
          probes.push({ x: r.cx + Math.cos(a) * span * f, y: r.cy + Math.sin(a) * span * f });
        }
      }
      let hit = false;
      for (const p of probes) {
        if (hit) break;
        // Any REACHABLE sector covering this point counts — don't insist on
        // the smallest one (that resolves to decorative furniture).
        for (const sid of seen) {
          const e = bounds.get(sid);
          if (!e) continue;
          const sec = secById.get(sid);
          if (!sec || sec.ceilH <= sec.floorH) continue;
          if (p.x >= e.x0 && p.x <= e.x1 && p.y >= e.y0 && p.y <= e.y1) { hit = true; break; }
        }
      }
      if (hit) roomsReached++;
      else unreachedRooms.push(r.id + '(' + (r.feature || '?') + ')');
    }
  }
  return {
    openSectors: open.length, reached: reachedOpen.length,
    pct: Math.round(100 * reachedOpen.length / Math.max(1, open.length)),
    roomsTotal, roomsReached, unreachedRooms,
    roomPct: roomsTotal ? Math.round(100 * roomsReached / roomsTotal) : null,
    doorLines, brokenDoors, blockedByHeight, thingReach, exitReachable,
  };
}
module.exports = { loadEngine, mulberry32, analyze };

if (require.main === module) {
  const E = loadEngine();
  const presets = E.SHAPESHIFTER_PRESETS.filter(p => p.feature !== 'terrain');
  const arenaSrc = fs.readFileSync(path.join(ROOT, 'arena/index.html'), 'utf8');
  const arenaThings = eval('(' + arenaSrc.match(/function arenaThings\(lvl, rng, playerCount\) \{[\s\S]*?\n\}/)[0] + ')');
  let tot = 0, sum = 0, worst = 100, badDoors = 0, exitFails = 0;
  const N = +(process.argv[2] || 8), ROOMS = +(process.argv[3] || 20);
  for (let i = 0; i < N; i++) {
    const seed = 1000 + i * 7919;
    const rng = mulberry32(seed);
    const lvl = E.etherGenerateLevel({ rng, presets, roomCount: ROOMS, enemyCount: 30,
      difficulty: 'medium', fuseChance: 0 });
    const things = arenaThings(lvl, rng, 4);
    const map = E.generateShapeShifterMap(lvl.rooms, lvl.connections, things, { seed });
    const r = analyze(map, { rooms: lvl.rooms });
    if (r.error) { console.log('seed ' + seed + ': ' + r.error); continue; }
    tot++; sum += r.roomPct; worst = Math.min(worst, r.roomPct); badDoors += r.brokenDoors;
    if (!r.exitReachable) exitFails++;
    const flag = r.roomPct < 100 ? '  <-- ORPHANED ROOMS: ' + r.unreachedRooms.slice(0,5).join(',') : '';
    console.log('seed ' + seed + ': rooms ' + r.roomsReached + '/' + r.roomsTotal +
      ' (' + r.roomPct + '%) | sectors ' + r.pct + '%' +
      ' | doors=' + r.doorLines + ' broken=' + r.brokenDoors +
      ' | exit=' + (r.exitReachable ? 'ok' : 'UNREACHABLE') + flag);
  }
  console.log('--- ROOM reachability: avg ' + Math.round(sum / Math.max(1, tot)) + '% | worst ' +
    worst + '% | broken doors ' + badDoors + ' | exit unreachable ' + exitFails + '/' + tot);
}
