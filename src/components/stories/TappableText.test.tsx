import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen, waitFor, act } from '@testing-library/react'
import { SpeechProvider, useSpeech } from './SpeechProvider'
import { TappableText } from './TappableText'
import { decodeWord } from '../../utils/decodeWord'
import type { SpeakOptions, SpeechEngine } from '../../utils/speech/types'

function makeMockEngine(): SpeechEngine & { spoken: string[] } {
  const spoken: string[] = []
  return {
    spoken,
    speak: vi.fn(async (text: string) => {
      spoken.push(text)
    }),
    cancel: vi.fn(),
    isAvailable: () => true,
    whenReady: () => Promise.resolve(),
  }
}

/** Engine whose speak() start/finish moments are driven by the test */
function makeControlledEngine() {
  let resolveSpeak: (() => void) | null = null
  let onStart: (() => void) | null = null
  const engine: SpeechEngine = {
    speak: vi.fn((_text: string, opts?: SpeakOptions) => {
      onStart = opts?.onStart ?? null
      return new Promise<void>((resolve) => {
        resolveSpeak = resolve
      })
    }),
    cancel: vi.fn(),
    isAvailable: () => true,
    whenReady: () => Promise.resolve(),
  }
  return {
    engine,
    start: () =>
      act(async () => {
        onStart?.()
      }),
    finish: () =>
      act(async () => {
        resolveSpeak?.()
      }),
  }
}

describe('TappableText', () => {
  it('renders each word as a separate tappable element', () => {
    const engine = makeMockEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="אַבָּא אוֹכֵל תַּפּוּחַ" blockId="t" />
      </SpeechProvider>
    )
    expect(screen.getByText('אַבָּא')).toBeTruthy()
    expect(screen.getByText('אוֹכֵל')).toBeTruthy()
    expect(screen.getByText('תַּפּוּחַ')).toBeTruthy()
  })

  it('first tap speaks the decode, second tap speaks the word, third the decode again', async () => {
    const engine = makeMockEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="אַבָּא אוֹכֵל" blockId="t" />
      </SpeechProvider>
    )
    fireEvent.click(screen.getByText('אַבָּא'))
    await waitFor(() => expect(engine.spoken).toHaveLength(1))
    expect(engine.spoken[0]).toBe(decodeWord('אַבָּא'))

    fireEvent.click(screen.getByText('אַבָּא'))
    await waitFor(() => expect(engine.spoken).toHaveLength(2))
    expect(engine.spoken[1]).toBe('אַבָּא')

    fireEvent.click(screen.getByText('אַבָּא'))
    await waitFor(() => expect(engine.spoken).toHaveLength(3))
    expect(engine.spoken[2]).toBe(decodeWord('אַבָּא'))
  })

  it('tapping a different word resets the cycle', async () => {
    const engine = makeMockEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="אַבָּא אוֹכֵל" blockId="t" />
      </SpeechProvider>
    )
    fireEvent.click(screen.getByText('אַבָּא'))
    fireEvent.click(screen.getByText('אוֹכֵל'))
    await waitFor(() => expect(engine.spoken).toHaveLength(2))
    expect(engine.spoken[1]).toBe(decodeWord('אוֹכֵל'))
  })

  it('shows a loader on the tapped word until speech starts', async () => {
    const { engine, start, finish } = makeControlledEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="אַבָּא אוֹכֵל" blockId="t" />
      </SpeechProvider>
    )
    fireEvent.click(screen.getByText('אַבָּא'))
    await waitFor(() => expect(screen.getByTestId('word-loader')).toBeTruthy())

    await start()
    await waitFor(() => expect(screen.queryByTestId('word-loader')).toBeNull())
    await finish()
  })

  it('hides the loader when speech resolves without ever starting', async () => {
    const { engine, finish } = makeControlledEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="אַבָּא אוֹכֵל" blockId="t" />
      </SpeechProvider>
    )
    fireEvent.click(screen.getByText('אַבָּא'))
    await waitFor(() => expect(screen.getByTestId('word-loader')).toBeTruthy())

    await finish()
    await waitFor(() => expect(screen.queryByTestId('word-loader')).toBeNull())
  })

  it('keeps a soft highlight on the tapped word after speech ends', async () => {
    const engine = makeMockEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="אַבָּא אוֹכֵל" blockId="t" />
      </SpeechProvider>
    )
    const word = screen.getByText('אַבָּא')
    fireEvent.click(word)
    await waitFor(() => expect(engine.spoken).toHaveLength(1))
    // After the speaking highlight clears, a softer "tap me again" highlight remains
    await waitFor(
      () => expect(word.style.backgroundColor).toBe('rgba(255, 213, 79, 0.35)'),
      { timeout: 2000 }
    )
  })

  it('moves the invitation highlight when a different word is tapped', async () => {
    const engine = makeMockEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="אַבָּא אוֹכֵל" blockId="t" />
      </SpeechProvider>
    )
    const first = screen.getByText('אַבָּא')
    fireEvent.click(first)
    await waitFor(() => expect(engine.spoken).toHaveLength(1))
    fireEvent.click(screen.getByText('אוֹכֵל'))
    await waitFor(() => expect(first.style.backgroundColor).toBe('transparent'))
  })

  it('strips punctuation when speaking the whole word', async () => {
    const engine = makeMockEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="בֹּקֶר טוֹב, מוֹתֶק!" blockId="t" />
      </SpeechProvider>
    )
    fireEvent.click(screen.getByText('מוֹתֶק!'))
    fireEvent.click(screen.getByText('מוֹתֶק!'))
    await waitFor(() => expect(engine.spoken).toHaveLength(2))
    expect(engine.spoken[1]).toBe('מוֹתֶק')
  })

  it('counts every word tap', async () => {
    const engine = makeMockEngine()
    function CountProbe() {
      const { tapCount } = useSpeech()
      return <span data-testid="tap-count">{tapCount}</span>
    }
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="אַבָּא אוֹכֵל" blockId="t" />
        <CountProbe />
      </SpeechProvider>
    )
    expect(screen.getByTestId('tap-count').textContent).toBe('0')
    fireEvent.click(screen.getByText('אַבָּא'))
    fireEvent.click(screen.getByText('אַבָּא'))
    fireEvent.click(screen.getByText('אוֹכֵל'))
    await waitFor(() =>
      expect(screen.getByTestId('tap-count').textContent).toBe('3')
    )
  })
})
