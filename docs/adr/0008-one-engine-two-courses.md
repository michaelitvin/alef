# One engine plays both courses, through a course seam

The English path (reading with Latin letters) needs the same screens as Book 2: tower, broom, ghosts, cauldron, ladder,
doors, spell book, drawing, with hearts, coins, the merchant and a stage ladder. The parent wanted one game and one
reward system (the same wish as [ADR 0002](0002-first-duel-is-book-2s-tower.md)). A second app would copy about 1700 lines
of `RunController`, its policies, its saves' format and its tests, and every later fix would be made twice.

So `RunController` and the screens stay one engine, and what differs is a `Course` (`src/duel2/course/types.ts`): its
stages and visit lengths, its content functions (`rounds`), its audio and telemetry, its save, and a few optional
members for what only one course has. Hebrew is `course/hebrew.ts` (today's modules, unchanged); English is built in
`src/english/course.ts`, and `?course=en` loads it lazily, so the Hebrew page never imports it.

## The seam's members that are not content functions

- `tower.content`, `tower.art`, `tower.facts`: the tower is not a new tower. The English course gives the first duel's
  engine its own rounds, art (the green wizard and tower) and the facts an answer counts for. The duel's flow and
  Book 1's tests stay as they are (ADR 0002).
- `placement`: the English placement walk plays in the tower instead of `tower.content` while it is due.
- `writing` (the Latin letters on four lines), `hint` (the blend), `recordOnly` (extra tally features, `w:<word>`),
  `bossKinds` (the flight boss's families), `visitKind`, `introAfter`, `explanation`: unset in Hebrew, so its run is the
  one it was.
- `lineVariations`, `onRunEnd`, `coverSample`, `sheetTexts`: small members the run, the cover and the sheets read.

## Consequences

- The Hebrew run must not change. The Hebrew baselines (`src/duel2/course/__snapshots__`, `src/utils/duel/__snapshots__`)
  pin it; a diff there is a Hebrew regression, not a snapshot to update.
- A new screen or rule is written against the seam. If it needs a course's content, it adds a member (optional when only
  one course has it), never a `course.id === 'en'` test in the engine.
- The English save is its own (`alef-english`), made by Book 2's store factory with its own key, so the two courses
  never share progress. Its telemetry log is its own too (ADR 0004).
- Code both courses use moves to a shared place instead of being copied: the Latin row stepper
  (`src/duel2/policies/latinRow.ts`, for drawing and the written spell book) and the blend's timing
  (`src/shared/blendSchedule.ts`, for the run and the tower's board).
- A seam has a cost: the controller and the screens read the course through `CourseContext`, and a test of a screen
  names its course. Tests of the Hebrew run pass the Hebrew course by default.
