// English stays hidden on production until the parent has reviewed all nine stages (Task 36). Releasing is two edits
// on main (all nine in REVIEWED_STAGES, ENGLISH_RELEASED = true), checked on staging, then the fast-forward of `release`.
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'
import { ENGLISH_RELEASED } from './available'
import { REVIEWED_STAGES } from './content/ready'
installFakeAudio()

const importFresh = async () => {
  vi.resetModules()
  const [{ HomePage }, { default: Duel2App }, { GAMES }] = await Promise.all([
    import('../pages/Home/HomePage'), import('../spellquest/Duel2App'), import('../parent/registry'),
  ])
  return { HomePage, Duel2App, GAMES }
}

describe('hidden on production', () => {
  afterEach(() => { cleanup(); history.replaceState(null, '', '/'); vi.doUnmock('./available'); vi.resetModules() })

  it('released exactly when all nine stages are reviewed', () =>
    expect(ENGLISH_RELEASED).toBe([1, 2, 3, 4, 5, 6, 7, 8, 9].every((s) => REVIEWED_STAGES.includes(s))))

  it('a production build: no card, ?course=en opens Hebrew, no English section', async () => {
    vi.doMock('./available', () => ({ ENGLISH_AVAILABLE: false, ENGLISH_RELEASED: false, englishAvailable: () => false }))
    const { HomePage, Duel2App, GAMES } = await importFresh()
    const home = render(<MemoryRouter><HomePage /></MemoryRouter>)
    expect(home.container.querySelector('[data-english-card], [data-card="english"], [data-home-part="english-path"]')).toBeNull()
    cleanup()
    history.replaceState(null, '', '/duel2/?course=en')
    render(<Duel2App />)
    expect((await screen.findByTestId('cover')).getAttribute('data-course')).toBe('he')
    expect(GAMES.map((g) => g.id)).not.toContain('english')
  })
})
