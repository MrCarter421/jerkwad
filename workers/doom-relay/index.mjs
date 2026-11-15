// Bump on every worker deploy. /api/health echoes it so the arena page — and
// you — can confirm which build is actually live at doom.yuccabucca.com,
// rather than guessing from the dashboard's version list.
const BUILD = 'relay-4'

export default {
  async fetch(request, env) {
    let url = new URL(request.url)
    let route = url.pathname.slice(1).split('/')[0]

    switch (route) {
      case 'api':
        return handleApiRequest(url.pathname, request, env)
      default:
        return new Response('notfound ' + route, { status: 404 })
    }
  },
}

async function checkRoom(perma, env) {
  try {
    const parts = perma.split('-')
    const digest = await crypto.subtle.digest(
      { name: 'SHA-256' },
      new TextEncoder().encode(parts[0] + env.DOOM_KEY),
    )
    const hash = Array.from(new Uint8Array(digest))
    const hex = hash
      .slice(0, 4)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    return parts[1] == hex ? parts[0] : false
  } catch (e) {
    return false
  }
}

async function createRoom(env) {
  const room = env.router.newUniqueId().toString()
  const digest = await crypto.subtle.digest(
    { name: 'SHA-256' },
    new TextEncoder().encode(room + env.DOOM_KEY),
  )
  const hash = Array.from(new Uint8Array(digest))
  const hex = hash
    .slice(0, 4)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return `${room}-${hex}`
}

async function jsonReply(json, status) {
  return new Response(JSON.stringify(json), {
    headers: {
      'content-type': 'application/json;charset=UTF-8',
      'Access-Control-Allow-Origin': '*',
    },
    status: status,
  })
}

async function handleApiRequest(path, request, env) {
  let parts = path.slice(1).split('/')
  let room = false

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'content-type',
      },
    })
  }

  switch (parts[1]) {
    case 'lobby': {
      // Single global lobby Durable Object.
      const id = env.lobby.idFromName('global')
      return env.lobby.get(id).fetch(request)
    }

    case 'ws':
    case 'room':
      room = await checkRoom(parts[2], env)
      if (room) {
        // in the future this will be our game id
        let id = env.router.idFromString(room)
        let routerObject = env.router.get(id)
        // Forward the ORIGINAL request. The upstream doom-workers code
        // passed (path, request) — a relative URL string — which the
        // modern module-workers runtime rejects (Request URLs must be
        // absolute), 500-ing every game WebSocket while plain HTTPS
        // routes kept working. Forwarding `request` untouched also
        // keeps the WebSocket upgrade attached, which a copied Request
        // would not.
        return routerObject.fetch(request)
      } else {
        return jsonReply({ reason: 'invalid room' }, 404)
      }

    case 'newroom':
      room = await createRoom(env)
      return jsonReply({ room: room }, 200)

    // Is the relay alive, and which build? Cheap GET, no Durable Object.
    case 'health':
      return jsonReply({ ok: true, build: BUILD, time: Date.now() }, 200)

    // Transport probe. Isolates "the WebSocket path through Cloudflare works"
    // from "the Doom netgame handshake works" — the play page's TEST RELAY
    // button opens this and echoes a ping. If echo succeeds but a game still
    // fails, the problem is in the game layer, not the relay. If echo fails,
    // it is DNS / the route / Cloudflare WebSockets / an un-redeployed worker.
    case 'echo': {
      if (request.headers.get('Upgrade') !== 'websocket') {
        return jsonReply({ ok: true, note: 'connect with a websocket to echo-test' }, 200)
      }
      const [client, server] = Object.values(new WebSocketPair())
      server.accept()
      server.addEventListener('message', (e) => { try { server.send(e.data) } catch (x) {} })
      return new Response(null, { status: 101, webSocket: client })
    }

    default:
      return jsonReply({ reason: 'api not found' }, 404)
  }
}

export class Router {
  constructor(controller, env) {
    this.storage = controller.storage
    this.env = env
    this.sessions = []
    this.gameStarted = false
  }

  async fetch(request) {
    let url = new URL(request.url)
    let up = url.pathname.slice(1).split('/')

    switch (up[1]) {
      case 'room':
        var room = await checkRoom(up[2], this.env)
        if (room) {
          if (up[3] == 'started') {
            this.gameStarted = true
          }
          return jsonReply(
            {
              room: room,
              gameStarted: this.gameStarted,
              players: this.sessions.length,
            },
            200,
          )
        } else {
          return jsonReply({ reason: 'invalid room' }, 404)
        }

      case 'ws':
        if (request.headers.get('Upgrade') != 'websocket') {
          return new Response('expected websocket', { status: 400 })
        }

        // Get the client's IP address for use with the rate limiter.
        // let ip = request.headers.get('CF-Connecting-IP')

        const [client, server] = Object.values(new WebSocketPair())

        await this.handleSession(server)
        return new Response(null, { status: 101, webSocket: client })

      // A Durable Object that returns undefined is a runtime error (it shows
      // up as a spike in the dashboard's error count). Answer unknown paths.
      default:
        return jsonReply({ reason: 'router: unknown path' }, 404)
    }
  }

  // -------------------------------------------------------------------------
  // The relay protocol. Every frame from a player is
  //
  //     [to: u32 LE][from: u32 LE][payload…]
  //
  // and is delivered to whichever socket `to` is bound to as [from][payload].
  // uids are the engine's "addresses": the host (the Doom server) is always 1,
  // joiners pick a random one. Three addresses are special:
  //
  //   from 1, to 0            the host announcing a NEW game — clear the room
  //   to 0xFFFFFFFF           a ping: nobody to deliver to. The frame still
  //                           (re)binds its sender, and the relay answers with
  //                           the four bytes FF FF FF FF. The engine uses the
  //                           answer to tell "the relay is unreachable" apart
  //                           from "the other player's tab is frozen" — only
  //                           the first is fixed by opening a new socket.
  //
  // The binding rule is the heart of it: a uid belongs to the socket its most
  // recent frame arrived on. Players reconnect (a network handover, a phone
  // waking up, this object being restarted) and come back with the SAME uid
  // on a NEW socket; routing must follow them. relay-2 only ever bound a uid
  // once, so the first reconnect in a game left everyone talking to a dead
  // socket until Doom timed them out.
  // -------------------------------------------------------------------------
  async handleSession(webSocket) {
    webSocket.accept()

    const PING = 0xffffffff
    const PONG = new Uint8Array([0xff, 0xff, 0xff, 0xff])

    webSocket.addEventListener('message', msg => {
      try {
        const data = msg.data
        // Text frames and runts are not ours; a bad frame must not throw.
        if (!(data instanceof ArrayBuffer) || data.byteLength < 8) return
        const head = new DataView(data)
        const to = head.getUint32(0, true)
        const from = head.getUint32(4, true)

        if (from === 1 && to === 0) {
          // The host is starting a new game in this room: drop whoever was
          // here before — but not the socket this very frame arrived on.
          for (const s of this.sessions) {
            if (s.ws !== webSocket) {
              try { s.ws.close(1000, 'new game') } catch (x) {}
            }
          }
          this.sessions = []
        }

        // Bind — or REBIND — this uid to the socket the frame arrived on.
        const known = this.sessions.find(c => c.from === from)
        if (!known) {
          this.sessions.push({ ws: webSocket, from: from })
        } else if (known.ws !== webSocket) {
          // The player came back on a new socket. Retire the old one so it
          // cannot linger half-open, and so a late frame still buffered on it
          // cannot steal the binding back.
          const old = known.ws
          known.ws = webSocket
          try { old.close(1000, 'replaced') } catch (x) {}
        }

        if (to === PING) {
          try { webSocket.send(PONG) } catch (x) {}
          return
        }

        // send this packet to the corresponding client
        const dst = this.sessions.find(c => c.from === to)
        if (dst) {
          try {
            dst.ws.send(data.slice(4))
          } catch (x) {
            // Target socket is gone. Drop it so the peer's next packet can
            // rebind a fresh one instead of us holding a corpse forever.
            this.sessions = this.sessions.filter(s => s !== dst)
          }
        }
      } catch (err) {
        // Sending the stack back down a game socket corrupts the binary
        // protocol (and throws again if the socket is already closing).
        // Swallow it — a single bad frame must not tear the relay down.
        try { console.log('relay session error: ' + (err && err.stack || err)) } catch (x) {}
      }
    })

    // On "close" and "error" events, drop this socket from the table. Only
    // remove the entry if it still points at THIS socket — a reconnect may
    // already have rebound the uid to a newer one.
    //
    // And ANSWER the close. With this worker's compatibility date the runtime
    // does not reply to a client's Close frame by itself, so a browser that
    // closed its end sat in CLOSING forever: its `onclose` never fired, the
    // engine went on believing the socket was open, and wrote every packet
    // into the void. Closing our end completes the handshake.
    const closeOrErrorHandler = () => {
      this.sessions = this.sessions.filter(e => e.ws !== webSocket)
      try { webSocket.close(1000, 'bye') } catch (x) {}
    }
    webSocket.addEventListener('close', closeOrErrorHandler)
    webSocket.addEventListener('error', closeOrErrorHandler)
  }
}


// ---------------------------------------------------------------------------
// Arena lobby — a single global Durable Object holding the public level
// registry. Levels carry {seed, rooms, enemies} so joiners rebuild the WAD
// locally (deterministic generator) — no level data is ever uploaded.
// Entries expire after 4 hours, or after 10 minutes with zero players.
// ---------------------------------------------------------------------------
export class Lobby {
  constructor(controller, env) {
    this.storage = controller.storage
    this.env = env
  }

  async fetch(request) {
    const url = new URL(request.url)
    const parts = url.pathname.slice(1).split('/')
    const action = parts[2]

    if (action === 'register' && request.method === 'POST') {
      let body
      try {
        body = await request.json()
      } catch (e) {
        return jsonReply({ reason: 'bad json' }, 400)
      }
      if (!body.room || typeof body.seed !== 'number') {
        return jsonReply({ reason: 'room and seed required' }, 400)
      }
      const entry = {
        room: String(body.room).slice(0, 80),
        // Defence in depth: the arena page renders names as text nodes, but
        // anyone can POST here from any origin, so don't STORE anything that
        // could hurt a future/third-party client that is less careful.
        // Arena names are a display label — letters, digits and basic
        // punctuation are all they ever need.
        name: (String(body.name || 'UNNAMED')
          .replace(/[^A-Za-z0-9 _.\-!?']/g, '')
          .trim()
          .slice(0, 24)) || 'UNNAMED',
        seed: body.seed | 0,
        rooms: Math.max(1, Math.min(100, body.rooms | 0)),
        enemies: Math.max(0, Math.min(100, body.enemies | 0)),
        maxPlayers: Math.max(1, Math.min(4, body.maxPlayers | 0)),
        dm: !!body.dm,
        created: Date.now(),
      }
      await this.storage.put('lvl:' + entry.room, entry)
      return jsonReply({ ok: true }, 200)
    }

    if (action === 'list') {
      const all = await this.storage.list({ prefix: 'lvl:' })
      const now = Date.now()
      const levels = []
      for (const [key, entry] of all) {
        if (now - entry.created > 4 * 3600 * 1000) {
          await this.storage.delete(key)
          continue
        }
        // Live player count from the room's Router DO.
        let players = 0
        try {
          const id = this.env.router.idFromString(entry.room.split('-')[0])
          const res = await this.env.router.get(id).fetch('https://internal/api/room/' + entry.room)
          if (res.ok) players = ((await res.json()).players | 0)
        } catch (e) { /* room gone */ }
        if (players === 0 && now - entry.created > 10 * 60 * 1000) {
          await this.storage.delete(key)
          continue
        }
        levels.push({ ...entry, players })
        if (levels.length >= 25) break
      }
      levels.sort((a, b) => b.created - a.created)
      return jsonReply({ levels }, 200)
    }

    return jsonReply({ reason: 'lobby api not found' }, 404)
  }
}
