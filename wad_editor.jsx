import React, { useState, useRef, useEffect, useCallback, useMemo, useReducer } from 'react';

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
  { id: 'thing', label: 'Thing', glyph: '◉' },
];
const COLORS = {
  bg: '#0a0e1a', bgPanel: '#0f1626', bgPanel2: '#152033',
  grid: '#1a2842', gridMajor: '#243759',
  vertex: '#ff9d3d', vertexSelected: '#ffd84a', vertexDraw: '#7fffd4',
  thing: '#ff5c5c',
  text: '#c5d4e8', textDim: '#6b7d99',
  accent: '#7fffd4', amber: '#ff9d3d', border: '#243759', danger: '#ff5c5c',
  cyan: '#7fffd4',
};
const fontStack = "'Bricolage Grotesque', system-ui, sans-serif";
const monoStack = "'JetBrains Mono', ui-monospace, monospace";

// Curated Doom flat color palette — flat name → fill RGB.
const FLAT_COLORS = {
  'FLOOR0_1': [86, 70, 50], 'FLOOR0_2': [86, 70, 50], 'FLOOR0_3': [110, 90, 64],
  'FLOOR0_5': [120, 100, 72], 'FLOOR0_6': [110, 90, 64], 'FLOOR0_7': [88, 70, 52],
  'FLOOR1_1': [102, 76, 58], 'FLOOR1_6': [120, 92, 70], 'FLOOR1_7': [110, 90, 70],
  'FLOOR3_3': [96, 78, 56], 'FLOOR4_1': [70, 56, 42], 'FLOOR4_5': [80, 64, 48],
  'FLOOR4_6': [86, 70, 52], 'FLOOR4_8': [110, 86, 64], 'FLOOR5_1': [76, 60, 44],
  'FLOOR5_2': [86, 70, 52], 'FLOOR5_3': [96, 78, 56], 'FLOOR5_4': [105, 84, 62],
  'FLOOR6_1': [124, 100, 72], 'FLOOR6_2': [96, 76, 56], 'FLOOR7_1': [70, 56, 42],
  'FLOOR7_2': [110, 90, 70], 'CEIL1_1': [76, 60, 44], 'CEIL1_2': [60, 50, 38],
  'CEIL1_3': [86, 70, 52], 'CEIL3_1': [80, 64, 48], 'CEIL3_2': [70, 56, 42],
  'CEIL3_3': [60, 48, 36], 'CEIL3_4': [86, 70, 52], 'CEIL3_5': [76, 60, 44],
  'CEIL3_6': [60, 48, 36], 'CEIL4_1': [70, 56, 42], 'CEIL4_2': [86, 70, 52],
  'CEIL4_3': [60, 48, 36], 'CEIL5_1': [86, 70, 52], 'CEIL5_2': [76, 60, 44],
  'TLITE6_1': [200, 180, 130], 'TLITE6_4': [200, 180, 130], 'TLITE6_5': [200, 180, 130],
  'TLITE6_6': [200, 180, 130], 'FLAT1': [86, 70, 50], 'FLAT2': [76, 60, 44],
  'FLAT3': [86, 70, 50], 'FLAT4': [76, 60, 44], 'FLAT5': [70, 56, 42],
  'FLAT5_1': [76, 60, 44], 'FLAT5_2': [86, 70, 52], 'FLAT5_3': [96, 78, 56],
  'FLAT5_4': [105, 84, 62], 'FLAT5_5': [120, 100, 72], 'FLAT5_6': [70, 56, 42],
  'FLAT5_7': [86, 70, 52], 'FLAT5_8': [120, 92, 70], 'FLAT8': [76, 60, 44],
  'FLAT9': [80, 64, 48], 'FLAT10': [86, 70, 50], 'FLAT14': [70, 56, 42],
  'FLAT17': [86, 70, 50], 'FLAT18': [60, 48, 36], 'FLAT19': [86, 70, 50],
  'FLAT20': [76, 60, 44], 'FLAT22': [86, 70, 50], 'FLAT23': [86, 70, 50],
  'MFLR8_1': [62, 92, 50], 'MFLR8_2': [62, 92, 50],
  'MFLR8_3': [62, 92, 50], 'MFLR8_4': [70, 100, 60],
  'GRASS1': [62, 96, 52], 'GRASS2': [62, 96, 52],
  'NUKAGE1': [80, 200, 80], 'NUKAGE2': [80, 200, 80], 'NUKAGE3': [80, 200, 80],
  'BLOOD1': [180, 30, 30], 'BLOOD2': [180, 30, 30], 'BLOOD3': [180, 30, 30],
  'SLIME01': [120, 150, 70], 'SLIME02': [120, 150, 70],
  'SLIME03': [120, 150, 70], 'SLIME04': [120, 150, 70],
  'LAVA1': [220, 80, 40], 'LAVA2': [220, 80, 40],
  'LAVA3': [220, 80, 40], 'LAVA4': [220, 80, 40],
  'FWATER1': [60, 90, 160], 'FWATER2': [60, 90, 160],
  'FWATER3': [60, 90, 160], 'FWATER4': [60, 90, 160],
  'STEP1': [110, 90, 70], 'STEP2': [110, 90, 70],
  'RROCK01': [110, 70, 50], 'RROCK02': [110, 70, 50], 'RROCK03': [110, 70, 50],
  'RROCK04': [140, 80, 60], 'RROCK05': [120, 70, 50], 'RROCK06': [120, 70, 50],
  'CRATOP1': [140, 110, 70], 'CRATOP2': [140, 110, 70],
  'GRNROCK': [80, 110, 70],
  'DEM1_1': [76, 76, 76], 'DEM1_2': [76, 76, 76], 'DEM1_3': [76, 76, 76],
  'DEM1_4': [76, 76, 76], 'DEM1_5': [76, 76, 76], 'DEM1_6': [76, 76, 76],
};
const SKY_COLOR = [40, 56, 92];

function flatColor(name, light) {
  const lt = Math.max(0.25, Math.min(1, (light ?? 160) / 255));
  let rgb = FLAT_COLORS[name];
  if (!rgb && /^F_SKY/.test(name || '')) rgb = SKY_COLOR;
  if (!rgb) rgb = [86, 70, 50];
  return [Math.round(rgb[0] * lt), Math.round(rgb[1] * lt), Math.round(rgb[2] * lt)];
}

// Procedurally build a 64x64 canvas approximating a Doom flat texture.
// Caller is responsible for caching the result; this function regenerates
// from scratch each call (small, ~64x64 pixels of canvas work).
function buildFlatCanvas(name) {
  if (typeof document === 'undefined') return null;
  const cnv = document.createElement('canvas');
  cnv.width = 64; cnv.height = 64;
  const ctx = cnv.getContext('2d');
  const baseRgb = FLAT_COLORS[name] || (/^F_SKY/.test(name || '') ? SKY_COLOR : [86, 70, 50]);
  ctx.fillStyle = `rgb(${baseRgb[0]},${baseRgb[1]},${baseRgb[2]})`;
  ctx.fillRect(0, 0, 64, 64);

  if (/^F_SKY/.test(name || '')) {
    const grad = ctx.createLinearGradient(0, 0, 0, 64);
    grad.addColorStop(0, '#1a2a4a'); grad.addColorStop(1, '#4a6088');
    ctx.fillStyle = grad; ctx.fillRect(0, 0, 64, 64);
    // Cloud blobs
    ctx.fillStyle = 'rgba(180,200,220,0.4)';
    [[12, 20, 8], [40, 16, 6], [22, 40, 10], [50, 48, 7]].forEach(([x, y, r]) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    });
    return cnv;
  }

  const dim = (f) => [baseRgb[0] * f | 0, baseRgb[1] * f | 0, baseRgb[2] * f | 0];
  const bright = (f) => [
    Math.min(255, baseRgb[0] * f | 0),
    Math.min(255, baseRgb[1] * f | 0),
    Math.min(255, baseRgb[2] * f | 0),
  ];
  // Deterministic PRNG seeded by name so each flat has stable texture.
  let rnd = 1;
  for (let i = 0; i < (name || '').length; i++) rnd = (rnd * 31 + (name.charCodeAt(i) | 0)) >>> 0;
  rnd = (rnd || 1) & 0x7fffffff;
  const rand = () => { rnd = (rnd * 1103515245 + 12345) & 0x7fffffff; return (rnd >> 8) / 0xffffff; };

  if (/^(MFLR8|GRASS)/.test(name)) {
    const d = dim(0.65), b = bright(1.2);
    for (let i = 0; i < 120; i++) {
      const x = rand() * 64 | 0, y = rand() * 64 | 0;
      const c = rand() > 0.5 ? b : d;
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(x, y, 1 + (rand() * 2 | 0), 1);
    }
  } else if (/^NUKAGE/.test(name)) {
    const b = bright(1.3), d = dim(0.7);
    for (let i = 0; i < 18; i++) {
      const x = rand() * 64, y = rand() * 64, r = 2 + rand() * 4;
      ctx.fillStyle = `rgba(${b[0]},${b[1]},${b[2]},0.5)`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
    for (let i = 0; i < 6; i++) {
      ctx.fillStyle = `rgba(${d[0]},${d[1]},${d[2]},0.5)`;
      ctx.beginPath(); ctx.arc(rand() * 64, rand() * 64, 2 + rand() * 3, 0, Math.PI * 2); ctx.fill();
    }
  } else if (/^(BLOOD|LAVA)/.test(name)) {
    const b = bright(1.3), d = dim(0.6);
    for (let i = 0; i < 14; i++) {
      const x = rand() * 64, y = rand() * 64, r = 2 + rand() * 6;
      ctx.fillStyle = rand() > 0.5
        ? `rgba(${b[0]},${b[1]},${b[2]},0.55)`
        : `rgba(${d[0]},${d[1]},${d[2]},0.55)`;
      ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    }
  } else if (/^(FWATER|SLIME)/.test(name)) {
    const b = bright(1.2);
    ctx.strokeStyle = `rgba(${b[0]},${b[1]},${b[2]},0.55)`;
    ctx.lineWidth = 1;
    for (let y = 4; y < 64; y += 10) {
      ctx.beginPath(); ctx.moveTo(0, y);
      for (let x = 0; x <= 64; x += 4) ctx.lineTo(x, y + Math.sin((x + rnd * 0.001) * 0.3) * 2);
      ctx.stroke();
    }
  } else if (/^STEP/.test(name)) {
    const d = dim(0.65), b = bright(1.2);
    ctx.fillStyle = `rgb(${d[0]},${d[1]},${d[2]})`;
    for (let y = 0; y < 64; y += 16) ctx.fillRect(0, y, 64, 3);
    ctx.fillStyle = `rgb(${b[0]},${b[1]},${b[2]})`;
    for (let y = 13; y < 64; y += 16) ctx.fillRect(0, y, 64, 1);
  } else if (/^TLITE/.test(name)) {
    const b = bright(1.4), d = dim(0.4);
    ctx.fillStyle = `rgb(${d[0]},${d[1]},${d[2]})`;
    ctx.fillRect(0, 0, 4, 64); ctx.fillRect(60, 0, 4, 64);
    ctx.fillRect(0, 0, 64, 4); ctx.fillRect(0, 60, 64, 4);
    ctx.fillStyle = `rgba(${b[0]},${b[1]},${b[2]},0.4)`;
    ctx.fillRect(4, 4, 56, 56);
  } else if (/^CEIL/.test(name) || /^DEM1/.test(name)) {
    const d = dim(0.6);
    ctx.fillStyle = `rgb(${d[0]},${d[1]},${d[2]})`;
    for (let y = 4; y < 64; y += 8) for (let x = 4; x < 64; x += 8) ctx.fillRect(x, y, 2, 2);
  } else if (/^(RROCK|GRNROCK)/.test(name)) {
    for (let i = 0; i < 22; i++) {
      const f = 0.6 + rand() * 0.7;
      const c = bright(f);
      ctx.fillStyle = `rgb(${c[0]},${c[1]},${c[2]})`;
      ctx.fillRect(rand() * 64 | 0, rand() * 64 | 0, 3 + (rand() * 6 | 0), 3 + (rand() * 6 | 0));
    }
  } else if (/^CRATOP/.test(name)) {
    const d = dim(0.6), b = bright(1.2);
    ctx.fillStyle = `rgb(${b[0]},${b[1]},${b[2]})`;
    ctx.fillRect(2, 2, 60, 60);
    ctx.strokeStyle = `rgb(${d[0]},${d[1]},${d[2]})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(2, 2, 60, 60);
    ctx.beginPath();
    ctx.moveTo(2, 2); ctx.lineTo(62, 62);
    ctx.moveTo(62, 2); ctx.lineTo(2, 62);
    ctx.stroke();
  } else {
    // Generic floor: staggered brick.
    const d = dim(0.55);
    ctx.strokeStyle = `rgb(${d[0]},${d[1]},${d[2]})`;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 16; y < 64; y += 16) { ctx.moveTo(0, y + 0.5); ctx.lineTo(64, y + 0.5); }
    for (let row = 0; row < 4; row++) {
      const off = (row % 2) * 16;
      for (let x = off; x <= 64; x += 32) {
        ctx.moveTo(x + 0.5, row * 16);
        ctx.lineTo(x + 0.5, (row + 1) * 16);
      }
    }
    ctx.stroke();
    // Light highlight
    const b = bright(1.1);
    ctx.fillStyle = `rgba(${b[0]},${b[1]},${b[2]},0.15)`;
    for (let i = 0; i < 12; i++) ctx.fillRect(rand() * 64 | 0, rand() * 64 | 0, 1, 1);
  }
  return cnv;
}

// ============================================================================
// WAD I/O
// ============================================================================
const decoder = new TextDecoder('ascii');
function readStr(view, off, len) {
  const bytes = new Uint8Array(view.buffer, view.byteOffset + off, len);
  let end = 0; while (end < len && bytes[end] !== 0) end++;
  return decoder.decode(bytes.slice(0, end)).toUpperCase();
}
function writeStr(view, off, str, len) {
  const s = (str || '').toUpperCase();
  for (let i = 0; i < len; i++) view.setUint8(off + i, i < s.length ? s.charCodeAt(i) & 0x7f : 0);
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
    lumps.push({ offset: view.getInt32(o, true), size: view.getInt32(o + 4, true), name: readStr(view, o + 8, 8) });
  }
  const maps = {};
  for (let i = 0; i < lumps.length; i++) {
    if (isMapMarker(lumps[i].name)) {
      try { const m = parseMap(view, lumps, i); if (m) maps[lumps[i].name] = m; }
      catch (e) { console.warn('Failed to parse map ' + lumps[i].name, e); }
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
        for (let k = 0; k < lump.size; k += 4)
          map.vertices.push({ id: 'v' + map.vertices.length, x: view.getInt16(off + k, true), y: view.getInt16(off + k + 2, true) });
        break;
      case 'LINEDEFS':
        for (let k = 0; k < lump.size; k += 14) map.linedefs.push({
          id: 'l' + map.linedefs.length,
          v1: view.getInt16(off + k, true), v2: view.getInt16(off + k + 2, true),
          flags: view.getUint16(off + k + 4, true),
          special: view.getInt16(off + k + 6, true),
          tag: view.getInt16(off + k + 8, true),
          front: view.getInt16(off + k + 10, true),
          back: view.getInt16(off + k + 12, true)
        });
        break;
      case 'SIDEDEFS':
        for (let k = 0; k < lump.size; k += 30) map.sidedefs.push({
          id: 'sd' + map.sidedefs.length,
          xOff: view.getInt16(off + k, true), yOff: view.getInt16(off + k + 2, true),
          upper: readStr(view, off + k + 4, 8),
          lower: readStr(view, off + k + 12, 8),
          middle: readStr(view, off + k + 20, 8),
          sector: view.getInt16(off + k + 28, true)
        });
        break;
      case 'SECTORS':
        for (let k = 0; k < lump.size; k += 26) map.sectors.push({
          id: 's' + map.sectors.length,
          floorH: view.getInt16(off + k, true), ceilH: view.getInt16(off + k + 2, true),
          floorTex: readStr(view, off + k + 4, 8), ceilTex: readStr(view, off + k + 12, 8),
          light: view.getInt16(off + k + 20, true),
          special: view.getInt16(off + k + 22, true),
          tag: view.getInt16(off + k + 24, true)
        });
        break;
      case 'THINGS':
        for (let k = 0; k < lump.size; k += 10) map.things.push({
          id: 't' + map.things.length,
          x: view.getInt16(off + k, true), y: view.getInt16(off + k + 2, true),
          angle: view.getInt16(off + k + 4, true), type: view.getInt16(off + k + 6, true),
          flags: view.getUint16(off + k + 8, true)
        });
        break;
    }
  }
  return map;
}
// ---------------------------------------------------------------------------
// Vanilla BSP node builder. Strict vanilla engines (Chocolate Doom — the
// browser player) do NOT rebuild missing SEGS / SSECTORS / NODES / BLOCKMAP
// the way GZDoom does; with empty node lumps they render nothing, forever.
// This produces all of them, plus a zero-filled (valid) REJECT.
//
// Conventions (must match vanilla R_PointOnSide):
//   side 0 = front/right of the partition  ⇔  (x-px)*pdy - (y-py)*pdx > 0
//   NODES children[0] = front subtree; subsector refs have bit 0x8000.
// Split vertices are appended to the vertex array (int-rounded, deduped).
// ---------------------------------------------------------------------------
function buildBsp(m, vIdx, sdIdx) {
  const pts = m.vertices.map(v => ({ x: v.x, y: v.y }));
  const vertKey = new Map(pts.map((p, i) => [p.x + ',' + p.y, i]));
  const lines = m.linedefs.map((ld) => ({
    v1: resolveIdx(ld.v1, vIdx), v2: resolveIdx(ld.v2, vIdx),
    front: resolveIdxOrNeg(ld.front, sdIdx), back: resolveIdxOrNeg(ld.back, sdIdx),
  }));
  const EPS = 0.4;
  let initialSegs = [];
  lines.forEach((ld, li) => {
    if (ld.v1 === ld.v2 || ld.v1 < 0 || ld.v2 < 0) return;
    if (ld.front !== -1) initialSegs.push({ v1: ld.v1, v2: ld.v2, line: li, dir: 0, offset: 0 });
    if (ld.back !== -1) initialSegs.push({ v1: ld.v2, v2: ld.v1, line: li, dir: 1, offset: 0 });
  });
  const segsOut = [];       // final segs, grouped by subsector
  const ssectors = [];      // { count, first }
  const nodes = [];         // { x,y,dx,dy, bb0, bb1, c0, c1 }

  const partOf = (s) => ({
    x: pts[s.v1].x, y: pts[s.v1].y,
    dx: pts[s.v2].x - pts[s.v1].x, dy: pts[s.v2].y - pts[s.v1].y,
  });
  const distTo = (part, x, y) => {
    const cross = (x - part.x) * part.dy - (y - part.y) * part.dx;
    return cross / Math.hypot(part.dx, part.dy);
  };
  const addVert = (x, y) => {
    const k = x + ',' + y;
    if (vertKey.has(k)) return vertKey.get(k);
    const i = pts.length;
    pts.push({ x, y });
    vertKey.set(k, i);
    return i;
  };
  // Classify a seg against a partition: 0 front, 1 back, 2 split, 3 colinear.
  function classify(s, part) {
    const d1 = distTo(part, pts[s.v1].x, pts[s.v1].y);
    const d2 = distTo(part, pts[s.v2].x, pts[s.v2].y);
    const on1 = Math.abs(d1) <= EPS, on2 = Math.abs(d2) <= EPS;
    if (on1 && on2) return 3;
    if (d1 >= -EPS && d2 >= -EPS) return 0;
    if (d1 <= EPS && d2 <= EPS) return 1;
    return 2;
  }
  function splitSeg(s, part) {
    const x1 = pts[s.v1].x, y1 = pts[s.v1].y, x2 = pts[s.v2].x, y2 = pts[s.v2].y;
    const d1 = distTo(part, x1, y1), d2 = distTo(part, x2, y2);
    const t = d1 / (d1 - d2);
    const ix = Math.round(x1 + t * (x2 - x1)), iy = Math.round(y1 + t * (y2 - y1));
    const vi = addVert(ix, iy);
    if (vi === s.v1 || vi === s.v2) {
      // Rounded onto an endpoint — not a real split; classify by the far end.
      return null;
    }
    const segA = { v1: s.v1, v2: vi, line: s.line, dir: s.dir, offset: s.offset };
    const segB = { v1: vi, v2: s.v2, line: s.line, dir: s.dir,
      offset: s.offset + Math.hypot(ix - x1, iy - y1) };
    return d1 > 0 ? { front: segA, back: segB } : { front: segB, back: segA };
  }
  function scoreSplitter(segs, cand) {
    const part = partOf(cand);
    if (!part.dx && !part.dy) return null;
    let nf = 0, nb = 0, ns = 0;
    for (const s of segs) {
      const c = classify(s, part);
      if (c === 0) nf++;
      else if (c === 1) nb++;
      else if (c === 2) ns++;
      else {
        const dot = (pts[s.v2].x - pts[s.v1].x) * part.dx + (pts[s.v2].y - pts[s.v1].y) * part.dy;
        if (dot >= 0) nf++; else nb++;
      }
    }
    if (nf + ns === 0 || nb + ns === 0) return null;  // doesn't divide
    return Math.abs(nf - nb) + 8 * ns;
  }
  function pickSplitter(segs) {
    // Sampled scan first (speed), then an EXHAUSTIVE scan before giving up —
    // declaring a leaf while a divider still exists produces subsectors that
    // span multiple sectors, which corrupts vanilla rendering.
    let best = null, bestCost = Infinity;
    const step = Math.max(1, Math.floor(segs.length / 60));
    for (let ci = 0; ci < segs.length; ci += step) {
      const cost = scoreSplitter(segs, segs[ci]);
      if (cost !== null && cost < bestCost) { bestCost = cost; best = segs[ci]; }
    }
    if (best) return best;
    if (step > 1) {
      for (let ci = 0; ci < segs.length; ci++) {
        const cost = scoreSplitter(segs, segs[ci]);
        if (cost !== null && cost < bestCost) { bestCost = cost; best = segs[ci]; }
      }
    }
    return best;
  }
  const segAngleBAM = (s) => {
    const a = Math.atan2(pts[s.v2].y - pts[s.v1].y, pts[s.v2].x - pts[s.v1].x);
    return Math.round(a * 32768 / Math.PI) & 0xffff;
  };
  const bboxOf = (segs) => {
    let t = -Infinity, b = Infinity, l = Infinity, r = -Infinity;
    for (const s of segs) {
      for (const vi of [s.v1, s.v2]) {
        const p = pts[vi];
        if (p.y > t) t = p.y; if (p.y < b) b = p.y;
        if (p.x < l) l = p.x; if (p.x > r) r = p.x;
      }
    }
    return [t, b, l, r].map(v => Math.max(-32768, Math.min(32767, Math.round(v))));
  };
  function emitSubsector(segs) {
    const first = segsOut.length;
    for (const s of segs) segsOut.push(s);
    ssectors.push({ count: segs.length, first });
    return 0x8000 | (ssectors.length - 1);
  }
  function recurse(segs, depth) {
    if (segs.length === 0) return { ref: emitSubsector(segs), bbox: [0, 0, 0, 0] };
    const bbox = bboxOf(segs);
    if (depth > 200) return { ref: emitSubsector(segs), bbox };
    const splitter = pickSplitter(segs);
    if (!splitter) return { ref: emitSubsector(segs), bbox };
    const part = partOf(splitter);
    const front = [], back = [];
    for (const s of segs) {
      const c = classify(s, part);
      if (c === 0) front.push(s);
      else if (c === 1) back.push(s);
      else if (c === 3) {
        const dot = (pts[s.v2].x - pts[s.v1].x) * part.dx + (pts[s.v2].y - pts[s.v1].y) * part.dy;
        (dot >= 0 ? front : back).push(s);
      } else {
        const sp = splitSeg(s, part);
        if (!sp) {
          // Degenerate split — put the whole seg on the side of its midpoint.
          const mx = (pts[s.v1].x + pts[s.v2].x) / 2, my = (pts[s.v1].y + pts[s.v2].y) / 2;
          (distTo(part, mx, my) >= 0 ? front : back).push(s);
        } else { front.push(sp.front); back.push(sp.back); }
      }
    }
    if (front.length === 0 || back.length === 0) {
      // Picker promised a divide but rounding disagreed — emit as leaf.
      return { ref: emitSubsector(segs), bbox };
    }
    const f = recurse(front, depth + 1);
    const b = recurse(back, depth + 1);
    nodes.push({
      x: Math.round(part.x), y: Math.round(part.y),
      dx: Math.round(part.dx), dy: Math.round(part.dy),
      bb0: f.bbox, bb1: b.bbox, c0: f.ref, c1: b.ref,
    });
    return { ref: nodes.length - 1, bbox };
  }
  recurse(initialSegs, 0);

  // ---- serialize ----
  const segsBuf = new ArrayBuffer(segsOut.length * 12);
  const sgv = new DataView(segsBuf);
  segsOut.forEach((s, i) => {
    const ld = lines[s.line];
    const sideStart = s.dir === 0 ? ld.v1 : ld.v2;
    sgv.setInt16(i * 12, s.v1, true);
    sgv.setInt16(i * 12 + 2, s.v2, true);
    sgv.setUint16(i * 12 + 4, segAngleBAM(s), true);
    sgv.setInt16(i * 12 + 6, s.line, true);
    sgv.setInt16(i * 12 + 8, s.dir, true);
    const baseOff = s.offset || Math.hypot(pts[s.v1].x - pts[sideStart].x, pts[s.v1].y - pts[sideStart].y);
    sgv.setInt16(i * 12 + 10, Math.round(baseOff), true);
  });
  const ssBuf = new ArrayBuffer(ssectors.length * 4);
  const ssv = new DataView(ssBuf);
  ssectors.forEach((ss, i) => {
    ssv.setUint16(i * 4, ss.count, true);
    ssv.setUint16(i * 4 + 2, ss.first, true);
  });
  const ndBuf = new ArrayBuffer(nodes.length * 28);
  const ndv = new DataView(ndBuf);
  nodes.forEach((n, i) => {
    const o = i * 28;
    ndv.setInt16(o, n.x, true); ndv.setInt16(o + 2, n.y, true);
    ndv.setInt16(o + 4, n.dx, true); ndv.setInt16(o + 6, n.dy, true);
    for (let k = 0; k < 4; k++) ndv.setInt16(o + 8 + k * 2, n.bb0[k], true);
    for (let k = 0; k < 4; k++) ndv.setInt16(o + 16 + k * 2, n.bb1[k], true);
    ndv.setUint16(o + 24, n.c0, true);
    ndv.setUint16(o + 26, n.c1, true);
  });

  // ---- BLOCKMAP (128-unit grid; conservative per-block line lists) ----
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  if (!isFinite(minX)) { minX = minY = 0; maxX = maxY = 128; }
  minX = Math.floor(minX) - 8; minY = Math.floor(minY) - 8;
  const cols = ((Math.ceil(maxX) - minX) >> 7) + 1;
  const rows = ((Math.ceil(maxY) - minY) >> 7) + 1;
  const blockLists = Array.from({ length: cols * rows }, () => []);
  const segRect = (x1, y1, x2, y2, rx, ry) => {
    const rw = 128, rh = 128;
    if (Math.max(x1, x2) < rx || Math.min(x1, x2) > rx + rw ||
        Math.max(y1, y2) < ry || Math.min(y1, y2) > ry + rh) return false;
    const f = (x, y) => (x2 - x1) * (y - y1) - (y2 - y1) * (x - x1);
    const s1 = f(rx, ry), s2 = f(rx + rw, ry), s3 = f(rx, ry + rh), s4 = f(rx + rw, ry + rh);
    if (s1 > 0 && s2 > 0 && s3 > 0 && s4 > 0) return false;
    if (s1 < 0 && s2 < 0 && s3 < 0 && s4 < 0) return false;
    return true;
  };
  lines.forEach((ld, li) => {
    if (ld.v1 < 0 || ld.v2 < 0) return;
    const x1 = pts[ld.v1].x, y1 = pts[ld.v1].y, x2 = pts[ld.v2].x, y2 = pts[ld.v2].y;
    const c0 = Math.max(0, ((Math.min(x1, x2) - minX) | 0) >> 7);
    const c1 = Math.min(cols - 1, ((Math.max(x1, x2) - minX) | 0) >> 7);
    const r0 = Math.max(0, ((Math.min(y1, y2) - minY) | 0) >> 7);
    const r1 = Math.min(rows - 1, ((Math.max(y1, y2) - minY) | 0) >> 7);
    for (let r = r0; r <= r1; r++) {
      for (let c = c0; c <= c1; c++) {
        if (segRect(x1, y1, x2, y2, minX + c * 128, minY + r * 128)) {
          blockLists[r * cols + c].push(li);
        }
      }
    }
  });
  let bmWords = 4 + cols * rows;   // header + offsets
  for (const bl of blockLists) bmWords += bl.length + 2;  // 0x0000 ... 0xFFFF
  const bmBuf = new ArrayBuffer(bmWords * 2);
  const bmv = new DataView(bmBuf);
  bmv.setInt16(0, minX, true); bmv.setInt16(2, minY, true);
  bmv.setInt16(4, cols, true); bmv.setInt16(6, rows, true);
  let w = 4 + cols * rows;
  blockLists.forEach((bl, i) => {
    bmv.setUint16((4 + i) * 2, w, true);
    bmv.setUint16(w * 2, 0, true); w++;
    for (const li of bl) { bmv.setUint16(w * 2, li, true); w++; }
    bmv.setUint16(w * 2, 0xffff, true); w++;
  });

  const rejectBytes = Math.ceil((m.sectors.length * m.sectors.length) / 8);
  return {
    allVerts: pts,
    segs: new Uint8Array(segsBuf),
    ssectors: new Uint8Array(ssBuf),
    nodes: new Uint8Array(ndBuf),
    blockmap: new Uint8Array(bmBuf),
    reject: new Uint8Array(rejectBytes),
  };
}

function buildWad(maps) {
  const lumpsToWrite = [];
  for (const [mapName, m] of Object.entries(maps)) {
    const vIdx = new Map(m.vertices.map((v, i) => [v.id, i]));
    const sdIdx = new Map(m.sidedefs.map((s, i) => [s.id, i]));
    const secIdx = new Map(m.sectors.map((s, i) => [s.id, i]));
    const bsp = buildBsp(m, vIdx, sdIdx);
    lumpsToWrite.push({ name: mapName, data: new Uint8Array(0) });

    const thingsBuf = new ArrayBuffer(m.things.length * 10);
    const tv = new DataView(thingsBuf);
    m.things.forEach((t, i) => {
      tv.setInt16(i * 10, t.x | 0, true); tv.setInt16(i * 10 + 2, t.y | 0, true);
      tv.setInt16(i * 10 + 4, t.angle | 0, true); tv.setInt16(i * 10 + 6, t.type | 0, true);
      tv.setUint16(i * 10 + 8, (t.flags ?? 7) & 0xffff, true);
    });
    lumpsToWrite.push({ name: 'THINGS', data: new Uint8Array(thingsBuf) });

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

    const sdsBuf = new ArrayBuffer(m.sidedefs.length * 30);
    const sdv = new DataView(sdsBuf);
    m.sidedefs.forEach((sd, i) => {
      sdv.setInt16(i * 30, sd.xOff | 0, true); sdv.setInt16(i * 30 + 2, sd.yOff | 0, true);
      writeStr(sdv, i * 30 + 4, sd.upper || '-', 8);
      writeStr(sdv, i * 30 + 12, sd.lower || '-', 8);
      writeStr(sdv, i * 30 + 20, sd.middle || '-', 8);
      sdv.setInt16(i * 30 + 28, resolveIdx(sd.sector, secIdx), true);
    });
    lumpsToWrite.push({ name: 'SIDEDEFS', data: new Uint8Array(sdsBuf) });

    // VERTEXES includes the split vertices the node builder appended.
    const vBuf = new ArrayBuffer(bsp.allVerts.length * 4);
    const vv = new DataView(vBuf);
    bsp.allVerts.forEach((v, i) => { vv.setInt16(i * 4, v.x | 0, true); vv.setInt16(i * 4 + 2, v.y | 0, true); });
    lumpsToWrite.push({ name: 'VERTEXES', data: new Uint8Array(vBuf) });

    lumpsToWrite.push({ name: 'SEGS', data: bsp.segs });
    lumpsToWrite.push({ name: 'SSECTORS', data: bsp.ssectors });
    lumpsToWrite.push({ name: 'NODES', data: bsp.nodes });

    const secBuf = new ArrayBuffer(m.sectors.length * 26);
    const sv = new DataView(secBuf);
    m.sectors.forEach((s, i) => {
      sv.setInt16(i * 26, s.floorH | 0, true); sv.setInt16(i * 26 + 2, s.ceilH | 0, true);
      writeStr(sv, i * 26 + 4, s.floorTex || 'FLAT1', 8);
      writeStr(sv, i * 26 + 12, s.ceilTex || 'FLAT1', 8);
      sv.setInt16(i * 26 + 20, s.light | 0, true);
      sv.setInt16(i * 26 + 22, s.special | 0, true);
      sv.setInt16(i * 26 + 24, s.tag | 0, true);
    });
    lumpsToWrite.push({ name: 'SECTORS', data: new Uint8Array(secBuf) });
    lumpsToWrite.push({ name: 'REJECT', data: bsp.reject });
    lumpsToWrite.push({ name: 'BLOCKMAP', data: bsp.blockmap });
  }
  let dataSize = 0;
  lumpsToWrite.forEach(l => dataSize += l.data.length);
  const dirOffset = 12 + dataSize;
  const totalSize = dirOffset + lumpsToWrite.length * 16;
  const out = new ArrayBuffer(totalSize);
  const ov = new DataView(out);
  const ou8 = new Uint8Array(out);
  writeStr(ov, 0, 'PWAD', 4);
  ov.setInt32(4, lumpsToWrite.length, true);
  ov.setInt32(8, dirOffset, true);
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
function resolveIdx(id, map) { if (typeof id === 'number') return id; const i = map.get(id); return i === undefined ? -1 : i; }
function resolveIdxOrNeg(id, map) { if (id === -1 || id == null) return -1; return resolveIdx(id, map); }

// ============================================================================
// MAP HELPERS
// ============================================================================
function emptyMap() { return { vertices: [], linedefs: [], sidedefs: [], sectors: [], things: [] }; }
function newId(prefix, list) {
  let n = list.length;
  while (list.some(x => x.id === prefix + n)) n++;
  return prefix + n;
}
function normalizeMap(m) {
  const verts = m.vertices.map((v, i) => ({ ...v, id: 'v' + i }));
  const sectors = m.sectors.map((s, i) => ({ ...s, id: 's' + i }));
  const sidedefs = m.sidedefs.map((sd, i) => ({
    ...sd, id: 'sd' + i,
    sector: typeof sd.sector === 'number' ? (sectors[sd.sector]?.id ?? null) : sd.sector
  }));
  const linedefs = m.linedefs.map((ld, i) => ({
    ...ld, id: 'l' + i,
    v1: typeof ld.v1 === 'number' ? (verts[ld.v1]?.id ?? null) : ld.v1,
    v2: typeof ld.v2 === 'number' ? (verts[ld.v2]?.id ?? null) : ld.v2,
    front: typeof ld.front === 'number' ? (ld.front === -1 ? -1 : (sidedefs[ld.front]?.id ?? -1)) : ld.front,
    back: typeof ld.back === 'number' ? (ld.back === -1 ? -1 : (sidedefs[ld.back]?.id ?? -1)) : ld.back,
  }));
  const things = m.things.map((t, i) => ({ ...t, id: 't' + i }));
  return { vertices: verts, linedefs, sidedefs, sectors, things };
}

// WADED-style vertex merge: if two vertices share exact coords, fold the
// second into the first. Rewrites linedef v1/v2 references; collapsed lines
// (v1 === v2) and their sidedefs are dropped.
function mergeCoincidentVertices(map, movedId) {
  const moved = map.vertices.find(v => v.id === movedId);
  if (!moved) return map;
  const target = map.vertices.find(v => v.id !== movedId && v.x === moved.x && v.y === moved.y);
  if (!target) return map;
  const nextVertices = map.vertices.filter(v => v.id !== movedId);
  const remapped = map.linedefs.map(l => ({
    ...l,
    v1: l.v1 === movedId ? target.id : l.v1,
    v2: l.v2 === movedId ? target.id : l.v2,
  }));
  const collapsed = new Set(remapped.filter(l => l.v1 === l.v2).map(l => l.id));
  const sdToDelete = new Set();
  for (const l of remapped) {
    if (!collapsed.has(l.id)) continue;
    if (l.front && l.front !== -1) sdToDelete.add(l.front);
    if (l.back && l.back !== -1) sdToDelete.add(l.back);
  }
  return {
    ...map,
    vertices: nextVertices,
    linedefs: remapped.filter(l => !collapsed.has(l.id)),
    sidedefs: map.sidedefs.filter(sd => !sdToDelete.has(sd.id)),
  };
}

const DEFAULT_OUTDOOR_SECTOR = {
  floorH: 0, ceilH: 256, floorTex: 'MFLR8_1', ceilTex: 'F_SKY1',
  light: 224, special: 0, tag: 0
};
const DEFAULT_INDOOR_SECTOR = {
  floorH: 0, ceilH: 128, floorTex: 'FLOOR0_1', ceilTex: 'CEIL3_5',
  light: 160, special: 0, tag: 0
};
const DEFAULT_SIDEDEF = { xOff: 0, yOff: 0, upper: '-', lower: '-', middle: 'STARTAN2' };

// Canonical Doom convention: lines stored CW around the sector so that
// FRONT side (right of v1->v2) is the interior side. Vertices laid out
// NW, NE, SE, SW (CW in Y-up world).
function outdoorStarter() {
  const H = 1024; const m = emptyMap();
  m.vertices = [
    { id: 'v0', x: -H, y:  H }, // NW
    { id: 'v1', x:  H, y:  H }, // NE
    { id: 'v2', x:  H, y: -H }, // SE
    { id: 'v3', x: -H, y: -H }, // SW
  ];
  m.sectors = [{ id: 's0', ...DEFAULT_OUTDOOR_SECTOR }];
  m.sidedefs = [0, 1, 2, 3].map(i => ({ id: 'sd' + i, ...DEFAULT_SIDEDEF, middle: 'BIGDOOR2', sector: 's0' }));
  m.linedefs = [{ v1: 'v0', v2: 'v1' }, { v1: 'v1', v2: 'v2' }, { v1: 'v2', v2: 'v3' }, { v1: 'v3', v2: 'v0' }]
    .map((l, i) => ({ id: 'l' + i, ...l, flags: 1, special: 0, tag: 0, front: 'sd' + i, back: -1 }));
  m.things = [{ id: 't0', x: 0, y: 0, angle: 90, type: 1, flags: 7 }];
  return m;
}
function interiorStarter() {
  const H = 256; const m = emptyMap();
  m.vertices = [
    { id: 'v0', x: -H, y:  H }, // NW
    { id: 'v1', x:  H, y:  H }, // NE
    { id: 'v2', x:  H, y: -H }, // SE
    { id: 'v3', x: -H, y: -H }, // SW
  ];
  m.sectors = [{ id: 's0', ...DEFAULT_INDOOR_SECTOR }];
  m.sidedefs = [0, 1, 2, 3].map(i => ({ id: 'sd' + i, ...DEFAULT_SIDEDEF, middle: 'STARTAN2', sector: 's0' }));
  m.linedefs = [{ v1: 'v0', v2: 'v1' }, { v1: 'v1', v2: 'v2' }, { v1: 'v2', v2: 'v3' }, { v1: 'v3', v2: 'v0' }]
    .map((l, i) => ({ id: 'l' + i, ...l, flags: 1, special: 0, tag: 0, front: 'sd' + i, back: -1 }));
  m.things = [{ id: 't0', x: 0, y: 0, angle: 90, type: 1, flags: 7 }];
  return m;
}

// Curated Doom texture list. Used by the texture picker; not exhaustive but
// covers the textures real mappers reach for. Each entry is just the name
// string — preview color comes from FLAT_COLORS for floors/ceilings and
// from the wall-name heuristic for wall textures.
const DOOM_TEXTURES = {
  walls: [
    'STARTAN1', 'STARTAN2', 'STARTAN3',
    'BROWN1', 'BROWN144', 'BROWN96', 'BROWNGRN', 'BROWNHUG',
    'METAL', 'METAL2', 'METAL3', 'METAL4', 'METAL5', 'METAL7',
    'STONE', 'STONE2', 'STONE3', 'STONE4', 'STONE5', 'STONE6',
    'WOOD1', 'WOOD3', 'WOOD5', 'WOOD9', 'WOODGARG',
    'BIGDOOR1', 'BIGDOOR2', 'BIGDOOR3', 'BIGDOOR4', 'BIGDOOR5', 'BIGDOOR7',
    'DOOR1', 'DOOR3', 'DOORBLU', 'DOORRED', 'DOORYEL', 'DOORTRAK',
    'EXITDOOR', 'EXITSIGN', 'EXITSTON',
    'GRAY1', 'GRAY2', 'GRAY4', 'GRAY5', 'GRAY7', 'GRAYBIG', 'GRAYTALL',
    'COMPSTA1', 'COMPSTA2', 'COMPWERD', 'COMPBLUE', 'COMPSPAN',
    'MIDGRATE', 'MIDBARS1', 'MIDBARS3', 'MIDBRN1', 'MIDSPACE',
    'LITE3', 'LITE5', 'LITEBLU4', 'LITEMET', 'LITERED',
    'SUPPORT2', 'SUPPORT3', 'SHAWN1', 'SHAWN2', 'SHAWN3',
    'PIPE1', 'PIPE2', 'PIPE4', 'PIPE6',
    'CRATE1', 'CRATE2', 'CRATELIT', 'CRATWIDE',
    'SLADWALL', 'TANROCK2', 'TANROCK4', 'TANROCK5',
  ],
  switches: [
    'SW1COMM', 'SW1STON1', 'SW1WOOD', 'SW1BRN1', 'SW1EXIT',
    'SW2COMM', 'SW2STON1', 'SW2WOOD', 'SW2BRN1',
  ],
  floors: [
    'FLOOR0_1', 'FLOOR0_2', 'FLOOR0_3', 'FLOOR0_5', 'FLOOR0_6', 'FLOOR0_7',
    'FLOOR1_1', 'FLOOR1_6', 'FLOOR1_7',
    'FLOOR3_3', 'FLOOR4_1', 'FLOOR4_5', 'FLOOR4_6', 'FLOOR4_8',
    'FLOOR5_1', 'FLOOR5_2', 'FLOOR5_3', 'FLOOR5_4',
    'FLOOR6_1', 'FLOOR6_2', 'FLOOR7_1', 'FLOOR7_2',
    'FLAT1', 'FLAT2', 'FLAT3', 'FLAT4', 'FLAT5', 'FLAT5_4', 'FLAT8',
    'FLAT9', 'FLAT10', 'FLAT14', 'FLAT17', 'FLAT19', 'FLAT22', 'FLAT23',
    'MFLR8_1', 'MFLR8_2', 'MFLR8_3', 'MFLR8_4',
    'GRASS1', 'GRASS2',
    'NUKAGE1', 'BLOOD1', 'LAVA1', 'FWATER1',
    'SLIME01', 'SLIME05', 'SLIME09', 'SLIME13',
    'STEP1', 'STEP2',
    'RROCK01', 'RROCK05', 'RROCK11', 'RROCK16', 'RROCK19',
    'CRATOP1', 'CRATOP2',
    'GATE1', 'GATE2', 'GATE3', 'GATE4',
    'GRNROCK',
  ],
  ceilings: [
    'CEIL1_1', 'CEIL1_2', 'CEIL1_3',
    'CEIL3_1', 'CEIL3_2', 'CEIL3_3', 'CEIL3_4', 'CEIL3_5', 'CEIL3_6',
    'CEIL4_1', 'CEIL4_2', 'CEIL4_3',
    'CEIL5_1', 'CEIL5_2',
    'TLITE6_1', 'TLITE6_4', 'TLITE6_5', 'TLITE6_6',
    'F_SKY1',
    'FLAT5_1', 'FLAT5_2',
    'DEM1_1', 'DEM1_5',
    'FLAT2', 'FLAT18', 'FLAT20',
  ],
};

// Random map generator: scatter 4-8 child sectors inside an outdoor sandbox,
// vary their heights/textures/lights, sprinkle monsters and items. Not a
// dungeon graph — that's a separate feature — but a one-tap playable map.
function generateRandomWorld() {
  let m = outdoorStarter();
  let seed = ((Math.floor(Math.random() * 0x7fffffff) ^ (Date.now() & 0x7fffffff)) | 0) || 1;
  const rand = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return (seed >>> 8) / 0x800000;
  };
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];

  const FLOOR_TEX = ['FLOOR0_1', 'FLOOR5_1', 'FLAT5_3', 'CEIL3_5', 'FLOOR3_3', 'FLOOR4_8', 'FLAT5_4'];
  const CEIL_TEX = ['CEIL1_1', 'CEIL3_5', 'FLAT5', 'CEIL5_2', 'CEIL4_1', 'TLITE6_1'];
  const WALL_TEX = ['STARTAN2', 'BROWN1', 'METAL', 'STONE2', 'STONE3', 'WOOD1', 'GRAY5', 'BROVINE2'];
  const STEP_TEX = ['STEP1', 'STEP2'];

  const MONSTERS = [3001, 3002, 3004, 9, 3005];
  const ITEMS = [2007, 2008, 2011, 2014, 2015, 2018];

  const placed = [];
  const N_ROOMS = 4 + Math.floor(rand() * 5);
  const MARGIN = 96;
  const BOUND = 900;

  for (let i = 0; i < N_ROOMS; i++) {
    for (let attempt = 0; attempt < 25; attempt++) {
      const w = (3 + Math.floor(rand() * 8)) * 64;
      const h = (3 + Math.floor(rand() * 8)) * 64;
      const cx = Math.floor((rand() - 0.5) * 2 * (BOUND - w / 2) / 32) * 32;
      const cy = Math.floor((rand() - 0.5) * 2 * (BOUND - h / 2) / 32) * 32;
      if (Math.abs(cx) + w / 2 > BOUND || Math.abs(cy) + h / 2 > BOUND) continue;
      const overlaps = placed.some(p =>
        Math.abs(p.cx - cx) < (p.w + w) / 2 + MARGIN &&
        Math.abs(p.cy - cy) < (p.h + h) / 2 + MARGIN);
      if (overlaps) continue;

      const floorH = Math.floor(rand() * 4) * 8;
      const ceilH = 128 + Math.floor(rand() * 4) * 32;
      const light = 96 + Math.floor(rand() * 13) * 12;
      const result = stampShape(m, 32, rectVertices(cx, cy, w, h), {
        floorH, ceilH, light,
        floorTex: pick(FLOOR_TEX),
        ceilTex: pick(CEIL_TEX),
      });
      if (!result) continue;

      // Set wall middle texture on the new room's interior-facing sidedefs.
      const wallTex = pick(WALL_TEX);
      const lowerTex = pick(STEP_TEX);
      const newSdIds = new Set(result.sidedefs
        .filter(sd => !m.sidedefs.find(o => o.id === sd.id))
        .map(sd => sd.id));
      result.sidedefs = result.sidedefs.map(sd => {
        if (!newSdIds.has(sd.id)) return sd;
        // Two-sided pillar/room walls: middle stays '-', set lower for height step
        return { ...sd, lower: lowerTex, upper: wallTex };
      });
      m = result;
      placed.push({ cx, cy, w, h });
      break;
    }
  }

  // Sprinkle monsters and items.
  if (placed.length > 0) {
    const things = [...m.things];
    for (let i = 0; i < placed.length * 2; i++) {
      const room = placed[Math.floor(rand() * placed.length)];
      const tx = Math.round((room.cx + (rand() - 0.5) * room.w * 0.55) / 16) * 16;
      const ty = Math.round((room.cy + (rand() - 0.5) * room.h * 0.55) / 16) * 16;
      const isMonster = rand() < 0.55;
      const type = pick(isMonster ? MONSTERS : ITEMS);
      things.push({
        id: 't' + things.length,
        x: tx, y: ty, angle: Math.floor(rand() * 8) * 45,
        type, flags: 7,
      });
    }
    m = { ...m, things };
  }

  return m;
}

// Dungeon generator v2. Distilled from "Tricks of the Doom Gurus", Romero's
// level-design rules, doomwiki Mapping reference, and The Level Design Book
// Doom metrics. Builds a network of 4 square + 2 octagon rooms placed
// non-overlapping in a 3000-unit field, connected by axis-aligned corridors
// (spanning tree + ~60% extra chords for multi-route loops). Every room gets
// a 16-unit perimeter trim ring at +8 height (Romero's "border" rule), and
// half get a concentric inner feature: a raised platform or a skylit center.
// Heights constrained so adjacent rooms never exceed the 24-unit step limit.
// Door texture is DOOR3 (64-wide canonical) and door tracks use DOORTRAK
// with the lower-unpegged flag set so the side textures don't slide.
function generateDungeon() {
  // Up to 6 attempts to produce a dungeon with at least 3 reachable rooms
  // (≥ 1 corridor with doors). Otherwise the dungeon is unplayable and the
  // user sees stranded rooms.
  let last = null;
  for (let attempt = 0; attempt < 6; attempt++) {
    last = _generateDungeonOnce();
    const hasDoor = last.linedefs.some(l => l.special === 1);
    if (hasDoor && last.sectors.length >= 8) return last;
  }
  return last;
}

// ShapeShifter: drive the dungeon generator from user-placed rooms +
// user-drawn corridor pairs + (optional) user-placed things. Returns a
// full map in the same shape as generateDungeon().
function generateShapeShifterMap(roomSpecs, connectionSpecs, thingSpecs, genOpts) {
  const rooms = roomSpecs.map((s) => ({
    type: s.type,
    cx: s.cx | 0, cy: s.cy | 0,
    w: s.w, h: s.h, r: s.r,
    _userFeature: s.feature || null,
    _customSpec: s.customSpec || null,
  }));
  const idIndex = new Map(roomSpecs.map((s, i) => [s.id, i]));
  const corridors = [];
  const teleporters = [];
  if (connectionSpecs) {
    for (const c of connectionSpecs) {
      const a = idIndex.get(c.fromId), b = idIndex.get(c.toId);
      if (a == null || b == null || a === b) continue;
      if (c.kind === 'teleporter') teleporters.push({ a, b });
      else corridors.push({ a, b });
    }
  }
  const userThings = thingSpecs && thingSpecs.length ? thingSpecs : null;
  return _generateDungeonOnce({ rooms, corridors, teleporters, userThings,
    seed: genOpts && genOpts.seed });
}

// Room presets — the predefined "library" the user picks from in
// ShapeShifter. Each entry knows how to render a preview thumbnail and
// supplies the (type, default size, feature) for placement.
const SHAPESHIFTER_PRESETS = [
  { id: 'combat',      label: 'Combat Arena', type: 'square',  w: 512, h: 512, feature: 'none' },
  { id: 'cathedral',   label: 'Cathedral',    type: 'square',  w: 768, h: 768, feature: 'cathedral' },
  { id: 'garden',      label: 'Garden',       type: 'octagon', r: 512,         feature: 'garden' },
  { id: 'lake',        label: 'The Lake',     type: 'octagon', r: 576,         feature: 'lake' },
  { id: 'throne',      label: 'Throne Room',  type: 'square',  w: 576, h: 640, feature: 'throne' },
  { id: 'mausoleum',   label: 'Mausoleum',    type: 'square',  w: 448, h: 448, feature: 'mausoleum' },
  { id: 'foundry',     label: 'Foundry',      type: 'square',  w: 512, h: 512, feature: 'foundry' },
  { id: 'observatory', label: 'Observatory',  type: 'hexagon', r: 448,         feature: 'observatory' },
  { id: 'reactor',     label: 'Reactor',      type: 'octagon', r: 448,         feature: 'reactor' },
  { id: 'crypt',       label: 'Crypt',        type: 'square',  w: 384, h: 384, feature: 'crypt' },
  { id: 'liminal',     label: 'Liminal',      type: 'square',  w: 768, h: 384, feature: 'liminal' },
  { id: 'colonnade',   label: 'Colonnade',    type: 'square',  w: 768, h: 384, feature: 'colonnade' },
  { id: 'gallery',     label: 'Gallery',      type: 'square',  w: 768, h: 320, feature: 'gallery' },
  { id: 'sewer',       label: 'Sewer',        type: 'square',  w: 448, h: 576, feature: 'sewer' },
  { id: 'altar',       label: 'Altar',        type: 'octagon', r: 384,         feature: 'altar' },
  { id: 'pit',         label: 'Pit Room',     type: 'square',  w: 512, h: 512, feature: 'pit' },
  { id: 'pool',        label: 'Pool Room',    type: 'square',  w: 512, h: 512, feature: 'pool' },
  { id: 'crusher',     label: 'Crusher',      type: 'square',  w: 448, h: 448, feature: 'crusher' },
  { id: 'platform',    label: 'Platform',     type: 'square',  w: 512, h: 512, feature: 'platform' },
  { id: 'sky',         label: 'Sky Room',     type: 'octagon', r: 448,         feature: 'sky' },
  { id: 'courtyard',   label: 'Courtyard',    type: 'square',  w: 1024, h: 1024, feature: 'courtyard' },
  { id: 'plaza',       label: 'Plaza',        type: 'octagon', r: 640,          feature: 'plaza' },
  { id: 'ziggurat',    label: 'Ziggurat',     type: 'square',  w: 768, h: 768,   feature: 'ziggurat' },
  { id: 'lift',        label: 'Lift Vault',   type: 'square',  w: 640, h: 640,   feature: 'lift' },
  { id: 'depot',       label: 'Depot',        type: 'square',  w: 768, h: 768,   feature: 'depot' },
  { id: 'canal',       label: 'Canal',        type: 'square',  w: 896, h: 640,   feature: 'canal' },
  { id: 'bunker',      label: 'Bunker',       type: 'square',  w: 512, h: 512,   feature: 'bunker' },
  { id: 'cityblock',   label: 'City Block',   type: 'square',  w: 1408, h: 1408, feature: 'cityblock' },
  { id: 'terrain',     label: 'Terrain',      type: 'octagon', r: 768,          feature: 'terrain' },
  { id: 'catacombs',   label: 'Catacombs',    type: 'square',  w: 768, h: 768,   feature: 'catacombs' },
  { id: 'library',     label: 'Library',      type: 'square',  w: 896, h: 512,   feature: 'library' },
  { id: 'chasm',       label: 'Chasm',        type: 'square',  w: 1024, h: 1024, feature: 'chasm' },
];
function _generateDungeonOnce(opts) {
  // ShapeShifter passes opts.rooms with user-placed rooms (type/cx/cy/size/
  // feature preselected). When present, skip the random placement section
  // and respect each room's chosen feature/palette downstream.
  const userRooms = opts && opts.rooms;
  // Optional explicit seed: identical seed + specs reproduce the map
  // byte-for-byte on every client — the arena multiplayer JOIN flow
  // rebuilds the host's WAD locally from just {seed, sliders}.
  let seed = (opts && opts.seed)
    ? ((opts.seed | 0) & 0x7fffffff) || 1
    : (((Math.floor(Math.random() * 0x7fffffff) ^ (Date.now() & 0x7fffffff)) | 0) || 1);
  const rand = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return (seed >>> 8) / 0x800000; };
  const pick = (arr) => arr[Math.floor(rand() * arr.length)];
  const sn = v => Math.round(v / 32) * 32;

  const MAX_STEP = 24;     // Doom player can step up ≤24 without lift
  const CW = 64;           // canonical corridor width
  const TRIM_W = 16;       // perimeter trim ring width
  const DOOR_THICK = 16;   // depth of the door body sector at each corridor end
  const INNER_INSET = 96;  // inner-feature inset from trim's inner edge

  // -------- polygon helpers --------
  function squarePoly(cx, cy, w, h) {
    const hw = w / 2, hh = h / 2;
    return [
      { x: cx - hw, y: cy - hh }, { x: cx + hw, y: cy - hh },
      { x: cx + hw, y: cy + hh }, { x: cx - hw, y: cy + hh },
    ];
  }
  function octagonPoly(cx, cy, r) {
    const out = [];
    for (let i = 0; i < 8; i++) {
      const a = (22.5 + 45 * i) * Math.PI / 180;
      out.push({ x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r) });
    }
    return out;
  }
  // Hexagon with vertices at 0°, 60°, 120°, 180°, 240°, 300°. The sides
  // between vertices at 60°↔120° and 240°↔300° are HORIZONTAL — flat north
  // and south. East and west are pointy vertices, so hexagons can only
  // host corridors on their N/S side.
  function hexagonPoly(cx, cy, r) {
    const out = [];
    for (let i = 0; i < 6; i++) {
      const a = (i * 60) * Math.PI / 180;
      out.push({ x: Math.round(cx + Math.cos(a) * r), y: Math.round(cy + Math.sin(a) * r) });
    }
    return out;
  }
  function roomPoly(room, shrink = 0) {
    if (room.type === 'octagon') return octagonPoly(room.cx, room.cy, room.r - shrink);
    if (room.type === 'hexagon') return hexagonPoly(room.cx, room.cy, room.r - shrink);
    return squarePoly(room.cx, room.cy, room.w - 2 * shrink, room.h - 2 * shrink);
  }
  function roomBBox(room, shrink = 0) {
    if (room.type === 'octagon') {
      const er = (room.r - shrink) * 0.924;
      return { minX: room.cx - er, maxX: room.cx + er, minY: room.cy - er, maxY: room.cy + er };
    }
    if (room.type === 'hexagon') {
      const er = room.r - shrink;
      const ey = er * 0.866;
      return { minX: room.cx - er, maxX: room.cx + er, minY: room.cy - ey, maxY: room.cy + ey };
    }
    return {
      minX: room.cx - room.w / 2 + shrink, maxX: room.cx + room.w / 2 - shrink,
      minY: room.cy - room.h / 2 + shrink, maxY: room.cy + room.h / 2 - shrink,
    };
  }
  function bboxOverlap(a, b, margin = 0) {
    return !(a.maxX + margin < b.minX || b.maxX + margin < a.minX ||
             a.maxY + margin < b.minY || b.maxY + margin < a.minY);
  }
  function cardinalSpan(room, side) {
    if (room.type === 'octagon') return room.r * 0.383;
    if (room.type === 'hexagon') {
      return (side === 'N' || side === 'S') ? room.r * 0.5 : 0;
    }
    return (side === 'E' || side === 'W') ? room.h / 2 : room.w / 2;
  }

  // -------- 1. place rooms --------
  const rooms = [];
  const PLACE_R = 1500;
  const MARGIN = 96;
  if (userRooms && userRooms.length) {
    // ShapeShifter: rooms are already placed by the user. Just clone them in.
    for (const r of userRooms) rooms.push({ ...r });
  } else {
  // Two-stage placement so the size distribution isn't biased by collisions:
  // sizeMaker is called ONCE per room (committing the size), then up to
  // `attempts` random positions are tried for that size. Without this, every
  // failed attempt re-rolls the size and smaller rooms dominate because they
  // succeed more often.
  function tryPlace(sizeMaker, attempts = 300) {
    const base = sizeMaker();
    for (let i = 0; i < attempts; i++) {
      const cx = sn((rand() - 0.5) * 2 * PLACE_R);
      const cy = sn((rand() - 0.5) * 2 * PLACE_R);
      const r = { ...base, cx, cy };
      const bb = roomBBox(r);
      if (bb.minX < -PLACE_R || bb.maxX > PLACE_R || bb.minY < -PLACE_R || bb.maxY > PLACE_R) continue;
      if (rooms.some(o => bboxOverlap(roomBBox(o), bb, MARGIN))) continue;
      rooms.push(r);
      return true;
    }
    return false;
  }
  // Long-tailed size distribution: most rooms are small/medium, with a few
  // big "great hall" rooms. The variety is what makes the dungeon feel
  // hand-mapped instead of grid-generated.
  function pickSquareSize() {
    const r = rand();
    if (r < 0.45) return (4 + Math.floor(rand() * 4)) * 64;  // small  256–448
    if (r < 0.80) return (8 + Math.floor(rand() * 5)) * 64;  // medium 512–768
    if (r < 0.95) return (13 + Math.floor(rand() * 4)) * 64; // large  832–1024
    return (17 + Math.floor(rand() * 6)) * 64;               // huge   1088–1408
  }
  function pickOctRadius() {
    const r = rand();
    if (r < 0.55) return (4 + Math.floor(rand() * 3)) * 64;  // small  256–384
    if (r < 0.90) return (7 + Math.floor(rand() * 3)) * 64;  // medium 448–576
    return (10 + Math.floor(rand() * 3)) * 64;               // large  640–768
  }
  // Place large rooms first so they get priority on the placement field;
  // smaller rooms then fill the gaps. Sort by expected footprint so a 1024
  // huge room doesn't have to find space after four 768 rooms.
  const sizedRequests = [];
  for (let i = 0; i < 4; i++) sizedRequests.push({ type: 'square', w: pickSquareSize(), h: pickSquareSize() });
  for (let i = 0; i < 2; i++) sizedRequests.push({ type: 'octagon', r: pickOctRadius() });
  const hexCount = 1 + Math.floor(rand() * 2);
  for (let i = 0; i < hexCount; i++) sizedRequests.push({ type: 'hexagon', r: pickOctRadius() });
  sizedRequests.sort((a, b) => {
    const sa = a.type === 'square' ? Math.min(a.w, a.h) : (a.type === 'octagon' ? a.r * 1.848 : a.r * 1.732);
    const sb = b.type === 'square' ? Math.min(b.w, b.h) : (b.type === 'octagon' ? b.r * 1.848 : b.r * 1.732);
    return sb - sa;
  });
  for (const req of sizedRequests) {
    tryPlace(() => req);
  }
  if (rooms.length < 3) {
    [{ cx: -512, cy: 0 }, { cx: 512, cy: 0 }, { cx: 0, cy: 512 }, { cx: 0, cy: -512 }].forEach(p => {
      const r = { type: 'square', cx: p.cx, cy: p.cy, w: 512, h: 512 };
      if (!rooms.some(o => bboxOverlap(roomBBox(o), roomBBox(r), MARGIN))) rooms.push(r);
    });
  }
  } // end random placement branch

  // -------- 2. pairwise corridor feasibility --------
  const ends = co => co.orient === 'H' ? [co.wIdx, co.eIdx] : [co.sIdx, co.nIdx];
  function tryCorridor(ai, bi) {
    const ra = rooms[ai], rb = rooms[bi];
    const ba = roomBBox(ra), bb = roomBBox(rb);
    // horizontal corridor: rooms X-separated, Y-overlap ≥ CW + 96 margin
    if (ba.maxX + 64 < bb.minX || bb.maxX + 64 < ba.minX) {
      const west = ba.maxX < bb.minX ? ra : rb;
      const east = ba.maxX < bb.minX ? rb : ra;
      const wbb = roomBBox(west), ebb = roomBBox(east);
      // Doorway must fall inside BOTH rooms' actual cardinal flat-edge span,
      // not just the effective bbox (octagons have diagonal corner segments
      // that can't host a 64-unit doorway).
      const wSpan = cardinalSpan(west, 'E'), eSpan = cardinalSpan(east, 'W');
      const yLow = Math.max(west.cy - wSpan, east.cy - eSpan) + 32;
      const yHigh = Math.min(west.cy + wSpan, east.cy + eSpan) - 32;
      if (yHigh - yLow >= CW) {
        const cy = sn((yLow + yHigh) / 2);
        const co = {
          orient: 'H', wIdx: rooms.indexOf(west), eIdx: rooms.indexOf(east),
          minX: wbb.maxX, maxX: ebb.minX, minY: cy - CW / 2, maxY: cy + CW / 2,
        };
        const blocked = rooms.some((r, idx) =>
          idx !== co.wIdx && idx !== co.eIdx && bboxOverlap(roomBBox(r), co, 16));
        if (!blocked) return co;
      }
    }
    if (ba.maxY + 64 < bb.minY || bb.maxY + 64 < ba.minY) {
      const south = ba.maxY < bb.minY ? ra : rb;
      const north = ba.maxY < bb.minY ? rb : ra;
      const sbb = roomBBox(south), nbb = roomBBox(north);
      const sSpan = cardinalSpan(south, 'N'), nSpan = cardinalSpan(north, 'S');
      const xLow = Math.max(south.cx - sSpan, north.cx - nSpan) + 32;
      const xHigh = Math.min(south.cx + sSpan, north.cx + nSpan) - 32;
      if (xHigh - xLow >= CW) {
        const cx = sn((xLow + xHigh) / 2);
        const co = {
          orient: 'V', sIdx: rooms.indexOf(south), nIdx: rooms.indexOf(north),
          minX: cx - CW / 2, maxX: cx + CW / 2, minY: sbb.maxY, maxY: nbb.minY,
        };
        const blocked = rooms.some((r, idx) =>
          idx !== co.sIdx && idx !== co.nIdx && bboxOverlap(roomBBox(r), co, 16));
        if (!blocked) return co;
      }
    }
    return null;
  }
  const possible = [];
  for (let a = 0; a < rooms.length; a++) for (let b = a + 1; b < rooms.length; b++) {
    const co = tryCorridor(a, b);
    if (co) possible.push(co);
  }

  // -------- 3. user-specified corridors OR auto spanning tree --------
  const corridors = [];
  const teleportPads = []; // {roomIdx, cx, cy, half, padSecId, ownTag, destTag}
  const userTeleporters = (opts && opts.teleporters) || [];
  const userCorridors = opts && opts.corridors;
  if (userCorridors) {
    // ShapeShifter explicit connections — try each pair the user drew. If
    // tryCorridor can't fit a corridor between them (walls don't overlap,
    // path blocked by another room) skip silently.
    for (const pair of userCorridors) {
      const co = tryCorridor(pair.a, pair.b);
      if (!co) continue;
      const [a, b] = ends(co);
      const dup = corridors.some(t => {
        const [ta, tb] = ends(t);
        return (ta === a && tb === b) || (ta === b && tb === a);
      });
      if (!dup) corridors.push(co);
    }
  } else {
  const connected = new Set([0]);
  let safety = 50;
  while (connected.size < rooms.length && safety-- > 0) {
    const cands = possible.filter(co => {
      const [a, b] = ends(co);
      return connected.has(a) !== connected.has(b) && !corridors.includes(co);
    });
    if (!cands.length) break;
    const chosen = cands[Math.floor(rand() * cands.length)];
    corridors.push(chosen);
    const [a, b] = ends(chosen);
    connected.add(a); connected.add(b);
  }
  for (const co of possible) {
    if (corridors.includes(co)) continue;
    const [a, b] = ends(co);
    const dup = corridors.some(t => {
      const [ta, tb] = ends(t);
      return (ta === a && tb === b) || (ta === b && tb === a);
    });
    if (!dup && rand() < 0.6) corridors.push(co);
  }
  } // end auto-corridor branch

  // -------- 3b. prune unreachable rooms (skip when user placed rooms) --------
  // For ShapeShifter the user explicitly placed every room — leaving an
  // unconnected one in place is the user's choice, not a bug. Skip the prune.
  if (!userRooms) {
    const reachable = new Set([0]);
    let grew = true;
    while (grew) {
      grew = false;
      for (const co of corridors) {
        const [a, b] = ends(co);
        if (reachable.has(a) && !reachable.has(b)) { reachable.add(b); grew = true; }
        else if (reachable.has(b) && !reachable.has(a)) { reachable.add(a); grew = true; }
      }
    }
    // Bail on pruning if it would leave too few rooms — better to show a
    // few floating islands than a one-room dungeon. This happens in the
    // unlucky placements where no axis-aligned corridor candidate exists.
    if (reachable.size < rooms.length && reachable.size >= 3) {
      const indexMap = new Map();
      const keptRooms = [];
      rooms.forEach((r, i) => {
        if (reachable.has(i)) {
          indexMap.set(i, keptRooms.length);
          keptRooms.push(r);
        }
      });
      rooms.length = 0;
      rooms.push(...keptRooms);
      const keptCorridors = [];
      for (const co of corridors) {
        if (co.orient === 'H') {
          if (!indexMap.has(co.wIdx) || !indexMap.has(co.eIdx)) continue;
          co.wIdx = indexMap.get(co.wIdx);
          co.eIdx = indexMap.get(co.eIdx);
        } else {
          if (!indexMap.has(co.sIdx) || !indexMap.has(co.nIdx)) continue;
          co.sIdx = indexMap.get(co.sIdx);
          co.nIdx = indexMap.get(co.nIdx);
        }
        keptCorridors.push(co);
      }
      corridors.length = 0;
      corridors.push(...keptCorridors);
    }
  }

  // -------- 4. room properties --------
  // Palettes lifted from research: techbase / industrial / metal / hellstone /
  // wood / gray. Floor flat change requires height change ±8 (Romero), so the
  // trim ring's +8 step and different floor tex pair satisfies this rule.
  const PALETTES = [
    { wall: 'STARTAN2', floor: 'FLOOR0_1', ceil: 'CEIL3_5', trim: 'FLOOR4_8', accent: 'TLITE6_1' },
    { wall: 'BROWN1',   floor: 'FLOOR4_8', ceil: 'CEIL5_2', trim: 'FLAT5_4',  accent: 'CEIL1_2' },
    { wall: 'METAL',    floor: 'FLOOR0_3', ceil: 'CEIL3_2', trim: 'CRATOP1',  accent: 'TLITE6_5' },
    { wall: 'STONE2',   floor: 'RROCK11',  ceil: 'CEIL3_3', trim: 'STEP2',    accent: 'FLAT5'    },
    { wall: 'WOOD1',    floor: 'FLOOR5_2', ceil: 'CEIL5_1', trim: 'FLOOR5_4', accent: 'TLITE6_4' },
    { wall: 'GRAY5',    floor: 'FLAT5_4',  ceil: 'CEIL3_1', trim: 'STEP1',    accent: 'TLITE6_6' },
    // Urban / industrial sets — for city blocks, tech bays and brick yards
    { wall: 'STARTAN3', floor: 'FLOOR0_2', ceil: 'CEIL3_4', trim: 'FLAT1',    accent: 'COMPSPAN' },
    { wall: 'BROWN144', floor: 'FLAT5_4',  ceil: 'CEIL5_2', trim: 'FLAT5',    accent: 'COMPBLUE' },
    { wall: 'GRAY7',    floor: 'FLAT1',    ceil: 'CEIL3_4', trim: 'FLAT5_4',  accent: 'LITE5'    },
    { wall: 'STONE3',   floor: 'RROCK16',  ceil: 'CEIL3_3', trim: 'STEP2',    accent: 'FLAT5_5'  },
  ];
  // City-block building wall textures — used by the courtyard feature so
  // central structures read as houses / towers, not generic dungeon walls.
  const BUILDING_WALLS = ['BROWN1', 'STONE2', 'STARTAN3', 'GRAY7', 'METAL2', 'BROWN144'];
  const BUILDING_ROOFS = ['FLAT1', 'CEIL5_2', 'FLAT5_4', 'CRATOP1', 'FLAT5_5'];
  // Themed zones: cluster rooms by proximity into 2–3 zones, each zone gets a
  // shared palette. Adjacent rooms in the same zone read as one "area" — a
  // techbase wing, a hellish wing, a wood-floored armory — which is the
  // single most important cue for "this map was hand-built". Uses a small
  // K-means with random centroids drawn from the room set.
  const NUM_ZONES = Math.min(rooms.length, 2 + Math.floor(rand() * 2));
  const zonePalettes = [];
  const used = new Set();
  for (let i = 0; i < NUM_ZONES; i++) {
    let idx;
    do { idx = Math.floor(rand() * PALETTES.length); } while (used.has(idx) && used.size < PALETTES.length);
    used.add(idx);
    zonePalettes.push(PALETTES[idx]);
  }
  const centroids = [];
  const shuffledRooms = rooms.slice().sort(() => rand() - 0.5);
  for (let i = 0; i < NUM_ZONES; i++) {
    centroids.push({ x: shuffledRooms[i].cx, y: shuffledRooms[i].cy });
  }
  for (let iter = 0; iter < 5; iter++) {
    rooms.forEach((r) => {
      let bestZone = 0, bestDist = Infinity;
      for (let z = 0; z < centroids.length; z++) {
        const dx = r.cx - centroids[z].x, dy = r.cy - centroids[z].y;
        const d = dx * dx + dy * dy;
        if (d < bestDist) { bestDist = d; bestZone = z; }
      }
      r.zone = bestZone;
    });
    for (let z = 0; z < centroids.length; z++) {
      const members = rooms.filter(r => r.zone === z);
      if (members.length === 0) continue;
      centroids[z].x = members.reduce((s, r) => s + r.cx, 0) / members.length;
      centroids[z].y = members.reduce((s, r) => s + r.cy, 0) / members.length;
    }
  }
  rooms.forEach((r) => {
    r.palette = zonePalettes[r.zone || 0];
    r.floorH = Math.floor(rand() * 4) * 8;                  // 0/8/16/24
    r.ceilH = r.floorH + 128 + Math.floor(rand() * 3) * 32; // 128/160/192 above
    r.light = pick([128, 144, 160, 176, 192]);
    r.hasSky = rand() < 0.4;
    if (r.hasSky) {
      r.ceilH = r.floorH + 256;
      r.light = pick([208, 224, 240]);
    }
    const roll = rand();
    // ShapeShifter: if the user already chose a feature for this room
    // (preset), keep it. Otherwise pick randomly.
    const userFeature = r._userFeature || null;
    // Large rooms get a shot at being "The Lake" or "The Garden" —
    // dramatic centerpieces requiring real floor area.
    const rmDim = r.type === 'octagon' ? r.r * 2 * 0.924
                : r.type === 'hexagon' ? r.r * 2 * 0.866
                : Math.min(r.w, r.h);
    const isLargeRoom = rmDim >= 896;
    const isMidRoom = rmDim >= 512;
    if (userFeature)                         r.feature = userFeature;
    else if (r.hasSky)                       r.feature = 'sky';
    else if (isLargeRoom && roll < 0.10)     r.feature = 'lake';
    else if (isLargeRoom && roll < 0.18)     r.feature = 'garden';
    else if (roll < 0.13)                    r.feature = 'platform';
    else if (roll < 0.21)                    r.feature = 'pit';
    else if (roll < 0.27)                    r.feature = 'altar';
    else if (roll < 0.33)                    r.feature = 'cathedral';
    else if (roll < 0.38)                    r.feature = 'crusher';
    else if (roll < 0.45 && isMidRoom)       r.feature = 'colonnade';
    else if (roll < 0.51)                    r.feature = 'pool';
    else if (roll < 0.56)                    r.feature = 'crypt';
    else if (roll < 0.61)                    r.feature = 'liminal';
    else if (roll < 0.66)                    r.feature = 'reactor';
    else if (roll < 0.71)                    r.feature = 'gallery';
    else if (roll < 0.76 && isMidRoom)       r.feature = 'throne';
    else if (roll < 0.81)                    r.feature = 'mausoleum';
    else if (roll < 0.83)                    r.feature = 'foundry';
    else if (roll < 0.87 && isMidRoom)       r.feature = 'observatory';
    else if (roll < 0.90)                    r.feature = 'sewer';
    else if (isLargeRoom && roll < 0.94)     r.feature = 'courtyard';
    else if (isMidRoom && roll < 0.955)      r.feature = 'plaza';
    else if (isMidRoom && roll < 0.975)      r.feature = 'ziggurat';
    else if (isMidRoom && roll < 0.99)       r.feature = 'lift';
    else                                     r.feature = 'none';
    // User-designed CUSTOM room — applies a saved customSpec (palette /
    // heights / light / pillars / terrains) over a 'none' base. The
    // customSpec.pillars and customSpec.terrains are pushed in the
    // pillar / terrain allocation blocks below.
    if (r.feature === 'custom' && r._customSpec) {
      const cs = r._customSpec;
      if (cs.palette) r.palette = { ...r.palette, ...cs.palette };
      if (typeof cs.floorH === 'number') r.floorH = cs.floorH;
      if (typeof cs.ceilH === 'number') r.ceilH = cs.ceilH;
      if (typeof cs.light === 'number') r.light = cs.light;
      if (cs.hasSky) { r.hasSky = true; r.palette = { ...r.palette, ceil: 'F_SKY1' }; }
    }
    // Per-feature room-level overrides — ceiling height, palette swaps and
    // ambient lighting set the mood before sector allocation.
    if (r.feature === 'cathedral') r.ceilH = r.floorH + 256 + Math.floor(rand() * 3) * 32;
    if (r.feature === 'crusher')   r.ceilH = r.floorH + 96;
    if (r.feature === 'crypt')   { r.ceilH = r.floorH + 128; r.light = Math.max(64, r.light - 64); }
    if (r.feature === 'liminal') { r.ceilH = r.floorH + 112; r.light = 240; }
    if (r.feature === 'reactor')  { r.ceilH = r.floorH + 192; r.light = 200; }
    if (r.feature === 'lake')     { r.ceilH = r.floorH + 224; r.light = 176; }
    // Garden — surreal indoor garden under open sky. Grass floors, trees
    // and statues, vaulted ceiling. Force sky on so the trim oculus reads
    // as the open garden roof.
    if (r.feature === 'garden')   {
      r.hasSky = true;
      r.ceilH = r.floorH + 256;
      r.light = 208;
      r.palette = { ...r.palette, floor: 'GRASS1', trim: 'GRASS2', wall: 'STONE3', ceil: 'F_SKY1', accent: 'FLAT5' };
    }
    if (r.feature === 'throne') {
      r.ceilH = r.floorH + 192;
      r.light = 144;
    }
    if (r.feature === 'mausoleum') {
      r.ceilH = r.floorH + 144;
      r.light = Math.max(64, r.light - 80);
      r.palette = { ...r.palette, wall: 'STONE2', floor: 'FLAT5_4', trim: 'STEP2', ceil: 'CEIL3_3', accent: 'FLAT5' };
    }
    if (r.feature === 'foundry') {
      r.ceilH = r.floorH + 176;
      r.light = 160;
      r.palette = { ...r.palette, wall: 'METAL', floor: 'CRATOP1', trim: 'SUPPORT2', ceil: 'CEIL3_2', accent: 'METAL2' };
    }
    if (r.feature === 'observatory') {
      r.hasSky = true;
      r.ceilH = r.floorH + 256;
      r.light = 144;
    }
    if (r.feature === 'sewer') {
      r.ceilH = r.floorH + 128;
      r.light = Math.max(80, r.light - 48);
      r.palette = { ...r.palette, floor: 'FLAT5_4', trim: 'STEP1', ceil: 'CEIL5_2' };
    }
    // Bunker — a low fortified concrete vault: dim, thick-walled, with a
    // central support column and low sandbag-style cover blocks.
    if (r.feature === 'bunker') {
      r.ceilH = r.floorH + 104;
      r.light = pick([112, 128, 144]);
      r.palette = { ...r.palette, wall: 'GRAY7', floor: 'FLOOR5_4', trim: 'GRAY5', ceil: 'CEIL5_2', accent: 'GRAYVINE' };
    }
    // Canal — an industrial channel hall: a sunken liquid waterway runs
    // across the room, split by a central land crossing the player walks
    // over (or drops into the channel and wades through).
    if (r.feature === 'canal') {
      r.ceilH = r.floorH + 192;
      r.light = pick([160, 176, 192]);
      r.palette = { ...r.palette, wall: 'STONE2', floor: 'FLOOR0_1', trim: 'SUPPORT3', ceil: 'CEIL5_2' };
    }
    // Depot — an enclosed industrial warehouse: a combat hall packed with
    // stacked-crate cover at varied heights under a metal-trussed ceiling.
    if (r.feature === 'depot') {
      r.ceilH = r.floorH + 160;
      r.light = pick([144, 160, 176]);
      r.palette = { ...r.palette, wall: 'METAL', floor: 'FLAT5_4', trim: 'SUPPORT3',
        ceil: 'CEIL5_1', accent: 'CRATELIT' };
    }
    // Terrain — a large open-sky field of rolling hills: many tightly-packed
    // concentric rings whose floors undulate up and down in small steps,
    // reading as terraced rolling ground under open sky.
    if (r.feature === 'terrain') {
      r.hasSky = true;
      r.ceilH = r.floorH + 320;
      r.light = pick([192, 208, 224]);
      r.palette = { ...r.palette, ceil: 'F_SKY1',
        floor: pick(['RROCK16', 'GRNROCK', 'MFLR8_1', 'FLAT10']),
        trim: pick(['RROCK16', 'GRNROCK', 'FLAT10']) };
    }
    // Sky Room — an open-air chamber whose vaulted ceiling opens through a
    // central oculus to the sky. Force sky + a tall ceiling so the oculus
    // shaft rises ABOVE the room and reads as open sky (not a sunken panel).
    if (r.feature === 'sky') {
      r.hasSky = true;
      r.ceilH = r.floorH + 256;
      r.light = pick([200, 216, 232]);
    }
    // Lift — a raised vantage platform reachable only by a working lift.
    if (r.feature === 'lift') {
      r.ceilH = Math.max(r.ceilH, r.floorH + 192);
    }
    // Catacombs — dim low-ceiling tomb chamber with a regular grid of
    // burial columns. Marble + stone palette, no sky.
    if (r.feature === 'catacombs') {
      r.ceilH = r.floorH + 128;
      r.light = pick([96, 112, 128]);
      r.palette = { ...r.palette, ceil: 'CEIL3_3', floor: pick(['FLAT5_4', 'FLOOR0_1', 'FLAT1']),
        wall: pick(['MARBLE2', 'MARBLE3', 'STONE2', 'GSTONE1']),
        trim: 'MARBFAC2', accent: 'GSTGARG' };
    }
    // Library — long rectangular hall with parallel rows of tall pillars
    // ("bookshelves"). Wood-stone palette, intermediate ceiling.
    if (r.feature === 'library') {
      r.ceilH = r.floorH + 168;
      r.light = pick([144, 160, 176]);
      r.palette = { ...r.palette, ceil: pick(['FLAT5_4', 'CEIL5_1']),
        floor: pick(['FLAT5_4', 'FLOOR0_3', 'FLAT1']),
        wall: pick(['BROWN1', 'BROWN96', 'WOODMET1', 'PANEL3']),
        trim: 'WOOD1', accent: 'WOOD3' };
    }
    // Chasm — large square room with a deep central pit and two narrow
    // bridges crossing it (N-S / E-W). Dark stone palette, no sky.
    if (r.feature === 'chasm') {
      r.ceilH = r.floorH + 224;
      r.light = pick([112, 128, 144]);
      r.palette = { ...r.palette, ceil: pick(['CEIL3_3', 'CEIL5_2']),
        floor: pick(['FLOOR0_3', 'FLAT5_4', 'GRAY7']),
        wall: pick(['STONE3', 'STONE2', 'GRAY7', 'BROWN1']),
        trim: 'STONE', accent: 'METAL' };
    }
    // City Block — an open-sky urban grid of solid buildings separated by
    // narrow streets the player threads through (DOOMCITY vibe).
    if (r.feature === 'cityblock') {
      r.hasSky = true;
      // Sky plane at +512 — skyscrapers reach +384 and their setback tiers
      // must be OPEN sectors (floor < ceil). At the old +256 the skyscraper
      // roof sectors were floor-above-ceiling (invalid data that only
      // looked right because sky-clipping hid it).
      r.ceilH = r.floorH + 512;
      r.light = 208;
      r.palette = { ...r.palette, ceil: 'F_SKY1', floor: pick(['FLAT5_4', 'FLOOR0_1', 'FLAT1']) };
    }
    // Courtyard — an open-sky paved yard with a central enterable BUILDING
    // (a house/tower silhouette with solid walls, a flat roof and one door).
    // This is the headline "structures in an open area" feature.
    if (r.feature === 'courtyard') {
      r.hasSky = true;
      r.ceilH = r.floorH + 256;
      r.light = 208;
      r.palette = { ...r.palette, ceil: 'F_SKY1', floor: pick(['FLAT5_4', 'FLOOR0_1', 'RROCK16']) };
    }
    // Plaza — open-sky yard dotted with several small solid blocks
    // (planters / kiosks) that the player weaves between.
    if (r.feature === 'plaza') {
      r.hasSky = true;
      r.ceilH = r.floorH + 224;
      r.light = 200;
      r.palette = { ...r.palette, ceil: 'F_SKY1', floor: pick(['FLAT1', 'FLAT5_4', 'FLOOR0_2']) };
    }
    // Ziggurat — a stepped pyramid the player climbs to a central peak.
    // Concentric rings rise 16 units each, adding lots of distinct floor
    // heights (the verticality the pro maps lean on). Tall ceiling so the
    // monument has headroom.
    if (r.feature === 'ziggurat') {
      r.ceilH = r.floorH + 256;
      r.light = pick([160, 176, 192]);
    }
    r.special = rand() < 0.15 ? 8 : (rand() < 0.06 ? 17 : 0);
  });

  // -------- 5. constrain heights for traversal --------
  for (let iter = 0; iter < 12; iter++) {
    let changed = false;
    for (const co of corridors) {
      const [ai, bi] = ends(co);
      const delta = Math.abs(rooms[ai].floorH - rooms[bi].floorH);
      if (delta > MAX_STEP) {
        const low = rooms[ai].floorH < rooms[bi].floorH ? rooms[ai] : rooms[bi];
        low.floorH = Math.max(rooms[ai].floorH, rooms[bi].floorH) - MAX_STEP;
        changed = true;
      }
    }
    if (!changed) break;
  }

  // -------- 5b. detect overlapping (fused) rooms --------
  // Rooms whose bounding boxes intersect are being deliberately fused by
  // the user. Strip their internal detail (trim layers, centre features,
  // pillars, alcoves) — those things only make sense inside a clean
  // convex room. Equalize floor heights across each overlap-connected
  // group so the fused interior is one smooth floor (no 24-unit step
  // mid-room). The shared-wall portions will be dissolved by the fusion
  // pass after geometry emission.
  const fusedGroups = []; // retained: used in geometry pass for grid emit
  {
    function groupOf(idx) {
      for (const g of fusedGroups) if (g.has(idx)) return g;
      return null;
    }
    for (let i = 0; i < rooms.length; i++) {
      for (let j = i + 1; j < rooms.length; j++) {
        const a = roomBBox(rooms[i]), b = roomBBox(rooms[j]);
        const overlap = !(a.maxX <= b.minX || b.maxX <= a.minX ||
                          a.maxY <= b.minY || b.maxY <= a.minY);
        if (!overlap) continue;
        let gi = groupOf(i), gj = groupOf(j);
        if (gi && gj && gi !== gj) {
          for (const x of gj) gi.add(x);
          fusedGroups.splice(fusedGroups.indexOf(gj), 1);
        } else if (gi) gi.add(j);
        else if (gj) gj.add(i);
        else fusedGroups.push(new Set([i, j]));
      }
    }
    // Terrain/cover ISLAND features survive fusion — their sunken channels/
    // basins/terraces and pillar cover get rasterized into the fusion grid
    // below, so a fused canal still has its waterway, a fused plaza its
    // basin, a fused depot its crates, etc. Concentric/shell features
    // (centre daises, oculus shafts, trim rings, buildings) still need a
    // clean convex room, so those are stripped to 'none'.
    const ISLAND_FUSE = new Set(['canal', 'plaza', 'depot', 'bunker', 'courtyard', 'cityblock', 'custom']);
    for (const g of fusedGroups) {
      // Equalize FLOOR only — so the player walks between fused rooms with
      // no step. Preserve each room's own height (so kept island features
      // still fit under the ceiling) but flatten to a common floor.
      let fh = -Infinity;
      for (const idx of g) fh = Math.max(fh, rooms[idx].floorH);
      for (const idx of g) {
        const rm = rooms[idx];
        const gap = rm.ceilH - rm.floorH;
        rm.floorH = fh;
        rm.ceilH = fh + Math.max(128, gap);
        rm.trimLayers = 0;  // concentric rings don't fit a fused shape
        if (!ISLAND_FUSE.has(rm.feature)) rm.feature = 'none';
        rm._fused = true;
        // Pillars AND island terrain are kept — they get rasterized into the
        // fusion grid below, so fused rooms still have cover / waterways.
      }
    }
  }

  // -------- 6. allocate sectors --------
  const sectors = [];
  let tagCounter = 1; // unique sector tags for lifts etc.
  const allocSec = (props) => {
    const id = 's' + sectors.length;
    sectors.push({ id, floorH: 0, ceilH: 128, floorTex: 'FLOOR0_1', ceilTex: 'CEIL3_5',
      light: 160, special: 0, tag: 0, ...props });
    return id;
  };

  rooms.forEach((r) => {
    // Concentric trim layers stepping up toward the centre. Cap by room size
    // so the deepest inset polygon stays positive — small rooms get fewer
    // layers (or none) to avoid degenerate inverted-winding geometry.
    const minDim = r.type === 'octagon' ? r.r * 2 * 0.924
                 : r.type === 'hexagon' ? r.r * 2 * 0.866
                 : Math.min(r.w, r.h);
    const maxTrim = Math.max(0, Math.floor((minDim - 128) / (2 * TRIM_W)));
    const flatYard = r.feature === 'courtyard' || r.feature === 'plaza' || r.feature === 'ziggurat' || r.feature === 'lift' || r.feature === 'depot' || r.feature === 'canal' || r.feature === 'bunker' || r.feature === 'cityblock' || r.feature === 'custom' || r.feature === 'catacombs' || r.feature === 'library' || r.feature === 'chasm';
    if (!r._fused && !flatYard) r.trimLayers = Math.min(1 + Math.floor(rand() * 3), maxTrim);
    else if (flatYard) r.trimLayers = 0;
    // Terrain rooms pack many tightly-spaced rings for the rolling-hills look.
    if (r.feature === 'terrain' && !r._fused) r.trimLayers = Math.min(8 + Math.floor(rand() * 5), maxTrim);
    // Outer sector: the ring at the room wall. Floor matches room floor and
    // ceiling matches room ceiling — this is the layer doors connect to.
    // Outer ring at the wall. For sky rooms the OUTER ring keeps a TEXTURED
    // ceiling — the sky only opens up through the centre feature, so the
    // room reads as a dome with a top oculus.
    r.outerId = allocSec({
      floorH: r.floorH, ceilH: r.ceilH,
      floorTex: r.palette.floor, ceilTex: r.palette.ceil,
      light: r.light, special: r.special,
    });
    // Concentric trim layers — each step IN drops the floor by 8 and RAISES
    // the ceiling by 8 (vaulted bowl). For sky rooms, the trim ceilings ALSO
    // step up but stay TEXTURED — only the centre 'sky' feature opens to
    // F_SKY1 through the ring, making the room read as an open dome with a
    // top oculus. Lower / upper textures get filled by the resolve pass.
    r.trimIds = [];
    let terrH = r.floorH;  // running floor height for the rolling-hills walk
    for (let i = 1; i <= r.trimLayers; i++) {
      if (r.feature === 'terrain') {
        // Rolling hills: a small seeded up/down step each ring, clamped to a
        // gentle relief band. Ceiling stays a constant open sky.
        terrH += pick([-16, -8, -8, 8, 8, 16]);
        terrH = Math.max(r.floorH - 56, Math.min(r.floorH + 56, terrH));
        r.trimIds.push(allocSec({
          floorH: terrH, ceilH: r.ceilH,
          floorTex: r.palette.floor, ceilTex: 'F_SKY1',
          light: Math.max(160, r.light - i * 2), special: 0,
        }));
      } else {
        r.trimIds.push(allocSec({
          floorH: r.floorH - i * 8, ceilH: r.ceilH + i * 8,
          floorTex: r.palette.trim,
          ceilTex: r.palette.ceil,
          light: Math.max(64, r.light - i * 6), special: 0,
        }));
      }
    }
    // Skip the centre feature if it wouldn't fit inside the innermost trim
    // (negative-size polygon = inverted winding = broken topology).
    const featureMinSize = 2 * (TRIM_W * r.trimLayers + INNER_INSET) + 64;
    if (minDim < featureMinSize) r.feature = 'none';
    // Centre feature, sits inside the deepest (lowest) trim layer.
    const deepestFloor = r.floorH - r.trimLayers * 8;
    const deepestCeil = r.ceilH + r.trimLayers * 8;
    if (r.feature === 'platform') {
      // A small rise in the centre of the concave bowl — like an altar.
      r.featureId = allocSec({
        floorH: deepestFloor + 16, ceilH: deepestCeil,
        floorTex: r.palette.accent, ceilTex: r.palette.accent,
        light: Math.min(255, r.light + 16), special: 0,
      });
    } else if (r.feature === 'sky') {
      // Open oculus shaft with a raised, brighter dais directly beneath it —
      // a shaft-of-light altar the player steps up onto. The 16-unit step is
      // textured by the resolve pass against the innermost trim.
      r.featureId = allocSec({
        floorH: deepestFloor + 16, ceilH: r.floorH + 384,
        floorTex: r.palette.accent, ceilTex: 'F_SKY1',
        light: Math.min(255, r.light + 64), special: 0,
      });
    } else if (r.feature === 'pit') {
      r.featureId = allocSec({
        floorH: deepestFloor - 16, ceilH: deepestCeil,
        floorTex: pick(['BLOOD1', 'NUKAGE1', 'LAVA1', 'FWATER1']),
        ceilTex: r.hasSky ? 'F_SKY1' : r.palette.ceil,
        light: Math.max(64, r.light - 24), special: 7,
      });
    } else if (r.feature === 'altar') {
      // A raised platform with a solid column rising to the ceiling at its
      // centre — like a temple altar. Platform itself; the column is added
      // to r.pillars below so it stamps as a closed sub-sector.
      r.featureId = allocSec({
        floorH: deepestFloor + 24, ceilH: deepestCeil,
        floorTex: r.palette.accent, ceilTex: r.palette.accent,
        light: Math.min(255, r.light + 24), special: 0,
      });
    } else if (r.feature === 'pool') {
      // Sunken liquid pool surrounded by a raised walkway (the trim rings).
      // Player can drop into the pool and climb back out.
      r.featureId = allocSec({
        floorH: deepestFloor - 24, ceilH: deepestCeil,
        floorTex: pick(['FWATER1', 'NUKAGE1', 'BLOOD1']),
        ceilTex: r.palette.ceil,
        light: Math.min(255, r.light + 16), special: 0,
      });
    } else if (r.feature === 'crypt') {
      // Stone slab tomb at the centre of a dim crypt.
      r.featureId = allocSec({
        floorH: deepestFloor + 16, ceilH: deepestCeil,
        floorTex: 'FLAT5_4', ceilTex: 'CEIL3_3',
        light: Math.max(64, r.light - 16), special: 0,
      });
    } else if (r.feature === 'lake') {
      // The Lake — a deep recessed pool of water at the centre. Islands
      // (small raised platforms) and a 4-pillar temple are added below
      // via r.islands and r.pillars.
      r.featureId = allocSec({
        floorH: deepestFloor - 32, ceilH: deepestCeil,
        floorTex: 'FWATER1', ceilTex: r.palette.ceil,
        light: Math.max(96, r.light - 32), special: 0,
      });
    } else if (r.feature === 'reactor') {
      // Glowing reactor core — a recessed cell-tech well at the centre.
      r.featureId = allocSec({
        floorH: deepestFloor - 16, ceilH: deepestCeil,
        floorTex: 'NUKAGE1', ceilTex: 'TLITE6_1',
        light: 240, special: 8,
      });
    } else if (r.feature === 'gallery') {
      // Long raised walkway down the centre — like a museum nave.
      r.featureId = allocSec({
        floorH: deepestFloor + 16, ceilH: deepestCeil,
        floorTex: r.palette.trim, ceilTex: r.palette.ceil,
        light: Math.min(255, r.light + 24), special: 0,
      });
    } else if (r.feature === 'liminal') {
      // Backrooms-style "off" sub-area — same floor but a different,
      // garish tile pattern, sickly bright lights, low ceiling. The
      // disorienting "wrong place" feel.
      r.featureId = allocSec({
        floorH: deepestFloor, ceilH: deepestCeil,
        floorTex: pick(['FLAT22', 'FLAT19', 'FLOOR4_1']),
        ceilTex: 'TLITE6_5',
        light: 255, special: 0,
      });
    } else if (r.feature === 'garden') {
      // Central shrine — a small raised stone plinth in the middle of
      // the grass. The big-tree decoration sits on top.
      r.featureId = allocSec({
        floorH: deepestFloor + 16, ceilH: deepestCeil,
        floorTex: 'FLAT5', ceilTex: 'F_SKY1',
        light: 224, special: 0,
      });
    } else if (r.feature === 'throne') {
      // A raised dais at the centre with a brighter, redder pool of light —
      // the throne. Red-torches flank it via decorations.
      r.featureId = allocSec({
        floorH: deepestFloor + 24, ceilH: deepestCeil,
        floorTex: 'FLOOR1_6', ceilTex: 'TLITE6_4',
        light: Math.min(255, r.light + 48), special: 0,
      });
    } else if (r.feature === 'mausoleum') {
      // A raised stone catafalque in the centre of the crypt.
      r.featureId = allocSec({
        floorH: deepestFloor + 16, ceilH: deepestCeil,
        floorTex: 'STEP2', ceilTex: 'CEIL3_3',
        light: Math.max(64, r.light - 16), special: 0,
      });
    } else if (r.feature === 'foundry') {
      // Open molten pool at the centre — slow lava damage, bright glow.
      r.featureId = allocSec({
        floorH: deepestFloor - 24, ceilH: deepestCeil,
        floorTex: 'LAVA1', ceilTex: 'CEIL3_2',
        light: 224, special: 5,
      });
    } else if (r.feature === 'observatory') {
      // Centre opens to the sky with a tall pillar (the telescope) at
      // its heart. The pillar is added via r.pillars below.
      r.featureId = allocSec({
        floorH: deepestFloor, ceilH: r.floorH + 512,
        floorTex: r.palette.floor, ceilTex: 'F_SKY1',
        light: Math.min(255, r.light + 32), special: 0,
      });
    } else if (r.feature === 'sewer') {
      // Sunken slime channel running through the room.
      r.featureId = allocSec({
        floorH: deepestFloor - 32, ceilH: deepestCeil,
        floorTex: pick(['SLIME09', 'NUKAGE1']),
        ceilTex: r.palette.ceil,
        light: Math.max(80, r.light - 32), special: 7,
      });
    }
    // Courtyard — a compound of 1–4 enterable buildings (houses / towers)
    // standing in the open-sky yard. Bigger yards hold more buildings laid
    // out on a grid with "streets" between, like a city block. Each
    // building gets its own interior, door and two windows.
    if (r.feature === 'courtyard' || r.feature === 'cityblock') {
      const sn32 = v => Math.round(v / 32) * 32;
      let layout;
      if (r.feature === 'cityblock') {
        // Dense N×N grid of smaller buildings with streets between them.
        const N = minDim >= 1280 ? 3 : 2;
        const cell = sn32(minDim / (N + 0.5));
        const bh = sn32(cell * 0.36);
        const mid = (N - 1) / 2;
        layout = [];
        for (let gy = 0; gy < N; gy++) for (let gx = 0; gx < N; gx++) {
          // Leave the exact-centre cell open as a plaza (spawn-safe + a town
          // square), for odd grids only.
          if (N % 2 === 1 && gx === mid && gy === mid) continue;
          layout.push({ cx: sn32(r.cx) + (gx - mid) * cell,
            cy: sn32(r.cy) + (gy - mid) * cell, half: bh });
        }
      } else if (minDim >= 1280) {
        const o = sn32(minDim * 0.24), h = sn32(minDim * 0.13);
        layout = [[-o,-o],[o,-o],[-o,o],[o,o]].map(([dx,dy]) => ({ cx: sn32(r.cx)+dx, cy: sn32(r.cy)+dy, half: h }));
      } else if (minDim >= 1024) {
        const o = sn32(minDim * 0.22), h = sn32(minDim * 0.16);
        const axis = rand() < 0.5;
        layout = [[-o,0],[o,0]].map(([dx,dy]) => ({ cx: sn32(r.cx)+(axis?dx:dy), cy: sn32(r.cy)+(axis?dy:dx), half: h }));
      } else {
        layout = [{ cx: sn32(r.cx), cy: sn32(r.cy), half: sn32(minDim * 0.22) }];
      }
      // Varied footprints — give courtyard buildings a non-square aspect when
      // there's room (wide or deep), keeping a square fallback if stretching
      // would collide with an already-placed building. City-block lots stay
      // square so they don't overflow the street grid.
      const placedFP = [];
      for (const pos of layout) {
        let hx = pos.half, hy = pos.half;
        if (r.feature !== 'cityblock') {
          const roll = rand();
          let thx = hx, thy = hy;
          if (roll < 0.3) thx = sn32(hx * 1.35);
          else if (roll < 0.6) thy = sn32(hy * 1.35);
          const fits = placedFP.every(q => Math.abs(pos.cx - q.cx) >= thx + q.hx + 96 ||
                                            Math.abs(pos.cy - q.cy) >= thy + q.hy + 96);
          if (fits) { hx = thx; hy = thy; }
        }
        pos.halfX = hx; pos.halfY = hy;
        pos.half = Math.max(hx, hy);
        placedFP.push({ cx: pos.cx, cy: pos.cy, hx, hy });
      }
      // Enterable buildings — courtyard makes ANY large building enterable
      // (50% each, was only the biggest at 75%) so a yard can hold several
      // shelters. City-block scatters smaller shops/shelters across its lots
      // so the player can duck in and out while threading the streets.
      if (r.feature === 'courtyard' && minDim >= 1024) {
        for (const pos of layout) {
          if (pos.halfX >= 140 && pos.halfY >= 140 && rand() < 0.5) pos.enterable = true;
        }
      }
      if (r.feature === 'cityblock') {
        for (const pos of layout) {
          if (pos.halfX >= 112 && pos.halfY >= 96 && rand() < 0.4) pos.enterable = true;
        }
      }
      r.buildings = [];
      for (const pos of layout) {
        if (pos.half < 96) continue;
        if (pos.enterable) {
          // Hollow shed built from a SOLID wall-slab frame (floor==ceil, so it
          // blocks naturally — no impassable flag) whose facade is a LOWER
          // texture (two-sided middles get stripped by the resolve pass, so we
          // can't use them). The frame wraps a textured-ceiling interior, with
          // a DOOR THROAT — a small recessed entry on the south whose low
          // ceiling forms the visible lintel and whose DOORTRAK side jambs
          // read as the door frame. Larger interiors can also get a working
          // LIFT that takes the player up to a raised MEZZANINE (true two-
          // floor verticality — the office-tower experience).
          const intLight = pick([128, 144, 160]);
          // Multi-room office layouts and internal lifts compete for the
          // same large interiors; either pick is exclusive so we don't try
          // to fit both into one building.
          const eligibleLarge = pos.halfX >= 128 && pos.halfY >= 144;
          const multiRoom = eligibleLarge && rand() < 0.35;
          const hasLift = !multiRoom && eligibleLarge && rand() < 0.55;
          const liftTag = hasLift ? tagCounter++ : 0;
          // Lift buildings are taller (216 / 192) than regular sheds (168 /
          // 144) so the raised mezzanine has enough clearance for the player.
          const wallTop = r.floorH + (hasLift ? 216 : 168);
          const intCeilH = r.floorH + (hasLift ? 192 : 144);
          const b = {
            cx: pos.cx, cy: pos.cy, half: pos.half, halfX: pos.halfX, halfY: pos.halfY,
            enterable: true, wall: pick(BUILDING_WALLS), intWall: pick(['METAL2', 'STARTAN2', 'GRAY7', 'BROWN1']),
            wallTop,
            slabSec: allocSec({ floorH: wallTop, ceilH: wallTop,
              floorTex: pick(BUILDING_ROOFS), ceilTex: 'F_SKY1', light: r.light, special: 0 }),
            intSec: allocSec({ floorH: r.floorH, ceilH: intCeilH,
              floorTex: pick(['FLAT5_4', 'FLOOR0_1', 'FLOOR4_8']),
              ceilTex: pick(['CEIL5_1', 'CEIL5_2', 'TLITE6_4', 'FLAT5_4']),
              light: intLight, special: 0 }),
            throatSec: allocSec({ floorH: r.floorH, ceilH: r.floorH + 88,
              floorTex: pick(['FLAT5_4', 'FLOOR0_1', 'FLOOR4_8']),
              ceilTex: pick(['FLAT5_4', 'FLAT1', 'CEIL5_1']),
              light: Math.max(96, intLight - 24), special: 0 }),
            hasLift, liftTag, multiRoom,
          };
          if (multiRoom) {
            // Office-style two-room interior — a partition wall splits the
            // building into FRONT (door entry) and BACK rooms connected by
            // an internal doorway. The doorway is its own header sector
            // (ceil = fh + 72) so the upper above the opening reads as a
            // proper lintel/archway instead of a tall wall.
            b.backRoomSec = allocSec({
              floorH: r.floorH, ceilH: intCeilH,
              floorTex: pick(['FLAT5_4', 'FLOOR0_1', 'FLOOR4_8', 'FLAT1']),
              ceilTex: pick(['CEIL5_1', 'CEIL5_2', 'TLITE6_4', 'FLAT5_4']),
              light: intLight, special: 0,
            });
            b.doorwaySec = allocSec({
              floorH: r.floorH, ceilH: r.floorH + 72,
              floorTex: pick(['FLAT5_4', 'FLOOR0_1']),
              ceilTex: pick(['FLAT5_4', 'FLAT1', 'CEIL5_1']),
              light: Math.max(96, intLight - 16), special: 0,
            });
          }
          if (hasLift) {
            // Lift platform — closed-state floor is at mezzanine height; SR-62
            // on the player-facing wall lowers it to the interior, waits,
            // raises back up. Standing on the lift takes the player up one
            // story to the mezzanine.
            b.liftSec = allocSec({
              floorH: r.floorH + 96, ceilH: intCeilH,
              floorTex: pick(['FLOOR0_3', 'CEIL5_2', 'FLAT5_4', 'PLAT1']),
              ceilTex: pick(['CEIL5_1', 'TLITE6_4']),
              light: Math.min(255, intLight + 24), special: 0, tag: liftTag,
            });
            // Raised mezzanine — a small office-style upper floor north of the
            // lift, lit slightly brighter than the ground floor so it reads as
            // the upper deck.
            b.mezzSec = allocSec({
              floorH: r.floorH + 96, ceilH: intCeilH,
              floorTex: pick(['FLAT5_4', 'FLOOR0_1', 'FLOOR4_8', 'FLAT1']),
              ceilTex: pick(['TLITE6_4', 'CEIL5_1', 'CEIL5_2']),
              light: Math.min(255, intLight + 16), special: 0,
            });
          }
          r.buildings.push(b);
          continue;
        }
        // Solid roofed structure: walls rise to a flat roof with OPEN SKY
        // above it (the roof sector's ceiling is sky too), so the building
        // reads consistently from every angle — wall face up to the roofline,
        // then the flat roof, then sky. (Vanilla Doom can't both enter a
        // building AND show its roof from outside in an open-sky yard, so we
        // make these solid skyline structures with a textured facade.) Houses
        // are 96–128 tall, towers 160–208, for a varied skyline.
        const bRoof = pick(BUILDING_ROOFS);
        // City-block lots have a 30% chance to spawn a proper SKYSCRAPER
        // silhouette (256-320 tall) for the urban-canyon look; otherwise the
        // building rolls house vs tower (96-128 / 160-208) as before.
        const isSkyscraper = r.feature === 'cityblock' && pos.halfX >= 96 && pos.halfY >= 96 && rand() < 0.3;
        const isTower = !isSkyscraper && rand() < 0.4;
        const roofTop = r.floorH + (
          isSkyscraper ? 256 + Math.floor(rand() * 5) * 16 :
          isTower      ? 160 + Math.floor(rand() * 4) * 16 :
                          96 + Math.floor(rand() * 3) * 16);
        const plinthH = r.floorH + 12;     // base podium height
        const capH = roofTop + 16;         // parapet cap (lip) height
        const parapetW = 56;
        const b = {
          cx: pos.cx, cy: pos.cy, half: pos.half, halfX: pos.halfX, halfY: pos.halfY,
          door: 96, win: 80, porchDepth: 48, plinthW: 32, parapetW,
          wall: pick(BUILDING_WALLS), roofTop, isTower, plinthH, capH,
          doorTex: pick(['BIGDOOR2', 'BIGDOOR4', 'BIGDOOR1', 'BIGDOOR7']),
          winTex: pick(['LITE5', 'LITE3', 'SHAWN2', 'BROWN96']),
          capTex: pick(['STONE', 'STONE2', 'METAL', 'BROWN1', 'STARTAN3']),
          // Recessed roof centre (the part inside the parapet lip).
          roofSec: allocSec({ floorH: roofTop, ceilH: r.ceilH,
            floorTex: bRoof, ceilTex: 'F_SKY1',
            light: Math.min(255, r.light + 8), special: 0 }),
          // Parapet cap — a raised lip ring around the roof edge.
          capSec: allocSec({ floorH: capH, ceilH: r.ceilH,
            floorTex: pick(BUILDING_ROOFS), ceilTex: 'F_SKY1',
            light: Math.min(255, r.light + 8), special: 0 }),
          // Plinth — a raised base podium the building stands on; doubles as
          // the floor of the recessed entrance.
          plinthSec: allocSec({ floorH: plinthH, ceilH: r.ceilH,
            floorTex: r.palette.floor, ceilTex: 'F_SKY1',
            light: r.light, special: 0 }),
          // Bay shelter — a small porch sub-sector occupying the recessed
          // entrance bay, with a LOW textured ceiling (a "lintel" at exactly
          // door height + a small head clearance). Carving the bay out of
          // the plinth caps the door panel to its real 128 texture height
          // (instead of stretching it to capH) and produces a properly
          // proportioned overhang above the porch when seen from the court.
          bayShelterSec: allocSec({ floorH: plinthH, ceilH: plinthH + 128,
            floorTex: r.palette.floor,
            ceilTex: pick(['CEIL5_1', 'FLAT5_4', 'TLITE6_4', 'FLAT1']),
            light: Math.max(96, r.light - 32), special: 0 }),
        };
        // Rooftop units — solid tank/AC/antenna blocks on the recessed roof
        // that rise above the parapet, giving the skyline a stepped urban
        // silhouette. Towers earn a tall antenna pole alongside the main
        // housing; houses get a single varied AC/tank centerpiece. The roof
        // centre must be big enough to hold them.
        b.roofUnits = [];
        b.tiers = [];
        const innerHalf = Math.min(pos.halfX, pos.halfY) - parapetW;
        // SKYSCRAPER — wedding-cake setback tiers instead of a tank: two
        // concentric open-sky steps rising from the roof centre, capped by
        // a thin spire on the top tier. The classic 1920s-zoning-law
        // silhouette, and it reads beautifully against the Doom sky.
        if (isSkyscraper && innerHalf >= 96) {
          const sn32u = v => Math.round(v / 32) * 32;
          const t1Half = Math.min(sn32u(innerHalf * 0.62), innerHalf - 32);
          const t1H = roofTop + 64;
          b.tiers.push({ half: t1Half, sec: allocSec({
            floorH: t1H, ceilH: r.ceilH, floorTex: pick(BUILDING_ROOFS),
            ceilTex: 'F_SKY1', light: Math.min(255, r.light + 8), special: 0 }) });
          const t2Half = sn32u(innerHalf * 0.34);
          if (t2Half >= 64 && t1Half - t2Half >= 32) {
            const t2H = t1H + 64;
            b.tiers.push({ half: t2Half, sec: allocSec({
              floorH: t2H, ceilH: r.ceilH, floorTex: pick(BUILDING_ROOFS),
              ceilTex: 'F_SKY1', light: Math.min(255, r.light + 12), special: 0 }) });
            // Spire — a thin solid mast on the top tier.
            const spH = t2H + 96 + Math.floor(rand() * 4) * 32;
            b.roofUnits.push({
              cx: b.cx, cy: b.cy, half: 16, enc: 'topTier',
              tex: pick(['METAL', 'SUPPORT2', 'SHAWN2']),
              sec: allocSec({ floorH: spH, ceilH: spH,
                floorTex: pick(BUILDING_ROOFS), ceilTex: pick(BUILDING_ROOFS),
                light: Math.min(255, r.light + 16), special: 0 }),
            });
          }
        } else if (innerHalf >= 64) {
          const sn32u = v => Math.round(v / 32) * 32;
          const mainHalf = Math.min(sn32u(innerHalf * 0.55), innerHalf - 16);
          const mainH = roofTop + (isTower ? 56 + Math.floor(rand() * 4) * 16 : 40);
          b.roofUnits.push({
            cx: b.cx, cy: b.cy, half: mainHalf,
            tex: pick(['METAL', 'COMPSPAN', 'SILVER1', 'SHAWN2', 'SUPPORT3']),
            sec: allocSec({ floorH: mainH, ceilH: mainH,
              floorTex: pick(BUILDING_ROOFS), ceilTex: pick(BUILDING_ROOFS),
              light: Math.min(255, r.light + 8), special: 0 }),
          });
          // Tower: add an antenna pole tucked at a corner of the roof centre,
          // taller than the main unit so it pokes up against the sky.
          let antCx = null, antCy = null;
          if (isTower && innerHalf - mainHalf >= 48) {
            const off = innerHalf - 24;
            const sx = rand() < 0.5 ? -1 : 1, sy = rand() < 0.5 ? -1 : 1;
            antCx = sx; antCy = sy;
            const antH = mainH + 64 + Math.floor(rand() * 4) * 16;
            b.roofUnits.push({
              cx: b.cx + sx * off, cy: b.cy + sy * off, half: 16,
              tex: pick(['METAL', 'SUPPORT2', 'SUPPORT3']),
              sec: allocSec({ floorH: antH, ceilH: antH,
                floorTex: pick(BUILDING_ROOFS), ceilTex: pick(BUILDING_ROOFS),
                light: Math.min(255, r.light + 16), special: 0 }),
            });
          }
          // Vent / AC box — a small auxiliary unit on a different corner from
          // the antenna, for the cluttered industrial roofscape look. Only
          // when the roof has clear space outside the main unit.
          if (innerHalf >= 96 && innerHalf - mainHalf >= 56 && rand() < 0.7) {
            const vHalf = 20;
            const vOff = innerHalf - vHalf - 8;
            let vsx = rand() < 0.5 ? -1 : 1, vsy = rand() < 0.5 ? -1 : 1;
            if (antCx !== null && vsx === antCx && vsy === antCy) vsy = -vsy;
            const vH = mainH + Math.floor(rand() * 3) * 8;
            b.roofUnits.push({
              cx: b.cx + vsx * vOff, cy: b.cy + vsy * vOff, half: vHalf,
              tex: pick(['SHAWN2', 'COMPSPAN', 'SUPPORT2', 'METAL2']),
              sec: allocSec({ floorH: vH, ceilH: vH,
                floorTex: pick(BUILDING_ROOFS), ceilTex: pick(BUILDING_ROOFS),
                light: Math.min(255, r.light + 8), special: 0 }),
            });
          }
        }
        r.buildings.push(b);
      }
    }
    // Ziggurat — allocate the concentric rising stair rings. Each ring is
    // STAIR_W wide and 16 units higher than the one outside it, so the
    // player climbs a stepped pyramid to a central peak platform.
    if (r.feature === 'ziggurat') {
      const STAIR_W = 48;
      const maxSteps = Math.floor((minDim / 2 - 80) / STAIR_W);
      const numSteps = Math.min(7, Math.max(2, maxSteps));
      r.stairW = STAIR_W;
      r.stairCount = numSteps;
      r.stairIds = [];
      for (let i = 1; i <= numSteps; i++) {
        r.stairIds.push(allocSec({
          floorH: r.floorH + i * 16, ceilH: r.ceilH,
          floorTex: i === numSteps ? r.palette.accent : r.palette.trim,
          ceilTex: r.hasSky ? 'F_SKY1' : r.palette.ceil,
          light: Math.min(255, r.light + i * 4), special: 0,
        }));
      }
    }
    // Lift — a central raised vantage platform plus a working lift strip on
    // its south edge. The platform sits +96 above the floor (too high to
    // step); the lift starts level with it and lowers on use (SR special
    // 62), so the player rides up. Adds verticality + a real linedef trigger.
    if (r.feature === 'lift' && minDim >= 384) {
      const ph = Math.floor(minDim * 0.26 / 32) * 32; // platform half-size
      const lift = 64;                                  // lift strip size
      r.lift = {
        cx: Math.round(r.cx / 32) * 32, cy: Math.round(r.cy / 32) * 32,
        ph, lift, top: r.floorH + 96,
      };
      r.liftPlatformId = allocSec({
        floorH: r.floorH + 96, ceilH: r.ceilH,
        floorTex: r.palette.accent, ceilTex: r.palette.ceil,
        light: Math.min(255, r.light + 16), special: 0,
      });
      r.liftTag = tagCounter++;
      r.liftSectorId = allocSec({
        floorH: r.floorH + 96, ceilH: r.ceilH,
        floorTex: r.palette.trim, ceilTex: r.palette.ceil,
        light: r.light, special: 0, tag: r.liftTag,
      });
    }
    // Plaza terrain — break the flat civic square into real height variation
    // (the industrial/open-area look). A sunken central basin sits 24 below
    // grade with a pair of raised vantage terraces on one axis 24 above it,
    // giving three distinct floor levels. Stamped as flush-bordered
    // sub-sectors; the resolve pass textures the risers, and the sky ceiling
    // continues unbroken above them. Stored for the emit pass + clearance.
    r.terrains = [];
    // Custom-designed rooms push their saved terrains (pits / raised
    // platforms placed by the Room Designer) before any feature-specific
    // terrain block runs.
    if (r.feature === 'custom' && r._customSpec && r._customSpec.terrains) {
      const sn = v => Math.round(v / 32) * 32;
      for (const t of r._customSpec.terrains) {
        const cx = sn(r.cx + (t.dx || 0));
        const cy = sn(r.cy + (t.dy || 0));
        const hw = Math.max(32, sn(t.hw | 0));
        const hh = Math.max(32, sn(t.hh | 0));
        const dh = t.dh | 0;  // floor delta (negative = pit, positive = raised platform)
        r.terrains.push({ cx, cy, hw, hh, kind: t.kind || 'custom',
          secId: allocSec({
            floorH: r.floorH + dh, ceilH: r.ceilH,
            floorTex: t.floorTex || (dh < 0 ? 'BLOOD1' : r.palette.accent),
            ceilTex: r.palette.ceil,
            light: Math.max(96, r.light + (dh < 0 ? -32 : 16)),
            special: t.special | 0,
          }) });
      }
    }
    if (r.feature === 'canal') {
      // Sunken liquid channel across the room (E–W), split by a central land
      // crossing. Two sunken segments left/right of the crossing; the player
      // walks the crossing or drops 24 into the channel and wades.
      const sn = v => Math.round(v / 32) * 32;
      const halfW = (r.type === 'square' ? r.w : minDim) / 2;
      const chHalfH = 80, crossHalf = 64;
      const liquid = pick(['NUKAGE1', 'FWATER1', 'BLOOD1']);
      const dmg = liquid === 'FWATER1' ? 0 : 7;
      const inset = sn(halfW - 64);
      for (const [x0, x1] of [[-inset, -crossHalf], [crossHalf, inset]]) {
        const hw = sn((x1 - x0) / 2);
        if (hw < 48) continue;
        r.terrains.push({ cx: sn(r.cx + (x0 + x1) / 2), cy: sn(r.cy), hw, hh: chHalfH, kind: 'channel',
          secId: allocSec({ floorH: r.floorH - 24, ceilH: r.ceilH,
            floorTex: liquid, ceilTex: r.palette.ceil,
            light: Math.max(96, r.light - 32), special: dmg }) });
      }
      // Bridge deck — a small raised metal-grating platform tucked between
      // the two channels (with a small floor strip around it so its walls
      // don't collide with the channel walls), reading as a crossing the
      // player walks UP onto rather than a flush continuation of the floor.
      r.terrains.push({ cx: sn(r.cx), cy: sn(r.cy), hw: crossHalf - 16, hh: chHalfH - 16, kind: 'bridge',
        secId: allocSec({ floorH: r.floorH + 8, ceilH: r.ceilH,
          floorTex: pick(['CEIL5_2', 'METAL', 'SHAWN2', 'SUPPORT3', 'FLOOR0_3']),
          ceilTex: r.palette.ceil,
          light: Math.min(255, r.light + 16), special: 0 }) });
    }
    if (r.feature === 'chasm' && minDim >= 768) {
      // Chasm — a deep central pit (liquid floor, damaging) crossed by a
      // single grated walkway on the long axis. The bridge is a non-sunken
      // strip emitted ON TOP via the V0.50 nested-terrain enclosing logic.
      const sn = v => Math.round(v / 32) * 32;
      const pitHalf = sn(minDim * 0.32);
      const bridgeHalf = 48;
      const liquid = pick(['LAVA1', 'NUKAGE1', 'BLOOD1']);
      r.terrains.push({ cx: sn(r.cx), cy: sn(r.cy), hw: pitHalf, hh: pitHalf, kind: 'pit',
        secId: allocSec({ floorH: r.floorH - 48, ceilH: r.ceilH,
          floorTex: liquid, ceilTex: r.palette.ceil,
          light: Math.max(64, r.light - 48), special: liquid === 'LAVA1' ? 5 : 7 }) });
      // Walkway on the room's longer axis — straddles the pit so the player
      // crosses it instead of dropping in.
      const longX = (r.w || 0) >= (r.h || 0);
      r.terrains.push({
        cx: sn(r.cx), cy: sn(r.cy),
        hw: longX ? pitHalf - 16 : bridgeHalf,
        hh: longX ? bridgeHalf : pitHalf - 16,
        kind: 'bridge',
        secId: allocSec({ floorH: r.floorH, ceilH: r.ceilH,
          floorTex: pick(['CEIL5_2', 'METAL', 'FLOOR0_3', 'SUPPORT3']),
          ceilTex: r.palette.ceil, light: r.light, special: 0 }) });
    }
    if (r.feature === 'plaza' && minDim >= 640) {
      const sn = v => Math.round(v / 32) * 32;
      const bHalf = sn(minDim * 0.15);
      r.terrains.push({ cx: sn(r.cx), cy: sn(r.cy), hw: bHalf, hh: bHalf, kind: 'basin',
        secId: allocSec({ floorH: r.floorH - 24, ceilH: r.ceilH,
          floorTex: pick(['FWATER1', 'FLOOR0_2', 'FLAT5_4']), ceilTex: r.palette.ceil,
          light: Math.max(96, r.light - 24), special: 0 }) });
      const off = sn(minDim * 0.30), tHalf = sn(minDim * 0.12);
      const axis = rand() < 0.5;
      for (const s of [-1, 1]) {
        if (tHalf < 64) break;
        r.terrains.push({
          cx: sn(r.cx) + (axis ? s * off : 0), cy: sn(r.cy) + (axis ? 0 : s * off),
          hw: tHalf, hh: tHalf, kind: 'terrace',
          secId: allocSec({ floorH: r.floorH + 24, ceilH: r.ceilH,
            floorTex: r.palette.accent, ceilTex: r.palette.ceil,
            light: Math.min(255, r.light + 16), special: 0 }) });
      }
    }
    // Courtyard terrain — the open compound floor gets a sunken service
    // basin near its centre plus a couple of raised platforms (loading
    // docks / equipment pads) out toward the edges, the multi-level
    // industrial-base look. Clear floor is grid-scanned so the patches
    // adapt to any 1/2/4-building layout and never touch a building (which
    // would block its doors). Sky ceiling carries over above each patch.
    if (r.feature === 'courtyard' && !r._fused && r.buildings && r.buildings.length) {
      const sn = v => Math.round(v / 32) * 32;
      const inset = minDim / 2 - 80, hp = 80, m = 48;
      const clearCell = (cx, cy) =>
        Math.abs(cx - r.cx) + hp <= inset && Math.abs(cy - r.cy) + hp <= inset &&
        r.buildings.every(b => Math.abs(cx - b.cx) >= b.half + hp + m ||
                               Math.abs(cy - b.cy) >= b.half + hp + m);
      const cells = [];
      for (let cy = sn(r.cy - inset); cy <= r.cy + inset; cy += 64)
        for (let cx = sn(r.cx - inset); cx <= r.cx + inset; cx += 64)
          if (clearCell(cx, cy)) cells.push({ cx, cy, d: Math.hypot(cx - r.cx, cy - r.cy) });
      if (cells.length) {
        cells.sort((a, b) => a.d - b.d);
        const basin = cells[0];
        r.terrains.push({ cx: basin.cx, cy: basin.cy, hw: hp, hh: hp, kind: 'basin',
          secId: allocSec({ floorH: r.floorH - 24, ceilH: r.ceilH,
            floorTex: pick(['FWATER1', 'NUKAGE1', 'FLOOR0_2']), ceilTex: r.palette.ceil,
            light: Math.max(96, r.light - 24), special: 0 }) });
        let placed = 0;
        for (let i = cells.length - 1; i >= 0 && placed < 2; i--) {
          const c = cells[i];
          if (!r.terrains.every(t => Math.hypot(c.cx - t.cx, c.cy - t.cy) >= 2 * hp + 96)) continue;
          r.terrains.push({ cx: c.cx, cy: c.cy, hw: hp, hh: hp, kind: 'terrace',
            secId: allocSec({ floorH: r.floorH + 16, ceilH: r.ceilH,
              floorTex: r.palette.accent, ceilTex: r.palette.ceil,
              light: Math.min(255, r.light + 16), special: 0 }) });
          placed++;
        }
      }
    }
    // 'cathedral', 'crusher', 'colonnade' have no centre sub-sector — the
    // height change or pillar pattern applied below is the whole feature.
    // Pillars in larger rooms — small closed sub-sectors that act as
    // visual breakup and combat cover. Place 1 (in large rooms) or 4
    // (in huge rooms with a 2x2 grid offset from centre). Pillar is a
    // tiny octagon with ceil == floor at room ceiling height so it
    // reads as a solid floor-to-ceiling column.
    r.pillars = [];
    // Custom-designed rooms push their saved pillars first (placed by the
    // Room Designer in absolute room-local coords) — translated to world.
    if (r.feature === 'custom' && r._customSpec && r._customSpec.pillars) {
      for (const p of r._customSpec.pillars) {
        const px = Math.round((r.cx + (p.dx || 0)) / 32) * 32;
        const py = Math.round((r.cy + (p.dy || 0)) / 32) * 32;
        const pillar = { cx: px, cy: py, radius: p.radius | 0 };
        // top is relative to the room floor; 0 / empty = full column.
        if (p.top) pillar.top = r.floorH + (p.top | 0);
        if (p.tex) pillar.tex = p.tex;
        // A pillar standing inside a custom terrain (pit / platform tier)
        // is enclosed by the smallest containing terrain, not the room
        // floor — same fix as the lake temple columns.
        let encArea = Infinity;
        for (const t of r.terrains || []) {
          if (px - pillar.radius < t.cx - t.hw || px + pillar.radius > t.cx + t.hw ||
              py - pillar.radius < t.cy - t.hh || py + pillar.radius > t.cy + t.hh) continue;
          const area = t.hw * t.hh;
          if (area < encArea) { pillar.enclosingId = t.secId; encArea = area; }
        }
        r.pillars.push(pillar);
      }
    }
    if (r.feature === 'bunker') {
      // Central support column + a ring of low sandbag cover blocks.
      r.pillars.push({ cx: Math.round(r.cx / 32) * 32, cy: Math.round(r.cy / 32) * 32, radius: 40 });
      const ring = Math.round(minDim * 0.30 / 32) * 32;
      for (const [dx, dy] of [[-ring, -ring], [ring, -ring], [-ring, ring], [ring, ring]]) {
        if (rand() < 0.35) continue;
        r.pillars.push({ cx: Math.round((r.cx + dx) / 32) * 32, cy: Math.round((r.cy + dy) / 32) * 32,
          radius: 40, top: r.floorH + 40, tex: 'GRAYVINE' });
      }
    } else if (r.feature === 'depot' && minDim >= 384) {
      // Stacked-crate cover: a deterministic scatter of square-ish crate
      // blocks at varied heights (64/96/full) the player fights around. Use
      // square footprints (octagonPoly with radius reads as a chunky crate).
      const span = minDim * 0.34;
      const crateTex = ['CRATE1', 'CRATE2', 'CRATWIDE', 'CRATELIT'];
      const n = 5 + Math.floor(rand() * 4);
      for (let i = 0; i < n; i++) {
        const ang = rand() * Math.PI * 2;
        const dist = span * (0.25 + rand() * 0.75);
        const cx = Math.round((r.cx + Math.cos(ang) * dist) / 32) * 32;
        const cy = Math.round((r.cy + Math.sin(ang) * dist) / 32) * 32;
        const radius = 48 + Math.floor(rand() * 3) * 16;
        const roll = rand();
        const top = roll < 0.35 ? r.floorH + 64 : roll < 0.7 ? r.floorH + 96 : r.ceilH;
        if (r.pillars.some(p => Math.abs(p.cx - cx) < p.radius + radius + 24 &&
                                Math.abs(p.cy - cy) < p.radius + radius + 24)) continue;
        r.pillars.push({ cx, cy, radius, top, tex: pick(crateTex) });
      }
    } else if (r.feature === 'plaza' && minDim >= 384) {
      // Scatter a few solid blocks (planters / kiosks) the player weaves
      // between in the open plaza, kept to the OUTER ring so they clear the
      // sunken basin and raised terraces. Deterministic positions from RNG.
      const span = minDim * 0.30;
      const clearOfTerrain = (cx, cy, rad) => (r.terrains || []).every(t =>
        Math.abs(cx - t.cx) >= t.hw + rad + 24 || Math.abs(cy - t.cy) >= t.hh + rad + 24);
      const n = 3 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) {
        const ang = rand() * Math.PI * 2;
        // Push planters further out (0.7–1.05 of span) when terrain exists so
        // they ring the terraces rather than collide with them.
        const lo = (r.terrains && r.terrains.length) ? 0.7 : 0.4;
        const dist = span * (lo + rand() * 0.35);
        const cx = Math.round((r.cx + Math.cos(ang) * dist) / 32) * 32;
        const cy = Math.round((r.cy + Math.sin(ang) * dist) / 32) * 32;
        const radius = 40 + Math.floor(rand() * 3) * 16;
        if (!clearOfTerrain(cx, cy, radius)) continue;
        // Short kiosks/planters (48–80 tall) with open sky above — NOT
        // floor-to-sky monoliths, so they read as low obstacles in the square.
        r.pillars.push({ cx, cy, radius, top: r.floorH + 48 + Math.floor(rand() * 3) * 16 });
      }
    } else if (r.feature === 'altar') {
      // Tall column at the centre of the altar dais.
      r.pillars.push({ cx: r.cx, cy: r.cy, radius: 32 });
    } else if (r.feature === 'throne') {
      // Throne backrest — a thick column rising from the back of the dais,
      // with red-marble texture so it reads as the actual throne.
      r.pillars.push({ cx: r.cx, cy: r.cy, radius: 40,
        tex: pick(['MARBFAC2', 'MARBFAC3', 'GSTONE2', 'SP_HOT1', 'REDWALL']),
        enclosingId: r.featureId || undefined });
    } else if (r.feature === 'reactor') {
      // Reactor core column — a glowing pillar rising from the cell-tech
      // well at the centre, capping the reactor with a vertical accent.
      r.pillars.push({ cx: r.cx, cy: r.cy, radius: 32,
        tex: pick(['LITE5', 'LITEBLU4', 'TEKLITE', 'SLADWALL', 'COMPSPAN']),
        enclosingId: r.featureId || undefined });
    } else if (r.feature === 'pool' && minDim >= 512) {
      // Diving plinth — a small raised stone island in the centre of the
      // pool, just above the water surface (a step out of the liquid).
      const poolFloor = r.floorH - r.trimLayers * 8 - 24;
      r.pillars.push({ cx: r.cx, cy: r.cy, radius: 32, top: poolFloor + 16,
        tex: pick(['STONE', 'STONE2', 'MARBLE1', 'GSTONE1']),
        enclosingId: r.featureId || undefined });
    } else if (r.feature === 'pit' && minDim >= 512) {
      // Four small stepping stones in the corners of the pit, just above
      // the liquid, so the player can hop across instead of wading.
      const pitFloor = r.floorH - r.trimLayers * 8 - 16;
      const off = Math.floor(minDim / 6 / 32) * 32;
      const stoneTop = pitFloor + 16;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        r.pillars.push({ cx: r.cx + sx * off, cy: r.cy + sy * off, radius: 20,
          top: stoneTop, enclosingId: r.featureId || undefined,
          tex: pick(['STONE', 'STONE2', 'STONE3', 'ROCK1']) });
      }
    } else if (r.feature === 'observatory' && minDim >= 384) {
      // The central telescope — a thick floor-to-ceiling column.
      r.pillars.push({ cx: r.cx, cy: r.cy, radius: 48 });
    } else if (r.feature === 'lake' && minDim >= 768) {
      // Four temple pillars at the centre of the pool — a tight square
      // structure rising from the water. Enclosed by the lake's water sector
      // (featureId) so the floor around their bases reads as the pool.
      const t = Math.floor(minDim / 8 / 32) * 32;
      const waterEnc = r.featureId || undefined;
      r.pillars.push({ cx: r.cx - t, cy: r.cy - t, radius: 32, enclosingId: waterEnc });
      r.pillars.push({ cx: r.cx + t, cy: r.cy - t, radius: 32, enclosingId: waterEnc });
      r.pillars.push({ cx: r.cx - t, cy: r.cy + t, radius: 32, enclosingId: waterEnc });
      r.pillars.push({ cx: r.cx + t, cy: r.cy + t, radius: 32, enclosingId: waterEnc });
      // Central altar column — a thicker marble pillar at the heart of the
      // temple, the focal point the player can shoot into the water around.
      r.pillars.push({ cx: r.cx, cy: r.cy, radius: 40, enclosingId: waterEnc,
        tex: pick(['MARBLE1', 'MARBLE2', 'GSTGARG', 'SP_DUDE5']) });
      // Two extra outer pillars suggesting scattered islands.
      const o = Math.floor(minDim / 3 / 32) * 32;
      r.pillars.push({ cx: r.cx - o, cy: r.cy, radius: 24, enclosingId: waterEnc });
      r.pillars.push({ cx: r.cx + o, cy: r.cy, radius: 24, enclosingId: waterEnc });
      // Stepping stones — low islands raised just above the water surface so
      // the player can hop between the temple and the shore. Placed off the
      // cardinal axes to leave clear sightlines across the pool.
      const stoneTop = r.floorH - r.trimLayers * 8 - 16;  // water_floor + 16
      const s = Math.floor((t + o) / 2 / 32) * 32;
      for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        r.pillars.push({ cx: r.cx + sx * s, cy: r.cy + sy * s, radius: 24,
          top: stoneTop, enclosingId: waterEnc,
          tex: pick(['STONE', 'STONE2', 'STONE3', 'ROCK1']) });
      }
    } else if (r.feature === 'colonnade' && minDim >= 384) {
      // A row of 3 pillars across the room's longer axis — feels like a
      // temple nave.
      const longAxisX = r.type !== 'square' || r.w >= r.h;
      const span = Math.floor(minDim * 0.34 / 32) * 32;
      const positions = [-span, 0, span];
      for (const p of positions) {
        const dx = longAxisX ? p : 0;
        const dy = longAxisX ? 0 : p;
        r.pillars.push({ cx: r.cx + dx, cy: r.cy + dy, radius: 40 });
      }
    } else if (r.feature === 'catacombs') {
      // Catacombs — a regular GRID of small marble tomb pillars on a 192-step
      // lattice (3x3 or 5x5 depending on room size). Tight, dim, oppressive.
      const sn = v => Math.round(v / 32) * 32;
      const step = sn(minDim / 4);
      const n = minDim >= 1024 ? 2 : minDim >= 640 ? 2 : 1;
      for (let gx = -n; gx <= n; gx++) for (let gy = -n; gy <= n; gy++) {
        r.pillars.push({ cx: sn(r.cx + gx * step), cy: sn(r.cy + gy * step), radius: 28,
          tex: pick(['MARBFAC2', 'MARBFAC3', 'GSTGARG', 'GSTONE1']) });
      }
    } else if (r.feature === 'library' && minDim >= 384) {
      // Library — TWO parallel rows of tall thin "bookshelf" columns on the
      // longer axis of the rectangle, leaving a central aisle for the player.
      const longX = (r.w || 0) >= (r.h || 0);
      const W = longX ? r.w : r.h;
      const H = longX ? r.h : r.w;
      const sn = v => Math.round(v / 32) * 32;
      const aisle = sn(H * 0.18);   // half-width of the central aisle gap
      const off = aisle + 24;        // pillar center is just outside the aisle
      const slots = Math.max(2, Math.floor((W - 192) / 192));
      const step = sn((W - 256) / slots);
      const start = -((slots * step) / 2);
      for (let i = 0; i <= slots; i++) {
        const along = sn(start + i * step);
        const dx = longX ? along : off, dy = longX ? off : along;
        const dx2 = longX ? along : -off, dy2 = longX ? -off : along;
        r.pillars.push({ cx: sn(r.cx + dx), cy: sn(r.cy + dy), radius: 20,
          tex: pick(['WOOD1', 'WOOD3', 'PANEL3', 'BROWN1']) });
        r.pillars.push({ cx: sn(r.cx + dx2), cy: sn(r.cy + dy2), radius: 20,
          tex: pick(['WOOD1', 'WOOD3', 'PANEL3', 'BROWN1']) });
      }
    } else if (r.feature === 'cathedral' && minDim >= 512) {
      // Four-corner colonnade — pillars supporting the vaulted ceiling.
      const off = Math.floor(minDim / 4 / 32) * 32;
      r.pillars.push({ cx: r.cx - off, cy: r.cy - off, radius: 40 });
      r.pillars.push({ cx: r.cx + off, cy: r.cy - off, radius: 40 });
      r.pillars.push({ cx: r.cx - off, cy: r.cy + off, radius: 40 });
      r.pillars.push({ cx: r.cx + off, cy: r.cy + off, radius: 40 });
      // Central altar / reliquary — a thicker marble pillar at the heart of
      // the nave between the colonnade, giving the vaulted space a focal
      // point instead of an empty floor.
      r.pillars.push({ cx: r.cx, cy: r.cy, radius: 48,
        tex: pick(['MARBLE1', 'MARBLE2', 'GSTGARG', 'SP_DUDE5']) });
      // Side aisles — a pair of smaller reliquary columns on the long axis,
      // breaking up the floor between the central altar and the colonnade.
      if (minDim >= 768) {
        const midAxis = Math.floor(minDim / 6 / 32) * 32;
        const longX = r.type !== 'square' || (r.w || r.r * 2) >= (r.h || r.r * 2);
        const dx = longX ? midAxis * 2 : 0;
        const dy = longX ? 0 : midAxis * 2;
        r.pillars.push({ cx: r.cx - dx, cy: r.cy - dy, radius: 28,
          tex: pick(['MARBLE3', 'GSTONE1', 'STONE6']) });
        r.pillars.push({ cx: r.cx + dx, cy: r.cy + dy, radius: 28,
          tex: pick(['MARBLE3', 'GSTONE1', 'STONE6']) });
      }
    } else if (r.feature === 'none') {
      if (minDim >= 1024) {
        const off = Math.floor(minDim / 5 / 32) * 32;
        r.pillars.push({ cx: r.cx - off, cy: r.cy - off, radius: 48 });
        r.pillars.push({ cx: r.cx + off, cy: r.cy - off, radius: 48 });
        r.pillars.push({ cx: r.cx - off, cy: r.cy + off, radius: 48 });
        r.pillars.push({ cx: r.cx + off, cy: r.cy + off, radius: 48 });
      } else if (minDim >= 640) {
        r.pillars.push({ cx: r.cx, cy: r.cy, radius: 40 });
      }
    } else if (minDim >= 1024 && r.type === 'square' &&
               r.feature !== 'courtyard' && r.feature !== 'lift' && r.feature !== 'ziggurat') {
      // Big square room with a central feature: two side pillars on the
      // room's longer axis, far enough out that they don't crowd the
      // feature ring. Skipped for self-managing yards (courtyard buildings,
      // lift platform, ziggurat stairs) whose own structures fill the floor.
      const longAxisX = r.w >= r.h;
      const off = Math.floor((longAxisX ? r.w : r.h) * 0.32 / 32) * 32;
      const innerRadius = TRIM_W * r.trimLayers + INNER_INSET;
      if (off - 48 > innerRadius + 64) {
        const dx = longAxisX ? off : 0;
        const dy = longAxisX ? 0 : off;
        r.pillars.push({ cx: r.cx - dx, cy: r.cy - dy, radius: 40 });
        r.pillars.push({ cx: r.cx + dx, cy: r.cy + dy, radius: 40 });
      }
    }
    // Industrial props — freestanding metal silos (tall narrow cylinders that
    // rise into the open sky) and storage tanks (low wide cylinders) scattered
    // across the open yard for set dressing and cover. Placed clear of the
    // buildings, terrain and the central spawn so they never trap the player.
    if ((r.feature === 'courtyard' || r.feature === 'cityblock') && r.buildings) {
      const sn = v => Math.round(v / 32) * 32;
      const lim = minDim / 2 - 112;
      const metalTex = ['METAL', 'SHAWN2', 'SILVER1', 'SUPPORT3', 'COMPSPAN'];
      const n = 2 + Math.floor(rand() * 4);
      const bHx = b => (b.halfX != null ? b.halfX : b.half);
      const bHy = b => (b.halfY != null ? b.halfY : b.half);
      for (let tries = 0; r.pillars.length < n && tries < 48; tries++) {
        const cx = sn(r.cx + (rand() * 2 - 1) * lim);
        const cy = sn(r.cy + (rand() * 2 - 1) * lim);
        const isSilo = rand() < 0.5;
        const radius = isSilo ? 32 + Math.floor(rand() * 2) * 16 : 48 + Math.floor(rand() * 3) * 16;
        const top = isSilo ? r.floorH + 160 + Math.floor(rand() * 4) * 16
                           : r.floorH + 56 + Math.floor(rand() * 3) * 16;
        const clr = radius + 56;
        if (Math.hypot(cx - r.cx, cy - r.cy) < clr + 112) continue;       // clear of spawn/plaza
        if (!r.buildings.every(b => Math.abs(cx - b.cx) >= bHx(b) + clr ||
                                    Math.abs(cy - b.cy) >= bHy(b) + clr)) continue;
        if (!(r.terrains || []).every(t => Math.abs(cx - t.cx) >= t.hw + clr ||
                                           Math.abs(cy - t.cy) >= t.hh + clr)) continue;
        if (!r.pillars.every(p => Math.hypot(cx - p.cx, cy - p.cy) >= p.radius + radius + 48)) continue;
        r.pillars.push({ cx, cy, radius, top, tex: pick(metalTex) });
      }
      // Streetlamps — thin lit poles scattered between buildings. Doom can't
      // actually emit point light from a pillar, but a glowing LITE/BROWN96
      // texture on a small pole reads convincingly as a lamp post and
      // animates the urban skyline at ground level.
      const lampTex = ['LITE5', 'LITE3', 'BROWN96', 'LITERED', 'LITEBLU4'];
      const nL = 2 + Math.floor(rand() * 3);
      let lamps = 0;
      for (let tries = 0; lamps < nL && tries < 40; tries++) {
        const cx = sn(r.cx + (rand() * 2 - 1) * lim);
        const cy = sn(r.cy + (rand() * 2 - 1) * lim);
        const radius = 16, clr = radius + 24;
        if (Math.hypot(cx - r.cx, cy - r.cy) < clr + 80) continue;
        if (!r.buildings.every(b => Math.abs(cx - b.cx) >= bHx(b) + clr ||
                                    Math.abs(cy - b.cy) >= bHy(b) + clr)) continue;
        if (!(r.terrains || []).every(t => Math.abs(cx - t.cx) >= t.hw + clr ||
                                           Math.abs(cy - t.cy) >= t.hh + clr)) continue;
        if (!r.pillars.every(p => Math.hypot(cx - p.cx, cy - p.cy) >= p.radius + radius + 32)) continue;
        const top = r.floorH + 96 + Math.floor(rand() * 3) * 8;
        r.pillars.push({ cx, cy, radius, top, tex: pick(lampTex), lamp: true });
        lamps++;
      }
    }
    // A pillar with floor == ceil == room ceiling reads as a solid
    // floor-to-ceiling column. A pillar with an explicit `top` (< ceil)
    // is a short raised block (open above) — e.g. plaza kiosks/planters.
    r.pillarSecIds = r.pillars.map((p) => allocSec({
      floorH: p.top != null ? p.top : r.ceilH, ceilH: r.ceilH,
      floorTex: r.palette.floor, ceilTex: r.palette.ceil,
      light: r.light, special: 0,
    }));
    // Wall alcoves — small outward niches on cardinal sides. Square rooms
    // only (octagon/hexagon flat-side spans are tight). Skip sides that
    // already host corridor attachments. Cap at 2 per room.
    r.alcoves = [];
    if (!r._fused && !flatYard && r.type === 'square' && r.w >= 384 && r.h >= 384) {
      const roomIdx = rooms.indexOf(r);
      const ALCOVE_W = 96, ALCOVE_D = 56, ALCOVE_MARGIN = 96;
      const sideHasCorridor = (side) => {
        for (const co of corridors) {
          if (co.orient === 'H' && co.wIdx === roomIdx && side === 'E') return true;
          if (co.orient === 'H' && co.eIdx === roomIdx && side === 'W') return true;
          if (co.orient === 'V' && co.sIdx === roomIdx && side === 'N') return true;
          if (co.orient === 'V' && co.nIdx === roomIdx && side === 'S') return true;
        }
        return false;
      };
      const sides = ['N', 'S', 'E', 'W'].filter(s => !sideHasCorridor(s));
      // Shuffle deterministically
      for (let i = sides.length - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [sides[i], sides[j]] = [sides[j], sides[i]];
      }
      const maxAlcoves = Math.min(2, sides.length);
      let placed = 0;
      for (const side of sides) {
        if (placed >= maxAlcoves) break;
        if (rand() > 0.55) continue;
        const isHoriz = side === 'N' || side === 'S';
        const edgeLen = isHoriz ? r.w : r.h;
        if (edgeLen < ALCOVE_W + ALCOVE_MARGIN * 2) continue;
        const halfW = r.w / 2, halfH = r.h / 2;
        let axisCoord, outwardSign;
        if (side === 'N') { axisCoord = r.cy + halfH; outwardSign = +1; }
        else if (side === 'S') { axisCoord = r.cy - halfH; outwardSign = -1; }
        else if (side === 'E') { axisCoord = r.cx + halfW; outwardSign = +1; }
        else { axisCoord = r.cx - halfW; outwardSign = -1; }
        const edgeStart = isHoriz ? (r.cx - halfW) : (r.cy - halfH);
        const edgeEnd = isHoriz ? (r.cx + halfW) : (r.cy + halfH);
        const slack = edgeLen - ALCOVE_MARGIN * 2 - ALCOVE_W;
        const center = edgeStart + ALCOVE_MARGIN + ALCOVE_W / 2 + Math.round((rand() * slack) / 8) * 8;
        const aLow = center - ALCOVE_W / 2;
        const aHigh = center + ALCOVE_W / 2;
        // Bbox of the alcove's protrusion — must not poke into any other
        // room or corridor.
        let albb;
        if (side === 'N') albb = { minX: aLow, maxX: aHigh, minY: axisCoord, maxY: axisCoord + ALCOVE_D };
        else if (side === 'S') albb = { minX: aLow, maxX: aHigh, minY: axisCoord - ALCOVE_D, maxY: axisCoord };
        else if (side === 'E') albb = { minX: axisCoord, maxX: axisCoord + ALCOVE_D, minY: aLow, maxY: aHigh };
        else albb = { minX: axisCoord - ALCOVE_D, maxX: axisCoord, minY: aLow, maxY: aHigh };
        if (rooms.some((o, oi) => oi !== roomIdx && bboxOverlap(roomBBox(o), albb, 16))) continue;
        if (corridors.some(co => bboxOverlap(co, albb, 16))) continue;
        // Shelf (raised) or nook (recessed). Shelves brighter, nooks dimmer.
        const isShelf = rand() < 0.6;
        const alcSec = allocSec({
          floorH: r.floorH + (isShelf ? 16 : -8),
          ceilH: isShelf ? r.ceilH : r.floorH + 96,
          floorTex: isShelf ? r.palette.accent : r.palette.trim,
          ceilTex: r.hasSky ? r.palette.ceil : r.palette.ceil,
          light: isShelf ? Math.min(255, r.light + 40) : Math.max(64, r.light - 40),
          special: 0,
        });
        r.alcoves.push({
          side, isHoriz, axisCoord, outwardSign,
          aLow, aHigh, depth: ALCOVE_D,
          sectorId: alcSec,
          wallTex: r.palette.wall,
          isShelf,
        });
        placed++;
      }
    }
  });

  // -------- 6b. teleporter pads --------
  // ShapeShifter teleporter connections: place a flush WR-97 pad in each
  // endpoint room and a type-14 destination thing on it. A pad is a small
  // flat sub-sector at the room floor (so it sits flush, no step) carved
  // into the open floor. Restricted to flat-floored rooms (trimLayers===0,
  // not fused, not ziggurat) so the pad's square loop never crosses a
  // concentric trim ring (which would produce invalid topology). The pad is
  // placed clear of the centre feature, pillars, buildings and lift.
  const padClear = (r, px, py, half) => {
    const m = 8;
    // fully inside the room (corners within an inset polygon clear of walls)
    const ip = roomPoly(r, 40);
    if (ip.length < 3) return false;
    for (const [dx, dy] of [[-half, -half], [half, -half], [half, half], [-half, half], [0, 0]]) {
      if (!pointInPolygon(px + dx, py + dy, ip)) return false;
    }
    // clear of the centre feature ring (trimLayers===0 → ring radius = INNER_INSET)
    if (r.feature !== 'none' && r.featureId) {
      if (Math.hypot(px - r.cx, py - r.cy) < INNER_INSET + half + m) return false;
    }
    // clear of pillars / planters
    for (const p of (r.pillars || [])) {
      if (Math.hypot(px - p.cx, py - p.cy) < p.radius + half + m) return false;
    }
    // clear of compound buildings (including their plinth base ring)
    for (const b of (r.buildings || [])) {
      const bh = b.half + (b.plinthW || 0);
      if (Math.abs(px - b.cx) < bh + half + m && Math.abs(py - b.cy) < bh + half + m) return false;
    }
    // clear of terrain (sunken basins / raised terraces)
    for (const t of (r.terrains || [])) {
      if (Math.abs(px - t.cx) < t.hw + half + m && Math.abs(py - t.cy) < t.hh + half + m) return false;
    }
    // clear of the lift platform
    if (r.lift && Math.abs(px - r.lift.cx) < r.lift.ph + half + m &&
        Math.abs(py - r.lift.cy) < r.lift.ph + half + m) return false;
    // clear of pads already placed in this room
    for (const q of teleportPads) {
      if (q.roomIdx !== rooms.indexOf(r)) continue;
      if (Math.abs(px - q.cx) < q.half + half + 32 && Math.abs(py - q.cy) < q.half + half + 32) return false;
    }
    return true;
  };
  // Grid-scan the open floor for a clear pad spot, preferring the cell
  // nearest the partner room so the pad faces the connection.
  const placePad = (r, towardX, towardY) => {
    if (r._fused || r.trimLayers !== 0 || r.feature === 'ziggurat') return null;
    const half = 40;
    const bb = roomBBox(r, 48);
    if (bb.maxX - bb.minX < 2 * half || bb.maxY - bb.minY < 2 * half) return null;
    let best = null, bestD = Infinity;
    for (let py = Math.ceil(bb.minY / 32) * 32; py <= bb.maxY; py += 32) {
      for (let px = Math.ceil(bb.minX / 32) * 32; px <= bb.maxX; px += 32) {
        if (!padClear(r, px, py, half)) continue;
        const d = Math.hypot(px - towardX, py - towardY);
        if (d < bestD) { bestD = d; best = { cx: px, cy: py, half }; }
      }
    }
    return best;
  };
  for (const tp of userTeleporters) {
    const ra = rooms[tp.a], rb = rooms[tp.b];
    if (!ra || !rb) continue;
    const padA = placePad(ra, rb.cx, rb.cy);
    const padB = placePad(rb, ra.cx, ra.cy);
    if (!padA || !padB) continue; // couldn't fit a pad in one of the rooms — skip
    const tagA = tagCounter++, tagB = tagCounter++;
    const padFloor = (r, pad, tag) => allocSec({
      floorH: r.floorH, ceilH: r.ceilH,
      floorTex: 'GATE1', ceilTex: r.palette.ceil,
      light: 255, special: 0, tag,
    });
    padA.padSecId = padFloor(ra, padA, tagA);
    padB.padSecId = padFloor(rb, padB, tagB);
    teleportPads.push({ roomIdx: tp.a, cx: padA.cx, cy: padA.cy, half: padA.half,
      padSecId: padA.padSecId, ownTag: tagA, destTag: tagB });
    teleportPads.push({ roomIdx: tp.b, cx: padB.cx, cy: padB.cy, half: padB.half,
      padSecId: padB.padSecId, ownTag: tagB, destTag: tagA });
  }

  // Corridors: floor = max of two rooms' floors, ceiling = floor + 96 (canon).
  // Light 32 below the brighter neighbour for that "darker corridor → bright
  // room" contrast (Romero's doorway-light-delta rule).
  corridors.forEach((co) => {
    const [ai, bi] = ends(co);
    const ra = rooms[ai], rb = rooms[bi];
    const fh = Math.max(ra.floorH, rb.floorH);
    const baseLight = Math.max(ra.light, rb.light);
    // Main corridor body — 72 tall so the DOOR1 panel image (64×72) fits
    // exactly with no vertical tiling and no UPPER_UNPEGGED slide.
    co.mainBodyId = allocSec({
      floorH: fh, ceilH: fh + 72,
      floorTex: 'FLOOR4_8', ceilTex: 'CEIL3_5',
      light: Math.max(96, baseLight - 48), special: 0,
    });
    // Two door body sectors, one at each end, 16 units thick. Closed state:
    // ceil = floor. Player triggers DR-1 on the corridor-side face; door
    // body's ceiling rises and the player can pass through to the room.
    co.doorAId = allocSec({
      floorH: fh, ceilH: fh,
      floorTex: ra.palette.floor, ceilTex: 'CEIL3_5',
      light: Math.max(80, baseLight - 64), special: 0,
    });
    co.doorBId = allocSec({
      floorH: fh, ceilH: fh,
      floorTex: rb.palette.floor, ceilTex: 'CEIL3_5',
      light: Math.max(80, baseLight - 64), special: 0,
    });
    // Header sectors: a 16-deep "lintel strip" inside each room at the
    // doorway. Ceiling = fh + 72 (NOT ra.floor + 72) — this guarantees
    // the door body opens to fh + 68 above its floor, giving the 56-tall
    // player full headroom regardless of room floor mismatch. The DOOR1
    // panel still fills exactly 72 units when floors match, and a clean
    // step when they don't.
    co.headerAId = allocSec({
      floorH: ra.floorH, ceilH: fh + 72,
      floorTex: ra.palette.floor,
      ceilTex: ra.palette.ceil,
      light: ra.light, special: 0,
    });
    co.headerBId = allocSec({
      floorH: rb.floorH, ceilH: fh + 72,
      floorTex: rb.palette.floor,
      ceilTex: rb.palette.ceil,
      light: rb.light, special: 0,
    });
  });

  // -------- 7. build geometry --------
  const vmap = new Map();
  const verts = [];
  const getV = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    const k = x + ',' + y;
    if (vmap.has(k)) return vmap.get(k);
    const id = 'v' + verts.length;
    vmap.set(k, id);
    verts.push({ id, x, y });
    return id;
  };
  const sidedefs = [];
  const linedefs = [];
  // O(1) lookups for the hot post-emit passes — IDs are 'vN'/'sdN'/'lN' with
  // N == array index, so we can slice the prefix instead of linear-scanning.
  const vById = (id) => verts[+id.slice(1)];
  const sdById = (id) => sidedefs[+id.slice(2)];
  // Vertex-pair -> linedef map. Replaces emitWall's linedefs.find() scan
  // (which was the quadratic killer on large fused levels — every wall
  // emit walked the entire growing linedef array looking for a duplicate).
  const lineByVerts = new Map();
  const vertKey = (a, b) => {
    const na = +a.slice(1), nb = +b.slice(1);
    return na < nb ? na + '|' + nb : nb + '|' + na;
  };
  const newSd = (sectorId, props = {}) => {
    const id = 'sd' + sidedefs.length;
    sidedefs.push({ id, xOff: 0, yOff: 0, upper: '-', lower: '-', middle: 'STARTAN2', sector: sectorId, ...props });
    return id;
  };
  function emitWall(x1, y1, x2, y2, sectorId, sharedSector, props = {}) {
    const v1 = getV(x1, y1), v2 = getV(x2, y2);
    if (v1 === v2) return null;
    const key = vertKey(v1, v2);
    const existing = lineByVerts.get(key);
    if (existing) {
      if (existing.back === -1) {
        existing.back = newSd(sectorId, { middle: '-', ...props.backSide });
        existing.flags = (existing.flags | 4) & ~1;
        // Seam: the existing wall used to be one-sided (a room's outer
        // wall) and we just attached a SECOND room's outer wall to its
        // back. Clear the front's wall-texture middle so the passage
        // reads as a clean opening instead of a glass-pane wall.
        const frontSd = sdById(existing.front);
        if (frontSd && frontSd.middle && frontSd.middle !== '-' &&
            frontSd.middle !== 'DOORTRAK' && frontSd.middle !== 'SW1EXIT') {
          frontSd.middle = '-';
        }
      }
      if (props.flags) existing.flags |= props.flags;
      return existing;
    }
    const middle = sharedSector ? '-' : (props.middle ?? 'STARTAN2');
    const front = newSd(sectorId, { middle, ...props.frontSide });
    const back = sharedSector ? newSd(sharedSector, { middle: '-', ...props.backSide }) : -1;
    const ld = {
      id: 'l' + linedefs.length,
      v1, v2,
      flags: (sharedSector ? 4 : 1) | (props.flags || 0),
      special: props.special || 0, tag: props.tag || 0, front, back,
    };
    linedefs.push(ld);
    lineByVerts.set(key, ld);
    return ld;
  }

  // Walk one outer edge, splitting at any corridor attachment that lies on
  // axis-aligned segments matching the corridor's direction.
  function emitOuterEdge(room, p1, p2) {
    const dx = p2.x - p1.x, dy = p2.y - p1.y;
    const isHoriz = Math.abs(dy) < 0.5;
    const isVert = Math.abs(dx) < 0.5;
    // Attachments on this edge: corridors that touch this room and whose
    // axis matches the edge's orientation, and whose attached cardinal side
    // matches the edge's position.
    const atts = [];
    for (const co of corridors) {
      let side = null, range = null, perp = null;
      if (co.orient === 'H' && co.wIdx === rooms.indexOf(room)) {
        side = 'E'; range = [co.minY, co.maxY]; perp = co.minX;
      } else if (co.orient === 'H' && co.eIdx === rooms.indexOf(room)) {
        side = 'W'; range = [co.minY, co.maxY]; perp = co.maxX;
      } else if (co.orient === 'V' && co.sIdx === rooms.indexOf(room)) {
        side = 'N'; range = [co.minX, co.maxX]; perp = co.minY;
      } else if (co.orient === 'V' && co.nIdx === rooms.indexOf(room)) {
        side = 'S'; range = [co.minX, co.maxX]; perp = co.maxY;
      }
      if (!side) continue;
      const edgeIsVert = isVert;
      const sideExpectsVert = side === 'E' || side === 'W';
      if (edgeIsVert !== sideExpectsVert) continue;
      // Edge position must match perp coordinate
      if (sideExpectsVert) {
        if (Math.abs(p1.x - perp) > 0.5) continue;
        const eMin = Math.min(p1.y, p2.y), eMax = Math.max(p1.y, p2.y);
        if (range[0] < eMin - 0.5 || range[1] > eMax + 0.5) continue;
      } else {
        if (Math.abs(p1.y - perp) > 0.5) continue;
        const eMin = Math.min(p1.x, p2.x), eMax = Math.max(p1.x, p2.x);
        if (range[0] < eMin - 0.5 || range[1] > eMax + 0.5) continue;
      }
      // For corridor doorways, the segment shares with the adjacent DOOR BODY
      // sector (not the corridor main body) so the door geometry frames the
      // opening cleanly. headerId is the lintel strip allocated inside the
      // room for this doorway.
      const isFirstRoom = (co.orient === 'H' ? co.wIdx : co.sIdx) === rooms.indexOf(room);
      const doorBodyId = isFirstRoom ? co.doorAId : co.doorBId;
      const headerId = isFirstRoom ? co.headerAId : co.headerBId;
      atts.push({ a: range[0], b: range[1], corridor: co, doorBodyId, headerId });
    }
    if (atts.length === 0) {
      // Optional alcove detour on this edge.
      let alcove = null;
      if (room.alcoves) {
        for (const a of room.alcoves) {
          if (a.isHoriz !== isHoriz) continue;
          if (isHoriz) {
            if (Math.abs(p1.y - a.axisCoord) > 0.5) continue;
            const eMin = Math.min(p1.x, p2.x), eMax = Math.max(p1.x, p2.x);
            if (a.aLow < eMin - 0.5 || a.aHigh > eMax + 0.5) continue;
          } else {
            if (Math.abs(p1.x - a.axisCoord) > 0.5) continue;
            const eMin = Math.min(p1.y, p2.y), eMax = Math.max(p1.y, p2.y);
            if (a.aLow < eMin - 0.5 || a.aHigh > eMax + 0.5) continue;
          }
          alcove = a;
          break;
        }
      }
      if (alcove) {
        const walkDir = isHoriz ? Math.sign(p2.x - p1.x) : Math.sign(p2.y - p1.y);
        const near = walkDir > 0 ? alcove.aLow : alcove.aHigh;
        const far = walkDir > 0 ? alcove.aHigh : alcove.aLow;
        const ortho = isHoriz ? p1.y : p1.x;
        const outOrtho = ortho + alcove.outwardSign * alcove.depth;
        const A1 = isHoriz ? { x: near, y: ortho } : { x: ortho, y: near };
        const A2 = isHoriz ? { x: far, y: ortho } : { x: ortho, y: far };
        const B1 = isHoriz ? { x: near, y: outOrtho } : { x: outOrtho, y: near };
        const B2 = isHoriz ? { x: far, y: outOrtho } : { x: outOrtho, y: far };
        // 1. p1 → A1: straight wall (room outer, void).
        if (Math.abs((isHoriz ? p1.x : p1.y) - near) > 0.5) {
          emitWall(p1.x, p1.y, A1.x, A1.y, room.outerId, null, { middle: room.palette.wall });
        }
        // 2. A1 → B1: outward side wall (alcove, void). Front = alcove.
        emitWall(A1.x, A1.y, B1.x, B1.y, alcove.sectorId, null, { middle: alcove.wallTex });
        // 3. B1 → B2: far wall (alcove, void).
        emitWall(B1.x, B1.y, B2.x, B2.y, alcove.sectorId, null, { middle: alcove.wallTex });
        // 4. B2 → A2: inward side wall (alcove, void).
        emitWall(B2.x, B2.y, A2.x, A2.y, alcove.sectorId, null, { middle: alcove.wallTex });
        // 5. A1 → A2: 2-sided opening, front = room outer (interior), back = alcove.
        //    LOWER_UNPEGGED so step textures don't slide.
        emitWall(A1.x, A1.y, A2.x, A2.y, room.outerId, alcove.sectorId, { flags: 16 });
        // 6. A2 → p2: straight wall continuation.
        if (Math.abs((isHoriz ? p2.x : p2.y) - far) > 0.5) {
          emitWall(A2.x, A2.y, p2.x, p2.y, room.outerId, null, { middle: room.palette.wall });
        }
        return;
      }
      emitWall(p1.x, p1.y, p2.x, p2.y, room.outerId, null, { middle: room.palette.wall });
      return;
    }
    const walkDir = isHoriz ? Math.sign(dx) : Math.sign(dy);
    atts.sort((u, v) => (u.a - v.a) * walkDir);
    let cur = isHoriz ? p1.x : p1.y;
    const ortho = isHoriz ? p1.y : p1.x;
    const end = isHoriz ? p2.x : p2.y;
    for (const att of atts) {
      const near = walkDir > 0 ? att.a : att.b;
      const far = walkDir > 0 ? att.b : att.a;
      if (Math.abs(cur - near) > 0.5) {
        if (isHoriz) emitWall(cur, ortho, near, ortho, room.outerId, null, { middle: room.palette.wall });
        else emitWall(ortho, cur, ortho, near, room.outerId, null, { middle: room.palette.wall });
      }
      // Header strip — a 16-deep lintel sub-sector inside the room at the
      // doorway position. Its 3 inner walls form a U from outerId into
      // header (outerId on outside, header on inside); the doorway segment
      // is now header ↔ doorBody, which caps the DOOR3 panel at 96 tall.
      const HEADER_DEPTH = 16;
      // Inward direction: right of v1→v2 (CW walk = room interior on right).
      const inX = isHoriz ? 0 : Math.sign(dy);
      const inY = isHoriz ? -Math.sign(dx) : 0;
      const A1x = isHoriz ? near : ortho;
      const A1y = isHoriz ? ortho : near;
      const A2x = isHoriz ? far  : ortho;
      const A2y = isHoriz ? ortho : far;
      const B1x = A1x + inX * HEADER_DEPTH;
      const B1y = A1y + inY * HEADER_DEPTH;
      const B2x = A2x + inX * HEADER_DEPTH;
      const B2y = A2y + inY * HEADER_DEPTH;
      // U lines (outerId | header). Walking each so outerId is the right
      // side of v1→v2 — that places outerId outside the header rectangle.
      emitWall(A1x, A1y, B1x, B1y, room.outerId, att.headerId);
      emitWall(B1x, B1y, B2x, B2y, room.outerId, att.headerId);
      emitWall(B2x, B2y, A2x, A2y, room.outerId, att.headerId);
      // Doorway segment: header ↔ doorBody. The DOOR3 panel spans the
      // header's 96-tall ceiling so the door image is proportional.
      emitWall(A1x, A1y, A2x, A2y, att.headerId, att.doorBodyId, { flags: 16 });
      cur = far;
    }
    if (Math.abs(cur - end) > 0.5) {
      if (isHoriz) emitWall(cur, ortho, end, ortho, room.outerId, null, { middle: room.palette.wall });
      else emitWall(ortho, cur, ortho, end, room.outerId, null, { middle: room.palette.wall });
    }
  }

  // Decide which fused-room buildings can keep their CRISP precise facade
  // (door bay, windows, parapet) vs collapse to a rasterized block. A
  // building is "precise" when its 32-aligned footprint (plus a small margin)
  // lies wholly inside its own room AND no later-placed room in the same
  // fused group overlaps it (later rooms win those grid cells). Precise
  // buildings get a clean punched hole in the fusion grid that their plinth
  // wall abuts exactly; the rest are rasterized.
  {
    const groupOf = new Map();
    for (const group of fusedGroups) {
      const arr = [...group].sort((a, b) => a - b);
      for (const idx of arr) groupOf.set(idx, arr);
    }
    rooms.forEach((room, ri) => {
      if (!room._fused || !room.buildings) return;
      const later = (groupOf.get(ri) || [ri]).filter(j => j > ri);
      const myPoly = roomPoly(room);
      const laterPolys = later.map(j => roomPoly(rooms[j]));
      for (const b of room.buildings) {
        // Sample at exactly the 32-grid cell centers the rasterizer would
        // test — anything coarser misses thin overlap strips and lets a
        // building flip to PRECISE even when some of its cells will
        // actually belong to another fused room, which strands the
        // precise emit's outer walls referencing the wrong neighbour and
        // leaves slab fragments after node-build.
        const Hx = (b.enterable ? b.halfX : b.halfX + b.plinthW);
        const Hy = (b.enterable ? b.halfY : b.halfY + b.plinthW);
        let clear = true;
        for (let py = b.cy - Hy + 16; py < b.cy + Hy && clear; py += 32) {
          for (let px = b.cx - Hx + 16; px < b.cx + Hx && clear; px += 32) {
            if (!pointInPolygon(px, py, myPoly)) clear = false;
            else if (laterPolys.some(p => pointInPolygon(px, py, p))) clear = false;
          }
        }
        b._fusedPrecise = clear;
      }
    });
  }

  // For each room: outer polygon CW walk (with corridor cuts), then one ring
  // per trim layer (CCW walk around the inset polygon, layer-N-1 on front,
  // layer-N on back), then optional centre feature ring.
  rooms.forEach((room, roomIdx) => {
    const layerIds = [room.outerId, ...room.trimIds];
    if (!room._fused) {
      // Non-fused: emit the smooth polygon perimeter + concentric trim.
      const outerCCW = roomPoly(room);
      const outerCW = outerCCW.slice().reverse();
      for (let i = 0; i < outerCW.length; i++) {
        emitOuterEdge(room, outerCW[i], outerCW[(i + 1) % outerCW.length]);
      }
      for (let layer = 1; layer <= room.trimLayers; layer++) {
        const ringPoly = roomPoly(room, TRIM_W * layer);
        if (ringPoly.length < 3) break;
        for (let j = 0; j < ringPoly.length; j++) {
          const p1 = ringPoly[j], p2 = ringPoly[(j + 1) % ringPoly.length];
          emitWall(p1.x, p1.y, p2.x, p2.y, layerIds[layer - 1], layerIds[layer]);
        }
      }
    }
    // Non-fused rooms emit their centre feature + smooth octagon pillars.
    // Fused rooms get their pillars rasterized into the grid pass instead.
    if (!room._fused && room.feature !== 'none' && room.featureId) {
      const ringPoly = roomPoly(room, TRIM_W * room.trimLayers + INNER_INSET);
      if (ringPoly.length >= 3) {
        const innerMost = layerIds[layerIds.length - 1];
        for (let j = 0; j < ringPoly.length; j++) {
          const p1 = ringPoly[j], p2 = ringPoly[(j + 1) % ringPoly.length];
          emitWall(p1.x, p1.y, p2.x, p2.y, innerMost, room.featureId);
        }
      }
    }
    if (!room._fused && room.pillars && room.pillars.length) {
      const defaultEnclosing = layerIds[layerIds.length - 1];
      for (let k = 0; k < room.pillars.length; k++) {
        const p = room.pillars[k];
        const pillarSecId = room.pillarSecIds[k];
        const pillarPoly = octagonPoly(p.cx, p.cy, p.radius);
        // Optional explicit face texture (e.g. crate blocks); otherwise the
        // resolve pass picks a step/wall texture from the height delta.
        const props = p.tex ? { frontSide: { lower: p.tex } } : {};
        // Optional enclosing-sector override — a pillar geometrically inside
        // a centre feature (a temple column rising from a lake pool, a
        // stepping stone on the water) is enclosed by the FEATURE sector,
        // not the surrounding trim ring, so its riser texture and the floor
        // around it read against the right neighbour.
        const enclosing = p.enclosingId || defaultEnclosing;
        for (let j = 0; j < pillarPoly.length; j++) {
          const q1 = pillarPoly[j], q2 = pillarPoly[(j + 1) % pillarPoly.length];
          emitWall(q1.x, q1.y, q2.x, q2.y, enclosing, pillarSecId, props);
        }
      }
    }
    // Teleporter pads — a flush GATE-floor square carved into the room. Its
    // boundary lines are two-sided (passable) WR-97 teleport triggers whose
    // front side faces the room: walking ONTO the pad fires the teleport to
    // the partner pad's destination (destTag), while arriving from a teleport
    // (landing on the back side) and walking off does not re-trigger.
    for (const pad of teleportPads) {
      if (pad.roomIdx !== roomIdx) continue;
      const poly = squarePoly(pad.cx, pad.cy, pad.half * 2, pad.half * 2);
      for (let j = 0; j < poly.length; j++) {
        const q1 = poly[j], q2 = poly[(j + 1) % poly.length];
        emitWall(q1.x, q1.y, q2.x, q2.y, room.outerId, pad.padSecId,
          { special: 97, tag: pad.destTag });
      }
    }
    // Terrain — sunken basins / raised terraces stamped into a flat yard.
    // Two-sided flush borders; the resolve pass paints STEP risers on the
    // lower side, and the (sky) ceiling carries over unchanged. A terrain
    // NESTED inside another terrain (e.g. Designer ziggurat tiers) is
    // enclosed by the smallest containing terrain's sector, not the room
    // floor — otherwise its border would claim the wrong outside sector
    // and break the loop topology.
    const roomTerrains = !room._fused && room.terrains ? room.terrains : [];
    for (const t of roomTerrains) {
      let enclosing = room.outerId, enclosingArea = Infinity;
      for (const o of roomTerrains) {
        if (o === t) continue;
        const contains = (t.cx - t.hw) >= (o.cx - o.hw) && (t.cx + t.hw) <= (o.cx + o.hw) &&
                         (t.cy - t.hh) >= (o.cy - o.hh) && (t.cy + t.hh) <= (o.cy + o.hh);
        const area = o.hw * o.hh;
        // Strictly larger only — identical twins are user error, not nesting.
        if (contains && area > t.hw * t.hh && area < enclosingArea) {
          enclosing = o.secId; enclosingArea = area;
        }
      }
      const poly = squarePoly(t.cx, t.cy, t.hw * 2, t.hh * 2);
      for (let j = 0; j < poly.length; j++) {
        const q1 = poly[j], q2 = poly[(j + 1) % poly.length];
        emitWall(q1.x, q1.y, q2.x, q2.y, enclosing, t.secId);
      }
    }
    // Courtyard compound — each building is a SOLID skyline structure built
    // from three concentric height bands, all open to sky above:
    //   • a raised PLINTH base ring the building stands on (also the floor of
    //     the recessed entrance),
    //   • the WALL ring rising to the roofline (facade: a recessed door bay on
    //     the south, lit window strips on E/W),
    //   • a PARAPET cap lip around a slightly recessed flat ROOF centre.
    // Every band's ceiling is sky, so there are no sky/non-sky upper seams.
    for (const b of (room.buildings || [])) {
      if (room._fused && !b._fusedPrecise) continue;
      // Enterable warehouse: a solid wall-slab frame (court↔slab, facade as a
      // LOWER texture) wrapping a hollow interior, with a door throat notched
      // into the interior on the south so the player walks straight in.
      if (b.enterable) {
        const court = room.outerId, slab = b.slabSec, intr = b.intSec, throat = b.throatSec;
        const fac = b.wall, iw = b.intWall, T = 24;
        // Door width scales with the building: 96 for the standard warehouse,
        // smaller for narrower city-block shops so the door doesn't eat the
        // whole south face.
        const ehd = Math.min(64, Math.max(40, b.halfX - 48));
        const cx = b.cx, cy = b.cy;
        const oW = cx - b.halfX, oE = cx + b.halfX, oS = cy - b.halfY, oN = cy + b.halfY;
        const iW = oW + T, iE = oE - T, iS = oS + T, iN = oN - T;
        const dL = cx - ehd, dR = cx + ehd;
        const loF = { frontSide: { lower: fac } };   // facade (court sees slab rise)
        const loI = { frontSide: { lower: iw } };    // interior wall
        // OUTER facade ring (court → slab), door gap on south.
        emitWall(oW, oS, dL, oS, court, slab, loF);
        emitWall(dR, oS, oE, oS, court, slab, loF);
        emitWall(oE, oS, oE, oN, court, slab, loF);
        emitWall(oE, oN, oW, oN, court, slab, loF);
        emitWall(oW, oN, oW, oS, court, slab, loF);
        // DOOR OPENING — court → throat (passable). The throat's low ceiling
        // (door-height) makes the upper above the entry read as the LINTEL,
        // which carries the building's own facade texture so the door reads
        // as a recessed cut in the wall rather than a tall portal.
        emitWall(dL, oS, dR, oS, court, throat, { frontSide: { upper: fac } });
        // THROAT side jambs (throat ↔ slab on E/W of the door). DOORTRAK
        // gives the cross-hatched frame, LOWER_UNPEGGED (flag 16) anchors
        // the track at the floor so it doesn't slide.
        const trim = { frontSide: { lower: 'DOORTRAK' }, flags: 16 };
        emitWall(dL, oS, dL, iS, throat, slab, trim);
        emitWall(dR, iS, dR, oS, throat, slab, trim);
        // THROAT back wall (throat → interior, passable). Small header trim
        // shows from the throat ceiling up to the taller interior ceiling.
        emitWall(dL, iS, dR, iS, throat, intr, { backSide: { upper: 'BROWN96' } });
        // Interior south walls split by the door throat, then the rest of
        // the interior ring (E / N / W). All wound so the FRONT sidedef
        // (which carries the interior-wall texture in loI) is on the
        // geometric interior side of each line — node-builders use this
        // to assign subsectors, so wrong winding inside a fused-precise
        // building can sink the camera subsector into the closed SLAB
        // (sky-ceiling) and bleed sky through the walls.
        if (b.multiRoom) {
          // Office layout: a 24-thick PARTITION runs east-west through the
          // interior at y=cy with a 96-wide DOORWAY gap in the centre. The
          // front room (south of the partition) holds the door throat; the
          // back room sits north of the partition. Partition wings are part
          // of the existing slab sector (so we don't allocate a new sector
          // for the wall) — only the doorway gets its own header sector.
          const back = b.backRoomSec, door = b.doorwaySec;
          const partS = cy - 12, partN = cy + 12;
          const dW = cx - 48, dE = cx + 48;
          const upI = { frontSide: { upper: iw } };
          const upIB = { backSide: { upper: iw } };
          // Front-room ring (intr south of partition).
          emitWall(dL, iS, iW, iS, intr, slab, loI);     // S, west of throat
          emitWall(iE, iS, dR, iS, intr, slab, loI);     // S, east of throat
          emitWall(iE, partS, iE, iS, intr, slab, loI);  // E (up to partition)
          emitWall(iW, iS, iW, partS, intr, slab, loI);  // W (up to partition)
          // Partition: 2 slab wings + a doorway header sector in the middle.
          emitWall(iW, partS, dW, partS, intr, slab, loI);   // wing W (intr↔slab)
          emitWall(dE, partS, iE, partS, intr, slab, loI);   // wing E (intr↔slab)
          emitWall(dW, partS, dE, partS, intr, door, upI);   // door south face — lintel upper on intr side
          emitWall(dE, partN, dE, partS, door, slab, loI);   // door east jamb
          emitWall(dW, partS, dW, partN, door, slab, loI);   // door west jamb
          emitWall(dW, partN, dE, partN, door, back, upIB);  // door north face — lintel upper on back side
          // Back-room ring (back north of partition).
          emitWall(dW, partN, iW, partN, back, slab, loI);   // partition wing W (back↔slab)
          emitWall(iE, partN, dE, partN, back, slab, loI);   // partition wing E (back↔slab)
          emitWall(iW, iN, iE, iN, back, slab, loI);         // N (east: right=S=back)
          emitWall(iE, iN, iE, partN, back, slab, loI);      // E (south: right=W=back)
          emitWall(iW, partN, iW, iN, back, slab, loI);      // W (north: right=E=back)
        } else {
          emitWall(dL, iS, iW, iS, intr, slab, loI);   // S, west of throat (west: right=N=intr)
          emitWall(iE, iS, dR, iS, intr, slab, loI);   // S, east of throat
          emitWall(iE, iN, iE, iS, intr, slab, loI);   // E (south: right=W=intr)
          emitWall(iW, iN, iE, iN, intr, slab, loI);   // N (east: right=S=intr)
          emitWall(iW, iS, iW, iN, intr, slab, loI);   // W (north: right=E=intr)
        }
        // Optional working LIFT + raised MEZZANINE inside the interior. The
        // lift sits on the interior floor as a 64-wide closed-state platform
        // at mezzanine height; pressing the SW1BRCOM switch on its player-
        // facing south wall fires SR-62 (Lower Lift, Wait, Raise). Riding the
        // lift up deposits the player onto the mezzanine north of the lift —
        // a small office-style upper deck inset against the slab walls.
        if (b.hasLift) {
          const lift = b.liftSec, mezz = b.mezzSec;
          const lHx = 32, lHy = 32, mHx = 48, mHy = 32;
          const lCy = cy - 16, mCy = lCy + lHy + mHy;
          const lW = cx - lHx, lE = cx + lHx, lS = lCy - lHy, lN = lCy + lHy;
          const mW = cx - mHx, mE = cx + mHx, mS = mCy - mHy, mN = mCy + mHy;
          const stepLo = { frontSide: { lower: iw } };
          // Lift box (intr ↔ lift). All four sides are 96-tall risers when
          // the lift is up; the SOUTH side carries the SR-62 + switch.
          emitWall(lW, lS, lE, lS, intr, lift,
            { frontSide: { lower: 'SW1BRCOM' }, special: 62, tag: b.liftTag });
          emitWall(lE, lS, lE, lN, intr, lift, stepLo);
          emitWall(lW, lN, lW, lS, intr, lift, stepLo);
          // Lift NORTH face — between lift and mezzanine. Same floor (mezz
          // height) so it's a passable seam the player steps across.
          emitWall(lE, lN, lW, lN, mezz, lift, {});
          // Mezzanine ring against the interior (E / N / W + the south wings
          // that flank the lift). The wider mezz (48 vs lift's 32 half) means
          // 16-unit wings poke south past the lift on each side.
          emitWall(lE, mS, mE, mS, intr, mezz, stepLo);
          emitWall(mE, mS, mE, mN, intr, mezz, stepLo);
          emitWall(mE, mN, mW, mN, intr, mezz, stepLo);
          emitWall(mW, mN, mW, mS, intr, mezz, stepLo);
          emitWall(mW, mS, lW, mS, intr, mezz, stepLo);
        }
        continue;
      }
      const bx = b.cx, by = b.cy, hd = b.door / 2, hw = b.win / 2;
      const Bhx = b.halfX != null ? b.halfX : b.half;
      const Bhy = b.halfY != null ? b.halfY : b.half;
      const court = room.outerId, plinth = b.plinthSec, cap = b.capSec, roof = b.roofSec;
      const PD = b.porchDepth;
      const IBhx = Bhx - b.parapetW, IBhy = Bhy - b.parapetW;
      const oS = by - Bhy, oN = by + Bhy, oW = bx - Bhx, oE = bx + Bhx;
      const pS = by - (Bhy + b.plinthW), pN = by + (Bhy + b.plinthW);
      const pW = bx - (Bhx + b.plinthW), pE = bx + (Bhx + b.plinthW);
      const rN = oS + PD; // recessed-entrance back edge
      const wallTex = b.wall;
      const lo = tex => ({ frontSide: { lower: tex } });
      // PLINTH base ring (court → plinth), a 12-unit step up onto the podium.
      emitWall(pW, pS, pE, pS, court, plinth, lo(wallTex)); // S
      emitWall(pE, pS, pE, pN, court, plinth, lo(wallTex)); // E
      emitWall(pE, pN, pW, pN, court, plinth, lo(wallTex)); // N
      emitWall(pW, pN, pW, pS, court, plinth, lo(wallTex)); // W
      // WALL ring (plinth → cap). South face is continuous now — the bay
      // is its OWN low-ceilinged sub-sector carved out of the building's
      // wall ring (not a gap in plinth as before), bordered by plinth on
      // its south face (passable, same floor) and by cap on E / W / back.
      // The lintel above the porch shows on the plinth side of the seam.
      const bay = b.bayShelterSec;
      emitWall(oW, oS, bx - hd, oS, plinth, cap, lo(wallTex));   // S left of bay
      emitWall(bx + hd, oS, oE, oS, plinth, cap, lo(wallTex));   // S right of bay
      // Porch entry — plinth → bay (passable seam, same floor). The upper
      // above the bay's 128-tall ceiling shows the wall texture on the
      // plinth side, reading as the porch overhang from the court.
      emitWall(bx - hd, oS, bx + hd, oS, plinth, bay, { frontSide: { upper: wallTex } });
      // Bay E/W jambs + back panel — bay shelter ↔ cap. Door image stops
      // cleanly at the 128-tall bay ceiling instead of stretching to capH.
      emitWall(bx - hd, oS, bx - hd, rN, bay, cap, lo(wallTex)); // bay W jamb
      emitWall(bx - hd, rN, bx + hd, rN, bay, cap, lo(b.doorTex)); // bay back (door)
      emitWall(bx + hd, rN, bx + hd, oS, bay, cap, lo(wallTex)); // bay E jamb
      emitWall(oE, oS, oE, by - hw, plinth, cap, lo(wallTex));   // E below window
      emitWall(oE, by - hw, oE, by + hw, plinth, cap, lo(b.winTex)); // E window
      emitWall(oE, by + hw, oE, oN, plinth, cap, lo(wallTex));   // E above window
      emitWall(oE, oN, oW, oN, plinth, cap, lo(wallTex));        // N
      emitWall(oW, oN, oW, by + hw, plinth, cap, lo(wallTex));   // W above window
      emitWall(oW, by + hw, oW, by - hw, plinth, cap, lo(b.winTex)); // W window
      emitWall(oW, by - hw, oW, oS, plinth, cap, lo(wallTex));   // W below window
      // PARAPET cap → recessed ROOF centre: a raised lip ring around the roof.
      if (IBhx >= 32 && IBhy >= 32) {
        const rp = squarePoly(bx, by, IBhx * 2, IBhy * 2);
        for (let j = 0; j < rp.length; j++) {
          const q1 = rp[j], q2 = rp[(j + 1) % rp.length];
          emitWall(q1.x, q1.y, q2.x, q2.y, cap, roof, { backSide: { lower: b.capTex } });
        }
      }
      // SKYSCRAPER TIERS — concentric wedding-cake setbacks rising from the
      // roof centre. Each ring sits between the previous tier (outside) and
      // the next (inside); the facade texture continues up the risers.
      let topTierSec = roof;
      for (const tr of (b.tiers || [])) {
        const tp = squarePoly(bx, by, tr.half * 2, tr.half * 2);
        for (let j = 0; j < tp.length; j++) {
          const q1 = tp[j], q2 = tp[(j + 1) % tp.length];
          emitWall(q1.x, q1.y, q2.x, q2.y, topTierSec, tr.sec, { frontSide: { lower: b.wall } });
        }
        topTierSec = tr.sec;
      }
      // ROOFTOP UNITS — solid tank / AC / antenna blocks standing on the roof
      // centre. Towers get a tall thin antenna alongside the main housing; a
      // skyscraper spire stands on the TOP TIER instead of the roof band.
      for (const u of (b.roofUnits || [])) {
        const enclosing = u.enc === 'topTier' ? topTierSec : roof;
        const up = squarePoly(u.cx, u.cy, u.half * 2, u.half * 2);
        for (let j = 0; j < up.length; j++) {
          const q1 = up[j], q2 = up[(j + 1) % up.length];
          emitWall(q1.x, q1.y, q2.x, q2.y, enclosing, u.sec, { frontSide: { lower: u.tex } });
        }
      }
    }
    // Ziggurat — concentric rising stair rings. Same CCW-inset walk as the
    // trim rings; front = outer (lower) ring, back = inner (higher) ring,
    // so the resolve pass puts the step face on the lower side.
    if (!room._fused && room.feature === 'ziggurat' && room.stairIds) {
      const layers = [room.outerId, ...room.stairIds];
      for (let i = 1; i <= room.stairCount; i++) {
        const ringPoly = roomPoly(room, room.stairW * i);
        if (ringPoly.length < 3) break;
        for (let j = 0; j < ringPoly.length; j++) {
          const p1 = ringPoly[j], p2 = ringPoly[(j + 1) % ringPoly.length];
          emitWall(p1.x, p1.y, p2.x, p2.y, layers[i - 1], layers[i]);
        }
      }
    }
    // Lift — a +96 vantage platform with a working SR lift on its south
    // edge. Platform walls are 2-sided steps (too tall to climb); the lift
    // strip rides the player up when its south face (special 62) is used.
    if (!room._fused && room.lift) {
      const L = room.lift, lx = L.cx, ly = L.cy, P = L.ph, hl = L.lift / 2;
      const out = room.outerId, plat = room.liftPlatformId, lif = room.liftSectorId;
      const pS = ly - P, pN = ly + P, pW = lx - P, pE = lx + P;
      const lS = pS - L.lift; // lift strip south edge
      // Platform ring (front = main floor, 2-sided steps), south split for lift.
      emitWall(pE, pN, pW, pN, out, plat); // N
      emitWall(pW, pN, pW, pS, out, plat); // W
      emitWall(pE, pS, pE, pN, out, plat); // E
      emitWall(pW, pS, lx - hl, pS, out, plat); // S left of lift
      emitWall(lx + hl, pS, pE, pS, out, plat); // S right of lift
      // Lift strip — north edge opens onto the platform (same height).
      emitWall(lx + hl, pS, lx - hl, pS, plat, lif);
      // Side walls (2-sided steps to main floor).
      emitWall(lx + hl, lS, lx + hl, pS, out, lif); // east
      emitWall(lx - hl, pS, lx - hl, lS, out, lif); // west
      // South face — the activator: SR Lift (62) on this room's lift tag.
      emitWall(lx - hl, lS, lx + hl, lS, out, lif, { special: 62, tag: room.liftTag });
    }
  });

  // Preferred riser (lower) texture for rasterized fused-grid sectors — e.g.
  // a building silhouette gets its facade texture instead of a generic step.
  // Consumed by the resolve pass (8b).
  const gridRiserTex = new Map();

  // Corridor door attachments on FUSED rooms. The non-fused emitOuterEdge
  // path cuts the room wall and inserts a header→doorBody chain at every
  // corridor attachment — but it's gated `!room._fused`, so a corridor
  // hooked to a room that became fused (e.g. because another room is nested
  // inside it) loses its door at that end. The grid pass below uses these
  // maps to (a) replace the edge cell at each attachment with the
  // corridor's HEADER sector — capping the door upper at 72 so the DOOR1
  // panel fits exactly instead of tiling up the much taller interior wall
  // — and (b) replace the header cell's void-facing wall with a passable
  // wall straight to the corridor's doorBody. The DR-1 resolve pass then
  // upgrades that wall to a real door.
  const outerIdToRoomIdx = new Map();
  rooms.forEach((r, i) => { outerIdToRoomIdx.set(r.outerId, i); });
  const fusedDoorAtts = new Map();  // roomIdx -> [{ side, coord, rMin, rMax, body, header }]
  const headerToDoorBody = new Map(); // headerSecId -> doorBodyId
  for (const co of corridors) {
    const isH = co.orient === 'H';
    const ends = isH
      ? [[co.wIdx, 'E', co.minX, co.headerAId, co.doorAId],
         [co.eIdx, 'W', co.maxX, co.headerBId, co.doorBId]]
      : [[co.sIdx, 'N', co.minY, co.headerAId, co.doorAId],
         [co.nIdx, 'S', co.maxY, co.headerBId, co.doorBId]];
    for (const [ri, side, coord, header, body] of ends) {
      if (ri == null || !rooms[ri] || !rooms[ri]._fused) continue;
      if (!fusedDoorAtts.has(ri)) fusedDoorAtts.set(ri, []);
      fusedDoorAtts.get(ri).push({
        side, coord,
        rMin: isH ? co.minY : co.minX,
        rMax: isH ? co.maxY : co.maxX,
        body, header,
      });
      headerToDoorBody.set(header, body);
    }
  }
  // Given a cell at (gx,gy) in a grid with origin (minX,minY) and 32-unit
  // cells, sector `here`, and an edge direction, return the doorBodyId if
  // the cell's edge sits exactly on a fused-room corridor attachment range.
  const fusedDoorAt = (here, dir, xMin, yMin, xMax, yMax, minX, minY) => {
    const ri = outerIdToRoomIdx.get(here);
    if (ri == null) return null;
    const atts = fusedDoorAtts.get(ri);
    if (!atts) return null;
    for (const a of atts) {
      if (a.side !== dir) continue;
      if (dir === 'E' && Math.abs(a.coord - xMax) > 0.5) continue;
      if (dir === 'W' && Math.abs(a.coord - xMin) > 0.5) continue;
      if (dir === 'N' && Math.abs(a.coord - yMax) > 0.5) continue;
      if (dir === 'S' && Math.abs(a.coord - yMin) > 0.5) continue;
      const eMin = (dir === 'E' || dir === 'W') ? yMin : xMin;
      const eMax = (dir === 'E' || dir === 'W') ? yMax : xMax;
      // The cell wall is 32 wide; require it to lie entirely inside the
      // attachment range (corridor doorways are 32-aligned).
      if (eMin < a.rMin - 0.5 || eMax > a.rMax + 0.5) continue;
      return a.body;
    }
    return null;
  };

  // -------- 7a. Grid-based emit for fused groups --------
  // Each fused group is rasterized to a 32-unit grid; each cell is assigned
  // to the LATEST-placed room whose polygon contains it. Cells of the same
  // room form one sector (the existing outerId); cell-cell boundaries
  // between DIFFERENT rooms become two-sided passable lines; cell-void
  // boundaries become one-sided walls. This produces a single non-
  // overlapping multi-sector compound region — the proper Doom CSG.
  for (const group of fusedGroups) {
    const groupArr = [...group].sort((a, b) => a - b);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const idx of groupArr) {
      const bb = roomBBox(rooms[idx]);
      if (bb.minX < minX) minX = bb.minX;
      if (bb.maxX > maxX) maxX = bb.maxX;
      if (bb.minY < minY) minY = bb.minY;
      if (bb.maxY > maxY) maxY = bb.maxY;
    }
    const CELL = 32;
    minX = Math.floor(minX / CELL) * CELL - CELL;
    minY = Math.floor(minY / CELL) * CELL - CELL;
    maxX = Math.ceil(maxX / CELL) * CELL + CELL;
    maxY = Math.ceil(maxY / CELL) * CELL + CELL;
    const W = Math.ceil((maxX - minX) / CELL);
    const H = Math.ceil((maxY - minY) / CELL);
    // Cells store the SECTOR id (room outer, pillar, or null=void) plus the
    // wall texture for one-sided emit.
    const cellSec = new Array(W * H).fill(null);
    const cellTex = new Array(W * H).fill('STARTAN2');
    const polysByIdx = new Map();
    for (const idx of groupArr) polysByIdx.set(idx, roomPoly(rooms[idx]));
    for (let gy = 0; gy < H; gy++) {
      for (let gx = 0; gx < W; gx++) {
        const cx = minX + (gx + 0.5) * CELL;
        const cy = minY + (gy + 0.5) * CELL;
        for (let i = groupArr.length - 1; i >= 0; i--) {
          const idx = groupArr[i];
          if (pointInPolygon(cx, cy, polysByIdx.get(idx))) {
            cellSec[gy * W + gx] = rooms[idx].outerId;
            cellTex[gy * W + gx] = rooms[idx].palette.wall;
            break;
          }
        }
      }
    }
    // Overlay terrain islands (sunken channels/basins, raised terraces) —
    // cells inside a terrain patch that still belong to the room's floor
    // become that terrain's sector, so fused canals/plazas keep their
    // waterways and platforms. The grid wall pass below paints the risers.
    for (const idx of groupArr) {
      const room = rooms[idx];
      if (!room.terrains || !room.terrains.length) continue;
      for (const t of room.terrains) {
        for (let gy = 0; gy < H; gy++) {
          for (let gx = 0; gx < W; gx++) {
            if (cellSec[gy * W + gx] !== room.outerId) continue;
            const cx = minX + (gx + 0.5) * CELL;
            const cy = minY + (gy + 0.5) * CELL;
            if (Math.abs(cx - t.cx) < t.hw && Math.abs(cy - t.cy) < t.hh) {
              cellSec[gy * W + gx] = t.secId;
              cellTex[gy * W + gx] = room.palette.wall;
            }
          }
        }
      }
    }
    // Overlay buildings. A "precise" building (footprint clear of other rooms)
    // gets a clean punched HOLE — its 32-aligned footprint cells are marked
    // PRECISE so the grid neither fills nor walls them; the detailed emit pass
    // draws the crisp facade (door bay, windows, parapet) whose plinth wall
    // abuts these cell boundaries exactly. The rest collapse to a solid raised
    // silhouette (roof block, or wall slab for an enterable shed).
    for (const idx of groupArr) {
      const room = rooms[idx];
      if (!room.buildings || !room.buildings.length) continue;
      for (const b of room.buildings) {
        if (b._fusedPrecise) {
          // Punch the footprint (plinth-outer for solid, wall-outer for shed).
          const Hx = (b.enterable ? b.halfX : b.halfX + b.plinthW);
          const Hy = (b.enterable ? b.halfY : b.halfY + b.plinthW);
          for (let gy = 0; gy < H; gy++) {
            for (let gx = 0; gx < W; gx++) {
              if (cellSec[gy * W + gx] !== room.outerId) continue;
              const cx = minX + (gx + 0.5) * CELL;
              const cy = minY + (gy + 0.5) * CELL;
              if (Math.abs(cx - b.cx) < Hx && Math.abs(cy - b.cy) < Hy) {
                cellSec[gy * W + gx] = 'PRECISE';
              }
            }
          }
          continue;
        }
        const blockSec = b.enterable ? b.slabSec : b.roofSec;
        if (!blockSec) continue;
        const Hx = (b.halfX != null ? b.halfX : b.half);
        const Hy = (b.halfY != null ? b.halfY : b.half);
        // Bail out early if the footprint is partially claimed by another
        // overlapping room — rasterizing into a few stray cells leaves a
        // slab fragment with 2-5 walls and breaks topology. Skipping
        // lets the orphan-sector prune at the end drop the un-emitted
        // slab / interior / throat sectors cleanly.
        let canRasterize = true;
        for (let gy = 0; gy < H && canRasterize; gy++) {
          for (let gx = 0; gx < W && canRasterize; gx++) {
            const cx = minX + (gx + 0.5) * CELL;
            const cy = minY + (gy + 0.5) * CELL;
            if (Math.abs(cx - b.cx) >= Hx || Math.abs(cy - b.cy) >= Hy) continue;
            if (cellSec[gy * W + gx] !== room.outerId) canRasterize = false;
          }
        }
        if (!canRasterize) continue;
        gridRiserTex.set(blockSec, b.wall);
        for (let gy = 0; gy < H; gy++) {
          for (let gx = 0; gx < W; gx++) {
            if (cellSec[gy * W + gx] !== room.outerId) continue;
            const cx = minX + (gx + 0.5) * CELL;
            const cy = minY + (gy + 0.5) * CELL;
            if (Math.abs(cx - b.cx) < Hx && Math.abs(cy - b.cy) < Hy) {
              cellSec[gy * W + gx] = blockSec;
              cellTex[gy * W + gx] = b.wall;
            }
          }
        }
      }
    }
    // Overlay pillars as solid columns — cells inside a pillar's radius
    // (and currently belonging to that pillar's room) become the pillar's
    // closed sector. They read as floor-to-ceiling columns.
    for (const idx of groupArr) {
      const room = rooms[idx];
      if (!room.pillars || !room.pillars.length) continue;
      for (let k = 0; k < room.pillars.length; k++) {
        const p = room.pillars[k];
        const psec = room.pillarSecIds[k];
        const r2 = (p.radius + 4) * (p.radius + 4);
        for (let gy = 0; gy < H; gy++) {
          for (let gx = 0; gx < W; gx++) {
            if (cellSec[gy * W + gx] !== room.outerId) continue;
            const cx = minX + (gx + 0.5) * CELL;
            const cy = minY + (gy + 0.5) * CELL;
            if ((cx - p.cx) ** 2 + (cy - p.cy) ** 2 <= r2) {
              cellSec[gy * W + gx] = psec;
              cellTex[gy * W + gx] = room.palette.wall;
            }
          }
        }
      }
    }
    // Overwrite the edge cell at each fused-room corridor attachment with
    // the corridor's HEADER sector. This caps the door upper at the header
    // ceiling (fh+72) instead of leaving it stretched up to the full
    // interior ceiling, so the DOOR1 panel fits exactly instead of tiling
    // 2-3 copies of itself up the wall.
    for (const idx of groupArr) {
      const atts = fusedDoorAtts.get(idx);
      if (!atts) continue;
      const outerId = rooms[idx].outerId;
      for (const a of atts) {
        const isH = a.side === 'E' || a.side === 'W';
        for (let gy = 0; gy < H; gy++) {
          for (let gx = 0; gx < W; gx++) {
            if (cellSec[gy * W + gx] !== outerId) continue;
            const xMin = minX + gx * CELL, xMax = xMin + CELL;
            const yMin = minY + gy * CELL, yMax = yMin + CELL;
            const edge = a.side === 'E' ? xMax : a.side === 'W' ? xMin :
                         a.side === 'N' ? yMax : yMin;
            if (Math.abs(edge - a.coord) > 0.5) continue;
            const pMin = isH ? yMin : xMin;
            const pMax = isH ? yMax : xMax;
            if (pMin < a.rMin - 0.5 || pMax > a.rMax + 0.5) continue;
            cellSec[gy * W + gx] = a.header;
          }
        }
      }
    }
    // Emit walls along cell boundaries where the neighbour's sector differs.
    for (let gy = 0; gy < H; gy++) {
      for (let gx = 0; gx < W; gx++) {
        const here = cellSec[gy * W + gx];
        if (here === null || here === 'PRECISE') continue;
        const tex = cellTex[gy * W + gx];
        const xMin = minX + gx * CELL, xMax = xMin + CELL;
        const yMin = minY + gy * CELL, yMax = yMin + CELL;
        const nb = (ggx, ggy) => (ggx >= 0 && ggx < W && ggy >= 0 && ggy < H)
          ? cellSec[ggy * W + ggx] : null;
        const edges = [
          { s: nb(gx, gy + 1), x1: xMin, y1: yMax, x2: xMax, y2: yMax, dir: 'N' },
          { s: nb(gx + 1, gy), x1: xMax, y1: yMax, x2: xMax, y2: yMin, dir: 'E' },
          { s: nb(gx, gy - 1), x1: xMax, y1: yMin, x2: xMin, y2: yMin, dir: 'S' },
          { s: nb(gx - 1, gy), x1: xMin, y1: yMin, x2: xMin, y2: yMax, dir: 'W' },
        ];
        for (const e of edges) {
          if (e.s === here) continue;
          // A PRECISE neighbour's boundary is drawn by the detailed building
          // emit (its plinth wall sits exactly on this cell edge) — skip it
          // here so the wall isn't drawn twice.
          if (e.s === 'PRECISE') continue;
          // Corridor attached to this fused room: replace the void-facing
          // wall with a passable wall straight to the corridor's doorBody.
          // The DR-1 resolve pass below upgrades it to a real door. The
          // edge cell will normally have been overwritten with the
          // corridor's HEADER sector above (so the DOOR1 upper fits), in
          // which case headerToDoorBody picks up the matching doorBody.
          if (e.s === null) {
            const body = headerToDoorBody.get(here) ||
              fusedDoorAt(here, e.dir, xMin, yMin, xMax, yMax, minX, minY);
            if (body) {
              emitWall(e.x1, e.y1, e.x2, e.y2, here, body, {});
              continue;
            }
          }
          emitWall(e.x1, e.y1, e.x2, e.y2, here, e.s,
                   e.s === null ? { middle: tex } : {});
        }
      }
    }
  }

  // Corridor walls: three sectors per corridor — doorBodyA at one end, the
  // main hallway body in the middle, and doorBodyB at the other end. Each
  // door body is 16 deep with closed-state ceil=floor. Track walls
  // (perpendicular to the corridor's long axis, 16 units long) get DOORTRAK
  // middle + LOWER_UNPEGGED so the side texture doesn't slide. The line
  // between mainBody and each doorBody is the door action line (DR-1) with
  // DOOR3 upper as the door image — front is mainBody so the player
  // approaching from the corridor sees the door.
  corridors.forEach((co) => {
    if (co.orient === 'H') {
      const A = co.minX, B = co.maxX, C = co.minY, D = co.maxY;
      const aIn = A + DOOR_THICK, bIn = B - DOOR_THICK;
      // doorBodyA (west) tracks
      emitWall(A, D, aIn, D, co.doorAId, null, { middle: 'DOORTRAK', flags: 16 });
      emitWall(aIn, C, A, C, co.doorAId, null, { middle: 'DOORTRAK', flags: 16 });
      // mainBody long walls
      emitWall(aIn, D, bIn, D, co.mainBodyId, null, { middle: 'STARTAN2' });
      emitWall(bIn, C, aIn, C, co.mainBodyId, null, { middle: 'STARTAN2' });
      // doorBodyB (east) tracks
      emitWall(bIn, D, B, D, co.doorBId, null, { middle: 'DOORTRAK', flags: 16 });
      emitWall(B, C, bIn, C, co.doorBId, null, { middle: 'DOORTRAK', flags: 16 });
      // door A face (between mainBody and doorBodyA). front=mainBody.
      emitWall(aIn, C, aIn, D, co.mainBodyId, co.doorAId);
      // door B face (between mainBody and doorBodyB). front=mainBody.
      emitWall(bIn, D, bIn, C, co.mainBodyId, co.doorBId);
    } else {
      const A = co.minY, B = co.maxY, C = co.minX, D = co.maxX;
      const aIn = A + DOOR_THICK, bIn = B - DOOR_THICK;
      // doorBodyA (south) tracks (parallel to the corridor's long Y axis)
      emitWall(C, A, C, aIn, co.doorAId, null, { middle: 'DOORTRAK', flags: 16 });
      emitWall(D, aIn, D, A, co.doorAId, null, { middle: 'DOORTRAK', flags: 16 });
      // mainBody long walls
      emitWall(C, aIn, C, bIn, co.mainBodyId, null, { middle: 'STARTAN2' });
      emitWall(D, bIn, D, aIn, co.mainBodyId, null, { middle: 'STARTAN2' });
      // doorBodyB (north) tracks
      emitWall(C, bIn, C, B, co.doorBId, null, { middle: 'DOORTRAK', flags: 16 });
      emitWall(D, B, D, bIn, co.doorBId, null, { middle: 'DOORTRAK', flags: 16 });
      // door A face (south end). emit so mainBody is on front (north side).
      emitWall(D, aIn, C, aIn, co.mainBodyId, co.doorAId);
      // door B face (north end). emit so mainBody is on front (south side).
      emitWall(C, bIn, D, bIn, co.mainBodyId, co.doorBId);
    }
  });

  // -------- 7b. Fuse touching / partially-overlapping room walls --------
  // When two rooms are placed so their outer walls share a line segment
  // (touching exactly OR partially overlapping), split each wall at the
  // other's endpoints so the shared portion becomes a single line, then
  // merge identical one-sided wall pairs into a two-sided passable line.
  // This is the "drag rooms together to build larger shapes" mechanic —
  // the engine sees the user's intent and dissolves the inner walls.
  {
    function cloneSidedef(sdId) {
      if (sdId === -1) return -1;
      const src = sdById(sdId);
      if (!src) return -1;
      const nid = 'sd' + sidedefs.length;
      sidedefs.push({ ...src, id: nid });
      return nid;
    }
    function trySplitAt(line, atV) {
      if (line.v1 === atV || line.v2 === atV) return null;
      const v = vById(atV);
      const a = vById(line.v1);
      const b = vById(line.v2);
      if (!v || !a || !b) return null;
      const dx = b.x - a.x, dy = b.y - a.y;
      const lenSq = dx * dx + dy * dy;
      if (lenSq < 1) return null;
      const t = ((v.x - a.x) * dx + (v.y - a.y) * dy) / lenSq;
      if (t <= 0.001 || t >= 0.999) return null;
      const projX = a.x + t * dx, projY = a.y + t * dy;
      if ((v.x - projX) ** 2 + (v.y - projY) ** 2 > 1) return null;
      // Update lineByVerts: remove the old key for `line` (its v2 is about
      // to change), add the new keys for both halves.
      lineByVerts.delete(vertKey(line.v1, line.v2));
      const half2 = {
        ...line, id: 'l' + linedefs.length, v1: atV,
        front: cloneSidedef(line.front), back: cloneSidedef(line.back),
      };
      line.v2 = atV;
      lineByVerts.set(vertKey(line.v1, line.v2), line);
      lineByVerts.set(vertKey(half2.v1, half2.v2), half2);
      return half2;
    }
    // Iterate: collect endpoints of all one-sided walls, split any line
    // passing through one of them. Repeat until stable.
    let safety = 200;
    let changed = true;
    while (changed && safety-- > 0) {
      changed = false;
      const endpoints = new Set();
      for (const l of linedefs) {
        if (l.back === -1) { endpoints.add(l.v1); endpoints.add(l.v2); }
      }
      for (const vid of endpoints) {
        for (let i = 0; i < linedefs.length; i++) {
          const half2 = trySplitAt(linedefs[i], vid);
          if (half2) { linedefs.push(half2); changed = true; }
        }
      }
    }
    // Merge identical one-sided wall pairs (between DIFFERENT sectors) into
    // a single two-sided passable line. The vertex-pair map lets us find
    // the OTHER one-sided wall on the same key in O(1) instead of an N^2
    // nested scan, but the map only holds one entry per key so we group
    // duplicates by key first.
    const byKey = new Map();
    for (let i = 0; i < linedefs.length; i++) {
      const l = linedefs[i];
      if (l.back !== -1) continue;
      const k = vertKey(l.v1, l.v2);
      if (!byKey.has(k)) byKey.set(k, []);
      byKey.get(k).push(i);
    }
    const removed = new Set();
    for (const [, idxs] of byKey) {
      if (idxs.length < 2) continue;
      // Pair them off — pick the first as the "kept" line and merge the
      // others into it as backs (only the first merge actually happens
      // since a wall can only have two sides; further duplicates get
      // dropped).
      const keepI = idxs[0];
      const l1 = linedefs[keepI];
      for (let k = 1; k < idxs.length; k++) {
        const j = idxs[k];
        if (removed.has(j)) continue;
        const l2 = linedefs[j];
        const fs1 = sdById(l1.front);
        const fs2 = sdById(l2.front);
        if (!fs1 || !fs2 || fs1.sector === fs2.sector) continue;
        if (l1.back === -1) {
          l1.back = l2.front;
          l1.flags = (l1.flags | 4) & ~1;
          if (fs1.middle && fs1.middle !== '-' &&
              fs1.middle !== 'DOORTRAK' && fs1.middle !== 'SW1EXIT') {
            fs1.middle = '-';
          }
        }
        removed.add(j);
      }
    }
    if (removed.size) {
      for (let i = linedefs.length - 1; i >= 0; i--) {
        if (removed.has(i)) linedefs.splice(i, 1);
      }
      // The map's stale entries are fine — they reference live linedefs
      // (the survivor in each merge pair).
    }
  }

  // -------- 7c. Phantom wall conversion (overlap fusion cleanup) --------
  // After fusion merges identical-vertex walls, some one-sided walls may
  // still be left STUCK INSIDE another room's polygon (when one room is
  // placed overlapping another, the smaller's perimeter ends up inside
  // the larger's interior). Doom renders these as phantom walls blocking
  // movement in the fused interior. Convert any such wall to a two-sided
  // passable line whose back is the enclosing room's outer sector.
  {
    // Pre-compute room outer polygons (cached) for the point-in-polygon test.
    const roomPolys = rooms.map(r => ({ outerId: r.outerId, poly: roomPoly(r) }));
    // Set of all sub-sector IDs that belong to a room (so we only flip walls
    // whose own sector is a room sub-sector, not corridors / door bodies).
    const roomSecs = new Set();
    for (const r of rooms) {
      roomSecs.add(r.outerId);
      for (const id of r.trimIds || []) roomSecs.add(id);
      if (r.featureId) roomSecs.add(r.featureId);
      for (const id of r.pillarSecIds || []) roomSecs.add(id);
      for (const a of r.alcoves || []) roomSecs.add(a.sectorId);
    }
    for (let i = 0; i < linedefs.length; i++) {
      const l = linedefs[i];
      if (l.back !== -1) continue;
      const fs = sdById(l.front);
      if (!fs || !roomSecs.has(fs.sector)) continue;
      const v1 = vById(l.v1);
      const v2 = vById(l.v2);
      if (!v1 || !v2) continue;
      const mx = (v1.x + v2.x) / 2, my = (v1.y + v2.y) / 2;
      // Find an enclosing OTHER room (not this wall's own room).
      let enclosing = null;
      for (const rp of roomPolys) {
        if (rp.outerId === fs.sector) continue;
        // Skip if the wall's own room is a sub-sector of this room.
        const ownRoom = rooms.find(r =>
          r.outerId === fs.sector ||
          (r.trimIds || []).includes(fs.sector) ||
          r.featureId === fs.sector ||
          (r.pillarSecIds || []).includes(fs.sector));
        if (ownRoom && ownRoom.outerId === rp.outerId) continue;
        if (pointInPolygon(mx, my, rp.poly)) { enclosing = rp; break; }
      }
      if (!enclosing) continue;
      const backSdId = 'sd' + sidedefs.length;
      sidedefs.push({
        id: backSdId, xOff: 0, yOff: 0, upper: '-', lower: '-',
        middle: '-', sector: enclosing.outerId,
      });
      l.back = backSdId;
      l.flags = (l.flags | 4) & ~1;
      if (fs.middle && fs.middle !== '-' &&
          fs.middle !== 'DOORTRAK' && fs.middle !== 'SW1EXIT') {
        fs.middle = '-';
      }
    }
  }

  // -------- 7d. Linedef facing cleanup --------
  // For each line, verify the front sidedef's sector contains the point
  // just to the RIGHT of v1→v2 (CW convention). If not, swap front/back
  // and v1/v2 so the orientation is correct. Skip lines where the front
  // sector ID isn't found.
  {
    const secLookup = new Map(sectors.map(s => [s.id, s]));
    function pointInSector(px, py, secId) {
      // Quick check: any room sub-sector with its polygon containing (px, py)
      for (const r of rooms) {
        const poly = roomPoly(r);
        if (!pointInPolygon(px, py, poly)) continue;
        if (r.outerId === secId) return true;
        // trim / feature / pillar would be more nuanced but for cleanup
        // we accept a coarse match
      }
      return false;
    }
    for (const l of linedefs) {
      if (l.back === -1) continue; // one-sided: trust the original emit
      const fs = sdById(l.front);
      const bs = sdById(l.back);
      if (!fs || !bs) continue;
      if (fs.sector === bs.sector) continue; // degenerate, skip
      const v1 = vById(l.v1);
      const v2 = vById(l.v2);
      if (!v1 || !v2) continue;
      const mx = (v1.x + v2.x) / 2, my = (v1.y + v2.y) / 2;
      const dx = v2.x - v1.x, dy = v2.y - v1.y;
      const len = Math.hypot(dx, dy); if (len < 0.001) continue;
      // Right perpendicular from midpoint, 1 unit
      const rx = mx + dy / len, ry = my - dx / len;
      const lx = mx - dy / len, ly = my + dx / len;
      const frontOnRight = pointInSector(rx, ry, fs.sector);
      const backOnRight = pointInSector(rx, ry, bs.sector);
      if (!frontOnRight && backOnRight) {
        // Flip: front is on the LEFT, back is on the RIGHT. Swap.
        const tmpSd = l.front; l.front = l.back; l.back = tmpSd;
        const tmpV = l.v1; l.v1 = l.v2; l.v2 = tmpV;
      }
    }
  }

  // -------- 7e. Merge collinear linedefs --------
  // The grid emit produces long runs of 32-unit segments. Merge any
  // consecutive collinear segments (l1.v2 == l2.v1) that share identical
  // front/back sectors, textures, flags, and special into a single longer
  // linedef. This cleans up the wall count and removes the "stepped"
  // micro-segment look on fused boundaries. Only normal (special 0) walls
  // are merged so doors / switches are never coalesced.
  {
    const vById = new Map(verts.map(v => [v.id, v]));
    const sameTex = (a, b) => a.upper === b.upper && a.lower === b.lower && a.middle === b.middle;
    function mergeable(l1, l2) {
      if (l1.special !== 0 || l2.special !== 0) return false;
      if (l1.flags !== l2.flags) return false;
      // front sectors equal, back sectors equal (both -1 or same)
      const f1 = sdById(l1.front);
      const f2 = sdById(l2.front);
      if (!f1 || !f2 || f1.sector !== f2.sector || !sameTex(f1, f2)) return false;
      const b1 = l1.back === -1 ? null : sdById(l1.back);
      const b2 = l2.back === -1 ? null : sdById(l2.back);
      if ((b1 == null) !== (b2 == null)) return false;
      if (b1 && b2 && (b1.sector !== b2.sector || !sameTex(b1, b2))) return false;
      // collinear and same direction
      const a = vById.get(l1.v1), m = vById.get(l1.v2), c = vById.get(l2.v2);
      if (!a || !m || !c) return false;
      const cross = (m.x - a.x) * (c.y - a.y) - (m.y - a.y) * (c.x - a.x);
      if (Math.abs(cross) > 0.5) return false;
      const dot = (m.x - a.x) * (c.x - m.x) + (m.y - a.y) * (c.y - m.y);
      return dot > 0;
    }
    let changed = true, safety = 4000;
    while (changed && safety-- > 0) {
      changed = false;
      const byV1 = new Map();
      for (let i = 0; i < linedefs.length; i++) {
        const k = linedefs[i].v1;
        if (!byV1.has(k)) byV1.set(k, []);
        byV1.get(k).push(i);
      }
      for (let i = 0; i < linedefs.length; i++) {
        const l1 = linedefs[i];
        const conts = byV1.get(l1.v2);
        if (!conts) continue;
        let did = false;
        for (const j of conts) {
          if (j === i) continue;
          const l2 = linedefs[j];
          if (!mergeable(l1, l2)) continue;
          l1.v2 = l2.v2;          // extend l1 to l2's end
          linedefs.splice(j, 1);  // drop l2
          changed = true; did = true; break;
        }
        if (did) break;
      }
    }
  }

  // -------- 8. Apply door specials --------
  // Each line touching a doorBody becomes a DR-1 door so USE opens it from
  // EITHER side (corridor or room). The line's back must be the door body
  // for DR-1 to raise that body's ceiling. The corridor-side face shows
  // the DOOR3 image stretched between corridor ceiling and closed body
  // floor; the room-side face uses the room's wall texture on the upper
  // (set by the resolve pass below) so it blends into the surrounding wall
  // as a natural door frame.
  const sdMap = new Map(sidedefs.map(s => [s.id, s]));
  const doorBodyIds = new Set();
  corridors.forEach((co) => {
    doorBodyIds.add(co.doorAId);
    doorBodyIds.add(co.doorBId);
  });
  corridors.forEach((co) => {
    for (const l of linedefs) {
      if (l.front === -1 || l.back === -1) continue;
      const fs = sdMap.get(l.front), bs = sdMap.get(l.back);
      if (!fs || !bs) continue;
      const backIsBody = bs.sector === co.doorAId || bs.sector === co.doorBId;
      const frontIsBody = fs.sector === co.doorAId || fs.sector === co.doorBId;
      // Door-face line: between corridor mainBody and a door body. DOOR1
      // is a 64×72 image — matches the panel's 72-tall opening exactly so
      // no UPPER_UNPEGGED is needed; the texture stays anchored at the
      // corridor ceiling and the door appears to lift cleanly into it.
      if (fs.sector === co.mainBodyId && backIsBody) {
        l.special = 1;
        fs.upper = 'DOOR1';
        bs.upper = 'DOOR1';
        continue;
      }
      // Room-side line: between a HEADER strip and a door body. Same
      // approach — the header is 72 tall so DOOR1 fits the panel exactly.
      if (backIsBody && fs.sector !== co.mainBodyId && !doorBodyIds.has(fs.sector)) {
        l.special = 1;
        fs.upper = 'DOOR1';
        bs.upper = 'DOOR1';
        continue;
      }
      if (frontIsBody && bs.sector !== co.mainBodyId && !doorBodyIds.has(bs.sector)) {
        const tmp = l.front; l.front = l.back; l.back = tmp;
        const tmpV = l.v1; l.v1 = l.v2; l.v2 = tmpV;
        l.special = 1;
        fs.upper = 'DOOR1';
        bs.upper = 'DOOR1';
        continue;
      }
    }
  });

  // -------- 8b. Resolve upper / lower textures on every two-sided line --------
  // For every two-sided line with a floor or ceiling step, set a wall texture
  // on the visible side. The upper above a door/step uses the SURROUNDING
  // ROOM'S wall texture, not a generic STARTAN2 — that's the "door frame
  // blends into the wall" look. We index sector → preferred wall texture
  // for every room sub-sector.
  const wallTexBySector = new Map();
  rooms.forEach((r) => {
    wallTexBySector.set(r.outerId, r.palette.wall);
    for (const id of r.trimIds || []) wallTexBySector.set(id, r.palette.wall);
    if (r.featureId) wallTexBySector.set(r.featureId, r.palette.wall);
    for (const id of r.pillarSecIds || []) wallTexBySector.set(id, r.palette.wall);
    for (const a of r.alcoves || []) wallTexBySector.set(a.sectorId, a.wallTex);
  });
  const secMap = new Map(sectors.map(s => [s.id, s]));
  // NOTE: sky sectors are deliberately kept HIGHER than their non-sky
  // neighbours (oculus shafts open UPWARD into the sky at +384 above a 256
  // room). The resolve pass below paints the shaft walls as the upper texture
  // on the (non-suppressed) higher side, so the skylight reads as open sky
  // with a textured rim — no recession needed. (An earlier pass recessed sky
  // BELOW its neighbours, which sank the oculus into a dark panel and put the
  // trim on only the non-sky side; that behaviour has been removed.)
  for (const l of linedefs) {
    if (l.front === -1 || l.back === -1) continue;
    const fs = sdMap.get(l.front), bs = sdMap.get(l.back);
    if (!fs || !bs) continue;
    const fsec = secMap.get(fs.sector), bsec = secMap.get(bs.sector);
    if (!fsec || !bsec) continue;
    // Lower texture: on the side adjacent to the LOWER floor (visible from there).
    if (fsec.floorH !== bsec.floorH) {
      const lowSide = fsec.floorH < bsec.floorH ? fs : bs;
      if (!lowSide.lower || lowSide.lower === '-') {
        // Closed sub-sector with floor == ceil reads as a SOLID column
        // (pillar) — give the visible face a tall column texture instead
        // of a step texture.
        const highSec = fsec.floorH > bsec.floorH ? fsec : bsec;
        const isPillar = highSec && highSec.floorH === highSec.ceilH;
        const delta = Math.abs(fsec.floorH - bsec.floorH);
        // A rasterized fused-grid building silhouette carries its own facade.
        const riser = highSec && gridRiserTex.get(highSec.id);
        if (riser) lowSide.lower = riser;
        else if (isPillar) lowSide.lower = 'SUPPORT2';
        else if (delta >= 72) lowSide.lower = 'STARTAN2';
        else lowSide.lower = 'STEP1';
      }
    }
    // Upper texture: on the side adjacent to the HIGHER ceiling (visible from there).
    if (fsec.ceilH !== bsec.ceilH) {
      const bothSky = fsec.ceilTex === 'F_SKY1' && bsec.ceilTex === 'F_SKY1';
      if (!bothSky) {
        const highSide = fsec.ceilH > bsec.ceilH ? fs : bs;
        const highSec = fsec.ceilH > bsec.ceilH ? fsec : bsec;
        if (!highSide.upper || highSide.upper === '-') {
          highSide.upper = wallTexBySector.get(highSec.id) || 'STARTAN2';
        }
      }
    }
  }

  // -------- 8c. Clear stray middle textures on two-sided lines --------
  // A fused/merged boundary must be a clean see-through opening. Any
  // middle texture left on a two-sided line renders as a glass-pane /
  // fence that blocks the view (and sometimes the player). Clear them on
  // both sidedefs. DOORTRAK is preserved (door tracks are intentional);
  // grates (MIDGRATE/MIDBARS) aren't used by the generator.
  for (const l of linedefs) {
    if (l.back === -1) continue;
    const fs = sdMap.get(l.front), bs = sdMap.get(l.back);
    for (const sd of [fs, bs]) {
      if (sd && sd.middle && sd.middle !== '-' && sd.middle !== 'DOORTRAK') {
        sd.middle = '-';
      }
    }
  }

  // -------- 9. Place things --------
  // ShapeShifter override: when the caller supplies userThings (placed by
  // the user before BUILD), use those verbatim instead of auto-generating
  // monsters, items, and decorations. EXIT_PILLAR_TYPE (32000) markers are
  // stripped here — the geometry block above already carved an exit post
  // at each one, so the marker must not survive to the WAD.
  const userThings = opts && opts.userThings;
  const EXIT_MARK_T = 32000;
  const things = userThings
    ? userThings
        .filter(t => t.type !== EXIT_MARK_T)
        .map((t, i) => ({
          id: 't' + i, x: t.x | 0, y: t.y | 0,
          angle: t.angle | 0, type: t.type, flags: t.flags == null ? 7 : t.flags,
        }))
    : [{ id: 't0', x: rooms[0].cx | 0, y: rooms[0].cy | 0, angle: 90, type: 1, flags: 7 }];
  if (userThings && !things.some(t => t.type === 1)) {
    things.unshift({ id: 'tps', x: rooms[0].cx | 0, y: rooms[0].cy | 0,
      angle: 90, type: 1, flags: 7 });
  }
  // Teleport destinations: a type-14 thing sits on each pad. The partner
  // pad's WR-97 lines are tagged to this pad's sector, so arriving players
  // land here. Flags 7 = present on all skill levels.
  for (const pad of teleportPads) {
    things.push({ id: 't' + things.length, x: pad.cx, y: pad.cy,
      angle: 90, type: 14, flags: 7 });
  }
  // Per-zone monster archetypes — combat theme matches palette. Techbase
  // walls draw human grunts; hellish stone draws demons and cacos. Doom
  // type IDs: 3001 imp, 3002 pinky, 3003 baron, 3004 zombie, 9 sergeant,
  // 3005 caco, 3006 lost soul, 65 chaingunner, 69 hell knight.
  const MONSTERS_BY_WALL = {
    STARTAN2: [3004, 9, 3001, 3001, 65],          // techbase: humans + imps
    BROWN1:   [9, 3001, 3002, 3004],              // industrial: mixed grunts
    METAL:    [3002, 3001, 9, 65],                // metal: pinkies + chainguns
    STONE2:   [3005, 3003, 3001, 3006, 69],       // hellstone: cacos/barons
    WOOD1:    [9, 3001, 3004, 3002],              // wood: armory grunts
    GRAY5:    [69, 3002, 3001, 3005],             // gray castle: knights+demons
  };
  const MONSTERS_DEFAULT = [3001, 3002, 3004, 9, 3005];
  const ITEMS = [2007, 2008, 2011, 2014, 2018, 2002];
  // Feature decorations — thing-type pools placed per room when its feature
  // matches. Counts scale with room area. Doom thing IDs: 30 tall green
  // techno-column, 32 tall red column, 31 short tech pillar, 33 short red
  // column, 34 candelabra, 35 candle, 44 blue torch, 45 green torch,
  // 46 red torch, 47 stalagmite, 54 big tree (Doom 2), 70 burning barrel,
  // 85 tall tech lamp, 86 short tech lamp, 41 evil eye, 42 floating skull,
  // 80 pool of blood, 73 hanging victim, 2035 explosive barrel.
  const DECORATIONS = {
    garden:      { types: [54, 47, 30, 34, 45], count: [5, 9] }, // trees, stalagmites, columns, candelabras
    throne:      { types: [46, 32, 35],         count: [2, 4] }, // red torches, red columns flank the throne
    mausoleum:   { types: [70, 55, 41, 73],     count: [3, 6] }, // burning barrels, evil eyes, hanged
    foundry:     { types: [70, 85, 2035, 86],   count: [3, 5] }, // burning barrels + tech lamps + barrels
    observatory: { types: [44, 86, 56],         count: [3, 5] }, // blue torches around the telescope
    sewer:       { types: [80, 70, 47],         count: [3, 6] }, // pools of blood, barrels, stalagmites
    cathedral:   { types: [46, 34],             count: [3, 5] }, // red torches + candelabras
    crypt:       { types: [55, 41, 42],         count: [2, 4] }, // short torches, evil eye, skull
    altar:       { types: [44, 35],             count: [2, 4] }, // blue torches, candles
    lake:        { types: [45, 56, 47],         count: [3, 5] }, // green torches, stalagmites
    liminal:     { types: [85, 86],             count: [3, 5] }, // tech lamps everywhere — over-bright
    reactor:     { types: [85, 2035, 70],       count: [3, 5] },
    gallery:     { types: [34, 35, 31],         count: [3, 5] },
  };
  // Vary monster count by room size — bigger rooms host more. Skip
  // entirely when the user supplied an explicit thing list.
  if (!userThings) rooms.forEach((r, i) => {
    if (i === 0) return; // start room empty
    const bb = roomBBox(r);
    const area = (bb.maxX - bb.minX) * (bb.maxY - bb.minY);
    const monsterCount = Math.min(4, Math.floor(area / (300 * 300)) + (rand() < 0.4 ? 1 : 0));
    const pool = MONSTERS_BY_WALL[r.palette && r.palette.wall] || MONSTERS_DEFAULT;
    for (let m = 0; m < monsterCount; m++) {
      const off = 64 + rand() * 96;
      const ang = rand() * Math.PI * 2;
      things.push({
        id: 't' + things.length,
        x: Math.round(r.cx + Math.cos(ang) * off),
        y: Math.round(r.cy + Math.sin(ang) * off),
        angle: Math.floor(rand() * 8) * 45,
        type: pick(pool), flags: 7,
      });
    }
    if (rand() < 0.55) {
      things.push({
        id: 't' + things.length,
        x: r.cx | 0, y: r.cy | 0, angle: 0,
        type: pick(ITEMS), flags: 7,
      });
    }
    // Feature decorations — scatter the themed prop set across the room,
    // staying outside the centre feature ring and inside the outer trim
    // ring so they don't clip walls or block centre platforms.
    const dec = DECORATIONS[r.feature];
    if (dec) {
      const innerR = (TRIM_W * r.trimLayers + INNER_INSET);
      const outerR = r.type === 'octagon' ? r.r * 0.7
                  : r.type === 'hexagon' ? r.r * 0.7
                  : Math.min(r.w, r.h) / 2 - 48;
      const nDecor = dec.count[0] + Math.floor(rand() * (dec.count[1] - dec.count[0] + 1));
      const areaW = Math.max(0, outerR - innerR - 32);
      for (let k = 0; k < nDecor && areaW > 16; k++) {
        const ang = rand() * Math.PI * 2;
        const radius = innerR + 32 + rand() * areaW;
        things.push({
          id: 't' + things.length,
          x: Math.round(r.cx + Math.cos(ang) * radius),
          y: Math.round(r.cy + Math.sin(ang) * radius),
          angle: 0,
          type: pick(dec.types), flags: 7,
        });
      }
    }
  });
  // Exit pillars from user-placed EXIT_PILLAR_TYPE markers (32000). Each
  // marker thing on the canvas turns into a closed 64x32 post with SW1EXIT
  // painted on its south face and linedef special 11 (S1 End Level) wired
  // in. Markers themselves are stripped from the things list at the end
  // of generation so they never reach the WAD. There is no auto-exit and
  // no auto-secret tagging — the user must place an Exit Pillar to ship
  // the level, and may opt sectors into "secret" via the Designer if they
  // want them.
  const EXIT_MARK = 32000;
  const exitMarkers = (opts && opts.userThings ? opts.userThings : []).filter(t => t.type === EXIT_MARK);
  for (const mk of exitMarkers) {
    // Find the room whose polygon contains this marker. Skip if none.
    let hostRoomIdx = -1;
    for (let ri = 0; ri < rooms.length; ri++) {
      const rr = rooms[ri];
      const poly = roomPoly(rr);
      if (pointInPolygon(mk.x, mk.y, poly)) { hostRoomIdx = ri; break; }
    }
    if (hostRoomIdx === -1) continue;
    const exRoom = rooms[hostRoomIdx];
    // Host sector = innermost trim layer if any (for stepped rooms the post
    // sits on the centre dais), otherwise the outer floor.
    const hostSecId = (exRoom.trimIds && exRoom.trimIds.length > 0)
      ? exRoom.trimIds[exRoom.trimIds.length - 1] : exRoom.outerId;
    const hostSec = sectors.find(s => s.id === hostSecId);
    if (!hostSec) continue;
    const POST_W = 64, POST_D = 32, POST_H = 64;
    // Snap the post's centre to the 8-grid (SW1EXIT alignment), and offset
    // so the marker thing sits on the SOUTH face the player will press.
    const pcx = Math.round(mk.x / 8) * 8;
    const pcy = Math.round((mk.y + POST_D / 2) / 8) * 8;
    const FL = { x: pcx - POST_W / 2, y: pcy - POST_D / 2 };
    const FR = { x: pcx + POST_W / 2, y: pcy - POST_D / 2 };
    const BR = { x: pcx + POST_W / 2, y: pcy + POST_D / 2 };
    const BL = { x: pcx - POST_W / 2, y: pcy + POST_D / 2 };
    const postSecId = allocSec({
      floorH: hostSec.floorH + POST_H, ceilH: hostSec.floorH + POST_H,
      floorTex: exRoom.palette.accent, ceilTex: exRoom.palette.accent,
      light: Math.min(255, exRoom.light + 32), special: 0,
    });
    // CW walk so the host (lower / open) is on the right of each line.
    // South face (index 0) carries SW1EXIT + linedef special 11.
    const postLines = [
      emitWall(FL.x, FL.y, FR.x, FR.y, hostSecId, postSecId),
      emitWall(FR.x, FR.y, BR.x, BR.y, hostSecId, postSecId),
      emitWall(BR.x, BR.y, BL.x, BL.y, hostSecId, postSecId),
      emitWall(BL.x, BL.y, FL.x, FL.y, hostSecId, postSecId),
    ];
    const postWall = exRoom.palette.wall;
    const postFloor = hostSec.floorH + POST_H;
    const hostCeil = hostSec.ceilH;
    postLines.forEach((pl, idx) => {
      if (!pl) return;
      const pfs = sdById(pl.front);
      if (!pfs) return;
      pfs.lower = (idx === 0) ? 'SW1EXIT' : postWall;
      if (hostCeil > postFloor) pfs.upper = postWall;
      if (idx === 0) pl.special = 11;
    });
  }

  // Fragment cleanup safety net. Even after V0.47's "skip rasterization if
  // the footprint isn't fully owned" guard, deeply overlapping fused mixed-
  // feature layouts can still drop a slab fragment (e.g. a building from
  // room A whose footprint cells get partly claimed mid-pass by another
  // room's pillar rasterization, leaving 2-5 disjoint slab walls that
  // don't form a closed loop). Run buildSectorLoops here, find any sector
  // with empty / missing loops, and CONVERT its walls to one-sided walls
  // of the surviving neighbour — the fragment becomes a plain solid wall
  // segment and the broken sector itself gets dropped by the orphan
  // prune below.
  {
    const probe = buildSectorLoops({ vertices: verts, linedefs, sidedefs, sectors, things: [] });
    const broken = new Set();
    for (const s of sectors) {
      const loops = probe.get(s.id);
      if (!loops || loops.length === 0) broken.add(s.id);
    }
    if (broken.size) {
      for (const l of linedefs) {
        const fs = sdById(l.front);
        const bs = l.back !== -1 ? sdById(l.back) : null;
        const fBad = fs && broken.has(fs.sector);
        const bBad = bs && broken.has(bs.sector);
        if (bBad && !fBad) {
          l.back = -1;
          l.flags = (l.flags & ~4) | 1;
          if (fs && (!fs.middle || fs.middle === '-')) fs.middle = 'STARTAN2';
        } else if (fBad && !bBad && l.back !== -1) {
          l.front = l.back;
          l.back = -1;
          l.flags = (l.flags & ~4) | 1;
          const nfs = sdById(l.front);
          if (nfs && (!nfs.middle || nfs.middle === '-')) nfs.middle = 'STARTAN2';
        } else if (fBad && bBad) {
          // Both broken — drop the wall (mark degenerate, filtered below).
          l.v1 = l.v2;
        }
      }
    }
  }

  // Prune orphan sectors and degenerate (v1==v2) linedefs left by the
  // cleanup pass above.
  const aliveSecRefs = new Set();
  for (const l of linedefs) {
    if (l.v1 === l.v2) continue;
    if (l.front !== -1) { const sd = sdById(l.front); if (sd) aliveSecRefs.add(sd.sector); }
    if (l.back !== -1)  { const sd = sdById(l.back);  if (sd) aliveSecRefs.add(sd.sector); }
  }
  const prunedSectors = sectors.filter(s => aliveSecRefs.has(s.id));
  const prunedLinedefs = linedefs.filter(l => l.v1 !== l.v2);

  return { vertices: verts, linedefs: prunedLinedefs, sidedefs, sectors: prunedSectors, things };
}

// ============================================================================
// GEOMETRY
// ============================================================================
function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }
function pointToSegmentDist2(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return dist2(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return dist2(px, py, ax + t * dx, ay + t * dy);
}
// Standard shoelace: returns positive for CCW polygons in Y-up world coords.
function polygonSignedArea(pts) {
  let a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    a += pts[j].x * pts[i].y - pts[i].x * pts[j].y;
  }
  return a / 2;
}
function polygonCentroid(pts) {
  let cx = 0, cy = 0, a = 0;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const f = pts[j].x * pts[i].y - pts[i].x * pts[j].y;
    cx += (pts[j].x + pts[i].x) * f;
    cy += (pts[j].y + pts[i].y) * f;
    a += f;
  }
  a *= 0.5;
  if (Math.abs(a) < 1e-9) {
    let sx = 0, sy = 0; for (const p of pts) { sx += p.x; sy += p.y; }
    return { x: sx / pts.length, y: sy / pts.length };
  }
  return { x: cx / (6 * a), y: cy / (6 * a) };
}
function pointInPolygon(px, py, pts) {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const xi = pts[i].x, yi = pts[i].y;
    const xj = pts[j].x, yj = pts[j].y;
    const intersect = ((yi > py) !== (yj > py)) &&
      (px < (xj - xi) * (py - yi) / ((yj - yi) || 1e-9) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}
function angleOf(dx, dy) { let a = Math.atan2(dy, dx); if (a < 0) a += 2 * Math.PI; return a; }
function cwDistance(fromAngle, toAngle) {
  let d = fromAngle - toAngle;
  while (d < 0) d += 2 * Math.PI;
  while (d >= 2 * Math.PI) d -= 2 * Math.PI;
  return d;
}

function buildSectorLoops(map) {
  const result = new Map();
  if (!map.sectors.length) return result;
  const vmap = new Map(map.vertices.map(v => [v.id, v]));
  const sdmap = new Map(map.sidedefs.map(s => [s.id, s]));
  const edgesBySector = new Map();
  const pushEdge = (sectorId, from, to, lineId) => {
    if (!edgesBySector.has(sectorId)) edgesBySector.set(sectorId, []);
    edgesBySector.get(sectorId).push({ from, to, lineId });
  };
  for (const ld of map.linedefs) {
    if (ld.front && ld.front !== -1) {
      const sd = sdmap.get(ld.front);
      if (sd && sd.sector) pushEdge(sd.sector, ld.v2, ld.v1, ld.id);
    }
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
    const used = new Set(); const loops = [];
    for (let startIdx = 0; startIdx < edges.length; startIdx++) {
      if (used.has(startIdx)) continue;
      const loop = []; let curIdx = startIdx; let safety = edges.length + 4;
      while (safety-- > 0 && !used.has(curIdx)) {
        used.add(curIdx);
        const e = edges[curIdx];
        loop.push(e.from);
        const candidates = (fromIndex.get(e.to) || []).filter(i => !used.has(i));
        if (candidates.length === 0) break;
        let nextIdx;
        if (candidates.length === 1) nextIdx = candidates[0];
        else {
          const fv = vmap.get(e.from), tv = vmap.get(e.to);
          if (!fv || !tv) break;
          const inAng = angleOf(tv.x - fv.x, tv.y - fv.y);
          const revIn = (inAng + Math.PI) % (2 * Math.PI);
          let best = candidates[0], bestDist = Infinity;
          for (const ci of candidates) {
            const ce = edges[ci];
            const cv = vmap.get(ce.from), ov = vmap.get(ce.to);
            if (!cv || !ov) continue;
            const outAng = angleOf(ov.x - cv.x, ov.y - cv.y);
            const d = cwDistance(revIn, outAng);
            if (d < 1e-6) continue;
            if (d < bestDist) { bestDist = d; best = ci; }
          }
          nextIdx = best;
        }
        curIdx = nextIdx;
        if (edges[curIdx].from !== e.to) break;
      }
      if (loop.length >= 3) loops.push(loop);
    }
    if (loops.length) result.set(sectorId, loops);
  }
  return result;
}

function sectorAt(map, sectorLoops, px, py) {
  const vmap = new Map(map.vertices.map(v => [v.id, v]));
  let best = null, bestArea = Infinity;
  for (const [secId, loops] of sectorLoops) {
    let inside = false; let totalArea = 0;
    for (const loop of loops) {
      const pts = loop.map(id => vmap.get(id)).filter(Boolean);
      if (pts.length < 3) continue;
      if (pointInPolygon(px, py, pts)) inside = !inside;
      totalArea += Math.abs(polygonSignedArea(pts));
    }
    if (inside && totalArea < bestArea) { bestArea = totalArea; best = secId; }
  }
  return best;
}

// Detect "phantom" sectors: a sector is a phantom if its loop is identical
// (or reverse-identical) to another sector's loop, meaning two sectors share
// the same boundary and stack on top of each other in the world.
// Also flags sectors that have no loops at all (sidedefs reference them but
// no closed boundary can be reconstructed).
// Returns { phantoms: Set<sectorId>, partners: Map<sectorId, sectorId> }
// where partners[phantom] = the "real" sector it shadows (lower numeric id).
function findPhantomSectors(map, sectorLoops) {
  const phantoms = new Set();
  const partners = new Map();
  // No loops at all → can't see, can't reach. Phantom.
  for (const s of map.sectors) {
    if (!sectorLoops.has(s.id)) phantoms.add(s.id);
  }
  // Same loop vertex-set as another sector (in either direction) → phantom.
  const sigs = new Map(); // signature -> first sectorId we saw it on
  const sigOf = (loop) => {
    // Canonical signature: sorted vertex IDs joined.
    return [...loop].sort().join('|');
  };
  for (const [secId, loops] of sectorLoops) {
    for (const loop of loops) {
      const sig = sigOf(loop);
      if (sigs.has(sig)) {
        const partner = sigs.get(sig);
        if (partner !== secId) {
          // Later sector is the phantom; keep the earlier one.
          phantoms.add(secId);
          partners.set(secId, partner);
        }
      } else {
        sigs.set(sig, secId);
      }
    }
  }
  return { phantoms, partners };
}

// Remove phantom sectors and the sidedefs that reference them. Linedef
// front/back fields that referenced removed sidedefs become -1 and the line
// flips back to one-sided.
function cleanPhantomSectors(map) {
  const loops = buildSectorLoops(map);
  const { phantoms } = findPhantomSectors(map, loops);
  if (phantoms.size === 0) return { map, removed: 0 };
  const sdToDelete = new Set();
  for (const sd of map.sidedefs) if (phantoms.has(sd.sector)) sdToDelete.add(sd.id);
  const nextSectors = map.sectors.filter(s => !phantoms.has(s.id));
  const nextSidedefs = map.sidedefs.filter(sd => !sdToDelete.has(sd.id));
  const nextLinedefs = map.linedefs.map(l => {
    let f = sdToDelete.has(l.front) ? -1 : l.front;
    let b = sdToDelete.has(l.back) ? -1 : l.back;
    let flags = l.flags;
    if ((f === -1) !== (b === -1)) {
      // Became one-sided: clear two-sided bit, set impassable.
      flags = (flags | 1) & ~4;
    }
    return { ...l, front: f, back: b, flags };
  });
  return {
    map: { ...map, sectors: nextSectors, sidedefs: nextSidedefs, linedefs: nextLinedefs },
    removed: phantoms.size,
  };
}

// WAD validity checker. Surfaces issues the engine will complain about
// before the user saves and runs the map in GZDoom: dangling vertex/sidedef
// references, zero-length lines, duplicate-coincident lines, out-of-int16
// coordinates, sectors with floor above ceiling, missing player start,
// orphan sectors, and a few visual-glitch traps (height step on a one-sided
// line, two-sided line with no upper/lower on a height delta).
function validateMap(map) {
  const issues = [];
  const vIds = new Set(map.vertices.map(v => v.id));
  const sdIds = new Set(map.sidedefs.map(s => s.id));
  const secIds = new Set(map.sectors.map(s => s.id));
  const vCoord = new Map();
  for (const v of map.vertices) vCoord.set(v.id, v);

  for (const ld of map.linedefs) {
    if (!vIds.has(ld.v1)) issues.push({ kind: 'error', text: `Line ${ld.id} references missing vertex ${ld.v1}`, where: ld.id });
    if (!vIds.has(ld.v2)) issues.push({ kind: 'error', text: `Line ${ld.id} references missing vertex ${ld.v2}`, where: ld.id });
    if (ld.v1 === ld.v2) issues.push({ kind: 'error', text: `Line ${ld.id} is zero-length (v1==v2)`, where: ld.id });
    if (ld.front !== -1 && !sdIds.has(ld.front)) issues.push({ kind: 'error', text: `Line ${ld.id} references missing front sidedef ${ld.front}`, where: ld.id });
    if (ld.back !== -1 && !sdIds.has(ld.back)) issues.push({ kind: 'error', text: `Line ${ld.id} references missing back sidedef ${ld.back}`, where: ld.id });
    if ((ld.front === -1 || ld.front == null) && (ld.back === -1 || ld.back == null)) {
      issues.push({ kind: 'warning', text: `Line ${ld.id} has no sidedefs (raw line — won't render)`, where: ld.id });
    }
  }

  for (const sd of map.sidedefs) {
    if (!secIds.has(sd.sector)) issues.push({ kind: 'error', text: `Sidedef ${sd.id} references missing sector ${sd.sector}`, where: sd.id });
  }

  // Coincident-line detection: any two distinct lines sharing the same vertex
  // pair (in either direction). True collinear-overlap detection (one line
  // sitting on a sub-segment of another) is more expensive; we catch the
  // common case here.
  const seen = new Map();
  for (const ld of map.linedefs) {
    if (!vIds.has(ld.v1) || !vIds.has(ld.v2) || ld.v1 === ld.v2) continue;
    const key = ld.v1 < ld.v2 ? ld.v1 + '|' + ld.v2 : ld.v2 + '|' + ld.v1;
    if (seen.has(key)) {
      issues.push({ kind: 'warning', text: `Line ${ld.id} overlaps line ${seen.get(key)} (same endpoints)`, where: ld.id });
    } else {
      seen.set(key, ld.id);
    }
  }

  for (const s of map.sectors) {
    if (s.floorH > s.ceilH) issues.push({ kind: 'error', text: `Sector ${s.id} floor (${s.floorH}) above ceiling (${s.ceilH})`, where: s.id });
    if (s.light < 0 || s.light > 255) issues.push({ kind: 'warning', text: `Sector ${s.id} light ${s.light} outside 0..255`, where: s.id });
    if (s.ceilH - s.floorH < 56 && s.ceilH !== s.floorH) {
      issues.push({ kind: 'warning', text: `Sector ${s.id} headroom < 56 (player won't fit)`, where: s.id });
    }
  }

  const refByLine = new Set();
  for (const sd of map.sidedefs) refByLine.add(sd.sector);
  for (const s of map.sectors) {
    if (!refByLine.has(s.id)) issues.push({ kind: 'warning', text: `Sector ${s.id} has no sidedefs (orphan)`, where: s.id });
  }

  const hasPlayer = map.things.some(t => t.type === 1);
  if (!hasPlayer) issues.push({ kind: 'error', text: 'No Player 1 Start (thing type 1)' });

  const COORD_MAX = 32767;
  for (const v of map.vertices) {
    if (Math.abs(v.x) > COORD_MAX || Math.abs(v.y) > COORD_MAX) {
      issues.push({ kind: 'error', text: `Vertex ${v.id} at (${v.x}, ${v.y}) exceeds int16 range`, where: v.id });
    }
  }

  // HOM / Tutti-Frutti: two-sided line with a height step where no upper or
  // lower texture is set on the visible side.
  const sdById = new Map(map.sidedefs.map(s => [s.id, s]));
  const secById = new Map(map.sectors.map(s => [s.id, s]));
  let homCount = 0;
  for (const ld of map.linedefs) {
    if (ld.front === -1 || ld.back === -1) continue;
    const fs = sdById.get(ld.front), bs = sdById.get(ld.back);
    if (!fs || !bs) continue;
    const fsec = secById.get(fs.sector), bsec = secById.get(bs.sector);
    if (!fsec || !bsec) continue;
    if (fsec.floorH !== bsec.floorH) {
      const lowSide = fsec.floorH < bsec.floorH ? fs : bs;
      if (!lowSide.lower || lowSide.lower === '-') {
        homCount++;
        if (homCount <= 5) issues.push({ kind: 'warning', text: `Line ${ld.id} has a floor step with no lower texture (HOM risk)`, where: ld.id });
      }
    }
    if (fsec.ceilH !== bsec.ceilH) {
      const bothSky = fsec.ceilTex === 'F_SKY1' && bsec.ceilTex === 'F_SKY1';
      if (!bothSky) {
        const highSide = fsec.ceilH > bsec.ceilH ? fs : bs;
        if (!highSide.upper || highSide.upper === '-') {
          homCount++;
          if (homCount <= 5) issues.push({ kind: 'warning', text: `Line ${ld.id} has a ceiling step with no upper texture (HOM risk)`, where: ld.id });
        }
      }
    }
  }
  if (homCount > 5) issues.push({ kind: 'warning', text: `(+${homCount - 5} more HOM-risk lines hidden)` });

  // Vanilla / engine count limits. Modern source ports (GZDoom, Crispy)
  // raise these, but warning at vanilla thresholds keeps the map portable.
  if (map.vertices.length  > 32767) issues.push({ kind: 'error',   text: `${map.vertices.length} vertices exceeds the 32767 hard limit` });
  else if (map.vertices.length  > 8000) issues.push({ kind: 'warning', text: `${map.vertices.length} vertices (>8000) — beyond Doom v1.9 reliable load` });
  if (map.linedefs.length > 32767) issues.push({ kind: 'error',   text: `${map.linedefs.length} linedefs exceeds the 32767 hard limit` });
  else if (map.linedefs.length > 8000) issues.push({ kind: 'warning', text: `${map.linedefs.length} linedefs (>8000) — node-build time and BLOCKMAP risk` });
  if (map.sidedefs.length > 65535) issues.push({ kind: 'error',   text: `${map.sidedefs.length} sidedefs exceeds the 65535 uint16 index limit` });
  else if (map.sidedefs.length > 32000) issues.push({ kind: 'warning', text: `${map.sidedefs.length} sidedefs (>32000) — approaching uint16 index limit` });
  if (map.sectors.length  > 32767) issues.push({ kind: 'error',   text: `${map.sectors.length} sectors exceeds the 32767 hard limit` });
  else if (map.sectors.length  > 2000) issues.push({ kind: 'warning', text: `${map.sectors.length} sectors (>2000) — visplane / overdraw risk on weaker ports` });
  if (map.things.length   > 32767) issues.push({ kind: 'error',   text: `${map.things.length} things exceeds the 32767 hard limit` });

  // Map extent. Doom's BLOCKMAP is indexed at 128 units per cell and the
  // entire blockmap header is uint16-indexed; very large maps (extent
  // > ~16384 units on a side) push vanilla and risk the famous 64 KiB
  // blockmap overflow.
  if (map.vertices.length > 0) {
    let xmin = Infinity, xmax = -Infinity, ymin = Infinity, ymax = -Infinity;
    for (const v of map.vertices) {
      if (v.x < xmin) xmin = v.x; if (v.x > xmax) xmax = v.x;
      if (v.y < ymin) ymin = v.y; if (v.y > ymax) ymax = v.y;
    }
    const spanX = xmax - xmin, spanY = ymax - ymin;
    if (spanX > 32000 || spanY > 32000) {
      issues.push({ kind: 'warning', text: `Map extent ${spanX}×${spanY} — vanilla BLOCKMAP overflow risk past ~32000 units on either axis` });
    }
    // BLOCKMAP cell estimate: (spanX/128) × (spanY/128) cells, each ≥4 bytes
    // before list contents. >64 KiB header alone trips vanilla.
    const cells = Math.ceil(spanX / 128) * Math.ceil(spanY / 128);
    if (cells > 32768) {
      issues.push({ kind: 'warning', text: `BLOCKMAP cell count ${cells} (>32768) — vanilla load may fail` });
    }
  }

  return issues;
}

// Generate additional rooms grafted onto an existing map. Finds the bounding
// box of existing geometry, picks a direction with space, and runs a small
// dungeon pass adjacent to that side. New geometry uses fresh IDs offset to
// avoid collisions with the existing map's IDs. The user can then connect
// the new cluster via Draw mode or another Add Rooms call.
// Find closed cycles in the linedef graph that are NOT yet sectors. Returns
// an array of { loop: [vertexId...], centroid: {x,y}, vertices: [{x,y}...] }.
// Drawn freely with the Draw tool, a closed shape sits as raw linedefs until
// the user promotes it. This is WADED's "Make Sector" workflow.
function findPotentialSectors(map) {
  if (!map.linedefs.length || !map.vertices.length) return [];
  // Always-left-turn face traversal on the planar graph of unfilled-side
  // edges. Each linedef contributes a directed edge per missing side; for
  // fully-raw lines (both sides empty) both directions are enqueued. At
  // each junction we pick the most counterclockwise next edge relative to
  // the reverse of the incoming edge, which traces the face that's on the
  // LEFT of the walk direction. Visited-set on directed edges prevents
  // double-traversal. A traversal that returns to its start is a closed
  // face = potential sector.
  const vmap = new Map(map.vertices.map(v => [v.id, v]));
  const edges = [];
  for (const l of map.linedefs) {
    const frontVoid = !l.front || l.front === -1;
    const backVoid = !l.back || l.back === -1;
    // Walking v2->v1 puts the FRONT side on the LEFT of the walk (since front
    // is on the right of v1->v2). For void on the front, that's our void
    // walk. Mirror for back-void.
    if (frontVoid) edges.push({ from: l.v2, to: l.v1, line: l, key: l.id + '|F' });
    if (backVoid)  edges.push({ from: l.v1, to: l.v2, line: l, key: l.id + '|B' });
  }
  if (edges.length < 3) return [];
  const byFrom = new Map();
  for (const e of edges) {
    if (!byFrom.has(e.from)) byFrom.set(e.from, []);
    byFrom.get(e.from).push(e);
  }
  const ang = (from, to) => {
    const fv = vmap.get(from), tv = vmap.get(to);
    return Math.atan2(tv.y - fv.y, tv.x - fv.x);
  };
  const TAU = 2 * Math.PI;
  function nextEdge(e) {
    const cands = (byFrom.get(e.to) || []).filter(c => !(c.line === e.line && c.from === e.to));
    if (!cands.length) return null;
    const revAng = ang(e.to, e.from);
    let best = null, bestD = Infinity;
    for (const c of cands) {
      const a = ang(c.from, c.to);
      let d = a - revAng;
      while (d <= 1e-9) d += TAU;
      while (d > TAU)   d -= TAU;
      if (d < bestD) { bestD = d; best = c; }
    }
    return best;
  }

  // Existing sector loops — used to dedupe candidates that already exist.
  const existingSigs = new Set();
  const existingLoops = buildSectorLoops(map);
  for (const [, ls] of existingLoops) {
    for (const loop of ls) existingSigs.add([...loop].sort().join('|'));
  }

  const visited = new Set();
  const seenSigs = new Set();
  const result = [];
  for (const start of edges) {
    if (visited.has(start.key)) continue;
    const cycle = [];
    let cur = start;
    let safety = edges.length + 4;
    while (safety-- > 0) {
      if (visited.has(cur.key)) { cycle.length = 0; break; }
      visited.add(cur.key);
      cycle.push(cur.from);
      const next = nextEdge(cur);
      if (!next) { cycle.length = 0; break; }
      if (next === start) break; // closed cycle
      cur = next;
    }
    if (cycle.length < 3) continue;
    const sig = [...cycle].sort().join('|');
    if (seenSigs.has(sig) || existingSigs.has(sig)) continue;
    seenSigs.add(sig);
    const pts = cycle.map(id => vmap.get(id)).filter(Boolean);
    if (pts.length < 3) continue;
    const area = polygonSignedArea(pts);
    if (Math.abs(area) < 64) continue;
    // Reject the outer infinite face. A cycle that walks around the OUTSIDE
    // of a sub-structure will enclose every vertex of that sub-structure;
    // the inner face that's actually paintable encloses none. This single
    // check eliminates the phantom-fill sector bug where Make Sector
    // produced a sector covering an entire structure's footprint.
    {
      const cycleSet = new Set(cycle);
      let enclosesAny = false;
      for (const v of map.vertices) {
        if (cycleSet.has(v.id)) continue;
        if (pointInPolygon(v.x, v.y, pts)) { enclosesAny = true; break; }
      }
      if (enclosesAny) continue;
    }
    // Don't filter by orientation — buildSectorFromLoop normalizes the walk
    // direction when converting, so either CW or CCW cycle works.
    result.push({ loop: cycle, vertices: pts, centroid: polygonCentroid(pts), area });
  }
  return result;
}

function buildAddedRooms(existing) {
  let exMinX = Infinity, exMaxX = -Infinity, exMinY = Infinity, exMaxY = -Infinity;
  for (const v of existing.vertices) {
    if (v.x < exMinX) exMinX = v.x; if (v.x > exMaxX) exMaxX = v.x;
    if (v.y < exMinY) exMinY = v.y; if (v.y > exMaxY) exMaxY = v.y;
  }
  if (!isFinite(exMinX)) return existing;
  const GAP = 256;

  // Generate up to 16 candidate fresh dungeons and try each on all 4 sides,
  // also sliding perpendicular to maximize wall-overlap. Accept the first
  // (fresh, side, slide) combination that BOTH places without overlap AND
  // produces a successful tryConnectClusters. The user wants huge
  // interconnected mazes — no orphan wings.
  let chosen = null;
  let chosenCombined = null;
  let lastValidPlacement = null;
  for (let attempt = 0; attempt < 16; attempt++) {
    const fresh = generateDungeon();
    let fMinX = Infinity, fMaxX = -Infinity, fMinY = Infinity, fMaxY = -Infinity;
    for (const v of fresh.vertices) {
      if (v.x < fMinX) fMinX = v.x; if (v.x > fMaxX) fMaxX = v.x;
      if (v.y < fMinY) fMinY = v.y; if (v.y > fMaxY) fMaxY = v.y;
    }
    const sides = ['E', 'W', 'N', 'S'];
    for (let i = sides.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [sides[i], sides[j]] = [sides[j], sides[i]];
    }
    // Try each side with several perpendicular slides (offsets) so we can
    // hunt for an alignment that puts a wall-pair into view.
    const slideOffsets = [0, 256, -256, 512, -512, 768, -768];
    for (const side of sides) {
      for (const slide of slideOffsets) {
        let dx, dy;
        if (side === 'E')      { dx = exMaxX + GAP - fMinX; dy = ((exMinY + exMaxY) / 2) - ((fMinY + fMaxY) / 2) + slide; }
        else if (side === 'W') { dx = exMinX - GAP - fMaxX; dy = ((exMinY + exMaxY) / 2) - ((fMinY + fMaxY) / 2) + slide; }
        else if (side === 'N') { dx = ((exMinX + exMaxX) / 2) - ((fMinX + fMaxX) / 2) + slide; dy = exMaxY + GAP - fMinY; }
        else                   { dx = ((exMinX + exMaxX) / 2) - ((fMinX + fMaxX) / 2) + slide; dy = exMinY - GAP - fMaxY; }
        dx = Math.round(dx / 32) * 32;
        dy = Math.round(dy / 32) * 32;
        const tMinX = fMinX + dx, tMaxX = fMaxX + dx;
        const tMinY = fMinY + dy, tMaxY = fMaxY + dy;
        if (Math.abs(tMinX) > 30000 || Math.abs(tMaxX) > 30000 ||
            Math.abs(tMinY) > 30000 || Math.abs(tMaxY) > 30000) continue;
        const M = 64;
        const overlap = !(tMaxX + M < exMinX || exMaxX + M < tMinX ||
                          tMaxY + M < exMinY || exMaxY + M < tMinY);
        if (overlap) continue;
        // Build the combined map for this candidate and try to connect.
        const candidate = { fresh, dx, dy, side };
        const built = buildCombinedForCandidate(existing, candidate);
        const connected = tryConnectClusters(built.combined, existing, built.vOffset, side, GAP);
        if (connected) {
          chosen = candidate;
          chosenCombined = connected;
          break;
        }
        // Remember a valid placement in case no connection ever works.
        if (!lastValidPlacement) {
          lastValidPlacement = { candidate, combined: built.combined };
        }
      }
      if (chosen) break;
    }
    if (chosen) break;
  }
  if (chosenCombined) return chosenCombined;
  if (lastValidPlacement) return lastValidPlacement.combined;
  return existing;
}

// Splice a fresh dungeon onto the existing map at the given translation,
// remapping all IDs to avoid collisions. Returns { combined, vOffset } so the
// caller can pass vOffset to tryConnectClusters to identify "new" lines.
function buildCombinedForCandidate(existing, candidate) {
  const { fresh, dx, dy } = candidate;

  // Remap fresh IDs onto an offset that won't clash with existing IDs.
  const vOffset = existing.vertices.length;
  const sdOffset = existing.sidedefs.length;
  const sOffset = existing.sectors.length;
  const lOffset = existing.linedefs.length;
  const tOffset = existing.things.length;
  const vIdMap = new Map(fresh.vertices.map((v, i) => [v.id, 'v' + (vOffset + i)]));
  const sdIdMap = new Map(fresh.sidedefs.map((sd, i) => [sd.id, 'sd' + (sdOffset + i)]));
  const sIdMap = new Map(fresh.sectors.map((s, i) => [s.id, 's' + (sOffset + i)]));
  const newVertices = fresh.vertices.map((v) => ({
    id: vIdMap.get(v.id), x: v.x + dx, y: v.y + dy,
  }));
  const newSidedefs = fresh.sidedefs.map((sd) => ({
    ...sd, id: sdIdMap.get(sd.id), sector: sIdMap.get(sd.sector),
  }));
  const newSectors = fresh.sectors.map((s) => ({
    ...s, id: sIdMap.get(s.id),
  }));
  const newLinedefs = fresh.linedefs.map((l, i) => ({
    ...l, id: 'l' + (lOffset + i),
    v1: vIdMap.get(l.v1), v2: vIdMap.get(l.v2),
    front: l.front === -1 ? -1 : sdIdMap.get(l.front),
    back: l.back === -1 ? -1 : sdIdMap.get(l.back),
  }));
  const newThings = fresh.things
    .filter(t => t.type !== 1)
    .map((t, i) => ({
      ...t, id: 't' + (tOffset + i),
      x: t.x + dx, y: t.y + dy,
    }));
  const combined = {
    vertices: [...existing.vertices, ...newVertices],
    linedefs: [...existing.linedefs, ...newLinedefs],
    sidedefs: [...existing.sidedefs, ...newSidedefs],
    sectors: [...existing.sectors, ...newSectors],
    things: [...existing.things, ...newThings],
  };
  return { combined, vOffset };
}

// Carve a connecting corridor with proper DR-1 doors between the existing
// map and the just-grafted fresh cluster. Picks the closest pair of opposing
// one-sided axis-aligned walls (existing on one side of the growth, fresh on
// the other), splits each at the doorway endpoints, builds two 16-deep
// closed door bodies and a 64-tall corridor body between them, with DOOR3
// upper textures, DOORTRAK + LOWER_UNPEGGED on the tracks, and the door
// special on the back-side door-body sector so the ceiling rises correctly.
function tryConnectClusters(map, existing, vOffset, side, GAP) {
  const existingLineIds = new Set(existing.linedefs.map(l => l.id));
  const vById = new Map(map.vertices.map(v => [v.id, v]));

  function lineGeom(l) {
    const a = vById.get(l.v1), b = vById.get(l.v2);
    if (!a || !b) return null;
    const dx = b.x - a.x, dy = b.y - a.y;
    const horiz = Math.abs(dy) < 0.5;
    const vert  = Math.abs(dx) < 0.5;
    if (!horiz && !vert) return null;
    return {
      a, b, horiz, vert,
      perp: horiz ? a.y : a.x,
      lo: horiz ? Math.min(a.x, b.x) : Math.min(a.y, b.y),
      hi: horiz ? Math.max(a.x, b.x) : Math.max(a.y, b.y),
    };
  }

  const wantVert = side === 'E' || side === 'W';
  let existingPick = null, newPick = null;
  for (const l of map.linedefs) {
    if (l.back !== -1) continue;
    const g = lineGeom(l);
    if (!g) continue;
    if (wantVert && !g.vert) continue;
    if (!wantVert && !g.horiz) continue;
    if (g.hi - g.lo < 64) continue;
    const isExisting = existingLineIds.has(l.id);
    if (isExisting) {
      if (side === 'E' && (!existingPick || g.perp > existingPick.g.perp)) existingPick = { line: l, g };
      else if (side === 'W' && (!existingPick || g.perp < existingPick.g.perp)) existingPick = { line: l, g };
      else if (side === 'N' && (!existingPick || g.perp > existingPick.g.perp)) existingPick = { line: l, g };
      else if (side === 'S' && (!existingPick || g.perp < existingPick.g.perp)) existingPick = { line: l, g };
    } else {
      if (side === 'E' && (!newPick || g.perp < newPick.g.perp)) newPick = { line: l, g };
      else if (side === 'W' && (!newPick || g.perp > newPick.g.perp)) newPick = { line: l, g };
      else if (side === 'N' && (!newPick || g.perp < newPick.g.perp)) newPick = { line: l, g };
      else if (side === 'S' && (!newPick || g.perp > newPick.g.perp)) newPick = { line: l, g };
    }
  }
  if (!existingPick || !newPick) return null;

  const eg = existingPick.g, ng = newPick.g;
  const ovLo = Math.max(eg.lo, ng.lo);
  const ovHi = Math.min(eg.hi, ng.hi);
  if (ovHi - ovLo < 64) return null;
  const cMid = Math.round((ovLo + ovHi) / 2 / 32) * 32;
  const c0 = cMid - 32, c1 = cMid + 32;
  // Pull cMid in if rounding pushed the doorway past a wall endpoint.
  if (c0 < eg.lo + 0.5 || c0 < ng.lo + 0.5 || c1 > eg.hi - 0.5 || c1 > ng.hi - 0.5) return null;

  const THICK = 16;
  const Ex = eg.perp;
  const Nx = ng.perp;
  const eFront = map.sidedefs.find(s => s.id === existingPick.line.front);
  const nFront = map.sidedefs.find(s => s.id === newPick.line.front);
  if (!eFront || !nFront) return null;
  const eRoomSec = map.sectors.find(s => s.id === eFront.sector);
  const nRoomSec = map.sectors.find(s => s.id === nFront.sector);
  if (!eRoomSec || !nRoomSec) return null;
  if (Math.abs(eRoomSec.floorH - nRoomSec.floorH) > 48) return null;
  const corridorFloorH = Math.max(eRoomSec.floorH, nRoomSec.floorH);
  const corridorCeilH = corridorFloorH + 96;

  const verts = [...map.vertices];
  const sidedefs = [...map.sidedefs];
  const sectors = [...map.sectors];
  const linedefs = [...map.linedefs];
  const vmap2 = new Map(verts.map(v => [v.id, v]));
  const getV = (x, y) => {
    x = Math.round(x); y = Math.round(y);
    for (const v of verts) if (v.x === x && v.y === y) return v.id;
    const id = 'v' + verts.length;
    const obj = { id, x, y };
    verts.push(obj); vmap2.set(id, obj);
    return id;
  };
  const newSec = (props) => {
    const id = 's' + sectors.length;
    sectors.push({
      id, floorH: 0, ceilH: 128, floorTex: 'FLOOR4_8', ceilTex: 'CEIL3_5',
      light: 112, special: 0, tag: 0, ...props,
    });
    return id;
  };
  const newSd = (secId, props = {}) => {
    const id = 'sd' + sidedefs.length;
    sidedefs.push({
      id, xOff: 0, yOff: 0, upper: '-', lower: '-', middle: '-',
      sector: secId, ...props,
    });
    return id;
  };
  function emit(v1, v2, frontSec, backSec, opts = {}) {
    // Skip degenerate segments — these arise when the doorway centre
    // happens to coincide with a wall's endpoint, producing a zero-length
    // wall-segment in the split.
    if (v1 === v2) return null;
    const front = newSd(frontSec, {
      middle: opts.middle ?? '-',
      upper: opts.upper ?? '-',
      lower: opts.lower ?? '-',
    });
    const back = backSec == null ? -1 : newSd(backSec, {
      middle: '-', upper: opts.backUpper ?? '-',
    });
    linedefs.push({
      id: 'l' + linedefs.length,
      v1, v2,
      flags: (back === -1 ? 1 : 4) | (opts.flags || 0),
      special: opts.special || 0, tag: 0, front, back,
    });
    return linedefs[linedefs.length - 1];
  }
  const doorEId = newSec({ floorH: corridorFloorH, ceilH: corridorFloorH });
  const corridorId = newSec({ floorH: corridorFloorH, ceilH: corridorCeilH });
  const doorNId = newSec({ floorH: corridorFloorH, ceilH: corridorFloorH });

  const exLineId = existingPick.line.id;
  const nwLineId = newPick.line.id;
  const exOrigFront = map.sidedefs.find(s => s.id === existingPick.line.front);
  const nwOrigFront = map.sidedefs.find(s => s.id === newPick.line.front);
  const exMiddle = exOrigFront?.middle && exOrigFront.middle !== '-' ? exOrigFront.middle : 'STARTAN2';
  const nwMiddle = nwOrigFront?.middle && nwOrigFront.middle !== '-' ? nwOrigFront.middle : 'STARTAN2';

  // Drop the original walls — they're being replaced with three segments each.
  const dropIdx = linedefs.findIndex(l => l.id === exLineId);
  if (dropIdx >= 0) linedefs.splice(dropIdx, 1);
  const dropIdx2 = linedefs.findIndex(l => l.id === nwLineId);
  if (dropIdx2 >= 0) linedefs.splice(dropIdx2, 1);

  if (wantVert) {
    // Horizontal growth (E/W). Walls are vertical. For E: existing room
    // sits west of the existing wall (walks SOUTH so the room is on the
    // RIGHT = west of v1→v2). For W: mirrored.
    // We resolve once which wall is the "western boundary of the gap" and
    // which is the "eastern boundary"; their absolute geometry decides.
    const westExisting = side === 'E';
    const westX = westExisting ? Ex : Nx;     // wall at lower x
    const eastX = westExisting ? Nx : Ex;     // wall at higher x
    const westRoomSec = westExisting ? eRoomSec.id : nRoomSec.id;
    const eastRoomSec = westExisting ? nRoomSec.id : eRoomSec.id;
    const westOrig = westExisting ? existingPick.line : newPick.line;
    const eastOrig = westExisting ? newPick.line : existingPick.line;
    const westMiddle = westExisting ? exMiddle : nwMiddle;
    const eastMiddle = westExisting ? nwMiddle : exMiddle;
    const westDoorId = westExisting ? doorEId : doorNId;
    const eastDoorId = westExisting ? doorNId : doorEId;

    // Endpoints. vWL/vWU = west wall split points at (westX, c0/c1).
    // vEL_/vEU_ = east wall split points at (eastX, c0/c1).
    // vWBL/vWBU = west door body's corridor-side corners (westX+THICK, c0/c1).
    // vEBL_/vEBU_ = east door body's corridor-side corners (eastX-THICK, c0/c1).
    const vWL  = getV(westX, c0),       vWU  = getV(westX, c1);
    const vWBL = getV(westX + THICK, c0), vWBU = getV(westX + THICK, c1);
    const vEBL = getV(eastX - THICK, c0), vEBU = getV(eastX - THICK, c1);
    const vEL2 = getV(eastX, c0),       vEU2 = getV(eastX, c1);

    // Split the west wall into [northSeg, doorFace, southSeg]. The west
    // wall walks SOUTH (room on right = west of wall, so front=room).
    // Identify which original endpoint is north/south.
    const wV1 = vmap2.get(westOrig.v1), wV2 = vmap2.get(westOrig.v2);
    const wNorthV = wV1.y > wV2.y ? westOrig.v1 : westOrig.v2;
    const wSouthV = wV1.y > wV2.y ? westOrig.v2 : westOrig.v1;
    emit(wNorthV, vWU, westRoomSec, null, { middle: westMiddle });
    emit(vWL, wSouthV, westRoomSec, null, { middle: westMiddle });
    // Door face — walks south so front=room, back=door body. DR-1 will
    // raise the back sector's ceiling = the door body.
    emit(vWU, vWL, westRoomSec, westDoorId, {
      special: 1, upper: 'DOOR1', backUpper: 'DOOR1',
    });

    // Split the east wall similarly, but walking NORTH so the east room
    // ends up on the right of v1→v2 (= east of wall, where the room is).
    const eV1 = vmap2.get(eastOrig.v1), eV2 = vmap2.get(eastOrig.v2);
    const eNorthV = eV1.y > eV2.y ? eastOrig.v1 : eastOrig.v2;
    const eSouthV = eV1.y > eV2.y ? eastOrig.v2 : eastOrig.v1;
    emit(eSouthV, vEL2, eastRoomSec, null, { middle: eastMiddle });
    emit(vEU2, eNorthV, eastRoomSec, null, { middle: eastMiddle });
    emit(vEL2, vEU2, eastRoomSec, eastDoorId, {
      special: 1, upper: 'DOOR1', backUpper: 'DOOR1',
    });

    // West door body — south track walks west, north track walks east, both
    // with the door body on the right of v1→v2. DOORTRAK middle + lower
    // unpegged so the texture stays anchored to floor as the ceiling moves.
    emit(vWBL, vWL, westDoorId, null, { middle: 'DOORTRAK', flags: 16 });   // south track
    emit(vWU, vWBU, westDoorId, null, { middle: 'DOORTRAK', flags: 16 });   // north track
    // Corridor interface for west door body — walks NORTH so the corridor
    // is on the right (east of west door body), door body on the left.
    emit(vWBL, vWBU, corridorId, westDoorId, { flags: 16, special: 1, upper: 'DOOR1', backUpper: 'DOOR1' });

    // East door body tracks (mirror)
    emit(vEL2, vEBL, eastDoorId, null, { middle: 'DOORTRAK', flags: 16 });   // south track
    emit(vEBU, vEU2, eastDoorId, null, { middle: 'DOORTRAK', flags: 16 });   // north track
    emit(vEBU, vEBL, corridorId, eastDoorId, { flags: 16, special: 1, upper: 'DOOR1', backUpper: 'DOOR1' });

    // Corridor body's two long walls — south wall walks west, north walks
    // east, both with corridor on the right.
    emit(vEBL, vWBL, corridorId, null, { middle: westMiddle });
    emit(vWBU, vEBU, corridorId, null, { middle: westMiddle });
  } else {
    // Vertical growth (N/S). Walls are horizontal. For N growth the
    // existing wall is south of the new wall. We need the south wall to
    // walk EAST (room south of wall is on the right of east-going), and
    // the north wall to walk WEST.
    const southExisting = side === 'N';
    const southY = southExisting ? Ex : Nx;
    const northY = southExisting ? Nx : Ex;
    const southRoomSec = southExisting ? eRoomSec.id : nRoomSec.id;
    const northRoomSec = southExisting ? nRoomSec.id : eRoomSec.id;
    const southOrig = southExisting ? existingPick.line : newPick.line;
    const northOrig = southExisting ? newPick.line : existingPick.line;
    const southMiddle = southExisting ? exMiddle : nwMiddle;
    const northMiddle = southExisting ? nwMiddle : exMiddle;
    const southDoorId = southExisting ? doorEId : doorNId;
    const northDoorId = southExisting ? doorNId : doorEId;

    const vSL  = getV(c0, southY),         vSU  = getV(c1, southY);
    const vSBL = getV(c0, southY + THICK), vSBU = getV(c1, southY + THICK);
    const vNBL = getV(c0, northY - THICK), vNBU = getV(c1, northY - THICK);
    const vNL2 = getV(c0, northY),         vNU2 = getV(c1, northY);

    // Split south wall walking EAST so room (south side) is on the right.
    const sV1 = vmap2.get(southOrig.v1), sV2 = vmap2.get(southOrig.v2);
    const sWestV = sV1.x < sV2.x ? southOrig.v1 : southOrig.v2;
    const sEastV = sV1.x < sV2.x ? southOrig.v2 : southOrig.v1;
    emit(sWestV, vSL, southRoomSec, null, { middle: southMiddle });
    emit(vSU, sEastV, southRoomSec, null, { middle: southMiddle });
    emit(vSL, vSU, southRoomSec, southDoorId, {
      special: 1, upper: 'DOOR1', backUpper: 'DOOR1',
    });

    // Split north wall walking WEST so room (north side) is on the right.
    const nV1 = vmap2.get(northOrig.v1), nV2 = vmap2.get(northOrig.v2);
    const nWestV = nV1.x < nV2.x ? northOrig.v1 : northOrig.v2;
    const nEastV = nV1.x < nV2.x ? northOrig.v2 : northOrig.v1;
    emit(nEastV, vNU2, northRoomSec, null, { middle: northMiddle });
    emit(vNL2, nWestV, northRoomSec, null, { middle: northMiddle });
    emit(vNU2, vNL2, northRoomSec, northDoorId, {
      special: 1, upper: 'DOOR1', backUpper: 'DOOR1',
    });

    // South door body tracks. Door body interior is at y ∈ (southY,
    // southY+THICK), x ∈ (c0, c1). West track at x=c0 must walk north so
    // the interior (east of x=c0) is on the right; east track at x=c1
    // walks south so interior (west of x=c1) is on the right. Corridor
    // interface at y=southY+THICK walks west so the corridor body (north
    // of y=southY+THICK) ends up on the right.
    emit(vSL, vSBL, southDoorId, null, { middle: 'DOORTRAK', flags: 16 });  // west track, north
    emit(vSBU, vSU, southDoorId, null, { middle: 'DOORTRAK', flags: 16 });  // east track, south
    emit(vSBU, vSBL, corridorId, southDoorId, { flags: 16, special: 1, upper: 'DOOR1', backUpper: 'DOOR1' });

    // North door body interior at y ∈ (northY-THICK, northY), x ∈ (c0,c1).
    // West track at x=c0 walks north (interior east); east track at x=c1
    // walks south (interior west). Corridor interface at y=northY-THICK
    // walks east so corridor body (south of that line) is on the right.
    emit(vNBL, vNL2, northDoorId, null, { middle: 'DOORTRAK', flags: 16 });  // west track, north
    emit(vNU2, vNBU, northDoorId, null, { middle: 'DOORTRAK', flags: 16 });  // east track, south
    emit(vNBL, vNBU, corridorId, northDoorId, { flags: 16, special: 1, upper: 'DOOR1', backUpper: 'DOOR1' });

    // Corridor body's long walls — west wall walks north, east wall walks
    // south, both with the corridor body on the right of v1→v2.
    emit(vSBL, vNBL, corridorId, null, { middle: southMiddle });
    emit(vNBU, vSBU, corridorId, null, { middle: southMiddle });
  }

  return { ...map, vertices: verts, linedefs, sidedefs, sectors };
}

// ============================================================================
// TOPOLOGY RESOLVER
// ============================================================================
// Split any existing linedef that passes through vertex vId's position.
// WADED behaviour: drawing a line whose endpoint lands mid-segment on an
// existing wall must SPLIT that wall so the new vertex becomes a shared
// junction. Without this, findPotentialSectors can't close cycles that
// mix new lines with existing ones.
function splitLinesAtVertex(map, vId) {
  const vmap = new Map(map.vertices.map(v => [v.id, v]));
  const v = vmap.get(vId);
  if (!v) return map;
  const EPS = 1.5;
  const eps2 = EPS * EPS;
  let sidedefs = map.sidedefs.slice();
  let sdCounter = sidedefs.length;
  const mintSdId = () => 'sd' + (sdCounter++);
  let lCounter = map.linedefs.length;
  const mintLId = () => 'l' + (lCounter++);
  const cloneSd = (sdId) => {
    if (!sdId || sdId === -1) return sdId ?? -1;
    const src = sidedefs.find(s => s.id === sdId);
    if (!src) return -1;
    const clone = { ...src, id: mintSdId() };
    sidedefs.push(clone);
    return clone.id;
  };
  const newLines = [];
  let changed = false;
  for (const l of map.linedefs) {
    if (l.v1 === vId || l.v2 === vId) { newLines.push(l); continue; }
    const a = vmap.get(l.v1), b = vmap.get(l.v2);
    if (!a || !b) { newLines.push(l); continue; }
    // Skip if the vertex is at one of the endpoints (already a junction).
    if (dist2(v.x, v.y, a.x, a.y) < eps2 || dist2(v.x, v.y, b.x, b.y) < eps2) { newLines.push(l); continue; }
    const d2 = pointToSegmentDist2(v.x, v.y, a.x, a.y, b.x, b.y);
    if (d2 > eps2) { newLines.push(l); continue; }
    // Split into two halves. Clone sidedefs for the second half so each line
    // owns its own sidedef objects (same sector, same textures, distinct ID).
    const half2Front = cloneSd(l.front);
    const half2Back = cloneSd(l.back);
    newLines.push({ ...l, v2: vId });
    newLines.push({ ...l, id: mintLId(), v1: vId, front: half2Front, back: half2Back });
    changed = true;
  }
  if (!changed) return map;
  return { ...map, linedefs: newLines, sidedefs };
}

function buildSectorFromLoop(map, chain, opts = {}) {
  if (chain.length < 4) return null;
  if (chain[0] !== chain[chain.length - 1]) return null;
  const vmap = new Map(map.vertices.map(v => [v.id, v]));
  const pts = [];
  for (let i = 0; i < chain.length - 1; i++) {
    const v = vmap.get(chain[i]); if (!v) return null;
    pts.push({ x: v.x, y: v.y });
  }
  if (pts.length < 3) return null;

  // Normalize walk so interior is on the RIGHT of each step.
  // In our world coords (Y-up), CW polygon = signed area < 0; interior on RIGHT.
  let signed = polygonSignedArea(pts);
  let walk = chain.slice(0, -1);
  if (signed > 0) { walk = walk.slice().reverse(); pts.reverse(); signed = -signed; }
  walk.push(walk[0]);

  const cent = polygonCentroid(pts);

  // Phantom guard: if any existing sector already has a loop with the same
  // vertex set as our closing chain, we're just retracing that sector's
  // boundary. Return it instead of stacking a phantom on the empty back
  // sides of every wall. (Vertex-set match is robust against line-storage
  // orientation, walk direction, and starting vertex.)
  {
    const chainVerts = new Set(walk.slice(0, -1));
    const existingLoops = buildSectorLoops(map);
    let matchedSec = null;
    outer: for (const [sId, loops] of existingLoops) {
      for (const loop of loops) {
        if (loop.length !== chainVerts.size) continue;
        let allIn = true;
        for (const v of loop) if (!chainVerts.has(v)) { allIn = false; break; }
        if (allIn) { matchedSec = sId; break outer; }
      }
    }
    if (matchedSec) {
      return {
        vertices: map.vertices, linedefs: map.linedefs, sidedefs: map.sidedefs,
        sectors: map.sectors, things: map.things,
        createdSectorId: null,
        selectedExistingId: matchedSec,
        parentId: null,
      };
    }
  }

  const loops = buildSectorLoops(map);
  const parentId = sectorAt(map, loops, cent.x, cent.y);
  const parent = parentId ? map.sectors.find(s => s.id === parentId) : null;

  const nextSectors = [...map.sectors];
  const sectorId = newId('s', nextSectors);
  const baseProps = parent
    ? {
        floorH: parent.floorH,
        ceilH: parent.ceilH,
        floorTex: parent.floorTex,
        ceilTex: parent.ceilTex === 'F_SKY1' ? 'CEIL3_5' : parent.ceilTex,
        light: parent.light,
        special: 0, tag: 0,
      }
    : { ...DEFAULT_INDOOR_SECTOR };
  if (opts.overrides) Object.assign(baseProps, opts.overrides);
  const newSector = { id: sectorId, ...baseProps };
  nextSectors.push(newSector);

  const nextSidedefs = [...map.sidedefs];
  const sdmap = new Map(nextSidedefs.map(s => [s.id, s]));
  let sdCounter = nextSidedefs.length;
  const mintSidedef = (sectorRef, props = {}) => {
    const id = 'sd' + (sdCounter++);
    const sd = { id, ...DEFAULT_SIDEDEF, sector: sectorRef, ...props };
    nextSidedefs.push(sd); sdmap.set(id, sd); return id;
  };

  const nextLinedefs = [...map.linedefs];
  const findLine = (a, b) => nextLinedefs.findIndex(l =>
    (l.v1 === a && l.v2 === b) || (l.v1 === b && l.v2 === a));
  const wallTex = 'STARTAN2';

  for (let i = 0; i < walk.length - 1; i++) {
    const a = walk[i], b = walk[i + 1];
    const idx = findLine(a, b);
    if (idx >= 0) {
      let ld = { ...nextLinedefs[idx] };
      const forward = (ld.v1 === a && ld.v2 === b);
      // New sector on interior of CW walk = RIGHT of a->b.
      // forward -> RIGHT = front; reverse -> RIGHT = back.
      const wantFront = forward;
      const hasFront = ld.front && ld.front !== -1;
      const hasBack = ld.back && ld.back !== -1;
      if (wantFront) {
        if (!hasFront) ld.front = mintSidedef(sectorId, { middle: hasBack ? '-' : wallTex });
        else if (!hasBack) ld.back = mintSidedef(sectorId, { middle: '-' });
      } else {
        if (!hasBack) ld.back = mintSidedef(sectorId, { middle: hasFront ? '-' : wallTex });
        else if (!hasFront) ld.front = mintSidedef(sectorId, { middle: '-' });
      }
      const nowF = ld.front && ld.front !== -1;
      const nowB = ld.back && ld.back !== -1;
      if (nowF && nowB) {
        ld.flags = (ld.flags | 4) & ~1;
        const f = sdmap.get(ld.front), bk = sdmap.get(ld.back);
        if (f && (!f.middle || f.middle === wallTex)) f.middle = '-';
        if (bk && (!bk.middle || bk.middle === wallTex)) bk.middle = '-';
      } else {
        ld.flags = (ld.flags | 1) & ~4;
      }
      nextLinedefs[idx] = ld;
    } else {
      const frontSd = mintSidedef(sectorId, { middle: parent ? '-' : wallTex });
      const backSd = parent ? mintSidedef(parent.id, { middle: '-' }) : -1;
      const isTwoSided = backSd !== -1;
      nextLinedefs.push({
        id: newId('l', nextLinedefs),
        v1: a, v2: b,
        flags: isTwoSided ? 4 : 1,
        special: 0, tag: 0,
        front: frontSd, back: backSd
      });
    }
  }

  // Resolve upper/lower textures from height delta on two-sided loop lines.
  for (let i = 0; i < walk.length - 1; i++) {
    const a = walk[i], b = walk[i + 1];
    const idx = findLine(a, b);
    if (idx < 0) continue;
    const ld = nextLinedefs[idx];
    if (!ld.front || ld.front === -1 || !ld.back || ld.back === -1) continue;
    const frontSd = sdmap.get(ld.front);
    const backSd = sdmap.get(ld.back);
    if (!frontSd || !backSd) continue;
    const frontSec = nextSectors.find(s => s.id === frontSd.sector);
    const backSec = nextSectors.find(s => s.id === backSd.sector);
    if (!frontSec || !backSec) continue;
    if (frontSec.ceilH > backSec.ceilH) { if (!frontSd.upper || frontSd.upper === '-') frontSd.upper = 'STARTAN2'; }
    else if (backSec.ceilH > frontSec.ceilH) { if (!backSd.upper || backSd.upper === '-') backSd.upper = 'STARTAN2'; }
    if (frontSec.floorH > backSec.floorH) { if (!backSd.lower || backSd.lower === '-') backSd.lower = 'STEP1'; }
    else if (backSec.floorH > frontSec.floorH) { if (!frontSd.lower || frontSd.lower === '-') frontSd.lower = 'STEP1'; }
  }

  return {
    vertices: map.vertices, linedefs: nextLinedefs, sidedefs: nextSidedefs,
    sectors: nextSectors, things: map.things,
    createdSectorId: sectorId, parentId: parent?.id ?? null,
  };
}

// ============================================================================
// SHAPE GENERATORS
// ============================================================================
function rectVertices(cx, cy, w, h) {
  const hw = w / 2, hh = h / 2;
  return [
    { x: cx - hw, y: cy - hh }, { x: cx + hw, y: cy - hh },
    { x: cx + hw, y: cy + hh }, { x: cx - hw, y: cy + hh },
  ];
}
function ngonVertices(cx, cy, r, n, rotation = 0) {
  const out = [];
  for (let i = 0; i < n; i++) {
    const a = rotation + (i / n) * Math.PI * 2;
    out.push({ x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r });
  }
  return out;
}
function stampShape(map, snap, worldPts, overrides) {
  const snapped = worldPts.map(p => snap > 0
    ? { x: Math.round(p.x / snap) * snap, y: Math.round(p.y / snap) * snap }
    : { x: Math.round(p.x), y: Math.round(p.y) });
  let verts = [...map.vertices];
  const chain = [];
  for (const p of snapped) {
    const ex = verts.find(v => v.x === p.x && v.y === p.y);
    if (ex) { chain.push(ex.id); continue; }
    const id = newId('v', verts);
    verts.push({ id, x: p.x, y: p.y });
    chain.push(id);
  }
  chain.push(chain[0]);
  const stagedMap = { ...map, vertices: verts };
  return buildSectorFromLoop(stagedMap, chain, overrides ? { overrides } : undefined);
}

// ============================================================================
// FURNITURE MACROS
// ============================================================================
function macroDoor(map, lineId, kind = 'normal') {
  const ld = map.linedefs.find(l => l.id === lineId);
  if (!ld) return null;
  // If the wall is one-sided (faces void), carve a proper door body behind
  // it — split the wall into wall + door-face + wall, add a 16-deep closet
  // door body sector, wire DR-1 + DOOR3 + DOORTRAK tracks + correct pegging.
  if (!ld.back || ld.back === -1) {
    return macroDoorOneSided(map, lineId, kind);
  }
  // Two-sided wall: existing "convert back sector into door body" behaviour.
  const backSd = map.sidedefs.find(s => s.id === ld.back);
  if (!backSd) return { error: 'Missing back sidedef.' };
  const doorSecId = backSd.sector;
  const specials = { normal: 1, red: 28, blue: 26, yellow: 27 };
  const special = specials[kind] ?? 1;
  const nextLines = map.linedefs.map(l => l.id === lineId
    ? { ...l, special, flags: (l.flags | 4) & ~1 } : l);
  const nextSectors = map.sectors.map(s => s.id === doorSecId
    ? { ...s, ceilH: s.floorH, ceilTex: s.floorTex } : s);
  const adj = new Set();
  for (const l of nextLines) {
    if (l.id === lineId) continue;
    const f = l.front !== -1 && map.sidedefs.find(s => s.id === l.front);
    const b = l.back !== -1 && map.sidedefs.find(s => s.id === l.back);
    if ((f && f.sector === doorSecId) || (b && b.sector === doorSecId)) adj.add(l.id);
  }
  const trackSidedefs = map.sidedefs.map(sd =>
    sd.sector === doorSecId ? { ...sd, middle: 'DOORTRAK' } : sd);
  const trackLines = nextLines.map(l => adj.has(l.id) ? { ...l, flags: l.flags | 16 } : l);
  const finalSidedefs = trackSidedefs.map(sd => {
    if (sd.id === ld.front) return { ...sd, upper: 'DOOR3' };
    if (sd.id === ld.back) return { ...sd, upper: 'DOOR3' };
    return sd;
  });
  return { ...map, linedefs: trackLines, sidedefs: finalSidedefs, sectors: nextSectors };
}

// Carve a proper door body into the void behind a one-sided wall, then wire
// it as a DR-1 door. The wall is split into [wall, door-face, wall] at the
// door's width (64 by default), a 16-deep closet sector is built behind the
// door face, and the closet's three outward walls become DOORTRAK tracks
// with lower-unpegged pegging. Door image is DOOR3 (64-wide canonical) on
// the door face's upper texture, with standard pegging so it rides with the
// rising ceiling.
function macroDoorOneSided(map, lineId, kind = 'normal') {
  const ld = map.linedefs.find(l => l.id === lineId);
  if (!ld) return { error: 'Line not found' };
  if (ld.back && ld.back !== -1) return { error: 'Use macroDoor on a two-sided wall' };
  const v1 = map.vertices.find(v => v.id === ld.v1);
  const v2 = map.vertices.find(v => v.id === ld.v2);
  if (!v1 || !v2) return { error: 'Wall vertices missing' };
  const dx = v2.x - v1.x, dy = v2.y - v1.y;
  const len = Math.hypot(dx, dy);
  const WIDTH = 64, THICK = 16, MARGIN = 16;
  if (len < WIDTH + MARGIN * 2) return { error: 'Wall too short for a 64-unit door' };
  if (Math.abs(dx) > 0.5 && Math.abs(dy) > 0.5) return { error: 'Door tool requires an axis-aligned wall' };
  const origFront = map.sidedefs.find(s => s.id === ld.front);
  if (!origFront) return { error: 'Front sidedef missing' };
  const roomSec = map.sectors.find(s => s.id === origFront.sector);
  if (!roomSec) return { error: 'Room sector missing' };

  const ux = dx / len, uy = dy / len;
  const bx = -uy, by = ux; // BACK direction (left of v1->v2); for one-sided
                            // walls this is the void side.
  const sn = v => Math.round(v / 8) * 8;
  const tCenter = len / 2;
  const t0 = tCenter - WIDTH / 2;
  const t1 = tCenter + WIDTH / 2;

  const at_t0 = { x: sn(v1.x + ux * t0), y: sn(v1.y + uy * t0) };
  const at_t1 = { x: sn(v1.x + ux * t1), y: sn(v1.y + uy * t1) };
  const at_bk0 = { x: sn(at_t0.x + bx * THICK), y: sn(at_t0.y + by * THICK) };
  const at_bk1 = { x: sn(at_t1.x + bx * THICK), y: sn(at_t1.y + by * THICK) };

  const verts = map.vertices.slice();
  const findV = (p) => {
    const ex = verts.find(v => v.x === p.x && v.y === p.y);
    if (ex) return ex.id;
    const id = 'v' + verts.length;
    verts.push({ id, x: p.x, y: p.y });
    return id;
  };
  const vT0 = findV(at_t0);
  const vT1 = findV(at_t1);
  const vBk0 = findV(at_bk0);
  const vBk1 = findV(at_bk1);

  const doorSecId = 's' + map.sectors.length;
  const sectors = [...map.sectors, {
    id: doorSecId,
    floorH: roomSec.floorH, ceilH: roomSec.floorH, // closed
    floorTex: roomSec.floorTex, ceilTex: roomSec.floorTex,
    light: Math.max(64, (roomSec.light ?? 160) - 32),
    special: 0, tag: 0,
  }];

  const sidedefs = map.sidedefs.slice();
  const addSd = (secId, props = {}) => {
    const id = 'sd' + sidedefs.length;
    sidedefs.push({ id, xOff: 0, yOff: 0, upper: '-', lower: '-', middle: '-', sector: secId, ...props });
    return id;
  };
  const wallTex = origFront.middle && origFront.middle !== '-' ? origFront.middle : 'STARTAN2';
  // Separate front sidedefs per segment so we can texture them independently.
  const sdSeg1 = addSd(roomSec.id, { middle: wallTex });
  const sdSeg3 = addSd(roomSec.id, { middle: wallTex });
  // Door face: front = room side (upper = DOOR3, door image), back = door body.
  const sdFaceFront = addSd(roomSec.id, { middle: '-', upper: 'DOOR3' });
  const sdFaceBack = addSd(doorSecId, { middle: '-', upper: 'DOOR3' });
  // Door body's outward walls (one-sided).
  const sdBackWall = addSd(doorSecId, { middle: wallTex });
  const sdTrack1 = addSd(doorSecId, { middle: 'DOORTRAK' });
  const sdTrack2 = addSd(doorSecId, { middle: 'DOORTRAK' });

  const doorSpecials = { normal: 1, red: 28, blue: 26, yellow: 27 };
  const doorSpecial = doorSpecials[kind] ?? 1;

  const linedefs = map.linedefs.slice();
  const ldIdx = linedefs.findIndex(l => l.id === lineId);
  // Segment 1: v1 → vT0 (keeps original line ID).
  linedefs[ldIdx] = { ...ld, v2: vT0, front: sdSeg1, flags: (ld.flags | 1) & ~4 };
  // Segment 2: vT0 → vT1 (the door face).
  linedefs.push({
    id: 'l' + linedefs.length,
    v1: vT0, v2: vT1,
    flags: 4, // two-sided only — no lower-unpegged so DOOR3 rides with ceiling
    special: doorSpecial, tag: 0,
    front: sdFaceFront, back: sdFaceBack,
  });
  // Segment 3: vT1 → v2.
  linedefs.push({
    id: 'l' + linedefs.length,
    v1: vT1, v2: ld.v2,
    flags: (ld.flags | 1) & ~4, special: 0, tag: 0,
    front: sdSeg3, back: -1,
  });
  // Track 1: vT0 → vBk0 (one of the door's perpendicular walls).
  linedefs.push({
    id: 'l' + linedefs.length,
    v1: vT0, v2: vBk0,
    flags: 1 | 16, // impassable + lower-unpegged (texture stays put as door rises)
    special: 0, tag: 0,
    front: sdTrack1, back: -1,
  });
  // Back wall: vBk0 → vBk1 (far side of the closet).
  linedefs.push({
    id: 'l' + linedefs.length,
    v1: vBk0, v2: vBk1,
    flags: 1, special: 0, tag: 0,
    front: sdBackWall, back: -1,
  });
  // Track 2: vBk1 → vT1.
  linedefs.push({
    id: 'l' + linedefs.length,
    v1: vBk1, v2: vT1,
    flags: 1 | 16, special: 0, tag: 0,
    front: sdTrack2, back: -1,
  });

  return { ...map, vertices: verts, linedefs, sidedefs, sectors };
}
function macroWindow(map, lineId) {
  const ld = map.linedefs.find(l => l.id === lineId);
  if (!ld) return null;
  if (!ld.back || ld.back === -1) return { error: 'Window needs a two-sided line.' };
  const nextLines = map.linedefs.map(l => l.id === lineId
    ? { ...l, flags: (l.flags | 4 | 2) & ~1 } : l);
  const nextSidedefs = map.sidedefs.map(sd => {
    if (sd.id === ld.front) return { ...sd, middle: 'MIDGRATE' };
    if (sd.id === ld.back) return { ...sd, middle: 'MIDGRATE' };
    return sd;
  });
  return { ...map, linedefs: nextLines, sidedefs: nextSidedefs };
}
function macroSecret(map, sectorId) {
  return { ...map, sectors: map.sectors.map(s => s.id === sectorId ? { ...s, special: 9 } : s) };
}
function macroDamage(map, sectorId, kind = 'slime') {
  const specials = { stim: 5, slime: 7, lava: 16, exit: 11 };
  return { ...map, sectors: map.sectors.map(s => s.id === sectorId ? { ...s, special: specials[kind] ?? 7 } : s) };
}
function macroExit(map, lineId, kind = 'switch') {
  const specials = { switch: 11, walk: 52 };
  return { ...map, linedefs: map.linedefs.map(l => l.id === lineId
    ? { ...l, special: specials[kind] ?? 11 } : l) };
}
function macroSwitch(map, lineId, tag, action = 'door') {
  const specials = { door: 103, lift: 62, floorRaise: 18, floorLower: 23 };
  const sp = specials[action] ?? 103;
  return { ...map, linedefs: map.linedefs.map(l => l.id === lineId
    ? { ...l, special: sp, tag } : l) };
}
function macroTeleporter(map, lineId, tag) {
  return { ...map, linedefs: map.linedefs.map(l => l.id === lineId
    ? { ...l, special: 97, tag } : l) };
}
function macroLift(map, sectorId, tag) {
  const adj = [];
  for (const l of map.linedefs) {
    const f = l.front !== -1 && map.sidedefs.find(s => s.id === l.front);
    const b = l.back !== -1 && map.sidedefs.find(s => s.id === l.back);
    if ((f && f.sector === sectorId) || (b && b.sector === sectorId)) adj.push(l.id);
  }
  const nextLines = map.linedefs.map(l => adj.includes(l.id)
    ? { ...l, special: l.special || 88, tag } : l);
  const nextSectors = map.sectors.map(s => s.id === sectorId ? { ...s, tag } : s);
  return { ...map, linedefs: nextLines, sectors: nextSectors };
}

// ============================================================================
// SHAPESHIFTER — preset-driven dungeon builder
// ============================================================================
// A pre-built map handoff slot. ShapeShifter generates a map, stashes it
// here, then the WadEditor reads it on mount instead of opening a blank
// starter. Cleared once consumed.
let _shapeShifterHandoff = null;

function shapeShifterRoomPolygon(r) {
  if (r.type === 'square') {
    const hw = r.w / 2, hh = r.h / 2;
    return [
      { x: r.cx - hw, y: r.cy - hh }, { x: r.cx + hw, y: r.cy - hh },
      { x: r.cx + hw, y: r.cy + hh }, { x: r.cx - hw, y: r.cy + hh },
    ];
  }
  if (r.type === 'octagon') {
    const pts = [];
    for (let i = 0; i < 8; i++) {
      const a = Math.PI / 8 + i * Math.PI / 4;
      pts.push({ x: r.cx + r.r * Math.cos(a), y: r.cy + r.r * Math.sin(a) });
    }
    return pts;
  }
  // hexagon
  const pts = [];
  for (let i = 0; i < 6; i++) {
    const a = i * Math.PI / 3 + Math.PI / 2;
    pts.push({ x: r.cx + r.r * Math.cos(a), y: r.cy + r.r * Math.sin(a) });
  }
  return pts;
}

// Touch-friendly thing palette for ShapeShifter's THINGS stage. Each
// entry: type (Doom thing ID), label, and a marker colour. Categories are
// the top-level tabs.
// Internal marker thing type for the user-placed Exit Pillar. Outside
// Doom's normal range so it can't collide with any real thing; the build
// generator carves an SW1EXIT-faced exit post at each marker position
// and strips the markers before WAD export.
const EXIT_PILLAR_TYPE = 32000;
const SHAPESHIFTER_THINGS = {
  PLAYER: [
    { type: 1,  label: 'P1 Start',  color: '#7fffd4' },
    { type: 11, label: 'DM Start',  color: '#7fff7f' },
    { type: 14, label: 'Teleport',  color: '#9966ff' },
    { type: EXIT_PILLAR_TYPE, label: 'Exit Pillar', color: '#ff9d3d' },
  ],
  MONSTER: [
    { type: 3004, label: 'Zombie',     color: '#a08070' },
    { type: 9,    label: 'Sergeant',   color: '#5a4030' },
    { type: 3001, label: 'Imp',        color: '#aa3030' },
    { type: 3002, label: 'Pinky',      color: '#cc4444' },
    { type: 3005, label: 'Cacodemon',  color: '#cc2222' },
    { type: 3006, label: 'Lost Soul',  color: '#ffaa00' },
    { type: 65,   label: 'Chaingunner',color: '#704020' },
    { type: 69,   label: 'Hell Knight',color: '#ff8855' },
    { type: 3003, label: 'Baron',      color: '#cc6644' },
    { type: 68,   label: 'Arachnotron',color: '#aa66ff' },
    { type: 71,   label: 'Pain Elem.', color: '#ff88ff' },
    { type: 64,   label: 'Archvile',   color: '#ff0044' },
    { type: 67,   label: 'Mancubus',   color: '#ddaa44' },
    { type: 16,   label: 'Cyberdemon', color: '#ff00ff' },
    { type: 7,    label: 'Spider',     color: '#dd2222' },
    { type: 84,   label: 'Wolf SS',    color: '#666666' },
  ],
  WEAPON: [
    { type: 2001, label: 'Shotgun',    color: '#cc8844' },
    { type: 82,   label: 'Super SG',   color: '#ff8800' },
    { type: 2002, label: 'Chaingun',   color: '#aaaaaa' },
    { type: 2003, label: 'Rocket',     color: '#666666' },
    { type: 2004, label: 'Plasma',     color: '#5577ff' },
    { type: 2005, label: 'Chainsaw',   color: '#888800' },
    { type: 2006, label: 'BFG9000',    color: '#00ff00' },
  ],
  AMMO: [
    { type: 2007, label: 'Clip',         color: '#ffff00' },
    { type: 2048, label: 'Bullet Box',   color: '#ffaa00' },
    { type: 2008, label: 'Shells',       color: '#ff8800' },
    { type: 2049, label: 'Shell Box',    color: '#ff6600' },
    { type: 2010, label: 'Rocket',       color: '#666666' },
    { type: 2046, label: 'Rocket Box',   color: '#444444' },
    { type: 2047, label: 'Cell',         color: '#0088ff' },
    { type: 17,   label: 'Cell Pack',    color: '#0066ff' },
    { type: 8,    label: 'Backpack',     color: '#996644' },
  ],
  HEALTH: [
    { type: 2011, label: 'Stimpak',     color: '#ff6666' },
    { type: 2012, label: 'Medikit',     color: '#ff2222' },
    { type: 2013, label: 'Soulsphere',  color: '#0066ff' },
    { type: 2014, label: 'Health+',     color: '#ff8888' },
    { type: 2015, label: 'Armor+',      color: '#88ff88' },
    { type: 2018, label: 'Armor',       color: '#00aa00' },
    { type: 2019, label: 'Mega Armor',  color: '#0044ff' },
    { type: 83,   label: 'Megasphere',  color: '#ffaa00' },
    { type: 2022, label: 'Invuln',      color: '#aa00ff' },
    { type: 2023, label: 'Berserk',     color: '#aa0000' },
    { type: 2024, label: 'Invis',       color: '#aaaaaa' },
    { type: 2025, label: 'Rad Suit',    color: '#00aa44' },
    { type: 2026, label: 'Comp Map',    color: '#ffaa44' },
    { type: 2045, label: 'Light Amp',   color: '#00ff00' },
  ],
  KEY: [
    { type: 5,  label: 'Blue Key',     color: '#0044ff' },
    { type: 13, label: 'Red Key',      color: '#ff0000' },
    { type: 6,  label: 'Yellow Key',   color: '#ffaa00' },
    { type: 38, label: 'Blue Skull',   color: '#0044ff' },
    { type: 39, label: 'Red Skull',    color: '#ff0000' },
    { type: 40, label: 'Yellow Skull', color: '#ffaa00' },
  ],
  DECOR: [
    { type: 2035, label: 'Barrel',         color: '#cc6644' },
    { type: 70,   label: 'Burning Barrel', color: '#ff8800' },
    { type: 30,   label: 'Tall Green Col', color: '#88dd88' },
    { type: 31,   label: 'Short Green Col',color: '#44aa44' },
    { type: 32,   label: 'Tall Red Col',   color: '#aa2222' },
    { type: 33,   label: 'Short Red Col',  color: '#882222' },
    { type: 34,   label: 'Candelabra',     color: '#aa8866' },
    { type: 35,   label: 'Candle',         color: '#ffff88' },
    { type: 44,   label: 'Blue Torch',     color: '#4488ff' },
    { type: 45,   label: 'Green Torch',    color: '#44ff44' },
    { type: 46,   label: 'Red Torch',      color: '#ff4444' },
    { type: 55,   label: 'Short Red Tch',  color: '#ff8866' },
    { type: 56,   label: 'Short Grn Tch',  color: '#88ff66' },
    { type: 57,   label: 'Short Blu Tch',  color: '#6688ff' },
    { type: 47,   label: 'Stalagmite',     color: '#888844' },
    { type: 54,   label: 'Tree',           color: '#226622' },
    { type: 41,   label: 'Evil Eye',       color: '#ff00ff' },
    { type: 42,   label: 'Floating Skull', color: '#eeeeff' },
    { type: 73,   label: 'Hanged Victim',  color: '#660000' },
    { type: 85,   label: 'Tall Tech Lamp', color: '#ffffff' },
    { type: 86,   label: 'Short Tech Lamp',color: '#ddddff' },
  ],
};
const SHAPESHIFTER_THING_LOOKUP = (() => {
  const m = new Map();
  for (const cat of Object.keys(SHAPESHIFTER_THINGS)) {
    for (const t of SHAPESHIFTER_THINGS[cat]) m.set(t.type, { ...t, cat });
  }
  return m;
})();

function shapeShifterRoomBBox(r) {
  const pts = shapeShifterRoomPolygon(r);
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
  for (const p of pts) {
    if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

// Compute the same grid the engine uses for fused-group emit, then
// derive the cell-boundary edges so the editor can preview EXACTLY
// what the build pass will produce: room cells coloured per room,
// boundary walls drawn as solid (one-sided / external) or dashed
// (two-sided / passable between rooms). Pure preview — no side
// effects on the actual generation.
function computeShapeShifterFusion(rooms) {
  // Detect overlapping groups by bbox intersection.
  function bbInter(a, b) {
    return !(a.maxX <= b.minX || b.maxX <= a.minX ||
             a.maxY <= b.minY || b.maxY <= a.minY);
  }
  const groups = [];
  function groupOf(idx) {
    for (const g of groups) if (g.has(idx)) return g;
    return null;
  }
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      if (!bbInter(shapeShifterRoomBBox(rooms[i]), shapeShifterRoomBBox(rooms[j]))) continue;
      let gi = groupOf(i), gj = groupOf(j);
      if (gi && gj && gi !== gj) {
        for (const x of gj) gi.add(x);
        groups.splice(groups.indexOf(gj), 1);
      } else if (gi) gi.add(j);
      else if (gj) gj.add(i);
      else groups.push(new Set([i, j]));
    }
  }
  const fusedIdx = new Set();
  for (const g of groups) for (const x of g) fusedIdx.add(x);
  // For each group, rasterize to a 32-grid (same as engine) and collect
  // boundary edges.
  const CELL = 32;
  const segments = []; // { x1, y1, x2, y2, kind: 'wall' | 'open' }
  for (const group of groups) {
    const groupArr = [...group].sort((a, b) => a - b);
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const idx of groupArr) {
      const bb = shapeShifterRoomBBox(rooms[idx]);
      if (bb.minX < minX) minX = bb.minX;
      if (bb.maxX > maxX) maxX = bb.maxX;
      if (bb.minY < minY) minY = bb.minY;
      if (bb.maxY > maxY) maxY = bb.maxY;
    }
    minX = Math.floor(minX / CELL) * CELL - CELL;
    minY = Math.floor(minY / CELL) * CELL - CELL;
    maxX = Math.ceil(maxX / CELL) * CELL + CELL;
    maxY = Math.ceil(maxY / CELL) * CELL + CELL;
    const W = Math.ceil((maxX - minX) / CELL);
    const H = Math.ceil((maxY - minY) / CELL);
    const grid = new Int32Array(W * H).fill(-1);
    const polysByIdx = new Map();
    for (const idx of groupArr) polysByIdx.set(idx, shapeShifterRoomPolygon(rooms[idx]));
    for (let gy = 0; gy < H; gy++) for (let gx = 0; gx < W; gx++) {
      const cx = minX + (gx + 0.5) * CELL;
      const cy = minY + (gy + 0.5) * CELL;
      for (let i = groupArr.length - 1; i >= 0; i--) {
        if (pointInPolygon(cx, cy, polysByIdx.get(groupArr[i]))) {
          grid[gy * W + gx] = groupArr[i]; break;
        }
      }
    }
    for (let gy = 0; gy < H; gy++) for (let gx = 0; gx < W; gx++) {
      const here = grid[gy * W + gx];
      if (here === -1) continue;
      const x0 = minX + gx * CELL, y0 = minY + gy * CELL, x1 = x0 + CELL, y1 = y0 + CELL;
      const checks = [
        { nx: gx, ny: gy + 1, p1: [x0, y1], p2: [x1, y1] },   // N edge
        { nx: gx + 1, ny: gy, p1: [x1, y1], p2: [x1, y0] },   // E edge
        { nx: gx, ny: gy - 1, p1: [x1, y0], p2: [x0, y0] },   // S edge
        { nx: gx - 1, ny: gy, p1: [x0, y0], p2: [x0, y1] },   // W edge
      ];
      for (const c of checks) {
        const ni = (c.nx >= 0 && c.nx < W && c.ny >= 0 && c.ny < H)
          ? grid[c.ny * W + c.nx] : -1;
        if (ni === here) continue;
        segments.push({
          x1: c.p1[0], y1: c.p1[1], x2: c.p2[0], y2: c.p2[1],
          kind: ni === -1 ? 'wall' : 'open',
        });
      }
    }
  }
  return { fusedIdx, segments };
}

// Find all wall segments where two rooms touch — the engine will merge
// these into open seams in the build pass. Used for canvas highlighting
// so the user can see which rooms are about to join.
function findShapeShifterSeams(rooms) {
  const seams = [];
  for (let i = 0; i < rooms.length; i++) {
    for (let j = i + 1; j < rooms.length; j++) {
      const a = shapeShifterRoomBBox(rooms[i]);
      const b = shapeShifterRoomBBox(rooms[j]);
      if (Math.abs(a.maxX - b.minX) < 0.5) {
        const y1 = Math.max(a.minY, b.minY), y2 = Math.min(a.maxY, b.maxY);
        if (y2 - y1 >= 32) seams.push({ x1: a.maxX, y1, x2: a.maxX, y2 });
      } else if (Math.abs(b.maxX - a.minX) < 0.5) {
        const y1 = Math.max(a.minY, b.minY), y2 = Math.min(a.maxY, b.maxY);
        if (y2 - y1 >= 32) seams.push({ x1: a.minX, y1, x2: a.minX, y2 });
      }
      if (Math.abs(a.maxY - b.minY) < 0.5) {
        const x1 = Math.max(a.minX, b.minX), x2 = Math.min(a.maxX, b.maxX);
        if (x2 - x1 >= 32) seams.push({ x1, y1: a.maxY, x2, y2: a.maxY });
      } else if (Math.abs(b.maxY - a.minY) < 0.5) {
        const x1 = Math.max(a.minX, b.minX), x2 = Math.min(a.maxX, b.maxX);
        if (x2 - x1 >= 32) seams.push({ x1, y1: a.minY, x2, y2: a.minY });
      }
    }
  }
  return seams;
}

// Room Designer modal. Form-based editor for a custom room preset — shape,
// dimensions, floor / ceil heights, palette, light, plus a list of placeable
// structures (PILLAR, PIT, PLATFORM). Saves to localStorage via the parent's
// onSave callback and re-appears in the PLACE chip strip.
const TEX_OPTIONS = {
  floor: ['FLAT5_4', 'FLOOR0_1', 'FLOOR0_3', 'FLOOR4_8', 'FLAT1', 'FLAT5_5', 'MFLR8_1', 'GRNROCK', 'RROCK16', 'CEIL5_2', 'NUKAGE1', 'BLOOD1', 'FWATER1', 'LAVA1', 'SLIME09'],
  ceil:  ['CEIL5_1', 'CEIL5_2', 'TLITE6_4', 'TLITE6_1', 'FLAT5_4', 'FLAT1', 'F_SKY1', 'CEIL3_5', 'TLITE6_5'],
  wall:  ['STARTAN2', 'STARTAN3', 'BROWN1', 'BROWN96', 'STONE', 'STONE2', 'STONE3', 'METAL', 'METAL2', 'SUPPORT2', 'SUPPORT3', 'GRAY7', 'MARBLE1', 'MARBLE2', 'SP_HOT1'],
};
function RoomDesignerModal({ preset, onCancel, onSave, onDelete }) {
  const [draft, setDraft] = useState(() => JSON.parse(JSON.stringify(preset)));
  const cs = draft.customSpec || (draft.customSpec = {});
  if (!cs.palette) cs.palette = {};
  if (!cs.pillars) cs.pillars = [];
  if (!cs.terrains) cs.terrains = [];
  const update = (patch) => setDraft(d => ({ ...d, ...patch }));
  const updateCS = (patch) => setDraft(d => ({ ...d, customSpec: { ...d.customSpec, ...patch } }));
  const updatePalette = (key, val) => setDraft(d => ({ ...d, customSpec: {
    ...d.customSpec, palette: { ...(d.customSpec && d.customSpec.palette || {}), [key]: val } } }));
  const addPillar = () => updateCS({ pillars: [...cs.pillars,
    { dx: 0, dy: 0, radius: 32, top: 0, tex: 'SUPPORT2' }] });
  const updPillar = (i, patch) => updateCS({ pillars: cs.pillars.map((p, k) => k === i ? { ...p, ...patch } : p) });
  const rmPillar = (i) => updateCS({ pillars: cs.pillars.filter((_, k) => k !== i) });
  const addPit = () => updateCS({ terrains: [...cs.terrains,
    { dx: 0, dy: -96, hw: 96, hh: 64, dh: -24, kind: 'pit', floorTex: 'BLOOD1', special: 7 }] });
  const addPlat = () => updateCS({ terrains: [...cs.terrains,
    { dx: 0, dy: 96, hw: 96, hh: 64, dh: 16, kind: 'platform', floorTex: 'FLOOR0_3' }] });
  const updTerr = (i, patch) => updateCS({ terrains: cs.terrains.map((t, k) => k === i ? { ...t, ...patch } : t) });
  const rmTerr = (i) => updateCS({ terrains: cs.terrains.filter((_, k) => k !== i) });
  // ---- ARCHITECT: parametric pattern generators -------------------------
  // Mathematically even placements derived from the current room size, all
  // snapped to the 32 grid so they ride the same fusion / rasterize paths.
  const minDim = draft.type === 'square'
    ? Math.min(draft.w || 768, draft.h || 768) : 2 * (draft.r || 384);
  const sn32 = v => Math.round(v / 32) * 32;
  const genRing = (n) => {
    // Even ring at 55% radius — the classic colonnade. Starts at "12
    // o'clock" so even counts read symmetric across both axes.
    const R = sn32(minDim / 2 * 0.55);
    const pts = [];
    for (let i = 0; i < n; i++) {
      const a = (Math.PI * 2 * i) / n - Math.PI / 2;
      pts.push({ dx: sn32(Math.cos(a) * R), dy: sn32(Math.sin(a) * R),
        radius: 24, top: 0, tex: 'SUPPORT2' });
    }
    updateCS({ pillars: [...cs.pillars, ...pts] });
  };
  const genGrid = (n) => {
    // n x n even grid spanning the middle 60% of the room.
    const span = sn32(minDim * 0.6 / Math.max(1, n - 1));
    const mid = (n - 1) / 2;
    const pts = [];
    for (let gy = 0; gy < n; gy++) for (let gx = 0; gx < n; gx++) {
      pts.push({ dx: sn32((gx - mid) * span), dy: sn32((gy - mid) * span),
        radius: 24, top: 0, tex: 'SUPPORT2' });
    }
    updateCS({ pillars: [...cs.pillars, ...pts] });
  };
  const genQuadPits = () => {
    // Four mirrored pits on the diagonals — 4-fold symmetry.
    const off = sn32(minDim * 0.27);
    const ts = [[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([sx, sy]) => (
      { dx: sx * off, dy: sy * off, hw: 64, hh: 64, dh: -24, kind: 'pit',
        floorTex: 'FWATER1', special: 0 }));
    updateCS({ terrains: [...cs.terrains, ...ts] });
  };
  const genTiers = () => {
    // Concentric stepped platforms — a central ziggurat-like rise.
    const ts = [];
    let half = sn32(minDim * 0.3), dh = 16;
    while (half >= 96) {
      ts.push({ dx: 0, dy: 0, hw: half, hh: half, dh, kind: 'platform',
        floorTex: 'FLOOR0_3' });
      half = sn32(half - 96); dh += 16;
    }
    updateCS({ terrains: [...cs.terrains, ...ts] });
  };
  const clearAll = () => updateCS({ pillars: [], terrains: [] });
  const labelStyle = { fontSize: 10, color: COLORS.textDim, fontFamily: monoStack, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2, display: 'block' };
  const inputStyle = { background: COLORS.bg, color: COLORS.text, border: '1px solid ' + COLORS.border,
    borderRadius: 3, padding: '4px 6px', fontFamily: monoStack, fontSize: 11, width: 80 };
  const selStyle = { ...inputStyle, width: 110 };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 10001, background: 'rgba(0,0,0,0.7)',
        display: 'flex', alignItems: 'stretch', justifyContent: 'center', padding: 16,
        paddingTop: 'calc(env(safe-area-inset-top) + 16px)',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 16px)' }}>
      <div style={{ background: COLORS.bgPanel, border: '1px solid ' + COLORS.amber,
          borderRadius: 6, color: COLORS.text, fontFamily: fontStack, padding: 14,
          maxWidth: 520, width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            marginBottom: 10, paddingBottom: 8, borderBottom: '1px solid ' + COLORS.border }}>
          <span style={{ color: COLORS.amber, fontWeight: 700, letterSpacing: '0.18em', fontSize: 13 }}>ROOM DESIGNER</span>
          <button onClick={onCancel} style={{ padding: '4px 10px', fontSize: 11, color: COLORS.cyan,
            background: COLORS.bg, border: '1px solid ' + COLORS.cyan, borderRadius: 4 }}>CANCEL</button>
        </div>
        <div style={{ flex: 1, overflowY: 'auto', paddingRight: 4 }}>
          {(() => {
            // ---- Live top-down preview -------------------------------
            // Room outline + pillars (circles) + pits/platforms (rects),
            // scaled to fit. SVG y points down, Doom y points up — flip.
            const pw = draft.type === 'square' ? (draft.w || 768) : 2 * (draft.r || 384);
            const ph = draft.type === 'square' ? (draft.h || 768) : 2 * (draft.r || 384);
            const PV = 200;
            const sc = (PV - 16) / Math.max(pw, ph);
            let outline;
            if (draft.type === 'square') {
              outline = `M ${-pw / 2 * sc} ${-ph / 2 * sc} h ${pw * sc} v ${ph * sc} h ${-pw * sc} Z`;
            } else {
              const nS = draft.type === 'octagon' ? 8 : 6;
              const rr = (draft.r || 384) * sc;
              const pts = [];
              for (let i = 0; i < nS; i++) {
                const a = (draft.type === 'octagon' ? Math.PI / 8 : 0) + i * 2 * Math.PI / nS;
                pts.push((Math.cos(a) * rr).toFixed(1) + ',' + (Math.sin(a) * rr).toFixed(1));
              }
              outline = 'M ' + pts.join(' L ') + ' Z';
            }
            return (
              <div style={{ display: 'flex', gap: 10, marginBottom: 12, alignItems: 'flex-start' }}>
                <svg width={PV} height={PV} viewBox={`${-PV / 2} ${-PV / 2} ${PV} ${PV}`}
                  style={{ background: COLORS.bg, border: '1px solid ' + COLORS.border, borderRadius: 4, flexShrink: 0 }}>
                  <path d={outline} fill="rgba(127,255,212,0.05)" stroke={COLORS.cyan} strokeWidth="1.2" />
                  {cs.terrains.map((t, i) => (
                    <rect key={'t' + i} x={(t.dx - t.hw) * sc} y={(-t.dy - t.hh) * sc}
                      width={2 * t.hw * sc} height={2 * t.hh * sc}
                      fill={t.dh < 0 ? 'rgba(255,92,92,0.3)' : 'rgba(255,157,61,0.3)'}
                      stroke={t.dh < 0 ? COLORS.danger : COLORS.amber} strokeWidth="1" />
                  ))}
                  {cs.pillars.map((p, i) => (
                    <circle key={'p' + i} cx={p.dx * sc} cy={-p.dy * sc} r={Math.max(2, p.radius * sc)}
                      fill={p.top ? 'rgba(255,157,61,0.5)' : 'rgba(197,212,232,0.55)'}
                      stroke={COLORS.text} strokeWidth="1" />
                  ))}
                </svg>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
                  <span style={labelStyle}>Architect</span>
                  <button onClick={() => genRing(6)} style={{ ...inputStyle, color: COLORS.cyan, cursor: 'pointer', width: '100%' }}>◯ RING ×6</button>
                  <button onClick={() => genRing(8)} style={{ ...inputStyle, color: COLORS.cyan, cursor: 'pointer', width: '100%' }}>◯ RING ×8</button>
                  <button onClick={() => genGrid(2)} style={{ ...inputStyle, color: COLORS.cyan, cursor: 'pointer', width: '100%' }}>▦ GRID 2×2</button>
                  <button onClick={() => genGrid(3)} style={{ ...inputStyle, color: COLORS.cyan, cursor: 'pointer', width: '100%' }}>▦ GRID 3×3</button>
                  <button onClick={genQuadPits} style={{ ...inputStyle, color: COLORS.amber, cursor: 'pointer', width: '100%' }}>◧ QUAD PITS</button>
                  <button onClick={genTiers} style={{ ...inputStyle, color: COLORS.amber, cursor: 'pointer', width: '100%' }}>▲ ZIGGURAT</button>
                  <button onClick={clearAll} style={{ ...inputStyle, color: COLORS.danger, cursor: 'pointer', width: '100%' }}>✕ CLEAR ALL</button>
                </div>
              </div>
            );
          })()}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
            <div><label style={labelStyle}>Name</label>
              <input value={draft.label} onChange={e => update({ label: e.target.value })}
                style={{ ...inputStyle, width: '100%' }} /></div>
            <div><label style={labelStyle}>Shape</label>
              <select value={draft.type} onChange={e => update({ type: e.target.value })} style={{ ...selStyle, width: '100%' }}>
                <option value="square">Square</option><option value="octagon">Octagon</option><option value="hexagon">Hexagon</option>
              </select></div>
            {draft.type === 'square' ? (<>
              <div><label style={labelStyle}>Width</label>
                <input type="number" step="32" value={draft.w || 768} onChange={e => update({ w: +e.target.value })}
                  style={{ ...inputStyle, width: '100%' }} /></div>
              <div><label style={labelStyle}>Height</label>
                <input type="number" step="32" value={draft.h || 768} onChange={e => update({ h: +e.target.value })}
                  style={{ ...inputStyle, width: '100%' }} /></div>
            </>) : (
              <div><label style={labelStyle}>Radius</label>
                <input type="number" step="32" value={draft.r || 384} onChange={e => update({ r: +e.target.value })}
                  style={{ ...inputStyle, width: '100%' }} /></div>
            )}
            <div><label style={labelStyle}>Floor H</label>
              <input type="number" step="8" value={cs.floorH | 0} onChange={e => updateCS({ floorH: +e.target.value })}
                style={{ ...inputStyle, width: '100%' }} /></div>
            <div><label style={labelStyle}>Ceil H</label>
              <input type="number" step="8" value={cs.ceilH | 0} onChange={e => updateCS({ ceilH: +e.target.value })}
                style={{ ...inputStyle, width: '100%' }} /></div>
            <div><label style={labelStyle}>Light (0-255)</label>
              <input type="number" min="0" max="255" step="8" value={cs.light | 0} onChange={e => updateCS({ light: Math.max(0, Math.min(255, +e.target.value)) })}
                style={{ ...inputStyle, width: '100%' }} /></div>
            <div><label style={labelStyle}>Open sky</label>
              <select value={cs.hasSky ? '1' : '0'} onChange={e => updateCS({ hasSky: e.target.value === '1' })}
                style={{ ...selStyle, width: '100%' }}>
                <option value="0">No</option><option value="1">Yes (sky ceiling)</option>
              </select></div>
            <div><label style={labelStyle}>Floor tex</label>
              <select value={cs.palette.floor || 'FLAT5_4'} onChange={e => updatePalette('floor', e.target.value)} style={{ ...selStyle, width: '100%' }}>
                {TEX_OPTIONS.floor.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label style={labelStyle}>Ceil tex</label>
              <select value={cs.palette.ceil || 'CEIL5_1'} onChange={e => updatePalette('ceil', e.target.value)} style={{ ...selStyle, width: '100%' }}>
                {TEX_OPTIONS.ceil.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label style={labelStyle}>Wall tex</label>
              <select value={cs.palette.wall || 'STARTAN2'} onChange={e => updatePalette('wall', e.target.value)} style={{ ...selStyle, width: '100%' }}>
                {TEX_OPTIONS.wall.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
            <div><label style={labelStyle}>Accent tex</label>
              <select value={cs.palette.accent || 'FLOOR0_3'} onChange={e => updatePalette('accent', e.target.value)} style={{ ...selStyle, width: '100%' }}>
                {TEX_OPTIONS.floor.map(t => <option key={t} value={t}>{t}</option>)}
              </select></div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ ...labelStyle, marginBottom: 0, flex: 1 }}>Pillars ({cs.pillars.length})</span>
              <button onClick={addPillar} style={{ ...inputStyle, color: COLORS.cyan, cursor: 'pointer', width: 90 }}>+ PILLAR</button>
            </div>
            {cs.pillars.map((p, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 4, marginBottom: 4, alignItems: 'end' }}>
                <div><span style={labelStyle}>dx</span><input type="number" step="32" value={p.dx} onChange={e => updPillar(i, { dx: +e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
                <div><span style={labelStyle}>dy</span><input type="number" step="32" value={p.dy} onChange={e => updPillar(i, { dy: +e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
                <div><span style={labelStyle}>r</span><input type="number" step="8" value={p.radius} onChange={e => updPillar(i, { radius: +e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
                <div><span style={labelStyle}>top (0 = full)</span><input type="number" step="8" value={p.top | 0} onChange={e => updPillar(i, { top: +e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
                <div><span style={labelStyle}>tex</span>
                  <select value={p.tex || 'SUPPORT2'} onChange={e => updPillar(i, { tex: e.target.value })} style={{ ...selStyle, width: '100%' }}>
                    {TEX_OPTIONS.wall.map(t => <option key={t} value={t}>{t}</option>)}
                  </select></div>
                <button onClick={() => rmPillar(i)} style={{ ...inputStyle, color: COLORS.danger, cursor: 'pointer', width: 30 }}>×</button>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
              <span style={{ ...labelStyle, marginBottom: 0, flex: 1 }}>Pits / Platforms ({cs.terrains.length})</span>
              <button onClick={addPit} style={{ ...inputStyle, color: COLORS.cyan, cursor: 'pointer', width: 70 }}>+ PIT</button>
              <button onClick={addPlat} style={{ ...inputStyle, color: COLORS.cyan, cursor: 'pointer', width: 90 }}>+ PLATFORM</button>
            </div>
            {cs.terrains.map((t, i) => (
              <div key={i} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr auto', gap: 4, marginBottom: 4, alignItems: 'end' }}>
                <div><span style={labelStyle}>dx</span><input type="number" step="32" value={t.dx} onChange={e => updTerr(i, { dx: +e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
                <div><span style={labelStyle}>dy</span><input type="number" step="32" value={t.dy} onChange={e => updTerr(i, { dy: +e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
                <div><span style={labelStyle}>hw</span><input type="number" step="32" value={t.hw} onChange={e => updTerr(i, { hw: +e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
                <div><span style={labelStyle}>hh</span><input type="number" step="32" value={t.hh} onChange={e => updTerr(i, { hh: +e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
                <div><span style={labelStyle}>floor Δ</span><input type="number" step="8" value={t.dh} onChange={e => updTerr(i, { dh: +e.target.value })} style={{ ...inputStyle, width: '100%' }} /></div>
                <div><span style={labelStyle}>tex</span>
                  <select value={t.floorTex || 'BLOOD1'} onChange={e => updTerr(i, { floorTex: e.target.value })} style={{ ...selStyle, width: '100%' }}>
                    {TEX_OPTIONS.floor.map(tx => <option key={tx} value={tx}>{tx}</option>)}
                  </select></div>
                <button onClick={() => rmTerr(i)} style={{ ...inputStyle, color: COLORS.danger, cursor: 'pointer', width: 30 }}>×</button>
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, paddingTop: 10, borderTop: '1px solid ' + COLORS.border, marginTop: 10 }}>
          <button onClick={() => onSave(draft)}
            style={{ flex: 1, padding: '8px 12px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
              background: COLORS.amber, color: COLORS.bg, border: '1px solid ' + COLORS.amber, borderRadius: 4 }}>
            SAVE PRESET
          </button>
          <button onClick={() => onDelete(draft.id)} title="delete"
            style={{ padding: '8px 12px', fontSize: 12, fontWeight: 700, letterSpacing: '0.1em',
              background: COLORS.bg, color: COLORS.danger, border: '1px solid ' + COLORS.danger, borderRadius: 4 }}>
            DELETE
          </button>
        </div>
      </div>
    </div>
  );
}

function ShapeShifter({ handoff, onClearHandoff, onOpenEther } = {}) {
  const [rooms, setRooms] = useState([]);
  const [connections, setConnections] = useState([]); // [{ id, fromId, toId, valid }]
  const [thingsList, setThingsList] = useState([]);   // user-placed things (pre-build)
  const [mode, setMode] = useState('place'); // 'place' | 'connect' | 'things'
  const [selectedId, setSelectedId] = useState(null);          // selected ROOM
  const [selectedThingId, setSelectedThingId] = useState(null); // selected THING
  const [pendingConnect, setPendingConnect] = useState(null);
  const [connKind, setConnKind] = useState('corridor'); // 'corridor' | 'teleporter'
  const [thingCat, setThingCat] = useState('PLAYER');
  const [pickedThingType, setPickedThingType] = useState(1);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 0.15 });
  // Custom user-designed room presets, persisted to localStorage. Each is in
  // the same shape as a SHAPESHIFTER_PRESETS entry plus a customSpec field
  // that the generator applies on feature='custom'.
  const [customPresets, setCustomPresets] = useState(() => {
    try {
      const raw = typeof localStorage !== 'undefined' && localStorage.getItem('ssCustomPresets');
      return raw ? JSON.parse(raw) : [];
    } catch (e) { return []; }
  });
  const saveCustomPreset = (preset) => {
    setCustomPresets(prev => {
      const next = [...prev.filter(p => p.id !== preset.id), preset];
      try { localStorage.setItem('ssCustomPresets', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };
  const deleteCustomPreset = (id) => {
    setCustomPresets(prev => {
      const next = prev.filter(p => p.id !== id);
      try { localStorage.setItem('ssCustomPresets', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };
  // Room Designer modal — open / null. When opening to edit, pre-fill with
  // the existing preset; otherwise start blank.
  const [designerPreset, setDesignerPreset] = useState(null);

  // Handoff from EtherWad: accept the generated rooms / connections / things
  // verbatim, then clear the handoff so a return-trip to EtherWad followed by
  // a switch back to ShapeShifter doesn't re-stamp the stale set.
  useEffect(() => {
    if (!handoff) return;
    setRooms(handoff.rooms || []);
    setConnections(handoff.connections || []);
    setThingsList(handoff.things || []);
    setPreviewMap(null);
    setSelectedId(null);
    setSelectedThingId(null);
    setHint('Loaded EtherWad level — tap BUILD to compile, or keep editing.');
    if (onClearHandoff) onClearHandoff();
  }, [handoff]);
  const [hint, setHint] = useState('PLACE rooms, then CONNECT them, then drop THINGS, then BUILD.');
  const [previewMap, setPreviewMap] = useState(null);
  const [needP1Confirm, setNeedP1Confirm] = useState(false);
  const [needExitConfirm, setNeedExitConfirm] = useState(false);
  // Set when the DOOM launch popup was blocked — shows a direct OPEN DOOM
  // anchor instead (a real tap on an anchor is never popup-blocked).
  const [doomReady, setDoomReady] = useState(false);
  // Modal "Working…" overlay shown during long-running synchronous work
  // (BUILD) so the app doesn't look frozen while JS blocks the main thread.
  const [busy, setBusy] = useState(null);
  const canvasRef = useRef(null);
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);

  const screenToWorld = useCallback((sx, sy) => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    return { x: view.x + (sx - cx) / view.zoom, y: view.y - (sy - cy) / view.zoom };
  }, [view]);
  const worldToScreen = useCallback((wx, wy) => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
    const rect = c.getBoundingClientRect();
    const cx = rect.width / 2, cy = rect.height / 2;
    return { x: cx + (wx - view.x) * view.zoom, y: cy - (wy - view.y) * view.zoom };
  }, [view]);

  function nextId(prefix) { return prefix + Date.now() + '_' + Math.floor(Math.random() * 1e6); }
  const roomById = useCallback((id) => rooms.find(r => r.id === id), [rooms]);

  function bboxesOverlap(a, b) {
    return !(a.maxX <= b.minX || b.maxX <= a.minX ||
             a.maxY <= b.minY || b.maxY <= a.minY);
  }

  const addPreset = (preset) => {
    const target = { type: preset.type, cx: view.x, cy: view.y,
      w: preset.w, h: preset.h, r: preset.r };
    // Initial placement: nudge to a free spot but allow the user to drag
    // it INTO another room — overlap is how rooms fuse.
    for (let attempt = 0; attempt < 30; attempt++) {
      const bb = shapeShifterRoomBBox(target);
      const overlap = rooms.some((o) => bboxesOverlap(bb, shapeShifterRoomBBox(o)));
      if (!overlap) break;
      const ang = attempt * 0.5;
      const dist = 256 + attempt * 64;
      target.cx = Math.round((view.x + Math.cos(ang) * dist) / 32) * 32;
      target.cy = Math.round((view.y + Math.sin(ang) * dist) / 32) * 32;
    }
    const r = { ...target, id: nextId('ssr'), label: preset.label, feature: preset.feature,
      customSpec: preset.customSpec || null };
    setRooms(rs => [...rs, r]);
    setSelectedId(r.id);
    setHint(preset.label + ' placed — drag rooms over each other to fuse them.');
  };

  const deleteSelected = () => {
    if (!selectedId) return;
    setRooms(rs => rs.filter(r => r.id !== selectedId));
    setConnections(cs => cs.filter(c => c.fromId !== selectedId && c.toId !== selectedId));
    setSelectedId(null);
    setHint('Room and its connections removed.');
  };

  const tryConnectRooms = (fromId, toId) => {
    if (fromId === toId) return;
    if (connections.some(c =>
      (c.fromId === fromId && c.toId === toId) ||
      (c.fromId === toId && c.toId === fromId))) {
      setHint('These rooms are already connected.');
      return;
    }
    // Validate against current placement by building a one-connection probe.
    const specs = rooms.map(r => ({
      type: r.type, cx: r.cx, cy: r.cy, w: r.w, h: r.h, r: r.r, feature: r.feature, id: r.id,
      customSpec: r.customSpec || null,
    }));
    const test = generateShapeShifterMap(specs, [{ fromId, toId, kind: connKind }]);
    if (connKind === 'teleporter') {
      // Teleporter is valid when a pad was carved in BOTH rooms (8 WR-97
      // lines + two type-14 destinations). Pads only fit flat-floored rooms.
      const padPairOK = test.things.filter(t => t.type === 14).length === 2;
      const conn = { id: nextId('ssc'), fromId, toId, kind: 'teleporter', valid: padPairOK };
      setConnections(cs => [...cs, conn]);
      setHint(padPairOK
        ? 'Teleporter linked — instant travel between the pads. Keep linking or BUILD.'
        : 'Teleport pad won’t fit — use open flat rooms (Plaza, Courtyard, Lift Vault).');
      return;
    }
    const hasNewDoor = test.linedefs.some(l => l.special === 1);
    const conn = { id: nextId('ssc'), fromId, toId, kind: 'corridor', valid: hasNewDoor };
    setConnections(cs => [...cs, conn]);
    if (hasNewDoor) {
      setHint('Corridor drawn — keep linking or hit BUILD.');
    } else {
      setHint('Walls don’t align — move a room so their cardinal edges overlap.');
    }
  };

  const deleteConnection = (id) => {
    setConnections(cs => cs.filter(c => c.id !== id));
    setHint('Connection removed.');
  };

  const build = async () => {
    if (rooms.length < 1) { setHint('Place at least one room first.'); return; }
    // Warn ONCE per missing-essentials category before the real build.
    // Both confirms are cleared together at the bottom, so the user
    // never gets two warnings then a build that re-warns about the
    // first thing.
    const hasP1 = thingsList.some(t => t.type === 1);
    if (!hasP1 && !needP1Confirm) {
      setNeedP1Confirm(true);
      setHint('⚠ No Player 1 start placed. Add one in THINGS, or tap BUILD again to auto-place it at the first room.');
      return;
    }
    const hasExit = thingsList.some(t => t.type === EXIT_PILLAR_TYPE);
    if (!hasExit && !needExitConfirm) {
      setNeedExitConfirm(true);
      setHint('⚠ No Exit Pillar placed. Add one in THINGS (player category) for a working exit, or tap BUILD again to ship without one.');
      return;
    }
    setNeedP1Confirm(false);
    setNeedExitConfirm(false);
    // Show the "Working…" overlay and wait two frames so React commits the
    // overlay into the DOM before the synchronous generator blocks the main
    // thread — otherwise the dim/spinner never paints and the app reads as
    // frozen on big maps.
    setBusy('Building map…');
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    try {
      const specs = rooms.map(r => ({
        type: r.type, cx: r.cx, cy: r.cy, w: r.w, h: r.h, r: r.r, feature: r.feature, id: r.id,
        customSpec: r.customSpec || null,
      }));
      const thingSpecs = thingsList.map(t => ({
        type: t.type, x: t.x, y: t.y, angle: t.angle | 0, flags: t.flags | 7,
      }));
      const map = generateShapeShifterMap(specs, connections, thingSpecs);
      // Doom-character walk check: sample several points across each room,
      // ray-cast in 8 directions, and count any line whose flag/sidedef
      // combination would render as a "see-through but impassable" wall.
      const issues = simulatePlayerWalk(map, rooms);
      setPreviewMap(map);
      setSelectedThingId(null);
      if (issues.brokenLines > 0) {
        setHint('Built. ' + issues.brokenLines + ' suspect line(s) flagged (impassable but two-sided / mismatched facing). PLAY / SAVE to export anyway.');
      } else {
        setHint('Built — walk check clean. PLAY / SAVE to export, BACK to keep editing.');
      }
    } catch (e) {
      setHint('Build failed: ' + e.message);
    } finally {
      setBusy(null);
    }
  };

  // Simulate a Doom-character "walk check" on the built map. For each room
  // the user placed, sample the centre and run 8 ray-casts looking for
  // linedefs that would visually break: two-sided lines flagged impassable,
  // one-sided lines with no front sidedef, or lines whose front sector
  // claim disagrees with point-in-polygon. Returns { brokenLines, points }.
  function simulatePlayerWalk(map, userRooms) {
    const sdMap = new Map(map.sidedefs.map(s => [s.id, s]));
    let brokenLines = 0;
    for (const l of map.linedefs) {
      const twoSided = (l.flags & 4) !== 0;
      const impassable = (l.flags & 1) !== 0;
      // 2-sided lines should not be impassable
      if (twoSided && impassable) brokenLines++;
      // 1-sided lines must have a front sidedef and no back
      if (!twoSided) {
        if (l.front === -1 || l.front == null) brokenLines++;
      }
      // Sidedefs must reference an existing sector
      const fs = sdMap.get(l.front);
      if (l.front !== -1 && (!fs || !map.sectors.find(s => s.id === fs.sector))) brokenLines++;
    }
    return { brokenLines };
  }

  const placeThing = (wx, wy) => {
    const nx = Math.round(wx), ny = Math.round(wy);
    const t = { id: nextId('th'), x: nx, y: ny, angle: 0, type: pickedThingType, flags: 7 };
    setThingsList(ts => [...ts, t]);
    setSelectedThingId(t.id);
  };
  const deleteSelectedThing = () => {
    if (!selectedThingId) return;
    setThingsList(ts => ts.filter(t => t.id !== selectedThingId));
    setSelectedThingId(null);
  };
  const rotateSelectedThing = () => {
    if (!selectedThingId) return;
    setThingsList(ts => ts.map(t => t.id === selectedThingId ? { ...t, angle: ((t.angle | 0) + 45) % 360 } : t));
  };

  const playWad = async () => {
    if (!previewMap) return;
    try {
      // Substitute the edited thing list (with stable IDs) into the map.
      // Exit Pillar MARKERS (type 32000) must never reach a real engine —
      // vanilla/chocolate error out with "P_SpawnMapThing: Unknown type".
      // The generated exit-post geometry is already baked into previewMap.
      const finalThings = thingsList
        .filter(t => t.type !== EXIT_PILLAR_TYPE)
        .map((t, i) => ({
          id: 't' + i, x: t.x | 0, y: t.y | 0,
          angle: t.angle | 0, type: t.type, flags: t.flags | 7,
        }));
      const finalMap = { ...previewMap, things: finalThings };
      const buf = buildWad({ MAP01: finalMap });
      const file = new File([buf], 'shapeshifter.wad', { type: 'application/octet-stream' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        try { await navigator.share({ files: [file], title: 'shapeshifter.wad' }); return; }
        catch (e) { if (e?.name === 'AbortError') return; }
      }
      const url = URL.createObjectURL(new Blob([buf], { type: 'application/octet-stream' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'shapeshifter.wad';
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { setHint('Save failed: ' + e.message); }
  };

  // DOOM — play the built level in the browser. Writes the WAD bytes to
  // IndexedDB (db 'jerkwad' / store 'wads' / key 'current') and opens the
  // /play page, which boots Chocolate Doom WASM with freedoom2.wad as the
  // IWAD and merges this PWAD on top (see play/index.html).
  const doomPlay = () => {
    if (!previewMap) return;
    // window.open MUST run synchronously inside the tap's call stack —
    // mobile browsers popup-block any open() that happens after an await.
    // The player page waits (polls IndexedDB) for the WAD we write below.
    let win = null;
    try { win = window.open('play/?wait=1', '_blank'); } catch (e) {}
    (async () => {
      try {
        const finalThings = thingsList
          .filter(t => t.type !== EXIT_PILLAR_TYPE)
          .map((t, i) => ({
            id: 't' + i, x: t.x | 0, y: t.y | 0,
            angle: t.angle | 0, type: t.type, flags: t.flags | 7,
          }));
        const finalMap = { ...previewMap, things: finalThings };
        const buf = buildWad({ MAP01: finalMap });
        await new Promise((resolve, reject) => {
          const req = indexedDB.open('jerkwad', 1);
          req.onupgradeneeded = () => { req.result.createObjectStore('wads'); };
          req.onsuccess = () => {
            try {
              const tx = req.result.transaction('wads', 'readwrite');
              tx.objectStore('wads').put(buf, 'current');
              tx.oncomplete = resolve;
              tx.onerror = () => reject(tx.error);
            } catch (e) { reject(e); }
          };
          req.onerror = () => reject(req.error);
        });
        if (win) {
          setHint('Launching Chocolate Doom — the level is MAP01.');
        } else {
          // Popup blocked: the WAD is saved; show a direct link the user
          // can tap (a real anchor tap never gets popup-blocked).
          setDoomReady(true);
          setHint('WAD ready — tap OPEN DOOM (popup was blocked).');
        }
      } catch (e) {
        if (win) { try { win.close(); } catch (e2) {} }
        setHint('DOOM launch failed: ' + e.message);
      }
    })();
  };

  function hitRoom(sx, sy) {
    const w = screenToWorld(sx, sy);
    for (let i = rooms.length - 1; i >= 0; i--) {
      const pts = shapeShifterRoomPolygon(rooms[i]);
      if (pointInPolygon(w.x, w.y, pts)) return rooms[i];
    }
    return null;
  }
  // Resize handle sits at the room's far corner: top-right for squares,
  // the east point for octagons/hexagons.
  function roomResizeHandle(r) {
    if (r.type === 'square') return { x: r.cx + r.w / 2, y: r.cy + r.h / 2 };
    return { x: r.cx + (r.r || 256), y: r.cy };
  }
  function hitResizeHandle(sx, sy, room) {
    if (!room) return false;
    const h = roomResizeHandle(room);
    const hs = worldToScreen(h.x, h.y);
    return dist2(sx, sy, hs.x, hs.y) < 26 * 26;
  }
  function hitConnection(sx, sy) {
    const w = screenToWorld(sx, sy);
    const TOL = 16 / view.zoom;
    for (const c of connections) {
      const a = roomById(c.fromId), b = roomById(c.toId); if (!a || !b) continue;
      const dx = b.cx - a.cx, dy = b.cy - a.cy;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1) continue;
      let t = ((w.x - a.cx) * dx + (w.y - a.cy) * dy) / len2;
      t = Math.max(0, Math.min(1, t));
      const px = a.cx + t * dx, py = a.cy + t * dy;
      const d2 = (w.x - px) ** 2 + (w.y - py) ** 2;
      if (d2 < TOL * TOL) return c;
    }
    return null;
  }

  function hitThing(sx, sy) {
    const w = screenToWorld(sx, sy);
    const TOL = 18 / view.zoom;
    for (let i = thingsList.length - 1; i >= 0; i--) {
      const t = thingsList[i];
      const dx = w.x - t.x, dy = w.y - t.y;
      if (dx * dx + dy * dy < TOL * TOL) return t;
    }
    return null;
  }

  const onPointerDown = (e) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    pointersRef.current.set(e.pointerId, { sx, sy, startX: sx, startY: sy, t: Date.now() });
    if (pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      gestureRef.current = { kind: 'pinch',
        startDist: Math.hypot(a.sx - b.sx, a.sy - b.sy),
        startZoom: view.zoom, startView: { x: view.x, y: view.y } };
      return;
    }
    if (previewMap) {
      gestureRef.current = { kind: 'pan', startView: { x: view.x, y: view.y } };
      return;
    }
    if (mode === 'connect') {
      const hit = hitRoom(sx, sy);
      if (hit) {
        if (pendingConnect && pendingConnect !== hit.id) {
          tryConnectRooms(pendingConnect, hit.id);
          setPendingConnect(null);
        } else {
          setPendingConnect(hit.id);
          setHint('Now tap a second room to draw the corridor.');
        }
        gestureRef.current = { kind: 'tap' };
      } else {
        const co = hitConnection(sx, sy);
        if (co) { deleteConnection(co.id); gestureRef.current = { kind: 'tap' }; }
        else gestureRef.current = { kind: 'pan', startView: { x: view.x, y: view.y } };
      }
      return;
    }
    if (mode === 'things') {
      const ht = hitThing(sx, sy);
      if (ht) {
        setSelectedThingId(ht.id);
        const w = screenToWorld(sx, sy);
        gestureRef.current = { kind: 'thingDrag', id: ht.id, offsetX: ht.x - w.x, offsetY: ht.y - w.y };
      } else {
        const w = screenToWorld(sx, sy);
        placeThing(w.x, w.y);
        gestureRef.current = { kind: 'tap' };
      }
      return;
    }
    // PLACE mode — check the selected room's resize handle first.
    const selRoom = rooms.find(r => r.id === selectedId);
    if (selRoom && hitResizeHandle(sx, sy, selRoom)) {
      gestureRef.current = { kind: 'resize', id: selRoom.id };
      return;
    }
    const hit = hitRoom(sx, sy);
    if (hit) {
      setSelectedId(hit.id);
      const w = screenToWorld(sx, sy);
      gestureRef.current = { kind: 'drag', id: hit.id, offsetX: hit.cx - w.x, offsetY: hit.cy - w.y };
    } else {
      const co = hitConnection(sx, sy);
      if (co) {
        deleteConnection(co.id);
        gestureRef.current = { kind: 'tap' };
      } else {
        setSelectedId(null);
        gestureRef.current = { kind: 'pan', startView: { x: view.x, y: view.y } };
      }
    }
  };
  const onPointerMove = (e) => {
    const rec = pointersRef.current.get(e.pointerId);
    if (!rec) return;
    const rect = canvasRef.current.getBoundingClientRect();
    rec.sx = e.clientX - rect.left; rec.sy = e.clientY - rect.top;
    const g = gestureRef.current;
    if (!g) return;
    if (g.kind === 'pinch' && pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      const d = Math.hypot(a.sx - b.sx, a.sy - b.sy);
      if (g.startDist > 4) {
        const zoom = Math.max(0.03, Math.min(2, g.startZoom * (d / g.startDist)));
        setView(v => ({ ...v, zoom }));
      }
    } else if (g.kind === 'pan' && pointersRef.current.size === 1) {
      const dx = (rec.sx - rec.startX) / view.zoom;
      const dy = (rec.sy - rec.startY) / view.zoom;
      setView({ x: g.startView.x - dx, y: g.startView.y + dy, zoom: view.zoom });
    } else if (g.kind === 'drag' && pointersRef.current.size === 1) {
      const w = screenToWorld(rec.sx, rec.sy);
      const nx = Math.round((w.x + g.offsetX) / 32) * 32;
      const ny = Math.round((w.y + g.offsetY) / 32) * 32;
      // Overlap is the fusion mechanic — let it happen freely. The build
      // pass merges coincident walls into open passages.
      setRooms(rs => rs.map(r => r.id === g.id ? { ...r, cx: nx, cy: ny } : r));
    } else if (g.kind === 'resize' && pointersRef.current.size === 1) {
      const w = screenToWorld(rec.sx, rec.sy);
      setRooms(rs => rs.map(r => {
        if (r.id !== g.id) return r;
        if (r.type === 'square') {
          const halfW = Math.max(64, Math.round(Math.abs(w.x - r.cx) / 32) * 32);
          const halfH = Math.max(64, Math.round(Math.abs(w.y - r.cy) / 32) * 32);
          return { ...r, w: halfW * 2, h: halfH * 2 };
        }
        const rad = Math.max(96, Math.round(Math.hypot(w.x - r.cx, w.y - r.cy) / 32) * 32);
        return { ...r, r: rad };
      }));
    } else if (g.kind === 'thingDrag' && pointersRef.current.size === 1) {
      const w = screenToWorld(rec.sx, rec.sy);
      const nx = Math.round(w.x);
      const ny = Math.round(w.y);
      setThingsList(ts => ts.map(t => t.id === g.id ? { ...t, x: nx, y: ny } : t));
    }
  };
  const onPointerUp = (e) => {
    pointersRef.current.delete(e.pointerId);
    if (pointersRef.current.size === 0) gestureRef.current = null;
  };

  useEffect(() => {
    const c = canvasRef.current; if (!c) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = c.getBoundingClientRect();
    c.width = rect.width * dpr; c.height = rect.height * dpr;
    const ctx = c.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COLORS.bg; ctx.fillRect(0, 0, rect.width, rect.height);
    // grid
    if (view.zoom > 0.04) {
      const grid = 64;
      const tl = screenToWorld(0, 0), br = screenToWorld(rect.width, rect.height);
      ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = Math.floor(tl.x / grid) * grid; x < br.x; x += grid) {
        const s = worldToScreen(x, 0); ctx.moveTo(s.x + 0.5, 0); ctx.lineTo(s.x + 0.5, rect.height);
      }
      for (let y = Math.floor(br.y / grid) * grid; y < tl.y; y += grid) {
        const s = worldToScreen(0, y); ctx.moveTo(0, s.y + 0.5); ctx.lineTo(rect.width, s.y + 0.5);
      }
      ctx.stroke();
    }
    if (previewMap) {
      // Render generated map: filled sectors + walls.
      const vmap = new Map(previewMap.vertices.map(v => [v.id, v]));
      const sdmap = new Map(previewMap.sidedefs.map(s => [s.id, s]));
      const secMap = new Map(previewMap.sectors.map(s => [s.id, s]));
      const loops = buildSectorLoops(previewMap);
      for (const [sId, ls] of loops) {
        const sec = secMap.get(sId); if (!sec) continue;
        const tex = sec.floorTex || 'FLOOR0_1';
        const rgb = FLAT_COLORS[tex] || [60, 70, 90];
        ctx.fillStyle = 'rgb(' + rgb.join(',') + ')';
        ctx.beginPath();
        for (const loop of ls) {
          loop.forEach((vid, i) => {
            const v = vmap.get(vid); if (!v) return;
            const s = worldToScreen(v.x, v.y);
            if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
          });
          ctx.closePath();
        }
        ctx.fill('evenodd');
      }
      // Walls
      ctx.lineWidth = 1; ctx.strokeStyle = COLORS.amber; ctx.beginPath();
      for (const l of previewMap.linedefs) {
        const v1 = vmap.get(l.v1), v2 = vmap.get(l.v2); if (!v1 || !v2) continue;
        const a = worldToScreen(v1.x, v1.y), b = worldToScreen(v2.x, v2.y);
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      // Doors highlighted
      ctx.lineWidth = 2; ctx.strokeStyle = '#ff5c5c'; ctx.beginPath();
      for (const l of previewMap.linedefs) {
        if (l.special !== 1) continue;
        const v1 = vmap.get(l.v1), v2 = vmap.get(l.v2); if (!v1 || !v2) continue;
        const a = worldToScreen(v1.x, v1.y), b = worldToScreen(v2.x, v2.y);
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
      // Things from the built map (includes any auto-inserted P1 start)
      for (const t of previewMap.things) {
        const info = SHAPESHIFTER_THING_LOOKUP.get(t.type);
        const color = info?.color || COLORS.thing;
        const p = worldToScreen(t.x, t.y);
        ctx.fillStyle = color;
        ctx.beginPath(); ctx.arc(p.x, p.y, 6, 0, Math.PI * 2); ctx.fill();
        ctx.lineWidth = 1; ctx.strokeStyle = '#000'; ctx.stroke();
        const a = (t.angle || 0) * Math.PI / 180;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + Math.cos(a) * 12, p.y - Math.sin(a) * 12);
        ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
      }
      return;
    }
    // Fusion preview — for any overlapping rooms, run the same grid-emit
    // logic the build pass uses, and paint the resulting walls so the user
    // sees EXACTLY what the WAD will contain. Solid amber = one-sided wall
    // (perimeter); dashed cyan = two-sided passable line between sectors.
    const fusion = computeShapeShifterFusion(rooms);
    if (fusion.segments.length) {
      for (const seg of fusion.segments) {
        const a = worldToScreen(seg.x1, seg.y1), b = worldToScreen(seg.x2, seg.y2);
        ctx.beginPath();
        if (seg.kind === 'wall') {
          ctx.strokeStyle = COLORS.amber; ctx.lineWidth = 3; ctx.setLineDash([]);
        } else {
          ctx.strokeStyle = COLORS.accent; ctx.lineWidth = 2; ctx.setLineDash([4, 4]);
        }
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      }
      ctx.setLineDash([]);
    }
    // Seams — green highlight where two rooms touch along an axis-aligned
    // wall. The build pass merges these into open passages between rooms.
    const seams = findShapeShifterSeams(rooms);
    if (seams.length) {
      ctx.lineWidth = 6;
      ctx.strokeStyle = COLORS.accent;
      ctx.setLineDash([]);
      ctx.beginPath();
      for (const s of seams) {
        const a = worldToScreen(s.x1, s.y1), b = worldToScreen(s.x2, s.y2);
        ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y);
      }
      ctx.stroke();
    }
    // Connections (drawn before rooms so room outlines sit on top of endpoints).
    // Teleporters draw as a violet dotted link with ◉ endpoints; corridors as
    // a solid amber line. Invalid links are red dashed.
    for (const c of connections) {
      const a = roomById(c.fromId), b = roomById(c.toId); if (!a || !b) continue;
      const pa = worldToScreen(a.cx, a.cy), pb = worldToScreen(b.cx, b.cy);
      const isTele = c.kind === 'teleporter';
      ctx.lineWidth = 4;
      ctx.strokeStyle = c.valid === false ? COLORS.danger : (isTele ? '#9966ff' : COLORS.amber);
      ctx.setLineDash(c.valid === false ? [6, 6] : (isTele ? [3, 9] : []));
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
      ctx.setLineDash([]);
      if (isTele && c.valid !== false) {
        ctx.fillStyle = '#9966ff';
        ctx.font = '16px ui-monospace, monospace';
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.fillText('◉', pa.x, pa.y);
        ctx.fillText('◉', pb.x, pb.y);
      }
    }
    // Rooms — render polygons. Fused rooms get a faint tint only (their
    // outline is replaced by the fusion-pass walls drawn above) so the
    // editor matches what the build pass will produce.
    for (let ri = 0; ri < rooms.length; ri++) {
      const r = rooms[ri];
      const fused = fusion.fusedIdx.has(ri);
      const pts = shapeShifterRoomPolygon(r);
      ctx.beginPath();
      pts.forEach((p, i) => { const s = worldToScreen(p.x, p.y); if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y); });
      ctx.closePath();
      const selected = r.id === selectedId;
      const pending = r.id === pendingConnect;
      ctx.fillStyle = pending ? COLORS.accent + '33'
                   : selected ? COLORS.amber + '33'
                   : fused ? COLORS.cyan + '11'
                   : COLORS.cyan + '22';
      ctx.fill();
      if (!fused || selected || pending) {
        ctx.strokeStyle = pending ? COLORS.accent : selected ? COLORS.amber : COLORS.cyan;
        ctx.lineWidth = (pending || selected) ? 3 : 2;
        ctx.setLineDash(fused && !selected && !pending ? [3, 3] : []);
        ctx.stroke();
        ctx.setLineDash([]);
      }
      const c2 = worldToScreen(r.cx, r.cy);
      ctx.fillStyle = COLORS.text;
      ctx.font = '12px ui-monospace, monospace';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText(r.label, c2.x, c2.y);
      // Resize handle for the selected room (PLACE mode only).
      if (selected && mode === 'place' && !previewMap) {
        const h = roomResizeHandle(r);
        const hs = worldToScreen(h.x, h.y);
        ctx.fillStyle = COLORS.amber;
        ctx.fillRect(hs.x - 7, hs.y - 7, 14, 14);
        ctx.strokeStyle = COLORS.bg; ctx.lineWidth = 2;
        ctx.strokeRect(hs.x - 7, hs.y - 7, 14, 14);
      }
    }
    // User-placed things (visible in all edit modes, interactive only in
    // THINGS mode).
    for (const t of thingsList) {
      const info = SHAPESHIFTER_THING_LOOKUP.get(t.type);
      const color = info?.color || COLORS.thing;
      const p = worldToScreen(t.x, t.y);
      const selected = t.id === selectedThingId;
      const radius = selected ? 9 : 6;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(p.x, p.y, radius, 0, Math.PI * 2); ctx.fill();
      ctx.lineWidth = selected ? 2 : 1;
      ctx.strokeStyle = selected ? COLORS.amber : '#000';
      ctx.stroke();
      const a = (t.angle || 0) * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      ctx.lineTo(p.x + Math.cos(a) * (radius + 6), p.y - Math.sin(a) * (radius + 6));
      ctx.strokeStyle = '#000'; ctx.lineWidth = 2; ctx.stroke();
    }
  }, [rooms, connections, selectedId, pendingConnect, view, previewMap, thingsList, selectedThingId, mode, screenToWorld, worldToScreen, roomById]);

  return (
    <div className="w-full h-screen flex flex-col overflow-hidden select-none"
      style={{ background: COLORS.bg, color: COLORS.text, fontFamily: fontStack, touchAction: 'none' }}>
      {busy ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000,
          background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: fontStack, color: '#fff', fontSize: 16, letterSpacing: 1 }}>
          <div style={{ padding: '18px 28px', background: COLORS.bgPanel,
            border: '1px solid ' + COLORS.border, borderRadius: 4,
            textAlign: 'center', minWidth: 220 }}>
            <div style={{ fontSize: 22, marginBottom: 10 }}>{busy}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>The app may be unresponsive for a moment — please wait.</div>
          </div>
        </div>
      ) : null}
      {designerPreset ? (
        <RoomDesignerModal preset={designerPreset} customPresets={customPresets}
          onCancel={() => setDesignerPreset(null)}
          onSave={(p) => { saveCustomPreset(p); setDesignerPreset(null);
            setHint('Saved "' + p.label + '" — tap the chip in PLACE to drop it.'); }}
          onDelete={(id) => { deleteCustomPreset(id); setDesignerPreset(null);
            setHint('Custom preset deleted.'); }} />
      ) : null}
      <div className="flex items-center justify-between px-2 py-1.5 border-b"
        style={{ borderColor: COLORS.border, background: COLORS.bgPanel,
          paddingTop: 'calc(env(safe-area-inset-top) + 0.375rem)' }}>
        <div className="text-xs font-bold tracking-widest flex items-center gap-1.5"
          style={{ color: COLORS.amber, letterSpacing: '0.18em' }}>
          SHAPESHIFTER <span style={{ fontSize: 9, color: COLORS.textDim }}>V0.54</span>
        </div>
        <div className="flex gap-1.5">
          {onOpenEther && !previewMap && (
            <button onClick={onOpenEther}
              style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                       background: COLORS.bgPanel, color: '#9966ff',
                       border: '1px solid #9966ff', borderRadius: 4 }}>
              ETHER
            </button>
          )}
          {!previewMap && (
            <button onClick={build} disabled={rooms.length < 1}
              style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                       background: rooms.length >= 1 ? COLORS.amber : COLORS.bgPanel,
                       color: rooms.length >= 1 ? COLORS.bg : COLORS.textDim,
                       border: '1px solid ' + COLORS.amber, borderRadius: 4 }}>
              BUILD
            </button>
          )}
          {previewMap && (<>
            <button onClick={() => {
                setPreviewMap(null); setSelectedThingId(null);
                setHint('Back to editing — adjust rooms, connections, or things, then BUILD again.');
              }}
              style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                       background: COLORS.bgPanel, color: COLORS.cyan,
                       border: '1px solid ' + COLORS.cyan, borderRadius: 4 }}>BACK</button>
            {doomReady ? (
              <a href="play/?wait=1" target="_blank" rel="noopener"
                onClick={() => setDoomReady(false)}
                style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                         background: '#7fff7f', color: COLORS.bg, textDecoration: 'none',
                         border: '1px solid #7fff7f', borderRadius: 4 }}>OPEN DOOM</a>
            ) : (
              <button onClick={doomPlay}
                style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                         background: '#ff5c5c', color: COLORS.bg,
                         border: '1px solid #ff5c5c', borderRadius: 4 }}>DOOM</button>
            )}
            <button onClick={playWad}
              style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
                       background: COLORS.amber, color: COLORS.bg,
                       border: '1px solid ' + COLORS.amber, borderRadius: 4 }}>PLAY / SAVE</button>
          </>)}
        </div>
      </div>
      {!previewMap && (
        <div style={{ background: COLORS.bgPanel, borderBottom: '1px solid ' + COLORS.border,
                      display: 'flex', gap: 6, padding: '6px 8px' }}>
          {['place','connect','things'].map(m => (
            <button key={m} onClick={() => {
                setMode(m); setSelectedId(null); setSelectedThingId(null); setPendingConnect(null);
                if (m === 'place')   setHint('PLACE: tap a chip, drag rooms to fuse.');
                if (m === 'connect') setHint('CONNECT: pick CORRIDOR or TELEPORTER, then tap two rooms.');
                if (m === 'things')  setHint('THINGS: pick a thing, tap the canvas to drop it.');
              }}
              style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, fontFamily: monoStack,
                       color: mode === m ? COLORS.bg :
                              m === 'connect' ? COLORS.amber : m === 'things' ? '#ff8866' : COLORS.cyan,
                       background: mode === m
                         ? (m === 'connect' ? COLORS.amber : m === 'things' ? '#ff8866' : COLORS.cyan)
                         : COLORS.bg,
                       border: '1px solid ' +
                         (m === 'connect' ? COLORS.amber : m === 'things' ? '#ff8866' : COLORS.cyan),
                       borderRadius: 4 }}>{m.toUpperCase()}</button>
          ))}
          <span style={{ flex: 1 }}/>
          <span style={{ fontFamily: monoStack, fontSize: 10, color: COLORS.textDim, alignSelf: 'center' }}>
            {rooms.length}r / {connections.length}c / {thingsList.length}t
          </span>
        </div>
      )}
      {!previewMap && mode === 'connect' && (
        <div style={{ background: COLORS.bgPanel, borderBottom: '1px solid ' + COLORS.border,
                      display: 'flex', gap: 6, alignItems: 'center', padding: '6px 8px' }}>
          <span style={{ fontFamily: monoStack, fontSize: 10, color: COLORS.textDim }}>LINK:</span>
          {[['corridor', 'CORRIDOR', COLORS.amber], ['teleporter', 'TELEPORTER', '#9966ff']].map(([k, lbl, col]) => (
            <button key={k} onClick={() => {
                setConnKind(k); setPendingConnect(null);
                setHint(k === 'teleporter'
                  ? 'TELEPORTER: tap two flat rooms (Plaza/Courtyard/Lift) for instant travel.'
                  : 'CORRIDOR: tap two rooms whose walls overlap to draw a door.');
              }}
              style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, fontFamily: monoStack,
                       color: connKind === k ? COLORS.bg : col,
                       background: connKind === k ? col : COLORS.bg,
                       border: '1px solid ' + col, borderRadius: 4 }}>{lbl}</button>
          ))}
          <span style={{ flex: 1 }}/>
          <span style={{ fontFamily: monoStack, fontSize: 10, color: COLORS.textDim }}>
            {connKind === 'teleporter' ? '◉ violet = warp' : '— amber = walk'}
          </span>
        </div>
      )}
      {!previewMap && mode === 'place' && (
        <div style={{ background: COLORS.bgPanel, borderBottom: '1px solid ' + COLORS.border,
                      overflowX: 'auto', whiteSpace: 'nowrap', padding: '6px 8px' }}>
          <button onClick={() => setDesignerPreset({ id: 'cstm_' + Date.now().toString(36),
              label: 'My Room', type: 'square', w: 768, h: 768, feature: 'custom',
              customSpec: { palette: {}, floorH: 0, ceilH: 192, light: 176, pillars: [], terrains: [] } })}
            style={{ display: 'inline-block', padding: '6px 10px', marginRight: 6,
                     fontSize: 11, fontFamily: monoStack, color: COLORS.amber, fontWeight: 700,
                     border: '1px solid ' + COLORS.amber, borderRadius: 4,
                     background: COLORS.bg }}>
            + DESIGNER
          </button>
          {customPresets.map(p => (
            <span key={p.id} style={{ display: 'inline-block', marginRight: 6 }}>
              <button onClick={() => addPreset(p)}
                style={{ padding: '6px 10px', fontSize: 11, fontFamily: monoStack, color: COLORS.amber,
                         border: '1px solid ' + COLORS.amber, borderRadius: '4px 0 0 4px',
                         borderRight: 'none', background: COLORS.bg }}>
                + {p.label}
              </button>
              <button onClick={() => setDesignerPreset(p)} title="edit"
                style={{ padding: '6px 6px', fontSize: 11, fontFamily: monoStack, color: COLORS.amber,
                         border: '1px solid ' + COLORS.amber, borderRadius: '0 4px 4px 0',
                         background: COLORS.bg }}>
                ✎
              </button>
            </span>
          ))}
          {SHAPESHIFTER_PRESETS.map(p => (
            <button key={p.id} onClick={() => addPreset(p)}
              style={{ display: 'inline-block', padding: '6px 10px', marginRight: 6,
                       fontSize: 11, fontFamily: monoStack, color: COLORS.cyan,
                       border: '1px solid ' + COLORS.border, borderRadius: 4,
                       background: COLORS.bg }}>
              + {p.label}
            </button>
          ))}
        </div>
      )}
      {!previewMap && mode === 'things' && (
        <div style={{ background: COLORS.bgPanel, borderBottom: '1px solid ' + COLORS.border,
                      display: 'flex', gap: 4, padding: '6px 8px', overflowX: 'auto' }}>
          {Object.keys(SHAPESHIFTER_THINGS).map(cat => (
            <button key={cat} onClick={() => {
                setThingCat(cat);
                const first = SHAPESHIFTER_THINGS[cat][0];
                if (first) setPickedThingType(first.type);
              }}
              style={{ padding: '6px 10px', fontSize: 11, fontWeight: 700, fontFamily: monoStack,
                       color: thingCat === cat ? COLORS.bg : COLORS.cyan,
                       background: thingCat === cat ? COLORS.cyan : COLORS.bg,
                       border: '1px solid ' + COLORS.cyan, borderRadius: 4 }}>{cat}</button>
          ))}
        </div>
      )}
      {!previewMap && mode === 'things' && (
        <div style={{ background: COLORS.bgPanel, borderBottom: '1px solid ' + COLORS.border,
                      overflowX: 'auto', whiteSpace: 'nowrap', padding: '6px 8px' }}>
          {(SHAPESHIFTER_THINGS[thingCat] || []).map(t => {
            const isPicked = pickedThingType === t.type;
            return (
              <button key={t.type} onClick={() => setPickedThingType(t.type)}
                style={{ display: 'inline-block', padding: '6px 10px', marginRight: 6,
                         fontSize: 11, fontFamily: monoStack,
                         color: isPicked ? COLORS.bg : t.color,
                         background: isPicked ? t.color : COLORS.bg,
                         border: '1px solid ' + t.color, borderRadius: 4 }}>
                {t.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <canvas ref={canvasRef} className="w-full h-full"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          style={{ display: 'block', touchAction: 'none' }}/>
        <div style={{ position: 'absolute', top: 8, left: 8, padding: '4px 8px',
                      background: COLORS.bgPanel + 'ee', color: COLORS.amber,
                      fontFamily: monoStack, fontSize: 11, border: '1px solid ' + COLORS.amber,
                      borderRadius: 4, maxWidth: '70%' }}>
          {hint}
        </div>
        {!previewMap && selectedId && mode === 'place' && (
          <button onClick={deleteSelected}
            style={{ position: 'absolute', top: 8, right: 8, padding: '6px 10px',
                     background: COLORS.bgPanel, color: '#ff7676',
                     border: '1px solid #ff7676', borderRadius: 4,
                     fontFamily: monoStack, fontSize: 11, fontWeight: 700 }}>
            DELETE
          </button>
        )}
        {!previewMap && selectedThingId && mode === 'things' && (
          <div style={{ position: 'absolute', top: 8, right: 8, display: 'flex', gap: 6 }}>
            <button onClick={rotateSelectedThing}
              style={{ padding: '6px 10px', background: COLORS.bgPanel, color: COLORS.cyan,
                       border: '1px solid ' + COLORS.cyan, borderRadius: 4,
                       fontFamily: monoStack, fontSize: 11, fontWeight: 700 }}>↻ 45°</button>
            <button onClick={deleteSelectedThing}
              style={{ padding: '6px 10px', background: COLORS.bgPanel, color: '#ff7676',
                       border: '1px solid #ff7676', borderRadius: 4,
                       fontFamily: monoStack, fontSize: 11, fontWeight: 700 }}>DELETE</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// ETHERWAD — automated quantum-random level generator on top of the
// ShapeShifter engine. Pulls entropy from a free online QRNG (random.org's
// atmospheric-noise generator), picks rooms from the SHAPESHIFTER_PRESETS
// pool + the user's Designer-saved customs, places them in overlapping
// fused arrangements, drops the Player 1 start and the Exit Pillar at
// opposite extremes of the map, and scatters monsters whose mix depends
// on the chosen difficulty. The "Edit in ShapeShifter" button hands the
// generated rooms / connections / things off to the editor verbatim.
// ============================================================================

// Free QRNG — random.org plain integers (atmospheric noise, public). CORS
// allowed. We fetch a bucket of bytes and feed them into a Mulberry32 PRNG
// seed so a single generator pass uses a deterministic stream from the
// quantum-seeded root. Network failures silently fall back to Math.random.
const ETHER_ENDPOINT = 'https://www.random.org/integers/?num=1000&min=0&max=255&col=1&base=10&format=plain&rnd=new';
function makeEtherSource() {
  let bucket = [];
  let cursor = 0;
  let status = 'idle'; // 'idle' | 'fetching' | 'ok' | 'error'
  let lastErr = '';
  let lastSize = 0;
  const listeners = new Set();
  const notify = () => listeners.forEach(fn => fn());
  async function refill() {
    status = 'fetching'; notify();
    try {
      const res = await fetch(ETHER_ENDPOINT, { cache: 'no-store' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      const txt = await res.text();
      const nums = txt.trim().split(/\s+/).map(Number).filter(n => Number.isFinite(n) && n >= 0 && n <= 255);
      if (nums.length < 100) throw new Error('too few bytes (' + nums.length + ')');
      bucket = nums; cursor = 0; lastSize = nums.length; status = 'ok'; lastErr = '';
    } catch (e) { status = 'error'; lastErr = String(e.message || e).slice(0, 80); }
    notify();
  }
  function rand() {
    if (cursor + 4 > bucket.length) return Math.random();
    const a = bucket[cursor++], b = bucket[cursor++], c = bucket[cursor++], d = bucket[cursor++];
    const v = (a << 24) | (b << 16) | (c << 8) | d;
    return (v >>> 0) / 0xFFFFFFFF;
  }
  function makeRng() {
    let s = ((rand() * 0xFFFFFFFF) | 0) || 0xDEADBEEF;
    return function () {
      s = (s + 0x6D2B79F5) | 0;
      let t = Math.imul(s ^ (s >>> 15), 1 | s);
      t = t + Math.imul(t ^ (t >>> 7), 61 | t) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function info() { return { status, lastErr, remaining: Math.max(0, bucket.length - cursor), lastSize }; }
  function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
  return { refill, rand, makeRng, info, subscribe };
}

// Difficulty -> monster pool. Realistic + playable: easy is mostly hitscanner
// fodder + imps, medium adds chaingunners + pinkies + cacos, hard layers in
// hell knights + revenants + mancubi + arachnotrons, nightmare unleashes the
// barons / archviles / pain elementals / cyber for the boss-tier maps.
const ETHER_MONSTERS = {
  easy:      [3004, 3004, 3004, 9, 9, 3001, 3001],
  medium:    [3004, 9, 3001, 3001, 3002, 65, 3005, 3006],
  hard:      [3001, 3002, 3005, 3006, 65, 69, 3003, 71, 67, 68, 66],
  nightmare: [3005, 3006, 3003, 64, 71, 67, 68, 16, 69, 66, 3003],
};
// Sprinkle of light ammo/health so easy/medium aren't a death march.
const ETHER_GOODIES = [2007, 2008, 2008, 2011, 2011, 2012, 2014, 2015, 8];

// Place N rooms in an organic, overlapping arrangement growing out from an
// anchor. ~45% of new rooms fuse with the anchor (close placement, no
// corridor) for the ShapeShifter wedding-cake compositions; the rest are
// connected by corridors. Rooms are picked from the preset + custom pool.
function etherGenerateLevel({ rng, presets, roomCount, enemyCount, difficulty, existing, fuseChance }) {
  const sn32 = v => Math.round(v / 32) * 32;
  const sizeOf = r => r.type === 'square' ? Math.max(r.w | 0, r.h | 0) : 2 * (r.r | 0);
  const rooms = existing && existing.rooms ? existing.rooms.map(r => ({ ...r })) : [];
  const connections = existing && existing.connections ? [...existing.connections] : [];
  // fuseChance 0 = corridor-only layout (every room separate, joined by a
  // doored corridor). Doors break sightlines between rooms, which keeps the
  // simultaneous visplane count inside vanilla's 128 limit — the arena page
  // uses this for crash-proof Chocolate Doom multiplayer maps.
  const fc = fuseChance == null ? 0.45 : fuseChance;
  let nextN = 1 + rooms.length;
  for (let i = 0; i < roomCount; i++) {
    const p = presets[Math.floor(rng() * presets.length)];
    const id = 'ew' + (nextN++);
    const room = { ...p, id, cx: 0, cy: 0 };
    if (rooms.length === 0) {
      room.cx = 0; room.cy = 0;
    } else {
      // Pick an anchor — bias toward the most-recently-placed half so the
      // level grows outward instead of clustering on the origin.
      const pool = rooms.slice(Math.max(0, rooms.length - 6));
      const fuse = rng() < fc;
      const half = r => (r.type === 'square' ? Math.max(r.w, r.h) : 2 * r.r) / 2;
      if (fuse) {
        const anchor = pool[Math.floor(rng() * pool.length)];
        const angle = rng() * Math.PI * 2;
        const span = (sizeOf(anchor) + sizeOf(room)) / 2;
        const d = sn32(span * (0.65 + rng() * 0.2));
        room.cx = sn32(anchor.cx + Math.cos(angle) * d);
        room.cy = sn32(anchor.cy + Math.sin(angle) * d);
      } else {
        // Corridor mode: place on a CARDINAL axis from the anchor (corridors
        // carve along axes, so cardinal neighbours always connect cleanly)
        // and retry until the room doesn't collide with ANY existing room —
        // separated rooms keep sightlines door-gated (visplane safety) and
        // guarantee the corridor has clear ground to carve through.
        const overlapsAny = (cx, cy) => {
          const h = half(room) + 96;   // 96 = corridor clearance margin
          return rooms.some(o => {
            const oh = half(o);
            return Math.abs(cx - o.cx) < h + oh && Math.abs(cy - o.cy) < h + oh;
          });
        };
        let anchor = pool[Math.floor(rng() * pool.length)];
        let placed = false;
        for (let attempt = 0; attempt < 48 && !placed; attempt++) {
          if (attempt % 12 === 11) anchor = rooms[Math.floor(rng() * rooms.length)];
          const dir = Math.floor(rng() * 4);   // 0 E, 1 N, 2 W, 3 S
          const span = half(anchor) + half(room);
          const d = sn32(span + 192 + rng() * 256 + Math.floor(attempt / 8) * 256);
          const cx = sn32(anchor.cx + (dir === 0 ? d : dir === 2 ? -d : 0));
          const cy = sn32(anchor.cy + (dir === 1 ? d : dir === 3 ? -d : 0));
          if (!overlapsAny(cx, cy)) { room.cx = cx; room.cy = cy; placed = true; }
        }
        if (!placed) {
          // Dense cluster — push straight out past the current extent.
          const ext = Math.max(...rooms.map(o => Math.abs(o.cx) + half(o), 0));
          room.cx = sn32(ext + half(room) + 256);
          room.cy = sn32(anchor.cy);
        }
        connections.push({ id: 'ewc' + i + '_' + nextN, fromId: anchor.id, toId: id, kind: 'corridor' });
      }
    }
    rooms.push(room);
  }
  // Smart things: P1 in the NW-most room, Exit Pillar in the SE-most room
  // (opposite extremes by anti-diagonal score). When EXTENDING an existing
  // level (ADD AREAS), keep the existing monsters and only re-stamp the
  // P1 / Exit markers — the user said they didn't want every press to keep
  // adding more enemies to the same map.
  const extending = !!(existing && existing.things);
  const things = extending
    ? existing.things.filter(t => t.type !== 1 && t.type !== 32000) : [];
  let nw = rooms[0], se = rooms[0];
  for (const r of rooms) {
    if (r.cx - r.cy < nw.cx - nw.cy) nw = r;
    if (r.cx - r.cy > se.cx - se.cy) se = r;
  }
  if (nw === se && rooms.length > 1) se = rooms[rooms.length - 1];
  things.push({ type: 1, x: nw.cx, y: nw.cy, angle: 0, flags: 7 });
  things.push({ type: 32000, x: se.cx, y: se.cy, angle: 0, flags: 7 });
  if (extending) return { rooms, connections, things };
  const mPool = ETHER_MONSTERS[difficulty] || ETHER_MONSTERS.medium;
  // Enemy spread: round-robin across ALL non-spawn rooms (each room gets a
  // flat share before any room gets seconds) instead of area-proportional
  // clumping in the biggest rooms. Within a room, placements walk a golden-
  // angle spiral out to 80% of the room span with jitter — monsters cover
  // the whole floor rather than piling at the centre.
  const hostRooms = rooms.filter(r => r !== nw);
  if (hostRooms.length && enemyCount > 0) {
    const perRoomSeq = [];
    for (let k = 0; k < enemyCount; k++) perRoomSeq.push(hostRooms[k % hostRooms.length]);
    const roomPlaced = new Map();
    for (const r of perRoomSeq) {
      const sz = sizeOf(r);
      const idx = (roomPlaced.get(r.id) || 0);
      roomPlaced.set(r.id, idx + 1);
      // Golden-angle spiral: even angular coverage, radius grows outward.
      const ang = idx * 2.399963 + rng() * 0.9;
      const rad = (0.15 + 0.65 * Math.sqrt((idx + rng()) / Math.max(3, idx + 1))) * sz * 0.5 * 0.8;
      things.push({ type: mPool[Math.floor(rng() * mPool.length)],
        x: sn32(r.cx + Math.cos(ang) * rad), y: sn32(r.cy + Math.sin(ang) * rad),
        angle: Math.floor(rng() * 8) * 45, flags: 7 });
    }
    // ~1 goodie per 6 monsters, spread over the rooms the same way.
    const goodieCount = Math.round(enemyCount / 6);
    for (let k = 0; k < goodieCount; k++) {
      const r = hostRooms[Math.floor(rng() * hostRooms.length)];
      const sz = sizeOf(r);
      const ang = rng() * Math.PI * 2;
      const rad = rng() * sz * 0.3;
      things.push({ type: ETHER_GOODIES[Math.floor(rng() * ETHER_GOODIES.length)],
        x: sn32(r.cx + Math.cos(ang) * rad), y: sn32(r.cy + Math.sin(ang) * rad),
        angle: 0, flags: 7 });
    }
  }
  return { rooms, connections, things };
}

function EtherWad({ onEditInShapeShifter, onBack, customPresets }) {
  const [roomCount, setRoomCount] = useState(6);
  const [enemyCount, setEnemyCount] = useState(40);
  const [difficulty, setDifficulty] = useState('medium');
  const [busy, setBusy] = useState(null);
  const [generated, setGenerated] = useState(null);
  const etherRef = useRef(null);
  if (!etherRef.current) etherRef.current = makeEtherSource();
  const ether = etherRef.current;
  const [, force] = useReducer(x => x + 1, 0);
  useEffect(() => {
    const unsub = ether.subscribe(force);
    ether.refill();
    return unsub;
  }, []);
  const generate = async (mode) => {
    setBusy(mode === 'add' ? 'Drawing more entropy…' : 'Drawing quantum entropy…');
    await new Promise(r => requestAnimationFrame(r));
    await new Promise(r => requestAnimationFrame(r));
    try {
      if (ether.info().remaining < 200) await ether.refill();
      const rng = ether.makeRng();
      const presets = [...SHAPESHIFTER_PRESETS, ...customPresets];
      const out = etherGenerateLevel({
        rng, presets, roomCount, enemyCount, difficulty,
        existing: mode === 'add' ? generated : null,
      });
      setGenerated(out);
    } finally { setBusy(null); }
  };
  const info = ether.info();
  const labelStyle = { fontSize: 10, color: COLORS.textDim, fontFamily: monoStack,
    textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 2, display: 'block' };
  const inputStyle = { background: COLORS.bg, color: COLORS.text, border: '1px solid ' + COLORS.border,
    borderRadius: 3, padding: '4px 6px', fontFamily: monoStack, fontSize: 12, width: '100%' };
  // Preview: render every room outline + thing dot in a centred SVG, scaled
  // to fit. Player = cyan, Exit = amber, monsters = red, goodies = green.
  const preview = (() => {
    if (!generated) return null;
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const r of generated.rooms) {
      const half = (r.type === 'square' ? Math.max(r.w, r.h) : 2 * r.r) / 2;
      minX = Math.min(minX, r.cx - half); maxX = Math.max(maxX, r.cx + half);
      minY = Math.min(minY, r.cy - half); maxY = Math.max(maxY, r.cy + half);
    }
    const w = maxX - minX, h = maxY - minY;
    const PV = 380, PAD = 12;
    const sc = (PV - PAD * 2) / Math.max(w, h);
    return { sc, minX, minY, w, h, PV, PAD };
  })();
  return (
    <div className="w-full h-screen flex flex-col overflow-hidden select-none"
      style={{ background: COLORS.bg, color: COLORS.text, fontFamily: fontStack, touchAction: 'none' }}>
      {busy ? (
        <div style={{ position: 'fixed', inset: 0, zIndex: 10000, background: 'rgba(0,0,0,0.55)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
          <div style={{ padding: '18px 28px', background: COLORS.bgPanel,
            border: '1px solid ' + COLORS.border, borderRadius: 4, textAlign: 'center', minWidth: 220 }}>
            <div style={{ fontSize: 22, marginBottom: 6 }}>{busy}</div>
            <div style={{ fontSize: 12, opacity: 0.7 }}>QRNG entropy + ShapeShifter engine.</div>
          </div>
        </div>
      ) : null}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '6px 8px', borderBottom: '1px solid ' + COLORS.border, background: COLORS.bgPanel,
        paddingTop: 'calc(env(safe-area-inset-top) + 0.375rem)' }}>
        <div style={{ color: '#9966ff', fontWeight: 700, letterSpacing: '0.18em', fontSize: 13 }}>
          ETHERWAD <span style={{ fontSize: 9, color: COLORS.textDim }}>V0.54</span>
        </div>
        <button onClick={onBack}
          style={{ padding: '6px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
            background: COLORS.bgPanel, color: COLORS.cyan, border: '1px solid ' + COLORS.cyan, borderRadius: 4 }}>
          SHAPESHIFTER
        </button>
      </div>
      <div style={{ overflowY: 'auto', padding: 16, flex: 1 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, maxWidth: 640, marginBottom: 14 }}>
          <div><label style={labelStyle}>Rooms: {roomCount}</label>
            <input type="range" min="3" max="14" step="1" value={roomCount}
              onChange={e => setRoomCount(+e.target.value)} style={{ width: '100%' }} /></div>
          <div><label style={labelStyle}>Enemies: {enemyCount}</label>
            <input type="range" min="0" max="200" step="2" value={enemyCount}
              onChange={e => setEnemyCount(+e.target.value)} style={{ width: '100%' }} /></div>
          <div><label style={labelStyle}>Difficulty</label>
            <select value={difficulty} onChange={e => setDifficulty(e.target.value)} style={inputStyle}>
              <option value="easy">Easy (zombies + imps)</option>
              <option value="medium">Medium (+ chaingunners, pinkies, cacos)</option>
              <option value="hard">Hard (+ knights, revenants, mancubi)</option>
              <option value="nightmare">Nightmare (barons, archviles, cyber)</option>
            </select></div>
          <div><label style={labelStyle}>Quantum entropy</label>
            <div style={{ ...inputStyle, color: info.status === 'ok' ? COLORS.cyan : info.status === 'error' ? COLORS.danger : COLORS.amber }}>
              {info.status === 'ok' ? '✓ ' + info.remaining + '/' + info.lastSize + ' bytes'
                : info.status === 'fetching' ? '⋯ fetching from random.org'
                : info.status === 'error' ? '⚠ ' + info.lastErr + ' (Math.random fallback)'
                : 'idle'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
          <button onClick={() => generate('fresh')}
            style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
              background: '#9966ff', color: COLORS.bg, border: '1px solid #9966ff', borderRadius: 4 }}>
            ⚛ GENERATE LEVEL
          </button>
          <button onClick={() => generate('add')} disabled={!generated}
            style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em',
              background: generated ? COLORS.bgPanel : COLORS.bgPanel,
              color: generated ? COLORS.amber : COLORS.textDim,
              border: '1px solid ' + (generated ? COLORS.amber : COLORS.border), borderRadius: 4 }}>
            + ADD AREAS
          </button>
          <button onClick={() => ether.refill()} disabled={info.status === 'fetching'}
            style={{ padding: '10px 12px', fontSize: 11, fontWeight: 700, letterSpacing: '0.1em',
              background: COLORS.bgPanel, color: COLORS.cyan, border: '1px solid ' + COLORS.cyan, borderRadius: 4 }}>
            ⤴ REFILL ENTROPY
          </button>
          <button onClick={() => generated && onEditInShapeShifter(generated)} disabled={!generated}
            style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, letterSpacing: '0.12em', marginLeft: 'auto',
              background: generated ? COLORS.amber : COLORS.bgPanel,
              color: generated ? COLORS.bg : COLORS.textDim,
              border: '1px solid ' + (generated ? COLORS.amber : COLORS.border), borderRadius: 4 }}>
            EDIT IN SHAPESHIFTER →
          </button>
        </div>
        {generated && preview ? (
          <div style={{ display: 'flex', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <svg width={preview.PV} height={preview.PV}
              viewBox={`${preview.minX - preview.PAD / preview.sc} ${-preview.minY - preview.h - preview.PAD / preview.sc} ${preview.w + 2 * preview.PAD / preview.sc} ${preview.h + 2 * preview.PAD / preview.sc}`}
              style={{ background: COLORS.bg, border: '1px solid ' + COLORS.border, borderRadius: 4 }}>
              {generated.rooms.map((r) => {
                const half = (r.type === 'square' ? Math.max(r.w, r.h) : 2 * r.r) / 2;
                if (r.type === 'square') {
                  return <rect key={r.id} x={r.cx - r.w / 2} y={-(r.cy + r.h / 2)} width={r.w} height={r.h}
                    fill="rgba(127,255,212,0.08)" stroke={COLORS.cyan} strokeWidth={32 / preview.sc} />;
                }
                const pts = [];
                const sides = r.type === 'octagon' ? 8 : 6;
                for (let i = 0; i < sides; i++) {
                  const a = (r.type === 'octagon' ? Math.PI / 8 : 0) + i * 2 * Math.PI / sides;
                  pts.push((r.cx + Math.cos(a) * r.r).toFixed(0) + ',' + (-(r.cy + Math.sin(a) * r.r)).toFixed(0));
                }
                return <polygon key={r.id} points={pts.join(' ')} fill="rgba(127,255,212,0.08)"
                  stroke={COLORS.cyan} strokeWidth={32 / preview.sc} />;
              })}
              {generated.connections.map((c, i) => {
                const a = generated.rooms.find(r => r.id === c.fromId);
                const b = generated.rooms.find(r => r.id === c.toId);
                if (!a || !b) return null;
                return <line key={'c' + i} x1={a.cx} y1={-a.cy} x2={b.cx} y2={-b.cy}
                  stroke={COLORS.amber} strokeWidth={48 / preview.sc} strokeDasharray={`${128 / preview.sc} ${64 / preview.sc}`} opacity="0.5" />;
              })}
              {generated.things.map((t, i) => {
                const isP1 = t.type === 1, isExit = t.type === 32000;
                const isGood = ETHER_GOODIES.includes(t.type);
                const r = (isP1 || isExit) ? 120 / preview.sc * 32 / 32 : 60 / preview.sc * 32 / 32;
                const fill = isP1 ? COLORS.cyan : isExit ? COLORS.amber : isGood ? '#7fff7f' : COLORS.danger;
                return <circle key={'t' + i} cx={t.x} cy={-t.y} r={r * 2} fill={fill} opacity={isP1 || isExit ? 1 : 0.7} />;
              })}
            </svg>
            <div style={{ fontFamily: monoStack, fontSize: 12, lineHeight: 1.7, minWidth: 200 }}>
              <div><span style={{ color: COLORS.textDim }}>rooms:</span> {generated.rooms.length}</div>
              <div><span style={{ color: COLORS.textDim }}>corridors:</span> {generated.connections.length}</div>
              <div><span style={{ color: COLORS.textDim }}>monsters:</span> {generated.things.filter(t => t.type !== 1 && t.type !== 32000 && !ETHER_GOODIES.includes(t.type)).length}</div>
              <div><span style={{ color: COLORS.textDim }}>goodies:</span> {generated.things.filter(t => ETHER_GOODIES.includes(t.type)).length}</div>
              <div><span style={{ color: COLORS.cyan }}>● P1</span> <span style={{ color: COLORS.textDim }}>spawn (NW)</span></div>
              <div><span style={{ color: COLORS.amber }}>● Exit</span> <span style={{ color: COLORS.textDim }}>pillar (SE)</span></div>
              <div style={{ marginTop: 8, color: COLORS.textDim, fontSize: 10 }}>
                Tap <span style={{ color: COLORS.amber }}>EDIT IN SHAPESHIFTER</span> to refine the layout and BUILD a WAD.
              </div>
            </div>
          </div>
        ) : (
          <div style={{ color: COLORS.textDim, fontSize: 13, marginTop: 24 }}>
            Adjust the dials, then tap <span style={{ color: '#9966ff' }}>GENERATE LEVEL</span> to draw fresh
            quantum entropy and build an overlapping multi-room composition. Tap <span style={{ color: COLORS.amber }}>+ ADD AREAS</span>
            to extend the current map; tap <span style={{ color: COLORS.amber }}>EDIT IN SHAPESHIFTER</span> to hand off to the editor.
          </div>
        )}
      </div>
    </div>
  );
}

function JerkwadRoot() {
  const [view, setView] = useState('shapeshifter');
  const [handoff, setHandoff] = useState(null);
  const [customPresets, setCustomPresets] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ssCustomPresets') || '[]'); }
    catch (e) { return []; }
  });
  useEffect(() => {
    const sync = () => {
      try { setCustomPresets(JSON.parse(localStorage.getItem('ssCustomPresets') || '[]')); }
      catch (e) {}
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);
  if (view === 'ether') {
    return <EtherWad customPresets={customPresets}
      onBack={() => setView('shapeshifter')}
      onEditInShapeShifter={(data) => { setHandoff(data); setView('shapeshifter'); }} />;
  }
  return <ShapeShifter handoff={handoff}
    onClearHandoff={() => setHandoff(null)}
    onOpenEther={() => { setHandoff(null); setView('ether'); }} />;
}

// ============================================================================
// APP ROOT — JerkwadRoot routes between the ShapeShifter editor and the new
// EtherWad generator. WadEditor exists for legacy compatibility — referenced
// here so the build-pipeline regex can still find an export-default.
// ============================================================================
export default function ShapeShifterApp() {
  return <JerkwadRoot/>;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================
function WadEditor() {
  const [doc, setDoc] = useState(() => {
    // ShapeShifter handed off a generated map — consume it as MAP01 instead
    // of opening the blank outdoor starter.
    if (_shapeShifterHandoff) {
      const map = _shapeShifterHandoff;
      _shapeShifterHandoff = null;
      return { maps: { 'MAP01': map }, currentMap: 'MAP01', fileName: 'shapeshifter.wad' };
    }
    return { maps: { 'MAP01': outdoorStarter() }, currentMap: 'MAP01', fileName: 'untitled.wad' };
  });
  const [mode, setMode] = useState('select');
  const [selection, setSelection] = useState(null);
  const [drawChain, setDrawChain] = useState([]);
  const [view, setView] = useState({ x: 0, y: 0, zoom: 0.18 });
  const [snap, setSnap] = useState(32);
  const [showGrid, setShowGrid] = useState(true);
  const [textureView, setTextureView] = useState('floor'); // 'floor' | 'ceil' | 'off'
  const flatCacheRef = useRef(new Map());
  const [welcomeOpen, setWelcomeOpen] = useState(true);
  const [mapMenuOpen, setMapMenuOpen] = useState(false);
  const [thingPicker, setThingPicker] = useState(null);
  const [stampSheet, setStampSheet] = useState(null);
  // Live placement ghost shown on the canvas while the user adjusts shape
  // dimensions in ShapeSheet. Tapping the canvas moves the ghost; the STAMP
  // button commits it.
  const [stampPreview, setStampPreview] = useState(null);
  const [checkIssues, setCheckIssues] = useState(null);
  const [propsOpen, setPropsOpen] = useState(false);
  const [radial, setRadial] = useState(null);
  const [hint, setHint] = useState(null);
  const [shareModal, setShareModal] = useState(null);
  const [transformMode, setTransformMode] = useState(false);

  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const fileInputRef = useRef(null);
  const pointersRef = useRef(new Map());
  const gestureRef = useRef(null);
  const longPressTimerRef = useRef(null);
  const historyRef = useRef({ past: [], future: [] });
  const lastHistoryPushRef = useRef(0);
  const HISTORY_DEBOUNCE_MS = 500;
  const HISTORY_LIMIT = 60;
  const [historyTick, setHistoryTick] = useState(0);

  const map = doc.maps[doc.currentMap];
  const sectorLoops = useMemo(() => buildSectorLoops(map), [map]);
  // Potential sectors: closed cycles in raw lines that aren't sectors yet.
  // Highlighted on the canvas; long-press inside one to promote it.
  const potentialSectors = useMemo(() => findPotentialSectors(map), [map]);

  const selectedSectorLineIds = useMemo(() => {
    if (selection?.type !== 'sector') return null;
    const ids = new Set();
    for (const ld of map.linedefs) {
      const front = ld.front && ld.front !== -1 && map.sidedefs.find(s => s.id === ld.front);
      const back = ld.back && ld.back !== -1 && map.sidedefs.find(s => s.id === ld.back);
      if (front?.sector === selection.id || back?.sector === selection.id) ids.add(ld.id);
    }
    return ids;
  }, [selection, map.linedefs, map.sidedefs]);

  const selectionBBox = useMemo(() => {
    if (selection?.type !== 'sector') return null;
    const loops = sectorLoops.get(selection.id);
    if (!loops) return null;
    const vmap = new Map(map.vertices.map(v => [v.id, v]));
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    const vertIds = new Set();
    for (const loop of loops) for (const id of loop) {
      vertIds.add(id);
      const v = vmap.get(id); if (!v) continue;
      if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
    }
    if (!isFinite(minX)) return null;
    return { minX, maxX, minY, maxY, vertIds };
  }, [selection, sectorLoops, map.vertices]);

  void historyTick;

  useEffect(() => {
    if (!hint) return;
    const t = setTimeout(() => setHint(null), 2200);
    return () => clearTimeout(t);
  }, [hint]);

  useEffect(() => {
    if (document.getElementById('wadeditor-fonts')) return;
    const link = document.createElement('link');
    link.id = 'wadeditor-fonts';
    link.rel = 'stylesheet';
    link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap';
    document.head.appendChild(link);
  }, []);

  const updateMap = useCallback((updater) => {
    setDoc(d => {
      const now = Date.now();
      if (now - lastHistoryPushRef.current > HISTORY_DEBOUNCE_MS) {
        historyRef.current.past.push(d);
        if (historyRef.current.past.length > HISTORY_LIMIT) historyRef.current.past.shift();
        historyRef.current.future = [];
      }
      lastHistoryPushRef.current = now;
      const m = d.maps[d.currentMap];
      const next = updater(m);
      return { ...d, maps: { ...d.maps, [d.currentMap]: next } };
    });
  }, []);
  const undo = useCallback(() => {
    if (historyRef.current.past.length === 0) return;
    setDoc(cur => {
      const prev = historyRef.current.past.pop();
      historyRef.current.future.push(cur);
      lastHistoryPushRef.current = 0;
      return prev;
    });
    setSelection(null); setDrawChain([]); setHistoryTick(t => t + 1);
  }, []);
  const redo = useCallback(() => {
    if (historyRef.current.future.length === 0) return;
    setDoc(cur => {
      const next = historyRef.current.future.pop();
      historyRef.current.past.push(cur);
      lastHistoryPushRef.current = 0;
      return next;
    });
    setSelection(null); setDrawChain([]); setHistoryTick(t => t + 1);
  }, []);
  const canUndo = historyRef.current.past.length > 0;
  const canRedo = historyRef.current.future.length > 0;

  const screenToWorld = useCallback((sx, sy) => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
    const cx = c.clientWidth / 2, cy = c.clientHeight / 2;
    return { x: (sx - cx) / view.zoom + view.x, y: -((sy - cy) / view.zoom) + view.y };
  }, [view]);
  const worldToScreen = useCallback((wx, wy) => {
    const c = canvasRef.current; if (!c) return { x: 0, y: 0 };
    const cx = c.clientWidth / 2, cy = c.clientHeight / 2;
    return { x: (wx - view.x) * view.zoom + cx, y: -(wy - view.y) * view.zoom + cy };
  }, [view]);
  const snapWorld = useCallback((x, y) => {
    if (snap <= 0) return { x: Math.round(x), y: Math.round(y) };
    return { x: Math.round(x / snap) * snap, y: Math.round(y / snap) * snap };
  }, [snap]);

  const HIT_RADIUS = 22;
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
  const hitSector = useCallback((sx, sy) => {
    const w = screenToWorld(sx, sy);
    return sectorAt(map, sectorLoops, w.x, w.y);
  }, [map, sectorLoops, screenToWorld]);

  const HANDLE_R = 14;
  function hitTransformHandle(sx, sy) {
    if (!selectionBBox || !transformMode) return null;
    const { minX, maxX, minY, maxY } = selectionBBox;
    const corners = [
      { id: 'nw', x: minX, y: maxY }, { id: 'n', x: (minX + maxX) / 2, y: maxY },
      { id: 'ne', x: maxX, y: maxY }, { id: 'e', x: maxX, y: (minY + maxY) / 2 },
      { id: 'se', x: maxX, y: minY }, { id: 's', x: (minX + maxX) / 2, y: minY },
      { id: 'sw', x: minX, y: minY }, { id: 'w', x: minX, y: (minY + maxY) / 2 },
      { id: 'c', x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
    ];
    let best = null, bestD = HANDLE_R * HANDLE_R;
    for (const h of corners) {
      const s = worldToScreen(h.x, h.y);
      const d = dist2(sx, sy, s.x, s.y);
      if (d < bestD) { bestD = d; best = h; }
    }
    return best;
  }

  const placeOrExtendDraw = useCallback((wx, wy) => {
    const snapped = snapWorld(wx, wy);
    const SNAP_PIX = 28;
    const screen = worldToScreen(snapped.x, snapped.y);
    let existingVid = null, bestD = SNAP_PIX * SNAP_PIX;
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
      if (!existingVid) nextV = [...nextV, { id: useVid, x: snapped.x, y: snapped.y }];
      if (drawChain.length >= 1) {
        const prev = drawChain[drawChain.length - 1];
        if (prev !== useVid) {
          const exists = nextL.some(l =>
            (l.v1 === prev && l.v2 === useVid) || (l.v1 === useVid && l.v2 === prev));
          if (!exists) {
            const ldId = newId('l', nextL);
            nextL = [...nextL, { id: ldId, v1: prev, v2: useVid, flags: 1, special: 0, tag: 0, front: -1, back: -1 }];
          }
        }
      }
      let staged = { ...m, vertices: nextV, linedefs: nextL };
      // Split any existing line that passes through useVid mid-segment, so
      // the new vertex becomes a real junction shared with that wall.
      staged = splitLinesAtVertex(staged, useVid);
      if (isClosing) {
        const result = buildSectorFromLoop(staged, newChain);
        if (result) {
          if (result.selectedExistingId) {
            // Re-traced an existing sector's boundary — select it instead of
            // building a phantom stacked on the back sidedefs.
            setSelection({ type: 'sector', id: result.selectedExistingId });
            setHint('Already a sector here — selected ' + result.selectedExistingId);
          } else {
            staged = result;
            setHint(result.parentId ? 'Sector built inside ' + result.parentId : 'Sector built');
          }
        }
      }
      return staged;
    });
    setDrawChain(isClosing ? [] : newChain);
  }, [map.vertices, map.linedefs, drawChain, snapWorld, updateMap, worldToScreen]);

  const cancelDraw = useCallback(() => setDrawChain([]), []);

  const stampRect = useCallback((cx, cy, w, h) => {
    updateMap(m => {
      const result = stampShape(m, snap, rectVertices(cx, cy, w, h));
      if (!result) return m;
      setSelection({ type: 'sector', id: result.createdSectorId });
      setHint('Rect sector stamped');
      return result;
    });
  }, [snap, updateMap]);
  const stampNgon = useCallback((cx, cy, r, n) => {
    updateMap(m => {
      const result = stampShape(m, snap, ngonVertices(cx, cy, r, n, -Math.PI / 2));
      if (!result) return m;
      setSelection({ type: 'sector', id: result.createdSectorId });
      setHint(n + '-gon stamped');
      return result;
    });
  }, [snap, updateMap]);

  // Stairs macro: stamps N rect sectors stepping in floor height inside parent.
  const stampStairs = useCallback((cx, cy, w, h, n, rise) => {
    updateMap(m => {
      let working = m;
      const stepW = w / n;
      // Determine the base floor height from the sector under the stamp
      // center. Each step's height must be set BEFORE buildSectorFromLoop
      // resolves upper/lower textures, otherwise the step risers come out
      // textureless (HOM) because textures are decided at the moment of
      // sector creation, not patched in afterwards.
      const baseLoops = buildSectorLoops(working);
      const parentId = sectorAt(working, baseLoops, cx, cy);
      const parent = parentId ? working.sectors.find(s => s.id === parentId) : null;
      const baseFloor = parent?.floorH ?? 0;
      for (let i = 0; i < n; i++) {
        const px = cx - w / 2 + (i + 0.5) * stepW;
        const result = stampShape(working, snap, rectVertices(px, cy, stepW, h), {
          floorH: baseFloor + (i + 1) * rise,
          floorTex: 'STEP1',
        });
        if (!result) continue;
        working = result;
      }
      setHint('Stairs stamped (' + n + ' steps)');
      return working;
    });
  }, [snap, updateMap]);

  const applyFurniture = useCallback((kind, opts = {}) => {
    const sel = selection;
    if (!sel) { setHint('Select a line or sector first'); return; }
    updateMap(m => {
      let result = m;
      switch (kind) {
        case 'door': case 'door-red': case 'door-blue': case 'door-yellow':
          if (sel.type !== 'linedef') { setHint('Tap a wall first'); return m; }
          { const k = kind === 'door' ? 'normal' : kind.split('-')[1];
            const r = macroDoor(m, sel.id, k);
            if (r?.error) { setHint(r.error); return m; }
            result = r || m; } break;
        case 'window':
          if (sel.type !== 'linedef') { setHint('Tap a wall first'); return m; }
          { const r = macroWindow(m, sel.id); if (r?.error) { setHint(r.error); return m; } result = r || m; } break;
        case 'secret':
          if (sel.type !== 'sector') { setHint('Tap a sector first'); return m; }
          result = macroSecret(m, sel.id); break;
        case 'damage-slime':
          if (sel.type !== 'sector') { setHint('Tap a sector first'); return m; }
          result = macroDamage(m, sel.id, 'slime'); break;
        case 'damage-lava':
          if (sel.type !== 'sector') { setHint('Tap a sector first'); return m; }
          result = macroDamage(m, sel.id, 'lava'); break;
        case 'exit':
          if (sel.type !== 'linedef') { setHint('Tap a wall first'); return m; }
          result = macroExit(m, sel.id); break;
        case 'switch':
          if (sel.type !== 'linedef') { setHint('Tap a wall first'); return m; }
          result = macroSwitch(m, sel.id, 1, 'door'); break;
        case 'lift':
          if (sel.type !== 'sector') { setHint('Tap a sector first'); return m; }
          result = macroLift(m, sel.id, 1); break;
        case 'teleporter':
          if (sel.type !== 'linedef') { setHint('Tap a wall first'); return m; }
          result = macroTeleporter(m, sel.id, 1); break;
        default: return m;
      }
      setHint('Applied ' + kind);
      return result;
    });
  }, [selection, updateMap]);

  const cancelLongPress = () => {
    if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
  };
  function navHaptic() { if (navigator.vibrate) try { navigator.vibrate(8); } catch (e) {} }
  const scheduleLongPress = (sx, sy) => {
    cancelLongPress();
    longPressTimerRef.current = setTimeout(() => {
      const t = hitThing(sx, sy);
      if (t) { setRadial({ sx, sy, kind: 'thing', id: t.id }); navHaptic(); return; }
      const v = hitVertex(sx, sy);
      if (v) { setRadial({ sx, sy, kind: 'vertex', id: v.id }); navHaptic(); return; }
      const ld = hitLinedef(sx, sy);
      if (ld) { setRadial({ sx, sy, kind: 'linedef', id: ld.id }); navHaptic(); return; }
      const secId = hitSector(sx, sy);
      if (secId) { setRadial({ sx, sy, kind: 'sector', id: secId }); navHaptic(); return; }
      // Long-press inside a potential sector's polygon → offer Make Sector.
      const w = screenToWorld(sx, sy);
      const ps = potentialSectors.find(p => pointInPolygon(w.x, w.y, p.vertices));
      if (ps) {
        setRadial({ sx, sy, kind: 'potential', potential: ps });
        navHaptic(); return;
      }
      setRadial({ sx, sy, kind: 'empty' });
      navHaptic();
    }, 480);
  };

  const onPointerDown = (e) => {
    canvasRef.current?.setPointerCapture(e.pointerId);
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    pointersRef.current.set(e.pointerId, { sx, sy, startX: sx, startY: sy, t: Date.now() });

    if (pointersRef.current.size === 2) {
      cancelLongPress();
      const [a, b] = [...pointersRef.current.values()];
      gestureRef.current = {
        kind: 'pinch',
        startDist: Math.hypot(a.sx - b.sx, a.sy - b.sy),
        startZoom: view.zoom,
        startView: { x: view.x, y: view.y },
        startCenter: { x: (a.sx + b.sx) / 2, y: (a.sy + b.sy) / 2 },
        twoFingerStartTime: Date.now(),
        wasTrueTwoFingerTap: true,
      };
    } else if (pointersRef.current.size === 1) {
      const handle = hitTransformHandle(sx, sy);
      if (handle) {
        gestureRef.current = {
          kind: 'transform',
          handle: handle.id,
          startBBox: { ...selectionBBox },
          startVertices: new Map(map.vertices.map(v => [v.id, { ...v }])),
        };
        return;
      }
      // In Draw mode, no vertex/thing drag — the finger is for placing
      // lines. Tap still snap-merges with existing vertices, but the user
      // can't accidentally move a vertex while drawing.
      if (mode === 'draw') {
        gestureRef.current = { kind: 'tap-or-pan', startView: { x: view.x, y: view.y } };
        scheduleLongPress(sx, sy);
        return;
      }
      const t = hitThing(sx, sy);
      if (t) { gestureRef.current = { kind: 'drag-thing', thingId: t.id }; scheduleLongPress(sx, sy); return; }
      const v = hitVertex(sx, sy);
      if (v) { gestureRef.current = { kind: 'drag-vertex', vertexId: v.id }; scheduleLongPress(sx, sy); return; }
      gestureRef.current = { kind: 'tap-or-pan', startView: { x: view.x, y: view.y } };
      scheduleLongPress(sx, sy);
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
    if (longPressTimerRef.current) {
      const moved = Math.hypot(ptr.sx - ptr.startX, ptr.sy - ptr.startY);
      if (moved > 8) cancelLongPress();
    }
    if (g.kind === 'pinch' && pointersRef.current.size === 2) {
      const [a, b] = [...pointersRef.current.values()];
      const dNow = Math.hypot(a.sx - b.sx, a.sy - b.sy);
      const ratio = dNow / g.startDist;
      // If pinch distance changes more than a hair, mark not a tap
      if (Math.abs(ratio - 1) > 0.05) g.wasTrueTwoFingerTap = false;
      const newZoom = Math.max(0.005, Math.min(8, g.startZoom * ratio));
      const centerNow = { x: (a.sx + b.sx) / 2, y: (a.sy + b.sy) / 2 };
      const c = canvasRef.current;
      const cx = c.clientWidth / 2, cy = c.clientHeight / 2;
      const wx = (g.startCenter.x - cx) / g.startZoom + g.startView.x;
      const wy = -((g.startCenter.y - cy) / g.startZoom) + g.startView.y;
      setView({ x: wx - (centerNow.x - cx) / newZoom, y: wy + (centerNow.y - cy) / newZoom, zoom: newZoom });
    } else if (g.kind === 'transform' && pointersRef.current.size === 1) {
      const w = screenToWorld(ptr.sx, ptr.sy);
      const sn = snapWorld(w.x, w.y);
      applyTransform(g, sn);
    } else if ((g.kind === 'drag-vertex' || g.kind === 'drag-thing') && pointersRef.current.size === 1) {
      const dx = ptr.sx - ptr.startX, dy = ptr.sy - ptr.startY;
      if (Math.hypot(dx, dy) > 4) {
        cancelLongPress();
        const w = screenToWorld(ptr.sx, ptr.sy);
        const sn = snapWorld(w.x, w.y);
        if (g.kind === 'drag-vertex') {
          updateMap(m => ({ ...m, vertices: m.vertices.map(v => v.id === g.vertexId ? { ...v, x: sn.x, y: sn.y } : v) }));
        } else {
          updateMap(m => ({ ...m, things: m.things.map(t => t.id === g.thingId ? { ...t, x: sn.x, y: sn.y } : t) }));
        }
      }
    } else if (g.kind === 'tap-or-pan' && pointersRef.current.size === 1) {
      const dx = ptr.sx - ptr.startX, dy = ptr.sy - ptr.startY;
      if (Math.hypot(dx, dy) > 6) { cancelLongPress(); gestureRef.current = { ...g, kind: 'pan' }; }
    }
    if (gestureRef.current?.kind === 'pan' && pointersRef.current.size === 1) {
      const dx = ptr.sx - ptr.startX, dy = ptr.sy - ptr.startY;
      const sv = gestureRef.current.startView;
      setView(v => ({ ...v, x: sv.x - dx / v.zoom, y: sv.y + dy / v.zoom }));
    }
  };

  function applyTransform(g, snPoint) {
    if (!selectionBBox) return;
    const { minX, maxX, minY, maxY, vertIds } = g.startBBox;
    const w0 = maxX - minX, h0 = maxY - minY;
    let nMinX = minX, nMaxX = maxX, nMinY = minY, nMaxY = maxY;
    switch (g.handle) {
      case 'nw': nMinX = Math.min(snPoint.x, maxX - 8); nMaxY = Math.max(snPoint.y, minY + 8); break;
      case 'ne': nMaxX = Math.max(snPoint.x, minX + 8); nMaxY = Math.max(snPoint.y, minY + 8); break;
      case 'sw': nMinX = Math.min(snPoint.x, maxX - 8); nMinY = Math.min(snPoint.y, maxY - 8); break;
      case 'se': nMaxX = Math.max(snPoint.x, minX + 8); nMinY = Math.min(snPoint.y, maxY - 8); break;
      case 'n':  nMaxY = Math.max(snPoint.y, minY + 8); break;
      case 's':  nMinY = Math.min(snPoint.y, maxY - 8); break;
      case 'e':  nMaxX = Math.max(snPoint.x, minX + 8); break;
      case 'w':  nMinX = Math.min(snPoint.x, maxX - 8); break;
      case 'c': {
        const cx = (minX + maxX) / 2, cy = (minY + maxY) / 2;
        const dx = snPoint.x - cx, dy = snPoint.y - cy;
        updateMap(m => ({
          ...m,
          vertices: m.vertices.map(v => g.startVertices.has(v.id) && vertIds.has(v.id)
            ? { ...v, x: g.startVertices.get(v.id).x + dx, y: g.startVertices.get(v.id).y + dy }
            : v)
        }));
        return;
      }
    }
    if (w0 === 0 || h0 === 0) return;
    const nW = nMaxX - nMinX, nH = nMaxY - nMinY;
    const sx = nW / w0, sy = nH / h0;
    updateMap(m => ({
      ...m,
      vertices: m.vertices.map(v => {
        if (!vertIds.has(v.id)) return v;
        const orig = g.startVertices.get(v.id) || v;
        const nx = nMinX + (orig.x - minX) * sx;
        const ny = nMinY + (orig.y - minY) * sy;
        return { ...v, x: Math.round(nx), y: Math.round(ny) };
      })
    }));
  }

  const onPointerUp = (e) => {
    const ptr = pointersRef.current.get(e.pointerId);
    pointersRef.current.delete(e.pointerId);
    cancelLongPress();
    if (!ptr) return;

    const dt = Date.now() - ptr.t;
    const dx = ptr.sx - ptr.startX, dy = ptr.sy - ptr.startY;
    const wasTap = Math.hypot(dx, dy) < 6 && dt < 350;
    const g = gestureRef.current;

    // Two-finger tap = undo (when pinch lifted with no zoom change)
    if (g?.kind === 'pinch' && g.wasTrueTwoFingerTap && pointersRef.current.size <= 1 &&
        Date.now() - g.twoFingerStartTime < 300) {
      undo();
      gestureRef.current = null;
      // Drain remaining pointers' state
      pointersRef.current.clear();
      return;
    }

    if (wasTap) {
      if (g?.kind === 'drag-vertex') setSelection({ type: 'vertex', id: g.vertexId });
      else if (g?.kind === 'drag-thing') setSelection({ type: 'thing', id: g.thingId });
      else if (g?.kind === 'tap-or-pan') handleTap(ptr.sx, ptr.sy);
    } else if (g?.kind === 'drag-vertex') {
      // Real drag of a vertex: WADED-style merge if dropped onto another.
      updateMap(m => {
        const merged = mergeCoincidentVertices(m, g.vertexId);
        if (merged !== m) setHint('Vertices merged');
        return merged;
      });
      // The merged-into vertex inherits selection.
      const cur = doc.maps[doc.currentMap].vertices.find(v => v.id === g.vertexId);
      if (cur) {
        const other = doc.maps[doc.currentMap].vertices.find(v => v.id !== g.vertexId && v.x === cur.x && v.y === cur.y);
        if (other) setSelection({ type: 'vertex', id: other.id });
      }
    }
    if (pointersRef.current.size === 0) gestureRef.current = null;
    else if (pointersRef.current.size === 1) {
      const [only] = [...pointersRef.current.values()];
      gestureRef.current = { kind: 'tap-or-pan', startView: { x: view.x, y: view.y } };
      only.startX = only.sx; only.startY = only.sy; only.t = Date.now();
    }
  };

  const handleTap = (sx, sy) => {
    const w = screenToWorld(sx, sy);
    // Stamp preview reposition: in any mode, if a shape ghost is on screen,
    // taps move it before the user commits via STAMP. This is the "see
    // before commit" affordance for shape stamps.
    if (stampPreview) {
      const sn = snapWorld(w.x, w.y);
      setStampPreview(p => ({ ...p, cx: sn.x, cy: sn.y }));
      return;
    }
    if (mode === 'thing') {
      const t = hitThing(sx, sy);
      if (t) { setSelection({ type: 'thing', id: t.id }); return; }
      const sn = snapWorld(w.x, w.y);
      setThingPicker({ x: sn.x, y: sn.y });
      return;
    }
    if (mode === 'draw') {
      // Draw mode: every tap places a vertex or extends the active chain.
      // Existing-vertex snap inside placeOrExtendDraw handles WADED-style
      // vertex merging automatically.
      placeOrExtendDraw(w.x, w.y);
      return;
    }
    // Select mode (default): if a chain happens to be active, continue
    // extending it; otherwise tap-to-select with the usual priority.
    if (drawChain.length > 0) { placeOrExtendDraw(w.x, w.y); return; }
    const t = hitThing(sx, sy);
    if (t) { setSelection({ type: 'thing', id: t.id }); return; }
    const v = hitVertex(sx, sy);
    if (v) { setSelection({ type: 'vertex', id: v.id }); return; }
    const ld = hitLinedef(sx, sy);
    if (ld) { setSelection({ type: 'linedef', id: ld.id }); return; }
    const secId = hitSector(sx, sy);
    if (secId) { setSelection({ type: 'sector', id: secId }); return; }
    setSelection(null);
  };

  const placeThing = (typeId) => {
    if (!thingPicker) return;
    updateMap(m => {
      const id = newId('t', m.things);
      return { ...m, things: [...m.things, { id, x: thingPicker.x, y: thingPicker.y, angle: 0, type: typeId, flags: 7 }] };
    });
    setThingPicker(null);
  };

  const onWheel = (e) => {
    e.preventDefault();
    const rect = canvasRef.current.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const w = screenToWorld(sx, sy);
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setView(v => {
      const newZoom = Math.max(0.005, Math.min(8, v.zoom * factor));
      const c = canvasRef.current;
      const cx = c.clientWidth / 2, cy = c.clientHeight / 2;
      return { x: w.x - (sx - cx) / newZoom, y: w.y + (sy - cy) / newZoom, zoom: newZoom };
    });
  };

  // ---- Rendering ----
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr; canvas.height = rect.height * dpr;
    const ctx = canvas.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (showGrid && view.zoom > 0.025) {
      const gridSize = snap > 0 ? snap : 8;
      const major = gridSize * 8;
      const tlw = screenToWorld(0, 0);
      const brw = screenToWorld(rect.width, rect.height);
      const minX = Math.floor(tlw.x / gridSize) * gridSize;
      const maxX = Math.ceil(brw.x / gridSize) * gridSize;
      const minY = Math.floor(brw.y / gridSize) * gridSize;
      const maxY = Math.ceil(tlw.y / gridSize) * gridSize;

      if (view.zoom > 0.08) {
        ctx.strokeStyle = COLORS.grid; ctx.lineWidth = 1;
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
      ctx.strokeStyle = COLORS.gridMajor; ctx.beginPath();
      for (let x = Math.floor(minX / major) * major; x <= maxX; x += major) {
        const s = worldToScreen(x, 0);
        ctx.moveTo(s.x + 0.5, 0); ctx.lineTo(s.x + 0.5, rect.height);
      }
      for (let y = Math.floor(minY / major) * major; y <= maxY; y += major) {
        const s = worldToScreen(0, y);
        ctx.moveTo(0, s.y + 0.5); ctx.lineTo(rect.width, s.y + 0.5);
      }
      ctx.stroke();
      ctx.strokeStyle = '#3a557a'; ctx.beginPath();
      const o = worldToScreen(0, 0);
      ctx.moveTo(o.x + 0.5, 0); ctx.lineTo(o.x + 0.5, rect.height);
      ctx.moveTo(0, o.y + 0.5); ctx.lineTo(rect.width, o.y + 0.5);
      ctx.stroke();
    }

    const vmap = new Map(map.vertices.map(v => [v.id, v]));

    if (sectorLoops.size) {
      const cache = flatCacheRef.current;
      const origin = worldToScreen(0, 0);
      const usePattern = textureView !== 'off' && view.zoom > 0.05;
      for (const [sectorId, loops] of sectorLoops) {
        const sector = map.sectors.find(s => s.id === sectorId);
        if (!sector) continue;
        const isSel = selection?.type === 'sector' && selection.id === sectorId;
        const flatName = textureView === 'ceil' ? sector.ceilTex : sector.floorTex;

        // Build the sector polygon path once; reuse for pattern fill,
        // light dim overlay, sky tint, and selection highlight.
        ctx.beginPath();
        for (const loop of loops) {
          for (let i = 0; i < loop.length; i++) {
            const v = vmap.get(loop[i]); if (!v) continue;
            const s = worldToScreen(v.x, v.y);
            if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
          }
          ctx.closePath();
        }

        if (usePattern) {
          let canvas = cache.get(flatName);
          if (!canvas) {
            canvas = buildFlatCanvas(flatName);
            cache.set(flatName, canvas);
          }
          if (canvas) {
            const pattern = ctx.createPattern(canvas, 'repeat');
            // Align pattern to world origin: translate to where world (0,0)
            // sits on screen, then scale by zoom. Y is negated because world Y
            // is up but screen Y is down. Pattern tile = 64 world units.
            const matrix = new DOMMatrix();
            matrix.translateSelf(origin.x, origin.y);
            matrix.scaleSelf(view.zoom, -view.zoom);
            pattern.setTransform(matrix);
            ctx.fillStyle = pattern;
            ctx.fill('evenodd');
            // Light-level dim overlay (skip for sky which is its own thing).
            if (!/^F_SKY/.test(flatName || '')) {
              const lt = Math.max(0.15, (sector.light ?? 160) / 255);
              if (lt < 0.99) {
                ctx.fillStyle = `rgba(0,0,0,${(1 - lt) * 0.7})`;
                ctx.fill('evenodd');
              }
            }
          } else {
            const [r, g, b] = flatColor(flatName, sector.light);
            ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
            ctx.fill('evenodd');
          }
        } else {
          const [r, g, b] = flatColor(flatName, sector.light);
          ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 0.85)`;
          ctx.fill('evenodd');
        }

        // Sky tint when looking at floor view but ceiling is sky (the player
        // would see sky overhead — a subtle hint without obscuring the floor).
        if (textureView === 'floor' && sector.ceilTex === 'F_SKY1') {
          ctx.fillStyle = 'rgba(40, 56, 92, 0.12)';
          ctx.fill('evenodd');
        }

        if (isSel) {
          ctx.fillStyle = 'rgba(127, 255, 212, 0.18)';
          ctx.fill('evenodd');
        }
      }
    }

    // Potential sectors: cyan dashed-fill overlay marks any closed loop in
    // the raw linedef graph that isn't yet a sector. Long-press inside one
    // to promote it via the radial menu.
    if (potentialSectors.length) {
      for (const ps of potentialSectors) {
        ctx.beginPath();
        for (let i = 0; i < ps.vertices.length; i++) {
          const s = worldToScreen(ps.vertices[i].x, ps.vertices[i].y);
          if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
        }
        ctx.closePath();
        ctx.fillStyle = 'rgba(127, 255, 212, 0.16)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(127, 255, 212, 0.75)';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([5, 5]);
        ctx.stroke();
        ctx.setLineDash([]);
        // Label
        if (view.zoom > 0.12) {
          const cs = worldToScreen(ps.centroid.x, ps.centroid.y);
          ctx.font = "10px 'JetBrains Mono', monospace";
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillStyle = 'rgba(127, 255, 212, 0.95)';
          ctx.fillText('make sector', cs.x, cs.y);
        }
      }
    }

    if (view.zoom > 0.12 && sectorLoops.size) {
      ctx.font = "10px 'JetBrains Mono', monospace";
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const [sectorId, loops] of sectorLoops) {
        const sector = map.sectors.find(s => s.id === sectorId);
        if (!sector || !loops.length) continue;
        const pts = loops[0].map(id => vmap.get(id)).filter(Boolean);
        if (pts.length < 3) continue;
        const cent = polygonCentroid(pts);
        const s = worldToScreen(cent.x, cent.y);
        const w = 86;
        ctx.fillStyle = 'rgba(15, 22, 38, 0.78)';
        ctx.fillRect(s.x - w / 2, s.y - 22, w, 44);
        ctx.strokeStyle = 'rgba(36, 55, 89, 0.8)';
        ctx.strokeRect(s.x - w / 2 + 0.5, s.y - 22 + 0.5, w - 1, 43);
        ctx.fillStyle = COLORS.text;
        ctx.fillText('F ' + sector.floorH + '  C ' + sector.ceilH, s.x, s.y - 12);
        ctx.fillStyle = COLORS.textDim;
        ctx.fillText('L ' + sector.light + (sector.tag ? '  T ' + sector.tag : ''), s.x, s.y);
        ctx.fillStyle = COLORS.amber;
        ctx.fillText((sector.floorTex || '').slice(0, 10), s.x, s.y + 12);
      }
    }

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
      const boundsSel = selectedSectorLineIds?.has(ld.id);
      let color, width;
      if (isSel) { color = COLORS.vertexSelected; width = 2.8; }
      else if (boundsSel) { color = '#ffd84a'; width = 2.2; }
      else if (hasSpecial && isWall) { color = '#ff8c5c'; width = 1.8; }
      else if (isWall && !isTwoSided) { color = '#ffb84a'; width = 1.6; }
      else if (isTwoSided) { color = '#7fc4d8'; width = 1.2; }
      else { color = '#5a6c87'; width = 1.1; }
      ctx.strokeStyle = color; ctx.lineWidth = width;
      ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
      if (view.zoom > 0.1 && isWall) {
        const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
        const dx = b.x - a.x, dy = b.y - a.y;
        const len = Math.hypot(dx, dy) || 1;
        const nx = -dy / len, ny = dx / len;
        ctx.beginPath(); ctx.moveTo(mx, my); ctx.lineTo(mx + nx * 4, my + ny * 4); ctx.stroke();
      }
    }

    if (selection?.type === 'sector' && selectionBBox) {
      const { minX, maxX, minY, maxY } = selectionBBox;
      const PAD = 10 / view.zoom;
      const tl = worldToScreen(minX - PAD, maxY + PAD);
      const br = worldToScreen(maxX + PAD, minY - PAD);
      ctx.strokeStyle = 'rgba(127, 255, 212, 0.5)';
      ctx.setLineDash([6, 4]); ctx.lineWidth = 1.5;
      ctx.strokeRect(tl.x, tl.y, br.x - tl.x, br.y - tl.y);
      ctx.setLineDash([]);
      if (transformMode) {
        const handles = [
          { id: 'nw', x: minX, y: maxY }, { id: 'n', x: (minX + maxX) / 2, y: maxY },
          { id: 'ne', x: maxX, y: maxY }, { id: 'e', x: maxX, y: (minY + maxY) / 2 },
          { id: 'se', x: maxX, y: minY }, { id: 's', x: (minX + maxX) / 2, y: minY },
          { id: 'sw', x: minX, y: minY }, { id: 'w', x: minX, y: (minY + maxY) / 2 },
          { id: 'c', x: (minX + maxX) / 2, y: (minY + maxY) / 2 },
        ];
        for (const h of handles) {
          const s = worldToScreen(h.x, h.y);
          ctx.fillStyle = h.id === 'c' ? COLORS.accent : COLORS.amber;
          ctx.strokeStyle = COLORS.bg; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(s.x, s.y, h.id === 'c' ? 9 : 7, 0, Math.PI * 2);
          ctx.fill(); ctx.stroke();
        }
      }
    }

    // Ghost preview for shape stamp. Dashed amber outline at the current
    // preview position so the user can see exactly where the shape will land
    // before committing — prevents accidental vertex merges.
    if (stampPreview) {
      let ghostPts = null;
      if (stampPreview.kind === 'rect') ghostPts = rectVertices(stampPreview.cx, stampPreview.cy, stampPreview.w, stampPreview.h);
      else if (stampPreview.kind === 'ngon') ghostPts = ngonVertices(stampPreview.cx, stampPreview.cy, stampPreview.r, stampPreview.n, -Math.PI / 2);
      else if (stampPreview.kind === 'stairs') {
        // Show outer bbox + step divisions
        ghostPts = rectVertices(stampPreview.cx, stampPreview.cy, stampPreview.w, stampPreview.h);
      }
      if (ghostPts) {
        ctx.fillStyle = 'rgba(255, 157, 61, 0.18)';
        ctx.beginPath();
        for (let i = 0; i < ghostPts.length; i++) {
          const s = worldToScreen(ghostPts[i].x, ghostPts[i].y);
          if (i === 0) ctx.moveTo(s.x, s.y); else ctx.lineTo(s.x, s.y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.strokeStyle = COLORS.amber; ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        ctx.stroke();
        ctx.setLineDash([]);
        // For stairs, draw the divisions inside.
        if (stampPreview.kind === 'stairs') {
          const stepW = stampPreview.w / stampPreview.n;
          ctx.strokeStyle = 'rgba(255, 157, 61, 0.6)';
          ctx.lineWidth = 1;
          ctx.setLineDash([3, 3]);
          for (let i = 1; i < stampPreview.n; i++) {
            const x = stampPreview.cx - stampPreview.w / 2 + i * stepW;
            const t = worldToScreen(x, stampPreview.cy + stampPreview.h / 2);
            const b = worldToScreen(x, stampPreview.cy - stampPreview.h / 2);
            ctx.beginPath(); ctx.moveTo(t.x, t.y); ctx.lineTo(b.x, b.y); ctx.stroke();
          }
          ctx.setLineDash([]);
        }
        // Centre marker
        const c = worldToScreen(stampPreview.cx, stampPreview.cy);
        ctx.fillStyle = COLORS.amber;
        ctx.beginPath(); ctx.arc(c.x, c.y, 4, 0, Math.PI * 2); ctx.fill();
      }
    }

    if (drawChain.length > 0) {
      ctx.strokeStyle = COLORS.vertexDraw; ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]); ctx.beginPath();
      for (let i = 0; i < drawChain.length - 1; i++) {
        const a = vmap.get(drawChain[i]); const b = vmap.get(drawChain[i + 1]);
        if (!a || !b) continue;
        const sa = worldToScreen(a.x, a.y), sb = worldToScreen(b.x, b.y);
        if (i === 0) ctx.moveTo(sa.x, sa.y);
        ctx.lineTo(sb.x, sb.y);
      }
      ctx.stroke(); ctx.setLineDash([]);
      if (drawChain.length >= 3) {
        const s0 = vmap.get(drawChain[0]);
        if (s0) {
          const sp = worldToScreen(s0.x, s0.y);
          ctx.strokeStyle = COLORS.amber; ctx.lineWidth = 2;
          ctx.beginPath(); ctx.arc(sp.x, sp.y, 12, 0, Math.PI * 2); ctx.stroke();
        }
      }
    }

    for (const v of map.vertices) {
      const s = worldToScreen(v.x, v.y);
      const isSel = selection?.type === 'vertex' && selection.id === v.id;
      const inDraw = drawChain.includes(v.id);
      const r = isSel ? 5 : inDraw ? 4 : 3;
      ctx.fillStyle = isSel ? COLORS.vertexSelected : inDraw ? COLORS.vertexDraw : COLORS.vertex;
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
      if (isSel) {
        ctx.strokeStyle = COLORS.vertexSelected; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(s.x, s.y, 9, 0, Math.PI * 2); ctx.stroke();
      }
    }

    for (const t of map.things) {
      const s = worldToScreen(t.x, t.y);
      const meta = DOOM_THING_TYPES.find(x => x.id === t.type);
      const color = meta ? THING_COLORS[meta.cat] : '#888';
      const isSel = selection?.type === 'thing' && selection.id === t.id;
      const r = isSel ? 8 : 6;
      ctx.fillStyle = color;
      ctx.beginPath(); ctx.arc(s.x, s.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#000'; ctx.lineWidth = 1.5;
      const rad = -t.angle * Math.PI / 180;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y);
      ctx.lineTo(s.x + Math.cos(rad) * (r + 4), s.y + Math.sin(rad) * (r + 4));
      ctx.stroke();
      if (isSel) {
        ctx.strokeStyle = COLORS.vertexSelected; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(s.x, s.y, r + 4, 0, Math.PI * 2); ctx.stroke();
      }
    }
  });

  useEffect(() => {
    const handler = () => {
      const c = canvasRef.current;
      if (c) {
        const rect = c.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        c.width = rect.width * dpr; c.height = rect.height * dpr;
      }
      setView(v => ({ ...v }));
    };
    window.addEventListener('resize', handler); handler();
    return () => window.removeEventListener('resize', handler);
  }, []);

  const onLoadFile = async (e) => {
    const file = e.target.files?.[0]; if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wad = parseWad(buf);
      const mapNames = Object.keys(wad.maps);
      if (mapNames.length === 0) { alert('No maps found.'); return; }
      const normalized = {};
      for (const [k, v] of Object.entries(wad.maps)) normalized[k] = normalizeMap(v);
      setDoc({ maps: normalized, currentMap: mapNames[0], fileName: file.name });
      setSelection(null); setDrawChain([]); setWelcomeOpen(false);
      autoFitView(normalized[mapNames[0]]);
    } catch (err) { alert('Failed to load WAD: ' + err.message); }
    e.target.value = '';
  };
  const autoFitView = (m) => {
    if (!m || m.vertices.length === 0) { setView({ x: 0, y: 0, zoom: 0.18 }); return; }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    for (const v of m.vertices) {
      if (v.x < minX) minX = v.x; if (v.x > maxX) maxX = v.x;
      if (v.y < minY) minY = v.y; if (v.y > maxY) maxY = v.y;
    }
    const c = canvasRef.current; if (!c) return;
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
      a.href = url; a.download = doc.fileName.toLowerCase().endsWith('.wad') ? doc.fileName : (doc.fileName + '.wad');
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { alert('Save failed: ' + e.message); }
  };
  const onPlayInGzdoom = async () => {
    let fileName = doc.fileName;
    if (!fileName.toLowerCase().endsWith('.wad')) fileName += '.wad';
    let buf;
    try { buf = buildWad(doc.maps); } catch (e) { alert('Build failed: ' + e.message); return; }
    const file = new File([buf], fileName, { type: 'application/octet-stream' });
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: fileName, text: 'Save to Files → On My iPhone → GenZD' });
        return;
      } catch (e) { if (e?.name === 'AbortError') return; }
    }
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = fileName;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setShareModal({ kind: 'manual', fileName });
  };
  const onNewMap = (kind = 'outdoor') => {
    const fresh = kind === 'dungeon' ? generateDungeon()
      : kind === 'random' ? generateRandomWorld()
      : kind === 'interior' ? interiorStarter()
      : outdoorStarter();
    setDoc({ maps: { 'MAP01': fresh }, currentMap: 'MAP01', fileName: 'untitled.wad' });
    setSelection(null); setDrawChain([]);
    setView({ x: 0, y: 0, zoom: kind === 'interior' ? 0.6 : kind === 'dungeon' ? 0.18 : 0.2 });
    setWelcomeOpen(false);
    if (kind === 'random') setHint('Random world generated');
    if (kind === 'dungeon') setHint('Dungeon generated');
  };
  const addNewMapSlot = (kind = 'outdoor') => {
    setDoc(d => {
      let n = 1; while (d.maps['MAP' + String(n).padStart(2, '0')]) n++;
      const name = 'MAP' + String(n).padStart(2, '0');
      const fresh = kind === 'dungeon' ? generateDungeon()
        : kind === 'random' ? generateRandomWorld()
        : kind === 'interior' ? interiorStarter() : outdoorStarter();
      return { ...d, maps: { ...d.maps, [name]: fresh }, currentMap: name };
    });
    setMapMenuOpen(false);
    if (kind === 'random') setHint('Random world generated');
    if (kind === 'dungeon') setHint('Dungeon generated');
  };
  const switchMap = (name) => {
    setDoc(d => ({ ...d, currentMap: name }));
    setSelection(null); setDrawChain([]); setMapMenuOpen(false);
    setTimeout(() => autoFitView(doc.maps[name]), 0);
  };
  const deleteSelection = () => {
    if (!selection) return;
    updateMap(m => {
      const n = { ...m, vertices: [...m.vertices], linedefs: [...m.linedefs],
        sidedefs: [...m.sidedefs], sectors: [...m.sectors], things: [...m.things] };
      if (selection.type === 'vertex') {
        n.linedefs = n.linedefs.filter(l => l.v1 !== selection.id && l.v2 !== selection.id);
        n.vertices = n.vertices.filter(v => v.id !== selection.id);
      } else if (selection.type === 'linedef') {
        n.linedefs = n.linedefs.filter(l => l.id !== selection.id);
      } else if (selection.type === 'thing') {
        n.things = n.things.filter(t => t.id !== selection.id);
      } else if (selection.type === 'sector') {
        const sdToDelete = new Set(n.sidedefs.filter(sd => sd.sector === selection.id).map(sd => sd.id));
        n.sectors = n.sectors.filter(s => s.id !== selection.id);
        n.sidedefs = n.sidedefs.filter(sd => sd.sector !== selection.id);
        n.linedefs = n.linedefs.map(l => ({
          ...l, front: sdToDelete.has(l.front) ? -1 : l.front, back: sdToDelete.has(l.back) ? -1 : l.back,
        }));
      }
      return n;
    });
    setSelection(null);
  };

  const splitLineAt = useCallback((lineId, wx, wy) => {
    updateMap(m => {
      const ld = m.linedefs.find(l => l.id === lineId);
      if (!ld) return m;
      const sn = snapWorld(wx, wy);
      const newVid = newId('v', m.vertices);
      const newLid = newId('l', m.linedefs);
      const newLineEntry = {
        id: newLid, v1: newVid, v2: ld.v2,
        flags: ld.flags, special: ld.special, tag: ld.tag,
        front: ld.front, back: ld.back,
      };
      const modifiedLd = { ...ld, v2: newVid };
      return {
        ...m,
        vertices: [...m.vertices, { id: newVid, x: sn.x, y: sn.y }],
        linedefs: m.linedefs.map(l => l.id === lineId ? modifiedLd : l).concat([newLineEntry]),
      };
    });
    setHint('Vertex inserted on line');
  }, [snapWorld, updateMap]);

  useEffect(() => {
    const onKey = (e) => {
      const tgt = document.activeElement;
      const inField = tgt && (tgt.tagName === 'INPUT' || tgt.tagName === 'TEXTAREA');
      const meta = e.metaKey || e.ctrlKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault(); if (e.shiftKey) redo(); else undo(); return;
      }
      if (meta && e.key.toLowerCase() === 'y') { e.preventDefault(); redo(); return; }
      if (inField) return;
      if (e.key === 'Escape') {
        cancelDraw(); setThingPicker(null); setRadial(null);
        setStampSheet(null); setPropsOpen(false); setTransformMode(false);
      }
      if (e.key === 'Delete' || e.key === 'Backspace') { if (selection) deleteSelection(); }
      if (e.key === '1') setMode('select');
      if (e.key === '2') setMode('draw');
      if (e.key === '3') setMode('thing');
      if (e.key === 't') setTransformMode(t => !t);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selection, undo, redo, cancelDraw]);

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

  function handleRadial(action, r) {
    if (!r) return;
    switch (action) {
      case 'select': setSelection({ type: r.kind, id: r.id }); break;
      case 'delete':
        setSelection({ type: r.kind, id: r.id });
        setTimeout(() => deleteSelection(), 0); break;
      case 'props':
        setSelection({ type: r.kind, id: r.id }); setPropsOpen(true); break;
      case 'transform':
        setSelection({ type: 'sector', id: r.id }); setTransformMode(true); break;
      case 'sky-ceil':
        if (r.kind === 'sector') updateMap(m => ({
          ...m, sectors: m.sectors.map(s => s.id === r.id ? { ...s, ceilTex: 'F_SKY1' } : s)
        }));
        break;
      case 'raise-floor':
        if (r.kind === 'sector') updateMap(m => ({
          ...m, sectors: m.sectors.map(s => s.id === r.id ? { ...s, floorH: s.floorH + 16 } : s)
        })); break;
      case 'lower-floor':
        if (r.kind === 'sector') updateMap(m => ({
          ...m, sectors: m.sectors.map(s => s.id === r.id ? { ...s, floorH: s.floorH - 16 } : s)
        })); break;
      case 'flip-line':
        if (r.kind === 'linedef') updateMap(m => ({
          ...m, linedefs: m.linedefs.map(l => l.id === r.id
            ? { ...l, v1: l.v2, v2: l.v1, front: l.back, back: l.front } : l)
        })); break;
      case 'split-line':
        if (r.kind === 'linedef') {
          const ld = map.linedefs.find(l => l.id === r.id);
          if (ld) {
            const v1 = map.vertices.find(v => v.id === ld.v1);
            const v2 = map.vertices.find(v => v.id === ld.v2);
            if (v1 && v2) splitLineAt(r.id, (v1.x + v2.x) / 2, (v1.y + v2.y) / 2);
          }
        } break;
      case 'make-door':
        if (r.kind === 'linedef') { setSelection({ type: 'linedef', id: r.id }); setTimeout(() => applyFurniture('door'), 0); } break;
      case 'make-window':
        if (r.kind === 'linedef') { setSelection({ type: 'linedef', id: r.id }); setTimeout(() => applyFurniture('window'), 0); } break;
      case 'mark-secret':
        if (r.kind === 'sector') { setSelection({ type: 'sector', id: r.id }); setTimeout(() => applyFurniture('secret'), 0); } break;
      case 'place-thing': {
        const w = screenToWorld(r.sx, r.sy);
        const sn = snapWorld(w.x, w.y);
        setThingPicker({ x: sn.x, y: sn.y });
        break;
      }
      case 'start-draw': {
        const w = screenToWorld(r.sx, r.sy);
        placeOrExtendDraw(w.x, w.y);
        break;
      }
      case 'stamp-shape': setStampSheet('shapes'); break;
      case 'make-sector': {
        // Two paths into this action:
        //   1. Long-press landed on a cyan potential-sector overlay — use
        //      the cycle stored on the radial directly.
        //   2. Long-press on empty space (no overlay there) — find the
        //      cycle whose polygon contains the touch point.
        let cycle = r.potential ? r.potential.loop : null;
        if (!cycle) {
          const w = screenToWorld(r.sx, r.sy);
          const containing = potentialSectors.find(p => pointInPolygon(w.x, w.y, p.vertices));
          if (containing) cycle = containing.loop;
        }
        if (!cycle) {
          setHint('No closed shape under the touch — draw a loop first');
          break;
        }
        const finalCycle = cycle;
        updateMap(m => {
          const chain = [...finalCycle, finalCycle[0]];
          const result = buildSectorFromLoop(m, chain);
          if (!result || result.selectedExistingId) return m;
          setSelection({ type: 'sector', id: result.createdSectorId });
          setHint('Sector built from cycle');
          return result;
        });
        break;
      }
    }
  }

  return (
    <div ref={containerRef}
      className="w-full h-screen flex flex-col overflow-hidden select-none"
      style={{ background: COLORS.bg, color: COLORS.text, fontFamily: fontStack, touchAction: 'none' }}>
      <div className="flex items-center justify-between px-2 py-1.5 border-b"
        style={{ borderColor: COLORS.border, background: COLORS.bgPanel, flexShrink: 0 }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-xs font-bold tracking-widest flex items-center gap-1.5" style={{ color: COLORS.amber, letterSpacing: '0.18em' }}>
            JERKWAD
            <span style={{ fontSize: 9, color: COLORS.textDim, letterSpacing: '0.15em', fontFamily: monoStack }}>V0.21</span>
          </div>
          <button onClick={() => setMapMenuOpen(o => !o)}
            className="px-2 py-1 rounded text-xs flex items-center gap-1"
            style={{ fontFamily: monoStack, background: 'transparent', border: '1px solid ' + COLORS.border, color: COLORS.text }}>
            <span style={{ maxWidth: '7rem' }}>{doc.currentMap}</span>
            <span style={{ color: COLORS.textDim }}>▾</span>
          </button>
          {mapMenuOpen && (
            <div className="absolute z-50 mt-1 rounded shadow-lg overflow-hidden" style={{
              top: 38, left: 80, background: COLORS.bgPanel,
              border: '1px solid ' + COLORS.border, fontFamily: monoStack, minWidth: 160
            }}>
              {Object.keys(doc.maps).map(name => (
                <button key={name} onClick={() => switchMap(name)}
                  className="block w-full text-left px-3 py-2 text-sm"
                  style={{
                    background: name === doc.currentMap ? COLORS.grid : 'transparent',
                    color: name === doc.currentMap ? COLORS.accent : COLORS.text,
                    borderBottom: '1px solid ' + COLORS.border,
                  }}>{name}</button>
              ))}
              <button onClick={() => addNewMapSlot('outdoor')} className="block w-full text-left px-3 py-2 text-sm" style={{ color: COLORS.amber }}>+ outdoor map</button>
              <button onClick={() => addNewMapSlot('interior')} className="block w-full text-left px-3 py-2 text-sm" style={{ color: COLORS.accent }}>+ interior map</button>
              <button onClick={() => addNewMapSlot('random')} className="block w-full text-left px-3 py-2 text-sm" style={{ color: COLORS.amber, fontWeight: 600 }}>⚄ random world</button>
              <button onClick={() => addNewMapSlot('dungeon')} className="block w-full text-left px-3 py-2 text-sm" style={{ color: COLORS.amber, fontWeight: 600 }}>⚔ random dungeon</button>
              <button onClick={() => {
                updateMap(m => buildAddedRooms(m));
                setMapMenuOpen(false);
                setHint('More rooms added — connect them in Draw mode');
              }} className="block w-full text-left px-3 py-2 text-sm" style={{ color: COLORS.accent, fontWeight: 600 }}>+ build more rooms</button>
              <button onClick={() => {
                setCheckIssues(validateMap(map));
                setMapMenuOpen(false);
              }} className="block w-full text-left px-3 py-2 text-sm" style={{ color: COLORS.text, borderTop: '1px solid ' + COLORS.border }}>✓ check map</button>
              <button onClick={() => {
                let removed = 0;
                updateMap(m => { const r = cleanPhantomSectors(m); removed = r.removed; return r.map; });
                setMapMenuOpen(false);
                setHint(removed > 0 ? 'Cleaned ' + removed + ' phantom sector' + (removed === 1 ? '' : 's') : 'No phantoms found');
              }} className="block w-full text-left px-3 py-2 text-sm" style={{ color: COLORS.textDim }}>⌫ clean phantoms</button>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1">
          <input ref={fileInputRef} type="file" accept=".wad,.WAD" className="hidden" onChange={onLoadFile} />
          <IconBtn label="OPEN" onClick={() => fileInputRef.current?.click()} />
          <IconBtn label="SAVE" onClick={onSaveWad} />
          <IconBtn label="PLAY" onClick={onPlayInGzdoom} primary />
        </div>
      </div>

      <div className="flex-1 relative overflow-hidden">
        <canvas ref={canvasRef}
          className="absolute inset-0 w-full h-full"
          onPointerDown={onPointerDown} onPointerMove={onPointerMove}
          onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
          onWheel={onWheel} />

        <div className="absolute top-2 right-2 flex flex-col gap-1.5 items-end">
          <div className="flex gap-1.5">
            <FloatingBtn onClick={undo} disabled={!canUndo}>
              <span style={{ fontFamily: monoStack, fontSize: 13 }}>↶</span>
            </FloatingBtn>
            <FloatingBtn onClick={redo} disabled={!canRedo}>
              <span style={{ fontFamily: monoStack, fontSize: 13 }}>↷</span>
            </FloatingBtn>
          </div>
          <FloatingBtn active={showGrid} onClick={() => setShowGrid(g => !g)}>
            <span style={{ fontFamily: monoStack, fontSize: 10 }}>GRID</span>
          </FloatingBtn>
          <FloatingBtn onClick={() => {
            const opts = [64, 32, 16, 8, 0];
            const idx = opts.indexOf(snap);
            setSnap(opts[(idx + 1) % opts.length]);
          }}>
            <span style={{ fontFamily: monoStack, fontSize: 10 }}>SNAP {snap || 'OFF'}</span>
          </FloatingBtn>
          <FloatingBtn active={textureView !== 'off'} onClick={() => {
            const next = textureView === 'floor' ? 'ceil' : textureView === 'ceil' ? 'off' : 'floor';
            setTextureView(next);
          }}>
            <span style={{ fontFamily: monoStack, fontSize: 10 }}>
              TEX {textureView === 'floor' ? 'FLR' : textureView === 'ceil' ? 'CEIL' : 'OFF'}
            </span>
          </FloatingBtn>
          {selection?.type === 'sector' && (
            <FloatingBtn active={transformMode} onClick={() => setTransformMode(t => !t)}>
              <span style={{ fontFamily: monoStack, fontSize: 10 }}>XFORM</span>
            </FloatingBtn>
          )}
          {drawChain.length > 0 && (
            <FloatingBtn danger onClick={cancelDraw}>
              <span style={{ fontFamily: monoStack, fontSize: 10 }}>END</span>
            </FloatingBtn>
          )}
        </div>

        {(mode === 'draw' || drawChain.length > 0) && drawChain.length > 0 && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded text-xs"
            style={{ background: COLORS.bgPanel + 'ee', border: '1px solid ' + COLORS.border, fontFamily: monoStack, color: COLORS.accent }}>
            {drawChain.length < 3 ? 'Tap to add line' : 'Tap start to close → sector'}
          </div>
        )}
        {mode === 'draw' && drawChain.length === 0 && !hint && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded text-xs"
            style={{ background: COLORS.bgPanel + 'ee', border: '1px solid ' + COLORS.accent, fontFamily: monoStack, color: COLORS.accent }}>
            DRAW · tap to place vertex · drag disabled
          </div>
        )}
        {mode === 'select' && drawChain.length === 0 && !selection && !hint && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded text-xs"
            style={{ background: COLORS.bgPanel + 'cc', border: '1px solid ' + COLORS.border, fontFamily: monoStack, color: COLORS.textDim }}>
            Tap to select · long-press for menu
          </div>
        )}
        {hint && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded text-xs"
            style={{ background: COLORS.amber, color: COLORS.bg, fontFamily: monoStack }}>{hint}</div>
        )}

        {/* The Make Sector tool now lives on the long-press radial as
            ◇ Make — operates on the touch point and only promotes the
            cycle containing it, giving the user explicit control over
            which closed shape becomes a sector. */}

        {selObj && selection.type === 'sector' && !propsOpen && (
          <QuickEditPills sector={selObj}
            onChange={(patch) => updateMap(m => ({ ...m, sectors: m.sectors.map(s => s.id === selection.id ? { ...s, ...patch } : s) }))}
            onOpenFull={() => setPropsOpen(true)} onClose={() => setSelection(null)} monoStack={monoStack} />
        )}
        {selObj && selection.type === 'linedef' && !propsOpen && (
          <QuickLinePills line={selObj} map={map}
            onChange={(patch) => updateMap(m => ({ ...m, linedefs: m.linedefs.map(l => l.id === selection.id ? { ...l, ...patch } : l) }))}
            onChangeSidedef={(sidedefId, patch) => updateMap(m => ({
              ...m, sidedefs: m.sidedefs.map(sd => sd.id === sidedefId ? { ...sd, ...patch } : sd)
            }))}
            onOpenFull={() => setPropsOpen(true)} onClose={() => setSelection(null)} monoStack={monoStack} />
        )}
        {selObj && (selection.type === 'thing' || selection.type === 'vertex') && !propsOpen && (
          <QuickGenericPills obj={selObj} type={selection.type}
            onOpenFull={() => setPropsOpen(true)} onClose={() => setSelection(null)} monoStack={monoStack} />
        )}
      </div>

      <div className="flex border-t"
        style={{ borderColor: COLORS.border, background: COLORS.bgPanel, flexShrink: 0, paddingBottom: 'env(safe-area-inset-bottom)' }}>
        {MODES.map(m => (
          <button key={m.id}
            onClick={() => { setMode(m.id); cancelDraw(); setTransformMode(false); }}
            className="flex-1 py-2 flex flex-col items-center gap-0.5 transition-colors"
            style={{
              background: mode === m.id ? COLORS.bg : 'transparent',
              color: mode === m.id ? COLORS.amber : COLORS.textDim,
              borderTop: mode === m.id ? '2px solid ' + COLORS.amber : '2px solid transparent',
            }}>
            <span style={{ fontSize: 18, lineHeight: 1 }}>{m.glyph}</span>
            <span style={{ fontSize: 9, fontFamily: monoStack, letterSpacing: '0.1em' }}>{m.label.toUpperCase()}</span>
          </button>
        ))}
        <button onClick={() => setStampSheet('shapes')}
          className="flex-1 py-2 flex flex-col items-center gap-0.5" style={{ color: COLORS.accent }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>◫</span>
          <span style={{ fontSize: 9, fontFamily: monoStack, letterSpacing: '0.1em' }}>SHAPES</span>
        </button>
        <button onClick={() => setStampSheet('furniture')}
          className="flex-1 py-2 flex flex-col items-center gap-0.5" style={{ color: COLORS.accent }}>
          <span style={{ fontSize: 18, lineHeight: 1 }}>⚙</span>
          <span style={{ fontSize: 9, fontFamily: monoStack, letterSpacing: '0.1em' }}>FURN</span>
        </button>
      </div>

      {radial && (
        <RadialMenu radial={radial}
          onAction={(action) => { handleRadial(action, radial); setRadial(null); }}
          onClose={() => setRadial(null)} />
      )}
      {propsOpen && selObj && (
        <PropertiesPanel selection={selection} obj={selObj} map={map}
          onChange={(patch) => updateMap(m => {
            const key = selection.type === 'vertex' ? 'vertices'
              : selection.type === 'linedef' ? 'linedefs'
              : selection.type === 'thing' ? 'things' : 'sectors';
            return { ...m, [key]: m[key].map(x => x.id === selection.id ? { ...x, ...patch } : x) };
          })}
          onChangeSidedef={(sidedefId, patch) => updateMap(m => ({
            ...m, sidedefs: m.sidedefs.map(sd => sd.id === sidedefId ? { ...sd, ...patch } : sd)
          }))}
          onClose={() => setPropsOpen(false)}
          onDelete={() => { deleteSelection(); setPropsOpen(false); }} />
      )}
      {thingPicker && <ThingPicker onPick={placeThing} onCancel={() => setThingPicker(null)} />}
      {stampSheet === 'shapes' && (
        <ShapeSheet
          preview={stampPreview}
          onPreviewChange={(p) => {
            // First time the sheet opens any preview, centre it on the canvas.
            if (p && (stampPreview == null || stampPreview.kind !== p.kind)) {
              const cv = screenToWorld(canvasRef.current.clientWidth / 2, canvasRef.current.clientHeight / 2);
              const sn = snapWorld(cv.x, cv.y);
              setStampPreview({ ...p, cx: sn.x, cy: sn.y });
            } else {
              setStampPreview(p ? { ...stampPreview, ...p } : null);
            }
          }}
          onCommit={() => {
            if (!stampPreview) return;
            const { kind, cx, cy } = stampPreview;
            if (kind === 'rect') stampRect(cx, cy, stampPreview.w, stampPreview.h);
            else if (kind === 'ngon') stampNgon(cx, cy, stampPreview.r, stampPreview.n);
            else if (kind === 'stairs') stampStairs(cx, cy, stampPreview.w, stampPreview.h, stampPreview.n, stampPreview.rise);
            setStampPreview(null);
            setStampSheet(null);
          }}
          onClose={() => { setStampPreview(null); setStampSheet(null); }} />
      )}
      {stampSheet === 'furniture' && (
        <FurnitureSheet selection={selection}
          onApply={(kind) => { applyFurniture(kind); setStampSheet(null); }}
          onClose={() => setStampSheet(null)} />
      )}
      {shareModal && <ShareInstructions fileName={shareModal.fileName} onClose={() => setShareModal(null)} />}
      {checkIssues && (
        <CheckModal
          issues={checkIssues}
          onSelect={(where) => {
            // Best-effort: try to select the issue's target if it's a known id.
            if (!where) return;
            if (typeof where === 'string') {
              const t = where[0] === 'v' ? 'vertex'
                : where[0] === 'l' && where[1] !== 'd' ? 'linedef'
                : where[0] === 's' && where[1] !== 'd' ? 'sector'
                : where[0] === 't' && !isNaN(where[1]) ? 'thing'
                : where.startsWith('sd') ? 'sidedef'
                : null;
              if (t === 'vertex' || t === 'linedef' || t === 'sector' || t === 'thing') {
                setSelection({ type: t, id: where });
              }
            }
            setCheckIssues(null);
          }}
          onClose={() => setCheckIssues(null)} />
      )}
      {welcomeOpen && (
        <WelcomeOverlay onOpen={() => fileInputRef.current?.click()}
          onNewOutdoor={() => onNewMap('outdoor')}
          onNewInterior={() => onNewMap('interior')}
          onNewRandom={() => onNewMap('random')}
          onNewDungeon={() => onNewMap('dungeon')} />
      )}
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================
function IconBtn({ label, onClick, primary }) {
  return (
    <button onClick={onClick} className="px-2.5 py-1 rounded text-xs font-semibold"
      style={{
        fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em',
        background: primary ? COLORS.amber : 'transparent',
        color: primary ? COLORS.bg : COLORS.text,
        border: '1px solid ' + (primary ? COLORS.amber : COLORS.border),
      }}>{label}</button>
  );
}
function FloatingBtn({ children, onClick, active, danger, disabled }) {
  return (
    <button onClick={disabled ? undefined : onClick} disabled={disabled}
      className="px-2 py-1.5 rounded shadow-lg"
      style={{
        background: disabled ? COLORS.bgPanel : danger ? COLORS.danger : active ? COLORS.amber : COLORS.bgPanel,
        color: disabled ? COLORS.border : danger ? '#fff' : active ? COLORS.bg : COLORS.text,
        border: '1px solid ' + (disabled ? COLORS.border : danger ? COLORS.danger : active ? COLORS.amber : COLORS.border),
        opacity: disabled ? 0.5 : 1, cursor: disabled ? 'default' : 'pointer',
      }}>{children}</button>
  );
}

// WADED-style sector strip: floor / ceiling / light / tag scrubs plus floor
// and ceiling texture swatches inline. Tap a swatch to open the texture
// picker for that surface without leaving the strip.
function QuickEditPills({ sector, onChange, onOpenFull, onClose, monoStack }) {
  const [pickFor, setPickFor] = useState(null); // 'floor' | 'ceil' | null
  return (
    <>
      <div className="absolute left-2 right-2" style={{ bottom: 10, overflowX: 'auto' }}>
        <div className="flex gap-1" style={{ width: 'max-content', flexWrap: 'nowrap' }}>
          <span style={{ background: COLORS.bgPanel + 'ee', border: '1px solid ' + COLORS.amber, color: COLORS.amber, padding: '4px 8px', borderRadius: 4, fontFamily: monoStack, fontSize: 11 }}>
            SECTOR {sector.id}
          </span>
          <ScrubPill label="F"   value={sector.floorH} step={8}  onChange={v => onChange({ floorH: v })} monoStack={monoStack} />
          <ScrubPill label="C"   value={sector.ceilH}  step={8}  onChange={v => onChange({ ceilH: v })}  monoStack={monoStack} />
          <ScrubPill label="LT"  value={sector.light}  step={16} min={0} max={255} onChange={v => onChange({ light: v })} monoStack={monoStack} />
          <ScrubPill label="TAG" value={sector.tag}    step={1}  onChange={v => onChange({ tag: v })}    monoStack={monoStack} />
          <ScrubPill label="SP"  value={sector.special} step={1} onChange={v => onChange({ special: v })} monoStack={monoStack} />
          <button onClick={() => setPickFor('floor')}
            className="flex items-center gap-1.5 rounded"
            style={{ background: COLORS.bgPanel + 'ee', color: COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: monoStack, fontSize: 11, padding: '4px 8px' }}>
            <TextureSwatch name={sector.floorTex} kind="floors" size={14} />
            <span>F {(sector.floorTex || '-').slice(0, 8)}</span>
          </button>
          <button onClick={() => setPickFor('ceil')}
            className="flex items-center gap-1.5 rounded"
            style={{ background: COLORS.bgPanel + 'ee', color: COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: monoStack, fontSize: 11, padding: '4px 8px' }}>
            <TextureSwatch name={sector.ceilTex} kind="ceilings" size={14} />
            <span>C {(sector.ceilTex || '-').slice(0, 8)}</span>
          </button>
          <button onClick={onOpenFull}
            className="px-2 py-1 rounded text-xs"
            style={{ background: COLORS.bgPanel + 'ee', color: COLORS.accent, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>ALL ▸</button>
          <button onClick={onClose}
            className="px-2 py-1 rounded text-xs"
            style={{ background: COLORS.bgPanel + 'ee', color: COLORS.textDim, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>✕</button>
        </div>
      </div>
      {pickFor && (
        <TexturePicker
          kind={pickFor === 'floor' ? 'floors' : 'ceilings'}
          current={pickFor === 'floor' ? sector.floorTex : sector.ceilTex}
          onPick={(name) => {
            onChange(pickFor === 'floor' ? { floorTex: name } : { ceilTex: name });
            setPickFor(null);
          }}
          onCancel={() => setPickFor(null)} />
      )}
    </>
  );
}

// WADED-style line strip: special / tag / length / angle + flag chips +
// front-side (U/M/L) and back-side (U/M/L) texture swatches inline.
function QuickLinePills({ line, map, onChange, onChangeSidedef, onOpenFull, onClose, monoStack }) {
  const isTwoSided   = (line.flags & 4)   !== 0;
  const isImpassable = (line.flags & 1)   !== 0;
  const upperUnp     = (line.flags & 8)   !== 0;
  const lowerUnp     = (line.flags & 16)  !== 0;
  const v1 = map.vertices.find(v => v.id === line.v1);
  const v2 = map.vertices.find(v => v.id === line.v2);
  const len = (v1 && v2) ? Math.round(Math.hypot(v2.x - v1.x, v2.y - v1.y)) : 0;
  const ang = (v1 && v2) ? Math.round(Math.atan2(v2.y - v1.y, v2.x - v1.x) * 180 / Math.PI) : 0;
  const front = map.sidedefs.find(s => s.id === line.front);
  const back  = map.sidedefs.find(s => s.id === line.back);
  const [pickFor, setPickFor] = useState(null); // { side: 'front'|'back', slot: 'upper'|'middle'|'lower' }
  const sdValue = (sd, slot) => sd ? sd[slot] : '-';

  function SideBlock({ label, sd, sideKey }) {
    if (!sd) return (
      <span style={{ background: COLORS.bgPanel + 'aa', color: COLORS.textDim, border: '1px dashed ' + COLORS.border, padding: '4px 8px', borderRadius: 4, fontFamily: monoStack, fontSize: 10 }}>
        {label} —
      </span>
    );
    return (
      <span className="flex gap-1 items-center rounded" style={{ background: COLORS.bgPanel + 'ee', border: '1px solid ' + COLORS.border, padding: '3px 5px' }}>
        <span style={{ color: COLORS.accent, fontFamily: monoStack, fontSize: 10, letterSpacing: '0.05em' }}>{label}</span>
        {['upper', 'middle', 'lower'].map(slot => (
          <button key={slot}
            onClick={() => setPickFor({ side: sideKey, slot })}
            className="flex items-center gap-1 rounded"
            style={{
              background: 'rgba(0,0,0,0.25)', color: COLORS.text,
              fontFamily: monoStack, fontSize: 10, padding: '2px 4px',
              border: '1px solid transparent',
            }}
            title={slot}>
            <TextureSwatch name={sdValue(sd, slot)} kind="walls" size={12} />
            <span>{(sdValue(sd, slot) || '-').slice(0, 6)}</span>
          </button>
        ))}
      </span>
    );
  }
  return (
    <>
      <div className="absolute left-2 right-2" style={{ bottom: 10, overflowX: 'auto' }}>
        <div className="flex gap-1 items-center" style={{ width: 'max-content', flexWrap: 'nowrap' }}>
          <span style={{ background: COLORS.bgPanel + 'ee', border: '1px solid ' + COLORS.amber, color: COLORS.amber, padding: '4px 8px', borderRadius: 4, fontFamily: monoStack, fontSize: 11 }}>
            LINE {line.id}
          </span>
          <span style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 10, padding: '0 4px' }}>
            LEN {len} · ANG {ang}°
          </span>
          <ScrubPill label="SP"  value={line.special} step={1} onChange={v => onChange({ special: v })} monoStack={monoStack} />
          <ScrubPill label="TAG" value={line.tag}     step={1} onChange={v => onChange({ tag: v })}    monoStack={monoStack} />
          <FlagChip on={isImpassable} label="IMP"  onClick={() => onChange({ flags: line.flags ^ 1 })} monoStack={monoStack} />
          <FlagChip on={isTwoSided}   label="2S"   onClick={() => onChange({ flags: line.flags ^ 4 })} monoStack={monoStack} />
          <FlagChip on={upperUnp}     label="UPEG" onClick={() => onChange({ flags: line.flags ^ 8 })} monoStack={monoStack} />
          <FlagChip on={lowerUnp}     label="LPEG" onClick={() => onChange({ flags: line.flags ^ 16 })} monoStack={monoStack} />
          <SideBlock label="FRONT" sd={front} sideKey="front" />
          <SideBlock label="BACK"  sd={back}  sideKey="back"  />
          <button onClick={onOpenFull}
            className="px-2 py-1 rounded text-xs"
            style={{ background: COLORS.bgPanel + 'ee', color: COLORS.accent, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>ALL ▸</button>
          <button onClick={onClose}
            className="px-2 py-1 rounded text-xs"
            style={{ background: COLORS.bgPanel + 'ee', color: COLORS.textDim, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>✕</button>
        </div>
      </div>
      {pickFor && (
        <TexturePicker
          kind="walls"
          current={sdValue(pickFor.side === 'front' ? front : back, pickFor.slot)}
          onPick={(name) => {
            const target = pickFor.side === 'front' ? front : back;
            if (target) onChangeSidedef(target.id, { [pickFor.slot]: name });
            setPickFor(null);
          }}
          onCancel={() => setPickFor(null)} />
      )}
    </>
  );
}
function FlagChip({ on, label, onClick, monoStack }) {
  return (
    <button onClick={onClick}
      className="px-2 py-1 rounded text-xs"
      style={{
        background: on ? COLORS.amber : COLORS.bgPanel + 'ee',
        color: on ? COLORS.bg : COLORS.text,
        border: '1px solid ' + (on ? COLORS.amber : COLORS.border),
        fontFamily: monoStack,
      }}>{label}</button>
  );
}
function QuickGenericPills({ obj, type, onOpenFull, onClose, monoStack }) {
  const label = type === 'vertex' ? `V ${obj.id}` : `THING #${obj.type}`;
  return (
    <div className="absolute left-2 right-2 flex gap-1" style={{ bottom: 10 }}>
      <div className="px-2 py-1 rounded text-xs"
        style={{ background: COLORS.bgPanel + 'ee', color: COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>
        {label}
      </div>
      <button onClick={onOpenFull}
        className="px-2 py-1 rounded text-xs"
        style={{ background: COLORS.bgPanel + 'ee', color: COLORS.accent, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>EDIT ▸</button>
      <button onClick={onClose}
        className="px-2 py-1 rounded text-xs"
        style={{ background: COLORS.bgPanel + 'ee', color: COLORS.textDim, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>✕</button>
    </div>
  );
}

function ScrubPill({ label, value, step = 1, min = -32768, max = 32767, onChange, monoStack }) {
  return (
    <div className="flex items-center rounded" style={{
      background: COLORS.bgPanel + 'ee', border: '1px solid ' + COLORS.border,
      fontFamily: monoStack, fontSize: 11
    }}>
      <button onClick={() => onChange(Math.max(min, (value | 0) - step))}
        style={{ padding: '4px 8px', color: COLORS.amber, fontWeight: 600 }}>−</button>
      <span style={{ padding: '4px 4px', minWidth: 56, textAlign: 'center', color: COLORS.text }}>
        {label} {value | 0}
      </span>
      <button onClick={() => onChange(Math.min(max, (value | 0) + step))}
        style={{ padding: '4px 8px', color: COLORS.amber, fontWeight: 600 }}>+</button>
    </div>
  );
}

function RadialMenu({ radial, onAction, onClose }) {
  const actionsByKind = {
    sector: [
      { id: 'props', label: 'Props', glyph: '⚙' },
      { id: 'transform', label: 'Xform', glyph: '⤡' },
      { id: 'raise-floor', label: 'Floor+', glyph: '▲' },
      { id: 'lower-floor', label: 'Floor−', glyph: '▼' },
      { id: 'sky-ceil', label: 'Sky', glyph: '☀' },
      { id: 'mark-secret', label: 'Secret', glyph: '✦' },
      { id: 'delete', label: 'Delete', glyph: '✕' },
    ],
    linedef: [
      { id: 'props', label: 'Props', glyph: '⚙' },
      { id: 'flip-line', label: 'Flip', glyph: '⇆' },
      { id: 'split-line', label: 'Split', glyph: '⋯' },
      { id: 'make-door', label: 'Door', glyph: '▥' },
      { id: 'make-window', label: 'Wind', glyph: '◫' },
      { id: 'delete', label: 'Delete', glyph: '✕' },
    ],
    vertex: [
      { id: 'select', label: 'Select', glyph: '◉' },
      { id: 'delete', label: 'Delete', glyph: '✕' },
    ],
    thing: [
      { id: 'props', label: 'Props', glyph: '⚙' },
      { id: 'delete', label: 'Delete', glyph: '✕' },
    ],
    empty: [
      { id: 'make-sector', label: 'Make', glyph: '◇' },
      { id: 'start-draw', label: 'Draw', glyph: '✎' },
      { id: 'place-thing', label: 'Thing', glyph: '◉' },
      { id: 'stamp-shape', label: 'Shape', glyph: '◫' },
    ],
    potential: [
      { id: 'make-sector', label: 'Make', glyph: '◇' },
      { id: 'start-draw', label: 'Draw', glyph: '✎' },
      { id: 'place-thing', label: 'Thing', glyph: '◉' },
    ],
  };
  const actions = actionsByKind[radial.kind] || [];
  const R = 76;
  // Constrain radial center so it stays on screen
  const cx = Math.max(90, Math.min((typeof window !== 'undefined' ? window.innerWidth : 400) - 90, radial.sx));
  const cy = Math.max(90, Math.min((typeof window !== 'undefined' ? window.innerHeight : 800) - 110, radial.sy));
  return (
    <div className="absolute inset-0 z-40" style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div style={{ position: 'absolute', left: cx, top: cy, transform: 'translate(-50%, -50%)' }}>
        <div style={{
          background: COLORS.bgPanel, color: COLORS.amber,
          border: '2px solid ' + COLORS.amber, borderRadius: 999,
          padding: '6px 10px', fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.1em', textTransform: 'uppercase', textAlign: 'center', minWidth: 56,
        }}>{radial.kind}</div>
        {actions.map((a, i) => {
          const angle = (i / actions.length) * Math.PI * 2 - Math.PI / 2;
          const dx = Math.cos(angle) * R, dy = Math.sin(angle) * R;
          return (
            <button key={a.id}
              onClick={(e) => { e.stopPropagation(); onAction(a.id); }}
              style={{
                position: 'absolute', left: dx, top: dy, transform: 'translate(-50%, -50%)',
                width: 60, height: 60, borderRadius: '50%',
                background: COLORS.bgPanel, color: COLORS.text,
                border: '2px solid ' + COLORS.border,
                display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
              <span style={{ fontSize: 18, color: COLORS.accent }}>{a.glyph}</span>
              <span style={{ fontSize: 9, marginTop: 2 }}>{a.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// Stamp sheet with live placement preview. Selecting a shape (rect/ngon/
// stairs) emits a controlled preview to the parent; parent draws a ghost
// outline at the preview's centre on the canvas. Tapping the canvas
// repositions the ghost (handled in parent). Pressing STAMP commits.
function ShapeSheet({ preview, onPreviewChange, onCommit, onClose }) {
  const monoStack = "'JetBrains Mono', monospace";
  const kind = preview?.kind ?? null;
  const w = preview?.w ?? 256, h = preview?.h ?? 256;
  const r = preview?.r ?? 128, n = preview?.n ?? 6;
  const sn = preview?.n ?? 4, sRise = preview?.rise ?? 16;

  function selectKind(k) {
    if (k === 'rect') onPreviewChange({ kind: 'rect', w: 256, h: 256 });
    else if (k === 'ngon') onPreviewChange({ kind: 'ngon', r: 128, n: 6 });
    else if (k === 'stairs') onPreviewChange({ kind: 'stairs', w: 256, h: 128, n: 4, rise: 16 });
  }

  const tabStyle = (k) => ({
    background: kind === k ? COLORS.amber : 'transparent',
    color: kind === k ? COLORS.bg : COLORS.text,
    border: '1px solid ' + (kind === k ? COLORS.amber : COLORS.border),
    fontFamily: monoStack, letterSpacing: '0.05em', textTransform: 'uppercase',
    padding: '6px 10px', borderRadius: 4, fontSize: 11,
  });

  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: '#0006', pointerEvents: 'auto' }} onClick={(e) => { /* allow tap-through to canvas via close+reopen? simpler: don't dismiss on backdrop */ }}>
      <div className="w-full rounded-t-lg flex flex-col"
        style={{ background: COLORS.bgPanel, border: '1px solid ' + COLORS.border, paddingBottom: 'env(safe-area-inset-bottom)', maxHeight: '55%' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: COLORS.border }}>
          <div>
            <div style={{ color: COLORS.amber, fontFamily: monoStack, fontSize: 13 }}>SHAPE STAMP</div>
            <div style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 10 }}>
              {preview ? 'Tap canvas to reposition · STAMP to commit' : 'Pick a shape to preview'}
            </div>
          </div>
          <button onClick={onClose} style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 11 }}>CLOSE</button>
        </div>
        <div className="flex gap-2 p-3 border-b" style={{ borderColor: COLORS.border }}>
          <button onClick={() => selectKind('rect')} style={tabStyle('rect')}>◫ Rect</button>
          <button onClick={() => selectKind('ngon')} style={tabStyle('ngon')}>⬡ Polygon</button>
          <button onClick={() => selectKind('stairs')} style={tabStyle('stairs')}>⩘ Stairs</button>
        </div>
        <div className="p-4 overflow-y-auto" style={{ minHeight: 70 }}>
          {kind === 'rect' && (
            <div className="flex items-center gap-2 flex-wrap">
              <NumInput label="W" value={w} onChange={v => onPreviewChange({ kind: 'rect', w: v, h })} mono={monoStack} step={64} />
              <NumInput label="H" value={h} onChange={v => onPreviewChange({ kind: 'rect', w, h: v })} mono={monoStack} step={64} />
            </div>
          )}
          {kind === 'ngon' && (
            <div className="flex items-center gap-2 flex-wrap">
              <NumInput label="R" value={r} onChange={v => onPreviewChange({ kind: 'ngon', r: v, n })} mono={monoStack} step={32} />
              <NumInput label="N" value={n} onChange={v => onPreviewChange({ kind: 'ngon', r, n: Math.max(3, Math.min(24, v)) })} mono={monoStack} step={1} />
            </div>
          )}
          {kind === 'stairs' && (
            <div className="flex items-center gap-2 flex-wrap">
              <NumInput label="W" value={w} onChange={v => onPreviewChange({ kind: 'stairs', w: v, h, n: sn, rise: sRise })} mono={monoStack} step={32} />
              <NumInput label="H" value={h} onChange={v => onPreviewChange({ kind: 'stairs', w, h: v, n: sn, rise: sRise })} mono={monoStack} step={32} />
              <NumInput label="N" value={sn} onChange={v => onPreviewChange({ kind: 'stairs', w, h, n: Math.max(2, Math.min(16, v)), rise: sRise })} mono={monoStack} step={1} />
              <NumInput label="RISE" value={sRise} onChange={v => onPreviewChange({ kind: 'stairs', w, h, n: sn, rise: v })} mono={monoStack} step={8} />
            </div>
          )}
          {!kind && (
            <div style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 11 }}>
              Pick Rect / Polygon / Stairs above to see a placement preview.
            </div>
          )}
        </div>
        <div className="p-3 border-t flex gap-2" style={{ borderColor: COLORS.border }}>
          <button onClick={onCommit} disabled={!kind}
            className="flex-1 py-2.5 rounded font-semibold"
            style={{
              background: kind ? COLORS.amber : COLORS.bgPanel,
              color: kind ? COLORS.bg : COLORS.textDim,
              border: '1px solid ' + (kind ? COLORS.amber : COLORS.border),
              fontFamily: monoStack, letterSpacing: '0.05em',
              opacity: kind ? 1 : 0.5,
            }}>STAMP HERE</button>
        </div>
      </div>
    </div>
  );
}
function NumInput({ label, value, onChange, mono, step = 1 }) {
  return (
    <div className="flex items-center gap-1 rounded" style={{
      background: COLORS.bg, border: '1px solid ' + COLORS.border, fontFamily: mono, fontSize: 13
    }}>
      <button onClick={() => onChange(value - step)} style={{ padding: '6px 10px', color: COLORS.amber }}>−</button>
      <span style={{ color: COLORS.textDim, fontSize: 10 }}>{label}</span>
      <input type="number" value={value} onChange={e => onChange(parseInt(e.target.value) || 0)}
        style={{ width: 50, background: 'transparent', color: COLORS.text, textAlign: 'center', border: 'none', outline: 'none' }} />
      <button onClick={() => onChange(value + step)} style={{ padding: '6px 10px', color: COLORS.amber }}>+</button>
    </div>
  );
}

function FurnitureSheet({ selection, onApply, onClose }) {
  const monoStack = "'JetBrains Mono', monospace";
  const items = [
    { kind: 'door', label: 'Door', glyph: '▥', needs: 'linedef', desc: 'DR-1, DOORTRAK sides' },
    { kind: 'door-red', label: 'Door (Red)', glyph: '▥', needs: 'linedef', desc: 'DR-28 red key' },
    { kind: 'door-blue', label: 'Door (Blue)', glyph: '▥', needs: 'linedef', desc: 'DR-26 blue key' },
    { kind: 'door-yellow', label: 'Door (Yellow)', glyph: '▥', needs: 'linedef', desc: 'DR-27 yellow key' },
    { kind: 'window', label: 'Window', glyph: '◫', needs: 'linedef', desc: 'two-sided, MIDGRATE' },
    { kind: 'switch', label: 'Switch (door)', glyph: '◧', needs: 'linedef', desc: 'S1-103, tag 1' },
    { kind: 'teleporter', label: 'Teleporter', glyph: '◉', needs: 'linedef', desc: 'WR-97' },
    { kind: 'exit', label: 'Exit', glyph: '⏏', needs: 'linedef', desc: 'S1-11' },
    { kind: 'lift', label: 'Lift', glyph: '⇕', needs: 'sector', desc: 'SR-62 + WR-88, tag 1' },
    { kind: 'secret', label: 'Secret', glyph: '✦', needs: 'sector', desc: 'sector special 9' },
    { kind: 'damage-slime', label: 'Slime Floor', glyph: '☣', needs: 'sector', desc: 'special 7 (−2%)' },
    { kind: 'damage-lava', label: 'Lava Floor', glyph: '☣', needs: 'sector', desc: 'special 16 (−20%)' },
  ];
  const selKind = selection?.type;
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: '#000a' }} onClick={onClose}>
      <div className="w-full rounded-t-lg flex flex-col"
        style={{ background: COLORS.bgPanel, border: '1px solid ' + COLORS.border, maxHeight: '70%', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: COLORS.border }}>
          <div>
            <div style={{ color: COLORS.amber, fontFamily: monoStack, fontSize: 13 }}>FURNITURE</div>
            <div style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 10 }}>
              {selKind ? 'Selection: ' + selKind : 'Tap a line or sector first'}
            </div>
          </div>
          <button onClick={onClose} style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 11 }}>CLOSE</button>
        </div>
        <div className="flex-1 overflow-y-auto px-2 py-2">
          <div className="grid grid-cols-2 gap-2">
            {items.map(it => {
              const ok = it.needs === selKind;
              return (
                <button key={it.kind}
                  onClick={() => ok && onApply(it.kind)}
                  className="flex flex-col items-start gap-1 p-3 rounded text-left"
                  style={{
                    background: ok ? COLORS.bgPanel2 : COLORS.bg,
                    border: '1px solid ' + (ok ? COLORS.amber : COLORS.border),
                    opacity: ok ? 1 : 0.5, fontFamily: monoStack,
                  }}>
                  <div className="flex items-center gap-2">
                    <span style={{ fontSize: 18, color: ok ? COLORS.amber : COLORS.textDim }}>{it.glyph}</span>
                    <span style={{ fontSize: 12, color: COLORS.text }}>{it.label}</span>
                  </div>
                  <span style={{ fontSize: 9, color: COLORS.textDim, lineHeight: 1.3 }}>{it.desc}</span>
                  <span style={{ fontSize: 9, color: ok ? COLORS.accent : COLORS.textDim }}>needs: {it.needs}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PropertiesPanel({ selection, obj, map, onChange, onChangeSidedef, onClose, onDelete }) {
  const monoStack = "'JetBrains Mono', monospace";
  const titles = { vertex: 'Vertex', linedef: 'Linedef', sector: 'Sector', thing: 'Thing' };
  return (
    <div className="absolute left-0 right-0 bottom-0 z-30 rounded-t-lg shadow-2xl"
      style={{
        background: COLORS.bgPanel, border: '1px solid ' + COLORS.border, borderBottom: 'none',
        maxHeight: '70%', overflowY: 'auto',
        paddingBottom: 'calc(env(safe-area-inset-bottom) + 1rem)',
        marginBottom: 56,
      }}>
      <div className="sticky top-0 flex items-center justify-between px-4 py-3 border-b"
        style={{ background: COLORS.bgPanel, borderColor: COLORS.border }}>
        <div>
          <div className="text-xs uppercase" style={{ color: COLORS.textDim, letterSpacing: '0.15em', fontFamily: monoStack }}>
            {titles[selection.type]}
          </div>
          <div style={{ color: COLORS.amber, fontFamily: monoStack, fontSize: 14 }}>{obj.id}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={onDelete}
            className="px-3 py-1.5 rounded text-xs"
            style={{ background: 'transparent', color: COLORS.danger, border: '1px solid ' + COLORS.danger, fontFamily: monoStack }}>DELETE</button>
          <button onClick={onClose}
            className="px-3 py-1.5 rounded text-xs"
            style={{ background: 'transparent', color: COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>CLOSE</button>
        </div>
      </div>
      <div className="px-4 pt-2">
        {selection.type === 'vertex' && (<>
          <FieldNum label="X" value={obj.x} onChange={v => onChange({ x: v })} />
          <FieldNum label="Y" value={obj.y} onChange={v => onChange({ y: v })} />
        </>)}
        {selection.type === 'linedef' && <LinedefFields obj={obj} map={map} onChange={onChange} onChangeSidedef={onChangeSidedef} />}
        {selection.type === 'sector' && <SectorFields obj={obj} onChange={onChange} />}
        {selection.type === 'thing' && <ThingFields obj={obj} onChange={onChange} />}
      </div>
    </div>
  );
}

function FieldNum({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs uppercase" style={{ color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>
        {label}
      </span>
      <input type="number" value={value ?? 0}
        onChange={e => onChange(parseInt(e.target.value) || 0)}
        className="px-2 py-1 rounded text-right"
        style={{ width: 96, background: COLORS.bg, color: COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }} />
    </label>
  );
}
// Texture field: tap the value to open the picker modal. Keeps a manual
// "type a name" input for power users who want a custom texture name.
function FieldTexture({ label, value, kind, onChange }) {
  const monoStack = "'JetBrains Mono', monospace";
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  return (
    <>
      <label className="flex items-center justify-between gap-2 py-1.5">
        <span className="text-xs uppercase" style={{ color: COLORS.textDim, fontFamily: monoStack, letterSpacing: '0.08em' }}>
          {label}
        </span>
        {editing ? (
          <input type="text" value={value ?? ''} autoFocus
            onBlur={() => setEditing(false)}
            onChange={e => onChange(e.target.value.toUpperCase())}
            className="px-2 py-1 rounded text-right"
            style={{ width: 140, background: COLORS.bg, color: COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: monoStack, fontSize: 13, textTransform: 'uppercase' }}
            maxLength={8} />
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={() => setPickerOpen(true)}
              className="px-2 py-1 rounded text-right flex items-center gap-1.5"
              style={{ width: 140, background: COLORS.bg, color: COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: monoStack, fontSize: 13 }}>
              <TextureSwatch name={value || '-'} kind={kind} size={14} />
              <span style={{ flex: 1, textAlign: 'right' }}>{value || '-'}</span>
              <span style={{ color: COLORS.textDim }}>▾</span>
            </button>
            <button onClick={() => setEditing(true)}
              style={{ padding: '4px 6px', color: COLORS.textDim, fontFamily: monoStack, fontSize: 11 }}>✎</button>
          </div>
        )}
      </label>
      {pickerOpen && (
        <TexturePicker
          kind={kind}
          current={value}
          onPick={(name) => { onChange(name); setPickerOpen(false); }}
          onCancel={() => setPickerOpen(false)}
        />
      )}
    </>
  );
}

// Small swatch that previews a texture's appearance.
function TextureSwatch({ name, kind, size = 32 }) {
  const ref = useRef(null);
  useEffect(() => {
    const cnv = ref.current;
    if (!cnv) return;
    cnv.width = size; cnv.height = size;
    const ctx = cnv.getContext('2d');
    if (kind === 'walls') {
      ctx.fillStyle = wallSwatchColor(name);
      ctx.fillRect(0, 0, size, size);
    } else {
      const tile = buildFlatCanvas(name);
      if (tile) {
        ctx.drawImage(tile, 0, 0, 64, 64, 0, 0, size, size);
      } else {
        ctx.fillStyle = '#444';
        ctx.fillRect(0, 0, size, size);
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.strokeRect(0.5, 0.5, size - 1, size - 1);
  }, [name, kind, size]);
  return <canvas ref={ref} width={size} height={size} style={{ display: 'block', flexShrink: 0, borderRadius: 2 }} />;
}

function wallSwatchColor(name) {
  if (!name || name === '-') return '#1a2030';
  if (/^STARTAN/.test(name)) return '#7a8e8e';
  if (/^BRO/.test(name)) return '#876544';
  if (/^METAL/.test(name)) return '#5a5a5a';
  if (/^STONE|^TANROCK/.test(name)) return '#8a8074';
  if (/^WOOD/.test(name)) return '#8c5a2a';
  if (/^GRAY/.test(name)) return '#9a9aa0';
  if (/^BIGDOOR|^DOOR(?!TRAK)/.test(name)) return '#a08050';
  if (/^DOORTRAK/.test(name)) return '#3a3024';
  if (/^EXIT/.test(name)) return '#a07050';
  if (/^SW[12]/.test(name)) return '#7e6a5a';
  if (/^COMP/.test(name)) return '#3a5070';
  if (/^MID/.test(name)) return '#666688';
  if (/^LITE/.test(name)) return '#c8b878';
  if (/^SUPPORT|^SHAWN/.test(name)) return '#6a6a6a';
  if (/^PIPE/.test(name)) return '#3a3a3a';
  if (/^CRAT/.test(name)) return '#a07c44';
  if (/^SLAD/.test(name)) return '#506050';
  return '#7a7a7a';
}

function TexturePicker({ kind, current, onPick, onCancel }) {
  const monoStack = "'JetBrains Mono', monospace";
  const [tab, setTab] = useState(kind || 'walls');
  const [filter, setFilter] = useState('');
  const list = (DOOM_TEXTURES[tab] || []).filter(n =>
    !filter || n.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: '#000a' }} onClick={onCancel}>
      <div className="w-full rounded-t-lg flex flex-col"
        style={{ background: COLORS.bgPanel, border: '1px solid ' + COLORS.border, maxHeight: '80%', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: COLORS.border }}>
          <div>
            <div style={{ color: COLORS.amber, fontFamily: monoStack, fontSize: 13 }}>TEXTURE</div>
            <div style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 10 }}>current: {current || '-'}</div>
          </div>
          <button onClick={() => onPick('-')} style={{ color: COLORS.danger, fontFamily: monoStack, fontSize: 11, padding: '4px 8px' }}>CLEAR (-)</button>
          <button onClick={onCancel} style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 11, padding: '4px 8px' }}>CLOSE</button>
        </div>
        <div className="flex gap-1 p-2 border-b" style={{ borderColor: COLORS.border, flexShrink: 0 }}>
          {['walls', 'floors', 'ceilings'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              className="px-3 py-1 rounded text-xs"
              style={{
                background: tab === t ? COLORS.amber : 'transparent',
                color: tab === t ? COLORS.bg : COLORS.text,
                border: '1px solid ' + (tab === t ? COLORS.amber : COLORS.border),
                fontFamily: monoStack, textTransform: 'uppercase', letterSpacing: '0.06em'
              }}>{t}</button>
          ))}
          <input type="text" value={filter} onChange={e => setFilter(e.target.value)}
            placeholder="filter…"
            style={{ flex: 1, marginLeft: 8, background: COLORS.bg, color: COLORS.text, border: '1px solid ' + COLORS.border, borderRadius: 4, padding: '4px 8px', fontFamily: monoStack, fontSize: 12 }} />
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(96px, 1fr))', gap: 6 }}>
            {list.map(name => (
              <button key={name} onClick={() => onPick(name)}
                className="flex flex-col items-center gap-1 p-2 rounded"
                style={{
                  background: name === current ? COLORS.bgPanel2 : COLORS.bg,
                  border: '1px solid ' + (name === current ? COLORS.amber : COLORS.border),
                  fontFamily: monoStack,
                }}>
                <TextureSwatch name={name} kind={tab} size={56} />
                <span style={{ fontSize: 9, color: COLORS.text, letterSpacing: '0.02em' }}>{name}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FieldText({ label, value, onChange }) {
  return (
    <label className="flex items-center justify-between gap-2 py-1.5">
      <span className="text-xs uppercase" style={{ color: COLORS.textDim, fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>
        {label}
      </span>
      <input type="text" value={value ?? ''}
        onChange={e => onChange(e.target.value.toUpperCase())}
        className="px-2 py-1 rounded text-right"
        style={{ width: 140, background: COLORS.bg, color: COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: "'JetBrains Mono', monospace", fontSize: 13, textTransform: 'uppercase' }}
        maxLength={8} />
    </label>
  );
}
function LinedefFields({ obj, map, onChange, onChangeSidedef }) {
  const monoStack = "'JetBrains Mono', monospace";
  const flagDefs = [
    { bit: 1, label: 'Impassable' }, { bit: 2, label: 'Block Monsters' },
    { bit: 4, label: 'Two-Sided' }, { bit: 8, label: 'Upper Unpegged' },
    { bit: 16, label: 'Lower Unpegged' }, { bit: 32, label: 'Secret' },
    { bit: 64, label: 'Block Sound' }, { bit: 128, label: 'Hidden on Map' },
    { bit: 256, label: 'Shown on Map' },
  ];
  const front = map.sidedefs.find(s => s.id === obj.front);
  const back = map.sidedefs.find(s => s.id === obj.back);
  return (<>
    <FieldNum label="Special" value={obj.special} onChange={v => onChange({ special: v })} />
    <FieldNum label="Tag" value={obj.tag} onChange={v => onChange({ tag: v })} />
    <div className="mt-3 mb-1" style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Flags</div>
    <div className="grid grid-cols-2 gap-1">
      {flagDefs.map(f => (
        <label key={f.bit} className="flex items-center gap-2 text-xs py-1">
          <input type="checkbox" checked={(obj.flags & f.bit) !== 0}
            onChange={e => onChange({ flags: e.target.checked ? (obj.flags | f.bit) : (obj.flags & ~f.bit) })}
            style={{ accentColor: COLORS.amber }} />
          <span style={{ fontFamily: monoStack, color: COLORS.text }}>{f.label}</span>
        </label>
      ))}
    </div>
    {front && (<div className="mt-4">
      <div style={{ color: COLORS.accent, fontFamily: monoStack, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>◐ Front Side</div>
      <SidedefFields sd={front} onChange={p => onChangeSidedef(front.id, p)} />
    </div>)}
    {back && (<div className="mt-3">
      <div style={{ color: COLORS.accent, fontFamily: monoStack, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>◑ Back Side</div>
      <SidedefFields sd={back} onChange={p => onChangeSidedef(back.id, p)} />
    </div>)}
  </>);
}
function SidedefFields({ sd, onChange }) {
  const monoStack = "'JetBrains Mono', monospace";
  return (
    <div style={{ paddingLeft: 4 }}>
      <FieldTexture label="Upper" kind="walls" value={sd.upper} onChange={v => onChange({ upper: v })} />
      <FieldTexture label="Middle" kind="walls" value={sd.middle} onChange={v => onChange({ middle: v })} />
      <FieldTexture label="Lower" kind="walls" value={sd.lower} onChange={v => onChange({ lower: v })} />
      <div className="grid grid-cols-2 gap-2">
        <FieldNum label="X Off" value={sd.xOff} onChange={v => onChange({ xOff: v })} />
        <FieldNum label="Y Off" value={sd.yOff} onChange={v => onChange({ yOff: v })} />
      </div>
      <div style={{ fontFamily: monoStack, fontSize: 10, color: COLORS.textDim, marginTop: 2 }}>sector → {sd.sector}</div>
    </div>
  );
}
function SectorFields({ obj, onChange }) {
  return (<>
    <FieldNum label="Floor H" value={obj.floorH} onChange={v => onChange({ floorH: v })} />
    <FieldNum label="Ceil H" value={obj.ceilH} onChange={v => onChange({ ceilH: v })} />
    <FieldTexture label="Floor Tex" kind="floors" value={obj.floorTex} onChange={v => onChange({ floorTex: v })} />
    <FieldTexture label="Ceil Tex" kind="ceilings" value={obj.ceilTex} onChange={v => onChange({ ceilTex: v })} />
    <FieldNum label="Light" value={obj.light} onChange={v => onChange({ light: Math.max(0, Math.min(255, v)) })} />
    <FieldNum label="Special" value={obj.special} onChange={v => onChange({ special: v })} />
    <FieldNum label="Tag" value={obj.tag} onChange={v => onChange({ tag: v })} />
  </>);
}
function ThingFields({ obj, onChange }) {
  const monoStack = "'JetBrains Mono', monospace";
  const meta = DOOM_THING_TYPES.find(t => t.id === obj.type);
  return (<>
    <div className="py-2" style={{ fontFamily: monoStack, fontSize: 13, color: COLORS.amber }}>
      {meta ? meta.name : 'Type ' + obj.type}
    </div>
    <FieldNum label="X" value={obj.x} onChange={v => onChange({ x: v })} />
    <FieldNum label="Y" value={obj.y} onChange={v => onChange({ y: v })} />
    <FieldNum label="Angle" value={obj.angle} onChange={v => onChange({ angle: v })} />
    <FieldNum label="Type" value={obj.type} onChange={v => onChange({ type: v })} />
    <div className="mt-2 mb-1" style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Skill / Multiplayer</div>
    {[{ bit: 1, label: 'Easy' }, { bit: 2, label: 'Medium' }, { bit: 4, label: 'Hard' },
      { bit: 8, label: 'Ambush' }, { bit: 16, label: 'Multiplayer Only' }].map(f => (
      <label key={f.bit} className="flex items-center gap-2 text-xs py-1">
        <input type="checkbox" checked={(obj.flags & f.bit) !== 0}
          onChange={e => onChange({ flags: e.target.checked ? (obj.flags | f.bit) : (obj.flags & ~f.bit) })}
          style={{ accentColor: COLORS.amber }} />
        <span style={{ fontFamily: monoStack, color: COLORS.text }}>{f.label}</span>
      </label>
    ))}
  </>);
}

function ThingPicker({ onPick, onCancel }) {
  const monoStack = "'JetBrains Mono', monospace";
  const [filter, setFilter] = useState('all');
  const cats = ['all', 'player', 'monster', 'weapon', 'ammo', 'health', 'key', 'decor'];
  const items = filter === 'all' ? DOOM_THING_TYPES : DOOM_THING_TYPES.filter(t => t.cat === filter);
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: '#000a' }} onClick={onCancel}>
      <div className="w-full rounded-t-lg flex flex-col"
        style={{ background: COLORS.bgPanel, border: '1px solid ' + COLORS.border, maxHeight: '70%', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b" style={{ borderColor: COLORS.border }}>
          <div style={{ color: COLORS.amber, fontFamily: monoStack, fontSize: 13 }}>PLACE THING</div>
        </div>
        <div className="flex gap-1 p-2 overflow-x-auto" style={{ flexShrink: 0 }}>
          {cats.map(c => (
            <button key={c} onClick={() => setFilter(c)}
              className="px-3 py-1 rounded text-xs whitespace-nowrap"
              style={{
                background: filter === c ? COLORS.amber : 'transparent',
                color: filter === c ? COLORS.bg : COLORS.text,
                border: '1px solid ' + (filter === c ? COLORS.amber : COLORS.border),
                fontFamily: monoStack, letterSpacing: '0.05em', textTransform: 'uppercase'
              }}>{c}</button>
          ))}
        </div>
        <div className="flex-1 overflow-y-auto px-2 pb-2">
          {items.map(t => (
            <button key={t.id} onClick={() => onPick(t.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded"
              style={{ background: 'transparent', color: COLORS.text, borderBottom: '1px solid ' + COLORS.border, fontFamily: monoStack, fontSize: 13, textAlign: 'left' }}>
              <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 5, background: THING_COLORS[t.cat] }} />
              <span style={{ flex: 1 }}>{t.name}</span>
              <span style={{ color: COLORS.textDim, fontSize: 11 }}>#{t.id}</span>
            </button>
          ))}
        </div>
        <button onClick={onCancel} className="m-3 py-2 rounded"
          style={{ background: 'transparent', color: COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: monoStack, letterSpacing: '0.05em' }}>
          CANCEL
        </button>
      </div>
    </div>
  );
}

function CheckModal({ issues, onSelect, onClose }) {
  const monoStack = "'JetBrains Mono', monospace";
  const errors = issues.filter(i => i.kind === 'error');
  const warnings = issues.filter(i => i.kind === 'warning');
  const okay = issues.length === 0;
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: '#000a' }} onClick={onClose}>
      <div className="w-full rounded-t-lg flex flex-col"
        style={{ background: COLORS.bgPanel, border: '1px solid ' + COLORS.border, maxHeight: '75%', paddingBottom: 'env(safe-area-inset-bottom)' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: COLORS.border }}>
          <div>
            <div style={{ color: COLORS.amber, fontFamily: monoStack, fontSize: 13 }}>MAP CHECK</div>
            <div style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 10 }}>
              {okay ? 'No issues found' : `${errors.length} error${errors.length === 1 ? '' : 's'} · ${warnings.length} warning${warnings.length === 1 ? '' : 's'}`}
            </div>
          </div>
          <button onClick={onClose} style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 11 }}>CLOSE</button>
        </div>
        <div className="flex-1 overflow-y-auto p-2">
          {okay && (
            <div className="p-4 text-center" style={{ color: COLORS.accent, fontFamily: monoStack, fontSize: 13 }}>
              ✓ Looks good. Save and play.
            </div>
          )}
          {issues.map((iss, i) => (
            <button key={i}
              onClick={() => onSelect(iss.where)}
              className="w-full text-left rounded my-1 px-3 py-2"
              style={{
                background: iss.kind === 'error' ? '#2a1820' : '#1f2233',
                border: '1px solid ' + (iss.kind === 'error' ? COLORS.danger : COLORS.amber),
                fontFamily: monoStack, fontSize: 11,
                color: iss.kind === 'error' ? COLORS.danger : COLORS.amber,
              }}>
              <span style={{ fontWeight: 600, marginRight: 6 }}>
                {iss.kind === 'error' ? 'ERR' : 'WARN'}
              </span>
              <span style={{ color: COLORS.text }}>{iss.text}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function ShareInstructions({ fileName, onClose }) {
  const monoStack = "'JetBrains Mono', monospace";
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center px-6"
      style={{ background: '#000c', backdropFilter: 'blur(6px)' }} onClick={onClose}>
      <div className="max-w-sm w-full rounded-lg p-5"
        style={{ background: COLORS.bgPanel, border: '1px solid ' + COLORS.border }}
        onClick={e => e.stopPropagation()}>
        <div className="text-xs tracking-widest mb-1" style={{ color: COLORS.amber, letterSpacing: '0.2em', fontFamily: monoStack }}>↓ DOWNLOADED</div>
        <div className="text-lg font-semibold mb-3" style={{ color: COLORS.text }}>Now load it in GZDoom</div>
        <div className="text-sm mb-4" style={{ color: COLORS.textDim, lineHeight: 1.55, fontFamily: monoStack }}>
          <span style={{ color: COLORS.text }}>{fileName}</span> saved to your Downloads.
        </div>
        <ol className="text-sm pl-1 mb-5 space-y-2" style={{ color: COLORS.text, fontFamily: monoStack, lineHeight: 1.5 }}>
          <li><span style={{ color: COLORS.amber }}>1.</span> Open the <b>Files</b> app</li>
          <li><span style={{ color: COLORS.amber }}>2.</span> Move the WAD to <b>On My iPhone → GenZD</b></li>
          <li><span style={{ color: COLORS.amber }}>3.</span> Open <b>GenZD</b>, tap the WAD, pick an IWAD</li>
        </ol>
        <button onClick={onClose} className="w-full py-2.5 rounded font-semibold"
          style={{ background: COLORS.amber, color: COLORS.bg, fontFamily: monoStack, letterSpacing: '0.05em' }}>GOT IT</button>
      </div>
    </div>
  );
}

function WelcomeOverlay({ onOpen, onNewOutdoor, onNewInterior, onNewRandom, onNewDungeon }) {
  const monoStack = "'JetBrains Mono', monospace";
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center px-6"
      style={{ background: COLORS.bg + 'f0', backdropFilter: 'blur(6px)' }}>
      <div className="max-w-sm w-full rounded-lg p-6"
        style={{ background: COLORS.bgPanel, border: '1px solid ' + COLORS.border }}>
        <div className="text-xs tracking-widest mb-1" style={{ color: COLORS.amber, letterSpacing: '0.2em' }}>JERKWAD V0.21</div>
        <div className="text-2xl font-bold mb-3" style={{ color: COLORS.text }}>Touch-first DOOM editor</div>
        <div className="text-sm mb-5" style={{ color: COLORS.textDim, fontFamily: monoStack, lineHeight: 1.5 }}>
          Long-press for menus. Two-finger tap = undo. Random dungeon drops a closed playable map with corridors and doors.
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onNewDungeon} className="py-3 rounded font-semibold"
            style={{ background: COLORS.amber, color: COLORS.bg, fontFamily: monoStack, letterSpacing: '0.05em' }}>⚔ RANDOM DUNGEON</button>
          <button onClick={onNewRandom} className="py-2.5 rounded font-semibold"
            style={{ background: 'transparent', color: COLORS.amber, border: '1px solid ' + COLORS.amber, fontFamily: monoStack, letterSpacing: '0.05em' }}>⚄ RANDOM WORLD</button>
          <button onClick={onNewOutdoor} className="py-2.5 rounded font-semibold"
            style={{ background: 'transparent', color: COLORS.accent, border: '1px solid ' + COLORS.accent, fontFamily: monoStack, letterSpacing: '0.05em' }}>NEW · OUTDOOR</button>
          <button onClick={onNewInterior} className="py-2 rounded"
            style={{ background: 'transparent', color: COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: monoStack, letterSpacing: '0.05em' }}>NEW · INTERIOR</button>
          <button onClick={onOpen} className="py-2 rounded"
            style={{ background: 'transparent', color: COLORS.textDim, border: '1px solid ' + COLORS.border, fontFamily: monoStack, letterSpacing: '0.05em' }}>OPEN .WAD</button>
        </div>
      </div>
    </div>
  );
}
