// Bump on every worker deploy. /api/health echoes it so the arena page — and
// you — can confirm which build is actually live at doom.yuccabucca.com,
// rather than guessing from the dashboard's version list.
const BUILD = 'relay-2'

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

  async handleSession(webSocket) {
    webSocket.accept()

    webSocket.addEventListener('message', async msg => {
      try {
        let data = msg.data
        let from = new Uint32Array(data.slice(4, 8))[0]
        let to = new Uint32Array(data.slice(0, 4))[0]
        let i

        if (from == 1 && to == 0) {
          // initial packet from doom server, let's restart
          this.sessions.forEach(s => {
            s.ws.close(1011, 'closing')
          })
          this.sessions = []
        }

        // if it's a new client, add it to the table of clients
        if (this.sessions.map(c => c.from).indexOf(from) == -1) {
          let session = { ws: webSocket, from: from }
          this.sessions.push(session)
        }

        // send this packet to the corresponding client
        i = this.sessions.map(c => c.from).indexOf(to)
        if (i != -1) {
          try { this.sessions[i].ws.send(data.slice(4)) } catch (x) { /* peer gone */ }
        }
      } catch (err) {
        // Sending the stack back down a game socket corrupts the binary
        // protocol (and throws again if the socket is already closing).
        // Swallow it — a single bad frame must not tear the relay down.
        try { console.log('relay session error: ' + (err && err.stack || err)) } catch (x) {}
      }
    })

    // On "close" and "error" events, remove the WebSocket from the clients list
    let closeOrErrorHandler = async () => {
      i = this.sessions.map(e => e.ws).indexOf(webSocket)
      if (i != -1) {
        this.sessions.splice(i, 1)
      }
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
