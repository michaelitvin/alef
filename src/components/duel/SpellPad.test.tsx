import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpellPad } from './SpellPad'
import { markById } from '../../utils/duel/marks'
import { wordsFor } from '../../utils/duel/words'
import type { Round, SoundGroup } from '../../types/duel'

const round: Round = {
  id: 1, type: 'C', target: markById('kamatz'),
  runes: [markById('kamatz'), markById('patach'), markById('segol'), markById('chirik')],
  word: wordsFor('a')[0], padWords: [], monster: 'fuzzy', boss: false, walkMs: 9000,
}

describe('SpellPad', () => {
  it('locked while the wizard explains the round: every mark is disabled', () => {
    const r: Round = { ...round, runes: [markById('kamatz'), markById('segol')] }
    const { container } = render(<SpellPad round={r} outcome={null} twinTried={null} oneRow={false} onChoose={() => {}} showTestHooks={false} locked />)
    const btns = [...container.querySelectorAll('button')]
    expect(btns.length).toBe(2)
    for (const b of btns) expect((b as HTMLButtonElement).disabled).toBe(true)
  })
  it('renders one button per rune and reports the choice', () => {
    const onChoose = vi.fn()
    render(<SpellPad round={round} outcome={null} twinTried={null} oneRow={false} onChoose={onChoose} showTestHooks />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    fireEvent.click(buttons[0])
    expect(onChoose).toHaveBeenCalledTimes(1)
    expect(buttons.filter((b) => b.getAttribute('data-correct') === '1')).toHaveLength(1)
  })
  it('marks the forgiven twin as almost, and reveals the answer after a miss', () => {
    const { rerender, container } = render(
      <SpellPad round={round} outcome={null} twinTried="patach" oneRow={false} onChoose={() => {}} showTestHooks={false} />,
    )
    expect(container.querySelectorAll('.nd-rune.almost')).toHaveLength(1)
    rerender(
      <SpellPad round={round} outcome={{ kind: 'miss', choiceKey: 'segol', mega: false, final: false, points: 0, effect: 'gentle' }}
        twinTried={null} oneRow={false} onChoose={() => {}} showTestHooks={false} />,
    )
    expect(container.querySelectorAll('.nd-rune.miss')).toHaveLength(1)
    expect(container.querySelectorAll('.nd-rune.reveal')).toHaveLength(1)
    expect(container.querySelector('[data-correct]')).toBeNull()
  })
  it('the D pad shows six pictures', () => {
    const groups: SoundGroup[] = ['a', 'e', 'i', 'o', 'u', 'silent']
    const d: Round = { ...round, type: 'D', runes: [], padWords: groups.map((g) => wordsFor(g)[0]) }
    const { container } = render(<SpellPad round={d} outcome={null} twinTried={null} oneRow onChoose={() => {}} showTestHooks={false} />)
    expect(container.querySelectorAll('img.nd-word-btn')).toHaveLength(6)
  })
})
