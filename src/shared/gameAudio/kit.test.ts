// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createGameAudio } from './kit'
import { installFakeAudio } from './fakePlayer'
import { applySound, holdAudio, setHidden } from './output'
import { clearGender, setGender } from '../player'

const audio = installFakeAudio()
const track = vi.fn()
const onSay = vi.fn()
const kit = createGameAudio<'zap' | 'catch' | 'spell' | 'none', 'flight' | 'celebrate'>({
  game: 'test',
  voices: { a: '/a.mp3', b: '/b.mp3', 'q-1': '/q-1.mp3', 'q-1-f': '/q-1-f.mp3', 'q-2': '/q-2.mp3', 'syl-1': '/syl-1.mp3' },
  sfx: { zap: ['/zap-1.mp3', '/zap-2.mp3'], catch: ['/catch-1.mp3'] },
  sfxFallback: { spell: 'zap' },
  music: { flight: ['/f-1.mp3', '/f-2.mp3'], celebrate: ['/c-1.mp3'] },
  musicLoops: (k) => k !== 'celebrate',
  feminine: (id) => id.startsWith('q-'),
  telemetry: { track },
  onSay,
  lineTimeoutMs: 9000,
  sfxTimeoutMs: 4000,
  gapMs: 800,
  musicVol: 0.35,
  duckVol: 0.08,
  musicFadeInMs: 600,
})
const random = createGameAudio<'boom', never>({
  game: 'test-random', voices: {}, sfx: { boom: ['/boom-1.mp3', '/boom-2.mp3'] }, sfxPick: 'random',
  lineTimeoutMs: 9000, sfxTimeoutMs: 3000, gapMs: 0, musicVol: 0, duckVol: 0, musicFadeInMs: 0,
})

describe('the game-audio kit', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    applySound({ sfx: true, music: true, volume: 0.8 })
    track.mockClear()
    onSay.mockClear()
  })
  afterEach(async () => {
    kit.stopVoice()
    kit.stopMusic()
    await vi.advanceTimersByTimeAsync(1000)
    clearGender()
    vi.useRealTimers()
  })

  describe('the voice queue', () => {
    it('plays in order with an 800 ms gap and never overlaps', async () => {
      audio.voiceMs = 300
      void kit.say(['a', 'b'])
      await vi.advanceTimersByTimeAsync(300)
      expect(audio.said()).toEqual(['a'])
      await vi.advanceTimersByTimeAsync(799)
      expect(audio.said()).toEqual(['a'])
      await vi.advanceTimersByTimeAsync(1)
      expect(audio.said()).toEqual(['a', 'b'])
      expect(audio.log()[1].at - audio.log()[0].at).toBe(1100)
    })
    it('a second say waits for the first', async () => {
      audio.voiceMs = 100
      void kit.say(['a'])
      void kit.say(['b'])
      await vi.advanceTimersByTimeAsync(50)
      expect(audio.said()).toEqual(['a'])
      await vi.advanceTimersByTimeAsync(1000)
      expect(audio.said()).toEqual(['a', 'b'])
    })
    it('tells whether every part was heard: a missing file or a stop is not', async () => {
      let r: boolean | undefined
      audio.missing = (id) => id === 'b'
      void kit.sayParts([{ id: 'a' }, { id: 'b' }], 0).then((x) => { r = x })
      await vi.advanceTimersByTimeAsync(10)
      expect(r).toBe(false)
      expect(audio.said()).toEqual(['a'])
      audio.missing = null
      audio.voiceMs = 100
      void kit.sayParts([{ id: 'a' }]).then((x) => { r = x })
      expect(kit.voiceIdle()).toBe(false)
      await vi.advanceTimersByTimeAsync(150)
      expect(r).toBe(true)
      expect(kit.voiceIdle()).toBe(true)
      r = undefined
      void kit.sayParts([{ id: 'a' }, { id: 'b' }]).then((x) => { r = x })
      await vi.advanceTimersByTimeAsync(50)
      kit.stopVoice()
      await vi.advanceTimersByTimeAsync(2000)
      expect(r).toBe(false)
    })
    it('a part the test player reports unheard counts as not heard', async () => {
      audio.onVoice(() => Promise.resolve(false))
      await expect(kit.say(['a'], 0)).resolves.toBe(false)
    })
    it('with the real files, an id that has no file resolves at once and plays nothing', async () => {
      audio.voiceUrl = (_id, url) => url // as Howler: only the game's files
      let done: boolean | undefined
      void kit.say(['nope-1']).then((x) => { done = x })
      await vi.advanceTimersByTimeAsync(1)
      expect(done).toBe(false)
      expect(audio.said()).toEqual([])
    })
    it('calls onStart as each part starts, and onSay with the file that plays', async () => {
      audio.voiceMs = 100
      const seen: string[] = []
      void kit.sayParts([{ id: 'x', onStart: () => seen.push('x') }, { id: 'y', onStart: () => seen.push('y') }], 0)
      await vi.advanceTimersByTimeAsync(10)
      expect(seen).toEqual(['x'])
      await vi.advanceTimersByTimeAsync(200)
      expect(seen).toEqual(['x', 'y'])
      expect(onSay.mock.calls.map((c) => c[0])).toEqual(['x', 'y'])
    })
    it('stopVoice stops the part that plays and drops the rest of the queue', async () => {
      audio.voiceMs = 5000
      const p = kit.say(['a', 'b', 'c'])
      await vi.advanceTimersByTimeAsync(10)
      kit.stopVoice()
      expect(audio.log()[0].stopped).toBe(true)
      await vi.advanceTimersByTimeAsync(10_000)
      await p
      expect(audio.said()).toEqual(['a'])
    })
    it('cancelling one speaker stops only its parts; the next speaker still plays', async () => {
      audio.voiceMs = 5000
      const sig = kit.voiceSignal()
      const log: string[] = []
      void kit.sayParts([{ id: 'a' }, { id: 'b' }], 0, sig).then((r) => log.push(`a ${r}`))
      void kit.sayParts([{ id: 'syl-1' }], 0).then((r) => log.push(`syl ${r}`))
      await vi.advanceTimersByTimeAsync(10)
      kit.cancelVoice(sig)
      await vi.advanceTimersByTimeAsync(10)
      expect(log).toEqual(['a false'])
      expect(audio.said()).toEqual(['a', 'syl-1'])
      expect(audio.log()[0].stopped).toBe(true)
    })
    it('held parts wait for release', async () => {
      audio.holdUntil(/^q-/)
      let done = false
      void kit.say(['a', 'q-2'], 0).then(() => { done = true })
      await vi.advanceTimersByTimeAsync(10_000)
      expect(audio.said()).toEqual(['a', 'q-2'])
      expect(done).toBe(false)
      audio.release('q-2')
      await vi.advanceTimersByTimeAsync(1)
      expect(done).toBe(true)
    })
    it('sayInfo: a burst of taps says it once', async () => {
      audio.voiceMs = 500
      kit.sayInfo('a')
      kit.sayInfo('a')
      await vi.advanceTimersByTimeAsync(100)
      kit.sayInfo('a')
      await vi.advanceTimersByTimeAsync(1000)
      expect(audio.said()).toEqual(['a'])
      kit.sayInfo('a')
      await vi.advanceTimersByTimeAsync(10)
      expect(audio.said()).toEqual(['a', 'a'])
    })
  })

  describe('the feminine take', () => {
    it('a girl hears the feminine take; a missing one falls back to the masculine take, logged once per id', async () => {
      setGender('girl', 'child')
      void kit.say(['q-1', 'q-2', 'syl-1'], 0)
      await vi.advanceTimersByTimeAsync(10)
      expect(audio.said()).toEqual(['q-1-f', 'q-2', 'syl-1'])
      expect(track).toHaveBeenCalledWith('voice-fallback', { id: 'q-2' })
      void kit.say(['q-2'], 0)
      await vi.advanceTimersByTimeAsync(10)
      expect(track.mock.calls.filter((c) => c[0] === 'voice-fallback')).toHaveLength(1)
      setGender('boy', 'parent')
      expect(kit.voiceFile('q-1')).toBe('q-1')
    })
    it('the fake can say which files exist', () => {
      setGender('girl', 'child')
      audio.exists = (id) => id !== 'q-1-f'
      expect(kit.voiceFile('q-1')).toBe('q-1')
      audio.exists = null
      expect(kit.voiceFile('q-1')).toBe('q-1-f')
    })
  })

  describe('effects', () => {
    it('takes rotate per effect at volume 0.8; a new effect plays its fallback and moves its rotation', async () => {
      void kit.playSfx('zap'); void kit.playSfx('zap'); void kit.playSfx('spell'); void kit.playSfx('catch')
      expect(audio.log().map((e) => [e.id, e.url, e.volume])).toEqual([
        ['zap', '/zap-1.mp3', 0.8], ['zap', '/zap-2.mp3', 0.8], ['zap', '/zap-1.mp3', 0.8], ['catch', '/catch-1.mp3', 0.8],
      ])
    })
    it('a call can set the volume; random picks any take; effects off or none: nothing, at once', async () => {
      const r = vi.spyOn(Math, 'random').mockReturnValue(0.9)
      void random.playSfx('boom', { volume: 0.9 })
      r.mockRestore()
      expect(audio.log()).toMatchObject([{ id: 'boom', url: '/boom-2.mp3', volume: 0.9 }])
      await expect(kit.playSfx('none')).resolves.toBeUndefined()
      applySound({ sfx: false, music: true, volume: 0.8 })
      await expect(kit.playSfx('zap')).resolves.toBeUndefined()
      expect(audio.log()).toHaveLength(1)
    })
  })

  describe('music', () => {
    it('each start moves to the next track, fading in to 0.35; a voice ducks it to 0.08 and lets it back', async () => {
      kit.startMusic('flight')
      const m = audio.live()[0]
      expect(m).toMatchObject({ kind: 'music', id: 'flight', url: '/f-1.mp3', volume: 0.35 })
      audio.voiceMs = 200
      void kit.say(['a'], 0)
      await vi.advanceTimersByTimeAsync(10)
      expect(m.volume).toBe(0.08)
      await vi.advanceTimersByTimeAsync(200)
      expect(m.volume).toBe(0.35)
      kit.startMusic('flight')
      expect(m.volume).toBe(0) // fading out
      expect(audio.live().map((e) => e.url)).toEqual(['/f-1.mp3', '/f-2.mp3'])
      await vi.advanceTimersByTimeAsync(320)
      expect(audio.live().map((e) => e.url)).toEqual(['/f-2.mp3'])
      expect(m.stopped).toBe(true)
    })
    it('music started under a voice comes in ducked; its only track already playing: nothing changes', async () => {
      audio.voiceMs = 5000
      void kit.say(['a'], 0)
      await vi.advanceTimersByTimeAsync(10)
      kit.startMusic('celebrate')
      kit.startMusic('celebrate')
      expect(audio.log().filter((e) => e.kind === 'music')).toMatchObject([{ id: 'celebrate', volume: 0.08 }])
    })
    it('the device turning music off stops it, and no music starts while it is off', async () => {
      kit.startMusic('flight')
      applySound({ sfx: true, music: false, volume: 0.5 })
      expect(audio.volume).toBe(0.5)
      await vi.advanceTimersByTimeAsync(320)
      expect(audio.live()).toEqual([])
      kit.startMusic('flight')
      expect(audio.live()).toEqual([])
    })
    it('a track index picks that track (wrapped)', () => {
      kit.startMusic('flight', { track: 3 })
      expect(audio.live()[0].url).toBe('/f-2.mp3')
    })
  })

  describe('one line outside the queue', () => {
    it('cues fire at their time over the speech rate; any left fire at the end; the position is followed', async () => {
      audio.voiceMs = 3000
      const cues: number[] = []
      const positions: (number | null)[] = []
      let finished = false
      const p = kit.playLine('a', {
        cues: (file) => (file === 'a' ? [1.15, 5.75] : []),
        onCue: (i) => cues.push(i),
        follow: (pos) => { positions.push(pos()); return { finish: () => { finished = true } } },
      })
      await vi.advanceTimersByTimeAsync(999)
      expect(cues).toEqual([])
      await vi.advanceTimersByTimeAsync(1)
      expect(cues).toEqual([0])
      await vi.advanceTimersByTimeAsync(2000)
      await expect(p).resolves.toBe(true)
      expect(cues).toEqual([0, 1])
      expect(positions).toEqual([0])
      expect(finished).toBe(true)
    })
    it('a line with no file fires every cue at once and resolves false; stopVoice stops a line', async () => {
      audio.missing = (id) => id === 'b'
      const cues: number[] = []
      await expect(kit.playLine('b', { cues: () => [1, 2], onCue: (i) => cues.push(i) })).resolves.toBe(false)
      expect(cues).toEqual([0, 1])
      audio.voiceMs = 5000
      const p = kit.playLine('a')
      await vi.advanceTimersByTimeAsync(10)
      kit.stopVoice()
      await p
      expect(audio.log().find((e) => e.id === 'a')?.stopped).toBe(true)
    })
    it('a line with no file plays the game\'s stand-in first; the follower and the player get the file and the caption', async () => {
      audio.missing = (id) => id === 'b'
      const steps: string[] = []
      const p = kit.playLine('b', {
        missing: (file) => new Promise((r) => { steps.push(`walk ${file}`); window.setTimeout(r, 500) }),
        onCue: () => steps.push('cue'), cues: () => [1],
      })
      await vi.advanceTimersByTimeAsync(499)
      expect(steps).toEqual(['walk b'])
      await vi.advanceTimersByTimeAsync(1)
      await expect(p).resolves.toBe(false)
      expect(steps).toEqual(['walk b', 'cue'])
      setGender('girl', 'child')
      const files: string[] = []
      await kit.playLine('q-1', { caption: ['x', 'y'], follow: (_pos, file) => { files.push(file); return { finish: () => {} } } })
      expect(files).toEqual(['q-1-f'])
      expect(audio.log().slice(-1)[0]).toMatchObject({ id: 'q-1-f', caption: ['x', 'y'] })
      clearGender()
    })
  })

  describe('the device output', () => {
    it('hidden mutes everything until the pause cover lets go', () => {
      setHidden(true)
      expect(audio.muted).toBe(true)
      holdAudio(true)
      setHidden(false)
      expect(audio.muted).toBe(true)
      holdAudio(false)
      expect(audio.muted).toBe(false)
    })
  })
})
