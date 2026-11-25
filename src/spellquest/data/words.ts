// Picture words (spec: §5 door corridor, the word link). Door words: two syllables built from game items (so he can read
// them), no final letters, no people, one obvious picture name, never "door" (the scene is a door). Word-link words only need
// their first syllable. Pictures: the tower's (`word-<key>` in src/spellquest/tower/assets/sprites) or Spell Quest's own (`pw-<key>`).
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
  /** image name: `word-<key>` (tower art) or `pw-<key>` (new) */
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
  door('crown', 'כֶּתֶר', [{ item: 'kaf', mark: 'segol' }, { item: 'tav', mark: 'segol', tail: 'ר' }], 'pw-crown', 2),
  door('sheep', 'כֶּבֶשׂ', [{ item: 'kaf', mark: 'segol' }, { item: 'vet', mark: 'segol', tail: 'שׂ' }], 'pw-sheep', 3),
  door('sock', 'גֶרֶב', [{ item: 'gimel', mark: 'segol' }, { item: 'resh', mark: 'segol', tail: 'ב' }], 'pw-sock', 2),
  door('fence', 'גָדֵר', [{ item: 'gimel', mark: 'kamatz' }, { item: 'dalet', mark: 'tsere', tail: 'ר' }], 'pw-fence', 2),
  door('milk', 'חָלָב', [{ item: 'het', mark: 'kamatz' }, { item: 'lamed', mark: 'kamatz', tail: 'ב' }], 'pw-milk', 2),
  door('eggplant', 'חָצִיל', [{ item: 'het', mark: 'kamatz' }, { item: 'tsadi', mark: 'chirik', tail: 'יל' }], 'pw-eggplant', 2),
  door('snake', 'נָחָשׁ', [{ item: 'nun', mark: 'kamatz' }, { item: 'het', mark: 'kamatz', tail: 'שׁ' }], 'pw-snake', 2),
  door('tiger', 'נָמֵר', [{ item: 'nun', mark: 'kamatz' }, { item: 'mem', mark: 'tsere', tail: 'ר' }], 'pw-tiger', 2),
  door('cow', 'פָּרָה', [{ item: 'pe', mark: 'kamatz' }, { item: 'resh', mark: 'kamatz', tail: 'ה' }], 'pw-cow', 2),
  door('flashlight', 'פָּנָס', [{ item: 'pe', mark: 'kamatz' }, { item: 'nun', mark: 'kamatz', tail: 'ס' }], 'pw-flashlight', 2),
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

const GROUP: Record<MarkId, string> = {
  kamatz: 'a', patach: 'a', tsere: 'e', segol: 'e', chirik: 'i', cholam: 'o', 'cholam-male': 'o', kubutz: 'u', shuruk: 'u',
}

/**
 * A word that starts with this letter and a vowel of the same sound (for the word link), or undefined. Match the letter,
 * not only its sound: כָ must not show חָתוּל (the parent: he must not learn that mistake).
 */
export function wordLinkFor(itemId: string, markId: MarkId, rng: () => number = Math.random): Word | undefined {
  const ws = WORDS.filter((w) => w.first.item === itemId && GROUP[w.first.mark] === GROUP[markId])
  return ws.length ? ws[Math.floor(rng() * ws.length) % ws.length] : undefined
}
