import { describe, expect, it } from 'vitest'
import { lineById } from '../../spellquest/data/lines.ts'
import { EN_LINES, EN_TOWER_LINE_IDS, FEMININE_IDS, enLine, enLineAudioId } from './lines.ts'

// the ids the controller and the policies name that the English run shares with Book 2 (line-how-silent has no English
// counterpart; the renamed ones have English ids of their own: q-ghosts-sound, demo-broom-sound, demo-ghosts-sound,
// demo-ghosts-word, draw-dot and draw-cross)
const RUN_LINE_IDS = [
  'q-cauldron', 'q-ladder', 'q-ghosts', 'q-door', 'target-new', 'almost', 'streak', 'ladder-top', 'crystal', 'run-end', 'defeat',
  'new-best', 'explain-lead', 'boss-arrive', 'boss-win', 'boss-new', 'mult-up', 'info-hearts', 'info-stars', 'info-coins',
  'info-crystals', 'info-best', 'info-bosses', 'info-mult', 'demo-broom', 'demo-cauldron', 'demo-ladder', 'demo-doors',
  'demo-draw', 'q-draw', 'draw-again', 'line-tall', 'line-low', 'line-small', 'ask-gender',
  'm-hello', 'm-offer', 'm-again', 'm-bye', 'm-price', 'm-give', 'm-tap', 'm-decline', 'm-exact', 'm-heart', 'm-short', 'm-over',
  'm-undo', 'm-empty',
]
const allTexts = () => EN_LINES.flatMap((l) => l.en)

describe('English lines', () => {
  it('every Hebrew line the run plays has an English counterpart with the same variation count', () => {
    for (const id of RUN_LINE_IDS) expect(enLine(id)?.variations, id).toBe(lineById(id)!.variations)
  })
  it('the renamed lines keep the variation count of the line they replace', () => {
    const renamed: Record<string, string> = { 'q-ghosts-sound': 'q-ghosts-letter', 'demo-broom-sound': 'demo-broom-letter', 'demo-ghosts-sound': 'demo-ghosts-letter', 'demo-ghosts-word': 'demo-ghosts-syllable' }
    for (const [en, he] of Object.entries(renamed)) expect(enLine(en)?.variations, en).toBe(lineById(he)!.variations)
  })
  it("the merchant's m-* lines are his voice, and no other line is", () => {
    const m = EN_LINES.filter((l) => l.id.startsWith('m-'))
    expect(m.length).toBe(14)
    for (const l of m) { expect(l.voice).toBe('merchant'); expect(l.kind).toBe('M') }
    for (const l of EN_LINES.filter((l) => !l.id.startsWith('m-'))) expect(l.voice).toBeUndefined()
  })
  it('no "!", no "…", no digits, no Hebrew', () => {
    for (const t of allTexts()) expect(t).not.toMatch(/[!…0-9֐-׿]/)
  })
  it('140 texts', () => expect(allTexts().length).toBe(140))
  it('variations match the texts, ids are unique, and the audio id is <id>-<n>', () => {
    for (const l of EN_LINES) expect(l.variations).toBe(l.en.length)
    expect(new Set(EN_LINES.map((l) => l.id)).size).toBe(EN_LINES.length)
    expect(enLineAudioId('q-draw', 2)).toBe('q-draw-2')
  })
  it('a line that a sound follows ends with ":" and none ends with "..."', () => {
    for (const t of allTexts()) expect(t).not.toMatch(/\.\.\./)
    for (const id of ['q-cauldron', 'q-ladder', 'q-ghosts', 'q-ghosts-sound', 'target-new', 'q-draw', 'q-draw-word', 'q-draw-big', 'q-spell', 'intro-sound']) {
      for (const t of enLine(id)!.en) expect(t.endsWith(':'), t).toBe(true)
    }
  })
  it('every tower line the English tower plays has an English text', () => {
    expect(EN_TOWER_LINE_IDS.length).toBe(13)
    for (const id of EN_TOWER_LINE_IDS) expect(enLine(id)).toBeDefined()
    expect(enLine('line-how-silent')).toBeUndefined()
  })
  it('no girl forms', () => expect(FEMININE_IDS.size).toBe(0))
})
