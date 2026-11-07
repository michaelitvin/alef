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
