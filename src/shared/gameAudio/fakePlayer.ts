// The one fake player for every test of a game's audio (the port: port.ts). It plays nothing; it records what the kit
// asked for and ends each sound on the test's terms. Timers are `window.setTimeout`, so fake timers drive it.
//
//   const audio = installFakeAudio()            // in a describe: installs it before each test, resets it, removes it after
//   audio.voiceMs = 300                     // each voice part lasts 300 ms (default 0: it ends at once)
//   audio.durationOf = (id) => 1400         // the length (ms) a voice reports once it starts (default: voiceMs, if any)
//   audio.loadMs = 300                      // a voice or effect is heard (onStart) this long after the call (default 0)
//   audio.sfxMs = 300                       // each effect lasts 300 ms (default 0); coded urls are plain urls here
//   audio.onVoice((id, e) => …)             // or the test's own timing per voice part (resolve false: not heard);
//                                           // `e.caption` is the line's words on screen (playLine's caption)
//   audio.holdUntil(/^q-/); audio.release() // voice parts that match wait for release (one id, or all)
//   audio.exists = (id) => …                // which voice files exist (the feminine fallback); null: the game's files
//   audio.missing = (id) => …               // voice files that are not there: the kit plays nothing for them
//   audio.onPlay = (e) => …; audio.onStop   // a sound starts; a playing sound is stopped
//   audio.said(), audio.log()               // the voice ids in order; every sound { kind, id, url, at }
import { afterEach, beforeEach } from 'vitest'
import { setAudioPlayer } from './output'
import type { AudioPlayer, PlayOptions, Sound, SoundKind } from './port'

/** one sound; `volume` follows its fades (music: the duck), `stopped` is set by a stop */
export interface FakeEntry { kind: SoundKind; id: string; url: string; at: number; volume?: number; stopped?: boolean; caption?: string[] }

export interface FakePlayer extends AudioPlayer {
  voiceMs: number
  /** the length (ms) a voice file reports once it plays (Sound.duration); null: `voiceMs` when set, else unknown */
  durationOf: ((id: string) => number | null) | null
  /** a sound is really heard (PlayOptions.onStart) this long after its call: its file loading (default 0: at once) */
  loadMs: number
  sfxMs: number
  exists: ((id: string) => boolean) | null
  missing: ((id: string) => boolean) | null
  /** a sound has started */
  onPlay: ((e: FakeEntry) => void) | null
  /** a sound that was still playing has been stopped */
  onStop: ((e: FakeEntry) => void) | null
  /** the test's own player for each voice part (as long as its promise; false: not heard); null: `voiceMs` */
  onVoice(fn: ((id: string, e: FakeEntry) => Promise<void | boolean>) | null): void
  holdUntil(re: RegExp | null): void
  /** ends the held voice parts with this id (all of them without an id) */
  release(id?: string): void
  log(): FakeEntry[]
  said(): string[]
  muted: boolean
  volume: number
  /** the sounds playing now */
  live(): FakeEntry[]
  reset(): void
}

export function createFakePlayer(): FakePlayer {
  let entries: FakeEntry[] = []
  let voiceFn: ((id: string, e: FakeEntry) => Promise<void | boolean>) | null = null
  let holdRe: RegExp | null = null
  let held: { id: string; end: () => void }[] = []
  const playing = new Map<Sound, FakeEntry>()
  /** every voice id has a file (`fake:<id>`) unless `missing` says it has none */
  const standIn = (id: string, url: string | undefined) => (fake.missing?.(id) ? undefined : (url ?? `fake:${id}`))

  const fake: FakePlayer = {
    voiceMs: 0,
    durationOf: null,
    loadMs: 0,
    sfxMs: 0,
    exists: null,
    missing: null,
    onPlay: null,
    onStop: null,
    muted: false,
    volume: 1,
    play(url: string, o: PlayOptions): Sound {
      const entry: FakeEntry = { kind: o.kind, id: o.id, url, at: Date.now(), volume: o.volume }
      if (o.caption) entry.caption = o.caption
      entries.push(entry)
      let finished = false
      let resolve: (heard: boolean) => void = () => {}
      const done = new Promise<boolean>((r) => { resolve = r })
      const end = (heard = true) => {
        if (finished) return
        finished = true
        playing.delete(sound)
        resolve(heard)
      }
      const t0 = Date.now()
      const sound: Sound = {
        done,
        stop: () => {
          if (finished) return
          entry.stopped = true
          end()
          fake.onStop?.(entry)
        },
        pause: () => {},
        resume: () => {},
        fade: (to) => { entry.volume = to },
        position: () => (finished ? null : ((Date.now() - t0) / 1000) * (o.rate ?? 1)),
        playing: () => !finished,
        duration: () => {
          const ms = fake.durationOf?.(o.id) ?? (fake.voiceMs > 0 ? fake.voiceMs : null)
          return ms === null ? null : ms / 1000
        },
      }
      playing.set(sound, entry)
      fake.onPlay?.(entry)
      o.onPlay?.(sound)
      // (the fake's files are there at once: a sound is heard as it starts)
      if (o.kind !== 'music' && o.onStart) {
        const heard = o.onStart
        if (fake.loadMs > 0) window.setTimeout(() => { if (!finished) heard(sound) }, fake.loadMs)
        else heard(sound)
      }
      if (o.kind === 'voice') {
        if (voiceFn) void voiceFn(o.id, entry).then((r) => end(r !== false), () => end(false))
        else if (holdRe?.test(o.id)) held.push({ id: o.id, end: () => end() })
        else if (fake.voiceMs > 0) window.setTimeout(() => end(), fake.voiceMs)
        else end()
      } else if (o.kind === 'sfx') {
        if (fake.sfxMs > 0) window.setTimeout(() => end(), fake.sfxMs)
        else end()
      }
      // music plays until it is stopped
      return sound
    },
    preload: () => {},
    setMute: (on) => { fake.muted = on },
    setVolume: (v) => { fake.volume = v },
    unlock: () => {},
    voiceUrl: standIn,
    hasVoice: (id) => (fake.exists ? fake.exists(id) : undefined),
    onVoice: (fn) => { voiceFn = fn },
    holdUntil: (re) => { holdRe = re },
    release: (id) => {
      const go = held.filter((h) => id === undefined || h.id === id)
      held = held.filter((h) => !go.includes(h))
      go.forEach((h) => h.end())
    },
    log: () => [...entries],
    said: () => entries.filter((e) => e.kind === 'voice').map((e) => e.id),
    live: () => [...playing.values()],
    reset: () => {
      entries = []
      voiceFn = null
      holdRe = null
      held = []
      playing.clear()
      fake.voiceMs = 0
      fake.durationOf = null
      fake.loadMs = 0
      fake.sfxMs = 0
      fake.exists = null
      fake.missing = null
      fake.onPlay = null
      fake.onStop = null
      fake.muted = false
      fake.volume = 1
      fake.voiceUrl = standIn
    },
  }
  return fake
}

/** the one fake every test shares (the output holds one player, as Howler is one) */
export const fakeAudio = createFakePlayer()

/** In a describe (or at the top of a test file): plays through the fake in every test, from a fresh reset. */
export function installFakeAudio(): FakePlayer {
  beforeEach(() => {
    fakeAudio.reset()
    setAudioPlayer(fakeAudio)
  })
  afterEach(() => {
    setAudioPlayer(null)
  })
  return fakeAudio
}
