import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WebSpeechEngine } from './webSpeechEngine'

interface FakeUtteranceShape {
  text: string
  voice: unknown
  lang: string
  rate: number
  volume: number
  onend: (() => void) | null
  onerror: (() => void) | null
}

class FakeUtterance implements FakeUtteranceShape {
  voice: unknown = null
  lang = ''
  rate = 1
  volume = 1
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public text: string) {}
}

class FakeSynth {
  voices: Array<{ lang: string; localService: boolean; name: string }> = []
  spoken: FakeUtterance[] = []
  cancelCount = 0
  private listeners: Array<() => void> = []

  getVoices() {
    return this.voices
  }
  addEventListener(type: string, cb: () => void) {
    if (type === 'voiceschanged') this.listeners.push(cb)
  }
  fireVoicesChanged() {
    this.listeners.forEach((cb) => cb())
  }
  speak(u: FakeUtterance) {
    this.spoken.push(u)
    u.onend?.() // finish immediately
  }
  cancel() {
    this.cancelCount++
  }
}

const HEBREW_VOICE = { lang: 'he-IL', localService: true, name: 'Carmit' }
const ENGLISH_VOICE = { lang: 'en-US', localService: true, name: 'Alex' }

beforeEach(() => {
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
})

function makeEngine(synth: FakeSynth): WebSpeechEngine {
  return new WebSpeechEngine(synth as unknown as SpeechSynthesis)
}

describe('WebSpeechEngine', () => {
  it('is available when a Hebrew voice exists at construction', async () => {
    const synth = new FakeSynth()
    synth.voices = [ENGLISH_VOICE, HEBREW_VOICE]
    const engine = makeEngine(synth)
    await engine.whenReady()
    expect(engine.isAvailable()).toBe(true)
  })

  it('finds the Hebrew voice after voiceschanged fires', async () => {
    const synth = new FakeSynth()
    const engine = makeEngine(synth)
    synth.voices = [HEBREW_VOICE]
    synth.fireVoicesChanged()
    await engine.whenReady()
    expect(engine.isAvailable()).toBe(true)
  })

  it('is unavailable without a Hebrew voice and speak() resolves silently', async () => {
    const synth = new FakeSynth()
    synth.voices = [ENGLISH_VOICE]
    const engine = makeEngine(synth)
    synth.fireVoicesChanged()
    await engine.speak('שָׁלוֹם')
    expect(engine.isAvailable()).toBe(false)
    expect(synth.spoken).toHaveLength(0)
  })

  it('speaks with slow rate and cancels prior speech', async () => {
    const synth = new FakeSynth()
    synth.voices = [HEBREW_VOICE]
    const engine = makeEngine(synth)
    await engine.speak('אַבָּא', { volume: 0.5 })
    expect(synth.cancelCount).toBe(1) // cancel before each speak
    expect(synth.spoken).toHaveLength(1)
    expect(synth.spoken[0].text).toBe('אַבָּא')
    expect(synth.spoken[0].rate).toBeCloseTo(0.85)
    expect(synth.spoken[0].volume).toBeCloseTo(0.5)
  })
})
