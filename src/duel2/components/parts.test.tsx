import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TopBar } from './TopBar'
import { Orb } from './Orb'
import { MarkAlone } from './MarkAlone'
import { ExplainPanel } from './ExplainPanel'
import { mark } from '../logic/content'
import { sayParts, setVoicePlayer, stopVoice } from '../audio/duel2Audio'

describe('parts', () => {
  afterEach(() => {
    stopVoice()
    setVoicePlayer(null)
    vi.useRealTimers()
  })
  it('top bar shows hearts as SVG and no text', () => {
    const { container } = render(<TopBar hearts={3} onReplay={() => {}} onHint={() => {}} />)
    expect(container.querySelectorAll('[data-heart]').length).toBe(3)
    expect(container.textContent).toBe('')
  })
  it('next appears only with onNext', () => {
    const { rerender } = render(<TopBar hearts={2} />)
    expect(screen.queryByLabelText('next')).toBeNull()
    const onNext = vi.fn()
    rerender(<TopBar hearts={2} onNext={onNext} />)
    fireEvent.pointerDown(screen.getByLabelText('next'))
    expect(onNext).toHaveBeenCalledTimes(1)
  })
  it('orb responds on pointerdown, once', () => {
    const onPick = vi.fn()
    const { container, rerender } = render(<svg><Orb size={100} x={0} y={0} onPick={onPick} testCorrect /></svg>)
    const hit = container.querySelector('[data-pick]')!
    fireEvent.pointerDown(hit)
    expect(onPick).toHaveBeenCalledTimes(1)
    expect(container.querySelector('[data-correct="1"]')).not.toBeNull()
    rerender(<svg><Orb size={100} x={0} y={0} onPick={onPick} state="right" /></svg>)
    fireEvent.pointerDown(container.querySelector('[data-pick]')!)
    expect(onPick).toHaveBeenCalledTimes(1)
  })
  it('closing an explanation does not silence what the game says next', async () => {
    vi.useFakeTimers()
    const played: string[] = []
    setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, 50)) })
    const { unmount } = render(<ExplainPanel parts={[{ id: 'ln-bet', highlight: 'letter' }]} onNext={() => {}}>{() => null}</ExplainPanel>)
    await act(async () => { await vi.advanceTimersByTimeAsync(200) })
    let started = false
    const next = sayParts([{ id: 'q-ghosts-1' }, { id: 'syl-b-a', onStart: () => { started = true } }])
    unmount()
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    await next
    expect(played).toContain('q-ghosts-1')
    expect(started).toBe(true)
  })
  it('a demo goes on by itself when its words end, with no next button', async () => {
    vi.useFakeTimers()
    setVoicePlayer(() => Promise.resolve())
    const onNext = vi.fn()
    render(<ExplainPanel parts={[{ id: 'demo-broom-1', highlight: 'none' }]} onNext={onNext} autoNext>{() => null}</ExplainPanel>)
    await act(async () => { await vi.advanceTimersByTimeAsync(3000) })
    expect(onNext).toHaveBeenCalledTimes(1)
    expect(screen.queryByLabelText('next')).toBeNull()
  })
  it('a tap on an explanation ends it at once, while it still speaks (he already knows)', async () => {
    vi.useFakeTimers()
    setVoicePlayer(() => new Promise((r) => setTimeout(r, 5000)))
    const onNext = vi.fn()
    const { container } = render(<ExplainPanel parts={[{ id: 'ln-bet', highlight: 'letter' }]} onNext={onNext} skippable>{() => null}</ExplainPanel>)
    await act(async () => { await vi.advanceTimersByTimeAsync(100) })
    fireEvent.pointerDown(container.querySelector('[data-skip]')!)
    expect(onNext).toHaveBeenCalledTimes(1)
  })
  it('next looks like the play button', () => {
    const { container } = render(<TopBar hearts={3} onNext={() => {}} />)
    expect(container.querySelector('[aria-label="next"] [data-icon="play"]')).not.toBeNull()
  })
  it('an orb darkens the place behind its glyph so marks show on the shine', () => {
    const { container } = render(<svg><Orb size={100} x={0} y={0} /></svg>)
    expect(container.querySelector('[data-glyph-backing]')).not.toBeNull()
  })
  it('shuruk alone shows the vav', () => {
    const { container } = render(<svg><MarkAlone mark={mark('shuruk')} size={100} x={0} y={0} /></svg>)
    expect(container.querySelector('[data-vav]')).not.toBeNull()
    const k = render(<svg><MarkAlone mark={mark('kamatz')} size={100} x={0} y={0} /></svg>)
    expect(k.container.querySelector('[data-vav]')).toBeNull()
  })
  it('explanation stays until next and can be replayed', async () => {
    vi.useFakeTimers()
    const played: string[] = []
    setVoicePlayer((id) => { played.push(id); return Promise.resolve() })
    const onNext = vi.fn()
    render(
      <ExplainPanel parts={[{ id: 'ln-bet', highlight: 'letter' }, { id: 'vn-kamatz', highlight: 'vowel' }]} onNext={onNext}>
        {(h) => <span data-h={h ?? ''} />}
      </ExplainPanel>,
    )
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(played).toEqual(['ln-bet', 'vn-kamatz'])
    expect(screen.getByLabelText('next')).toBeTruthy()
    fireEvent.pointerDown(screen.getByLabelText('replay'))
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(played).toEqual(['ln-bet', 'vn-kamatz', 'ln-bet', 'vn-kamatz'])
    fireEvent.pointerDown(screen.getByLabelText('next'))
    expect(onNext).toHaveBeenCalledTimes(1)
  })
  it('the top bar shows the points of this run', () => {
    const { container } = render(<TopBar hearts={3} score={7} />)
    expect(container.querySelector('[data-score]')!.textContent).toBe('7')
  })

  it('the top bar shows his coins beside the run points', () => {
    const { container } = render(<TopBar hearts={3} score={4} coins={12} />)
    expect(container.querySelector('[data-coins]')!.textContent).toBe('12')
  })

})
