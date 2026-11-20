import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Ladder } from './Ladder'
import { Doors } from './Doors'
import { CauldronWord } from './Cauldron'
import { Stage } from './Stage'
import { Glyph } from '../Glyph'
import { syllable } from '../../logic/content'
import { syllableChoice, type Choice } from '../../logic/rounds'
import type { Measurer } from '../Glyph'
import { WORDS } from '../../data/words'

const plates = [syllableChoice(syllable('bet', 'chirik')), syllableChoice(syllable('kaf', 'chirik')), syllableChoice(syllable('bet', 'kamatz'))]
const word = WORDS.find((w) => (w.syllables?.length ?? 0) >= 2)!
const keys = WORDS.slice(0, 3)

const ladder = (dir: 'rtl' | 'ltr') =>
  render(<Ladder built={plates.slice(0, 1)} plates={plates} rungs={4} onPick={() => {}} phase="answer" dir={dir} />).container
const doors = (dir: 'rtl' | 'ltr') =>
  render(<Doors word={word} lit={2} keys={keys} onPick={() => {}} phase="answer" opening={false} zooming={false} dir={dir} />).container
const cxs = (c: HTMLElement) => [...c.querySelectorAll('[data-syl]')].map((e) => Number(e.getAttribute('data-cx')))

describe('the screens follow the course direction', () => {
  it('a ladder in ltr says so and keeps its plates in DOM order', () => {
    const c = ladder('ltr')
    expect(c.querySelector('[data-stage]')!.getAttribute('dir')).toBe('ltr')
    expect([...c.querySelectorAll('[data-plate]')].map((e) => e.getAttribute('data-plate'))).toEqual(plates.map((p) => p.id))
    expect(c.querySelector('[data-rung] text')!.getAttribute('direction')).toBe('ltr')
  })
  it('a ladder in rtl is as before', () => {
    const c = ladder('rtl')
    expect(c.querySelector('[data-stage]')!.hasAttribute('dir')).toBe(false)
    expect(c.querySelector('[data-rung] text')!.getAttribute('direction')).toBe('rtl')
  })
  it('the door plate lays its syllables left to right in ltr', () => {
    const c = doors('ltr')
    expect(c.querySelector('[data-stage]')!.getAttribute('dir')).toBe('ltr')
    const x = cxs(c)
    expect(x.length).toBeGreaterThanOrEqual(2)
    expect(x).toEqual([...x].sort((a, b) => a - b))
  })
  it('the door plate lays its syllables right to left in rtl', () => {
    const c = doors('rtl')
    expect(c.querySelector('[data-stage]')!.hasAttribute('dir')).toBe(false)
    const x = cxs(c)
    expect(x).toEqual([...x].sort((a, b) => b - a))
  })
  it('the English cauldron lays its boxes c _ t left to right in ltr', () => {
    const part = (id: string): Choice => ({ kind: 'unit', id, text: id, soundId: `snd-${id}`, itemId: id })
    const cat: Choice = { kind: 'word', id: 'cat', text: 'cat', soundId: 'w-cat', itemId: 'cat', units: ['c', 'a', 't'] }
    const c = render(<CauldronWord boxes={['c', 'a', 't'].map(part)} gap={1} tiles={['o', 'a', 'i', 'u'].map(part)} target={cat}
      onPick={() => {}} phase="answer" dir="ltr" />).container
    expect(c.querySelector('[data-stage]')!.getAttribute('dir')).toBe('ltr')
    const boxes = [...c.querySelectorAll('[data-box]')]
    expect(boxes.map((e) => e.getAttribute('data-box'))).toEqual(['c', '_', 't'])
    const x = boxes.map((e) => Number(e.querySelector('rect')!.getAttribute('x')))
    expect(x).toEqual([...x].sort((a, b) => a - b))
    expect([...c.querySelectorAll('[data-tile]')].map((e) => e.getAttribute('data-tile'))).toEqual(['o', 'a', 'i', 'u'])
    expect(c.querySelector('[data-box="c"] text')!.getAttribute('direction')).toBe('ltr')
  })
  it('the English ladder marks the changed place on the rung he makes, a box more where a letter comes in', () => {
    const part = (id: string): Choice => ({ kind: 'unit', id, text: id, soundId: `snd-${id}`, itemId: id })
    const w = (id: string): Choice => ({ kind: 'word', id, text: id, soundId: `w-${id}`, itemId: id })
    const rung = (change: { from: Choice[]; at: number; grow?: 1; marked: boolean }) =>
      render(<Ladder built={[w(change.from.map((x) => x.text).join(''))]} plates={['i', 'o', 'u'].map(part)} rungs={5} onPick={() => {}} phase="answer" dir="ltr" change={change} />).container
    const boxesOf = (c: HTMLElement) => [...c.querySelectorAll('[data-making-rung] [data-box]')]
    // sat → sit: the a's box is marked
    const sat = rung({ from: ['s', 'a', 't'].map(part), at: 1, marked: true })
    expect(boxesOf(sat).map((e) => e.getAttribute('data-box'))).toEqual(['s', 'a', 't'])
    expect([...sat.querySelectorAll('[data-marked-box]')].map((e) => e.getAttribute('data-box'))).toEqual(['a'])
    const x = boxesOf(sat).map((e) => Number(e.querySelector('rect')!.getAttribute('x')))
    expect(x).toEqual([...x].sort((a, b) => a - b))
    // lip → slip: an empty marked box comes in before l
    const lip = rung({ from: ['l', 'i', 'p'].map(part), at: 0, grow: 1, marked: true })
    expect(boxesOf(lip).map((e) => e.getAttribute('data-box'))).toEqual(['_', 'l', 'i', 'p'])
    expect([...lip.querySelectorAll('[data-marked-box]')].map((e) => e.getAttribute('data-box'))).toEqual(['_'])
    // later stages: the word below as it is, nothing marked (he finds the place)
    const later = rung({ from: ['l', 'i', 'p'].map(part), at: 0, grow: 1, marked: false })
    expect(boxesOf(later).map((e) => e.getAttribute('data-box'))).toEqual(['l', 'i', 'p'])
    expect(later.querySelector('[data-marked-box]')).toBeNull()
    // no rung to make without a change (Hebrew, and the first rung)
    expect(ladder('ltr').querySelector('[data-making-rung]')).toBeNull()
  })
  it('a Latin glyph is drawn ltr in Andika, a Hebrew one rtl', () => {
    const { container } = render(<svg><Glyph text="cat" alphabet="latin" px={100} x={0} y={0} /><Glyph text="בּ" px={100} x={0} y={0} /></svg>)
    const [latin, hebrew] = [...container.querySelectorAll('text')]
    expect(latin.getAttribute('direction')).toBe('ltr')
    expect(latin.getAttribute('style')).toContain('Andika')
    expect(hebrew.getAttribute('direction')).toBe('rtl')
  })
  it('the stage has no dir attribute by default (Hebrew renders as before)', () => {
    expect(render(<Stage bg="bg-ground">{null}</Stage>).container.querySelector('[data-stage]')!.hasAttribute('dir')).toBe(false)
  })
  it('a Latin glyph never draws dots, even for a shin text; a Hebrew one does', () => {
    const fake: Measurer = (t, px) => ({ left: px / 2, right: px / 2, ascent: px * 0.7, descent: 0, width: t.length * px * 0.6 })
    const shin = '\u05E9\u05C1'
    const he = render(<svg><Glyph text={shin} px={100} x={0} y={0} measurer={fake} /></svg>).container
    expect(he.querySelector('[data-glyph-group]')).not.toBeNull()
    const la = render(<svg><Glyph text={shin} alphabet="latin" px={100} x={0} y={0} measurer={fake} /></svg>).container
    expect(la.querySelector('[data-glyph-group]')).toBeNull()
    expect(la.querySelectorAll('text')).toHaveLength(1)
    expect(la.querySelector('circle')).toBeNull()
  })
})
