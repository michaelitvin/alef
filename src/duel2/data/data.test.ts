import { describe, expect, it } from 'vitest'
import { syllable } from '../logic/content.ts'
import { WORDS, wordLinkFor } from './words.ts'
import { LINES, lineAudioId } from './lines.ts'

const PER_ROUND = ['q-broom', 'q-broom-letter', 'q-cauldron', 'q-ladder', 'q-ghosts', 'q-door', 'target-new', 'almost', 'streak', 'ladder-top', 'crystal', 'run-end']

describe('words', () => {
  const doors = WORDS.filter((w) => w.door)
  it('door words are built from their syllables', () => {
    for (const w of doors) expect(w.syllables!.map((s) => syllable(s.item, s.mark).text + (s.tail ?? '')).join('').normalize('NFC')).toBe(w.text)
  })
  it('door words use no final letters and no door', () => {
    for (const w of doors) expect(/[ךםןףץ]/.test(w.text), w.id).toBe(false)
    expect(doors.some((w) => w.id === 'door' || w.picture.endsWith('door'))).toBe(false)
  })
  it('at least 10 door words with unique pictures', () => {
    expect(doors.length).toBeGreaterThanOrEqual(10)
    expect(new Set(doors.map((w) => w.picture)).size).toBe(doors.length)
  })
  it('every word starts with its first syllable', () => {
    for (const w of WORDS) {
      const s = syllable(w.first.item, w.first.mark).text
      expect(w.text.startsWith(s) || w.text.normalize('NFD').replace(/ּ/g, '').startsWith(s.normalize('NFD').replace(/ּ/g, '')), w.id).toBe(true)
    }
  })
  it('word link finds a word for בָּ', () => {
    expect(wordLinkFor('syl-b-a', () => 0)?.id).toMatch(/house|banana/)
    expect(wordLinkFor('syl-zz-a')).toBeUndefined()
  })
})

describe('lines', () => {
  it('repeated lines have variations', () => {
    for (const id of PER_ROUND) expect(LINES.find((l) => l.id === id)?.variations, id).toBeGreaterThanOrEqual(3)
    expect(LINES.find((l) => l.id === 'new-best')?.variations).toBe(2)
  })
  it('every variation has its text', () => {
    for (const l of LINES) expect(l.he.length, l.id).toBe(l.variations)
  })
  it('no exclamation marks in spoken text', () => {
    expect(LINES.some((l) => l.he.some((t) => t.includes('!')))).toBe(false)
  })
  it('question lines carry no learning word', () => {
    const words = WORDS.map((w) => w.text)
    for (const l of LINES.filter((x) => x.id.startsWith('q-')))
      for (const t of l.he) {
        const tokens = t.split(/[\s,.?]+/)
        for (const w of words) expect(tokens.includes(w), `${l.id}: ${w}`).toBe(false)
      }
  })
  it('audio ids', () => {
    expect(lineAudioId('almost', 2)).toBe('almost-2')
  })
})
