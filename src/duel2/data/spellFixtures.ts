// The gallery's spell-book rounds (the parent previews the screen before a course has its own spell rounds: English in
// Task 25, Hebrew in Task 26). One per course: Hebrew גָמָל (two syllable boxes, its closing ל printed faint), English
// fish (f · i · sh, the two-letter unit one tile). Its picture is looked up in the course's images.
import { syllable, type MarkId } from '../logic/content'
import type { CourseId } from '../course/types'
import type { SpellBox, SpellRound } from '../policies/spell'

const he = (item: string, mark: MarkId): SpellBox => {
  const s = syllable(item, mark)
  return { unit: s.id, text: s.text, soundId: s.soundId }
}
const en = (unit: string, sound: string): SpellBox => ({ unit, text: unit, soundId: `snd-${sound}` })

/** the fixture round of `course` (its picture from the course's `images`, if it has the file) */
export function spellFixture(course: { id: CourseId; images: Record<string, string> }): SpellRound {
  if (course.id === 'he') {
    const boxes = [he('gimel', 'kamatz'), he('mem', 'kamatz')]
    return {
      word: 'camel', wordVoice: 'w-camel', boxes, tiles: [boxes[0], he('mem', 'shuruk'), boxes[1], he('gimel', 'segol'), he('lamed', 'kamatz')],
      tail: 'ל', picture: course.images['word-camel'], mode: 'tiles',
    }
  }
  const boxes = [en('f', 'f'), en('i', 'ih'), en('sh', 'sh')]
  return {
    word: 'fish', wordVoice: 'w-fish', boxes, tiles: [en('ch', 'ch'), boxes[0], en('o', 'ah'), boxes[2], boxes[1], en('s', 's')],
    picture: course.images['pw-fish'], mode: 'tiles',
  }
}
