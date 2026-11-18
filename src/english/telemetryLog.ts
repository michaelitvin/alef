// The English path's event log as the parent area lists it (light: no instance here; the instance is ./telemetry.ts).
// The English run is Book 2's run on the English course, so its events (and the tower's, `via: 'tower'`) are Book 2's
// names with `g: 'english'` (ADR 0004: one log per game).
import type { TelemetryLog } from '../shared/telemetry'
import { book2Facts } from '../duel2/telemetryLog'

export const ENGLISH_LOG: TelemetryLog = {
  key: 'alef-english-telemetry',
  label: 'English path',
  game: 'english',
  about: {
    game: 'Wizard Duel, the English path (English letters, sounds and words), at /duel2/?course=en: Book 2\'s run on the English '
      + 'course. Events with via: "tower" come from the tower (the first duel\'s board); `run` is the English run.',
    docs: ['docs/superpowers/specs/2026-11-16-english-path-design.md', 'docs/adr/0004-one-telemetry-log-per-game.md'],
    code: ['src/english/course.ts', 'src/english/telemetry.ts', 'src/english/store.ts', 'src/duel2/controller.ts'],
  },
  // Book 2's facts until the English roll-up (its own items) is built: the run's answer, replay and help events are Book 2's
  rollup: book2Facts,
}
