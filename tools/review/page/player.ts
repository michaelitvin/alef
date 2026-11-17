// Playback, apart from the DOM: one item at a time, a run of items with a gap, a picture stays a moment. A play that a
// newer play or a stop cut short must not change the newer one: its play() promise rejects (AbortError) after the
// newer play started, so each play carries a number, and a late rejection of an older number does nothing.

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
  /** Called after each change of the selection or of the playing state. */
  changed(): void
  scrollTo(id: string): void
}

export interface PlayerTiming {
  pictureMs: number
  gapMs: number
  setTimeout: (fn: () => void, ms: number) => unknown
  clearTimeout: (t: unknown) => void
}

export interface Player {
  readonly cur: string | null
  readonly playing: boolean
  readonly queue: string[]
  select(id: string | null): void
  setQueue(ids: string[]): void
  stop(): void
  playItem(id: string, take?: string, scroll?: boolean): void
  playRun(ids: string[]): void
}

export function createPlayer(audio: AudioLike, host: PlayerHost, timing: PlayerTiming): Player {
  let cur: string | null = null
  let playing = false
  let queue: string[] = []
  let timer: unknown
  let gen = 0

  function stop() {
    gen++
    timing.clearTimeout(timer)
    playing = false
    queue = []
    audio.pause()
    host.changed()
  }

  function onEnded() {
    if (!playing) return
    const n = queue.shift()
    if (n) timer = timing.setTimeout(() => playItem(n), timing.gapMs)
    else {
      playing = false
      host.changed()
    }
  }
  audio.addEventListener('ended', onEnded)
  audio.addEventListener('error', onEnded)

  function playItem(id: string, take?: string, scroll = true) {
    timing.clearTimeout(timer)
    const m = host.media(id, take)
    if (!m) return
    const mine = ++gen
    cur = id
    playing = true
    host.changed()
    if (scroll) host.scrollTo(id)
    // a picture has no sound: it stays selected for a moment, then the run goes on
    if (m.kind === 'image') {
      audio.pause()
      timer = timing.setTimeout(onEnded, timing.pictureMs)
      return
    }
    if (!m.src) return onEnded()
    audio.src = m.src
    audio.play().catch(() => {
      if (mine !== gen) return // a newer play or a stop cut this one short: not a failure of the newer one
      playing = false
      queue = []
      host.changed()
    })
  }

  return {
    get cur() {
      return cur
    },
    get playing() {
      return playing
    },
    get queue() {
      return queue
    },
    select(id) {
      cur = id
    },
    setQueue(ids) {
      queue = ids.slice()
    },
    stop,
    playItem,
    playRun(ids) {
      if (!ids.length) return
      stop()
      queue = ids.slice(1)
      playItem(ids[0])
    },
  }
}
