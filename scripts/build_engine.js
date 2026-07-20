// Builds arena/engine.js — a standalone React-free bundle of the JerkWad
// generator pipeline for the arena page (and any non-React consumer).
const fs = require('fs');
const esbuild = require('/tmp/node_modules/esbuild');
let src = fs.readFileSync('/home/user/jerkwad/wad_editor.jsx', 'utf8');
src = src.replace(/^import React.*from 'react';$/m,
  'const React = { createElement: () => null };\n' +
  'const useState = () => [null, () => {}]; const useRef = () => ({ current: null });\n' +
  'const useEffect = () => {}; const useCallback = (f) => f; const useMemo = (f) => f();\n' +
  'const useReducer = () => [0, () => {}];');
src = src.replace(/^export default /m, '');
src += `
// ---- public engine surface (arena page) ----
window.JerkwadEngine = {
  generateShapeShifterMap, buildWad, etherGenerateLevel,
  SHAPESHIFTER_PRESETS, ETHER_MONSTERS, ETHER_GOODIES,
  buildSectorLoops,
};
`;
const out = esbuild.transformSync(src, { loader: 'jsx', minify: true, target: 'es2017' });
fs.writeFileSync('/home/user/jerkwad/arena/engine.js', out.code);
console.log('arena/engine.js bytes: ' + out.code.length);
