// Playback, apart from the DOM: one item at a time, and nothing plays after it by itself. A play that a newer play or a
// stop cut short must not change the newer one: its play() promise rejects (AbortError) after the newer play started,
// so each play carries a number, and a late rejection of an older number does nothing.

/** What the player needs of an audio element. */
export interface AudioLike {
  src: string
  play(): Promise<void>
  pause(): void
  addEventListener(type: 'ended' | 'error', fn: () => void): void
}

export interface PlayerHost {
  /** 'image' for a picture (no sound), else the source of the take to play; null when the item is gone. */
  media(id: string, take?: string): { kind: 'image' } | { kind: 'audio'; src: string | null } | null
  /** Called after each change of the current item or of the playing state. */
  changed(): void
  scrollTo(id: string): void
}

export interface Player {
  /** The item the buttons act on. */
  readonly cur: string | null
  readonly playing: boolean
  /** The sound of the current item is paused at its position: Play resumes it, Replay starts it again. */
  readonly paused: boolean
  /** The last play of the current item did not load (a network blip): Replay tries again. */
  readonly failed: boolean
  /** Make an item current without a sound (the first item, before his first tap: browsers need a tap before audio). */
  select(id: string | null): void
  stop(): void
  /** Pause a playing sound at its position; resume a paused one; else play the current item from the start. */
  toggle(): void
  /** Make an item current and play it. A picture has no sound: it only becomes current. */
  playItem(id: string, take?: string, scroll?: boolean): void
}

export function createPlayer(audio: AudioLike, host: PlayerHost): Player {
  let cur: string | null = null
  let playing = false
  let failed = false
  let paused = false
  let gen = 0

  /** The play numbered `mine` came to its end, or did not load. */
  function ended(mine: number, ok: boolean) {
    if (mine !== gen) return // a newer play or a stop cut this one short: not a failure of the newer one
    playing = false
    failed = !ok
    host.changed()
  }
  audio.addEventListener('ended', () => ended(gen, true))
  audio.addEventListener('error', () => playing && ended(gen, false))

  function quiet() {
    gen++
    playing = false
    failed = false
    paused = false
    audio.pause()
  }

  function playItem(id: string, take?: string, scroll = true) {
    const m = host.media(id, take)
    if (!m) return
    quiet()
    cur = id
    if (scroll) host.scrollTo(id)
    if (m.kind === 'image' || !m.src) return host.changed()
    const mine = gen
    playing = true
    host.changed()
    audio.src = m.src
    audio.play().catch(() => ended(mine, false))
  }

  /** Pause keeps the position and the source. The number moves on, so the play() it cuts short fails nothing. */
  function toggle() {
    if (!cur) return
    if (playing) {
      gen++
      playing = false
      paused = true
      audio.pause()
      return host.changed()
    }
    if (paused) {
      const mine = gen
      paused = false
      playing = true
      host.changed()
      audio.play().catch(() => ended(mine, false))
      return
    }
    playItem(cur)
  }

  return {
    get cur() {
      return cur
    },
    get playing() {
      return playing
    },
    get paused() {
      return paused
    },
    get failed() {
      return failed
    },
    select(id) {
      quiet()
      cur = id
      host.changed()
    },
    stop() {
      quiet()
      host.changed()
    },
    toggle,
    playItem,
  }
}
