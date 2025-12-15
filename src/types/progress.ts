// Progress and state types for the Hebrew Reading Game

/**
 * Activity Attempt
 * A single attempt at an activity item
 */
export interface ActivityAttempt {
  /** Item ID that was attempted */
  itemId: string
  /** Whether the attempt was correct */
  correct: boolean
  /** Time taken in milliseconds */
  timeMs: number
  /** Timestamp of the attempt */
  timestamp: number
}

/**
 * Node Progress
 * Progress within a single node on the journey path
 */
export interface NodeProgress {
  /** Node ID */
  nodeId: string
  /** Current state of the node */
  state: 'locked' | 'available' | 'in_progress' | 'mastered'
  /** All attempts at this node's activities */
  attempts: ActivityAttempt[]
  /** Overall success rate (0-1) */
  successRate: number
  /** Total time spent on this node in milliseconds */
  timeSpentMs: number
  /** First accessed timestamp */
  firstAccessedAt?: number
  /** Last accessed timestamp */
  lastAccessedAt?: number
  /** Number of times the node was fully completed */
  completionCount: number
}

/**
 * Level Progress
 * Progress for an entire level (letters, nikkud, words, sentences)
 */
export interface LevelProgress {
  /** Level ID */
  levelId: 'letters' | 'nikkud' | 'syllables' | 'words' | 'sentences'
  /** Whether the level is unlocked */
  unlocked: boolean
  /** When the level was unlocked */
  unlockedAt?: number
  /** Overall success rate across all nodes */
  successRate: number
  /** Number of nodes mastered */
  nodesMastered: number
  /** Total nodes in this level */
  totalNodes: number
  /** Total time spent in milliseconds */
  timeSpentMs: number
}

/**
 * Reward Type
 */
export type RewardType =
  | 'letter_learned'    // Completed a letter node
  | 'nikkud_learned'    // Completed a nikkud node
  | 'word_learned'      // Read a new word
  | 'sentence_read'     // Read a sentence
  | 'level_unlocked'    // Unlocked a new level
  | 'level_mastered'    // Mastered an entire level
  | 'streak_3'          // 3 correct in a row
  | 'streak_5'          // 5 correct in a row
  | 'streak_10'         // 10 correct in a row
  | 'first_session'     // First time playing
  | 'daily_return'      // Returned after a day
  | 'game_complete'     // Finished all content

/**
 * Reward
 * An earned achievement or badge
 */
export interface Reward {
  /** Reward type */
  type: RewardType
  /** When the reward was earned */
  earnedAt: number
  /** Associated content ID (letter, word, etc.) */
  contentId?: string
  /** Whether the user has seen the reward animation */
  seen: boolean
}

/**
 * Stats
 * Aggregate statistics for the player
 */
export interface Stats {
  /** Total time played in milliseconds */
  totalTimeMs: number
  /** Number of sessions */
  sessionCount: number
  /** Current streak (correct answers in a row) */
  currentStreak: number
  /** Best streak ever achieved */
  bestStreak: number
  /** Total items attempted */
  totalAttempts: number
  /** Total correct answers */
  totalCorrect: number
  /** Overall accuracy (0-1) */
  accuracy: number
  /** Letters learned count */
  lettersLearned: number
  /** Nikkud learned count */
  nikkudLearned: number
  /** Words learned count */
  wordsLearned: number
  /** Sentences read count */
  sentencesRead: number
  /** First session date */
  firstSessionAt: number
  /** Last session date */
  lastSessionAt: number
  /** Days played (unique days) */
  daysPlayed: number
}

/**
 * Font type options for Hebrew text
 */
export type FontType = 'default' | 'cursive' | 'modern' | 'rounded'

/**
 * Settings
 * User preferences
 */
export interface Settings {
  /** Sound effects enabled */
  soundEffects: boolean
  /** Background music enabled */
  backgroundMusic: boolean
  /** Master volume (0-1) */
  volume: number
  /** Animation speed: normal or reduced */
  animationSpeed: 'normal' | 'reduced'
  /** Show hints after mistakes */
  showHints: boolean
  /** Dev mode - unlocks all levels */
  devMode: boolean
  /** Selected font for Hebrew text */
  font: FontType
}

/**
 * Current Session
 * Data for the current play session
 */
export interface CurrentSession {
  /** Session start time */
  startedAt: number
  /** Current level being played */
  currentLevel?: 'letters' | 'nikkud' | 'syllables' | 'words' | 'sentences'
  /** Current node being played */
  currentNodeId?: string
  /** Current activity being played */
  currentActivityId?: string
  /** Streak within this session */
  sessionStreak: number
  /** Attempts in this session */
  sessionAttempts: number
  /** Correct answers in this session */
  sessionCorrect: number
}

/**
 * Progress State
 * The complete progress state stored in localStorage
 */
export interface ProgressState {
  /** Version for migrations */
  version: number
  /** When progress was last saved */
  lastSavedAt: number
  /** Node progress map */
  nodes: Record<string, NodeProgress>
  /** Level progress map */
  levels: Record<string, LevelProgress>
  /** Earned rewards */
  rewards: Reward[]
  /** Aggregate stats */
  stats: Stats
  /** User settings */
  settings: Settings
  /** Current session (cleared on app close) */
  currentSession?: CurrentSession
  /** Whether the game has been completed */
  gameCompleted: boolean
  /** Vocabulary list - IDs of learned words */
  vocabulary: string[]
}

/**
 * Default initial state
 */
export const DEFAULT_SETTINGS: Settings = {
  soundEffects: true,
  backgroundMusic: false,
  volume: 0.8,
  animationSpeed: 'normal',
  showHints: true,
  devMode: false,
  font: 'default',
}

export const DEFAULT_STATS: Stats = {
  totalTimeMs: 0,
  sessionCount: 0,
  currentStreak: 0,
  bestStreak: 0,
  totalAttempts: 0,
  totalCorrect: 0,
  accuracy: 0,
  lettersLearned: 0,
  nikkudLearned: 0,
  wordsLearned: 0,
  sentencesRead: 0,
  firstSessionAt: 0,
  lastSessionAt: 0,
  daysPlayed: 0,
}

export const DEFAULT_LEVEL_PROGRESS: Record<string, LevelProgress> = {
  letters: {
    levelId: 'letters',
    unlocked: true, // Letters always unlocked
    successRate: 0,
    nodesMastered: 0,
    totalNodes: 27, // 22 letters + 5 sofiyot
    timeSpentMs: 0,
  },
  nikkud: {
    levelId: 'nikkud',
    unlocked: false,
    successRate: 0,
    nodesMastered: 0,
    totalNodes: 8,
    timeSpentMs: 0,
  },
  syllables: {
    levelId: 'syllables',
    unlocked: false,
    successRate: 0,
    nodesMastered: 0,
    totalNodes: 8, // 5 drills + blend + segment + pairs
    timeSpentMs: 0,
  },
  words: {
    levelId: 'words',
    unlocked: false,
    successRate: 0,
    nodesMastered: 0,
    totalNodes: 25,
    timeSpentMs: 0,
  },
  sentences: {
    levelId: 'sentences',
    unlocked: false,
    successRate: 0,
    nodesMastered: 0,
    totalNodes: 15,
    timeSpentMs: 0,
  },
}

export const INITIAL_PROGRESS_STATE: ProgressState = {
  version: 1,
  lastSavedAt: 0,
  nodes: {},
  levels: DEFAULT_LEVEL_PROGRESS,
  rewards: [],
  stats: DEFAULT_STATS,
  settings: DEFAULT_SETTINGS,
  currentSession: undefined,
  gameCompleted: false,
  vocabulary: [],
}

/**
 * Level unlock thresholds (success rate required to unlock next level)
 */
export const LEVEL_UNLOCK_THRESHOLDS = {
  letters: 0,     // Always unlocked
  nikkud: 0.8,    // 80% success in letters
  syllables: 0.8, // 80% success in nikkud
  words: 0.8,     // 80% success in syllables
  sentences: 0.8, // 80% success in words
} as const
