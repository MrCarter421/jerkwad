// wad_editor.jsx -> minified app bundle for the deployed index.html.
// (Previously a throwaway /tmp script; committed so the build is reproducible.)
const fs = require('fs');
const path = require('path');
const esbuild = require(process.env.ESBUILD || '/tmp/node_modules/esbuild');
const ROOT = path.join(__dirname, '..');
const OUT = process.argv[2] || '/tmp/app.js';

const src = fs.readFileSync(path.join(ROOT, 'wad_editor.jsx'), 'utf8')
  .replace(/^import React.*from 'react';$/m,
    'const { useState, useRef, useEffect, useCallback, useMemo, useReducer } = React;')
  .replace(/^export default /m, '');

const out = esbuild.transformSync(src, { loader: 'jsx', minify: true, target: 'es2017' }).code;
fs.writeFileSync(OUT, out);
console.log(OUT + ' bytes: ' + out.length);
