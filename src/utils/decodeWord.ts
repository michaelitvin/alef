import lettersYaml from '../data/letters.yaml'
import nikkudYaml from '../data/nikkud.yaml'

interface LetterEntry {
  character: string
  name: string
}

interface NikkudEntry {
  mark: string
  name: string
}

const { letters } = lettersYaml as { letters: LetterEntry[] }
const { nikkud } = nikkudYaml as { nikkud: NikkudEntry[] }

/** Letter character -> vocalized letter name (e.g. א -> אָלֶף) */
const LETTER_NAMES = new Map(letters.map((l) => [l.character, l.name]))

/** Niqqud combining mark -> vocalized name (e.g. kamatz -> קָמָץ) */
const NIKKUD_NAMES = new Map(nikkud.map((n) => [n.mark, n.name]))

/** Marks that appear in vocalized text but are not in nikkud.yaml */
const EXTRA_MARK_NAMES = new Map<string, string>([
  ['\u05B1', 'חֲטַף סֶגּוֹל'],
  ['\u05B2', 'חֲטַף פַּתָח'],
  ['\u05B3', 'חֲטַף קָמָץ'],
  ['\u05C7', 'קָמָץ קָטָן'],
])

const DAGESH = '\u05BC'
const METEG = '\u05BD'
const SHIN_DOT = '\u05C1'
const SIN_DOT = '\u05C2'
const CHOLAM = '\u05B9'
const CHOLAM_HASER_FOR_VAV = '\u05BA'
const DAGESH_NAME = 'דָּגֵשׁ' // "dagesh" vocalized

const HEBREW_LETTER = /[\u05D0-\u05EA]/
// Niqqud (U+05B0-U+05BB) + dagesh + meteg + shin/sin dots + kamatz katan (U+05C7).
// Deliberately EXCLUDES maqaf (U+05BE), rafe (U+05BF), paseq (U+05C0).
const HEBREW_MARK = /[\u05B0-\u05BD\u05C1\u05C2\u05C7]/

/** Keep only Hebrew letters and combining marks (drops punctuation, Latin, maqaf) */
export function stripPunctuation(word: string): string {
  return Array.from(word)
    .filter((ch) => HEBREW_LETTER.test(ch) || HEBREW_MARK.test(ch))
    .join('')
}

interface Cluster {
  letter: string
  marks: string[]
}

function toClusters(text: string): Cluster[] | null {
  const clusters: Cluster[] = []
  for (const ch of text) {
    if (HEBREW_LETTER.test(ch)) {
      clusters.push({ letter: ch, marks: [] })
    } else if (clusters.length > 0) {
      clusters[clusters.length - 1].marks.push(ch)
    } else {
      return null // mark before any letter
    }
  }
  return clusters.length > 0 ? clusters : null
}

/** Vocalic vav: shuruk (וּ) or holam male (וֹ) */
function vavPhrase(c: Cluster): string | null {
  if (c.letter !== 'ו') return null
  const marks = c.marks.filter((m) => m !== METEG)
  if (marks.length === 1 && marks[0] === DAGESH) return 'שׁוּרוּק'
  if (marks.length === 1 && (marks[0] === CHOLAM || marks[0] === CHOLAM_HASER_FOR_VAV)) {
    return 'חוֹלָם מָלֵא'
  }
  return null
}

function clusterPhrase(c: Cluster): string | null {
  let letterName: string | undefined
  if (c.letter === 'ש' && c.marks.includes(SIN_DOT)) {
    letterName = 'שִׁין שְׂמָאלִית'
  } else {
    letterName = LETTER_NAMES.get(c.letter)
  }
  if (!letterName) return null

  let hasDagesh = false
  const vowelNames: string[] = []
  for (const mark of c.marks) {
    if (mark === DAGESH) {
      hasDagesh = true
    } else if (mark === SHIN_DOT || mark === SIN_DOT || mark === METEG) {
      continue
    } else {
      const name = NIKKUD_NAMES.get(mark) ?? EXTRA_MARK_NAMES.get(mark)
      if (!name) return null
      vowelNames.push(name)
    }
  }

  const extras = [...(hasDagesh ? [DAGESH_NAME] : []), ...vowelNames]
  if (extras.length === 0) return letterName
  return `${letterName} עִם ${extras.join(' וְ')}`
}

/**
 * Turn a vocalized Hebrew word into a decode sentence:
 * "אָלֶף עִם פַּתָח, בֵּית עִם דָּגֵשׁ וְקָמָץ, אָלֶף - אַבָּא"
 * Falls back to the word itself if any cluster can't be decoded.
 */
export function decodeWord(word: string): string {
  const bare = stripPunctuation(word)
  const clusters = toClusters(bare)
  if (!clusters) {
    console.warn(`decodeWord: cannot decode "${word}"`)
    return word.normalize('NFC')
  }

  const phrases: string[] = []
  for (const cluster of clusters) {
    const phrase = vavPhrase(cluster) ?? clusterPhrase(cluster)
    if (!phrase) {
      console.warn(`decodeWord: cannot decode "${word}"`)
      return bare.normalize('NFC')
    }
    phrases.push(phrase)
  }
  return `${phrases.join(', ')} - ${bare}`.normalize('NFC')
}
