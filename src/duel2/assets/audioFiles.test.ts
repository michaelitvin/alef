import { describe, expect, it } from 'vitest'
import { DUEL_WORD, MUSIC_URLS, VOICE_URLS } from './audioFiles'

describe('audio files', () => {
  it('words the duel already has use its approved recordings', () => {
    expect(VOICE_URLS['w-bus']).toMatch(/wiz-word-bus/)
    expect(VOICE_URLS['w-pineapple']).toMatch(/wiz-word-pineapple/)
    expect(VOICE_URLS['w-lion']).toMatch(/wiz-word-a\b/)
    expect(Object.keys(DUEL_WORD).length).toBeGreaterThanOrEqual(20)
  })
  it('vowel names come from the duel', () => {
    expect(VOICE_URLS['vn-tsere']).toMatch(/wiz-tzeire/)
  })
  it('the boss plays the first duel\'s one boss track (the signature of a special event)', () => {
    expect(MUSIC_URLS.boss).toHaveLength(1)
    expect(MUSIC_URLS.boss[0]).toMatch(/music-boss-1/)
  })
})

// spec 2026-11-07 girls
import { FEMININE_IDS } from '../data/lines'
describe('feminine takes', () => {
  it('every line with a feminine version ships its -f file, and the question ships too', () => {
    for (const id of FEMININE_IDS) expect(VOICE_URLS[`${id}-f`], `${id}-f`).toBeTruthy()
    expect(VOICE_URLS['ask-gender-1']).toBeTruthy()
  })
  it('no -f file without a line that wants it', () => {
    for (const id of Object.keys(VOICE_URLS)) if (id.endsWith('-f')) expect(FEMININE_IDS.has(id.slice(0, -2)), id).toBe(true)
  })
})
