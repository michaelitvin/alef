// The English doors (design Part 5, "reading words"): a word on the door (`fish`), and he takes the key with its picture.
// From stage 4 about half the doors hold a phrase of two or three words (`a big duck`, heart words inside it); its key
// shows the phrase's one noun. Never a heart word alone on a door. The door never says its word before he picks (the run
// plays `q-door`, or `q-door-words` on a phrase, only when he waits); it is said when the door opens.
import type { DoorKey, DoorRound } from '../../../course/types'
import { shuffle, type RoundCtx } from '../../../logic/rounds'
import { PHRASES } from '../../content/phrases'
import { phraseVoice } from '../../content/voiceIds'
import { WORDS, word, type EnWord } from '../../content/words'
import type { PictureOf } from '../tower'
import { pickWord } from '../pick'
import { wordChoice } from './broom'

/** the keys under a door: the right one and two wrong ones */
const KEYS = 3
/** from this stage some doors hold a phrase (asset plan 1.15) */
const PHRASE_STAGE = 4
/** of the doors from stage 4: the share that holds a phrase (the plan's "about half"; the design gives no share) */
export const PHRASE_SHARE = 0.5

/** the file of a word's picture (none: no picture, so the word is never a key) */
export interface DoorsDeps { picture: PictureOf }

type Phrase = (typeof PHRASES)[number]

const fileOf = (w: EnWord, d: DoorsDeps) => (w.picture ? d.picture(w.picture) : undefined)
/** a word without its ending (cats → c a t, fishing → f i sh): keys of one stem show the same thing */
const stem = (w: EnWord) => w.units.filter((u) => !u.startsWith('-')).join(' ')


/** the words that go on a door alone: real door words (`D`) of his stages, with a picture file */
const doorWords = (stage: number, d: DoorsDeps) => WORDS.filter((w) => w.kind === 'real' && w.uses.includes('D') && w.stage <= stage && !!fileOf(w, d))
/** the phrases of his stages whose noun has a picture file */
const phrases = (stage: number, d: DoorsDeps) => (stage < PHRASE_STAGE ? [] : PHRASES.filter((p) => p.stage <= stage && !!fileOf(word(p.noun), d)))
/**
 * the words whose pictures can be a wrong key: real words with a picture file, of his stages; stage 1 has two door
 * pictures only (map, fan), so its doors also take stage 2's (asset plan 1.2)
 */
const keyWords = (stage: number, d: DoorsDeps) => WORDS.filter((w) => w.kind === 'real' && w.stage <= Math.max(2, stage) && !!fileOf(w, d))

const wordDoor = (w: EnWord): DoorRound => ({ id: w.id, plate: [wordChoice(w)], key: w.id })
const phraseDoor = (p: Phrase): DoorRound => ({ id: p.id, plate: p.words.map((x) => wordChoice(word(x))), key: p.noun, soundId: phraseVoice(p.id) })

/**
 * The doors play at `stage` when a door can be made: a door word or a phrase of his stages with a picture file, and
 * enough pictures for its keys (stage 1's map and fan have no file yet: no doors until one lands)
 */
export const enDoorsPlayable = (stage: number, d: DoorsDeps): boolean =>
  (doorWords(stage, d).length > 0 || phrases(stage, d).length > 0) && keyWords(stage, d).length >= KEYS

/**
 * The doors of a visit: single words at stages 1–3; from stage 4 a phrase on about half of them (PHRASE_SHARE). The word
 * (a phrase: its noun) is picked near the aim, as the broom picks its words; a key word already planned in the visit
 * comes again only when the list runs out, and two doors in a row never ask the same key word.
 */
export function enDoorRounds(ctx: RoundCtx, n: number, d: DoorsDeps): DoorRound[] {
  const singles = doorWords(ctx.stage, d)
  const many = phrases(ctx.stage, d)
  if (!singles.length && !many.length) throw new Error(`no door word at stage ${ctx.stage}`)
  const nouns = many.map((p) => word(p.noun))
  const planned = new Set<string>()
  /** the words not planned yet (all, when none is left), never the key of the door before when another is there */
  const open = (ws: EnWord[], prev?: string) => {
    const left = ws.filter((w) => !planned.has(w.id))
    const pool = left.length ? left : ws
    const apart = pool.filter((w) => w.id !== prev)
    return apart.length ? apart : pool
  }
  const wordDoorOf = (prev?: string) => wordDoor(pickWord(ctx, open(singles, prev), 'doors'))
  const phraseDoorOf = (prev?: string) => { const noun = pickWord(ctx, open(nouns, prev), 'doors').id; return phraseDoor(many.find((p) => p.noun === noun)!) }
  const out: DoorRound[] = []
  for (let i = 0; i < n; i++) {
    const prev = out[i - 1]?.key
    const phrase = many.length > 0 && (!singles.length || ctx.rng() < PHRASE_SHARE)
    let door = phrase ? phraseDoorOf(prev) : wordDoorOf(prev)
    // (every door of one kind has that key: a door of the other kind keeps the two apart)
    if (door.key === prev && phrase && singles.length) door = wordDoorOf(prev)
    else if (door.key === prev && !phrase && many.length) door = phraseDoorOf(prev)
    planned.add(door.key)
    out.push(door)
  }
  return out
}

/**
 * The keys of a door: its own (the picture of its word, or of the phrase's noun) and two other pictures. A wrong key is
 * never a word of the door, nor the same thing in another form (cats on the door: no cat), and no two keys share a file.
 */
export function enDoorKeys(ctx: RoundCtx, round: DoorRound, d: DoorsDeps): DoorKey[] {
  const answer = word(round.key)
  const right: DoorKey = { id: answer.id, picture: fileOf(answer, d)! }
  const onDoor = round.plate.map((c) => word(c.id))
  const stems = new Set(onDoor.filter((w) => w.kind !== 'heart').map(stem))
  const keys = [right]
  for (const w of shuffle(ctx.rng, keyWords(ctx.stage, d))) {
    if (keys.length === KEYS) break
    const picture = fileOf(w, d)!
    if (onDoor.some((x) => x.id === w.id) || stems.has(stem(w)) || keys.some((k) => k.picture === picture)) continue
    keys.push({ id: w.id, picture })
  }
  return shuffle(ctx.rng, keys)
}
