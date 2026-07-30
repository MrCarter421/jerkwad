// Splices the minified app bundle into the deployed index.html.
//
// index.html loads React 18 UMD from unpkg, then runs the whole app inline
// between the exact marker lines `      try {` and `      } catch (e) {`
// inside its boot script, and mounts ShapeShifterApp. Never hand-edit the
// embedded JS — run scripts/build_app.js then this.
//
//   node scripts/build_app.js /tmp/app.js && node scripts/build_html.js /tmp/app.js
const fs = require('fs');
const path = require('path');
const ROOT = path.join(__dirname, '..');
const APP = process.argv[2] || '/tmp/app.js';

const app = fs.readFileSync(APP, 'utf8');
const lines = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').split('\n');

const OPEN = '      try {', CLOSE = '      } catch (e) {';
const a = lines.indexOf(OPEN), b = lines.indexOf(CLOSE);
if (a < 0 || b < 0 || b <= a) throw new Error('boot-script markers not found in index.html');

const body = [
  OPEN,
  app,
  '         var rootEl = document.getElementById("root");',
  '         var root = ReactDOM.createRoot(rootEl);',
  '         root.render(React.createElement(ShapeShifterApp));',
];
const out = [...lines.slice(0, a), ...body, ...lines.slice(b)]
  .join('\n')
  .replace(/<meta name="jerkwad-build" content="[^"]*">/,
    '<meta name="jerkwad-build" content="' + new Date().toISOString() + '">');

fs.writeFileSync(path.join(ROOT, 'index.html'), out);
console.log('index.html rebuilt (' + out.length + ' bytes, app ' + app.length + ')');
