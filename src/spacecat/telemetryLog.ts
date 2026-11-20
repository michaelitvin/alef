// Space Cat's event log as the parent area lists it (light: no instance here; the instance is ./telemetry.ts). Its part in
// the parent area (parent/index.ts) declares it; src/parent/registry.ts registers it with core on every game page.
import type { RollupFact, TelemetryEvent, TelemetryLog } from '../shared/telemetry'

export const SPACECAT_LOG: TelemetryLog = {
  key: 'alef-spacecat-telemetry',
  label: 'Space Cat',
  game: 'spacecat',
  about: {
    game: 'Space Cat (flying sums)',
    docs: ['docs/superpowers/specs/2026-11-12-space-cat-design.md'],
    code: ['src/spacecat/telemetry.ts', 'src/spacecat/controller.ts'],
  },
  rollup: spaceCatFacts,
}

/**
 * What an evicted chunk of Space Cat's log keeps (checked against src/spacecat/controller.ts): one fact per `round`. The
 * item is the item id (`3+4=7/c`); right is `result: 'right'`; the latency is `endMs`; what he chose is the number he
 * ended on, or `'timeout'`. A demo round (the hand showed the answer) and a round cut by a pause are special: counted
 * apart, never as right or wrong, as they count in no tally.
 */
export function spaceCatFacts(events: TelemetryEvent[]): RollupFact[] {
  const facts: RollupFact[] = []
  for (const e of events) {
    if (e.e !== 'round' || typeof e.item !== 'string') continue
    if (e.demo === true || e.cut === true) { facts.push({ item: e.item, special: true, t: e.t }); continue }
    const ok = e.result === 'right'
    const chosen = e.result === 'timeout' ? 'timeout' : typeof e.number === 'number' || typeof e.number === 'string' ? String(e.number) : undefined
    facts.push({ item: e.item, ok, t: e.t, ...(typeof e.endMs === 'number' ? { ms: e.endMs } : {}), ...(!ok && chosen ? { chosen } : {}) })
  }
  return facts
}
