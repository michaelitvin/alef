// The hint card of a word that blends: its pieces left to right in Andika, the lit units, the spark under the unit lit
// last, and one line under a two-letter unit.
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BlendWord } from './BlendWord'

const FISH = [{ text: 'f', unit: 0 }, { text: 'i', unit: 1 }, { text: 'sh', unit: 2 }]
const CAKE = [{ text: 'c', unit: 0 }, { text: 'a', unit: 1 }, { text: 'k', unit: 2 }, { text: 'e', unit: 1 }]

const xOf = (g: Element) => Number(g.querySelector('text')!.getAttribute('x'))

describe('BlendWord', () => {
  it('draws the pieces left to right in Andika, and lights the units lit so far', () => {
    const { container } = render(<BlendWord parts={FISH} lit={[0, 1]} />)
    const parts = [...container.querySelectorAll('[data-part]')]
    expect(parts.map((g) => g.textContent)).toEqual(['f', 'i', 'sh'])
    expect(xOf(parts[0])).toBeLessThan(xOf(parts[1]))
    expect(xOf(parts[1])).toBeLessThan(xOf(parts[2]))
    expect(parts.map((g) => g.hasAttribute('data-lit'))).toEqual([true, true, false])
    expect((parts[0].querySelector('text') as SVGTextElement).style.fontFamily).toMatch(/Andika/)
  })

  it('one line under a two-letter unit only', () => {
    const { container } = render(<BlendWord parts={FISH} lit={[]} />)
    const lines = [...container.querySelectorAll('[data-pair]')]
    expect(lines).toHaveLength(1)
    expect(lines[0].closest('[data-part]')!.textContent).toBe('sh')
  })

  it('the spark sits under the unit lit last; none before the first light', () => {
    const none = render(<BlendWord parts={FISH} lit={[]} />)
    expect(none.container.querySelector('[data-spark]')).toBeNull()
    const { container } = render(<BlendWord parts={FISH} lit={[0, 1, 2]} />)
    const sh = container.querySelectorAll('[data-part]')[2]
    expect(Math.abs(Number(container.querySelector('[data-spark]')!.getAttribute('cx')) - xOf(sh))).toBeLessThan(1)
  })

  it('a silent e lights with its vowel', () => {
    const { container } = render(<BlendWord parts={CAKE} lit={[0, 1]} />)
    expect([...container.querySelectorAll('[data-part]')].map((g) => g.hasAttribute('data-lit'))).toEqual([true, true, false, true])
  })
})
