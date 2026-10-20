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
})
