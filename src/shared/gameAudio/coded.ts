// Coded sound: WebAudio code that plays behind the player port as a `coded:` url, like a file. A game registers a
// source under its url; the Howler adapter (howlerPlayer.ts) plays it on Howler's context into a gain of its own that
// ends in Howler's master gain, so the device's volume, the mute on hide and the pause hold reach it, and the kit's
// gates, fades, duck and test fake treat it as any other take. A registry by url: this module knows no game.

export interface WebAudioOut { ctx: AudioContext; out: AudioNode }

export interface CodedPlay {
  stop(): void
  /** ms until it ends; null: until it is stopped (a tune) */
  lengthMs: number | null
}

/** builds its nodes on `out.ctx`, all ending in `out.out` (never the context's destination), and starts them */
export type CodedSource = (out: WebAudioOut) => CodedPlay

const sources = new Map<string, CodedSource>()

export const isCoded = (url: string): boolean => url.startsWith('coded:')

export function registerCoded(url: string, source: CodedSource): void {
  if (!isCoded(url)) throw new Error(`a coded url starts with "coded:": ${url}`)
  sources.set(url, source)
}

export const codedSource = (url: string): CodedSource | undefined => sources.get(url)
