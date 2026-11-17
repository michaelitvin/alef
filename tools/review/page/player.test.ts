import { describe, expect, it } from 'vitest'
import { createPlayer } from './player.ts'
import type { AudioLike, PlayerHost } from './player.ts'
import { HttpError, sendWithRetry, tapGuard } from './save.ts'

/** An audio element whose plays stay pending until the test settles them, as on a slow network. */
function fakeAudio() {
  const handlers: Record<string, (() => void)[]> = { ended: [], error: [] }
  const pending: { src: string; resolve: () => void; reject: (e: Error) => void }[] = []
  const a = {
    src: '',
    played: [] as string[],
    play() {
      a.played.push(a.src)
      return new Promise<void>((resolve, reject) => pending.push({ src: a.src, resolve, reject }))
    },
    // a new load or a pause cuts a pending play short, as browsers do
    pause() {
      for (const p of pending.splice(0)) p.reject(Object.assign(new Error('interrupted'), { name: 'AbortError' }))
    },
    addEventListener(type: 'ended' | 'error', fn: () => void) {
      handlers[type].push(fn)
    },
    end() {
      for (const f of handlers.ended) f()
    },
    pending,
  }
  const setSrc = (v: string) => {
    for (const p of pending.splice(0)) p.reject(Object.assign(new Error('new load'), { name: 'AbortError' }))
    srcValue = v
  }
  let srcValue = ''
  Object.defineProperty(a, 'src', { get: () => srcValue, set: setSrc })
  return a as typeof a & AudioLike
}

function setup() {
  const audio = fakeAudio()
  const timers: (() => void)[] = []
  const host: PlayerHost = { media: (id) => ({ kind: 'audio', src: 'media/' + id }), changed: () => {}, scrollTo: () => {} }
  const p = createPlayer(audio, host, { pictureMs: 1, gapMs: 1, setTimeout: (fn) => timers.push(fn), clearTimeout: () => {} })
  const flush = () => new Promise((r) => setTimeout(r, 0))
  const fire = () => timers.splice(0).forEach((f) => f())
  return { audio, p, flush, fire }
}

describe('player', () => {
  it('a run started while the previous clip still loads goes on to its end', async () => {
    const { audio, p, flush, fire } = setup()
    p.playRun(['a', 'b', 'c'])
    // he taps "play from here" on b before a has loaded: a's play() rejects late, after b started
    p.playRun(['b', 'c'])
    await flush()
    expect(p.playing).toBe(true)
    expect(p.queue).toEqual(['c'])
    audio.pending[0].resolve()
    audio.end()
    fire()
    expect(audio.played).toEqual(['media/a', 'media/b', 'media/c'])
  })

  it('a decision during loading: the next item plays and the run goes on', async () => {
    const { audio, p, flush } = setup()
    p.playRun(['a', 'b', 'c'])
    // what the page does after OK: stop, then play the next item with the rest of the run
    p.stop()
    p.setQueue(['c'])
    p.playItem('b')
    await flush()
    expect(p).toMatchObject({ playing: true, cur: 'b', queue: ['c'] })
    expect(audio.played[audio.played.length - 1]).toBe('media/b')
  })

  it('a play that really fails (not cut short) ends the run', async () => {
    const { audio, p, flush } = setup()
    p.playRun(['a', 'b'])
    audio.pending[0].reject(Object.assign(new Error('not allowed'), { name: 'NotAllowedError' }))
    await flush()
    expect(p).toMatchObject({ playing: false, queue: [] })
  })
})

describe('saving a decision', () => {
  const noSleep = async () => {}

  it('tries again after a blip, and gives up on a refused decision', async () => {
    let n = 0
    const blip = () => (++n < 3 ? Promise.reject(new TypeError('Failed to fetch')) : Promise.resolve('saved'))
    await expect(sendWithRetry(blip, [1, 1, 1], noSleep)).resolves.toBe('saved')
    expect(n).toBe(3)
    let m = 0
    const refused = () => (m++, Promise.reject(new HttpError('no such take', 400)))
    await expect(sendWithRetry(refused, [1, 1], noSleep)).rejects.toThrow('no such take')
    expect(m).toBe(1)
    await expect(sendWithRetry(() => Promise.reject(new HttpError('down', 502)), [1], noSleep)).rejects.toThrow('down')
  })

  it('ignores the second tap of a double tap', () => {
    let t = 1000
    const g = tapGuard(() => t, 500)
    expect(g.take()).toBe(true)
    t += 80
    expect(g.take()).toBe(false)
    t += 600
    expect(g.take()).toBe(true)
  })
})
