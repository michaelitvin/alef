// Clock telemetry (localStorage 'alef-clock-telemetry', see ./telemetryLog.ts), exported from the parent area. Its cap
// is TELEMETRY_CAPS.clock (a quarter of it in the staging build); past it the oldest events go.
import { createTelemetry } from '../shared/telemetry'
import { CLOCK_LOG } from './telemetryLog'

export const clockTelemetry = createTelemetry(CLOCK_LOG.key, { game: CLOCK_LOG.game, about: CLOCK_LOG.about })
