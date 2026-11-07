// Clock telemetry (localStorage 'alef-clock-telemetry'), exported from the parent area.
import { createTelemetry } from '../shared/telemetry'
export const clockTelemetry = createTelemetry('alef-clock-telemetry', undefined, {
  game: 'Clock workshop (reading an analogue clock), at /clock/',
  docs: ['docs/superpowers/specs/2026-10-15-clock-workshop-design.md'],
  code: ['src/clock/telemetry.ts'],
})
