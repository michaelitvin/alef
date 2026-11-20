// Space Cat's telemetry (localStorage 'alef-spacecat-telemetry' and its sealed chunks, see ./telemetryLog.ts), exported
// from the parent area. It has no cap of its own: every game's live logs share one budget (LIVE_BUDGET in
// src/shared/telemetryBudget.ts); past it the oldest sealed chunk of any log goes, folded into its log's roll-up first.
import { createTelemetry } from '../shared/telemetry'
import { SPACECAT_LOG } from './telemetryLog'

export const spaceCatTelemetry = createTelemetry(SPACECAT_LOG.key, { game: SPACECAT_LOG.game, about: SPACECAT_LOG.about })
