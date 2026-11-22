// Book 2 telemetry (localStorage 'alef-duel2-telemetry' and its sealed chunks, see ./telemetryLog.ts), exported from the parent area.
// Every game's live logs share one budget (LIVE_BUDGET in src/shared/telemetryBudget.ts); past it the oldest sealed
// chunk of any log goes, folded into its log's roll-up first.
import { createTelemetry } from '../shared/telemetry'
import { BOOK2_LOG } from './telemetryLog'

export const duel2Telemetry = createTelemetry(BOOK2_LOG.key, { game: BOOK2_LOG.game, about: BOOK2_LOG.about })
