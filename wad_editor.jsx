import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';

// ============================================================================
// CONSTANTS
// ============================================================================
const DOOM_THING_TYPES = [
  { id: 1, name: 'Player 1 Start', cat: 'player' },
  { id: 2, name: 'Player 2 Start', cat: 'player' },
  { id: 3, name: 'Player 3 Start', cat: 'player' },
  { id: 4, name: 'Player 4 Start', cat: 'player' },
  { id: 11, name: 'Deathmatch Start', cat: 'player' },
  { id: 14, name: 'Teleport Dest', cat: 'player' },
  { id: 3004, name: 'Zombieman', cat: 'monster' },
  { id: 9, name: 'Sergeant', cat: 'monster' },
  { id: 3001, name: 'Imp', cat: 'monster' },
  { id: 3002, name: 'Demon', cat: 'monster' },
  { id: 3003, name: 'Baron', cat: 'monster' },
  { id: 3005, name: 'Cacodemon', cat: 'monster' },
  { id: 3006, name: 'Lost Soul', cat: 'monster' },
  { id: 7, name: 'Spider Boss', cat: 'monster' },
  { id: 16, name: 'Cyberdemon', cat: 'monster' },
  { id: 2001, name: 'Shotgun', cat: 'weapon' },
  { id: 2002, name: 'Chaingun', cat: 'weapon' },
  { id: 2003, name: 'Rocket Launcher', cat: 'weapon' },
  { id: 2004, name: 'Plasma Rifle', cat: 'weapon' },
  { id: 2005, name: 'Chainsaw', cat: 'weapon' },
  { id: 2006, name: 'BFG9000', cat: 'weapon' },
  { id: 2007, name: 'Clip', cat: 'ammo' },
  { id: 2008, name: 'Shells', cat: 'ammo' },
  { id: 2010, name: 'Rocket', cat: 'ammo' },
  { id: 2047, name: 'Cell Pack', cat: 'ammo' },
  { id: 2011, name: 'Stimpack', cat: 'health' },
  { id: 2012, name: 'Medikit', cat: 'health' },
  { id: 2014, name: 'Health Bonus', cat: 'health' },
  { id: 2015, name: 'Armor Bonus', cat: 'health' },
  { id: 2018, name: 'Green Armor', cat: 'health' },
  { id: 2019, name: 'Blue Armor', cat: 'health' },
  { id: 5, name: 'Blue Key', cat: 'key' },
  { id: 6, name: 'Yellow Key', cat: 'key' },
  { id: 13, name: 'Red Key', cat: 'key' },
  { id: 2035, name: 'Barrel', cat: 'decor' },
  { id: 34, name: 'Candle', cat: 'decor' },
  { id: 35, name: 'Candelabra', cat: 'decor' },
];

const THING_COLORS = {
  player: '#7fffd4', monster: '#ff5c5c', weapon: '#ffb74d',
  ammo: '#ffd54f', health: '#4fc3f7', key: '#ce93d8', decor: '#90a4ae'
};

const MODES = [
  { id: 'select', label: 'Select', glyph: '⌖' },
  { id: 'draw', label: 'Draw', glyph: '✎' },
  { id: 'sector', label: 'Sector', glyph: '◇' },
  { id: 'thing', label: 'Thing', glyph: '◉' },
];

const COLORS = {
  bg: '#0a0e1a',
  bgPanel: '#0f1626',
  grid: '#1a2842',
  gridMajor: '#243759',
  vertex: '#ff9d3d',
  vertexSelected: '#ffd84a',
  vertexDraw: '#7fffd4',
  line: '#5fb6d6',
  lineImpassable: '#8fd4ee',
  lineSelected: '#ffd84a',
  lineDraw: '#7fffd4',
  thing: '#ff5c5c',
  text: '#c5d4e8',
  textDim: '#6b7d99',
  accent: '#7fffd4',
  amber: '#ff9d3d',
  border: '#243759',
  danger: '#ff5c5c',
};

// ============================================================================
// WAD I/O
// ============================================================================
const decoder = new TextDecoder('ascii');

function readStr(view, off, len) {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + off, len);
  let end = 0;
  while (end < len && bytes[end] !== 0) end++;
  return decoder.decode(bytes.slice(0, end)).toUpperCase();
}

function writeStr(view, off, str, len) {
  const s = (str || '').toUpperCase();
  for (let i = 0; i < len; i++) {
    view.setUint8(off + i, i < s.length ? s.charCodeAt(i) & 0x7f : 0);
  }
}

const isMapMarker = n => /^E\dM\d$/.test(n) || /^MAP\d{2}$/.test(n);

function parseWad(buffer) {
  const view = new DataView(buffer);
  const id = readStr(view, 0, 4);
  if (id !== 'IWAD' && id !== 'PWAD') throw new Error('Not a WAD file (header: ' + id + ')');
  const numLumps = view.getInt32(4, true);
  const dirOffset = view.getInt32(8, true);

  const lumps = [];
  for (let i = 0; i < numLumps; i++) {
    const o = dirOffset + i * 16;
    lumps.push({
      offset: view.getInt32(o, true),
      size: view.getInt32(o + 4, true),
      name: readStr(view, o + 8, 8)
    });
  }

  const maps = {};
  for (let i = 0; i < lumps.length; i++) {
    if (isMapMarker(lumps[i].name)) {
      try {
        const m = parseMap(view, lumps, i);
        if (m) maps[lumps[i].name] = m;
      } catch (e) {
        console.warn('Failed to parse map ' + lumps[i].name, e);
      }
    }
  }

  return { type: id, maps };
}

function parseMap(view, lumps, markerIdx) {
  const map = emptyMap();
  for (let j = markerIdx + 1; j < Math.min(markerIdx + 11, lumps.length); j++) {
    const lump = lumps[j];
    if (isMapMarker(lump.name) && j > markerIdx + 1) break;
    const off = lump.offset;
    switch (lump.name) {
      case 'VERTEXES':
        for (let k = 0; k < lump.size; k += 4) {
          map.vertices.push({
            id: 'v' + map.vertices.length,
            x: view.getInt16(off + k, true),
            y: view.getInt16(off + k + 2, true)
          });
        }
        break;
      case 'LINEDEFS':
        for (let k = 0; k < lump.size; k += 14) {
          map.linedefs.push({
            id: 'l' + map.linedefs.length,
            v1: view.getInt16(off + k, true),
            v2: view.getInt16(off + k + 2, true),
            flags: view.getUint16(off + k + 4, true),
            special: view.getInt16(off + k + 6, true),
            tag: view.getInt16(off + k + 8, true),
            front: view.getInt16(off + k + 10, true),
            back: view.getInt16(off + k + 12, true)
          });
        }
        break;
      case 'SIDEDEFS':
        for (let k = 0; k < lump.size; k += 30) {
          map.sidedefs.push({
            id: 'sd' + map.sidedefs.length,
            xOff: view.getInt16(off + k, true),
            yOff: view.getInt16(off + k + 2, true),
            upper: readStr(view, off + k + 4, 8),
            lower: readStr(view, off + k + 12, 8),
            middle: readStr(view, off + k + 20, 8),
            sector: view.getInt16(off + k + 28, true)
          });
        }
        break;
      case 'SECTORS':
        for (let k = 0; k < lump.size; k += 26) {
          map.sectors.push({
            id: 's' + map.sectors.length,
            floorH: view.getInt16(off + k, true),
            ceilH: view.getInt16(off + k + 2, true),
            floorTex: readStr(view, off + k + 4, 8),
            ceilTex: readStr(view, off + k + 12, 8),
            light: view.getInt16(off + k + 20, true),
            special: view.getInt16(off + k + 22, true),
            tag: view.getInt16(off + k + 24, true)
          });
        }
        break;
      case 'THINGS':
        for (let k = 0; k < lump.size; k += 10) {
          map.things.push({
            id: 't' + map.things.length,
            x: view.getInt16(off + k, true),
            y: view.getInt16(off + k + 2, true),
            angle: view.getInt16(off + k + 4, true),
            type: view.getInt16(off + k + 6, true),
            flags: view.getUint16(off + k + 8, true)
          });
        }
        break;
    }
  }
  return map;
}

// Build a PWAD from a maps dictionary { 'MAP01': mapData, ... }
function buildWad(maps) {
  // Resolve string IDs -> indices for each map, then emit lumps.
  const lumpsToWrite = [];

  for (const [mapName, m] of Object.entries(maps)) {
    const vIdx = new Map(m.vertices.map((v, i) => [v.id, i]));
    const sdIdx = new Map(m.sidedefs.map((s, i) => [s.id, i]));
    const secIdx = new Map(m.sectors.map((s, i) => [s.id, i]));

    // map marker
    lumpsToWrite.push({ name: mapName, data: new Uint8Array(0) });

    // THINGS
    const thingsBuf = new ArrayBuffer(m.things.length * 10);
    const tv = new DataView(thingsBuf);
    m.things.forEach((t, i) => {
      tv.setInt16(i * 10, t.x | 0, true);
      tv.setInt16(i * 10 + 2, t.y | 0, true);
      tv.setInt16(i * 10 + 4, t.angle | 0, true);
      tv.setInt16(i * 10 + 6, t.type | 0, true);
      tv.setUint16(i * 10 + 8, (t.flags ?? 7) & 0xffff, true);
    });
    lumpsToWrite.push({ name: 'THINGS', data: new Uint8Array(thingsBuf) });

    // LINEDEFS
    const linesBuf = new ArrayBuffer(m.linedefs.length * 14);
    const lv = new DataView(linesBuf);
    m.linedefs.forEach((ld, i) => {
      lv.setInt16(i * 14, resolveIdx(ld.v1, vIdx), true);
      lv.setInt16(i * 14 + 2, resolveIdx(ld.v2, vIdx), true);
      lv.setUint16(i * 14 + 4, (ld.flags ?? 1) & 0xffff, true);
      lv.setInt16(i * 14 + 6, ld.special | 0, true);
      lv.setInt16(i * 14 + 8, ld.tag | 0, true);
      lv.setInt16(i * 14 + 10, resolveIdxOrNeg(ld.front, sdIdx), true);
      lv.setInt16(i * 14 + 12, resolveIdxOrNeg(ld.back, sdIdx), true);
    });
    lumpsToWrite.push({ name: 'LINEDEFS', data: new Uint8Array(linesBuf) });

    // SIDEDEFS
    const sdsBuf = new ArrayBuffer(m.sidedefs.length * 30);
    const sdv = new DataView(sdsBuf);
    m.sidedefs.forEach((sd, i) => {
      sdv.setInt16(i * 30, sd.xOff | 0, true);
      sdv.setInt16(i * 30 + 2, sd.yOff | 0, true);
      writeStr(sdv, i * 30 + 4, sd.upper || '-', 8);
      writeStr(sdv, i * 30 + 12, sd.lower || '-', 8);
      writeStr(sdv, i * 30 + 20, sd.middle || '-', 8);
      sdv.setInt16(i * 30 + 28, resolveIdx(sd.sector, secIdx), true);
    });
    lumpsToWrite.push({ name: 'SIDEDEFS', data: new Uint8Array(sdsBuf) });

    // VERTEXES
    const vBuf = new ArrayBuffer(m.vertices.length * 4);
    const vv = new DataView(vBuf);
    m.vertices.forEach((v, i) => {
      vv.setInt16(i * 4, v.x | 0, true);
      vv.setInt16(i * 4 + 2, v.y | 0, true);
    });
    lumpsToWrite.push({ name: 'VERTEXES', data: new Uint8Array(vBuf) });

    // Empty SEGS, SSECTORS, NODES — GZDoom/ZDoom rebuild on load
    lumpsToWrite.push({ name: 'SEGS', data: new Uint8Array(0) });
    lumpsToWrite.push({ name: 'SSECTORS', data: new Uint8Array(0) });
    lumpsToWrite.push({ name: 'NODES', data: new Uint8Array(0) });

    // SECTORS
    const secBuf = new ArrayBuffer(m.sectors.length * 26);
    const sv = new DataView(secBuf);
    m.sectors.forEach((s, i) => {
      sv.setInt16(i * 26, s.floorH | 0, true);
      sv.setInt16(i * 26 + 2, s.ceilH | 0, true);
      writeStr(sv, i * 26 + 4, s.floorTex || 'FLAT1', 8);
      writeStr(sv, i * 26 + 12, s.ceilTex || 'FLAT1', 8);
      sv.setInt16(i * 26 + 20, s.light | 0, true);
      sv.setInt16(i * 26 + 22, s.special | 0, true);
      sv.setInt16(i * 26 + 24, s.tag | 0, true);
    });
    lumpsToWrite.push({ name: 'SECTORS', data: new Uint8Array(secBuf) });

    // Empty REJECT and BLOCKMAP — port will rebuild
    lumpsToWrite.push({ name: 'REJECT', data: new Uint8Array(0) });
    lumpsToWrite.push({ name: 'BLOCKMAP', data: new Uint8Array(0) });
  }

  // Compute total size
  let dataSize = 0;
  lumpsToWrite.forEach(l => dataSize += l.data.length);
  const dirOffset = 12 + dataSize;
  const totalSize = dirOffset + lumpsToWrite.length * 16;

  const out = new ArrayBuffer(totalSize);
  const ov = new DataView(out);
  const ou8 = new Uint8Array(out);

  // Header
  writeStr(ov, 0, 'PWAD', 4);
  ov.setInt32(4, lumpsToWrite.length, true);
  ov.setInt32(8, dirOffset, true);

  // Lump data + directory
  let cursor = 12;
  lumpsToWrite.forEach((l, i) => {
    ou8.set(l.data, cursor);
    const dirEntry = dirOffset + i * 16;
    ov.setInt32(dirEntry, cursor, true);
    ov.setInt32(dirEntry + 4, l.data.length, true);
    writeStr(ov, dirEntry + 8, l.name, 8);
    cursor += l.data.length;
  });

  return out;
}

function resolveIdx(id, map) {
  if (typeof id === 'number') return id;
  const i = map.get(id);
  return i === undefined ? -1 : i;
}
function resolveIdxOrNeg(id, map) {
  if (id === -1 || id === undefined || id === null) return -1;
  return resolveIdx(id, map);
}

// ============================================================================
// MAP HELPERS
// ============================================================================
function emptyMap() {
  return { vertices: [], linedefs: [], sidedefs: [], sectors: [], things: [] };
}

function newId(prefix, list) {
  let n = list.length;
  while (list.some(x => x.id === prefix + n)) n++;
  return prefix + n;
}

// Convert imported maps (which may have numeric v1/v2/front/back/sector)
// into the editor's string-ID model.
function normalizeMap(m) {
  const verts = m.vertices.map((v, i) => ({ ...v, id: 'v' + i }));
  const sectors = m.sectors.map((s, i) => ({ ...s, id: 's' + i }));
  const sidedefs = m.sidedefs.map((sd, i) => ({
    ...sd,
    id: 'sd' + i,
    sector: typeof sd.sector === 'number' ? (sectors[sd.sector]?.id ?? null) : sd.sector
  }));
  const linedefs = m.linedefs.map((ld, i) => ({
    ...ld,
    id: 'l' + i,
    v1: typeof ld.v1 === 'number' ? (verts[ld.v1]?.id ?? null) : ld.v1,
    v2: typeof ld.v2 === 'number' ? (verts[ld.v2]?.id ?? null) : ld.v2,
    front: typeof ld.front === 'number' ? (ld.front === -1 ? -1 : (sidedefs[ld.front]?.id ?? -1)) : ld.front,
    back: typeof ld.back === 'number' ? (ld.back === -1 ? -1 : (sidedefs[ld.back]?.id ?? -1)) : ld.back,
  }));
  const things = m.things.map((t, i) => ({ ...t, id: 't' + i }));
  return { vertices: verts, linedefs, sidedefs, sectors, things };
}

// Starter room: 512x512 box with player start in middle
function starterMap() {
  const m = emptyMap();
  const vs = [
    { id: 'v0', x: -256, y: -256 },
    { id: 'v1', x: 256, y: -256 },
    { id: 'v2', x: 256, y: 256 },
    { id: 'v3', x: -256, y: 256 },
  ];
  m.vertices = vs;
  m.sectors = [{
    id: 's0', floorH: 0, ceilH: 128, floorTex: 'FLOOR0_1',
    ceilTex: 'CEIL1_1', light: 192, special: 0, tag: 0
  }];
  m.sidedefs = [0, 1, 2, 3].map(i => ({
    id: 'sd' + i, xOff: 0, yOff: 0,
    upper: '-', lower: '-', middle: 'STARTAN2', sector: 's0'
  }));
  m.linedefs = [
    { v1: 'v0', v2: 'v1' }, { v1: 'v1', v2: 'v2' },
    { v1: 'v2', v2: 'v3' }, { v1: 'v3', v2: 'v0' },
  ].map((l, i) => ({
    id: 'l' + i, ...l, flags: 1, special: 0, tag: 0,
    front: 'sd' + i, back: -1
  }));
  m.things = [{ id: 't0', x: 0, y: 0, angle: 90, type: 1, flags: 7 }];
  return m;
}

// ============================================================================
// GEOMETRY
// ============================================================================
function dist2(ax, ay, bx, by) {
  const dx = ax - bx, dy = ay - by;
  return dx * dx + dy * dy;
}

function pointToSegmentDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist2(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return dist2(px, py, ax + t * dx, ay + t * dy);
}

// Find closed loop of linedefs starting from a vertex chain
function chainToLoop(map, vertexChain) {
  if (vertexChain.length < 3) return null;
  if (vertexChain[0] !== vertexChain[vertexChain.length - 1]) return null;
  const lines = [];
  for (let i = 0; i < vertexChain.length - 1; i++) {
    const a = vertexChain[i], b = vertexChain[i + 1];
    const ld = map.linedefs.find(l =>
      (l.v1 === a && l.v2 === b) || (l.v1 === b && l.v2 === a)
    );
    if (ld) lines.push(ld);
  }
  return lines.length >= 3 ? lines : null;
}

// Point-in-polygon (ray casting)
function pointInPolygon(px, py, points) {
  let inside = false;
  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const xi = points[i].x, yi = points[i].y;
    const xj = points[j].x, yj = points[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / (yj - yi || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Angle helpers for boundary tracing
function angleOf(dx, dy) {
  let a = Math.atan2(dy, dx);
  if (a < 0) a += 2 * Math.PI;
  return a;
}
function cwDistance(fromAngle, toAngle) {
  // Clockwise distance from fromAngle to toAngle, in [0, 2π)
  let d = fromAngle - toAngle;
  while (d < 0) d += 2 * Math.PI;
  while (d >= 2 * Math.PI) d -= 2 * Math.PI;
  return d;
}

// Build polygon loops for every sector in the map.
// Returns Map<sectorId, Array<Array<vertexId>>>.
// Each sector may have multiple loops (outer + holes for donut sectors).
// Algorithm: collect directed edges that walk around each sector with the
// sector on the LEFT, then chain them into closed loops. At junctions with
// multiple candidate continuations, use the same CW-from-reverse-incoming
// sweep rule as the polygon tracer, which correctly hugs the boundary.
function buildSectorLoops(map) {
  const result = new Map();
  if (!map.sectors.length) return result;

  const vmap = new Map(map.vertices.map(v => [v.id, v]));
  const sdmap = new Map(map.sidedefs.map(s => [s.id, s]));

  // Collect directed edges per sector (sector on left of edge direction).
  const edgesBySector = new Map();
  const pushEdge = (sectorId, from, to, lineId) => {
    if (!edgesBySector.has(sectorId)) edgesBySector.set(sectorId, []);
    edgesBySector.get(sectorId).push({ from, to, lineId });
  };

  for (const ld of map.linedefs) {
    // FRONT side is on the RIGHT of v1->v2. For sector-on-left, walk v2->v1.
    if (ld.front && ld.front !== -1) {
      const sd = sdmap.get(ld.front);
      if (sd && sd.sector) pushEdge(sd.sector, ld.v2, ld.v1, ld.id);
    }
    // BACK side is on the LEFT of v1->v2. For sector-on-left, walk v1->v2.
    if (ld.back && ld.back !== -1) {
      const sd = sdmap.get(ld.back);
      if (sd && sd.sector) pushEdge(sd.sector, ld.v1, ld.v2, ld.id);
    }
  }

  for (const [sectorId, edges] of edgesBySector) {
    const fromIndex = new Map();
    edges.forEach((e, i) => {
      if (!fromIndex.has(e.from)) fromIndex.set(e.from, []);
      fromIndex.get(e.from).push(i);
    });

    const used = new Set();
    const loops = [];

    for (let startIdx = 0; startIdx < edges.length; startIdx++) {
      if (used.has(startIdx)) continue;
      const loop = [];
      let curIdx = startIdx;
      const loopStart = edges[startIdx].from;
      let safety = edges.length + 4;

      while (safety-- > 0 && !used.has(curIdx)) {
        used.add(curIdx);
        const e = edges[curIdx];
        loop.push(e.from);

        // Find next edge starting at e.to
        const candidates = (fromIndex.get(e.to) || []).filter(i => !used.has(i));
        if (candidates.length === 0) break;

        let nextIdx;
        if (candidates.length === 1) {
          nextIdx = candidates[0];
        } else {
          // Junction — pick the one closest CW from reverse-incoming.
          const fv = vmap.get(e.from);
          const tv = vmap.get(e.to);
          if (!fv || !tv) break;
          const inAng = angleOf(tv.x - fv.x, tv.y - fv.y);
          const revIn = (inAng + Math.PI) % (2 * Math.PI);
          let best = candidates[0];
          let bestDist = Infinity;
          for (const ci of candidates) {
            const ce = edges[ci];
            const cv = vmap.get(ce.from);
            const ov = vmap.get(ce.to);
            if (!cv || !ov) continue;
            const outAng = angleOf(ov.x - cv.x, ov.y - cv.y);
            const d = cwDistance(revIn, outAng);
            if (d < 1e-6) continue;
            if (d < bestDist) { bestDist = d; best = ci; }
          }
          nextIdx = best;
        }

        if (edges[nextIdx].to === loopStart || edges[curIdx].to === loopStart) {
          // We've closed (or about to close); finalize after pushing the next edge
        }
        curIdx = nextIdx;
        if (edges[curIdx].from !== e.to) break; // disconnected, abort
      }

      if (loop.length >= 3) loops.push(loop);
    }

    if (loops.length) result.set(sectorId, loops);
  }

  return result;
}
// Returns an array of steps: { linedefId, fromVertex, toVertex, walkedForward }
// where walkedForward = true means we walked the line in its v1->v2 direction.
// The interior of the polygon is on the LEFT of the walk direction.
// Returns null if the point is not enclosed.
function tracePolygonAtPoint(map, px, py) {
  if (map.linedefs.length === 0) return null;

  const vertexOf = (id) => map.vertices.find(v => v.id === id);

  // Step 1: Cast a ray from (px, py) in +X direction and find the nearest
  // linedef hit. We jitter py slightly to avoid degenerate hits at vertices.
  const rayY = py + 0.0001;
  let bestLine = null;
  let bestT = Infinity;

  for (const ld of map.linedefs) {
    const v1 = vertexOf(ld.v1);
    const v2 = vertexOf(ld.v2);
    if (!v1 || !v2) continue;
    const dy = v2.y - v1.y;
    if (Math.abs(dy) < 1e-9) continue; // horizontal: parallel to ray
    const s = (rayY - v1.y) / dy;
    if (s < 0 || s > 1) continue;
    const ix = v1.x + s * (v2.x - v1.x);
    const t = ix - px;
    if (t <= 1e-6) continue;
    if (t < bestT) {
      bestT = t;
      bestLine = ld;
    }
  }
  if (!bestLine) return null;

  // Step 2: Determine which side of the hit line our point is on,
  // then choose walk direction so that the interior is on our LEFT.
  const sv1 = vertexOf(bestLine.v1);
  const sv2 = vertexOf(bestLine.v2);
  // Cross product (v2 - v1) × (P - v1) — positive => P is on the left of v1→v2.
  const cross = (sv2.x - sv1.x) * (py - sv1.y) - (sv2.y - sv1.y) * (px - sv1.x);

  let walkFrom, walkTo, walkedForward;
  if (cross > 0) {
    // Point is on left of v1→v2. Walk v1→v2 (interior stays on left).
    walkFrom = bestLine.v1;
    walkTo = bestLine.v2;
    walkedForward = true;
  } else {
    walkFrom = bestLine.v2;
    walkTo = bestLine.v1;
    walkedForward = false;
  }

  // Step 3: Build vertex adjacency map.
  const adj = new Map();
  for (const ld of map.linedefs) {
    if (!adj.has(ld.v1)) adj.set(ld.v1, []);
    if (!adj.has(ld.v2)) adj.set(ld.v2, []);
    adj.get(ld.v1).push({ linedefId: ld.id, otherVertex: ld.v2 });
    adj.get(ld.v2).push({ linedefId: ld.id, otherVertex: ld.v1 });
  }

  // Step 4: Walk the boundary. At each vertex, pick the next edge by
  // sweeping CLOCKWISE from the reverse of the incoming direction; the
  // first edge encountered is the next step. This correctly traces the
  // inner boundary with interior on left, including concave shapes.
  const path = [];
  path.push({
    linedefId: bestLine.id,
    fromVertex: walkFrom,
    toVertex: walkTo,
    walkedForward
  });

  const startVertex = walkFrom;
  let prevVertex = walkFrom;
  let currentVertex = walkTo;
  let currentLineId = bestLine.id;

  const MAX_STEPS = map.linedefs.length * 2 + 8;
  while (path.length < MAX_STEPS) {
    if (currentVertex === startVertex) break; // closed loop

    const candidates = (adj.get(currentVertex) || [])
      .filter(c => c.linedefId !== currentLineId);
    if (candidates.length === 0) return null; // dead end

    const pv = vertexOf(prevVertex);
    const cv = vertexOf(currentVertex);
    const incomingAngle = angleOf(cv.x - pv.x, cv.y - pv.y);
    // Reverse-incoming = the direction we came from, looking back.
    const reverseInAngle = (incomingAngle + Math.PI) % (2 * Math.PI);

    let bestCand = null;
    let bestCwDist = Infinity;
    for (const cand of candidates) {
      const ov = vertexOf(cand.otherVertex);
      const outAngle = angleOf(ov.x - cv.x, ov.y - cv.y);
      const d = cwDistance(reverseInAngle, outAngle);
      // d ≈ 0 means we'd go back exactly the way we came (backtrack via
      // duplicate line — shouldn't happen but skip to be safe).
      if (d < 1e-6) continue;
      if (d < bestCwDist) {
        bestCwDist = d;
        bestCand = cand;
      }
    }
    if (!bestCand) return null;

    const ld = map.linedefs.find(l => l.id === bestCand.linedefId);
    path.push({
      linedefId: bestCand.linedefId,
      fromVertex: currentVertex,
      toVertex: bestCand.otherVertex,
      walkedForward: ld.v1 === currentVertex
    });

    prevVertex = currentVertex;
    currentVertex = bestCand.otherVertex;
    currentLineId = bestCand.linedefId;
  }

  if (currentVertex !== startVertex) return null; // didn't close

  // Step 5: Verify the polygon actually encloses (px, py).
  const polyPoints = path.map(s => {
    const v = vertexOf(s.fromVertex);
    return { x: v.x, y: v.y };
  });
  if (!pointInPolygon(px, py, polyPoints)) return null;

  return path;
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================
const DEFAULT_SECTOR = {
  floorH: 0, ceilH: 128, floorTex: 'FLOOR0_1', ceilTex: 'CEIL1_1',
  light: 160, special: 0, tag: 0
};
const DEFAULT_SIDEDEF = {
  xOff: 0, yOff: 0, upper: '-', lower: '-', middle: 'STARTAN2'
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================
export default function WadEditor() {
  const [doc, setDoc] = useState(() => ({
    maps: { 'MAP01': starterMap() },
    currentMap: 'MAP01',
    fileName: 'untitled.wad'
  }));
  const [mode, setMode] = useState('select');
  const [selection, setSelection] = useState(null); // { type, id }
  const [drawChain, setDrawChain] = useState([]); // array of vertex IDs
  const [view, setView] = useState({ x: 0, y: 0, zoom: 0.15 });
  const [snap, setSnap] = useState(8);
  const [showGrid, setShowGrid] = useState(true);
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const [thingPicker, setThingPicker] = useState(null); // { x, y } in world coords
  const [sectorHint, setSectorHint] = useState(null);
  const [shareModal, setShareModal] = useState(null); // null | { kind: 'manual' | 'shared' }

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const historyRef = useRef({ past: [], future: [] });
  const lastHistoryPushRef = useRef(0);
  const HISTORY_DEBOUNCE_MS = 500;
  const HISTORY_LIMIT = 50;
  const [historyTick, setHistoryTick] = useState(0); // forces re-render after undo/redo

  const map = doc.maps[doc.currentMap];

  // Cached polygon loops for every sector — used for fill rendering and
  // for highlighting selected sector boundaries.
  const sectorLoops = useMemo(() => buildSectorLoops(map), [map]);

  // Set of linedef IDs that bound the currently-selected sector.
  const selectedSectorLineIds = useMemo(() => {
    if (selection?.type !== 'sector') return null;
    const lineIds = new Set();
    for (const ld of map.linedefs) {
      const front = ld.front && ld.front !== -1
        ? map.sidedefs.find(s => s.id === ld.front) : null;
      const back = ld.back && ld.back !== -1
        ? map.sidedefs.find(s => s.id === ld.back) : null;
      if (front?.sector === selection.id || back?.sector === selection.id) {
        lineIds.add(ld.id);
      }
    }
    return lineIds;
  }, [selection, map.linedefs, map.sidedefs]);

  // Touch historyTick so React knows undo/redo button state can change.
  // (canUndo/canRedo read from a ref, so we need a real subscription.)
  void historyTick;

  // Auto-clear sector hint after a moment
  useEffect(() => {
    if (!sectorHint) return;
    const t = setTimeout(() => setSectorHint(null), 2200);
    return () => clearTimeout(t);
  }, [sectorHint]);

  // Inject fonts on mount
  useEffect(() => {
    if (document.getElementById('wadeditor-fonts')) return;
    const link = document.createElement('link');
    link.id = 'wadeditor-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);

  // ---- Map mutation helpers ----
  const updateMap = useCallback((updater) => {
    setDoc(d => {
      const now = Date.now();
      if (now - lastHistoryPushRef.current > HISTORY_DEBOUNCE_MS) {
        historyRef.current.past.push(d);
        if (historyRef.current.past.length > HISTORY_LIMIT) {
          historyRef.current.past.shift();
        }
        historyRef.current.future = [];
      }
      lastHistoryPushRef.current = now;
      const m = d.maps[d.currentMap];
      const next = updater(m);
      return { ...d, maps: { ...d.maps, [d.currentMap]: next } };
    });
  }, []);

  // History snapshot for non-map-mutation operations (file load, map switch).
  const snapshotHistory = useCallback(() => {
    setDoc(d => {
      historyRef.current.past.push(d);
      if (historyRef.current.past.length > HISTORY_LIMIT) {
        historyRef.current.past.shift();
      }
      historyRef.current.future = [];
      lastHistoryPushRef.current = Date.now();
      return d; // no actual change, just snapshot
    });
  }, []);

  const undo = useCallback(() => {
    if (historyRef.current.past.length === 0) return;
    setDoc(cur => {
      const prev = historyRef.current.past.pop();
      historyRef.current.future.push(cur);
      lastHistoryPushRef.current = 0; // next mutation will push fresh
      return prev;
    });
    setSelection(null);
    setDrawChain([]);
    setHistoryTick(t => t + 1);
  }, []);

  const redo = useCallback(() => {
    if (historyRef.current.future.length === 0) return;
    setDoc(cur => {
      const next = historyRef.current.future.pop();
      historyRef.current.past.push(cur);
      lastHistoryPushRef.current = 0;
      return next;
    });
    setSelection(null);
    setDrawChain([]);
    setHistoryTick(t => t + 1);
  }, []);

  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  // ---- View / coordinate transforms ----
  const screenToWorld = useCallback((sx, sy) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const cx = c.clientWidth / 2;
    const cy = c.clientHeight / 2;
    return {
      x: (sx - cx) / view.zoom + view.x,
      y: -((sy - cy) / view.zoom) + view.y
    };
  }, [view]);

  const worldToScreen = useCallback((wx, wy) => {
    const c = canvasRef.current;
    if (!c) return { x: 0, y: 0 };
    const cx = c.clientWidth / 2;
    const cy = c.clientHeight / 2;
    return {
      x: (wx - view.x) * view.zoom + cx,
      y: -(wy - view.y) * view.zoom + cy
    };
  }, [view]);

  const snapWorld = useCallback((x, y) => {
    if (snap <= 0) return { x: Math.round(x), y: Math.round(y) };
    return { x: Math.round(x / snap) * snap, y: Math.round(y / snap) * snap };
  }, [snap]);

  // ---- Hit testing (in screen px) ----
  const HIT_RADIUS = 22; // generous for fingers

  const hitVertex = useCallback((sx, sy) => {
    let best = null, bestD = HIT_RADIUS * HIT_RADIUS;
    for (const v of map.vertices) {
      const s = worldToScreen(v.x, v.y);
      const d = dist2(sx, sy, s.x, s.y);
      if (d < bestD) { bestD = d; best = v; }
    }
    return best;
  }, [map.vertices, worldToScreen]);

  const hitLinedef = useCallback((sx, sy) => {
    let best = null, bestD = HIT_RADIUS * HIT_RADIUS;
    for (const ld of map.linedefs) {
      const v1 = map.vertices.find(v => v.id === ld.v1);
      const v2 = map.vertices.find(v => v.id === ld.v2);
      if (!v1 || !v2) continue;
      const a = worldToScreen(v1.x, v1.y);
      const b = worldToScreen(v2.x, v2.y);
      const d = pointToSegmentDist2(sx, sy, a.x, a.y, b.x, b.y);
      if (d < bestD) { bestD = d; best = ld; }
    }
    return best;
  }, [map.linedefs, map.vertices, worldToScreen]);

  const hitThing = useCallback((sx, sy) => {
    let best = null, bestD = HIT_RADIUS * HIT_RADIUS;
    for (const t of map.things) {
      const s = worldToScreen(t.x, t.y);
      const d = dist2(sx, sy, s.x, s.y);
      if (d < bestD) { bestD = d; best = t; }
    }
    return best;
  }, [map.things, worldToScreen]);

  // ---- Drawing actions ----
  const placeOrExtendDraw = useCallback((wx, wy) => {
    const snapped = snapWorld(wx, wy);
    const SNAP_PIX = 24;
    const screen = worldToScreen(snapped.x, snapped.y);

    // Snap to existing vertex if close enough
    let existingVid = null;
    let bestD = SNAP_PIX * SNAP_PIX;
    for (const v of map.vertices) {
      const s = worldToScreen(v.x, v.y);
      const d = dist2(screen.x, screen.y, s.x, s.y);
      if (d < bestD) { bestD = d; existingVid = v.id; }
    }

    const useVid = existingVid || newId('v', map.vertices);
    const newChain = [...drawChain, useVid];
    const isClosing = newChain.length >= 4 && useVid === newChain[0];

    updateMap(m => {
      let nextV = m.vertices;
      let nextL = m.linedefs;
      let nextSD = m.sidedefs;
      let nextS = m.sectors;

      if (!existingVid) {
        nextV = [...nextV, { id: useVid, x: snapped.x, y: snapped.y }];
      }

      // Add a linedef from previous chain vertex to new one
      if (drawChain.length >= 1) {
        const prev = drawChain[drawChain.length - 1];
        if (prev !== useVid) {
          const ldId = newId('l', nextL);
          nextL = [...nextL, {
            id: ldId, v1: prev, v2: useVid,
            flags: 1, special: 0, tag: 0,
            front: -1, back: -1
          }];
        }
      }

      // If closing, attempt to make a sector from the loop
      if (isClosing) {
        const loop = chainToLoop({ vertices: nextV, linedefs: nextL }, newChain);
        if (loop) {
          const sid = newId('s', nextS);
          nextS = [...nextS, { id: sid, ...DEFAULT_SECTOR }];
          const updatedSD = [...nextSD];
          let sdCounter = updatedSD.length;
          const sdByLineId = new Map();
          for (const ld of loop) {
            // Skip if this line already has a front sidedef (e.g., reused boundary)
            if (ld.front && ld.front !== -1) continue;
            const sdId = 'sd' + sdCounter++;
            updatedSD.push({ id: sdId, ...DEFAULT_SIDEDEF, sector: sid });
            sdByLineId.set(ld.id, sdId);
          }
          nextSD = updatedSD;
          nextL = nextL.map(ld =>
            sdByLineId.has(ld.id) ? { ...ld, front: sdByLineId.get(ld.id) } : ld
          );
        }
      }

      return { ...m, vertices: nextV, linedefs: nextL, sidedefs: nextSD, sectors: nextS };
    });

    setDrawChain(isClosing ? [] : newChain);
  }, [map.vertices, drawChain, snapWorld, updateMap, worldToScreen]);

  const cancelDraw = useCallback(() => setDrawChain([]), []);

  // Build a sector at a tapped world point.
  // Algorithm:
  //   1. Trace the boundary loop enclosing the point (interior on left of walk).
  //   2. Check whether the loop already encloses an existing sector;
  //      if so, just select it.
  //   3. Otherwise, create a new sector and assign it to the inside-facing
  //      sidedef of every linedef in the loop. If a linedef was walked
  //      "forward" (v1->v2), interior is on its LEFT, which corresponds to
  //      the BACK side in Doom convention. To make the front face inward
  //      (so the texture renders on the inside), we SWAP v1/v2 of that
  //      linedef and assign the front. If a swap would conflict with an
  //      existing front sidedef from another sector, we fall back to
  //      assigning the back side and marking the line two-sided.
  const buildSectorAt = useCallback((wx, wy) => {
    const path = tracePolygonAtPoint(map, wx, wy);
    if (!path) return { ok: false, reason: 'not enclosed' };

    // Check for existing sector — look at the inside sidedef of the first step.
    const firstStep = path[0];
    const firstLine = map.linedefs.find(l => l.id === firstStep.linedefId);
    // Inside is on LEFT of walk. For walked-forward, LEFT = back side.
    // For walked-reverse, LEFT (of walk) = LEFT of v2->v1 = RIGHT of v1->v2 = front.
    const insideSidedefId = firstStep.walkedForward ? firstLine.back : firstLine.front;
    if (insideSidedefId && insideSidedefId !== -1) {
      const sd = map.sidedefs.find(s => s.id === insideSidedefId);
      if (sd) {
        setSelection({ type: 'sector', id: sd.sector });
        return { ok: true, action: 'selected', sectorId: sd.sector };
      }
    }

    // Build a new sector.
    updateMap(m => {
      const sectorId = newId('s', m.sectors);
      const sector = { id: sectorId, ...DEFAULT_SECTOR };
      let nextLines = [...m.linedefs];
      const nextSidedefs = [...m.sidedefs];
      let sdCounter = nextSidedefs.length;
      const mintSidedefId = () => 'sd' + (sdCounter++);

      for (const step of path) {
        const idx = nextLines.findIndex(l => l.id === step.linedefId);
        if (idx < 0) continue;
        let ld = { ...nextLines[idx] };

        if (step.walkedForward) {
          // Inside is on LEFT of v1->v2 (back side).
          // We want front to face inside, so swap v1/v2.
          // BUT: only if there's no existing front sidedef that would be
          // pointing into another sector — swapping would orphan it.
          if ((ld.front === -1 || ld.front == null) &&
              (ld.back === -1 || ld.back == null)) {
            // Free line — swap to flip wall inward.
            const newFront = mintSidedefId();
            nextSidedefs.push({ id: newFront, ...DEFAULT_SIDEDEF, sector: sectorId });
            ld = { ...ld, v1: ld.v2, v2: ld.v1, front: newFront };
          } else if (ld.back === -1 || ld.back == null) {
            // Front already taken — assign back and mark two-sided.
            const newBack = mintSidedefId();
            nextSidedefs.push({ id: newBack, ...DEFAULT_SIDEDEF, sector: sectorId });
            ld = {
              ...ld,
              back: newBack,
              flags: (ld.flags | 4) & ~1, // set two-sided, clear impassable
            };
          }
          // else: both sides occupied; leave alone (shouldn't normally happen)
        } else {
          // Walked v2->v1. Inside is on LEFT of walk = RIGHT of v1->v2 = front.
          if (ld.front === -1 || ld.front == null) {
            const newFront = mintSidedefId();
            nextSidedefs.push({ id: newFront, ...DEFAULT_SIDEDEF, sector: sectorId });
            ld = { ...ld, front: newFront };
          } else if (ld.back === -1 || ld.back == null) {
            // Front already used — put us on back, two-sided.
            const newBack = mintSidedefId();
            nextSidedefs.push({ id: newBack, ...DEFAULT_SIDEDEF, sector: sectorId });
            ld = {
              ...ld,
              back: newBack,
              flags: (ld.flags | 4) & ~1,
            };
          }
        }
        nextLines[idx] = ld;
      }

      return {
        ...m,
        linedefs: nextLines,
        sidedefs: nextSidedefs,
        sectors: [...m.sectors, sector],
      };
    });
    return { ok: true, action: 'built' };
  }, [map, updateMap]);

  // ---- Pointer / gesture handling ----
  const onPointerDown = (e) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    pointersRef.current.set(e.pointerId, { sx, sy, startX: sx, startY: sy, t: Date.now() });

    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      const dx = a.sx - b.sx, dy = a.sy - b.sy;
      gestureRef.current = {
        kind: 'pinch',
        startDist: Math.hypot(dx, dy),
        startZoom: view.zoom,
        startView: { x: view.x, y: view.y },
        startCenter: { x: (a.sx + b.sx) / 2, y: (a.sy + b.sy) / 2 }
      };
    } else if (pointersRef.current.size === 1) {
      // In select mode, check if we're grabbing a vertex or thing
      if (mode === 'select') {
        const t = hitThing(sx, sy);
        if (t) {
          gestureRef.current = { kind: 'drag-thing', thingId: t.id };
          return;
        }
        const v = hitVertex(sx, sy);
        if (v) {
          gestureRef.current = { kind: 'drag-vertex', vertexId: v.id };
          return;
        }
      }
      gestureRef.current = { kind: 'tap-or-pan', startView: { x: view.x, y: view.y } };
    }
  };

  const onPointerMove = (e) => {
    const ptr = pointersRef.current.get(e.pointerId);
    if (!ptr) return;
    const rect = canvasRef.current.getBoundingClientRect();
    ptr.sx = e.clientX - rect.left;
    ptr.sy = e.clientY - rect.top;

    const g = gestureRef.current;
    if (!g) return;

    if (g.kind === 'pinch' && pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      const dx = a.sx - b.sx, dy = a.sy - b.sy;
      const dNow = Math.hypot(dx, dy);
      const ratio = dNow / g.startDist;
      const newZoom = Math.max(0.01, Math.min(4, g.startZoom * ratio));
      const centerNow = { x: (a.sx + b.sx) / 2, y: (a.sy + b.sy) / 2 };
      const c = canvasRef.current;
      const cx = c.clientWidth / 2, cy = c.clientHeight / 2;
      const wx = (g.startCenter.x - cx) / g.startZoom + g.startView.x;
      const wy = -((g.startCenter.y - cy) / g.startZoom) + g.startView.y;
      const newViewX = wx - (centerNow.x - cx) / newZoom;
      const newViewY = wy + (centerNow.y - cy) / newZoom;
      setView({ x: newViewX, y: newViewY, zoom: newZoom });
    } else if ((g.kind === 'drag-vertex' || g.kind === 'drag-thing') && pointersRef.current.size === 1) {
      const dx = ptr.sx - ptr.startX;
      const dy = ptr.sy - ptr.startY;
      // Only commit movement once we've crossed a small threshold
      if (Math.hypot(dx, dy) > 4) {
        const w = screenToWorld(ptr.sx, ptr.sy);
        const sn = snapWorld(w.x, w.y);
        if (g.kind === 'drag-vertex') {
          updateMap(m => ({
            ...m,
            vertices: m.vertices.map(v =>
              v.id === g.vertexId ? { ...v, x: sn.x, y: sn.y } : v
            )
          }));
          if (selection?.type !== 'vertex' || selection.id !== g.vertexId) {
            setSelection({ type: 'vertex', id: g.vertexId });
          }
        } else {
          updateMap(m => ({
            ...m,
            things: m.things.map(t =>
              t.id === g.thingId ? { ...t, x: sn.x, y: sn.y } : t
            )
          }));
          if (selection?.type !== 'thing' || selection.id !== g.thingId) {
            setSelection({ type: 'thing', id: g.thingId });
          }
        }
      }
    } else if (g.kind === 'tap-or-pan' && pointersRef.current.size === 1) {
      const dx = ptr.sx - ptr.startX;
      const dy = ptr.sy - ptr.startY;
      if (Math.hypot(dx, dy) > 6) {
        gestureRef.current = { ...g, kind: 'pan' };
      }
    }
    if (gestureRef.current?.kind === 'pan' && pointersRef.current.size === 1) {
      const dx = ptr.sx - ptr.startX;
      const dy = ptr.sy - ptr.startY;
      const sv = gestureRef.current.startView;
      setView(v => ({ ...v, x: sv.x - dx / v.zoom, y: sv.y + dy / v.zoom }));
    }
  };

  const onPointerUp = (e) => {
    const ptr = pointersRef.current.get(e.pointerId);
    pointersRef.current.delete(e.pointerId);
    if (!ptr) return;

    const dt = Date.now() - ptr.t;
    const dx = ptr.sx - ptr.startX;
    const dy = ptr.sy - ptr.startY;
    const wasTap = Math.hypot(dx, dy) < 6 && dt < 350;
    const g = gestureRef.current;

    if (wasTap) {
      // Treat all small/short pointer-ups as taps regardless of gesture kind.
      // For drag-vertex/drag-thing that didn't actually move, this selects them.
      if (g?.kind === 'drag-vertex') {
        setSelection({ type: 'vertex', id: g.vertexId });
      } else if (g?.kind === 'drag-thing') {
        setSelection({ type: 'thing', id: g.thingId });
      } else if (g?.kind === 'tap-or-pan') {
        handleTap(ptr.sx, ptr.sy);
      }
    }

    if (pointersRef.current.size === 0) gestureRef.current = null;
    else if (pointersRef.current.size === 1) {
      const [only] = [...pointersRef.current.values()];
      gestureRef.current = {
        kind: 'tap-or-pan',
        startView: { x: view.x, y: view.y }
      };
      only.startX = only.sx;
      only.startY = only.sy;
      only.t = Date.now();
    }
  };

  const handleTap = (sx, sy) => {
    const w = screenToWorld(sx, sy);
    if (mode === 'select') {
      const t = hitThing(sx, sy);
      if (t) { setSelection({ type: 'thing', id: t.id }); return; }
      const v = hitVertex(sx, sy);
      if (v) { setSelection({ type: 'vertex', id: v.id }); return; }
      const ld = hitLinedef(sx, sy);
      if (ld) { setSelection({ type: 'linedef', id: ld.id }); return; }
      // Sector: point-in-polygon test against sector loops? Punt to V2;
      // tap a linedef and use its front sidedef to find sector.
      setSelection(null);
    } else if (mode === 'draw') {
      placeOrExtendDraw(w.x, w.y);
    } else if (mode === 'sector') {
      // Tap inside an enclosed area: build a new sector with walls flipped
      // inward, OR select the existing sector if one already lives there.
      const result = buildSectorAt(w.x, w.y);
      if (!result.ok) {
        setSectorHint('No enclosed area here — draw a closed shape first');
      } else if (result.action === 'built') {
        setSectorHint('Sector built · walls flipped inward');
      } else {
        setSectorHint(null);
      }
    } else if (mode === 'thing') {
      const t = hitThing(sx, sy);
      if (t) { setSelection({ type: 'thing', id: t.id }); return; }
      // Open thing picker at this location
      const sn = snapWorld(w.x, w.y);
      setThingPicker({ x: sn.x, y: sn.y });
    }
  };

  const placeThing = (typeId) => {
    if (!thingPicker) return;
    updateMap(m => {
      const id = newId('t', m.things);
      return {
        ...m,
        things: [...m.things, {
          id, x: thingPicker.x, y: thingPicker.y,
          angle: 0, type: typeId, flags: 7
        }]
      };
    });
    setThingPicker(null);
  };

  // Wheel zoom for desktop
  const onWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left;
    const sy = e.clientY - rect.top;
    const w = screenToWorld(sx, sy);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setView(v => {
      const newZoom = Math.max(0.01, Math.min(4, v.zoom * factor));
      // Keep mouse-world point stable
      const c = canvasRef.current;
      const cx = c.clientWidth / 2, cy = c.clientHeight / 2;
      const newX = w.x - (sx - cx) / newZoom;
      const newY = w.y + (sy - cy) / newZoom;
      return { x: newX, y: newY, zoom: newZoom };
    });
  };

  // ---- Rendering ----
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Grid
    if (showGrid && view.zoom > 0.04) {
      const gridSize = snap > 0 ? snap : 8;
      const major = gridSize * 8;
      const tlw = screenToWorld(0, 0);
      const brw = screenToWorld(rect.width, rect.height);
      const minX = Math.floor(tlw.x / gridSize) * gridSize;
      const maxX = Math.ceil(brw.x / gridSize) * gridSize;
      const minY = Math.floor(brw.y / gridSize) * gridSize;
      const maxY = Math.ceil(tlw.y / gridSize) * gridSize;

      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      if (view.zoom > 0.1) {
        ctx.beginPath();
        for (let x = minX; x <= maxX; x += gridSize) {
          if (x % major === 0) continue;
          const s = worldToScreen(x, 0);
          ctx.moveTo(s.x + 0.5, 0); ctx.lineTo(s.x + 0.5, rect.height);
        }
        for (let y = minY; y <= maxY; y += gridSize) {
          if (y % major === 0) continue;
          const s = worldToScreen(0, y);
          ctx.moveTo(0, s.y + 0.5); ctx.lineTo(rect.width, s.y + 0.5);
        }
        ctx.stroke();
      }
      ctx.strokeStyle = COLORS.gridMajor;
      ctx.beginPath();
      for (let x = Math.floor(minX / major) * major; x <= maxX; x += major) {
        const s = worldToScreen(x, 0);
        ctx.moveTo(s.x + 0.5, 0); ctx.lineTo(s.x + 0.5, rect.height);
      }
      for (let y = Math.floor(minY / major) * major; y <= maxY; y += major) {
        const s = worldToScreen(0, y);
        ctx.moveTo(0, s.y + 0.5); ctx.lineTo(rect.width, s.y + 0.5);
      }
      ctx.stroke();

      // Origin axes
      ctx.strokeStyle = '#3a557a';
      ctx.beginPath();
      const o = worldToScreen(0, 0);
      ctx.moveTo(o.x + 0.5, 0); ctx.lineTo(o.x + 0.5, rect.height);
      ctx.moveTo(0, o.y + 0.5); ctx.lineTo(rect.width, o.y + 0.5);
      ctx.stroke();
    }

    // Sector fills — drawn before lines so they sit beneath geometry.
    const vmap = new Map(map.vertices.map(v => [v.id, v]));
    if (sectorLoops.size) {
      for (const [sectorId, loops] of sectorLoops) {
        const sector = map.sectors.find(s => s.id === sectorId);
        if (!sector) continue;
        const isSelectedSector = selection?.type === 'sector' && selection.id === sectorId;
        // Fill color: muted blue-gray base, brightness modulated by light level.
        // Selected sector gets an amber overlay tint.
        const t = Math.max(0, Math.min(1, (sector.light ?? 160) / 255));
        const r = Math.round(28 + t * 70);
        const g = Math.round(46 + t * 70);
        const b = Math.round(70 + t * 60);
        const alpha = 0.22 + t * 0.18;
        ctx.fillStyle = isSelectedSector
          ? `rgba(255, 157, 61, ${0.18 + t * 0.12})`
          : `rgba(${r}, ${g}, ${b}, ${alpha})`;
        ctx.beginPath();
        for (const loop of loops) {
          for (let i = 0; i < loop.length; i++) {
            const v = vmap.get(loop[i]);
            if (!v) continue;
            const s = worldToScreen(v.x, v.y);
            if (i === 0) ctx.moveTo(s.x, s.y);
            else ctx.lineTo(s.x, s.y);
          }
          ctx.closePath();
        }
        ctx.fill('evenodd'); // 'evenodd' makes inner loops carve holes
      }
    }

    // Linedefs — WADED-style coloring:
    //   no sidedef         = "raw" line, dim gray
    //   one-sided wall     = solid yellow/amber
    //   two-sided passable = pale teal
    //   has special action = red accent
    //   bounds selected sector = bright glow
    //   selected itself    = thick highlight
    const sdmap = new Map(map.sidedefs.map(s => [s.id, s]));
    for (const ld of map.linedefs) {
      const v1 = vmap.get(ld.v1), v2 = vmap.get(ld.v2);
      if (!v1 || !v2) continue;
      const a = worldToScreen(v1.x, v1.y);
      const b = worldToScreen(v2.x, v2.y);

      const hasFront = ld.front && ld.front !== -1 && sdmap.has(ld.front);
      const hasBack = ld.back && ld.back !== -1 && sdmap.has(ld.back);
      const isWall = hasFront || hasBack;
      const isTwoSided = hasFront && hasBack;
      const hasSpecial = ld.special && ld.special !== 0;
      const isSel = selection?.type === 'linedef' && selection.id === ld.id;
      const boundsSelectedSector = selectedSectorLineIds?.has(ld.id);

      let color;
      let width;
      if (isSel) {
        color = COLORS.lineSelected;
        width = 2.8;
      } else if (boundsSelectedSector) {
        color = '#ffd84a';
        width = 2.2;
      } else if (hasSpecial && isWall) {
        color = '#ff8c5c'; // red-orange accent for action lines
        width = 1.8;
      } else if (isWall && !isTwoSided) {
        color = '#ffb84a'; // WADED yellow — one-sided wall, sector boundary
        width = 1.6;
      } else if (isTwoSided) {
        color = '#7fc4d8'; // pale teal — passable boundary
        width = 1.2;
      } else {
        color = '#5a6c87'; // dim gray — raw line, no sector yet
        width = 1.1;
      }

      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();

      // Direction tick (front-side normal indicator) at zoomed-in views
      if (view.zoom > 0.1 && isWall) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        // Front (right of v1->v2) in world coords corresponds to +X normal
        // when walking +Y. In screen coords (Y inverted), the right side of
        // the screen direction is (+dy, -dx)/len.
        const nx = dy / len, ny = -dx / len;
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx + nx * 4, my + ny * 4);
        ctx.stroke();
      }
    }

    // Draw chain (in-progress lines)
    if (drawChain.length > 0) {
      ctx.strokeStyle = COLORS.lineDraw;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i < drawChain.length - 1; i++) {
        const a = vmap.get(drawChain[i]);
        const b = vmap.get(drawChain[i + 1]);
        if (!a || !b) continue;
        const sa = worldToScreen(a.x, a.y);
        const sb = worldToScreen(b.x, b.y);
        if (i === 0) ctx.moveTo(sa.x, sa.y);
        ctx.lineTo(sb.x, sb.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // Vertices
    for (const v of map.vertices) {
      const s = worldToScreen(v.x, v.y);
      const isSel = selection?.type === 'vertex' && selection.id === v.id;
      const inDraw = drawChain.includes(v.id);
      const r = isSel ? 5 : inDraw ? 4 : 3;
      ctx.fillStyle = isSel ? COLORS.vertexSelected
        : inDraw ? COLORS.vertexDraw
        : COLORS.vertex;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
      if (isSel) {
        ctx.strokeStyle = COLORS.vertexSelected;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(s.x, s.y, 9, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // Things
    for (const t of map.things) {
      const s = worldToScreen(t.x, t.y);
      const meta = DOOM_THING_TYPES.find(x => x.id === t.type);
      const color = meta ? THING_COLORS[meta.cat] : '#888';
      const isSel = selection?.type === 'thing' && selection.id === t.id;
      const r = isSel ? 8 : 6;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Angle indicator
      ctx.strokeStyle = '#000';
      ctx.lineWidth = 1.5;
      const rad = -t.angle * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(rad) * (r + 4), s.y + Math.sin(rad) * (r + 4));
      ctx.stroke();
      if (isSel) {
        ctx.strokeStyle = COLORS.vertexSelected;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(s.x, s.y, r + 4, 0, Math.PI * 2);
        ctx.stroke();
      }
    }
  });

  // ---- Resize handling ----
  useEffect(() => {
    const handler = () => {
      const c = canvasRef.current;
      if (c) {
        const rect = c.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        c.width = rect.width * dpr;
        c.height = rect.height * dpr;
      }
      // Force redraw via state poke
      setView(v => ({ ...v }));
    };
    window.addEventListener('resize', handler);
    handler();
    return () => window.removeEventListener('resize', handler);
  }, []);

  // ---- File ops ----
  const onLoadFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wad = parseWad(buf);
      const mapNames = Object.keys(wad.maps);
      if (mapNames.length === 0) {
        alert('No maps found in this WAD.');
        return;
      }
      const normalized = {};
      for (const [k, v] of Object.entries(wad.maps)) normalized[k] = normalizeMap(v);
      setDoc({ maps: normalized, currentMap: mapNames[0], fileName: file.name });
      setSelection(null);
      setDrawChain([]);
      setWelcomeOpen(false);
      // Auto-fit view to first map
      autoFitView(normalized[mapNames[0]]);
    } catch (err) {
      alert('Failed to load WAD: ' + err.message);
    }
    e.target.value = '';
  };

  const autoFitView = (m) => {
    if (!m || m.vertices.length === 0) {
      setView({ x: 0, y: 0, zoom: 0.15 });
      return;
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of m.vertices) {
      if (v.x < minX) minX = v.x;
      if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y;
      if (v.y > maxY) maxY = v.y;
    }
    const c = canvasRef.current;
    if (!c) return;
    const rect = c.getBoundingClientRect();
    const w = maxX - minX, h = maxY - minY;
    const z = Math.min(rect.width / (w + 200), rect.height / (h + 200));
    setView({ x: (minX + maxX) / 2, y: (minY + maxY) / 2, zoom: Math.max(0.02, Math.min(2, z)) });
  };

  const onSaveWad = () => {
    try {
      const buf = buildWad(doc.maps);
      const blob = new Blob([buf], { type: 'application/octet-stream' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.fileName.toLowerCase().endsWith('.wad') ? doc.fileName : (doc.fileName + '.wad');
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Save failed: ' + e.message);
    }
  };

  // Play in GZDoom (iOS GenZD or other ports). Best-effort path:
  //   1. Build the WAD as a File.
  //   2. If Web Share API supports files, invoke it — iOS share sheet
  //      surfaces "Save to Files" prominently, where the user navigates
  //      to On My iPhone > GenZD and pastes the WAD.
  //   3. Otherwise, fall back to a download + instructions modal.
  const onPlayInGzdoom = async () => {
    let fileName = doc.fileName;
    if (!fileName.toLowerCase().endsWith('.wad')) fileName += '.wad';
    let buf;
    try {
      buf = buildWad(doc.maps);
    } catch (e) {
      alert('Build failed: ' + e.message);
      return;
    }
    const file = new File([buf], fileName, { type: 'application/octet-stream' });

    // Try Web Share API
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: fileName,
          text: 'Save to Files → On My iPhone → GenZD'
        });
        return;
      } catch (e) {
        // User cancelled or share failed — fall through to manual flow
        if (e?.name === 'AbortError') return;
      }
    }

    // Fallback: trigger download and show manual instructions
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShareModal({ kind: 'manual', fileName });
  };

  const onNewMap = () => {
    setDoc({ maps: { 'MAP01': starterMap() }, currentMap: 'MAP01', fileName: 'untitled.wad' });
    setSelection(null);
    setDrawChain([]);
    setView({ x: 0, y: 0, zoom: 0.4 });
    setWelcomeOpen(false);
  };

  const addNewMapSlot = () => {
    setDoc(d => {
      let n = 1;
      while (d.maps['MAP' + String(n).padStart(2, '0')]) n++;
      const name = 'MAP' + String(n).padStart(2, '0');
      return { ...d, maps: { ...d.maps, [name]: starterMap() }, currentMap: name };
    });
    setMapMenuOpen(false);
  };

  const switchMap = (name) => {
    setDoc(d => ({ ...d, currentMap: name }));
    setSelection(null);
    setDrawChain([]);
    setMapMenuOpen(false);
    setTimeout(() => autoFitView(doc.maps[name]), 0);
  };

  const deleteSelection = () => {
    if (!selection) return;
    updateMap(m => {
      const n = { ...m, vertices: [...m.vertices], linedefs: [...m.linedefs],
                  sidedefs: [...m.sidedefs], sectors: [...m.sectors], things: [...m.things] };
      if (selection.type === 'vertex') {
        // Remove vertex and any linedefs touching it
        n.linedefs = n.linedefs.filter(l => l.v1 !== selection.id && l.v2 !== selection.id);
        n.vertices = n.vertices.filter(v => v.id !== selection.id);
      } else if (selection.type === 'linedef') {
        n.linedefs = n.linedefs.filter(l => l.id !== selection.id);
      } else if (selection.type === 'thing') {
        n.things = n.things.filter(t => t.id !== selection.id);
      } else if (selection.type === 'sector') {
        // Remove sector + sidedefs referencing it; clear linedef sidedef refs
        const sdToDelete = new Set(n.sidedefs.filter(sd => sd.sector === selection.id).map(sd => sd.id));
        n.sectors = n.sectors.filter(s => s.id !== selection.id);
        n.sidedefs = n.sidedefs.filter(sd => sd.sector !== selection.id);
        n.linedefs = n.linedefs.map(l => ({
          ...l,
          front: sdToDelete.has(l.front) ? -1 : l.front,
          back: sdToDelete.has(l.back) ? -1 : l.back,
        }));
      }
      return n;
    });
    setSelection(null);
  };

  // Keyboard shortcuts (desktop)
  useEffect(() => {
    const onKey = (e) => {
      const tgt = document.activeElement;
      const inField = tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA');
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (inField) return;
      if (e.key === 'Escape') { cancelDraw(); setThingPicker(null); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selection) {
          e.preventDefault();
          deleteSelection();
        }
      }
      if (e.key === '1') setMode('select');
      if (e.key === '2') setMode('draw');
      if (e.key === '3') setMode('sector');
      if (e.key === '4') setMode('thing');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, cancelDraw, undo, redo]);

  // ============================================================================
  // RENDER
  // ============================================================================
  const selObj = useMemo(() => {
    if (!selection) return null;
    if (selection.type === 'vertex') return map.vertices.find(v => v.id === selection.id);
    if (selection.type === 'linedef') return map.linedefs.find(l => l.id === selection.id);
    if (selection.type === 'thing') return map.things.find(t => t.id === selection.id);
    if (selection.type === 'sector') return map.sectors.find(s => s.id === selection.id);
    return null;
  }, [selection, map]);

  const fontStack = "'Bricolage Grotesque', system-ui, sans-serif";
  const monoStack = "'JetBrains Mono', ui-monospace, monospace";

  return (
    <div
      ref={containerRef}
      className="w-full h-screen flex flex-col overflow-hidden select-none"
      style={{
        background: COLORS.bg,
        color: COLORS.text,
        fontFamily: fontStack,
        touchAction: 'none',
      }}
    >
      {/* Top bar */}
      <div
        className="flex items-center justify-between px-3 py-2 border-b"
        style={{ borderColor: COLORS.border, background: COLORS.bgPanel, flexShrink: 0 }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div
            className="text-xs font-bold tracking-widest"
            style={{ color: COLORS.amber, letterSpacing: '0.18em' }}
          >
            JERKWAD
          </div>
          <div style={{ color: COLORS.border }}>│</div>
          <button
            onClick={() => setMapMenuOpen(o => !o)}
            className="px-2 py-1 rounded text-sm flex items-center gap-1 truncate"
            style={{
              fontFamily: monoStack,
              background: 'transparent',
              border: '1px solid ' + COLORS.border,
              color: COLORS.text,
              minWidth: 0
            }}
          >
            <span className="truncate" style={{ maxWidth: '8rem' }}>{doc.currentMap}</span>
            <span style={{ color: COLORS.textDim }}>▾</span>
          </button>
          {mapMenuOpen && (
            <div
              className="absolute z-50 mt-1 rounded shadow-lg overflow-hidden"
              style={{
                top: 44, left: 80,
                background: COLORS.bgPanel,
                border: '1px solid ' + COLORS.border,
                fontFamily: monoStack,
                minWidth: 160
              }}
            >
              {Object.keys(doc.maps).map(name => (
                <button
                  key={name}
                  onClick={() => switchMap(name)}
                  className="block w-full text-left px-3 py-2 text-sm"
                  style={{
                    background: name === doc.currentMap ? COLORS.grid : 'transparent',
                    color: name === doc.currentMap ? COLORS.accent : COLORS.text,
                    borderBottom: '1px solid ' + COLORS.border,
                  }}
                >
                  {name}
                </button>
              ))}
              <button
                onClick={addNewMapSlot}
                className="block w-full text-left px-3 py-2 text-sm"
                style={{ color: COLORS.amber }}
              >
                + new map
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1">
          <input
            ref={fileInputRef}
            type="file"
            accept=".wad,.WAD"
            className="hidden"
            onChange={onLoadFile}
          />
          <IconBtn label="OPEN" onClick={() => fileInputRef.current?.click()} />
          <IconBtn label="SAVE" onClick={onSaveWad} />
          <IconBtn label="PLAY" onClick={onPlayInGzdoom} primary />
        </div>
      </div>

      {/* Stat strip */}
      <div
        className="px-3 py-1 flex items-center gap-3 text-xs border-b"
        style={{
          borderColor: COLORS.border,
          background: COLORS.bg,
          fontFamily: monoStack,
          color: COLORS.textDim,
          flexShrink: 0,
        }}
      >
        <span>V {map.vertices.length}</span>
        <span>L {map.linedefs.length}</span>
        <span>SD {map.sidedefs.length}</span>
        <span>SEC {map.sectors.length}</span>
        <span>T {map.things.length}</span>
        <span style={{ marginLeft: 'auto' }}>z {(view.zoom * 100).toFixed(0)}%</span>
      </div>

      {/* Canvas area */}
      <div className="flex-1 relative overflow-hidden">
        <canvas
          ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={onWheel}
          style={{ cursor: mode === 'draw' ? 'crosshair' : 'default' }}
        />

        {/* Floating control: snap + grid + undo/redo + cancel-draw */}
        <div className="absolute top-3 right-3 flex flex-col gap-2 items-end">
          <div className="flex gap-2">
            <FloatingBtn onClick={undo} disabled={!canUndo}>
              <span style={{ fontFamily: monoStack, fontSize: 13 }}>↶</span>
            </FloatingBtn>
            <FloatingBtn onClick={redo} disabled={!canRedo}>
              <span style={{ fontFamily: monoStack, fontSize: 13 }}>↷</span>
            </FloatingBtn>
          </div>
          <FloatingBtn active={showGrid} onClick={() => setShowGrid(g => !g)}>
            <span style={{ fontFamily: monoStack, fontSize: 11 }}>GRID</span>
          </FloatingBtn>
          <FloatingBtn onClick={() => {
            const opts = [0, 8, 16, 32, 64];
            const idx = opts.indexOf(snap);
            setSnap(opts[(idx + 1) % opts.length]);
          }}>
            <span style={{ fontFamily: monoStack, fontSize: 11 }}>
              SNAP {snap || 'OFF'}
            </span>
          </FloatingBtn>
          {drawChain.length > 0 && (
            <FloatingBtn onClick={cancelDraw} danger>
              <span style={{ fontFamily: monoStack, fontSize: 11 }}>END DRAW</span>
            </FloatingBtn>
          )}
        </div>

        {/* Mode hint when drawing or sectoring */}
        {mode === 'draw' && (
          <div
            className="absolute top-3 left-3 px-3 py-1.5 rounded text-xs"
            style={{
              background: COLORS.bgPanel + 'ee',
              border: '1px solid ' + COLORS.border,
              fontFamily: monoStack,
              color: COLORS.accent
            }}
          >
            {drawChain.length === 0
              ? 'Tap to start'
              : drawChain.length < 3
                ? 'Tap to add line'
                : 'Tap start vertex to close → sector'}
          </div>
        )}
        {mode === 'sector' && !sectorHint && (
          <div
            className="absolute top-3 left-3 px-3 py-1.5 rounded text-xs"
            style={{
              background: COLORS.bgPanel + 'ee',
              border: '1px solid ' + COLORS.border,
              fontFamily: monoStack,
              color: COLORS.accent
            }}
          >
            Tap inside an enclosed area
          </div>
        )}
        {sectorHint && (
          <div
            className="absolute top-3 left-3 px-3 py-1.5 rounded text-xs"
            style={{
              background: COLORS.amber,
              color: COLORS.bg,
              fontFamily: monoStack,
            }}
          >
            {sectorHint}
          </div>
        )}
      </div>

      {/* Bottom mode bar */}
      <div
        className="flex border-t"
        style={{
          borderColor: COLORS.border,
          background: COLORS.bgPanel,
          flexShrink: 0,
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
      >
        {MODES.map(m => (
          <button
            key={m.id}
            onClick={() => { setMode(m.id); cancelDraw(); }}
            className="flex-1 py-3 flex flex-col items-center gap-0.5 transition-colors"
            style={{
              background: mode === m.id ? COLORS.bg : 'transparent',
              color: mode === m.id ? COLORS.amber : COLORS.textDim,
              borderTop: mode === m.id ? '2px solid ' + COLORS.amber : '2px solid transparent',
            }}
          >
            <span style={{ fontSize: 22, lineHeight: 1 }}>{m.glyph}</span>
            <span style={{ fontSize: 10, fontFamily: monoStack, letterSpacing: '0.1em' }}>
              {m.label.toUpperCase()}
            </span>
          </button>
        ))}
      </div>

      {/* Properties slide-up panel */}
      {selObj && (
        <PropertiesPanel
          selection={selection}
          obj={selObj}
          map={map}
          onChange={(patch) => updateMap(m => {
            const key = selection.type === 'vertex' ? 'vertices'
              : selection.type === 'linedef' ? 'linedefs'
              : selection.type === 'thing' ? 'things'
              : 'sectors';
            return {
              ...m,
              [key]: m[key].map(x => x.id === selection.id ? { ...x, ...patch } : x)
            };
          })}
          onChangeSidedef={(sidedefId, patch) => updateMap(m => ({
            ...m,
            sidedefs: m.sidedefs.map(sd =>
              sd.id === sidedefId ? { ...sd, ...patch } : sd
            )
          }))}
          onClose={() => setSelection(null)}
          onDelete={deleteSelection}
        />
      )}

      {/* Thing picker modal */}
      {thingPicker && (
        <ThingPicker
          onPick={placeThing}
          onCancel={() => setThingPicker(null)}
        />
      )}

      {/* Manual share/play modal (Web Share API unavailable) */}
      {shareModal && (
        <ShareInstructions
          fileName={shareModal.fileName}
          onClose={() => setShareModal(null)}
        />
      )}

      {/* Welcome overlay */}
      {welcomeOpen && (
        <div
          className="absolute inset-0 z-40 flex items-center justify-center px-6"
          style={{ background: COLORS.bg + 'f0', backdropFilter: 'blur(6px)' }}
        >
          <div
            className="max-w-sm w-full rounded-lg p-6"
            style={{ background: COLORS.bgPanel, border: '1px solid ' + COLORS.border }}
          >
            <div
              className="text-xs tracking-widest mb-1"
              style={{ color: COLORS.amber, letterSpacing: '0.2em' }}
            >
              JERKWAD V0.3
            </div>
            <div
              className="text-2xl font-bold mb-3"
              style={{ color: COLORS.text }}
            >
              Touch-first DOOM map editor
            </div>
            <div
              className="text-sm mb-5"
              style={{ color: COLORS.textDim, fontFamily: monoStack, lineHeight: 1.5 }}
            >
              Maps build best in GZDoom — node tables are rebuilt on load.
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={() => { fileInputRef.current?.click(); }}
                className="py-3 rounded font-semibold"
                style={{
                  background: 'transparent',
                  color: COLORS.accent,
                  border: '1px solid ' + COLORS.accent,
                  fontFamily: monoStack,
                  letterSpacing: '0.05em'
                }}
              >
                OPEN .WAD
              </button>
              <button
                onClick={onNewMap}
                className="py-3 rounded font-semibold"
                style={{
                  background: COLORS.amber,
                  color: COLORS.bg,
                  border: 'none',
                  fontFamily: monoStack,
                  letterSpacing: '0.05em'
                }}
              >
                NEW MAP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
function IconBtn({ label, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded text-xs font-semibold"
      style={{
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.08em',
        background: primary ? COLORS.amber : 'transparent',
        color: primary ? COLORS.bg : COLORS.text,
        border: '1px solid ' + (primary ? COLORS.amber : COLORS.border),
      }}
    >
      {label}
    </button>
  );
}

function FloatingBtn({ children, onClick, active, danger, disabled }) {
  return (
    <button
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      className="px-2.5 py-1.5 rounded shadow-lg"
      style={{
        background: disabled ? COLORS.bgPanel
          : danger ? COLORS.danger
          : active ? COLORS.amber
          : COLORS.bgPanel,
        color: disabled ? COLORS.border
          : danger ? '#fff'
          : active ? COLORS.bg
          : COLORS.text,
        border: '1px solid ' + (disabled ? COLORS.border
          : danger ? COLORS.danger
          : active ? COLORS.amber
          : COLORS.border),
        opacity: disabled ? 0.5 : 1,
        cursor: disabled ? 'default' : 'pointer',
      }}
    >
      {children}
    </button>
  );
}

function FieldNum({ label, value, onChange, mono = true }) {
  return (
    <label className="flex items-center justify-between gap-2 py-1.5">
      <span
        className="text-xs uppercase"
        style={{
          color: COLORS.textDim,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.08em'
        }}
      >
        {label}
      </span>
      <input
        type="number"
        value={value ?? 0}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className="px-2 py-1 rounded text-right"
        style={{
          width: 96,
          background: COLORS.bg,
          color: COLORS.text,
          border: '1px solid ' + COLORS.border,
          fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
          fontSize: 13,
        }}
      />
    </label>
  );
}

function FieldText({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-2 py-1.5">
      <span
        className="text-xs uppercase"
        style={{
          color: COLORS.textDim,
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.08em'
        }}
      >
        {label}
      </span>
      <input
        type="text"
        value={value ?? ''}
        onChange={e => onChange(e.target.value.toUpperCase())}
        className="px-2 py-1 rounded text-right"
        style={{
          width: 140,
          background: COLORS.bg,
          color: COLORS.text,
          border: '1px solid ' + COLORS.border,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 13,
          textTransform: 'uppercase',
        }}
        maxLength={8}
      />
    </label>
  );
}

function PropertiesPanel({ selection, obj, map, onChange, onChangeSidedef, onClose, onDelete }) {
  const monoStack = "'JetBrains Mono', monospace";
  const titles = {
    vertex: 'Vertex',
    linedef: 'Linedef',
    sector: 'Sector',
    thing: 'Thing'
  };

  return (
    <div
      className="absolute left-0 right-0 bottom-0 z-30 rounded-t-lg shadow-2xl"
      style={{
        background: COLORS.bgPanel,
        border: '1px solid ' + COLORS.border,
        borderBottom: 'none',
        maxHeight: '60%',
        overflowY: 'auto',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
        marginBottom: 70, // above mode bar
      }}
    >
      <div
        className="sticky top-0 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: COLORS.bgPanel, borderColor: COLORS.border }}
      >
        <div>
          <div
            className="text-xs uppercase"
            style={{ color: COLORS.textDim, letterSpacing: '0.15em', fontFamily: monoStack }}
          >
            {titles[selection.type]}
          </div>
          <div style={{ color: COLORS.amber, fontFamily: monoStack, fontSize: 14 }}>
            {obj.id}
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onDelete}
            className="px-3 py-1.5 rounded text-xs"
            style={{
              background: 'transparent',
              color: COLORS.danger,
              border: '1px solid ' + COLORS.danger,
              fontFamily: monoStack,
              letterSpacing: '0.05em'
            }}
          >
            DELETE
          </button>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded text-xs"
            style={{
              background: 'transparent',
              color: COLORS.text,
              border: '1px solid ' + COLORS.border,
              fontFamily: monoStack,
            }}
          >
            CLOSE
          </button>
        </div>
      </div>

      <div className="px-4 pt-2">
        {selection.type === 'vertex' && (
          <>
            <FieldNum label="X" value={obj.x} onChange={v => onChange({ x: v })} />
            <FieldNum label="Y" value={obj.y} onChange={v => onChange({ y: v })} />
          </>
        )}

        {selection.type === 'linedef' && (
          <LinedefFields obj={obj} map={map} onChange={onChange} onChangeSidedef={onChangeSidedef} />
        )}

        {selection.type === 'sector' && (
          <SectorFields obj={obj} onChange={onChange} />
        )}

        {selection.type === 'thing' && (
          <ThingFields obj={obj} onChange={onChange} />
        )}
      </div>
    </div>
  );
}

function LinedefFields({ obj, map, onChange, onChangeSidedef }) {
  const monoStack = "'JetBrains Mono', monospace";
  const flagDefs = [
    { bit: 1, label: 'Impassable' },
    { bit: 2, label: 'Block Monsters' },
    { bit: 4, label: 'Two-Sided' },
    { bit: 8, label: 'Upper Unpegged' },
    { bit: 16, label: 'Lower Unpegged' },
    { bit: 32, label: 'Secret' },
    { bit: 64, label: 'Block Sound' },
    { bit: 128, label: 'Hidden on Map' },
    { bit: 256, label: 'Shown on Map' },
  ];
  const front = map.sidedefs.find(s => s.id === obj.front);
  const back = map.sidedefs.find(s => s.id === obj.back);

  return (
    <>
      <FieldNum label="Special" value={obj.special} onChange={v => onChange({ special: v })} />
      <FieldNum label="Tag" value={obj.tag} onChange={v => onChange({ tag: v })} />

      <div className="mt-3 mb-1" style={{
        color: COLORS.textDim, fontFamily: monoStack, fontSize: 11,
        letterSpacing: '0.1em', textTransform: 'uppercase'
      }}>
        Flags
      </div>
      <div className="grid grid-cols-2 gap-1">
        {flagDefs.map(f => (
          <label key={f.bit} className="flex items-center gap-2 text-xs py-1">
            <input
              type="checkbox"
              checked={(obj.flags & f.bit) !== 0}
              onChange={e => onChange({
                flags: e.target.checked ? (obj.flags | f.bit) : (obj.flags & ~f.bit)
              })}
              style={{ accentColor: COLORS.amber }}
            />
            <span style={{ fontFamily: monoStack, color: COLORS.text }}>{f.label}</span>
          </label>
        ))}
      </div>

      {front && (
        <div className="mt-4">
          <div style={{
            color: COLORS.accent, fontFamily: monoStack, fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase'
          }}>
            ◐ Front Side
          </div>
          <SidedefFields
            sd={front}
            onChange={(patch) => onChangeSidedef(front.id, patch)}
          />
        </div>
      )}

      {back && (
        <div className="mt-3">
          <div style={{
            color: COLORS.accent, fontFamily: monoStack, fontSize: 11,
            letterSpacing: '0.1em', textTransform: 'uppercase'
          }}>
            ◑ Back Side
          </div>
          <SidedefFields
            sd={back}
            onChange={(patch) => onChangeSidedef(back.id, patch)}
          />
        </div>
      )}
    </>
  );
}

function SidedefFields({ sd, onChange }) {
  const monoStack = "'JetBrains Mono', monospace";
  return (
    <div style={{ paddingLeft: 4 }}>
      <FieldText label="Upper" value={sd.upper} onChange={v => onChange({ upper: v })} />
      <FieldText label="Middle" value={sd.middle} onChange={v => onChange({ middle: v })} />
      <FieldText label="Lower" value={sd.lower} onChange={v => onChange({ lower: v })} />
      <div className="grid grid-cols-2 gap-2">
        <FieldNum label="X Off" value={sd.xOff} onChange={v => onChange({ xOff: v })} />
        <FieldNum label="Y Off" value={sd.yOff} onChange={v => onChange({ yOff: v })} />
      </div>
      <div style={{ fontFamily: monoStack, fontSize: 10, color: COLORS.textDim, marginTop: 2 }}>
        sector → {sd.sector}
      </div>
    </div>
  );
}

function SectorFields({ obj, onChange }) {
  return (
    <>
      <FieldNum label="Floor H" value={obj.floorH} onChange={v => onChange({ floorH: v })} />
      <FieldNum label="Ceil H" value={obj.ceilH} onChange={v => onChange({ ceilH: v })} />
      <FieldText label="Floor Tex" value={obj.floorTex} onChange={v => onChange({ floorTex: v })} />
      <FieldText label="Ceil Tex" value={obj.ceilTex} onChange={v => onChange({ ceilTex: v })} />
      <FieldNum label="Light" value={obj.light} onChange={v => onChange({ light: Math.max(0, Math.min(255, v)) })} />
      <FieldNum label="Special" value={obj.special} onChange={v => onChange({ special: v })} />
      <FieldNum label="Tag" value={obj.tag} onChange={v => onChange({ tag: v })} />
    </>
  );
}

function ThingFields({ obj, onChange }) {
  const monoStack = "'JetBrains Mono', monospace";
  const meta = DOOM_THING_TYPES.find(t => t.id === obj.type);
  return (
    <>
      <div className="py-2" style={{ fontFamily: monoStack, fontSize: 13, color: COLORS.amber }}>
        {meta ? meta.name : 'Type ' + obj.type}
      </div>
      <FieldNum label="X" value={obj.x} onChange={v => onChange({ x: v })} />
      <FieldNum label="Y" value={obj.y} onChange={v => onChange({ y: v })} />
      <FieldNum label="Angle" value={obj.angle} onChange={v => onChange({ angle: v })} />
      <FieldNum label="Type" value={obj.type} onChange={v => onChange({ type: v })} />
      <div className="mt-2 mb-1" style={{
        color: COLORS.textDim, fontFamily: monoStack, fontSize: 11,
        letterSpacing: '0.1em', textTransform: 'uppercase'
      }}>
        Skill / Multiplayer
      </div>
      {[
        { bit: 1, label: 'Easy' },
        { bit: 2, label: 'Medium' },
        { bit: 4, label: 'Hard' },
        { bit: 8, label: 'Ambush' },
        { bit: 16, label: 'Multiplayer Only' },
      ].map(f => (
        <label key={f.bit} className="flex items-center gap-2 text-xs py-1">
          <input
            type="checkbox"
            checked={(obj.flags & f.bit) !== 0}
            onChange={e => onChange({
              flags: e.target.checked ? (obj.flags | f.bit) : (obj.flags & ~f.bit)
            })}
            style={{ accentColor: COLORS.amber }}
          />
          <span style={{ fontFamily: monoStack, color: COLORS.text }}>{f.label}</span>
        </label>
      ))}
    </>
  );
}

function ShareInstructions({ fileName, onClose }) {
  const monoStack = "'JetBrains Mono', monospace";
  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: '#000c', backdropFilter: 'blur(6px)' }}
      onClick={onClose}
    >
      <div
        className="max-w-sm w-full rounded-lg p-5"
        style={{ background: COLORS.bgPanel, border: '1px solid ' + COLORS.border }}
        onClick={e => e.stopPropagation()}
      >
        <div
          className="text-xs tracking-widest mb-1"
          style={{ color: COLORS.amber, letterSpacing: '0.2em', fontFamily: monoStack }}
        >
          ↓ DOWNLOADED
        </div>
        <div
          className="text-lg font-semibold mb-3"
          style={{ color: COLORS.text }}
        >
          Now load it in GZDoom
        </div>
        <div
          className="text-sm mb-4"
          style={{ color: COLORS.textDim, lineHeight: 1.55, fontFamily: monoStack }}
        >
          <span style={{ color: COLORS.text }}>{fileName}</span> saved to your Downloads.
        </div>
        <ol
          className="text-sm pl-1 mb-5 space-y-2"
          style={{ color: COLORS.text, fontFamily: monoStack, lineHeight: 1.5 }}
        >
          <li><span style={{ color: COLORS.amber }}>1.</span> Open the <b>Files</b> app</li>
          <li><span style={{ color: COLORS.amber }}>2.</span> Move the WAD to <b>On My iPhone → GenZD</b></li>
          <li><span style={{ color: COLORS.amber }}>3.</span> Open <b>GenZD</b>, tap the WAD, pick an IWAD</li>
        </ol>
        <button
          onClick={onClose}
          className="w-full py-2.5 rounded font-semibold"
          style={{
            background: COLORS.amber,
            color: COLORS.bg,
            border: 'none',
            fontFamily: monoStack,
            letterSpacing: '0.05em'
          }}
        >
          GOT IT
        </button>
      </div>
    </div>
  );
}

function ThingPicker({ onPick, onCancel }) {
  const monoStack = "'JetBrains Mono', monospace";
  const [filter, setFilter] = useState('all');
  const cats = ['all', 'player', 'monster', 'weapon', 'ammo', 'health', 'key', 'decor'];
  const items = filter === 'all' ? DOOM_THING_TYPES : DOOM_THING_TYPES.filter(t => t.cat === filter);

  return (
    <div
      className="absolute inset-0 z-50 flex items-end"
      style={{ background: '#000a' }}
      onClick={onCancel}
    >
      <div
        className="w-full rounded-t-lg flex flex-col"
        style={{
          background: COLORS.bgPanel,
          border: '1px solid ' + COLORS.border,
          maxHeight: '70%',
          paddingBottom: 'env(safe-area-inset-bottom)'
        }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-4 py-3 border-b" style={{ borderColor: COLORS.border }}>
          <div style={{ color: COLORS.amber, fontFamily: monoStack, fontSize: 13 }}>
            PLACE THING
          </div>
        </div>
        <div className="flex gap-1 p-2 overflow-x-auto" style={{ flexShrink: 0 }}>
          {cats.map(c => (
            <button
              key={c}
              onClick={() => setFilter(c)}
              className="px-3 py-1 rounded text-xs whitespace-nowrap"
              style={{
                background: filter === c ? COLORS.amber : 'transparent',
                color: filter === c ? COLORS.bg : COLORS.text,
                border: '1px solid ' + (filter === c ? COLORS.amber : COLORS.border),
                fontFamily: monoStack,
                letterSpacing: '0.05em',
                textTransform: 'uppercase'
              }}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {items.map(t => (
            <button
              key={t.id}
              onClick={() => onPick(t.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded"
              style={{
                background: 'transparent',
                color: COLORS.text,
                borderBottom: '1px solid ' + COLORS.border,
                fontFamily: monoStack,
                fontSize: 13,
                textAlign: 'left'
              }}
            >
              <span
                style={{
                  display: 'inline-block', width: 10, height: 10, borderRadius: 5,
                  background: THING_COLORS[t.cat]
                }}
              />
              <span style={{ flex: 1 }}>{t.name}</span>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>#{t.id}</span>
            </button>
          ))}
        </div>
        <button
          onClick={onCancel}
          className="m-3 py-2 rounded"
          style={{
            background: 'transparent',
            color: COLORS.text,
            border: '1px solid ' + COLORS.border,
            fontFamily: monoStack,
            letterSpacing: '0.05em'
          }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}
