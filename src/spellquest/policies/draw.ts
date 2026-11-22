// A drawing round as a policy (spec: 2026-11-07 drawing): the word; the demo when needed; he writes the letter from
// memory, each stroke judged when the finger lifts (a tap is not a stroke, a piece may wait for the rest of its stroke);
// a wrong stroke fades and the hand shows it (after DRAW_TRIES the hand draws it for him); then the lines (told, never
// failed); then the marks (judged by place and count); then the word again. No hearts are lost. Pure: no store, no
// clock, no audio. `stepDraw(state, event)` returns the next state and what the run must do (show, say, play, save,
// track, wait); the run (controller.ts) does it and sends back the events. `LetterChecker` and `judgeMarks` judge; the
// policy only puts them in order. On the Latin board (English: `latin`) he writes a box for each letter, in turn, each
// with its own checker; the dots and bars of a letter are its marks (`matchMark`): any order once the letter is there,
// also after the next letter; after the last letter, the line asks for those still missing.
import type { Pt, Script, LetterDef } from '../data/strokes'
import { LetterChecker, bbox, judgeMarks, lineFeedback, markTargets, type Box, type LatinLines, type LetterMark, type LineKind, type MarkBoxes, type MarkSpec, type Verdict } from '../logic/recognizer'
import { afterVerdict, boxDx, dropFaded as withoutFaded, isTap, markLine as markLineOf, missingMarks, oweMarks, rowStroke, shift, takeMark, type Owed, type RowStroke } from './latinRow'
import { strokeTiming, type DrawLayout } from '../logic/drawLayout'
import { drawFeature } from '../logic/draw'

/**
 * one of his strokes on the drawing screen (letter units of the slot): live while judged, gold when right. Latin: `box`,
 * the letter's box it was drawn for; `mark`, a dot or a bar of a letter (it is not part of the letter's ink)
 */
export type DrawStroke = RowStroke
/** the round's word: its id, and its picture (Hebrew: an image name; the whole Book 2 word) */
export interface DrawWord { id: string; picture?: string }
export interface DrawView {
  screen: 'draw'; word: DrawWord; script: Script; letter: string; layout: DrawLayout; marks: MarkSpec[]
  strokes: DrawStroke[]
  mode: 'letter' | 'mark' | 'done'
  /** the glowing hand draws these strokes (a one-point stroke is a tap); a hint's demo stops at his next stroke */
  demo?: { id: number; strokes: Pt[][]; hint?: boolean }
  /** the letter left the lines: the part outside glows orange for a moment (it still counts) */
  lineFx?: { kind: LineKind; outside?: { from: number; to: number } }
  /** what the voice names glows: the marks' places */
  glow?: 'marks'
  /** the Latin board: the letters, one box each (`letter` is the one he writes now, in box `box`); the picture's file */
  alphabet?: 'latin'
  letters?: string[]
  box?: number
  picture?: string
  /** Latin: the marks still missing, where his letters put them (the verify build's test hook draws them) */
  owed?: Pt[][]
}

/** wrong tries of one stroke (or of the marks) before the hand draws it for him (no dead end) */
export const DRAW_TRIES = 3
/** a stroke shorter than this (letter units) is a tap, not a stroke of the letter */
export { TAP_LEN } from './latinRow'
/** a piece that waits for the rest of its stroke is settled after this pause */
export const SETTLE_MS = 1000
/** no stroke for this long: the instruction and the word (the run's IDLE_MS) */
export const DRAW_IDLE_MS = 8000
/** no stroke for this long: the hint's hand shows by itself (the run's IDLE_HINT_MS) */
export const DRAW_HINT_MS = 16000
/** a wrong stroke (or wrong marks) shows faded this long before the hand draws */
export const WRONG_MS = 350
/** an effect rings this long before the voice goes on (the run's SFX_RING_MS) */
export const RING_MS = 400

/**
 * What the run tells the policy. `start`: the round begins (its view is on the screen). `stroke`: his finger lifted.
 * `settle`, `idle`, `hint` with `auto`: the times of the stroke wait it asked for have come. `hint` without `auto`: the ?
 * button while he answers. `hint-over`: the hint's hand of that id has drawn. `touch`: he acted (a hint's hand goes away).
 * `ask-start` / `asked`: the line that asks for the marks starts / ends. `heard` / `slept`: the wait it asked for is over.
 * `at` = the run's clock.
 */
export type DrawInput =
  | { type: 'start' } | { type: 'stroke'; pts: Pt[] } | { type: 'settle' } | { type: 'idle' } | { type: 'hint'; auto: boolean }
  | { type: 'hint-over'; id: number } | { type: 'touch' } | { type: 'ask-start' } | { type: 'asked' } | { type: 'heard' } | { type: 'slept' }
export type DrawEvent = DrawInput & { at: number }

/** a line: `id` as it is, or `line` in its take `take` (no take: the run picks a variation) */
export type DrawLine = { id: string } | { line: string; take?: number }
export type DrawSfx = 'stroke' | 'drawn'
export type DrawSaveOp =
  | { op: 'markDemo'; id: 'demo-draw' }
  | { op: 'recordAnswer'; features: string[]; miss: boolean; helped?: true }
  | { op: 'noteDrawRound' }
export interface TrackRequest { e: string; data: Record<string, unknown> }
/** the run's view around the drawing */
export interface RunPatch {
  phase?: 'question' | 'demo' | 'answer' | 'feedback'
  hintAvailable?: boolean
  overlay?: null
  needNext?: false
}
/**
 * What the run waits for before the next event: the step's lines (`heard`; with `min`, at least that long too), a time
 * (`slept`), or his next stroke (`stroke`; `settle` after `settle` ms if given, `idle` after `idle` ms and `hint` with
 * `auto` after `hint` ms, each once). A new wait replaces the one that runs (its times are cancelled); a step with no
 * wait leaves it running.
 */
export type Wait = { for: 'say'; min?: number } | { for: 'sleep'; ms: number } | { for: 'stroke'; settle?: number; idle: number; hint: number }

export interface DrawStep {
  state: DrawState
  /** the drawing screen after this step (undefined: as it was) */
  view?: DrawView
  run?: RunPatch
  /** his answer time starts now */
  cue?: true
  /** stop the voice that plays, before this step's lines */
  hush?: boolean
  /** lines in order; the run waits for them when `wait` is `say`, otherwise they play on their own */
  say: DrawLine[]
  /** a line that plays beside the wait for his marks: the run sends `ask-start` when it starts and `asked` when it ends */
  ask?: DrawLine
  sfx: DrawSfx[]
  save: DrawSaveOp[]
  track: TrackRequest[]
  /** a hint's hand shows: send `hint-over` with this id after `ms` */
  hintFor?: { id: number; ms: number }
  /** the letter (and its marks) is drawn: the round counts (a star, the streak), before this step's saves */
  drawn?: true
  wait?: Wait
  /** the round is over */
  end?: true
}

type Flow =
  | { k: 'word' } | { k: 'demo'; id: number } | { k: 'letter' } | { k: 'wrong'; index: number } | { k: 'redraw'; id: number; helped: boolean }
  | { k: 'ring'; kind: LineKind } | { k: 'line' } | { k: 'marks' } | { k: 'mark-wrong' } | { k: 'mark-redraw'; id: number; targets: Pt[][] }
  | { k: 'marks-end' } | { k: 'done-ring' } | { k: 'done-word' } | { k: 'over' }

/**
 * A Latin round's own facts: the letters' strokes without their marks (one checker each, in turn), their marks (the
 * Hebrew marks rule: any order, also after the next letter, each matched to the nearest one missing), and what he
 * hears: as the round starts, when he waits, and when it is drawn.
 */
export interface LatinRound {
  defs: LetterDef[]
  marks: LetterMark[][]
  /** the four lines (the line feedback judges a letter against its own lines: an x-height letter against the middle one) */
  lines: LatinLines
  cue: { start: DrawLine[]; idle: DrawLine[]; end: DrawLine[] }
}

/** the round's facts that the run knows as it starts */
export interface DrawCtx {
  /** the round's screen, as built by the run (its word, script, layout and marks) */
  view: DrawView
  /** the letter's strokes in its script */
  def: LetterDef
  /** a new checker for `def` (the policy never changes it: it judges on copies) */
  checker: LetterChecker
  screen: 'draw' | 'draw-hand'
  /** the hand's demo after the word: the print screen's first visit (with its line), a letter not drawn well yet, or none */
  demo: 'first' | 'letter' | null
  /** the last stroke and demo ids (they only grow) */
  strokeNo: number
  demoNo: number
  /** a Latin round (unset: Hebrew) */
  latin?: LatinRound
}

export interface DrawState {
  view: DrawView
  def: LetterDef
  checker: LetterChecker
  screen: 'draw' | 'draw-hand'
  demo: 'first' | 'letter' | null
  flow: Flow
  /** when the round started (the run's clock) */
  started: number
  /** wrong tries per stroke of the letter */
  tries: number[]
  wrongStrokes: number
  /** the hand drew a stroke or the marks for him */
  helped: boolean
  /** the draw-again line was said in this round (once) */
  againSaid: boolean
  /** his letter's box (ok and helped strokes), after the letter */
  ink?: Box
  /** the marks' boxes, from the moment the letter is done */
  boxes?: MarkBoxes
  /** his marks since the last wrong try, and his wrong tries of the marks */
  mine: Pt[][]
  markTries: number
  markWrong: boolean
  /** the line that asks for the marks has ended */
  asked: boolean
  /** the idle line or the hint came in this stroke wait (his next stroke stops the voice) */
  spoke: boolean
  strokeNo: number
  demoNo: number
  /**
   * a Latin round: its facts, the box he writes now, and the marks of the letters he has written, where his letters
   * put them (`got`: drawn, or drawn for him by the hand)
   */
  latin?: LatinRound & { box: number; due: Owed[] }
}

/** A round as it starts (the run sends `start` next). */
export function drawRound(c: DrawCtx): DrawState {
  return {
    view: c.view, def: c.def, checker: c.checker, screen: c.screen, demo: c.demo, flow: { k: 'word' }, started: 0,
    tries: [], wrongStrokes: 0, helped: false, againSaid: false, mine: [], markTries: 0, markWrong: false, asked: false, spoke: false,
    strokeNo: c.strokeNo, demoNo: c.demoNo,
    ...(c.latin ? { latin: { ...c.latin, box: 0, due: [] } } : {}),
  }
}

/** One step of the round. Never changes `state` (the checker judges on a copy). */
export function stepDraw(state: DrawState, ev: DrawEvent): DrawStep {
  const s: DrawState = { ...state }
  const r: DrawStep = { state: s, say: [], sfx: [], save: [], track: [] }
  const v0 = s.view
  const show = (p: Partial<DrawView>) => { s.view = { ...s.view, ...p }; r.view = s.view }
  const run = (p: RunPatch) => { r.run = { ...r.run, ...p } }
  const go = (flow: Flow, wait?: Wait) => { s.flow = flow; if (wait) r.wait = wait }
  const checker = () => { if (s.checker === state.checker) s.checker = state.checker.clone(); return s.checker }
  const addStroke = (pts: Pt[], st: DrawStroke['state'], more?: Partial<DrawStroke>) =>
    show({ strokes: [...s.view.strokes, { id: ++s.strokeNo, pts, state: st, ...(s.latin ? { box: s.latin.box } : {}), ...more }] })
  // Latin: the checker judges each letter in its own box; his strokes and the hand's are where he draws them (from the
  // first box's origin)
  const dx = () => (s.latin ? boxDx(s.view.layout, s.latin.box) : 0)
  const out = (p: Pt[]): Pt[] => shift(p, dx())
  const inn = (p: Pt[]): Pt[] => shift(p, -dx())
  /** Latin: the marks owed (the view shows those still missing) */
  const setDue = (due: NonNullable<DrawState['latin']>['due']) => {
    s.latin = { ...s.latin!, due }
    show({ owed: due.filter((m) => !m.got).map((m) => m.pts) })
  }
  /** Latin: the marks of his letters still missing */
  const missing = () => (s.latin ? missingMarks(s.latin.due) : [])
  const markLine = (): DrawLine => markLineOf(s.latin!.due)
  /** Latin: his stroke is the missing mark `t` (gold at once: a mark is not judged as a stroke of the letter) */
  const gotMark = (got: { due: Owed[]; mark: Owed }, pts: Pt[]) => {
    const t = got.mark
    setDue(got.due)
    addStroke(pts, 'ok', { box: t.box, mark: true })
    r.sfx.push('stroke')
    r.track.push({ e: 'draw-mark', data: { mark: `${s.view.letters![t.box]}:${t.shape}`, ok: true } })
  }
  const restyle = (f: (x: DrawStroke, i: number, all: DrawStroke[]) => DrawStroke['state'] | null) =>
    show({ strokes: s.view.strokes.map((x, i, all) => { const k = f(x, i, all); return k ? { ...x, state: k } : x }) })
  const dropFaded = () => show({ strokes: withoutFaded(s.view.strokes) })
  /** the glowing hand draws `strokes` (and the voice may speak meanwhile); the wait ends when both are done */
  const handDraw = (strokes: Pt[][], line?: DrawLine) => {
    const id = ++s.demoNo
    show({ demo: { id, strokes } })
    const total = strokeTiming(strokes).total
    if (line) { r.say.push(line); r.wait = { for: 'say', min: total } } else r.wait = { for: 'sleep', ms: total }
    return id
  }
  const handDone = (id: number) => { if (s.view.demo?.id === id) show({ demo: undefined }) }
  /** wait for his next stroke (a piece that waits for the rest of its stroke is settled after a pause) */
  const strokeWait = () => {
    s.spoke = false
    r.wait = { for: 'stroke', idle: DRAW_IDLE_MS, hint: DRAW_HINT_MS, ...(s.flow.k === 'letter' && s.checker.hasPending ? { settle: SETTLE_MS } : {}) }
  }
  const letterTurn = () => { go({ k: 'letter' }); strokeWait() }
  const answer = () => { run({ phase: 'answer' }); r.cue = true; letterTurn() }

  /** the letter is done: the lines are told (never failed), then the marks */
  const lines = () => {
    s.ink = bbox(s.view.strokes.filter((x) => (x.state === 'ok' || x.state === 'helped') && !x.mark && (!s.latin || x.box === s.latin.box)).flatMap((x) => inn(x.pts)))
    if (s.latin) {
      // the letter's marks are owed now, where his letter puts them
      const L = s.latin
      setDue([...L.due, ...oweMarks(L.marks[L.box], s.checker, L.box, dx())])
    }
    run({ phase: 'feedback' })
    const fb = lineFeedback(s.ink, s.def, s.latin?.lines)
    if (fb) {
      show({ lineFx: fb })
      r.track.push({ e: 'draw-lines', data: { letter: s.view.letter, kind: fb.kind } })
      go({ k: 'ring', kind: fb.kind }, { for: 'sleep', ms: RING_MS })
      return
    }
    afterLines()
  }
  const afterLines = () => {
    if (s.latin) { latinNext(); return }
    if (!s.view.marks.length) { done(); return }
    // his marks count from the moment the letter is done, also while the voice asks for them: a dot drawn at once (the
    // ש's own dot, right after the ש) was thrown away, so the marks seemed to need an order (the parent)
    s.boxes = { letter: s.ink!, vav: s.view.layout.vav?.box }
    show({ mode: 'mark' })
    run({ phase: 'answer' })
    r.ask = { line: 'draw-mark', take: 1 }
    s.asked = false
    s.mine = []
    go({ k: 'marks' })
    strokeWait()
  }
  /** Latin: the next letter's box; after the last letter, the marks still missing (none: the round is drawn) */
  const latinNext = () => {
    const L = s.latin!
    if (L.box < L.defs.length - 1) {
      const box = L.box + 1
      s.latin = { ...L, box }
      s.def = L.defs[box]
      s.checker = new LetterChecker(s.def)
      s.tries = []
      show({ letter: s.view.letters![box], box })
      run({ phase: 'answer' })
      letterTurn()
      return
    }
    if (!missing().length) { done(); return }
    show({ mode: 'mark' })
    run({ phase: 'answer' })
    r.ask = markLine()
    s.asked = false
    go({ k: 'marks' })
    strokeWait()
  }
  /** Latin: a stroke while he draws the marks: the nearest missing one, or a wrong mark (the hand shows them) */
  const latinMark = (pts: Pt[]) => {
    const got = takeMark(s.latin!.due, pts)
    if (got) { gotMark(got, pts); if (missing().length) strokeWait(); else marksEnd(); return }
    r.track.push({ e: 'draw-mark', data: { mark: missing().map((t) => `${s.view.letters![t.box]}:${t.shape}`).join('+'), ok: false } })
    s.markWrong = true
    s.markTries++
    addStroke(pts, 'wrong', { mark: true })
    run({ phase: 'feedback' })
    go({ k: 'mark-wrong' }, { for: 'sleep', ms: WRONG_MS })
  }
  /** the marks are right, or the hand drew them: the round ends once the line that asks for them has ended */
  const marksEnd = () => {
    if (!s.asked) { go({ k: 'marks-end' }); return }
    show({ glow: undefined })
    done()
  }
  /** the letter (and its marks) is drawn: a star, the word again */
  const done = () => {
    show({ mode: 'done', glow: undefined, demo: undefined })
    r.sfx.push('drawn')
    r.drawn = true
    const clean = s.wrongStrokes === 0 && !s.helped && !s.markWrong
    // (the Latin board, English: a round the hand finished for him is `helped`, not a miss, as on the spell book; the
    // Hebrew drawing is unchanged)
    const helpedOnly = !!s.latin && s.helped
    // (a word: each of its letters' tallies)
    const letters = s.latin ? s.view.letters! : [v0.letter]
    r.save.push({ op: 'recordAnswer', features: [...new Set(letters.map((l) => drawFeature(l, v0.script))), `sc:${s.screen}`], miss: !clean && !helpedOnly, ...(helpedOnly ? { helped: true as const } : {}) }, { op: 'noteDrawRound' })
    r.track.push({ e: 'draw-done', data: { letter: letters.join(''), script: v0.script, word: v0.word.id, ms: Math.round(ev.at - s.started), wrongStrokes: s.wrongStrokes, helped: s.helped } })
    go({ k: 'done-ring' }, { for: 'sleep', ms: RING_MS })
  }
  /** a verdict of the checker on his stroke (`settled`: no stroke, the pause settled a waiting piece) */
  const judged = (v: Verdict | null, settled: boolean) => {
    if (!v) { letterTurn(); return }
    r.track.push({ e: 'draw-stroke', data: {
      letter: s.view.letter, script: v0.script, n: v.index + 1, ok: v.kind !== 'wrong', ...(v.kind === 'partial' ? { partial: true } : {}),
      ...(v.kind === 'wrong' ? { why: v.why } : {}), ...(settled ? { settled: true } : {}), ...(v.kind === 'ok' && v.joined ? { joined: true } : {}),
    } })
    // the strokes this verdict covers; a piece that waited before them was right (settled) or wrong
    show({ strokes: afterVerdict(s.view.strokes, v) })
    if (v.kind === 'partial') { letterTurn(); return }
    if (v.kind === 'ok') {
      r.sfx.push('stroke')
      if (s.checker.done) lines(); else letterTurn()
      return
    }
    if (s.checker.done) { dropFaded(); lines(); return }
    s.wrongStrokes++
    s.tries = [...s.tries]
    s.tries[v.index] = (s.tries[v.index] ?? 0) + 1
    run({ phase: 'feedback' })
    go({ k: 'wrong', index: v.index }, { for: 'sleep', ms: WRONG_MS })
  }
  /** the hint: the hand shows what is left (the marks, once he draws them); his next stroke stops it */
  const hint = (auto: boolean) => {
    const strokes = s.latin && s.view.mode === 'mark' ? missing().map((m) => m.pts)
      : s.view.mode === 'mark' && s.boxes ? markTargets(s.view.marks, s.boxes) : s.checker.remaining().map(out)
    if (!strokes.length) return
    r.track.push({ e: 'hint', data: { screen: 'draw', target: v0.word.id, auto } })
    const id = ++s.demoNo
    show({ demo: { id, strokes, hint: true } })
    r.hintFor = { id, ms: strokeTiming(strokes).total }
  }

  const f = s.flow
  switch (ev.type) {
    case 'start':
      s.started = ev.at
      run({ phase: 'question', overlay: null, hintAvailable: true, needNext: false })
      r.track.push({ e: 'draw-start', data: { word: v0.word.id, letter: s.latin ? v0.letters!.join('') : v0.letter, script: v0.script } })
      r.say.push(...(s.latin ? s.latin.cue.start : [{ id: `w-${v0.word.id}` }]))
      go({ k: 'word' }, { for: 'say' })
      break
    case 'stroke': {
      if (f.k !== 'letter' && f.k !== 'marks') break
      // his stroke stops the idle line or the hint's voice of this wait
      if (s.spoke) r.hush = true
      if (f.k === 'marks' && s.latin) { latinMark(ev.pts); break }
      if (f.k === 'marks') {
        s.mine = [...s.mine, ev.pts]
        addStroke(ev.pts, 'mark')
        const j = judgeMarks(s.mine, s.view.marks, s.boxes!)
        if (j.state === 'more') { strokeWait(); break }
        const markId = s.view.marks.map((m) => `${m.zone}:${m.shape}`).join('+')
        r.track.push({ e: 'draw-mark', data: { mark: markId, ok: j.state === 'ok' } })
        if (j.state === 'ok') { restyle((x) => (x.state === 'mark' ? 'ok' : null)); marksEnd(); break }
        s.markWrong = true
        s.markTries++
        s.mine = []
        restyle((x) => (x.state === 'mark' ? 'wrong' : null))
        run({ phase: 'feedback' })
        go({ k: 'mark-wrong' }, { for: 'sleep', ms: WRONG_MS })
        break
      }
      // Latin: a dot or a bar of a letter he has written (also after the next letter) is that mark, not a stroke of this one
      const k = s.latin ? rowStroke(ev.pts, s.checker, s.latin.due) : isTap(ev.pts) ? { k: 'tap' as const } : { k: 'letter' as const }
      if (k.k === 'mark') { gotMark(k, ev.pts); letterTurn(); break }
      // a tap is not a stroke of the letter
      if (k.k === 'tap') { letterTurn(); break }
      addStroke(ev.pts, 'live')
      judged(checker().add(inn(ev.pts)), false)
      break
    }
    case 'settle':
      if (f.k !== 'letter') break
      judged(checker().settle(), true)
      break
    case 'idle':
      if (f.k !== 'letter' && f.k !== 'marks') break
      s.spoke = true
      r.track.push({ e: 'idle', data: { screen: 'draw', target: v0.word.id } })
      if (s.view.mode === 'mark') r.say.push(s.latin ? markLine() : { line: 'draw-mark', take: 1 })
      else if (s.latin) r.say.push(...s.latin.cue.idle)
      else r.say.push({ line: 'q-draw' }, { id: `w-${v0.word.id}` })
      break
    case 'hint':
      if (ev.auto) { if (f.k !== 'letter' && f.k !== 'marks') break; s.spoke = true }
      hint(ev.auto)
      break
    case 'hint-over':
      if (s.view.demo?.id === ev.id) show({ demo: undefined })
      break
    case 'touch':
      if (s.view.demo?.hint) show({ demo: undefined })
      break
    case 'ask-start':
      if (s.view.mode === 'mark') show({ glow: 'marks' })
      break
    case 'asked':
      s.asked = true
      if (f.k === 'marks-end') marksEnd()
      break
    case 'heard': case 'slept':
      switch (f.k) {
        case 'word': {
          if (s.demo === 'first') {
            r.save.push({ op: 'markDemo', id: 'demo-draw' })
            r.track.push({ e: 'demo', data: { demo: 'demo-draw' } })
          }
          if (!s.demo) { answer(); break }
          run({ phase: 'demo' })
          const id = handDraw(s.checker.remaining().map(out), s.demo === 'first' ? { line: 'demo-draw', take: 1 } : undefined)
          go({ k: 'demo', id })
          break
        }
        case 'demo':
          handDone(f.id)
          answer()
          break
        case 'wrong': {
          const c = s.checker
          if ((s.tries[f.index] ?? 0) >= DRAW_TRIES) {
            // no dead end: the hand draws it for him and the round goes on
            go({ k: 'redraw', id: handDraw([out(c.expected())]), helped: true })
            break
          }
          const line: DrawLine | undefined = s.againSaid ? undefined : { line: 'draw-again' }
          s.againSaid = true
          go({ k: 'redraw', id: handDraw([out(c.expected())], line), helped: false })
          break
        }
        case 'redraw':
          handDone(f.id)
          dropFaded()
          if (f.helped) { addStroke(out(checker().force()), 'helped'); s.helped = true }
          run({ phase: 'answer' })
          if (s.checker.done) lines(); else letterTurn()
          break
        case 'ring':
          r.say.push({ line: `line-${f.kind}`, take: 1 })
          go({ k: 'line' }, { for: 'say' })
          break
        case 'line':
          show({ lineFx: undefined })
          afterLines()
          break
        case 'mark-wrong': {
          const targets = s.latin ? missing().map((m) => m.pts) : markTargets(s.view.marks, s.boxes!)
          go({ k: 'mark-redraw', id: handDraw(targets), targets })
          break
        }
        case 'mark-redraw':
          handDone(f.id)
          dropFaded()
          if (s.markTries >= DRAW_TRIES) {
            const owed = missing()
            f.targets.forEach((p, i) => addStroke(p, 'helped', s.latin ? { mark: true, box: owed[i]?.box } : undefined))
            if (s.latin) setDue(s.latin.due.map((m) => ({ ...m, got: true })))
            s.helped = true
            marksEnd()
            break
          }
          run({ phase: 'answer' })
          go({ k: 'marks' })
          strokeWait()
          break
        case 'done-ring':
          r.say.push(...(s.latin ? s.latin.cue.end : [{ id: `w-${v0.word.id}` }]))
          go({ k: 'done-word' }, { for: 'say' })
          break
        case 'done-word':
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
