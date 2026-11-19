// Task 22 — the longest words of each stage fit their places, at the smallest phone (740×360) and a tablet (1024×768).
// jsdom has no text layout, so a word's width is measured from Andika's table (testing/measure.ts); the screens are
// rendered and their drawn sizes read, so the test checks what the screens draw, not a copy of their formulas.
import { render } from '@testing-library/react'
import { createElement as h } from 'react'
import { describe, expect, it } from 'vitest'
import { Broom, WORD_IN_ORB } from '../duel2/components/screens/Broom'
import { CauldronWord, PICTURE, POT, TILE_SIZE, BOX_H, BOX_Y, boxXs } from '../duel2/components/screens/Cauldron'
import { DOOR_BOX, Doors, PLATE_INNER } from '../duel2/components/screens/Doors'
import { GHOST_SIGN, Ghosts } from '../duel2/components/screens/Ghosts'
import { Ladder, PLATE_W, RUNG_W, rungBoxXs } from '../duel2/components/screens/Ladder'
import { BlendWord } from '../duel2/components/BlendWord'
import { RuneGlyph } from '../components/duel/RuneGlyph'
import { BROOM_ORB, LANE_Y } from '../duel2/broomLayout'
import { ORB_JITTER } from '../duel2/logic/run'
import { STAGE_CONTENT_TOP, stageBox } from '../duel2/layout'
import type { Choice } from '../duel2/logic/rounds'
import { PHRASES } from './content/phrases'
import { UNITS, unit } from './content/units'
import { WORDS, type EnWord } from './content/words'
import { blendParts } from './logic/blend'
import { longestPerStage } from './testing/longest'
import { measureText } from './measure'
import { SpellBook, TILE_SIZE as SPELL_TILE, spellBoxes } from '../duel2/components/screens/SpellBook'
import type { SpellBox } from '../duel2/policies/spell'

/** the smallest phone and a tablet */
const SIZES = [[740, 360], [1024, 768]] as const
const STAGES = [1, 2, 3, 4, 5, 6, 7, 8, 9]
/** a word's measured width may fill this share of a rectangular place (the rest is its frame and air) and of a round one */
const IN_RECT = 0.9
const IN_ROUND = 0.85

const longestReal = longestPerStage()
const longestNonsense = (stage: number): string[] => {
  const xs = WORDS.filter((w) => w.kind === 'nonsense' && w.stage === stage)
  const max = Math.max(...xs.map((w) => w.text.length))
  return xs.filter((w) => w.text.length === max).map((w) => w.text)
}
/** the stage's longest words, real and nonsense (ties are all checked) */
const longest = (stage: number): string[] => [...new Set([...longestReal[stage], ...longestNonsense(stage)])]
const wordOf = (text: string): EnWord => WORDS.find((w) => w.text === text)!
const wordChoice = (text: string): Choice => ({ kind: 'word', id: text, text, soundId: `w-${text}`, itemId: text })
const partChoice = (text: string): Choice => ({ kind: 'unit', id: text, text, soundId: `snd-${text}`, itemId: text })
/** the boxes of a word: one per sound unit (a magic e is one box, 'a e') */
const boxesOf = (text: string): Choice[] => wordOf(text).units.map((u) => partChoice(unit(u).text.replace(/^-/, '')))
const sizeOf = (el: Element | null) => Number(el!.getAttribute('font-size'))
const inner = (c: HTMLElement) => [...c.querySelectorAll('[data-glyph]')] as SVGTextElement[]

describe('the longest words (asset plan 1.17) are what is checked', () => {
  it('the broom\'s no-overlap test word, gromping, is the longest of the path', () => {
    expect(longestNonsense(7)).toEqual(['gromping'])
    expect(Math.max(...WORDS.filter((w) => w.kind !== 'picture-only').map((w) => w.text.length))).toBe(8)
  })
})

describe('broom orbs', () => {
  const orbText = (text: string) => inner(render(
    h(Broom, { waves: [{ id: 1, choices: [wordChoice(text)], startMs: 0, offsets: [0], jitter: [0], resolved: [false] }], travelMs: 5000, lane: 1,
      onLane: () => {}, phase: 'answer', clock: () => 2500, dir: 'ltr' }),
  ).container)[0]

  it.each(STAGES)('stage %i: each longest word stays inside its orb', (stage) => {
    for (const w of longest(stage)) {
      const px = sizeOf(orbText(w))
      expect(measureText(w, px), w).toBeLessThanOrEqual(BROOM_ORB * WORD_IN_ORB + 0.5)
    }
  })
  it('with gromping in every lane the orbs still clear each other and the stage, and the word is inside', () => {
    for (let i = 1; i < LANE_Y.length; i++) expect(LANE_Y[i] - LANE_Y[i - 1] - 2 * ORB_JITTER).toBeGreaterThanOrEqual(BROOM_ORB)
    expect(measureText('gromping', sizeOf(orbText('gromping')))).toBeLessThanOrEqual(BROOM_ORB * IN_ROUND)
    for (const [w, h] of SIZES) expect(stageBox(w, h, STAGE_CONTENT_TOP.broom).scale).toBeGreaterThan(0)
  })
})

describe('tower runes', () => {
  // a rune is a button in a row of three (a word round): the screen's width less the pad's sides and gaps, less its border
  const runeW = (w: number, h: number) => (w - 2 * (h <= 500 ? 16 : 24) - 2 * 10) / 3 - 4
  const runeText = (text: string) => {
    const { container } = render(h(RuneGlyph, { mark: {} as never, rune: { id: text, text, alphabet: 'latin' }, size: 60 }))
    return { px: parseFloat((container.querySelector('.nd-rune-text') as HTMLElement).style.fontSize) }
  }
  it.each(STAGES)('stage %i: each longest word fits its rune at both sizes', (stage) => {
    for (const w of longest(stage)) for (const [sw, sh] of SIZES) expect(measureText(w, runeText(w).px), `${w} at ${sw}`).toBeLessThanOrEqual(runeW(sw, sh) * IN_RECT)
  })
})

describe('the cauldron', () => {
  const draw = (boxes: Choice[], tiles: Choice[], target: Choice) =>
    render(h(CauldronWord, { boxes, gap: 0, tiles, target, onPick: () => {}, phase: 'answer', dir: 'ltr' })).container
  it.each(STAGES)('stage %i: the boxes of each longest word and the tiles of the stage fit', (stage) => {
    const tiles = UNITS.filter((u) => u.stage === stage).map((u) => partChoice(u.text.replace(/^-/, '')))
    for (const w of longest(stage)) {
      const boxes = boxesOf(w)
      const c = draw(boxes, tiles.slice(0, 4), wordChoice(w))
      const { w: bw } = boxXs(boxes.length)
      const texts = [...c.querySelectorAll('[data-box] text')] as SVGTextElement[]
      texts.forEach((t) => expect(measureText(t.textContent!, sizeOf(t)), `${w}: ${t.textContent}`).toBeLessThanOrEqual(bw * IN_RECT))
    }
    const c = draw(boxesOf(longest(stage)[0]), tiles.slice(0, 4), wordChoice(longest(stage)[0]))
    const shown = [...c.querySelectorAll('[data-tile] text')] as SVGTextElement[]
    shown.forEach((t) => expect(measureText(t.textContent!, sizeOf(t)), t.textContent!).toBeLessThanOrEqual(TILE_SIZE * IN_ROUND))
  })
  it('the word with the most boxes (7 at most) fits its row, and the picture at x 1340 clears the boxes, the pot and the stage', () => {
    const most = Math.max(...WORDS.map((w) => w.units.length))
    expect(most).toBeLessThanOrEqual(7)
    const w = WORDS.find((x) => x.units.length === most)!
    const boxes = boxesOf(w.text)
    const { xs, w: bw } = boxXs(7)
    const c = draw(boxes, [], wordChoice(w.text))
    ;[...c.querySelectorAll('[data-box] text')].forEach((t) => expect(measureText(t.textContent!, sizeOf(t))).toBeLessThanOrEqual(bw * IN_RECT))
    const row = { l: xs[0] - bw / 2, r: xs[6] + bw / 2, t: BOX_Y - BOX_H / 2, b: BOX_Y + BOX_H / 2 }
    const pic = { l: PICTURE.x - PICTURE.size / 2, r: PICTURE.x + PICTURE.size / 2, t: PICTURE.y - PICTURE.size / 2, b: PICTURE.y + PICTURE.size / 2 }
    const apart = (a: typeof row, b: typeof row) => a.r <= b.l || b.r <= a.l || a.b <= b.t || b.b <= a.t
    expect(apart(row, pic)).toBe(true)
    expect(apart({ l: POT.x - POT.w / 2, r: POT.x + POT.w / 2, t: POT.top, b: 875 }, pic)).toBe(true)
    expect(pic.r).toBeLessThanOrEqual(1600)
    expect(pic.b).toBeLessThanOrEqual(900)
  })
})

describe('the ladder', () => {
  it.each(STAGES)('stage %i: rungs and plates hold each longest word, and the rung he makes holds its boxes', (stage) => {
    for (const w of longest(stage)) {
      const c = render(h(Ladder, { built: [wordChoice(w)], plates: [wordChoice(w)], rungs: 5, onPick: () => {}, phase: 'answer', dir: 'ltr' })).container
      const [rung, plate] = inner(c)
      expect(measureText(w, sizeOf(rung)), `${w} rung`).toBeLessThanOrEqual(RUNG_W * IN_RECT)
      expect(measureText(w, sizeOf(plate)), `${w} plate`).toBeLessThanOrEqual(PLATE_W * IN_RECT)
      // the rung he makes: the word's boxes, and one box more where a letter comes in
      for (const grow of [undefined, 1 as const]) {
        const boxes = boxesOf(w)
        const made = render(h(Ladder, { built: [wordChoice(w)], plates: [partChoice('e')], rungs: 5, onPick: () => {}, phase: 'answer', dir: 'ltr',
          change: { from: boxes, at: 0, ...(grow ? { grow } : {}), marked: true } })).container
        const n = boxes.length + (grow ? 1 : 0)
        const { w: bw } = rungBoxXs(n)
        const texts = [...made.querySelectorAll('[data-making-rung] [data-box] text')] as SVGTextElement[]
        expect(texts).toHaveLength(boxes.length)
        texts.forEach((t) => expect(measureText(t.textContent!, sizeOf(t)), `${w}: ${t.textContent}`).toBeLessThanOrEqual(bw * IN_RECT))
      }
    }
  })
})

describe('ghost signs', () => {
  it.each(STAGES)('stage %i: each longest word is inside its sign', (stage) => {
    for (const w of longest(stage)) {
      const c = render(h(Ghosts, { signs: [wordChoice(w)], onPick: () => {}, phase: 'answer', dir: 'ltr' })).container
      expect(measureText(w, sizeOf(inner(c)[0])), w).toBeLessThanOrEqual(GHOST_SIGN * IN_ROUND)
    }
  })
})

describe('door plates', () => {
  const plateOf = (words: string[]) => {
    const c = render(h(Doors, { word: { id: words[0], picture: '/x.png' }, plate: words.map(wordChoice), lit: 0,
      keys: [{ id: 'a', picture: '/a.png' }, { id: 'b', picture: '/b.png' }, { id: 'c', picture: '/c.png' }], onPick: () => {}, phase: 'answer', opening: false, zooming: false, dir: 'ltr' })).container
    return [...c.querySelectorAll('[data-syl]')].map((g) => ({ text: g.textContent!, cx: Number(g.getAttribute('data-cx')), px: sizeOf(g.querySelector('text')) }))
  }
  const holds = (words: string[]) => {
    const parts = plateOf(words)
    const spans = parts.map((p) => ({ l: p.cx - measureText(p.text, p.px) / 2, r: p.cx + measureText(p.text, p.px) / 2 }))
    expect(spans[0].l, words.join(' ')).toBeGreaterThanOrEqual(800 - PLATE_INNER / 2 - 0.5)
    expect(spans[spans.length - 1].r, words.join(' ')).toBeLessThanOrEqual(800 + PLATE_INNER / 2 + 0.5)
    spans.slice(1).forEach((s, i) => expect(s.l, words.join(' ')).toBeGreaterThan(spans[i].r))
    expect(800 + PLATE_INNER / 2).toBeLessThan(DOOR_BOX.x + DOOR_BOX.w)
  }
  it.each(STAGES)('stage %i: each longest word is on the plate', (stage) => { for (const w of longest(stage)) holds([w]) })
  it('every phrase is on the plate, "the white sheep" the longest', () => {
    expect(PHRASES.find((p) => p.words.join(' ').length === 15)!.id).toBe('the-white-sheep')
    for (const p of PHRASES) holds(p.words)
  })
})

describe('the hint card', () => {
  it.each(STAGES)('stage %i: the blend of each longest word is inside the card, its parts side by side', (stage) => {
    for (const w of longest(stage)) {
      const parts = blendParts(wordOf(w))
      const { container } = render(h(BlendWord, { parts, lit: [] }))
      const texts = [...container.querySelectorAll('[data-part] text')] as SVGTextElement[]
      const spans = texts.map((t) => ({ l: Number(t.getAttribute('x')) - measureText(t.textContent!, sizeOf(t)) / 2, r: Number(t.getAttribute('x')) + measureText(t.textContent!, sizeOf(t)) / 2 }))
      expect(spans[0].l, w).toBeGreaterThanOrEqual(480)
      expect(spans[spans.length - 1].r, w).toBeLessThanOrEqual(480 + 640)
      spans.slice(1).forEach((s, i) => expect(s.l, w).toBeGreaterThanOrEqual(spans[i].r - 0.5))
    }
  })
})

describe('the spell book', () => {
  // Task 22's carry-over: the boxes on the book's page (at most 5: j u m p ing), measured in the drawn box width, and the
  // tiles; on the smallest phone a letter in a box is still at least 16 CSS px high
  const spellBox = (text: string): SpellBox => ({ unit: text, text, soundId: `snd-${text}` })
  const drawSpell = (boxes: SpellBox[], tiles: SpellBox[]) => render(h(SpellBook, {
    view: { screen: 'spell', round: { word: 'w', wordVoice: 'w-w', boxes, tiles, mode: 'tiles' }, filled: boxes.map((b) => b.unit), alive: false },
    phase: 'answer', dir: 'ltr', onDrop: () => {},
  })).container
  const spelled = WORDS.filter((w) => w.kind !== 'picture-only' && w.units.length <= 5)
  it('jumping is a word of five boxes, the most the page is sized for', () => {
    expect(boxesOf('jumping').map((b) => b.text)).toEqual(['j', 'u', 'm', 'p', 'ing'])
    const { xs, w } = spellBoxes(5, 'ltr', false)
    expect(xs[0] - w / 2).toBeGreaterThan(800)
    expect(xs[4] + w / 2).toBeLessThan(1500)
  })
  // the units of the words of n boxes, n at a time (a box's width depends only on how many boxes the word has)
  const rows = [1, 2, 3, 4, 5].flatMap((n) => {
    const texts = [...new Set(spelled.filter((w) => w.units.length === n).flatMap((w) => boxesOf(w.text).map((b) => b.text)))]
    return Array.from({ length: Math.ceil(texts.length / n) }, (_, i) => {
      const row = texts.slice(i * n, i * n + n)
      while (row.length < n) row.push(texts[0])
      return row
    })
  })
  it.each(SIZES)('at %i×%i every box of every word of up to 5 boxes holds its unit', (sw, sh) => {
    const scale = stageBox(sw, sh, STAGE_CONTENT_TOP.spell).scale
    expect(rows.some((r) => r.length === 5 && r.includes('ing'))).toBe(true)
    for (const row of rows) {
      const { w: bw } = spellBoxes(row.length, 'ltr', false)
      const texts = [...drawSpell(row.map(spellBox), []).querySelectorAll('[data-box] text')] as SVGTextElement[]
      expect(texts).toHaveLength(row.length)
      for (const t of texts) {
        expect(measureText(t.textContent!, sizeOf(t)) * scale, `${row.length} boxes: ${t.textContent}`).toBeLessThanOrEqual(bw * scale * IN_RECT)
        expect(sizeOf(t) * scale, `${row.length} boxes: ${t.textContent}`).toBeGreaterThanOrEqual(16)
      }
    }
  })
  it('every unit fits its tile', () => {
    const tiles = [...new Set(UNITS.map((u) => u.text.replace(/^-/, '')))].map(spellBox)
    for (let i = 0; i < tiles.length; i += 6) {
      const shown = [...drawSpell([spellBox('a')], tiles.slice(i, i + 6)).querySelectorAll('[data-tile] text')] as SVGTextElement[]
      shown.forEach((t) => expect(measureText(t.textContent!, sizeOf(t)), t.textContent!).toBeLessThanOrEqual(SPELL_TILE * IN_ROUND))
    }
  })
})
