// Writes Book 2's audio catalogue (every voice clip with its text, settings, where it plays and the glyph to show next to it
// on the review page) as JSON for the host-local generation pipeline. Run: node scripts/duel2/export-audio-catalog.ts > catalog.json
import { GROUPS, GROUP_MARKS, ITEMS, isAllowed, syllable, type MarkId, type VowelGroup } from '../../src/duel2/logic/content.ts'
import { WORDS } from '../../src/duel2/data/words.ts'
import { LINES, VOICE, lineAudioId } from '../../src/duel2/data/lines.ts'

const items: unknown[] = []
const voice = { voice: VOICE.id, model: VOICE.model, lang: VOICE.lang }

for (const l of LINES)
  l.he.forEach((text, i) => items.push({
    id: lineAudioId(l.id, i + 1), kind: 'tts', group: 'line', text, spoken: l.tag ? `[${l.tag}] ${text}` : text,
    where: l.where, context: '', stability: l.stability, takes: 1, ...voice,
  }))

// One clip per distinct syllable sound; the spelling of the first item with that sound (rule: one voiced burst, stability 1).
const SPELL: Record<VowelGroup, MarkId> = { a: 'kamatz', e: 'tsere', i: 'chirik', o: 'cholam-male', u: 'shuruk' }
const seen = new Set<string>()
for (const it of ITEMS)
  for (const g of GROUPS) {
    const m = isAllowed(it.id, SPELL[g]) ? SPELL[g] : GROUP_MARKS[g].find((x) => isAllowed(it.id, x))
    if (!m) continue
    const s = syllable(it.id, m)
    if (seen.has(s.soundId)) continue
    seen.add(s.soundId)
    const same = ITEMS.filter((o) => o.sound === it.sound && isAllowed(o.id, m)).map((o) => syllable(o.id, m).text)
    items.push({
      id: s.soundId, kind: 'tts', group: 'syllable', text: s.text, spoken: `${s.text}.`, where: 'The sound he hears and the feedback (all screens)',
      context: same.join(' / '), stability: 1, takes: 2, ...voice,
    })
  }

for (const it of ITEMS)
  items.push({ id: `ln-${it.id}`, kind: 'tts', group: 'letter', text: it.name, spoken: `${it.name}.`, where: 'Letter name: broom and ghosts at the letter stage, hints, explanations', context: it.glyph, stability: 1, takes: 1, ...voice })

for (const w of WORDS)
  items.push({ id: `w-${w.id}`, kind: 'tts', group: 'word', text: w.text, spoken: `${w.text}.`, where: w.door ? 'Door corridor: said when the door opens; word link' : 'Word link after a right answer', context: w.picture, stability: 1, takes: 1, ...voice })

process.stdout.write(JSON.stringify({ items }, null, 1) + '\n')
