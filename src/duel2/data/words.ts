// Picture words (spec: §5 door corridor, the word link). Door words: two syllables built from game items (so he can read
// them), no final letters, no people, one obvious picture name, never "door" (the scene is a door). Word-link words only need
// their first syllable. Pictures: the duel's (`word-<key>` in src/assets/duel/sprites) or Book 2's own (`pw-<key>`).
// Spelling follows the game's glyphs: dagesh only in בּ כּ פּ. Loaded by plain Node: erasable TS only.
import type { MarkId, Stage } from '../logic/content.ts'

export interface WordSyl { item: string; mark: MarkId; tail?: string }
export interface Word {
  id: string
  text: string
  /** the first syllable (word link) */
  first: { item: string; mark: MarkId }
  /** door words: every syllable, with a closing letter in `tail` */
  syllables?: WordSyl[]
  /** image name: `word-<key>` (duel art) or `pw-<key>` (new) */
  picture: string
  door: boolean
  stage: Stage
}

const door = (id: string, text: string, syllables: WordSyl[], picture: string, stage: Stage): Word => ({
  id, text: text.normalize('NFC'), first: { item: syllables[0].item, mark: syllables[0].mark }, syllables, picture, door: true, stage,
})
const link = (id: string, text: string, item: string, mark: MarkId, picture: string): Word => ({
  id, text: text.normalize('NFC'), first: { item, mark }, picture, door: false, stage: 2,
})

export const WORDS: Word[] = [
  door('tent', 'אֹהֶל', [{ item: 'alef', mark: 'cholam' }, { item: 'he', mark: 'segol', tail: 'ל' }], 'word-tent', 2),
  door('camel', 'גָמָל', [{ item: 'gimel', mark: 'kamatz' }, { item: 'mem', mark: 'kamatz', tail: 'ל' }], 'word-camel', 2),
  door('ball', 'כַּדוּר', [{ item: 'kaf', mark: 'patach' }, { item: 'dalet', mark: 'shuruk', tail: 'ר' }], 'pw-ball', 2),
  door('cat', 'חָתוּל', [{ item: 'het', mark: 'kamatz' }, { item: 'tav', mark: 'shuruk', tail: 'ל' }], 'pw-cat', 2),
  door('fox', 'שׁוּעָל', [{ item: 'shin', mark: 'shuruk' }, { item: 'ayin', mark: 'kamatz', tail: 'ל' }], 'pw-fox', 2),
  door('carrot', 'גֶזֶר', [{ item: 'gimel', mark: 'segol' }, { item: 'zayin', mark: 'segol', tail: 'ר' }], 'pw-carrot', 2),
  door('cake', 'עוּגָה', [{ item: 'ayin', mark: 'shuruk' }, { item: 'gimel', mark: 'kamatz', tail: 'ה' }], 'word-u', 2),
  door('house', 'בַּיִת', [{ item: 'bet', mark: 'patach' }, { item: 'yod', mark: 'chirik', tail: 'ת' }], 'word-house', 2),
  door('rose', 'וֶרֶד', [{ item: 'vav', mark: 'segol' }, { item: 'resh', mark: 'segol', tail: 'ד' }], 'word-rose', 2),
  door('dog', 'כֶּלֶב', [{ item: 'kaf', mark: 'segol' }, { item: 'lamed', mark: 'segol', tail: 'ב' }], 'pw-dog', 3),
  door('book', 'סֵפֶר', [{ item: 'samech', mark: 'tsere' }, { item: 'fe', mark: 'segol', tail: 'ר' }], 'word-book', 3),
  link('lion', 'אַרְיֵה', 'alef', 'patach', 'word-a'),
  link('pineapple', 'אַנָּנָס', 'alef', 'patach', 'word-pineapple'),
  link('mouse', 'עַכְבָּר', 'ayin', 'patach', 'word-mouse'),
  link('eye', 'עַיִן', 'ayin', 'patach', 'word-eye'),
  link('butterfly', 'פַּרְפַּר', 'pe', 'patach', 'word-butterfly'),
  link('chick', 'אֶפְרוֹחַ', 'alef', 'segol', 'word-e'),
  link('tree', 'עֵץ', 'ayin', 'tsere', 'word-tree'),
  link('fire', 'אֵשׁ', 'alef', 'tsere', 'word-fire'),
  link('door', 'דֶּלֶת', 'dalet', 'segol', 'word-door'),
  link('pencil', 'עִפָּרוֹן', 'ayin', 'chirik', 'word-i'),
  link('igloo', 'אִיגְלוּ', 'alef', 'chirik', 'word-igloo'),
  link('island', 'אִי', 'alef', 'chirik', 'word-island'),
  link('bicycle', 'אוֹפַנַּיִם', 'alef', 'cholam-male', 'word-bicycle'),
  link('bus', 'אוֹטוֹבּוּס', 'alef', 'cholam-male', 'word-bus'),
  link('monkey', 'קוֹף', 'qof', 'cholam-male', 'word-monkey'),
  link('cookie', 'עוּגִיָּה', 'ayin', 'shuruk', 'word-cookie'),
  link('banana', 'בָּנָנָה', 'bet', 'kamatz', 'pw-banana'),
  link('strawberry', 'תּוּת', 'tav', 'shuruk', 'pw-strawberry'),
  link('lemon', 'לִימוֹן', 'lamed', 'chirik', 'pw-lemon'),
  link('fish', 'דָּג', 'dalet', 'kamatz', 'pw-fish'),
  link('horse', 'סוּס', 'samech', 'shuruk', 'pw-horse'),
]

const SOUND: Record<string, string> = {
  alef: '0', bet: 'b', vet: 'v', gimel: 'g', dalet: 'd', he: 'h', vav: 'v', zayin: 'z', het: 'ch', tet: 't', yod: 'y', kaf: 'k',
  khaf: 'ch', lamed: 'l', mem: 'm', nun: 'n', samech: 's', ayin: '0', pe: 'p', fe: 'f', tsadi: 'ts', qof: 'k', resh: 'r', shin: 'sh',
  sin: 's', tav: 't',
}
const GROUP: Record<MarkId, string> = {
  kamatz: 'a', patach: 'a', tsere: 'e', segol: 'e', chirik: 'i', cholam: 'o', 'cholam-male': 'o', kubutz: 'u', shuruk: 'u',
}
export const firstSoundId = (w: Word) => `syl-${SOUND[w.first.item]}-${GROUP[w.first.mark]}`

/** A word whose first syllable has this sound (for the word link), or undefined. */
export function wordLinkFor(soundId: string, rng: () => number = Math.random): Word | undefined {
  const ws = WORDS.filter((w) => firstSoundId(w) === soundId)
  return ws.length ? ws[Math.floor(rng() * ws.length) % ws.length] : undefined
}
