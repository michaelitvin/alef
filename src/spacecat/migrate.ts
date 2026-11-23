// The save's migration from version 1 (the first design's nine rungs) to version 2 (the ladder). Pure: no store.
// The rule: never drop his progress. See the design's *Migration of an existing save*.
import { MIGRATION_JUMP, MIGRATION_PROBES, placementMode, probeList, type Ladder } from './logic/ladder/index'
import { RUNGS, type RungId } from './logic/rungs'
import { SPEED_START } from './logic/speed'
import { DEFAULT_SAVE, DEFAULT_SETTINGS, type Settings, type SpaceCatSave } from './saveFormat'

/** a parent's numeric range of version 1 → the rung it stands for */
export const RANGE_V1: Record<number, RungId> = { 1: '1', 2: '3', 3: '5', 4: '6', 5: '7', 6: '11', 7: 'T2', 8: 'T5', 9: 'T6' }

/** the rungs placed for each old top rung (each brings what it needs, so the lists are closed) */
const UPTO7: RungId[] = ['1', '2', '3', '4', '5', '6', '7']
const UPTO11: RungId[] = [...UPTO7, '9', '10', '11']
const UPTO_T2: RungId[] = [...UPTO11, '8', 'S1', 'T1', 'T2']
const UPTO_T5: RungId[] = [...UPTO_T2, 'S2', 'T3', 'T5']
export const PLACED_V1: Record<number, RungId[]> = {
  1: [], 2: ['1', '2', '3'], 3: ['1', '2', '3', '4', '5'], 4: UPTO7.slice(0, 6), 5: UPTO7, 6: UPTO11, 7: UPTO_T2, 8: UPTO_T5,
  9: [...UPTO_T5, 'T4a', 'T4b', 'T6'],
}

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x)
const num = (x: unknown, d: number) => (typeof x === 'number' && Number.isFinite(x) ? x : d)

/** every item stat with all its fields (a partial or odd stat of an old save never reaches the readers as undefined) */
function items(x: unknown): SpaceCatSave['items'] {
  const out: SpaceCatSave['items'] = {}
  if (!isObj(x)) return out
  for (const [id, st] of Object.entries(x)) {
    const s = isObj(st) ? st : {}
    out[id] = {
      seen: num(s.seen, 0), wrong: num(s.wrong, 0), timeout: num(s.timeout, 0), recent: typeof s.recent === 'string' ? s.recent : '',
      times: Array.isArray(s.times) ? s.times.filter((t): t is number => typeof t === 'number' && Number.isFinite(t)) : [],
      picks: isObj(s.picks) ? Object.fromEntries(Object.entries(s.picks).filter(([, n]) => typeof n === 'number' && Number.isFinite(n))) as Record<string, number> : {},
    }
  }
  return out
}

/** the old speed state is kept only with a finite arrival time; its hold and samples are checked too */
function smallSpeed(x: unknown): SpaceCatSave['speed']['small'] {
  if (!isObj(x) || typeof x.arrivalMs !== 'number' || !Number.isFinite(x.arrivalMs)) return SPEED_START
  const underMs = Array.isArray(x.underMs) ? x.underMs.filter((t): t is number => typeof t === 'number' && Number.isFinite(t)) : []
  return { arrivalMs: x.arrivalMs, underMs, hold: num(x.hold, 0) }
}

/** a version 1 save (or anything that was stored) → a version 2 save */
export function migrateV1(old: unknown): SpaceCatSave {
  if (!isObj(old)) return DEFAULT_SAVE
  const o = old
  const top = isObj(o.ladder) && typeof o.ladder.top === 'number' && o.ladder.top in PLACED_V1 ? o.ladder.top : undefined
  const oldSet = isObj(o.settings) ? o.settings : {}
  const range = typeof oldSet.range === 'number' && oldSet.range in RANGE_V1 ? RANGE_V1[oldSet.range] : 'auto'
  const settings: Settings = {
    ...DEFAULT_SETTINGS, range,
    arrival: oldSet.arrival === 8000 || oldSet.arrival === 5000 || oldSet.arrival === 4000 ? oldSet.arrival : 'auto',
    flightMusic: oldSet.flightMusic === true,
  }
  const kept: SpaceCatSave = {
    ...DEFAULT_SAVE,
    items: items(o.items),
    totalPoints: num(o.totalPoints, 0), best: num(o.best, 0), runs: num(o.runs, 0),
    ships: Array.isArray(o.ships) && o.ships.length ? (o.ships as SpaceCatSave['ships']) : [1],
    ship: o.ship === 2 || o.ship === 3 ? o.ship : 1,
    heard: isObj(o.heard) ? (o.heard as Record<string, number>) : {},
    ...(typeof o.lastFact === 'string' ? { lastFact: o.lastFact } : {}),
    sinceZero: num(o.sinceZero, 0),
    settings,
    speed: { small: smallSpeed(o.speed) },
  }
  // no readable ladder: the first placement, his items and points kept
  if (top === undefined) return kept
  const placed = PLACED_V1[top]
  const rungs: Ladder['rungs'] = {}
  for (const r of placed) rungs[r] = { status: 'placed', recent: '', fastRun: 0, strikes: 0, holds: 0, probation: 0 }
  const highest = [...RUNGS].reverse().find((d) => placed.includes(d.id))
  const base: Ladder = { ...DEFAULT_SAVE.ladder, rungs, day: 1, checkedOn: 1, lastAt: undefined }
  // the placement starts at the offered rung above the highest placed one (rung 1 when none is placed)
  // (only the plus and minus rungs without a switch: the new strands and the rungs whose version 1 switch was off stay
  // unplaced; normal practice, the re-check or the parent's "find his level again" reaches them)
  const mode = { ...placementMode('migration', '1', MIGRATION_JUMP, MIGRATION_PROBES), plusOnly: true }
  const pool = probeList(base, mode, settings)
  const above = highest ? pool.find((r) => RUNGS.find((d) => d.id === r)!.order > highest.order) : '1'
  const at = above ?? pool.find((r) => !placed.includes(r)) ?? '1'
  const ladder: Ladder = { ...base, mode: { ...mode, at } }
  return { ...kept, ladder }
}

/** version 2 → 3: he flew ship 1 although he had unlocked more; the chosen ship becomes the highest he has (his shelf choice after this stays) */
export function flyHighestShip<T>(old: T): T {
  if (!isObj(old) || !Array.isArray(old.ships)) return old
  const top = Math.max(1, ...old.ships.filter((n): n is number => n === 2 || n === 3))
  return { ...old, ship: top } as T
}
