import { describe, expect, it } from 'vitest'
import { layoutFor } from './layout'

describe('space cat layout', () => {
  it('a landscape tablet is wide', () => { expect(layoutFor(1280, 800)).toBe('wide') })
  it('a phone on its side is wide, as the tablet', () => {
    expect(layoutFor(915, 412)).toBe('wide')
    expect(layoutFor(844, 390)).toBe('wide')
    expect(layoutFor(740, 360)).toBe('wide')
  })
  it('an upright phone and an upright tablet are portrait', () => {
    expect(layoutFor(412, 915)).toBe('portrait')
    expect(layoutFor(390, 844)).toBe('portrait')
    expect(layoutFor(800, 1280)).toBe('portrait')
  })
  it('the screen\'s current shape decides: a square or taller screen is portrait', () => {
    expect(layoutFor(601, 600)).toBe('wide')
    expect(layoutFor(600, 600)).toBe('portrait')
  })
})
