import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { WalkingMonster } from './Monster'
import { markById } from '../../utils/duel/marks'
import { wordsFor } from '../../utils/duel/words'
import type { Round } from '../../types/duel'

const r = (monster: string, boss: boolean): Round => ({
  id: 1, type: 'A', target: markById('segol'), runes: [], word: wordsFor('e')[0], padWords: [], monster, boss, walkMs: 8000,
})
const show = (round: Round) => render(<WalkingMonster round={round} walking startX={84} endX={30} bossHp={5} onReplay={() => {}} remainingMs={8000} />)

describe('bosses do something distinct', () => {
  it('a boss glows with an aura and stomps (dust at its feet); ordinary monsters do not', () => {
    const boss = show(r('dragon', true)).container
    expect(boss.querySelector('.nd-boss-aura')).toBeTruthy()
    expect(boss.querySelector('.nd-boss-dust')).toBeTruthy()
    const plain = show(r('fuzzy', false)).container
    expect(plain.querySelector('.nd-boss-aura')).toBeNull()
  })
  it('each boss has its own move: the dragon breathes fire, the troll stomps up dust clouds', () => {
    expect(show(r('dragon', true)).container.querySelector('.nd-dragon-fire')).toBeTruthy()
    const troll = show(r('troll', true)).container
    expect(troll.querySelector('.nd-troll-stomp')).toBeTruthy()
    expect(troll.querySelector('.nd-dragon-fire')).toBeNull()
  })
})
