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
  /** The last play of the current item did not load (a network blip): Replay tries again. */
  readonly failed: boolean
  /** Make an item current without a sound (the first item, before his first tap: browsers need a tap before audio). */
  select(id: string | null): void
  stop(): void
  /** Make an item current and play it. A picture has no sound: it only becomes current. */
  playItem(id: string, take?: string, scroll?: boolean): void
}

export function createPlayer(audio: AudioLike, host: PlayerHost): Player {
  let cur: string | null = null
  let playing = false
  let failed = false
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

  return {
    get cur() {
      return cur
    },
    get playing() {
      return playing
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
    playItem,
  }
}
