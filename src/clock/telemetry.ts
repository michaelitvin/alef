// Clock telemetry (localStorage 'alef-clock-telemetry' and its sealed chunks, see ./telemetryLog.ts), exported from the parent area.
// Every game's live logs share one budget (LIVE_BUDGET in src/shared/telemetryBudget.ts); past it the oldest sealed
// chunk of any log goes, folded into its log's roll-up first.
import { createTelemetry } from '../shared/telemetry'
import { CLOCK_LOG } from './telemetryLog'

export const clockTelemetry = createTelemetry(CLOCK_LOG.key, { game: CLOCK_LOG.game, about: CLOCK_LOG.about })
