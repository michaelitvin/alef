import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { TopBar } from './TopBar'
import { Orb } from './Orb'
import { MarkAlone } from './MarkAlone'
import { ExplainPanel } from './ExplainPanel'
import { mark } from '../logic/content'
import { sayParts, setVoicePlayer, stopVoice } from '../audio/duel2Audio'
import { Merchant } from './screens/Merchant'
import { PriceTag, ValueCoin } from './ValueCoin'
import type { MerchantView } from '../controller'

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

  it('the top bar shows x2 and x3 beside the stars, and nothing at x1', () => {
    const one = render(<TopBar hearts={3} score={4} coins={2} mult={1} />)
    expect(one.container.querySelector('[data-mult]')).toBeNull()
    for (const m of [2, 3] as const) {
      const { container } = render(<TopBar hearts={3} score={4} coins={2} mult={m} />)
      const b = container.querySelector('[data-mult]')!
      expect(b.getAttribute('data-mult')).toBe(String(m))
      expect(b.hasAttribute('data-num')).toBe(true)
      expect(b.textContent).toBe(`×${m}`)
    }
  })

  it('a tap on the hearts, the stars or the coins says what they are, once per tap burst (the parent)', async () => {
    vi.useFakeTimers()
    const played: string[] = []
    setVoicePlayer((id) => { played.push(id); return new Promise((r) => setTimeout(r, 1000)) })
    const { container } = render(<TopBar hearts={3} score={4} coins={2} />)
    fireEvent.pointerDown(container.querySelector('[data-info="info-hearts"]')!)
    fireEvent.pointerDown(container.querySelector('[data-info="info-hearts"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
    fireEvent.pointerDown(container.querySelector('[data-info="info-stars"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
    fireEvent.pointerDown(container.querySelector('[data-info="info-coins"]')!)
    await act(async () => { await vi.advanceTimersByTimeAsync(1500) })
    expect(played).toEqual(['info-hearts-1', 'info-stars-1', 'info-coins-1'])
  })
})

describe('the merchant screen (spec: one duel, Part 2)', () => {
  const base: MerchantView = { phase: 'pay', price: 7, coins: [1, 2, 2, 5, 10], given: [] }
  const noText = (root: Element) => {
    const clone = root.cloneNode(true) as Element
    // what is exempt from the check must itself be digits only
    clone.querySelectorAll('[data-num]').forEach((e) => expect(e.textContent).toMatch(/^\d+$/))
    clone.querySelectorAll('[data-glyph],[data-num]').forEach((e) => e.remove())
    return clone.textContent?.replace(/\s+/g, '') ?? ''
  }
  const noop = () => {}
  const draw = (v: MerchantView, cb: { onCoin?: (n: number) => void; onHand?: () => void; onPotion?: () => void; onDecline?: () => void } = {}) =>
    render(<Merchant v={v} onCoin={cb.onCoin ?? noop} onHand={cb.onHand ?? noop} onPotion={cb.onPotion ?? noop} onDecline={cb.onDecline ?? noop} />)

  it('ValueCoin stamps the value and grows with it', () => {
    const { container } = render(<svg><ValueCoin value={1} /><ValueCoin value={10} /></svg>)
    const coins = [...container.querySelectorAll('[data-value-coin]')]
    expect(coins.map((c) => c.querySelector('[data-num]')!.textContent)).toEqual(['1', '10'])
    expect(Number(coins[0].getAttribute('width'))).toBeLessThan(Number(coins[1].getAttribute('width')))
  })
  it('the price tag shows the coin and the price as digits', () => {
    const { container } = render(<svg><PriceTag price={14} /></svg>)
    expect(container.querySelector('[data-price]')!.textContent).toBe('14')
    expect(noText(container)).toBe('')
  })
  it('a pile of 9 coins draws 6, and the coins in his hand leave their piles', () => {
    const { container, rerender } = draw({ ...base, coins: [2, 2, 2, 2, 2, 2, 2, 2, 2, 5] })
    expect(container.querySelectorAll('[data-pile="2"] [data-value-coin]').length).toBe(6)
    rerender(<Merchant v={{ ...base, coins: [1, 2, 2, 5, 10], given: [5, 2] }} onCoin={noop} onHand={noop} onPotion={noop} onDecline={noop} />)
    expect(container.querySelector('[data-pile="5"]')).toBeNull()
    expect(container.querySelectorAll('[data-pile="2"] [data-value-coin]').length).toBe(1)
    expect(container.querySelectorAll('[data-merchant-hand] [data-value-coin]').length).toBe(2)
  })
  it('the merchant screen has no text other than digits, and no total while he chooses', () => {
    const { container } = draw({ ...base, given: [5, 1] })
    expect(noText(container)).toBe('')
    expect(container.querySelector('[data-count]')).toBeNull()
    // the count shows only while the merchant counts
    const counting = draw({ ...base, phase: 'count', given: [5, 1], counted: 2 })
    expect(counting.container.querySelector('[data-count]')!.textContent).toBe('6')
  })
  it('taps: a pile gives its top coin, the hand undoes, the potion buys, the ✗ declines', () => {
    const onCoin = vi.fn(); const onHand = vi.fn(); const onPotion = vi.fn(); const onDecline = vi.fn()
    const { container } = draw({ ...base, given: [10] }, { onCoin, onHand, onPotion, onDecline })
    const pile = container.querySelector('[data-pile="5"] [data-pile-top]')!
    fireEvent.pointerDown(pile, { pointerId: 1, clientX: 10, clientY: 10 })
    fireEvent.pointerUp(pile, { pointerId: 1, clientX: 10, clientY: 10 })
    expect(onCoin).toHaveBeenCalledWith(5)
    fireEvent.pointerDown(container.querySelector('[data-merchant-hand]')!)
    expect(onHand).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(container.querySelector('[data-potion]')!)
    expect(onPotion).toHaveBeenCalledTimes(1)
    fireEvent.pointerDown(container.querySelector('[data-decline]')!)
    expect(onDecline).toHaveBeenCalledTimes(1)
  })
  it('a coin dragged to his open hand is given; dropped elsewhere it flies back', () => {
    const onCoin = vi.fn()
    const { container } = draw(base, { onCoin })
    const pile = container.querySelector('[data-pile="10"] [data-pile-top]')!
    fireEvent.pointerDown(pile, { pointerId: 1, clientX: 300, clientY: 800 })
    fireEvent.pointerMove(pile, { pointerId: 1, clientX: 700, clientY: 500 })
    fireEvent.pointerUp(pile, { pointerId: 1, clientX: 700, clientY: 500 })
    expect(onCoin).not.toHaveBeenCalled()
    fireEvent.pointerDown(pile, { pointerId: 1, clientX: 300, clientY: 800 })
    fireEvent.pointerMove(pile, { pointerId: 1, clientX: 1290, clientY: 580 })
    fireEvent.pointerUp(pile, { pointerId: 1, clientX: 1290, clientY: 580 })
    expect(onCoin).toHaveBeenCalledWith(10)
  })
  it('the demo dims everything but its step’s target and shows the game’s pointing hand there', () => {
    const { container } = draw({ ...base, phase: 'arrive', demo: { step: 'price', t: 1 }, glow: { tag: true } })
    expect(container.querySelector('[data-demo-hand]')).not.toBeNull()
    expect(container.querySelector('[data-tag-part]')!.getAttribute('data-dim')).toBeNull()
    expect(container.querySelector('[data-potion]')!.getAttribute('data-dim')).toBe('1')
    // the ✗ is hidden until the demo points it out
    expect(container.querySelector('[data-decline]')).toBeNull()
    const d4 = draw({ ...base, phase: 'arrive', demo: { step: 'decline', t: 4 }, glow: { decline: true } })
    expect(d4.container.querySelector('[data-decline]')).not.toBeNull()
    expect(d4.container.querySelector('[data-piles]')!.getAttribute('data-dim')).toBe('1')
  })
  it('the wand glows when the top bar is asked to', () => {
    const { container } = render(<TopBar hearts={2} onHint={() => {}} hintGlow />)
    expect(container.querySelector('[aria-label="hint"]')!.getAttribute('data-glow')).toBe('true')
  })
  it('the hint makes the top coins of the right piles glow green; the ✗ card glows when it is pointed out', () => {
    const { container } = draw({ ...base, glow: { hint: [5, 2], decline: true } })
    expect(container.querySelectorAll('[data-pile="5"] [data-state="hint"]').length).toBe(1)
    expect(container.querySelectorAll('[data-pile="2"] [data-state="hint"]').length).toBe(1)
    expect(container.querySelectorAll('[data-pile="10"] [data-state="hint"]').length).toBe(0)
    expect(container.querySelector('[data-decline]')!.getAttribute('data-glow')).toBe('true')
  })
})
