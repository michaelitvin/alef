import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Battlefield } from './Battlefield'
import { markById } from '../../utils/duel/marks'
import { wordsFor } from '../../utils/duel/words'
import type { Round } from '../../types/duel'

const r = (monster: string): Round => ({
  id: 1, type: 'A', target: markById('kamatz'), runes: [], word: wordsFor('a')[0], padWords: [], monster, boss: false, walkMs: 9000,
})

describe('Battlefield', () => {
  it('mirrors right-facing monsters only', () => {
    const { container, rerender } = render(<Battlefield round={r('ghost')} outcome={null} walking paused={false} landscape={false} banner={null} />)
    expect((container.querySelector('.nd-sprite') as HTMLElement).style.transform).toBe('scaleX(-1)')
    rerender(<Battlefield round={r('imp')} outcome={null} walking paused={false} landscape={false} banner={null} />)
    expect((container.querySelector('.nd-sprite') as HTMLElement).style.transform).toBe('')
  })
  it('shows the time bar only while walking and not paused', () => {
    const { container, rerender } = render(<Battlefield round={r('imp')} outcome={null} walking={false} paused={false} landscape={false} banner={null} />)
    expect(container.querySelector('.nd-timebar')).toBeNull()
    rerender(<Battlefield round={r('imp')} outcome={null} walking paused={false} landscape={false} banner={null} />)
    expect(container.querySelector('.nd-timebar')).not.toBeNull()
    rerender(<Battlefield round={r('imp')} outcome={null} walking paused landscape={false} banner={null} />)
    expect(container.querySelector('.nd-timebar')).toBeNull()
  })
  it('shows the wizard pose for the outcome and an explosion on hits', () => {
    const hit = { kind: 'hit' as const, choiceKey: 'kamatz', mega: false, final: true, points: 100, effect: 'boom' as const }
    const { container } = render(<Battlefield round={r('imp')} outcome={hit} walking paused={false} landscape={false} banner={null} />)
    expect(container.querySelector('.nd-wizard')!.getAttribute('src')).toContain('wizard-cast')
    expect(container.querySelector('.nd-blast')).not.toBeNull()
  })
  it('re-measures on window resize without throwing (rotation)', () => {
    render(<Battlefield round={r('imp')} outcome={null} walking paused={false} landscape={false} banner={null} />)
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow()
  })
})
