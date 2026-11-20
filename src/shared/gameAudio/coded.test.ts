import { describe, expect, it } from 'vitest'
import { codedSource, isCoded, registerCoded } from './coded'

describe('coded sound', () => {
  it('a registered url gives its source', () => {
    const src = () => ({ stop: () => {}, lengthMs: 10 })
    registerCoded('coded:test/a', src)
    expect(codedSource('coded:test/a')).toBe(src)
    expect(codedSource('coded:test/none')).toBeUndefined()
    expect(() => registerCoded('/a.mp3', src)).toThrow()
  })
  it('isCoded', () => {
    expect(isCoded('coded:x/y')).toBe(true)
    expect(isCoded('/assets/x.mp3')).toBe(false)
  })
})
