import { describe, expect, it } from 'vitest'
import { VOICE_RATE } from '../../shared/gameAudio/howlerPlayer'
import { itemById, type Item } from '../logic/facts'
import { AGAIN_AFTER, INTRO_CUES, INTRO_LINE_MS, INTRO_TIMES, SPEECH_RATE, TAKE_WORDS, introMistake, introOf } from './intros'
import { LINES } from './lines'

const item = (id: string): Item => {
  const it = itemById(id)
  if (!it) throw new Error(`no item ${id}`)
  return it
}
/** the caption's words, without the punctuation */
const words = (id: string) => LINES.find((l) => l.id === id)!.he[0].replace(/[?.,]/g, '').split(/\s+/)

describe('the intros', () => {
  it('pins its numbers', () => {
    expect(INTRO_TIMES).toBe(2)
    expect(AGAIN_AFTER).toBe(3)
    expect(SPEECH_RATE).toBe(VOICE_RATE)
  })

  it('each take has one start per caption word (and one per sentence tag after the first), in order', () => {
    for (const id of ['compare', 'jumps', 'times', 'divide'] as const) {
      const spoken = TAKE_WORDS[id].words.filter(([w]) => !w.startsWith('[')).map(([w]) => w.normalize('NFC'))
      // the spoken text of times writes בְּכֻלָּן; the caption is the reference
      expect(spoken).toEqual(words(id))
      const at = TAKE_WORDS[id].words.map(([, s]) => s)
      expect([...at].sort((a, b) => a - b)).toEqual(at)
      expect(TAKE_WORDS[id].end).toBeGreaterThan(at[at.length - 1])
    }
  })

  it('the cues of the shipped takes, in ms at the game\'s speech rate', () => {
    expect(INTRO_CUES).toEqual({
      compare: [{ at: 417, cue: 'signs' }, { at: 1963, cue: 'open' }, { at: 3678, cue: 'bigger' }, { at: 7130, cue: 'equal' }],
      jumps: [{ at: 661, cue: 'arcs' }, { at: 3226, cue: 'ring' }],
      times: [{ at: 765, cue: 'pods' }],
      divide: [{ at: 626, cue: 'share' }],
    })
    expect(INTRO_LINE_MS).toEqual({ compare: 7765, jumps: 4000, times: 3930, divide: 4296 })
  })

  it('which rounds have an intro', () => {
    expect(introOf(item('7?5'))).toBe('compare')
    expect(introOf(item('5,10,15,_'))).toBe('jumps')
    expect(introOf(item('3x5=15/c'))).toBe('times')
    // T1's a + a + a and a moved ring are not the times intro
    expect(introOf(item('3+3+3=9/c'))).toBeUndefined()
    expect(introOf(item('3x5=15/b'))).toBeUndefined()
    expect(introOf(item('12/3=4/c'))).toBe('divide')
    expect(introOf(item('3+4=7/c'))).toBeUndefined()
  })

  it('the typical mistake of each intro', () => {
    expect(introMistake(item('7?5'), '<')).toBe('compare')
    expect(introMistake(item('7?5'), '=')).toBeUndefined()
    expect(introMistake(item('5?5'), '<')).toBeUndefined()
    expect(introMistake(item('5,10,15,_'), '16')).toBe('jumps')
    expect(introMistake(item('5,10,15,_'), '21')).toBeUndefined()
    expect(introMistake(item('3x5=15/c'), '8')).toBe('times')
    expect(introMistake(item('12/3=4/c'), '3')).toBe('divide')
    expect(introMistake(item('12/3=4/c'), '9')).toBe('divide')
    expect(introMistake(item('12/3=4/c'), '5')).toBeUndefined()
  })
})
