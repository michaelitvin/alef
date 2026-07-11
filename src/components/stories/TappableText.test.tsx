import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { SpeechProvider } from './SpeechProvider'
import { TappableText } from './TappableText'
import { decodeWord } from '../../utils/decodeWord'
import type { SpeechEngine } from '../../utils/speech/types'

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

  it('first tap speaks the word, second tap speaks the decode, third the word again', async () => {
    const engine = makeMockEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="אַבָּא אוֹכֵל" blockId="t" />
      </SpeechProvider>
    )
    fireEvent.click(screen.getByText('אַבָּא'))
    await waitFor(() => expect(engine.spoken).toHaveLength(1))
    expect(engine.spoken[0]).toBe('אַבָּא')

    fireEvent.click(screen.getByText('אַבָּא'))
    await waitFor(() => expect(engine.spoken).toHaveLength(2))
    expect(engine.spoken[1]).toBe(decodeWord('אַבָּא'))

    fireEvent.click(screen.getByText('אַבָּא'))
    await waitFor(() => expect(engine.spoken).toHaveLength(3))
    expect(engine.spoken[2]).toBe('אַבָּא')
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
    expect(engine.spoken[1]).toBe('אוֹכֵל')
  })

  it('strips punctuation when speaking the word', async () => {
    const engine = makeMockEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="בֹּקֶר טוֹב, מוֹתֶק!" blockId="t" />
      </SpeechProvider>
    )
    fireEvent.click(screen.getByText('מוֹתֶק!'))
    await waitFor(() => expect(engine.spoken).toHaveLength(1))
    expect(engine.spoken[0]).toBe('מוֹתֶק')
  })
})
