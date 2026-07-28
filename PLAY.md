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

**Mobile controls** appear automatically on touch devices: left D-pad =
move/turn, FIRE / USE / strafe buttons on the right, plus MENU / ENTER / Y
buttons for the Doom menus. On desktop use the keyboard (arrows + Ctrl +
Space, standard Chocolate Doom bindings).

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

`./scripts/build-doom-wasm.sh` reproduces `websockets-doom.{js,wasm}`
from source. It handles three quirks of building on Debian/Ubuntu's
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
