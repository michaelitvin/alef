import { cleanup, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { EnglishCard, EnglishPath } from './EnglishCard'
import { englishStationStates } from './englishStations'
import { englishDoorsPlayable } from '../../spellquest/english/doorsPlayable'
import { useEnglishStore } from '../../spellquest/english/store'
import { englishSavePort } from '../../spellquest/english/savePort'
import { clearGender } from '../../shared/player'

const HEBREW = /[֐-׿]/

describe('the English card (English path design, Part 1)', () => {
  beforeEach(() => { localStorage.clear(); useEnglishStore.getState().resetProgress() })
  afterEach(() => { cleanup(); clearGender() })

  it('the picture on the left, the play button on the right pointing right; three orbs a, sh, m in Andika', () => {
    const { container } = render(<EnglishCard />)
    const card = container.querySelector('.home-card-en')!
    // the order in the card (left to right): the picture, the orbs, the play column
    expect([...card.children].map((e) => e.className)).toEqual(['home-card-art', 'home-orbs', 'home-pcol'])
    expect([...container.querySelectorAll('.home-card-orb span')].map((e) => e.textContent)).toEqual(['a', 'sh', 'm'])
    const d = container.querySelector('[data-tri]')!.getAttribute('d')!
    const xs = [...d.matchAll(/[ML]\s*(\d+)/g)].map((m) => Number(m[1]))
    expect(Math.max(...xs)).toBeGreaterThan(65)
    expect(xs.filter((x) => x < 45).length).toBe(2)
  })

  it('no Hebrew, and no emoji; the parent line is marked as parent text', () => {
    const { container } = render(<EnglishCard />)
    expect(container.textContent).not.toMatch(HEBREW)
    expect(container.innerHTML).not.toMatch(/\p{Extended_Pictographic}/u)
    expect(container.querySelector('[data-learn="spellquest-en"]')!.hasAttribute('data-parent-text')).toBe(true)
  })

})

describe('English Spell Quest', () => {
  beforeEach(() => { localStorage.clear(); useEnglishStore.getState().resetProgress() })
  afterEach(cleanup)

  it('runs left to right with the captions of the design, marked as parent text, and no Hebrew', () => {
    englishSavePort().setStage(5)
    const { container } = render(<EnglishPath stations={englishStationStates(englishDoorsPlayable)} />)
    const path = container.querySelector('[data-path]')!
    expect(path.getAttribute('dir')).toBe('ltr')
    const caps: Record<string, Element> = Object.fromEntries([...path.querySelectorAll('[data-station]')].map((e) => [e.getAttribute('data-station'), e.querySelector('.home-cap')!]))
    expect(Object.fromEntries(Object.entries(caps).map(([k, v]) => [k, v.textContent]))).toEqual({
      tower: 'letter sounds', broom: 'sounds by ear', ghosts: 'look-alikes', cauldron: 'the missing sound', ladder: 'word chains',
      doors: 'reading words', spell: 'spelling', draw: 'writing letters',
    })
    for (const c of Object.values(caps)) expect(c.hasAttribute('data-parent-text')).toBe(true)
    expect(path.textContent).not.toMatch(HEBREW)
    expect(path.querySelector('[data-pic="orb"]')!.textContent).toBe('m')
    expect(path.querySelector('[data-pic="glyph"]')!.textContent).toBe('a')
  })

  it('the wizard stands at the newest open reading station', () => {
    const { container } = render(<EnglishPath stations={englishStationStates(englishDoorsPlayable)} />)
    expect(container.querySelectorAll('[data-wizard]').length).toBe(1)
    expect(container.querySelector('[data-wizard]')!.closest('[data-station]')!.getAttribute('data-station')).toBe('doors')
  })
})
