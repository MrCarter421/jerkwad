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
| 3 Validate | the generator validators, incl. cross-browser determinism | failures (asks first) |
| 4 Stage | copies the publish manifest into `dist/` | anything not in the manifest |
| 5 Package | `dist-jerkwad.zip` | — |
| 6 Upload | rsync / sftp / ftp, or hands you the zip | — |
| 7 Worker | tests the relay under workerd, `npx wrangler deploy`, then asks the live relay which build it is | relay test fails (asks first) |
| 8 Verify | probes the live pages, checks `.git` isn't exposed, that the engine on the host is this engine, and that the live relay is this repo's build | — |

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
engines and `freedoom2.wad` change only when you rebuild the engine — and when
they HAVE changed, deploy without it once. Step 8 compares the engine on the
host with this one and says so if you forget.

## Two independent deploys

They are **not** the same thing and don't have to happen together:

- **The site** — `index.html`, `arena/`, `play/` → your web host (cPanel).
- **The relay Worker** — `workers/doom-relay/` → Cloudflare's edge, via
  wrangler. Wrangler uploads from your laptop; it never runs on the web host,
  which is why `npx` in the cPanel terminal was a dead end.

Changed `wad_editor.jsx` or a page? Site only. Changed `workers/`? Worker only.

**But a release that touches both needs both.** The netcode fix spans the
engine (site) and the relay (Worker). The site half works against an old
relay — games start and survive a stalled player — but recovering from a
dropped connection needs the new relay, and nothing about a site upload tells
you the Worker is behind. That gap is how the previous relay fix stayed
undeployed for three months. So the last step of every run now asks
`https://doom.yuccabucca.com/api/health` which build is live and fails loudly
if it is not this repo's; the arena page and the players' waiting screen warn
about an old relay too.

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
new one. After deploying, a hard refresh fixes it. This is now ENFORCED rather
than hoped for: the host's engine refuses a joiner whose level checksum
differs and both screens say "LEVEL MISMATCH — reload" (it used to launch
anyway and fall apart a minute later). Two stamps keep caches honest:
`arena/index.html` loads `engine.js?v=<version>` (step 2 refuses to build if
that number is stale) and `play/index.html` loads the engine as
`…-doom.js?v=<ENGINE_BUILD>`.

## After deploying

Step 8 checks automatically, but if you upload by hand, verify:

- `https://yuccabucca.com/jerkwad/arena/` loads and GENERATE draws a map.
- `https://yuccabucca.com/jerkwad/.git/HEAD` returns **404**. If it returns
  file contents, your entire history is downloadable. Remove `.git` from the
  webroot or block it:

  ```apache
  RedirectMatch 404 /\.git
  ```
