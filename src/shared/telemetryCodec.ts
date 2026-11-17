// The sealed chunk codec: the events of one page session ⇄ one compact, deflated string. Pure and sync (no storage).
//
// A sealed value is a plain JSON header and a payload:
//   {"v":3,"s":"<session>","t0":<ms>,"t1":<ms>,"n":<count>,"enc":"cz1","d":"<base64>"}
// The header gives the counts, the age and the eviction order without a decode. `d` is the deflated (fflate) UTF-8 of
// the compact form, in base64 (one byte per character, so localStorage counts it as it is).
//
// The compact form is `[strings, schemas, rows]`:
// - `strings`: a dictionary; a top-level string value is stored once and written as its index.
// - `schemas`: one per distinct ordered key list (the order is kept, so a rebuilt event stringifies the same), each
//   `[keys, modes]` with one mode per key, chosen from every row of that schema:
//     'T'  `t`, as a delta from the previous event's `t` (every row has an integer `t`);
//     'S'  `s`, left out: it is the header's session (every row has it);
//     'D'  a string, as its dictionary index (every row has a string there);
//     'P'  a plain JSON value (anything else: numbers, booleans, null, arrays, objects).
// - `rows`: `[schema, …column values]`, one per event, in order. A column in mode 'S' has no value.
//
// The rebuild is exact: decode(encode(evs)) stringifies byte-equal to evs (same keys, same order, same values). The
// events are first taken as their JSON (`undefined` fields drop out, as they do when a log is stored).
import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate'
import type { TelemetryEvent } from './telemetry'

const VERSION = 3
const ENC = 'cz1'

export interface ChunkHeader { v: 3; s: string; t0: number; t1: number; n: number; enc: string }

type Mode = 'T' | 'S' | 'D' | 'P'
type Schema = [keys: string[], modes: Mode[]]
type Compact = [strings: string[], schemas: Schema[], rows: unknown[][]]

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
  const rows = evs.map((e, i) => {
    const k = rowSchema[i]!
    const [keys, modes] = schemas[k]!
    const row: unknown[] = [k]
    keys.forEach((key, c) => {
      const v = e[key]
      switch (modes[c]) {
        case 'T': row.push((v as number) - prevT); prevT = v as number; break
        case 'S': break
        case 'D': row.push(str(v as string)); break
        default: row.push(v)
      }
    })
    return row
  })
  const compact: Compact = [strings, schemas, rows]
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
    const [strings, schemas, rows] = JSON.parse(strFromU8(inflateSync(fromBase64(h.d)))) as Compact
    if (!Array.isArray(strings) || !Array.isArray(schemas) || !Array.isArray(rows)) return null
    let prevT = head.t0
    const out = rows.map((row) => {
      const [keys, modes] = schemas[row[0] as number]!
      const e: Record<string, unknown> = {}
      let c = 1
      keys.forEach((key, j) => {
        switch (modes[j]) {
          case 'T': prevT += row[c++] as number; e[key] = prevT; break
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
