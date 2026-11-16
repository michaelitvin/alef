# Book 2 (`src/duel2`)

The run: a fixed cycle of screens with hearts, coins and the merchant. Terms: [GLOSSARY.md](../../GLOSSARY.md).
Specs: `docs/superpowers/specs/2026-10-19-duel-book-2-design.md` (the screens) and `2026-11-11-one-duel-design.md`
(stakes, merchant, the tower, the home path). Later specs (drawing, flight boss, girls) change parts of them.

## Where things are

| Concern | Module |
| --- | --- |
| The whole run's flow (rounds, passes, hearts, merchant, boss, drawing, voice order) | `controller.ts` (`RunController`) |
| React's view of the run | `useRun.ts` (a thin adapter: `useSyncExternalStore` over the controller) |
| Pure rules: stages, mastery, prediction, merchant prices, boss, the drawing recognizer | `logic/*.ts` |
| The save (`alef-duel2`) | `store.ts`; defaults and migrations in `saveFormat.ts` (no side effects, so home can read it) |
| Screens of the run | `components/screens/*.tsx`; app-level screens (cover, play, summary, parent) in `screens/` |
| The tower | `components/screens/Tower.tsx` embeds Book 1, the first duel (`src/hooks/useDuelGame.ts`), see [ADR 0002](../../docs/adr/0002-first-duel-is-book-2s-tower.md) |
| Voice, effects, music | `audio/duel2Audio.ts` (Book 2's files and numbers on the shared kit, `src/shared/gameAudio/`); the line texts in `data/lines.ts` |
| A station link from home (`?station=`) | `station.ts` |

## Tests

- Run tests construct `RunController` directly (`useRun.test.tsx`), on fake timers. They reset the store and play
  through the shared fake player (`installFakeAudio()` from `src/shared/gameAudio/fakePlayer.ts`; `fakeAudio.onVoice`
  sets how long each voice part lasts), then drive the run with the helpers at the top of that file
  (`until`, `drain`, `proceed`). Reuse those helpers. Do not write a new harness.
- `logic/` has plain unit tests. Put a new rule there when it needs no timing.
- `TEST_HOOKS` (`testHooks.ts`) turns on `data-correct` and the debug routes (`#/glyphs`, `#/tower-glyphs` for the
  tower's runes and monsters, `#/summary`, `#/strokes`) in tests and in the verify build only.
- For an end-to-end check, use the `/verify` skill.

## Known friction

- `controller.ts` reads the lessons' save (`useProgressStore`, which also holds the first duel's history) and imports `ZOOM_MS` from a view (`components/screens/Doors`).
