import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExplainPlayer } from './ExplainPlayer'

describe('ExplainPlayer', () => {
  it('glows the short hand on its cue and shows the caption', () => {
    const { container } = render(<ExplainPlayer id="hands" lang="en" script="small" word={4} cues={['short']} fallback={{ h: 3, m: 0 }} size={400} />)
    expect(container.querySelector('[data-hand="hour"]')!.getAttribute('data-glow')).toBe('on')
    // the halo sits under the numerals, so a numeral under the glowing hand stays dark
    const svg = container.querySelector('svg')!
    const halo = svg.querySelector('[data-halo="hour"]')!
    expect(halo.compareDocumentPosition(svg.querySelector('[data-num="12"]')!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(container.querySelector('[data-caption]')!.textContent).toContain('short')
  })
  it('half fills the right half and moves the long hand to 6', () => {
    const { container } = render(<ExplainPlayer id="level-2" lang="he" script="print" word={6} cues={['half']} fallback={{ h: 3, m: 0 }} size={400} />)
    expect(container.querySelector('[data-hand="minute"]')!.getAttribute('style')).toContain('rotate(180deg)')
  })
  it('the digital explanation shows both clocks from the start; the digital card glows when it is named', () => {
    const before = render(<ExplainPlayer id="ex-digital" lang="en" script="small" word={0} cues={[]} fallback={{ h: 3, m: 45 }} size={400} />)
    expect(before.container.querySelector('[data-face]') ?? before.container.querySelector('svg')).not.toBeNull()
    expect(before.container.querySelector('[data-digital]')!.className).not.toContain('glow')
    before.unmount()
    const named = render(<ExplainPlayer id="ex-digital" lang="en" script="small" word={4} cues={['digital']} fallback={{ h: 3, m: 45 }} size={400} />)
    expect(named.container.querySelector('[data-digital]')!.className).toContain('glow')
    named.unmount()
  })
  it('digital cue shows a digital card', () => {
    const { container } = render(<ExplainPlayer id="ex-digital" lang="en" script="small" word={4} cues={['digital']} fallback={{ h: 3, m: 45 }} size={400} />)
    expect(container.querySelector('[data-digital]')!.textContent).toBe('3:45')
  })
  it('quarter to shows its own time from the first word', () => {
    const { container } = render(<ExplainPlayer id="level-4" lang="he" script="print" word={0} cues={[]} fallback={{ h: 3, m: 0 }} size={400} />)
    const minute = container.querySelector('[data-hand="minute"]') as HTMLElement
    expect(minute.getAttribute('style') ?? '').toContain('270deg')
  })
  it('"ten to four": the long hand turns forward from 12 to 10, not back', () => {
    const props = { id: 'level-6' as const, lang: 'en' as const, script: 'small' as const, fallback: { h: 3, m: 0 }, size: 400 }
    const { container, rerender } = render(<ExplainPlayer {...props} word={0} cues={[]} />)
    rerender(<ExplainPlayer {...props} word={2} cues={['to']} />)
    const minute = container.querySelector('[data-hand="minute"]') as HTMLElement
    expect(minute.getAttribute('style') ?? '').toContain('rotate(300deg)')
  })
  it('"each number is five minutes" counts up from 12', () => {
    const { container } = render(<ExplainPlayer id="level-5" lang="en" script="small" word={0} cues={[]} fallback={{ h: 3, m: 0 }} size={400} />)
    expect((container.querySelector('[data-hand="minute"]') as HTMLElement).getAttribute('style') ?? '').toContain('rotate(0deg)')
  })
})
