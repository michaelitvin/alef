// English Spell Quest's telemetry (localStorage 'alef-spellquest-en-telemetry' and its sealed chunks, see ./telemetryLog.ts). It
// shares the one live budget of every game's logs (src/shared/telemetryBudget.ts).
import { createTelemetry } from '../../shared/telemetry'
import { ENGLISH_LOG } from './telemetryLog'

export const englishTelemetry = createTelemetry(ENGLISH_LOG.key, { game: ENGLISH_LOG.game, about: ENGLISH_LOG.about })
