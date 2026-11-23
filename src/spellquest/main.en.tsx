import '../shared/stagingStorage' // first: staging saves are kept apart before any store loads
import { migrateCheckGate } from '../shared/stagingStorage'
import { ENGLISH_AVAILABLE, hebrewPageUrl } from './english/available'

// the page `spellquest-en/` plays the English course. Where English is not open (production), it must not play the Hebrew
// game under the English name: it goes to `spellquest-he/` before the app boots. No store module loads before the gate
// opens (it opens at once, except on `?migrate-check` on staging)
if (!ENGLISH_AVAILABLE) {
  location.replace(hebrewPageUrl(location))
} else {
  void migrateCheckGate()
    .then(() => import('./boot'))
    .then((m) => m.boot('en'))
    .catch((e: unknown) => console.error('the page did not start:', e))
}
