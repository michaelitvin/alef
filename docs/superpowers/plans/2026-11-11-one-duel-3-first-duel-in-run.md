# One Duel, Plan 3 of 4 — The First Duel Inside the Run — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The first duel (the tower, nikkud by sound) becomes the first minigame of Book 2's run: a new player starts
with it alone and Book 2's minigames open once he masters it; it shares the run's hearts, stars, coins and streak; its
מגה is gone; existing players keep everything; minigames he has mastered get shorter visits and are sometimes skipped.

**Architecture:** **Reuse, with an adapter.** The first duel's rules stay in `src/utils/duel/` (reducer, rounds, rules)
and its timing in `src/hooks/useDuelGame.ts`; its board stays `Battlefield` + `SpellPad`. The hook gains an `embedded`
mode (no מגה, no own hearts/HUD/run records, a fixed visit, callbacks per answer). Book 2 mounts it in a new screen
component `src/duel2/components/screens/Tower.tsx` (HTML, drawn over the stage like the explain panel), and the
controller treats `'tower'` as one more `ScreenId` whose answers arrive through `towerAnswer()`. The tower's adaptive
data stays in `progressStore.duel` (byMark, recent, confusions, pace): nothing to copy, the hook already reads it.
Stage 0 is a separate flag `bookOpen` in the Book 2 save, not a new value of Book 2's content `Stage` type (which
dozens of content rules read).

**Tech Stack:** TypeScript 5.9, React 19, Zustand 5, Vitest 4, Testing Library, framer-motion (the duel's board).

**Spec:** [docs/superpowers/specs/2026-11-11-one-duel-design.md](../specs/2026-11-11-one-duel-design.md) — Part 3,
Part 1's stakes as they apply to the tower, and *Details settled after the review* (score and best, the first duel's
screen in a run, existing players and stage 0, station ratings — the rating function is defined here and used by
Plan 4). Plans 1 and 2 must be built first.

## Global Constraints

- "A new player starts with the first duel's game … After a while the Book 2 minigames open, one by one."
- "One reward system: stars, coins, hearts and the merchant." "מגה כישוף is dropped."
- "The first duel becomes a screen of the run, the first station of the path. Its mechanics stay as they are, except for
  three changes: no מגה, hearts are shared with the run, and stars and coins go to the shared count."
- "Stage 0 passes when the first duel's marks are mastered by its own adaptive measure (my starting point: about 80 %
  right over recent answers on every mark). Then stage 1 opens broom and ghosts, as today."
- "A player with a Book 2 save at stage 1 or above has stage 0 passed. … Nothing he has goes back."
- Migration: "Its right answers (`correct`, summed over `byMark`) are added to the shared stars. `mega` results are not
  counted." Coins: "plus the first duel's right answers counted the same way (one coin for each 10)."
- "The first duel's points (combo, `bestScore`, `bestWave`) are retired; they stay in the parent report as history."
  The first duel's own game-over screen (`RunSummary`) "is not used in the run".
- "One visit is two waves (10 monsters). Its boss comes every few cycles, in the run's boss rhythm. Its HUD (`DuelHud`:
  hearts, score, מגה meter) is replaced by Book 2's top bar."
- "The order of a run stays a fixed cycle …, with the first duel's screen first." "A screen with no recent mistakes gets
  a shorter visit (about half), and a screen he has excelled at for a long time is skipped in every other cycle. It is
  never removed." "A screen that is skipped … has no checkpoint of its own."
- "Station ratings on the path are a 0–3 rating of his recent accuracy on that minigame's content."
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; no host details in the repo. `npm test` and
  `npx tsc --noEmit -p .` before each commit.

## Review Focus

1. **A Book 2 player who never played the first duel** (stage ≥1, empty `progressStore.duel`): the tower is in his
   cycle first, nothing of Book 2 closes, no import adds stars. → test in Task 4.
2. **A first-duel-only player** (rich `progressStore.duel`, no Book 2 save): stars and coins imported once (never twice
   on a reload), `bookOpen` true if his marks are already mastered. → test in Task 4.
3. **The last heart lost on the tower while a monster walks:** the run ends after that round's feedback (the duel's
   "answers on the screen finish"), no next monster spawns, the summary is Book 2's. → test in Task 3.
4. **A tablet lock during the tower:** the duel's own pause cover is not shown twice; Book 2's pause cover holds, and
   resume continues the same monster. → test in Task 3.
5. **A mastered screen skipped in a cycle when the merchant would be due:** no checkpoint for the skipped screen; the
   next real checkpoint decides. → test in Task 5.

---

### Task 1: Run rules — the tower in the cycle, stage 0, mastery, shorter visits, ratings

**Files:**
- Modify: `src/duel2/logic/run.ts`, `src/duel2/logic/predict.ts` (`ScreenId` gains `'tower'`)
- Create: `src/duel2/logic/mastery.ts`
- Test: `src/duel2/logic/run.test.ts`, `src/duel2/logic/mastery.test.ts`

**Interfaces:**
- Produces:
  - `ScreenId` adds `'tower'`; `ORDER = ['tower','broom','cauldron','ladder','ghosts','doors','draw','draw-hand']`;
    `VISIT.tower = 2` (waves).
  - `cycleOf(stage, draw, bookOpen = true)`: `bookOpen` false → `['tower']` (drawing too waits for stage 1);
    true → `['tower', ...as Plan 1]`. `nextScreen`/`runStart` take the same `bookOpen` argument.
  - `mastery.ts`:
    - `TOWER_MASTER = { minAnswers: 5, rate: 0.8 }`. Baseline: with the duel's 1-in-5 target mistake rate, a mark sits
      near 80 %, so a typical new player opens Book 2 after roughly 3–6 sessions on the tower (~5 answers per mark × the
      marks he meets). Check this number in Task 4's QA with a seeded save and note it in the commit.
    - `towerMastered(recent: Record<string, string>, markIds: string[]): boolean` — every mark has ≥5 recent answers
      with ≥80 % `'o'`.
    - `screenRecent(screen: ScreenId, d2recent: Record<string, string>, duelRecent: Record<string, string>): string` —
      `'tower'` → all of the duel's recent strings joined; others → `d2recent['sc:' + screen]`.
    - `visitScale(recent: string): 0.5 | 1` — 0.5 when the last 8 (at least 8 answers) have no `'x'`.
    - `skipInCycle(screen: ScreenId, recent: string, cycleNo: number, cycleLen: number): boolean` — false for the
      tower (never skipped) and when `cycleLen === 1`; else the last 12 (at least 12) all `'o'` and `cycleNo` odd.
    - `rating(recent: string): 0 | 1 | 2 | 3` — 0 with fewer than 3 answers; else `round(3 × share of 'o')`.

- [ ] **Step 1: Write the failing tests**

```ts
it('stage 0: only the tower; then the tower comes first', () => {
  expect(cycleOf(1, true, false)).toEqual(['tower'])
  expect(cycleOf(1, true, true)).toEqual(['tower', 'broom', 'ghosts', 'draw', 'draw-hand'])
  expect(nextScreen(1, 'tower', false, false)).toEqual({ screen: 'tower', newCycle: true })
})
it('the tower is mastered when every mark is at least 80 % right over at least 5 recent answers', () => {
  expect(towerMastered({ kamatz: 'ooooo', chirik: 'oooox' }, ['kamatz', 'chirik'])).toBe(true)
  expect(towerMastered({ kamatz: 'ooooo', chirik: 'ooxox' }, ['kamatz', 'chirik'])).toBe(false)
  expect(towerMastered({ kamatz: 'oooo' }, ['kamatz'])).toBe(false)
})
it('shorter visits and every-other-cycle skips, never removal', () => {
  expect(visitScale('oooooooo')).toBe(0.5)
  expect(visitScale('ooooxooo')).toBe(1)
  expect(skipInCycle('ghosts', 'o'.repeat(12), 1, 5)).toBe(true)
  expect(skipInCycle('ghosts', 'o'.repeat(12), 2, 5)).toBe(false)
  expect(skipInCycle('tower', 'o'.repeat(12), 1, 5)).toBe(false)
  expect(skipInCycle('ghosts', 'o'.repeat(12), 1, 1)).toBe(false)
})
it('ratings', () => { expect([rating('oo'), rating('ooo'), rating('oxo'), rating('xxxo')]).toEqual([0, 3, 2, 1]) })
```

- [ ] **Step 2: Run** `npx vitest run src/duel2/logic` — Expected: FAIL.
- [ ] **Step 3: Implement.** Fix the type errors `'tower'` raises with the smallest change (`features()` is not called
  for the tower; give `SCREEN_PRIOR` no entry).
- [ ] **Step 4: Run** — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2 run rules: the first duel's tower opens the cycle; stage 0; shorter visits for mastered screens"`

### Task 2: The duel hook's embedded mode

**Files:**
- Modify: `src/hooks/useDuelGame.ts`, `src/utils/duel/reducer.ts`
- Test: `src/hooks/useDuelGame.test.tsx`, `src/utils/duel/reducer.test.ts`

**Interfaces:**
- Produces:
  - Reducer action `{ type: 'START_AT'; wave: number; boss: boolean }` — like `START`, at that wave (a boss visit
    starts with `bossHp = BOSS_HP` and a boss spawn), `hearts = Infinity` (the run owns hearts), `mega` stays 0.
  - `UseDuelGameOpts.embedded?: { wave: number; waves: number; boss: boolean; seen: string[]; onSeen: (key: string) => void; onAnswer: (r: 'right' | 'wrong', markId: string) => 'on' | 'over'; onDone: (lastWave: number) => void }`.
    In embedded mode: `MEGA` is ignored and the lightning line never plays; `recordDuelSession` and `recordDuelRunEnd`
    are not called (`recordDuelRound`, confusions and pace still are: the adaptive data). The duel's intro plays once
    ever (Book 2's `demosSeen` gets `tower-intro` after it) and its per-screen explanations' `seenScreens` are persisted
    the same way (Book 2's `demosSeen`, keys `tower-screen-<key>`), passed in as `embedded.seen` + `embedded.onSeen`.
    No duel music in embedded mode (Book 2's music plays); the duel's audio volume and mute follow Book 2's settings
    (`configureDuelAudio` from `useDuel2Store.settings`). The reducer's "a boss after every 5th wave" rule does not apply
    in embedded mode (a normal visit never turns into a boss; only `START_AT { boss: true }` makes one). `onAnswer` runs on each
    outcome (a hit → `'right'`; a miss or a timeout → `'wrong'`; the twin's forgiven first tap is not an answer); when it
    returns `'over'` the hook stops spawning after that round's feedback; after `waves` waves (or the boss's defeat on a
    boss visit) it calls `onDone`. The hook's own visibility pause is off (Book 2 pauses it through `pause()`/`resume()`).

- [ ] **Step 1: Write the failing tests**

```ts
it('START_AT starts at that wave, with the run owning the hearts', () => { /* state.wave 7, hearts Infinity, next spawn wave 7 */ })
it('embedded: two waves of five, each answer reported, then onDone', async () => { /* 10 right answers → onAnswer x10 'right', onDone(…) once */ })
it('embedded: no מגה line and no lightning after 8 hits', async () => { /* played lines never include line-mega */ })
it('embedded: onAnswer "over" stops after the feedback; no next monster', async () => { /* … */ })
it('embedded: no session or run-end records, but rounds are recorded', async () => { /* progressStore duel.sessions unchanged, byMark grows */ })
it('embedded: the intro plays only when not in seen; no duel music', async () => { /* seen ['tower-intro'] → no intro line; playMusic never called */ })
it('embedded: wave 5 of a normal visit does not become a boss', async () => { /* START_AT wave 4, waves 2 → no boss spawn */ })
```

- [ ] **Step 2: Run** `npx vitest run src/hooks src/utils/duel` — Expected: FAIL.
- [ ] **Step 3: Implement** with the smallest change to the hook (its non-embedded behaviour is unchanged; the old duel
  page still works).
- [ ] **Step 4: Run** — Expected: PASS (all existing duel tests too).
- [ ] **Step 5: Commit** `git commit -m "Duel hook: an embedded mode for Book 2's run (no מגה, the run's hearts, a fixed visit)"`

### Task 3: The tower screen in Book 2's run

**Files:**
- Create: `src/duel2/components/screens/Tower.tsx`
- Modify: `src/duel2/controller.ts` (`'tower'` in `runScreen`, `towerAnswer`, `towerDone`, the tower's boss rhythm),
  `src/duel2/screens/Play.tsx` (render `Tower` outside the stage SVG when `view.screen.screen === 'tower'`),
  `src/duel2/store.ts` (`towerWave: number`, `towerVisits: number`), `src/duel2/screens/Gallery.tsx` (entries "Tower —
  two waves", "Tower — boss")
- Test: `src/duel2/useRun.test.tsx`, `src/duel2/components/screens/screens.test.tsx`

**Interfaces:**
- Consumes: Task 2's embedded hook; Plan 1's `gainStar`, streak, hearts, `endRun`.
- Produces:
  - `TowerView = { screen: 'tower'; wave: number; waves: number; boss: boolean; visit: number }`.
  - `RunController.towerAnswer(r: 'right' | 'wrong', markId: string): 'on' | 'over'` — `'right'` → `gainStar()` and the
    streak (Plan 1's coins and multiplier); `'wrong'` → `onAnswer(hearts, 'wrong')`, streak 0, `View.hearts`; returns
    `'over'` when the hearts are out (then `endRun` with no cue: the duel's own feedback already said the mark;
    `endRun(cue?: string)` skips the line when `cue` is undefined).
  - `RunController.towerDone(lastWave: number)` — saves `towerWave = lastWave + 1`, ends the screen; after a boss visit
    it adds the boss's 3 coins here (Plan 1's boss bonus).
  - The tower's boss rhythm: every third tower visit (`towerVisits % 3 === 2`) is a boss visit: `boss: true`, starting
    at the next multiple of 5 of `towerWave`. The dragon/troll are not Book 2 boss kinds: they do not go on the trophy
    shelf. Normal visits start at `towerWave` (the embedded hook ignores the reducer's boss rule, Task 2).
  - `Tower` renders the duel's `Battlefield` and `SpellPad` (and `duel.css`) inside a `nd-root nd-embedded` box over the
    stage (`.nd-embedded { position: absolute; inset: 0 }`, below the `TopBar`'s z-index), no `DuelHud`, no
    `StartCover`/`PauseCover`/`RunSummary`; the Book 2 `TopBar` stays on top.

- [ ] **Step 1: Write the failing tests**

```ts
it('a run at stage 0 is the tower: answers move the shared hearts, stars and coins', async () => { /* … */ })
it('the tower visit is two waves, then the next screen', async () => { /* bookOpen: next is broom */ })
it('every third tower visit is a boss', async () => { /* towerVisits 2 → view.screen.boss */ })
it('the last heart on the tower ends the run with Book 2’s summary', async () => { /* Review Focus 3 */ })
it('a lock during the tower: one pause cover, the same monster after resume', async () => { /* Review Focus 4 */ })
```

  The controller tests drive the tower through `towerAnswer`/`towerDone` directly (the hook is tested in Task 2).
- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement.** In `Tower`, wire `embedded.onAnswer` to `run.towerAnswer` and `onDone` to `run.towerDone`
  (add both to `useRun`'s returned API); `View.paused` drives the hook's `pause()`/`resume()`.
- [ ] **Step 4: Run** `npx vitest run src/duel2` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2 run: the first duel's tower as a screen, sharing hearts, stars and coins"`

### Task 4: Stage 0 and the one-time import of the first duel

**Files:**
- Modify: `src/duel2/store.ts` (`bookOpen`, `firstDuelImported`, `importFirstDuel()`, version 7),
  `src/duel2/controller.ts` (after a tower visit: `towerMastered` → `bookOpen = true`, a celebration, telemetry
  `book-open`), `src/duel2/Duel2App.tsx` (call `importFirstDuel()` once at start)
- Test: `src/duel2/store.test.ts`, `src/duel2/useRun.test.tsx`

**Interfaces:**
- Consumes: `useProgressStore` (`duel.byMark`, `duel.recent`), `DUEL_MARKS`, `towerMastered`.
- Produces:
  - `Duel2Save.bookOpen: boolean` — in `fresh()` (false), so `resetProgress` resets it; `migrateSave` appends a `< 7`
    step (in sequence): any stored save gets `bookOpen = (s.stage?.stage ?? 1) >= 1` — true, never false on a missing
    field — so nothing closes.
  - `Duel2Save.firstDuelImported: boolean` — in `fresh()` (false); `resetProgress` resets it too (after the parent's
    reset, the first duel is imported again on the next start).
  - Also in `fresh()`: Task 3's `towerWave` (1) and `towerVisits` (0), Task 5's `cycleNo` (0).
  - `importFirstDuel(duel: DuelStats): void` — once: `totalStars += Σ byMark[*].correct` (not `mega`),
    `coins += floor(that / 10)`, `bookOpen ||= towerMastered(duel.recent ?? {}, DUEL_MARKS ids)`, `firstDuelImported = true`.
    Idempotent.

- [ ] **Step 1: Write the failing tests**

```ts
it('an existing Book 2 save keeps Book 2 open and gets the tower in front', () => { /* migrateSave(v6 with stage 2) → bookOpen true */ })
it('the first duel is imported once: correct answers become stars and a tenth of them coins; mega not counted', () => {
  // byMark { kamatz: { correct: 25, mega: 9 }, chirik: { correct: 7, mega: 0 } } → stars +32, coins +3; second call: no change
})
it('a first-duel player who mastered his marks starts with Book 2 open', () => { /* recent all 'ooooo' for every mark */ })
it('a new player starts at stage 0 and Book 2 opens when the tower is mastered', async () => { /* drive towerAnswer right until mastered → bookOpen, next cycle has broom */ })
it('at stage 0 there is no pass heart and no merchant', async () => { /* hearts 1, coins 50, tower cycles → no heal, no view.merchant */ })
it('a stored save with no stage field still opens Book 2', () => { /* migrateSave({ coins: 3 }, 6).bookOpen === true */ })
```

- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement.** While `bookOpen` is false (stage 0) there is no pass heart (Plan 1) and no merchant
  (Plan 2): both check `bookOpen`.
- [ ] **Step 4: Run** `npx vitest run src/duel2` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2: stage 0 (the tower alone) and the first duel's progress moves over once"`

### Task 5: Shorter visits and skips in the run

**Files:**
- Modify: `src/duel2/controller.ts` (the visit length and the cycle walk), `src/duel2/store.ts` (`cycleNo: number`)
- Test: `src/duel2/useRun.test.tsx`

**Interfaces:**
- Consumes: `screenRecent`, `visitScale`, `skipInCycle` (Task 1); Plan 2's checkpoint.
- Produces: one `this.visitLen` per visit, set when the visit starts = `max(2, round(VISIT[screen] × visitScale(recent)))`
  (the tower: waves, min 1). Every use of `VISIT[screen]` inside a visit reads `this.visitLen` instead: the round loop,
  `ladderPlan(c, this.visitLen, …)` and the ladder's `rungs`, the doors' word count (`slice(0, this.visitLen)`) and the
  `behind` crystal on the last door (`roundInScreen === this.visitLen - 1`). Plan 4 overrides `visitLen` in a session.
  A screen with `skipInCycle(screen, recent, cycleNo, cycle.length)` is passed over in that cycle with no checkpoint and
  no telemetry visit; when the doors are skipped, the crystal still comes at the cycle's end, then the pass heart.
  `cycleNo` increments on `newCycle` and is saved.

- [ ] **Step 1: Write the failing tests**

```ts
it('a screen with no recent mistakes gets about half a visit', async () => { /* recent['sc:ghosts']='oooooooo' → 2 rounds */ })
it('a long-mastered screen is skipped every other cycle, never removed', async () => { /* cycleNo 1 skip, cycleNo 2 visit */ })
it('a skipped screen has no checkpoint', async () => { /* Review Focus 5: merchant due conditions true; skip → no visit at that point */ })
it('a short ladder has as many rungs as its visit; short doors put the crystal behind the last of them', async () => { /* … */ })
it('when the doors are skipped the crystal still comes at the end of the cycle', async () => { /* … */ })
it('the tower is never skipped, and a one-screen cycle is never skipped', async () => { /* stage 0, 'o'.repeat(12) on every mark */ })
```

- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run src/duel2` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2 run: shorter visits for mastered minigames, a skip every other cycle"`

### Task 6: The parent report and the final check

**Files:**
- Modify: `src/duel2/screens/Parent.tsx` (a "First duel (history)" section: sessions, best score, best wave, per-mark
  right/wrong from `progressStore.duel`; the stage line shows "stage 0: the tower" before `bookOpen`),
  `src/components/duel/RunSummary.tsx` untouched (the old page keeps it)
- Test: `src/duel2/screens/parent.test.tsx`, the whole suite

- [ ] **Step 1:** Write the parent test (the history section shows `bestScore` and a per-mark row), run — FAIL; implement;
  run `npx vitest run src/duel2` — PASS.
- [ ] **Step 2:** `npm test` and `npx tsc --noEmit -p .` — Expected: all pass, no errors.
- [ ] **Step 3:** QA in the dev server at phone and tablet size: a fresh save (stage 0, tower only, until mastered), a
  first-duel-only save, a Book 2 save at stage 3; the tower's boss visit; hearts lost on the tower; a lock on the tower;
  the girl's wizard on the tower. Check Task 1's baseline: how many tower sessions a seeded new player needs before
  Book 2 opens; note it in the commit. Screenshots and the audio order log.
- [ ] **Step 4: Commit** `git commit -m "Book 2 parent report: the first duel's history"`

## Handoff

- A voice line for "Book 2 opens" is optional (the celebration reuses the crystal/streak praise). No new art.
- The old `#/duel` page stays reachable by its address; Plan 4 removes its card from the home screen.
