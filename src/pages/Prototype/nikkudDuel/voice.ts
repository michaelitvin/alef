// PROTOTYPE — pre-rendered ElevenLabs voice lines (synced from the review page by sync_voice.py).
// wiz-<markId>: wizard (Will) says the name · mon-name-<markId>: monster (Clyde) calls the name ·
// mon-vowel-<group>: monster roars the vowel · sfx-mute: the mute monster's puff (shva).
import { Howl } from 'howler'

const files = import.meta.glob('./audio/voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
const LINES: Record<string, Howl> = {}
for (const [path, url] of Object.entries(files)) {
  const id = path.split('/').pop()!.replace('.mp3', '')
  LINES[id] = new Howl({ src: [url], preload: true })
}

// One verified Clyde recording, many monsters: each plays it at its own rate (pitch + speed).
export const MONSTER_RATE: Record<string, number> = {
  fuzzy: 1.0, blob: 1.12, imp: 1.25, ghost: 0.92, bat: 1.3, mushroom: 1.05, golem: 0.85, octopus: 1.15, dragon: 0.8, troll: 0.72,
}

export const hasLine = (id: string) => id in LINES

/** Plays a line; resolves when it ends (or right away if the line is missing). */
export function playLine(id: string, rate = 1): Promise<void> {
  const h = LINES[id]
  if (!h) return Promise.resolve()
  h.stop()
  return new Promise((resolve) => {
    const sid = h.play()
    h.rate(rate, sid)
    const done = () => resolve()
    h.once('end', done, sid)
    h.once('stop', done, sid)
    window.setTimeout(done, 4000) // safety net
  })
}
