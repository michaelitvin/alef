// spec 2026-11-07 girls: a girl sees her wizard everywhere the boy's would be (the nikkud duel)
import { afterEach, describe, expect, it } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Battlefield } from './Battlefield'
import { StartCover } from './StartCover'
import { PauseCover } from './PauseCover'
import { RunSummary } from './RunSummary'
import { DuelEntryCard } from './DuelEntryCard'
import { markById } from '../../utils/duel/marks'
import { wordsFor } from '../../utils/duel/words'
import type { Round } from '../../types/duel'
import { clearGender, setGender } from '../../shared/player'

const round: Round = { id: 1, type: 'A', target: markById('kamatz'), runes: [], word: wordsFor('a')[0], padWords: [], monster: 'ghost', boss: false, walkMs: 9000 }
const wizards = (root: Element) => [...root.querySelectorAll('img')].map((i) => i.getAttribute('src') ?? '').filter((s) => /wizard/.test(s))

describe('the girl wizard (nikkud duel)', () => {
  afterEach(() => clearGender())
  const screens = () => [
    render(<Battlefield round={round} outcome={null} walking paused={false} landscape={false} banner={null} />).container,
    render(<Battlefield round={round} outcome={{ kind: 'miss' } as never} walking={false} paused={false} landscape={false} banner={null} />).container,
    render(<StartCover onPlay={() => {}} musicOn onToggleMusic={() => {}} onParent={() => {}} onHome={() => {}} />).container,
    render(<PauseCover onResume={() => {}} onHome={() => {}} />).container,
    render(<RunSummary wave={3} score={900} bestCombo={4} best={900} newBest={false} missed={[]} onSay={() => {}} onReplay={() => {}} onHome={() => {}} />).container,
    render(<MemoryRouter><DuelEntryCard /></MemoryRouter>).container,
  ]
  it('a girl sees only the girl wizard', () => {
    setGender('girl', 'child')
    for (const c of screens()) {
      const w = wizards(c)
      expect(w.length).toBeGreaterThan(0)
      for (const s of w) expect(s).toMatch(/-girl/)
    }
  })
  it('a boy and an unset setting see the boy wizard', () => {
    setGender('boy', 'parent')
    for (const c of screens()) for (const s of wizards(c)) expect(s).not.toMatch(/-girl/)
    clearGender()
    for (const c of screens()) for (const s of wizards(c)) expect(s).not.toMatch(/-girl/)
  })
})
