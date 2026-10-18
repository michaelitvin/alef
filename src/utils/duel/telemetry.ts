// Duel telemetry (see src/shared/telemetry.ts).
import { createTelemetry } from '../../shared/telemetry'
export type { TelemetryEvent } from '../../shared/telemetry'

/** ≈2 MB of the origin's ~5 MB localStorage (UTF-16); the progress save needs far less. */
export const TELEMETRY_MAX_CHARS = 1_000_000
const t = createTelemetry('alef-duel-telemetry', TELEMETRY_MAX_CHARS)
export const track = t.track
export const flushTelemetry = t.flush
export const setTelemetryRun = t.setRun
export const telemetryCount = t.count
export const exportTelemetry = t.exportJson
export const clearTelemetry = t.clear
