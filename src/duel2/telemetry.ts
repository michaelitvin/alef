// Book 2 telemetry (localStorage 'alef-duel2-telemetry', see ./telemetryLog.ts), exported from the parent area. Its cap
// is TELEMETRY_CAPS.book2 (a quarter of it in the staging build); past it the oldest events go.
import { createTelemetry } from '../shared/telemetry'
import { BOOK2_LOG } from './telemetryLog'

export const duel2Telemetry = createTelemetry(BOOK2_LOG.key, { game: BOOK2_LOG.game, about: BOOK2_LOG.about })
