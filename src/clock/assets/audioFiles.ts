// Clock game audio, generated host-locally and copied in by the pipeline's sync script (asset-sources/clock/).
// Files arrive progressively: anything missing simply does not play.
import words from './voiceWords.json'
import type { SpokenTiming } from '../audio/wordTiming'

const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.mp3', ''), url]))

export const VOICE_URLS: Record<string, string> = byName(
  import.meta.glob('./audio/voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
)
/** The words each voice file says (its spoken text, which can differ from the caption) and their start times
 * (s, media time, after trimming), from the voice's character alignment. */
export const VOICE_WORDS: Record<string, SpokenTiming> = words as Record<string, SpokenTiming>

const sfx = byName(import.meta.glob('./audio/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
/** Effect name → its approved takes (files "<name>-<n>.mp3" rotate). */
export const SFX_URLS: Record<string, string[]> = {}
for (const [file, url] of Object.entries(sfx)) {
  const name = file.replace(/-\d+$/, '')
  ;(SFX_URLS[name] ??= []).push(url)
}
export const MUSIC_URLS: string[] = Object.values(
  import.meta.glob('./audio/music/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
)
