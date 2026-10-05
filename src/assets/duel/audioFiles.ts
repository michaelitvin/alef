// Duel audio, picked by Michael on the review page (/nikkud-duel/review/) and synced by sync_voice.py.
// SFX picks (Michael, review 2026-10-05): arrival = 3 non-vocal options rotating, cast = new fireball (pending review), boom option 1 (both slots), ouch option 4, mega option 3, sparkle 1.
// Music: calm/mid/fast by wave, two boss tracks alternate, victory 1.
const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.mp3', ''), url]))

const sfx = byName(import.meta.glob('./audio/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
const music = byName(import.meta.glob('./audio/music/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)

export const SFX_URLS = {
  arrival1: sfx['arrival-1'],
  arrival2: sfx['arrival-2'],
  arrival3: sfx['arrival-3'],
  cast: sfx.cast,
  boom1: sfx['boom-1'],
  boom2: sfx['boom-2'],
  ouch: sfx.ouch,
  mega: sfx.mega,
  sparkle: sfx.sparkle,
}

export const MUSIC_URLS = {
  calm: music['music-calm'],
  mid: music['music-mid'],
  fast: music['music-fast'],
  boss1: music['music-boss-1'],
  boss2: music['music-boss-2'],
  victory: music['music-victory'],
}

/** Voice lines keyed by id: wiz-<mark>, wiz-vowel-<g>, wiz-word-<key>, mon-name-<mark>, mon-vowel-<g>, mon-word-<key>, sfx-mute, line-*. */
export const VOICE_URLS: Record<string, string> = byName(
  import.meta.glob('./audio/voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
)
