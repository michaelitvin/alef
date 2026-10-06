import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent } from '@testing-library/react'
import { Clue } from './Clue'
import { markById } from '../../utils/duel/marks'
import { wordsFor } from '../../utils/duel/words'
import type { Round } from '../../types/duel'

const round = (type: Round['type']): Round => ({
  id: 1, type, target: markById('segol'), runes: [], word: wordsFor('e')[0], padWords: [], monster: 'fuzzy', boss: false, walkMs: 9000,
})

describe('Clue bubble', () => {
  for (const type of ['A', 'B', 'C'] as const) {
    it(`${type}: a finger touching the bubble replays its clue at once (no need for a clean click on a walking target)`, () => {
      const onReplay = vi.fn()
      const { container } = render(<Clue round={round(type)} onReplay={onReplay} />)
      const b = container.querySelector('.nd-clue')!
      fireEvent.pointerDown(b)
      expect(onReplay).toHaveBeenCalledTimes(1)
      fireEvent.click(b) // the click that follows the same touch must not replay a second time
      expect(onReplay).toHaveBeenCalledTimes(1)
    })
  }
  it('keyboard activation (click without a pointer) still replays', () => {
    const onReplay = vi.fn()
    const { container } = render(<Clue round={round('B')} onReplay={onReplay} />)
    fireEvent.click(container.querySelector('.nd-clue')!)
    expect(onReplay).toHaveBeenCalledTimes(1)
  })
})
