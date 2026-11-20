# The English path — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A second path in Book 2's app, English phonics in nine stages, played through the same run, screens, stakes,
merchant and rewards as the Hebrew path, with its own save, purse, telemetry and parent section; plus the spell book, a
new screen for both languages.

**Architecture:** One engine, two courses. `RunController`, its policies and its screens stay Book 2's; a `Course`
object gives them everything language-specific (content, round builders, stage machine, audio kit, telemetry log, save
port, images, direction, the tower's content). The Hebrew course wraps today's modules unchanged; the English course
lives in `src/english/`. The app is still `duel2/`; `?course=en` picks the English course. The first duel's
`DuelController` gets a content seam so the English tower keeps its waves, bosses and the mega spell.

**Tech Stack:** Vite multi-page, React 19, TypeScript (erasable only in data files that Node loads), Zustand persisted
saves, the shared audio kit (Howler adapter, `installFakeAudio()` in tests), Vitest + jsdom, dependency-cruiser, knip.

**Spec:** `docs/superpowers/specs/2026-11-16-english-path-design.md` (approved 2026-11-18, the Hebrew spell book in this
build). Content source: `docs/superpowers/plans/2026-11-16-english-assets.md` (Part 1 word lists, Part 3 voice lines).
Read both, then `CLAUDE.md`, `docs/minigame-rules/`, `src/shared/README.md`, `src/duel2/README.md`,
`src/parent/README.md`, `tools/review/README.md`, ADRs 0001–0007.

## Global Constraints

- The Hebrew path, its saves and its screens behave exactly as before, except for the spell book (Task 26). Every
  existing test stays green **unchanged** (spec Part 11); the only Hebrew tests that change on purpose are the ones
  Task 26 names. The shared telemetry test (`src/shared/telemetryGoldens.test.ts`) must learn about the new logs: Task 7
  adds them to the lists of two existing `it`s and Task 33 adds cases; no other existing assertion and no existing
  golden file changes. Task 1 copies the run tests' helpers
  into a new harness instead of editing `useRun.test.tsx`.
- Save keys: Hebrew `alef-duel2` (version 7, untouched); English `alef-english` (version 1). English log:
  `alef-english-telemetry`, `game: 'english'`, every event `g: 'english'`. `GameId`, `PlaytimeGame` and the audio kit's
  `game` get `'english'`.
- Every new save writes through `persistSaveStorage()`; small direct writers use `safeSetItem`. `src/duel2/main.tsx` still
  imports `src/shared/stagingStorage` first (ADR 0001).
- Separate purse, stars, bests and crystals per path. The English coin balance starts at 0. Hearts per run (3).
- Stage pass (English stages 1–8): the first 5 answers on the stage's new items all right, or 8 of the last 10. Stage 9
  never passes.
- Placement: starts at stage 4, 3 runes, at most 15 answers, then one confirming round for each jumped-over stage
  below the level. No hint, no heart lost, no streak lost on a miss.
- Letters in Andika (`public/fonts/andika/`), lowercase single-storey `a` and `g`; capitals only after stage 3.
- No captions and no written instructions on child screens. On the English path Latin letters appear only as learning
  content; no Hebrew letter or nikkud appears there. The hint button is the `?`, never a wand.
- The English path is hidden on production (`release`) until all nine stages are reviewed (Task 36).
- The build works with any English clip or picture missing: a missing voice id plays nothing and the flow goes on; a
  missing green image falls back to the Hebrew file; a word without a picture is used only in rounds without pictures.
- Policies stay pure (`run-policies-are-pure`); the controller imports nothing from `components/`; the engine
  (`src/duel2/controller.ts`, `policies/`, `logic/`) never imports `src/english/` (a new depcruise rule, Task 3).
- Everything language-specific reaches the run, the shared screens and the tower through the course: no shared screen,
  no `DuelController` and no run code reads `useDuel2Store`, `useProgressStore`, `duel2Audio` or `duel2Telemetry`
  directly where the English path runs through it (Tasks 3, 4, 7).
- No host names, host paths outside the repo, routes or passwords in any file or commit message.
- Before every commit: `npm run check && npm test`. From Task 1 on, `npm run check` starts with `npm run typecheck`
  (`tsc --noEmit -p .`), so every task's check type-checks; before Task 1 it was lint, depcruise and knip only, and
  `tsc` ran only in `npm run build`.
- Every new `track('<name>'` (or `{ e: '<name>'` in a policy step) gets its generator entry in
  `src/shared/__fixtures__/telemetry/generate.ts` **in the same commit** (the coverage test in
  `telemetryGoldens.test.ts` scans every non-test `src/` file). English names go in the `ENGLISH` table, the Hebrew
  spell book's in `BOOK2_SPELL` (both made in Task 7); `BOOK2`, `TOWER` and `CLOCK` never change.
- A test body is never `{ … }` or a comment: every `it` has at least one `expect`. A reviewer rejects a test with none.

## Review Focus

1. **A clip or a picture is missing** (assets are a separate track): the round still plays to its end. A missing word
   clip must not stall a wait on the voice; the hint's lights use the fallback timing. Test: Task 21, Task 15.
2. **One path's save never touches the other's**: opening English on a device with only a Hebrew save creates
   `alef-english` and leaves `alef-duel2` and `alef-progress` byte-equal (the tower's tallies too); a reset of one
   leaves the other. Test: Task 4, Task 6, Task 7, Task 30.
3. **A pause or a reload in the middle of the placement** resumes it where it was (its answers are in the save), and
   never runs it twice. Test: Task 14.
4. **A stage whose content is not ready yet** (staging): the placement and the stage machine never move into it. Test:
   Task 11, Task 13.
5. **The parent sets a lower start stage or runs the placement again**: no open station closes and no rating goes
   down. Test: Task 31.

## File map

| Area | Files (new unless marked) |
|---|---|
| Course seam | `src/duel2/course/types.ts`, `hebrew.ts`, `index.ts`, `CourseContext.tsx`; `src/duel2/controller.ts` (mod), `src/duel2/useRun.ts` (mod), `src/duel2/Duel2App.tsx` (mod), `src/duel2/testing/runHarness.ts` (new helpers; `useRun.test.tsx` untouched), `package.json` (mod: `typecheck`) |
| Tower seam | `src/utils/duel/content.ts`, `src/utils/duel/tallies.ts`, `src/utils/duel/controller.ts` (mod), `src/types/duel.ts` (mod), `src/components/duel/SpellPad.tsx`, `RuneGlyph.tsx` (mod) |
| English course | `src/english/course.ts`, `available.ts`, `store.ts`, `saveFormat.ts`, `savePort.ts`, `audio.ts`, `telemetry.ts`, `telemetryLog.ts`, `station.ts`, `README.md` |
| English content | `src/english/content/units.ts`, `words.ts`, `sets.ts`, `chains.ts`, `phrases.ts`, `placementRounds.ts`, `ready.ts`, `voiceIds.ts`; `src/english/data/lines.ts`, `strokes.ts` |
| English logic | `src/english/logic/stages.ts`, `pick.ts`, `intro.ts`, `rounds/<screen>.ts` (no barrel), `tower.ts`, `placement.ts`, `blend.ts`, `spell.ts`, `draw.ts` |
| Spell book (both) | `src/duel2/policies/spell.ts`, `src/duel2/components/screens/SpellBook.tsx`, `src/duel2/logic/spell.ts` (Hebrew rounds) |
| Hint blend | `src/duel2/components/BlendWord.tsx`, `src/english/logic/blend.ts` |
| Assets | `src/english/assets/images.ts`, `src/english/assets/audioFiles.ts`, `src/english/assets/preload.ts`, `src/english/assets/img/.gitkeep`, `src/english/assets/audio/voice/.gitkeep`, `asset-sources/english/README.md` |
| Parent | `src/english/parent/index.ts`, `Settings.tsx`, `Level.tsx`, `Units.tsx`, `Words.tsx`, `OffScreenCheck.tsx`, `reset.ts`; `src/parent/registry.ts`, `types.ts` (mod) |
| Shared | `src/shared/numberRange.ts`; `src/shared/playtime.ts` (mod) |
| Telemetry | `src/shared/__fixtures__/telemetry/generate.ts` (mod), `english-all.golden.json`, `book2-spell.golden.json`, `src/shared/telemetryGoldens.test.ts` (mod) |
| Home | `src/components/home/EnglishCard.tsx`, `englishStations.ts`; `StationPath.tsx`, `stations.ts`, `HomePage.tsx`, `home.css` (mod) |
| Config | `.dependency-cruiser.cjs`, `knip.json` (mod only if a new entry is needed) |

## Phases

| Phase | Tasks | Ships |
|---|---|---|
| 1 The course seam | 1–7 | `?course=en` opens an English cover with its own save, purse, log and audio; Hebrew unchanged |
| 2 Content and stages | 8–12 | the nine stages' data, checked; the English stage machine and adaptive choice |
| 3 Placement | 13–14 | the first English run finds his level |
| 4 The screens | 15–22 (with 21a) | every English screen of the cycle, the hint blend (the tower's too) |
| 5 The spell book | 23–26 | the spell book in English and in Hebrew |
| 6 Writing | 27–29 | Latin drawing and the written spell book |
| 7 Parent area | 30–32 | the English section |
| 8 Telemetry fixtures | 33 | the roll-up and the final goldens (each task adds its own events' fixtures, from Task 7 on) |
| 9 Home and the green skin | 34–35 | the English card and path, the green look |
| 10 Gate and finish | 36–38 | hidden on production, docs and rules, the QA pass |

**Parallel work** (each line is a set a dispatcher can give to subagents at once, after the tasks before it):
Tasks 5, 6 after Task 3 (Task 4 after Task 5: both edit `Play.tsx`) · Tasks 8, 10 after Task 7 (Task 9 after 8;
inside Task 9, one subagent per stage group) · Tasks 11, 12 after Task 9 · the pure builders (Step A) of Tasks 15–20
after Task 14, one per screen; their wiring steps (Step B: `controller.ts`, the view types, the screen, `course.ts`) one
task at a time, in the order 15, 16, 17, 18, 19, 20 · Tasks 25, 26 after Task 24 · Tasks 27 and 30 after Task 24 ·
Tasks 31, 32 after Task 30 · Tasks 34, 35 after Task 31. Tasks 21, 21a, 22, 28, 29, 33, 36–38 are sequential (28 after 27,
29 after 25 and 28).

---

## Phase 1 — The course seam

### Task 1: The Hebrew baseline

The regression net for everything after it: snapshots of what the Hebrew path does today, taken before any change.

**Files:**
- Create: `src/duel2/testing/runHarness.ts` (its own `until`, `drain`, `proceed`, written after the ones at the top of
  `src/duel2/useRun.test.tsx`, which stays **untouched**: the spec keeps the Hebrew tests unchanged; a later cleanup may
  make `useRun.test.tsx` import them)
- Modify: `package.json` (`"typecheck": "tsc --noEmit -p ."`; `"check": "npm run typecheck && npm run lint && npm run depcruise && npm run knip"`)
- Test: `src/duel2/course/hebrewBaseline.test.ts`, snapshots in `src/duel2/course/__snapshots__/`;
  `src/utils/duel/towerBaseline.test.ts`, snapshots in `src/utils/duel/__snapshots__/`

**Interfaces:**
- Produces: `runHarness.ts` exports `until`, `drain`, `proceed`, `resetRunStore()`, `setTowerAuto(v)` (the harness's
  own module flag, set through a function: an imported binding cannot be assigned), `seeded(seed): Rng` (mulberry32),
  `alternate(n): (view: View) => 'right' | 'wrong'` (every `n`-th answer wrong), `CASES: [ScreenId, number][]` (each
  Hebrew screen at each stage 1–4 where `cycleOf(stage, true)` holds it), and
  `recordSession(opts: RunOpts, answer: (view: View) => 'right' | 'wrong'): Promise<SessionLog>` where
  `SessionLog = { voice: string[]; events: { e: string; screen?: string; target?: string }[]; views: string[] }`
  (`views` = `${screen}:${phase}:${choiceIds}` per change; `choiceIds` comes from one function in the harness,
  `choiceIdsOf(view)`, which later tasks extend for new view fields and never change for the old ones).

- [ ] **Step 1: The type check.** Add the `typecheck` script and put it first in `check`. Run `npm run typecheck` — PASS
  on the base (CI's `npm run build` already runs `tsc`). From here on every task's `npm run check` type-checks.
- [ ] **Step 2: Write the baseline tests.** For each Hebrew screen (`broom`, `cauldron`, `ladder`, `ghosts`, `doors`,
  `draw`, `draw-hand`) and each stage 1–4 where it is open, a seeded `session: { screen }` run (`rng` = `seeded(7)`,
  `memorySavePort()`, fake timers, `installFakeAudio()`), answering right, right, wrong, right…:
  ```ts
  it.each(CASES)('Hebrew %s at stage %i', async (screen, stage) => {
    const log = await recordSession({ session: { screen }, force: { screen, stage }, rng: seeded(7) }, alternate(3))
    expect(log).toMatchSnapshot()
  })
  it.each([1, 2, 3, 4] as const)('the cycle at stage %i', (st) => expect(cycleOf(st, true)).toMatchSnapshot())
  it('a fresh Hebrew save', () => expect(JSON.stringify(memorySavePort().read())).toMatchSnapshot())
  ```
  `towerBaseline.test.ts` (Task 4 rewrites the tower): a `DuelController` with `rng` = `seeded(7)`, a fake sleeper, the
  duel's audio log on (`setDuelAudioLog`), embedded as Book 2 embeds it, answering right, right, wrong (a twin when the
  round has one), right… for two waves and a boss: snapshot the spoken line ids in order, each round's
  `{ type, target.id, runes ids }`, the tracked events, and `useProgressStore.getState().duel` after the run.
- [ ] **Step 3: Run them**: `npx vitest run src/duel2/course/hebrewBaseline.test.ts src/utils/duel/towerBaseline.test.ts`
  — writes the snapshots. Run them a second time: PASS (the harness is deterministic).
- [ ] **Step 4: Run** `npm run check && npm test` — PASS (no product code changed).
- [ ] **Step 5: Commit** `git add package.json src/duel2/testing src/duel2/course src/utils/duel/towerBaseline.test.ts src/utils/duel/__snapshots__` —
  "Book 2: a baseline of the Hebrew sessions, cycles and tower before the course seam; npm run check type-checks"

The `stage 4` session snapshots and `the cycle at stage 4` are the only ones Task 26 may update. A later diff in any
other snapshot (the tower's included) is a Hebrew regression. Record this commit's hash in the ledger: Task 38 diffs
against it.

### Task 2: The course type, the Hebrew course, and `?course=en`

**Files:**
- Create: `src/duel2/course/types.ts`, `src/duel2/course/hebrew.ts`, `src/duel2/course/index.ts`, `src/english/available.ts`
- Test: `src/duel2/course/course.test.ts`, `src/english/available.test.ts`

**Interfaces:**
- Produces (`types.ts`):
  ```ts
  export type CourseId = 'he' | 'en'
  export interface CourseStages {
    maxStage: number
    /** the cycle's order, tower first; screens not open at a stage are skipped */
    order: ScreenId[]
    /** screens that the drawing setting turns off */
    drawing: ScreenId[]
    screensOfStage(stage: number): ScreenId[]
    recordStageAnswer(p: StageProgress, correct: boolean): { progress: StageProgress; passed: boolean }
    visit: Record<ScreenId, number>
    sessionLength: Record<ScreenId, number>
  }
  export interface Course {
    id: CourseId
    /** the GameId of its parent section, its PlaytimeGame and its audio kit's game */
    game: 'book2' | 'english'
    dir: 'rtl' | 'ltr'
    stages: CourseStages
    rounds: CourseRounds          // Task 3 fills in the members (an empty interface until then)
    // `tower: TowerContent` is added by Task 4, which makes the type
    audio: CourseAudio            // the kit instance's sayParts, say, sayInfo, stopVoice, playSfx, startMusic, stopMusic, voiceSignal, cancelVoice
    telemetry: ReturnType<typeof createTelemetry>
    /** the log the parent area lists and the registry seals (BOOK2_LOG, ENGLISH_LOG) */
    log: TelemetryLog
    save: () => SavePort          // lazy: the English store is created only on the English page
    images: Record<string, string>
    /** the shell's preload (useGameShell's `preload`) */
    preload: () => Promise<void>
    /** the boy and girl pictures of the play gate's question, and its line id */
    genderPictures: { boy: string; girl: string; askLine: string }
    lineAudioId(id: string, n?: number): string
  }
  ```
  `hebrew.ts`: `export const HEBREW: Course` built from today's modules (`logic/stages`, `logic/run`, `logic/rounds`,
  `audio/duel2Audio`, `telemetry`, `telemetryLog`, `storeSavePort`, `assets/images`, `assets/preload`, `data/lines`).
  `HEBREW.stages` is `HEBREW_STAGES`, a value defined in `src/duel2/logic/run.ts` (next to the private `ORDER`,
  `DRAWING`, `VISIT`, `SESSION_LENGTH` it reads; `run.ts` imports only the `CourseStages` type), so that Task 3's
  defaults in `run.ts` never import `course/hebrew.ts` (that would be a `no-circular` cycle). `index.ts`:
  `courseIdFromUrl(search: string, available: boolean): CourseId` and `loadCourse(id): Promise<Course>` (the English
  course by dynamic `import('../../english/course')`, so the Hebrew page never loads English data).
- Produces (`available.ts`): `englishAvailable(env: { staging: boolean; dev: boolean; test: boolean; released: boolean }): boolean`
  and `ENGLISH_AVAILABLE` (from `isStaging`, `import.meta.env.DEV`, `import.meta.env.MODE === 'test'`,
  `ENGLISH_RELEASED`); `export const ENGLISH_RELEASED = false`.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('?course=en picks English only where it is available', () => {
    expect(courseIdFromUrl('?course=en', true)).toBe('en')
    expect(courseIdFromUrl('?course=en', false)).toBe('he')
    expect(courseIdFromUrl('?station=broom', true)).toBe('he')
    expect(courseIdFromUrl('', true)).toBe('he')
  })
  it('the Hebrew course is today\'s modules', () => {
    expect(HEBREW.stages.screensOfStage).toBe(screensOfStage)            // wiring
    expect(HEBREW.stages.order).toEqual(['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'draw', 'draw-hand'])
    for (const st of [1, 2, 3, 4] as const)                              // behaviour: the order filtered is today's cycle
      expect(HEBREW.stages.order.filter((s) => cycleOf(st, true).includes(s))).toEqual(cycleOf(st, true))
    expect(HEBREW.telemetry).toBe(duel2Telemetry); expect(HEBREW.log).toBe(BOOK2_LOG); expect(HEBREW.dir).toBe('rtl')
  })
  it('production sees no English until it is released', () => {
    expect(englishAvailable({ staging: false, dev: false, test: false, released: false })).toBe(false)
    expect(englishAvailable({ staging: true, dev: false, test: false, released: false })).toBe(true)
    expect(englishAvailable({ staging: false, dev: false, test: false, released: true })).toBe(true)
  })
  ```
- [ ] **Step 2: Run** `npx vitest run src/duel2/course src/english/available.test.ts` — FAIL (modules missing).
- [ ] **Step 3: Implement** the three modules. `ORDER` stays a private const of `logic/run.ts` (it is not an export
  today); `HEBREW_STAGES` there exposes it as `order`, with `VISIT`, `SESSION_LENGTH` (still exported for their
  callers), `screensOfStage` and `recordStageAnswer`.
- [ ] **Step 4: Run** the tests, then `npm run check && npm test` — PASS, baseline unchanged.
- [ ] **Step 5: Commit** — "Book 2: a course type, the Hebrew course over today's modules, and ?course=en behind the English gate"

### Task 3: The run takes its course

**Files:**
- Modify: `src/duel2/controller.ts`, `src/duel2/logic/run.ts` (`cycleOf`, `nextScreen`, `runStart` take `CourseStages`
  as their last parameter, default `HEBREW_STAGES` from the same file; `VISIT.spell = 3`, `SESSION_LENGTH.spell = 6`,
  the values Task 26 uses, while `ORDER` does not hold `spell` yet), `src/duel2/logic/rounds.ts` (the extracted door
  choice and widened types), `src/duel2/logic/predict.ts` (`ScreenId` + `'spell'`, a type only), `src/duel2/course/types.ts`, `src/duel2/course/hebrew.ts`, `src/duel2/useRun.ts`, `.dependency-cruiser.cjs`
- Test: `src/duel2/course/seam.test.ts`

**Interfaces:**
- Consumes: `Course`, `HEBREW` (Task 2).
- Produces: `RunOpts.course?: Course` (default `HEBREW`). `CourseRounds` holds every content function the controller
  calls today, **with today's Hebrew signatures and types** (`HEBREW` passes today's functions), with `stage: number`
  where they take a stage: `broomTarget(ctx, kind, avoid?, screen?)`, `broomWave(ctx, target, kind)`,
  `cauldronRound(ctx, avoid?)`, `ghostRound(ctx, kind, avoid?)`, `ladderPlan(ctx, rungs, force?)`, `isNewStageChoice`,
  `letterChoice`, `features(c: Choice, screen: ScreenId): string[]`, `doorWords(ctx: RoundCtx, n: number): Word[]`,
  `doorKeys(ctx, word): Word[]`, `wordLinkFor`, `dotIntroFor` (Hebrew only; English returns `null`), `drawWords`,
  `bossTarget`, `bossWave`. Each of Tasks 16–20 and 28 changes **its own** member to a course-neutral shape in its Step
  B (with a Hebrew adapter that the baseline protects), widens its view type and screen, and wires it in the
  controller; Task 3 does not guess those shapes.
  `features` and `doorWords`/`doorKeys` do not exist as functions today: Step 3 first extracts them without a change
  in behaviour — `sylFeatures` (private in `controller.ts`) moves into `course/hebrew.ts` as `HEBREW.rounds.features`,
  and the door choice (`controller.ts`, the `doorWords` field filled inline in `buildRound`, and the two other keys)
  moves into `logic/rounds.ts` as `doorWords` and `doorKeys`, called with the same `rng` draws in the same order.
  `Choice.kind` widens to `'letter' | 'syllable' | 'unit' | 'word'`; `Choice` gains optional `units?: string[]` (the
  sound units of a word, for the blend and the spell book), `picture?: string`, `heart?: true`, `nonsense?: true`.
  Hebrew choices do not change. `ScreenId` gains `'spell'` here (type only, so that Task 11's English order type-checks);
  every `Record<ScreenId, …>` the type check names gets its `spell` entry in this task.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('the run asks its course for rounds', async () => {
    const spy = vi.fn(HEBREW.rounds.cauldronRound)
    const course = { ...HEBREW, rounds: { ...HEBREW.rounds, cauldronRound: spy } }
    await recordSession({ course, session: { screen: 'cauldron' }, force: { screen: 'cauldron', stage: 2 } }, alternate(3))
    expect(spy).toHaveBeenCalled()
  })
  it('the run tracks through its course\'s log', async () => {
    const telemetry = { ...duel2Telemetry, track: vi.fn() }
    const real = vi.spyOn(duel2Telemetry, 'track')
    await recordSession({ course: { ...HEBREW, telemetry }, session: { screen: 'broom' }, force: { screen: 'broom', stage: 1 } }, alternate(3))
    expect(telemetry.track).toHaveBeenCalledWith('answer', expect.anything()); expect(real).not.toHaveBeenCalled()
  })
  it('the run speaks through its course\'s audio', async () => {
    const audio = { ...HEBREW.audio, sayParts: vi.fn(async () => {}) }; const log = installFakeAudio()
    await recordSession({ course: { ...HEBREW, audio }, session: { screen: 'broom' }, force: { screen: 'broom', stage: 1 } }, alternate(3))
    expect(audio.sayParts).toHaveBeenCalled(); expect(log.voice).toEqual([])   // nothing reached duel2Audio's kit directly
  })
  ```
  Add the depcruise rule `run-engine-is-course-free`:
  from `^src/duel2/(controller|logic/|policies/)` and `^src/utils/duel/`, not to `^src/english/`; and add
  `english/logic` to the `from` path of `logic-never-imports-ui` (`^src/(duel2/logic|clock/logic|utils/duel|english/logic)/`).
- [ ] **Step 2: Run** `npx vitest run src/duel2/course/seam.test.ts` — FAIL.
- [ ] **Step 3: Implement.** Extract `features`, `doorWords` and `doorKeys` (above) first and run the baseline: PASS
  unchanged. Then replace every direct content, audio, telemetry and save import of `controller.ts` with
  `this.course.…` (the default save is `this.course.save()`). No other logic moves; only the source of each call.
- [ ] **Step 4: Run** `npm run check && npm test` — PASS; `hebrewBaseline.test.ts` snapshots unchanged.
- [ ] **Step 5: Commit** — "Book 2: the run takes its content, audio, log and save from its course (the Hebrew course by default)"

### Task 4: The tower takes its content  *(after Task 5: both edit `Play.tsx`; parallel with 6)*

The English tower is the first duel's board with English rounds, so the waves, bosses, monsters and the mega spell are
the same code (ADR 0002). A content seam in `DuelController`, not a new screen.

**Files:**
- Create: `src/utils/duel/content.ts`, `src/utils/duel/tallies.ts`
- Modify: `src/utils/duel/controller.ts`, `src/utils/duel/rules.ts`, `src/types/duel.ts`, `src/hooks/useDuelGame.ts`,
  `src/components/duel/SpellPad.tsx`, `src/components/duel/RuneGlyph.tsx`, `src/duel2/components/screens/Tower.tsx`,
  `src/duel2/screens/Play.tsx` (passes the course's tower props), `src/duel2/course/types.ts` (`Course.tower`),
  `src/duel2/course/hebrew.ts`
- Test: `src/utils/duel/content.test.ts`; Task 1's `towerBaseline.test.ts` snapshots unchanged; the ADR 0002 list must
  stay green unchanged (`Tower.test.tsx`, the tower part of `useRun.test.tsx`, `src/utils/duel/controller*.test.ts`,
  `src/hooks/useDuelGame.test.tsx`)

**Interfaces:**
- Produces:
  ```ts
  export interface TowerRune { id: string; text: string; alphabet: 'hebrew' | 'latin' }
  export interface TowerContent {
    /** builds the round, and decides its rune count (Hebrew: today's pad, 6 from wave 3; English: always 4 letter
     *  runes, 3 word runes in the placement and name rounds, spec Parts 4–5) */
    makeRound(o: MakeRoundOpts): Round
    isCorrect(r: Round, c: Choice): boolean
    isTwin(r: Round, c: Choice): boolean
    /** the voice ids of a round's question and of its feedback, in order */
    questionParts(r: Round): string[]
    feedbackParts(r: Round, plan: FeedbackPlan): string[]
    /** the explanation of a round type the first time (today `line-how-${key}`) and its glow cues (today `LINE_CUES`) */
    howLine(r: Round): { id: string; cues: LineCue[] } | null
    /** a forgiven twin tap (today `line-almost` then `wiz-<mark>`) */
    twinParts(r: Round, c: Choice): string[]
    runeOf(r: Round, i: number): TowerRune
  }
  export const HEBREW_TOWER: TowerContent
  /** what the tower reads and writes of the child's answers (today `useProgressStore.duel`) */
  export interface DuelTallies {
    read(): { byMark: Record<string, Tally>; confusions: Record<string, Record<string, number>>; recent: Record<string, string>; pace: number }
    // the progress store's own actions, the ones utils/duel/controller.ts calls today
    recordDuelRound(markId: string, type: ScreenType, result: RoundResult, ms: number, opts?: { recent?: boolean }): void
    recordDuelTwin(markId: string, type: ScreenType): void
    recordDuelConfusion(askedId: string, tappedId: string): void
    setDuelPace(pace: number): void
  }
  export const progressTallies: DuelTallies     // over useProgressStore, the default
  export function memoryTallies(initial?): DuelTallies   // tests
  ```
  `DuelOpts.content?: TowerContent` (default `HEBREW_TOWER`) and
  `DuelOpts.tallies?: DuelTallies` (default `progressTallies`); the controller never reads `useProgressStore` itself.
  `DuelOpts.audio` already exists: it is the duel's own `DuelAudio` (`playLine`, the duel's line catalog), which the
  English course gives as an adapter over its own kit (Task 15). `Round` gains optional `picture?: string` and
  `runeTexts?: TowerRune[]`; English rounds fill `target.id` and `runeTexts`, Hebrew rounds leave `runeTexts` unset and
  `RuneGlyph` draws from `runeTexts` when it is set. `Course` gains `tower: { content: TowerContent; tallies: () => DuelTallies; audio?: DuelAudio }`
  (Hebrew: `HEBREW_TOWER`, `progressTallies`, the default audio). `Tower.tsx` takes these from the course (it reads
  `useDuel2Store` today) through `Play.tsx`.

- [ ] **Step 1: Write the failing tests**: a fake `TowerContent` with Latin runes `['m','s','t','a']`, target `m`: the
  pad renders 4 buttons with those texts (`data-correct` on `m`), a tap on `m` reports `onAnswer('right', 'm')`, and
  the controller says `content.feedbackParts(...)` in order (fake audio log); the first round of its type says
  `content.howLine(r).id`, never `line-how-A`; a tower run on `memoryTallies()` leaves `alef-progress` byte-equal and
  writes its answers into the memory tallies (Review Focus 2).
- [ ] **Step 2: Run** `npx vitest run src/utils/duel/content.test.ts` — FAIL.
- [ ] **Step 3: Implement** `HEBREW_TOWER` from today's `makeRound`, `isCorrect`, `isTwin`, the controller's spoken
  parts, `line-how-*` with `LINE_CUES`, and the twin's `line-almost` + `wiz-<mark>` (moved, not changed);
  `progressTallies` from today's `this.store` calls; the controller calls `this.content.*` and `this.tallies.*`.
  `RuneGlyph` draws `alphabet: 'latin'` as plain text in Andika.
- [ ] **Step 4: Run** `npm run check && npm test` — PASS; the ADR 0002 tests, `towerBaseline` and the baseline unchanged.
- [ ] **Step 5: Commit** — "First duel: the tower takes its rounds and spoken parts from a content seam (Hebrew by default)"

### Task 5: The screens follow the course's direction  *(parallel with 6; before 4)*

**Files:**
- Modify: `src/duel2/components/screens/Stage.tsx`, `Cauldron.tsx`, `Ladder.tsx`, `Doors.tsx`, `Ghosts.tsx`, `Broom.tsx`,
  `src/duel2/components/Glyph.tsx`, `src/duel2/screens/Play.tsx`, `src/duel2/controller.ts` (`View` is declared there,
  not in `viewTypes.ts`)
- Test: `src/duel2/components/screens/direction.test.tsx`

**Interfaces:**
- Produces: `View.course: { id: CourseId; dir: 'rtl' | 'ltr' }`; `.d2-root` gets `dir` and `data-course`. `Glyph`
  takes `alphabet: 'hebrew' | 'latin'` (Latin: Andika, no nikkud handling; named `alphabet` because `Script` already
  means print or hand in `data/strokes.ts`). Word plates, ladder rungs and the doors' plates lay their parts out in
  `dir` order (the cauldron's boxes do so from Task 17, which makes them). Positions of the wizard, monsters and orbs do
  not change (design Part 2, *Facing*).

- [ ] **Step 1: Write the failing test**: a ladder view and a doors view with `dir: 'ltr'` (today's `Choice[]` plates)
  render their parts in DOM order left to right, and their container has `dir="ltr"`; the same views with
  `dir: 'rtl'` keep today's DOM order and `dir="rtl"`; `data-course="en"` is on the root. (jsdom does no layout, so the
  test checks the `dir` attribute and the DOM order; the visual order is checked by `/verify` in Task 38.)
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS, baseline unchanged.
- [ ] **Step 5: Commit** — "Book 2: the screens lay out words in the course's direction"

### Task 6: The English save and its own purse  *(parallel with 4, 5)*

**Files:**
- Modify: `src/duel2/store.ts` (a factory; `useDuel2Store` stays the same object, key, version and migrations),
  `src/duel2/logic/stages.ts` (`StageProgress.stage: number`)
- Create: `src/english/store.ts`, `src/english/saveFormat.ts`, `src/english/savePort.ts`, `src/english/logic/placement.ts`
  (the `PlacementState` type only; Task 13 adds the functions)
- Test: `src/english/store.test.ts`

**Interfaces:**
- Produces: `createRunStore(o: { key: string; version: number; migrate: (s: unknown, v: number) => unknown; initial?: Partial<Duel2Save>; recordStageAnswer: CourseStages['recordStageAnswer'] })`.
  The store's `recordAnswer` calls `o.recordStageAnswer`, never the Hebrew one directly (today it does, and that one
  never passes at stage ≥ 4). `useDuel2Store` passes Hebrew `recordStageAnswer`;
  `useEnglishStore = createRunStore({ key: 'alef-english', version: 1, migrate: (s) => s, initial: ENGLISH_FRESH, recordStageAnswer: neverPasses })`,
  where `neverPasses` (in `src/english/store.ts`) keeps the answer and never passes; Task 11 replaces it with
  `(p, ok) => enRecordStageAnswer(p, ok, contentStages())` and tests that an English stage 4 passes.
  `EnglishSave = Omit<Duel2Save, 'settings'> & { settings: EnglishSettings; placement: PlacementSave; tower: TowerTallies; introSeen: Record<string, IntroState>; openedStations: ScreenId[]; lastRunWords: string[] }` with
  `EnglishSettings = Duel2Settings & { path: boolean }` (default on), `TowerTallies` the shape of `DuelTallies.read()`
  (Task 4), `IntroState` (Task 12; declared here as Task 12 lists it), and
  `PlacementSave = { state: PlacementState | null; requested: boolean; done: { level: number; answers: number; at: number } | null; runs: number }`.
  The placement is due when `requested || state !== null || done === null` (a re-run sets `requested`, so it never
  looks like a finished one). `PlacementState` is declared here exactly as Task 13 lists it.
  `ENGLISH_FRESH`: `coins: 0`, `bookOpen: true`, `stage: { stage: 1, newAnswers: '' }`,
  `placement: { state: null, requested: false, done: null, runs: 0 }`, empty tower tallies, `introSeen: {}`,
  `openedStations: []`, `lastRunWords: []`.
  `EnglishSavePort extends SavePort` with the English writes, so no later task writes past the port:
  `setPlacement(p: PlacementSave)`, `setStage(stage: number)`, `seedTallies(t: Record<string, Tally>)` (merges, never
  lowers), `setIntro(id: string, s: IntroState)`, `openStations(ids: ScreenId[])` (union: it only grows),
  `setLastRunWords(words: string[])`, `towerTallies(): DuelTallies` (Task 4's port over the `tower` field), and
  `read(): Readonly<EnglishSave>`. `englishSavePort()`, `memoryEnglishSavePort(initial?)`.
  `saveFormat.ts`: light (no store), `readEnglishSave(): Partial<EnglishSave> | null` from the raw key, for home and the
  parent index.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('English coins never reach the Hebrew purse', () => {
    localStorage.setItem('alef-duel2', HEBREW_SAVE_RAW)
    useEnglishStore.getState().addCoins(5)
    expect(localStorage.getItem('alef-duel2')).toBe(HEBREW_SAVE_RAW)
    expect(readEnglishSave()!.coins).toBe(5)
  })
  it('a fresh English save starts at 0 coins, stage 1, no placement', () => {
    expect(memoryEnglishSavePort().read()).toMatchObject({ coins: 0, bookOpen: true, stage: { stage: 1 }, placement: { done: null, requested: false } })
  })
  it('the Hebrew store is unchanged', () => { expect(useDuel2Store.persist.getOptions().name).toBe('alef-duel2'); expect(useDuel2Store.persist.getOptions().version).toBe(7) })
  it('the store asks its own stage rule', () => {
    const rule = vi.fn(() => ({ progress: { stage: 5, newAnswers: '' }, passed: true }))
    const s = createRunStore({ key: 'test-run', version: 1, migrate: (x) => x, recordStageAnswer: rule })
    s.getState().recordAnswer(/* a new-stage answer, right */)
    expect(rule).toHaveBeenCalled(); expect(s.getState().stage.stage).toBe(5)
  })
  it('opened stations only grow; seeded tallies never lower a count', () => {
    const p = memoryEnglishSavePort(); p.openStations(['tower', 'broom']); p.openStations(['tower'])
    expect(p.read().openedStations).toEqual(['tower', 'broom'])
    p.seedTallies({ a: { seen: 3 } }); p.seedTallies({ a: { seen: 1 } })
    expect(p.read().tallies.a.seen).toBe(3)
  })
  ```
- [ ] **Step 2: Run** `npx vitest run src/english/store.test.ts` — FAIL. **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run check && npm test` — PASS (`src/duel2/store.test.ts` unchanged).
- [ ] **Step 5: Commit** — "English path: its own save (alef-english) with its own purse, from Book 2's store factory"

### Task 7: The English page: shell, audio, log, play time

**Files:**
- Create: `src/english/course.ts`, `src/english/audio.ts`, `src/english/telemetry.ts`, `src/english/telemetryLog.ts`,
  `src/english/assets/audioFiles.ts`, `src/english/assets/images.ts`, `src/english/assets/preload.ts`, `.gitkeep`s,
  `src/duel2/course/CourseContext.tsx`, `src/english/parent/index.ts` (minimal; Task 30 fills it)
- Modify: `src/duel2/Duel2App.tsx`, `src/duel2/screens/Cover.tsx`, `Play.tsx`, `Summary.tsx`, `Strokes.tsx`,
  `src/duel2/components/InfoTap.tsx`, `ExplainPanel.tsx` (each reads the course from `CourseContext` instead of
  `useDuel2Store` / `duel2Audio` / `duel2Telemetry`), `src/duel2/course/types.ts` and `hebrew.ts` (`Course.store`),
  `src/duel2/station.ts` (`openScreens` takes the course's stages),
  `src/shared/playtime.ts` (`'english'`), `src/parent/types.ts` (`GameId` `'english'`), `src/parent/registry.ts`,
  `.dependency-cruiser.cjs` (`english` in the paths of `parent-area-reads-games-only-through-their-parent-index` and
  `game-parent-index-is-light`; that rule's `to` also gets `/audio\\.ts$`, since the English kit is `src/english/audio.ts`),
  `src/shared/__fixtures__/telemetry/generate.ts`, `src/shared/telemetryGoldens.test.ts` (new cases only)
- Test: `src/english/page.test.tsx`

**Interfaces:**
- Consumes: Tasks 2–6.
- Produces: `ENGLISH: Course` (content members are stubs that throw `not built` until Phases 2–6 fill them: `stages`
  in Task 11, the tower in Tasks 14–15, the rounds in Tasks 16–20, 25 and 28). `ENGLISH_LOG: TelemetryLog = { key: 'alef-english-telemetry', label: 'English path', game: 'english', about, rollup }`
  (rollup filled in Task 33). `englishAudio = createGameAudio({ game: 'english', voices: ENGLISH_VOICE_URLS, sfx: SFX_URLS, music: MUSIC_URLS, … })`
  with Book 2's numbers and effect files; `ENGLISH_VOICE_URLS` from `import.meta.glob('./audio/voice/*.mp3')` (empty for
  now). `ENGLISH_IMAGES`: Task 34; until then `IMAGES`. `Duel2App` reads `courseIdFromUrl(location.search, ENGLISH_AVAILABLE)`,
  loads the course before the shell, provides it through `CourseContext`, and uses the course's `preload`,
  `genderPictures`, `log`, `usePlaytime(course.game, …)` and `ParentArea game={course.game}`. `importFirstDuel` runs on
  the Hebrew course only. The station link `?course=en&station=<id>` goes through `stationFromUrl(search, openScreens(save, course))`
  with the open course's save and stages. The `HomeButton` is already on every run screen.
- `CourseContext`: `useCourse(): Course` (default `HEBREW`, so a Hebrew screen rendered without a provider is as
  today), and `useCourseSave<T>(pick)`: a subscription to the open course's store for the screens that subscribe (the
  cover's purse, stars and bests), through `Course.store()` (a lazy accessor: Hebrew `() => useDuel2Store`, English
  `() => useEnglishStore`), so `src/duel2/` never imports `src/english/store.ts` statically (Task 36's rule).
- `englishParent` (minimal, registered now so `gameParent('english')` exists and the log is sealed and budgeted from
  its first event): `{ id: 'english', title: 'English path', saveKey: 'alef-english', logs: [ENGLISH_LOG], summary, mixups: () => [], reset }`.
  `GAMES` lists it only where `ENGLISH_AVAILABLE` (Hebrew production shows no English section).
- Telemetry fixtures (the coverage test fails on the first unknown `track(` name, so this task makes the place where
  every later task adds its names): `generate.ts` gets an `ENGLISH` table (`'english'` game, seed 13), a `BOOK2_SPELL`
  table (empty now; the Hebrew spell book's events, kept out of `BOOK2` so `book2-*.golden.json` keep their bytes),
  `englishEvents()`, `GOLDEN_ENGLISH()`, `GOLDEN_BOOK2_SPELL()`, and both tables in `FIXTURE_EVENT_NAMES`.
  `telemetryGoldens.test.ts`: the two new logs join the lists of the "every generator name is in a golden log" and the
  "t order" `it`s (`[...GOLDEN_BOOK2(), ...GOLDEN_CLOCK(), ...GOLDEN_ENGLISH(), ...GOLDEN_BOOK2_SPELL()]`; without this
  the existing union fails as soon as `FIXTURE_EVENT_NAMES` holds an English name). That is the only edit to an
  existing line; the goldens of Book 2, the clock and the frozen history are not touched. The golden JSON files of the two new
  logs are written in Task 33, once their names are final. This task's own new names (if any) go in `ENGLISH` now.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('?course=en opens the English cover', async () => {
    history.replaceState(null, '', '/duel2/?course=en'); render(<Duel2App />)
    expect(await screen.findByTestId('cover')).toHaveAttribute('data-course', 'en')
  })
  it('the English cover shows the English purse', async () => {
    localStorage.setItem('alef-duel2', hebrewSaveWith({ coins: 40 }))
    history.replaceState(null, '', '/duel2/?course=en'); render(<Duel2App />)
    expect((await screen.findByTestId('cover')).querySelector('[data-coins]')!.textContent).toBe('0')
  })
  it('opening English leaves alef-duel2 and alef-progress byte-equal', async () => {
    const duel2 = hebrewSaveWith({ coins: 40 }); localStorage.setItem('alef-duel2', duel2); localStorage.setItem('alef-progress', PROGRESS_RAW)
    history.replaceState(null, '', '/duel2/?course=en'); render(<Duel2App />); await screen.findByTestId('cover')
    expect(localStorage.getItem('alef-duel2')).toBe(duel2); expect(localStorage.getItem('alef-progress')).toBe(PROGRESS_RAW)
  })
  it('the English page tracks into its own log', async () => {
    history.replaceState(null, '', '/duel2/?course=en'); render(<Duel2App />)
    fireEvent.click(await screen.findByTestId('gender-boy'))
    expect(readLog('alef-english-telemetry').some((e) => e.e === 'player' && e.g === 'english')).toBe(true)
    expect(readLog('alef-duel2-telemetry').some((e) => e.e === 'player')).toBe(false)
  })
  it('the Hebrew page is the same as before', async () => { history.replaceState(null, '', '/duel2/'); render(<Duel2App />); expect(await screen.findByTestId('cover')).toHaveAttribute('data-course', 'he') })
  it('play time counts under english', () => { expect(PLAYTIME_GAMES).toContain('english') })
  it('the English page has a parent section and its log is registered', () => { expect(gameParent('english').logs).toContain(ENGLISH_LOG) })
  ```
  Use the existing test ids of the cover, its purse and the gender buttons where they exist; else add `data-testid`s.
  (`hebrewSaveWith` and `PROGRESS_RAW` are fixtures in the test file.)
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: ?course=en opens its own page in Book 2's app (its shell, audio kit, log and play time)"

---

## Phase 2 — Content and stages

### Task 8: Sound units and stages  *(parallel with 10)*

**Files:**
- Create: `src/english/content/units.ts`, `src/english/content/voiceIds.ts`
- Test: `src/english/content/units.test.ts`

**Interfaces:**
- Produces (erasable TS, Node-loadable):
  ```ts
  export type UnitKind = 'vowel' | 'consonant' | 'digraph' | 'double' | 'magic-e' | 'ending' | 'r-vowel' | 'team'
  export interface Unit {
    id: string          // display spelling: 'a', 'sh', 'qu', 'a_e', '-ing'; a second reading: 'oo:2', 'th:2', '-ed:3'
    text: string        // as shown on a tile: 'sh', 'a_e' shows as 'a e' split around the consonant in words
    stage: number
    kind: UnitKind
    sound: string       // one of the 47 sound keys of the asset plan 3.1 ('ae', 'm', 'sh', 'ay', …)
    secondOf?: string   // a second reading: the main unit's id
    /** never starts a word: asked by its last sound (x ck ff ll ss zz ng nk) */
    endOnly: boolean
  }
  export const UNITS: Unit[]; export const unit: (id: string) => Unit; export const unitsOfStage: (s: number) => Unit[]
  export const BLENDS: { id: string; letters: string[]; at: 'start' | 'end'; stage: 5 }[]   // 'st-', '-mp', …
  ```
  `voiceIds.ts` (the asset track names its files by these): `soundVoice(u) = 'snd-' + u.sound`, `letterName(l) = 'ln-' + l`,
  `wordVoice(w) = 'w-' + w`, `heartVoice(w) = 'hw-' + w`, `nonsenseVoice(w) = 'nw-' + w`, `phraseVoice(id) = 'ph-' + id`.
  `SOUND_KEYS`: the 47 sound keys of asset plan 3.1, written out in `units.ts` in that table's order (the asset track
  names its files `snd-<key>`), and every `Unit.sound` is one of them. `ready.ts` is Task 9's (it reads `WORDS`).

- [ ] **Step 1: Write the failing tests** (values from design Part 3 and asset plan 3.1):
  ```ts
  it('70 tracked items: 62 units and 8 second readings', () => {
    expect(UNITS.length).toBe(70); expect(UNITS.filter((u) => u.secondOf).map((u) => u.id).sort())
      .toEqual(['-ed:2', '-ed:3', '-s:2', 'ea:2', 'oo:2', 'ow:2', 'th:2', 'u_e:2'].sort())
  })
  it('47 sound recordings', () => { expect(SOUND_KEYS).toHaveLength(47); expect(new Set(UNITS.map((u) => u.sound))).toEqual(new Set(SOUND_KEYS)) })
  it('each stage has its units', () => {
    expect(unitsOfStage(1).filter((u) => !u.secondOf).map((u) => u.id)).toEqual(['a', 'm', 's', 't', 'p', 'f', 'i', 'n'])
    expect(unitsOfStage(3).map((u) => u.id)).toContain('qu'); expect(UNITS.some((u) => u.id === 'q')).toBe(false)
    expect(unitsOfStage(5)).toEqual([])          // blends are skills, not units
  })
  it('c k ck share /k/', () => expect(new Set(['c', 'k', 'ck'].map((i) => unit(i).sound)).size).toBe(1))
  it('end-only units', () => expect(UNITS.filter((u) => u.endOnly).map((u) => u.id).sort()).toEqual(['ck', 'ff', 'll', 'ng', 'nk', 'ss', 'x', 'zz'].sort()))
  ```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement** from the asset plan's Part 1 headings and 3.1 table.
- [ ] **Step 4: Run** `npm run check && npm test` — PASS. **Step 5: Commit** — "English path: the sound units of the nine stages"

### Task 9: Word lists, sets, chains, phrases, placement rounds, and their checker

The data is a transcription of the asset plan's Part 1 (1.3–1.17, after the 1.18 swaps). **Parallel inside the task:**
one subagent per stage group (1–3, 4–5, 6–7, 8–9) writes its rows; the checker test is written first and shared.

**Files:**
- Create: `src/english/content/words.ts`, `sets.ts`, `chains.ts`, `phrases.ts`, `placementRounds.ts`, `ready.ts`
- Modify: `docs/superpowers/plans/2026-11-16-english-assets.md` (1.3: `I` moves from stage 1 to stage 4, below)
- Test: `src/english/content/content.test.ts`, `src/english/content/ready.test.ts`

**Interfaces:**
- Consumes: `UNITS`, `BLENDS`, `unit()` (Task 8).
- Produces:
  ```ts
  export type WordKind = 'real' | 'picture-only' | 'heart' | 'nonsense'
  export interface EnWord {
    id: string; text: string; kind: WordKind; stage: number
    units: string[]          // unit ids in reading order; 'c a_e k' for cake (the magic e is one unit)
    blends?: string[]        // stage-5 patterns in the word
    picture?: string         // image key; left out when the picture was dropped in review
    uses: string[]           // the asset plan's codes, written as there: 'Tl:m', 'Tw', 'D', 'P★', 'Pd', 'L1', 'G', 'C6', 'S-pic'
  }
  export const WORDS: EnWord[]; export const word: (id: string) => EnWord
  export const LOOKALIKE_LETTERS: { stage: number; letters: string[] }[]      // b d p · n u · m w · h n
  export const GHOST_WORD_SETS: { stage: number; words: string[] }[]
  export const CHAINS: { stage: number; id: 'L1' | 'L2' | 'L3' | 'L4'; words: string[] }[]
  export const PHRASES: { id: string; stage: number; words: string[]; noun: string }[]
  export interface PlacementText { text: string; units: string[]; noVoice: true }
  export const PLACEMENT_ROUNDS: { stage: number; kind: 'picture' | 'name'; target: string; others: (string | PlacementText)[] }[]
  ```
  Placement words marked ° in 1.16 are not in `WORDS`: they are `PlacementText`s inside `PLACEMENT_ROUNDS` only
  (shown, never voiced), so the totals (313 / 102) and the nonsense checks stay as the asset plan counts them. The
  rule "every word shown is in `WORDS`" (Phase 4) leaves them out.
  `ready.ts` (Node-loadable, so it takes its inputs): `contentStages(env: { strict: boolean; voices: ReadonlySet<string> }): number[]`
  — the stages whose content exists (spec Part 10): when `strict` (staging and production builds), a stage whose words
  are in `WORDS` **and** whose sound units' and words' voice ids are all in `voices`; otherwise (dev, test, the verify
  build) every stage with words, so the build can be checked before the audio. Never empty: with no ready stage it is
  `[1]` (a missing clip plays nothing, Global Constraints). `src/english/course.ts` computes `READY_STAGES` once from
  `isStaging`/`import.meta.env` and the keys of `ENGLISH_VOICE_URLS`; the placement and the stage machine use only these. `export const REVIEWED_STAGES: number[] = []`, edited by hand as the parent approves each stage's assets
  (Task 36).
  **Heart word `I`**: the asset plan puts it at stage 1, but spec Part 3 and the Global Constraints show capitals only
  after stage 3 ("and of the word I"). The spec wins: `I` is a stage-4 heart word (stage 1 keeps `the, a, is`; the
  phrases that need it start at stage 4 anyway). Edit asset plan 1.3 to match in this task and say so in the commit.

- [ ] **Step 1: Write the checker test** (asset plan 6.3; design Part 3):
  ```ts
  it('totals', () => { expect(count('real')).toBe(313); expect(count('picture-only')).toBe(38); expect(count('heart')).toBe(33); expect(count('nonsense')).toBe(102); expect(PHRASES.length).toBe(18) })
  it('a word belongs to the stage of its highest unit', () => { for (const w of decodable()) expect(w.stage).toBe(Math.max(...w.units.map(stageOfUnit), ...blendStages(w))) })
  it('units spell the word', () => { for (const w of decodable()) expect(spell(w.units)).toBe(w.text) })   // spell() joins, a_e wraps the next consonant
  it('heart words never in chains, placement, nonsense sets or spelling', () => { … })
  it('a chain rung changes one unit (from stage 5 also adds or drops one consonant), and asks no word twice', () => { … })
  it('placement words differ only in a unit of the round\'s stage, and use no unit above it', () => { … })
  it('a first-sound picture starts with its unit\'s main sound; end-only units by their last sound', () => { … })
  it('nonsense words are not real words, not in the blocklist, and not within one unit of a heart word', () => { … })
  it('spell-book words have at most 5 boxes; phrases are 2–3 words, never a heart word alone', () => { … })
  it('no capital before stage 4: I is a stage-4 heart word', () => { expect(word('I').stage).toBe(4); for (const w of WORDS.filter((w) => w.stage < 4)) expect(w.text).toBe(w.text.toLowerCase()) })
  it('the longest words per stage are the asset plan\'s 1.17', () => {
    for (const [stage, set] of Object.entries(longestPerStage())) expect(set).toEqual(new Set(LONGEST_1_17[+stage]))   // ties ("chick, shell") compare as sets
  })
  it('no Hebrew character anywhere', () => expect(JSON.stringify([WORDS, PHRASES, CHAINS])).not.toMatch(/[֐-׿]/))
  ```
  Every `{ … }` above is written out with its `expect`s (Global Constraints). `longestPerStage(): Record<number, Set<string>>`
  returns every word of the greatest measured length (Task 22 measures; here: the letter count, as 1.17 does).
  `BLOCKLIST` (rude or real-sounding: `bod`, `taip`, `grane`, `birp`, `kog`, `clom`, `jome`) lives in the test.
  `ready.test.ts`: `strict` with no voices → `[1]`; `strict` with every stage-1 and stage-2 id → `[1, 2]`; not strict → 1–9.
- [ ] **Step 2: Run** `npx vitest run src/english/content/content.test.ts` — FAIL.
- [ ] **Step 3: Transcribe** the tables. A row the checker rejects is fixed in the data and listed in the commit
  message for the parent's word-list review (design Part 3: the parent reviews the lists before audio generation).
- [ ] **Step 4: Run** `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: the word lists of all nine stages, with a checker for their rules; which
  stages are ready; heart word I moves to stage 4 (capitals after stage 3)"

### Task 10: English lines and their voice ids  *(parallel with 8)*

**Files:**
- Create: `src/english/data/lines.ts`
- Test: `src/english/data/lines.test.ts`

**Interfaces:**
- Produces: `EN_LINES: { id: string; where: string; en: string[]; variations: number; kind: 'I' | 'D' | 'M'; direction: string; voice?: 'merchant' }[]`,
  `enLine(id)`, `enLineAudioId(id, n)` (`<id>-<n>`, the same ids as Book 2's `data/lines.ts` for every line the run shares, so the
  policies and the controller name lines as before). Texts: asset plan 3.5 (139 texts). No girl forms
  (`FEMININE_IDS` empty for English).

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('every Hebrew line the run plays has an English counterpart with the same variation count', () => {
    for (const id of RUN_LINE_IDS) expect(enLine(id).variations).toBe(lineById(id).variations)   // RUN_LINE_IDS: the ids the controller and policies name, minus line-how-silent
  })
  it('the merchant\'s m-* lines are his voice', () => { for (const l of EN_LINES.filter((l) => l.id.startsWith('m-'))) expect(l.voice).toBe('merchant') })
  it('no "!", no "…", no digits, no Hebrew', () => { for (const t of allTexts()) expect(t).not.toMatch(/[!…0-9֐-׿]/) })
  it('139 texts', () => expect(allTexts().length).toBe(139))
  it('every tower line the English tower plays has an English text', () => {
    for (const id of EN_TOWER_LINE_IDS) expect(enLine(id)).toBeDefined()   // the tower's lines are in the duel's own catalog, not lineById
  })
  ```
  `EN_TOWER_LINE_IDS`: the 13 tower line ids of asset plan 3.5 that `EN_TOWER` (Task 15) and the placement tower play
  through the duel's `DuelAudio` adapter; Task 15 asserts that its content names no other line id.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: the run's lines in English, one for one with Book 2's"

### Task 11: The English stage machine, cycle and run length  *(parallel with 12)*

**Files:**
- Create: `src/english/logic/stages.ts`
- Modify: `src/english/course.ts` (`ENGLISH.stages`), `src/english/store.ts` (`neverPasses` → the English rule)
- Test: `src/english/logic/stages.test.ts`, `src/english/logic/runLength.test.ts`

**Interfaces:**
- Produces: `EN_ORDER: ScreenId[] = ['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'spell', 'draw']`
  (`ScreenId` has `'spell'` since Task 3; the spell screen is built in Task 24 and gets English rounds in Task 25: until
  then a visit to it is a stub like every unbuilt English round), `enScreensOfStage(stage)`,
  `enRecordStageAnswer(p, correct, ready: number[])`, `EN_VISIT` (5 answers per screen; doors 8; tower 2 waves;
  `'draw-hand': 0`, never in the English cycle), `EN_SESSION_LENGTH` (Book 2's numbers), `EN_MAX_STAGE = 9`.
  `ENGLISH.stages.recordStageAnswer` keeps the course type's two arguments: it is
  `(p, ok) => enRecordStageAnswer(p, ok, READY_STAGES)`, and the English store (Task 6's factory) takes the same
  function. `screensOfStage` returns tower, broom, cauldron, ladder, doors, spell and draw at stage 1; ghosts from
  stage 2. Doors' phrases from stage 4 are a round choice (Task 20), not a screen.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('stage 1 has every screen but the ghosts', () => expect(enScreensOfStage(1)).not.toContain('ghosts'))
  it('the ghosts open at stage 2', () => expect(enScreensOfStage(2)).toContain('ghosts'))
  it('5 right first, or 8 of the last 10, pass stages 1–8', () => {
    expect(passAfter('ooooo', 3)).toBe(true); expect(passAfter('oxoooooooo', 3)).toBe(true); expect(passAfter('xxoooooooo', 3)).toBe(true)
    expect(passAfter('ooooo', 9)).toBe(false)
  })
  it('never passes into a stage that is not ready', () => expect(enRecordStageAnswer({ stage: 3, newAnswers: 'oooo' }, true, [1, 2, 3]).passed).toBe(false))
  it('the English store passes stage 4 (the Hebrew rule never does)', () => {
    const p = memoryEnglishSavePort({ stage: { stage: 4, newAnswers: 'oooo' } })
    expect(p.recordAnswer(/* a right answer on a stage-4 unit, new-stage */).passed).toBe(true); expect(p.read().stage.stage).toBe(5)
  })
  ```
  `runLength.test.ts`: simulate 2,000 seeded runs at stage 4 (8 open screens), a mistake rate of 1 in 5, 3 hearts, a
  heart back after a full pass: `expect(mean(screensPerRun)).toBeGreaterThanOrEqual(3)` and
  `expect(share(threeRunsReachAll)).toBeGreaterThan(0.8)`. Reuse the Hebrew run's pass rules from `logic/run.ts`
  (`onAnswer`, `passEndHeart`), so the test also shows that the visit lengths fit (design Part 5, *Run length*).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: its stages, cycle and visit lengths, with a run-length simulation"

### Task 12: Adaptive choice, mix-ups, fast forward and introductions  *(parallel with 11)*

**Files:**
- Create: `src/english/logic/pick.ts`, `src/english/logic/intro.ts`
- Test: `src/english/logic/pick.test.ts`, `src/english/logic/intro.test.ts`

**Interfaces:**
- Produces: `enFeatures(c: Choice, screen: ScreenId): string[]` (the unit ids, the blend patterns, `heart:<w>`);
  `pickUnit(ctx: RoundCtx, pool: Unit[]): Unit` (shared `pickNearTarget` with `NEW_SHARE` on the stage's new units);
  `IntroState = { asked: number; skipped: boolean; after: string; known: boolean }` per unit or heart word, kept in the
  English save's `introSeen` (Task 6) and written only through `EnglishSavePort.setIntro`;
  `introStep(s: IntroState | undefined, answer: 'right' | 'wrong' | null): { state: IntroState; show: 'intro' | 'none' }`;
  `introParts(item: Unit | EnWord, firstOfKind: boolean): string[]` — for a unit: `intro-sound` + the unit's sound + a
  picture word; the first digraph adds `intro-team`, the first blend `intro-blend`, the first silent e `intro-magic-e`,
  the first ending `intro-ending`, a second reading `intro-second`; for a heart word: `intro-heart` + the word.
  The controller's wiring of the introductions is in Task 15's Step B and Tasks 16–20's (the first ask of a new unit
  happens on any screen); when it tracks a skip, `intro-skip` goes in the `ENGLISH` fixture table in that commit.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('a new unit is asked once before its introduction; right skips it, and the next two decide', () => {
    let s = introStep(undefined, null).state                         // asked first, no intro yet
    expect(introStep(s, 'right')).toMatchObject({ show: 'none', state: { skipped: true, known: false } })
    s = introStep(s, 'right').state; s = introStep(s, 'right').state
    expect(introStep(s, 'right').state).toMatchObject({ after: 'oo', known: true })
    expect(introStep(introStep(introStep(undefined, null).state, 'right').state, 'wrong')).toMatchObject({ show: 'intro', state: { known: false } })
  })
  it('a miss on the first ask brings the introduction', () => expect(introStep(introStep(undefined, null).state, 'wrong').show).toBe('intro'))
  it('the first silent e is introduced with the magic-e line', () => expect(introParts(unit('a_e'), true)[0]).toBe('intro-magic-e'))
  it('a heart word is introduced with intro-heart and the word', () => expect(introParts(word('the'), true)).toEqual(['intro-heart', 'hw-the']))
  it('a known unit he starts to miss is picked more', () => {
    const calm = ctxWith({ a: { seen: 20, wrong: 0 } }); const missing = ctxWith({ a: { seen: 20, wrong: 6 } }, { a: 'xxox' })
    expect(share(missing, 'a')).toBeGreaterThan(share(calm, 'a'))     // 1,000 seeded picks each
  })
  ```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: the adaptive choice of units, fast forward inside a stage, and the introductions"

---

## Phase 3 — Placement

### Task 13: The placement walk (pure)

**Files:**
- Modify: `src/english/logic/placement.ts` (Task 6 declared `PlacementState` there; this task adds the functions)
- Test: `src/english/logic/placement.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface PlacementState { asked: number; stage: number; missed: boolean; counts: Record<number, { right: number; wrong: number }>; jumped: number[]; confirming: number[]; kind: 'picture' | 'name' }
  export type PlacementNext = { ask: { stage: number; kind: 'picture' | 'name' } } | { done: { level: number } }
  export function startPlacement(ready: number[]): { state: PlacementState; next: PlacementNext }
  export function stepPlacement(s: PlacementState, right: boolean, ready: number[]): { state: PlacementState; next: PlacementNext }
  /** every unit and every stage-5 blend skill (`BLENDS`, spec Part 3 tracks them) of the stages below `level`: 3 right */
  export function seedAfterPlacement(level: number): Record<string, Tally>
  export function creditOf(w: EnWord, stageUnit: string, right: boolean): { unit: string; right: boolean }[]
  ```
  The walk, as written in design Part 4 (s = the stage asked; the row kind alternates picture, name; stage 1 asks 2
  picture and 4 name rounds):
  - it starts at `min(4, max(ready))` (stage 4 as the spec says; lower only on a staging build where stage 4 is not ready yet);
  - before his first miss: right → s + 2 (at most the highest ready stage); wrong → ask s again (this is his first miss);
  - after it: right → s + 1 if s has 2 right, else ask s again; wrong → if s has 2 wrong and (s = 1 or s − 1 has a
    right), his level is s; if s has 2 wrong otherwise, go to s − 1; with 1 wrong, ask s again;
  - s = the highest ready stage with 2 right: level = that stage;
  - after 15 answers: level = the stage asked;
  - then one confirming round for each stage jumped over below the level, lowest first; a miss makes that stage the level.
  `ready` is `READY_STAGES` (`contentStages()`, Task 9) here and in Task 11. A stage above the highest ready stage is never asked (Review Focus 4).

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('a child who reads everything: 5 answers and 2 confirmations, level 9', () => expect(walk(ALL, 'always-right')).toEqual({ answers: 7, level: 9, asked: [4, 6, 8, 9, 9, 5, 7] }))
  it('a child who misses everything: level 1', () => expect(walk(ALL, 'always-wrong')).toEqual({ answers: 8, level: 1, asked: [4, 4, 3, 3, 2, 2, 1, 1] }))
  it('reads stages 1–4: level 5', () => expect(walk(ALL, readsUpTo(4)).level).toBe(5))
  it('a confirmation miss lowers the level to that stage', () => expect(walk(ALL, rightExceptConfirming(5)).level).toBe(5))
  it('stops after 15 answers (confirmations come after)', () => expect(walk(ALL, alternating).walkAnswers).toBeLessThanOrEqual(15))
  it('only ready stages are asked, from min(4, the highest ready)', () => {
    expect(Math.max(...walk([1, 2, 3], 'always-right').asked)).toBe(3); expect(walk([1, 2, 3], 'always-right').asked[0]).toBe(3)
  })
  it('a right word credits each unit; a miss counts only against the stage\'s unit', () => {
    expect(creditOf(word('ship'), 'sh', true)).toEqual([{ unit: 'sh', right: true }, { unit: 'i', right: true }, { unit: 'p', right: true }])
    expect(creditOf(word('ship'), 'sh', false)).toEqual([{ unit: 'sh', right: false }])
  })
  it('the seed covers the blends below the level', () => expect(seedAfterPlacement(6)['st-']).toMatchObject({ seen: 3, wrong: 0 }))
  ```
  The mock's count for a child who misses everything was 7; the rules as written give 8. Keep 8 and note it in the
  commit; the design leaves the placement's numbers to the builder after this simulation.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: the placement walk, with the mock's simulated children"

### Task 14: The placement in the run

**Files:**
- Create: `src/english/logic/tower.ts` (the placement tower only here; letter and word rounds in Task 15)
- Modify: `src/duel2/controller.ts` (the tower's `placement` view field already exists for Book 2's stage 0: the
  English course drives it through `course.placement`), `src/duel2/course/types.ts`, `src/english/course.ts`,
  `src/english/savePort.ts` / `src/english/store.ts` (only if Task 6's writes need a fix), the `ENGLISH` fixture table
  in `generate.ts` (`placement-start`, `placement-answer`, `placement-done`, in this commit)
- Test: `src/english/placementRun.test.tsx`

**Interfaces:**
- Consumes: Tasks 4, 6, 9, 13.
- Produces: `Course.placement?: { due(save): boolean; tower: TowerContent }` (Hebrew: unset). The placement is **a
  second `TowerContent`**, `EN_PLACEMENT_TOWER`, so the tower keeps one round path (`DuelController.makeRound` →
  `content.makeRound`): its `makeRound` reads the save's `placement.state` through the English port, asks
  `PLACEMENT_ROUNDS` of `stepPlacement`'s next stage and kind, with 3 runes and the picture or the name's voice. While
  `placement.due(save)` (Task 6: `requested || state !== null || done === null`), the run passes
  `EN_PLACEMENT_TOWER` to the tower instead of `ENGLISH.tower.content`. Each answer goes to `stepPlacement` and is saved
  at once with `EnglishSavePort.setPlacement` (`state`); a miss costs no heart and no streak, but the right word glows
  and plays; right answers earn stars and coins; the `?` is hidden. At `done`: `setStage(level)`,
  `seedTallies(seedAfterPlacement(level))`, `openStations` of every station whose stage ≤ level (spec Part 1),
  `setPlacement({ state: null, requested: false, done: { level, answers, at }, runs: runs + 1 })`; the tower visit
  ends and the cycle goes on at the broom.

- [ ] **Step 1: Write the failing tests** (on `memoryEnglishSavePort()`, fake timers, the harness of Task 1):
  ```ts
  it('a fresh English save starts with the placement in the tower, with 3 runes and no hint', async () => {
    const run = startEnglishRun(memoryEnglishSavePort()); await until(() => run.view.screen?.screen === 'tower')
    expect(run.view.screen).toMatchObject({ screen: 'tower', placement: true }); expect(run.view.hintAvailable).toBe(false)
    expect(towerRound(run).runes).toHaveLength(3)
  })
  it('a miss in the placement costs no heart and no streak', async () => {
    const run = await inPlacement(); await towerAnswer(run, 'wrong')
    expect(run.view.hearts).toBe(3); expect(run.view.mult).toBe(1)
  })
  it('a child who reads everything leaves the placement at stage 9', async () => {
    const save = memoryEnglishSavePort(); await placementWith(save, 'always-right')
    expect(save.read().stage.stage).toBe(9); expect(save.read().placement.done).toMatchObject({ level: 9, answers: 7 })
  })
  it('a pause in the middle resumes the walk where it was; a reload does too', async () => {   // Review Focus 3
    const save = memoryEnglishSavePort(); const run = await inPlacement(save); await towerAnswer(run, 'right'); await towerAnswer(run, 'right')
    const asked = save.read().placement.state!.asked
    run.pause(); run.resume(); expect(save.read().placement.state!.asked).toBe(asked)
    const again = startEnglishRun(memoryEnglishSavePort(save.read()))                         // a reload: a new run on the saved state
    await until(() => again.view.screen?.screen === 'tower'); expect(again.view.screen).toMatchObject({ placement: true })
    expect(save.read().placement.state!.asked).toBe(asked)
  })
  it('the placement never runs again on its own', async () => {
    const save = memoryEnglishSavePort(); await placementWith(save, 'always-right')
    const next = startEnglishRun(save); await until(() => next.view.screen?.screen === 'tower')
    expect(next.view.screen).not.toMatchObject({ placement: true })
  })
  ```
  (`startEnglishRun`, `inPlacement`, `placementWith`, `towerAnswer`, `towerRound` are helpers of this test file over
  the Task 1 harness.)
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS; baseline unchanged.
- [ ] **Step 5: Commit** — "English path: the first run's tower is the placement check; its level seeds the stage and the tallies"

---

## Phase 4 — The screens

Each of Tasks 15–20 has two steps:
- **Step A, the builder (pure; parallel across the six tasks):** its own file `src/english/logic/rounds/<screen>.ts`
  (Task 15: `src/english/logic/tower.ts`) and its tests. There is no `rounds.ts` barrel next to the `rounds/` folder:
  `course.ts` imports each `rounds/<screen>.ts` directly.
- **Step B, the wiring (one task at a time, in the order 15 → 20, each on the commit of the one before):** the
  `CourseRounds` member of its screen changes from the Hebrew signature (Task 3) to a course-neutral one that both
  courses fill — the Hebrew adapter in `src/duel2/course/hebrew.ts` maps today's function onto it, and the Task 1
  baseline stays unchanged; the screen's view type in `src/duel2/controller.ts` widens (new fields optional; Hebrew
  values as today; `choiceIdsOf` in the harness learns the new fields); the controller's build and evaluate code for
  that screen reads the neutral shape; the screen component draws the new fields; `src/english/course.ts` puts the
  builder into `ENGLISH.rounds`; and the introductions of Task 12 are wired for that screen. Every new `track(` name
  goes into the `ENGLISH` fixture table in the same commit.
Shared rules each builder's tests check: wrong choices only from opened units; no two choices with the same sound in a
hearing round; never `I` against `l`; a heart word never has a picture; a word without a picture never goes into a
picture round; every word shown is in `WORDS` (the placement's ° texts excepted, Task 9). Each Step B adds one run
test: a seeded English session of its screen (`memoryEnglishSavePort()`) plays three rounds to the end. Each task ends
with `npm run check && npm test` and a commit "English path: the <screen>'s rounds".

### Task 15: The tower's letter and word rounds

**Files:** Step A `src/english/logic/tower.ts`; test `src/english/logic/tower.test.ts`. Step B `src/english/course.ts`
(`ENGLISH.tower = { content: EN_TOWER, tallies: () => englishSavePort().towerTallies(), audio: englishDuelAudio }`),
`src/english/audio.ts` (`englishDuelAudio`: the duel's `DuelAudio` port over the English kit, playing `enLineAudioId`
ids), `src/duel2/controller.ts` / `Play.tsx` only if the tower props need it.
**Interfaces:** Produces `EN_TOWER: TowerContent`. Round kinds: `picture-first` (the monster carries a picture, 4 Latin
runes, tap the first sound's unit; `endOnly` units ask the last sound with `line-how-last`), `sound` (the wizard says
the unit's sound while the monster's bubble glows), `name` (a nonsense name said, 3 word runes), `picture-word`
(stages 6–9, `line-how-word`). `EN_TOWER.makeRound` decides the rune count: 4 letter runes at every wave (the duel's
pad grows to 6 from wave 3 in Hebrew; spec Part 5 says four), 3 word runes. Feedback: unit sound, then the word ("fff.
fox."). `howLine` and `twinParts` give English ids (no `wiz-<mark>`). Monsters never speak. Bosses carry a unit of his
stage or a word. Mega as in Hebrew.
- [ ] Tests: `it('fox asks x by its last sound')`, `it('a unit with no picture is asked by sound')`,
  `it('the feedback is the unit\'s sound then the word')` (voice ids `snd-ks`, `w-fox`), `it('name rounds from stage 2 on, 3 runes')`,
  `it('4 letter runes at wave 3 and later')`, `it('every line id it names is in EN_TOWER_LINE_IDS or a voice id')`,
  `it('an English tower run writes its tallies into alef-english, not alef-progress')`,
  `it('a missing word clip: the feedback still ends and the next monster comes')` (Review Focus 1, `installFakeAudio()`
  with no file for `w-fox`).
- [ ] Run (FAIL) · implement · `npm run check && npm test` (PASS) · commit.

### Task 16: The broom

**Files:** Step A `src/english/logic/rounds/broom.ts`; test `broom.test.ts`. Step B (see Phase 4): `course/types.ts`,
`course/hebrew.ts`, `controller.ts` (`BroomView`), `components/screens/Broom.tsx` (word orbs in Andika), `english/course.ts`.
**Interfaces:** the neutral members `broomTarget(ctx, kind, avoid?, screen?)` and `broomWave(ctx, target, kind)` keep
today's parameters (they are already `Choice`-based; the English course ignores `kind` and decides by stage);
`enBroomTarget(ctx, kind, avoid?, screen?)`, `enBroomWave(ctx, target, kind)` fill them. Early: hear a unit's sound,
fly into its letter. Later: hear a word, catch it among words that differ in one unit (`ship · chip · shop`), built by
`oneUnitApart(word, pool)`; heart words among heart or decodable words.
- [ ] Tests: `it('stage 1 targets are sounds of stage-1 units')`, `it('a word wave differs from its target in one unit')`,
  `it('a heart word wave has no picture')`. Run · implement · check · commit.

### Task 17: The cauldron

**Files:** Step A `src/english/logic/rounds/cauldron.ts`; test `cauldron.test.ts`. Step B: `course/types.ts`,
`course/hebrew.ts`, `controller.ts` (`CauldronView`, the cauldron's build and `evaluate`), `components/screens/Cauldron.tsx`,
`english/course.ts`; `direction.test.tsx` gains the cauldron case (boxes `c _ t` in DOM order under `dir="ltr"`).
**Interfaces:** the neutral member, defined in this task:
`cauldronRound(ctx, avoid?): CauldronRound` with
`CauldronRound = { target: Choice; boxes: Choice[]; gap: number; orbs: Choice[]; becomes?: Choice }` (the word's
parts, the empty box's index, the tiles; `becomes`: the stage-6 word after the thrown `e`). The Hebrew adapter maps
today's `{ letter, target, orbs }` onto it (one box, the letter, `gap` on its mark; orbs as syllable choices of the
same letter), and `CauldronView` keeps `letterId` and `orbs: MarkId[]` for Hebrew while gaining optional `boxes`,
`gap`, `tiles` for English; `evaluate` compares the tapped tile's `soundId` for English and keeps today's mark logic for
Hebrew. `enCauldronRound(ctx): CauldronRound` — the heard word, its units with one empty box, the right unit and 3
wrong tiles; later the missing pair (`_ip` → sh, ch, th); stage 6: `C6` pairs (`kit → kite`), the thrown `e` turns
the word and its picture. After the fix, the word's blend plays (Task 21).
- [ ] Tests: `it('c_t asks a')`, `it('stage 4 asks a digraph as one box')`, `it('stage 6 throws e after cap and the word becomes cape')`,
  `it('cap → cape is word-only (no picture)')`. Run · implement · check · commit.

### Task 18: The ladder

**Files:** Step A `src/english/logic/rounds/ladder.ts`; test `ladder.test.ts`. Step B: `course/types.ts`,
`course/hebrew.ts`, `controller.ts` (`LadderView`), `components/screens/Ladder.tsx` (the marked place, a rung with
one more or one fewer box), `english/course.ts`.
**Interfaces:** the neutral member `ladderPlan(ctx, rungs, force?): LadderPlan` with
`LadderPlan = { fixed?: 'letter' | 'vowel' | 'dot'; marked: boolean; steps: (LadderStep & { at?: number; grow?: 1 | -1 })[] }`
(Hebrew: today's plan, `marked: true`, no `at`/`grow`; `LadderView` gains optional `marked`, `at`, `grow`).
`enLadderPlan(ctx, rungs): LadderPlan` from `CHAINS` (a shorter ladder uses the start of a chain); each step names the
changed position (`at`); `marked` true at stages 1–3, false later; stage 5 on, a rung may add or drop one consonant
(`grow`).
- [ ] Tests: `it('sat → sit marks position 1')`, `it('from stage 4 the place is not marked')`, `it('lip → slip adds one box')`,
  `it('no word twice in a ladder')`. Run · implement · check · commit.

### Task 19: The ghosts

**Files:** Step A `src/english/logic/rounds/ghosts.ts`; test `ghosts.test.ts`; `src/duel2/logic/rounds.ts` (export
`CONFUSION_GROUP_MIN`, private today). Step B: `course/hebrew.ts` only if the member changes, `controller.ts`
(`GhostsView`, the explanation's parts), `components/screens/Ghosts.tsx`, `english/course.ts`.
**Interfaces:** the member keeps today's `Choice`-based shape `ghostRound(ctx, kind, avoid?): { target; signs }`;
`enGhostRound(ctx, kind, avoid?)` fills it: one look-alike set per visit (`LOOKALIKE_LETTERS`, opened when all its letters
are), then his own mix-ups (`confusions.letters`, `CONFUSION_GROUP_MIN`); he hears the sound and picks. Word sets
(`GHOST_WORD_SETS`) later. The look-alike explanation says `explain-letter` + the letter name (`ln-b`) + its sound.
- [ ] Tests: `it('b d p opens at stage 2')`, `it('m w waits for stage 3')`, `it('his own mix-up becomes a set')`,
  `it('never I and l together')`. Run · implement · check · commit.

### Task 20: The doors

**Files:** Step A `src/english/logic/rounds/doors.ts`; test `doors.test.ts`. Step B: `course/types.ts`,
`course/hebrew.ts`, `controller.ts` (`DoorsView`, the doors' build and `evaluateDoor`), `components/screens/Doors.tsx`
(a plate of 2–3 words), `english/course.ts`.
**Interfaces:** the neutral members replace Task 3's `doorWords`/`doorKeys`:
`doorRounds(ctx, n): DoorRound[]` and `doorKeys(ctx, round): DoorKey[]` with
`DoorRound = { id: string; plate: Choice[] /* one per word, in reading order */; key: string /* the answer's picture key */ }`
and `DoorKey = { id: string; picture: string }`. The Hebrew adapter maps today's `Word` (one plate word; its picture
key; the two other door words as keys, the same `rng` draws in the same order), and `DoorsView` gains optional
`plate`/`doorKeys` for English while keeping `word`/`keys: Word[]` for Hebrew. `enDoorRounds(ctx, n)`: single words at
stages 1–3; from stage 4, phrases from `PHRASES` in about half the doors; wrong keys are other nouns' pictures, never
a noun of the phrase. `q-door` (or `q-door-words`) plays only when he waits; the door never says its word.
- [ ] Tests: `it('never a heart word alone on a door')`, `it('a phrase\'s wrong keys are not its noun')`,
  `it('stage 1 doors use stage-2 pictures as wrong keys')`. (Whether the longest phrase fits the plate is Task 22's
  layout check, not a logic test.) Run · implement · check · commit.

### Task 21: The hint blends a word

**Files:**
- Create: `src/english/logic/blend.ts`, `src/duel2/components/BlendWord.tsx`
- Modify: `src/duel2/controller.ts` (the hint and the explanation take a course hook), `src/duel2/course/types.ts`,
  `src/shared/adaptive.ts` (`Tally.helped?: number`), `src/duel2/store.ts` (`recordAnswer({ …, helped })` counts it
  apart from right: `seen` + 1, `helped` + 1, no `wrong`; the Hebrew run never passes `helped`, so its saves do not
  change), `src/english/course.ts`, the `ENGLISH` fixture table (`blend-hint`)
- Test: `src/english/logic/blend.test.ts`, `src/duel2/components/BlendWord.test.tsx`, a run test in `src/english/hintRun.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  // in src/duel2/course/types.ts (the engine and the tower name it; blend.ts imports it)
  export interface BlendPlan { audio: string[]; lights: { unit: number; atMs: number }[]; totalMs: number }
  // in src/english/logic/blend.ts
  export type BlendMethod = (w: EnWord, timing: WordTiming | null) => BlendPlan
  /** the method in use: no slowed audio; the units light in turn while the normal word plays */
  export const lightsOnNormalWord: BlendMethod
  export const BLEND_METHOD: BlendMethod = lightsOnNormalWord
  export interface WordTiming { units: { startMs: number; endMs: number }[]; durationMs: number }
  export const WORD_TIMINGS: Record<string, WordTiming>        // filled by the asset track from forced alignment; empty now
  ```
  Without a timing, the lights split the clip's length (or 700 ms when the clip is missing) evenly by unit, with a
  two-letter unit as one part. `Course.hint?: { plan(screen: ScreenView): BlendPlan[] }` (a single `Choice` cannot name
  every word on a screen): on a screen where he hears the target (broom, cauldron, ladder, spell), the target's plan;
  where he reads to choose (doors, ghost words), one plan per word on screen, left to right. The tower's words are
  Task 21a (the tower's flow is `DuelController`'s). `BlendWord` draws a spark under the word and lights each unit at its
  `atMs` from the voice's real start (the kit's `onSay`/cue), one line under a two-letter unit.
  A word answered after a hint counts as helped (`result: 'helped'` in the event, `helped` in the tally, not right).
  A touch on an answer
  stops it. After a miss: the right word glows and plays; the blend plays too after every second miss on a word screen
  in this visit, once he has made the right move himself. In the placement: no `?`. A later method (a slowed take, the
  units' own sounds) replaces `BLEND_METHOD` only. **`lightsOnNormalWord` is provisional**: it is the spec's last
  fallback (Part 5), chosen only so the hint works while the parent's ear decides the method; say so in the commit
  message and in the report to the parent.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('with no timing, fish lights f, i, sh evenly over the clip', () => expect(lightsOnNormalWord(word('fish'), null).lights.map((l) => l.unit)).toEqual([0, 1, 2]))
  it('with a timing, the lights follow it', () => {
    const t = { units: [{ startMs: 0, endMs: 120 }, { startMs: 120, endMs: 300 }, { startMs: 300, endMs: 520 }], durationMs: 520 }
    expect(lightsOnNormalWord(word('fish'), t).lights.map((l) => l.atMs)).toEqual([0, 120, 300])
  })
  it('the doors\' hint plans every word on the door, left to right', () => {
    expect(ENGLISH.hint!.plan(doorsView(['a', 'red', 'bus'])).map((p) => p.audio[0])).toEqual(['hw-a', 'w-red', 'w-bus'])
  })
  it('a word after a hint counts as helped', async () => {
    const save = memoryEnglishSavePort(); const run = await englishSession(save, 'cauldron'); await hint(run); await answer(run, 'right')
    expect(save.read().tallies[targetUnit(run)]).toMatchObject({ helped: 1 }); expect(save.read().tallies[targetUnit(run)].wrong ?? 0).toBe(0)
  })
  it('the blend plays after every second miss, not every miss', async () => {
    const { blends } = await missTimes(4, 'cauldron'); expect(blends).toEqual([false, true, false, true])
  })
  it('a missing word clip still lights the units and ends', async () => {     // Review Focus 1
    installFakeAudio({ missing: ['w-fish'] }); const r = await playBlend(word('fish'))
    expect(r.lit).toEqual([0, 1, 2]); expect(r.ended).toBe(true)
  })
  ```
  (The helpers are this file's, over the Task 1 harness.)
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS; baseline unchanged.
- [ ] **Step 5: Commit** — "English path: the hint blends a word (its units light while the word plays; this method is
  provisional until the parent picks one, and can be swapped)"

### Task 21a: The tower's words get the hint

The spec's read-to-choose hint covers the tower's word rounds (Part 5, *Which word*), and the tower's flow is in
`DuelController`, which Task 21 does not touch.

**Files:** modify `src/utils/duel/content.ts` (`TowerContent.hint?(r: Round): BlendPlan[]`; `BlendPlan` is declared
in `src/duel2/course/types.ts` by Task 21, which `src/english/logic/blend.ts` also imports, so the engine never names
`src/english/`; `import type` only), `src/utils/duel/controller.ts` (a `?` on the tower only when `content.hint` is set and the round is a word
round; never in the placement tower), `src/duel2/components/screens/Tower.tsx`, `src/english/logic/tower.ts`; test
`src/english/towerHint.test.tsx`
**Interfaces:** `EN_TOWER.hint(r)`: one plan per word rune, left to right; the answer after it counts as helped
through `DuelTallies` and the event's `result: 'helped'`. `HEBREW_TOWER` sets no `hint`: the Hebrew tower has no `?`, as today.
- [ ] Tests: `it('a word round of the English tower shows the ? and plans each rune\'s word')`,
  `it('the placement tower has no ?')`, `it('the Hebrew tower has no ?')` (and `towerBaseline` unchanged). Run · implement ·
  `npm run check && npm test` · commit "English path: the tower's word rounds get the hint blend".

### Task 22: Long words fit their places

**Files:** test `src/english/layout.test.ts`; modify only the layouts that fail (`src/duel2/broomLayout.ts`,
`src/duel2/layout.ts`, the screens' CSS)
**Interfaces:** Consumes the longest words per screen and stage (asset plan 1.17, `longestPerStage()` from Task 9).
- [ ] **Step 1: Write the failing test**: at the project's smallest phone size, 740×360 (the smallest of `SIZES` in
  `src/duel2/layout.test.ts`), and at 1024×768, for each stage, the orbs, runes, ladder plates, door plates (phrase
  "the white sheep", the only phrase-fit check of the plan) and spell-book boxes (5) hold each of the stage's longest
  words (`longestPerStage()`, a set: ties are each checked). There is no measuring helper today: this task writes
  `measureText(text, px): number` in `src/english/testing/measure.ts` from a checked-in table of Andika's advance
  widths in em for `a`–`z`, `A`–`Z` and the space (read once from the font with a script and pasted; jsdom has no text
  layout). The broom's no-overlap geometry test runs with
  `gromping`.
- [ ] Run (FAIL where it does not fit) · fix sizes · `npm run check && npm test` · commit "English path: the longest words fit at phone size".

---

## Phase 5 — The spell book (both languages)

### Task 23: The spell policy (pure)

**Files:** Create `src/duel2/policies/spell.ts`; test `src/duel2/policies/spell.test.ts`
**Interfaces:**
- Produces:
  ```ts
  export interface SpellBox { unit: string; text: string; soundId: string }
  export interface SpellRound { word: string; wordVoice: string; boxes: SpellBox[]; tiles: SpellBox[]; tail?: string; picture?: string; mode: 'tiles' | 'write'; near?: Record<string, string> /* tile → box unit it sounds like */ }
  export function spellVisit(ctx: { round: SpellRound; demo: boolean; at: number }): SpellState
  export function stepSpell(s: SpellState, ev: SpellInput): SpellStep
  ```
  `SpellInput`: `{ type: 'drop'; tile: string; box: number; at }`, `{ type: 'idle'; at }`, `{ type: 'hint'; at }`,
  `{ type: 'voice-end'; at }`. There is no shared effect type: `SpellStep` has the shape of `DrawStep` in
  `policies/draw.ts` (`state`, `view?`, `run?`, `say`, `sfx`, `save`, `track`, `wait?`), and the controller runs it as
  it runs a draw step. Its `track` names (`spell-drop`, `spell-cast`, `spell-near`) go into the `BOOK2_SPELL` and
  `ENGLISH` fixture tables in this commit. Boxes fill left to right
  in the course's direction (the policy works in box order; the view mirrors). A right drop says the unit's sound; the
  full word says the word, plays `spell`, and shows the picture alive. A wrong tile: the mistake flow of the calm screens
  (he fixes it himself). A `near` tile: forgiven once with `spell-near` while the other spelling's tile glows.

- [ ] Tests: `it('each right drop says its unit')`, `it('the last drop casts: the word, the spell effect')`,
  `it('a wrong tile is a mistake he fixes')`, `it('a near tile is forgiven once, the second time it is a mistake')`,
  `it('a drop into a box that is not the next one is refused')`, `it('the demo plays demo-spell once')`.
- [ ] Run (FAIL) · implement · `npm run check && npm test` · commit "Book 2: the spell book's rules as a pure policy".

### Task 24: The spell screen in the run

**Files:** Create `src/duel2/components/screens/SpellBook.tsx`; modify `src/duel2/controller.ts` (`SpellView` in
`ScreenView`, the spell visit runs `stepSpell`), `src/duel2/course/types.ts` (`CourseRounds.spellRound`),
`src/duel2/course/hebrew.ts` (`spellRound: () => null` until Task 26), `src/duel2/screens/Gallery.tsx`,
`src/duel2/screens/Play.tsx`, `src/duel2/assets/images.ts` (`s-book`, falling back to a drawn placeholder while the
sprite is missing), the fixture tables for any new `track(` name; test `src/duel2/components/screens/spell.test.tsx`.
(`ScreenId` has had `'spell'`, with its `VISIT` and `SESSION_LENGTH` entries, since Task 3.)
**Interfaces:** Consumes Task 23. `CourseRounds.spellRound(ctx): SpellRound | null` (null: no spell round possible at
this stage). The open book: the picture on the page where the reading starts (English: left), the boxes on the other;
a two-letter unit is one tile; the Hebrew closing letter is printed faint after the boxes, not a box. Tiles are dragged
with the existing `DragPick` (touch-action none on the stage). The spell screen is not in the Hebrew cycle yet (Task 26
puts it there); the English cycle has held it since Task 11, and Task 25 gives it English rounds (until then its
English visit is a stub, as every unbuilt English round was). The gallery can open it.
- [ ] Tests: `it('renders one box per unit and the tiles')`, `it('a touch drag into the next box sends drop')`,
  `it('the faint tail letter is not a box')`, `it('the gallery opens the spell book with a fixture round, rtl and ltr')`
  (both courses' real rounds come in Tasks 25 and 26), and the
  baseline unchanged.
- [ ] Run · implement · `npm run check && npm test` · commit "Book 2: the spell book screen (not in the Hebrew cycle yet)".

### Task 25: English spell rounds  *(parallel with 26)*

**Files:** `src/english/logic/spell.ts`; test `spell.test.ts`; `src/english/course.ts`
**Interfaces:** `enSpellRound(ctx): SpellRound | null`: a real word (never a heart word, at most 5 boxes); picture at
stages 1–3 (`S-pic`), none from stage 4; `mode: 'write'` from stage 4 once Task 29 lands (until then `'tiles'`); wrong
tiles from learned units, never another spelling of the same sound before stage 9; from stage 9, `near` pairs
(`ee`/`ea`).
- [ ] Tests: `it('cat never offers k')`, `it('stage 9 may offer ea for ee, as a near miss')`, `it('no heart word')`,
  `it('stage 4 has no picture')`. Run · implement · check · commit "English path: spell-book rounds".

### Task 26: The Hebrew spell book  *(parallel with 25)*

The only intended change to the Hebrew path.

**Files:** Create `src/duel2/logic/spell.ts`; modify `src/duel2/logic/stages.ts` (`screensOfStage(4)` adds `'spell'`),
`src/duel2/logic/run.ts` (`ORDER`: spell after doors), `src/duel2/course/hebrew.ts`, `src/duel2/data/lines.ts`
(`demo-spell`, `q-spell` ×3, their `-f` forms), `src/components/home/stations.ts` (a `spell` station
`{ id: 'spell', learn: 'כתיב מילים', pic: 'img' }` between doors and draw); tests `src/duel2/logic/spell.test.ts`,
`src/components/home/home.test.tsx` (mod), `src/duel2/course/course.test.ts` (Task 2's `HEBREW.stages.order`
gains `'spell'` after `'doors'`), the stage-4 snapshots of Task 1
**Interfaces:** `heSpellRound(ctx): SpellRound | null` from door words (`Word.syllables`): one box per consonant-vowel
syllable, `tail` the closing letter; wrong tiles are syllables of opened items that differ in sound
(`sameSound` false), never a same-sound spelling (ת/ט, כּ/ק, ח/כ, ס/שׂ, א/ע, kamatz/patach).
- [ ] **Step 1: Write the failing tests**
  ```ts
  it('בַּיִת: two boxes, ת faint', () => expect(heSpellRound(ctxFor('house'))).toMatchObject({ boxes: [{ text: 'בַּ' }, { text: 'יִ' }], tail: 'ת' }))
  it('a same-sound syllable is never a wrong tile', () => {
    for (const w of DOOR_WORDS_AT_4) for (const t of heSpellRound(ctxFor(w.id))!.tiles) for (const b of heSpellRound(ctxFor(w.id))!.boxes)
      if (t.unit !== b.unit) expect(sameSoundSyl(t, b)).toBe(false)
  })
  it('the spell book opens with the doors (stage 4), after them', () => { expect(screensOfStage(3)).not.toContain('spell'); expect(cycleOf(4, true)).toEqual(['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'spell', 'draw', 'draw-hand']) })
  it('the home path shows the spell station between doors and drawing', () => {
    renderHome(); expect(stationIds()).toEqual([...stationIdsBefore('draw'), 'spell', 'draw', ...stationIdsAfter('draw')])
  })
  ```
  Its new `track(` names, if any, go into `BOOK2_SPELL` (not `BOOK2`, whose goldens keep their bytes).
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.**
- [ ] **Step 4: Update only the stage-4 snapshots** (`npx vitest run src/duel2/course/hebrewBaseline.test.ts -u -t "stage 4"`:
  it matches the session cases `Hebrew <screen> at stage 4` and `the cycle at stage 4`, the `it.each` names of Task 1),
  and check the diff: the only change is the spell visit after the doors. Every stage 1–3 snapshot and the tower
  baseline are unchanged. Update `course.test.ts`'s order line. Then `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "Book 2: the spell book in the Hebrew run, after the doors from stage 4, and its station on the home path"

---

## Phase 6 — Writing

### Task 27: Latin stroke data  *(parallel: lowercase and capitals)*

**Files:** Create `src/english/data/strokes.ts`; test `strokes.test.ts`. (`src/duel2/data/strokes.ts` already exports
`Pt`, `Script`, `StrokeDef` and `LetterDef`; it does not change.)
**Interfaces:** `LATIN_STROKES: LetterDef[]` in the Hebrew format (`variants: StrokeDef[][]` holds every stroke order
the parent approves; `script: 'print'`, since `Script` means print or hand, and the Latin/Hebrew axis is
`alphabet`, Tasks 4, 5 and 28) for `a`–`z` and `A`–`Z` in Andika's shapes, on a box with the four lines (`TOP`, `MID`,
`BASE`, `DESC` y values exported); `isMark(letter, strokeIndex)` true for the dots of `i j` and the bars of `t f`.
- [ ] Tests: `it('52 letters')`, `it('every stroke stays in its box, descenders reach DESC (g j p q y)')`,
  `it('i, j, t, f have their marks')`, `it('single-storey a and g')` (the first stroke of `a` is the bowl). Run ·
  implement · check · commit "English path: stroke data for the Latin letters".

### Task 28: Latin drawing

**Files:** Create `src/english/logic/draw.ts`; modify `src/duel2/logic/drawLayout.ts` (four lines when the alphabet is
Latin), `src/duel2/logic/recognizer.ts` (Latin letters through the existing checker; the marks rule as for Hebrew
nikkud: any order, across neighbouring letters, matched to the nearest missing mark), `src/duel2/policies/draw.ts`
(items from the course), `src/duel2/controller.ts` (`buildDraw` takes the course's `DrawItem`s), `src/duel2/course/types.ts`
and `hebrew.ts` (the neutral `drawWords`, below), `src/english/course.ts`, `src/duel2/screens/Strokes.tsx` (an
`alphabet` choice beside the existing `script`, marks kept in the open course's save); tests
`src/english/logic/draw.test.ts`, `src/duel2/logic/recognizer.test.ts` (new cases only)
**Interfaces:** the neutral member, defined in this task: `drawWords(ctx, n?): DrawItem[]` with
`DrawItem = { letters: string[]; voice: string; firstSound?: string; picture?: string; alphabet: 'hebrew' | 'latin' }`;
the Hebrew adapter maps today's `Word[]` onto it (the draw baseline stays unchanged).
`HAND_ORDER = ['c','a','d','g','o','q','b','h','k','l','t','f','i','j','m','n','r','p','u','e','s','v','w','x','y','z']`;
`enDrawWords(ctx, n?): DrawItem[]` — the first letter of a heard word ("dog." then `snd-d`, never the letter name); from stage
2, sometimes the whole three-letter word in three boxes, only with letters he has written alone (`writtenAlone` from
the tallies); capitals after stage 3. The English cycle has one drawing screen (`draw`); `draw-hand` stays Hebrew.
- [ ] Tests: `it('stage 1 opens the stage-1 letters in hand order: a first, then t, f, i, m, n, p, s')`,
  `it('a whole word only with letters written alone')`, `it('the dot of i is accepted after the next letter')`,
  `it('capitals only after stage 3')`, `it('four lines on the Latin board only')`, and the Hebrew recognizer and draw
  tests unchanged. Run · implement · check · commit "English path: drawing Latin letters on four lines".

### Task 29: The written spell book (stage 4 on)

**Files:** modify `src/duel2/policies/spell.ts`, `src/duel2/components/screens/SpellBook.tsx`, `src/english/logic/spell.ts`;
test `src/duel2/policies/spell.test.ts` (new cases)
**Interfaces:** `mode: 'write'`: one box per letter (not per unit), each checked by the drawing's `LetterChecker` as he
writes it, left to right; `demo-spell-write` on the first written word; a letter that fails is the calm screens' mistake.
Only words whose letters he has written alone.
- [ ] Tests: `it('a written word checks each letter in its box')`, `it('the first written word plays demo-spell-write')`,
  `it('stage 4 words with an unwritten letter stay tiles')`. Run · implement · check · commit "English path: the spell
  book's written words".

---

## Phase 7 — Parent area

### Task 30: The English section: registration, summary, settings, reset, one number range

**Files:** Create `src/english/parent/Settings.tsx`, `reset.ts`, `src/shared/numberRange.ts`; modify
`src/english/parent/index.ts` (Task 7's minimal section, filled now), `src/duel2/parent/Settings.tsx` (the range
control shows `useNumberRange()` and writes `numberRange` **and**, as today, Book 2's `settings.range`, so
`src/duel2/parent/Settings.test.tsx` stays unchanged), `src/duel2/savePort.ts` and `src/english/savePort.ts` (`SavePort.range(): NumberRange`: the store
ports read `numberRange`; `memorySavePort`/`memoryEnglishSavePort` read `initial.settings?.range ?? 100`, as the
existing tests set it), `src/duel2/controller.ts` (the merchant's range from `this.save.range()`, never
`alef-range` directly), the `ENGLISH` fixture table (`range-set` and any other new name); tests
`src/english/parent/parent.test.tsx`, `src/shared/numberRange.test.ts`. (Registration and the depcruise paths for
`src/english/parent/index.ts` are Task 7's.)
**Interfaces:** `englishParent: GameParent = { id: 'english', title: 'English path', saveKey: 'alef-english', logs: [ENGLISH_LOG], Settings, DevTools?, summary, details, mixups, reset }`;
`summary`: `Level ${level} (placement: ${answers} answers, ${date}) · stage ${stage} · runs · best · crystals`.
Settings: the English path on or off (`settings.path`, Task 6's `EnglishSettings`, default on; off hides the home card,
Task 35), the drawing on or off, the number range.
`numberRange.ts`: `alef-range` `{ v: 1, range: 10 | 100 | 1000 }` through `safeSetItem`, seeded once from Book 2's
`settings.range`; `useNumberRange()`, `setNumberRange(r)`. On production the English section shows only where
`ENGLISH_AVAILABLE` (Task 7's registry filter).
- [ ] Tests: `it('the area lists the English section and its log')`, `it('a reset clears alef-english and leaves alef-duel2 byte-equal')`
  (Review Focus 2), `it('the number range is one setting: set in English, Book 2\'s merchant uses it')`,
  `it('the range seeds from an old Book 2 save once')`, `it('turning the path off sets settings.path false')` (the
  card that it hides is Task 35's, and Task 35 tests the hiding). Run · implement · check · commit "English path: its
  section in the parent area; one number range for both paths".

### Task 31: Level, sound units, words

**Files:** Create `src/english/parent/Level.tsx`, `Units.tsx`, `Words.tsx`, `src/english/station.ts`; modify
`src/english/parent/Settings.tsx` (these render inside the English section's lazy `Settings` component: `GameParent`
has no slot for extra sections, and the contract does not change); test `src/english/parent/sections.test.tsx`
**Interfaces:** Level: the found level, answers, date; **Run the placement again** (`setPlacement({ ...p, requested: true })`:
`done` kept as history; the placement is due because `requested` is set, Task 6, so the next run starts with it);
**Start stage** (1–9; `setStage`, `seedTallies` for the units and blends of lower stages, `openStations` for the
stations at or below it). Neither closes a station nor lowers a rating: `openedStations` (Task 6) only grows, and
`src/english/station.ts` (owned here, light: it reads `readEnglishSave()`) gives home
`englishOpenStations(save): ScreenId[]` = the union of `openedStations` and the stations of stages ≤ the current
stage, and `englishStationRatings(save)` from the tallies (as Book 2's station ratings are), which a parent action never lowers:
`seedTallies` only adds, and neither action touches the other counts. Units: one chip per unit (knows / learning now / not seen
yet from the tallies); a tap shows right, wrong, helped and its mix-ups. Words: read with and without a hint, and the
nonsense words. All writes go through `EnglishSavePort`.
- [ ] Tests: `it('a lower start stage keeps every open station and its rating')` (Review Focus 5),
  `it('run the placement again: the next run starts in the placement')`, `it('a unit chip shows helped apart from right')`.
  Run · implement · check · commit "English path: the parent's level, units and words".

### Task 32: The off-screen check

**Files:** Create `src/english/parent/OffScreenCheck.tsx` (shown inside the English `Settings`, as Task 31's parts);
modify `src/duel2/controller.ts` (the run collects the words read in it and, at its end, calls the course hook
`course.onRunEnd?.(words)`; `endRun(ended, score)` itself does not change), `src/duel2/course/types.ts`
(`Course.onRunEnd?`), `src/english/course.ts` (`onRunEnd: (w) => englishSavePort().setLastRunWords(w)`), the
`ENGLISH` fixture table (`parent-check`); test `src/english/parent/offscreen.test.tsx`
**Interfaces:** After each run the section shows that run's words in large print, one at a time, with ✓ / ✗ the parent
taps; each tap tracks `parent-check` `{ word, ok, run }`. Optional; never shown to the child.
- [ ] Tests: `it('shows the last run\'s words')`, `it('a tap tracks parent-check')`, `it('no child screen links to it')`.
  Run · implement · check · commit "English path: the parent's off-screen reading check".

---

## Phase 8 — Telemetry fixtures

### Task 33: The English log's roll-up and fixtures

**Files:** modify `src/english/telemetryLog.ts` (`englishFacts`), `src/shared/__fixtures__/telemetry/generate.ts`
(the `ENGLISH` and `BOOK2_SPELL` tables exist since Task 7 and hold every name the tasks added; this task fills in
realistic fields and the run events the English log shares with Book 2), `src/shared/telemetryGoldens.test.ts` (new
`it`s only); create `src/shared/__fixtures__/telemetry/english-all.golden.json`, `book2-spell.golden.json`; test
`src/english/telemetryLog.test.ts`
**Interfaces:** `englishFacts(events): RollupFact[]` with items `<screen>:<unit or word>`; `result: 'helped'` counts as
help, not right; placement answers as `placement:<stage>`. Check that every new name (for example `placement-start`,
`placement-answer`, `placement-done`, `intro-skip`, `blend-hint`, `spell-drop`, `spell-cast`, `spell-near`,
`parent-check`, `range-set`) is in a generator table: the coverage test has enforced this since Task 7.
- [ ] Tests: the coverage test ("every call-site name is in the generator") still passes;
  `book2-all.golden.json` and `book2-30d.golden.json` unchanged; new `it('English: all')` and
  `it('the Hebrew spell book: all')` (`toMatchFileSnapshot` of the two new goldens); `it('helped is not right in the roll-up')`;
  `it('every English event carries g: english')`. Run · implement · `npm run check && npm test` · commit "English path:
  the roll-up of its log, and the goldens of the English and spell-book events".

---

## Phase 9 — Home and the green skin

### Task 34: The green skin  *(parallel with 35)*

**Files:** modify `src/english/assets/images.ts`, `src/duel2/duel2.css` (`[data-course="en"]` variables: top bar
buttons, runes, letter tiles, panels; Andika for `.latin`), `src/duel2/screens/GlyphSheet.tsx` (`?course=en#/glyphs`:
the course comes from `location.search`, and `Duel2App` compares `location.hash` with `'#/glyphs'` exactly, so the
query goes before the hash; every unit
and letter in Andika, with `I l 1` side by side, test builds only); create `asset-sources/english/README.md` (where
`images.json` and `audio.json` go, the provenance format of `asset-sources/duel2/`); test `src/english/assets/images.test.ts`,
`src/english/noText.test.tsx`
**Interfaces:** `ENGLISH_IMAGES`: for each key of `IMAGES`, the green file `src/english/assets/img/<key>.webp` when it
exists, else the Hebrew file; the monsters, bosses, merchant, potion, coins, hearts, stars and picture words are always
Book 2's. Girl sprites fall back the same way.
- [ ] Tests: `it('a missing green file falls back to the Hebrew one')`, `it('the merchant is never recoloured')`,
  `it('no Hebrew text on any English child screen')` (render each screen's gallery entry with the English course and
  scan the text nodes for `[֐-׿]`), `it('no Latin text on English screens except learning content')` (text
  nodes outside `.latin` learning elements are empty). Run · implement · check · commit "English path: the green look".

### Task 35: The English card and path on home  *(parallel with 34)*

**Files:** Create `src/components/home/EnglishCard.tsx`, `src/components/home/englishStations.ts` (`src/english/station.ts`
is Task 31's: this task runs after it); modify `src/components/home/StationPath.tsx` (`stations`, `dir`, `wizard`
props; the Hebrew call passes today's), `src/pages/Home/HomePage.tsx` (after the Hebrew path: separator, English
card, English path, separator, clock), `src/components/home/home.css`, `.dependency-cruiser.cjs`
(`home-into-english-only-through-its-surface`: `saveFormat`, `station` (the open stations and their ratings come only
from there), `available`, `assets/img`); tests `src/components/home/englishCard.test.tsx`,
`src/pages/Home/HomePage.test.tsx` (new cases), `src/english/stationLink.test.tsx`
**Interfaces:** The card: the picture left, the play button right and pointing right, three green orbs `a`, `sh`, `m`
in Andika; the card picture (green, mirrored) when it exists, else the Hebrew card mirrored by CSS; the girl version
follows the player. The parent line: "**What he learns:** the sound of each letter, blending sounds into words,
spelling, then letter pairs (sh, ch, th), silent e and vowel pairs. The game finds his level in the first run." (girl:
"What she learns"). The path: stations tower, broom, ghosts, cauldron, ladder, doors, spell, draw with the captions of
design Part 1, left to right, the green wizard facing right; a station opens at its stage, all stations at or below the
found level open after the placement, and never close. Links: `duel2/?course=en` and `duel2/?course=en&station=<id>`.
Hidden when `!ENGLISH_AVAILABLE` or the parent turned the path off.
- [ ] Tests: `it('the English card sits after the Hebrew path and before the clock')`, `it('no English card on production')`,
  `it('a fresh device shows the tower station open, the rest closed')`, `it('after a placement at stage 5 every station up to stage 5 opens')`,
  `it('turning the path off hides the card')` (moved here from Task 30), `it('a station link opens that English screen')`
  (`duel2/?course=en&station=doors` on a save at stage 1 opens the English doors session, through Task 7's
  `openScreens(save, course)`), `it('the Hebrew card and path are unchanged')` (the existing home tests, untouched,
  plus the spell station of Task 26).
  Run · implement · check · commit "Home: the English card and its path".

---

## Phase 10 — Gate and finish

### Task 36: Hidden on production

**Files:** modify `src/english/available.ts`, `src/english/content/ready.ts`, `.dependency-cruiser.cjs`; test `src/english/release.test.ts`
**Interfaces:** `ENGLISH_RELEASED` stays `false` until the parent has reviewed all nine stages; `REVIEWED_STAGES`
(Task 9) lists the stages whose assets he approved. Releasing is two edits on `main` (all nine in `REVIEWED_STAGES`,
`ENGLISH_RELEASED = true`), checked on staging, then the usual fast-forward of `release`.
- [ ] **Step 1: Write the failing tests**
  ```ts
  it('released exactly when all nine stages are reviewed', () =>
    expect(ENGLISH_RELEASED).toBe([1, 2, 3, 4, 5, 6, 7, 8, 9].every((s) => REVIEWED_STAGES.includes(s))))
  it('a production build: no card, ?course=en opens Hebrew, no English section', async () => {
    vi.doMock('../english/available', () => ({ ENGLISH_AVAILABLE: false, ENGLISH_RELEASED: false, englishAvailable: () => false }))
    const { HomePage, Duel2App, GAMES } = await importFresh()
    expect(render(<HomePage />).container.querySelector('[data-english-card]')).toBeNull()
    history.replaceState(null, '', '/duel2/?course=en'); render(<Duel2App />)
    expect(await screen.findByTestId('cover')).toHaveAttribute('data-course', 'he')
    expect(GAMES.map((g) => g.id)).not.toContain('english')
  })
  ```
  (`importFresh` re-imports the three modules after `vi.resetModules()`.) The bundle check is a depcruise rule, not a spy: `hebrew-page-never-loads-english-statically` — from
  `^src/duel2/`, `^src/components/`, `^src/pages/`, `^src/parent/` (not tests) to `^src/english/`, allowed only for
  `src/english/(available|saveFormat|station)\\.ts`, `src/english/assets/img/` and `src/english/parent/index\\.ts`
  (the dynamic `import('../../english/course')` of `course/index.ts` is not a static dependency; check that
  depcruise treats it as `dynamic` and exclude only that type).
- [ ] **Step 2: Run** — FAIL where the gate leaks. **Step 3: Fix.** **Step 4: Run** `npm run build` (both `ALEF_STAGING`
  unset and `=1`), then `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: hidden on production until all nine stages are reviewed"

### Task 37: Docs and rules

**Files:** `docs/minigame-rules/` (the three rule changes of the design's *Rule changes* section, in ASD-STE100 style
with reasons); `GLOSSARY.md` (course, English path, sound unit, heart word, nonsense word, placement walk, spell book,
blend); `docs/adr/0008-one-engine-two-courses.md` (why a course seam in one app, and the tower's content seam instead
of a new tower); `src/english/README.md` (where things are, tests, known friction); `CLAUDE.md` (a map row for the
English path; its *Checks* line: `npm run check` is now the type check, lint, dependency-cruiser and knip);
`src/duel2/README.md` (the course seam, the spell book)
- [ ] Write them; `npm run check && npm test` — PASS; commit "English path: rules, glossary, ADR 0008 and READMEs".

### Task 38: The verification pass

- [ ] `npm run check && npm test`; `git diff <Task 1's commit> -- src/duel2/course/__snapshots__ src/utils/duel/__snapshots__`
  (the hash is in the ledger; the snapshots do not exist on `main`) shows only the stage-4 spell insertion.
- [ ] Run `/verify` on the verify build: a fresh English save, the placement at three simulated levels (1, 5, 9), every
  English screen at phone and tablet size with wrong answers, the audio order logged, a screenshot of each step, the
  no-text scan, the glyph sheet `?course=en#/glyphs`, one walking frame of each green sprite; then the Hebrew run from a
  fresh save and from a copied save, with the spell book at stage 4.
- [ ] Record what failed as new tasks; do not hand a build to the parent before this pass is clean (rules: Verification).

---

## Notes for the executor

- **Assumptions this plan makes** where the design leaves a choice: the English tower reuses `DuelController` through a
  content seam (Task 4); the placement's down-walk is as written in the design's table (8 answers for a child who misses
  everything, not the mock's 7: Task 13); the number range moves to a shared child save (Task 30); "content exists" on
  staging means the stages whose words and voice clips exist (`contentStages()`, Task 9; dev and verify builds need
  only the words), and release waits on `REVIEWED_STAGES` (Tasks 9, 36); "after every second miss" counts misses per
  visit; the stroke reviews are a step of the work, not a gate in code; the English cycle has one drawing screen; the
  hint's blend method `lightsOnNormalWord` is provisional (Task 21: the parent's ear decides, spec Part 5); heart word
  `I` is at stage 4 (Task 9: spec Part 3 over the asset plan); the placement starts at `min(4, the highest ready stage)`
  (Task 13).
- **Not in this plan** (the asset track): voice files, timings (`WORD_TIMINGS`), green images, the book sprite, the
  review kit's adapter (host-local). The code reads them when they arrive.
