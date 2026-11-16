import { describe, expect, it } from 'vitest'
import { layoutFor } from './layout'

describe('space cat layout', () => {
  it('a landscape tablet is wide', () => { expect(layoutFor(1280, 800)).toBe('wide') })
  it('a phone on its side keeps portrait', () => { expect(layoutFor(915, 412)).toBe('portrait') })
  it('an upright phone and an upright tablet are portrait', () => {
    expect(layoutFor(412, 915)).toBe('portrait')
    expect(layoutFor(800, 1280)).toBe('portrait')
  })
  it('the boundary', () => {
    expect(layoutFor(1000, 600)).toBe('wide')
    expect(layoutFor(1000, 599)).toBe('portrait')
  })
})
