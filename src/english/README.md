# English path (`src/english`)

Reading and spelling with Latin letters, in nine stages, on Book 2's engine. It is the English *course*: the engine
(`src/duel2`) plays it through the course seam ([ADR 0008](../../docs/adr/0008-one-engine-two-courses.md),
`src/duel2/course/types.ts`). Terms: [GLOSSARY.md](../../GLOSSARY.md) (course, sound unit, heart word, nonsense word,
placement walk, spell book, blend). Design: `docs/superpowers/specs/2026-11-16-english-path-design.md`; plan:
`docs/superpowers/plans/` (newest English one).

The page is `duel2/index.html?course=en`. Only `src/duel2/Duel2App.tsx` and the home's stations import this folder, and
only lazily (`loadCourse`), so the Hebrew page never loads it.

## Where things are

| Concern | Module |
| --- | --- |
| The course: everything the engine reads, in one object | `course.ts` (`Course`); `audio.ts`, `telemetry.ts` are its kits |
| Sound units, words, heart words, nonsense words, door phrases, ladder chains, the placement's rounds | `content/` (`units.ts`, `words.ts`, `phrases.ts`, `chains.ts`, `placementRounds.ts`, `sets.ts`; `voiceIds.ts` names every voice clip) |
| Which stages have their content | `content/ready.ts` (`contentStages`), `readyStages.ts` (`READY_STAGES`, `englishStageRule`) |
| Pure rules: stages and the pass, the placement walk, the pick of an item, the intro, the blend, the tower's rounds, drawing and spelling | `logic/*.ts`; each screen's rounds in `logic/rounds/` |
| The Latin letters' strokes on four lines (the drawing board and the written spell book) | `data/strokes.ts`; the shared row rules are in `src/duel2/policies/latinRow.ts` |
| Line texts | `data/lines.ts` |
| The save (`alef-english`, made by Book 2's store factory) | `store.ts`, `saveFormat.ts`, `savePort.ts` |
| Telemetry (`alef-english-telemetry`) | `telemetryLog.ts`; the word of an answer is saved with the run's ids (`onRunEnd`) |
| Voice files and pictures | `assets/audioFiles.ts` (`assets/audio/voice/<id>.mp3`), `assets/images.ts` (`wordPicture`), `assets/img/` (recoloured art), `assets/towerArt.ts` (the green tower) |
| A station link from home (`?course=en&station=`) and the home's rows | `station.ts`; `src/components/home/englishStations.ts`; `doorsPlayable.ts` (doors wait for a word's picture) |
| The parent's part (the section, units and words, the stage, settings, the off-screen check) | `parent/` |
| Measuring text at real size (glyph fit) | `measure.ts` |

## The production gate

English is open on staging, in the dev server and in tests (`available.ts`: `ENGLISH_AVAILABLE`). On production the
home has no English card, `?course=en` opens Hebrew, and the parent area has no English section, until it is released.

To release (two edits on `main`, then the ordinary release):
1. The parent reviews every asset of the stages. Put each reviewed stage in `REVIEWED_STAGES` (`content/ready.ts`).
2. When all nine are in it, set `ENGLISH_RELEASED = true` (`available.ts`). `release.test.tsx` fails if the two do not agree.
3. Check on staging, with `/verify` (`englishFit` too), then fast-forward `release` ([CLAUDE.md](../../CLAUDE.md), *Deployment*).

A stage is *ready* in the staging and production builds only when its voice clips exist (`content/ready.ts`: strict);
dev, tests and the verify build open every stage that has words.

## Tests

- Each screen has a run test at the top of this folder (`broomRun`, `ghostsRun`, `cauldronRun`, `ladderRun`, `doorsRun`,
  `drawRun`, `spellRun`, `placementRun`, `hintRun`, `towerBoard`, `towerHint`). They build the English course and the
  engine's `RunController` with the helpers of `src/duel2/useRun.test.tsx`; reuse them.
- `noText.test.tsx` is the no-text scan: Latin letters only as learning content, no Hebrew on the English path.
  `layout.test.ts` checks the fit of glyphs in their orbs and boxes at stage-unit sizes. `content/*.test.ts` check the word
  lists (no look-alike of a heart word, units of a stage, readiness).
- For the fit at real scale, use `/verify`'s `englishFit` check (the staging verify build, 740×360 and 1024×768).
- A rule that needs no timing goes to a `logic/` test. The global test timeout is 20 s (`vite.config.ts`).

## Known friction

- **No voice files yet.** `assets/audio/voice/` is empty. A missing clip plays nothing and the flow goes on, but a
  strict build (staging, production) opens no stage until a stage's clips exist (the stage list falls back to stage 1).
  Dev, tests and the verify build open all stages. The spoken lines have no English take timings, so glow cues on
  `howLine` are not synchronised.
- **No word pictures yet.** The game looks for `pw-<word>.webp` in `assets/img/` (`wordPicture` in `assets/images.ts`;
  a `word-<word>` file also works). The doors are skipped at stage 1 until a stage-1 door word has its picture, and a
  picture round with no file falls back to a name round.
- **Stroke and line review still to do.** The parent has not reviewed the Latin strokes (`#/strokes` in test builds) or
  the written lines. Some calls wait for the parent: `x` is asked as the last letter of words that end in it (`fox`,
  `box`), a silent `e` in a spell word is a faint tail, and `cating` is a written wrong choice (the alternative is `catting`).
- **The parent's word and heart-word review.** The word lists, the heart-word spread (`I` in stage 4), the nonsense
  words and the boss families (look-alike letters, short vowels, digraphs, one-unit-apart words) are the builder's calls.
  The hint method (`lightsOnNormalWord`) is provisional and can be swapped.
- **The purple `StationCover`.** `src/duel2/screens/StationCover.tsx` shows the Hebrew path's purple station art on an
  English link. The `/verify` home check should run with the two paths.
- **Art in code and a few placeholders.** The spell station's picture on home is an SVG placeholder, and the spell
  book's `s-book` art is missing.
- **The staging home shows its English part after the English chunk loads**, so the page below it moves once.
- **Slow tests.** The `englishFit` check is slow and depends on chance (the wave that comes). Some of the English
  `logic/` modules keep a private `shuffle` copy; they can share one.
- **Engine limits shared with Hebrew.** `controller.ts` is long (see `src/duel2/README.md`). A stat from the lifetime
  rate counts a *helped* answer as right, while the stage pass counts it as wrong; a parent statistic must not read it as a miss.
