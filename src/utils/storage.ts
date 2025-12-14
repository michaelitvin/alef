// LocalStorage utility functions for progress persistence

const STORAGE_KEY = 'alef-progress'
const STORAGE_VERSION = 1

/**
 * Check if localStorage is available
 */
export function isStorageAvailable(): boolean {
  try {
    const test = '__storage_test__'
    localStorage.setItem(test, test)
    localStorage.removeItem(test)
    return true
  } catch {
    return false
  }
}

/**
 * Save data to localStorage
 */
export function saveToStorage<T>(key: string, data: T): boolean {
  if (!isStorageAvailable()) {
    console.warn('LocalStorage not available')
    return false
  }

  try {
    const serialized = JSON.stringify(data)
    localStorage.setItem(key, serialized)
    return true
  } catch (error) {
    console.error('Failed to save to localStorage:', error)
    return false
  }
}

/**
 * Load data from localStorage
 */
export function loadFromStorage<T>(key: string): T | null {
  if (!isStorageAvailable()) {
    console.warn('LocalStorage not available')
    return null
  }

  try {
    const serialized = localStorage.getItem(key)
    if (serialized === null) {
      return null
    }
    return JSON.parse(serialized) as T
  } catch (error) {
    console.error('Failed to load from localStorage:', error)
    return null
  }
}

/**
 * Remove data from localStorage
 */
export function removeFromStorage(key: string): boolean {
  if (!isStorageAvailable()) {
    return false
  }

  try {
    localStorage.removeItem(key)
    return true
  } catch {
    return false
  }
}

/**
 * Clear all app data from localStorage
 */
export function clearAllStorage(): boolean {
  if (!isStorageAvailable()) {
    return false
  }

  try {
    localStorage.removeItem(STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

/**
 * Save progress state
 */
export function saveProgress<T extends { version: number; lastSavedAt: number }>(
  progress: T
): boolean {
  const dataToSave = {
    ...progress,
    version: STORAGE_VERSION,
    lastSavedAt: Date.now(),
  }
  return saveToStorage(STORAGE_KEY, dataToSave)
}

/**
 * Load progress state
 */
export function loadProgress<T>(): T | null {
  const data = loadFromStorage<T & { version?: number }>(STORAGE_KEY)

  if (!data) {
    return null
  }

  // Handle version migrations if needed
  if (data.version !== STORAGE_VERSION) {
    console.log(`Migrating progress from version ${data.version} to ${STORAGE_VERSION}`)
    // Add migration logic here when needed
  }

  return data
}

/**
 * Get storage size in bytes
 */
export function getStorageSize(): number {
  if (!isStorageAvailable()) {
    return 0
  }

  let total = 0
  for (const key in localStorage) {
    if (Object.prototype.hasOwnProperty.call(localStorage, key)) {
      total += (localStorage[key].length + key.length) * 2 // UTF-16 encoding
    }
  }
  return total
}

/**
 * Auto-save debounced (saves at most once per interval)
 */
export function createAutoSaver<T extends { version: number; lastSavedAt: number }>(
  intervalMs: number = 5000
) {
  let timeout: ReturnType<typeof setTimeout> | null = null
  let pendingData: T | null = null

  return {
    scheduleeSave(data: T) {
      pendingData = data

      if (!timeout) {
        timeout = setTimeout(() => {
          if (pendingData) {
            saveProgress(pendingData)
            pendingData = null
          }
          timeout = null
        }, intervalMs)
      }
    },

    saveNow(data: T) {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      saveProgress(data)
      pendingData = null
    },

    cancel() {
      if (timeout) {
        clearTimeout(timeout)
        timeout = null
      }
      pendingData = null
    },
  }
}
