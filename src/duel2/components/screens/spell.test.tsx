import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { RunController, type SpellView } from '../../controller'
import { HEBREW } from '../../course/hebrew'
import type { Course } from '../../course/types'
import { spellFixture } from '../../data/spellFixtures'
import type { SpellRound } from '../../policies/spell'
import { until } from '../../testing/runHarness'
import { fakeAudio } from '../../../shared/gameAudio/fakePlayer'
import { ENGLISH } from '../../../english/course'
import { CourseProvider } from '../../course/CourseContext'
import { Gallery } from '../../screens/Gallery'
import { BOOK, BOX_Y, SpellBook, TILE_Y, spellBoxes, spellTileXs } from './SpellBook'

const box = (unit: string, text = unit) => ({ unit, text, soundId: `snd-${unit}` })
/** a five-box English word (the most the spell book is sized for) */
const JUMPING: SpellRound = {
  word: 'jumping', wordVoice: 'w-jumping', boxes: ['j', 'u', 'm', 'p', 'ing'].map((u) => box(u)), tiles: ['m', 'ing', 'j', 'p', 'u', 'a'].map((u) => box(u)), mode: 'tiles',
}
const viewOf = (round: SpellRound, p: Partial<SpellView> = {}): SpellView => ({ screen: 'spell', round, filled: round.boxes.map(() => null), alive: false, ...p })
const draw = (v: SpellView, dir: 'ltr' | 'rtl', onDrop = vi.fn(), phase: 'answer' | 'feedback' = 'answer') =>
  render(<SpellBook view={v} phase={phase} dir={dir} onDrop={onDrop} />).container

describe('the spell book screen', () => {
  it('renders one box per unit and the tiles', () => {
    const c = draw(viewOf(JUMPING), 'ltr')
    expect(c.querySelectorAll('[data-box]')).toHaveLength(5)
    expect([...c.querySelectorAll('[data-tile]')].map((t) => t.getAttribute('data-tile'))).toEqual(['m', 'ing', 'j', 'p', 'u', 'a'])
    // a two-letter unit is one tile; a filled box shows its unit and its tile is gone
    const fish = spellFixture(ENGLISH)
    const f = draw(viewOf(fish, { filled: ['f', null, null] }), 'ltr')
    expect(f.querySelectorAll('[data-box]')).toHaveLength(3)
    expect(f.querySelector('[data-box="0"]')!.textContent).toBe('f')
    expect(f.querySelector('[data-tile="sh"]')!.textContent).toBe('sh')
    expect(f.querySelector('[data-tile="f"]')).toBeNull()
  })

  it('a touch drag into the next box sends drop', () => {
    const onDrop = vi.fn()
    const c = draw(viewOf(JUMPING, { filled: ['j', null, null, null, null] }), 'ltr', onDrop)
    const { xs } = spellBoxes(5, 'ltr', false)
    const tx = spellTileXs(6, 'ltr')[4]
    const tile = c.querySelector('[data-tile="u"]')!
    // (jsdom has no layout: a client point is the stage point)
    fireEvent.pointerDown(tile, { pointerId: 1, clientX: tx, clientY: TILE_Y })
    fireEvent.pointerMove(tile, { pointerId: 1, clientX: (tx + xs[1]) / 2, clientY: (TILE_Y + BOX_Y) / 2 })
    fireEvent.pointerUp(tile, { pointerId: 1, clientX: xs[1], clientY: BOX_Y })
    expect(onDrop).toHaveBeenCalledWith('u', 1)
    // let go away from the boxes: the tile flies back, nothing is sent
    fireEvent.pointerDown(tile, { pointerId: 2, clientX: tx, clientY: TILE_Y })
    fireEvent.pointerUp(tile, { pointerId: 2, clientX: tx + 200, clientY: TILE_Y - 200 })
    expect(onDrop).toHaveBeenCalledTimes(1)
    // while the voice speaks (no answer phase) the tiles do not move
    const shut = vi.fn()
    const s = draw(viewOf(JUMPING), 'ltr', shut, 'feedback')
    const t = s.querySelector('[data-tile="j"]')!
    fireEvent.pointerDown(t, { pointerId: 3, clientX: tx, clientY: TILE_Y })
    fireEvent.pointerUp(t, { pointerId: 3, clientX: xs[0], clientY: BOX_Y })
    expect(shut).not.toHaveBeenCalled()
  })

  it('the faint tail letter is not a box', () => {
    const camel = spellFixture(HEBREW)
    expect(camel.tail).toBe('ל')
    const c = draw(viewOf(camel), 'rtl')
    expect(c.querySelectorAll('[data-box]')).toHaveLength(2)
    const tail = c.querySelector('[data-tail]')!
    expect(tail.textContent).toBe('ל')
    expect(tail.getAttribute('opacity')).toBe('0.35')
    expect(tail.closest('[data-box]')).toBeNull()
    expect([...c.querySelectorAll('[data-tile]')].map((t) => t.textContent)).not.toContain('ל')
    // after the last box in reading order: to its left on a right-to-left page
    const { xs, tailX } = spellBoxes(2, 'rtl', true)
    expect(tailX!).toBeLessThan(xs[1])
  })

  it('the gallery opens the spell book with a fixture round, rtl and ltr', async () => {
    // both pages' galleries list it (the Hebrew run has it after the doors); the long one is English's only
    const listed = (course: Course) => [...render(<CourseProvider value={course}><Gallery onBack={() => {}} onStart={() => {}} /></CourseProvider>)
      .container.querySelectorAll('[data-entry]')].map((e) => e.getAttribute('data-entry'))
    expect(listed(ENGLISH)).toContain('spell')
    expect(listed(HEBREW)).toContain('spell')
    expect(listed(HEBREW)).not.toContain('spell-long')
    vi.useFakeTimers()
    // the demo's line plays until the test lets it end
    fakeAudio.holdUntil(/^demo-spell/)
    try {
      // (both courses have spell rounds; here they have none, to check the fixture's page with its picture)
      const fixture = (c: Course): Course => ({ ...c, rounds: { ...c.rounds, spellRound: () => null } })
      for (const [course, word, dir] of [[fixture(HEBREW), 'camel', 'rtl'], [fixture(ENGLISH), 'fish', 'ltr']] as [Course, string, 'rtl' | 'ltr'][]) {
        expect(course.rounds.spellRound({ rng: () => 0.5, stage: 4, tallies: {}, recent: {}, confusions: { letters: {}, syllables: {} } })).toBeNull()
        const c = new RunController({ sandbox: true, force: { screen: 'spell', stage: 4, demo: true }, course, now: () => Date.now() })
        c.start()
        await until(c, (v) => v.screen?.screen === 'spell' && !!v.screen.demo)
        const s = c.view.screen as SpellView
        expect(s.round.word).toBe(word)
        expect(c.view.course.dir).toBe(dir)
        const page = draw(s, dir)
        expect(page.querySelector('[data-stage]')!.getAttribute('dir') ?? 'rtl').toBe(dir)
        // the picture on the page where the reading starts, the boxes on the other, box 0 where the reading starts
        const pic = Number(page.querySelector('[data-spell-picture] image')!.getAttribute('x'))
        const { xs } = spellBoxes(s.round.boxes.length, dir, !!s.round.tail)
        const mid = BOOK.x + BOOK.w / 2
        if (dir === 'ltr') { expect(pic).toBeLessThan(mid); expect(Math.min(...xs)).toBeGreaterThan(mid); expect(xs[0]).toBe(Math.min(...xs)) }
        else { expect(pic).toBeGreaterThan(mid); expect(Math.max(...xs)).toBeLessThan(mid); expect(xs[0]).toBe(Math.max(...xs)) }
        // the demo's hand moves the first tile
        expect(page.querySelector('[data-demo-hand]')).not.toBeNull()
        fakeAudio.release()
        c.destroy()
      }
    } finally {
      fakeAudio.holdUntil(null)
      vi.useRealTimers()
    }
  })

  it('the English gallery\'s long fixture is the most boxes a word has (5), and every tile it needs is there', () => {
    expect(listedEnglish()).toContain('spell-long')
    const r = spellFixture(ENGLISH, true)
    expect(r.boxes.map((b) => b.text)).toEqual(['j', 'u', 'm', 'p', 'ing'])
    r.boxes.forEach((b) => expect(r.tiles.map((t) => t.unit)).toContain(b.unit))
    // the short one stays as it was
    expect(spellFixture(ENGLISH).word).toBe('fish')
  })
})

const listedEnglish = () => [...render(<CourseProvider value={ENGLISH}><Gallery onBack={() => {}} onStart={() => {}} /></CourseProvider>)
  .container.querySelectorAll('[data-entry]')].map((e) => e.getAttribute('data-entry'))

describe('the spell book screen: a written word', () => {
  it('the gallery\'s written word (English only): the slate on the book, a box per letter, the start dot; no tiles, no picture; his stroke in letter units', async () => {
    expect(listedEnglish()).toContain('spell-write')
    expect([...render(<CourseProvider value={HEBREW}><Gallery onBack={() => {}} onStart={() => {}} /></CourseProvider>).container.querySelectorAll('[data-entry]')]
      .map((e) => e.getAttribute('data-entry'))).not.toContain('spell-write')
    vi.useFakeTimers()
    try {
      const c = new RunController({ sandbox: true, force: { screen: 'spell', stage: 4, longSpell: 'write' }, course: ENGLISH, now: () => Date.now() })
      c.start()
      await until(c, (v) => v.phase === 'answer')
      const s = c.view.screen as SpellView
      expect(s.write!.letters).toEqual([...'jumping'])
      const onStroke = vi.fn()
      const page = render(<CourseProvider value={ENGLISH}><SpellBook view={s} phase="answer" dir="ltr" onDrop={vi.fn()} onStroke={onStroke} /></CourseProvider>).container
      expect(page.querySelectorAll('[data-write-box]')).toHaveLength(7)
      expect(page.querySelectorAll('[data-spell-write] [data-lines] line')).toHaveLength(4)
      expect(page.querySelectorAll('[data-tile]')).toHaveLength(0)
      expect(page.querySelector('[data-spell-picture]')).toBeNull()
      // the start dot of j, in the first box
      const dot = page.querySelector('[data-start-dot]')!
      const first = page.querySelector('[data-write-box="0"]')!
      const cx = Number(dot.getAttribute('cx'))
      expect(cx).toBeGreaterThan(Number(first.getAttribute('x')))
      expect(cx).toBeLessThan(Number(first.getAttribute('x')) + Number(first.getAttribute('width')))
      // a stroke on the book reaches the run in letter units (the board's origin)
      const L = s.write!.layout
      const pad = page.querySelector('[data-spell-write] [data-draw-pad]')!
      fireEvent.pointerDown(pad, { pointerId: 1, clientX: 0, clientY: 0 })
      fireEvent.pointerUp(pad, { pointerId: 1, clientX: 0, clientY: 0 })
      expect(onStroke).toHaveBeenCalledTimes(1)
      const [[[[x, y]]]] = onStroke.mock.calls as unknown as [[[number, number][]]][]
      expect(Number.isFinite(x) && Number.isFinite(y)).toBe(true)
      expect(L.u).toBeGreaterThan(0)
      c.destroy()
    } finally { vi.useRealTimers() }
  })
})
