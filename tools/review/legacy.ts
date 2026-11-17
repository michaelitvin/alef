// Migration from the old review stores into the decision log, and back (for a lossless round-trip check, and for
// tools that still read the old files).
//
// Two old stores:
// - "choices": {id: {ok: [file], rejected: [{file, note, at}], name?: {say, at}, note?: {text, at}}} and a retake
//   queue [id]. Later games and the English path.
// - "versioned": {id: {pick, status: picked|rejected, note, version, at}}. The first nikkud duel: one decision per item
//   and round; `pick` is an index into that round's takes.
//
// Old stores kept only the latest state. Their backups (snapshots) are replayed in time order, so a note that was
// overwritten in the live file comes back as history.
import type { LegacyFiles, NewEvent, ReviewEvent } from './model.ts'

export interface ChoiceEntry {
  ok?: string[]
  rejected?: { file: string; note: string; at: string }[]
  name?: { say: string; at: string }
  note?: { text: string; at: string }
}
export type Choices = Record<string, ChoiceEntry>

export interface VersionedEntry {
  pick: number | null
  status: 'picked' | 'rejected'
  note: string
  version: number
  at: string
}
export type Versioned = Record<string, VersionedEntry>

export interface Snapshot<T> {
  /** File name, kept as the events' provenance. */
  name: string
  data: T
}

const P = 'parent' as const

// ---- choices ------------------------------------------------------------------------------------------------------

function diffChoiceItem(id: string, a: ChoiceEntry | undefined, b: ChoiceEntry | undefined, src: string): NewEvent[] {
  const out: NewEvent[] = []
  const okA = a?.ok ?? []
  const okB = b?.ok ?? []
  const rejA = new Map((a?.rejected ?? []).map((r) => [r.file, r]))
  const rejB = new Map((b?.rejected ?? []).map((r) => [r.file, r]))
  const base = { by: P, item: id, src }
  // takes whose decision went away: a reset
  for (const f of new Set([...okA, ...rejA.keys()])) {
    if (!okB.includes(f) && !rejB.has(f)) out.push({ ...base, type: 'reset', take: f, at: null })
  }
  // new or edited rejections, oldest first
  const rejs = [...rejB.values()].filter((r) => {
    const o = rejA.get(r.file)
    return !o || o.note !== r.note || o.at !== r.at || okA.includes(r.file)
  })
  rejs.sort((x, y) => (x.at < y.at ? -1 : x.at > y.at ? 1 : 0))
  for (const r of rejs) out.push({ ...base, type: 'reject', take: r.file, text: r.note, at: r.at })
  // new OKs, in list order
  for (const f of okB) if (!okA.includes(f) || rejA.has(f)) out.push({ ...base, type: 'ok', take: f, at: null })
  // the English path's item note and name objection
  for (const [key, field, type] of [['note', 'text', 'note'], ['name', 'say', 'name']] as const) {
    const x = a?.[key] as Record<string, string> | undefined
    const y = b?.[key] as Record<string, string> | undefined
    if (y && (!x || x[field] !== y[field] || x.at !== y.at)) out.push({ ...base, type, text: y[field], at: y.at })
    else if (x && !y) out.push({ ...base, type, text: '', at: null })
  }
  return out
}

/** Events that turn an empty log into the last snapshot, through every earlier one. */
export function importChoices(snapshots: Snapshot<Choices>[], queue?: Snapshot<string[]>): NewEvent[] {
  const out: NewEvent[] = []
  let prev: Choices = {}
  for (const s of snapshots) {
    const ids = new Set([...Object.keys(prev), ...Object.keys(s.data)])
    for (const id of ids) out.push(...diffChoiceItem(id, prev[id], s.data[id], s.name))
    prev = s.data
  }
  if (queue) for (const id of queue.data) out.push({ by: P, type: 'retake', item: id, at: null, src: queue.name })
  return out
}

/** The old choices store from the log (parent events only), as the old server would have written it. */
export function exportChoices(events: ReviewEvent[]): Choices {
  const out: Choices = {}
  const entry = (id: string) => (out[id] ??= { ok: [], rejected: [] })
  for (const e of [...events].sort((a, b) => a.seq - b.seq)) {
    if (e.by !== 'parent') continue
    if (e.type === 'ok' || e.type === 'reject' || e.type === 'reset') {
      const x = entry(e.item)
      const drop = (f: string | null | undefined) => {
        x.ok = x.ok!.filter((o) => f != null && o !== f)
        x.rejected = x.rejected!.filter((r) => f != null && r.file !== f)
      }
      drop(e.take)
      if (e.type === 'ok' && e.take) x.ok!.push(e.take)
      if (e.type === 'reject' && e.take) x.rejected!.push({ file: e.take, note: e.text ?? '', at: e.at ?? '' })
    } else if (e.type === 'note' || e.type === 'name') {
      const x = entry(e.item)
      if (!e.text) delete x[e.type]
      else if (e.type === 'note') x.note = { text: e.text, at: e.at ?? '' }
      else x.name = { say: e.text, at: e.at ?? '' }
    }
  }
  for (const [id, x] of Object.entries(out)) if (!x.ok!.length && !x.rejected!.length && !x.name && !x.note) delete out[id]
  return out
}

/** The old retake queue: every item with a retake request, first request first. */
export function exportQueue(events: ReviewEvent[]): string[] {
  const out: string[] = []
  for (const e of events) if (e.by === 'parent' && e.type === 'retake' && !out.includes(e.item)) out.push(e.item)
  return out
}

/**
 * The old retake queue as the old pages kept it: they added the item with every new Reject (not with an edit of a
 * note). The kit's page sends no retake request, so a new Reject made after the import (an event with no `src`) adds
 * its item here. On a freshly imported log this equals `exportQueue`.
 */
export function exportLegacyQueue(events: ReviewEvent[]): string[] {
  const out: string[] = []
  const add = (id: string) => {
    if (!out.includes(id)) out.push(id)
  }
  const last = new Map<string, Map<string | null, string>>()
  for (const e of [...events].sort((a, b) => a.seq - b.seq)) {
    if (e.by !== 'parent') continue
    if (e.type === 'retake') add(e.item)
    if (e.type !== 'ok' && e.type !== 'reject' && e.type !== 'reset') continue
    const takes = last.get(e.item) ?? new Map<string | null, string>()
    last.set(e.item, takes)
    const take = e.take ?? null
    if (e.type === 'reject' && !e.src && takes.get(take) !== 'reject') add(e.item)
    if (e.type === 'reset' && take == null) takes.clear()
    else takes.set(take, e.type)
  }
  return out
}

/** One old file and its contents from the log. */
export interface LegacyView {
  path: string
  /** Where the file is kept before the kit first writes it. */
  frozen: string
  data: unknown
  /** Contents of a missing file. */
  empty: unknown
}

/** The old files a game keeps for tools outside the kit, from the log (parent events only). */
export function legacyViews(v: LegacyFiles, events: ReviewEvent[]): LegacyView[] {
  if (v.rounds) return [{ path: v.choices, frozen: v.frozenChoices, data: exportVersioned(events, v.rounds()), empty: {} }]
  const out: LegacyView[] = [{ path: v.choices, frozen: v.frozenChoices, data: exportChoices(events), empty: {} }]
  if (v.queue) out.push({ path: v.queue, frozen: v.frozenQueue ?? v.queue + '.pre-kit', data: exportLegacyQueue(events), empty: [] })
  return out
}

/** Deep equality as JSON sees it: key order of objects does not count, order of lists does. */
export function sameJson(a: unknown, b: unknown): boolean {
  if (a === b) return true
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false
  if (Array.isArray(a) !== Array.isArray(b)) return false
  if (Array.isArray(a)) {
    const bb = b as unknown[]
    return a.length === bb.length && a.every((x, i) => sameJson(x, bb[i]))
  }
  const ka = Object.keys(a)
  const ob = b as Record<string, unknown>
  return ka.length === Object.keys(ob).length && ka.every((k) => k in ob && sameJson((a as Record<string, unknown>)[k], ob[k]))
}

// ---- versioned (the first nikkud duel) -------------------------------------------------------------------------------

/** That game's manifest: the takes of each item's current round. */
export type RoundTakes = Record<string, { version: number; takes: string[] }>

/** Take id for a pick: the take's file when the round is the manifest's round, else "v<round>#<pick>". */
export function takeForPick(rounds: RoundTakes, id: string, version: number, pick: number): string {
  const r = rounds[id]
  return r && r.version === version && r.takes[pick] ? r.takes[pick] : `v${version}#${pick}`
}

export function pickForTake(rounds: RoundTakes, id: string, version: number, take: string): number {
  const r = rounds[id]
  if (r && r.version === version && r.takes.includes(take)) return r.takes.indexOf(take)
  const m = /^v(\d+)#(\d+)$/.exec(take)
  if (!m) throw new Error(`${id}: take ${take} has no pick in round ${version}`)
  return Number(m[2])
}

function versionedEvent(id: string, x: VersionedEntry, rounds: RoundTakes, src: string): NewEvent {
  const take = x.pick == null ? null : takeForPick(rounds, id, x.version, x.pick)
  // "picked" replaces any earlier pick of the item: a pick is exclusive
  if (x.status === 'picked') return { by: P, type: 'ok', item: id, take, text: x.note, round: x.version, only: true, at: x.at, src }
  return { by: P, type: 'reject', item: id, take, text: x.note, round: x.version, at: x.at, src }
}

export function importVersioned(snapshots: Snapshot<Versioned>[], rounds: RoundTakes): NewEvent[] {
  const out: NewEvent[] = []
  let prev: Versioned = {}
  for (const s of snapshots) {
    const changed: NewEvent[] = []
    for (const id of new Set([...Object.keys(prev), ...Object.keys(s.data)])) {
      const a = prev[id]
      const b = s.data[id]
      if (!b) changed.push({ by: P, type: 'reset', item: id, take: null, at: null, src: s.name })
      else if (!a || JSON.stringify(a) !== JSON.stringify(b)) {
        // a re-decision on a take-less round: clear first, so the old verdict does not linger
        if (a) changed.push({ by: P, type: 'reset', item: id, take: null, at: null, src: s.name })
        changed.push(versionedEvent(id, b, rounds, s.name))
      }
    }
    // the old store kept the time of each decision: keep that order
    changed.sort((x, y) => ((x.at ?? '') < (y.at ?? '') ? -1 : (x.at ?? '') > (y.at ?? '') ? 1 : 0))
    out.push(...changed)
    prev = s.data
  }
  return out
}

export function exportVersioned(events: ReviewEvent[], rounds: RoundTakes): Versioned {
  const out: Versioned = {}
  for (const e of [...events].sort((a, b) => a.seq - b.seq)) {
    if (e.by !== 'parent') continue
    if (e.type === 'reset') delete out[e.item]
    else if (e.type === 'ok' || e.type === 'reject') {
      const version = e.round ?? 1
      out[e.item] = {
        pick: e.take == null ? null : pickForTake(rounds, e.item, version, e.take),
        status: e.type === 'ok' ? 'picked' : 'rejected',
        note: e.text ?? '',
        version,
        at: e.at ?? '',
      }
    }
  }
  return out
}

/** Order backups by the time stamp in their names ("choices.backup-20261015-034149.json"), the live file last. */
export function snapshotOrder(names: string[], live: string): string[] {
  const stamp = (n: string) => {
    const m = /(\d{8})(?:-(\d{6}))?/.exec(n)
    return m ? m[1] + (m[2] ?? '') : ''
  }
  return [...names.filter((n) => n !== live).sort((a, b) => (stamp(a) < stamp(b) ? -1 : stamp(a) > stamp(b) ? 1 : a < b ? -1 : 1)), live]
}
