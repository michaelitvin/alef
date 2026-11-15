# Clock workshop (`src/clock`)

A separate game about reading an analogue clock, played as a workday of customers. Terms: [GLOSSARY.md](../../GLOSSARY.md).
Spec: `docs/superpowers/specs/2026-10-15-clock-workshop-design.md`.

## Where things are

| Concern | Module |
| --- | --- |
| A workday's flow (one async script per round, phases, pause) | `useWorkday.ts` (a hook) |
| Pure rules: times, phrases, levels, grading, round choice | `logic/*.ts` |
| The save (`alef-clock`) | `store.ts` |
| Screens (cover, workshop, bonus, summary, parent) | `screens/` |
| The clock face, the hands, the customer, the captions | `components/` |
| Voice with word-timed captions, effects, music | `audio/clockAudio.ts`; the line texts in `data/lines.ts`, time phrases in `logic/phrases.ts` |

## Tests

- The round flow can be tested only through the screen: `screens/Workshop.test.tsx` renders the workshop, mocks the
  whole `audio/clockAudio` module and reads `[data-phase]`. Copy its mock list when you add an audio function.
- `logic/` has plain unit tests. Put a new rule there when it needs no timing.

## Known friction

- The flow lives in React closures, unlike Book 2's `RunController`.
- The home button goes back to the clock's own cover, not to alef's home.
