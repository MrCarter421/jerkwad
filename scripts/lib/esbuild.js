// Resolve esbuild from wherever it happens to live.
//
// The build scripts were written inside a sandbox where esbuild sat at
// /tmp/node_modules/esbuild. On a normal machine it won't, so try the usual
// places in order and give an actionable error instead of a stack trace.
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');

const CANDIDATES = [
  process.env.ESBUILD,                          // explicit override wins
  'esbuild',                                    // normal resolution / node_modules
  path.join(ROOT, 'node_modules', 'esbuild'),
  path.join(ROOT, '.deploy-tools', 'node_modules', 'esbuild'),
  '/tmp/node_modules/esbuild',                  // the original sandbox path
].filter(Boolean);

module.exports = function loadEsbuild() {
  for (const c of CANDIDATES) {
    try { return require(c); } catch (e) { /* try the next one */ }
  }
  throw new Error(
    'esbuild not found. Install it with:\n' +
    '    npm install esbuild\n' +
    '  or point at an existing copy:\n' +
    '    ESBUILD=/path/to/node_modules/esbuild node ' +
    path.relative(process.cwd(), process.argv[1] || 'scripts/build_app.js') + '\n' +
    '  (scripts/deploy.js installs it for you if it is missing.)'
  );
};
