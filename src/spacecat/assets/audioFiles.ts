// Space Cat's voice files, generated host-locally and copied in once the parent has picked a take (asset-sources/spacecat/).
// Files arrive progressively: a line whose file is missing simply does not play. `new-best` plays Book 2's approved take.
import newBest from '../../spellquest/assets/audio/voice/new-best-1.mp3'

const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.mp3', ''), url]))

/** voice file id (`<line id>-<n>`) → url */
export const VOICE_URLS: Record<string, string> = {
  ...byName(import.meta.glob('./audio/voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>),
  'new-best-1': newBest,
}
