/**
 * Core Entity Types for Hebrew Reading Game
 *
 * These types define the curriculum content data structures.
 * All content is static and loaded from JSON files.
 */

/**
 * Hebrew consonant letter
 */
export interface Letter {
  /** Unique identifier (e.g., "alef", "bet") */
  id: string;
  /** Hebrew letter character (e.g., "א", "ב") */
  character: string;
  /** Letter name in Hebrew with nikkud (e.g., "אָלֶף") */
  name: string;
  /** Audio file URL for letter name pronunciation */
  nameAudioUrl: string;
  /** Audio file URL for letter sound */
  soundAudioUrl: string;
  /** Learning sequence order (1-27) */
  order: number;
  /** Final form character if applicable (e.g., "ך" for כ) */
  finalForm?: string;
  /** Whether this entry is a final form */
  isFinalForm: boolean;
}

/**
 * Hebrew vowel mark (diacritic)
 */
export interface Nikkud {
  /** Unique identifier (e.g., "kamatz", "patach") */
  id: string;
  /** Unicode nikkud character (e.g., "ָ") */
  mark: string;
  /** Nikkud name in Hebrew (e.g., "קָמָץ") */
  name: string;
  /** Description of how to pronounce in Hebrew */
  soundDescription: string;
  /** Audio file URL for nikkud pronunciation */
  audioUrl: string;
  /** Learning sequence order (1-8) */
  order: number;
}

/**
 * Letter combined with a nikkud mark
 */
export interface Combination {
  /** Unique identifier (e.g., "bet-kamatz") */
  id: string;
  /** Reference to Letter.id */
  letterId: string;
  /** Reference to Nikkud.id */
  nikkudId: string;
  /** Rendered letter with nikkud (e.g., "בָּ") */
  combined: string;
  /** Audio file URL for combined pronunciation */
  audioUrl: string;
}

/**
 * Syllable within a word
 */
export interface Syllable {
  /** Syllable text with nikkud (e.g., "בַּ") */
  text: string;
  /** Audio file URL for syllable pronunciation */
  audioUrl: string;
  /** Position in word (1-indexed) */
  position: number;
}

/**
 * Difficulty levels for words and sentences
 */
export type Difficulty = 1 | 2 | 3;

/**
 * Hebrew word for reading practice
 */
export interface Word {
  /** Unique identifier (e.g., "word-bayit") */
  id: string;
  /** Full word with nikkud (e.g., "בַּיִת") */
  text: string;
  /** Hebrew meaning hint/description */
  meaning: string;
  /** Word broken into syllables */
  syllables: Syllable[];
  /** Audio file URL for full word pronunciation */
  audioUrl: string;
  /** Optional illustration URL */
  imageUrl?: string;
  /** Difficulty level (1=easiest, 3=hardest) */
  difficulty: Difficulty;
  /** Letter IDs used in this word (for prerequisites) */
  letterIds: string[];
  /** Nikkud IDs used in this word (for prerequisites) */
  nikkudIds: string[];
}

/**
 * Simple sentence for reading comprehension
 */
export interface Sentence {
  /** Unique identifier (e.g., "sentence-001") */
  id: string;
  /** Full sentence text with nikkud */
  text: string;
  /** References to Word.id for each word */
  wordIds: string[];
  /** Audio file URL for full sentence */
  audioUrl: string;
  /** Optional accompanying illustration */
  imageUrl?: string;
  /** Optional comprehension question in Hebrew */
  comprehensionQuestion?: string;
  /** Expected answer to comprehension question */
  comprehensionAnswer?: string;
  /** Difficulty level (1=easiest, 3=hardest) */
  difficulty: Difficulty;
}

/**
 * Activity types available in the game
 */
export type ActivityType =
  | 'introduction'  // Show and explain new content
  | 'matching'      // Match items to sounds/images
  | 'quiz'          // Multiple choice questions
  | 'listening'     // Identify by audio
  | 'reading';      // Read aloud practice

/**
 * Curriculum level/stage
 */
export type LevelType = 'letters' | 'nikkud' | 'words' | 'sentences';

/**
 * Individual item within an activity
 */
export interface ActivityItem {
  /** What to show or ask */
  prompt: string;
  /** Audio URL for the prompt */
  promptAudioUrl?: string;
  /** Expected correct response */
  correctAnswer: string;
  /** Multiple choice options (if applicable) */
  options?: string[];
  /** Feedback message for correct answer */
  feedbackCorrect: string;
  /** Encouragement message for incorrect answer */
  feedbackIncorrect: string;
}

/**
 * Learning activity/game definition
 */
export interface Activity {
  /** Activity identifier */
  id: string;
  /** Type of activity */
  type: ActivityType;
  /** Display name in Hebrew */
  title: string;
  /** Instructions in Hebrew */
  description: string;
  /** Which curriculum level this belongs to */
  targetLevel: LevelType;
  /** Content items for this activity */
  items: ActivityItem[];
}
