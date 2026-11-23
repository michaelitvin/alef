// One game's audio, built on the player port (port.ts) and the device output (output.ts):
// - one voice queue: lines and learning sounds never overlap (rule), `gapMs` between parts (rule 0.7–0.9 s), voice on
//   html5 at VOICE_RATE (pitch kept); a speaker can cancel only its own parts; a stop drops the queue;
// - `playLine`: one file outside the queue, with cues timed from the call and a hook that follows the playback position;
// - the feminine take for a girl, falling back to the masculine take (never silence), logged once per id;
// - effects with rotating (or random) takes and a fallback table; music by kind, with track rotation, fades, and a duck
//   under every voice.
// Missing files resolve at once (never stall).
import { getGender, voiceFor } from '../player'
import { VOICE_RATE } from './howlerPlayer'
import { audioPlayer, effectsOn, musicOn, onMusicOff } from './output'
import type { Sound } from './port'

export { VOICE_RATE }

/** A speaker's own handle: cancelling it stops only that speaker's parts (an explanation closing must not silence the game). */
export interface VoiceSignal { cancelled: boolean }

export interface GameAudioOptions<S extends string, M extends string> {
  /** the game's name (logs) */
  game: string
  /** voice id → url */
  voices: Record<string, string>
  /** effect name → its takes */
  sfx?: Partial<Record<S, string[]>> | Record<string, string[]>
  /** an effect with no take of its own plays this one's */
  sfxFallback?: Partial<Record<S, S>>
  /** 'rotate': the next take each time (per effect); 'random': any take */
  sfxPick?: 'rotate' | 'random'
  /** an effect's volume unless the call gives one (default 0.8) */
  sfxVolume?: number
  /** music kind → tracks */
  music?: Partial<Record<M, string[]>> | Record<string, string[]>
  /** whether a kind's tracks loop (default: all loop) */
  musicLoops?: (kind: M) => boolean
  /** the voice ids that speak to the child and so have a feminine take `<id>-f` */
  feminine?: (id: string) => boolean
  /** gets `voice-fallback` once per id */
  telemetry?: { track(e: string, data?: Record<string, unknown>): void }
  /** hears every queued voice part as it starts, after the feminine choice (the QA audio log of test builds) */
  onSay?: (id: string) => void
  lineTimeoutMs: number
  sfxTimeoutMs: number
  /** the gap between the parts of one `say` */
  gapMs: number
  musicVol: number
  duckVol: number
  /** the fade-in of a music start (ms) */
  musicFadeInMs: number
}

export interface PlayLineOptions {
  /** seconds into the file (at VOICE_RATE: timed from the call) of each cue; given the file that really plays */
  cues?: (file: string) => number[]
  /** hears cue i as it is spoken; any cue not yet heard fires when the line ends (early, failed or missing) */
  onCue?: (i: number) => void
  /** follows the sound's playback position once it starts (the clock's caption words); `finish` runs as it ends; given
   * the file that really plays */
  follow?: (position: () => number | null, file: string) => { finish(): void }
  /** a line with no file: the game's own stand-in for it (the clock walks the caption at a reading pace) instead of
   * nothing; the line resolves false after it */
  missing?: (file: string) => Promise<void>
  /** the words the line shows on screen, passed to the player (a test player can wait for them to show) */
  caption?: string[]
  /** the file really plays (loaded), with its length in ms when the player knows it; never for a line with no file */
  onHeard?: (ms: number | null) => void
}

export function createGameAudio<S extends string = string, M extends string = string>(o: GameAudioOptions<S, M>) {
  const sfxTakes = (o.sfx ?? {}) as Record<string, string[] | undefined>
  const musicTracks = (o.music ?? {}) as Record<string, string[] | undefined>
  const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

  // the feminine take
  const fellBack = new Set<string>()
  const exists = (id: string) => audioPlayer().hasVoice?.(id) ?? id in o.voices
  /** The file to play for `id`: the feminine take when a girl plays; a missing one falls back to the masculine take
   * (never silence) and is logged once per id (spec 2026-11-07 girls). */
  function voiceFile(id: string): string {
    if (!o.feminine) return id
    const r = voiceFor(id, getGender(), exists, o.feminine)
    if (r.fallback && !fellBack.has(id)) {
      fellBack.add(id)
      o.telemetry?.track('voice-fallback', { id })
    }
    return r.id
  }
  const urlOf = (file: string) => {
    const p = audioPlayer()
    return p.voiceUrl ? p.voiceUrl(file, o.voices[file]) : o.voices[file]
  }

  // music and the duck
  let music: { url: string; sound: Sound } | null = null
  let ducks = 0
  const level = () => (ducks > 0 ? o.duckVol : o.musicVol)
  function duck(on: boolean) {
    ducks = Math.max(0, ducks + (on ? 1 : -1))
    if (music?.sound.playing()) music.sound.fade(level(), 200)
  }

  // the voice queue
  let current: Sound | null = null
  let currentSignal: VoiceSignal | null = null
  const lines = new Set<Sound>()
  /**
   * Plays one voice file; false when it has no file (a missing file never stalls, but it was not heard either).
   * `onHeard`: the file really plays (loaded), with its length in ms when the player knows it; never for a missing file
   */
  async function playFile(id: string, onHeard?: (ms: number | null) => void): Promise<boolean> {
    const url = urlOf(id)
    if (!url) return false
    duck(true)
    const heard = onHeard ? { onStart: (x: Sound) => { const d = x.duration?.(); onHeard(d ? Math.round(d * 1000) : null) } } : {}
    const s = audioPlayer().play(url, { kind: 'voice', id, rate: VOICE_RATE, html5: true, timeoutMs: o.lineTimeoutMs, ...heard })
    current = s
    try {
      return (await s.done) !== false
    } finally {
      if (current === s) current = null
      duck(false)
    }
  }

  let queue: Promise<unknown> = Promise.resolve()
  let epoch = 0
  const pending = new Set<object>()

  /**
   * Plays the parts in order with `gapMs` between them, after anything already queued. A stopVoice drops what is left.
   * Resolves true only when every part was really heard (a one-time moment is used up only then: a missing file or a
   * stop leaves it for next time). A part's `onStart` comes as its turn starts (also with no file); `onHeard` only when
   * its file really plays, with the file's length in ms when known.
   */
  function sayParts(parts: { id: string; onStart?: () => void; onHeard?: (ms: number | null) => void }[], gapMs = o.gapMs, signal?: VoiceSignal): Promise<boolean> {
    const mine = epoch
    const token = {}
    pending.add(token)
    const run = async (): Promise<boolean> => {
      let heard = true
      try {
        for (let i = 0; i < parts.length; i++) {
          if (epoch !== mine || signal?.cancelled) return false
          if (i > 0 && gapMs > 0) await wait(gapMs)
          if (epoch !== mine || signal?.cancelled) return false
          currentSignal = signal ?? null
          parts[i].onStart?.()
          const id = voiceFile(parts[i].id)
          o.onSay?.(id)
          if ((await playFile(id, parts[i].onHeard)) === false) heard = false
        }
        return heard && epoch === mine && !signal?.cancelled
      } finally {
        pending.delete(token)
      }
    }
    const p = queue.then(run, run)
    queue = p.catch(() => {})
    return p
  }
  const say = (ids: string[], gapMs = o.gapMs) => sayParts(ids.map((id) => ({ id })), gapMs)

  let infoBusy = false
  /** A short explanation of something on the screen; ignored while one already plays or waits (a burst of taps says it once). */
  function sayInfo(id: string) {
    if (infoBusy) return
    infoBusy = true
    void say([id]).finally(() => { infoBusy = false })
  }

  /** Stops one speaker's parts (playing or queued); everything else in the queue goes on. */
  function cancelVoice(signal: VoiceSignal) {
    signal.cancelled = true
    if (currentSignal === signal && current) current.stop()
  }

  /** Stops the voice now and drops the queued parts (a tap on the cue, leaving the screen); stops `playLine` too. */
  function stopVoice() {
    epoch++
    pending.clear()
    infoBusy = false
    queue = Promise.resolve()
    current?.stop()
    lines.forEach((s) => s.stop())
  }

  /**
   * Plays one voice line now, outside the queue (the tower, the clock). Resolves when it ends; true when a file
   * played, false when it has none (every cue has fired by then either way). A stopVoice stops it.
   */
  async function playLine(lineId: string, opts: PlayLineOptions = {}): Promise<boolean> {
    const id = voiceFile(lineId)
    const cues = opts.onCue ? (opts.cues?.(id) ?? []) : []
    const fired = new Set<number>()
    const fire = (i: number) => {
      if (fired.has(i)) return
      fired.add(i)
      opts.onCue!(i)
    }
    const fireRest = () => cues.forEach((_, i) => fire(i))
    const url = urlOf(id)
    if (!url) {
      if (opts.missing) await opts.missing(id)
      fireRest()
      return false
    }
    const timers = cues.map((at, i) => window.setTimeout(() => fire(i), (at / VOICE_RATE) * 1000))
    let follower: { finish(): void } | null = null
    duck(true)
    const s = audioPlayer().play(url, {
      kind: 'voice', id, rate: VOICE_RATE, html5: true, timeoutMs: o.lineTimeoutMs, caption: opts.caption,
      ...(opts.onHeard ? { onStart: (x: Sound) => { const d = x.duration?.(); opts.onHeard!(d ? Math.round(d * 1000) : null) } } : {}),
      onPlay: (x) => { if (opts.follow) follower = opts.follow(() => x.position(), id) },
    })
    lines.add(s)
    try {
      return (await s.done) !== false
    } finally {
      lines.delete(s)
      timers.forEach((t) => window.clearTimeout(t))
      fireRest()
      ;(follower as { finish(): void } | null)?.finish()
      duck(false)
    }
  }

  const lastSfx: Record<string, number> = {}
  /** Plays an effect (its takes rotate, or one at random); resolves when it ends. Effects off or none: at once. */
  function playSfx(want: S, opts: { volume?: number } = {}): Promise<void> {
    const name: string = sfxTakes[want]?.length ? want : (o.sfxFallback?.[want] ?? want)
    const takes = sfxTakes[name]
    if (!effectsOn() || !takes?.length) return Promise.resolve()
    let i: number
    if (o.sfxPick === 'random') i = Math.floor(Math.random() * takes.length)
    else {
      i = ((lastSfx[name] ?? -1) + 1) % takes.length
      lastSfx[name] = i
    }
    const s = audioPlayer().play(takes[i], { kind: 'sfx', id: name, volume: opts.volume ?? o.sfxVolume ?? 0.8, timeoutMs: o.sfxTimeoutMs })
    return s.done.then(() => {})
  }

  const lastTrack: Record<string, number> = {}
  /** Music of a kind; each start moves to the next track of that kind (or plays track `track`, wrapped). The same track
   * already playing: nothing changes. */
  function startMusic(kind: M, opts: { track?: number } = {}) {
    const tracks = musicTracks[kind]
    if (!musicOn() || !tracks?.length) return
    const i = opts.track !== undefined ? opts.track % tracks.length : ((lastTrack[kind] ?? -1) + 1) % tracks.length
    lastTrack[kind] = i
    const url = tracks[i]
    if (music?.url === url) return
    stopMusic()
    const loop = o.musicLoops ? o.musicLoops(kind) : true
    const sound = audioPlayer().play(url, {
      kind: 'music', id: kind, loop, volume: 0,
      onPlay: (s) => s.fade(level(), o.musicFadeInMs),
    })
    music = { url, sound }
  }
  /** Fades the music out. */
  function stopMusic() {
    if (!music) return
    const { url, sound } = music
    music = null
    if (!sound.playing()) {
      sound.stop()
      return
    }
    sound.fade(0, 300)
    window.setTimeout(() => { if (music?.url !== url) sound.stop() }, 320)
  }
  onMusicOff(stopMusic)

  /** Starts loading these voice files (streamed). */
  function preloadVoices(ids: string[]) {
    for (const id of ids) if (o.voices[id]) audioPlayer().preload(o.voices[id], true)
  }
  /** Starts loading every effect take. */
  function preloadSfx() {
    for (const takes of Object.values(sfxTakes)) for (const url of takes ?? []) audioPlayer().preload(url, false)
  }

  return {
    sayParts,
    say,
    sayInfo,
    voiceSignal: (): VoiceSignal => ({ cancelled: false }),
    cancelVoice,
    stopVoice,
    /** nothing is playing or waiting in the voice queue */
    voiceIdle: () => pending.size === 0,
    voiceFile,
    /** the voice file of `id` (after the feminine choice) is there to play */
    hasFile: (id: string): boolean => !!urlOf(voiceFile(id)),
    playLine,
    playSfx,
    startMusic,
    stopMusic,
    preloadVoices,
    preloadSfx,
  }
}
