// One review server for every game: the page shell, the derived state, the parent's decisions (appended to the game's
// decision log) and the media files. Host facts (address, port, folders) come from a host-local config.
//
//   node tools/review/server.ts <config.mjs>
//
// config.mjs: export default { host, port, games: [adapter, ...] } (see model.ts GameAdapter). Each game is served
// under /<game id>/: the page at /<id>/, GET /<id>/api/state, POST /<id>/api/event, files under /<id>/media/<root>/.
// A game with `legacy` files gets them written again from the log after each decision (legacyFiles.ts).
import { createReadStream, existsSync, readFileSync, realpathSync, statSync } from 'node:fs'
import { createServer } from 'node:http'
import type { IncomingMessage, Server, ServerResponse } from 'node:http'
import { stripTypeScriptTypes } from 'node:module'
import { dirname, extname, join, resolve, sep } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { fileLog, validate } from './log.ts'
import type { DecisionLog } from './log.ts'
import type { GameAdapter, NewEvent } from './model.ts'
import { writeLegacyFiles } from './legacyFiles.ts'
import { deriveAll, deriveItem } from './rules.ts'
import { toPageItem, toPageState } from './pageData.ts'

export interface ServerConfig {
  host?: string
  port: number
  games: GameAdapter[]
}

const PAGE_DIR = join(dirname(fileURLToPath(import.meta.url)), 'page')
const TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.ts': 'text/javascript; charset=utf-8',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.webp': 'image/webp',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.woff2': 'font/woff2',
}
const PAGE_FILES = new Set(['index.html', 'main.ts', 'render.ts', 'flow.ts', 'page.css'])

/** The real path of `rel` under `root`, or null when it leaves the root. */
export function safeUnder(root: string, rel: string): string | null {
  let base: string
  let p: string
  try {
    base = realpathSync(root)
    p = realpathSync(resolve(base, rel))
  } catch {
    return null
  }
  return p === base || p.startsWith(base + sep) ? p : null
}

function send(res: ServerResponse, code: number, body: string | Buffer, type = 'text/plain; charset=utf-8') {
  res.writeHead(code, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-cache' })
  res.end(body)
}
const json = (res: ServerResponse, obj: unknown, code = 200) => send(res, code, JSON.stringify(obj), TYPES['.json'])

function sendFile(req: IncomingMessage, res: ServerResponse, path: string) {
  const size = statSync(path).size
  const type = TYPES[extname(path).toLowerCase()] ?? 'application/octet-stream'
  const m = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '')
  let start = 0
  let end = size - 1
  if (m && (m[1] || m[2])) {
    start = m[1] ? Number(m[1]) : Math.max(0, size - Number(m[2]))
    end = m[1] && m[2] ? Math.min(Number(m[2]), size - 1) : size - 1
    if (start > end) return send(res, 416, 'range')
    res.writeHead(206, { 'Content-Type': type, 'Content-Length': end - start + 1, 'Content-Range': `bytes ${start}-${end}/${size}`, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' })
  } else res.writeHead(200, { 'Content-Type': type, 'Content-Length': size, 'Accept-Ranges': 'bytes', 'Cache-Control': 'no-cache' })
  if (req.method === 'HEAD') return res.end()
  createReadStream(path, { start, end }).pipe(res)
}

function pageFile(name: string): string {
  const text = readFileSync(join(PAGE_DIR, name), 'utf8')
  return name.endsWith('.ts') ? stripTypeScriptTypes(text) : text
}

async function body(req: IncomingMessage): Promise<unknown> {
  const chunks: Buffer[] = []
  let n = 0
  for await (const c of req) {
    n += (c as Buffer).length
    if (n > 20_000) throw new Error('body too large')
    chunks.push(c as Buffer)
  }
  return JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}')
}

/** Build the request handler. `logs` maps a game id to its log (tests pass memory logs). */
export function handler(games: GameAdapter[], logs: Map<string, DecisionLog>) {
  const byId = new Map(games.map((g) => [g.id, g]))
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const url = new URL(req.url ?? '/', 'http://x')
      const parts = url.pathname.split('/').slice(1).map(decodeURIComponent)
      if (parts.length === 1 && !parts[0]) {
        const links = games.map((g) => `<li><a href="${g.id}/">${g.title.replace(/</g, '&lt;')}</a></li>`).join('')
        return send(res, 200, `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Review</title><ul>${links}</ul>`, TYPES['.html'])
      }
      const game = byId.get(parts[0])
      if (!game) return send(res, 404, 'no such game')
      if (parts.length === 1) {
        res.writeHead(308, { Location: url.pathname + '/' })
        return res.end()
      }
      const log = logs.get(game.id)!
      const rest = parts.slice(1)
      if (req.method === 'POST' && rest.join('/') === 'api/event') {
        const b = (await body(req)) as Partial<NewEvent>
        const items = await game.loadItems()
        const it = items.find((i) => i.id === b.item)
        if (!it) return json(res, { error: 'no such item' }, 400)
        const tk = b.take != null ? it.takes.find((t) => t.id === b.take) : undefined
        if (b.take != null && !tk) return json(res, { error: 'no such take' }, 400)
        const ev: NewEvent = {
          by: 'parent',
          at: new Date().toISOString(),
          type: b.type as NewEvent['type'],
          item: it.id,
          ...(b.take != null ? { take: b.take } : {}),
          ...(typeof b.text === 'string' ? { text: b.text.trim() } : {}),
          ...(b.only ? { only: true } : {}),
          ...(tk?.round != null ? { round: tk.round } : {}),
        }
        try {
          validate(ev, 'parent')
        } catch (err) {
          return json(res, { error: (err as Error).message }, 400)
        }
        const before = log.read()
        log.append([ev])
        const after = log.read()
        if (game.legacy) {
          const { skipped } = writeLegacyFiles(game.legacy, before, after)
          for (const s of skipped) console.warn(`${game.id}: legacy file ${s}`)
        }
        return json(res, { item: toPageItem(deriveItem(it, after)) })
      }
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'method')
      if (rest.join('/') === 'api/state') return json(res, toPageState(game, deriveAll(await game.loadItems(), log.read())))
      if (rest[0] === 'media' && rest.length > 2) {
        const root = game.media[rest[1]]
        const p = root ? safeUnder(root, rest.slice(2).join('/')) : null
        return p && existsSync(p) && statSync(p).isFile() ? sendFile(req, res, p) : send(res, 404, 'not found')
      }
      const name = rest.join('/') || 'index.html'
      if (PAGE_FILES.has(name)) return send(res, 200, pageFile(name), TYPES[extname(name)])
      return send(res, 404, 'not found')
    } catch (err) {
      return json(res, { error: (err as Error).message }, 500)
    }
  }
}

export function startServer(config: ServerConfig, logs?: Map<string, DecisionLog>): Server {
  const l = logs ?? new Map(config.games.map((g) => [g.id, fileLog(g.log)]))
  const server = createServer((req, res) => void handler(config.games, l)(req, res))
  server.listen(config.port, config.host ?? '127.0.0.1')
  return server
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const path = process.argv[2]
  if (!path) {
    console.error('usage: node tools/review/server.ts <config.mjs>')
    process.exit(2)
  }
  import(pathToFileURL(resolve(path)).href).then((mod: { default: ServerConfig }) => {
    const s = startServer(mod.default)
    s.on('listening', () => console.log('review server listening', s.address()))
  })
}
