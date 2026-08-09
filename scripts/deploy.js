#!/usr/bin/env node
// ============================================================================
// JerkWad deploy wizard.
//
//   node scripts/deploy.js               interactive, does everything
//   node scripts/deploy.js --dry-run     do everything except upload/deploy
//   node scripts/deploy.js --yes         no prompts (CI / repeat deploys)
//   node scripts/deploy.js --code-only   skip the 30 MB engine+IWAD payload
//   node scripts/deploy.js --site        site only, don't touch the Worker
//   node scripts/deploy.js --worker      Worker only, don't touch the site
//   node scripts/deploy.js --skip-tests  build+ship without validating (asks twice)
//
// Site upload target lives in .deploy.json (gitignored, created on first run).
// NO PASSWORDS: rsync/sftp use your SSH key or prompt at the terminal, and
// nothing you type is written to disk.
// ============================================================================
'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync, spawnSync } = require('child_process');
const readline = require('readline');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const CONFIG = path.join(ROOT, '.deploy.json');

// ---------------------------------------------------------------------------
// The publish set. This list is the security boundary: anything NOT named here
// never reaches the web host. Notably absent — and deliberately so —
//   .git/          full history, clonable by anyone if it lands in the webroot
//   workers/       Worker source; belongs on Cloudflare, not in your webroot
//   scripts/       build + test tooling
//   wad_editor.jsx the unminified source (index.html already embeds it)
//   *.md           internal notes
//   .deploy.json   your own host/path settings
// ---------------------------------------------------------------------------
const PUBLISH = {
  code: [
    'index.html',
    '.nojekyll',
    'arena/index.html',
    'arena/engine.js',
    'play/index.html',
  ],
  // Big, rarely-changed binaries. --code-only skips these; the first deploy
  // to a new host must include them.
  assets: [
    'play/fast-doom.js',
    'play/fast-doom.wasm',
    'play/websockets-doom.js',
    'play/websockets-doom.wasm',
    'play/freedoom2.wad',
  ],
};

const ARGS = new Set(process.argv.slice(2));
const DRY = ARGS.has('--dry-run');
const YES = ARGS.has('--yes');
const CODE_ONLY = ARGS.has('--code-only');
const SKIP_TESTS = ARGS.has('--skip-tests');
const ONLY_SITE = ARGS.has('--site');
const ONLY_WORKER = ARGS.has('--worker');

// ---- output helpers -------------------------------------------------------
const tty = process.stdout.isTTY;
const c = (n, s) => (tty ? `\x1b[${n}m${s}\x1b[0m` : s);
const bold = s => c('1', s), dim = s => c('2', s);
const green = s => c('32', s), red = s => c('31', s);
const yellow = s => c('33', s), cyan = s => c('36', s);

let STEP = 0;
const step = (t) => console.log('\n' + bold(cyan(`[${++STEP}] ${t}`)));
const ok = (t) => console.log('    ' + green('✓') + ' ' + t);
const warn = (t) => console.log('    ' + yellow('!') + ' ' + t);
const fail = (t) => console.log('    ' + red('✗') + ' ' + t);
const info = (t) => console.log('    ' + dim(t));
const die = (t) => { console.log('\n' + red(bold('DEPLOY ABORTED')) + ' — ' + t + '\n'); process.exit(1); };

function ask(q, def) {
  if (YES) return def;
  if (!tty) return def;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(res => rl.question('    ' + bold(q) + ' ', a => { rl.close(); res(a.trim() || def); }));
}
async function confirm(q, def = false) {
  const a = await ask(q + (def ? ' [Y/n]' : ' [y/N]'), def ? 'y' : 'n');
  return /^y/i.test(String(a));
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, encoding: 'utf8', ...opts });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || ''), err: r.error };
}
const has = (cmd) => {
  const probe = process.platform === 'win32' ? 'where' : 'command';
  const r = process.platform === 'win32'
    ? spawnSync('where', [cmd], { encoding: 'utf8' })
    : spawnSync('sh', ['-c', 'command -v ' + cmd], { encoding: 'utf8' });
  return r.status === 0 && (r.stdout || '').trim().length > 0;
};
const human = (n) => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB'
  : n > 1024 ? (n / 1024).toFixed(0) + ' KB' : n + ' B';

// ===========================================================================
(async function main() {
  console.log(bold('\n  JERKWAD DEPLOY WIZARD') + dim('  ' + ROOT));
  if (DRY) console.log('  ' + yellow(bold('DRY RUN')) + dim(' — builds and stages, uploads nothing'));

  // ---- 1. preflight -------------------------------------------------------
  step('Preflight');

  const major = +process.versions.node.split('.')[0];
  if (major < 16) die(`Node ${process.versions.node} is too old; need 16+.`);
  ok(`node ${process.versions.node}`);

  try {
    require('./lib/esbuild')();
    ok('esbuild available');
  } catch (e) {
    warn('esbuild not installed (needed to build the app bundle)');
    if (!DRY && await confirm('Install esbuild now with npm?', true)) {
      const r = run('npm', ['install', '--no-save', 'esbuild'], { stdio: 'inherit' });
      if (r.code !== 0) die('npm install esbuild failed.');
      ok('esbuild installed');
    } else die('esbuild is required. Run: npm install esbuild');
  }

  const branch = (run('git', ['rev-parse', '--abbrev-ref', 'HEAD']).out || '').trim();
  const dirty = (run('git', ['status', '--porcelain']).out || '').trim();
  info(`branch ${branch || '(unknown)'}`);
  if (dirty) {
    warn(`${dirty.split('\n').length} uncommitted change(s) — you will deploy your WORKING TREE, not the last commit`);
    if (!await confirm('Continue anyway?', true)) die('Commit or stash first.');
  } else ok('working tree clean');

  // ---- 2. build -----------------------------------------------------------
  const doSite = !ONLY_WORKER;
  const doWorker = !ONLY_SITE;

  if (doSite) {
    step('Build');
    const app = path.join(os.tmpdir(), 'jerkwad-app.js');
    for (const [label, args] of [
      ['app bundle', ['scripts/build_app.js', app]],
      ['index.html', ['scripts/build_html.js', app]],
      ['arena/engine.js', ['scripts/build_engine.js']],
    ]) {
      const r = run(process.execPath, args);
      if (r.code !== 0) { console.log(r.out); die(`build failed at ${label}`); }
      ok(`${label} ${dim(r.out.trim().split('\n').pop() || '')}`);
    }

    // index.html and arena/engine.js are both generated from wad_editor.jsx.
    // If they ever came from DIFFERENT source revisions, hosts and joiners
    // would generate different WADs and Chocolate Doom's inter-peer SHA1
    // check would reject every netgame. Rebuilding both above guarantees
    // they match; report the version so a wrong one is visible.
    // Anchor on the header <span>, not the first V0.xx in the file — most of
    // those are comments citing when a fix landed. WadEditor (the legacy
    // JerkWad view) carries its own frozen V0.21, so take the highest.
    const src = fs.readFileSync(path.join(ROOT, 'wad_editor.jsx'), 'utf8');
    const found = [...src.matchAll(/V0\.(\d+)<\/span>/g)].map(m => +m[1]);
    if (!found.length) die('no V0.xx</span> version header found in wad_editor.jsx');
    const ver = 'V0.' + Math.max(...found);
    const inHtml = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8').includes(ver);
    inHtml ? ok(`version ${bold(ver)} embedded in index.html`)
           : die(`index.html does not contain ${ver} — build did not take`);
  }

  // ---- 3. validate --------------------------------------------------------
  if (doSite) {
    step('Validate');
    if (SKIP_TESTS) {
      warn('--skip-tests: shipping an UNVALIDATED build');
      if (!await confirm('Really skip the validators?', false)) die('Good call. Re-run without --skip-tests.');
    } else {
      const CHECKS = [
        ['topology + WAD lumps', ['scripts/check-load.js', '14', '4']],
        ['texture namespaces',   ['scripts/check-textures.js', '10', '14']],
        ['sky bleed / door tops',['scripts/check-skybleed.js', '10', '14']],
        ['T-junctions / cracks', ['scripts/check-tjunctions.js', '8', '14']],
        ['spawn safety',         ['scripts/check-spawns.js']],
        ['room reachability',    ['scripts/check-reachability.js']],
        ['player layout + audio', ['scripts/check-player-layout.js']],
      ];
      let bad = 0;
      for (const [label, args] of CHECKS) {
        if (!fs.existsSync(path.join(ROOT, args[0]))) { warn(`${label} — script missing, skipped`); continue; }
        const r = run(process.execPath, args);
        // exit 2 means the check could not run here (e.g. no browser). Say so
        // plainly rather than counting it as a pass.
        if (r.code === 2) warn(label + ' — ' + (r.out.trim().split('\n').pop() || 'skipped'));
        else if (r.code === 0) ok(label);
        else { bad++; fail(label); console.log(dim(r.out.split('\n').slice(-14).join('\n'))); }
      }
      if (bad) {
        warn(`${bad} validator(s) failed — this build has known-broken levels`);
        if (!await confirm('Deploy anyway?', false)) die('Fix the failures, then re-run.');
      } else ok(bold('all validators passed'));
    }
  }

  // ---- 4. stage -----------------------------------------------------------
  let files = [];
  if (doSite) {
    step('Stage ' + dim('(dist/ — exactly what gets published)'));
    fs.rmSync(DIST, { recursive: true, force: true });
    files = CODE_ONLY ? PUBLISH.code : [...PUBLISH.code, ...PUBLISH.assets];
    let total = 0;
    const missing = [];
    for (const rel of files) {
      const src = path.join(ROOT, rel);
      if (!fs.existsSync(src)) { missing.push(rel); continue; }
      const dst = path.join(DIST, rel);
      fs.mkdirSync(path.dirname(dst), { recursive: true });
      fs.copyFileSync(src, dst);
      total += fs.statSync(src).size;
    }
    if (missing.length) {
      missing.forEach(m => fail(`missing: ${m}`));
      if (missing.some(m => PUBLISH.code.includes(m))) die('a required file is missing from the repo');
      warn('binary assets missing — first-time visitors will not be able to play');
    }
    files = files.filter(f => !missing.includes(f));
    ok(`${files.length} files, ${human(total)}`);
    if (CODE_ONLY) info('--code-only: engine + IWAD not included (must already be on the host)');

    // The staging directory is the last line of defence. This is an ALLOWLIST,
    // not a blocklist: dist/ must contain exactly the manifest and nothing
    // else. A blocklist was tried first and quietly passed `.gitattributes`
    // (it only matched `.git` as a whole path segment, so `.gitignore`,
    // `.env.local` and friends would all have shipped). Enumerating what MAY
    // be published cannot fail that way.
    const walk = (d, base = '') => fs.readdirSync(d, { withFileTypes: true }).flatMap(e =>
      e.isDirectory() ? walk(path.join(d, e.name), base + e.name + '/') : [base + e.name]);
    const staged = walk(DIST);
    const allowed = new Set([...PUBLISH.code, ...PUBLISH.assets]);
    const extra = staged.filter(f => !allowed.has(f));
    if (extra.length) {
      extra.forEach(f => fail('NOT IN THE PUBLISH MANIFEST: ' + f));
      die('dist/ contains files the manifest does not name — refusing to publish');
    }
    // Second, independent check on the manifest itself, in case someone adds
    // something dangerous to PUBLISH later.
    const DANGEROUS = /(^|\/)\.(git|env|deploy|htpasswd|ssh|aws|npmrc)|(^|\/)(node_modules|workers|scripts)\/|\.(jsx|md|pem|key|toml)$/i;
    const risky = staged.filter(f => DANGEROUS.test(f));
    if (risky.length) {
      risky.forEach(f => fail('MUST NOT PUBLISH: ' + f));
      die('the publish manifest names a file that must never be web-served');
    }
    ok(`${staged.length} staged files all match the manifest ` +
       dim('(no source, secrets, git data or Worker code)'));
  }

  // ---- 5. package ---------------------------------------------------------
  let zipPath = null;
  if (doSite) {
    step('Package');
    zipPath = path.join(ROOT, 'dist-jerkwad.zip');
    fs.rmSync(zipPath, { force: true });
    if (has('zip')) {
      const r = run('zip', ['-qr', zipPath, '.'], { cwd: DIST });
      if (r.code === 0) ok(`dist-jerkwad.zip ${dim(human(fs.statSync(zipPath).size))}`);
      else { warn('zip failed; dist/ is still usable'); zipPath = null; }
    } else { warn('zip not installed — upload dist/ directly'); zipPath = null; }
  }

  // ---- 6. upload ----------------------------------------------------------
  if (doSite) {
    step('Upload site');
    let cfg = null;
    if (fs.existsSync(CONFIG)) {
      try { cfg = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); ok(`using ${path.basename(CONFIG)} (${cfg.method})`); }
      catch (e) { warn('.deploy.json is not valid JSON — ignoring'); }
    }
    if (!cfg && !YES && tty) cfg = await setupConfig();

    if (!cfg) {
      warn('no upload target configured — finishing with a manual handoff');
      manualInstructions(zipPath);
    } else if (DRY) {
      info(`would upload via ${cfg.method} to ${cfg.host}:${cfg.remotePath}`);
    } else {
      const done = await upload(cfg, files);
      if (!done) manualInstructions(zipPath);
    }
  }

  // ---- 7. worker ----------------------------------------------------------
  if (doWorker) {
    step('Deploy relay Worker ' + dim('(Cloudflare)'));
    const wdir = path.join(ROOT, 'workers', 'doom-relay');
    if (!fs.existsSync(wdir)) { warn('workers/doom-relay not found — skipping'); }
    else {
      const changed = (run('git', ['log', '-1', '--format=%h %s', '--', 'workers/']).out || '').trim();
      info('last Worker change: ' + (changed || 'unknown'));
      const go = DRY ? false : await confirm('Run `npx wrangler deploy` now?', true);
      if (DRY) info('would run: npx wrangler deploy   (in workers/doom-relay)');
      else if (go) {
        info('wrangler runs on THIS machine and uploads to Cloudflare — the web host is not involved');
        const r = spawnSync('npx', ['wrangler', 'deploy'], { cwd: wdir, stdio: 'inherit', shell: process.platform === 'win32' });
        if (r.status === 0) ok('Worker deployed');
        else {
          fail('wrangler deploy failed');
          info('First time?  npx wrangler login  →  npx wrangler secret put DOOM_KEY  →  retry');
          info('code 10097 = use new_sqlite_classes (already set in wrangler.toml)');
          info('code 10063 = claim a workers.dev subdomain once in the Cloudflare dashboard');
        }
      } else info('skipped — site and Worker deploy independently');
    }
  }

  // ---- 8. post-deploy checks ---------------------------------------------
  step('Verify');
  const base = (fs.existsSync(CONFIG) && JSON.parse(fs.readFileSync(CONFIG, 'utf8')).siteUrl) || null;
  if (!base) {
    info('no siteUrl in .deploy.json — check these by hand:');
    info('  the arena page loads and GENERATE produces a map');
    info('  <your site>/.git/HEAD returns 404 (NOT the file contents)');
  } else if (DRY) {
    info('would probe ' + base);
  } else {
    await probe(base);
  }

  console.log('\n' + green(bold('  DONE')) + dim('  dist/ holds exactly what was published\n'));
})().catch(e => die(e && e.stack || String(e)));

// ===========================================================================
async function setupConfig() {
  console.log();
  info('No upload target yet. Set one up? Settings go in .deploy.json (gitignored).');
  info('Passwords are NEVER stored — SSH keys or an interactive prompt only.');
  if (!await confirm('Configure now?', true)) return null;

  const methods = [];
  if (has('rsync') && has('ssh')) methods.push(['rsync', 'rsync over SSH — fastest, uploads only changed files']);
  if (has('sftp')) methods.push(['sftp', 'SFTP batch upload']);
  if (has('curl')) methods.push(['ftp', 'FTP via curl — cPanel default, no SSH needed']);
  methods.push(['manual', 'none — just build the zip, I will upload it myself']);

  console.log();
  methods.forEach(([k, d], i) => console.log(`    ${bold(String(i + 1))}. ${bold(k.padEnd(7))} ${dim(d)}`));
  const pick = await ask(`Method [1-${methods.length}]:`, '1');
  const method = (methods[(+pick || 1) - 1] || methods[0])[0];
  if (method === 'manual') return null;

  const host = await ask('Host (e.g. yuccabucca.com):', '');
  if (!host) return null;
  const user = await ask('Username:', '');
  const remotePath = await ask('Remote path (e.g. public_html/jerkwad):', 'public_html/jerkwad');
  const siteUrl = await ask('Public URL (e.g. https://yuccabucca.com/jerkwad):', 'https://' + host + '/jerkwad');

  const cfg = { method, host, user, remotePath, siteUrl };
  fs.writeFileSync(CONFIG, JSON.stringify(cfg, null, 2) + '\n');
  ok('.deploy.json written ' + dim('(gitignored — never committed)'));
  return cfg;
}

async function upload(cfg, files) {
  const target = `${cfg.user ? cfg.user + '@' : ''}${cfg.host}`;
  if (cfg.method === 'rsync') {
    info(`rsync → ${target}:${cfg.remotePath}`);
    const r = spawnSync('rsync', ['-az', '--delete-after', '--progress',
      DIST + '/', `${target}:${cfg.remotePath}/`], { stdio: 'inherit' });
    if (r.status === 0) { ok('uploaded'); return true; }
    fail('rsync failed'); return false;
  }
  if (cfg.method === 'sftp') {
    const batch = path.join(os.tmpdir(), 'jerkwad-sftp.txt');
    const dirs = [...new Set(files.map(f => path.posix.dirname(f)).filter(d => d !== '.'))];
    fs.writeFileSync(batch, [
      ...dirs.map(d => `-mkdir ${cfg.remotePath}/${d}`),
      ...files.map(f => `put ${path.join(DIST, f)} ${cfg.remotePath}/${f}`),
      'quit',
    ].join('\n') + '\n');
    info(`sftp → ${target}:${cfg.remotePath}`);
    const r = spawnSync('sftp', ['-b', batch, target], { stdio: 'inherit' });
    fs.rmSync(batch, { force: true });
    if (r.status === 0) { ok('uploaded'); return true; }
    fail('sftp failed'); return false;
  }
  if (cfg.method === 'ftp') {
    // curl prompts for the password itself; it is never written to disk or
    // passed on the command line (where `ps` would expose it).
    info(`ftp → ${cfg.host}/${cfg.remotePath}   ${dim('(curl will prompt for the password)')}`);
    let bad = 0;
    for (const f of files) {
      const url = `ftp://${cfg.host}/${cfg.remotePath}/${f}`;
      const r = spawnSync('curl', ['-#', '--ftp-create-dirs', '-u', cfg.user,
        '-T', path.join(DIST, f), url], { stdio: 'inherit' });
      if (r.status !== 0) { bad++; fail('failed: ' + f); }
    }
    if (!bad) { ok(`uploaded ${files.length} files`); return true; }
    fail(`${bad} file(s) failed`); return false;
  }
  return false;
}

function manualInstructions(zipPath) {
  console.log();
  info('Upload by hand:');
  if (zipPath && fs.existsSync(zipPath)) {
    info('  1. cPanel → File Manager → your jerkwad folder');
    info('  2. Upload ' + bold(path.relative(ROOT, zipPath)));
    info('  3. Extract it there, then delete the zip');
  } else {
    info('  Copy the CONTENTS of dist/ into your jerkwad folder');
  }
  info('  dist/ is already filtered — no .git, no source, no Worker code');
}

async function probe(base) {
  const url = base.replace(/\/+$/, '');
  const get = (u) => new Promise(res => {
    const r = spawnSync('curl', ['-sS', '-o', os.devNull, '-w', '%{http_code}', '-m', '15', u], { encoding: 'utf8' });
    res((r.stdout || '').trim());
  });
  if (!has('curl')) { info('curl not available — verify by hand'); return; }

  for (const [label, p] of [['arena page', '/arena/'], ['player page', '/play/']]) {
    const code = await get(url + p);
    code === '200' ? ok(`${label} → ${code}`) : warn(`${label} → ${code || 'no response'}`);
  }
  // The one that actually matters for security.
  const git = await get(url + '/.git/HEAD');
  if (git === '200') {
    fail(red(bold('.git IS WEB-READABLE')) + ' — anyone can clone your full history');
    info('Delete .git from the webroot, or block it in .htaccess:');
    info('    RedirectMatch 404 /\\.git');
  } else ok(`.git not exposed (${git})`);
}
