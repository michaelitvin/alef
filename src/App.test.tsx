// The first duel's own page (#/duel) is gone: it is Book 2's tower now. An old link or bookmark must land on the home
// screen, because a HashRouter with no matching route shows a blank page.
import { afterEach, describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import App from './App'

describe('App routes', () => {
  afterEach(() => { window.location.hash = '' })
  it.each(['#/duel', '#/duel/glyphs'])('%s goes to the home screen', async (hash) => {
    window.location.hash = hash
    const { container } = render(<App />)
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    expect(window.location.hash).toBe('#/')
    expect(container.innerHTML).not.toBe('')
  })
})
