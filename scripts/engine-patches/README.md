# Engine patches

`play/websockets-doom.{js,wasm}` and `play/fast-doom.{js,wasm}` are
[cloudflare/doom-wasm](https://github.com/cloudflare/doom-wasm) at commit
`65e0d3ae` **plus the patches in this directory**, applied by
`scripts/build-doom-wasm.sh` (which aborts if one does not apply). They are the
netcode half of "players get kicked after about a minute".

Rebuild after changing any of them, then bump `ENGINE_BUILD` in
`play/index.html` so browsers fetch the new binaries:

```
./scripts/build-doom-wasm.sh          # ~1 min once emscripten is installed
node scripts/check-netplay.js         # the proof
```

To change a patch: edit the file in the work tree the build left behind
(`/tmp/doom-wasm-build/doom-wasm/src/…`) and regenerate with
`git diff -- src/<file> > scripts/engine-patches/NN-<file>.patch`.

## What each one fixes

| Patch | File | Was | Now |
|---|---|---|---|
| `01-net-common` | `net_common.c` | A silent peer was dropped after **4 s** (stock Chocolate Doom: 30). A hidden tab, a locked phone, a wifi→cellular handover or one bad stretch of signal all last longer; measured, a 3 s stall already ended the game for everyone. | 30 s, tunable with `-nettimeout N` (`play/?timeout=N`). The game *pauses* for a stalled player and resumes. |
| `02-net-websockets` | `net_websockets.c` | Reconnecting was a blocking call from inside the packet functions (sleep 1 s, poll, ×6) — it froze the game loop for longer than the timeout. A socket the browser had not noticed was dead stayed "open" forever. A 64-packet receive queue (≈1.8 s of traffic) that leaked every packet it dropped. `free()` of a static address. uid 0 matched an uninitialised address and crashed through a null function pointer. | Non-blocking reconnect state machine with backoff; the game keeps running while a socket is reopened. Liveness is measured against the **relay** (a ping it answers, relay-4+) so a frozen *player* is never mistaken for a dead *link*; a silent link is reopened after 6 s. 1024-packet queue, no leak. The host's new-game announce stays the first frame on the first socket, so the engine still works on relay builds before relay-4. |
| `03-net-client` | `net_client.[ch]` | Leaving meant a 5 s sleep-wait for an acknowledgement — impossible from a closing tab, so a player who left looked exactly like one who stalled. | `NET_CL_LeaveNow()`: one DISCONNECT, sent immediately. Records *why* a connection ended. |
| `04-net-server` | `net_server.[ch]` | A player whose level differed from the host's was let in (stock only warns, in a dialog this build never draws). The simulations drifted, hit `consistency failure`, and every engine quit at once. | The host **refuses** a client whose WAD checksum differs, with the reason (`doom: 14` on the host, `doom: 13` on the joiner). `NET_SV_LeaveNow()`. `doom: 18` when a player leaves; the missing newline on `doom: 12`. |
| `05-net-gui` | `net_gui.c` | — | The joiner reports a mismatch itself too, for the case where the *host* is on an older engine that still lets it in. |
| `06-d-loop` | `d_loop.c` | uids came from `srand(time(NULL)); rand() % 0xfffe`: two players joining in the same second got the same uid, and it could be 0 or 1 (the host's). A refused connection said nothing about why. | 31 random bits, never 0 or 1. `doom: 13, <reason>` for a refusal. `doom: 15` / `doom: 16` when the game is waiting on another player / resumes. `doom: 9` carries the reason. `jw_net_leave()` exported for the page's `pagehide`. |
| `07-i-system` | `i_system.c` | A fatal error went to stderr only (invisible on a phone) and did not stop the frame loop — the browser kept calling into an engine that had given up, raising the error again every frame (18,457 times in one captured run) until a memory fault. | `emscripten_cancel_main_loop()` first; the message is printed once on stdout as `doom: 17, <what>`. |

## Status lines

The engine talks to the page in `doom: N, text` lines (`Module.print`).
`play/index.html`'s `onDoomStatus` is the one place they are interpreted.

```
 1  could not reach the relay            10  game started
 2  connected / reconnected              11  entering fullscreen
 3  out of address slots                 12  (host) a player timed out
 4  socket error                         13  refused by the host: <why>
 5  socket closed (will reconnect)       14  (host) turned a player away
 6  socket silent/failed, reopening      15  waiting for another player
 7  connect failed                       16  game resumed
 8  our uid                              17  fatal engine error: <what>
 9  disconnected from the host (<why>)   18  (host) a player left
```

## The relay's side of the transport

Frames are `[to: u32 LE][from: u32 LE][payload]`. The host is uid 1.

- `from 1, to 0` — the host announcing a new game; the relay clears the room.
- `to 0xFFFFFFFF` — a ping. Nobody receives it; relay-4 binds the sender's uid
  to the socket it arrived on and answers `FF FF FF FF`. Older relays ignore it.

`scripts/check-relay-logic.js` tests exactly this against the real Worker file
under workerd.
