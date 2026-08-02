# Deploying

```
node scripts/deploy.js
```

That's it. The wizard builds, validates, stages, packages, uploads, deploys the
Worker, and verifies the result. Run it from the repo root on **your own
machine** (not the cPanel terminal — see below).

## What it does

| Step | What happens | Aborts on |
|---|---|---|
| 1 Preflight | Node ≥ 16, esbuild (offers to install), branch, uncommitted changes | missing toolchain |
| 2 Build | `build_app` → `build_html` → `build_engine` | build error, or version not embedded |
| 3 Validate | the five generator validators | failures (asks first) |
| 4 Stage | copies the publish manifest into `dist/` | anything not in the manifest |
| 5 Package | `dist-jerkwad.zip` | — |
| 6 Upload | rsync / sftp / ftp, or hands you the zip | — |
| 7 Worker | `npx wrangler deploy` in `workers/doom-relay` | — |
| 8 Verify | probes the live pages and checks `.git` isn't exposed | — |

### Flags

```
--dry-run     build, validate and stage; upload nothing
--yes         no prompts (repeat deploys, CI)
--code-only   skip the ~31 MB engine + IWAD  (160 KB zip vs 11.9 MB)
--site        site only, leave the Worker alone
--worker      Worker only, leave the site alone
--skip-tests  ship unvalidated (asks twice; don't)
```

Use `--code-only` for everything after the first deploy to a host. The WASM
engines and `freedoom2.wad` change only when you rebuild the engine.

## Two independent deploys

They are **not** the same thing and don't have to happen together:

- **The site** — `index.html`, `arena/`, `play/` → your web host (cPanel).
- **The relay Worker** — `workers/doom-relay/` → Cloudflare's edge, via
  wrangler. Wrangler uploads from your laptop; it never runs on the web host,
  which is why `npx` in the cPanel terminal was a dead end.

Changed `wad_editor.jsx` or a page? Site only. Changed `workers/`? Worker only.

## Upload configuration

First run offers to write `.deploy.json`:

```json
{ "method": "rsync", "host": "yuccabucca.com", "user": "…",
  "remotePath": "public_html/jerkwad",
  "siteUrl": "https://yuccabucca.com/jerkwad" }
```

It's gitignored. **No password is ever stored** — rsync/sftp use your SSH key,
and the FTP path lets curl prompt so the password never lands in a file, in
your shell history, or in `ps` output. Decline the setup and you get the zip to
upload through cPanel's File Manager instead.

## The publish manifest

`scripts/deploy.js` names every file that may be published. `dist/` is checked
against it as an **allowlist** — anything else present aborts the deploy.

Deliberately never published: `.git/` (full history, clonable), `workers/`
(Worker source), `scripts/`, `wad_editor.jsx` (unminified source — `index.html`
already embeds it), `*.md`, `.deploy.json`, dotfiles.

This started as a blocklist and silently passed `.gitattributes`, because the
pattern only matched `.git` as a complete path segment — `.gitignore` and
`.env.local` would have shipped too. An allowlist can't fail that way. Three
negative controls cover it: a dotfile in the manifest, source in the manifest,
and a stray file appearing in `dist/` after staging.

## Multiplayer version lock

`index.html` and `arena/engine.js` are both generated from `wad_editor.jsx`,
and Chocolate Doom SHA1-compares WADs between netgame peers. If those two
artifacts ever came from different revisions, hosts and joiners would build
different levels and **every netgame would fail its checksum**. Step 2 rebuilds
both from the same source every time, and step 3 refuses to continue unless the
current version string is actually embedded in `index.html`.

Practical consequence: players on a stale cached copy can't join players on the
new one. After deploying, a hard refresh fixes it.

## After deploying

Step 8 checks automatically, but if you upload by hand, verify:

- `https://yuccabucca.com/jerkwad/arena/` loads and GENERATE draws a map.
- `https://yuccabucca.com/jerkwad/.git/HEAD` returns **404**. If it returns
  file contents, your entire history is downloadable. Remove `.git` from the
  webroot or block it:

  ```apache
  RedirectMatch 404 /\.git
  ```
