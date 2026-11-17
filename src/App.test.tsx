// The first duel's own page (#/duel) is gone: it is Book 2's tower now. An old link or bookmark must land on the home
// screen, because a HashRouter with no matching route shows a blank page. The child's progress page (#/progress) is gone
// too: its stats are the parent's, in the parent area.
import { afterEach, describe, expect, it } from 'vitest'
import { act, render } from '@testing-library/react'
import App from './App'
import { useProgressStore } from './stores/progressStore'

describe('App routes', () => {
  afterEach(() => { window.location.hash = '' })
  it.each(['#/duel', '#/duel/glyphs', '#/progress'])('%s goes to the home screen', async (hash) => {
    window.location.hash = hash
    const { container } = render(<App />)
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    expect(window.location.hash).toBe('#/')
    expect(container.innerHTML).not.toBe('')
  })
})

describe('dev mode shortcuts', () => {
  afterEach(() => { window.location.hash = ''; useProgressStore.getState().setDevMode(false) })
  it('outside production, ?devMode=true and Ctrl+Shift+D switch dev mode', async () => {
    window.location.hash = '#/?devMode=true'
    render(<App />)
    await act(async () => { await new Promise((r) => setTimeout(r, 0)) })
    expect(useProgressStore.getState().settings.devMode).toBe(true)
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'D', ctrlKey: true, shiftKey: true })) })
    expect(useProgressStore.getState().settings.devMode).toBe(false)
  })
})
