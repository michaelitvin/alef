import { describe, it, expect } from 'vitest'
import { MONSTERS, WORD_PICTURE, WIZARD, TOWER } from './sprites'
import { MUSIC_SETS, MUSIC_URLS, SFX_URLS, VOICE_URLS } from './audioFiles'
import { PICTURE_WORDS } from '../../utils/duel/words'
import { DUEL_MARKS, SOUND_GROUPS } from '../../utils/duel/marks'
import { ROSTER } from '../../utils/duel/rules'

describe('duel assets', () => {
  it('every monster (roster + bosses) has a sprite and a facing (no per-monster voice)', () => {
    for (const id of [...ROSTER.map((m) => m.id), 'dragon', 'troll']) {
      const m = MONSTERS[id]
      expect(m, id).toBeTruthy()
      expect(m.src, id).toBeTruthy()
      expect(['left', 'right', 'front']).toContain(m.faces)
      expect('rate' in m).toBe(false)
    }
    expect(WIZARD.idle && WIZARD.cast && WIZARD.dizzy && TOWER).toBeTruthy()
  })
  it('every picture word has a picture', () => {
    for (const w of PICTURE_WORDS) expect(WORD_PICTURE[w.key], w.key).toBeTruthy()
  })
  it('every voice line the game uses exists; SFX and music are complete', () => {
    const needed = [
      ...DUEL_MARKS.map((m) => `wiz-${m.id}`),
      ...SOUND_GROUPS.filter((g) => g !== 'silent').map((g) => `wiz-vowel-${g}`),
      ...PICTURE_WORDS.filter((w) => w.group !== 'silent').map((w) => `wiz-word-${w.key}`),
      'sfx-mute', 'line-intro', 'line-how-A', 'line-how-B', 'line-how-C', 'line-how-silent', 'line-wave',
      'line-new-monster', 'line-boss', 'line-mega', 'line-combo', 'line-over', 'line-record', 'line-almost',
    ]
    for (const id of needed) expect(VOICE_URLS[id], id).toBeTruthy()
    expect(Object.keys(VOICE_URLS).filter((k) => k.startsWith('mon-'))).toEqual([]) // the monster voice is gone
    expect(VOICE_URLS['line-new-spells']).toBeUndefined() // dropped: unclear; wave 3 opens with a sound screen instead
    for (const [k, v] of Object.entries(SFX_URLS)) expect(v, k).toBeTruthy()
    for (const [k, v] of Object.entries(MUSIC_URLS)) expect(v, k).toBeTruthy()
    expect(Object.keys(SFX_URLS)).toHaveLength(9)
    expect(Object.keys(MUSIC_URLS)).toHaveLength(14)
    for (const [tier, urls] of Object.entries(MUSIC_SETS)) expect(urls.length, tier).toBeGreaterThanOrEqual(tier === 'victory' ? 1 : 3)
  })
})

describe('monster facing (playtest: these walked backwards)', () => {
  it('the imp is mirrored: its stride and gaze point right as drawn', () => {
    expect(MONSTERS.imp.faces).toBe('right')
  })
  it('the blob is mirrored: its eye looks right as drawn (review: walked backwards)', () => {
    expect(MONSTERS.blob.faces).toBe('right')
  })
})

describe('image preloading', () => {
  it('preloads every sprite and picture word so first appearances are never blank', async () => {
    const { preloadDuelImages } = await import('./sprites')
    const created: string[] = []
    const Orig = globalThis.Image
    globalThis.Image = class { set src(v: string) { created.push(v) } } as unknown as typeof Image
    try {
      const srcs = preloadDuelImages()
      for (const w of PICTURE_WORDS) expect(srcs).toContain(WORD_PICTURE[w.key])
      for (const m of Object.values(MONSTERS)) expect(srcs).toContain(m.src)
      expect(srcs).toContain(TOWER)
      expect(created.sort()).toEqual([...srcs].sort())
    } finally {
      globalThis.Image = Orig
    }
  })
})
