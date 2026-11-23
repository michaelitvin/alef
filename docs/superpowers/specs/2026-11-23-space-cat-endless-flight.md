# Space Cat: one endless flight (2026-11-23)

The parent: "the game stops between levels, hearts refill and sometimes there's a new spaceship. Instead, make it
infinite: just add a heart and/or declare a ship (and change the assignment if relevant)."

## What changes

- **No *level done* screen.** After the 7th right answer of a level the flight goes on. The run ends only when the
  hearts run out (the end screen stays as it is).
- **A level's end in flight** (a short beat between two sums, about 1.5 s plus the ship's line; the planets of the next
  sum do not start before it ends):
  1. The level fanfare (`level`, the existing coded effect), and a gold flash on the canvas.
  2. The progress dots start again at 0.
  3. **One heart back**, if he has fewer than 3 (the cap stays 3: the top bar has three heart places). The heart in the
     top bar fills with a short pop animation and a new coded effect `heart-up` (a rising chime, not the break sound).
     With 3 hearts nothing is added and nothing plays for hearts.
  4. **A new ship** (level 4 and level 7 of a run, the first time, as now): the `ship` effect, then the existing voice
     line `new-ship` ("חללית חדשה"), and the ship on the canvas changes to the new ship in its lane with a sparkle.
     *My call on "change the assignment":* the new ship becomes his chosen ship (the save's `ship`), so the next run
     and the cover start with it. He can still choose another ship on the cover's shelf.
     *One-time save fix:* until now he flew ship 1 although he had unlocked more. A save of an older version (save
     version 3 in `migrate.ts`, `flyHighestShip`) gets `ship` = the highest ship in `ships`, once; his shelf choice
     after that is respected.
  5. Then the next sum, as after any right answer.
- Pause during the beat: the beat is cut, and the triangle goes on to the next sum (the heart and the ship are already
  given when the beat starts, so a pause loses nothing).

## Things that go away

- `screens/LevelDone.tsx`, its routing in `SpaceCatApp.tsx`, `onLevelDone`/`nextLevel()` on the controller and the
  bridge, and their tests.
- The voice line `level-done` ("...הלבבות מלאים שוב") is no longer said: it says the hearts are full again, which is not
  true now. It leaves the line table; its takes stay in `asset-sources/` as history.
- The line `info-hearts` played only on *level done*, and its words ("when a level ends, they fill again") are now
  wrong. It leaves the line table too. *Offer, not built:* a new hearts line on the end screen.

## Telemetry

`level-done` and `ship` events stay, with the same fields. `level-done` gets `heart: true` when a heart was added.

## Tasks

One task (controller, canvas beat, the effect, the removals, tests); then QA with `/verify` at a phone and a tablet.
