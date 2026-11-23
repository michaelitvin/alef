// The English path's event log as the parent area lists it (light: no instance here; the instance is ./telemetry.ts).
// The English run is Spell Quest's run on the English course, so its events (and the tower's, `via: 'tower'`) are Spell Quest's
// names with `g: 'spellquest-en'` (ADR 0004: one log per game).
import { SPELLQUEST_EN_LOG_KEY } from '../../shared/saveKeys'
import type { RollupFact, TelemetryEvent, TelemetryLog } from '../../shared/telemetry'
import { runFacts } from '../telemetryLog'

export const ENGLISH_LOG: TelemetryLog = {
  key: SPELLQUEST_EN_LOG_KEY,
  label: 'English path',
  game: 'spellquest-en',
  about: {
    game: 'Spell Quest, the English path (English letters, sounds and words), at /spellquest/?course=en: Spell Quest\'s run on the English '
      + 'course. Events with via: "tower" come from the tower; `run` is the English run.',
    docs: ['docs/superpowers/specs/2026-11-16-english-path-design.md', 'docs/adr/0004-one-telemetry-log-per-game.md'],
    code: ['src/spellquest/english/course.ts', 'src/spellquest/english/telemetry.ts', 'src/spellquest/english/store.ts', 'src/spellquest/controller.ts'],
  },
  rollup: englishFacts,
}

/**
 * What an evicted chunk of the English log keeps: Spell Quest's facts (`runFacts`: the answer, the tower's pairing of choice and
 * answer, replay, idle, hint, explain) with these changes. An item is `<screen>:<target>`.
 * - An answer that names its `word` (the cauldron's missing unit, a ladder's changed part: `target` is the unit) is
 *   keyed by the word, and gives a second fact keyed by the unit, `unit:<screen>:<target>`, with the same result.
 * - `result: 'helped'` (a right answer after the hint blended the word) is help on the item: not right, not wrong.
 * - `placement-answer`: item `placement:<stage>`, right or wrong; with no stage it counts nowhere.
 * - `blend-hint` is no fact: the helped answer after it carries the help.
 */
export function englishFacts(events: TelemetryEvent[]): RollupFact[] {
  return runFacts(events, {
    event: (e) => {
      if (e.e !== 'placement-answer') return null
      return e.stage === undefined || e.stage === null ? [] : [{ item: `placement:${String(e.stage)}`, ok: e.result === 'right', t: e.t }]
    },
    answer: (e, f) => {
      const word = typeof e.word === 'string' ? e.word : null
      const asHelp = (x: RollupFact): RollupFact => (e.result === 'helped' ? { item: x.item, hint: true, ...(x.t !== undefined ? { t: x.t } : {}) } : x)
      if (!word) return [asHelp(f)]
      const screen = f.item.slice(0, f.item.indexOf(':'))
      return [asHelp({ ...f, item: `${screen}:${word}` }), asHelp({ ...f, item: `unit:${f.item}` })]
    },
  })
}
