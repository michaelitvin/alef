// Book 2's event log as the parent area lists it (light: no instance here; the instance is ./telemetry.ts).
// The tower (the first duel's board) writes here too, with `via: 'tower'` (ADR 0004).
import type { TelemetryLog } from '../shared/telemetry'

export const BOOK2_LOG: TelemetryLog = {
  key: 'alef-duel2-telemetry',
  label: 'Book 2',
  game: 'book2',
  about: {
    game: 'Wizard Duel Book 2 (letters and syllables), at /duel2/. Events with via: "tower" come from the tower (the first '
      + 'duel\'s board, src/utils/duel/controller.ts); their `visit` is its own visit counter, `run` is Book 2\'s run.',
    docs: ['docs/superpowers/specs/2026-10-19-duel-book-2-design.md', 'docs/superpowers/specs/2026-11-07-book2-flight-boss-design.md',
      'docs/superpowers/specs/2026-11-07-book2-drawing-design.md', 'docs/superpowers/specs/2026-10-05-nikkud-wizard-duel-design.md',
      'docs/adr/0004-one-telemetry-log-per-game.md'],
    code: ['src/duel2/controller.ts', 'src/duel2/telemetry.ts', 'src/duel2/store.ts', 'src/utils/duel/controller.ts'],
  },
}
