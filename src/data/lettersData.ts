import type { Letter } from '../types/entities'
import { importYaml } from '../utils/yaml'

interface LettersYaml {
  letters: Letter[]
}

let cachedLetters: Letter[] | null = null

/**
 * Load all letters from YAML file
 */
export async function loadLetters(): Promise<Letter[]> {
  if (cachedLetters) {
    return cachedLetters
  }

  const data = await importYaml<LettersYaml>(() => import('./letters.yaml'))
  cachedLetters = data.letters
  return cachedLetters
}

/**
 * Get a specific letter by ID
 */
export async function getLetterById(id: string): Promise<Letter | null> {
  const letters = await loadLetters()
  return letters.find(letter => letter.id === id) || null
}

/**
 * Get letters for quiz options (target letter + random distractors)
 */
export async function getLetterQuizOptions(
  targetId: string,
  count: number = 4
): Promise<Letter[]> {
  const letters = await loadLetters()
  const target = letters.find(l => l.id === targetId)
  if (!target) return []

  // Get other letters as distractors
  const others = letters.filter(l => l.id !== targetId)

  // Shuffle and take (count - 1) distractors
  const shuffled = [...others].sort(() => Math.random() - 0.5)
  const distractors = shuffled.slice(0, count - 1)

  // Combine and shuffle again
  const options = [target, ...distractors].sort(() => Math.random() - 0.5)

  return options
}

/**
 * Get letters for matching activity
 */
export async function getLettersForMatch(
  letterIds: string[]
): Promise<Letter[]> {
  const letters = await loadLetters()
  return letters.filter(l => letterIds.includes(l.id))
}

/**
 * Simple in-memory letter data for pages that need basic info
 * This matches what's in LettersPage.tsx
 */
export const LETTERS_SIMPLE = [
  { id: 'alef', char: 'א' },
  { id: 'bet', char: 'ב' },
  { id: 'gimel', char: 'ג' },
  { id: 'dalet', char: 'ד' },
  { id: 'he', char: 'ה' },
  { id: 'vav', char: 'ו' },
  { id: 'zayin', char: 'ז' },
  { id: 'chet', char: 'ח' },
  { id: 'tet', char: 'ט' },
  { id: 'yod', char: 'י' },
  { id: 'kaf', char: 'כ' },
  { id: 'lamed', char: 'ל' },
  { id: 'mem', char: 'מ' },
  { id: 'nun', char: 'נ' },
  { id: 'samech', char: 'ס' },
  { id: 'ayin', char: 'ע' },
  { id: 'pe', char: 'פ' },
  { id: 'tsadi', char: 'צ' },
  { id: 'qof', char: 'ק' },
  { id: 'resh', char: 'ר' },
  { id: 'shin', char: 'ש' },
  { id: 'tav', char: 'ת' },
  { id: 'kaf-sofit', char: 'ך' },
  { id: 'mem-sofit', char: 'ם' },
  { id: 'nun-sofit', char: 'ן' },
  { id: 'pe-sofit', char: 'ף' },
  { id: 'tsadi-sofit', char: 'ץ' },
]
