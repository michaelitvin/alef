import { describe, it, expect } from 'vitest'
import { MONSTERS, WORD_PICTURE, WIZARD, TOWER } from './sprites'
import { MUSIC_URLS, SFX_URLS, VOICE_URLS } from './audioFiles'
import { PICTURE_WORDS } from '../../utils/duel/words'
import { DUEL_MARKS, SOUND_GROUPS } from '../../utils/duel/marks'
import { ROSTER } from '../../utils/duel/rules'

describe('duel assets', () => {
  it('every monster (roster + bosses) has a sprite, a facing and a safe voice rate', () => {
    for (const id of [...ROSTER.map((m) => m.id), 'dragon', 'troll']) {
      const m = MONSTERS[id]
      expect(m, id).toBeTruthy()
      expect(m.src, id).toBeTruthy()
      expect(['left', 'right', 'front']).toContain(m.faces)
      expect(m.rate).toBeGreaterThanOrEqual(0.7)
      expect(m.rate).toBeLessThanOrEqual(1.3)
    }
    expect(WIZARD.idle && WIZARD.cast && WIZARD.dizzy && TOWER).toBeTruthy()
  })
  it('every picture word has a picture', () => {
    for (const w of PICTURE_WORDS) expect(WORD_PICTURE[w.key], w.key).toBeTruthy()
  })
  it('every voice line the game uses exists; SFX and music are complete', () => {
    const needed = [
      ...DUEL_MARKS.flatMap((m) => [`wiz-${m.id}`, `mon-name-${m.id}`]),
      ...SOUND_GROUPS.filter((g) => g !== 'silent').flatMap((g) => [`wiz-vowel-${g}`, `mon-vowel-${g}`]),
      ...PICTURE_WORDS.filter((w) => w.group !== 'silent').flatMap((w) => [`wiz-word-${w.key}`, `mon-word-${w.key}`]),
      'sfx-mute', 'line-intro', 'line-how-A', 'line-how-B', 'line-how-C', 'line-how-D', 'line-how-silent', 'line-wave',
      'line-new-spells', 'line-new-monster', 'line-boss', 'line-mega', 'line-combo', 'line-over', 'line-record', 'line-almost',
    ]
    for (const id of needed) expect(VOICE_URLS[id], id).toBeTruthy()
    for (const [k, v] of Object.entries(SFX_URLS)) expect(v, k).toBeTruthy()
    for (const [k, v] of Object.entries(MUSIC_URLS)) expect(v, k).toBeTruthy()
    expect(Object.keys(SFX_URLS)).toHaveLength(9)
    expect(Object.keys(MUSIC_URLS)).toHaveLength(6)
  })
})
