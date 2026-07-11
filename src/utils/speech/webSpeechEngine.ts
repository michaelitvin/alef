import type { SpeakOptions, SpeechEngine } from './types'

const VOICE_LOAD_TIMEOUT_MS = 2000
const DEFAULT_RATE = 0.85

/**
 * Web Speech API backend. Picks a Hebrew voice (preferring local ones).
 * getVoices() often returns [] until the async 'voiceschanged' event.
 */
export class WebSpeechEngine implements SpeechEngine {
  private voice: SpeechSynthesisVoice | null = null
  private readonly synth: SpeechSynthesis | null
  private readonly ready: Promise<void>

  constructor(synth?: SpeechSynthesis) {
    this.synth =
      synth ?? (typeof window !== 'undefined' ? window.speechSynthesis ?? null : null)
    this.ready = this.synth ? this.loadVoice(this.synth) : Promise.resolve()
  }

  private loadVoice(synth: SpeechSynthesis): Promise<void> {
    return new Promise((resolve) => {
      const pick = (): boolean => {
        const hebrew = synth
          .getVoices()
          .filter((v) => v.lang.toLowerCase().startsWith('he'))
        this.voice = hebrew.find((v) => v.localService) ?? hebrew[0] ?? null
        return this.voice !== null
      }

      if (pick()) {
        resolve()
        return
      }
      const timer = setTimeout(() => {
        pick()
        resolve()
      }, VOICE_LOAD_TIMEOUT_MS)
      synth.addEventListener('voiceschanged', () => {
        if (pick()) {
          clearTimeout(timer)
          resolve()
        }
      })
    })
  }

  whenReady(): Promise<void> {
    return this.ready
  }

  isAvailable(): boolean {
    return this.voice !== null
  }

  cancel(): void {
    this.synth?.cancel()
  }

  async speak(text: string, opts: SpeakOptions = {}): Promise<void> {
    await this.ready
    const synth = this.synth
    const voice = this.voice
    if (!synth || !voice) return
    synth.cancel()
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voice
      utterance.lang = voice.lang
      utterance.rate = opts.rate ?? DEFAULT_RATE
      utterance.volume = opts.volume ?? 1
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      synth.speak(utterance)
    })
  }
}
