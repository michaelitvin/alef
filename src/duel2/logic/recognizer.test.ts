import { describe, expect, it } from 'vitest'
import { LETTERS, STROKES, strokesOf, type Pt, type StrokeDef } from '../data/strokes'
import { LetterChecker, judgeMarks, lineFeedback, markTargets, resample, type Box, type MarkSpec } from './recognizer'

function rng(seed: number) {
  let a = seed >>> 0
  return () => { a = (a * 1664525 + 1013904223) >>> 0; return a / 4294967296 }
}
interface Tf { scale?: number; sx?: number; dx?: number; dy?: number; noise?: number; seed?: number }
/** a finger-like stroke along the data: dense points, moved/scaled, with smooth wobble */
function draw(st: StrokeDef | Pt[], tf: Tf = {}): Pt[] {
  const pts = resample(Array.isArray(st) ? st : st.pts, 40)
  const r = rng(tf.seed ?? 1)
  const k = tf.scale ?? 1
  let wx = 0
  let wy = 0
  return pts.map(([x, y]) => {
    wx = 0.7 * wx + 0.3 * (r() - 0.5) * 2 * (tf.noise ?? 0)
    wy = 0.7 * wy + 0.3 * (r() - 0.5) * 2 * (tf.noise ?? 0)
    return [x * k * (tf.sx ?? 1) + (tf.dx ?? 0) + wx * 3, y * k + (tf.dy ?? 0) + wy * 3] as Pt
  })
}
const run = (letter: string, script: 'print' | 'hand', strokes: Pt[][]) => {
  const c = new LetterChecker(strokesOf(letter, script))
  return strokes.map((s) => c.add(s))
}
const allOk = (rs: ReturnType<typeof run>) => rs.every((r) => r.kind === 'ok') && rs[rs.length - 1].done

describe('recognizer: letters', () => {
  it('every letter in both scripts passes its own strokes, in every variant', () => {
    for (const d of STROKES) d.variants.forEach((v, i) => {
      expect(allOk(run(d.letter, d.script, v.map((s) => draw(s)))), `${d.letter} ${d.script} v${i}`).toBe(true)
    })
  })
  it('wobbly strokes pass', () => {
    for (const d of STROKES) for (const seed of [1, 2, 3]) {
      const rs = run(d.letter, d.script, d.variants[0].map((s, i) => draw(s, { noise: 0.03, seed: seed * 10 + i })))
      expect(allOk(rs), `${d.letter} ${d.script} seed ${seed}: ${JSON.stringify(rs)}`).toBe(true)
    }
  })
  it('size, position and a narrower or wider letter do not matter', () => {
    for (const tf of [{ scale: 0.5 }, { scale: 1.8 }, { dx: 0.5, dy: 0.3 }, { scale: 0.7, dx: -0.3, dy: 0.4 }, { sx: 0.75 }, { sx: 1.3 }])
      for (const d of STROKES) {
        const rs = run(d.letter, d.script, d.variants[0].map((s) => draw(s, tf)))
        expect(allOk(rs), `${d.letter} ${d.script} ${JSON.stringify(tf)}`).toBe(true)
      }
  })
  it('a reversed stroke is a wrong direction', () => {
    const b = strokesOf('ב', 'print').variants[0]
    expect(run('ב', 'print', [draw([...b[0].pts].reverse())])[0]).toMatchObject({ kind: 'wrong', why: 'direction', index: 0 })
    const h = strokesOf('ה', 'print').variants[0]
    const r = run('ה', 'print', [draw(h[0]), draw([...h[1].pts].reverse())])
    expect(r[1]).toMatchObject({ kind: 'wrong', why: 'direction', index: 1 })
    // where the sources disagree on the direction, both pass
    const samech = strokesOf('ס', 'hand').variants[0][0]
    expect(run('ס', 'hand', [draw([...samech.pts].reverse())])[0]).toMatchObject({ kind: 'ok', done: true })
  })
  it('a stroke that belongs later is wrong order, and the expected one is the first', () => {
    const h = strokesOf('ה', 'print').variants[0]
    const c = new LetterChecker(strokesOf('ה', 'print'))
    expect(c.add(draw(h[1]))).toMatchObject({ kind: 'wrong', why: 'order', index: 0 })
    expect(c.expected()).toEqual(h[0].pts)
    const a = strokesOf('א', 'print').variants[0]
    expect(run('א', 'print', [draw(a[0]), draw(a[2])])[1]).toMatchObject({ kind: 'wrong', why: 'order', index: 1 })
  })
  it('a part in the wrong place is a wrong start (ה with its leg on the roof is not ה)', () => {
    const h = strokesOf('ה', 'print').variants[0]
    const r = run('ה', 'print', [draw(h[0]), draw([[0.28, 0.1], [0.28, 1]])])
    expect(r[1]).toMatchObject({ kind: 'wrong', why: 'start' })
  })
  it('ד drawn as ר and ר drawn as ד are wrong (the parent: they differ by stroke count and the corner)', () => {
    const resh = strokesOf('ר', 'print').variants[0]
    const dalet = strokesOf('ד', 'print').variants[0]
    expect(run('ד', 'print', [draw(resh[0])])[0].kind).toBe('wrong')
    const r = run('ר', 'print', [draw(dalet[0]), draw(dalet[1])])
    expect(r[0].kind).toBe('wrong')
    // and the right ones pass
    expect(allOk(run('ד', 'print', dalet.map((s) => draw(s))))).toBe(true)
    expect(allOk(run('ר', 'print', [draw(resh[0])]))).toBe(true)
  })
  it('a pen lift that splits one stroke into two is accepted (but not for ר)', () => {
    const b = strokesOf('ב', 'print').variants[0]
    const [p1, p2] = [b[0].pts.slice(0, 2), b[0].pts.slice(1)]
    const c = new LetterChecker(strokesOf('ב', 'print'))
    expect(c.add(draw(p1)).kind).toBe('partial')
    expect(c.add(draw(p2))).toMatchObject({ kind: 'ok', index: 0, done: false })
    expect(c.add(draw(b[1]))).toMatchObject({ kind: 'ok', done: true })
    const resh = strokesOf('ר', 'print').variants[0][0].pts
    expect(run('ר', 'print', [draw(resh.slice(0, 2))])[0].kind).toBe('wrong')
    // print ל in one stroke or in two (the stem, then the rest)
    const lamed = strokesOf('ל', 'print').variants[0][0].pts
    expect(allOk(run('ל', 'print', [draw(lamed)]))).toBe(true)
    const r = run('ל', 'print', [draw(lamed.slice(0, 2)), draw(lamed.slice(1))])
    expect(r.map((x) => x.kind)).toEqual(['partial', 'ok'])
    expect(r[1].done).toBe(true)
  })
  it('another letter does not pass', () => {
    const pairs: [string, string][] = [['ב', 'כ'], ['ו', 'ז'], ['ג', 'נ'], ['ט', 'ס'], ['ח', 'ה'], ['ת', 'ח'], ['ע', 'צ']]
    for (const [asked, drawn] of pairs) {
      const rs = run(asked, 'print', strokesOf(drawn, 'print').variants[0].map((s) => draw(s)))
      expect(allOk(rs), `${asked} drawn as ${drawn}`).toBe(false)
    }
  })
  it('a tiny scribble is not a stroke', () => {
    expect(run('ו', 'print', [[[0.1, 0.5], [0.11, 0.51], [0.12, 0.5]]])[0].kind).toBe('wrong')
  })
  it('after the hand draws a stroke for him the letter goes on', () => {
    const h = strokesOf('ה', 'print').variants[0]
    const c = new LetterChecker(strokesOf('ה', 'print'))
    expect(c.add(draw(h[1])).kind).toBe('wrong')
    const forced = c.force()
    expect(forced.length).toBeGreaterThan(1)
    expect(c.add(draw(h[1]))).toMatchObject({ kind: 'ok', done: true })
  })
  it('the expected stroke follows his letter (scaled and moved with it)', () => {
    const h = strokesOf('ה', 'print').variants[0]
    const c = new LetterChecker(strokesOf('ה', 'print'))
    c.add(draw(h[0], { scale: 0.5, dx: 0.3 }))
    const [x, y] = c.expected()[0]
    expect(x).toBeCloseTo(0.28 * 0.5 + 0.3, 1)
    expect(y).toBeCloseTo(0.45 * 0.5, 1)
  })
  it('all letters are checked (data and recognizer agree on the 27 letters)', () => {
    for (const l of LETTERS) expect(() => new LetterChecker(strokesOf(l, 'print'))).not.toThrow()
  })
})

describe('recognizer: marks', () => {
  const letter: Box = { left: 0, right: 1, top: 0, bottom: 1 }
  const vav: Box = { left: -0.6, right: -0.35, top: 0, bottom: 1 }
  const dot = (x: number, y: number): Pt[] => [[x, y], [x + 0.01, y + 0.01]]
  const bar = (x: number, y: number, w = 0.4): Pt[] => [[x - w / 2, y], [x + w / 2, y]]
  const j = (specs: MarkSpec[], strokes: Pt[][]) => judgeMarks(strokes, specs, { letter, vav }).state
  it('one dot under the letter is chirik; above it is wrong', () => {
    const ch: MarkSpec[] = [{ zone: 'under', shape: 'dot' }]
    expect(j(ch, [dot(0.5, 1.3)])).toBe('ok')
    expect(j(ch, [dot(0.5, -0.3)])).toBe('wrong')
  })
  it('tsere, segol and kubutz differ by count and arrangement', () => {
    const ts: MarkSpec[] = [{ zone: 'under', shape: 'dots2' }]
    const sg: MarkSpec[] = [{ zone: 'under', shape: 'dots3-tri' }]
    const kb: MarkSpec[] = [{ zone: 'under', shape: 'dots3-diag' }]
    expect(j(ts, [dot(0.35, 1.3)])).toBe('more')
    expect(j(ts, [dot(0.35, 1.3), dot(0.65, 1.3)])).toBe('ok')
    expect(j(ts, [dot(0.35, 1.3), dot(0.65, 1.3), dot(0.5, 1.5)])).toBe('wrong')
    expect(j(sg, [dot(0.35, 1.3), dot(0.65, 1.3), dot(0.5, 1.5)])).toBe('ok')
    expect(j(sg, [dot(0.3, 1.2), dot(0.5, 1.35), dot(0.7, 1.5)])).toBe('wrong')
    expect(j(kb, [dot(0.3, 1.2), dot(0.5, 1.35), dot(0.7, 1.5)])).toBe('ok')
    // the order inside a mark is not checked
    expect(j(kb, [dot(0.7, 1.5), dot(0.3, 1.2), dot(0.5, 1.35)])).toBe('ok')
    expect(j(kb, [dot(0.35, 1.3), dot(0.65, 1.3), dot(0.5, 1.5)])).toBe('wrong')
  })
  it('patach is a bar; kamatz a bar with a tick (or one T stroke)', () => {
    expect(j([{ zone: 'under', shape: 'bar' }], [bar(0.5, 1.3)])).toBe('ok')
    expect(j([{ zone: 'under', shape: 'bar' }], [dot(0.5, 1.3)])).toBe('wrong')
    const km: MarkSpec[] = [{ zone: 'under', shape: 'T' }]
    expect(j(km, [bar(0.5, 1.25)])).toBe('more')
    expect(j(km, [bar(0.5, 1.25), [[0.5, 1.27], [0.5, 1.45]]])).toBe('ok')
    expect(j(km, [[[0.3, 1.25], [0.5, 1.25], [0.5, 1.45]]])).toBe('ok')
  })
  it('the dagesh goes inside; the ש dot on its side; shuruk left of the vav; cholam male above it', () => {
    expect(j([{ zone: 'inside', shape: 'dot' }], [dot(0.5, 0.5)])).toBe('ok')
    expect(j([{ zone: 'inside', shape: 'dot' }], [dot(0.5, 1.3)])).toBe('wrong')
    expect(j([{ zone: 'above-right', shape: 'dot' }], [dot(0.9, -0.2)])).toBe('ok')
    expect(j([{ zone: 'above-right', shape: 'dot' }], [dot(0.1, -0.2)])).toBe('wrong')
    expect(j([{ zone: 'above-left', shape: 'dot' }], [dot(0.1, -0.2)])).toBe('ok')
    expect(j([{ zone: 'vav-left', shape: 'dot' }], [dot(-0.75, 0.5)])).toBe('ok')
    expect(j([{ zone: 'vav-left', shape: 'dot' }], [dot(0.5, 0.5)])).toBe('wrong')
    expect(j([{ zone: 'vav-above', shape: 'dot' }], [dot(-0.48, -0.2)])).toBe('ok')
  })
  it('several marks together: a dagesh and a vowel, in any order', () => {
    const specs: MarkSpec[] = [{ zone: 'inside', shape: 'dot' }, { zone: 'under', shape: 'bar' }]
    expect(j(specs, [dot(0.5, 0.5)])).toBe('more')
    expect(j(specs, [bar(0.5, 1.3), dot(0.5, 0.5)])).toBe('ok')
  })
  it('the hand knows where each mark goes', () => {
    const t = markTargets([{ zone: 'under', shape: 'dots2' }, { zone: 'inside', shape: 'dot' }], { letter, vav })
    expect(t.length).toBe(3)
    expect(judgeMarks(t, [{ zone: 'under', shape: 'dots2' }, { zone: 'inside', shape: 'dot' }], { letter, vav }).state).toBe('ok')
    for (const sh of ['dot', 'dots2', 'dots3-tri', 'dots3-diag', 'bar', 'T'] as const)
      for (const z of ['under', 'inside', 'above-right', 'above-left', 'vav-left', 'vav-above'] as const) {
        const sp: MarkSpec[] = [{ zone: z, shape: sh }]
        expect(judgeMarks(markTargets(sp, { letter, vav }), sp, { letter, vav }).state, `${z} ${sh}`).toBe('ok')
      }
  })
})

describe('recognizer: lines (told, never failed)', () => {
  const d = strokesOf('ב', 'print')
  it('a letter in the lines has no feedback', () => {
    expect(lineFeedback({ left: 0, right: 1, top: 0.05, bottom: 0.97 }, d)).toBeNull()
  })
  it('too tall, too low, too small', () => {
    expect(lineFeedback({ left: 0, right: 1, top: -0.5, bottom: 0.97 }, d)?.kind).toBe('tall')
    expect(lineFeedback({ left: 0, right: 1, top: 0.1, bottom: 1.5 }, d)?.kind).toBe('low')
    expect(lineFeedback({ left: 0.3, right: 0.6, top: 0.5, bottom: 0.85 }, d)?.kind).toBe('small')
  })
  it('a letter that goes below the line by design is not low (ק), nor ל tall', () => {
    expect(lineFeedback({ left: 0, right: 1, top: 0.05, bottom: 1.45 }, strokesOf('ק', 'print'))).toBeNull()
    expect(lineFeedback({ left: 0, right: 1, top: -0.35, bottom: 1 }, strokesOf('ל', 'print'))).toBeNull()
  })
  it('the part outside the lines is named for the glow', () => {
    expect(lineFeedback({ left: 0, right: 1, top: -0.5, bottom: 0.97 }, d)).toMatchObject({ kind: 'tall', outside: { from: -Infinity, to: 0 } })
    expect(lineFeedback({ left: 0, right: 1, top: 0.1, bottom: 1.5 }, d)).toMatchObject({ kind: 'low', outside: { from: 1, to: Infinity } })
  })
})
