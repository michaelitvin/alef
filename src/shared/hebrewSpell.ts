// Where the Hebrew spell book can be reached: staging, the dev server and tests, and production once its voice files
// (`demo-spell`, `q-spell`) and its art (`s-book`) ship. Until then the Hebrew cycle, home path and gallery are those
// of production before the spell book. Releasing = set HEBREW_SPELL_RELEASED to true on main (see src/spellquest/README.md).
import { isStaging } from './stagingStorage'

export const HEBREW_SPELL_RELEASED = false

/** this build: the Hebrew cycle (stage 4 on), the home path and the gallery list the spell book only where it is true */
export const HEBREW_SPELL_AVAILABLE: boolean =
  isStaging || import.meta.env.DEV || import.meta.env.MODE === 'test' || HEBREW_SPELL_RELEASED
