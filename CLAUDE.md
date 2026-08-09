# JerkWad / ShapeShifter / EtherWad

A mobile-first, single-file React app for building playable **Doom WAD levels** in the
browser. Three generations of tooling live in this repo, all inside `wad_editor.jsx`:

| Layer | What it is | Status |
|---|---|---|
| **JerkWad** (`WadEditor`) | The original vertex/linedef-level WAD editor with a random dungeon generator (`generateDungeon`). | Legacy — still compiled in, reachable only in code. `main` branch is its last pure line (V0.21). |
| **ShapeShifter** (`ShapeShifter`) | Room-composition editor: place preset rooms on a canvas, drag them together to **fuse**, connect with corridors/teleporters, drop things, BUILD → validated map → PLAY/SAVE exports a vanilla-Doom WAD. | The main app. |
| **EtherWad** (`EtherWad`) | Automated level generator on top of the ShapeShifter engine. Quantum-random entropy, room-count/enemy/difficulty dials, generates overlapping compositions with intelligent thing placement, hands off to ShapeShifter for editing. | Newest layer (V0.53+). |

Current version: **V0.56** (see the version `<span>` in the ShapeShifter/EtherWad headers).

## Repo layout

```
wad_editor.jsx   — the entire app (~9k lines). Source of truth.
index.html       — DEPLOYED ARTIFACT. wad_editor.jsx minified + embedded inline.
                   Never hand-edit the embedded JS; rebuild it (see below).
CLAUDE.md        — this file.
```

### Branches

- `main` — legacy JerkWad line (V0.21). The ShapeShifter work was never merged back here.
- `claude/jerkwad-development-JJfrT` — Claude's designated development branch. PRs flow from here.
- `EtherWad`, `ShapeShifter`, `Shapeshifter-July26` — user-created lines; the user merges
  PRs across these. **Before starting work, check which branch has the highest `V0.xx`**
  (`git grep -o "V0\.[0-9]*" <branch> -- wad_editor.jsx | sort -u`) and merge it into the
  working branch first. Branch state moves between sessions.

## Build pipeline (source → deployed index.html)

`index.html` loads React 18 UMD from unpkg, then runs the minified app inline between the
exact marker lines `      try {` and `      } catch (e) {` inside its boot script, and
mounts `ShapeShifterApp`.

Rebuild steps (Node + esbuild; puppeteer for e2e) — both scripts are committed:

```
node scripts/build_app.js /tmp/app.js    # wad_editor.jsx → minified bundle
node scripts/build_html.js /tmp/app.js   # splice into index.html + refresh build meta
node scripts/build_engine.js             # arena/engine.js — React-free generator bundle
```

esbuild is expected at `/tmp/node_modules/esbuild` (override with `ESBUILD=<path>`).
`build_html.js` fails loudly if the `      try {` / `      } catch (e) {` markers move.

Bump the version string (`V0.xx</span>`, appears in both ShapeShifter and EtherWad headers)
on every user-visible change.

## App structure

```
ShapeShifterApp (export default)
└── JerkwadRoot                    — routes between the two views
    ├── ShapeShifter               — the editor (default view)
    │   ├── RoomDesignerModal      — custom room preset designer
    │   └── props: { handoff, onClearHandoff, onOpenEther }
    └── EtherWad                   — the generator (ETHER button)
        └── makeEtherSource()      — QRNG entropy bucket
WadEditor                          — legacy JerkWad editor (not routed, kept compiling)
```

- **Handoff**: EtherWad → `onEditInShapeShifter({rooms, connections, things})` →
  `JerkwadRoot` stores it → ShapeShifter's `useEffect` adopts it and clears it.
- **Custom presets** persist in `localStorage['ssCustomPresets']`; JerkwadRoot re-reads
  them for EtherWad's room pool.

## The map generator (`generateShapeShifterMap(roomSpecs, connectionSpecs, thingSpecs)`)

The heart of everything. Single deterministic pass (own seeded `rand()`), roughly:

1. **Room setup** — palette/zone, feature assignment (user `feature` wins, else random),
   per-feature overrides (ceiling height, light, palette).
2. **Fusion detection** — rooms whose bboxes overlap form `fusedGroups`. Fused rooms get
   `_fused=true`, floors equalized, `trimLayers=0`. Features in `ISLAND_FUSE`
   (canal, plaza, depot, bunker, courtyard, cityblock, **custom**) keep their island
   features; all others are stripped to `'none'`.
3. **Sector allocation** — `allocSec` per room: outer, trim rings, feature sector,
   buildings (plinth/cap/roof/tiers/bay shelter/interior/throat/lift/mezz),
   terrains, pillars.
4. **Geometry emit** — `emitWall(x1,y1,x2,y2, frontSector, backSector|null, props)`.
   - Non-fused rooms: polygon perimeter walk (with corridor door cutouts + headers),
     trim rings, feature ring, terrain rects, building facades, pillars.
   - Fused groups: **32-unit grid rasterization** (7a). Cells → sectors; cell boundaries →
     walls. Islands (terrains/pillars/buildings) are stamped into the grid.
     "Precise" buildings (footprint fully owned, checked at exact cell centers) instead
     punch a `PRECISE` hole and get the full detailed facade emit.
   - Touching rooms (7b): shared wall segments split + merged into two-sided passable lines.
5. **Resolve pass (8b)** — assigns lower/upper textures from floor/ceiling deltas
   (STEP1 / STARTAN2 / SUPPORT2 / per-sector riser overrides via `gridRiserTex`).
   Sky-to-sky uppers suppressed. Two-sided middles stripped (8c) except DOORTRAK/SW1EXIT.
6. **Doors** — corridor doorBody sectors get DR-1 (special 1) + DOOR1 uppers; headers cap
   the upper at exactly 72 so the DOOR1 panel never tiles.
7. **Things** — user things pass through verbatim; **Exit Pillar markers (type 32000)**
   are converted to SW1EXIT posts (see below) and stripped. P1 auto-added if missing.
8. **Safety nets** — fragment cleanup (any sector whose walls don't close → walls
   converted one-sided to the surviving neighbor), then orphan-sector + degenerate-line
   pruning.

### Hard-won invariants (violate these and geometry breaks)

- **Winding**: the FRONT sidedef must be on the geometric RIGHT of `v1→v2`. Node builders
  use this to assign subsectors; wrong winding = sky bleed / broken loops (V0.40, V0.45).
- **IDs are array indices**: `'v3'`/`'sd12'`/`'l7'` ↔ index. `vById`/`sdById` and the
  `lineByVerts` map rely on this — never renumber without updating them (V0.46 perf).
- **Texture heights**: DOOR1 is 64×72 (headers cap door uppers at +72). BIGDOOR* are 128
  tall (building bay shelters cap at plinth+128, V0.54). SW1EXIT switch posts are 64 wide.
- **Open sectors need floor ≤ ceil**: sky rooms must set `ceilH` above the tallest
  structure (cityblock is `+512` for skyscraper tiers, V0.50). Solid (floor==ceil)
  pillars may exceed the sky plane; open ones may not.
- **Nested terrains**: a terrain rect strictly inside another emits against the smallest
  container, not the room floor (V0.50). Pillars inside terrains use `enclosingId`.
  Identical-size overlapping rects are user error and will break.
- **Two-sided middle textures render as impassable-looking glass** — the resolve pass
  strips them; don't add them back.
- **Everything snaps to 32** (rooms, footprints, fusion grid). Building `plinthW` must
  stay 32 so precise-fused plinths land on grid-cell boundaries.
- **No auto-exit, no auto-secret** (V0.52): levels only get an exit where the user (or
  EtherWad) placed an **Exit Pillar** thing (type 32000, THINGS→PLAYER). BUILD warns
  once for missing P1 and once for missing Exit Pillar (two-stage confirm).

### Room features (the `feature` field)

Random pool: none, platform, pit, altar, cathedral, crusher, colonnade, pool, crypt,
liminal, reactor, gallery, throne, mausoleum, foundry, observatory, sewer, lake, garden,
sky, courtyard, plaza, ziggurat, lift.

Preset-only additions: depot, canal, bunker, cityblock, terrain, **catacombs, library,
chasm** (V0.54), and `custom` (Room Designer).

Highlights of the "architect" systems:
- **courtyard/cityblock**: buildings with plinth/facade/parapet, enterable sheds (door
  throat + DOORTRAK trim), multi-room offices (partition + lintel doorway), working
  SR-62 lifts to mezzanines, skyscrapers with wedding-cake setback tiers + spires,
  rooftop tanks/antennas/vents, streetlamps, industrial silo/tank props, bay-shelter
  porches over doors.
- **canal**: sunken liquid channels + raised bridge deck.
- **lake**: temple pillars enclosed in the water sector, marble centerpiece, stepping stones.
- **terrain**: rolling hills from tightly packed undulating trim rings, open sky.
- **chasm**: damaging liquid pit crossed by a grate walkway (nested-terrain demo).

### Room Designer (`RoomDesignerModal`)

Form + live SVG preview editing a `customSpec`:

```js
{ palette: {floor, ceil, wall, accent},   // texture overrides
  floorH, ceilH, light, hasSky,
  pillars:  [{dx, dy, radius, top, tex}],   // top: 0 = full column, >0 = raised block
  terrains: [{dx, dy, hw, hh, dh, kind, floorTex, special}] }  // dh<0 pit, >0 platform
```

ARCHITECT generators stamp mathematically even patterns (RING ×6/×8, GRID 2×2/3×3,
QUAD PITS, ZIGGURAT nested tiers). Saved presets appear as amber chips in PLACE with a
✎ edit chip. `customSpec` must be threaded through **every** rooms→specs mapping
(BUILD, connect-probe, addPreset) — it has been dropped twice (V0.51, V0.52).

### EtherWad

- **Entropy**: `makeEtherSource()` fetches 1000 bytes from
  `https://www.random.org/integers/...` (free, CORS-OK), seeds a Mulberry32 PRNG per
  generation. Falls back to `Math.random` on network failure (status shown in UI).
- **Generation**: rooms picked from presets + customs; each new room anchors to one of
  the last 6 placed — 45% within fusion range (overlap), 55% corridor-connected.
  P1 → NW-most room, Exit Pillar → SE-most (anti-diagonal extremes). Monsters scattered
  by room area from difficulty pools (easy→nightmare); ~1 ammo/health goodie per 6
  monsters; spawn room stays clean.
- **ADD AREAS extends geometry only** — existing monsters/goodies are preserved, only
  the P1/Exit markers are re-stamped to the new extremes (V0.54).

## Testing

`scripts/` holds the committed validators. All are headless Node, all take
`[seeds] [rooms]`-ish args, all exit non-zero on failure. Run the battery after any
generator change:

```
node scripts/build_engine.js            # arena/engine.js — validators load THIS, rebuild first
node scripts/check-load.js 30 8         # topology closes, no inverted sectors, WAD lumps complete
node scripts/check-textures.js 20 14    # every flat/texture exists in freedoom2.wad namespaces
node scripts/check-skybleed.js 20 14    # no unpainted ceiling gaps, no sky-ceilinged door lintels
node scripts/check-tjunctions.js 8 14   # no vertex mid-linedef (cracks / missing wall)
node scripts/check-spawns.js            # no player start inside solid geometry / without headroom
node scripts/check-reachability.js      # every room reachable from P1 through doors/teleporters
FUSE=0.25 node scripts/check-skybleed.js 12 14   # the editor's fused path (arena is corridor-only)
```

Deploying: **`node scripts/deploy.js`** runs the whole pipeline (build → validate →
stage → package → upload → Worker → verify). See `DEPLOY.md`. `--dry-run` stops before
uploading; `--code-only` skips the ~31 MB engine + IWAD. The publish set is an allowlist
inside that script — `dist/` is rejected if it contains anything the manifest doesn't name.

**A validator that can't fail is worse than none.** Twice now a check has read 0/N
because it was inspecting field names the map never had (`frontSidedef` instead of
`front`) or forgiving the exact case it was written to catch. Always run a *negative
control*: rebuild the engine with the fix reverted and confirm the number moves.
`check-skybleed.js` honours `JERKWAD_ENGINE=<path>` for precisely this.

**Headless generator harness** (no browser): esbuild-transform `wad_editor.jsx` to CJS,
stub React, append `module.exports = { generateShapeShifterMap, buildSectorLoops, ... }`,
then `eval` in a function wrapper. Assert on the returned `{vertices, linedefs, sidedefs,
sectors, things}`. Standard checks:
- `buildSectorLoops(map).size === map.sectors.length` (topology: every sector closes)
- no sector with `floorH > ceilH`
- no duplicate vertex-pair linedefs / zero-length lines / collinear overlaps
- feature-specific counts (pits, pillars, DOORTRAK lines, special-11 exit lines…)

**Puppeteer e2e**: inline local React UMD into index.html (replace the unpkg script
tags), drive buttons by text. BUILD is a **three-click flow** when P1/Exit are missing
(P1 warn → Exit warn → build). To verify exported WADs, hook
`HTMLAnchorElement.prototype.click` to capture the blob URL from PLAY/SAVE, fetch its
bytes, and parse the WAD directory (SECTORS = 26 B/entry, LINEDEFS = 14, THINGS = 10).
Stub `fetch` for random.org when testing EtherWad.

**Lesson from V0.51**: "walk check clean" is not enough — assert the *expected features
actually exist* in the output.

## Version history (condensed)

- V0.21 `main`: last pure JerkWad (random dungeon generator, vertex editor).
- V0.22–V0.31: ShapeShifter born — presets, fusion, corridors, teleporters, things,
  walk-check, WAD export.
- V0.32–V0.35: fusion preserves island features → buildings → crisp precise facades.
- V0.36–V0.39: rooftop clutter, canal bridge, streetlamps, enterable shops with
  trimmed doors.
- V0.40–V0.45: sky-bleed winding fix, Working overlay, safe-area padding, Lake/Cathedral
  detail, fused-corridor doors + header fix, internal lifts + mezzanines, skyscrapers,
  multi-room offices.
- V0.46–V0.48: **O(N²)→O(N)** build (80 s → 1.3 s for 25 fused rooms), fragment safety
  net, cell-accurate precise check — 49-room fused maps build clean in <10 s.
- V0.49–V0.51: Room Designer + Architect patterns + skyscraper setback tiers; customSpec
  plumbing fixes.
- V0.52: fuse-safe custom rooms; **no auto-secret/auto-exit**; Exit Pillar marker.
- V0.53: **EtherWad** — QRNG entropy, generate/add-areas, handoff to editor.
- V0.54: bay-shelter door trim, catacombs/library/chasm themes, add-areas keeps
  monster count flat.
- V0.56: **no more cracks / missing wall in room trim.** HEADER_DEPTH and TRIM_W are
  both 16, so a corridor door's header inner edge landed exactly on trim ring 1 — and
  the ring loop then emitted its own full-width line straight over it. Two lines
  claiming the same span, four T-junctions per doorway. The header now names the ring
  as its inner neighbour and the ring walk steps around the doorway. Exit posts also
  gained a clearance check (they were carved at the marker with no regard for
  buildings). 196 T-junctions per 8 levels -> 0, at 8/14/20/40/60 rooms.
  Invisible to check-load.js: both sectors still closed, so topology passed while the
  geometry was wrong. `scripts/check-tjunctions.js` is the guard.
- V0.55: **door lintels no longer show sky.** Header (door soffit) sectors inherited
  `palette.ceil`, which is `F_SKY1` in skylit rooms, so the resolve pass saw
  sky-on-both-sides and skipped the upper texture — 61 door tops per 20 levels rendered
  open sky. Headers now force a real flat. Plus arena spawn relocation (no player start
  inside solid geometry) and a playable landscape view in `play/` (build P7).

## Known issues / next ideas

- **The FUSED path still has T-junctions** (`FUSE=0.25 node scripts/check-tjunctions.js`
  reports ~2400 over 6 levels). The 32-unit grid rasterizer emits one wall per cell
  boundary while an abutting non-fused polygon emits a single long line, so vertices
  land mid-line every 32 units. This is pre-existing — it measured 2525 before the
  V0.56 work and 2443 after — and it is why the arena runs `fuseChance: 0`. Corridor-only
  is clean at 0. Fixing it means splitting long lines at the grid pitch wherever they
  abut a fused group, in the most intricate part of the generator, so it is deliberately
  not bundled with a small fix.

- Rare topology fragment on extreme fused arrangements (~2/24 easy-difficulty EtherWad
  seeds); the V0.48 safety net degrades them to solid walls rather than fixing the root.
- Fused buildings that straddle room overlaps still fall back to blocky silhouettes.
- Designer is form+preview; a drag-to-place visual canvas is the natural next step.
- Web Worker build, incremental rebuilds, typed-array rasterization are planned engine
  work (see V0.46 commit for the profile).
- EtherWad could bias room selection by theme adjacency (catacombs next to crypts, etc.)
  and route corridors around fused clusters more intelligently.
