# Book 2 (`src/duel2`)

The run: a fixed cycle of screens with hearts, coins and the merchant. Terms: [GLOSSARY.md](../../GLOSSARY.md).
Specs: `docs/superpowers/specs/2026-10-19-duel-book-2-design.md` (the screens) and `2026-11-11-one-duel-design.md`
(stakes, merchant, the tower, the home path). Later specs (drawing, flight boss, girls) change parts of them.

## Where things are

| Concern | Module |
| --- | --- |
| The run's flow: the loop, the screens' rounds, the flight, the tower, the voice order and the time; it does what the policies' steps say | `controller.ts` (`RunController`) |
| React's view of the run | `useRun.ts` (a thin adapter: `useSyncExternalStore` over the controller) |
| Pure rules: stages, mastery, prediction, merchant prices, boss, the drawing recognizer | `logic/*.ts` |
| The save (`alef-duel2`) | `store.ts`; defaults and migrations in `saveFormat.ts` (no side effects, so home can read it) |
| Screens of the run | `components/screens/*.tsx`; app-level screens (cover, play, summary) in `screens/`; its part in the shared parent area in `parent/` |
| The tower | `components/screens/Tower.tsx` embeds Book 1, the first duel (its flow `src/utils/duel/controller.ts`, through `src/hooks/useDuelGame.ts`), see [ADR 0002](../../docs/adr/0002-first-duel-is-book-2s-tower.md) |
| Voice, effects, music | `audio/duel2Audio.ts` (Book 2's files and numbers on the shared kit, `src/shared/gameAudio/`); the line texts in `data/lines.ts` |
| The root: the shell, the screens' routing | `Duel2App.tsx` (on `useGameShell`, `src/shared/shell/`) |
| A station link from home (`?station=`) | `station.ts` |
| The run's pure policies: the merchant's visit, a drawing round, the flight boss, the pass and its hearts (`step(state, event)` returns what the run does; the controller does it), see [ADR 0005](../../docs/adr/0005-run-policies-and-the-sleeper.md) | `policies/*.ts` (a depcruise rule keeps them pure) |
| The run's seams: the saves it reads and writes, the time it waits on | `savePort.ts` (`storeSavePort`; the gallery reads it through `readOnlySavePort`; `memorySavePort` for tests), `src/shared/sleeper.ts` (`realSleeper`, `instantSleeper`) |
| Layout numbers the run and the views share | `layout.ts` (`ZOOM_MS`), `broomLayout.ts` (the flight's geometry), `viewTypes.ts`; the controller imports nothing from `components/` (a depcruise rule) |

## Terms

- **Policy**: a pure rule of the run for one visit (the merchant, a drawing round, the flight boss, the pass):
  `step(state, event)` says what the run does, and the controller does it ([ADR 0005](../../docs/adr/0005-run-policies-and-the-sleeper.md)).
  The time it waits on is the **sleeper** (see `src/shared/README.md`).

## Tests

- Run tests construct `RunController` directly (`useRun.test.tsx`), on fake timers. They reset the store and play
  through the shared fake player (`installFakeAudio()` from `src/shared/gameAudio/fakePlayer.ts`; `fakeAudio.onVoice`
  sets how long each voice part lasts), then drive the run with the helpers at the top of that file
  (`until`, `drain`, `proceed`). Reuse those helpers. Do not write a new harness.
- A test that needs neither the real saves nor fake timers gives the controller `save: memorySavePort(…)` and
  `sleeper: instantSleeper()` (`savePort.test.ts`). The run tests keep the default seams (the real store, the window's
  timers under fake timers).
- `logic/` has plain unit tests. Put a new rule there when it needs no timing.
- `TEST_HOOKS` (`testHooks.ts`) turns on `data-correct` and the debug routes (`#/glyphs`, `#/tower-glyphs` for the
  tower's runes and monsters, `#/summary`, `#/strokes`) in tests and in the verify build only.
- For an end-to-end check, use the `/verify` skill.

## Known friction

- `controller.ts` is still long (about 1700 lines): the merchant, the drawing round, the flight boss and the pass are out
  as pure policies (`policies/`), but the calm screens' rounds (question, answer, mistake, fix, explanation, hint,
  word link), the broom flight's tick, the tower's bridge and the doors are still in it, each with its own fields.
- The run tests in `useRun.test.tsx` are slow (fake timers, the real store). A rule that needs no timing belongs in a
  policy or `logic/` test.
