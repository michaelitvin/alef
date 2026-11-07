import { describe, expect, it, beforeEach } from 'vitest'
import { act, renderHook } from '@testing-library/react'
import { PLAYER_KEY, clearGender, getPlayer, setGender, useGender, voiceFor, wizardArt } from './player'

describe('player setting (shared by all the games)', () => {
  beforeEach(() => localStorage.clear())

  it('is unset at first: the game asks', () => {
    expect(getPlayer()).toBeNull()
  })

  it('keeps the gender, who chose it and when, in one shared key', () => {
    setGender('girl', 'child')
    const raw = JSON.parse(localStorage.getItem(PLAYER_KEY)!)
    expect(raw).toMatchObject({ gender: 'girl', by: 'child' })
    expect(typeof raw.at).toBe('number')
    expect(getPlayer()?.gender).toBe('girl')
  })

  it('ignores a broken value (asks again)', () => {
    localStorage.setItem(PLAYER_KEY, '{"gender":"x"}')
    expect(getPlayer()).toBeNull()
    localStorage.setItem(PLAYER_KEY, 'not json')
    expect(getPlayer()).toBeNull()
  })

  it('the hook follows a change', () => {
    const { result } = renderHook(() => useGender())
    expect(result.current).toBeNull()
    act(() => setGender('boy', 'parent'))
    expect(result.current).toBe('boy')
    act(() => clearGender())
    expect(result.current).toBeNull()
  })
})

describe('voiceFor: the feminine take of a line', () => {
  const files = new Set(['q-door-1', 'q-door-1-f', 'q-door-2', 'syl-b-a'])
  const has = (id: string) => files.has(id)
  const gendered = (id: string) => id.startsWith('q-door-')

  it('a girl hears the -f take', () => {
    expect(voiceFor('q-door-1', 'girl', has, gendered)).toEqual({ id: 'q-door-1-f', fallback: false })
  })
  it('a boy (or no setting) hears the masculine take', () => {
    expect(voiceFor('q-door-1', 'boy', has, gendered)).toEqual({ id: 'q-door-1', fallback: false })
    expect(voiceFor('q-door-1', null, has, gendered)).toEqual({ id: 'q-door-1', fallback: false })
  })
  it('a missing feminine file falls back to the masculine one (never silence) and says so', () => {
    expect(voiceFor('q-door-2', 'girl', has, gendered)).toEqual({ id: 'q-door-2', fallback: true })
  })
  it('a line that does not address the child stays single', () => {
    expect(voiceFor('syl-b-a', 'girl', has, gendered)).toEqual({ id: 'syl-b-a', fallback: false })
  })
})

describe('wizardArt', () => {
  const art = { 's-wizbroom': 'boy.webp', 's-wizbroom-girl': 'girl.webp', 's-wizard-idle': 'idle.webp' }
  it('a girl sees the girl picture', () => expect(wizardArt(art, 's-wizbroom', 'girl')).toBe('girl.webp'))
  it('a boy sees the boy picture', () => expect(wizardArt(art, 's-wizbroom', 'boy')).toBe('boy.webp'))
  it('a missing girl picture falls back to the boy', () => expect(wizardArt(art, 's-wizard-idle', 'girl')).toBe('idle.webp'))
})
