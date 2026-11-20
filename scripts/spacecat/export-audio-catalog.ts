// Writes Space Cat's audio catalogue (every voice line variation with its text, settings and where it plays) as JSON for
// the host-local generation pipeline. Lines that reuse another game's take (`reuse`) get no item.
// Run: node scripts/spacecat/export-audio-catalog.ts > catalog.json
import { LINES, VOICE, lineAudioId } from '../../src/spacecat/audio/lines.ts'

const items: unknown[] = []
for (const l of LINES) {
  if (l.reuse) continue
  l.he.forEach((text, i) => {
    items.push({
      id: lineAudioId(l.id, i + 1), kind: 'tts', group: 'line', text, spoken: l.tag ? `[${l.tag}] ${text}` : text,
      where: l.where, stability: l.stability, takes: 1, voice: VOICE.id, model: VOICE.model, lang: VOICE.lang,
    })
  })
}

process.stdout.write(JSON.stringify({ items }, null, 1) + '\n')
