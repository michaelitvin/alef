// Where the English course can be opened: staging, the dev server and tests, and production once it is released.
import { isStaging } from '../../shared/stagingStorage'

export const ENGLISH_RELEASED = false

export const englishAvailable = (env: { staging: boolean; dev: boolean; test: boolean; released: boolean }): boolean =>
  env.staging || env.dev || env.test || env.released

/** this build: `spellquest-en/` opens English and the parent area lists the English section only where it is true */
export const ENGLISH_AVAILABLE = englishAvailable({
  staging: isStaging, dev: import.meta.env.DEV, test: import.meta.env.MODE === 'test', released: ENGLISH_RELEASED,
})
