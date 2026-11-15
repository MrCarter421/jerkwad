# Playing ShapeShifter levels in the browser

The `play/` directory is a self-contained, mobile-friendly Doom player:
**Chocolate Doom compiled to WebAssembly** (the [cloudflare/doom-wasm][1]
fork with WebSocket netplay) plus **Freedoom: Phase 2** as the IWAD (BSD
licensed, freely redistributable — our maps are Doom II format `MAP01`).

```
play/
  index.html            — the player page (touch controls, boot loader)
  websockets-doom.js    — Emscripten glue        (built by scripts/build-doom-wasm.sh)
  websockets-doom.wasm  — the engine (~2 MB)
  freedoom2.wad         — IWAD (~28 MB)
workers/doom-relay/     — WebSocket message router for multiplayer
                          (vendored from cloudflare/doom-workers, BSD-3)
scripts/build-doom-wasm.sh — reproducible engine build
```

## Single player

1. In ShapeShifter: place rooms → BUILD → **DOOM**.
   The exported WAD is written to IndexedDB and `play/` opens in a new tab —
   the engine merges it over freedoom2.wad and warps straight to MAP01.
2. Or open `play/` directly: with no stored WAD it boots plain Freedoom.
3. `play/?wad=<url>` merges a PWAD fetched from a URL,
   `?warp=N` / `?skill=N` control the start map and difficulty.

Hosting requirement: any static host works (Cloudflare Pages is ideal).
Everything is same-origin — no CORS, no special headers needed. Serve
`.wasm` with `application/wasm` (Pages does automatically).

**Controls.**

Keyboard (desktop): **WASD and the arrow keys both work at once.**

| | |
|---|---|
| `W` / `S` | forward / back (same as ↑ / ↓) |
| `A` / `D` | strafe left / right |
| `←` / `→` | turn left / right |
| `Ctrl` | fire &nbsp;&nbsp; `Space` use &nbsp;&nbsp; `Shift` run |

Chocolate Doom reads its bindings from its own config, which the page can't
edit, so WASD is not a rebind — `play/index.html` translates those four keys
into the ones the engine already knows (`,`/`.` are its strafe keys). Arrow
keys are passed through untouched, never duplicated or `preventDefault`ed.

Touch (mobile), appearing automatically on touch devices:

- **D-pad** — ▲/▼ forward/back, **strafe on the main left/right** (where your
  thumb rests), **turn in the top corners**. This mirrors WASD.
- **FIRE / USE**, **WPN** cycles weapons, and **RUN** *latches* Doom's Shift
  key: tap once to run permanently, tap again to walk. Latching matters
  because a touchscreen has no spare thumb to hold Shift. The setting is
  remembered and re-asserted after boot and on tab re-focus, since a keydown
  with no matching keyup can otherwise be dropped.
- **MENU / ENTER / Y** drive the Doom menus.

`scripts/check-controls.js` asserts the exact keyCodes each control emits
(instrumenting `sendKey`, not counting window events — the same event is
dispatched on window, document and canvas, so a naive listener sees each key
three times), and that no two touch buttons overlap.

**Orientation is the player's choice** — portrait and landscape both play.
There is no rotate-to-landscape gate and no orientation lock (build P8 removed
both; the old overlay covered the screen in portrait and could not be
dismissed).

**When a game will not start (build P12).** The waiting screen and the solo
watchdog both print the ENGINE'S OWN last lines, so a stuck boot or handshake
can be screenshotted off a phone instead of needing a devtools console. Read
the `doom: N` codes — the full list is in `scripts/engine-patches/README.md`;
the ones that matter at a glance: 2 connected, 8 uid assigned, 10 game
started, 13 refused by the host (with the reason), 9 disconnected (with the
reason), 12 a player timed out, 17 fatal engine error.

**When a game is interrupted (build P13).** Before P13 anything that went wrong
*during* a game was a frozen picture: the page only understood the engine's
status lines before launch. Now every one a player can be affected by is
turned into something readable (`onDoomStatus` in `play/index.html`):

- **⏳ WAITING FOR ANOTHER PLAYER** — a banner over the running game while it
  is paused for someone whose tab is hidden or whose connection is slow. The
  game resumes by itself; nobody is kicked for a few seconds of silence any
  more (see *Why games died* in `ARENA.md`).
- **YOU ARE NO LONGER IN THE NETGAME** — with the actual reason (the host left;
  nothing heard from the host for 30 s) and two ways on: keep playing the
  level alone, which Doom allows, or back to the arena.
- **LEVEL MISMATCH** — the host's engine refused us because this browser built
  a different level. Shown before any game starts, with what to do (reload
  the arena page so both players are on the same version).
- **THE GAME STOPPED** — a fatal engine error, with the engine's message. If it
  is `consistency failure`, the screen says what that means.
- Small notices for the rest: *reconnected*, *X left the game*, *X dropped out*.

Three quieter changes do as much as the messages:

- **Leaving says goodbye.** On `pagehide` the page calls the engine's
  `jw_net_leave`, which tells the other side immediately. A closed tab used to
  look exactly like a stalled one, so the others froze until a timeout.
- **The screen stays on** (Screen Wake Lock, re-taken on every gesture and on
  return to the tab). A phone that dims and locks mid-game freezes that
  player's engine and stalls everyone else.
- **Engine URLs carry a build stamp** (`websockets-doom.js?v=E2`, and the
  `.wasm` via `locateFile`). Browsers cache those files by URL; without the
  stamp, a player could run last month's netcode under this month's page for
  as long as their cache liked. **Bump `ENGINE_BUILD` whenever the engine is
  rebuilt.**

`play/?timeout=N` sets how many seconds a silent player is waited for
(default 30, range 4–600) without rebuilding anything.

**Booting (also P13).** The 28 MB IWAD download is the step most likely to
stall on a phone, and it used to fail in the worst way available: a bare
`await fetch()` waits forever, and the loading screen hid itself half a second
after page load (it tested `canvas.width > 64`; a canvas is 300 wide before
anything touches it), so a stalled boot was a black rectangle. Now the bar
shows megabytes arriving; if nothing arrives for 20 s the transfer is
restarted, twice; and if it still cannot be had the page says
`BOOT FAILED: game data could not be downloaded` and keeps saying it, with a
TRY AGAIN button — the engine is not started on nothing. `scripts/check-boot.js`
covers all three (its test server can stall a transfer mid-body).

Coming back to a hidden tab shows a one-line reminder that the game was
paused meanwhile: a hidden tab gets no animation frames, so its engine — and
everyone waiting on it — stands still. That is a browser rule, not something
the page can route around.

The count on the waiting screen is **relay connections, not confirmed Doom
players** — two sockets can be attached while Doom's own handshake is still
incomplete. It is labelled as such; do not read "2 / 2" as "Doom has both
players".

Note the arena's **Players dropdown defaults to 2**, so pressing PLAY without
changing it starts a two-player netgame that waits for someone else. The
waiting screen always offers **PLAY SOLO INSTEAD** for exactly that case.

**Sizing (build P9).** The canvas box fills the visible viewport (`100dvw`
x `100dvh`, which track the area under the mobile browser chrome), and CSS
`object-fit` does the aspect work:

- **FIT** (default) = `object-fit: contain` — the browser letterboxes the
  engine's framebuffer at the largest UNDISTORTED size. The browser reads the
  canvas backing store as the intrinsic aspect, so this is correct no matter
  what resolution the engine picked.
- **FILL** = `object-fit: fill` — stretched edge to edge for anyone who
  prefers no black bars over correct proportions. Persisted in localStorage.

Build P8 tried to compute the pixel size in JS from `canvas.width/height`, but
the engine sets the backing store to a FIXED Doom resolution independent of the
screen, so that math produced a tiny box on real phones. Letting `object-fit`
read the backing store removes the guesswork entirely — there is no JS layout
code left to get wrong.

**Audio** is initialised before the engine loads: the page creates the
AudioContext itself and hands it to SDL (the glue adopts it via
`if (!SDL2.audioContext)`), then keeps a persistent resume handler on every
gesture plus tab re-focus. Emscripten's own `autoResumeAudioContext` uses
`listenOnce` — a ONE-SHOT listener on document/#canvas — so if the first
gesture landed before the context existed, or the tab was backgrounded (which
re-suspends it), audio stayed dead or returned at random. A 🔈 SOUND button
appears only while the context is still suspended.

## Multiplayer (yuccabucca.com / Cloudflare)

The engine build carries Chocolate Doom's full netgame code with the
UDP transport swapped for **WebSockets** — packets are relayed by a
Cloudflare Worker + Durable Object (`workers/doom-relay/`).

Deploy the relay once:

```
cd workers/doom-relay
npx wrangler login
npx wrangler deploy       # routes doom.yuccabucca.com/* (edit wrangler.toml)
```

Then share links (same WAD must be loaded by all players):

```
https://yuccabucca.com/play/?ws=wss://doom.yuccabucca.com&server=1&nodes=2   host
https://yuccabucca.com/play/?ws=wss://doom.yuccabucca.com&join=1             joiner(s)
```

The host waits until `nodes` players are connected, then the netgame
starts (deathmatch/co-op per Chocolate Doom's normal `-deathmatch` /
`-altdeath` args — add them to the URL handling in `play/index.html` as
needed). Status lines from the engine (`doom: N, message`) surface in the
top-left hint area.

## Rebuilding the engine

`./scripts/build-doom-wasm.sh` builds all four engine files from source:
upstream cloudflare/doom-wasm at a **pinned commit**, plus the patches in
`scripts/engine-patches/` (the netcode fixes — that directory's README lists
what each one changes) and the render-limit edits below. A patch that does not
apply aborts the build. About a minute once emscripten is installed; then bump
`ENGINE_BUILD` in `play/index.html` and run `node scripts/check-netplay.js`.

Every object it compiles is byte-identical from any directory and the build
path no longer appears in the output, but the final link in this emscripten is
not bit-stable (the same objects link to one of a few `.wasm` files that
differ only in function order), so do not expect `cmp` against `play/` to
match on an honest rebuild.

It handles three quirks of building on Debian/Ubuntu's
packaged emscripten (3.1.6):

1. The system emscripten cache is frozen → uses a writable copy.
2. emscripten-ports ZIP hashes no longer match GitHub's re-compressed
   archives (and proxies may block codeload) → ports are pre-seeded from
   git clones.
3. clang ≥ 15 renames `main(argc, argv)` to `__main_argc_argv`, which
   emscripten 3.1.6 doesn't map back — the whole game got dead-stripped
   to a 30 KB stub. Patched with an `__asm__("main")` label.
4. The final `.html` link step needs `htmlmin` → we link straight to
   `.js` (we ship our own page anyway).

With a modern emsdk (≥ 3.1.30) quirks 2–4 disappear; keep the script's
final link flags either way (they define the FS/ccall exports the player
page depends on).

## Notes / limits

- Music is off (`-nomusic`): no GUS patches shipped. Sound effects work.
- TWO engine builds ship. `fast-doom.wasm` (1.39 MB) has no ASYNCIFY and is
  used for SOLO play; `websockets-doom.wasm` (1.92 MB) keeps ASYNCIFY and is
  used for NETGAMES (the websocket connect handshake blocks, which needs it).
  ASYNCIFY rewrites every function into a resumable state machine — that is
  a large runtime tax for something only the net wait and screen wipes use,
  since the game loop is already emscripten_set_main_loop driven. Force
  either with `play/?engine=fast` or `?engine=websockets-doom`.
- FLAT vs TEXTURE namespaces: Doom keeps floor/ceiling flats separate from
  wall textures. Naming a wall texture as a sector floorTex makes vanilla
  abort at load with `R_FlatNumForName: <NAME> not found` — which looks like
  a level that simply never loads. `scripts/check-textures.js` validates every
  emitted name against the real freedoom2.wad namespaces; run it after any
  change to generator texture pools.
- The engine's NETCODE is patched too — connection timeout, reconnects,
  level-mismatch refusal, clean leave, fatal-error reporting. See
  `scripts/engine-patches/README.md`.
- The engine is Chocolate Doom with the vanilla STATIC RENDER LIMITS
  RAISED (the crash fix): MAXVISPLANES 128->2048, MAXDRAWSEGS 256->4096,
  MAXVISSPRITES 128->2048, MAXOPENINGS x4, MAXPLATS 30->256. Stock
  Chocolate Doom I_Error-exits (blank screen) the instant a detailed
  ShapeShifter view exceeds 128 visplanes; the raised limits give ~16x
  headroom so dense levels render and don't "cut out mid-game". Rebuild
  via scripts/build-doom-wasm.sh (the limit edits live in that script).
- Freedoom's MAP01 assets replace Doom II textures ShapeShifter names
  (STARTAN2 etc.) — all standard names exist in Freedoom, so maps look
  as intended.
- The Exit Pillar marker (editor type 32000) is stripped before export;
  real engines would refuse the unknown thing type.
- buildWad runs a JS BSP node builder (SEGS/SSECTORS/NODES + BLOCKMAP +
  zero REJECT) — required by vanilla engines; GZDoom rebuilds nodes
  itself but Chocolate Doom renders NOTHING without them. Rare sliver
  subsectors from integer split-rounding can cause small floor-height
  visual glitches in complex fused maps (refinement tracked in
  CLAUDE.md known issues).

[1]: https://github.com/cloudflare/doom-wasm
