// Book 2 content (spec: Content): 26 consonant items (22 letters, with the dot forms of ב כ פ ש as their own items),
// 9 vowel marks in 5 sound groups, and their syllables. Loaded by plain Node (catalogue script): erasable TS only.

export type Stage = 1 | 2 | 3 | 4
export type VowelGroup = 'a' | 'e' | 'i' | 'o' | 'u'
export type MarkId = 'kamatz' | 'patach' | 'tsere' | 'segol' | 'chirik' | 'cholam' | 'cholam-male' | 'kubutz' | 'shuruk'

export interface Item {
  id: string
  /** the bare letter */
  base: string
  /** the letter as shown: dagesh only where it changes the sound (בּ כּ פּ), the dot on ש */
  glyph: string
  /** the letter's name, with nikkud (recorded as ln-<id>) */
  name: string
  /** consonant sound key; items with the same key sound the same ('0' = silent) */
  sound: string
  /** the form without the dot (ב כ פ) or שׂ: stage 3 */
  soft: boolean
  /** the other form of a dotted letter */
  pair?: string
}

export interface Mark {
  id: MarkId
  group: VowelGroup
  /** the combining sign, or the vav with its sign for cholam male and shuruk */
  sign: string
  /** the sign written after the letter (vav forms) instead of on it */
  vav: boolean
}

export interface Syllable {
  id: string
  item: Item
  mark: Mark
  text: string
  soundId: string
}

const DAGESH = 'ּ'
const SHIN_DOT = 'ׁ'
const SIN_DOT = 'ׂ'

// [id, base, glyph suffix, name, sound, soft, pair]
const RAW: [string, string, string, string, string, boolean, string?][] = [
  ['alef', 'א', '', 'אָלֶף', '0', false],
  ['bet', 'ב', DAGESH, 'בֵּית', 'b', false, 'vet'],
  ['vet', 'ב', '', 'וֵית', 'v', true, 'bet'],
  ['gimel', 'ג', '', 'גִּימֶל', 'g', false],
  ['dalet', 'ד', '', 'דָּלֶת', 'd', false],
  ['he', 'ה', '', 'הֵא', 'h', false],
  ['vav', 'ו', '', 'וָו', 'v', false],
  ['zayin', 'ז', '', 'זַיִן', 'z', false],
  ['het', 'ח', '', 'חֵית', 'ch', false],
  ['tet', 'ט', '', 'טֵית', 't', false],
  ['yod', 'י', '', 'יוֹד', 'y', false],
  ['kaf', 'כ', DAGESH, 'כַּף', 'k', false, 'khaf'],
  ['khaf', 'כ', '', 'כָף', 'ch', true, 'kaf'],
  ['lamed', 'ל', '', 'לָמֶד', 'l', false],
  ['mem', 'מ', '', 'מֵם', 'm', false],
  ['nun', 'נ', '', 'נוּן', 'n', false],
  ['samech', 'ס', '', 'סָמֶךְ', 's', false],
  ['ayin', 'ע', '', 'עַיִן', '0', false],
  ['pe', 'פ', DAGESH, 'פֵּא', 'p', false, 'fe'],
  ['fe', 'פ', '', 'פֵא', 'f', true, 'pe'],
  ['tsadi', 'צ', '', 'צָדִי', 'ts', false],
  ['qof', 'ק', '', 'קוֹף', 'k', false],
  ['resh', 'ר', '', 'רֵישׁ', 'r', false],
  ['shin', 'ש', SHIN_DOT, 'שִׁין', 'sh', false, 'sin'],
  ['sin', 'ש', SIN_DOT, 'שִׂין', 's', true, 'shin'],
  ['tav', 'ת', '', 'תָּו', 't', false],
]

export const ITEMS: Item[] = RAW.map(([id, base, suffix, name, sound, soft, pair]) => ({
  id, base, glyph: (base + suffix).normalize('NFC'), name: name.normalize('NFC'), sound, soft, ...(pair ? { pair } : {}),
}))

export const MARKS: Mark[] = [
  { id: 'kamatz', group: 'a', sign: 'ָ', vav: false },
  { id: 'patach', group: 'a', sign: 'ַ', vav: false },
  { id: 'tsere', group: 'e', sign: 'ֵ', vav: false },
  { id: 'segol', group: 'e', sign: 'ֶ', vav: false },
  { id: 'chirik', group: 'i', sign: 'ִ', vav: false },
  { id: 'cholam', group: 'o', sign: 'ֹ', vav: false },
  { id: 'cholam-male', group: 'o', sign: 'וֹ'.normalize('NFC'), vav: true },
  { id: 'kubutz', group: 'u', sign: 'ֻ', vav: false },
  { id: 'shuruk', group: 'u', sign: 'וּ'.normalize('NFC'), vav: true },
]

export const GROUPS: VowelGroup[] = ['a', 'e', 'i', 'o', 'u']
export const GROUP_MARKS: Record<VowelGroup, MarkId[]> = { a: [], e: [], i: [], o: [], u: [] }
for (const m of MARKS) GROUP_MARKS[m.group].push(m.id)

const byId = new Map(ITEMS.map((i) => [i.id, i]))
const markById = new Map(MARKS.map((m) => [m.id, m]))
export const item = (id: string): Item => {
  const it = byId.get(id)
  if (!it) throw new Error(`unknown item ${id}`)
  return it
}
export const mark = (id: MarkId): Mark => markById.get(id)!
export const soundOfItem = (id: string) => item(id).sound

export function syllable(itemId: string, markId: MarkId): Syllable {
  const it = item(itemId)
  const m = mark(markId)
  const text = (m.vav ? it.glyph + m.sign : it.glyph + m.sign).normalize('NFC')
  return { id: `${itemId}-${markId}`, item: it, mark: m, text, soundId: `syl-${it.sound}-${m.group}` }
}

/**
 * Syllables the game never shows (rule: no symbol that can be read two ways): וֹ (vav + cholam) looks like the vowel
 * cholam male "o"; "vo" is taught as ווֹ (Michael kept it out, 2026-10-20). (יִ was left out for looking like "¡" and put back: Michael, 2026-10-20 — it is a common syllable.)
 */
export const LEFT_OUT = new Set(['vav-cholam'])
export const isAllowed = (itemId: string, markId: MarkId) => !LEFT_OUT.has(`${itemId}-${markId}`)

export function itemsOfStage(stage: Stage): Item[] {
  return stage >= 3 || stage === 1 ? ITEMS : ITEMS.filter((i) => !i.soft)
}

export function syllablesOfStage(stage: Stage): Syllable[] {
  const items = stage >= 3 ? ITEMS : ITEMS.filter((i) => !i.soft)
  return items.flatMap((i) => MARKS.filter((m) => isAllowed(i.id, m.id)).map((m) => syllable(i.id, m.id)))
}

/** Letters that look alike (start groups for the ghosts, replaced by his real mix-ups when known). */
export const SHAPE_GROUPS: string[][] = [
  ['bet', 'khaf'], ['dalet', 'resh'], ['he', 'het', 'tav'], ['vav', 'zayin'],
  ['gimel', 'nun'], ['tet', 'mem'], ['ayin', 'tsadi'], ['vav', 'yod'],
]
