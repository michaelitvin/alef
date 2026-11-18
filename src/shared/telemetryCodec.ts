// The sealed chunk codec: the events of one page session ⇄ one compact, deflated string. Pure and sync (no storage).
//
// A sealed value is a plain JSON header and a payload:
//   {"v":3,"s":"<session>","t0":<ms>,"t1":<ms>,"n":<count>,"enc":"cz1","d":"<base64>"}
// The header gives the counts, the age and the eviction order without a decode. `d` is the deflated (fflate) UTF-8 of
// the compact form, in base64 (one byte per character, so localStorage counts it as it is).
//
// The compact form is `[strings, schemas, order, cols]`:
// - `strings`: a dictionary; a top-level string value is stored once and written as its index.
// - `schemas`: one per distinct ordered key list (the order is kept, so a rebuilt event stringifies the same), each
//   `[keys, modes]` with one mode per key, chosen from every row of that schema:
//     'T'  `t`, as a delta from the previous event's `t` (every row has an integer `t`);
//     'S'  `s`, left out: it is the header's session (every row has it);
//     ['C', value]  the same value in every row (`g`, `via`, …): stored once, in the schema;
//     'O'  a time field (an epoch-ms integer such as `clock`, ≥ 10¹² in every row, after `t` in the key order): stored as
//          `t − value`;
//     'R'  `run`, as a delta from the previous row of its schema (every row has an integer `run`);
//     'D'  a string, as its dictionary index (every row has a string there);
//     'P'  a plain JSON value (anything else: numbers, booleans, null, arrays, objects).
// - `order`: each event's schema, in order; `cols`: per schema, its stored columns, each the values of its rows in
//   order (column by column, so like values sit together for deflate). A column in mode 'S' or ['C', value] has none.
//
// The rebuild is exact: decode(encode(evs)) stringifies byte-equal to evs (same keys, same order, same values). The
// events are first taken as their JSON (`undefined` fields drop out, as they do when a log is stored). Why each trim is
// exact:
// - 'T', 'O' and 'R' are integer arithmetic on safe integers (t, the field and run are all checked to be safe
//   integers, and so are their differences), so adding back gives the same number;
// - ['C', value] keeps the value's JSON, parsed again for each row (a nested value is not shared between events);
// - 'S' and 'D' put back the very string.
// Kept on purpose, with no rebuild from elsewhere: the `clock` field (it is not always `t`: `clock: Date.now()` runs
// before `track` reads its own `Date.now()`, so it is stored as a small offset, never dropped) and the tower `line`
// event's hashed `url` (the hash changes per build, so the export cannot rebuild it; the dictionary stores each URL
// once per chunk). No field name is special except `t`, `s` and `run`, the envelope: a new game's time fields are
// trimmed too.
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import type { TelemetryEvent } from './telemetry'

const VERSION = 3
const ENC = 'cz1'

export interface ChunkHeader { v: 3; s: string; t0: number; t1: number; n: number; enc: string }

type Mode = 'T' | 'S' | 'D' | 'P' | 'O' | 'R' | ['C', unknown]
type Schema = [keys: string[], modes: Mode[]]
type Compact = [strings: string[], schemas: Schema[], order: number[], cols: unknown[][][]]

const isInt = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x)

function toBase64(bytes: Uint8Array): string {
  let bin = ''
  const SLICE = 0x8000 // String.fromCharCode over slices: no spread of a large array
  for (let i = 0; i < bytes.length; i += SLICE) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + SLICE) as unknown as number[])
  return btoa(bin)
}

function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

/** an epoch-ms time: at least 10¹² (2001-09-09) */
const EPOCH_MS = 1e12

/**
 * Seal the events of one page session (in order, every `t` an integer) into a chunk value. Deterministic: the same
 * events give the same string. Throws on no events or a `t` that is not an integer (the sealer catches it).
 */
export function encodeChunk(events: readonly TelemetryEvent[]): string {
  const evs = JSON.parse(JSON.stringify(events)) as Record<string, unknown>[]
  if (evs.length === 0) throw new Error('no events')
  if (!evs.every((e) => isInt(e.t))) throw new Error('an event has no integer t')
  const s = String(evs[0]!.s)
  const t0 = evs[0]!.t as number
  const t1 = evs[evs.length - 1]!.t as number

  // group the events by their ordered key list
  const schemaOf = new Map<string, number>()
  const groups: { keys: string[]; rows: number[] }[] = []
  const rowSchema = evs.map((e, i) => {
    const keys = Object.keys(e)
    const sig = JSON.stringify(keys)
    let k = schemaOf.get(sig)
    if (k === undefined) { k = groups.length; schemaOf.set(sig, k); groups.push({ keys, rows: [] }) }
    groups[k]!.rows.push(i)
    return k
  })
  const schemas: Schema[] = groups.map(({ keys, rows }) => [keys, keys.map((key): Mode => {
    const vals = rows.map((i) => evs[i]![key])
    if (key === 't') return 'T' // every t is an integer (checked above)
    if (key === 's' && vals.every((v) => v === s)) return 'S'
    const first = JSON.stringify(vals[0])
    if (vals.every((v) => JSON.stringify(v) === first)) return ['C', vals[0]]
    const afterT = keys.indexOf('t') >= 0 && keys.indexOf('t') < keys.indexOf(key)
    if (afterT && rows.every((i) => { const v = evs[i]![key]; return isInt(v) && v >= EPOCH_MS && isInt((evs[i]!.t as number) - v) })) return 'O'
    if (key === 'run' && vals.every(isInt)) return 'R'
    if (vals.every((v) => typeof v === 'string')) return 'D'
    return 'P'
  })])

  const strings: string[] = []
  const strIndex = new Map<string, number>()
  const str = (x: string) => {
    let i = strIndex.get(x)
    if (i === undefined) { i = strings.length; strIndex.set(x, i); strings.push(x) }
    return i
  }
  let prevT = t0
  const prevRun = schemas.map(() => 0)
  const rows = evs.map((e, i) => {
    const k = rowSchema[i]!
    const [keys, modes] = schemas[k]!
    const row: unknown[] = [k]
    keys.forEach((key, c) => {
      const v = e[key]
      const mode = modes[c]
      if (Array.isArray(mode)) return // a constant: in the schema
      switch (mode) {
        case 'T': row.push((v as number) - prevT); prevT = v as number; break
        case 'O': row.push((e.t as number) - (v as number)); break
        case 'R': row.push((v as number) - prevRun[k]!); prevRun[k] = v as number; break
        case 'S': break
        case 'D': row.push(str(v as string)); break
        default: row.push(v)
      }
    })
    return row
  })
  // column by column inside each schema: like values sit together, which deflate likes
  const order = rows.map((r) => r[0] as number)
  const cols: unknown[][][] = schemas.map(() => [])
  for (const r of rows) {
    const k = r[0] as number
    for (let c = 1; c < r.length; c++) (cols[k]![c - 1] ??= []).push(r[c])
  }
  const compact: Compact = [strings, schemas, order, cols]
  const d = toBase64(deflateSync(strToU8(JSON.stringify(compact)), { level: 9 }))
  return JSON.stringify({ v: VERSION, s, t0, t1, n: evs.length, enc: ENC, d })
}

/** The header of a sealed value, or null when it is not one. Never throws. */
export function chunkHeader(value: string | null): ChunkHeader | null {
  if (value === null) return null
  try {
    const h = JSON.parse(value) as Record<string, unknown>
    if (h?.v !== VERSION || typeof h.s !== 'string' || !isInt(h.t0) || !isInt(h.t1) || !isInt(h.n) || typeof h.enc !== 'string') return null
    return { v: VERSION, s: h.s, t0: h.t0, t1: h.t1, n: h.n, enc: h.enc }
  } catch {
    return null
  }
}

/** The events of a sealed value, or null on any error (a wrong version, a corrupt payload). Never throws. */
export function decodeChunk(value: string | null): TelemetryEvent[] | null {
  try {
    if (value === null) return null
    const h = JSON.parse(value) as Record<string, unknown>
    const head = chunkHeader(value)
    if (!head || head.enc !== ENC || typeof h.d !== 'string') return null
    const [strings, schemas, order, cols] = JSON.parse(strFromU8(inflateSync(fromBase64(h.d)))) as Compact
    if (!Array.isArray(strings) || !Array.isArray(schemas) || !Array.isArray(order) || !Array.isArray(cols)) return null
    const at = schemas.map(() => 0)
    const rows = order.map((k) => {
      const i = at[k]!++
      return [k, ...(cols[k] ?? []).map((col) => { if (i >= col.length) throw new Error('short column'); return col[i] })]
    })
    if (cols.some((cs, k) => cs.some((col) => col.length !== at[k]))) return null
    let prevT = head.t0
    const prevRun = schemas.map(() => 0)
    const out = rows.map((row) => {
      const k = row[0] as number
      const [keys, modes] = schemas[k]!
      const e: Record<string, unknown> = {}
      let c = 1
      keys.forEach((key, j) => {
        const mode = modes[j]
        if (Array.isArray(mode)) {
          if (mode[0] !== 'C') throw new Error('bad mode')
          e[key] = mode[1] !== null && typeof mode[1] === 'object' ? JSON.parse(JSON.stringify(mode[1])) : mode[1]
          return
        }
        switch (mode) {
          case 'T': prevT += row[c++] as number; e[key] = prevT; break
          case 'O': {
            if (typeof e.t !== 'number') throw new Error('a time field before t')
            e[key] = e.t - (row[c++] as number)
            break
          }
          case 'R': prevRun[k] = prevRun[k]! + (row[c++] as number); e[key] = prevRun[k]; break
          case 'S': e[key] = head.s; break
          case 'D': {
            const x = strings[row[c++] as number]
            if (typeof x !== 'string') throw new Error('bad string')
            e[key] = x
            break
          }
          case 'P': e[key] = row[c++]; break
          default: throw new Error('bad mode')
        }
      })
      if (c !== row.length) throw new Error('bad row')
      return e as TelemetryEvent
    })
    if (out.length !== head.n || out[0]?.t !== head.t0 || out[out.length - 1]?.t !== head.t1) return null
    return out
  } catch {
    return null
  }
}
