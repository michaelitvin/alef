// The English tower on the duel's board: the monster's sign shows the round's own picture, the result banner its Latin
// rune and that picture, and no Hebrew picture word stands in for a missing one.
import { describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { Battlefield } from '../components/duel/Battlefield'
import { seeded } from '../duel2/testing/runHarness'
import { WORD_PICTURE } from '../assets/duel/sprites'
import { memoryEnglishSavePort } from './savePort'
import { enTowerRound } from './logic/tower'

const save = memoryEnglishSavePort({ stage: { stage: 3, newAnswers: '' } })
const opts = { id: 1, wave: 1, kills: 1, boss: false, rng: seeded(3), lifetime: {} }
const fox = enTowerRound({ save: () => save, picture: (k) => (k === 'fox' ? 'fox.webp' : undefined), voice: () => false }, opts, { kind: 'letter', unit: 'x' })
const hit = { kind: 'hit' as const, choiceKey: 'x', mega: false, final: true, points: 100, effect: 'boom' as const }

describe('the English tower on the board', () => {
  it('the monster\'s sign shows the round\'s picture', () => {
    const { container } = render(<Battlefield round={fox} outcome={null} walking paused={false} landscape={false} banner={null} />)
    expect(container.querySelector('.nd-clue-sign img')!.getAttribute('src')).toBe('fox.webp')
  })

  it('the result banner shows the Latin rune and the round\'s picture', () => {
    const { container } = render(<Battlefield round={fox} outcome={hit} walking paused={false} landscape={false} banner={null} />)
    const banner = container.querySelector('.nd-resolve')!
    expect(banner.querySelector('.nd-rune-text')!.textContent).toBe('x')
    expect(banner.querySelector('img')!.getAttribute('src')).toBe('fox.webp')
  })

  it('a round with no picture file shows no Hebrew picture word in its place', () => {
    // a sound round whose example word (tent) is also the name of a Hebrew picture word
    const t = enTowerRound({ save: () => save, picture: () => undefined, voice: () => false }, opts, { kind: 'letter', unit: 't' })
    expect(t.type).toBe('B')
    expect(WORD_PICTURE[t.word.key]).toBeDefined()
    const { container } = render(<Battlefield round={t} outcome={hit} walking paused={false} landscape={false} banner={null} />)
    expect(container.querySelector('.nd-resolve img')).toBeNull()
  })
})
