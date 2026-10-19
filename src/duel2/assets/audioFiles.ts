// Book 2 audio, generated host-locally and copied in by the pipeline's sync script (asset-sources/duel2/).
// Files arrive progressively: anything missing simply does not play. The vowel names are the duel's approved files.
const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.mp3', ''), url]))

const own = byName(import.meta.glob('./audio/voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
const duel = byName(import.meta.glob('../../assets/duel/audio/voice/wiz-{kamatz,patach,tzeire,segol,chirik,cholam,holam-male,kubutz,shuruk}.mp3',
  { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
const VOWEL_NAME_FILE: Record<string, string> = {
  kamatz: 'wiz-kamatz', patach: 'wiz-patach', tsere: 'wiz-tzeire', segol: 'wiz-segol', chirik: 'wiz-chirik',
  cholam: 'wiz-cholam', 'cholam-male': 'wiz-holam-male', kubutz: 'wiz-kubutz', shuruk: 'wiz-shuruk',
}
/** voice id → url; vowel names as `vn-<markId>` */
export const VOICE_URLS: Record<string, string> = { ...own }
for (const [markId, file] of Object.entries(VOWEL_NAME_FILE)) if (duel[file]) VOICE_URLS[`vn-${markId}`] = duel[file]

const sfx = byName(import.meta.glob('./audio/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
/** effect name → its approved takes ("<name>-<n>.mp3" rotate) */
export const SFX_URLS: Record<string, string[]> = {}
for (const [file, url] of Object.entries(sfx)) (SFX_URLS[file.replace(/-\d+$/, '')] ??= []).push(url)

const music = byName(import.meta.glob('./audio/music/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
/** music kind (flight, celebrate) → tracks */
export const MUSIC_URLS: Record<string, string[]> = {}
for (const [file, url] of Object.entries(music)) (MUSIC_URLS[file.replace(/-\d+$/, '')] ??= []).push(url)
