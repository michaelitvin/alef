// The agent CLI over a game's decision log. Agents ask it for work and record pipeline facts; they never parse the old
// choices files and never write the parent's decisions.
//
//   node tools/review/cli.ts <adapter.mjs> <command> [args]
//
// Read:   status | open [view] | notes [--all] | retakes | current <item> | ship [--compare <file.json>]
//         export-choices | export-queue | export-versioned <rounds.json>
//         legacy-check (does each of the adapter's old files hold what the log exports?)
// Write (agent events only):
//         answer <item> <note-seq|all> <text> [--take T]   accept <item> <source> [--take T]   ask <item> <text>
//         withdraw <item> <take> <reason>   restore <item> <take>   retire <item> <reason>   unretire <item>
//         prefer <item> <take>
// Import (into an empty log only): import-choices <live.json> [--backup F]... [--queue Q] [--accepted] [--focus F]
//         import-versioned <live.json> <rounds.json> [--backup F]...
import { existsSync, readFileSync } from 'node:fs'
import { basename, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { fileLog, validate } from './log.ts'
import type { DecisionLog } from './log.ts'
import type { GameAdapter, Item, NewEvent } from './model.ts'
import { deriveAll, deriveItem, inView, openNotes, retakeList, shipList, withOrphans } from './rules.ts'
import type { View } from './rules.ts'
import { exportChoices, exportQueue, exportVersioned, importChoices, importVersioned, legacyViews, sameJson, snapshotOrder } from './legacy.ts'
import type { Choices, RoundTakes, Versioned } from './legacy.ts'

export async function loadAdapter(path: string): Promise<GameAdapter> {
  const mod = (await import(pathToFileURL(resolve(path)).href)) as { default: GameAdapter }
  return mod.default
}

const readJson = <T>(p: string): T => JSON.parse(readFileSync(p, 'utf8')) as T

interface Args {
  pos: string[]
  opt: Record<string, string[]>
  flag: Set<string>
}

function parseArgs(argv: string[]): Args {
  const a: Args = { pos: [], opt: {}, flag: new Set() }
  const valued = new Set(['take', 'backup', 'queue', 'focus', 'compare'])
  for (let i = 0; i < argv.length; i++) {
    const s = argv[i]
    if (s.startsWith('--')) {
      const k = s.slice(2)
      if (valued.has(k)) (a.opt[k] ??= []).push(argv[++i])
      else a.flag.add(k)
    } else a.pos.push(s)
  }
  return a
}

const now = () => new Date().toISOString()

/** Run one command. Returns what to print. Exported for tests. */
export async function run(adapter: GameAdapter, log: DecisionLog, argv: string[]): Promise<unknown> {
  const { pos, opt, flag } = parseArgs(argv)
  const [cmd, ...rest] = pos
  const items = withOrphans(await adapter.loadItems(), log.read())
  const byId = new Map(items.map((i) => [i.id, i]))
  const states = () => deriveAll(items, log.read())
  const item = (id: string | undefined): Item => {
    const it = id && byId.get(id)
    if (!it) throw new Error(`no item ${id}`)
    return it
  }
  const write = (e: Omit<NewEvent, 'by' | 'at'>) => {
    const ev: NewEvent = { ...e, by: 'agent', at: now() }
    validate(ev, 'agent')
    return log.append([ev])[0]
  }
  const take = opt.take?.[0]

  switch (cmd) {
    case 'status': {
      const count: Record<string, number> = {}
      for (const s of states()) count[s.status] = (count[s.status] ?? 0) + 1
      return { items: items.length, ...count, openNotes: openNotes(states()).length }
    }
    case 'open':
      return states()
        .filter((s) => inView(s, (rest[0] as View) || 'open'))
        .map((s) => ({ item: s.item.id, current: s.current?.id ?? null, ask: s.ask, flagged: s.flagged }))
    case 'notes':
      return openNotes(states(), flag.has('all'))
    case 'retakes':
      return retakeList(states())
    case 'current': {
      const s = deriveItem(item(rest[0]), log.read())
      return { item: s.item.id, status: s.status, current: s.current?.id ?? null, takes: s.takes.map((t) => ({ take: t.take.id, verdict: t.verdict, text: t.text, withdrawn: t.withdrawn })), notes: s.notes, ask: s.ask, retired: s.retired }
    }
    case 'ship': {
      const ship = shipList(states())
      if (!opt.compare) return ship
      // compare with what a sync last shipped: {id: take} or {id: {take}}
      const old = readJson<Record<string, string | { take: string }>>(opt.compare[0])
      return Object.entries(ship)
        .map(([id, t]) => ({ item: id, shipped: typeof old[id] === 'string' ? old[id] : (old[id] as { take: string } | undefined)?.take ?? null, rule: t }))
        .filter((d) => d.shipped !== d.rule)
    }
    case 'export-choices':
      return exportChoices(log.read())
    case 'export-queue':
      return exportQueue(log.read())
    case 'export-versioned':
      return exportVersioned(log.read(), readJson<RoundTakes>(rest[0]))
    case 'legacy-check': {
      if (!adapter.legacy) throw new Error(`${adapter.id} has no legacy files`)
      return legacyViews(adapter.legacy, log.read()).map((v) => ({ file: v.path, same: existsSync(v.path) && sameJson(readJson(v.path), v.data) }))
    }
    case 'answer': {
      const s = deriveItem(item(rest[0]), log.read())
      const open = s.notes.filter((n) => n.state === 'open' && (rest[1] === 'all' || n.seq === Number(rest[1])))
      if (!open.length) throw new Error(`no open note ${rest[1]} on ${rest[0]}`)
      return open.map((n) => write({ type: 'answer', item: s.item.id, note: n.seq, text: rest[2] ?? '', take: take ?? null }))
    }
    case 'accept': {
      const it = item(rest[0])
      const t = take ?? deriveItem(it, log.read()).current?.id
      return write({ type: 'accept', item: it.id, take: t, source: rest[1] })
    }
    case 'ask':
      return write({ type: 'ask', item: item(rest[0]).id, text: rest[1] ?? '', take: take ?? null })
    case 'withdraw':
    case 'restore':
    case 'prefer':
      return write({ type: cmd, item: item(rest[0]).id, take: rest[1], text: rest[2] })
    case 'retire':
    case 'unretire':
      return write({ type: cmd, item: item(rest[0]).id, text: rest[1] })
    case 'import-choices':
    case 'import-versioned': {
      if (log.read().length) throw new Error('the log is not empty: import only into a new log')
      const live = rest[0]
      const files = snapshotOrder([...(opt.backup ?? []), live], live)
      let events: NewEvent[]
      if (cmd === 'import-choices') {
        const q = opt.queue?.[0]
        events = importChoices(
          files.map((f) => ({ name: basename(f), data: readJson<Choices>(f) })),
          q ? { name: basename(q), data: readJson<string[]>(q) } : undefined,
        )
      } else {
        events = importVersioned(files.map((f) => ({ name: basename(f), data: readJson<Versioned>(f) })), readJson<RoundTakes>(rest[1]))
      }
      const written = log.append(events)
      // pipeline facts that the old stores kept outside the parent's file
      const agent: Omit<NewEvent, 'by' | 'at'>[] = []
      const derived = deriveAll(items, log.read())
      if (flag.has('accepted')) {
        for (const s of derived) {
          const src = s.item.accepted
          if (src && s.current && s.status === 'open') agent.push({ type: 'accept', item: s.item.id, take: s.current.id, source: src })
        }
      }
      if (opt.focus) {
        const f = readJson<{ items?: Record<string, string> }>(opt.focus[0])
        for (const [id, text] of Object.entries(f.items ?? {})) if (byId.has(id)) agent.push({ type: 'ask', item: id, text })
      }
      for (const e of agent) write(e)
      return { parentEvents: written.length, agentEvents: agent.length }
    }
    default:
      throw new Error(`unknown command ${cmd ?? ''}; see the head of tools/review/cli.ts`)
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const [adapterPath, ...argv] = process.argv.slice(2)
  if (!adapterPath) {
    console.error('usage: node tools/review/cli.ts <adapter.mjs> <command> [args]')
    process.exit(2)
  }
  loadAdapter(adapterPath)
    .then(async (adapter) => {
      const out = await run(adapter, fileLog(adapter.log), argv)
      console.log(JSON.stringify(out, null, 1))
    })
    .catch((err: Error) => {
      console.error(err.message)
      process.exit(1)
    })
}
