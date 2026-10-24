import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Glyph, inkOffset, type Measurer } from './Glyph'

describe('Glyph', () => {
  it('centers the ink box', () => {
    const m: Measurer = () => ({ left: 40, right: 60, ascent: 80, descent: 20 })
    expect(inkOffset(m('x', 100), 100)).toEqual({ dx: -10, dy: 30 })
    const { container } = render(<svg><Glyph text="בָּ" px={100} x={500} y={400} measurer={m} /></svg>)
    const t = container.querySelector('text[data-glyph]')!
    expect(Number(t.getAttribute('x'))).toBe(490)
    expect(Number(t.getAttribute('y'))).toBe(430)
  })
  it('falls back to line-box centering without a measurer', () => {
    expect(inkOffset(null, 100)).toEqual({ dx: 0, dy: 35 })
    const { container } = render(<svg><Glyph text="ל" px={100} x={10} y={10} measurer={() => null} /></svg>)
    expect(Number(container.querySelector('text')!.getAttribute('y'))).toBe(45)
  })
  it('glyphs have a dark outline so dots show on light places', () => {
    const { container } = render(<svg><Glyph text="בֹ" px={100} x={0} y={0} measurer={() => null} /></svg>)
    const t = container.querySelector('text')!
    expect(t.style.stroke).not.toBe('')
    expect(t.style.paintOrder).toBe('stroke')
  })
  it('glyph text is isolated RTL', () => {
    const { container } = render(<svg><Glyph text="מוֹ" px={80} x={0} y={0} measurer={() => null} /></svg>)
    const t = container.querySelector('text')!
    expect(t.getAttribute('direction')).toBe('rtl')
    expect(t.textContent).toBe('מוֹ')
  })
  it('draws the shin and sin dots itself, apart from the letter (Sigalit fuses the shin dot into the arm: שׁ looked like ن)', () => {
    const base = (t: string) => [...t].filter((c) => !/[\u0591-\u05C7]/.test(c)).length
    const m: Measurer = (t, px) => ({ left: base(t) * 0.3 * px, right: base(t) * 0.3 * px, ascent: 0.7 * px, descent: 0, width: base(t) * 0.6 * px })
    // ש is the first (rightmost) of two letters: its box is x 500–560
    const shin = render(<svg><Glyph text={'שׁוּ'.normalize('NFC')} px={100} x={500} y={400} measurer={m} /></svg>)
    expect(shin.container.querySelector('text')!.textContent).not.toMatch(/[\u05C1\u05C2]/)
    expect(Number(shin.container.querySelector('[data-shin-dot]')!.getAttribute('cx'))).toBeGreaterThan(545)
    const sin = render(<svg><Glyph text={'שׂוּ'.normalize('NFC')} px={100} x={500} y={400} measurer={m} /></svg>)
    const cx = Number(sin.container.querySelector('[data-shin-dot]')!.getAttribute('cx'))
    expect(cx).toBeGreaterThan(500)
    expect(cx).toBeLessThan(515)
    // a word: the dot follows its ש
    const word = render(<svg><Glyph text={'שׁוּעָל'.normalize('NFC')} px={100} x={500} y={400} measurer={m} /></svg>)
    expect(word.container.querySelectorAll('[data-shin-dot]').length).toBe(1)
  })
  it('without a measurer the shin keeps its own dot', () => {
    const { container } = render(<svg><Glyph text={'שׁ'.normalize('NFC')} px={100} x={0} y={0} measurer={() => null} /></svg>)
    expect(container.querySelector('text')!.textContent).toMatch(/\u05C1/)
    expect(container.querySelector('[data-shin-dot]')).toBeNull()
  })

  it('syllables of one word share a baseline (a mark below must not lift its letter: the parent saw the door word jump)', () => {
    // a mark below adds descent: alone, each syllable would be centred on its own ink and sit at a different height
    const m: Measurer = (t) => ({ left: 30, right: 30, ascent: 70, descent: /[\u05B8\u05B7\u05B4\u05B5\u05B6\u05BB]/.test(t) ? 30 : 0, width: 60 })
    const word = 'שׁוּעָל'.normalize('NFC')
    const a = render(<svg><Glyph text={'שׁוּ'.normalize('NFC')} px={100} x={880} y={340} measurer={m} lineOf={word} /></svg>)
    const b = render(<svg><Glyph text={'עָל'.normalize('NFC')} px={100} x={700} y={340} measurer={m} lineOf={word} /></svg>)
    expect(a.container.querySelector('text')!.getAttribute('y')).toBe(b.container.querySelector('text')!.getAttribute('y'))
  })

})
