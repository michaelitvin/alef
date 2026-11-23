// Spell Quest's event log as the parent area lists it (light: no instance here; the instance is ./telemetry.ts).
// The tower's board writes here too, with `via: 'tower'` (ADR 0004).
import type { RollupFact, TelemetryEvent, TelemetryLog } from '../shared/telemetry'
import { SPELLQUEST_LOG_KEY } from '../shared/saveKeys'

export const SPELLQUEST_LOG: TelemetryLog = {
  key: SPELLQUEST_LOG_KEY,
  label: 'Hebrew Spell Quest',
  game: 'spellquest',
  about: {
    game: 'Hebrew Spell Quest (letters and syllables), at /spellquest-he/. Events with via: "tower" come from the tower (its '
      + 'board, src/spellquest/tower/logic/controller.ts); their `visit` is its own visit counter, `run` is Spell Quest\'s run.',
    docs: ['docs/superpowers/specs/2026-10-19-duel-book-2-design.md', 'docs/superpowers/specs/2026-11-07-book2-flight-boss-design.md',
      'docs/superpowers/specs/2026-11-07-book2-drawing-design.md', 'docs/superpowers/specs/2026-10-05-nikkud-wizard-duel-design.md',
      'docs/adr/0004-one-telemetry-log-per-game.md'],
    code: ['src/spellquest/controller.ts', 'src/spellquest/telemetry.ts', 'src/spellquest/store.ts', 'src/spellquest/tower/logic/controller.ts'],
  },
  rollup: spellQuestFacts,
}

/**
 * What an evicted chunk of Spell Quest's log keeps (checked against the call sites in src/spellquest/controller.ts and
 * src/spellquest/tower/logic/controller.ts). An item is `<screen>:<target>`.
 * - `answer` (not the gallery's): right, wrong, near (`result`), the latency (`ms`) and what he tapped (`tapped`).
 * - The tower's answer is Spell Quest's own `answer` with `screen: 'tower'` (no `ms`): it takes its latency (`msShown`), its
 *   near (`twin`) and his pick (`key`) from the tower's last `choice` for the same target (the `choice` names its
 *   `round`; the tower's `round` event names the round's `target`).
 * - `replay` (Spell Quest's, and the tower's by its round), `idle`, `hint` and `explain` count as help on the item.
 */
export function spellQuestFacts(events: TelemetryEvent[]): RollupFact[] {
  return runFacts(events)
}

/** What a game adds to Spell Quest's facts (the English roll-up): its own events, and what an answer's fact becomes. */
export interface FactHooks {
  /** an event of the game's own (not the tower's): its facts, or null to leave it to the shared rules */
  event?: (e: TelemetryEvent) => RollupFact[] | null
  /** the fact the shared rules made of an `answer` (the tower's too): the facts it becomes */
  answer?: (e: TelemetryEvent, fact: RollupFact) => RollupFact[]
}

/** The shared rules of `spellQuestFacts`, with a game's hooks. */
export function runFacts(events: TelemetryEvent[], hooks: FactHooks = {}): RollupFact[] {
  const facts: RollupFact[] = []
  const roundTarget = new Map<unknown, string>()
  let choice: { target: string; key: unknown; twin: boolean; ms: unknown } | null = null
  let screen = '?'
  const str = (x: unknown) => (typeof x === 'string' ? x : x === null || x === undefined ? null : String(x))
  for (const e of events) {
    if (e.gallery === true) continue
    const tower = e.via === 'tower'
    if (!tower && typeof e.screen === 'string') screen = e.screen
    const target = str(e.target)
    if (tower) {
      if (e.e === 'round' && target) roundTarget.set(e.round, target)
      else if (e.e === 'choice') {
        const t = roundTarget.get(e.round)
        choice = t ? { target: t, key: e.key, twin: e.twin === true, ms: e.msShown } : null
      } else if (e.e === 'replay' && roundTarget.has(e.round)) facts.push({ item: `tower:${roundTarget.get(e.round)}`, replay: true, t: e.t })
      continue
    }
    const own = hooks.event?.(e)
    if (own) { facts.push(...own); continue }
    if (e.e === 'answer' && target) {
      if (e.screen === 'tower') {
        const c = choice && choice.target === target ? choice : null
        choice = null
        const ok = e.result === 'right'
        const f: RollupFact = {
          item: `tower:${target}`, ok, near: c?.twin ?? false, t: e.t,
          ...(typeof c?.ms === 'number' ? { ms: c.ms } : {}), ...(!ok && str(c?.key) ? { chosen: str(c!.key)! } : {}),
        }
        facts.push(...(hooks.answer ? hooks.answer(e, f) : [f]))
      } else {
        const ok = e.result === 'right'
        const f: RollupFact = {
          item: `${e.screen}:${target}`, ok, near: e.result === 'near', t: e.t,
          ...(typeof e.ms === 'number' ? { ms: e.ms } : {}), ...(!ok && str(e.tapped) ? { chosen: str(e.tapped)! } : {}),
        }
        facts.push(...(hooks.answer ? hooks.answer(e, f) : [f]))
      }
    } else if (e.e === 'replay' && target) facts.push({ item: `${e.screen ?? screen}:${target}`, replay: true, t: e.t })
    else if ((e.e === 'idle' || e.e === 'hint' || e.e === 'explain') && target) facts.push({ item: `${e.screen ?? screen}:${target}`, hint: true, t: e.t })
  }
  return facts
}
