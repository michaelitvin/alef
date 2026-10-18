import { describe, expect, it } from 'vitest'
import { MAX_HTML5, getHowl, peekHowl } from './audioCore'

describe('getHowl', () => {
  it('keeps at most MAX_HTML5 streamed sounds; the least recently used is unloaded first', () => {
    const url = (i: number) => `/v/${i}.mp3`
    for (let i = 0; i < MAX_HTML5; i++) getHowl(url(i), false, true)
    getHowl(url(0), false, true) // used again: now the most recent
    getHowl(url(MAX_HTML5), false, true)
    expect(peekHowl(url(1))).toBeUndefined()
    expect(peekHowl(url(0))).toBeDefined()
    expect(peekHowl(url(MAX_HTML5))).toBeDefined()
  })
  it('Web Audio sounds (effects, music) are not limited', () => {
    for (let i = 0; i < MAX_HTML5 + 5; i++) getHowl(`/s/${i}.mp3`)
    expect(peekHowl('/s/0.mp3')).toBeDefined()
  })
})
