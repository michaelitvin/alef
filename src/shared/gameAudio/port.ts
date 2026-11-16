// The player port: how a game's audio kit plays a file. Howler is one adapter (howlerPlayer.ts); the tests use one fake
// (fakePlayer.ts). Howler's mute and volume are global, so the device output (output.ts) holds the one player in use.

export type SoundKind = 'voice' | 'sfx' | 'music'

export interface PlayOptions {
  kind: SoundKind
  /** what plays: the voice id, the effect name or the music kind (for logs; the url is what plays) */
  id: string
  /** playback rate; html5 keeps the pitch (the voice) */
  rate?: number
  html5?: boolean
  loop?: boolean
  /** the sound's volume; unset keeps the file's own */
  volume?: number
  /** a one-shot sound (voice, effect) is given up after this long: a missing or silent file never stalls the game */
  timeoutMs?: number
  /** the sound has started (music: after its file has loaded) */
  onPlay?: (s: Sound) => void
}

export interface Sound {
  /** ends on the sound's end, a stop, an error or the timeout. False: nothing was heard (a test player only). */
  done: Promise<void | boolean>
  stop(): void
  pause(): void
  resume(): void
  /** fades from the current volume */
  fade(to: number, ms: number): void
  /** the playback position (s, media time), or null while it is not playing */
  position(): number | null
  playing(): boolean
}

export interface AudioPlayer {
  play(url: string, o: PlayOptions): Sound
  preload(url: string, html5: boolean): void
  setMute(on: boolean): void
  setVolume(v: number): void
  /** call inside a user tap (autoplay policies) */
  unlock(): void
  /** A test player can stand in for a voice file that is not there, or hide one that is. Unset: the url as given. */
  voiceUrl?(id: string, url: string | undefined): string | undefined
  /** A test player can say which voice files exist (the feminine fallback). Undefined: the game's own files decide. */
  hasVoice?(id: string): boolean | undefined
}
