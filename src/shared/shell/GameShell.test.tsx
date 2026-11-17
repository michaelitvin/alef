import { act, fireEvent, render } from '@testing-library/react'
import { useRef, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useGameShell, type GameShellOptions } from './GameShell'
import { installFakeAudio } from '../gameAudio/fakePlayer'
import { clearGender, getPlayer, setGender } from '../player'

const audio = installFakeAudio()

function deferred() {
  let open: () => void = () => {}
  const p = new Promise<void>((r) => { open = r })
  return { p, open }
}

/** a game: a cover with play and a way away, a play screen */
function Game(o: Partial<GameShellOptions> & { preload: () => Promise<void> }) {
  const [screen, setScreen] = useState<'cover' | 'away' | 'play'>('cover')
  const ref = useRef(screen)
  ref.current = screen
  const shell = useGameShell({
    askGender: { boySrc: 'b', girlSrc: 'g', line: 'ask', cues: { boy: 0, girl: 0 }, play: () => Promise.resolve(), stop: () => {}, ...o.askGender },
    canStart: () => ref.current === 'cover',
    onPlay: () => setScreen('play'),
    ...o,
  })
  if (shell.asking) return <>{shell.question}</>
  return (
    <div data-screen={screen} data-loading={shell.loading || undefined}>
      <button aria-label="play" onClick={shell.play} />
      <button aria-label="away" onClick={() => setScreen('away')} />
    </div>
  )
}
const at = (c: HTMLElement) => c.querySelector('[data-screen]')?.getAttribute('data-screen')

describe('the game shell', () => {
  beforeEach(() => setGender('boy', 'parent'))
  afterEach(() => clearGender())

  it('starts the preload on mount; play unlocks the audio inside the tap, waits for the preload, then plays', async () => {
    const d = deferred()
    const preload = vi.fn(() => d.p)
    const unlock = vi.spyOn(audio, 'unlock')
    const { container } = render(<Game preload={preload} />)
    expect(preload).toHaveBeenCalled()
    fireEvent.click(container.querySelector('[aria-label="play"]')!)
    expect(unlock).toHaveBeenCalledTimes(1)
    expect(at(container)).toBe('cover')
    expect(container.querySelector('[data-loading]')).not.toBeNull()
    await act(async () => { d.open(); await d.p })
    expect(at(container)).toBe('play')
  })

  it('a double tap plays once', async () => {
    const d = deferred()
    const onPlay = vi.fn()
    const { container } = render(<Game preload={() => d.p} onPlay={onPlay} />)
    const btn = container.querySelector('[aria-label="play"]')!
    fireEvent.click(btn)
    fireEvent.click(btn)
    await act(async () => { d.open(); await d.p })
    expect(onPlay).toHaveBeenCalledTimes(1)
  })

  it('a tap that left the cover before the preload ended starts nothing', async () => {
    const d = deferred()
    const { container } = render(<Game preload={() => d.p} />)
    fireEvent.click(container.querySelector('[aria-label="play"]')!)
    fireEvent.click(container.querySelector('[aria-label="away"]')!)
    await act(async () => { d.open(); await d.p })
    expect(at(container)).toBe('away')
  })

  it('boy or girl unset: the question shows after the preload, the choice is the child\'s, then play', async () => {
    clearGender()
    const onAsk = vi.fn()
    const onChosen = vi.fn()
    const { container } = render(<Game preload={() => Promise.resolve()} onAsk={onAsk} askGender={{ boySrc: 'b', girlSrc: 'g', line: 'ask', cues: { boy: 0, girl: 0 }, play: () => Promise.resolve(), stop: () => {}, onChosen, className: 'wrap' }} />)
    fireEvent.click(container.querySelector('[aria-label="play"]')!)
    await act(async () => {})
    expect(onAsk).toHaveBeenCalled()
    const q = container.querySelector('.wrap [data-screen="gender-question"]')!
    expect(q).not.toBeNull()
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    fireEvent.click(q.querySelector('[data-gender="girl"]')!)
    await act(async () => { await new Promise((r) => setTimeout(r, 600)) })
    expect(getPlayer()).toMatchObject({ gender: 'girl', by: 'child' })
    expect(onChosen).toHaveBeenCalledWith('girl')
    expect(at(container)).toBe('play')
  })

  it('a welcome plays while the preload waits; play waits for both; after the question the gate runs again with it', async () => {
    const w = deferred()
    const welcome = vi.fn(() => w.p)
    const { container } = render(<Game preload={() => Promise.resolve()} welcome={welcome} />)
    fireEvent.click(container.querySelector('[aria-label="play"]')!)
    expect(welcome).toHaveBeenCalledTimes(1)
    await act(async () => {})
    expect(at(container)).toBe('cover')
    await act(async () => { w.open(); await w.p })
    expect(at(container)).toBe('play')
    // unset: no welcome before the question, the welcome after the choice
    clearGender()
    welcome.mockClear()
    const b = render(<Game preload={() => Promise.resolve()} welcome={welcome} />)
    fireEvent.click(b.container.querySelector('[aria-label="play"]')!)
    await act(async () => {})
    expect(welcome).not.toHaveBeenCalled()
    await act(async () => { await new Promise((r) => setTimeout(r, 20)) })
    fireEvent.click(b.container.querySelector('[data-gender="boy"]')!)
    await act(async () => { await new Promise((r) => setTimeout(r, 600)) })
    expect(welcome).toHaveBeenCalledTimes(1)
    expect(at(b.container)).toBe('play')
  })

  it('mutes while the page is hidden or leaving, and calls onHide as it hides', () => {
    const onHide = vi.fn()
    render(<Game preload={() => Promise.resolve()} onHide={onHide} />)
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(audio.muted).toBe(true)
    expect(onHide).toHaveBeenCalledTimes(1)
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(audio.muted).toBe(false)
    act(() => { window.dispatchEvent(new Event('pagehide')) })
    expect(audio.muted).toBe(true)
    act(() => { window.dispatchEvent(new Event('pageshow')) })
    expect(audio.muted).toBe(false)
  })
})
