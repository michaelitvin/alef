// English Spell Quest's voice lines, generated host-locally and copied in by the pipeline's sync script. Files arrive
// progressively: a missing id plays nothing and the flow goes on. Effects and music are Spell Quest's (src/spellquest/assets).
const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.mp3', ''), url]))

/** voice id → url */
export const ENGLISH_VOICE_URLS: Record<string, string> =
  byName(import.meta.glob('./audio/voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
