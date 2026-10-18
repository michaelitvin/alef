import { describe, expect, it } from 'vitest'
import { discExtent } from './ClockFace'
import { BUTTONS_H, BUTTONS_W, CAPTION_H, DIGITAL_PROMPT_H, FIND_CLIP, GAP, MIN_TAP, OPT, findLayout, isCompact, pickLayout, setLayout, CLIPS } from './benchLayout'
import { CASE_DISCS } from '../assets/caseDiscs'

const LANDSCAPE = { w: 800, h: 784 }
const PORTRAIT = { w: 396, h: 691 }
/** the bench box (bench minus 16px) on phones: 412x915, 390x844 and 360x640 (thin strips) portrait, 915x412 on its side (narrow side columns) */
const PHONES = { '412x915': { w: 396, h: 691 }, '390x844': { w: 374, h: 620 }, '915x412': { w: 645, h: 396 }, '360x640': { w: 344, h: 472 } }
const extOf = (kind: keyof typeof CASE_DISCS) => (clip?: number) => discExtent(CASE_DISCS[kind], true, clip)

describe('discExtent', () => {
  it('a clock without a case is just the face', () => expect(discExtent(undefined, false)).toEqual({ w: 1, h: 1, x: 0, y: 0 }))
  it('reserves the whole case, with the face placed where its disc is', () => {
    const e = discExtent(CASE_DISCS.grandfather, true)
    expect(e.w).toBeGreaterThan(1.3)
    expect(e.h).toBeGreaterThan(2.3) // the long body under the face
    expect(e.y).toBeGreaterThan(0.2) // the hood above the face
    expect(e.y + 1).toBeLessThan(e.h)
  })
  it('clip cuts the case off around the face', () => {
    const e = discExtent(CASE_DISCS.cuckoo, true, FIND_CLIP)
    expect(e.w).toBeCloseTo(FIND_CLIP)
    expect(e.h).toBeCloseTo(FIND_CLIP)
    expect(e.x).toBeCloseTo((FIND_CLIP - 1) / 2)
  })
})

describe('bench layout: everything fits the bench box', () => {
  for (const [kind, disc] of Object.entries(CASE_DISCS)) {
    const ext = (clip?: number) => discExtent(disc, true, clip)
    it(`${kind}: pick clock and cards fit, landscape, portrait and phones`, () => {
      for (const box of [LANDSCAPE, PORTRAIT, ...Object.values(PHONES)])
        for (const cards of ['text', 'digital'] as const) {
          const l = pickLayout(box, ext, cards)
          const e = ext(l.clip)
          const c = { h: l.cardH, gap: l.cardGap }
          if (l.dir === 'row') {
            expect(e.w * l.size + l.cardW + 2 * GAP).toBeLessThanOrEqual(box.w)
            expect(e.h * l.size).toBeLessThanOrEqual(box.h)
            expect(3 * c.h + 2 * c.gap).toBeLessThanOrEqual(box.h)
          } else {
            expect(e.h * l.size + 3 * c.h + 2 * c.gap + 2 * GAP).toBeLessThanOrEqual(box.h)
            expect(e.w * l.size).toBeLessThanOrEqual(box.w)
          }
        }
    })
    it(`${kind}: set face fits under the prompt, with the hand buttons`, () => {
      for (const box of [LANDSCAPE, PORTRAIT, ...Object.values(PHONES)])
        for (const promptH of [CAPTION_H, DIGITAL_PROMPT_H]) {
          const l = setLayout(box, ext, promptH)
          const e = ext(l.clip)
          if (l.dir === 'row') {
            expect(e.h * l.size + promptH).toBeLessThanOrEqual(box.h)
            expect(e.w * l.size + BUTTONS_W + GAP).toBeLessThanOrEqual(box.w)
          } else {
            expect(e.h * l.size + promptH + BUTTONS_H + GAP).toBeLessThanOrEqual(box.h)
          }
        }
    })
  }
  it('portrait stacks the options and the cards; the find shelf never runs off the side', () => {
    const ext = discExtent(CASE_DISCS.alarm, true, FIND_CLIP)
    const f = findLayout(PORTRAIT, ext)
    expect(f.dir).toBe('column')
    expect(ext.w * f.size + OPT).toBeLessThanOrEqual(PORTRAIT.w)
    expect(pickLayout(PORTRAIT, extOf('grandfather'), 'text').dir).toBe('column')
    const row = findLayout(LANDSCAPE, ext)
    expect(row.dir).toBe('row')
    expect(3 * (ext.w * row.size + OPT) + 2 * GAP).toBeLessThanOrEqual(LANDSCAPE.w)
  })
})

// Rule: the learning content is the strongest element. Playtest 2026-10-15: on a phone the clock was much smaller
// than the answer cards. On every phone size, the main clock's face is wider than a card is tall (by far), its
// square is bigger than a whole card, and the cards stay big enough to tap.
describe('phones: the main clock is larger than any answer card', () => {
  for (const [name, box] of Object.entries(PHONES)) {
    it(`${name}: phone boxes are compact; the case is cut no closer than 1.4 face sizes (whole where it fits)`, () => {
      expect(isCompact(box)).toBe(true)
      if (name === '360x640') return // the smallest phone may cut closer
      for (const kind of Object.keys(CASE_DISCS) as (keyof typeof CASE_DISCS)[])
        for (const cards of ['text', 'digital'] as const) {
          const l = pickLayout(box, extOf(kind), cards)
          expect(CLIPS).toContain(l.clip)
          if (l.clip !== undefined) expect(l.clip, `${kind} ${cards}`).toBeGreaterThanOrEqual(1.4)
        }
    })
    for (const kind of Object.keys(CASE_DISCS) as (keyof typeof CASE_DISCS)[])
      for (const cards of ['text', 'digital'] as const) {
        it(`${name} ${kind} ${cards}: clock face > card`, () => {
          const l = pickLayout(box, extOf(kind), cards)
          const c = { h: l.cardH }
          expect(l.size).toBeGreaterThan(2.5 * c.h)
          expect(l.size * l.size).toBeGreaterThan(1.5 * l.cardW * c.h)
          expect(l.size).toBeGreaterThan(0.55 * Math.min(box.w, box.h))
          expect(c.h).toBeGreaterThanOrEqual(MIN_TAP)
        })
      }
    it(`${name}: set face is the biggest thing`, () => {
      for (const kind of Object.keys(CASE_DISCS) as (keyof typeof CASE_DISCS)[]) {
        const l = setLayout(box, extOf(kind), CAPTION_H)
        expect(l.size).toBeGreaterThan(2 * BUTTONS_H)
      }
    })
  }
  it('a tablet keeps the whole case and the roomy cards', () => {
    const l = pickLayout(LANDSCAPE, extOf('grandfather'), 'text')
    expect(l.compact).toBe(false)
    expect(l.clip).toBeUndefined()
  })
})
