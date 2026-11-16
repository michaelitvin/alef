// Core entity types for the Hebrew Reading Game

/**
 * Hebrew Letter (אות)
 * Represents a single Hebrew letter with its metadata
 */
export interface Letter {
  /** Unique identifier (e.g., 'alef', 'bet') */
  id: string
  /** The Hebrew character (e.g., 'א', 'ב') */
  character: string
  /** Hebrew name of the letter (e.g., 'אָלֶף') */
  name: string
  /** Transliteration of the name (e.g., 'Alef') */
  nameTranslit: string
  /** Primary sound the letter makes */
  sound: string
  /** Alternative sounds if any (e.g., ב can be 'b' or 'v') */
  alternateSounds?: string[]
  /** Order in the alphabet (1-27, including sofiyot) */
  order: number
  /** Whether this is a final letter (sofit) */
  isSofit: boolean
  /** The regular form if this is a sofit (e.g., 'kaf' for 'kaf-sofit') */
  regularForm?: string
  /** Audio file path for letter name */
  audioName: string
  /** Audio file path for letter sound */
  audioSound: string
  /** Optional fun fact or mnemonic for children */
  funFact?: string
  /** IDs of variant forms (e.g., bet has bet-dagesh, bet-no-dagesh) */
  variantIds?: string[]
  /** For shin: has sin variant */
  hasSinVariant?: boolean
}

/**
 * CV Syllable (צֵרוּף)
 * A consonant-vowel combination unit - the fundamental reading unit in Hebrew
 */
export interface CVSyllable {
  /** Unique identifier (e.g., 'bet-kamatz') */
  id: string
  /** Reference to letter */
  letterId: string
  /** Reference to nikkud */
  nikkudId: string
  /** Display string with combined character (e.g., 'בָּ') */
  display: string
  /** Pronunciation (e.g., 'ba') */
  sound: string
  /** Audio file path */
  audio: string
  /** Whether letter has dagesh in this combination */
  hasDagesh?: boolean
  /** Frequency in first-grade vocabulary (1-5, 5=most common) */
  frequency: number
  /** Order for introduction in curriculum */
  order: number
}

/**
 * Letter Variant
 * A letter with alternate sound based on dagesh or shin/sin dot
 */
export interface LetterVariant {
  /** Unique identifier (e.g., 'bet-dagesh', 'bet-no-dagesh') */
  id: string
  /** Base letter ID */
  baseId: string
  /** Display character */
  character: string
  /** Sound for this variant */
  sound: string
  /** Whether this variant has dagesh */
  hasDagesh: boolean
  /** For shin/sin: position of dot */
  dotPosition?: 'right' | 'left'
  /** Audio for this variant sound */
  audioSound: string
}
