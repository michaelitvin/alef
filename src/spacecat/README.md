# Space Cat (`src/spacecat`)

A flying sums game: the cat's ship flies over four lanes of planets, and he steers it to the planet with the right
number. Adapted by permission from *Space Cat Math* by Igor (Ray's dad). Terms: [GLOSSARY.md](../../GLOSSARY.md).
Spec: `docs/superpowers/specs/2026-11-12-space-cat-design.md`. Origin record and credit:
[asset-sources/spacecat/README.md](../../asset-sources/spacecat/README.md).

## Where things are

| Concern | Module |
| --- | --- |
| The play flow: each sum, the demo, the zoom tip, the missing-number line, pause, the run's save and telemetry | `controller.ts` (`PlayController`, framework-free; every wait through a `Sleeper`) |
| React's view of the play flow | `usePlay.ts` (a thin bridge: one controller and one canvas engine per mount, `useSyncExternalStore`) |
| Pure rules: facts and rungs, prediction and the next sum, the ladder, wrong answers and lanes, speed, one round's state machine, the run | `logic/*.ts` |
| The content of a round (the plug-in for other kinds of question) | `content.ts` (`makeRound`) |
| The 31 rungs: order, strand, needs, switch and band | `logic/rungs.ts` |
| The wrong planets that a known mistake picks (the misconception of each rung) | `logic/misconceptions.ts` |
| The speed rules, kept per band of difficulty | `logic/fast.ts` |
| The ladder: its state, the frontier, the mix of rounds, practice, placement, play days, the warm-up and the re-check. API: `beginRun`, `chooseRound`, `afterAnswer`, `relevel` | `logic/ladder/` |
| The four intro lines (comparison, jumps, times, divide) and their cue times | `audio/intros.ts` |
| The save (`alef-spacecat`) | `saveFormat.ts` (key, defaults, the light read for the home card and the parent area), `store.ts`, `savePort.ts` (the controller's port; `memorySavePort` for tests) |
| Its telemetry log | `telemetryLog.ts` (`SPACECAT_LOG` and its `rollup`, light), `telemetry.ts` (the instance); analysis: `scripts/spacecat/analyse.ts` |
| The canvas: game loop, planet renderer, drawing, particles, input, the comparison signs as paths, the equal-groups pods | `canvas/` (`engine.ts`, `planet.ts`, `draw.ts`, `effects.ts`, `input.ts`, `signs.ts`, `pods.ts`) |
| Screens: cover, play, level done, end, pause cover | `screens/` |
| Its part in the shared parent area | `parent/` (`index.ts` light; `Settings.tsx`, `reset.ts` lazy) |
| Voice on the shared kit, the coded effects and the tune behind the player port, the line table | `audio/` (`spaceCatAudio.ts`, `coded.ts`, `synth.ts`, `tune.ts`, `lines.ts`) |
| The root: the shell, the screens' routing | `SpaceCatApp.tsx` (on `useGameShell`, `src/shared/shell/`; no boy or girl question) |
| The layout by the screen's shape (wide on its side, portrait upright) | `layout.ts`; the play geometry `canvas/draw.ts` (`geomFor`) |

## Tests

- `logic/` has plain unit tests. Put a new rule there when it needs no timing.
- The flow is tested on `PlayController` directly (`controller.test.ts`): a fake engine (the test ends each round by
  hand), `memorySavePort`, `instantSleeper()` and the shared fake player (`installFakeAudio()`). `usePlay.test.tsx`
  tests only the bridge.
- The canvas is tested on a recording context (`canvas/testCanvas.ts`) and a manual clock.
- `TEST_HOOKS` (`testHooks.ts`, tests and the verify build only): `window.__scText` holds each distinct string the
  canvas drew (the no-text scan), `window.__scAudio` every line, effect and tune start or stop with its time.
- For an end-to-end check, use the `/verify` skill (`ALEF_VERIFY_ONLY=spacecat,spacecatArea`).

## Known friction

- The coded effects are takes of the kit but not of its voice queue: `quiet()` keeps an effect and a line apart.
- The round content has three kinds (a sum, a comparison, a jump row) behind `makeRound` in `content.ts`.
- The cue times of the four intro lines in `audio/intros.ts` come from the word times of the takes the parent picked (2026-11-20). A new take needs new cue times.
- On a phone held upright the four lanes fill the width, so a planet at the ship's row cannot grow past its lane; it
  starts at 0.6 of that size instead of the original's 0.4. The parent reviews these sizes (2026-11-18).
