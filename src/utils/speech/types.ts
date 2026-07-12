export interface SpeakOptions {
  /** Playback rate; default 0.85 (kid-friendly) */
  rate?: number
  /** Volume 0-1; default 1 */
  volume?: number
  /** Called when audio actually begins (TTS startup can be slow) */
  onStart?: () => void
}

/**
 * Speech backend abstraction. Components never touch speechSynthesis
 * directly — Hebrew TTS quality varies by platform, so the backend
 * must be swappable (pre-generated audio, cloud TTS, ...).
 */
export interface SpeechEngine {
  /** Speak text; resolves when done (or on error). Cancels prior speech. */
  speak(text: string, opts?: SpeakOptions): Promise<void>
  /** Stop any in-flight speech */
  cancel(): void
  /** True if the engine can actually produce Hebrew speech */
  isAvailable(): boolean
  /** Resolves once availability is known (voice loading is async) */
  whenReady(): Promise<void>
}
