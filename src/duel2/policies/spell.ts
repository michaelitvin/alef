// The spell book as a policy (spec: 2026-11-16 English path, Part 7; both languages): he hears the word; one box for
// each sound unit (or syllable); he drops the tile of each unit into its box, in order. A right drop says its unit; the
// last one casts the spell: the word, the `spell` effect, the picture alive. A wrong tile is a mistake he fixes himself
// (no heart is lost; after SPELL_TRIES the right tile glows). A `near` tile (another spelling of the box's sound) is
// forgiven once. Pure: no store, no clock, no audio. The policy works in box order; the view mirrors for right to left.
// The write mode sends the same `drop` (the unit his finger wrote, as the recognizer judged it). The first event of a
// visit, of any type, starts it. Each box is one answer on its unit, when the round gives the box's choice: the first
// drop decides a box (a right tile or a forgiven near tile is right, a wrong tile a miss; the fix after it is no second
// answer, nor is the same round again after a pause: the visit starts with the boxes already answered).
// The written mode (English, stage 4 on): one box per letter, not per unit (sh is two letters in two boxes of its one
// unit). He writes the letters left to right, each judged by the drawing's LetterChecker in its own box as he writes it;
// the dots and bars of i, j, t, f follow the drawing's marks rule (any order, also after the next letter; after the last
// letter the line asks for those still missing). A unit is answered once: when its last letter is written, or at the
// first wrong stroke in one of its letters. A wrong stroke is the calm screens' mistake: the stroke fades, the hand
// shows the letter's strokes (the written mode's glow) and its unit's sound plays; only right strokes count then (a
// wrong one only fades; after DRAW_TRIES the hand draws that stroke for him); the sound and the hand again while he
// waits. The hint (as on the drawing screen): the hand shows what is left of the letter he writes.
import type { CourseWriting } from '../course/types'
import type { LetterDef, Pt } from '../data/strokes'
import { SPELL_BOARD, latinLayout, type DrawLayout } from '../logic/drawLayout'
import type { Choice } from '../logic/rounds'
import { LetterChecker, matchMark, pathLength, splitMarks, type LetterMark, type MarkTarget, type Verdict } from '../logic/recognizer'
import { DRAW_TRIES, SETTLE_MS, TAP_LEN, type DrawLine, type DrawStroke, type RunPatch, type TrackRequest } from './draw'

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

/** the letters of a word, in order, with the box of their unit (a unit of two letters, sh, is two letters of one box) */
export const spellLetters = (round: SpellRound): { ch: string; box: number }[] =>
  round.boxes.flatMap((b, box) => [...b.text].map((ch) => ({ ch, box })))

/** a written round's own facts: each letter without its marks (one checker each, in turn), its marks, the board */
export interface SpellWriteCtx { defs: LetterDef[]; marks: LetterMark[][]; layout: DrawLayout }

/**
 * A written round's facts from the course's writing: the letters' strokes and marks (the drawing's split), and the board
 * on the book's two pages (four lines, a box per letter, then the faint tail e).
 */
export function spellWriting(round: SpellRound, w: Pick<CourseWriting, 'strokesOf' | 'isMark' | 'lines' | 'font' | 'unitEm' | 'em'>): SpellWriteCtx {
  const parts = spellLetters(round).map((l) => splitMarks(w.strokesOf(l.ch), w.isMark))
  const defs = parts.map((x) => x.body)
  const layout = latinLayout({ defs, rest: round.tail ?? '', capital: false, lines: w.lines, font: w.font, unitEm: w.unitEm, em: w.em, board: SPELL_BOARD })
  return { defs, marks: parts.map((x) => x.marks), layout }
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

/** the written word's board: its letters, one box each (`at`: the one he writes now), his strokes, the hand */
export interface SpellWriteView {
  layout: DrawLayout
  letters: string[]
  /** the letter he writes now (letters.length: every letter is written) */
  at: number
  /** his strokes, in letter units from the first box's origin (`box`: the letter's index) */
  strokes: DrawStroke[]
  /** `mark`: every letter is written, the marks still missing are asked for */
  mode: 'letter' | 'mark' | 'done'
  /** the glowing hand draws these strokes (the demo, the hint, the fix) */
  demo?: { id: number; strokes: Pt[][]; hint?: true }
  /** the marks still missing, where his letters put them */
  owed?: Pt[][]
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
  /** box `box` was answered (its first drop): right, a miss, or right while the hint's glow showed it (`helped`) */
  answer?: { box: number; miss: boolean; helped?: true }
}

type Flow =
  | { k: 'open' } | { k: 'word' } | { k: 'demo' } | { k: 'answer' } | { k: 'near' } | { k: 'wrong' } | { k: 'fix' } | { k: 'marks' }
  | { k: 'cast' } | { k: 'over' }

/** a written round as it goes: the letter he writes now and its checker, and the marks owed */
interface WriteState extends SpellWriteCtx {
  /** each letter's box (its unit) */
  boxOf: number[]
  at: number
  checker: LetterChecker
  /** wrong strokes of this letter while he fixes it */
  tries: number
  /** the marks of the letters he has written, where his letters put them (`got`: drawn, or by the hand) */
  due: (MarkTarget & { got: boolean })[]
  markTries: number
  strokeNo: number
  demoNo: number
  /** the hint showed since the last box was answered (its hand goes away at the pen; the help still counts) */
  aided: boolean
  /** the idle line or the hint spoke in this wait (his next stroke stops the voice) */
  spoke: boolean
}

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
  const w = ctx.write
  if (ctx.round.mode === 'write' && !w) throw new Error(`a written spell round needs its letters' strokes: ${ctx.round.word}`)
  const letters = spellLetters(ctx.round)
  return {
    round: ctx.round, demo: ctx.demo, flow: { k: 'open' }, started: ctx.at, fixFrom: 0, replays: 0, forgiven: [], mistakes: 0, hinted: false,
    answered: [...(ctx.answered ?? [])],
    view: {
      screen: 'spell', round: ctx.round, filled: ctx.round.boxes.map(() => null), alive: false,
      ...(w ? { write: { layout: w.layout, letters: letters.map((l) => l.ch), at: 0, strokes: [], mode: 'letter' as const } } : {}),
    },
    ...(w ? {
      write: {
        ...w, boxOf: letters.map((l) => l.box), at: 0, checker: new LetterChecker(w.defs[0]), tries: 0, due: [], markTries: 0,
        strokeNo: 0, demoNo: 0, aided: false, spoke: false,
      },
    } : {}),
  }
}

/** One step of the round. Never changes `state`. */
export function stepSpell(state: SpellState, ev: SpellInput): SpellStep {
  const s: SpellState = { ...state, forgiven: [...state.forgiven], answered: [...state.answered] }
  const r: SpellStep = { state: s, say: [], sfx: [], save: [], track: [] }
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
  /** the box's first drop is its answer (a box with no choice is none) */
  const answered = (at: number, miss: boolean) => {
    if (!rd.boxes[at].choice || s.answered.includes(at)) return
    s.answered.push(at)
    const helped = s.write ? s.write.aided : s.hinted
    r.answer = { box: at, miss, ...(!miss && helped ? { helped: true as const } : {}) }
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
    r.save.push({ op: 'recordAnswer', features: [`spell:${rd.word}`, `sc:spell-${rd.mode}`], miss: s.mistakes > 0 })
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

  // ---- the written mode: his strokes in the letters' boxes (the drawing's checker and marks rule)
  const W = () => s.write!
  const setW = (p: Partial<WriteState>) => { s.write = { ...s.write!, ...p } }
  const showW = (p: Partial<SpellWriteView>) => show({ write: { ...s.view.write!, ...p } })
  /** the checker of the letter he writes now (a copy: the state it came from never changes) */
  const checker = () => { if (W().checker === state.write?.checker) setW({ checker: W().checker.clone() }); return W().checker }
  // his strokes come from the first box's origin; the checker judges each letter in its own box
  const dx = () => W().layout.boxes?.[Math.min(W().at, W().defs.length - 1)]?.dx ?? 0
  const out = (p: Pt[]): Pt[] => { const d = dx(); return p.map(([x, y]): Pt => [x + d, y]) }
  const inn = (p: Pt[]): Pt[] => { const d = dx(); return p.map(([x, y]): Pt => [x - d, y]) }
  const addStroke = (pts: Pt[], st: DrawStroke['state'], more?: Partial<DrawStroke>) => {
    const id = W().strokeNo + 1
    setW({ strokeNo: id })
    showW({ strokes: [...s.view.write!.strokes, { id, pts, state: st, box: W().at, ...more }] })
  }
  const dropFaded = () => { if (s.view.write!.strokes.some((x) => x.state === 'wrong')) showW({ strokes: s.view.write!.strokes.filter((x) => x.state !== 'wrong') }) }
  /** the glowing hand draws `strokes` (a hint's goes away at the pen) */
  const hand = (strokes: Pt[][], hint?: boolean) => {
    const id = W().demoNo + 1
    setW({ demoNo: id })
    showW({ demo: { id, strokes, ...(hint ? { hint: true as const } : {}) } })
  }
  /** what is left of the letter he writes now, where his letter is */
  const left = () => W().checker.remaining().map(out)
  const missing = () => W().due.filter((m) => !m.got)
  const setDue = (due: WriteState['due']) => { setW({ due }); showW({ owed: due.filter((m) => !m.got).map((m) => m.pts) }) }
  const markLine = (): DrawLine => ({ line: missing()[0]?.shape === 'bar' ? 'draw-cross' : 'draw-dot', take: 1 })
  /** the box of the letter he writes now (after the last letter: the last box) */
  const boxNow = () => W().boxOf[Math.min(W().at, W().boxOf.length - 1)]
  /** his stroke is the missing mark `i`: gold at once */
  const gotMark = (i: number, pts: Pt[]) => {
    const t = missing()[i]
    setDue(W().due.map((m) => (m === t ? { ...m, got: true } : m)))
    addStroke(pts, 'ok', { box: t.box, mark: true })
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
    const mine = v.kind === 'ok' ? 'ok' : v.kind === 'partial' ? 'pending' : 'wrong'
    const own = s.view.write!.strokes
    showW({ strokes: own.map((x, i) => (i >= own.length - v.pieces ? { ...x, state: mine } : x.state === 'pending' ? { ...x, state: v.settled ? 'ok' : 'wrong' } : x)) })
    if (v.kind === 'partial') { waitDrop(); return }
    if (v.kind === 'wrong') { wrongStroke(v); return }
    r.sfx.push('stroke')
    if (W().checker.done) letterDone(); else waitDrop()
  }
  /** the letter is written: its marks are owed; its unit's box is filled when it was the unit's last letter */
  const letterDone = () => {
    const w = W()
    const c = w.checker
    const box = w.boxOf[w.at]
    setDue([...w.due, ...w.marks[w.at].map((m) => ({ ...m, pts: out(c.place(m.pts)), box: w.at, k: c.scale, got: false }))])
    showW({ demo: undefined })
    if (s.flow.k === 'fix') { fixed(rd.boxes[box].soundId); go({ k: 'answer' }) }
    const unitDone = w.boxOf[w.at + 1] !== box
    if (unitDone) {
      answered(box, false)
      setW({ aided: false })
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
    r.say.push({ id: rd.boxes[box].soundId }, markLine())
    go({ k: 'marks' })
    waitDrop()
  }
  /** the marks are all there: the spell is cast (the last unit's sound was said before the marks) */
  const marksDone = () => { showW({ mode: 'done', demo: undefined }); cast() }
  /** a stroke while the marks are asked for that is no missing mark: it fades, the hand shows them (after DRAW_TRIES it draws them) */
  const wrongMark = (pts: Pt[]) => {
    addStroke(pts, 'wrong', { mark: true })
    const markTries = W().markTries + 1
    setW({ markTries })
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
    // a dot or a bar of a letter he has written (also while he writes the next one) is that mark
    if (!W().checker.hasPending && missing().length) {
      const m = matchMark(pts, missing())
      if (m >= 0) { gotMark(m, pts); if (f === 'marks' && !missing().length) marksDone(); else waitDrop(); return }
    }
    if (f === 'marks') { wrongMark(pts); return }
    // a tap is not a stroke of the letter
    if (pathLength(pts) < TAP_LEN) { waitDrop(); return }
    addStroke(pts, 'live')
    const v = checker().add(inn(pts))
    if (v.kind === 'wrong' && W().checker.done) {
      // the piece that waited made the letter whole: this stroke is no part of it (it may be the next letter's, or a mark)
      const own = s.view.write!.strokes
      showW({ strokes: own.slice(0, -1).map((x) => (x.state === 'pending' ? { ...x, state: 'ok' } : x)) })
      r.sfx.push('stroke')
      letterDone()
      // (letterDone moved the flow on)
      const now = s.flow.k as Flow['k']
      if (now === 'answer' || now === 'marks') stroke(pts)
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
      if (s.flow.k === 'marks') { setW({ spoke: true }); r.say.push(markLine()); break }
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
        const strokes = s.flow.k === 'marks' ? missing().map((m) => m.pts) : left()
        if (!strokes.length) break
        s.hinted = true
        setW({ aided: true, spoke: true })
        hand(strokes, true)
      } else {
        const at = next()
        if (at < 0) break
        s.hinted = true
        show({ glow: rd.boxes[at].unit })
      }
      r.track.push({ e: 'hint', data: { screen: 'spell', target: rd.word, auto: ev.auto } })
      r.say.push({ id: rd.wordVoice })
      break
    }
    case 'touch':
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
