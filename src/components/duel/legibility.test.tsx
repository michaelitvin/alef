import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SpellPad } from './SpellPad'
import { ResultBanner } from './ResultBanner'
import { DuelHud } from './DuelHud'
import { Clue } from './Clue'
import { DUEL_MARKS } from '../../utils/duel/marks'
import { wordsFor } from '../../utils/duel/words'
import type { Round, SoundGroup } from '../../types/duel'

const LETTERS = /[A-Za-zא-ת]/ // Latin or Hebrew letters (nikkud marks are not letters)
const EMOJI = /\p{Extended_Pictographic}/u
const GROUPS: SoundGroup[] = ['a', 'e', 'i', 'o', 'u', 'silent']

describe('child UI has no writing and no emoji', () => {
  it('clue, pad, banner and HUD render no letters or emoji for every screen and mark', () => {
    for (const type of ['A', 'B', 'C', 'D'] as const) {
      for (const m of DUEL_MARKS) {
        const r: Round = {
          id: 1, type, target: m, runes: type === 'D' ? [] : [m], word: wordsFor(m.group)[0],
          padWords: type === 'D' ? GROUPS.map((g) => wordsFor(g)[0]) : [], monster: 'fuzzy', boss: false, walkMs: 9000,
        }
        const { container, unmount } = render(
          <>
            <Clue round={r} onReplay={() => {}} />
            <SpellPad round={r} outcome={null} twinTried={null} oneRow={false} onChoose={() => {}} showTestHooks={false} />
            <ResultBanner mark={m} word={r.word} kind="hit" />
            <DuelHud hearts={2} score={1234} combo={3} mega={4} megaMax={8} kills={2} killsPerWave={5} onPause={() => {}} />
          </>,
        )
        const text = container.textContent ?? ''
        expect(text, `${type}/${m.id}`).not.toMatch(LETTERS)
        expect(text, `${type}/${m.id}`).not.toMatch(EMOJI)
        unmount()
      }
    }
  })
})
