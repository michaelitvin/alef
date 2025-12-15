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
 * Nikkud (ניקוד) - Vowel Mark
 * Represents a Hebrew vowel diacritic mark
 */
export interface Nikkud {
  /** Unique identifier (e.g., 'kamatz', 'patach') */
  id: string
  /** The nikkud mark character (e.g., 'ָ', 'ַ') */
  mark: string
  /** Hebrew name (e.g., 'קָמָץ') */
  name: string
  /** Transliteration (e.g., 'Kamatz') */
  nameTranslit: string
  /** Sound it makes (e.g., 'a' as in 'father') */
  sound: string
  /** Order for teaching sequence */
  order: number
  /** Example letter+nikkud combination */
  exampleCombo: string
  /** Audio file path for nikkud name */
  audioName: string
  /** Audio file path for nikkud sound */
  audioSound: string
  /** Position relative to letter: below, above, or inline */
  position: 'below' | 'above' | 'inline'
  /** True for holam male and shuruk (vav-based vowels) */
  isFullVowel?: boolean
  /** Sound group for quiz logic ('a', 'e', 'i', 'o', 'u', 'silent') */
  soundGroup?: 'a' | 'e' | 'i' | 'o' | 'u' | 'silent'
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
 * Syllable Drill
 * A structured practice session for CV syllable recognition
 */
export interface SyllableDrill {
  /** Unique identifier */
  id: string
  /** Display name in Hebrew */
  name: string
  /** CV syllables included in this drill */
  syllableIds: string[]
  /** Minimum number to complete */
  minItems: number
  /** Success threshold (0-1) */
  successThreshold: number
  /** Difficulty level (1-5) */
  difficulty: number
  /** Prerequisite drills */
  prerequisiteIds?: string[]
}

/**
 * Syllable Pair
 * Two similar CV syllables for minimal pair discrimination practice
 */
export interface SyllablePair {
  /** Unique identifier */
  id: string
  /** First syllable ID */
  syllable1Id: string
  /** Second syllable ID */
  syllable2Id: string
  /** What distinguishes them */
  contrastType: 'consonant' | 'vowel' | 'dagesh' | 'shin-sin'
  /** Description of the contrast for teaching */
  contrastDescription: string
  /** Difficulty (1-5) */
  difficulty: number
}

/**
 * Full Vowel
 * A vowel represented by vav with a diacritic (holam male or shuruk)
 */
export interface FullVowel {
  /** Unique identifier */
  id: 'holam-male' | 'shuruk'
  /** Display character (וֹ or וּ) */
  mark: string
  /** Hebrew name */
  name: string
  /** Transliteration */
  nameTranslit: string
  /** Sound it produces */
  sound: 'o' | 'u'
  /** Related simple nikkud (cholam or kubutz) */
  relatedNikkudId: string
  /** Audio for name */
  audioName: string
  /** Audio for sound */
  audioSound: string
  /** Teaching order */
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

/**
 * Letter-Nikkud Combination
 * Represents a consonant with a vowel mark
 */
export interface Combination {
  /** Unique identifier (e.g., 'bet-kamatz') */
  id: string
  /** The letter ID */
  letterId: string
  /** The nikkud ID */
  nikkudId: string
  /** Combined display (e.g., 'בָּ') */
  display: string
  /** Sound of the combination (e.g., 'ba') */
  sound: string
  /** Audio file path */
  audio: string
}

/**
 * Syllable
 * A component of a word
 */
export interface Syllable {
  /** The syllable text with nikkud */
  text: string
  /** Audio file path for this syllable */
  audio: string
}

/**
 * Word (מילה)
 * A Hebrew word with syllable breakdown
 */
export interface Word {
  /** Unique identifier */
  id: string
  /** The full word with nikkud (e.g., 'אִמָּא') */
  text: string
  /** The word without nikkud for advanced readers */
  textPlain: string
  /** Hebrew meaning/definition (children know orally) */
  meaning?: string
  /** Syllable breakdown */
  syllables: Syllable[]
  /** Audio file path for full word */
  audio: string
  /** Image illustration path */
  image?: string
  /** Difficulty level (1-5) */
  difficulty: number
  /** Category for grouping (family, animals, food, etc.) */
  category: string
  /** Letters required to read this word */
  requiredLetters: string[]
  /** Nikkud marks used in this word */
  requiredNikkud: string[]
}

/**
 * Sentence (משפט)
 * A simple Hebrew sentence
 */
export interface Sentence {
  /** Unique identifier */
  id: string
  /** Full sentence text with nikkud */
  text: string
  /** Individual word IDs that make up this sentence */
  wordIds: string[]
  /** Audio file path */
  audio: string
  /** Illustration image path */
  image?: string
  /** Comprehension question */
  comprehension?: ComprehensionQuestion
  /** Difficulty level (1-5) */
  difficulty: number
}

/**
 * Comprehension Question
 * A question about a sentence
 */
export interface ComprehensionQuestion {
  /** The question text in Hebrew */
  question: string
  /** Type of question */
  type: 'yes-no' | 'multiple-choice' | 'picture-match'
  /** Correct answer */
  correctAnswer: string
  /** Wrong options for multiple choice */
  wrongOptions?: string[]
  /** Audio for the question */
  audioQuestion?: string
}

/**
 * Activity Item
 * A single item within an activity (question/challenge)
 */
export interface ActivityItem {
  /** Unique identifier within the activity */
  id: string
  /** Type of item */
  type: 'letter-identify' | 'letter-sound' | 'letter-match' |
        'nikkud-identify' | 'nikkud-sound' | 'combination-build' |
        'syllable-drill' | 'syllable-blend' | 'syllable-segment' | 'minimal-pair' |
        'word-syllable' | 'word-picture' | 'word-sound' |
        'sentence-read' | 'sentence-picture' | 'sentence-comprehension'
  /** The target content (letter ID, word ID, etc.) */
  targetId: string
  /** Prompt/instruction for the child */
  prompt?: string
  /** Audio prompt */
  promptAudio?: string
  /** Distractor options (wrong answers) */
  distractors?: string[]
}

/**
 * Activity (פעילות)
 * An interactive learning exercise
 */
export interface Activity {
  /** Unique identifier (e.g., 'letters-intro', 'nikkud-combine') */
  id: string
  /** Display name in Hebrew */
  name: string
  /** Description of the activity */
  description: string
  /** Type of activity */
  type: 'intro' | 'match' | 'quiz' | 'combine' | 'syllable' | 'picture' | 'comprehension' |
        'syllable-drill' | 'syllable-blend' | 'syllable-segment' | 'minimal-pair'
  /** Which level this belongs to */
  level: 'letters' | 'nikkud' | 'syllables' | 'words' | 'sentences'
  /** Items in this activity */
  items: ActivityItem[]
  /** Success threshold (0-1) to consider activity complete */
  successThreshold: number
  /** Minimum items to complete */
  minItems: number
}

/**
 * Node
 * A learning unit on the journey path
 */
export interface Node {
  /** Unique identifier */
  id: string
  /** Display label (e.g., 'א', 'קָמָץ') */
  label: string
  /** Which level this node belongs to */
  level: 'letters' | 'nikkud' | 'syllables' | 'words' | 'sentences'
  /** Order within the level */
  order: number
  /** The content ID (letter ID, nikkud ID, or custom for words/sentences) */
  contentId: string
  /** Activities available at this node */
  activityIds: string[]
}

/**
 * Level
 * A major section of the curriculum
 */
export interface Level {
  /** Unique identifier */
  id: 'letters' | 'nikkud' | 'syllables' | 'words' | 'sentences'
  /** Display name in Hebrew */
  name: string
  /** Description */
  description: string
  /** Order for display */
  order: number
  /** Unlock condition (previous level success rate) */
  unlockThreshold: number
  /** Nodes in this level */
  nodeIds: string[]
}
