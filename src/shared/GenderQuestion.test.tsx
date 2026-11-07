import { afterEach, describe, expect, it, vi } from 'vitest'
import { StrictMode } from 'react'
import { act, fireEvent, render } from '@testing-library/react'
import { GenderQuestion, MAX_ASKS } from './GenderQuestion'

describe('GenderQuestion (the boy/girl question before the first round)', () => {
  afterEach(() => vi.useRealTimers())
  const setup = (play: (id: string) => Promise<void>) => {
    const onChoose = vi.fn()
    const r = render(<GenderQuestion boySrc="boy.webp" girlSrc="girl.webp" line="ask" play={play} cues={{ boy: 1, girl: 2 }} onChoose={onChoose} />)
    return { ...r, onChoose }
  }

  it('shows two big pictures and no text', () => {
    const { container } = setup(() => Promise.resolve())
    expect(container.querySelectorAll('button[data-gender]')).toHaveLength(2)
    expect(container.querySelector('[data-gender="boy"] img')!.getAttribute('src')).toBe('boy.webp')
    expect(container.querySelector('[data-gender="girl"] img')!.getAttribute('src')).toBe('girl.webp')
    container.querySelectorAll('style').forEach((n) => n.remove())
    expect(container.textContent!.trim()).toBe('')
  })

  it('asks with the voice, glows each picture as it is named, and takes a tap only after the question', async () => {
    vi.useFakeTimers()
    let end!: () => void
    const play = vi.fn(() => new Promise<void>((r) => { end = r }))
    const { container, onChoose } = setup(play)
    expect(play).toHaveBeenCalledWith('ask')
    await act(async () => { await vi.advanceTimersByTimeAsync(1050) })
    expect(container.querySelector('[data-gender="boy"]')!.getAttribute('data-glow')).toBe('true')
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(container.querySelector('[data-gender="girl"]')!.getAttribute('data-glow')).toBe('true')
    fireEvent.click(container.querySelector('[data-gender="girl"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    expect(onChoose).not.toHaveBeenCalled()
    await act(async () => { end(); await vi.advanceTimersByTimeAsync(10) })
    fireEvent.click(container.querySelector('[data-gender="girl"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    expect(onChoose).toHaveBeenCalledWith('girl')
  })

  it('asks again when the child waits', async () => {
    vi.useFakeTimers()
    const play = vi.fn(() => Promise.resolve())
    setup(play)
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    expect(play).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(8100) })
    expect(play).toHaveBeenCalledTimes(2)
  })
  it('StrictMode: the double mount stops its first play, so the question plays once and re-asks on time', async () => {
    vi.useFakeTimers()
    const play = vi.fn(() => new Promise<void>((r) => setTimeout(r, 2000)))
    const stop = vi.fn()
    render(<StrictMode><GenderQuestion boySrc="b" girlSrc="g" line="ask" play={play} stop={stop} cues={{ boy: 1, girl: 2 }} onChoose={() => {}} /></StrictMode>)
    expect(stop).toHaveBeenCalledTimes(1)
    await act(async () => { await vi.advanceTimersByTimeAsync(2000 + 8000 - 10) })
    expect(play).toHaveBeenCalledTimes(2) // the dropped first mount + the live one; the dropped one never re-asks
    await act(async () => { await vi.advanceTimersByTimeAsync(20) })
    expect(play).toHaveBeenCalledTimes(3)
  })
  it('takes a tap during a re-ask (stopping the voice), and stops re-asking after a few times', async () => {
    vi.useFakeTimers()
    const play = vi.fn(() => new Promise<void>((r) => setTimeout(r, 1000)))
    const stop = vi.fn()
    const onChoose = vi.fn()
    const { container } = render(<GenderQuestion boySrc="b" girlSrc="g" line="ask" play={play} stop={stop} cues={{ boy: 0.2, girl: 0.5 }} onChoose={onChoose} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(60000) })
    expect(play).toHaveBeenCalledTimes(MAX_ASKS)
    const r2 = render(<GenderQuestion boySrc="b" girlSrc="g" line="ask" play={play} stop={stop} cues={{ boy: 0.2, girl: 0.5 }} onChoose={onChoose} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(1000 + 8000 + 100) }) // inside the second asking
    fireEvent.click(r2.container.querySelector('[data-gender="boy"]')!)
    expect(stop).toHaveBeenCalled()
    await act(async () => { await vi.advanceTimersByTimeAsync(500) })
    expect(onChoose).toHaveBeenCalledWith('boy')
    void container
  })
  it('a finger that only goes down (a long press) chooses nothing: the choice is the release on the picture', async () => {
    vi.useFakeTimers()
    const onChoose = vi.fn()
    const { container } = render(<GenderQuestion boySrc="b" girlSrc="g" line="ask" play={() => Promise.resolve()} cues={{ boy: 1, girl: 2 }} onChoose={onChoose} />)
    await act(async () => { await vi.advanceTimersByTimeAsync(10) })
    fireEvent.pointerDown(container.querySelector('[data-gender="girl"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    expect(onChoose).not.toHaveBeenCalled()
  })
})
