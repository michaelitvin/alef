import { describe, it, expect } from 'vitest'
import { INITIAL_TAP_STATE, nextTap } from './tapCycle'

describe('nextTap', () => {
  it('first tap on a word plays the word', () => {
    const { mode } = nextTap(INITIAL_TAP_STATE, 'p0:2')
    expect(mode).toBe('word')
  })

  it('second tap on the same word plays the decode', () => {
    const first = nextTap(INITIAL_TAP_STATE, 'p0:2')
    const second = nextTap(first.state, 'p0:2')
    expect(second.mode).toBe('decode')
  })

  it('third tap on the same word alternates back to the word', () => {
    const first = nextTap(INITIAL_TAP_STATE, 'p0:2')
    const second = nextTap(first.state, 'p0:2')
    const third = nextTap(second.state, 'p0:2')
    expect(third.mode).toBe('word')
  })

  it('tapping a different word resets to word mode', () => {
    const first = nextTap(INITIAL_TAP_STATE, 'p0:2')
    const other = nextTap(first.state, 'q1:0')
    expect(other.mode).toBe('word')
    const otherAgain = nextTap(other.state, 'q1:0')
    expect(otherAgain.mode).toBe('decode')
  })

  it('same word text at a different location is a different word', () => {
    const first = nextTap(INITIAL_TAP_STATE, 'p0:2')
    const sameTextElsewhere = nextTap(first.state, 'p1:5')
    expect(sameTextElsewhere.mode).toBe('word')
  })
})
