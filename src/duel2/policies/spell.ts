// The spell book as a policy (spec: 2026-11-16 English path, Part 7; both languages): he hears the word; one box for
// each sound unit (or syllable); he drops the tile of each unit into its box, in order. A right drop says its unit; the
// last one casts the spell: the word, the `spell` effect, the picture alive. A wrong tile is a mistake he fixes himself
// (no heart is lost; after SPELL_TRIES the right tile glows). A `near` tile (another spelling of the box's sound) is
// forgiven once. Pure: no store, no clock, no audio. The policy works in box order; the view mirrors for right to left.
// The write mode sends the same `drop` (the unit his finger wrote, as the recognizer judged it). The first event of a
// visit, of any type, starts it.
import type { DrawLine, RunPatch, TrackRequest } from './draw'

export interface SpellBox { unit: string; text: string; soundId: string }
export interface SpellRound {
  word: string
  wordVoice: string
  boxes: SpellBox[]
  tiles: SpellBox[]
  /** the closing letter that is printed, faint, and is not a box */
  tail?: string
  picture?: string
  mode: 'tiles' | 'write'
  /** tile → the box unit it sounds like */
  near?: Record<string, string>
}

/** a wrong tile shows this long before it goes back */
export const WRONG_MS = 350
/** no drop for this long: the word again (after a mistake: the right sound again) */
export const SPELL_IDLE_MS = 8000
/** no drop for this long: the hint shows by itself (never after a mistake) */
export const SPELL_HINT_MS = 16000

export interface SpellView {
  screen: 'spell'
  round: SpellRound
  /** the tile in each box, in box order (null: empty) */
  filled: (string | null)[]
  /** the picture is alive (the spell is cast) */
  alive: boolean
  /** the tile that glows: the hint, or the other spelling after a near drop */
  glow?: string
  /** a wrong tile on its way back */
  wrong?: { tile: string; box: number }
  /** the hand shows the first drop (the demo) */
  demo?: boolean
}

/**
 * What the run tells the policy. `start`: the visit begins. `drop`: he dropped a tile (or wrote a unit) into a box.
 * `idle`, `hint` with `auto`: the times of the drop wait have come. `hint` without `auto`: the ? button. `touch`: finger
 * down on a tile (a hint's glow goes away). `heard` / `slept`: the wait it asked for (lines, a time) is over.
 */
export type SpellInput =
  | { type: 'start'; at: number } | { type: 'drop'; tile: string; box: number; at: number } | { type: 'idle'; at: number }
  | { type: 'hint'; auto: boolean; at: number } | { type: 'touch'; at: number }
  | { type: 'heard'; at: number } | { type: 'slept'; at: number }

export type SpellSfx = 'drop' | 'wrong' | 'spell'
export type SpellSaveOp = { op: 'markDemo'; id: 'demo-spell' } | { op: 'recordAnswer'; features: string[]; miss: boolean }

/** the run's view around the spell book: `mistake` while a wrong tile shows, `fixing` while he does the right move */
export interface SpellRunPatch extends Omit<RunPatch, 'phase'> { phase?: RunPatch['phase'] | 'mistake'; fixing?: boolean }

/**
 * What the run waits for: lines (`say`), a time (`sleep`), or his next drop (`idle` ms without one: `idle` again, every
 * time when `every`; `hint` ms: `hint` with `auto`, once, when given).
 */
export type SpellWait = { for: 'say' } | { for: 'sleep'; ms: number } | { for: 'drop'; idle: number; hint?: number; every?: true }

export interface SpellStep {
  state: SpellState
  view?: SpellView
  run?: SpellRunPatch
  cue?: true
  hush?: boolean
  say: DrawLine[]
  sfx: SpellSfx[]
  save: SpellSaveOp[]
  track: TrackRequest[]
  wait?: SpellWait
  /** the round is over */
  end?: true
}

type Flow = { k: 'open' } | { k: 'word' } | { k: 'demo' } | { k: 'answer' } | { k: 'near' } | { k: 'wrong' } | { k: 'fix' } | { k: 'cast' } | { k: 'over' }

export interface SpellState {
  round: SpellRound
  demo: boolean
  view: SpellView
  flow: Flow
  started: number
  /** when the fix started, and how often the sound played again meanwhile */
  fixFrom: number
  replays: number
  /** the tiles forgiven as near (once each) */
  forgiven: string[]
  mistakes: number
  /** the hint's glow shows until his next drop */
  hinted: boolean
}

/** A visit as it starts (the first event starts it). */
export function spellVisit(ctx: { round: SpellRound; demo: boolean; at: number }): SpellState {
  return {
    round: ctx.round, demo: ctx.demo, flow: { k: 'open' }, started: ctx.at, fixFrom: 0, replays: 0, forgiven: [], mistakes: 0, hinted: false,
    view: { screen: 'spell', round: ctx.round, filled: ctx.round.boxes.map(() => null), alive: false },
  }
}

/** One step of the round. Never changes `state`. */
export function stepSpell(state: SpellState, ev: SpellInput): SpellStep {
  const s: SpellState = { ...state, forgiven: [...state.forgiven] }
  const r: SpellStep = { state: s, say: [], sfx: [], save: [], track: [] }
  const rd = s.round
  const show = (p: Partial<SpellView>) => { s.view = { ...s.view, ...p }; r.view = s.view }
  const run = (p: SpellRunPatch) => { r.run = { ...r.run, ...p } }
  const go = (flow: Flow, wait?: SpellWait) => { s.flow = flow; if (wait) r.wait = wait }
  const next = () => s.view.filled.findIndex((x) => x === null)
  const base = { word: rd.word, mode: rd.mode }
  const answer = () => go({ k: 'answer' }, { for: 'drop', idle: SPELL_IDLE_MS, hint: SPELL_HINT_MS })

  /** a right tile in its box (also the end of a fix) */
  const right = (at: number) => {
    const box = rd.boxes[at]
    if (s.flow.k === 'fix') {
      r.track.push({ e: 'fix', data: { screen: 'spell', target: box.soundId, ms: Math.round(ev.at - s.fixFrom), replays: s.replays } })
      run({ fixing: false, phase: 'answer' })
    }
    // his drop stops the line that plays (the near line, the sound again)
    r.hush = true
    s.hinted = false
    const filled = s.view.filled.map((x, i) => (i === at ? box.unit : x))
    show({ filled, glow: undefined, wrong: undefined })
    r.sfx.push('drop')
    r.track.push({ e: 'spell-drop', data: { ...base, unit: box.unit, box: at, ok: true } })
    if (filled.some((x) => x === null)) {
      r.say.push({ id: box.soundId })
      answer()
      return
    }
    show({ alive: true })
    r.sfx.push('spell')
    r.say.push({ id: box.soundId }, { id: rd.wordVoice })
    r.save.push({ op: 'recordAnswer', features: [`spell:${rd.word}`, `sc:spell-${rd.mode}`], miss: s.mistakes > 0 })
    r.track.push({ e: 'spell-cast', data: { ...base, ms: Math.round(ev.at - s.started), mistakes: s.mistakes } })
    go({ k: 'cast' }, { for: 'say' })
  }

  switch (ev.type) {
    case 'start':
      if (s.flow.k !== 'open') break
      s.started = ev.at
      run({ phase: 'question', overlay: null, hintAvailable: true, needNext: false })
      r.say.push({ id: rd.wordVoice })
      show({})
      go({ k: 'word' }, { for: 'say' })
      break
    case 'drop': {
      const f = s.flow.k
      if (f !== 'answer' && f !== 'near' && f !== 'fix') break
      const at = next()
      // a box that is not the next one is refused: nothing changes
      if (at < 0 || ev.box !== at) break
      const box = rd.boxes[at]
      if (ev.tile === box.unit) { right(at); break }
      // after a mistake only the right tile is taken
      if (f === 'fix') break
      // another spelling of this box's sound: forgiven once, the right tile glows
      if (rd.near?.[ev.tile] === box.unit && !s.forgiven.includes(ev.tile)) {
        s.forgiven.push(ev.tile)
        s.hinted = false
        show({ glow: box.unit })
        r.hush = true
        r.say.push({ id: 'spell-near' })
        r.track.push({ e: 'spell-near', data: { ...base, tile: ev.tile, unit: box.unit, box: at } })
        go({ k: 'near' }, { for: 'say' })
        break
      }
      // a mistake: the tile goes back, then the right one glows and says its sound (no heart is decided here)
      s.mistakes++
      s.hinted = false
      r.hush = true
      show({ wrong: { tile: ev.tile, box: at }, glow: undefined })
      r.sfx.push('wrong')
      run({ phase: 'mistake' })
      r.track.push({ e: 'spell-drop', data: { ...base, unit: box.unit, box: at, ok: false, tile: ev.tile } })
      go({ k: 'wrong' }, { for: 'sleep', ms: WRONG_MS })
      break
    }
    case 'idle':
      if (s.flow.k === 'fix') {
        // he waits: the sound again
        s.replays++
        r.say.push({ id: rd.boxes[next()].soundId })
        break
      }
      if (s.flow.k !== 'answer' && s.flow.k !== 'near') break
      r.track.push({ e: 'idle', data: { screen: 'spell', target: rd.word } })
      r.say.push({ id: rd.wordVoice })
      break
    case 'hint': {
      // no hint after a mistake: the right tile already glows
      if (s.flow.k !== 'answer' && s.flow.k !== 'near') break
      const at = next()
      if (at < 0) break
      s.hinted = true
      show({ glow: rd.boxes[at].unit })
      r.track.push({ e: 'hint', data: { screen: 'spell', target: rd.word, auto: ev.auto } })
      r.say.push({ id: rd.wordVoice })
      break
    }
    case 'touch':
      if (s.hinted) { s.hinted = false; r.hush = true; show({ glow: undefined }) }
      break
    case 'slept':
      if (s.flow.k !== 'wrong') break
      // the fix: the right tile glows and says its sound; the sound again while he waits
      s.fixFrom = ev.at
      s.replays = 0
      show({ wrong: undefined, glow: rd.boxes[next()].unit })
      run({ fixing: true })
      r.say.push({ id: rd.boxes[next()].soundId })
      go({ k: 'fix' }, { for: 'drop', idle: SPELL_IDLE_MS, every: true })
      break
    case 'heard':
      switch (s.flow.k) {
        case 'word':
          if (!s.demo) { r.cue = true; run({ phase: 'answer' }); answer(); break }
          run({ phase: 'demo' })
          show({ demo: true, glow: rd.boxes[0].unit })
          r.say.push({ line: 'demo-spell', take: 1 })
          r.save.push({ op: 'markDemo', id: 'demo-spell' })
          r.track.push({ e: 'demo', data: { demo: 'demo-spell' } })
          go({ k: 'demo' }, { for: 'say' })
          break
        case 'demo':
          show({ demo: false, glow: undefined })
          r.cue = true
          run({ phase: 'answer' })
          answer()
          break
        case 'near':
          answer()
          break
        case 'cast':
          go({ k: 'over' })
          r.end = true
          break
        default:
          break
      }
      break
  }
  return r
}
