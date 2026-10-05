import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { StartCover } from './StartCover'
import { PauseCover } from './PauseCover'
import { RunSummary } from './RunSummary'
import { markById } from '../../utils/duel/marks'

describe('duel covers', () => {
  it('the start cover is opaque, so the tower wizard behind it does not show (one wizard on screen)', () => {
    const { container } = render(<StartCover onPlay={() => {}} musicOn onToggleMusic={() => {}} onParent={() => {}} onHome={() => {}} />)
    expect(container.querySelector('.nd-overlay')!.className).toContain('nd-opaque')
    expect(container.querySelectorAll('img')).toHaveLength(1)
  })
  it('every cover has a home button (a way out without the system back gesture)', () => {
    const onHome = vi.fn()
    const { unmount } = render(<StartCover onPlay={() => {}} musicOn onToggleMusic={() => {}} onParent={() => {}} onHome={onHome} />)
    fireEvent.click(screen.getByRole('button', { name: 'home' }))
    unmount()
    const p = render(<PauseCover onResume={() => {}} onHome={onHome} />)
    fireEvent.click(screen.getByRole('button', { name: 'home' }))
    p.unmount()
    render(<RunSummary wave={3} score={900} bestCombo={4} best={900} newBest missed={[markById('segol')]} onSay={() => {}} onReplay={() => {}} onHome={onHome} />)
    fireEvent.click(screen.getByRole('button', { name: 'home' }))
    expect(onHome).toHaveBeenCalledTimes(3)
  })
  it('a new record shows the trophy with the score, and the sparkle only once (score)', () => {
    const { container } = render(
      <RunSummary wave={3} score={900} bestCombo={4} best={900} newBest missed={[]} onSay={() => {}} onReplay={() => {}} onHome={() => {}} />,
    )
    expect(container.querySelectorAll('svg[data-icon="sparkle"]')).toHaveLength(1)
    const trophyRow = container.querySelector('svg[data-icon="trophy"]')!.parentElement!
    expect(trophyRow.textContent).toContain('900')
    expect(trophyRow.className).toContain('nd-new-best')
  })
})
