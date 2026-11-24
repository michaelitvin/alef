// The English drawing (design Part 6): its rounds (the hand order, whole words only with letters written alone, capitals
// after stage 3), the Latin board's four lines, the Latin letters through the drawing's checker (strokes that go back up
// their stem, no small zigzags at the joins), and the marks rule (a dot or a bar of a letter, also after the next letter).
import { describe, expect, it } from 'vitest'
import type { DrawCtx, DrawItem } from '../../course/types'
import type { Pt, StrokeDef } from '../../data/strokes'
import { drawLayout, latinLayout } from '../../logic/drawLayout'
import { LetterChecker, lineFeedback, matchMark, resample, splitMarks, type Verdict } from '../../logic/recognizer'
import { drawRound, stepDraw, type DrawInput, type DrawStep, type DrawView } from '../../policies/draw'
import { seeded } from '../../testing/runHarness'
import { strokesOf } from '../../data/strokes'
import { ENGLISH } from '../course'
import { BASE, DESC, LATIN_STROKES, MID, TOP, isMark, latinStrokesOf } from '../data/strokes'
import { HAND_ORDER, enDrawWords, openLetters, writtenAlone } from './draw'

const W = ENGLISH.writing!
const ctxAt = (stage: number, seed: number, tallies: DrawCtx['tallies'] = {}): DrawCtx => ({ rng: seeded(seed), stage, tallies, recent: {}, confusions: {} })
const deps = { picture: (key: string) => `file:${key}` }
/** the letters written alone, as the drawing's tallies keep them (a right drawing with no help) */
const alone = (letters: string) => Object.fromEntries([...letters].map((l) => [`dr:${l}:print`, { seen: 1, wrong: 0 }]))
const items = (stage: number, tallies: DrawCtx['tallies'], seeds = 60): DrawItem[] => {
  const out: DrawItem[] = []
  for (let seed = 1; seed <= seeds; seed++) out.push(...enDrawWords(ctxAt(stage, seed, tallies), undefined, deps))
  return out
}

describe('the English visit plan ignores the visit length (as before the Hebrew rehearse change)', () => {
  it('a visit of 6 or a halved visit plans the same default rounds, with the same rng stream', () => {
    for (const stage of [1, 2, 4]) {
      for (let seed = 1; seed <= 10; seed++) {
        const base = ENGLISH.rounds.drawWords(ctxAt(stage, seed))
        expect(base).toHaveLength(5)
        for (const n of [6, 2, undefined]) expect(ENGLISH.rounds.drawWords(ctxAt(stage, seed), n)).toEqual(base)
      }
    }
  })
})

describe('the English drawing rounds', () => {
  it('stage 1 opens the stage-1 letters in hand order: a first, then t, f, i, m, n, p, s', () => {
    const opened: string[] = []
    let known = ''
    for (let k = 0; k < 9; k++) {
      const { next } = openLetters(1, alone(known))
      const all = items(1, alone(known), 20)
      if (next) {
        // the new letter comes first in every visit; the others are letters he has written alone
        expect(all.filter((_, i) => i % 5 === 0).every((x) => x.letters[0] === next)).toBe(true)
        expect(all.every((x) => x.letters.every((l) => l === next || known.includes(l)))).toBe(true)
        opened.push(next)
        known += next
      } else expect(all.every((x) => x.letters.every((l) => known.includes(l)))).toBe(true)
    }
    expect(opened).toEqual(['a', 't', 'f', 'i', 'm', 'n', 'p', 's'])
    expect(HAND_ORDER).toHaveLength(26)
  })

  it('he hears a word that starts with the letter, then its first sound (the unit\'s own take, never the letter\'s name)', () => {
    for (const x of items(1, alone('atf'))) {
      expect(x.text![0]).toBe(x.letters[0])
      expect(x.voice).toBe(`w-${x.id}`)
      expect(x.firstSound).toMatch(/^snd-/)
      expect(x.firstSound).not.toMatch(/^ln-/)
      expect(x.asked).toMatchObject({ kind: 'unit', id: x.letters[0] })
      expect(x.alphabet).toBe('latin')
    }
    expect(items(1, {}).find((x) => x.letters[0] === 'a')!.firstSound).toBe('snd-ae')
  })

  it('a whole word only with letters written alone', () => {
    // stage 1: never a whole word
    expect(items(1, alone('atfimnps')).every((x) => x.letters.length === 1)).toBe(true)
    // stage 2 with a t s m written alone: words of those letters only (sat, mat), in three boxes, counted as the word
    const words = items(2, alone('atsm')).filter((x) => x.letters.length > 1)
    expect(words.length).toBeGreaterThan(0)
    for (const w of words) {
      expect(w.letters).toHaveLength(3)
      expect(w.letters.every((l) => 'atsm'.includes(l))).toBe(true)
      expect(w.asked).toMatchObject({ kind: 'word', id: w.id })
      expect(w.firstSound).toBeUndefined()
    }
    // a helped or wrong drawing is not written alone
    expect([...writtenAlone({ 'dr:a:print': { seen: 2, wrong: 1, helped: 1 }, 'dr:t:print': { seen: 1, wrong: 1 }, 'dr:s:print': { seen: 1 } })]).toEqual(['s'])
    expect(items(2, { 'dr:a:print': { seen: 1, wrong: 1 }, ...alone('tsm') }).every((x) => x.letters.length === 1)).toBe(true)
  })

  it('qu is one round in two boxes: he hears /kw/ and writes q and u; it counts on the unit qu', () => {
    // stage 3, every letter before q in hand order written alone (not u): q is the new letter
    const known = alone('cadgo')
    expect(openLetters(3, known).next).toBe('q')
    const qs = items(3, known).filter((x) => x.letters[0] === 'q')
    expect(qs.length).toBeGreaterThan(0)
    for (const x of qs) {
      expect(x.letters).toEqual(['q', 'u'])
      expect(x.firstSound).toBe('snd-kw')
      expect(x.asked).toMatchObject({ kind: 'unit', id: 'qu' })
      expect(x.text!.startsWith('qu')).toBe(true)
      expect(x.at ?? 0).toBe(0)
    }
    // a capital Q has its small u
    const caps = items(4, alone('cadgobhkltfijmnrpuesvwxyzq'), 150).filter((x) => x.letters[0] === 'Q')
    expect(caps.length).toBeGreaterThan(0)
    expect(caps.every((x) => x.letters.join('') === 'Qu' && x.text!.startsWith('Qu'))).toBe(true)
  })

  it('x, which starts no word, is the last letter of a word that ends in it, the rest of the word before its box', () => {
    const known = alone(HAND_ORDER.slice(0, HAND_ORDER.indexOf('x')).join(''))
    expect(openLetters(3, known).next).toBe('x')
    const xs = items(3, known).filter((x) => x.letters.includes('x'))
    expect(xs.length).toBeGreaterThan(0)
    for (const x of xs.filter((i) => i.firstSound)) {
      expect(x.letters).toEqual(['x'])
      expect(x.text!.endsWith('x')).toBe(true)
      expect(x.at).toBe(x.text!.length - 1)
      expect(x.firstSound).toBe('snd-ks')
      expect(x.asked).toMatchObject({ kind: 'unit', id: 'x' })
    }
    // never a capital X (a word's last letter)
    expect(items(4, alone('cadgobhkltfijmnrpuesvwxyzq'), 150).some((x) => x.letters.includes('X'))).toBe(false)
    // y and z come after it
    expect(openLetters(3, alone(HAND_ORDER.slice(0, HAND_ORDER.indexOf('x') + 1).join(''))).next).toBe('y')
  })

  it('capitals only after stage 3', () => {
    const known = alone('cadgobhkltfijmnrpuesvwyz')
    for (const stage of [1, 2, 3]) expect(items(stage, known).some((x) => x.letters.some((l) => /[A-Z]/.test(l)))).toBe(false)
    const caps = items(4, known).filter((x) => x.letters.some((l) => /[A-Z]/.test(l)))
    expect(caps.length).toBeGreaterThan(0)
    // a capital is the big letter of a word's first letter, and counts on the letter's unit
    for (const x of caps) {
      expect(x.text![0]).toBe(x.letters[0])
      expect(x.asked).toMatchObject({ kind: 'unit', id: x.letters[0] === 'Q' ? 'qu' : x.letters[0].toLowerCase() })
      expect(x.letters).toHaveLength(x.letters[0] === 'Q' ? 2 : 1)
    }
  })
})

describe('the Latin board', () => {
  const lines = W.lines
  const layoutOf = (letters: string[], rest = '') => latinLayout({ defs: letters.map(latinStrokesOf), rest, capital: /[A-Z]/.test(letters[0]) && letters.length === 1, lines, font: W.font, unitEm: W.unitEm, em: W.em })
  const y = (L: ReturnType<typeof layoutOf>, v: number) => L.top + v * L.u

  it('four lines on the Latin board only', () => {
    const L = layoutOf(['d'], 'og')
    expect(L.alphabet).toBe('latin')
    expect(L.lines.top).toBeCloseTo(y(L, TOP))
    expect(L.lines.mid).toBeCloseTo(y(L, MID))
    expect(L.lines.base).toBeCloseTo(y(L, BASE))
    expect(L.lines.below).toBeCloseTo(y(L, DESC))
    // a capital touches the top line: it is drawn at the capitals' top, as on school paper
    const C = layoutOf(['D'], 'og')
    expect(C.lines.top).toBeCloseTo(y(C, lines.cap))
    expect(lines.cap).toBeGreaterThan(0.05)
    expect(lines.cap).toBeLessThan(0.15)
    // the Hebrew board keeps its own lines (no Latin board, its middle line halfway)
    const def = strokesOf('ב', 'print')
    const H = drawLayout({ letter: 'ב', vav: false, rest: 'ית', script: 'print', def, marksAbove: false, marksUnder: false }, () => null)
    expect(H.alphabet).toBeUndefined()
    expect(H.boxes).toBeUndefined()
    expect(H.lines.mid).toBeCloseTo(H.top + 0.5 * H.u)
  })

  it('a whole word has a box for each letter, left to right, on the board; one letter has the rest of its word after it', () => {
    const L = layoutOf(['p', 'i', 'n'])
    expect(L.boxes).toHaveLength(3)
    for (let i = 1; i < 3; i++) expect(L.boxes![i].left).toBeGreaterThan(L.boxes![i - 1].right)
    expect(L.boxes![0].dx).toBe(0)
    expect(L.boxes![2].right).toBeLessThan(1250)
    expect(L.rest.text).toBe('')
    const D = layoutOf(['d'], 'og')
    expect(D.rest.cx).toBeGreaterThan(D.slot.right)
    // the rest is written so its letters reach the lines (one letter unit is Andika's ascender)
    expect(D.rest.px * W.unitEm).toBeCloseTo(D.u)
    // x: the word before its box
    const X = latinLayout({ defs: [latinStrokesOf('x')], rest: '', before: 'fo', capital: false, lines, font: W.font, unitEm: W.unitEm, em: W.em })
    expect(X.before!.text).toBe('fo')
    expect(X.before!.cx).toBeLessThan(X.slot.left)
    expect(D.before).toBeUndefined()
  })

  it('a letter is told about the lines against its own lines: an x-height letter against the middle line, a descender against the descender line', () => {
    const ink = (top: number, bottom: number, left = 0.1, right = 0.6) => ({ left, right, top, bottom })
    const a = latinStrokesOf('a')
    // a written from the middle line, or a little above it: no feedback; up to the top line: too tall
    expect(lineFeedback(ink(0.37, 0.98), a, lines)).toBeNull()
    expect(lineFeedback(ink(0.25, 0.98), a, lines)).toBeNull()
    expect(lineFeedback(ink(0.02, 0.98), a, lines)).toMatchObject({ kind: 'tall', outside: { to: MID } })
    // the Hebrew rule (no lines) would not tell it
    expect(lineFeedback(ink(0.02, 0.98), a)).toBeNull()
    // b and t reach the top line: no feedback
    expect(lineFeedback(ink(0.0, 0.98), latinStrokesOf('b'), lines)).toBeNull()
    expect(lineFeedback(ink(0.15, 0.98), latinStrokesOf('t'), lines)).toBeNull()
    // g goes down to the descender line: fine; well below it: low; a, below the baseline: low
    const g = latinStrokesOf('g')
    expect(lineFeedback(ink(0.38, DESC), g, lines)).toBeNull()
    expect(lineFeedback(ink(0.38, DESC + 0.35), g, lines)).toMatchObject({ kind: 'low', outside: { from: DESC } })
    expect(lineFeedback(ink(0.38, 1.3), a, lines)).toMatchObject({ kind: 'low', outside: { from: BASE } })
  })
})

// ---- the Latin letters through the drawing's checker

function rng(seed: number) {
  let a = seed >>> 0
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 }
}
/** a finger-like stroke along the data: `smooth` rounds off its small zigzags; `back` moves the way back up a stem aside */
function draw(st: StrokeDef, o: { noise?: number; seed?: number; scale?: number; smooth?: number; back?: number } = {}): Pt[] {
  let pts = resample(st.pts, 60)
  if (o.smooth) pts = pts.map((_, i) => {
    const w = pts.slice(Math.max(0, i - o.smooth!), i + o.smooth! + 1)
    return [w.reduce((a, q) => a + q[0], 0) / w.length, w.reduce((a, q) => a + q[1], 0) / w.length] as Pt
  })
  if (o.back) {
    const turn = turnOf(pts)
    let arc = 0
    if (turn > 0) pts = pts.map((q, i) => {
      if (i <= turn) return q
      arc += Math.hypot(q[0] - pts[i - 1][0], q[1] - pts[i - 1][1])
      return [q[0] + o.back! * Math.min(1, arc / 0.08) * Math.exp(-arc / 0.6), q[1]] as Pt
    })
  }
  const r = rng(o.seed ?? 1)
  let wx = 0
  let wy = 0
  const k = o.scale ?? 1
  return pts.map(([x, y]) => {
    wx = 0.7 * wx + 0.3 * (r() - 0.5) * 2 * (o.noise ?? 0)
    wy = 0.7 * wy + 0.3 * (r() - 0.5) * 2 * (o.noise ?? 0)
    return [x * k + wx * 3, y * k + wy * 3] as Pt
  })
}
/** where a stroke turns back on itself (the bottom of a stem it goes back up), or -1 */
function turnOf(p: Pt[]): number {
  for (let i = 1; i < p.length - 1; i++) {
    const a = [p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]]
    const b = [p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]]
    if ((a[0] * b[0] + a[1] * b[1]) / (Math.hypot(a[0], a[1]) * Math.hypot(b[0], b[1]) || 1) < -0.7) return i
  }
  return -1
}
const body = (l: string) => splitMarks(latinStrokesOf(l), isMark).body
function check(l: string, strokes: Pt[][]): { ok: boolean; rs: Verdict[] } {
  const c = new LetterChecker(body(l))
  const rs = strokes.map((s) => c.add(s))
  const sv = c.settle()
  if (sv) rs.push(sv)
  return { ok: c.done && !rs.some((r) => r.kind === 'wrong'), rs }
}
const variantsOf = (l: string) => body(l).variants

describe('the Latin letters through the checker', () => {
  it('every letter passes its own strokes, in every variant, also wobbly and at another size', () => {
    for (const d of LATIN_STROKES) variantsOf(d.letter).forEach((v, vi) => {
      for (const o of [{}, { noise: 0.03, seed: 3 }, { scale: 0.65 }, { scale: 1.3 }]) {
        expect(check(d.letter, v.map((s, i) => draw(s, { ...o, seed: (o.seed ?? 1) + i }))).ok, `${d.letter} v${vi + 1} ${JSON.stringify(o)}`).toBe(true)
      }
    })
  })

  it('a stroke that goes back up its own stem passes, also when the way up is beside the way down, or after a lift at the bottom', () => {
    const back = ['b', 'h', 'm', 'n', 'p', 'r', 'u', 'B', 'R']
    // the one-stroke a d g q (their second variant) go on from the bowl up the stem and back down
    const oneStroke = ['a', 'd', 'g', 'q']
    for (const l of [...back, ...oneStroke]) {
      const v = oneStroke.includes(l) ? variantsOf(l)[1] : variantsOf(l)[0]
      expect(v.some((s) => turnOf(resample(s.pts, 60)) > 0), `${l} goes back up`).toBe(true)
      for (const gap of [0.06, 0.12]) expect(check(l, v.map((s) => draw(s, { back: gap }))).ok, `${l} back ${gap}`).toBe(true)
      // a lift where it turns: the way back up starts a new piece, and it joins the stroke
      const lifted = v.flatMap((s) => { const p = draw(s); const t = turnOf(p); return t > 0 ? [p.slice(0, t + 1), p.slice(t)] : [p] })
      expect(check(l, lifted).ok, `${l} lifted`).toBe(true)
    }
  })

  it('the small zigzags of the data where strokes join need not be drawn (the start of d, the bump of the bowl in g and q)', () => {
    for (const l of ['d', 'g', 'q', 'a', 'b', 'h', 'm', 'n', 'p', 'r'])
      variantsOf(l).forEach((v, vi) => {
        for (const smooth of [3, 5]) expect(check(l, v.map((s) => draw(s, { smooth }))).ok, `${l} v${vi + 1} smooth ${smooth}`).toBe(true)
      })
  })

  it('the marks are the dots of i and j and the bars of t and f; the rest is the letter', () => {
    for (const l of ['i', 'j']) expect(splitMarks(latinStrokesOf(l), isMark).marks.map((m) => m.shape)).toEqual(['dot'])
    for (const l of ['t', 'f']) expect(splitMarks(latinStrokesOf(l), isMark).marks.map((m) => m.shape)).toEqual(['bar'])
    expect(splitMarks(latinStrokesOf('l'), isMark).marks).toEqual([])
    expect(body('i').variants[0]).toHaveLength(1)
  })
})

// ---- the marks rule in a round (policies/draw.ts on the Latin board)

/** a Latin round of `letters` (the run's own facts, as the controller builds them) */
function latinRun(letters: string[]) {
  const parts = letters.map((l) => splitMarks(latinStrokesOf(l), isMark))
  const layout = latinLayout({ defs: letters.map(latinStrokesOf), rest: '', capital: false, lines: W.lines, font: W.font, unitEm: W.unitEm, em: W.em })
  const view: DrawView = { screen: 'draw', word: { id: letters.join('') }, script: 'print', letter: letters[0], layout, marks: [], strokes: [], mode: 'letter', alphabet: 'latin', letters, box: 0 }
  let st = drawRound({
    view, def: parts[0].body, checker: new LetterChecker(parts[0].body), screen: 'draw', demo: null, strokeNo: 0, demoNo: 0,
    latin: { defs: parts.map((p) => p.body), marks: parts.map((p) => p.marks), lines: W.lines, cue: { start: [{ id: 'w-x' }], idle: [{ line: 'q-draw-word' }, { id: 'w-x' }], end: [{ id: 'w-x' }] } },
  })
  const steps: DrawStep[] = []
  let at = 0
  const step = (e: DrawInput) => { const r = stepDraw(st, { ...e, at: (at += 100) } as never); st = r.state; steps.push(r); return r }
  /** the waits run out (the lines, the rings) until he can draw again */
  const settle = () => { for (let k = 0; k < 10 && st.flow.k !== 'letter' && st.flow.k !== 'marks' && st.flow.k !== 'over'; k++) step({ type: steps[steps.length - 1]?.wait?.for === 'sleep' ? 'slept' : 'heard' }) }
  step({ type: 'start' })
  settle()
  const dx = (box: number) => layout.boxes![box].dx
  const at0 = (box: number, p: Pt[]): Pt[] => p.map(([x, y]) => [x + dx(box), y])
  return {
    get state() { return st },
    steps,
    step,
    /** a stroke of his, as it is */
    stroke(pts: Pt[]) { step({ type: 'stroke', pts }); settle() },
    /** he writes the letter of `box` (without its marks), stroke by stroke, as the data has it */
    letter(box: number) { for (const s of parts[box].body.variants[0]) { step({ type: 'stroke', pts: at0(box, resample(s.pts, 30)) }); settle() } },
    /** he draws the mark of the letter of `box` where the data has it (moved by `off`) */
    mark(box: number, off: Pt = [0, 0]) { const m = parts[box].marks[0]; step({ type: 'stroke', pts: at0(box, m.pts.map(([x, y]) => [x + off[0], y + off[1]])) }); settle() },
    tracks: (e: string) => steps.flatMap((r) => r.track).filter((t) => t.e === e),
    said: () => steps.flatMap((r) => [...r.say, ...(r.ask ? [r.ask] : [])]),
  }
}

describe('dots and crosses (the Hebrew marks rule)', () => {
  it('the dot of i is accepted after the next letter', () => {
    // tip: the stem of t, the stem of i, then the bar of t (after the next letter), the dot of i, then p
    const r = latinRun(['t', 'i', 'p'])
    r.letter(0)
    r.letter(1)
    expect(r.state.view.box).toBe(2)
    r.mark(0)
    r.mark(1)
    r.letter(2)
    expect(r.state.view.mode).toBe('done')
    expect(r.state.view.strokes.every((s) => s.state === 'ok')).toBe(true)
    expect(r.tracks('draw-mark')).toEqual([
      { e: 'draw-mark', data: { mark: 't:bar', ok: true } }, { e: 'draw-mark', data: { mark: 'i:dot', ok: true } },
    ])
    // no line asked for the marks: they were all there
    expect(r.said()).not.toContainEqual(expect.objectContaining({ line: 'draw-dot' }))
    expect(r.tracks('draw-done')[0].data).toMatchObject({ letter: 'tip', wrongStrokes: 0, helped: false })
    expect(r.steps.flatMap((s) => s.save)).toContainEqual({ op: 'recordAnswer', features: ['dr:t:print', 'dr:i:print', 'dr:p:print', 'sc:draw'], miss: false })

    // pin: the dot of i after the n (the line asks for the dot, and it is the one missing)
    const p = latinRun(['p', 'i', 'n'])
    p.letter(0)
    p.letter(1)
    p.letter(2)
    expect(p.state.view.mode).toBe('mark')
    expect(p.said()).toContainEqual({ line: 'draw-dot', take: 1 })
    // the view gives the missing dot's place (the verify build's hook draws it)
    expect(p.state.view.owed).toEqual([p.state.latin!.due[0].pts])
    p.mark(1, [0.04, -0.05])
    p.step({ type: 'asked' })
    expect(p.state.view.mode).toBe('done')
    expect(p.tracks('draw-mark')).toEqual([{ e: 'draw-mark', data: { mark: 'i:dot', ok: true } }])
  })

  it('each mark goes to the nearest one missing, judged against his own letter; one in no mark\'s place is wrong', () => {
    const t = latinRun(['t'])
    t.letter(0)
    expect(t.state.view.mode).toBe('mark')
    expect(t.said()).toContainEqual({ line: 'draw-cross', take: 1 })
    // a dot where the bar goes is not the bar of t: a wrong mark (the hand shows the bar)
    t.stroke([[0.27, 0.42], [0.27, 0.43]])
    expect(t.tracks('draw-mark')).toEqual([{ e: 'draw-mark', data: { mark: 't:bar', ok: false } }])
    expect(t.state.markTries).toBe(1)
    expect(t.steps.some((x) => x.view?.demo?.strokes[0] === t.state.latin!.due[0].pts)).toBe(true)
    // the hand showed it: he draws the bar, and the round is drawn (not clean)
    t.mark(0)
    t.step({ type: 'asked' })
    expect(t.state.view.mode).toBe('done')
    expect(t.tracks('draw-done')[0].data).toMatchObject({ letter: 't' })
    expect(t.steps.flatMap((x) => x.save)).toContainEqual(expect.objectContaining({ op: 'recordAnswer', miss: true }))
    const fi = latinRun(['f', 'i', 't'])
    fi.letter(0)
    fi.letter(1)
    fi.letter(2)
    // a dot far above the letters: no mark's place
    const dotFar: Pt[] = [[0.3, -0.6], [0.3, -0.58]]
    const missing = fi.state.latin!.due.filter((m) => !m.got)
    expect(missing.map((m) => `${m.box}:${m.shape}`)).toEqual(['0:bar', '1:dot', '2:bar'])
    expect(matchMark(dotFar, missing)).toBe(-1)
    // the bar of t (box 2) and of f (box 0) are told apart by place: each goes to its own letter
    expect(matchMark(missing[2].pts, missing)).toBe(2)
    expect(matchMark(missing[0].pts, missing)).toBe(0)
    expect(matchMark(missing[1].pts, missing)).toBe(1)
  })
})
