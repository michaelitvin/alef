// The spell book as a policy (spec: 2026-11-16 English path, Part 7; both languages): he hears the word; one box for
// each sound unit (or syllable); he drops the tile of each unit into its box, in order. A right drop says its unit; the
// last one casts the spell: the word, the `spell` effect, the picture alive. A wrong tile is the calm screens' mistake:
// it goes back, the right tile glows and says its sound, only the right tile is taken, the sound again while he waits.
// A `near` tile (another spelling of the box's sound) is forgiven once. Pure: no store, no clock, no audio. The policy
// works in box order; the view mirrors for right to left. The first event of a visit, of any type, starts it. Each box
// is one answer on its unit, when the round gives the box's choice: the first drop decides a box (a right tile or a
// forgiven near tile is right, a wrong tile a miss; the fix after it is no second answer, nor is the same round again
// after a pause: the visit starts with the boxes already answered). After a hint, the box's answer is helped (also when
// a touch took the hint's glow away).
// The written mode (English, stage 4 on; spellWrite.ts, latinRow.ts): one box per letter. He writes the letters left to
// right, each judged by its own LetterChecker in its own box; the dots and bars of i, j, t, f follow the drawing's marks
// rule (any order, also after the next letter; after the last letter the line asks for those still missing). A unit is
// answered once: when its last letter is written, or at the first wrong stroke in one of its letters. A wrong stroke is
// the calm mistake: the stroke fades, the hand shows the letter (the written mode's glow) and its unit's sound plays;
// only right strokes count then (a wrong one only fades; after DRAW_TRIES the hand draws that stroke for him); the sound
// and the hand again while he waits. The hint (as on the drawing screen): the hand shows what is left of the letter.
import type { Pt } from '../data/strokes'
import type { Choice } from '../logic/rounds'
import { LetterChecker, type Verdict } from '../logic/recognizer'
import { DRAW_TRIES, SETTLE_MS, type DrawLine, type RunPatch, type TrackRequest } from './draw'
import { afterVerdict, boxDx, dropFaded as withoutFaded, inBox, markLine as markLineOf, missingMarks, oweMarks, rowStroke, shift, takeMark, type Owed } from './latinRow'
import { writeStart, type SpellWriteCtx, type SpellWriteView, type WriteState } from './spellWrite'

export interface SpellBox {
  unit: string; text: string; soundId: string
  /** what an answer on this box counts on (the course's unit); none: the box is no answer of its own */
  choice?: Choice
}
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
  /** the written mode's board */
  write?: SpellWriteView
}

/**
 * What the run tells the policy. `start`: the visit begins. `drop`: he dropped a tile into a box. `stroke`: his finger
 * lifted (the written mode; letter units from the first box's origin). `idle`, `hint` with `auto`, `settle`: the times
 * of the drop wait have come. `hint` without `auto`: the ? button. `touch`: finger down on a tile or the pen down (a
 * hint's glow, or its hand, goes away). `heard` / `slept`: the wait it asked for (lines, a time) is over.
 */
export type SpellInput =
  | { type: 'start'; at: number } | { type: 'drop'; tile: string; box: number; at: number } | { type: 'idle'; at: number }
  | { type: 'hint'; auto: boolean; at: number } | { type: 'touch'; at: number }
  | { type: 'heard'; at: number } | { type: 'slept'; at: number }
  | { type: 'stroke'; pts: Pt[]; at: number } | { type: 'settle'; at: number }

export type SpellSfx = 'drop' | 'wrong' | 'spell' | 'stroke'
export type SpellSaveOp = { op: 'markDemo'; id: 'demo-spell' | 'demo-spell-write' } | { op: 'recordAnswer'; features: string[]; miss: boolean }

/** the run's view around the spell book: `mistake` while a wrong tile shows, `fixing` while he does the right move */
export interface SpellRunPatch extends Omit<RunPatch, 'phase'> { phase?: RunPatch['phase'] | 'mistake'; fixing?: boolean }

/**
 * What the run waits for: lines (`say`), a time (`sleep`), or his next drop or stroke (`idle` ms without one: `idle`
 * again, every time when `every`; `hint` ms: `hint` with `auto`, once, when given; `settle` ms: `settle`, once, when
 * given: a piece of a stroke waits for the rest).
 */
export type SpellWait = { for: 'say' } | { for: 'sleep'; ms: number } | { for: 'drop'; idle: number; hint?: number; every?: true; settle?: number }

export interface SpellAnswer { box: number; miss: boolean; helped?: true }

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
  /** the boxes answered in this step (each its first drop or stroke): right, a miss, or right after a hint (`helped`) */
  answers: SpellAnswer[]
}

type Flow =
  | { k: 'open' } | { k: 'word' } | { k: 'demo' } | { k: 'answer' } | { k: 'near' } | { k: 'wrong' } | { k: 'fix' } | { k: 'marks' }
  | { k: 'cast' } | { k: 'over' }

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
  /** the hint shows (the glow, or the hand) until his next drop or touch */
  hinted: boolean
  /** a hint showed since the last box was answered: the next answer is helped (a touch that takes the hint away keeps it) */
  aided: boolean
  /** the boxes answered (their first drop came) */
  answered: number[]
  /** the written mode */
  write?: WriteState
}

/**
 * A visit as it starts (the first event starts it). `answered`: the boxes of this round answered before a pause (a
 * written round starts again from its first letter). `write`: a written round's facts (`spellWriting`).
 */
export function spellVisit(ctx: { round: SpellRound; demo: boolean; at: number; answered?: number[]; write?: SpellWriteCtx }): SpellState {
  if (ctx.round.mode === 'write' && !ctx.write) throw new Error(`a written spell round needs its letters' strokes: ${ctx.round.word}`)
  const w = ctx.write ? writeStart(ctx.round, ctx.write) : null
  return {
    round: ctx.round, demo: ctx.demo, flow: { k: 'open' }, started: ctx.at, fixFrom: 0, replays: 0, forgiven: [], mistakes: 0, hinted: false,
    aided: false, answered: [...(ctx.answered ?? [])],
    view: { screen: 'spell', round: ctx.round, filled: ctx.round.boxes.map(() => null), alive: false, ...(w ? { write: w.view } : {}) },
    ...(w ? { write: w.state } : {}),
  }
}

/** One step of the round. Never changes `state`. */
export function stepSpell(state: SpellState, ev: SpellInput): SpellStep {
  const s: SpellState = { ...state, forgiven: [...state.forgiven], answered: [...state.answered] }
  const r: SpellStep = { state: s, say: [], sfx: [], save: [], track: [], answers: [] }
  const rd = s.round
  const show = (p: Partial<SpellView>) => { s.view = { ...s.view, ...p }; r.view = s.view }
  const run = (p: SpellRunPatch) => { r.run = { ...r.run, ...p } }
  const go = (flow: Flow, wait?: SpellWait) => { s.flow = flow; if (wait) r.wait = wait }
  const next = () => s.view.filled.findIndex((x) => x === null)
  const base = { word: rd.word, mode: rd.mode }
  const answer = () => { go({ k: 'answer' }); waitDrop() }
  /** the wait for his next drop or stroke (after a mistake: the sound again, every time; no hint by itself) */
  const waitDrop = () => {
    const w = s.write
    if (w?.spoke) s.write = { ...w, spoke: false }
    const settle = w?.checker.hasPending && s.flow.k !== 'marks' ? { settle: SETTLE_MS } : {}
    r.wait = s.flow.k === 'fix' ? { for: 'drop', idle: SPELL_IDLE_MS, every: true, ...settle } : { for: 'drop', idle: SPELL_IDLE_MS, hint: SPELL_HINT_MS, ...settle }
  }
  /** the box's first drop is its answer (a box with no choice is none); a hint since the last answer makes it helped */
  const answered = (at: number, miss: boolean) => {
    if (!rd.boxes[at].choice || s.answered.includes(at)) return
    s.answered.push(at)
    r.answers.push({ box: at, miss, ...(!miss && s.aided ? { helped: true as const } : {}) })
    s.aided = false
  }
  /** the end of a fix: he did the right move himself */
  const fixed = (soundId: string) => {
    r.track.push({ e: 'fix', data: { screen: 'spell', target: soundId, ms: Math.round(ev.at - s.fixFrom), replays: s.replays } })
    run({ fixing: false, phase: 'answer' })
  }
  /** the last box is filled: the spell is cast (the box's sound, when it was not said already, then the word) */
  const cast = (last?: SpellBox) => {
    show({ alive: true })
    // the tiles rest while the spell is cast
    run({ phase: 'feedback' })
    r.sfx.push('spell')
    r.say.push(...(last ? [{ id: last.soundId }] : []), { id: rd.wordVoice })
    // (written: a wrong mark, or marks the hand put in, make the word not clean, as on the drawing)
    r.save.push({ op: 'recordAnswer', features: [`spell:${rd.word}`, `sc:spell-${rd.mode}`], miss: s.mistakes > 0 || !!s.write?.markWrong })
    r.track.push({ e: 'spell-cast', data: { ...base, ms: Math.round(ev.at - s.started), mistakes: s.mistakes } })
    go({ k: 'cast' }, { for: 'say' })
  }

  /** a right tile in its box (also the end of a fix) */
  const right = (at: number) => {
    const box = rd.boxes[at]
    if (s.flow.k === 'fix') fixed(box.soundId)
    answered(at, false)
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
    cast(box)
  }

  // ---- the written mode: his strokes in the letters' boxes (latinRow.ts: the drawing's checker and marks rule)
  const W = () => s.write!
  const setW = (p: Partial<WriteState>) => { s.write = { ...s.write!, ...p } }
  const showW = (p: Partial<SpellWriteView>) => show({ write: { ...s.view.write!, ...p } })
  /** the checker of the letter he writes now (a copy: the state it came from never changes) */
  const checker = () => { if (W().checker === state.write?.checker) setW({ checker: W().checker.clone() }); return W().checker }
  // his strokes come from the first box's origin; the checker judges each letter in its own box
  const dx = () => boxDx(W().layout, Math.min(W().at, W().defs.length - 1))
  const out = (p: Pt[]): Pt[] => shift(p, dx())
  const inn = (p: Pt[]): Pt[] => shift(p, -dx())
  const strokes = () => s.view.write!.strokes
  const addStroke = (pts: Pt[], st: SpellWriteView['strokes'][number]['state'], more?: { box?: number; mark?: true }) => {
    const id = W().strokeNo + 1
    setW({ strokeNo: id })
    showW({ strokes: [...strokes(), { id, pts, state: st, box: W().at, ...more }] })
  }
  const dropFaded = () => { if (strokes().some((x) => x.state === 'wrong')) showW({ strokes: withoutFaded(strokes()) }) }
  /** the glowing hand draws `strokes` (a hint's goes away at the pen) */
  const hand = (pts: Pt[][], hint?: boolean) => {
    const id = W().demoNo + 1
    setW({ demoNo: id })
    showW({ demo: { id, strokes: pts, ...(hint ? { hint: true as const } : {}) } })
  }
  /** what is left of the letter he writes now, where his letter is */
  const left = () => W().checker.remaining().map(out)
  const missing = () => missingMarks(W().due)
  const setDue = (due: Owed[]) => { setW({ due }); showW({ owed: missingMarks(due).map((m) => m.pts) }) }
  /** the box of the letter he writes now (after the last letter: the last box) */
  const boxNow = () => W().boxOf[Math.min(W().at, W().boxOf.length - 1)]
  /** his stroke is a missing mark: gold at once */
  const gotMark = (got: { due: Owed[]; mark: Owed }, pts: Pt[]) => {
    setDue(got.due)
    addStroke(pts, 'ok', { box: got.mark.box, mark: true })
    r.sfx.push('stroke')
  }
  /** a wrong stroke in a letter: the calm screens' mistake (no new mistake while he fixes one: it only fades) */
  const wrongStroke = (v: Extract<Verdict, { kind: 'wrong' }>) => {
    const w = W()
    if (s.flow.k === 'fix') {
      const tries = w.tries + 1
      setW({ tries })
      if (tries < DRAW_TRIES) { hand(left()); waitDrop(); return }
      // no dead end: the hand draws the stroke for him and he goes on
      dropFaded()
      addStroke(out(checker().force()), 'helped')
      setW({ tries: 0 })
      if (W().checker.done) letterDone(); else { hand(left()); waitDrop() }
      return
    }
    const box = w.boxOf[w.at]
    s.mistakes++
    answered(box, true)
    r.hush = true
    showW({ demo: undefined })
    r.sfx.push('wrong')
    run({ phase: 'mistake' })
    r.track.push({ e: 'spell-drop', data: { ...base, unit: rd.boxes[box].unit, box, ok: false, letter: s.view.write!.letters[w.at], why: v.why } })
    go({ k: 'wrong' }, { for: 'sleep', ms: WRONG_MS })
  }
  /** a verdict of the checker on his stroke (`null`: the pause found no piece waiting) */
  const judged = (v: Verdict | null) => {
    if (!v) { waitDrop(); return }
    showW({ strokes: afterVerdict(strokes(), v) })
    if (v.kind === 'partial') { waitDrop(); return }
    if (v.kind === 'wrong') { wrongStroke(v); return }
    r.sfx.push('stroke')
    if (W().checker.done) letterDone(); else waitDrop()
  }
  /** the letter is written: its marks are owed; its unit's box is filled when it was the unit's last letter */
  const letterDone = () => {
    const w = W()
    const box = w.boxOf[w.at]
    setDue([...w.due, ...oweMarks(w.marks[w.at], w.checker, w.at, dx())])
    showW({ demo: undefined })
    if (s.flow.k === 'fix') { fixed(rd.boxes[box].soundId); go({ k: 'answer' }) }
    const unitDone = w.boxOf[w.at + 1] !== box
    if (unitDone) {
      answered(box, false)
      show({ filled: s.view.filled.map((x, i) => (i === box ? rd.boxes[box].unit : x)) })
      r.sfx.push('drop')
      r.track.push({ e: 'spell-drop', data: { ...base, unit: rd.boxes[box].unit, box, ok: true } })
    }
    const at = w.at + 1
    if (at < w.defs.length) {
      setW({ at, checker: new LetterChecker(w.defs[at]), tries: 0 })
      showW({ at })
      if (unitDone) r.say.push({ id: rd.boxes[box].soundId })
      answer()
      return
    }
    setW({ at })
    if (!missing().length) { showW({ at, mode: 'done' }); cast(rd.boxes[box]); return }
    // every letter is written: the line asks for the marks still missing
    showW({ at, mode: 'mark' })
    r.say.push({ id: rd.boxes[box].soundId }, markLineOf(W().due))
    go({ k: 'marks' })
    waitDrop()
  }
  /** the marks are all there: the spell is cast (the last unit's sound was said before the marks) */
  const marksDone = () => { showW({ mode: 'done', demo: undefined }); cast() }
  /** a stroke while the marks are asked for that is no missing mark: it fades, the hand shows them (after DRAW_TRIES it draws them) */
  const wrongMark = (pts: Pt[]) => {
    addStroke(pts, 'wrong', { mark: true })
    const markTries = W().markTries + 1
    setW({ markTries, markWrong: true })
    if (markTries < DRAW_TRIES) { hand(missing().map((m) => m.pts)); waitDrop(); return }
    for (const m of missing()) addStroke(m.pts, 'helped', { box: m.box, mark: true })
    setDue(W().due.map((m) => ({ ...m, got: true })))
    marksDone()
  }
  const stroke = (pts: Pt[]) => {
    const f = s.flow.k
    if (f !== 'answer' && f !== 'fix' && f !== 'marks') return
    // his stroke stops the idle line or the hint's voice of this wait
    if (W().spoke) r.hush = true
    dropFaded()
    if (f === 'marks') {
      const got = takeMark(W().due, pts)
      if (!got) { wrongMark(pts); return }
      gotMark(got, pts)
      if (missing().length) waitDrop(); else marksDone()
      return
    }
    // a dot or a bar of a letter he has written (also while he writes the next one) is that mark; a tap is nothing
    const k = rowStroke(pts, W().checker, W().due)
    if (k.k === 'mark') { gotMark(k, pts); waitDrop(); return }
    if (k.k === 'tap') { waitDrop(); return }
    addStroke(pts, 'live')
    const box = W().at
    const v = checker().add(inn(pts))
    if (v.kind === 'wrong' && W().checker.done) {
      // the piece that waited made the letter whole; this stroke is no part of it. In the finished letter's box it fades
      // (as on the drawing); elsewhere it is judged again, as the next letter's (or a mark)
      showW({ strokes: afterVerdict(strokes(), v) })
      r.sfx.push('stroke')
      const mine = inBox(W().layout, box, pts)
      showW({ strokes: strokes().slice(0, -1) })
      letterDone()
      // (letterDone moved the flow on)
      const now = s.flow.k as Flow['k']
      if (!mine && (now === 'answer' || now === 'marks')) stroke(pts)
      return
    }
    judged(v)
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
      if (s.write || (f !== 'answer' && f !== 'near' && f !== 'fix')) break
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
        answered(at, false)
        s.hinted = false
        show({ glow: box.unit })
        r.hush = true
        r.say.push({ line: 'spell-near' })
        r.track.push({ e: 'spell-near', data: { ...base, tile: ev.tile, unit: box.unit, box: at } })
        go({ k: 'near' }, { for: 'say' })
        break
      }
      // a mistake: the tile goes back, then the right one glows and says its sound (no heart is decided here)
      s.mistakes++
      answered(at, true)
      s.hinted = false
      r.hush = true
      show({ wrong: { tile: ev.tile, box: at }, glow: undefined })
      r.sfx.push('wrong')
      run({ phase: 'mistake' })
      r.track.push({ e: 'spell-drop', data: { ...base, unit: box.unit, box: at, ok: false, tile: ev.tile } })
      go({ k: 'wrong' }, { for: 'sleep', ms: WRONG_MS })
      break
    }
    case 'stroke':
      if (s.write) stroke(ev.pts)
      break
    case 'settle':
      if (!s.write || (s.flow.k !== 'answer' && s.flow.k !== 'fix')) break
      judged(checker().settle())
      break
    case 'idle':
      if (s.flow.k === 'fix') {
        // he waits: the sound again (written: and the hand again)
        s.replays++
        if (s.write) { setW({ spoke: true }); r.say.push({ id: rd.boxes[boxNow()].soundId }); hand(left()); break }
        r.say.push({ id: rd.boxes[next()].soundId })
        break
      }
      if (s.flow.k === 'marks') { setW({ spoke: true }); r.say.push(markLineOf(W().due)); break }
      if (s.flow.k !== 'answer' && s.flow.k !== 'near') break
      if (s.write) setW({ spoke: true })
      r.track.push({ e: 'idle', data: { screen: 'spell', target: rd.word } })
      // he waits: the question line, then the word (as the drawing's q-draw)
      r.say.push({ line: 'q-spell' }, { id: rd.wordVoice })
      break
    case 'hint': {
      // no hint after a mistake: the right tile already glows
      if (s.flow.k !== 'answer' && s.flow.k !== 'near' && s.flow.k !== 'marks') break
      if (s.write) {
        // the drawing's hint: the hand shows what is left (the letter's strokes, or the marks still missing)
        const pts = s.flow.k === 'marks' ? missing().map((m) => m.pts) : left()
        if (!pts.length) break
        setW({ spoke: true })
        hand(pts, true)
      } else {
        const at = next()
        if (at < 0) break
        show({ glow: rd.boxes[at].unit })
      }
      s.hinted = true
      s.aided = true
      r.track.push({ e: 'hint', data: { screen: 'spell', target: rd.word, auto: ev.auto } })
      r.say.push({ id: rd.wordVoice })
      break
    }
    case 'touch':
      // the hint goes away (its help still counts: `aided`)
      if (!s.hinted) break
      s.hinted = false
      r.hush = true
      if (s.write) showW({ demo: undefined }); else show({ glow: undefined })
      break
    case 'slept':
      if (s.flow.k !== 'wrong') break
      // the fix: the right tile glows (written: the hand shows the letter) and says its sound; the sound again while he waits
      s.fixFrom = ev.at
      s.replays = 0
      run({ fixing: true })
      if (s.write) {
        dropFaded()
        setW({ tries: 0 })
        hand(left())
        r.say.push({ id: rd.boxes[boxNow()].soundId })
        go({ k: 'fix' })
        waitDrop()
        break
      }
      show({ wrong: undefined, glow: rd.boxes[next()].unit })
      r.say.push({ id: rd.boxes[next()].soundId })
      go({ k: 'fix' }, { for: 'drop', idle: SPELL_IDLE_MS, every: true })
      break
    case 'heard':
      switch (s.flow.k) {
        case 'word': {
          if (!s.demo) { r.cue = true; run({ phase: 'answer' }); answer(); break }
          const id = s.write ? 'demo-spell-write' : 'demo-spell'
          run({ phase: 'demo' })
          // (written: the hand writes the first letter)
          if (s.write) hand(left()); else show({ demo: true, glow: rd.boxes[0].unit })
          r.say.push({ line: id, take: 1 })
          r.save.push({ op: 'markDemo', id })
          r.track.push({ e: 'demo', data: { demo: id } })
          go({ k: 'demo' }, { for: 'say' })
          break
        }
        case 'demo':
          if (s.write) showW({ demo: undefined }); else show({ demo: false, glow: undefined })
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
