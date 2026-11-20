// Space Cat's audio: one instance of the shared game-audio kit (src/shared/gameAudio) with Space Cat's tables and
// numbers. The voice lines are files; the effects and the tune are coded takes (coded.ts), played behind the player
// port, so the device's sound setting, the duck under every line, the mute on hide and the pause hold reach them. One
// take serves boys and girls (no line has a boy or girl form). Two audio events never touch: a line waits for the
// effect before it (SFX_TO_VOICE_MS), and `quiet()` lets a round's arrival sound wait for the voice and the last effect.
import { createGameAudio } from '../../shared/gameAudio/kit'
import { effectsOn, musicOn } from '../../shared/gameAudio/output'
import { VOICE_URLS } from '../assets/audioFiles'
import { TEST_HOOKS } from '../testHooks'
import { CODED_SFX, TUNE_URL } from './coded'
import { LINES, lineAudioId } from './lines'
import { SFX_GAIN, type SfxName } from './synth'
import { TUNE_DUCK, TUNE_GAIN } from './tune'

/** a voice line starts this long after the effect before it ends (spec *Voice*: about 0.4 s) */
export const SFX_TO_VOICE_MS = 400

/** the QA audio log of test builds (rule): every line, effect and tune start or stop that the device lets play, with its time */
type AudioLogEntry = { t: number; kind: 'voice' | 'sfx' | 'tune'; id: string }
const log = (kind: AudioLogEntry['kind'], id: string) => {
  if (TEST_HOOKS) (window as unknown as { __scAudio?: AudioLogEntry[] }).__scAudio?.push({ t: performance.now(), kind, id })
}

const kit = createGameAudio<SfxName, 'tune'>({
  game: 'spacecat',
  voices: VOICE_URLS,
  sfx: CODED_SFX,
  sfxVolume: SFX_GAIN,
  music: { tune: [TUNE_URL] },
  musicVol: TUNE_GAIN,
  duckVol: TUNE_DUCK,
  musicFadeInMs: 600,
  gapMs: 800,
  lineTimeoutMs: 9000,
  sfxTimeoutMs: 4000,
  onSay: (id) => log('voice', id),
})

const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))
const lastVariation: Record<string, number> = {}

/** the file id to play for a line: a variation other than the one played last time; undefined for an unknown line */
function fileOf(id: string): string | undefined {
  const line = LINES.find((l) => l.id === id)
  if (!line) return undefined
  if (line.reuse) return line.reuse.split('/').pop()
  const n = line.he.length
  let i = Math.floor(Math.random() * n)
  if (n > 1 && i === lastVariation[id]) i = (i + 1) % n
  lastVariation[id] = i
  return lineAudioId(id, i + 1)
}

let lastVoice: Promise<unknown> = Promise.resolve()
/** says a line (after anything queued); true when it was heard. An unknown line or a missing file: at once, false. */
export function say(id: string): Promise<boolean> {
  const file = fileOf(id)
  if (!file) return Promise.resolve(false)
  const p = kit.say([file])
  lastVoice = Promise.all([lastVoice, p])
  return p
}

let infoBusy = false
/** a short explanation (a tap on the hearts, the points, his best, a locked ship): once for a burst of taps */
export function sayInfo(id: string): void {
  if (infoBusy || !fileOf(id)) return
  infoBusy = true
  void say(id).finally(() => { infoBusy = false })
}

let lastEffect: Promise<void> = Promise.resolve()
/** plays an effect; resolves when it ends (at once when effects are off on the device) */
export function playSfx(name: SfxName): Promise<void> {
  if (effectsOn()) log('sfx', name)
  const p = kit.playSfx(name)
  const before = lastEffect
  lastEffect = Promise.all([before, p]).then(() => {})
  return p
}

/** waits for the effect's end and SFX_TO_VOICE_MS, then says the line, unless `still()` says the screen has gone */
export async function sayAfterSfx(sfx: Promise<void>, id: string, still: () => boolean = () => true): Promise<boolean> {
  await sfx
  await wait(SFX_TO_VOICE_MS)
  return still() ? say(id) : false
}

/** the tune (only while the device's music is on; it ducks under every line) */
export function startTune(): void {
  if (musicOn()) log('tune', 'start')
  kit.startMusic('tune')
}
export function stopTune(): void {
  log('tune', 'stop')
  kit.stopMusic()
}

/** a pause or leaving: the voice stops (its queue too) and the tune fades out */
export function stopAll(): void {
  kit.stopVoice()
  stopTune()
}

/** stops the voice now (a touch ends a tip) */
export const stopVoice = (): void => kit.stopVoice()

/** resolves when every line asked for so far and the last effect have ended (a stop ends them too) */
export async function quiet(): Promise<void> {
  for (;;) {
    const voice = lastVoice, effect = lastEffect
    await Promise.all([voice, effect])
    if (voice === lastVoice && effect === lastEffect) return
  }
}

/** the preload's effects step (the coded takes need no load: the kit passes over them) */
export const preloadSfx = (): void => kit.preloadSfx()
