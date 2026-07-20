# JerkWad Arena — quantum multiplayer Doom on yuccabucca.com

`arena/` is a standalone page (no React, no build step at runtime) that
generates multiplayer-ready ShapeShifter levels from two sliders and
hosts/joins Chocolate Doom netgames over the Cloudflare WebSocket relay.

```
arena/index.html   — the page (sliders, automap, PLAY, Public toggle, lobby)
arena/engine.js    — React-free bundle of the generator pipeline
                     (rebuild: scripts/build_engine.js after editing
                     wad_editor.jsx — same idea as index.html embedding)
workers/doom-relay — relay + lobby Worker (deploy once, see below)
```

## How it works

- **GENERATE** draws a 31-bit seed from `crypto.getRandomValues`, runs the
  EtherWad generator (rooms slider → room count, enemies slider → monster
  count; difficulty tier derives from enemy density), then layers the
  multiplayer loadout on top: P1–P4 co-op starts at mutually-farthest
  rooms, ≥4 deathmatch starts, shotgun/chaingun/rocket/plasma/chainsaw in
  the biggest rooms with ammo flanking each, medikits, green + blue armor,
  a backpack, and the Exit Pillar.
- The page renders a classic **automap image** of the real generated
  geometry (bright walls, faint passable lines, color-coded things).
- **Determinism is the multiplayer trick**: the whole pipeline is seeded,
  so a JOIN rebuilds the host's WAD locally, byte-for-byte, from just
  `{seed, rooms, enemies}`. Nothing is uploaded anywhere. (Chocolate Doom
  SHA1-checks WADs between netgame peers — determinism is what makes the
  check pass. Host and joiners must be on the same deployed version of
  the site, or the checksums won't match.)
- **PLAY** stores the WAD in IndexedDB and opens `play/` with
  `-server -nodes N` pointed at a fresh relay room
  (`/api/newroom` → `wss://…/api/ws/<room>`). The game starts when N
  players are connected. **Public** additionally registers the level in
  the lobby; **private** rooms never appear anywhere — the room id is
  unguessable (Durable Object id + signature).
- The **Public arenas** table polls `/api/lobby/list` every 12 s: name,
  size, live player count (read from each room's Durable Object), and a
  JOIN button that rebuilds the level and connects as a client.
- No relay deployed / offline → the page degrades to solo PLAY.

## Deploying the relay + lobby (one time)

```
cd workers/doom-relay
npx wrangler login
npx wrangler secret put DOOM_KEY     # any long random string
npx wrangler deploy                  # routes doom.yuccabucca.com/* (see wrangler.toml)
```

DNS: add a `doom` subdomain record in Cloudflare (proxied, any target —
the Worker route intercepts). The arena page defaults to
`doom.yuccabucca.com`; override with `arena/?relay=other.host` for
testing.

## API summary (worker)

```
GET  /api/newroom                 → { room }                  create signed room id
GET  /api/room/<room>             → { room, gameStarted, players }
WS   /api/ws/<room>               → per-room packet relay (Durable Object)
POST /api/lobby/register          → { ok }    body: { room, name, seed, rooms,
                                               enemies, maxPlayers, dm }
GET  /api/lobby/list              → { levels: [ …entry, players ] }
```

Lobby entries expire after 4 h, or after 10 min with zero connected
players. Room ids are signed with DOOM_KEY (vendored silentspacemarine
scheme) so private rooms can't be enumerated.

## Netgame notes

- The doom server peer is always uid **1** on the relay; joiners connect
  with `-connect 1` (the WebSocket transport resolves addresses via
  `atoi`). The play page handles this via `?join=1`.
- Joiners don't pass `-warp/-skill/-deathmatch` — the server's settings
  propagate at launch.
- All peers must load the identical PWAD (see determinism above).
- Chocolate Doom is vanilla: 4 players max, and the game only begins once
  the host's `-nodes N` count is reached.
