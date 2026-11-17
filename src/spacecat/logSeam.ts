// Space Cat's telemetry seam. Its log waits for compact telemetry (plan Task 10B): until then the play flow and the
// parent area track into nothing. Task 10B replaces these two with the live log (`spaceCatTelemetry.track` and its
// flush) and passes the instance to the parent area; nothing else changes.
import type { Track } from '../parent/types'

export const track: Track = () => {}
/** writes the log's pending events (before the page leaves) */
export const flushLog = (): void => {}
