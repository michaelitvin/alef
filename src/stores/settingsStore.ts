import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * App-level settings (not progress-related)
 */
interface AppSettings {
  /** Whether the welcome/onboarding has been shown */
  hasSeenWelcome: boolean
  /** Preferred color scheme */
  colorScheme: 'light' | 'dark' | 'system'
  /** Last selected level for quick resume */
  lastLevel: 'letters' | 'nikkud' | 'words' | 'sentences' | null
  /** Last selected node for quick resume */
  lastNodeId: string | null
  /** Developer mode (for testing) */
  devMode: boolean
}

interface SettingsActions {
  setHasSeenWelcome: (seen: boolean) => void
  setColorScheme: (scheme: AppSettings['colorScheme']) => void
  setLastLocation: (level: AppSettings['lastLevel'], nodeId: string | null) => void
  toggleDevMode: () => void
  resetSettings: () => void
}

type SettingsStore = AppSettings & SettingsActions

const DEFAULT_SETTINGS: AppSettings = {
  hasSeenWelcome: false,
  colorScheme: 'light',
  lastLevel: null,
  lastNodeId: null,
  devMode: false,
}

/**
 * Settings store with persistence
 */
export const useSettingsStore = create<SettingsStore>()(
  persist(
    (set) => ({
      ...DEFAULT_SETTINGS,

      setHasSeenWelcome: (seen) => {
        set({ hasSeenWelcome: seen })
      },

      setColorScheme: (scheme) => {
        set({ colorScheme: scheme })
      },

      setLastLocation: (level, nodeId) => {
        set({ lastLevel: level, lastNodeId: nodeId })
      },

      toggleDevMode: () => {
        set((state) => ({ devMode: !state.devMode }))
      },

      resetSettings: () => {
        set(DEFAULT_SETTINGS)
      },
    }),
    {
      name: 'alef-settings',
      storage: createJSONStorage(() => localStorage),
    }
  )
)

export default useSettingsStore
