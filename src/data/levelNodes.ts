/**
 * Centralized level node definitions
 * Single source of truth for what nodes exist in each level
 */

import { LETTERS_SIMPLE } from './lettersData'

// Nikkud marks in teaching order
export const NIKKUD_NODES = [
  { id: 'kamatz', mark: 'ָ', name: 'קָמָץ', isFullVowel: false },
  { id: 'patach', mark: 'ַ', name: 'פַּתָּח', isFullVowel: false },
  { id: 'tzeire', mark: 'ֵ', name: 'צֵירֶה', isFullVowel: false },
  { id: 'segol', mark: 'ֶ', name: 'סֶגּוֹל', isFullVowel: false },
  { id: 'chirik', mark: 'ִ', name: 'חִירִיק', isFullVowel: false },
  { id: 'cholam', mark: 'ֹ', name: 'חוֹלָם', isFullVowel: false },
  { id: 'holam-male', mark: 'וֹ', name: 'חוֹלָם מָלֵא', isFullVowel: true },
  { id: 'kubutz', mark: 'ֻ', name: 'קֻבּוּץ', isFullVowel: false },
  { id: 'shuruk', mark: 'וּ', name: 'שׁוּרוּק', isFullVowel: true },
  { id: 'shva', mark: 'ְ', name: 'שְׁוָא', isFullVowel: false },
] as const

// Syllable activities
export const SYLLABLE_NODES = [
  { id: 'drill-bet-all', type: 'drill', name: 'תרגול בֵּית', display: 'בָּ', order: 1 },
  { id: 'drill-mem-all', type: 'drill', name: 'תרגול מֵם', display: 'מָ', order: 2 },
  { id: 'drill-lamed-all', type: 'drill', name: 'תרגול לָמֶד', display: 'לָ', order: 3 },
  { id: 'drill-shin-all', type: 'drill', name: 'תרגול שִׁין', display: 'שָׁ', order: 4 },
  { id: 'drill-mixed-basic', type: 'drill', name: 'תרגול מעורב', display: '🎯', order: 5 },
  { id: 'blend-easy', type: 'blend', name: 'מרכיבים מילים', display: '🔗', order: 6 },
  { id: 'segment-easy', type: 'segment', name: 'מפרקים מילים', display: '✂️', order: 7 },
  { id: 'pairs-consonant', type: 'pairs', name: 'צלילים דומים', display: '👂', order: 8 },
] as const

// Word groups
export const WORD_NODES: readonly { id: string; name: string; icon: string; words: string[] }[] = [
  { id: 'family', name: 'משפחה', icon: '👨‍👩‍👧‍👦', words: ['ima', 'aba'] },
  { id: 'people', name: 'אנשים', icon: '👦', words: ['yeled', 'yalda'] },
  { id: 'animals', name: 'חיות', icon: '🐾', words: ['kelev', 'chatul'] },
  { id: 'home', name: 'בית', icon: '🏠', words: ['bait', 'sefer'] },
  { id: 'nature', name: 'טבע', icon: '🌳', words: ['shemesh', 'mayim'] },
  { id: 'food', name: 'אוכל', icon: '🍎', words: ['lechem', 'tapuach', 'chalav'] },
  { id: 'actions', name: 'פעולות', icon: '🏃', words: ['holeech', 'ratz', 'yoshev'] },
  { id: 'colors', name: 'צבעים', icon: '🎨', words: ['adom', 'yarok', 'kachol'] },
]

// Sentence groups
export const SENTENCE_NODES = [
  { id: 'basic-1', name: 'משפטים פשוטים א', icon: '📖', difficulty: 1 },
  { id: 'basic-2', name: 'משפטים פשוטים ב', icon: '📗', difficulty: 1 },
  { id: 'medium-1', name: 'משפטים בינוניים א', icon: '📘', difficulty: 2 },
  { id: 'medium-2', name: 'משפטים בינוניים ב', icon: '📙', difficulty: 2 },
  { id: 'advanced-1', name: 'משפטים מתקדמים א', icon: '📕', difficulty: 3 },
  { id: 'advanced-2', name: 'משפטים מתקדמים ב', icon: '📚', difficulty: 3 },
] as const

// Dynamic node counts derived from actual data
export const LEVEL_NODE_COUNTS = {
  letters: LETTERS_SIMPLE.length,
  nikkud: NIKKUD_NODES.length,
  syllables: SYLLABLE_NODES.length,
  words: WORD_NODES.length,
  sentences: SENTENCE_NODES.length,
} as const

export type LevelId = keyof typeof LEVEL_NODE_COUNTS
