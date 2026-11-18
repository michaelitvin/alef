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
Read both, then `CLAUDE.md`, `docs/minigame-rules.md`, `src/shared/README.md`, `src/duel2/README.md`,
`src/parent/README.md`, `tools/review/README.md`, ADRs 0001–0007.

## Global Constraints

- The Hebrew path, its saves and its screens behave exactly as before, except for the spell book (Task 26). Every
  existing test stays green **unchanged**; the only Hebrew tests that change on purpose are the ones Task 26 names.
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
- No host names, host paths outside the repo, routes or passwords in any file or commit message.
- Before every commit: `npm run check && npm test`.

## Review Focus

1. **A clip or a picture is missing** (assets are a separate track): the round still plays to its end. A missing word
   clip must not stall a wait on the voice; the hint's lights use the fallback timing. Test: Task 21, Task 15.
2. **One path's save never touches the other's**: opening English on a device with only a Hebrew save creates
   `alef-english` and leaves `alef-duel2` byte-equal; a reset of one leaves the other. Test: Task 6, Task 30.
3. **A pause or a reload in the middle of the placement** resumes it where it was (its answers are in the save), and
   never runs it twice. Test: Task 14.
4. **A stage whose content is not ready yet** (staging): the placement and the stage machine never move into it. Test:
   Task 11, Task 13.
5. **The parent sets a lower start stage or runs the placement again**: no open station closes and no rating goes
   down. Test: Task 31.

## File map

| Area | Files (new unless marked) |
|---|---|
| Course seam | `src/duel2/course/types.ts`, `hebrew.ts`, `index.ts`; `src/duel2/controller.ts` (mod), `src/duel2/useRun.ts` (mod), `src/duel2/Duel2App.tsx` (mod), `src/duel2/testing/runHarness.ts` (moved helpers) |
| Tower seam | `src/utils/duel/content.ts`, `src/utils/duel/controller.ts` (mod), `src/types/duel.ts` (mod), `src/components/duel/SpellPad.tsx`, `RuneGlyph.tsx` (mod) |
| English course | `src/english/course.ts`, `available.ts`, `store.ts`, `saveFormat.ts`, `savePort.ts`, `audio.ts`, `telemetry.ts`, `telemetryLog.ts`, `station.ts`, `README.md` |
| English content | `src/english/content/units.ts`, `words.ts`, `sets.ts`, `chains.ts`, `phrases.ts`, `placementRounds.ts`, `ready.ts`, `voiceIds.ts`; `src/english/data/lines.ts`, `strokes.ts` |
| English logic | `src/english/logic/stages.ts`, `pick.ts`, `intro.ts`, `rounds.ts`, `tower.ts`, `placement.ts`, `blend.ts`, `spell.ts`, `draw.ts` |
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
| 4 The screens | 15–22 | every English screen of the cycle, the hint blend |
| 5 The spell book | 23–26 | the spell book in English and in Hebrew |
| 6 Writing | 27–29 | Latin drawing and the written spell book |
| 7 Parent area | 30–32 | the English section |
| 8 Telemetry fixtures | 33 | goldens and coverage for every new `track(` |
| 9 Home and the green skin | 34–35 | the English card and path, the green look |
| 10 Gate and finish | 36–38 | hidden on production, docs and rules, the QA pass |

**Parallel work** (each line is a set a dispatcher can give to subagents at once, after the tasks before it):
Tasks 4, 5, 6 after Task 3 · Tasks 8, 10 after Task 7 (Task 9 after 8; inside Task 9, one subagent per stage group) ·
Tasks 11, 12 after Task 9 · Tasks 15–20 after Task 14 (one per screen) · Tasks 25, 26 after Task 24 · Tasks 27 and 30–32
after Task 24 · Tasks 34, 35 after Task 30. Tasks 21, 22, 33, 36–38 are sequential.

---

## Phase 1 — The course seam

### Task 1: The Hebrew baseline

The regression net for everything after it: snapshots of what the Hebrew path does today, taken before any change.

**Files:**
- Create: `src/duel2/testing/runHarness.ts` (move `until`, `drain`, `proceed` and the store reset from the top of
  `src/duel2/useRun.test.tsx`; `useRun.test.tsx` imports them; no behaviour change)
- Test: `src/duel2/course/hebrewBaseline.test.ts`, snapshots in `src/duel2/course/__snapshots__/`

**Interfaces:**
- Produces: `runHarness.ts` exports `until`, `drain`, `proceed`, `resetRunStore()`, and
  `recordSession(opts: RunOpts, answer: (view: View) => 'right' | 'wrong'): Promise<SessionLog>` where
  `SessionLog = { voice: string[]; events: { e: string; screen?: string; target?: string }[]; views: string[] }`
  (`views` = `${screen}:${phase}:${choiceIds}` per change).

- [ ] **Step 1: Write the baseline test.** For each Hebrew screen (`broom`, `cauldron`, `ladder`, `ghosts`, `doors`,
  `draw`, `draw-hand`) and each stage 1–4 where it is open, a seeded `session: { screen }` run (`rng` = mulberry32 seed
  7, `memorySavePort()`, fake timers, `installFakeAudio()`), answering right, right, wrong, right…:
  ```ts
  it.each(CASES)('Hebrew %s at stage %i', async (screen, stage) => {
    const log = await recordSession({ session: { screen }, force: { screen, stage }, rng: seeded(7) }, alternate(3))
    expect(log).toMatchSnapshot()
  })
  it('the cycle of each stage', () => {
    for (const st of [1, 2, 3, 4] as const) expect(cycleOf(st, true)).toMatchSnapshot()
  })
  it('a fresh Hebrew save', () => expect(JSON.stringify(memorySavePort().read())).toMatchSnapshot())
  ```
- [ ] **Step 2: Run it**: `npx vitest run src/duel2/course/hebrewBaseline.test.ts` — writes the snapshots. Run it a
  second time: PASS (the harness is deterministic).
- [ ] **Step 3: Run** `npm run check && npm test` — PASS (only the helper move changed).
- [ ] **Step 4: Commit** `git add src/duel2/testing src/duel2/course src/duel2/useRun.test.tsx` —
  "Book 2: a baseline of the Hebrew sessions and cycles, before the course seam; the run tests' helpers move to testing/"

The stage-4 snapshots and the stage-4 cycle are the only ones Task 26 may update. A later diff in any other snapshot
is a Hebrew regression.

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
    game: 'book2' | 'english'
    dir: 'rtl' | 'ltr'
    stages: CourseStages
    rounds: CourseRounds          // Task 3 fills in the members
    tower: TowerContent           // Task 4
    audio: CourseAudio            // the kit instance's sayParts, say, sayInfo, stopVoice, playSfx, startMusic, stopMusic, voiceSignal, cancelVoice
    telemetry: ReturnType<typeof createTelemetry>
    save: () => SavePort          // lazy: the English store is created only on the English page
    images: Record<string, string>
    lineAudioId(id: string, n?: number): string
  }
  ```
  `hebrew.ts`: `export const HEBREW: Course` built from today's modules (`logic/stages`, `logic/run`, `logic/rounds`,
  `audio/duel2Audio`, `telemetry`, `storeSavePort`, `assets/images`, `data/lines`). `index.ts`:
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
    expect(HEBREW.stages.screensOfStage(2)).toEqual(screensOfStage(2))
    expect(HEBREW.stages.order).toEqual(['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'draw', 'draw-hand'])
    expect(HEBREW.telemetry).toBe(duel2Telemetry); expect(HEBREW.dir).toBe('rtl')
  })
  it('production sees no English until it is released', () => {
    expect(englishAvailable({ staging: false, dev: false, test: false, released: false })).toBe(false)
    expect(englishAvailable({ staging: true, dev: false, test: false, released: false })).toBe(true)
    expect(englishAvailable({ staging: false, dev: false, test: false, released: true })).toBe(true)
  })
  ```
- [ ] **Step 2: Run** `npx vitest run src/duel2/course src/english/available.test.ts` — FAIL (modules missing).
- [ ] **Step 3: Implement** the three modules. `ORDER`, `VISIT`, `SESSION_LENGTH` move from `logic/run.ts` behind
  `HEBREW.stages` by re-export (the old exports stay for their callers).
- [ ] **Step 4: Run** the tests, then `npm run check && npm test` — PASS, baseline unchanged.
- [ ] **Step 5: Commit** — "Book 2: a course type, the Hebrew course over today's modules, and ?course=en behind the English gate"

### Task 3: The run takes its course

**Files:**
- Modify: `src/duel2/controller.ts`, `src/duel2/logic/run.ts` (`cycleOf`, `nextScreen`, `runStart` take `CourseStages`
  as their last parameter, default `HEBREW.stages`), `src/duel2/logic/rounds.ts` (types only), `src/duel2/useRun.ts`,
  `.dependency-cruiser.cjs`
- Test: `src/duel2/course/seam.test.ts`

**Interfaces:**
- Consumes: `Course`, `HEBREW` (Task 2).
- Produces: `RunOpts.course?: Course` (default `HEBREW`). `CourseRounds` holds every content function the controller
  calls today, with today's signatures, with `stage: number` where they take a stage (`HEBREW` narrows):
  `broomTarget`, `broomWave`, `cauldronRound`, `ghostRound`, `ladderPlan`, `isNewStageChoice`, `letterChoice`,
  `features(c: Choice, screen: ScreenId): string[]`, `doorWords(ctx: RoundCtx, n: number): Word[]`,
  `wordLinkFor`, `dotIntroFor` (Hebrew only; English returns `null`), `drawWords`, `bossTarget`, `bossWave`.
  `Choice.kind` widens to `'letter' | 'syllable' | 'unit' | 'word'`; `Choice` gains optional `units?: string[]` (the
  sound units of a word, for the blend and the spell book), `picture?: string`, `heart?: true`, `nonsense?: true`.
  Hebrew choices do not change.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('the run asks its course for rounds', async () => {
    const spy = vi.fn(HEBREW.rounds.cauldronRound)
    const course = { ...HEBREW, rounds: { ...HEBREW.rounds, cauldronRound: spy } }
    await recordSession({ course, session: { screen: 'cauldron' }, force: { screen: 'cauldron', stage: 2 } }, alternate(3))
    expect(spy).toHaveBeenCalled()
  })
  it('the run tracks through its course\'s log', async () => { /* a course with a fake telemetry gets every event */ })
  ```
  Add the depcruise rule `run-engine-is-course-free`: from `^src/duel2/(controller|logic/|policies/)` and
  `^src/utils/duel/`, not to `^src/english/`.
- [ ] **Step 2: Run** `npx vitest run src/duel2/course/seam.test.ts` — FAIL.
- [ ] **Step 3: Implement.** Replace every direct content, audio, telemetry and save import of `controller.ts` with
  `this.course.…` (the default save is `this.course.save()`). No logic moves; only the source of each call.
- [ ] **Step 4: Run** `npm run check && npm test` — PASS; `hebrewBaseline.test.ts` snapshots unchanged.
- [ ] **Step 5: Commit** — "Book 2: the run takes its content, audio, log and save from its course (the Hebrew course by default)"

### Task 4: The tower takes its content  *(parallel with 5, 6)*

The English tower is the first duel's board with English rounds, so the waves, bosses, monsters and the mega spell are
the same code (ADR 0002). A content seam in `DuelController`, not a new screen.

**Files:**
- Create: `src/utils/duel/content.ts`
- Modify: `src/utils/duel/controller.ts`, `src/utils/duel/rules.ts`, `src/types/duel.ts`, `src/hooks/useDuelGame.ts`,
  `src/components/duel/SpellPad.tsx`, `src/components/duel/RuneGlyph.tsx`, `src/duel2/components/screens/Tower.tsx`
- Test: `src/utils/duel/content.test.ts`; the ADR 0002 list must stay green unchanged (`Tower.test.tsx`, the tower part of
  `useRun.test.tsx`, `src/utils/duel/controller*.test.ts`, `src/hooks/useDuelGame.test.tsx`)

**Interfaces:**
- Produces:
  ```ts
  export interface TowerRune { id: string; text: string; script: 'nikkud' | 'latin' }
  export interface TowerContent {
    makeRound(o: MakeRoundOpts): Round
    isCorrect(r: Round, c: Choice): boolean
    isTwin(r: Round, c: Choice): boolean
    /** the voice ids of a round's question and of its feedback, in order */
    questionParts(r: Round): string[]
    feedbackParts(r: Round, plan: FeedbackPlan): string[]
    runeOf(r: Round, i: number): TowerRune
  }
  export const HEBREW_TOWER: TowerContent
  ```
  `DuelOpts.content?: TowerContent` (default `HEBREW_TOWER`); `DuelOpts.audio` and `telemetry` already exist. `Round`
  gains optional `picture?: string` and `runeTexts?: TowerRune[]`; Hebrew rounds leave them unset.
  `Tower.tsx` takes `content`, `audio`, `telemetry` and a store from `view` / the course (it reads `useDuel2Store` today).

- [ ] **Step 1: Write the failing test**: a fake `TowerContent` with Latin runes `['m','s','t','a']`, target `m`: the
  pad renders 4 buttons with those texts (`data-correct` on `m`), a tap on `m` reports `onAnswer('right', 'm')`, and
  the controller says `content.feedbackParts(...)` in order (fake audio log).
- [ ] **Step 2: Run** `npx vitest run src/utils/duel/content.test.ts` — FAIL.
- [ ] **Step 3: Implement** `HEBREW_TOWER` from today's `makeRound`, `isCorrect`, `isTwin` and the controller's spoken
  parts (moved, not changed); the controller calls `this.content.*`. `RuneGlyph` draws `script: 'latin'` as plain text
  in Andika.
- [ ] **Step 4: Run** `npm run check && npm test` — PASS; the ADR 0002 tests and the baseline unchanged.
- [ ] **Step 5: Commit** — "First duel: the tower takes its rounds and spoken parts from a content seam (Hebrew by default)"

### Task 5: The screens follow the course's direction  *(parallel with 4, 6)*

**Files:**
- Modify: `src/duel2/components/screens/Stage.tsx`, `Cauldron.tsx`, `Ladder.tsx`, `Doors.tsx`, `Ghosts.tsx`, `Broom.tsx`,
  `src/duel2/components/Glyph.tsx`, `src/duel2/screens/Play.tsx`, `src/duel2/viewTypes.ts`
- Test: `src/duel2/components/screens/direction.test.tsx`

**Interfaces:**
- Produces: `View.course: { id: CourseId; dir: 'rtl' | 'ltr' }`; `.d2-root` gets `dir` and `data-course`. `Glyph`
  takes `script: 'hebrew' | 'latin'` (Latin: Andika, no nikkud handling). Word plates, cauldron boxes, ladder rungs and
  the doors' plates lay their parts out in `dir` order. Positions of the wizard, monsters and orbs do not change
  (design Part 2, *Facing*).

- [ ] **Step 1: Write the failing test**: a cauldron view with `dir: 'ltr'` and boxes `c _ t` renders the boxes in DOM
  and visual order c, _, t (`getBoundingClientRect` order by `left` under a fixed layout mock); the same view with
  `dir: 'rtl'` keeps today's order; `data-course="en"` is on the root.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS, baseline unchanged.
- [ ] **Step 5: Commit** — "Book 2: the screens lay out words in the course's direction"

### Task 6: The English save and its own purse  *(parallel with 4, 5)*

**Files:**
- Modify: `src/duel2/store.ts` (a factory; `useDuel2Store` stays the same object, key, version and migrations),
  `src/duel2/logic/stages.ts` (`StageProgress.stage: number`)
- Create: `src/english/store.ts`, `src/english/saveFormat.ts`, `src/english/savePort.ts`
- Test: `src/english/store.test.ts`

**Interfaces:**
- Produces: `createRunStore(o: { key: string; version: number; migrate: (s: unknown, v: number) => unknown; initial?: Partial<Duel2Save> })`;
  `useEnglishStore = createRunStore({ key: 'alef-english', version: 1, migrate: (s) => s, initial: ENGLISH_FRESH })`.
  `EnglishSave = Duel2Save & { placement: PlacementSave | null }` with
  `PlacementSave = { state: PlacementState | null; done: { level: number; answers: number; at: number } | null; runs: number }`
  (`PlacementState`: Task 13). `ENGLISH_FRESH`: `coins: 0`, `bookOpen: true`, `stage: { stage: 1, newAnswers: '' }`,
  `placement: { state: null, done: null, runs: 0 }`. `englishSavePort()`, `memoryEnglishSavePort(initial?)`.
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
    expect(memoryEnglishSavePort().read()).toMatchObject({ coins: 0, bookOpen: true, stage: { stage: 1 }, placement: { done: null } })
  })
  it('the Hebrew store is unchanged', () => { expect(useDuel2Store.persist.getOptions().name).toBe('alef-duel2'); expect(useDuel2Store.persist.getOptions().version).toBe(7) })
  ```
- [ ] **Step 2: Run** `npx vitest run src/english/store.test.ts` — FAIL. **Step 3: Implement.**
- [ ] **Step 4: Run** `npm run check && npm test` — PASS (`src/duel2/store.test.ts` unchanged).
- [ ] **Step 5: Commit** — "English path: its own save (alef-english) with its own purse, from Book 2's store factory"

### Task 7: The English page: shell, audio, log, play time

**Files:**
- Create: `src/english/course.ts`, `src/english/audio.ts`, `src/english/telemetry.ts`, `src/english/telemetryLog.ts`,
  `src/english/assets/audioFiles.ts`, `src/english/assets/images.ts`, `src/english/assets/preload.ts`, `.gitkeep`s
- Modify: `src/duel2/Duel2App.tsx`, `src/shared/playtime.ts` (`'english'`), `src/parent/types.ts` (`GameId` `'english'`)
- Test: `src/english/page.test.tsx`

**Interfaces:**
- Consumes: Tasks 2–6.
- Produces: `ENGLISH: Course` (content members are stubs that throw `not built` until Phase 2; `stages` from Task 11
  replaces them). `ENGLISH_LOG: TelemetryLog = { key: 'alef-english-telemetry', label: 'English path', game: 'english', about, rollup }`
  (rollup filled in Task 33). `englishAudio = createGameAudio({ game: 'english', voices: ENGLISH_VOICE_URLS, sfx: SFX_URLS, music: MUSIC_URLS, … })`
  with Book 2's numbers and effect files; `ENGLISH_VOICE_URLS` from `import.meta.glob('./audio/voice/*.mp3')` (empty for
  now). `ENGLISH_IMAGES`: Task 34; until then `IMAGES`. `Duel2App` reads `courseIdFromUrl(location.search, ENGLISH_AVAILABLE)`,
  loads the course before the shell, and uses the course's preload, ask-gender pictures, log, `usePlaytime(course.game, …)`
  and `ParentArea game={course.id === 'en' ? 'english' : 'book2'}`. The `HomeButton` is already on every run screen.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('?course=en opens the English cover', async () => {
    history.replaceState(null, '', '/duel2/?course=en'); render(<Duel2App />)
    expect(await screen.findByTestId('cover')).toHaveAttribute('data-course', 'en')
  })
  it('the English page tracks into its own log', async () => { /* a gender pick → event in alef-english-telemetry with g: 'english', none in alef-duel2-telemetry */ })
  it('the Hebrew page is the same as before', async () => { history.replaceState(null, '', '/duel2/'); render(<Duel2App />); expect(await screen.findByTestId('cover')).toHaveAttribute('data-course', 'he') })
  it('play time counts under english', () => { expect(PLAYTIME_GAMES).toContain('english') })
  ```
  Use the existing test id of the cover if it has one; else add `data-testid="cover"` to `Cover.tsx`.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: ?course=en opens its own page in Book 2's app (its shell, audio kit, log and play time)"

---

## Phase 2 — Content and stages

### Task 8: Sound units and stages  *(parallel with 10)*

**Files:**
- Create: `src/english/content/units.ts`, `src/english/content/voiceIds.ts`, `src/english/content/ready.ts`
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
  `ready.ts`: `contentStages(): number[]` (the stages that have words in `WORDS`; after Task 9, all nine) — the placement
  and the stage machine use only these (design Part 10: on staging, only the stages whose content exists); and
  `export const REVIEWED_STAGES: number[] = []`, edited by hand as the parent approves each stage's assets (Task 36).

- [ ] **Step 1: Write the failing tests** (values from design Part 3 and asset plan 3.1):
  ```ts
  it('70 tracked items: 62 units and 8 second readings', () => {
    expect(UNITS.length).toBe(70); expect(UNITS.filter((u) => u.secondOf).map((u) => u.id).sort())
      .toEqual(['-ed:2', '-ed:3', '-s:2', 'ea:2', 'oo:2', 'ow:2', 'th:2', 'u_e:2'].sort())
  })
  it('47 sound recordings', () => expect(new Set(UNITS.map((u) => u.sound)).size).toBe(47))
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
- Create: `src/english/content/words.ts`, `sets.ts`, `chains.ts`, `phrases.ts`, `placementRounds.ts`
- Test: `src/english/content/content.test.ts`

**Interfaces:**
- Consumes: `UNITS`, `BLENDS`, `unit()` (Task 8).
- Produces:
  ```ts
  export type WordKind = 'real' | 'picture-only' | 'heart' | 'nonsense'
  export interface EnWord {
    id: string; text: string; kind: WordKind; stage: number
    units: string[]          // unit ids in reading order; 'c a_e k' for cake (the magic e is one unit)
    blends?: string[]        // stage-5 patterns in the word
    picture?: string         // image key (null when dropped in review)
    uses: string[]           // the asset plan's codes: 'Tl:m', 'Tw', 'D', 'P*', 'Pd', 'L1', 'G', 'C6', 'S-pic'
  }
  export const WORDS: EnWord[]; export const word: (id: string) => EnWord
  export const LOOKALIKE_LETTERS: { stage: number; letters: string[] }[]      // b d p · n u · m w · h n
  export const GHOST_WORD_SETS: { stage: number; words: string[] }[]
  export const CHAINS: { stage: number; id: 'L1' | 'L2' | 'L3' | 'L4'; words: string[] }[]
  export const PHRASES: { id: string; stage: number; words: string[]; noun: string }[]
  export const PLACEMENT_ROUNDS: { stage: number; kind: 'picture' | 'name'; target: string; others: string[] }[]
  ```
  Placement words marked ° in 1.16 are `kind: 'nonsense'` or `'real'` with no voice and `uses: ['Pd°']`.

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
  it('the longest word per stage is the asset plan\'s 1.17', () => expect(longestPerStage()).toEqual(LONGEST_1_17))
  it('no Hebrew character anywhere', () => expect(JSON.stringify([WORDS, PHRASES, CHAINS])).not.toMatch(/[֐-׿]/))
  ```
  `BLOCKLIST` (rude or real-sounding: `bod`, `taip`, `grane`, `birp`, `kog`, `clom`, `jome`) lives in the test.
- [ ] **Step 2: Run** `npx vitest run src/english/content/content.test.ts` — FAIL.
- [ ] **Step 3: Transcribe** the tables. A row the checker rejects is fixed in the data and listed in the commit
  message for the parent's word-list review (design Part 3: the parent reviews the lists before audio generation).
- [ ] **Step 4: Run** `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: the word lists of all nine stages, with a checker for their rules"

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
  ```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: the run's lines in English, one for one with Book 2's"

### Task 11: The English stage machine, cycle and run length  *(parallel with 12)*

**Files:**
- Create: `src/english/logic/stages.ts`
- Modify: `src/english/course.ts` (`ENGLISH.stages`)
- Test: `src/english/logic/stages.test.ts`, `src/english/logic/runLength.test.ts`

**Interfaces:**
- Produces: `EN_ORDER: ScreenId[] = ['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'spell', 'draw']`
  (`ScreenId` gains `'spell'` in Task 24; until then the test uses the string), `enScreensOfStage(stage)`,
  `enRecordStageAnswer(p, correct, ready: number[])`, `EN_VISIT` (5 answers per screen; doors 8; tower 2 waves),
  `EN_SESSION_LENGTH` (Book 2's numbers), `EN_MAX_STAGE = 9`. `screensOfStage` returns tower, broom, cauldron, ladder,
  doors, spell and draw at stage 1; ghosts from stage 2. Doors' phrases from stage 4 are a round choice (Task 20), not
  a screen.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('stage 1 has every screen but the ghosts', () => expect(enScreensOfStage(1)).not.toContain('ghosts'))
  it('the ghosts open at stage 2', () => expect(enScreensOfStage(2)).toContain('ghosts'))
  it('5 right first, or 8 of the last 10, pass stages 1–8', () => {
    expect(passAfter('ooooo', 3)).toBe(true); expect(passAfter('oxoooooooo', 3)).toBe(true); expect(passAfter('xxoooooooo', 3)).toBe(true)
    expect(passAfter('ooooo', 9)).toBe(false)
  })
  it('never passes into a stage that is not ready', () => expect(enRecordStageAnswer({ stage: 3, newAnswers: 'oooo' }, true, [1, 2, 3]).passed).toBe(false))
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
  `IntroState = { asked: number; skipped: boolean; after: string }` per unit in the save's `dotIntrosSeen`-like field
  `introSeen: Record<string, IntroState>`; `introStep(s: IntroState | undefined, answer: 'right' | 'wrong' | null): { state: IntroState; show: 'intro' | 'none' }`;
  `introParts(u: Unit, firstOfKind: boolean): string[]` — `intro-sound` + the unit's sound + a picture word; the first
  digraph adds `intro-team`, the first blend `intro-blend`, the first silent e `intro-magic-e`, the first ending
  `intro-ending`, a second reading `intro-second`, a heart word `intro-heart`.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('a new unit is asked once before its introduction; right skips it, and the next two decide', () => {
    let s = introStep(undefined, null).state                         // asked first, no intro yet
    expect(introStep(s, 'right')).toMatchObject({ show: 'none', state: { skipped: true } })
    s = introStep(s, 'right').state; s = introStep(s, 'right').state
    expect(introStep(s, 'right').state.after).toBe('oo')             // known
    expect(introStep(introStep(introStep(undefined, null).state, 'right').state, 'wrong').show).toBe('intro')
  })
  it('a miss on the first ask brings the introduction', () => expect(introStep(introStep(undefined, null).state, 'wrong').show).toBe('intro'))
  it('the first silent e is introduced with the magic-e line', () => expect(introParts(unit('a_e'), true)[0]).toBe('intro-magic-e'))
  it('a known unit he starts to miss is picked more', () => { … })
  ```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: the adaptive choice of units, fast forward inside a stage, and the introductions"

---

## Phase 3 — Placement

### Task 13: The placement walk (pure)

**Files:**
- Create: `src/english/logic/placement.ts`
- Test: `src/english/logic/placement.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface PlacementState { asked: number; stage: number; missed: boolean; counts: Record<number, { right: number; wrong: number }>; jumped: number[]; confirming: number[]; kind: 'picture' | 'name' }
  export type PlacementNext = { ask: { stage: number; kind: 'picture' | 'name' } } | { done: { level: number } }
  export function startPlacement(ready: number[]): { state: PlacementState; next: PlacementNext }
  export function stepPlacement(s: PlacementState, right: boolean, ready: number[]): { state: PlacementState; next: PlacementNext }
  export function seedAfterPlacement(level: number): Record<string, Tally>    // every unit of stages < level: 3 right
  export function creditOf(w: EnWord, stageUnit: string, right: boolean): { unit: string; right: boolean }[]
  ```
  The walk, as written in design Part 4 (s = the stage asked; the row kind alternates picture, name; stage 1 asks 2
  picture and 4 name rounds):
  - before his first miss: right → s + 2 (at most the highest ready stage); wrong → ask s again (this is his first miss);
  - after it: right → s + 1 if s has 2 right, else ask s again; wrong → if s has 2 wrong and (s = 1 or s − 1 has a
    right), his level is s; if s has 2 wrong otherwise, go to s − 1; with 1 wrong, ask s again;
  - s = the highest ready stage with 2 right: level = that stage;
  - after 15 answers: level = the stage asked;
  - then one confirming round for each stage jumped over below the level, lowest first; a miss makes that stage the level.
  `ready` is `contentStages()` (Task 8) here and in Task 11. A stage above the highest ready stage is never asked (Review Focus 4).

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('a child who reads everything: 5 answers and 2 confirmations, level 9', () => expect(walk(ALL, 'always-right')).toEqual({ answers: 7, level: 9, asked: [4, 6, 8, 9, 9, 5, 7] }))
  it('a child who misses everything: level 1', () => expect(walk(ALL, 'always-wrong')).toEqual({ answers: 8, level: 1, asked: [4, 4, 3, 3, 2, 2, 1, 1] }))
  it('reads stages 1–4: level 5', () => expect(walk(ALL, readsUpTo(4)).level).toBe(5))
  it('a confirmation miss lowers the level to that stage', () => { … })
  it('stops after 15 answers (confirmations come after)', () => expect(walk(ALL, alternating).walkAnswers).toBeLessThanOrEqual(15))
  it('only ready stages are asked', () => expect(Math.max(...walk([1, 2, 3], 'always-right').asked)).toBe(3))
  it('a right word credits each unit; a miss counts only against the stage\'s unit', () => { … })
  ```
  The mock's count for a child who misses everything was 7; the rules as written give 8. Keep 8 and note it in the
  commit; the design leaves the placement's numbers to the builder after this simulation.
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: the placement walk, with the mock's simulated children"

### Task 14: The placement in the run

**Files:**
- Create: `src/english/logic/tower.ts` (placement rounds only here; letter and word rounds in Task 15)
- Modify: `src/duel2/controller.ts` (the tower's `placement` view field already exists for Book 2's stage 0: the
  English course drives it through `course.placement`), `src/duel2/course/types.ts`, `src/english/course.ts`
- Test: `src/english/placementRun.test.tsx`

**Interfaces:**
- Consumes: Tasks 4, 6, 9, 13.
- Produces: `Course.placement?: { due(save): boolean; round(save, rng): Round; answer(save, right: boolean): PlacementSave; done(save): number | null }`
  (Hebrew: unset). `enPlacementRound(stage, kind, rng): Round` from `PLACEMENT_ROUNDS` with 3 runes and the picture or
  the name's voice. The run: on a fresh English save, the first run's tower is the placement; each answer goes to
  `stepPlacement` and is saved at once (`placement.state`); a miss costs no heart and no streak, but the right word glows
  and plays; right answers earn stars and coins; the `?` is hidden. At `done`: `stage = level`, tallies seeded,
  `placement.done = { level, answers, at }`, `placement.runs += 1`; the tower visit ends and the cycle goes on at the
  broom.

- [ ] **Step 1: Write the failing tests** (on `memoryEnglishSavePort()`, fake timers, the harness of Task 1):
  ```ts
  it('a fresh English save starts with the placement in the tower, with 3 runes and no hint', async () => { … expect(view.screen).toMatchObject({ screen: 'tower', placement: true }); expect(view.hintAvailable).toBe(false) })
  it('a miss in the placement costs no heart and no streak', async () => { … expect(view.hearts).toBe(3) })
  it('a child who reads everything leaves the placement at stage 9', async () => { … expect(save.read().stage.stage).toBe(9) })
  it('a pause in the middle resumes the walk where it was; a reload does too', async () => { … })   // Review Focus 3
  it('the placement never runs again on its own', async () => { … })
  ```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS; baseline unchanged.
- [ ] **Step 5: Commit** — "English path: the first run's tower is the placement check; its level seeds the stage and the tallies"

---

## Phase 4 — The screens

Tasks 15–20 are parallel: each adds its builder to `src/english/logic/rounds.ts` in its own section (or its own file
`rounds/<screen>.ts` re-exported there, to avoid edit conflicts) and its tests. Shared rules each builder's tests check:
wrong choices only from opened units; no two choices with the same sound in a hearing round; never `I` against `l`;
a heart word never has a picture; a word without a picture never goes into a picture round; every word shown is in
`WORDS`. Each task ends with `npm run check && npm test` and a commit "English path: the <screen>'s rounds".

### Task 15: The tower's letter and word rounds

**Files:** `src/english/logic/tower.ts`; test `src/english/logic/tower.test.ts`
**Interfaces:** Produces `EN_TOWER: TowerContent`. Round kinds: `picture-first` (the monster carries a picture, 4 Latin
runes, tap the first sound's unit; `endOnly` units ask the last sound with `line-how-last`), `sound` (the wizard says
the unit's sound while the monster's bubble glows), `name` (a nonsense name said, 3 word runes), `picture-word`
(stages 6–9, `line-how-word`). Feedback: unit sound, then the word ("fff. fox."). Monsters never speak. Bosses carry a
unit of his stage or a word. Mega as in Hebrew.
- [ ] Tests: `it('fox asks x by its last sound')`, `it('a unit with no picture is asked by sound')`,
  `it('the feedback is the unit\'s sound then the word')` (voice ids `snd-ks`, `w-fox`), `it('name rounds from stage 2 on, 3 runes')`,
  `it('a missing word clip: the feedback still ends and the next monster comes')` (Review Focus 1, `installFakeAudio()`
  with no file for `w-fox`).
- [ ] Run (FAIL) · implement · `npm run check && npm test` (PASS) · commit.

### Task 16: The broom

**Files:** `src/english/logic/rounds/broom.ts`; test `broom.test.ts`
**Interfaces:** `enBroomTarget(ctx)`, `enBroomWave(ctx, target)` with today's signatures. Early: hear a unit's sound,
fly into its letter. Later: hear a word, catch it among words that differ in one unit (`ship · chip · shop`), built by
`oneUnitApart(word, pool)`; heart words among heart or decodable words.
- [ ] Tests: `it('stage 1 targets are sounds of stage-1 units')`, `it('a word wave differs from its target in one unit')`,
  `it('a heart word wave has no picture')`. Run · implement · check · commit.

### Task 17: The cauldron

**Files:** `src/english/logic/rounds/cauldron.ts`; test `cauldron.test.ts`
**Interfaces:** `enCauldronRound(ctx): CauldronRound` — the heard word, its units with one empty box, the right unit
and 3 wrong tiles; later the missing pair (`_ip` → sh, ch, th); stage 6: `C6` pairs (`kit → kite`), the thrown `e`
turns the word and its picture. After the fix, the word's blend plays (Task 21).
- [ ] Tests: `it('c_t asks a')`, `it('stage 4 asks a digraph as one box')`, `it('stage 6 throws e after cap and the word becomes cape')`,
  `it('cap → cape is word-only (no picture)')`. Run · implement · check · commit.

### Task 18: The ladder

**Files:** `src/english/logic/rounds/ladder.ts`; test `ladder.test.ts`
**Interfaces:** `enLadderPlan(ctx): LadderStep[]` from `CHAINS` (a shorter ladder uses the start of a chain); each step
names the changed position; `marked: boolean` true at stages 1–3, false later; stage 5 on, a rung may add or drop one
consonant.
- [ ] Tests: `it('sat → sit marks position 1')`, `it('from stage 4 the place is not marked')`, `it('lip → slip adds one box')`,
  `it('no word twice in a ladder')`. Run · implement · check · commit.

### Task 19: The ghosts

**Files:** `src/english/logic/rounds/ghosts.ts`; test `ghosts.test.ts`
**Interfaces:** `enGhostRound(ctx)`: one look-alike set per visit (`LOOKALIKE_LETTERS`, opened when all its letters
are), then his own mix-ups (`confusions.letters`, `CONFUSION_GROUP_MIN`); he hears the sound and picks. Word sets
(`GHOST_WORD_SETS`) later. The look-alike explanation says `explain-letter` + the letter name (`ln-b`) + its sound.
- [ ] Tests: `it('b d p opens at stage 2')`, `it('m w waits for stage 3')`, `it('his own mix-up becomes a set')`,
  `it('never I and l together')`. Run · implement · check · commit.

### Task 20: The doors

**Files:** `src/english/logic/rounds/doors.ts`; test `doors.test.ts`; modify `src/duel2/components/screens/Doors.tsx`
(a plate of 2–3 words)
**Interfaces:** `enDoorWords(ctx, n): DoorRound[]` with `DoorRound = { text: string; words: string[]; units: string[][]; key: string /* picture */; wrongKeys: string[] }`
(Hebrew `doorWords` maps its `Word[]` to the same shape in the Hebrew course). Single words at stages 1–3; from stage
4, phrases from `PHRASES` in about half the doors; wrong keys are other nouns' pictures, never a noun of the phrase.
`q-door` (or `q-door-words`) plays only when he waits; the door never says its word.
- [ ] Tests: `it('never a heart word alone on a door')`, `it('a phrase\'s wrong keys are not its noun')`,
  `it('stage 1 doors use stage-2 pictures as wrong keys')`, `it('the longest phrase fits the plate at phone size')`.
  Run · implement · check · commit.

### Task 21: The hint blends a word

**Files:**
- Create: `src/english/logic/blend.ts`, `src/duel2/components/BlendWord.tsx`
- Modify: `src/duel2/controller.ts` (the hint and the explanation take a course hook), `src/duel2/course/types.ts`
- Test: `src/english/logic/blend.test.ts`, `src/duel2/components/BlendWord.test.tsx`, a run test in `src/english/hintRun.test.tsx`

**Interfaces:**
- Produces:
  ```ts
  export interface BlendPlan { audio: string[]; lights: { unit: number; atMs: number }[]; totalMs: number }
  export type BlendMethod = (w: EnWord, timing: WordTiming | null) => BlendPlan
  /** the method in use: no slowed audio; the units light in turn while the normal word plays */
  export const lightsOnNormalWord: BlendMethod
  export const BLEND_METHOD: BlendMethod = lightsOnNormalWord
  export interface WordTiming { units: { startMs: number; endMs: number }[]; durationMs: number }
  export const WORD_TIMINGS: Record<string, WordTiming>        // filled by the asset track from forced alignment; empty now
  ```
  Without a timing, the lights split the clip's length (or 700 ms when the clip is missing) evenly by unit, with a
  two-letter unit as one part. `Course.hint?: { plan(c: Choice): BlendPlan[] }`: on a screen where he hears the target
  (broom, cauldron, ladder, spell), the target's plan; where he reads to choose (tower words, doors, ghost words), one
  plan per word on screen, left to right. `BlendWord` draws a spark under the word and lights each unit at its
  `atMs` from the voice's real start (the kit's `onSay`/cue), one line under a two-letter unit.
  A word answered after a hint counts as helped (`result: 'helped'` in the tally, not right). A touch on an answer
  stops it. After a miss: the right word glows and plays; the blend plays too after every second miss on a word screen
  in this visit, once he has made the right move himself. In the placement: no `?`. A later method (a slowed take, the
  units' own sounds) replaces `BLEND_METHOD` only.

- [ ] **Step 1: Write the failing tests**
  ```ts
  it('with no timing, fish lights f, i, sh evenly over the clip', () => expect(lightsOnNormalWord(word('fish'), null).lights.map((l) => l.unit)).toEqual([0, 1, 2]))
  it('with a timing, the lights follow it', () => { … })
  it('the doors\' hint plans every word on the door, left to right', () => { … })
  it('a word after a hint counts as helped', async () => { … })
  it('the blend plays after every second miss, not every miss', async () => { … })
  it('a missing word clip still lights the units and ends', async () => { … })     // Review Focus 1
  ```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm run check && npm test` — PASS; baseline unchanged.
- [ ] **Step 5: Commit** — "English path: the hint blends a word (its units light while the word plays; the method can be swapped)"

### Task 22: Long words fit their places

**Files:** test `src/english/layout.test.ts`; modify only the layouts that fail (`src/duel2/broomLayout.ts`,
`src/duel2/layout.ts`, the screens' CSS)
**Interfaces:** Consumes the longest words per screen and stage (asset plan 1.17, `longestPerStage()` from Task 9).
- [ ] **Step 1: Write the failing test**: at 667×375 and 1024×768, for each stage, the orbs, runes, ladder plates, door
  plates (phrase "the white sheep") and spell-book boxes (5) hold the longest word with measured widths (the existing
  measuring helper of `layout.test.ts`); the broom's no-overlap geometry test runs with `gromping`.
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
  export function stepSpell(s: SpellState, ev: SpellInput): { state: SpellState; effects: RunEffect[] }
  ```
  `SpellInput`: `{ type: 'drop'; tile: string; box: number; at }`, `{ type: 'idle'; at }`, `{ type: 'hint'; at }`,
  `{ type: 'voice-end'; at }`. Effects as the other policies (say, play, show, track, wait). Boxes fill left to right
  in the course's direction (the policy works in box order; the view mirrors). A right drop says the unit's sound; the
  full word says the word, plays `spell`, and shows the picture alive. A wrong tile: the mistake flow of the calm screens
  (he fixes it himself). A `near` tile: forgiven once with `spell-near` while the other spelling's tile glows.

- [ ] Tests: `it('each right drop says its unit')`, `it('the last drop casts: the word, the spell effect')`,
  `it('a wrong tile is a mistake he fixes')`, `it('a near tile is forgiven once, the second time it is a mistake')`,
  `it('a drop into a box that is not the next one is refused')`, `it('the demo plays demo-spell once')`.
- [ ] Run (FAIL) · implement · `npm run check && npm test` · commit "Book 2: the spell book's rules as a pure policy".

### Task 24: The spell screen in the run

**Files:** Create `src/duel2/components/screens/SpellBook.tsx`; modify `src/duel2/logic/predict.ts` (`ScreenId` +
`'spell'`), `src/duel2/controller.ts`, `src/duel2/screens/Gallery.tsx`, `src/duel2/screens/Play.tsx`,
`src/duel2/assets/images.ts` (`s-book`, falling back to a drawn placeholder while the sprite is missing); test
`src/duel2/components/screens/spell.test.tsx`
**Interfaces:** Consumes Task 23. `CourseRounds.spellRound(ctx): SpellRound | null` (null: no spell round possible at
this stage). The open book: the picture on the page where the reading starts (English: left), the boxes on the other;
a two-letter unit is one tile; the Hebrew closing letter is printed faint after the boxes, not a box. Tiles are dragged
with the existing `DragPick` (touch-action none on the stage). The spell screen is not yet in any cycle (Tasks 25, 26
put it there); the gallery can open it.
- [ ] Tests: `it('renders one box per unit and the tiles')`, `it('a touch drag into the next box sends drop')`,
  `it('the faint tail letter is not a box')`, `it('the gallery opens the spell book in both courses')`, and the
  baseline unchanged.
- [ ] Run · implement · `npm run check && npm test` · commit "Book 2: the spell book screen (not in a cycle yet)".

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
`src/components/home/home.test.tsx` (mod), the stage-4 snapshots of Task 1
**Interfaces:** `heSpellRound(ctx): SpellRound | null` from door words (`Word.syllables`): one box per consonant-vowel
syllable, `tail` the closing letter; wrong tiles are syllables of opened items that differ in sound
(`sameSound` false), never a same-sound spelling (ת/ט, כּ/ק, ח/כ, ס/שׂ, א/ע, kamatz/patach).
- [ ] **Step 1: Write the failing tests**
  ```ts
  it('בַּיִת: two boxes, ת faint', () => expect(heSpellRound(ctxFor('house'))).toMatchObject({ boxes: [{ text: 'בַּ' }, { text: 'יִ' }], tail: 'ת' }))
  it('a same-sound syllable is never a wrong tile', () => { … })
  it('the spell book opens with the doors (stage 4), after them', () => { expect(screensOfStage(3)).not.toContain('spell'); expect(cycleOf(4, true)).toEqual(['tower', 'broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'spell', 'draw', 'draw-hand']) })
  it('the home path shows the spell station between doors and drawing', () => { … })
  ```
- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.**
- [ ] **Step 4: Update only the stage-4 snapshots** (`npx vitest run src/duel2/course/hebrewBaseline.test.ts -u -t "stage 4"`),
  and check the diff: the only change is the spell visit after the doors. Every stage 1–3 snapshot is unchanged.
  Then `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "Book 2: the spell book in the Hebrew run, after the doors from stage 4, and its station on the home path"

---

## Phase 6 — Writing

### Task 27: Latin stroke data  *(parallel: lowercase and capitals)*

**Files:** Create `src/english/data/strokes.ts`; test `strokes.test.ts`; modify `src/duel2/data/strokes.ts` only to
export its types (`Pt`, `Script`, the stroke format)
**Interfaces:** `LATIN_STROKES: Record<string, Stroke[][]>` (each letter: every stroke order the parent approves) for
`a`–`z` and `A`–`Z` in Andika's shapes, in the Hebrew format, on a box with the four lines (`TOP`, `MID`, `BASE`,
`DESC` y values exported); `isMark(letter, strokeIndex)` true for the dots of `i j` and the bars of `t f`.
- [ ] Tests: `it('52 letters')`, `it('every stroke stays in its box, descenders reach DESC (g j p q y)')`,
  `it('i, j, t, f have their marks')`, `it('single-storey a and g')` (the first stroke of `a` is the bowl). Run ·
  implement · check · commit "English path: stroke data for the Latin letters".

### Task 28: Latin drawing

**Files:** Create `src/english/logic/draw.ts`; modify `src/duel2/logic/drawLayout.ts` (four lines when the script is
Latin), `src/duel2/logic/recognizer.ts` (Latin letters through the existing checker; the marks rule as for Hebrew
nikkud: any order, across neighbouring letters, matched to the nearest missing mark), `src/duel2/policies/draw.ts`
(items from the course), `src/duel2/screens/Strokes.tsx` (a `script` choice, marks kept in the open course's save);
tests `src/english/logic/draw.test.ts`, `src/duel2/logic/recognizer.test.ts` (new cases only)
**Interfaces:** `HAND_ORDER = ['c','a','d','g','o','q','b','h','k','l','t','f','i','j','m','n','r','p','u','e','s','v','w','x','y','z']`;
`enDrawWords(ctx): DrawPlan` — the first letter of a heard word ("dog." then `snd-d`, never the letter name); from stage
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

**Files:** Create `src/english/parent/index.ts`, `Settings.tsx`, `reset.ts`, `src/shared/numberRange.ts`; modify
`src/parent/registry.ts`, `src/duel2/parent/Settings.tsx` (the range control reads and writes `numberRange`),
`src/duel2/controller.ts` / the merchant's context (the range from `numberRange`), `.dependency-cruiser.cjs`
(`game-parent-index-is-light` covers `src/english/parent/index.ts`); tests `src/english/parent/parent.test.tsx`,
`src/shared/numberRange.test.ts`
**Interfaces:** `englishParent: GameParent = { id: 'english', title: 'English path', saveKey: 'alef-english', logs: [ENGLISH_LOG], Settings, DevTools?, summary, details, mixups, reset }`;
`summary`: `Level ${level} (placement: ${answers} answers, ${date}) · stage ${stage} · runs · best · crystals`.
Settings: the English path on or off (`settings.path`, default on; off hides the home card), the drawing on or off.
`numberRange.ts`: `alef-range` `{ v: 1, range: 10 | 100 | 1000 }` through `safeSetItem`, seeded once from Book 2's
`settings.range`; `useNumberRange()`; Book 2's old field stays, unread. On production the English section shows only
where `ENGLISH_AVAILABLE`.
- [ ] Tests: `it('the area lists the English section and its log')`, `it('a reset clears alef-english and leaves alef-duel2 byte-equal')`
  (Review Focus 2), `it('the number range is one setting: set in English, Book 2\'s merchant uses it')`,
  `it('the range seeds from an old Book 2 save once')`, `it('turning the path off hides the card')`. Run · implement ·
  check · commit "English path: its section in the parent area; one number range for both paths".

### Task 31: Level, sound units, words

**Files:** Create `src/english/parent/Level.tsx`, `Units.tsx`, `Words.tsx`; test `src/english/parent/sections.test.tsx`
**Interfaces:** Level: the found level, answers, date; **Run the placement again** (sets `placement.state = null`,
`done` kept as history, so the next run starts with the placement); **Start stage** (1–9; `stage.stage` set, units of
lower stages seeded as known). Neither closes a station nor lowers a rating: the opened stations and ratings are kept
in `openedStations: ScreenId[]` (only grows) and the home reads the union. Units: one chip per unit
(knows / learning now / not seen yet from the tallies); a tap shows right, wrong, helped and its mix-ups. Words: read
with and without a hint, and the nonsense words.
- [ ] Tests: `it('a lower start stage keeps every open station and its rating')` (Review Focus 5),
  `it('run the placement again: the next run starts in the placement')`, `it('a unit chip shows helped apart from right')`.
  Run · implement · check · commit "English path: the parent's level, units and words".

### Task 32: The off-screen check

**Files:** Create `src/english/parent/OffScreenCheck.tsx`; modify `src/english/store.ts` (`lastRunWords: string[]`,
written at the run's end); test `src/english/parent/offscreen.test.tsx`
**Interfaces:** After each run the section shows that run's words in large print, one at a time, with ✓ / ✗ the parent
taps; each tap tracks `parent-check` `{ word, ok, run }`. Optional; never shown to the child.
- [ ] Tests: `it('shows the last run\'s words')`, `it('a tap tracks parent-check')`, `it('no child screen links to it')`.
  Run · implement · check · commit "English path: the parent's off-screen reading check".

---

## Phase 8 — Telemetry fixtures

### Task 33: The English log's roll-up and fixtures

**Files:** modify `src/english/telemetryLog.ts` (`englishFacts`), `src/shared/__fixtures__/telemetry/generate.ts`
(an `ENGLISH` event table, `GOLDEN_ENGLISH()`, and a separate `GOLDEN_BOOK2_SPELL()` for the Hebrew spell events, so the
existing Book 2 golden's bytes do not change), `src/shared/telemetryGoldens.test.ts`; create
`src/shared/__fixtures__/telemetry/english-all.golden.json`, `book2-spell.golden.json`; test
`src/english/telemetryLog.test.ts`
**Interfaces:** `englishFacts(events): RollupFact[]` with items `<screen>:<unit or word>`; `result: 'helped'` counts as
help, not right; placement answers as `placement:<stage>`. Every new `track(` name (for example `placement-start`,
`placement-answer`, `placement-done`, `intro-skip`, `blend-hint`, `spell-drop`, `spell-cast`, `spell-near`,
`parent-check`, `range-set`) is in a generator table.
- [ ] Tests: the coverage test ("every call-site name is in the generator") passes with the English names;
  `book2-all.golden.json` and `book2-30d.golden.json` unchanged; `it('helped is not right in the roll-up')`;
  `it('every English event carries g: english')`. Run · implement · `npm run check && npm test` · commit "English path:
  telemetry fixtures and goldens for every new event".

---

## Phase 9 — Home and the green skin

### Task 34: The green skin  *(parallel with 35)*

**Files:** modify `src/english/assets/images.ts`, `src/duel2/duel2.css` (`[data-course="en"]` variables: top bar
buttons, runes, letter tiles, panels; Andika for `.latin`), `src/duel2/screens/GlyphSheet.tsx` (`?course=en`: every unit
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

**Files:** Create `src/components/home/EnglishCard.tsx`, `src/components/home/englishStations.ts`, `src/english/station.ts`;
modify `src/components/home/StationPath.tsx` (`stations`, `dir`, `wizard` props; the Hebrew call passes today's),
`src/pages/Home/HomePage.tsx` (after the Hebrew path: separator, English card, English path, separator, clock),
`src/components/home/home.css`, `.dependency-cruiser.cjs` (`home-into-english-only-through-its-surface`: `saveFormat`,
`station`, `available`, `logic/pick` ratings, `assets/img`); tests `src/components/home/englishCard.test.tsx`,
`src/pages/Home/HomePage.test.tsx` (new cases)
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
  `it('the Hebrew card and path are unchanged')` (the existing home tests, untouched, plus the spell station of Task 26).
  Run · implement · check · commit "Home: the English card and its path".

---

## Phase 10 — Gate and finish

### Task 36: Hidden on production

**Files:** modify `src/english/available.ts`, `src/english/content/ready.ts`; test `src/english/release.test.ts`
**Interfaces:** `ENGLISH_RELEASED` stays `false` until the parent has reviewed all nine stages; `REVIEWED_STAGES`
(Task 8) lists the stages whose assets he approved. Releasing is two edits on `main` (all nine in `REVIEWED_STAGES`,
`ENGLISH_RELEASED = true`), checked on staging, then the usual fast-forward of `release`.
- [ ] **Step 1: Write the failing tests**
  ```ts
  it('released only with all nine stages reviewed', () => { if (ENGLISH_RELEASED) expect(REVIEWED_STAGES).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9]) })
  it('a production build: no card, ?course=en opens Hebrew, no English section', () => { /* render HomePage, Duel2App with ?course=en, ParentArea under available=false */ })
  it('the English bundle is not loaded by the Hebrew page', () => { /* courseIdFromUrl('', …) never imports src/english (spy on loadCourse) */ })
  ```
- [ ] **Step 2: Run** — FAIL where the gate leaks. **Step 3: Fix.** **Step 4: Run** `npm run build` (both `ALEF_STAGING`
  unset and `=1`), then `npm run check && npm test` — PASS.
- [ ] **Step 5: Commit** — "English path: hidden on production until all nine stages are reviewed"

### Task 37: Docs and rules

**Files:** `docs/minigame-rules.md` (the three rule changes of the design's *Rule changes* section, in ASD-STE100 style
with reasons); `GLOSSARY.md` (course, English path, sound unit, heart word, nonsense word, placement walk, spell book,
blend); `docs/adr/0008-one-engine-two-courses.md` (why a course seam in one app, and the tower's content seam instead
of a new tower); `src/english/README.md` (where things are, tests, known friction); `CLAUDE.md` (a map row for the
English path); `src/duel2/README.md` (the course seam, the spell book)
- [ ] Write them; `npm run check && npm test` — PASS; commit "English path: rules, glossary, ADR 0008 and READMEs".

### Task 38: The verification pass

- [ ] `npm run check && npm test`; `git diff main -- src/duel2/course/__snapshots__` shows only the stage-4 spell
  insertion.
- [ ] Run `/verify` on the verify build: a fresh English save, the placement at three simulated levels (1, 5, 9), every
  English screen at phone and tablet size with wrong answers, the audio order logged, a screenshot of each step, the
  no-text scan, the glyph sheet `#/glyphs?course=en`, one walking frame of each green sprite; then the Hebrew run from a
  fresh save and from a copied save, with the spell book at stage 4.
- [ ] Record what failed as new tasks; do not hand a build to the parent before this pass is clean (rules: Verification).

---

## Notes for the executor

- **Assumptions this plan makes** where the design leaves a choice: the English tower reuses `DuelController` through a
  content seam (Task 4); the placement's down-walk is as written in the design's table (8 answers for a child who misses
  everything, not the mock's 7: Task 13); the number range moves to a shared child save (Task 30); "content exists" on
  staging means the stages with words in the data (`contentStages()`), and release waits on `REVIEWED_STAGES` (Tasks 8, 36); "after every second miss" counts misses per visit; the stroke reviews are
  a step of the work, not a gate in code; the English cycle has one drawing screen.
- **Not in this plan** (the asset track): voice files, timings (`WORD_TIMINGS`), green images, the book sprite, the
  review kit's adapter (host-local). The code reads them when they arrive.
