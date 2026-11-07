// spec 2026-11-07 girls: a girl sees her wizard everywhere the boy's would be
import { render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { Broom } from './Broom'
import { Ladder } from './Ladder'
import { Ghosts } from './Ghosts'
import { Cover } from '../../screens/Cover'
import { PauseCover } from '../../screens/PauseCover'
import { Duel2EntryCard } from '../../../components/duel2/Duel2EntryCard'
import { syllable } from '../../logic/content'
import { syllableChoice } from '../../logic/rounds'
import { clearGender, setGender } from '../../../shared/player'

const wave = [syllableChoice(syllable('bet', 'kamatz')), syllableChoice(syllable('lamed', 'chirik'))]
const hrefs = (root: Element) => [...root.querySelectorAll('image, img')].map((e) => e.getAttribute('href') ?? e.getAttribute('src') ?? '')
  .filter((h) => /wiz/.test(h))

describe('the girl wizard (Book 2)', () => {
  afterEach(() => clearGender())
  const screens = () => [
    render(<Broom waves={[]} travelMs={5000} lane={1} onLane={() => {}} phase="answer" clock={() => 0} />).container,
    render(<Broom waves={[]} travelMs={5000} lane={1} onLane={() => {}} phase="mistake" clock={() => 0} />).container,
    render(<Ladder built={[]} plates={wave} rungs={5} onPick={() => {}} phase="answer" />).container,
    render(<Ghosts signs={wave} onPick={() => {}} phase="answer" />).container,
    render(<Cover onPlay={() => {}} onParent={() => {}} />).container,
    render(<PauseCover onPlay={() => {}} />).container,
    render(<Duel2EntryCard />).container,
  ]
  it('a girl sees only girl wizard pictures', () => {
    setGender('girl', 'child')
    for (const c of screens()) {
      const h = hrefs(c)
      expect(h.length).toBeGreaterThan(0)
      for (const x of h) expect(x).toMatch(/-girl/)
    }
  })
  it('a boy (and an unset setting) sees the boy wizard', () => {
    for (const g of ['boy', null] as const) {
      if (g) setGender(g, 'parent'); else clearGender()
      for (const c of screens()) for (const x of hrefs(c)) expect(x).not.toMatch(/-girl/)
    }
  })
})
