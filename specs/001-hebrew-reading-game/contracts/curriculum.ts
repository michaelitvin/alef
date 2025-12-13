/**
 * Curriculum Types for Hebrew Reading Game
 *
 * These types define the structure of learning content and curriculum data.
 * Used for loading and managing static JSON content.
 */

import type {
  Letter,
  Nikkud,
  Combination,
  Word,
  Sentence,
  Activity,
  LevelType,
} from './entities';

/**
 * Complete curriculum data loaded from JSON files
 */
export interface CurriculumData {
  /** All Hebrew letters */
  letters: Letter[];
  /** All nikkud marks */
  nikkud: Nikkud[];
  /** All letter-nikkud combinations */
  combinations: Combination[];
  /** All words in the curriculum */
  words: Word[];
  /** All sentences in the curriculum */
  sentences: Sentence[];
  /** All activity definitions */
  activities: Activity[];
}

/**
 * Indexes for fast lookup by ID
 */
export interface CurriculumIndexes {
  /** Letter by ID */
  lettersById: Map<string, Letter>;
  /** Nikkud by ID */
  nikkudById: Map<string, Nikkud>;
  /** Combination by ID */
  combinationsById: Map<string, Combination>;
  /** Word by ID */
  wordsById: Map<string, Word>;
  /** Sentence by ID */
  sentencesById: Map<string, Sentence>;
  /** Activity by ID */
  activitiesById: Map<string, Activity>;
  /** Combinations by letter ID */
  combinationsByLetter: Map<string, Combination[]>;
  /** Activities by level */
  activitiesByLevel: Map<LevelType, Activity[]>;
}

/**
 * Build indexes from curriculum data for efficient lookups
 */
export function buildCurriculumIndexes(data: CurriculumData): CurriculumIndexes {
  return {
    lettersById: new Map(data.letters.map((l) => [l.id, l])),
    nikkudById: new Map(data.nikkud.map((n) => [n.id, n])),
    combinationsById: new Map(data.combinations.map((c) => [c.id, c])),
    wordsById: new Map(data.words.map((w) => [w.id, w])),
    sentencesById: new Map(data.sentences.map((s) => [s.id, s])),
    activitiesById: new Map(data.activities.map((a) => [a.id, a])),
    combinationsByLetter: data.combinations.reduce((acc, combo) => {
      const existing = acc.get(combo.letterId) || [];
      acc.set(combo.letterId, [...existing, combo]);
      return acc;
    }, new Map<string, Combination[]>()),
    activitiesByLevel: data.activities.reduce((acc, activity) => {
      const existing = acc.get(activity.targetLevel) || [];
      acc.set(activity.targetLevel, [...existing, activity]);
      return acc;
    }, new Map<LevelType, Activity[]>()),
  };
}

/**
 * Curriculum content with indexes for efficient access
 */
export interface Curriculum {
  data: CurriculumData;
  indexes: CurriculumIndexes;
}

/**
 * Curriculum query helpers
 */
export interface CurriculumQueries {
  /** Get letter by ID */
  getLetter: (id: string) => Letter | undefined;
  /** Get nikkud by ID */
  getNikkud: (id: string) => Nikkud | undefined;
  /** Get word by ID */
  getWord: (id: string) => Word | undefined;
  /** Get sentence by ID */
  getSentence: (id: string) => Sentence | undefined;
  /** Get all combinations for a letter */
  getCombinationsForLetter: (letterId: string) => Combination[];
  /** Get activities for a level */
  getActivitiesForLevel: (level: LevelType) => Activity[];
  /** Get next letter to learn (not in completed list) */
  getNextLetter: (completedIds: string[]) => Letter | undefined;
  /** Get next nikkud to learn (not in completed list) */
  getNextNikkud: (completedIds: string[]) => Nikkud | undefined;
  /** Get words unlocked by current progress */
  getUnlockedWords: (letterIds: string[], nikkudIds: string[]) => Word[];
  /** Get sentences unlocked by current progress */
  getUnlockedSentences: (wordIds: string[]) => Sentence[];
}

/**
 * Create curriculum queries from indexed data
 */
export function createCurriculumQueries(curriculum: Curriculum): CurriculumQueries {
  const { data, indexes } = curriculum;

  return {
    getLetter: (id) => indexes.lettersById.get(id),

    getNikkud: (id) => indexes.nikkudById.get(id),

    getWord: (id) => indexes.wordsById.get(id),

    getSentence: (id) => indexes.sentencesById.get(id),

    getCombinationsForLetter: (letterId) =>
      indexes.combinationsByLetter.get(letterId) || [],

    getActivitiesForLevel: (level) =>
      indexes.activitiesByLevel.get(level) || [],

    getNextLetter: (completedIds) => {
      const completedSet = new Set(completedIds);
      return data.letters
        .filter((l) => !completedSet.has(l.id))
        .sort((a, b) => a.order - b.order)[0];
    },

    getNextNikkud: (completedIds) => {
      const completedSet = new Set(completedIds);
      return data.nikkud
        .filter((n) => !completedSet.has(n.id))
        .sort((a, b) => a.order - b.order)[0];
    },

    getUnlockedWords: (letterIds, nikkudIds) => {
      const letterSet = new Set(letterIds);
      const nikkudSet = new Set(nikkudIds);
      return data.words.filter((word) => {
        const hasAllLetters = word.letterIds.every((id) => letterSet.has(id));
        const hasAllNikkud = word.nikkudIds.every((id) => nikkudSet.has(id));
        return hasAllLetters && hasAllNikkud;
      });
    },

    getUnlockedSentences: (wordIds) => {
      const wordSet = new Set(wordIds);
      return data.sentences.filter((sentence) =>
        sentence.wordIds.every((id) => wordSet.has(id))
      );
    },
  };
}

/**
 * Lesson plan item - represents a single learning unit
 */
export interface LessonItem {
  /** Type of content */
  type: 'letter' | 'nikkud' | 'combination' | 'word' | 'sentence';
  /** Content ID */
  id: string;
  /** Activities to complete for this item */
  activityIds: string[];
}

/**
 * Lesson definition - a sequence of learning items
 */
export interface Lesson {
  /** Lesson identifier */
  id: string;
  /** Lesson title in Hebrew */
  title: string;
  /** Which curriculum level */
  level: LevelType;
  /** Learning items in order */
  items: LessonItem[];
  /** Prerequisites (lesson IDs that must be completed first) */
  prerequisites: string[];
}

/**
 * Audio manifest for preloading
 */
export interface AudioManifest {
  /** Letter audio URLs */
  letters: Array<{ id: string; nameUrl: string; soundUrl: string }>;
  /** Nikkud audio URLs */
  nikkud: Array<{ id: string; url: string }>;
  /** Combination audio URLs */
  combinations: Array<{ id: string; url: string }>;
  /** Word audio URLs */
  words: Array<{ id: string; url: string }>;
  /** Sentence audio URLs */
  sentences: Array<{ id: string; url: string }>;
  /** UI sound effect URLs */
  effects: Array<{ id: string; url: string }>;
}

/**
 * Build audio manifest from curriculum data
 */
export function buildAudioManifest(data: CurriculumData): AudioManifest {
  return {
    letters: data.letters.map((l) => ({
      id: l.id,
      nameUrl: l.nameAudioUrl,
      soundUrl: l.soundAudioUrl,
    })),
    nikkud: data.nikkud.map((n) => ({
      id: n.id,
      url: n.audioUrl,
    })),
    combinations: data.combinations.map((c) => ({
      id: c.id,
      url: c.audioUrl,
    })),
    words: data.words.map((w) => ({
      id: w.id,
      url: w.audioUrl,
    })),
    sentences: data.sentences.map((s) => ({
      id: s.id,
      url: s.audioUrl,
    })),
    effects: [
      { id: 'correct', url: '/audio/effects/correct.mp3' },
      { id: 'try-again', url: '/audio/effects/try-again.mp3' },
      { id: 'tap', url: '/audio/effects/tap.mp3' },
      { id: 'celebrate', url: '/audio/effects/celebrate.mp3' },
      { id: 'unlock', url: '/audio/effects/unlock.mp3' },
    ],
  };
}
