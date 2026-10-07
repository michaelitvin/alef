import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Explosion } from './Explosion'
import { markById } from '../../utils/duel/marks'
import { wordsFor } from '../../utils/duel/words'
import type { Round } from '../../types/duel'
import { PALETTES } from '../../utils/duel/fxStyle'

const round: Round = { id: 1, type: 'A', target: markById('segol'), runes: [], word: wordsFor('e')[0], padWords: [], monster: 'fuzzy', boss: false, walkMs: 8000 }
const geo = { start: 84, end: 30, wizLeft: 20, wizBottom: 40 }

describe('Explosion follows the chosen style', () => {
  it('projectile, burst, exit and palette come from the style', () => {
    const fx = { projectile: 'iceshard', burst: 'confetti', exit: 'launch', palette: 'ice', cast: 'twirl' } as const
    const { container } = render(<Explosion round={round} outcome={{ kind: 'hit', choiceKey: 'segol', mega: false, final: true, points: 10, effect: 'boom' }} x={50} geo={geo} fx={fx} />)
    expect(container.querySelector('.nd-proj-iceshard')).toBeTruthy()
    expect(container.querySelector('[data-burst="confetti"]')).toBeTruthy()
    expect(container.querySelector('[data-exit="launch"]')).toBeTruthy()
    const colours = [...container.querySelectorAll('.nd-particle')].map((p) => (p as HTMLElement).style.background).filter(Boolean)
    expect(colours.length).toBeGreaterThan(0)
    const ice = PALETTES.ice.map((c) => c.toLowerCase())
    for (const c of colours) expect(ice.some((x) => c.toLowerCase().includes(x.replace('#', '')) || c.startsWith('rgb'))).toBe(true)
  })
})
