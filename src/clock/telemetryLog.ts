// The clock's event log as the parent area lists it (light: no instance here; the instance is ./telemetry.ts).
import type { TelemetryLog } from '../shared/telemetry'

export const CLOCK_LOG: TelemetryLog = {
  key: 'alef-clock-telemetry',
  label: 'Clock workshop',
  game: 'clock',
  about: {
    game: 'Clock workshop (reading an analogue clock), at /clock/',
    docs: ['docs/superpowers/specs/2026-10-15-clock-workshop-design.md'],
    code: ['src/clock/telemetry.ts'],
  },
}
