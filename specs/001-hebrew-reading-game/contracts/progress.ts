/**
 * Progress and State Types for Hebrew Reading Game
 *
 * These types define user progress, settings, and persisted state.
 * Progress is stored in LocalStorage via Zustand persist middleware.
 */

import type { LevelType } from './entities';

/**
 * Types of rewards that can be earned
 */
export type RewardType = 'star' | 'badge' | 'character' | 'milestone';

/**
 * Individual earned reward
 */
export interface Reward {
  /** Unique reward instance ID */
  id: string;
  /** Category of reward */
  type: RewardType;
  /** ISO timestamp when earned */
  earnedAt: string;
  /** Description of why earned */
  reason: string;
  /** Additional context data */
  metadata?: Record<string, unknown>;
}

/**
 * User preferences
 */
export interface Settings {
  /** Master audio playback toggle */
  soundEnabled: boolean;
  /** Background music toggle */
  musicEnabled: boolean;
  /** UI sound effects toggle */
  effectsEnabled: boolean;
  /** Auto-advance after correct answer */
  autoAdvance: boolean;
  /** Seconds to wait before showing hint */
  hintDelay: number;
}

/**
 * Default settings values
 */
export const DEFAULT_SETTINGS: Settings = {
  soundEnabled: true,
  musicEnabled: true,
  effectsEnabled: true,
  autoAdvance: true,
  hintDelay: 10,
};

/**
 * Usage and engagement statistics
 */
export interface Stats {
  /** Cumulative play time in minutes */
  totalTimeMinutes: number;
  /** Number of game sessions */
  sessionsCount: number;
  /** ISO date of last session */
  lastSessionDate: string;
  /** Maximum consecutive days played */
  longestStreak: number;
  /** Current consecutive days streak */
  currentStreak: number;
  /** Total correct responses */
  correctAnswers: number;
  /** Total response attempts */
  totalAttempts: number;
}

/**
 * Default stats values
 */
export const DEFAULT_STATS: Stats = {
  totalTimeMinutes: 0,
  sessionsCount: 0,
  lastSessionDate: '',
  longestStreak: 0,
  currentStreak: 0,
  correctAnswers: 0,
  totalAttempts: 0,
};

/**
 * Complete user progress state
 * This is what gets persisted to LocalStorage
 */
export interface Progress {
  /** Schema version for migrations */
  version: number;

  // Letter progress
  /** IDs of completed letters */
  lettersCompleted: string[];
  /** ID of letter currently being learned */
  lettersInProgress: string | null;

  // Nikkud progress
  /** IDs of completed nikkud marks */
  nikkudCompleted: string[];
  /** ID of nikkud currently being learned */
  nikkudInProgress: string | null;

  // Words progress
  /** IDs of successfully read words */
  wordsLearned: string[];

  // Sentences progress
  /** IDs of completed sentences */
  sentencesRead: string[];

  // Current state
  /** Current curriculum level */
  currentLevel: LevelType;

  // Rewards
  /** All earned rewards */
  rewards: Reward[];

  // Preferences
  /** User settings */
  settings: Settings;

  // Statistics
  /** Usage statistics */
  stats: Stats;

  // Metadata
  /** ISO timestamp of last update */
  lastUpdated: string;
}

/**
 * Current schema version
 * Increment when making breaking changes to Progress structure
 */
export const PROGRESS_VERSION = 1;

/**
 * Default/initial progress state
 */
export const DEFAULT_PROGRESS: Progress = {
  version: PROGRESS_VERSION,
  lettersCompleted: [],
  lettersInProgress: null,
  nikkudCompleted: [],
  nikkudInProgress: null,
  wordsLearned: [],
  sentencesRead: [],
  currentLevel: 'letters',
  rewards: [],
  settings: DEFAULT_SETTINGS,
  stats: DEFAULT_STATS,
  lastUpdated: new Date().toISOString(),
};

/**
 * Actions that can modify progress
 */
export interface ProgressActions {
  // Letter actions
  /** Mark a letter as completed */
  completeLetter: (letterId: string) => void;
  /** Set the current letter being learned */
  setLetterInProgress: (letterId: string | null) => void;

  // Nikkud actions
  /** Mark a nikkud as completed */
  completeNikkud: (nikkudId: string) => void;
  /** Set the current nikkud being learned */
  setNikkudInProgress: (nikkudId: string | null) => void;

  // Word actions
  /** Mark a word as learned */
  learnWord: (wordId: string) => void;

  // Sentence actions
  /** Mark a sentence as read */
  readSentence: (sentenceId: string) => void;

  // Level actions
  /** Update current curriculum level */
  setCurrentLevel: (level: LevelType) => void;

  // Reward actions
  /** Add a new reward */
  addReward: (reward: Omit<Reward, 'id' | 'earnedAt'>) => void;

  // Settings actions
  /** Update a setting */
  updateSetting: <K extends keyof Settings>(key: K, value: Settings[K]) => void;

  // Stats actions
  /** Record a response attempt */
  recordAttempt: (correct: boolean) => void;
  /** Add session time */
  addSessionTime: (minutes: number) => void;
  /** Start a new session (updates streak) */
  startSession: () => void;

  // Utility actions
  /** Reset all progress */
  resetProgress: () => void;
}

/**
 * Complete progress store type (state + actions)
 */
export type ProgressStore = Progress & ProgressActions;

/**
 * Level unlock thresholds
 */
export const LEVEL_THRESHOLDS = {
  /** Letters needed to unlock nikkud */
  lettersForNikkud: 10,
  /** Nikkud needed to unlock words */
  nikkudForWords: 5,
  /** Words needed to unlock sentences */
  wordsForSentences: 10,
} as const;

/**
 * Check if a level is unlocked based on progress
 */
export function isLevelUnlocked(level: LevelType, progress: Progress): boolean {
  switch (level) {
    case 'letters':
      return true; // Always unlocked
    case 'nikkud':
      return progress.lettersCompleted.length >= LEVEL_THRESHOLDS.lettersForNikkud;
    case 'words':
      return progress.nikkudCompleted.length >= LEVEL_THRESHOLDS.nikkudForWords;
    case 'sentences':
      return progress.wordsLearned.length >= LEVEL_THRESHOLDS.wordsForSentences;
    default:
      return false;
  }
}

/**
 * Calculate overall progress percentage
 */
export function calculateProgressPercentage(
  progress: Progress,
  totals: { letters: number; nikkud: number; words: number; sentences: number }
): number {
  const letterProgress = progress.lettersCompleted.length / totals.letters;
  const nikkudProgress = progress.nikkudCompleted.length / totals.nikkud;
  const wordProgress = progress.wordsLearned.length / totals.words;
  const sentenceProgress = progress.sentencesRead.length / totals.sentences;

  // Weight each section equally
  return ((letterProgress + nikkudProgress + wordProgress + sentenceProgress) / 4) * 100;
}
