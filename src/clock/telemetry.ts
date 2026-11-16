// Clock telemetry (localStorage 'alef-clock-telemetry'), exported from the parent area. Its cap is
// TELEMETRY_CAPS.clock (a quarter of it in the staging build); past it the oldest events go.
import { createTelemetry } from '../shared/telemetry'
export const clockTelemetry = createTelemetry('alef-clock-telemetry', { game: 'clock', about: {
  game: 'Clock workshop (reading an analogue clock), at /clock/',
  docs: ['docs/superpowers/specs/2026-10-15-clock-workshop-design.md'],
  code: ['src/clock/telemetry.ts'],
} })
