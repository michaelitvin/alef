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

function setup(media: PlayerHost['media'] = (id) => ({ kind: 'audio', src: 'media/' + id })) {
  const audio = fakeAudio()
  const host: PlayerHost = { media, changed: () => {}, scrollTo: () => {} }
  const p = createPlayer(audio, host)
  const flush = () => new Promise((r) => setTimeout(r, 0))
  return { audio, p, flush }
}

describe('player', () => {
  it('plays one item and nothing after it', async () => {
    const { audio, p, flush } = setup()
    p.playItem('a')
    audio.pending[0].resolve()
    await flush()
    audio.end()
    expect(p).toMatchObject({ cur: 'a', playing: false, failed: false })
    expect(audio.played).toEqual(['media/a'])
  })

  it('a decision while the clip still loads: the next item plays, and the late rejection of the old play changes nothing', async () => {
    const { audio, p, flush } = setup()
    p.playItem('a')
    // what the page does after OK: play the next item at once; a's play() rejects late, after b started
    p.playItem('b')
    await flush()
    expect(p).toMatchObject({ playing: true, cur: 'b', failed: false })
    expect(audio.played).toEqual(['media/a', 'media/b'])
  })

  it('a clip that does not load (a blip) leaves the item current with a retry', async () => {
    const { audio, p, flush } = setup()
    p.playItem('a')
    audio.pending[0].reject(Object.assign(new Error('no network'), { name: 'NotSupportedError' }))
    await flush()
    expect(p).toMatchObject({ cur: 'a', playing: false, failed: true })
    p.playItem('a')
    expect(p).toMatchObject({ cur: 'a', playing: true, failed: false })
  })

  it('a picture becomes current with no sound; select makes an item current without playing', () => {
    const { audio, p } = setup((id) => (id.startsWith('pic') ? { kind: 'image' } : { kind: 'audio', src: 'media/' + id }))
    p.playItem('pic-cat')
    expect(p).toMatchObject({ cur: 'pic-cat', playing: false })
    p.select('b')
    expect(p).toMatchObject({ cur: 'b', playing: false })
    expect(audio.played).toEqual([])
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
