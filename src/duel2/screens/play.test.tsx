import { render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { View } from '../controller'

const { state } = vi.hoisted(() => ({ state: { view: null as unknown } }))
vi.mock('../useRun', () => ({
  useRun: () => ({ view: state.view, clock: () => 0, onGesture: () => {}, onNext: () => {}, onReplay: () => {}, onHint: () => {}, resume: () => {}, towerAnswer: () => {}, towerDone: () => {} }),
}))
import { Play } from './Play'

const base: View = { phase: 'answer', hearts: 1, screen: { screen: 'ghosts', signs: [], target: { id: 'x', soundId: 'x' } as never }, overlay: null, needNext: false, hintAvailable: false, paused: false, over: null, score: 0, mult: 1 }

describe('play', () => {
  it('the defeat scene hides the screen\'s own wizard: only the falling one is on the screen', async () => {
    state.view = base
    const a = render(<Play opts={{}} onOver={() => {}} />)
    expect(a.container.querySelector('[data-screen="play"]')!.hasAttribute('data-defeat')).toBe(false)
    a.unmount()
    state.view = { ...base, phase: 'feedback', defeat: true }
    const b = render(<Play opts={{}} onOver={() => {}} />)
    const root = b.container.querySelector('[data-screen="play"]')!
    expect(root.hasAttribute('data-defeat')).toBe(true)
    // every screen's wizard (Book 2's screens mark it data-wizard; the tower's board is the duel's .nd-wizard) is hidden
    // the stylesheet's text: vitest gives a .css import no content, and node's types are not in the app's tsconfig
    const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
    const css = fs.readFileSync('src/duel2/duel2.css', 'utf8').replace(/\s+/g, ' ')
    expect(css).toMatch(/\.d2-root\[data-defeat\] \[data-wizard\], \.d2-root\[data-defeat\] \.nd-wizard \{ visibility: hidden; \}/)
    b.unmount()
  })
})
