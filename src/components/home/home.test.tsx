import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PlayButton } from './PlayButton'
import { Separator } from './Separator'
import { LevelIcon, LockBadge, type LevelKind } from './LevelIcons'

const EMOJI = /\p{Extended_Pictographic}/u
const KINDS: LevelKind[] = ['letters', 'nikkud', 'syllables', 'words', 'sentences', 'stories']

describe('home parts (spec: one duel, Part 4)', () => {
  it('the play button points left', () => {
    for (const theme of ['duel', 'clock'] as const) {
      const { container, unmount } = render(<PlayButton theme={theme} />)
      const d = container.querySelector('[data-tri]')!.getAttribute('d')!
      const xs = [...d.matchAll(/[ML]\s*(\d+)/g)].map((m) => Number(m[1]))
      // the tip (the smallest x) is on the left; the base (two points with the same, larger x) on the right
      expect(Math.min(...xs)).toBeLessThan(35)
      expect(xs.filter((x) => x > 55).length).toBe(2)
      if (theme === 'duel') expect(d.startsWith('M59')).toBe(true)
      unmount()
    }
  })

  it('two play buttons on one page keep their own gradients', () => {
    const { container } = render(<><PlayButton theme="duel" /><PlayButton theme="clock" /></>)
    const ids = [...container.querySelectorAll('radialGradient, linearGradient')].map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('level icons and the lock are SVG, never emoji', () => {
    const { container } = render(<div>{KINDS.map((k) => <LevelIcon key={k} kind={k} />)}<LockBadge /><Separator /></div>)
    expect(container.textContent ?? '').not.toMatch(EMOJI)
    expect(container.querySelector('[data-level-icon="letters"]')!.textContent).toBe('א')
    expect(container.querySelector('[data-level-icon="nikkud"]')!.textContent).toBe('בָ')
    expect(container.querySelector('[data-level-icon="syllables"]')!.textContent).toBe('בָּ')
    for (const k of ['words', 'sentences', 'stories']) expect(container.querySelector(`[data-level-icon="${k}"] svg`)).not.toBeNull()
    expect(container.querySelector('svg[data-lock]')).not.toBeNull()
    expect(container.querySelector('[data-home-part="separator"] svg')).not.toBeNull()
  })
})
