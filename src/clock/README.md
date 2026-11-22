# Clock workshop (`src/clock`)

A separate game about reading an analogue clock, played as a workday of customers. Terms: [GLOSSARY.md](../../GLOSSARY.md).
Spec: `docs/superpowers/specs/2026-10-15-clock-workshop-design.md`.

## Where things are

| Concern | Module |
| --- | --- |
| A workday's flow (one async script per round, phases, pause) | `useWorkday.ts` (a hook) |
| Pure rules: times, phrases, levels, grading, round choice | `logic/*.ts` |
| The save (`alef-clock`); its telemetry log | `store.ts`; `telemetry.ts`, `telemetryLog.ts` |
| Screens (cover, workshop, bonus, summary) | `screens/`; its part in the shared parent area in `parent/` |
| The clock face, the hands, the customer, the captions | `components/` |
| The root: the shell and the screens' routing | `ClockApp.tsx` (on `useGameShell`, `src/shared/shell/`) |
| Voice with word-timed captions, effects, music | `audio/clockAudio.ts` (the shared kit, `src/shared/gameAudio`); the line texts in `data/lines.ts`, time phrases in `logic/phrases.ts` |

## Tests

- The round flow can be tested only through the screen: `screens/Workshop.test.tsx` renders the workshop, plays its
  audio through the shared fake player (`installFakeAudio`, `src/shared/gameAudio/fakePlayer.ts`) and reads
  `[data-phase]`.
- `audio/clockAudio.howler.test.ts` pins what reaches Howler (rate, volumes, fades, the duck, the caption words).
- `logic/` has plain unit tests. Put a new rule there when it needs no timing.

## Known friction

- The flow lives in React closures, unlike Spell Quest's `RunController`.
- The home button goes back to the clock's own cover, not to alef's home.
