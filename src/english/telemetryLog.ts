// The English path's event log as the parent area lists it (light: no instance here; the instance is ./telemetry.ts).
// The English run is Book 2's run on the English course, so its events (and the tower's, `via: 'tower'`) are Book 2's
// names with `g: 'english'` (ADR 0004: one log per game).
import type { RollupFact, TelemetryEvent, TelemetryLog } from '../shared/telemetry'

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
  rollup: englishFacts,
}

/**
 * What an evicted chunk of the English log keeps (checked against the call sites in src/duel2/controller.ts and
 * src/utils/duel/controller.ts). An item is `<screen>:<word>` when the answer names its word (the cauldron's missing
 * unit, a ladder's changed part: `word` is the word, `target` the unit), else `<screen>:<target>`.
 * - `answer` (not the gallery's): right, wrong, near (`result`), the latency (`ms`) and what he tapped (`tapped`).
 *   `result: 'helped'` (a right answer after the hint blended the word) is help on the item: not right, not wrong.
 * - The tower's answer is the run's `answer` with `screen: 'tower'` (no `ms`): it takes its latency (`msShown`), its near
 *   (`twin`) and his pick (`key`) from the tower's last `choice` for the same target (the `choice` names its `round`; the
 *   tower's `round` event names the round's `target`).
 * - `placement-answer`: item `placement:<stage>`, right or wrong.
 * - `replay` (the run's, and the tower's by its round), `idle`, `hint` and `explain` count as help on the item.
 */
export function englishFacts(events: TelemetryEvent[]): RollupFact[] {
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
    if (e.e === 'placement-answer' && e.stage !== undefined) {
      facts.push({ item: `placement:${String(e.stage)}`, ok: e.result === 'right', t: e.t })
    } else if (e.e === 'answer' && target) {
      const word = str(e.word)
      const item = e.screen === 'tower' ? `tower:${target}` : `${e.screen}:${word ?? target}`
      const c = e.screen === 'tower' && choice && choice.target === target ? choice : null
      if (e.screen === 'tower') choice = null
      if (e.result === 'helped') { facts.push({ item, hint: true, t: e.t }); continue }
      const ok = e.result === 'right'
      const ms = c ? c.ms : e.ms
      const chosen = c ? str(c.key) : str(e.tapped)
      facts.push({
        item, ok, near: c ? c.twin : e.result === 'near', t: e.t,
        ...(typeof ms === 'number' ? { ms } : {}), ...(!ok && chosen ? { chosen } : {}),
      })
    } else if (e.e === 'replay' && target) facts.push({ item: `${e.screen ?? screen}:${target}`, replay: true, t: e.t })
    else if ((e.e === 'idle' || e.e === 'hint' || e.e === 'explain') && target) facts.push({ item: `${e.screen ?? screen}:${target}`, hint: true, t: e.t })
  }
  return facts
}
