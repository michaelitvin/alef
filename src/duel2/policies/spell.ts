// The spell book as a policy (spec: 2026-11-16 English path, Part 7; both languages): he hears the word; one box for
// each sound unit (or syllable); he drops the tile of each unit into its box, in order. A right drop says its unit; the
// last one casts the spell: the word, the `spell` effect, the picture alive. A wrong tile is a mistake he fixes himself
// (no heart is lost; after SPELL_TRIES the right tile glows). A `near` tile (another spelling of the box's sound) is
// forgiven once. Pure: no store, no clock, no audio. The policy works in box order; the view mirrors for right to left.
// The write mode sends the same `drop` (the unit his finger wrote, as the recognizer judged it). The first event of a
// visit, of any type, starts it.
import type { DrawLine, RunPatch, TrackRequest, Wait } from './draw'

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

/** wrong tiles in one box before the right tile glows (no dead end) */
export const SPELL_TRIES = 2
/** a wrong tile shows this long before it goes back */
export const WRONG_MS = 350
/** no drop for this long: the word again */
export const SPELL_IDLE_MS = 8000

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

export type SpellInput =
  | { type: 'drop'; tile: string; box: number; at: number } | { type: 'idle'; at: number }
  | { type: 'hint'; at: number } | { type: 'voice-end'; at: number }

export type SpellSfx = 'drop' | 'wrong' | 'spell'
export type SpellSaveOp = { op: 'markDemo'; id: 'demo-spell' } | { op: 'recordAnswer'; features: string[]; miss: boolean }

export interface SpellStep {
  state: SpellState
  view?: SpellView
  run?: RunPatch
  cue?: true
  hush?: boolean
  say: DrawLine[]
  sfx: SpellSfx[]
  save: SpellSaveOp[]
  track: TrackRequest[]
  wait?: Wait
  /** the round is over */
  end?: true
}

type Flow = { k: 'open' } | { k: 'word' } | { k: 'demo' } | { k: 'answer' } | { k: 'wrong' } | { k: 'cast' } | { k: 'over' }

export interface SpellState {
  round: SpellRound
  demo: boolean
  view: SpellView
  flow: Flow
  started: number
  /** wrong tiles in the box that waits */
  tries: number
  /** the tiles forgiven as near (once each) */
  forgiven: string[]
  mistakes: number
  /** the hint's glow shows until his next drop */
  hinted: boolean
}

/** A visit as it starts (the first event starts it). */
export function spellVisit(ctx: { round: SpellRound; demo: boolean; at: number }): SpellState {
  return {
    round: ctx.round, demo: ctx.demo, flow: { k: 'open' }, started: ctx.at, tries: 0, forgiven: [], mistakes: 0, hinted: false,
    view: { screen: 'spell', round: ctx.round, filled: ctx.round.boxes.map(() => null), alive: false },
  }
}

/** One step of the round. Never changes `state`. */
export function stepSpell(state: SpellState, ev: SpellInput): SpellStep {
  const s: SpellState = { ...state, forgiven: [...state.forgiven] }
  const r: SpellStep = { state: s, say: [], sfx: [], save: [], track: [] }
  const rd = s.round
  const show = (p: Partial<SpellView>) => { s.view = { ...s.view, ...p }; r.view = s.view }
  const go = (flow: Flow, wait?: Wait) => { s.flow = flow; if (wait) r.wait = wait }
  const next = () => s.view.filled.findIndex((x) => x === null)
  const answer = () => { go({ k: 'answer' }, { for: 'stroke', idle: SPELL_IDLE_MS, hint: SPELL_IDLE_MS * 2 }) }
  const base = { word: rd.word, mode: rd.mode }

  if (s.flow.k === 'open') {
    s.started = ev.at
    r.run = { phase: 'question', overlay: null, hintAvailable: true, needNext: false }
    r.say.push({ id: rd.wordVoice })
    show({})
    go({ k: 'word' }, { for: 'say' })
    return r
  }

  switch (ev.type) {
    case 'drop': {
      if (s.flow.k !== 'answer') break
      const at = next()
      // a box that is not the next one is refused: nothing changes
      if (at < 0 || ev.box !== at) break
      const box = rd.boxes[at]
      if (s.hinted || s.view.glow) show({ glow: undefined })
      s.hinted = false
      if (ev.tile === box.unit) {
        const filled = s.view.filled.map((x, i) => (i === at ? ev.tile : x))
        const last = filled.every((x) => x !== null)
        s.tries = 0
        show({ filled, glow: undefined, wrong: undefined })
        r.sfx.push('drop')
        r.track.push({ e: 'spell-drop', data: { ...base, unit: box.unit, box: at, ok: true } })
        if (!last) {
          r.say.push({ id: box.soundId })
          r.wait = { for: 'stroke', idle: SPELL_IDLE_MS, hint: SPELL_IDLE_MS * 2 }
          break
        }
        show({ alive: true })
        r.sfx.push('spell')
        r.say.push({ id: box.soundId }, { id: rd.wordVoice })
        r.save.push({ op: 'recordAnswer', features: [`spell:${rd.word}`, `sc:spell-${rd.mode}`], miss: s.mistakes > 0 })
        r.track.push({ e: 'spell-cast', data: { ...base, ms: Math.round(ev.at - s.started), mistakes: s.mistakes } })
        go({ k: 'cast' }, { for: 'say' })
        break
      }
      // another spelling of this box's sound: forgiven once, the right tile glows
      if (rd.near?.[ev.tile] === box.unit && !s.forgiven.includes(ev.tile)) {
        s.forgiven.push(ev.tile)
        show({ glow: box.unit })
        r.say.push({ id: 'spell-near' })
        r.track.push({ e: 'spell-near', data: { ...base, tile: ev.tile, unit: box.unit, box: at } })
        r.wait = { for: 'say' }
        s.flow = { k: 'wrong' }
        break
      }
      s.mistakes++
      s.tries++
      show({ wrong: { tile: ev.tile, box: at } })
      r.sfx.push('wrong')
      r.track.push({ e: 'spell-drop', data: { ...base, unit: box.unit, box: at, ok: false, tile: ev.tile } })
      go({ k: 'wrong' }, { for: 'sleep', ms: WRONG_MS })
      break
    }
    case 'idle':
      if (s.flow.k !== 'answer') break
      r.track.push({ e: 'idle', data: { screen: 'spell', target: rd.word } })
      r.say.push({ id: rd.wordVoice })
      break
    case 'hint': {
      if (s.flow.k !== 'answer') break
      const at = next()
      if (at < 0) break
      s.hinted = true
      show({ glow: rd.boxes[at].unit })
      r.track.push({ e: 'hint', data: { screen: 'spell', target: rd.word, auto: false } })
      r.say.push({ id: rd.wordVoice })
      break
    }
    case 'voice-end':
      switch (s.flow.k) {
        case 'word':
          if (!s.demo) { r.cue = true; r.run = { phase: 'answer' }; answer(); break }
          r.run = { phase: 'demo' }
          show({ demo: true, glow: rd.boxes[0].unit })
          r.say.push({ line: 'demo-spell', take: 1 })
          r.save.push({ op: 'markDemo', id: 'demo-spell' })
          r.track.push({ e: 'demo', data: { demo: 'demo-spell' } })
          go({ k: 'demo' }, { for: 'say' })
          break
        case 'demo':
          show({ demo: false, glow: undefined })
          r.cue = true
          r.run = { phase: 'answer' }
          answer()
          break
        case 'wrong':
          // the wrong tile goes back; the right one glows after SPELL_TRIES wrong ones
          show({ wrong: undefined, ...(s.tries >= SPELL_TRIES ? { glow: rd.boxes[next()].unit } : {}) })
          r.run = { phase: 'answer' }
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
