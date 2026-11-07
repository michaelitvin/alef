import { afterEach, describe, expect, it, vi } from 'vitest'
import { act, fireEvent, render } from '@testing-library/react'
import { GenderQuestion } from './GenderQuestion'

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
    fireEvent.pointerDown(container.querySelector('[data-gender="girl"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    expect(onChoose).not.toHaveBeenCalled()
    await act(async () => { end(); await vi.advanceTimersByTimeAsync(10) })
    fireEvent.pointerDown(container.querySelector('[data-gender="girl"]')!)
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
})
