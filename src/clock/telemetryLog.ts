// The clock's event log as the parent area lists it (light: no instance here; the instance is ./telemetry.ts).
import type { RollupFact, TelemetryEvent, TelemetryLog } from '../shared/telemetry'

export const CLOCK_LOG: TelemetryLog = {
  key: 'alef-clock-telemetry',
  label: 'Clock workshop',
  game: 'clock',
  about: {
    game: 'Clock workshop (reading an analogue clock), at /clock/',
    docs: ['docs/superpowers/specs/2026-10-15-clock-workshop-design.md'],
    code: ['src/clock/telemetry.ts'],
  },
  rollup: clockFacts,
}

const pad2 = (n: number) => String(n).padStart(2, '0')
/** `h-m` with the minutes padded, as the round's `time` (the workshop's `hint` writes them unpadded) */
const timeKey = (x: unknown) => { const [h, m] = String(x).split('-'); return m === undefined ? String(x) : `${h}-${pad2(Number(m))}` }

/**
 * What an evicted chunk of the clock's log keeps (checked against src/clock/useWorkday.ts and screens/Workshop.tsx). An
 * item is `<exercise>:<time>`.
 * - `round`: right (`correct`), near (`forgiven`: an almost-right first answer), the latency (`ms`), what he picked
 *   (the option's time for a choice, the hands for a set clock) and help (`scaffolds`). The real-time round (`real:
 *   true`, the "what time is it now?" of the first workday of a day) is a special result: it counts apart, never as
 *   right or wrong (owner decision, 2026-11-17).
 * - The workshop's `hint` counts as help on its item.
 */
export function clockFacts(events: TelemetryEvent[]): RollupFact[] {
  const facts: RollupFact[] = []
  for (const e of events) {
    if (e.e === 'round') {
      const item = `${e.exercise}:${timeKey(e.time)}`
      const hint = Array.isArray(e.scaffolds) && e.scaffolds.length > 0
      if (e.real === true) { facts.push({ item, special: true, hint, t: e.t }); continue }
      const ok = e.correct === true
      const a = e.answer as { kind?: string; index?: number; pose?: { hour?: number; minute?: number } } | undefined
      const opt = a?.kind === 'choice' && Array.isArray(e.options) ? (e.options[a.index ?? -1] as { t?: unknown; f?: unknown } | undefined) : undefined
      const chosen = opt ? String(opt.t ?? opt.f ?? a!.index)
        : a?.kind === 'set' && a.pose ? `set ${(Math.floor(a.pose.hour ?? 0) % 12) || 12}-${pad2(Math.round(a.pose.minute ?? 0))}` : undefined
      facts.push({ item, ok, near: e.forgiven === true, hint, t: e.t, ...(typeof e.ms === 'number' ? { ms: e.ms } : {}), ...(!ok && chosen ? { chosen } : {}) })
    } else if (e.e === 'hint') facts.push({ item: `${e.exercise}:${timeKey(e.time)}`, hint: true, t: e.t })
  }
  return facts
}
