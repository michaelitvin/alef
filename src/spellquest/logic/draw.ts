// The drawing screen's rounds (spec: The screen): which words, which script, how the word splits around the slot, which
// marks he draws after the letter, and when the demo plays.
import type { Rng, Tally } from '../../shared/adaptive'
import { WORDS, type Word } from '../data/words'
import type { Script } from '../data/strokes'
import type { MarkShape, MarkSpec } from './recognizer'
import { item, type MarkId } from './content'
import { predict } from './predict'
import type { Conf } from './rounds'

const DRAW_WORDS = 3
/** the tally of one letter drawn in one script */
export const drawFeature = (letter: string, script: Script) => `dr:${letter}:${script}`
const SCRIPTS_OF = (letter: string) => [drawFeature(letter, 'print'), drawFeature(letter, 'hand')]

const MARK = /[֑-ׇ]/
const clusters = (t: string) => {
  const out: string[] = []
  for (const ch of t.normalize('NFC')) {
    if (MARK.test(ch) && out.length) out[out.length - 1] += ch
    else out.push(ch)
  }
  return out
}
export const bare = (t: string) => t.replace(/[֑-ׇ]/g, '')

/** The slot's letter, a bare vav when the first vowel sits on it (he draws its dot), and the rest of the word. */
export function splitWord(w: Word, script: Script): { letter: string; vav: boolean; rest: string } {
  const c = clusters(w.text)
  const vav = w.first.mark === 'shuruk' || w.first.mark === 'cholam-male'
  const rest = c.slice(vav ? 2 : 1).join('')
  return { letter: bare(c[0]), vav, rest: script === 'hand' ? bare(rest) : rest }
}

const VOWEL: Record<MarkId, MarkSpec> = {
  kamatz: { zone: 'under', shape: 'T' },
  patach: { zone: 'under', shape: 'bar' },
  tsere: { zone: 'under', shape: 'dots2' },
  segol: { zone: 'under', shape: 'dots3-tri' },
  chirik: { zone: 'under', shape: 'dot' },
  cholam: { zone: 'above-left', shape: 'dot' },
  'cholam-male': { zone: 'vav-above', shape: 'dot' },
  kubutz: { zone: 'under', shape: 'dots3-diag' as MarkShape },
  shuruk: { zone: 'vav-left', shape: 'dot' },
}

/**
 * The marks of the first syllable, in the order they are written (letter first, then the dagesh, the ש dot, the vowel).
 * None at stage 1 (letters only). The dagesh only where the game shows one (בּ כּ פּ: it changes the sound).
 */
export function marksFor(w: Word, stage: number): MarkSpec[] {
  if (stage < 2) return []
  const it = item(w.first.item)
  const out: MarkSpec[] = []
  if (it.glyph.includes('ּ')) out.push({ zone: 'inside', shape: 'dot' })
  if (it.glyph.includes('ׁ')) out.push({ zone: 'above-right', shape: 'dot' })
  if (it.glyph.includes('ׂ')) out.push({ zone: 'above-left', shape: 'dot' })
  out.push(VOWEL[w.first.mark])
  return out
}

/** Print and handwriting are two drawing minigames (spec: one duel, Part 5): the screen decides the script. */
export const scriptOf = (screen: 'draw' | 'draw-hand'): Script => (screen === 'draw-hand' ? 'hand' : 'print')

interface DrawCtx {
  rng: Rng; tallies: Record<string, Tally>; recent: Record<string, string>; confusions: Conf; avoid?: string
  /** the last stage's rehearse picks (stage 4); below it the picks are as before */
  stage?: number
  /** letter → drawing visits left that it is held back (the save's `drawHeld`) */
  held?: Record<string, number>
}

/** The last stage (`HEBREW_STAGES.maxStage`): the visit's words are picked for the 1-in-5 rule. */
const REHEARSE_FROM = 4
/** a letter whose last 2 drawn rounds were misses is held back for this many drawing visits, then offered again */
export const HOLD_VISITS = 3
/** a letter whose predicted mistake rate is this high is weak: a visit has at most one of them (the rest sit near 1 in 5) */
const WEAK_RATE = 0.35
/** how many results of the new judge are kept for a letter */
const RECORD_LEN = 3

/**
 * The new judge's results of a letter, newest last (`o` right, `x` miss): the save's `drawRecent`. The older `recent` strings
 * were written by the old judge (about 7 rounds in 10 missed), so the hold does not read them.
 */
export function noteDrawResult(record: Record<string, string>, letter: string, miss: boolean): Record<string, string> {
  return { ...record, [letter]: ((record[letter] ?? '') + (miss ? 'x' : 'o')).slice(-RECORD_LEN) }
}

/** After a drawn round: the held letters with `letter` added (HOLD_VISITS) when the new judge's last 2 results of it are misses. */
export function holdAfter(held: Record<string, number>, letter: string, record: string): Record<string, number> {
  return record.slice(-2) === 'xx' ? { ...held, [letter]: HOLD_VISITS } : held
}

/** When a visit's words are picked: every held letter has one visit less to wait (a letter at 0 is offered again). */
export function decayHeld(held: Record<string, number>): Record<string, number> {
  const out: Record<string, number> = {}
  for (const [l, n] of Object.entries(held)) if (n > 1) out[l] = n - 1
  return out
}

/**
 * The words of a visit: from WORDS (each has a picture and its spoken word), more often those whose first letter he mixes
 * up (confusions, either way) or drew wrong; never the same first letter twice in a visit.
 */
export function drawWords(ctx: DrawCtx, n = DRAW_WORDS): Word[] {
  const mixups = (id: string) => {
    let k = 0
    for (const [a, row] of Object.entries(ctx.confusions)) for (const [b, c] of Object.entries(row)) if (a === id || b === id) k += c
    return k
  }
  const pool = WORDS.map((w) => {
    const letter = splitWord(w, 'print').letter
    const p = predict(SCRIPTS_OF(letter).filter((f) => ctx.tallies[f]), ctx.tallies, ctx.recent)
    return { w, letter, weight: 1 + Math.min(3, mixups(w.first.item) / 2) + 6 * p, p }
  })
  const out: Word[] = []
  const used = new Set<string>(ctx.avoid ? [ctx.avoid] : [])
  const rehearse = (ctx.stage ?? 0) >= REHEARSE_FROM
  const weak = (x: { p: number }) => x.p >= WEAK_RATE
  let weakPicked = 0
  while (out.length < n) {
    let left = pool.filter((x) => !used.has(x.letter))
    if (rehearse) {
      // held letters wait; at most 1 weak letter a visit (each rule gives way when it would leave no word)
      const kept = left.filter((x) => !(ctx.held?.[x.letter] ?? 0))
      if (kept.length) left = kept
      const calm = left.filter((x) => !(weakPicked && weak(x)))
      if (calm.length) left = calm
    }
    const from = left.length ? left : pool.filter((x) => !out.includes(x.w))
    if (rehearse && !out.length) {
      // the first word: his best letter (the lowest predicted mistake rate) among the letters he has drawn; an unseen letter
      // predicts 0 but is no best letter (none drawn yet: the weighted pick below)
      const drawn = from.filter((x) => SCRIPTS_OF(x.letter).some((f) => ctx.tallies[f]))
      if (drawn.length) {
        const best = Math.min(...drawn.map((x) => x.p))
        const pick = drawn.filter((x) => x.p === best)
        const first = pick[Math.floor(ctx.rng() * pick.length)]
        out.push(first.w); used.add(first.letter); if (weak(first)) weakPicked++
        continue
      }
    }
    const total = from.reduce((a, x) => a + x.weight, 0)
    let r = ctx.rng() * total
    let pick = from[from.length - 1]
    for (const x of from) { r -= x.weight; if (r <= 0) { pick = x; break } }
    out.push(pick.w)
    used.add(pick.letter)
    if (rehearse && weak(pick)) weakPicked++
  }
  return out
}

/** The demo plays for a letter he has not drawn yet in this script, or drew wrong in his last tries. */
export function needsDemo(letter: string, script: Script, tallies: Record<string, Tally>, recent: Record<string, string>): boolean {
  const f = drawFeature(letter, script)
  if (!tallies[f]?.seen) return true
  return (recent[f] ?? '').slice(-3).includes('x')
}
