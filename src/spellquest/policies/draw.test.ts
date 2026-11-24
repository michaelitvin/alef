import { describe, expect, it } from 'vitest'
import { strokesOf, type Pt, type Script } from '../data/strokes'
import { WORDS } from '../data/words'
import { marksFor, splitWord } from '../logic/draw'
import { drawLayout, strokeTiming } from '../logic/drawLayout'
import { LetterChecker, bbox, markTargets, resample } from '../logic/recognizer'
import {
  DRAW_HINT_MS, DRAW_IDLE_MS, RING_MS, SETTLE_MS, WRONG_MS, drawRound, stepDraw,
  type DrawCtx, type DrawInput, type DrawLine, type DrawSaveOp, type DrawState, type DrawStep, type DrawView, type RunPatch, type Wait,
} from './draw'

/** freezes a state deeply: a step that changed it (or its checker) would throw */
function freeze<T>(x: T): T {
  if (x && typeof x === 'object' && !Object.isFrozen(x)) { Object.freeze(x); for (const v of Object.values(x)) freeze(v) }
  return x
}

/** the line as the run plays it (a variation: `<line>-*`) */
const lineId = (l: DrawLine) => ('id' in l ? l.id : l.take ? `${l.line}-${l.take}` : `${l.line}-*`)

/** a round of this word as the run builds it */
function ctxOf(wordId: string, stage: 1 | 2 | 3, script: Script = 'print', o: Partial<DrawCtx> = {}): DrawCtx {
  const word = WORDS.find((w) => w.id === wordId)!
  const split = splitWord(word, script)
  const def = strokesOf(split.letter, script)
  const marks = marksFor(word, stage)
  const layout = drawLayout({
    ...split, script, def,
    marksAbove: marks.some((m) => m.zone === 'above-left' || m.zone === 'above-right' || m.zone === 'vav-above'),
    marksUnder: marks.some((m) => m.zone === 'under'),
  }, () => null)
  const view: DrawView = { screen: 'draw', word, script, letter: split.letter, layout, marks, strokes: [], mode: 'letter' }
  return { view, def, checker: new LetterChecker(def), screen: script === 'print' ? 'draw' : 'draw-hand', demo: null, strokeNo: 0, demoNo: 0, ...o }
}

/**
 * Plays a round as the run does, on a clock of its own: `send` steps the policy once; `settle` ends each wait it asks
 * for (a sleep after its time, lines after `min`) until it waits for his stroke or the round ends.
 */
function round(c: DrawCtx) {
  let st: DrawState = drawRound(c)
  let clock = 0
  let wait: Wait | undefined
  const d = {
    said: [] as string[], asked: [] as string[], sfx: [] as string[], save: [] as DrawSaveOp[], track: [] as { e: string; data: Record<string, unknown> }[],
    run: {} as RunPatch, hushes: 0, drawn: false, end: false, cue: 0, hintFor: undefined as DrawStep['hintFor'],
  }
  const send = (e: DrawInput) => {
    const r = stepDraw(freeze(st), { ...e, at: clock })
    st = r.state
    if (r.hush) d.hushes++
    Object.assign(d.run, r.run)
    if (r.cue) d.cue++
    d.said.push(...r.say.map(lineId))
    if (r.ask) d.asked.push(lineId(r.ask))
    d.sfx.push(...r.sfx)
    d.save.push(...r.save)
    d.track.push(...r.track)
    if (r.hintFor) d.hintFor = r.hintFor
    if (r.drawn) d.drawn = true
    if (r.wait) wait = r.wait
    if (r.end) d.end = true
    return r
  }
  const settle = () => {
    for (let i = 0; i < 200 && wait && wait.for !== 'stroke' && !d.end; i++) {
      const w = wait
      wait = undefined
      clock += w.for === 'sleep' ? w.ms : w.min ?? 0
      send({ type: w.for === 'sleep' ? 'slept' : 'heard' })
    }
  }
  const self = {
    d, send, settle,
    get state() { return st },
    get view() { return st.view },
    get wait() { return wait },
    pass(ms: number) { clock += ms },
    /** starts and plays on until he draws */
    open() { send({ type: 'start' }); settle(); return self },
    /** his stroke (a stroke wait must run), then the waits it asks for */
    stroke(pts: Pt[]) { expect(wait?.for).toBe('stroke'); wait = undefined; const r = send({ type: 'stroke', pts }); settle(); return r },
    /** the letter's strokes, where the data has them */
    strokes(tf = (p: Pt): Pt => p) { return c.def.variants[0].map((s) => resample(s.pts, 30).map(tf)) },
    drawLetter(tf?: (p: Pt) => Pt) { for (const s of self.strokes(tf)) self.stroke(s) },
    tracked(e: string) { return d.track.filter((x) => x.e === e).map((x) => x.data) },
    marks() { return markTargets(st.view.marks, { letter: st.ink!, vav: st.view.layout.vav?.box }) },
  }
  return self
}

describe('the draw policy', () => {
  it('a round: the word, he draws, each right stroke turns gold, the lines are fine, a star, the word again', () => {
    const g = round(ctxOf('camel', 1))
    const r = g.send({ type: 'start' })
    expect(r.run).toEqual({ phase: 'question', overlay: null, hintAvailable: true, needNext: false })
    expect(r.say).toEqual([{ id: 'w-camel' }])
    expect(r.wait).toEqual({ for: 'say' })
    expect(g.tracked('draw-start')).toEqual([{ word: 'camel', letter: 'ג', script: 'print' }])
    const go = g.send({ type: 'heard' })
    expect(go.run).toEqual({ phase: 'answer' })
    expect(go.cue).toBe(true)
    expect(go.wait).toEqual({ for: 'stroke', idle: DRAW_IDLE_MS, hint: DRAW_HINT_MS })
    const n = g.strokes().length
    g.drawLetter()
    expect(g.d.sfx).toEqual([...Array(n).fill('stroke'), 'drawn'])
    expect(g.view.strokes.map((s) => s.state)).toEqual(Array(n).fill('ok'))
    expect(g.view.strokes.map((s) => s.id)).toEqual(Array.from({ length: n }, (_, i) => i + 1))
    expect(g.tracked('draw-lines')).toEqual([])
    expect(g.view.mode).toBe('done')
    expect(g.d.drawn).toBe(true)
    expect(g.d.save).toEqual([{ op: 'recordAnswer', features: ['dr:ג:print', 'sc:draw'], miss: false }, { op: 'noteDrawRound' }])
    expect(g.tracked('draw-done')).toEqual([{ letter: 'ג', script: 'print', word: 'camel', ms: 0, wrongStrokes: 0, helped: false }])
    expect(g.tracked('draw-stroke').map((x) => x.ok)).toEqual(Array(n).fill(true))
    expect(g.d.said).toEqual(['w-camel', 'w-camel'])
    expect(g.d.end).toBe(true)
  })

  it('the first visit of the print screen: the demo with its line (the hand writes the letter), then his turn', () => {
    const g = round(ctxOf('camel', 1, 'print', { demo: 'first', demoNo: 7 }))
    g.send({ type: 'start' })
    const r = g.send({ type: 'heard' })
    expect(r.save).toEqual([{ op: 'markDemo', id: 'demo-draw' }])
    expect(r.track).toEqual([{ e: 'demo', data: { demo: 'demo-draw' } }])
    expect(r.run).toEqual({ phase: 'demo' })
    const strokes = g.state.checker.remaining()
    expect(r.view?.demo).toEqual({ id: 8, strokes })
    expect(r.say).toEqual([{ line: 'demo-draw', take: 1 }])
    expect(r.wait).toEqual({ for: 'say', min: strokeTiming(strokes).total })
    const after = g.send({ type: 'heard' })
    expect(after.view?.demo).toBeUndefined()
    expect(after.run).toEqual({ phase: 'answer' })
    expect(after.wait?.for).toBe('stroke')
  })

  it('a letter not drawn well yet: the hand shows it, with no line', () => {
    const g = round(ctxOf('camel', 1, 'print', { demo: 'letter' }))
    g.send({ type: 'start' })
    const r = g.send({ type: 'heard' })
    expect(r.save).toEqual([])
    expect(r.say).toEqual([])
    expect(r.wait).toEqual({ for: 'sleep', ms: strokeTiming(g.state.checker.remaining()).total })
  })

  it('a tap is not a stroke: nothing is drawn, and the wait starts again', () => {
    const g = round(ctxOf('camel', 1)).open()
    const r = g.stroke([[0.5, 0.5], [0.51, 0.5]])
    expect(r.view).toBeUndefined()
    expect(r.track).toEqual([])
    expect(r.wait).toEqual({ for: 'stroke', idle: DRAW_IDLE_MS, hint: DRAW_HINT_MS })
  })

  it('a wrong stroke fades, the hand shows that stroke (draw-again once), and he draws it again; no star is lost', () => {
    const g = round(ctxOf('camel', 1)).open()
    const [first] = g.strokes()
    const r = g.send({ type: 'stroke', pts: [...first].reverse() })
    expect(r.view?.strokes.map((s) => s.state)).toEqual(['wrong'])
    expect(r.run).toEqual({ phase: 'feedback' })
    expect(r.wait).toEqual({ for: 'sleep', ms: WRONG_MS })
    expect(r.track).toEqual([{ e: 'draw-stroke', data: { letter: 'ג', script: 'print', n: 1, ok: false, why: 'direction' } }])
    const show = g.send({ type: 'slept' })
    expect(show.view?.demo?.strokes).toEqual([g.state.checker.expected()])
    expect(show.say).toEqual([{ line: 'draw-again' }])
    expect(show.wait?.for).toBe('say')
    const back = g.send({ type: 'heard' })
    expect(back.view?.strokes).toEqual([])
    expect(back.view?.demo).toBeUndefined()
    expect(back.run).toEqual({ phase: 'answer' })
    expect(back.wait?.for).toBe('stroke')
    // the second wrong try: the hand again, without the line
    g.stroke([...first].reverse())
    expect(g.d.said.filter((x) => x.startsWith('draw-again'))).toHaveLength(1)
    g.drawLetter()
    expect(g.tracked('draw-done')[0]).toMatchObject({ wrongStrokes: 2, helped: false })
    expect(g.d.save[0]).toMatchObject({ op: 'recordAnswer', miss: true })
  })

  it('the judge: one wrong stroke that he puts right himself is not a miss; two wrong strokes are; the hand\'s help is', () => {
    const one = round(ctxOf('camel', 1)).open()
    one.stroke([...one.strokes()[0]].reverse())
    one.drawLetter()
    expect(one.tracked('draw-done')[0]).toMatchObject({ wrongStrokes: 1, helped: false })
    expect(one.d.save[0]).toMatchObject({ op: 'recordAnswer', miss: false })
    const helped = round(ctxOf('camel', 1)).open()
    for (let i = 0; i < 3; i++) helped.stroke([...helped.strokes()[0]].reverse())
    for (const x of helped.strokes().slice(1)) helped.stroke(x)
    expect(helped.d.save[0]).toMatchObject({ miss: true })
  })

  it('after 3 wrong tries of the same stroke the hand draws it for him and the round goes on', () => {
    const g = round(ctxOf('camel', 1)).open()
    const all = g.strokes()
    for (let i = 0; i < 3; i++) g.stroke([...all[0]].reverse())
    expect(g.view.strokes.map((s) => s.state)).toEqual(['helped'])
    expect(g.d.run.phase).toBe('answer')
    for (const s of all.slice(1)) g.stroke(s)
    expect(g.view.mode).toBe('done')
    expect(g.tracked('draw-done')[0]).toMatchObject({ wrongStrokes: 3, helped: true })
  })

  it('a lift inside a stroke: both pieces turn gold, no try is counted', () => {
    const g = round(ctxOf('camel', 1)).open()
    const all = g.strokes()
    const k = Math.floor(all[0].length / 2)
    g.stroke(all[0].slice(0, k))
    g.stroke(all[0].slice(k))
    expect(g.view.strokes.map((s) => s.state)).toEqual(['ok', 'ok'])
    for (const s of all.slice(1)) g.stroke(s)
    expect(g.d.said.some((x) => x.startsWith('draw-again'))).toBe(false)
    expect(g.tracked('draw-done')[0]).toMatchObject({ wrongStrokes: 0 })
  })

  it('a piece that waits for the rest of its stroke: the wait settles it after a pause', () => {
    const g = round(ctxOf('camel', 1)).open()
    const [first] = g.strokes()
    const cx = first.reduce((a, q) => a + q[0], 0) / first.length
    const cy = first.reduce((a, q) => a + q[1], 0) / first.length
    const r = g.stroke(first.map(([x, y]) => [cx + (x - cx) * 0.45, cy + (y - cy) * 0.45] as Pt))
    expect(r.view?.strokes.map((s) => s.state)).toEqual(['pending'])
    expect(r.wait).toEqual({ for: 'stroke', idle: DRAW_IDLE_MS, hint: DRAW_HINT_MS, settle: SETTLE_MS })
    const s = g.send({ type: 'settle' })
    expect(s.track[0]).toMatchObject({ e: 'draw-stroke', data: { n: 1, settled: true } })
    expect(['ok', 'wrong']).toContain(s.view?.strokes[0].state)
  })

  it('a letter above the lines is told (it glows, the voice says so) and still counts', () => {
    const g = round(ctxOf('camel', 1)).open()
    for (const s of g.strokes(([x, y]) => [x * 1.6, y * 1.6 - 1.1])) {
      if (g.wait?.for !== 'stroke') break
      const r = g.send({ type: 'stroke', pts: s })
      if (r.view?.lineFx) {
        expect(r.view.lineFx.kind).toBe('tall')
        expect(r.run?.phase).toBe('feedback')
        expect(r.wait).toEqual({ for: 'sleep', ms: RING_MS })
      }
      g.settle()
    }
    expect(g.tracked('draw-lines')).toEqual([{ letter: 'ג', kind: 'tall' }])
    expect(g.d.said).toContain('line-tall-1')
    expect(g.view.lineFx).toBeUndefined()
    expect(g.view.mode).toBe('done')
    expect(g.d.save[0]).toMatchObject({ miss: false })
  })

  it('then the marks: the voice asks (the place glows as it starts), a wrong mark fades and the hand shows them', () => {
    const g = round(ctxOf('camel', 2)).open()
    expect(g.view.marks.length).toBeGreaterThan(0)
    g.drawLetter()
    expect(g.view.mode).toBe('mark')
    expect(g.d.run.phase).toBe('answer')
    expect(g.d.asked).toEqual(['draw-mark-1'])
    expect(g.wait).toEqual({ for: 'stroke', idle: DRAW_IDLE_MS, hint: DRAW_HINT_MS })
    expect(g.state.boxes?.letter).toEqual(bbox(g.view.strokes.flatMap((s) => s.pts)))
    expect(g.send({ type: 'ask-start' }).view?.glow).toBe('marks')
    // a dot far above the letter is wrong
    const r = g.send({ type: 'stroke', pts: [[0.5, -0.9], [0.5, -0.9]] })
    expect(r.track).toEqual([{ e: 'draw-mark', data: { mark: 'under:T', ok: false } }])
    expect(r.view?.strokes[r.view.strokes.length - 1].state).toBe('wrong')
    expect(r.wait).toEqual({ for: 'sleep', ms: WRONG_MS })
    expect(g.send({ type: 'slept' }).view?.demo?.strokes).toEqual(g.marks())
    g.settle()
    expect(g.view.strokes.some((s) => s.state === 'wrong')).toBe(false)
    expect(g.wait?.for).toBe('stroke')
    for (const m of g.marks()) if (g.wait?.for === 'stroke') g.stroke(m)
    // right: the round waits for the end of the line that asks for them
    expect(g.view.mode).toBe('mark')
    expect(g.wait).toBeUndefined()
    const end = g.send({ type: 'asked' })
    expect(end.view?.glow).toBeUndefined()
    expect(end.view?.mode).toBe('done')
    g.settle()
    expect(g.d.end).toBe(true)
    // one wrong mark that he put right himself is not a miss (Hebrew drawing judge)
    expect(g.d.save[0]).toMatchObject({ miss: false })
    expect(g.tracked('draw-mark').map((x) => x.ok)).toEqual([false, true])
  })

  it('marks drawn after their line ended finish the round at once; 3 wrong tries and the hand draws them for him', () => {
    const g = round(ctxOf('camel', 2)).open()
    g.drawLetter()
    g.send({ type: 'asked' })
    for (let i = 0; i < 3; i++) g.stroke([[0.5, -0.9], [0.5, -0.9]])
    expect(g.view.strokes.filter((s) => s.state === 'helped')).toHaveLength(g.marks().length)
    expect(g.view.mode).toBe('done')
    expect(g.tracked('draw-done')[0]).toMatchObject({ helped: true })
  })

  it('he waits: the instruction and the word; in the marks, the marks\' line; his next stroke stops the voice', () => {
    const g = round(ctxOf('camel', 2)).open()
    const idle = g.send({ type: 'idle' })
    expect(idle.say).toEqual([{ line: 'q-draw' }, { id: 'w-camel' }])
    expect(idle.wait).toBeUndefined()
    expect(idle.track).toEqual([{ e: 'idle', data: { screen: 'draw', target: 'camel' } }])
    expect(g.stroke(g.strokes()[0]).hush).toBe(true)
    for (const s of g.strokes().slice(1)) expect(g.stroke(s).hush).toBeFalsy()
    expect(g.send({ type: 'idle' }).say).toEqual([{ line: 'draw-mark', take: 1 }])
  })

  it('the hint: the hand shows what is left, by itself or by the ?, until its time or his touch; the marks in the marks', () => {
    const g = round(ctxOf('camel', 2, 'print', { demoNo: 3 })).open()
    const auto = g.send({ type: 'hint', auto: true })
    const left = g.state.checker.remaining()
    expect(auto.view?.demo).toEqual({ id: 4, strokes: left, hint: true })
    expect(auto.hintFor).toEqual({ id: 4, ms: strokeTiming(left).total })
    expect(auto.track).toEqual([{ e: 'hint', data: { screen: 'draw', target: 'camel', auto: true } }])
    expect(g.send({ type: 'hint-over', id: 3 }).view).toBeUndefined()
    expect(g.send({ type: 'hint-over', id: 4 }).view?.demo).toBeUndefined()
    // the ? (the run sends it while he answers); his touch ends it, and his stroke after an auto hint stops the voice
    g.send({ type: 'hint', auto: false })
    expect(g.view.demo?.hint).toBe(true)
    expect(g.send({ type: 'touch' }).view?.demo).toBeUndefined()
    expect(g.stroke(g.strokes()[0]).hush).toBe(true)
    for (const s of g.strokes().slice(1)) g.stroke(s)
    g.send({ type: 'hint', auto: false })
    expect(g.view.demo?.strokes).toEqual(g.marks())
  })

  for (const script of ['print', 'hand'] as const) for (const first of ['the ש dot', 'the shuruk'] as const) {
    it(`שׁוּעָל (${script}): the ש dot and the shuruk in any order, drawn while their line still asks (${first} first)`, () => {
      const g = round(ctxOf('fox', 3, script)).open()
      g.drawLetter()
      // where a child puts them: the ש dot a little off the hand's place, the shuruk close to the vav
      const [shinDot, shuruk] = g.marks().map(([[x, y]]): Pt[] => [[x + 0.04, y - 0.03], [x + 0.06, y]])
      for (const m of first === 'the ש dot' ? [shinDot, shuruk] : [shuruk, shinDot]) g.stroke(m)
      expect(g.view.strokes.filter((x) => x.state === 'wrong')).toHaveLength(0)
      expect(g.tracked('draw-mark').map((x) => x.ok)).toEqual([true])
      g.send({ type: 'asked' })
      expect(g.view.mode).toBe('done')
    })
  }

  it('handwriting counts on its own screen', () => {
    const g = round(ctxOf('camel', 1, 'hand')).open()
    g.drawLetter()
    expect(g.d.save[0]).toEqual({ op: 'recordAnswer', features: ['dr:ג:hand', 'sc:draw-hand'], miss: false })
  })
})
