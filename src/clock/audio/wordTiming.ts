// Read-along timing: maps the voice's word timings onto the caption's words, and follows the real playback position.
// The spoken text can differ from the caption (rule: pronunciation fixes change the spoken text, never the caption),
// e.g. the caption "לִשְׁתֵּים־עֶשְׂרֵה" is spoken as two words "לֶשתים עשרה".
// Loaded by plain Node too: erasable TS only.

/** The voice's words (the text sent to the voice, without the leading [tag]) and the start time (s) of each word. */
export interface SpokenTiming {
  w: string[]
  t: number[]
}

const POINTS = /[֑-ׇ]/g // nikkud, cantillation, maqaf, meteg
/**
 * A spelling-blind key for a word: no nikkud, no punctuation, no vav or yod (full and defective spelling), lower case;
 * ayin counts as alef (the spoken "ארבא" stands for the caption's "אַרְבַּע", said without the guttural ayin).
 * "שְׁתַּיִם" and "שתיים" both give "שתמ"; "o'clock" gives "oclock".
 */
export function wordKey(w: string): string {
  return w
    .normalize('NFC')
    .replace(POINTS, '')
    .toLowerCase()
    .replace(/[^a-zא-ת]/g, '')
    .replace(/[וי]/g, '')
    .replace(/ע/g, 'א')
    .replace(/[ךםןףץ]/g, (c) => FINALS[c])
}
const FINALS: Record<string, string> = { ך: 'כ', ם: 'מ', ן: 'נ', ף: 'פ', ץ: 'צ' }

/**
 * The start time of each caption word, from the spoken words' times. Spoken words merge onto one caption word (or caption
 * words onto one spoken word) when their keys join up. Returns null when the two texts do not say the same words.
 */
export function captionTimes(caption: string[], spoken: SpokenTiming): number[] | null {
  const { w, t } = spoken
  if (w.length !== t.length) return null
  const out: number[] = []
  let i = 0
  let j = 0
  while (i < caption.length && j < w.length) {
    let ci = i
    let sj = j
    let a = wordKey(caption[i])
    let b = wordKey(w[j])
    while (a !== b) {
      if (a.length < b.length && b.startsWith(a) && ci + 1 < caption.length) a += wordKey(caption[++ci])
      else if (b.length < a.length && a.startsWith(b) && sj + 1 < w.length) b += wordKey(w[++sj])
      else return null
    }
    // caption words that share one spoken word light up one after the other across it
    const start = t[j]
    const end = sj + 1 < t.length ? t[sj + 1] : start + 0.3 * (ci - i + 1)
    for (let k = i; k <= ci; k++) out.push(Math.round((start + ((end - start) * (k - i)) / (ci - i + 1)) * 1000) / 1000)
    i = ci + 1
    j = sj + 1
  }
  return i === caption.length && j === w.length ? out : null
}

/** The caption word being spoken at playback time `pos` (s): the last word that has started, or -1. */
export function wordIndexAt(times: number[], pos: number): number {
  let k = -1
  for (let i = 0; i < times.length; i++) if (times[i] <= pos) k = i
  return k
}

/**
 * Follows the playback position and reports each caption word once, in order (a skipped word is reported before the next).
 * `position()` returns the audio element's current time (s, media time, so the speech rate is already in it), or null while
 * the audio has not started yet. Nothing glows before the voice really starts, however long the file takes to load.
 */
export function followPlayback(
  times: number[],
  position: () => number | null,
  onWord: (i: number) => void,
  frame: (cb: () => void) => unknown = defaultFrame,
): { finish: () => void; stop: () => void } {
  let next = 0
  let alive = true
  const reach = (k: number) => {
    while (next <= k && next < times.length) onWord(next++)
  }
  const tick = () => {
    if (!alive) return
    const pos = position()
    if (pos !== null && pos > 0) reach(wordIndexAt(times, pos))
    if (next < times.length) frame(tick)
  }
  tick()
  return {
    finish: () => {
      if (alive) reach(times.length - 1)
      alive = false
    },
    stop: () => {
      alive = false
    },
  }
}

const defaultFrame = (cb: () => void) =>
  typeof requestAnimationFrame === 'function' ? requestAnimationFrame(cb) : setTimeout(cb, 16)
