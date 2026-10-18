import { describe, expect, it } from 'vitest'
import { captionTimes, followPlayback, wordIndexAt, wordKey } from './wordTiming'

describe('wordKey', () => {
  it('ignores nikkud, punctuation, full or defective spelling and final letters', () => {
    expect(wordKey('שְׁתַּיִם')).toBe(wordKey('שתיים'))
    expect(wordKey('לְאַרְבַּע,')).toBe(wordKey('לארבא')) // the spoken arba without the guttural ayin
    expect(wordKey('לִשְׁתַּיִם')).toBe(wordKey('לֶשתיים'))
    expect(wordKey('מְעֻלֶּה.')).toBe(wordKey('מְעוּלֶּה.'))
    expect(wordKey('וָאוּ,')).toBe(wordKey('וואו,'))
    expect(wordKey("o'clock")).toBe('oclock')
    expect(wordKey('Five,')).toBe('five')
  })
})

describe('captionTimes', () => {
  it('passes the times through when the voice says the caption words', () => {
    expect(captionTimes(['half', 'past', 'three'], { w: ['half', 'past', 'three'], t: [0, 0.3, 0.6] })).toEqual([0, 0.3, 0.6])
  })
  it('merges spoken words that make up one caption word (pronunciation respellings)', () => {
    // a respelling that splits one caption word into two spoken words (an earlier welcome-he take: לַסַּדְנָה said as "לסַד נה")
    const caption = ['בָּרוּךְ', 'הַבָּא', 'לַסַּדְנָה.', 'אַתָּה', 'הַשָּׁעָן.']
    const spoken = { w: ['ברוך', 'הבא', 'לסַד', 'נה.', 'אתה', 'הַשָּׁעָן.'], t: [0.16, 0.56, 0.84, 1.2, 1.76, 2.16] }
    expect(captionTimes(caption, spoken)).toEqual([0.16, 0.56, 0.84, 1.76, 2.16])
  })
  it('a maqaf compound spoken as two words is one caption word', () => {
    expect(captionTimes(['רֶבַע', 'לִשְׁתֵּים־עֶשְׂרֵה'], { w: ['רבע', 'לֶשתים', 'עשרה'], t: [0, 0.4, 0.8] })).toEqual([0, 0.4])
  })
  it('caption words that share one spoken word light up one after the other across it', () => {
    expect(captionTimes(['twenty', 'five', 'past'], { w: ['twentyfive', 'past'], t: [0, 1] })).toEqual([0, 0.5, 1])
  })
  it('refuses texts that say different words', () => {
    expect(captionTimes(['חֲמִשָּׁה', 'לְאַחַת'], { w: ['חמש', 'לאחת'], t: [0, 0.5] })).toBeNull()
    expect(captionTimes(['five', 'past', 'one'], { w: ['five', 'past'], t: [0, 0.5] })).toBeNull()
    expect(captionTimes(['a'], { w: ['a', 'b'], t: [0] })).toBeNull()
  })
})

describe('time-based highlight', () => {
  it('wordIndexAt: the last word that has started', () => {
    const t = [0, 0.4, 0.9]
    expect(wordIndexAt(t, -1)).toBe(-1)
    expect(wordIndexAt(t, 0.39)).toBe(0)
    expect(wordIndexAt(t, 0.4)).toBe(1)
    expect(wordIndexAt(t, 5)).toBe(2)
  })

  /** Drives followPlayback with a scripted playback position, one frame per entry. */
  function run(times: number[], positions: (number | null)[]) {
    const fired: { word: number; frame: number }[] = []
    let frame = 0
    const queue: (() => void)[] = []
    const f = followPlayback(times, () => positions[Math.min(frame, positions.length - 1)], (word) => fired.push({ word, frame }),
      (cb) => queue.push(cb))
    while (queue.length && frame < positions.length - 1) {
      frame++
      queue.shift()!()
    }
    return { fired, f }
  }

  it('nothing glows while the file is still loading, however long that takes', () => {
    // 30 frames (about half a second) with no playback: a timer started at play() would already have lit two words
    const { fired } = run([0, 0.3, 0.6], [...Array(30).fill(null), 0, 0.01, 0.31])
    expect(fired.map((x) => x.word)).toEqual([0, 1])
    expect(fired[0].frame).toBe(31) // the first frame where the audio has really moved
  })
  it('follows the media time, so the speech rate needs no correction', () => {
    const { fired } = run([0.05, 0.5, 1.0], [0.02, 0.06, 0.45, 0.52, 0.99, 1.01])
    expect(fired).toEqual([{ word: 0, frame: 1 }, { word: 1, frame: 3 }, { word: 2, frame: 5 }])
  })
  it('a skipped word is still reported, in order', () => {
    const { fired } = run([0, 0.2, 0.4, 0.6], [0.01, 0.7])
    expect(fired.map((x) => x.word)).toEqual([0, 1, 2, 3])
  })
  it('finish reports the rest; stop reports nothing more', () => {
    const a = run([0, 0.5, 1], [0.1])
    a.f.finish()
    expect(a.fired.map((x) => x.word)).toEqual([0, 1, 2])
    const b = run([0, 0.5, 1], [0.1])
    b.f.stop()
    b.f.finish()
    expect(b.fired.map((x) => x.word)).toEqual([0])
  })
})
