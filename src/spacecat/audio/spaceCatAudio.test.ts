import { describe, expect, it } from 'vitest'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { applySound } from '../../shared/gameAudio/output'
import { codedSource } from '../../shared/gameAudio/coded'
import { hasLine, playSfx, quiet, say, sayAfterSfx, sayInfo, startTune, stopAll, stopTune, stopVoice } from './spaceCatAudio'
import { CODED_SFX, TUNE_URL } from './coded'
import { SFX_NAMES } from './sfx'
import { TUNE_DUCK, TUNE_GAIN } from './tune'

const audio = installFakeAudio()
const flush = () => new Promise((r) => setTimeout(r, 0))
const tune = () => audio.live().find((e) => e.kind === 'music')

describe('Space Cat on the audio kit', () => {
  it('the QA audio log records only what the device lets play', async () => {
    const w = window as unknown as { __scAudio?: { kind: string; id: string }[] }
    w.__scAudio = []
    applySound({ sfx: false, music: false, volume: 0.8 })
    await playSfx('right')
    startTune()
    stopTune()
    expect(w.__scAudio.map((e) => `${e.kind}:${e.id}`)).toEqual(['tune:stop'])
    applySound({ sfx: true, music: true, volume: 0.8 })
    void playSfx('right')
    startTune()
    stopTune()
    expect(w.__scAudio.map((e) => `${e.kind}:${e.id}`)).toEqual(['tune:stop', 'sfx:right', 'tune:start', 'tune:stop'])
    delete w.__scAudio
  })

  it('say resolves at once for an unknown id', async () => {
    expect(await say('no-such-line')).toBe(false)
    expect(audio.said()).toEqual([])
  })

  it('hasLine: a line with a take; a missing file or an unknown line has none', () => {
    expect(hasLine('compare')).toBe(true)
    expect(hasLine('new-best')).toBe(true)
    expect(hasLine('no-such-line')).toBe(false)
    audio.missing = (id) => id === 'compare-1'
    expect(hasLine('compare')).toBe(false)
    expect(hasLine('jumps')).toBe(true)
  })

  it('say runs onStart as the line starts', async () => {
    const started: string[] = []
    const p = say('jumps', { onStart: () => started.push(audio.said().join()) })
    expect(await p).toBe(true)
    // onStart comes just before the file plays
    expect(started).toEqual([''])
    expect(audio.said()).toEqual(['jumps-1'])
  })

  it('a missing file resolves at once and is not heard', async () => {
    audio.missing = () => true
    expect(await say('demo')).toBe(false)
  })

  it('no variation twice in a row', async () => {
    for (let i = 0; i < 12; i++) await say('level-done')
    const said = audio.said()
    expect(new Set(said)).toEqual(new Set(['level-done-1', 'level-done-2']))
    for (let i = 1; i < said.length; i++) expect(said[i]).not.toBe(said[i - 1])
  })

  it('sayInfo says a line once for a burst of taps', async () => {
    audio.holdUntil(/^info-/)
    sayInfo('info-hearts'); sayInfo('info-hearts'); sayInfo('info-hearts')
    await flush()
    expect(audio.said()).toEqual(['info-hearts-1'])
    audio.release()
  })

  it('stopVoice ends the line now', async () => {
    audio.holdUntil(/^zoom-tip/)
    const line = say('zoom-tip')
    await flush()
    stopVoice()
    expect(await line).toBe(false)
  })

  it('new-best plays Book 2\'s take', async () => {
    await say('new-best')
    expect(audio.said()).toEqual(['new-best-1'])
  })

  it('the tune ducks under a line and comes back', async () => {
    applySound({ sfx: true, music: true, volume: 0.8 })
    startTune()
    expect(tune()?.url).toBe(TUNE_URL)
    expect(tune()?.volume).toBe(TUNE_GAIN)
    audio.holdUntil(/^demo/)
    const line = say('demo')
    await flush()
    expect(tune()?.volume).toBe(TUNE_DUCK)
    audio.release()
    await line
    expect(tune()?.volume).toBe(TUNE_GAIN)
    stopTune()
  })

  it('stopAll stops the tune and the voice', async () => {
    applySound({ sfx: true, music: true, volume: 0.8 })
    startTune()
    audio.holdUntil(/^demo/)
    const line = say('demo')
    await flush()
    stopAll()
    expect(await line).toBe(false)
    await new Promise((r) => setTimeout(r, 400))
    expect(audio.live()).toEqual([])
  })

  it('a voice line waits for the effect before it', async () => {
    audio.sfxMs = 300
    const t0 = Date.now()
    let at = 0
    audio.onPlay = (e) => { if (e.kind === 'voice') at = Date.now() - t0 }
    await sayAfterSfx(playSfx('level'), 'level-done')
    expect(at).toBeGreaterThanOrEqual(700)
  })

  it('quiet waits for the voice queue and the last effect', async () => {
    audio.sfxMs = 200
    audio.holdUntil(/^missing/)
    void playSfx('right')
    void say('missing')
    let done = false
    void quiet().then(() => { done = true })
    await new Promise((r) => setTimeout(r, 250))
    expect(done).toBe(false)
    audio.release()
    await new Promise((r) => setTimeout(r, 10))
    expect(done).toBe(true)
  })

  it('two quiet() calls at once both end', async () => {
    audio.voiceMs = 20
    void say('demo')
    const both = Promise.all([quiet(), quiet()])
    let done = false
    void both.then(() => { done = true })
    await new Promise((r) => setTimeout(r, 60))
    expect(done).toBe(true)
  })

  it('effects off on the device: no coded effect plays', async () => {
    applySound({ sfx: false, music: true, volume: 0.8 })
    await playSfx('right')
    expect(audio.log().filter((e) => e.kind === 'sfx')).toEqual([])
    applySound({ sfx: true, music: true, volume: 0.8 })
    await playSfx('right')
    expect(audio.log().filter((e) => e.kind === 'sfx').map((e) => e.url)).toEqual(['coded:spacecat/right'])
  })

  it('music off on the device stops the tune', () => {
    applySound({ sfx: true, music: true, volume: 0.8 })
    startTune()
    expect(tune()).toBeDefined()
    applySound({ sfx: true, music: false, volume: 0.8 })
    return new Promise<void>((r) => setTimeout(() => { expect(tune()).toBeUndefined(); r() }, 400))
  })

  it('every SfxName and the tune have a registered source', () => {
    for (const n of SFX_NAMES) {
      expect(CODED_SFX[n]).toHaveLength(1)
      expect(codedSource(CODED_SFX[n][0])).toBeTypeOf('function')
    }
    expect(codedSource(TUNE_URL)).toBeTypeOf('function')
  })
})
