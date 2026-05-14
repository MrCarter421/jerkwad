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
  { id: 'build', label: 'Build', glyph: '✎' },
  { id: 'thing', label: 'Thing', glyph: '◉' },
];
const COLORS = {
  bg: '#0a0e1a', bgPanel: '#0f1626', bgPanel2: '#152033',
  grid: '#1a2842', gridMajor: '#243759',
  vertex: '#ff9d3d', vertexSelected: '#ffd84a', vertexDraw: '#7fffd4',
  thing: '#ff5c5c',
  text: '#c5d4e8', textDim: '#6b7d99',
  accent: '#7fffd4', amber: '#ff9d3d', border: '#243759', danger: '#ff5c5c',
};

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
function buildWad(maps) {
  const lumpsToWrite = [];
  for (const [mapName, m] of Object.entries(maps)) {
    const vIdx = new Map(m.vertices.map((v, i) => [v.id, i]));
    const sdIdx = new Map(m.sidedefs.map((s, i) => [s.id, i]));
    const secIdx = new Map(m.sectors.map((s, i) => [s.id, i]));
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

    const vBuf = new ArrayBuffer(m.vertices.length * 4);
    const vv = new DataView(vBuf);
    m.vertices.forEach((v, i) => { vv.setInt16(i * 4, v.x | 0, true); vv.setInt16(i * 4 + 2, v.y | 0, true); });
    lumpsToWrite.push({ name: 'VERTEXES', data: new Uint8Array(vBuf) });

    lumpsToWrite.push({ name: 'SEGS', data: new Uint8Array(0) });
    lumpsToWrite.push({ name: 'SSECTORS', data: new Uint8Array(0) });
    lumpsToWrite.push({ name: 'NODES', data: new Uint8Array(0) });

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
    lumpsToWrite.push({ name: 'REJECT', data: new Uint8Array(0) });
    lumpsToWrite.push({ name: 'BLOCKMAP', data: new Uint8Array(0) });
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

// ============================================================================
// TOPOLOGY RESOLVER
// ============================================================================
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
function stampShape(map, snap, worldPts) {
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
  return buildSectorFromLoop(stagedMap, chain);
}

// ============================================================================
// FURNITURE MACROS
// ============================================================================
function macroDoor(map, lineId, kind = 'normal') {
  const ld = map.linedefs.find(l => l.id === lineId);
  if (!ld) return null;
  if (!ld.back || ld.back === -1) return { error: 'Door needs a two-sided line.' };
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
    if (sd.id === ld.front) return { ...sd, upper: 'BIGDOOR2' };
    if (sd.id === ld.back) return { ...sd, upper: 'BIGDOOR2' };
    return sd;
  });
  return { ...map, linedefs: trackLines, sidedefs: finalSidedefs, sectors: nextSectors };
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
// MAIN COMPONENT
// ============================================================================
export default function WadEditor() {
  const [doc, setDoc] = useState(() => ({
    maps: { 'MAP01': outdoorStarter() }, currentMap: 'MAP01', fileName: 'untitled.wad'
  }));
  const [mode, setMode] = useState('build');
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
      for (let i = 0; i < n; i++) {
        const px = cx - w / 2 + (i + 0.5) * stepW;
        const result = stampShape(working, snap, rectVertices(px, cy, stepW, h));
        if (!result) continue;
        result.sectors = result.sectors.map(s => s.id === result.createdSectorId
          ? { ...s, floorH: s.floorH + (i + 1) * rise, floorTex: 'STEP1' } : s);
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
    if (mode === 'thing') {
      const t = hitThing(sx, sy);
      if (t) { setSelection({ type: 'thing', id: t.id }); return; }
      const sn = snapWorld(w.x, w.y);
      setThingPicker({ x: sn.x, y: sn.y });
      return;
    }
    if (drawChain.length > 0) { placeOrExtendDraw(w.x, w.y); return; }
    const t = hitThing(sx, sy);
    if (t) { setSelection({ type: 'thing', id: t.id }); return; }
    const v = hitVertex(sx, sy);
    if (v) { setSelection({ type: 'vertex', id: v.id }); return; }
    const ld = hitLinedef(sx, sy);
    if (ld) { setSelection({ type: 'linedef', id: ld.id }); return; }
    const secId = hitSector(sx, sy);
    if (secId) { setSelection({ type: 'sector', id: secId }); return; }
    // Empty space + no active chain: deselect. Drawing must be initiated via
    // long-press radial -> Draw, so a finger landing in empty space doesn't
    // accidentally start a chain.
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
    setDoc({ maps: { 'MAP01': kind === 'interior' ? interiorStarter() : outdoorStarter() }, currentMap: 'MAP01', fileName: 'untitled.wad' });
    setSelection(null); setDrawChain([]);
    setView({ x: 0, y: 0, zoom: kind === 'interior' ? 0.6 : 0.2 });
    setWelcomeOpen(false);
  };
  const addNewMapSlot = (kind = 'outdoor') => {
    setDoc(d => {
      let n = 1; while (d.maps['MAP' + String(n).padStart(2, '0')]) n++;
      const name = 'MAP' + String(n).padStart(2, '0');
      return { ...d, maps: { ...d.maps, [name]: kind === 'interior' ? interiorStarter() : outdoorStarter() }, currentMap: name };
    });
    setMapMenuOpen(false);
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
      if (e.key === '1') setMode('build');
      if (e.key === '2') setMode('thing');
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
    }
  }

  return (
    <div ref={containerRef}
      className="w-full h-screen flex flex-col overflow-hidden select-none"
      style={{ background: COLORS.bg, color: COLORS.text, fontFamily: fontStack, touchAction: 'none' }}>
      <div className="flex items-center justify-between px-2 py-1.5 border-b"
        style={{ borderColor: COLORS.border, background: COLORS.bgPanel, flexShrink: 0 }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-xs font-bold tracking-widest" style={{ color: COLORS.amber, letterSpacing: '0.18em' }}>JERKWAD</div>
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
              <button onClick={() => {
                let removed = 0;
                updateMap(m => { const r = cleanPhantomSectors(m); removed = r.removed; return r.map; });
                setMapMenuOpen(false);
                setHint(removed > 0 ? 'Cleaned ' + removed + ' phantom sector' + (removed === 1 ? '' : 's') : 'No phantoms found');
              }} className="block w-full text-left px-3 py-2 text-sm" style={{ color: COLORS.textDim, borderTop: '1px solid ' + COLORS.border }}>⌫ clean phantoms</button>
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

        {mode === 'build' && drawChain.length > 0 && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded text-xs"
            style={{ background: COLORS.bgPanel + 'ee', border: '1px solid ' + COLORS.border, fontFamily: monoStack, color: COLORS.accent }}>
            {drawChain.length < 3 ? 'Tap to add line' : 'Tap start to close → sector'}
          </div>
        )}
        {hint && (
          <div className="absolute top-2 left-2 px-2.5 py-1 rounded text-xs"
            style={{ background: COLORS.amber, color: COLORS.bg, fontFamily: monoStack }}>{hint}</div>
        )}

        {selObj && selection.type === 'sector' && !propsOpen && (
          <QuickEditPills sector={selObj}
            onChange={(patch) => updateMap(m => ({ ...m, sectors: m.sectors.map(s => s.id === selection.id ? { ...s, ...patch } : s) }))}
            onOpenFull={() => setPropsOpen(true)} onClose={() => setSelection(null)} monoStack={monoStack} />
        )}
        {selObj && selection.type === 'linedef' && !propsOpen && (
          <QuickLinePills line={selObj}
            onChange={(patch) => updateMap(m => ({ ...m, linedefs: m.linedefs.map(l => l.id === selection.id ? { ...l, ...patch } : l) }))}
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
          onStampRect={(w, h) => {
            const cv = screenToWorld(canvasRef.current.clientWidth / 2, canvasRef.current.clientHeight / 2);
            const sn = snapWorld(cv.x, cv.y);
            stampRect(sn.x, sn.y, w, h);
            setStampSheet(null);
          }}
          onStampNgon={(r, n) => {
            const cv = screenToWorld(canvasRef.current.clientWidth / 2, canvasRef.current.clientHeight / 2);
            const sn = snapWorld(cv.x, cv.y);
            stampNgon(sn.x, sn.y, r, n);
            setStampSheet(null);
          }}
          onStampStairs={(w, h, n, rise) => {
            const cv = screenToWorld(canvasRef.current.clientWidth / 2, canvasRef.current.clientHeight / 2);
            const sn = snapWorld(cv.x, cv.y);
            stampStairs(sn.x, sn.y, w, h, n, rise);
            setStampSheet(null);
          }}
          onClose={() => setStampSheet(null)} />
      )}
      {stampSheet === 'furniture' && (
        <FurnitureSheet selection={selection}
          onApply={(kind) => { applyFurniture(kind); setStampSheet(null); }}
          onClose={() => setStampSheet(null)} />
      )}
      {shareModal && <ShareInstructions fileName={shareModal.fileName} onClose={() => setShareModal(null)} />}
      {welcomeOpen && (
        <WelcomeOverlay onOpen={() => fileInputRef.current?.click()}
          onNewOutdoor={() => onNewMap('outdoor')} onNewInterior={() => onNewMap('interior')} />
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

function QuickEditPills({ sector, onChange, onOpenFull, onClose, monoStack }) {
  return (
    <div className="absolute left-2 right-2 flex gap-1 flex-wrap" style={{ bottom: 10 }}>
      <ScrubPill label="F" value={sector.floorH} step={8} onChange={v => onChange({ floorH: v })} monoStack={monoStack} />
      <ScrubPill label="C" value={sector.ceilH} step={8} onChange={v => onChange({ ceilH: v })} monoStack={monoStack} />
      <ScrubPill label="LT" value={sector.light} step={16} min={0} max={255} onChange={v => onChange({ light: v })} monoStack={monoStack} />
      <ScrubPill label="TAG" value={sector.tag} step={1} onChange={v => onChange({ tag: v })} monoStack={monoStack} />
      <button onClick={onOpenFull}
        className="px-2 py-1 rounded text-xs"
        style={{ background: COLORS.bgPanel + 'ee', color: COLORS.accent, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>
        {(sector.floorTex || '').slice(0, 8)} ▸
      </button>
      <button onClick={onClose}
        className="px-2 py-1 rounded text-xs"
        style={{ background: COLORS.bgPanel + 'ee', color: COLORS.textDim, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>✕</button>
    </div>
  );
}
function QuickLinePills({ line, onChange, onOpenFull, onClose, monoStack }) {
  const isTwoSided = (line.flags & 4) !== 0;
  const isImpassable = (line.flags & 1) !== 0;
  return (
    <div className="absolute left-2 right-2 flex gap-1 flex-wrap" style={{ bottom: 10 }}>
      <ScrubPill label="SP" value={line.special} step={1} onChange={v => onChange({ special: v })} monoStack={monoStack} />
      <ScrubPill label="TAG" value={line.tag} step={1} onChange={v => onChange({ tag: v })} monoStack={monoStack} />
      <button onClick={() => onChange({ flags: line.flags ^ 1 })}
        className="px-2 py-1 rounded text-xs"
        style={{ background: isImpassable ? COLORS.amber : COLORS.bgPanel + 'ee', color: isImpassable ? COLORS.bg : COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>
        IMP
      </button>
      <button onClick={() => onChange({ flags: line.flags ^ 4 })}
        className="px-2 py-1 rounded text-xs"
        style={{ background: isTwoSided ? COLORS.amber : COLORS.bgPanel + 'ee', color: isTwoSided ? COLORS.bg : COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>
        2S
      </button>
      <button onClick={onOpenFull}
        className="px-2 py-1 rounded text-xs"
        style={{ background: COLORS.bgPanel + 'ee', color: COLORS.accent, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>FLAGS ▸</button>
      <button onClick={onClose}
        className="px-2 py-1 rounded text-xs"
        style={{ background: COLORS.bgPanel + 'ee', color: COLORS.textDim, border: '1px solid ' + COLORS.border, fontFamily: monoStack }}>✕</button>
    </div>
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
      { id: 'start-draw', label: 'Draw', glyph: '✎' },
      { id: 'place-thing', label: 'Thing', glyph: '◉' },
      { id: 'stamp-shape', label: 'Shape', glyph: '◫' },
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

function ShapeSheet({ onStampRect, onStampNgon, onStampStairs, onClose }) {
  const monoStack = "'JetBrains Mono', monospace";
  const [rectW, setRectW] = useState(256);
  const [rectH, setRectH] = useState(256);
  const [ngonR, setNgonR] = useState(128);
  const [ngonN, setNgonN] = useState(6);
  const [stW, setStW] = useState(256);
  const [stH, setStH] = useState(128);
  const [stN, setStN] = useState(4);
  const [stRise, setStRise] = useState(16);
  return (
    <div className="absolute inset-0 z-50 flex items-end" style={{ background: '#000a' }} onClick={onClose}>
      <div className="w-full rounded-t-lg flex flex-col"
        style={{ background: COLORS.bgPanel, border: '1px solid ' + COLORS.border, paddingBottom: 'env(safe-area-inset-bottom)', maxHeight: '80%' }}
        onClick={e => e.stopPropagation()}>
        <div className="px-4 py-3 border-b flex items-center justify-between" style={{ borderColor: COLORS.border }}>
          <div style={{ color: COLORS.amber, fontFamily: monoStack, fontSize: 13 }}>SHAPE STAMPS</div>
          <button onClick={onClose} style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 11 }}>CANCEL</button>
        </div>
        <div className="p-4 space-y-4 overflow-y-auto">
          <div>
            <div style={{ color: COLORS.text, fontFamily: monoStack, fontSize: 12, marginBottom: 6 }}>RECTANGLE</div>
            <div className="flex items-center gap-2 flex-wrap">
              <NumInput label="W" value={rectW} onChange={setRectW} mono={monoStack} step={64} />
              <NumInput label="H" value={rectH} onChange={setRectH} mono={monoStack} step={64} />
              <button onClick={() => onStampRect(rectW, rectH)}
                className="ml-auto px-4 py-2 rounded text-xs font-semibold"
                style={{ background: COLORS.amber, color: COLORS.bg, fontFamily: monoStack, letterSpacing: '0.05em' }}>
                STAMP
              </button>
            </div>
          </div>
          <div>
            <div style={{ color: COLORS.text, fontFamily: monoStack, fontSize: 12, marginBottom: 6 }}>POLYGON</div>
            <div className="flex items-center gap-2 flex-wrap">
              <NumInput label="R" value={ngonR} onChange={setNgonR} mono={monoStack} step={32} />
              <NumInput label="N" value={ngonN} onChange={v => setNgonN(Math.max(3, Math.min(24, v)))} mono={monoStack} step={1} />
              <button onClick={() => onStampNgon(ngonR, ngonN)}
                className="ml-auto px-4 py-2 rounded text-xs font-semibold"
                style={{ background: COLORS.amber, color: COLORS.bg, fontFamily: monoStack, letterSpacing: '0.05em' }}>
                STAMP
              </button>
            </div>
          </div>
          <div>
            <div style={{ color: COLORS.text, fontFamily: monoStack, fontSize: 12, marginBottom: 6 }}>STAIRS</div>
            <div className="flex items-center gap-2 flex-wrap">
              <NumInput label="W" value={stW} onChange={setStW} mono={monoStack} step={32} />
              <NumInput label="H" value={stH} onChange={setStH} mono={monoStack} step={32} />
              <NumInput label="N" value={stN} onChange={v => setStN(Math.max(2, Math.min(16, v)))} mono={monoStack} step={1} />
              <NumInput label="RISE" value={stRise} onChange={setStRise} mono={monoStack} step={8} />
              <button onClick={() => onStampStairs(stW, stH, stN, stRise)}
                className="ml-auto px-4 py-2 rounded text-xs font-semibold"
                style={{ background: COLORS.amber, color: COLORS.bg, fontFamily: monoStack, letterSpacing: '0.05em' }}>
                STAMP
              </button>
            </div>
          </div>
          <div style={{ color: COLORS.textDim, fontFamily: monoStack, fontSize: 10, paddingTop: 4 }}>
            Stamps at canvas center. Toggle XFORM after to scale or drag vertices.
          </div>
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
      <FieldText label="Upper" value={sd.upper} onChange={v => onChange({ upper: v })} />
      <FieldText label="Middle" value={sd.middle} onChange={v => onChange({ middle: v })} />
      <FieldText label="Lower" value={sd.lower} onChange={v => onChange({ lower: v })} />
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
    <FieldText label="Floor Tex" value={obj.floorTex} onChange={v => onChange({ floorTex: v })} />
    <FieldText label="Ceil Tex" value={obj.ceilTex} onChange={v => onChange({ ceilTex: v })} />
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

function WelcomeOverlay({ onOpen, onNewOutdoor, onNewInterior }) {
  const monoStack = "'JetBrains Mono', monospace";
  return (
    <div className="absolute inset-0 z-40 flex items-center justify-center px-6"
      style={{ background: COLORS.bg + 'f0', backdropFilter: 'blur(6px)' }}>
      <div className="max-w-sm w-full rounded-lg p-6"
        style={{ background: COLORS.bgPanel, border: '1px solid ' + COLORS.border }}>
        <div className="text-xs tracking-widest mb-1" style={{ color: COLORS.amber, letterSpacing: '0.2em' }}>JERKWAD V0.4</div>
        <div className="text-2xl font-bold mb-3" style={{ color: COLORS.text }}>Touch-first DOOM editor</div>
        <div className="text-sm mb-5" style={{ color: COLORS.textDim, fontFamily: monoStack, lineHeight: 1.5 }}>
          Build mode draws lines, closes them into sectors. Long-press for radial menus. Two-finger tap = undo. Stamps add prefabs.
        </div>
        <div className="flex flex-col gap-2">
          <button onClick={onNewOutdoor} className="py-3 rounded font-semibold"
            style={{ background: COLORS.amber, color: COLORS.bg, fontFamily: monoStack, letterSpacing: '0.05em' }}>NEW · OUTDOOR</button>
          <button onClick={onNewInterior} className="py-2.5 rounded font-semibold"
            style={{ background: 'transparent', color: COLORS.accent, border: '1px solid ' + COLORS.accent, fontFamily: monoStack, letterSpacing: '0.05em' }}>NEW · INTERIOR</button>
          <button onClick={onOpen} className="py-2 rounded"
            style={{ background: 'transparent', color: COLORS.text, border: '1px solid ' + COLORS.border, fontFamily: monoStack, letterSpacing: '0.05em' }}>OPEN .WAD</button>
        </div>
      </div>
    </div>
  );
}
