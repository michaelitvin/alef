// Duel telemetry (see src/shared/telemetry.ts).
// The log 'alef-duel-telemetry' holds the child's history of the first duel. It is never trimmed or rewritten (owner
// decision, 2026-11-16: an update does not delete the child's history): it is append-only, so past its cap the NEW
// events are dropped and every stored event stays.
import { createTelemetry, telemetryCap } from '../../shared/telemetry'

/** The old cap (≈2 MB of the origin's ~5 MB localStorage in UTF-16), kept so the stored log is never cut. */
export const TELEMETRY_MAX_CHARS = telemetryCap('duel')
const t = createTelemetry('alef-duel-telemetry', {
  game: 'duel',
  maxChars: TELEMETRY_MAX_CHARS,
  appendOnly: true,
  about: {
    game: 'Nikkud Wizard Duel (vowel marks)',
    docs: ['docs/superpowers/specs/2026-10-05-nikkud-wizard-duel-design.md'],
    code: ['src/utils/duel/telemetry.ts', 'src/hooks/useDuelGame.ts'],
  },
})
export const track = t.track
export const flushTelemetry = t.flush
export const setTelemetryRun = t.setRun
export const telemetryCount = t.count
export const exportTelemetry = t.exportJson
export const clearTelemetry = t.clear
