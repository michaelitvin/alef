// Synthetic telemetry for tests: logs shaped like the ones the games write, built from the `track(` call sites (their
// event names, their fields, their optional spreads), never from a child's real export. Deterministic: a seed gives the
// same events every time. telemetryFixtures.test.ts checks that every event name a call site sends is in here.
import { exportDoc, filterEvents, type TelemetryAbout, type TelemetryEvent } from '../../telemetry'

/** a small seeded PRNG (mulberry32) */
function rng(seed: number) {
  let a = seed >>> 0
  const next = () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
  const int = (lo: number, hi: number) => lo + Math.floor(next() * (hi - lo + 1))
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(next() * xs.length)]!
  const chance = (p: number) => next() < p
  return { next, int, pick, chance }
}
type R = ReturnType<typeof rng>

const LETTERS = ['alef', 'bet', 'gimel', 'dalet', 'he', 'vav', 'zayin', 'het', 'tet', 'yod', 'kaf', 'lamed', 'mem', 'nun', 'samekh']
const MARKS = ['kamatz', 'patah', 'segol', 'tsere', 'hiriq', 'holam', 'kubutz', 'shuruk', 'shva']
const SCREENS = ['letters', 'syllables', 'pairs', 'draw', 'flight', 'tower', 'merchant']
const WORDS = ['abba', 'ima', 'bayit', 'kelev', 'sefer', 'shemesh', 'yeled', 'dag']
const EXERCISES = ['find', 'what', 'set', 'digitalPick', 'digitalSet']
const CUSTOMERS = ['baker', 'farmer', 'pilot', 'nurse', 'robot']
const DAY = 24 * 60 * 60 * 1000

/** the epoch the fixtures start at (2026-10-01, local noon-ish so the days do not wrap) */
export const FIXTURE_START = Date.UTC(2026, 9, 1, 13, 0, 0)

const time = (r: R) => `${r.int(1, 12)}-${r.pick(['00', '15', '30', '45', '40', '05'])}`
const clockOf = (r: R, t: number) => t - r.pick([0, 0, 0, 1, 2, 3, -1])

/** Book 2's events, by name: the fields of each call site (src/duel2, src/utils/duel for the tower, the audio kit). */
const BOOK2: Record<string, (r: R, t: number) => Record<string, unknown>> = {
  'run-start': (r) => ({ stage: r.int(1, 4) }),
  'session-start': (r) => ({ stage: r.int(1, 4), screen: r.pick(SCREENS) }),
  answer: (r, t) => {
    const result = r.pick(['right', 'right', 'right', 'wrong', 'near'])
    const target = r.pick(LETTERS)
    return {
      screen: r.pick(['letters', 'syllables', 'pairs']), stage: r.int(1, 4), target, tapped: result === 'right' ? target : r.chance(0.2) ? null : r.pick(LETTERS),
      result, ms: r.int(400, 9000), assets: [`w-${r.pick(WORDS)}`, `img-${r.pick(WORDS)}`], clock: clockOf(r, t), ...(r.chance(0.05) ? { gallery: true } : {}),
    }
  },
  'tower-answer': (r, t) => ({ screen: 'tower', target: r.pick(MARKS), result: r.pick(['right', 'right', 'wrong']), clock: clockOf(r, t), ...(r.chance(0.05) ? { gallery: true } : {}) }),
  replay: (r) => ({ screen: r.pick(SCREENS), target: r.pick(LETTERS), phase: r.pick(['question', 'answer']) }),
  'hint-stop': (r) => ({ screen: r.chance(0.2) ? null : r.pick(['merchant', 'draw']), by: r.pick(['touch', 'answer', 'pen']) }),
  abandon: (r) => ({ screen: r.pick(SCREENS), score: r.int(1, 400) }),
  'merchant-decline': (r) => ({ phase: r.pick(['closed', 'exit', 'offer']) }),
  'run-exit': (r) => ({ screen: r.pick(SCREENS), score: r.int(0, 400), paused: r.chance(0.3), ...(r.chance(0.5) ? { ended: true } : {}) }),
  pause: (r) => ({ screen: r.pick(SCREENS), phase: r.pick(['question', 'answer', 'celebrate']) }),
  resume: (r) => ({ ms: r.chance(0.1) ? null : r.int(500, 60_000) }),
  crystal: (r) => ({ kind: r.int(0, 12), ...(r.chance(0.3) ? { owed: true } : {}) }),
  'merchant-arrive': (r) => ({ price: r.int(2, 9), coins: r.int(0, 20), hearts: r.int(0, 3), composition: [r.int(0, 5), r.int(0, 5), r.int(0, 3)] }),
  'tower-start': (r) => ({ wave: r.int(1, 5), boss: r.chance(0.2), waves: 5 }),
  'tower-end': (r) => ({ wave: r.int(1, 5), last: r.int(0, 5), boss: r.chance(0.2) }),
  'book-open': (r) => (r.chance(0.5) ? { stars: r.int(10, 90), towerWave: r.int(1, 6), lane: r.int(0, 2) } : { by: 'parent', stars: r.int(0, 90) }),
  'tower-placed': (r) => ({ wave: r.int(1, 5), lane: r.int(0, 2) }),
  mult: (r) => ({ mult: r.int(2, 5), streak: r.int(3, 30) }),
  'tower-mega': (r, t) => ({ target: r.pick(MARKS), clock: clockOf(r, t), ...(r.chance(0.05) ? { gallery: true } : {}) }),
  demo: (r) => ({ demo: r.pick(['demo-pick', 'demo-draw', 'demo-flight']) }),
  idle: (r) => ({ screen: r.pick(SCREENS), target: r.chance(0.1) ? null : r.pick(LETTERS) }),
  hint: (r) => (r.chance(0.5) ? { target: r.pick(LETTERS), auto: r.chance(0.5) } : { screen: 'draw', target: r.pick(WORDS), auto: r.chance(0.5) }),
  stage: (r) => ({ stage: r.int(1, 5) }),
  fix: (r) => ({ screen: r.pick(SCREENS), target: `c-${r.pick(LETTERS)}`, ms: r.int(300, 8000), replays: r.int(0, 3) }),
  explain: (r) => ({ target: r.pick(LETTERS) }),
  flight: (r) => ({ kind: r.pick(['broom', 'bird']), travelMs: r.int(2000, 7000), pace: Math.round(r.next() * 1000) / 1000 + 0.5, boss: r.chance(0.7) ? null : r.pick(['dragon', 'troll']) }),
  'session-home': () => ({}),
  again: (r) => ({ ms: r.int(1000, 30_000), score: r.int(0, 500) }),
  info: (r) => ({ what: r.pick(['info-coins', 'info-crystal', 'info-hearts']) }),
  player: (r) => ({ gender: r.pick(['boy', 'girl']), by: r.pick(['child', 'parent']) }),
  settings: (r) => {
    const k = r.pick(['sfx', 'music', 'volume', 'pace', 'name'])
    const v = k === 'volume' ? Math.round(r.next() * 100) / 100 : k === 'name' ? 'דני הקטן' : k === 'pace' ? r.int(1, 3) : r.chance(0.5)
    return { keys: [k], [k]: v }
  },
  'stroke-mark': (r) => ({ letter: r.pick(LETTERS), script: r.pick(['print', 'cursive']), mark: r.pick(['ok', 'wrong', null]) }),
  'voice-fallback': (r) => ({ id: `w-${r.pick(WORDS)}-שלום` }),
  'boss-start': (r) => ({ kind: r.pick(['dragon', 'troll']) }),
  'boss-hit': (r) => ({ kind: r.pick(['dragon', 'troll']), left: r.int(0, 4) }),
  'boss-lose': (r) => ({ kind: r.pick(['dragon', 'troll']), left: r.int(1, 4) }),
  'boss-win': (r) => ({ kind: r.pick(['dragon', 'troll']), ms: r.int(5000, 60_000), first: r.chance(0.3) }),
  'draw-lines': (r) => ({ letter: r.pick(LETTERS), kind: r.pick(['good', 'retry']) }),
  'draw-done': (r) => ({ letter: r.pick(LETTERS), script: r.pick(['print', 'cursive']), word: r.pick(WORDS), ms: r.int(3000, 40_000), wrongStrokes: r.int(0, 4), helped: r.chance(0.3) }),
  'draw-stroke': (r) => {
    const ok = r.chance(0.7)
    return { letter: r.pick(LETTERS), script: r.pick(['print', 'cursive']), n: r.int(1, 4), ok, ...(r.chance(0.1) ? { partial: true } : {}), ...(!ok ? { why: r.pick(['direction', 'start', 'shape']) } : {}), ...(r.chance(0.1) ? { settled: true } : {}), ...(ok && r.chance(0.2) ? { joined: true } : {}) }
  },
  'draw-start': (r) => ({ word: r.pick(WORDS), letter: r.pick(LETTERS), script: r.pick(['print', 'cursive']) }),
  'draw-mark': (r) => ({ mark: r.pick(MARKS), ok: r.chance(0.7) }),
  skip: (r) => ({ screen: r.pick(SCREENS), cycle: r.int(1, 4) }),
  defeat: (r) => ({ screen: r.pick(SCREENS) }),
  'session-end': (r) => ({ screen: r.pick(SCREENS), score: r.int(0, 500) }),
  'pass-heart': (r) => ({ hearts: r.int(0, 3) }),
  'run-end': (r) => ({ screen: r.pick(SCREENS), score: r.int(0, 500), crystals: r.int(0, 12) }),
  'merchant-demo': () => ({}),
  'merchant-buy': (r) => ({ price: r.int(2, 9), coins: [r.int(1, 5), r.int(1, 5)], hearts: r.int(0, 3) }),
  'merchant-undo': () => ({}),
  'merchant-help': (r) => ({ undo: r.chance(0.5), given: r.int(0, 4) }),
  'merchant-idle': () => ({}),
  'merchant-offer': (r) => ({ sum: r.int(1, 12), price: r.int(2, 9), verdict: r.pick(['short', 'over', 'exact']), coins: [r.int(1, 5), r.int(1, 5), r.int(1, 2)] }),
  'storage-persist': (r) => ({ persisted: r.chance(0.5) }),
}

/** the tower's events (src/utils/duel/controller.ts): each carries `via: 'tower'` and the visit's counter */
const TOWER: Record<string, (r: R, t: number) => Record<string, unknown>> = {
  run_start: (r) => ({ embedded: true, wave: r.int(1, 5), waves: 5, boss: r.chance(0.2) }),
  round: (r) => {
    const type = r.pick(['A', 'B'])
    return {
      round: r.int(1, 40), restart: r.chance(0.1), wave: r.int(1, 5), kills: r.int(0, 20), boss: r.chance(0.1), bossHp: r.int(0, 5), hearts: null,
      combo: r.int(0, 9), type, target: r.pick(MARKS), word: r.pick(WORDS), picture: type === 'A' ? `pic-${r.pick(WORDS)}` : null,
      monster: r.pick(['fuzzy', 'dragon', 'slime']), monsterSrc: r.chance(0.1) ? null : `/assets/m-${r.int(1, 9)}.webp`, walkMs: r.int(5000, 9000),
      pad: [r.pick(MARKS), r.pick(MARKS), r.pick(MARKS)], padWords: [r.pick(WORDS), r.pick(WORDS)],
    }
  },
  walk: (r) => ({ round: r.int(1, 40), clueMs: r.int(200, 3000) }),
  announce: (r) => ({ kind: r.pick(['wave', 'boss']), wave: r.int(1, 5), ...(r.chance(0.2) ? { owed: r.int(1, 3) } : {}) }),
  outcome: (r) => ({
    pace: Math.round(r.next() * 1000) / 1000 + 0.5, feedback: r.pick(['praise', 'none', 'name']), predicted: Math.round(r.next() * 1000) / 1000,
    round: r.int(1, 40), result: r.pick(['hit', 'miss', 'timeout']), choice: r.pick(MARKS), mega: r.chance(0.1), final: r.chance(0.1), points: r.int(0, 50),
    effect: r.pick(['small', 'big']), hearts: null, combo: r.int(0, 9), score: r.int(0, 900), bossHp: r.int(0, 5), msShown: r.int(500, 9000), msWalk: r.int(0, 9000),
  }),
  combo: (r) => ({ round: r.int(1, 40), combo: r.int(3, 9) }),
  choice: (r) => {
    const correct = r.chance(0.7)
    const walking = r.chance(0.8)
    return { round: r.int(1, 40), key: r.pick(MARKS), pos: r.int(0, 2), correct, twin: !correct && r.chance(0.3), walking, msShown: r.int(300, 9000), msWalk: walking ? r.int(0, 8000) : null }
  },
  mega_tap: (r) => ({ round: r.chance(0.2) ? null : r.int(1, 40), queued: r.chance(0.3) }),
  pause: (r) => ({ cause: r.pick(['hidden', 'button']), round: r.chance(0.2) ? null : r.int(1, 40), duringOutcome: r.chance(0.2) }),
  resume: () => ({}),
  replay: (r) => ({ round: r.int(1, 40) }),
  abandon: (r) => ({ reason: r.pick(['pagehide', 'unmount']), round: r.chance(0.2) ? null : r.int(1, 40), wave: r.int(1, 5), score: r.int(0, 900), hearts: null, paused: r.chance(0.2), duringOutcome: r.chance(0.2), msShown: r.chance(0.2) ? null : r.int(0, 9000) }),
  line: (r) => {
    const id = `line-${r.pick(['wave', 'boss', 'hello', 'win'])}`
    return { id, file: `${id}.mp3`, url: r.chance(0.1) ? null : `/alef/assets/${id}-${r.pick(['a1b2c3', 'd4e5f6'])}.mp3` }
  },
  'voice-fallback': (r) => ({ id: `line-${r.pick(['wave', 'boss'])}` }),
}

/** the clock's events (src/clock) */
const CLOCK: Record<string, (r: R, t: number) => Record<string, unknown>> = {
  round: (r) => {
    const forgiven = r.chance(0.1)
    const correct = r.chance(0.75)
    const early = r.chance(0.1)
    const ans = r.chance(0.6) ? { kind: 'choice', index: r.int(0, 2) } : { kind: 'set', pose: { hour: r.int(0, 11) + Math.round(r.next() * 100) / 100, minute: r.int(0, 59) } }
    return {
      exercise: r.pick(EXERCISES), lang: r.pick(['he', 'en']), time: time(r), level: r.int(1, 8), kind: r.pick(['new', 'review', 'trick']), scaffolds: r.chance(0.5) ? [] : ['numbers', 'hand-colors'],
      options: [{ f: 'right', t: time(r), d: false }, { f: r.pick(['hour1', 'mirror']), t: time(r), d: r.chance(0.3) }, { f: null, t: null, d: true }],
      families: ['hour1', 'mirror'], answer: ans, ...(forgiven ? { firstAnswer: { kind: 'choice', index: r.int(0, 2) } } : {}), correct, forgiven,
      tag: correct ? null : r.pick(['hour1', 'mirror', 'confusion']), ms: r.int(300, 15_000), script: r.pick(['print', 'cursive', 'small', 'caps']), audio: [`he-${time(r)}`],
      ...(early ? { early: true, msFromAsk: r.int(100, 3000) } : {}), resumed: r.chance(0.05), predicted: Math.round(r.next() * 100) / 100, real: r.chance(0.1), customer: r.pick(CUSTOMERS),
    }
  },
  hint: (r) => ({ hint: r.pick(['numbers', 'arrow']), time: `${r.int(1, 12)}-${r.int(0, 59)}`, exercise: r.pick(EXERCISES) }),
  explain: (r) => ({ id: r.pick(['hour-hand', 'half-past']), trigger: r.pick(['mistake', 'new']), lang: r.pick(['he', 'en']) }),
  'explain-again': (r) => ({ id: r.pick(['hour-hand', 'half-past']), lang: 'he' }),
  levelup: (r) => ({ to: r.int(2, 9) }),
  workday: (r) => ({ gears: r.int(0, 12), bonus: r.int(0, 5) }),
  pause: (r) => ({ phase: r.pick(['ask', 'answer', 'feedback']) }),
  abandon: (r) => ({ served: r.int(0, 10), ...(r.chance(0.8) ? { phase: r.pick(['ask', 'bonus']) } : {}) }),
  exit: (r) => ({ served: r.int(0, 10), ...(r.chance(0.8) ? { phase: r.pick(['ask', 'answer', 'feedback']) } : {}), paused: r.chance(0.2) }),
  bonus: (r) => ({ try: r.int(1, 3), angle: r.int(-180, 180) + Math.round(r.next() * 10) / 10, gears: r.int(0, 3) }),
  player: (r) => ({ gender: r.pick(['boy', 'girl']), by: r.pick(['child', 'parent']) }),
  settings: (r) => ({ keys: ['langs', 'sfx'], langs: ['he', 'en'], sfx: r.chance(0.5) }),
  'voice-fallback': (r) => ({ id: `he-${time(r)}` }),
  'storage-persist': (r) => ({ persisted: r.chance(0.5) }),
}

/** a generator table: each event name's fields */
type Table = Record<string, (r: R, t: number) => Record<string, unknown>>

/** the spell book's events (both languages: the English log and Book 2's) */
const SPELL: Table = {
  'spell-drop': (r) => ({ word: r.pick(WORDS), mode: r.pick(['tiles', 'write']), unit: r.pick(LETTERS), box: r.int(0, 3), ...(r.chance(0.7) ? { ok: true } : { ok: false, tile: r.pick(LETTERS) }) }),
  'spell-cast': (r) => ({ word: r.pick(WORDS), mode: r.pick(['tiles', 'write']), ms: r.int(3000, 40_000), mistakes: r.int(0, 4) }),
  'spell-near': (r) => ({ word: r.pick(WORDS), mode: 'tiles', tile: r.pick(LETTERS), unit: r.pick(LETTERS), box: r.int(0, 3) }),
}

/**
 * The English path's own events (src/english, and the English parts of the run), by name. The English log also gets
 * the run's events it shares with Book 2; the English tasks add their names here as they add the call sites.
 */
const ENGLISH: Table = {
  player: (r) => ({ gender: r.pick(['boy', 'girl']), by: 'child' }),
  'placement-start': (r) => ({ wave: r.int(1, 3) }),
  'placement-answer': (r, t) => ({ stage: r.int(1, 9), target: r.pick(['map', 'mip', 'frog', 'sluk', 'kite']), result: r.chance(0.7) ? 'right' : 'wrong', clock: t }),
  'placement-done': (r) => ({ level: r.int(1, 9), answers: r.int(5, 23) }),
  ...SPELL,
  settings: (r) => ({ keys: ['path'], path: r.chance(0.5) }),
  'range-set': (r) => ({ range: r.pick([10, 100, 1000]) }),
  'blend-hint': (r) => ({ screen: r.pick(['broom', 'cauldron', 'ladder', 'ghosts', 'doors']), words: r.int(1, 3), by: r.pick(['button', 'idle', 'miss']) }),
}

/** the Hebrew spell book's events (Book 2's log), kept out of BOOK2 so Book 2's goldens keep their bytes */
const BOOK2_SPELL: Table = { ...SPELL }

/** how often an event comes, against 1 for the rest (a session is mostly answers, as the child's are) */
const WEIGHT: Record<string, number> = {
  answer: 30, 'tower-answer': 4, replay: 4, idle: 2, mult: 2, 'draw-stroke': 6, 'merchant-offer': 2, pause: 1.5, resume: 1.5,
  round: 25, choice: 10, outcome: 10, line: 14, walk: 8, hint: 3, explain: 1.5,
}
function weighted(r: R, names: readonly string[]): string {
  const w = names.map((n) => WEIGHT[n] ?? 0.3)
  let x = r.next() * w.reduce((a, b) => a + b, 0)
  for (let i = 0; i < names.length; i++) if ((x -= w[i]!) < 0) return names[i]!
  return names[names.length - 1]!
}

export interface FixtureOpts {
  seed?: number
  days?: number
  /** sessions on a play day */
  sessionsPerDay?: number
  eventsPerSession?: number
  /** the first `oldDays` days have no `g` (events from before it existed) */
  oldDays?: number
  start?: number
}

/** a session id as the game makes one: `<base36 ms>-<5 chars>` */
const sessionId = (r: R, t: number) => `${t.toString(36)}-${Math.floor(r.next() * 36 ** 5).toString(36).padStart(5, '0')}`

/** a log of `game`: its table's events, and the tower's (`via: 'tower'`) when `tower` is set */
function generate(game: string, table: Table, tower: boolean, seed: number, o: FixtureOpts): TelemetryEvent[] {
  const r = rng(o.seed ?? seed)
  const days = o.days ?? 45
  const perDay = o.sessionsPerDay ?? 1
  const perSession = o.eventsPerSession ?? 150
  const oldDays = o.oldDays ?? 3
  const start = o.start ?? FIXTURE_START
  const out: TelemetryEvent[] = []
  const names = Object.keys(table)
  const towerNames = Object.keys(TOWER)
  let t = start
  // walk every name once first, so each appears in a fixture of any size
  const cover: [boolean, string][] = [...names.map((n): [boolean, string] => [false, n]), ...(tower ? towerNames.map((n): [boolean, string] => [true, n]) : [])]
  for (let d = 0; d < days; d++) {
    if (d % 4 === 3) continue // a day without play
    t = Math.max(t, start + d * DAY + r.int(0, 3) * 60 * 60 * 1000)
    for (let k = 0; k < perDay; k++) {
      t += r.int(20, 90) * 60 * 1000
      const s = sessionId(r, t)
      let run = r.int(1, 5)
      const n = perSession + r.int(-perSession >> 2, perSession >> 2)
      for (let i = 0; i < n; i++) {
        t += r.chance(0.05) ? 0 : r.int(200, 9000) // two events in one millisecond now and then
        if (r.chance(0.03)) run++
        const env: TelemetryEvent = d < oldDays ? { t, s, run, e: '' } : { t, s, run, e: '', g: game }
        const [towerTurn, name] = cover.shift() ?? (tower && r.chance(0.35) ? [true, weighted(r, towerNames)] : [false, weighted(r, names)])
        const e = name === 'tower-answer' ? 'answer' : name
        const data = towerTurn ? { ...TOWER[name]!(r, t), via: 'tower', visit: r.int(1, 6) } : table[name]!(r, t)
        env.e = e
        out.push({ ...env, ...data })
      }
      t += r.int(1, 30) * 60 * 1000
    }
  }
  return out
}

/** Book 2's log (with the tower's `via: 'tower'` events), several sessions over 40+ days, in `t` order */
export const book2Events = (o: FixtureOpts = {}) => generate('book2', BOOK2, true, 7, o)
/** the clock's log */
export const clockEvents = (o: FixtureOpts = {}) => generate('clock', CLOCK, false, 11, o)
/** the English path's log (`g: 'english'`) */
const englishEvents = (o: FixtureOpts = {}) => generate('english', ENGLISH, false, 13, o)
/** Book 2's log with the Hebrew spell book's events in it (the spell book writes to Book 2's log) */
const book2SpellEvents = (o: FixtureOpts = {}) => generate('book2', { ...BOOK2, ...BOOK2_SPELL }, true, 17, o)

/** every event name the generators can send (Book 2, the tower, the clock, the English path, the Hebrew spell book) */
export const FIXTURE_EVENT_NAMES: ReadonlySet<string> = new Set([
  ...Object.keys(BOOK2).map((n) => (n === 'tower-answer' ? 'answer' : n)), ...Object.keys(TOWER), ...Object.keys(CLOCK),
  ...Object.keys(ENGLISH), ...Object.keys(BOOK2_SPELL),
])

/** the first duel's frozen history as the old build wrote it (no g, no via): the string Data.test.tsx uses */
export const FROZEN_HISTORY = '{"v":1,"events":[{"t":1760000000000,"s":"mf1abc-x1y2z","run":2,"e":"choice","key":"segol","pos":2,"ms":1840}]}'

/** a fixed export time for goldens */
export const GOLDEN_NOW = new Date('2026-11-20T08:00:00.000Z')

/** the logs the goldens are made of (small, so the golden files stay small) */
export const GOLDEN_BOOK2 = () => book2Events({ eventsPerSession: 12 })
export const GOLDEN_CLOCK = () => clockEvents({ eventsPerSession: 4 })
export const GOLDEN_ENGLISH = () => englishEvents({ eventsPerSession: 12 })
export const GOLDEN_BOOK2_SPELL = () => book2SpellEvents({ eventsPerSession: 12 })

/** the export of one log, all of it or since a time, as the Data section makes it, at GOLDEN_NOW */
export const goldenExport = (log: { key: string; about: TelemetryAbout }, events: TelemetryEvent[], since?: number) =>
  exportDoc([{ key: log.key, about: log.about, events: filterEvents(events, { since }) }], { since, now: GOLDEN_NOW })
