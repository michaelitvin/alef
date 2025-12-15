import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type {
  ProgressState,
  NodeProgress,
  LevelProgress,
  Reward,
  RewardType,
  ActivityAttempt,
  CurrentSession,
} from '../types/progress'
import {
  INITIAL_PROGRESS_STATE,
  LEVEL_UNLOCK_THRESHOLDS,
} from '../types/progress'

/**
 * Actions for the progress store
 */
interface ProgressActions {
  // Node progress
  initializeNode: (nodeId: string, level: 'letters' | 'nikkud' | 'syllables' | 'words' | 'sentences') => void
  recordAttempt: (nodeId: string, attempt: ActivityAttempt) => void
  setNodeState: (nodeId: string, state: NodeProgress['state']) => void

  // Level progress
  updateLevelProgress: (levelId: string) => void
  checkLevelUnlock: () => void

  // Rewards
  addReward: (type: RewardType, contentId?: string) => void
  markRewardSeen: (index: number) => void
  getUnseenRewards: () => Reward[]

  // Session
  startSession: () => void
  endSession: () => void
  updateCurrentActivity: (levelId?: string, nodeId?: string, activityId?: string) => void
  incrementStreak: () => void
  resetStreak: () => void

  // Stats
  addToVocabulary: (wordId: string) => void

  // Settings
  setSoundEffects: (enabled: boolean) => void
  setBackgroundMusic: (enabled: boolean) => void
  setVolume: (volume: number) => void
  setDevMode: (enabled: boolean) => void

  // Utility
  resetProgress: () => void
  getNodeProgress: (nodeId: string) => NodeProgress | undefined
  getLevelProgress: (levelId: string) => LevelProgress | undefined
  isLevelUnlocked: (levelId: string) => boolean
  getNextAvailableNode: (levelId: string) => string | null
}

type ProgressStore = ProgressState & ProgressActions

/**
 * Progress store with persistence
 */
export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_PROGRESS_STATE,

      // Initialize a node when first accessed
      initializeNode: (nodeId, _level) => {
        const existing = get().nodes[nodeId]
        if (existing) return

        set((state) => ({
          nodes: {
            ...state.nodes,
            [nodeId]: {
              nodeId,
              state: 'available',
              attempts: [],
              successRate: 0,
              timeSpentMs: 0,
              firstAccessedAt: Date.now(),
              lastAccessedAt: Date.now(),
              completionCount: 0,
            },
          },
        }))
      },

      // Record an attempt at an activity item
      recordAttempt: (nodeId, attempt) => {
        set((state) => {
          const node = state.nodes[nodeId]
          if (!node) return state

          const attempts = [...node.attempts, attempt]
          const correctCount = attempts.filter((a) => a.correct).length
          const successRate = attempts.length > 0 ? correctCount / attempts.length : 0

          // Update stats
          const newStats = { ...state.stats }
          newStats.totalAttempts++
          if (attempt.correct) {
            newStats.totalCorrect++
            newStats.currentStreak++
            if (newStats.currentStreak > newStats.bestStreak) {
              newStats.bestStreak = newStats.currentStreak
            }
          } else {
            newStats.currentStreak = 0
          }
          newStats.accuracy = newStats.totalAttempts > 0
            ? newStats.totalCorrect / newStats.totalAttempts
            : 0

          return {
            nodes: {
              ...state.nodes,
              [nodeId]: {
                ...node,
                attempts,
                successRate,
                lastAccessedAt: Date.now(),
                state: successRate >= 0.8 ? 'mastered' : 'in_progress',
              },
            },
            stats: newStats,
          }
        })
      },

      // Set node state directly
      setNodeState: (nodeId, newState) => {
        set((state) => {
          const node = state.nodes[nodeId]
          if (!node) return state

          return {
            nodes: {
              ...state.nodes,
              [nodeId]: {
                ...node,
                state: newState,
              },
            },
          }
        })
      },

      // Update aggregate level progress
      updateLevelProgress: (levelId) => {
        set((state) => {
          const nodeIds = Object.keys(state.nodes).filter(
            (id) => id.startsWith(`${levelId}-`)
          )

          if (nodeIds.length === 0) return state

          const nodes = nodeIds.map((id) => state.nodes[id])
          const masteredCount = nodes.filter((n) => n.state === 'mastered').length
          const totalSuccess = nodes.reduce((sum, n) => sum + n.successRate, 0)
          const avgSuccess = totalSuccess / nodes.length
          const totalTime = nodes.reduce((sum, n) => sum + n.timeSpentMs, 0)

          return {
            levels: {
              ...state.levels,
              [levelId]: {
                ...state.levels[levelId],
                successRate: avgSuccess,
                nodesMastered: masteredCount,
                timeSpentMs: totalTime,
              },
            },
          }
        })
      },

      // Check if any levels should be unlocked
      checkLevelUnlock: () => {
        set((state) => {
          const newLevels = { ...state.levels }
          const newRewards: Reward[] = []

          // Check nikkud unlock
          if (!newLevels.nikkud.unlocked) {
            if (newLevels.letters.successRate >= LEVEL_UNLOCK_THRESHOLDS.nikkud) {
              newLevels.nikkud = {
                ...newLevels.nikkud,
                unlocked: true,
                unlockedAt: Date.now(),
              }
              newRewards.push({
                type: 'level_unlocked',
                earnedAt: Date.now(),
                contentId: 'nikkud',
                seen: false,
              })
            }
          }

          // Check syllables unlock
          if (!newLevels.syllables.unlocked) {
            if (newLevels.nikkud.successRate >= LEVEL_UNLOCK_THRESHOLDS.syllables) {
              newLevels.syllables = {
                ...newLevels.syllables,
                unlocked: true,
                unlockedAt: Date.now(),
              }
              newRewards.push({
                type: 'level_unlocked',
                earnedAt: Date.now(),
                contentId: 'syllables',
                seen: false,
              })
            }
          }

          // Check words unlock
          if (!newLevels.words.unlocked) {
            if (newLevels.syllables.successRate >= LEVEL_UNLOCK_THRESHOLDS.words) {
              newLevels.words = {
                ...newLevels.words,
                unlocked: true,
                unlockedAt: Date.now(),
              }
              newRewards.push({
                type: 'level_unlocked',
                earnedAt: Date.now(),
                contentId: 'words',
                seen: false,
              })
            }
          }

          // Check sentences unlock
          if (!newLevels.sentences.unlocked) {
            if (newLevels.words.successRate >= LEVEL_UNLOCK_THRESHOLDS.sentences) {
              newLevels.sentences = {
                ...newLevels.sentences,
                unlocked: true,
                unlockedAt: Date.now(),
              }
              newRewards.push({
                type: 'level_unlocked',
                earnedAt: Date.now(),
                contentId: 'sentences',
                seen: false,
              })
            }
          }

          if (newRewards.length === 0) return state

          return {
            levels: newLevels,
            rewards: [...state.rewards, ...newRewards],
          }
        })
      },

      // Add a reward
      addReward: (type, contentId) => {
        set((state) => ({
          rewards: [
            ...state.rewards,
            {
              type,
              earnedAt: Date.now(),
              contentId,
              seen: false,
            },
          ],
        }))
      },

      // Mark a reward as seen
      markRewardSeen: (index) => {
        set((state) => {
          const newRewards = [...state.rewards]
          if (newRewards[index]) {
            newRewards[index] = { ...newRewards[index], seen: true }
          }
          return { rewards: newRewards }
        })
      },

      // Get unseen rewards
      getUnseenRewards: () => {
        return get().rewards.filter((r) => !r.seen)
      },

      // Start a new session
      startSession: () => {
        const now = Date.now()
        const stats = get().stats

        // Check if this is a new day
        const lastDate = stats.lastSessionAt
          ? new Date(stats.lastSessionAt).toDateString()
          : null
        const todayDate = new Date(now).toDateString()
        const isNewDay = lastDate !== todayDate

        set((state) => ({
          currentSession: {
            startedAt: now,
            sessionStreak: 0,
            sessionAttempts: 0,
            sessionCorrect: 0,
          },
          stats: {
            ...state.stats,
            sessionCount: state.stats.sessionCount + 1,
            lastSessionAt: now,
            firstSessionAt: state.stats.firstSessionAt || now,
            daysPlayed: isNewDay ? state.stats.daysPlayed + 1 : state.stats.daysPlayed,
          },
        }))

        // Add rewards for first session or daily return
        if (!stats.firstSessionAt) {
          get().addReward('first_session')
        } else if (isNewDay) {
          get().addReward('daily_return')
        }
      },

      // End the current session
      endSession: () => {
        set((state) => {
          if (!state.currentSession) return state

          const sessionDuration = Date.now() - state.currentSession.startedAt

          return {
            currentSession: undefined,
            stats: {
              ...state.stats,
              totalTimeMs: state.stats.totalTimeMs + sessionDuration,
            },
          }
        })
      },

      // Update current activity location
      updateCurrentActivity: (levelId, nodeId, activityId) => {
        set((state) => {
          if (!state.currentSession) return state

          return {
            currentSession: {
              ...state.currentSession,
              currentLevel: levelId as CurrentSession['currentLevel'],
              currentNodeId: nodeId,
              currentActivityId: activityId,
            },
          }
        })
      },

      // Increment streak
      incrementStreak: () => {
        set((state) => {
          const newStreak = state.stats.currentStreak + 1
          const rewards: Reward[] = []

          // Check for streak rewards
          if (newStreak === 3) {
            rewards.push({ type: 'streak_3', earnedAt: Date.now(), seen: false })
          } else if (newStreak === 5) {
            rewards.push({ type: 'streak_5', earnedAt: Date.now(), seen: false })
          } else if (newStreak === 10) {
            rewards.push({ type: 'streak_10', earnedAt: Date.now(), seen: false })
          }

          return {
            stats: {
              ...state.stats,
              currentStreak: newStreak,
              bestStreak: Math.max(newStreak, state.stats.bestStreak),
            },
            rewards: [...state.rewards, ...rewards],
          }
        })
      },

      // Reset streak
      resetStreak: () => {
        set((state) => ({
          stats: {
            ...state.stats,
            currentStreak: 0,
          },
        }))
      },

      // Add word to vocabulary
      addToVocabulary: (wordId) => {
        set((state) => {
          if (state.vocabulary.includes(wordId)) return state

          return {
            vocabulary: [...state.vocabulary, wordId],
            stats: {
              ...state.stats,
              wordsLearned: state.stats.wordsLearned + 1,
            },
          }
        })
      },

      // Settings
      setSoundEffects: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, soundEffects: enabled },
        }))
      },

      setBackgroundMusic: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, backgroundMusic: enabled },
        }))
      },

      setVolume: (volume) => {
        set((state) => ({
          settings: { ...state.settings, volume: Math.max(0, Math.min(1, volume)) },
        }))
      },

      setDevMode: (enabled) => {
        set((state) => ({
          settings: { ...state.settings, devMode: enabled },
        }))
      },

      // Reset all progress
      resetProgress: () => {
        set({
          ...INITIAL_PROGRESS_STATE,
          lastSavedAt: Date.now(),
        })
      },

      // Utility getters
      getNodeProgress: (nodeId) => {
        return get().nodes[nodeId]
      },

      getLevelProgress: (levelId) => {
        return get().levels[levelId]
      },

      isLevelUnlocked: (levelId) => {
        // Dev mode bypasses all unlock requirements
        if (get().settings.devMode) return true
        const level = get().levels[levelId]
        return level?.unlocked ?? false
      },

      getNextAvailableNode: (levelId) => {
        const nodes = get().nodes
        const levelNodes = Object.entries(nodes)
          .filter(([id]) => id.startsWith(`${levelId}-`))
          .sort(([, a], [, b]) => {
            // Sort by state priority then by nodeId
            const stateOrder = { locked: 3, mastered: 2, in_progress: 0, available: 1 }
            return stateOrder[a.state] - stateOrder[b.state]
          })

        const inProgress = levelNodes.find(([, n]) => n.state === 'in_progress')
        if (inProgress) return inProgress[0]

        const available = levelNodes.find(([, n]) => n.state === 'available')
        if (available) return available[0]

        return null
      },
    }),
    {
      name: 'alef-progress',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        // Only persist these fields
        version: state.version,
        lastSavedAt: state.lastSavedAt,
        nodes: state.nodes,
        levels: state.levels,
        rewards: state.rewards,
        stats: state.stats,
        settings: state.settings,
        gameCompleted: state.gameCompleted,
        vocabulary: state.vocabulary,
      }),
    }
  )
)

export default useProgressStore
