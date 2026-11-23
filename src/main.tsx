import './shared/stagingStorage' // first: staging saves are kept apart before any store loads
import { migrateCheckGate } from './shared/stagingStorage'

// no store module loads before the gate opens (it opens at once, except on `?migrate-check` on staging)
void migrateCheckGate()
  .then(() => import('./boot'))
  .catch((e: unknown) => console.error('the page did not start:', e))
