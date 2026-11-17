// The decision log: append-only JSON lines, one event per line. Nothing edits or deletes a line, so a change of mind
// never loses a note; the history is the backup. A memory log stands in for tests.
import { closeSync, existsSync, fsyncSync, openSync, readFileSync, rmSync, statSync, writeSync } from 'node:fs'
import { AGENT_EVENTS, PARENT_EVENTS } from './model.ts'
import type { Actor, NewEvent, ReviewEvent } from './model.ts'

export interface DecisionLog {
  read(): ReviewEvent[]
  append(events: NewEvent[]): ReviewEvent[]
}

const MAX_TEXT = 1000

/** Throws when an event is malformed or when the actor may not write its type. */
export function validate(e: NewEvent, by: Actor): void {
  const allowed: readonly string[] = by === 'parent' ? PARENT_EVENTS : AGENT_EVENTS
  if (e.by !== by) throw new Error(`event by ${e.by}, expected ${by}`)
  if (!allowed.includes(e.type)) throw new Error(`${by} may not write "${e.type}"`)
  if (typeof e.item !== 'string' || !e.item) throw new Error('item required')
  if (e.take != null && typeof e.take !== 'string') throw new Error('take must be a string')
  if (e.text != null && (typeof e.text !== 'string' || e.text.length > MAX_TEXT)) throw new Error('text too long')
  if (['withdraw', 'restore', 'prefer', 'accept'].includes(e.type) && !e.take) throw new Error(`${e.type} needs a take`)
  if (e.type === 'answer' && typeof e.note !== 'number') throw new Error('answer needs a note seq')
  if (e.type === 'accept' && !e.source) throw new Error("accept needs the parent's words (source)")
}

export function memoryLog(initial: ReviewEvent[] = []): DecisionLog {
  const events = [...initial]
  return {
    read: () => [...events],
    append(list) {
      const out = list.map((e, i) => ({ ...e, seq: (events[events.length - 1]?.seq ?? 0) + i + 1 }))
      events.push(...out)
      return out
    },
  }
}

function parse(text: string, path: string): ReviewEvent[] {
  const out: ReviewEvent[] = []
  text.split('\n').forEach((line, i) => {
    if (!line.trim()) return
    try {
      out.push(JSON.parse(line) as ReviewEvent)
    } catch {
      throw new Error(`${path}:${i + 1}: not JSON`)
    }
  })
  return out
}

/** Several processes (the server and the agent CLI) may append: a lock file serialises the appends. */
function withLock<T>(path: string, fn: () => T): T {
  const lock = path + '.lock'
  for (let i = 0; ; i++) {
    try {
      closeSync(openSync(lock, 'wx'))
      break
    } catch (err) {
      // a lock older than 10 s is left over from a crash
      if (existsSync(lock) && Date.now() - statSync(lock).mtimeMs > 10_000) rmSync(lock, { force: true })
      else if (i > 200) throw err
      else Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 10)
    }
  }
  try {
    return fn()
  } finally {
    rmSync(lock, { force: true })
  }
}

export function fileLog(path: string): DecisionLog {
  const read = () => (existsSync(path) ? parse(readFileSync(path, 'utf8'), path) : [])
  return {
    read,
    append(list) {
      return withLock(path, () => {
        const all = read()
        const last = all[all.length - 1]?.seq ?? 0
        const out = list.map((e, i) => ({ ...e, seq: last + i + 1 }))
        const fd = openSync(path, 'a')
        try {
          writeSync(fd, out.map((e) => JSON.stringify(e) + '\n').join(''))
          fsyncSync(fd)
        } finally {
          closeSync(fd)
        }
        return out
      })
    },
  }
}
