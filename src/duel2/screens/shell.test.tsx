import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
const { gate } = vi.hoisted(() => {
  let open: () => void = () => {}
  const p = new Promise<void>((r) => { open = r })
  return { gate: { p, open: () => open() } }
})
vi.mock('../assets/preload', () => ({ READY_MS: 8000, preloadDuel2Assets: () => gate.p }))
import { Cover } from './Cover'
import { PauseCover } from './PauseCover'
import { Summary } from './Summary'
import { useDuel2Store } from '../store'
import { setVoicePlayer, stopVoice } from '../audio/duel2Audio'
import Duel2App from '../Duel2App'
import { clearGender, getPlayer, setGender } from '../../shared/player'
import { duel2Telemetry } from '../telemetry'

const noText = (root: Element) => {
  const clone = root.cloneNode(true) as Element
  // digits (points, data-num) are the one text a child screen shows on purpose
  clone.querySelectorAll('[data-glyph],[data-num]').forEach((e) => e.remove())
  return clone.textContent?.replace(/\s+/g, '') ?? ''
}

describe('shell', () => {
  afterEach(() => { vi.useRealTimers(); clearGender() })
  it('cover has no text', () => {
    const { container } = render(<Cover onPlay={() => {}} onParent={() => {}} />)
    expect(noText(container)).toBe('')
    expect(container.querySelectorAll('[data-glyph]').length).toBeGreaterThan(0)
  })
  it('parent button needs a 2 s hold', () => {
    vi.useFakeTimers()
    const onParent = vi.fn()
    render(<Cover onPlay={() => {}} onParent={onParent} />)
    const btn = screen.getByLabelText('parent settings (hold)')
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(500) })
    fireEvent.pointerUp(btn)
    expect(onParent).not.toHaveBeenCalled()
    fireEvent.pointerDown(btn)
    act(() => { vi.advanceTimersByTime(2000) })
    expect(onParent).toHaveBeenCalledTimes(1)
  })
  it('play waits for preload', async () => {
    setGender('boy', 'parent')
    const { container } = render(<Duel2App />)
    fireEvent.click(screen.getByLabelText('play'))
    expect(container.querySelector('[data-screen="cover"]')).not.toBeNull()
    await act(async () => { gate.open(); await gate.p })
    expect(container.querySelector('[data-screen="play"]')).not.toBeNull()
  })
  it('the first play asks boy or girl (no text), then the run starts as the child chose', async () => {
    clearGender()
    const track = vi.spyOn(duel2Telemetry, 'track')
    const said: string[] = []
    setVoicePlayer((id) => { said.push(id); return Promise.resolve(true) })
    const { container } = render(<Duel2App />)
    fireEvent.click(screen.getByLabelText('play'))
    await act(async () => { gate.open(); await gate.p })
    const q = container.querySelector('[data-screen="gender-question"]')!
    expect(q).not.toBeNull()
    expect(container.querySelector('[data-screen="play"]')).toBeNull()
    expect(q.querySelector('[data-gender="girl"] img')!.getAttribute('src')).toMatch(/s-wizard-idle-girl/)
    expect(q.querySelector('[data-gender="boy"] img')!.getAttribute('src')).not.toMatch(/girl/)
    await act(async () => { await new Promise((r) => setTimeout(r, 30)) })
    expect(said).toContain('ask-gender-1')
    fireEvent.click(q.querySelector('[data-gender="girl"]')!)
    await act(async () => { await new Promise((r) => setTimeout(r, 600)) })
    expect(getPlayer()).toMatchObject({ gender: 'girl', by: 'child' })
    expect(track).toHaveBeenCalledWith('player', { gender: 'girl', by: 'child' })
    expect(container.querySelector('[data-screen="play"]')).not.toBeNull()
    stopVoice()
    setVoicePlayer(null)
    track.mockRestore()
  })
  it('once set, play starts without the question', async () => {
    setGender('girl', 'child')
    const { container } = render(<Duel2App />)
    fireEvent.click(screen.getByLabelText('play'))
    await act(async () => { gate.open(); await gate.p })
    expect(container.querySelector('[data-screen="gender-question"]')).toBeNull()
    expect(container.querySelector('[data-screen="play"]')).not.toBeNull()
    // the defeat scene's picture is there before it is needed (rule: no late pictures), in her own version
    expect(container.querySelector('[data-warm] img')?.getAttribute('src')).toMatch(/s-wizard-dizzy-girl/)
    stopVoice()
  })
  it('pause cover hides the game', () => {
    const onPlay = vi.fn()
    const { container } = render(<PauseCover onPlay={onPlay} />)
    expect(container.querySelector('.d2-pause')).not.toBeNull()
    expect(noText(container)).toBe('')
    fireEvent.click(screen.getByLabelText('play'))
    expect(onPlay).toHaveBeenCalled()
  })
  it('summary shows the crystals and has no text', () => {
    const { container } = render(<Summary over={{ score: 9, crystals: 2, best: true }} onAgain={() => {}} />)
    expect(container.querySelectorAll('[data-crystal-icon]').length).toBe(2)
    expect(container.querySelector('[data-best]')).not.toBeNull()
    expect(noText(container)).toBe('')
  })
  it('the end screen shows the points of this run and his best, and only play again (no way out by mistake; the held home button only with onExit)', () => {
    useDuel2Store.setState({ bestRun: 14 })
    const { container } = render(<Summary over={{ score: 9, crystals: 0, best: false }} onAgain={() => {}} />)
    expect(container.querySelector('[data-run-score]')!.textContent).toBe('9')
    expect(container.querySelector('[data-best-score]')!.textContent).toBe('14')
    expect(container.querySelector('a')).toBeNull()
    expect(container.querySelectorAll('button').length).toBe(1)
  })
  it('the cover shows his coin balance (not his stars), and has no link out', () => {
    useDuel2Store.setState({ totalStars: 57, coins: 23 })
    const { container } = render(<Cover onPlay={() => {}} onParent={() => {}} />)
    expect(container.querySelector('[data-coins]')!.textContent).toBe('23')
    expect(container.querySelector('a')).toBeNull()
  })

  it('the cover shows every crystal he has won, by kind (the parent: if he hoards them he should see them)', () => {
    useDuel2Store.setState({ crystals: 0 })
    const none = render(<Cover onPlay={() => {}} onParent={() => {}} />)
    expect(none.container.querySelector('[data-crystal-shelf]')).toBeNull()
    useDuel2Store.setState({ crystals: 6 })
    const { container } = render(<Cover onPlay={() => {}} onParent={() => {}} />)
    const kinds = [...container.querySelectorAll('[data-crystal-kind]')]
    expect(kinds.length).toBe(4)
    expect(kinds.reduce((n, k) => n + Number(k.getAttribute('data-count')), 0)).toBe(6)
  })

  it('a tap on his coins, crystals, run stars or best says what they are', async () => {
    vi.useFakeTimers()
    stopVoice()
    const played: string[] = []
    setVoicePlayer((id) => { played.push(id); return Promise.resolve() })
    useDuel2Store.setState({ totalStars: 25, crystals: 3 })
    const cover = render(<Cover onPlay={() => {}} onParent={() => {}} />)
    fireEvent.pointerDown(cover.container.querySelector('[data-info="info-coins"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    fireEvent.pointerDown(cover.container.querySelector('[data-info="info-crystals"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    cover.unmount()
    setVoicePlayer((id) => { played.push(id); return Promise.resolve() })
    const sum = render(<Summary over={{ score: 9, crystals: 1, best: false }} onAgain={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    fireEvent.pointerDown(sum.container.querySelector('[data-info="info-stars"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    fireEvent.pointerDown(sum.container.querySelector('[data-info="info-best"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    expect(played.filter((id) => id.startsWith('info-'))).toEqual(['info-coins-1', 'info-crystals-1', 'info-stars-1', 'info-best-1'])
    setVoicePlayer(null)
  })

  it('the cover has a trophy shelf of 4 bosses: a beaten one in a golden frame, the others dark silhouettes', () => {
    useDuel2Store.setState({ bossesBeaten: ['bat'] })
    const { container } = render(<Cover onPlay={() => {}} onParent={() => {}} />)
    const slots = [...container.querySelectorAll('[data-trophy]')]
    expect(slots.map((e) => e.getAttribute('data-trophy'))).toEqual(['dot', 'shin', 'mimic', 'bat'])
    expect(slots.filter((e) => e.hasAttribute('data-beaten')).map((e) => e.getAttribute('data-trophy'))).toEqual(['bat'])
    expect(container.querySelectorAll('[data-trophy] img').length).toBe(4)
    expect(noText(container)).toBe('')
  })

  it('the end screen: his coin balance and no ring, the boss won, the next one as a silhouette', () => {
    useDuel2Store.setState({ totalStars: 47, coins: 31, bossesBeaten: ['mimic'], bestRun: 3 })
    const { container } = render(<Summary over={{ score: 9, crystals: 0, best: false, bosses: ['mimic'], startStars: 38 }} onAgain={() => {}} />)
    expect(container.querySelector('[data-coin-ring]')).toBeNull()
    expect(container.querySelector('[data-coins]')!.textContent).toBe('31')
    expect(container.querySelector('[data-trophy="mimic"][data-beaten]')).not.toBeNull()
    expect(container.querySelector('[data-teaser][data-trophy="dot"]')).not.toBeNull()
    expect(container.querySelectorAll('button').length).toBe(1)
    expect(container.querySelector('.d2-play-big')).not.toBeNull()
    expect(noText(container)).toBe('')
  })

  it('a tap on the trophies or the coins on the end screen says what they are', async () => {
    vi.useFakeTimers()
    stopVoice()
    const played: string[] = []
    setVoicePlayer((id) => { played.push(id); return Promise.resolve() })
    const cover = render(<Cover onPlay={() => {}} onParent={() => {}} />)
    fireEvent.pointerDown(cover.container.querySelector('[data-info="info-bosses"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    cover.unmount()
    const sum = render(<Summary over={{ score: 1, crystals: 0, best: false, startStars: 0 }} onAgain={() => {}} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    fireEvent.pointerDown(sum.container.querySelector('[data-info="info-coins"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    expect(played.filter((id) => id.startsWith('info-'))).toEqual(['info-bosses-1', 'info-coins-1'])
    setVoicePlayer(null)
  })
})
