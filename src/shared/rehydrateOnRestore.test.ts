import { afterEach, describe, expect, it } from 'vitest'
import { useProgressStore } from '../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../types/progress'
import { rehydrateOnRestore } from './rehydrateOnRestore'

const pageshow = (persisted: boolean) => {
  const e = new Event('pageshow') as Event & { persisted: boolean }
  Object.defineProperty(e, 'persisted', { value: persisted })
  window.dispatchEvent(e)
}

describe('a page restored from the back/forward cache reads the saves again', () => {
  let off = () => {}
  afterEach(() => { off(); localStorage.clear() })

  it('the progress store takes what another page (Book 2’s tower) saved meanwhile, so a later write cannot undo it', async () => {
    useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
    off = rehydrateOnRestore(useProgressStore)
    // Book 2's page saved his tower answers while this page waited in the cache
    const saved = JSON.parse(localStorage.getItem('alef-progress')!)
    saved.state.duel = { ...saved.state.duel, recent: { kamatz: 'ooxo' } }
    localStorage.setItem('alef-progress', JSON.stringify(saved))
    pageshow(false)
    expect(useProgressStore.getState().duel.recent?.kamatz).toBeUndefined()
    pageshow(true)
    await Promise.resolve()
    expect(useProgressStore.getState().duel.recent?.kamatz).toBe('ooxo')
  })
})
