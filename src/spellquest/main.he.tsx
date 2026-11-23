import '../shared/stagingStorage' // first: staging saves are kept apart before any store loads
import { migrateCheckGate } from '../shared/stagingStorage'

// the page `spellquest-he/` plays the Hebrew course. No store module loads before the gate opens (it opens at once,
// except on `?migrate-check` on staging)
void migrateCheckGate()
  .then(() => import('./boot'))
  .then((m) => m.boot('he'))
  .catch((e: unknown) => console.error('the page did not start:', e))
