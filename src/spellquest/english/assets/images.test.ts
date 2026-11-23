// English Spell Quest's pictures: the green file where there is one, Spell Quest's elsewhere, and the pictures that never change.
import { describe, expect, it } from 'vitest'
import { IMAGES } from '../../assets/images'
import { ENGLISH_IMAGES, greenImages } from './images'

describe('English Spell Quest\'s pictures', () => {
  it('has a picture for every key of Spell Quest, and the spell book that Spell Quest does not have', () => {
    expect(Object.keys(ENGLISH_IMAGES).sort()).toEqual([...Object.keys(IMAGES), 's-book'].sort())
    expect(IMAGES['s-book']).toBeUndefined()
  })

  it('the shipped green files replace the wizard, the crystals, the props and the backgrounds', () => {
    for (const k of ['s-wizbroom', 's-wizbroom-girl', 's-wizard-idle', 's-crystal-1', 's-door', 's-key', 's-orb', 's-ghost', 'bg-sky', 'bg-ground']) {
      expect(ENGLISH_IMAGES[k], k).not.toBe(IMAGES[k])
    }
  })

  it('a missing green file falls back to the Hebrew one', () => {
    const base = { 's-orb': 'he-orb.webp', 's-key': 'he-key.webp' }
    expect(greenImages(base, { 's-orb': 'en-orb.webp' })).toEqual({ 's-orb': 'en-orb.webp', 's-key': 'he-key.webp' })
    expect(greenImages(base, {})).toEqual(base)
  })

  it('the merchant is never recoloured', () => {
    const base = { 'merchant-sell': 'a', 'boss-dot-fly': 'b', 's-potion': 'c', 'pw-cat': 'd', 'word-camel': 'e' }
    const green = Object.fromEntries(Object.keys(base).map((k) => [k, 'green']))
    expect(greenImages(base, green)).toEqual(base)
    for (const k of Object.keys(IMAGES).filter((k) => /^(merchant-|boss-|s-potion|pw-|word-)/.test(k))) expect(ENGLISH_IMAGES[k], k).toBe(IMAGES[k])
  })
})

describe('the English tower\'s art', () => {
  it('is green: it differs from the tower\'s tower and wizards, which stay the default', async () => {
    const { ENGLISH_TOWER_ART } = await import('./towerArt')
    const { TOWER, WIZARD, WIZARD_GIRL } = await import('../../tower/assets/sprites')
    const { HEBREW } = await import('../../course/hebrew')
    expect(ENGLISH_TOWER_ART.tower).not.toBe(TOWER)
    for (const pose of ['idle', 'cast', 'dizzy'] as const) {
      expect(ENGLISH_TOWER_ART.wizard[pose], pose).not.toBe(WIZARD[pose])
      expect(ENGLISH_TOWER_ART.wizardGirl[pose], pose).not.toBe(WIZARD_GIRL[pose])
    }
    // the Hebrew course has none of its own: the board falls back to the tower's sprites
    expect(HEBREW.tower.art).toBeUndefined()
  })
})
