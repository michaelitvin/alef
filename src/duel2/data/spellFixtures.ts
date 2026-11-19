// The gallery's spell-book rounds (the parent previews the screen before a course has its own spell rounds: English in
// Task 25, Hebrew in Task 26). One per course: Hebrew גָמָל (two syllable boxes, its closing ל printed faint), English
// fish (f · i · sh, the two-letter unit one tile). Its picture is looked up in the course's images. The long one (`long`,
// English only): the most boxes a word has, jumping (j · u · m · p · ing), to check that five boxes fit their page.
import { syllable, type MarkId } from '../logic/content'
import type { CourseId } from '../course/types'
import type { SpellBox, SpellRound } from '../policies/spell'

const he = (item: string, mark: MarkId): SpellBox => {
  const s = syllable(item, mark)
  return { unit: s.id, text: s.text, soundId: s.soundId }
}
const en = (unit: string, sound: string): SpellBox => ({ unit, text: unit, soundId: `snd-${sound}` })

/** the fixture round of `course` (its picture from the course's `images`, if it has the file); `long`: English's 5 boxes */
export function spellFixture(course: { id: CourseId; images: Record<string, string> }, long = false): SpellRound {
  if (course.id === 'he') {
    const boxes = [he('gimel', 'kamatz'), he('mem', 'kamatz')]
    return {
      word: 'camel', wordVoice: 'w-camel', boxes, tiles: [boxes[0], he('mem', 'shuruk'), boxes[1], he('gimel', 'segol'), he('lamed', 'kamatz')],
      tail: 'ל', picture: course.images['word-camel'], mode: 'tiles',
    }
  }
  if (long) {
    const boxes = [en('j', 'j'), en('u', 'uh'), en('m', 'm'), en('p', 'p'), { unit: '-ing', text: 'ing', soundId: 'snd-ing' }]
    return {
      word: 'jumping', wordVoice: 'w-jumping', boxes, tiles: [boxes[3], en('sh', 'sh'), boxes[0], boxes[4], boxes[2], en('a', 'ah'), boxes[1]],
      picture: course.images['pw-jumping'], mode: 'tiles',
    }
  }
  const boxes = [en('f', 'f'), en('i', 'ih'), en('sh', 'sh')]
  return {
    word: 'fish', wordVoice: 'w-fish', boxes, tiles: [en('ch', 'ch'), boxes[0], en('o', 'ah'), boxes[2], boxes[1], en('s', 's')],
    picture: course.images['pw-fish'], mode: 'tiles',
  }
}
