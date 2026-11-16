// Book 2 telemetry (localStorage 'alef-duel2-telemetry'), exported from the parent area. Its cap is
// TELEMETRY_CAPS.book2 (a quarter of it in the staging build); past it the oldest events go.
import { createTelemetry } from '../shared/telemetry'
export const duel2Telemetry = createTelemetry('alef-duel2-telemetry', { game: 'book2', about: {
  game: 'Wizard Duel Book 2 (letters and syllables), at /duel2/',
  docs: ['docs/superpowers/specs/2026-10-19-duel-book-2-design.md', 'docs/superpowers/specs/2026-11-07-book2-flight-boss-design.md',
    'docs/superpowers/specs/2026-11-07-book2-drawing-design.md'],
  code: ['src/duel2/controller.ts', 'src/duel2/telemetry.ts', 'src/duel2/store.ts'],
} })
