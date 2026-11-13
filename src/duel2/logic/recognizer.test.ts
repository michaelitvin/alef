import { describe, expect, it } from 'vitest'
import { LETTERS, STROKES, strokesOf, type Pt, type StrokeDef } from '../data/strokes'
import { LetterChecker, judgeMarks, judgeStroke, lineFeedback, markTargets, resample, type Box, type MarkSpec, type Verdict } from './recognizer'

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
/** his strokes one after another; a piece still waiting at the end is settled (the pause after his last stroke) */
const run = (letter: string, script: 'print' | 'hand', strokes: Pt[][]) => {
  const c = new LetterChecker(strokesOf(letter, script))
  const rs: Verdict[] = strokes.map((s) => c.add(s))
  const sv = c.settle()
  if (sv) rs.push(sv)
  return Object.assign(rs, { complete: c.done })
}
const allOk = (rs: ReturnType<typeof run>) => !rs.some((r) => r.kind === 'wrong') && rs.complete

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
    for (const tf of [{ scale: 0.5 }, { scale: 0.75 }, { scale: 1.3 }, { scale: 1.8 }, { dx: 0.5, dy: 0.3 }, { scale: 0.7, dx: -0.3, dy: 0.4 }, { sx: 0.75 }, { sx: 1.3 }])
      for (const d of STROKES) {
        // ו י ן are told apart by their height on the lines: a half-size ו is a י, a double one a ן (ר and ך too)
        if (((tf.scale ?? 1) < 0.7 || (tf.scale ?? 1) > 1.4) && 'וירךן'.includes(d.letter)) continue
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
  it('a part in the wrong place is wrong (ה with its leg up to the roof is not ה; a leg out at the right is a wrong start)', () => {
    const h = strokesOf('ה', 'print').variants[0]
    expect(run('ה', 'print', [draw(h[0]), draw([[0.16, 0.1], [0.16, 1]])])[1].kind).toBe('wrong')
    expect(run('ה', 'print', [draw(h[0]), draw([[1.3, 0.45], [1.3, 1]])])[1]).toMatchObject({ kind: 'wrong', why: 'start' })
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
    for (const [asked, drawn] of [['ד', 'ר'], ['ר', 'ד'], ['ב', 'כ'], ['כ', 'ב'], ['ה', 'ח']] as const) {
      const rs = run(asked, 'hand', strokesOf(drawn, 'hand').variants[0].map((s) => draw(s)))
      expect(allOk(rs), `${asked} drawn as ${drawn} (hand)`).toBe(false)
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
    c.settle()
    const [x, y] = c.expected()[0]
    expect(x).toBeCloseTo(h[1].pts[0][0] * 0.5 + 0.3, 1)
    expect(y).toBeCloseTo(h[1].pts[0][1] * 0.5, 1)
  })
  it('all letters are checked (data and recognizer agree on the 27 letters)', () => {
    for (const l of LETTERS) expect(() => new LetterChecker(strokesOf(l, 'print'))).not.toThrow()
  })
})

describe('recognizer: review findings (pen lifts, size from the lines, waiting pieces)', () => {
  const dense = (st: Pt[]) => resample(st, Math.max(12, Math.round(Math.hypot(1, 1) * 40)))
  const scaleAbout = (p: Pt[], k: number): Pt[] => {
    const cx = p.reduce((a, q) => a + q[0], 0) / p.length
    const cy = p.reduce((a, q) => a + q[1], 0) / p.length
    return p.map(([x, y]) => [cx + (x - cx) * k, cy + (y - cy) * k])
  }
  it('a pen lift in the middle of any one stroke (a small gap) passes, in every letter of both scripts', () => {
    const bad: string[] = []
    for (const d of STROKES) d.variants.forEach((v, vi) => v.forEach((_, si) => {
      // print ר is one stroke by the parent's rule: a lift at its corner is how ד is written (it must fail)
      if (d.strict && v[si].pts.length > 2) return
      // the first half of ז's zigzag stem is already a whole straight stem (the other variant): the letter is done there
      if (d.letter === 'ז' && d.script === 'print' && vi === 1 && si === 1) return
      const pieces = v.flatMap((st, i) => {
        const p = dense(st.pts)
        if (i !== si) return [p]
        const k = Math.floor(p.length / 2)
        return [p.slice(0, k), p.slice(k + 1)]
      })
      if (!allOk(run(d.letter, d.script, pieces))) bad.push(`${d.letter}${d.script[0]}${vi}s${si + 1}`)
    }))
    expect(bad).toEqual([])
  })
  it('a lift and a pause inside the first straight stroke: the rest joins it, and the letter keeps its full size', () => {
    for (const [l, sc] of [['ד', 'print'], ['א', 'print'], ['ז', 'print'], ['ץ', 'print']] as const) {
      const v = strokesOf(l, sc).variants[0]
      const c = new LetterChecker(strokesOf(l, sc))
      const p = dense(v[0].pts)
      const k = Math.floor(p.length / 2)
      expect(c.add(p.slice(0, k)).kind, l + sc).toBe('partial')
      // the pause: what waits is settled (here a half stroke still looks like the stroke)
      c.settle()
      const r = c.add(p.slice(k + 1))
      expect(r.kind, `${l} ${sc} rest`).toBe('ok')
      for (const st of v.slice(1)) expect(c.add(dense(st.pts)).kind, `${l} ${sc} next`).toBe('ok')
      expect(c.done).toBe(true)
    }
    // and the hand would draw the next stroke where it belongs, not at half size
    const d = strokesOf('ד', 'print')
    const c = new LetterChecker(d)
    const p = dense(d.variants[0][0].pts)
    c.add(p.slice(0, 20)); c.settle(); c.add(p.slice(21))
    expect(c.expected()[0][0]).toBeCloseTo(0.82, 1)
  })
  it('a first stroke at 0.6× or 1.3× of its size, then the right strokes, passes (size comes from the lines too)', () => {
    for (const k of [0.6, 0.75, 1.3]) {
      const bad: string[] = []
      for (const d of STROKES) {
        if (d.variants[0].length < 2) continue
        const rs = run(d.letter, d.script, d.variants[0].map((st, i) => (i === 0 ? scaleAbout(dense(st.pts), k) : dense(st.pts))))
        if (!allOk(rs)) bad.push(`${d.letter}${d.script[0]}`)
      }
      expect(bad, `first stroke ×${k}`).toEqual([])
    }
  })
  it('small hooks at the ends of strokes pass (after the pause they wait for)', () => {
    const bad: string[] = []
    for (const d of STROKES) for (const ang of [-2.1, 2.1]) {
      // handwriting י is a comma of 0.4: hooks of 0.1 at both ends make it another shape
      if (d.letter === 'י' && d.script === 'hand') continue
      const strokes = d.variants[0].map((st) => {
        const p = dense(st.pts)
        const hook = (a: Pt, b: Pt): Pt => {
          const dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy) || 1, c = Math.cos(ang), s = Math.sin(ang)
          return [a[0] + 0.1 * (c * dx - s * dy) / L, a[1] + 0.1 * (s * dx + c * dy) / L]
        }
        return [hook(p[0], p[1]), ...p, hook(p[p.length - 1], p[p.length - 2])]
      })
      // he pauses a moment after each stroke: a waiting piece is settled before the next
      const c = new LetterChecker(d)
      let wrong = false
      for (const st of strokes) { const r = c.add(st); if (r.kind === 'wrong') wrong = true; if (r.kind === 'partial' && c.settle()?.kind === 'wrong') wrong = true }
      if (wrong || !c.done) bad.push(`${d.letter}${d.script[0]}${ang > 0 ? '+' : '-'}`)
    }
    expect(bad).toEqual([])
  })
  it('a later stroke drawn first is wrong order, even when it looks like the start of the first (ב: the base first)', () => {
    const b = strokesOf('ב', 'print').variants[0]
    expect(run('ב', 'print', [dense(b[1].pts)])[0]).toMatchObject({ kind: 'wrong', why: 'order' })
  })
  it('ו, י and ן are not accepted for each other, nor ך for ר (their height on the lines)', () => {
    const pairs: [string, string, 'print' | 'hand'][] = [['י', 'ו', 'print'], ['ו', 'י', 'print'], ['ו', 'י', 'hand'], ['י', 'ו', 'hand'], ['ן', 'ו', 'hand'], ['ו', 'ן', 'hand'], ['ן', 'ו', 'print'], ['ו', 'ן', 'print'], ['ך', 'ר', 'print']]
    for (const [drawn, asked, sc] of pairs)
      expect(allOk(run(asked, sc, strokesOf(drawn, sc).variants[0].map((st) => dense(st.pts)))), `${drawn} drawn for ${asked} (${sc})`).toBe(false)
  })
  it('a waiting piece is settled after the pause: right as a whole stroke, or wrong', () => {
    const c = new LetterChecker(strokesOf('כ', 'print'))
    expect(c.add(scaleAbout(dense(strokesOf('כ', 'print').variants[0][0].pts), 0.5)).kind).toBe('partial')
    expect(c.settle()).toMatchObject({ kind: 'ok', done: true })
    const w = new LetterChecker(strokesOf('ו', 'print'))
    expect(w.add(dense(strokesOf('י', 'print').variants[0][0].pts)).kind).toBe('partial')
    expect(w.settle()?.kind).toBe('wrong')
    expect(w.settle()).toBeNull()
  })
  it('handwriting ד: over the top, a loop at mid-height, then down; a plain arch is ר, not ד', () => {
    expect(allOk(run('ד', 'hand', [dense(strokesOf('ד', 'hand').variants[0][0].pts)]))).toBe(true)
    expect(allOk(run('ד', 'hand', [dense(strokesOf('ר', 'hand').variants[0][0].pts)]))).toBe(false)
  })
})

describe("recognizer: the parent's review (alternatives, look-alikes)", () => {
  const dense = (st: Pt[]) => resample(st, 40)
  const ok = (l: string, sc: 'print' | 'hand', v: StrokeDef[]) => allOk(run(l, sc, v.map((st) => dense(st.pts))))
  it('every alternative passes: ז with a zigzag, מ in 3 strokes, מ with the small piece first', () => {
    for (const [l, n] of [['ז', 2], ['מ', 3]] as const) {
      const v = strokesOf(l, 'print').variants
      expect(v.length).toBe(n)
      v.forEach((x, i) => expect(ok(l, 'print', x), `${l} v${i + 1}`).toBe(true))
    }
  })
  it('פ in one stroke from the centre and around passes (the parent); the taught order stays first', () => {
    // print פ and ף: the tongue backwards (from its end in the centre, up to the roof), then the roof and round
    const pe = strokesOf('פ', 'print').variants
    expect(pe[0].length).toBe(2)
    const one = (l: string, sc: 'print' | 'hand') => strokesOf(l, sc).variants.find((v, i) => i > 0 && v.length === 1)
    for (const l of 'פף') {
      const v = one(l, 'print')!
      expect(v, l).toBeDefined()
      expect(v[0].pts[0], l).toEqual([0.45, 0.45])
      expect(ok(l, 'print', v), l).toBe(true)
      for (const seed of [1, 2, 3]) expect(allOk(run(l, 'print', [draw(v[0], { noise: 0.03, seed })])), `${l} ${seed}`).toBe(true)
      for (const tf of [{ scale: 0.7 }, { scale: 1.3, dx: 0.2 }]) expect(allOk(run(l, 'print', [draw(v[0], tf)])), `${l} ${JSON.stringify(tf)}`).toBe(true)
    }
    // handwriting פ is one stroke already (from the top-left, round, into the curl): it also passes from the curl outwards
    const hv = one('פ', 'hand')!
    expect(strokesOf('פ', 'hand').variants[0][0].pts[0]).toEqual([0.2, 0.22])
    expect(ok('פ', 'hand', hv)).toBe(true)
    // still wrong: a scribble in one stroke, כ, the outside alone, the tongue alone
    const scribble: Pt[] = Array.from({ length: 40 }, (_, i) => [0.5 + 0.4 * Math.sin(i * 1.7), 0.5 + 0.4 * Math.cos(i * 2.3)])
    for (const sc of ['print', 'hand'] as const) expect(allOk(run('פ', sc, [scribble])), sc).toBe(false)
    expect(allOk(run('ף', 'print', [scribble]))).toBe(false)
    expect(ok('פ', 'print', strokesOf('כ', 'print').variants[0])).toBe(false)
    expect(ok('פ', 'print', [pe[0][0]])).toBe(false)
    expect(ok('פ', 'print', [pe[0][1]])).toBe(false)
    // and the one-stroke פ is not a כ
    expect(ok('כ', 'print', one('פ', 'print')!)).toBe(false)
    expect(ok('כ', 'hand', hv)).toBe(false)
  })
  it('the zigzag and the straight stem of ז both pass after the same head', () => {
    const [a, b] = strokesOf('ז', 'print').variants
    expect(ok('ז', 'print', [a[0], b[1]])).toBe(true)
    expect(ok('ז', 'print', [b[0], a[1]])).toBe(true)
  })
  it('the handwriting letters drawn after Dana Yad stay apart from their look-alikes (both ways)', () => {
    for (const [a, b] of [['ב', 'כ'], ['ד', 'ר'], ['ח', 'ת'], ['ח', 'ה'], ['ם', 'ס'], ['כ', 'ר'], ['ק', 'ר'], ['ט', 'ס']])
      for (const [asked, drawn] of [[a, b], [b, a]])
        expect(ok(asked, 'hand', strokesOf(drawn, 'hand').variants[0]), `${drawn} drawn for ${asked}`).toBe(false)
  })
  it('ה and ח differ by the height of the leg (a gap under the roof), in both scripts', () => {
    for (const sc of ['print', 'hand'] as const) {
      const he = strokesOf('ה', sc).variants[0]
      const het = strokesOf('ח', sc).variants[0]
      expect(ok('ה', sc, [he[0], het[1]]), `ה with ח's leg (${sc})`).toBe(false)
      expect(ok('ח', sc, [het[0], he[1]]), `ח with ה's leg (${sc})`).toBe(false)
      expect(he[1].height && het[1].height, sc).toBe(true)
    }
  })
  it('print מ in any of its forms is not ם, nor ם a מ', () => {
    for (const v of strokesOf('מ', 'print').variants) expect(ok('ם', 'print', v)).toBe(false)
    for (const v of strokesOf('ם', 'print').variants) expect(ok('מ', 'print', v)).toBe(false)
  })
  it('a stroke marked with its end (handwriting ף down, ץ up) fails when its end goes the other way, also when wobbly', () => {
    for (const l of 'ףץ') {
      const st = strokesOf(l, 'hand').variants[0][0]
      expect(st.end, l).toBe(l === 'ף' ? 'down' : 'up')
      const p = st.pts
      const n = p.length
      // the same stroke with its last bit mirrored up/down about the point before it
      const flipped: Pt[] = p.map((q, i) => (i >= n - 6 ? [q[0], 2 * p[n - 7][1] - q[1]] : q))
      expect(judgeStroke(dense(flipped), st, { s: 1, tx: 0, ty: 0 }, true).ok, l).toBe(false)
      for (const seed of [1, 2, 3]) expect(allOk(run(l, 'hand', [draw(st, { noise: 0.03, seed })])), `${l} ${seed}`).toBe(true)
    }
  })
  it('look-alikes are told apart: נ and כ, ד and ר, ץ and ף (both scripts, both ways)', () => {
    const pairs: [string, string][] = [['נ', 'כ'], ['ד', 'ר'], ['ץ', 'ף']]
    for (const sc of ['print', 'hand'] as const) for (const [a, b] of pairs) for (const [asked, drawn] of [[a, b], [b, a]]) {
      for (const v of strokesOf(drawn, sc).variants)
        expect(ok(asked, sc, v), `${drawn} drawn for ${asked} (${sc})`).toBe(false)
    }
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
  it('kamatz: the order inside it is not graded (a tick or a dot first waits for the bar); a long patach under a wide letter passes', () => {
    const km: MarkSpec[] = [{ zone: 'under', shape: 'T' }]
    expect(j(km, [[[0.55, 1.32], [0.55, 1.5]]])).toBe('more')
    expect(j(km, [[[0.55, 1.32], [0.55, 1.5]], [[0.35, 1.3], [0.75, 1.3]]])).toBe('ok')
    expect(j(km, [[[0.55, 1.32], [0.55, 1.4]]])).toBe('more')
    expect(j(km, [dot(0.5, 1.4), bar(0.5, 1.28)])).toBe('ok')
    const wide: Box = { left: 0, right: 1.3, top: 0, bottom: 1 }
    expect(judgeMarks([[[0.2, 1.3], [1.1, 1.3]]], [{ zone: 'under', shape: 'bar' }], { letter: wide }).state).toBe('ok')
  })
  it('segol: the bottom dot need not be exactly in the middle', () => {
    const sg: MarkSpec[] = [{ zone: 'under', shape: 'dots3-tri' }]
    expect(j(sg, [dot(0.4, 1.3), dot(0.7, 1.3), dot(0.45, 1.45)])).toBe('ok')
    expect(j(sg, [dot(0.4, 1.3), dot(0.7, 1.3), dot(0.35, 1.45)])).toBe('ok')
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
  it('a mark under the letter is judged against his own letter, not the line (the parent: tsere a bit beneath his letter was rejected)', () => {
    const ts: MarkSpec[] = [{ zone: 'under', shape: 'dots2' }]
    const under = (ink: Box, strokes: Pt[][]) => judgeMarks(strokes, ts, { letter: ink }).state
    const high: Box = { left: 0.05, right: 0.95, top: -0.1, bottom: 0.82 }
    // his letter sits high: the dots a bit beneath it, still above the baseline
    expect(under(high, [dot(0.35, 0.93), dot(0.65, 0.93)])).toBe('ok')
    expect(under(high, [dot(0.35, 1.05), dot(0.65, 1.05)])).toBe('ok')
    // his letter sits low: the dots beneath it, below the slot's area
    const low: Box = { left: 0, right: 1, top: 0.3, bottom: 1.3 }
    expect(under(low, [dot(0.35, 1.45), dot(0.65, 1.45)])).toBe('ok')
    expect(under(low, [dot(0.35, 1.9), dot(0.65, 1.9)])).toBe('ok')
    // the dots touch his letter's bottom a little
    expect(under(letter, [dot(0.35, 0.93), dot(0.65, 0.93)])).toBe('ok')
    expect(under(high, [dot(0.35, 0.76), dot(0.65, 0.76)])).toBe('ok')
    // still wrong: inside his letter, above it, far below it, beside it, the wrong count
    expect(under(high, [dot(0.35, 0.5), dot(0.65, 0.5)])).toBe('wrong')
    expect(under(low, [dot(0.35, 1.05), dot(0.65, 1.05)])).toBe('wrong')
    expect(under(high, [dot(0.35, -0.3), dot(0.65, -0.3)])).toBe('wrong')
    expect(under(low, [dot(0.35, 2.4), dot(0.65, 2.4)])).toBe('wrong')
    expect(under(high, [dot(1.6, 0.95), dot(1.9, 0.95)])).toBe('wrong')
    expect(under(high, [dot(0.3, 0.95), dot(0.5, 0.95), dot(0.7, 0.95)])).toBe('wrong')
    // with a dagesh too: a dot just inside his letter's bottom is the dagesh, not the vowel
    const both: MarkSpec[] = [{ zone: 'inside', shape: 'dot' }, { zone: 'under', shape: 'dots2' }]
    expect(judgeMarks([dot(0.5, 0.45), dot(0.35, 0.93), dot(0.65, 0.93)], both, { letter: high }).state).toBe('ok')
  })
  it('the order of the marks never matters: בֵּ (dagesh and tsere), שָׁ (ש dot and kamatz), in every order, on his own ב/ש', () => {
    const perms = <T,>(a: T[]): T[][] => (a.length <= 1 ? [a] : a.flatMap((x, i) => perms([...a.slice(0, i), ...a.slice(i + 1)]).map((r) => [x, ...r])))
    for (const script of ['print', 'hand'] as const) {
      for (const [dy, k] of [[0, 1], [-0.15, 0.85], [0.2, 1.1]] as const) {
        const inkOf = (ch: string): Box => {
          const ps = strokesOf(ch, script).variants[0].flatMap((s) => s.pts).map(([x, y]): Pt => [x * k, y * k + dy])
          return { left: Math.min(...ps.map((p) => p[0])), right: Math.max(...ps.map((p) => p[0])), top: Math.min(...ps.map((p) => p[1])), bottom: Math.max(...ps.map((p) => p[1])) }
        }
        const b = inkOf('ב')
        const bx = (b.left + b.right) / 2
        const bet: MarkSpec[] = [{ zone: 'inside', shape: 'dot' }, { zone: 'under', shape: 'dots2' }]
        const betMarks = [dot(bx, (b.top + b.bottom) / 2), dot(bx - 0.15, b.bottom + 0.12), dot(bx + 0.15, b.bottom + 0.12)]
        for (const o of perms(betMarks)) expect(judgeMarks(o, bet, { letter: b }).state, `${script} ${dy} ${k}`).toBe('ok')
        const s = inkOf('ש')
        const sx = (s.left + s.right) / 2
        const shin: MarkSpec[] = [{ zone: 'above-right', shape: 'dot' }, { zone: 'under', shape: 'T' }]
        const shinMarks = [dot(s.right - 0.1, s.top - 0.15), bar(sx, s.bottom + 0.15), [[sx, s.bottom + 0.17], [sx, s.bottom + 0.32]] as Pt[]]
        for (const o of perms(shinMarks)) expect(judgeMarks(o, shin, { letter: s }).state, `${script} ${dy} ${k}`).toBe('ok')
      }
    }
  })
  it('the shuruk dot: anywhere left of the vav\'s stem at about its middle height (the fonts\' vav stem is in the right half of its box)', () => {
    // the printed vav's box (its advance), as the fonts have it: Sigalit 0.55 wide, its stem from 0.28; Dana Yad 0.44, from 0.16
    for (const V of [{ left: -0.9, right: -0.35, top: 0, bottom: 1 }, { left: -0.79, right: -0.35, top: 0, bottom: 1 }]) {
      const sh: MarkSpec[] = [{ zone: 'vav-left', shape: 'dot' }]
      const at = (x: number, y: number) => judgeMarks([dot(x, y)], sh, { letter, vav: V }).state
      const w = V.right - V.left
      for (const x of [V.left + 0.4 * w, V.left + 0.25 * w, V.left + 0.1 * w, V.left, V.left - 0.2, V.left - 0.4])
        for (const y of [0.3, 0.5, 0.7, 0.9]) expect(at(x, y), `${w} ${x} ${y}`).toBe('ok')
      // clearly above it (a cholam), far left of it, right of its stem, or under the slot's letter: wrong
      expect(at(V.left + 0.2 * w, -0.2)).toBe('wrong')
      expect(at(V.left - 0.8, 0.5)).toBe('wrong')
      expect(at(V.right - 0.05, 0.5)).toBe('wrong')
      expect(at(0.5, 1.3)).toBe('wrong')
      // the hand puts it close to the stem, inside the zone
      expect(markTargets(sh, { letter, vav: V })[0][0][0]).toBeGreaterThan(V.left)
    }
  })
  it('the dagesh: anywhere well inside his own letter', () => {
    const dg: MarkSpec[] = [{ zone: 'inside', shape: 'dot' }]
    const b: Box = { left: 0.1, right: 0.9, top: -0.2, bottom: 0.75 }
    for (const x of [0.25, 0.4, 0.5, 0.6, 0.75]) for (const y of [0, 0.2, 0.35, 0.5, 0.65]) expect(judgeMarks([dot(x, y)], dg, { letter: b }).state, `${x} ${y}`).toBe('ok')
    expect(judgeMarks([dot(0.5, 0.95)], dg, { letter: b }).state).toBe('wrong')
    expect(judgeMarks([dot(0.5, -0.45)], dg, { letter: b }).state).toBe('wrong')
    expect(judgeMarks([dot(1.2, 0.3)], dg, { letter: b }).state).toBe('wrong')
  })
  it('the hand knows where each mark goes', () => {
    const t = markTargets([{ zone: 'under', shape: 'dots2' }, { zone: 'inside', shape: 'dot' }], { letter, vav })
    expect(t.length).toBe(3)
    expect(judgeMarks(t, [{ zone: 'under', shape: 'dots2' }, { zone: 'inside', shape: 'dot' }], { letter, vav }).state).toBe('ok')
    for (const sh of ['dot', 'dots2', 'dots3-tri', 'dots3-diag', 'bar', 'T'] as const)
      for (const z of ['under', 'inside', 'above-right', 'above-left', 'vav-left', 'vav-above'] as const) {
        // the vav only ever takes one dot (shuruk, cholam male)
        if (z.startsWith('vav') && sh !== 'dot') continue
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
