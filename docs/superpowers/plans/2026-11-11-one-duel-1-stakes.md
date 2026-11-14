# One Duel, Plan 1 of 4 — Stakes and the Coin Economy — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Book 2's run gets real stakes (3 hearts for the whole run, a heart back at the end of each pass, no flying
potion, a smaller slowdown), coins become a spendable balance earned per right answer with a visible streak multiplier,
a run ends with a short defeat scene, and drawing becomes two minigames (print, handwriting) after the doors, on for
everyone.

**Architecture:** Pure rules go in `src/duel2/logic/run.ts` (tested alone). The save gains a `coins` balance and a
version-5 migration in `src/duel2/store.ts`. `src/duel2/controller.ts` (the run loop) uses both; the top bar, summary and
cover read the balance from the store. Voice-line texts go in `src/duel2/data/lines.ts`; recording them is a host step
after the plan (see *Handoff*).

**Tech Stack:** TypeScript 5.9, React 19, Zustand 5 (persist), Vitest 4 (fake timers), Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-11-one-duel-design.md](../specs/2026-11-11-one-duel-design.md) — Part 1,
Part 5, and the parts of *Details settled after the review* named in each task. Read it and
[docs/minigame-rules.md](../../minigame-rules.md) first.

**The four plans:** 1 (this) stakes and coins · 2 the merchant · 3 the first duel inside the run (stage 0, migration,
shorter visits) · 4 the home screen and path sessions. Each ships on its own; 2 needs 1's coin balance.

## Global Constraints

- Hearts: `HEARTS = 3` stays one constant ("Keep the heart count a single constant, so 5 is a one-line change").
- A heart back at the end of each pass, up to `HEARTS`, "in its own moment with a sound".
- Coins: "one coin for each right answer, times the streak multiplier. ×1 for a streak of 0–4, ×2 for 5–9, ×3 for 10
  or more." A boss win "now adds 3 coins to the balance".
- The multiplier "resets when a heart is lost (a forgiven near miss does not reset it). It carries across screens, the
  merchant and bosses."
- Slowdown: "a mistake slows the flight ×1.04 (today ×1.12). A catch still speeds it ×0.99."
- "The hearts run out in the middle of a screen: the answers already on the screen finish (rule), then the run ends."
- Never drop his progress (rule): every existing save keeps stars, stage, tallies, crystals, bosses.
- Voice lines: no "!" in the text; boy text in `he`, girl text in the `fe`/girl map; no numbers spoken.
- No emoji, no text on child screens (digits allowed, marked `data-num`).
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. No host names, paths or passwords
  in files or commit messages (a pre-push hook checks).
- Run `npm test` (from the repo root, with Node on `PATH`) before each commit. `npm run lint` needs
  eslint, which is not installed on this host: run `npx tsc --noEmit -p .` instead.

## Review Focus

1. **An existing save (version 4) opened by the new build:** every field kept, `coins` = his old coin count
   (`floor(totalStars / 10)`), `settings.drawing` = `true` even though the save says `false`. → test in Task 2.
2. **An old save whose `lastEnded` is `'draw'`** (the drawing screen used to sit between ghosts and doors): the next run
   must start somewhere valid, not crash or skip the doors forever. → test in Task 1.
3. **The hearts run out while orbs are still flying:** the orbs already on the screen finish, then the summary; no new
   wave starts. → test in Task 3.
4. **A pause (tablet lock) during the pass-end heart or the defeat scene:** one heart, not two; the summary still comes.
   → tests in Tasks 3 and 6.
5. **The parent's screen gallery** (`opts.force`): a forced screen still refills its hearts each time it restarts and
   never gives a pass heart, so reviewing a screen is unchanged. → test in Task 3.

---

### Task 1: Run rules — hearts per run, the pass heart, pace, multiplier, drawing order

**Files:**
- Modify: `src/duel2/logic/run.ts`, `src/duel2/logic/predict.ts:7` (`ScreenId`)
- Test: `src/duel2/logic/run.test.ts`

**Interfaces:**
- Produces:
  - `ScreenId` = `'broom' | 'cauldron' | 'ladder' | 'ghosts' | 'doors' | 'draw' | 'draw-hand'` (`'draw'` is print).
  - `heartsAtRunStart(): Hearts` (replaces `heartsOnScreenStart`; same value).
  - `passEndHeart(h: Hearts): { hearts: Hearts; gained: boolean }` — +1 up to `HEARTS`.
  - `multiplierOf(streak: number): 1 | 2 | 3` and `coinsFor(streak: number): number` (= `multiplierOf(streak)`; the
    streak counted *including* this answer).
  - `flightPace` with miss factor `1.04`.
  - `cycleOf(stage, draw)` / `nextScreen` / `runStart` with `ORDER = ['broom','cauldron','ladder','ghosts','doors','draw','draw-hand']`;
    with `draw` on, both drawing screens are in the cycle from stage 1.
  - `VISIT['draw-hand'] = 3`.

- [ ] **Step 1: Write the failing tests** (replace the tests named below in `run.test.ts`)

```ts
it('drawing comes after the doors: print, then handwriting, from stage 1, only when on', () => {
  expect(cycleOf(4, true)).toEqual(['broom', 'cauldron', 'ladder', 'ghosts', 'doors', 'draw', 'draw-hand'])
  expect(cycleOf(1, true)).toEqual(['broom', 'ghosts', 'draw', 'draw-hand'])
  expect(cycleOf(4, false)).toEqual(CYCLE)
  expect(nextScreen(4, 'doors', true)).toEqual({ screen: 'draw', newCycle: false })
  expect(nextScreen(4, 'draw', true)).toEqual({ screen: 'draw-hand', newCycle: false })
  expect(nextScreen(4, 'draw-hand', true)).toEqual({ screen: 'broom', newCycle: true })
  expect(VISIT['draw-hand']).toBe(3)
})
it('an old save that ended on the drawing screen starts the next run at a valid screen', () => {
  expect(runStart(4, 'draw', true)).toBe('draw-hand')
  expect(runStart(4, 'draw', false)).toBe('broom')
})
it('hearts last the whole run; a near miss is forgiven once per round', () => { /* the old refill test, using heartsAtRunStart */ })
it('the end of a pass gives one heart back, never more than HEARTS', () => {
  expect(passEndHeart({ left: 1, nearMissUsed: false })).toEqual({ hearts: { left: 2, nearMissUsed: false }, gained: true })
  expect(passEndHeart({ left: HEARTS, nearMissUsed: false }).gained).toBe(false)
})
it('the streak multiplies the coins: ×1 for 0–4, ×2 for 5–9, ×3 from 10', () => {
  expect([1, 4, 5, 9, 10, 30].map(multiplierOf)).toEqual([1, 1, 2, 2, 3, 3])
  expect(coinsFor(7)).toBe(2)
})
it('a mistake slows the flight a little', () => {
  expect(flightPace(1, 'miss')).toBeCloseTo(1.04)
  expect(flightPace(1, 'catch')).toBeCloseTo(0.99)
})
```

- [ ] **Step 2: Run** `npx vitest run src/duel2/logic/run.test.ts` — Expected: FAIL (`passEndHeart` not exported, cycle order).
- [ ] **Step 3: Implement** the produced names in `run.ts`. `runStart` with a `lastEnded` that is no longer in the cycle
  (drawing off) returns `c[0]`; with drawing on, `'draw'` resolves through `nextScreen` as today. Update the file's
  header comment (hearts last the run). Add `'draw-hand'` to `ScreenId` and fix the type errors it raises with the
  smallest change (`features()` treats `'draw-hand'` like `'draw'`).
- [ ] **Step 4: Run** `npx vitest run src/duel2/logic` — Expected: PASS. Run `npx tsc --noEmit -p .` — Expected: no
  errors outside `controller.ts`/screens (those are fixed in Tasks 3–7; if the build must stay green, make the
  minimal `'draw-hand'` cases now).
- [ ] **Step 5: Commit** `git commit -m "Book 2 run rules: hearts last the run, a heart back after each pass, the streak multiplier, drawing after the doors"`

### Task 2: The save — a coin balance and the version-5 migration

**Files:**
- Modify: `src/duel2/store.ts`
- Test: `src/duel2/store.test.ts`

**Interfaces:**
- Consumes: nothing new.
- Produces:
  - `Duel2Save.coins: number` (fresh: 0; `resetProgress` sets 0).
  - `addCoins(n: number): void`; `spendCoins(n: number): boolean` (false and no change when `n > coins`; Plan 2 uses it).
  - `DEFAULT_SETTINGS.drawing = true`.
  - persist `version: 5`; `migrate` for `version < 5`: `coins = floor((totalStars ?? 0) / 10)`, `settings.drawing = true`;
    the existing `< 4` stroke-mark step still runs first. `coinsOf`/`COIN_EVERY` stay exported only for this migration.

- [ ] **Step 1: Write the failing tests**

```ts
it('a version-4 save keeps everything, gets his old coins as a balance, and drawing turns on by itself', () => {
  const v4 = { stage: { stage: 3, newAnswers: '' }, totalStars: 137, crystals: 2, bossesBeaten: ['bat'],
    settings: { sfx: true, music: false, volume: 0.5, drawing: false }, strokeMarks: { 'ד-print': 'ok' } }
  const out = migrateSave(v4, 4)
  expect(out.coins).toBe(13)
  expect(out.settings.drawing).toBe(true)
  expect(out.settings.music).toBe(false)
  expect(out.totalStars).toBe(137)
  expect(out.crystals).toBe(2)
  expect(out.strokeMarks).toEqual({ 'ד-print': 'ok' })
})
it('coins go up and down; he cannot spend more than he has', () => {
  const s = useDuel2Store.getState()
  s.addCoins(5)
  expect(s.spendCoins(7)).toBe(false)
  expect(useDuel2Store.getState().coins).toBe(5)
  expect(useDuel2Store.getState().spendCoins(3)).toBe(true)
  expect(useDuel2Store.getState().coins).toBe(2)
})
it('drawing is on for a new player', () => { expect(DEFAULT_SETTINGS.drawing).toBe(true) })
```

  Replace the old test "the drawing screen is off until the parent turns it on".
- [ ] **Step 2: Run** `npx vitest run src/duel2/store.test.ts` — Expected: FAIL.
- [ ] **Step 3: Implement.** Extract the migrate function as an exported `migrateSave(state: unknown, version: number)`
  and pass it to `persist`. It applies its steps in sequence with no early return (the `< 4` stroke-mark step, then the
  `< 5` step, and later plans append theirs), and the `< 5` step sets
  `settings = { ...DEFAULT_SETTINGS, ...s.settings, drawing: true }`. Every save field this plan adds (`coins`) is also
  added to `fresh()` and so to `resetProgress`. Update the version comment.
- [ ] **Step 4: Run** the store tests — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2 save: a coin balance; version 5 moves his coins over and turns drawing on"`

### Task 3: The run loop — hearts for the run, the pass heart, the end mid-flight

**Files:**
- Modify: `src/duel2/controller.ts` (`loop`, `newVisit`, `runScreen`, the broom flight's `'over'` path, `View`)
- Modify: `src/duel2/data/lines.ts` (new line `pass-heart`, boy/girl)
- Test: `src/duel2/useRun.test.tsx`

**Interfaces:**
- Consumes: `heartsAtRunStart`, `passEndHeart`, `nextScreen(...).newCycle` (Task 1).
- Produces: `View.heal?: { id: number; at: number }` — a generic fx: a heart flies to the top bar (moved out of the
  broom's `BroomView.heal`, drawn by `Play.tsx` over any screen; the merchant, Plan 2, uses it too). The pass heart sets
  it; `View.passHeart?: number` counts pass hearts given (tests and telemetry);
  telemetry event `'pass-heart'` `{ hearts }`; voice line id `pass-heart` (3 variations, e.g.
  "לֵב אֶחָד חוֹזֵר אֵלֶיךָ." — no "!"; girl: "אֵלַיִךְ").

- [ ] **Step 1: Write the failing tests** (replace "hearts refill on a new screen")

```ts
it('hearts last the whole run: a heart lost on the cauldron is still lost on the ladder', async () => {
  // as the old test: two mistakes on the cauldron, then right answers; on the ladder hearts are still 1
})
it('the end of a pass gives one heart back, once, with its line', async () => {
  // stage 1, drawing off (cycle broom → ghosts); start on ghosts with hearts at 2 (lose one), finish the ghosts:
  // when the next screen is the broom, view.hearts === 3, view.passHeart is set, played contains 'pass-heart-*'
})
it('a lock during the pass heart gives it only once', async () => { /* hide/show the page during it; hearts === 3, not more, and one pass-heart telemetry event */ })
it('the gallery still refills a forced screen and never gives a pass heart', async () => { /* opts.force cauldron; lose a heart; restart; hearts 3; no 'pass-heart' event */ })
it('when the hearts run out in the flight, the orbs on the screen finish and no new wave starts', async () => {
  // fly into wrong orbs until hearts 0; from then on waves.length never grows, no star or coin is added (score and
  // store coins frozen even if he steers into a target), and view.over is set only after waves are empty
})
```

- [ ] **Step 2: Run** `npx vitest run src/duel2/useRun.test.tsx -t "hearts|pass|gallery|flight"` — Expected: FAIL.
- [ ] **Step 3: Implement.**
  - Hearts: set `this.hearts = heartsAtRunStart()` once in `start()`; remove the per-visit refill in `runScreen`
    (keep it only under `opts.force`). Keep `visitStarted` for the boss/pause logic it also guards.
  - Pass heart: in `loop`, when `nextScreen(...).newCycle` is true and not `opts.force`, call
    `passEndHeart`; if `gained`, set hearts and `passHeart`, play `sfx('potion')` and the `pass-heart` line, track the
    event. Guard it with a flag like `crystalAwarded` so a pause cannot give it twice.
  - The end mid-flight: on the flight's `'over'`, mark every wave on the screen spent (no catch or hit counts any
    more), stop spawning, ignore further orb events, resolve the flight when `waves.length === 0`, then `endRun`.
- [ ] **Step 4: Run** `npx vitest run src/duel2` — Expected: PASS (fix older tests that assumed refills, keeping their intent).
- [ ] **Step 5: Commit** `git commit -m "Book 2 run: hearts last the run, a heart comes back at the end of each pass, the flight finishes its orbs"`

### Task 4: Remove the flying potion

**Files:**
- Modify: `src/duel2/controller.ts` (`PotionView`, `potion`/`heal` on `BroomView`, `potionShown`, `POTION_*`, the spawn and
  catch code, the `force.potion` option), `src/duel2/components/screens/Broom.tsx` (drawing the potion and the heal),
  `src/duel2/screens/Gallery.tsx` (its potion entry), `src/duel2/data/lines.ts` (`potion-intro`), `src/duel2/data/data.test.ts`
- Test: `src/duel2/useRun.test.tsx` (delete `describe('the rescue potion')` and the potion-intro tests)

**Interfaces:**
- Produces: nothing. Remove only the potion's flight (spawn, catch, `PotionView`); keep the heal animation, now the
  generic `View.heal` from Task 3. Keep `IMAGES['s-potion']` and `sfx('potion')` (the merchant, Plan 2, uses them).
  Keep the save field `potionIntroSeen` (old saves have it; harmless).

- [ ] **Step 1: Write the failing test**

```ts
it('no potion flies in after a lost heart', async () => {
  // fly into one wrong orb, then fly well for 4000 ticks: (c.view.screen as BroomView).potion is always undefined
  // and no 'potion-show' telemetry event
})
```

  (It fails today: the potion comes.)
- [ ] **Step 2: Run** it — Expected: FAIL.
- [ ] **Step 3: Delete** the potion's flight code and view fields; remove `potion-intro` from `lines.ts` and from the
  list in `data.test.ts`.
- [ ] **Step 4: Run** `npx vitest run src/duel2` and `npx tsc --noEmit -p .` — Expected: PASS, no errors.
- [ ] **Step 5: Commit** `git commit -m "Book 2: no free potion; a heart comes back only from the merchant or a pass"`

### Task 5: Coins per right answer and the streak multiplier

**Files:**
- Modify: `src/duel2/controller.ts` (`gainStar`, the boss win's `addStars(10)`, `View.mult`, the streak celebration at
  5 and 10), `src/duel2/components/TopBar.tsx`, `src/duel2/screens/Play.tsx:67`, `src/duel2/screens/Cover.tsx:19,57`,
  `src/duel2/data/lines.ts` (`mult-up`, `info-coins` rewrite), `docs/minigame-rules.md` (the "rewards at several paces"
  example), `src/duel2/duel2.css` (the badge)
- Test: `src/duel2/useRun.test.tsx`, `src/duel2/components/parts.test.tsx`

**Interfaces:**
- Consumes: `coinsFor`, `multiplierOf` (Task 1), `addCoins`, `coins` (Task 2).
- Produces:
  - `View.mult: 1 | 2 | 3`.
  - `TopBar` prop `mult?: 1 | 2 | 3`: a small badge "×2"/"×3" (digits, `data-num`) beside the star count, hidden at 1.
    It pops when it rises.
  - Voice line `mult-up` (2 variations, e.g. "הַמַּטְבְּעוֹת שֶׁלְּךָ שָׁוִים כָּפוּל עַכְשָׁו." for ×2 and
    "…פִּי שְׁלוֹשָׁה…" for ×3; check number words against the gender rule). It replaces the `streak` praise at streaks 5 and
    10 (its own moment: rule), and the `streak` praise stays at 15, 20, … `mult-up` is always spoken (not counted by
    `PRAISE_SPOKEN`); on the broom it is said over the flight, as the streak praise is. The ×3 line uses
    "פִּי שְׁלוֹשָׁה".
  - `info-coins` new text: "אֵלֶּה הַמַּטְבְּעוֹת שֶׁלְּךָ. כָּל תְּשׁוּבָה נְכוֹנָה נוֹתֶנֶת מַטְבֵּעַ, וְאֶפְשָׁר לִקְנוֹת בָּהֶם שִׁקּוּי."
    (girl: שֶׁלָּךְ). Re-recording: see *Handoff*.

- [ ] **Step 1: Write the failing tests**

```ts
it('each right answer pays coins by the streak: 1 each for the first four, 2 from the fifth', async () => {
  // 6 right answers in a row on the ghosts: useDuel2Store.getState().coins === 1+1+1+1+2+2 === 8; view.mult === 2
})
it('a forgiven near miss keeps the multiplier; a lost heart resets it', async () => { /* … view.mult 2 → near → 2 → wrong → 1 */ })
it('the multiplier carries to the next screen', async () => { /* streak 6 at the end of the ghosts → first right answer on the broom pays 2 */ })
it('a boss win adds 3 coins, not 30 stars', async () => { /* existing boss-win test: coins +3 (plus the answer coins), totalStars not +30 */ })
it('the top bar shows ×2 and ×3, and nothing at ×1', () => { /* render TopBar with mult 1/2/3; query [data-mult] */ })
```

- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement.** `gainStar` keeps the run score and `addStar`; it adds `coinsFor(this.streak)` coins and
  pops the coin each time. Move `this.streak++` **before** `this.gainStar()` at all four call sites, so the fifth answer
  pays 2: `evaluate` (calm screens), `evaluateDoor` (doors), the broom's catch (`onCatch`), and the drawing round's
  success in `runDrawRound` (where `streak++` today happens only on a clean drawing, after `gainStar()`). The drawing screen no longer resets the
  streak on an unclean drawing: the multiplier resets only when a heart is lost. Play and Cover read `s.coins`. Rewrite the
  rules-file example: coins are spending money now; the stars are the slow count kept between plays.
- [ ] **Step 4: Run** `npx vitest run src/duel2` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2 coins: a coin for each right answer, ×2 and ×3 for a streak, shown in the top bar"`

### Task 6: The end of a run — the defeat scene, a summary without the coin ring

**Files:**
- Modify: `src/duel2/controller.ts` (`endRun`), `src/duel2/screens/Play.tsx` (the defeat overlay),
  `src/duel2/screens/Summary.tsx` (remove `CoinRing`/`coinRing`; show `CoinCount` with `s.coins`),
  `src/duel2/components/InfoTap.tsx` (drop `'info-coin-ring'`), `src/duel2/data/lines.ts` (drop `info-coin-ring`; add
  `defeat`), `src/duel2/data/data.test.ts`, `src/duel2/duel2.css`
- Test: `src/duel2/useRun.test.tsx`, `src/duel2/screens/shell.test.tsx` (or wherever the summary is tested)

**Interfaces:**
- Produces: `View.defeat?: boolean` — the scene shows between the last answer and `over`: the dizzy wizard
  (`s-wizard-dizzy` / `-girl`) spins and falls for `DEFEAT_MS = 1800`, with `sfx('hit')` and the `defeat` line (2
  variations, playful, never praise for a loss: e.g. "אוּפְּס, הַפַּעַם הֵן נִצְּחוּ."). Then `over` as today, and the
  summary's existing `run-end` line.

- [ ] **Step 1: Write the failing tests**

```ts
it('the run ends with the defeat scene, then the summary', async () => {
  // controller test: three wrong answers → view.defeat becomes true while view.over is still null; played contains a
  // 'defeat-*' line before view.over is set
})
// shell.test (the app with the summary): after the run ends, 'defeat-*' is played before the summary's 'run-end-*'
it('a lock during the defeat scene still shows the summary', async () => { /* like 'a lock while the run ends' */ })
it('the summary shows his coin balance and no ring', () => { /* render Summary; no [data-coin-ring]; [data-coins] shows store coins */ })
```

- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement.** The defeat scene runs inside `endRun` before `over` is set (so `ending` already protects it
  from a pause). The gloating boss is left for later art (spec: "the boss or a monster gloats").
- [ ] **Step 4: Run** `npx vitest run src/duel2` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2 run end: a short defeat scene, then the summary with his coins"`

### Task 7: Two drawing minigames — print and handwriting

**Files:**
- Modify: `src/duel2/controller.ts` (`runScreen`'s `'draw'` branch and `buildDraw`: the script comes from the screen),
  `src/duel2/logic/draw.ts` (`scriptFor` becomes `scriptOf(screen: 'draw' | 'draw-hand'): Script`),
  `src/duel2/screens/Play.tsx` (`case 'draw-hand'`), `src/duel2/screens/Gallery.tsx` (the two entries force
  `screen: 'draw'` and `'draw-hand'`), `src/duel2/screens/Parent.tsx` (the drawing text: "two drawing screens, after the
  doors"; the checkbox stays), `src/duel2/store.ts` (`drawRounds` stays, unused for the script)
- Test: `src/duel2/useRun.test.tsx`, `src/duel2/logic/draw.test.ts`

**Interfaces:**
- Consumes: `ScreenId` `'draw-hand'`, `VISIT['draw-hand']` (Task 1).
- Produces: `scriptOf(screen)`: `'draw'` → `'print'`, `'draw-hand'` → `'hand'`. `DrawView.screen` stays `'draw'` for
  both drawing screens (the view and `Draw` component are shared); only `screenId`, the cycle and `ScreenId` know
  `'draw-hand'`. `runScreen(t, 'draw' | 'draw-hand')` passes `scriptOf(screen)` to `buildDraw(script)`; answers record
  the feature `sc:${this.screenId}`. Each screen has its own demo key (`demo-draw` stays for print; the handwriting
  screen uses its existing per-letter demos).

- [ ] **Step 1: Write the failing tests**

```ts
it('the print screen draws in print and the handwriting screen in handwriting, at any stage', async () => {
  // stage 1, drawing on: after the ghosts come 'draw' (every round script 'print') then 'draw-hand' (every round 'hand')
})
it('scriptOf', () => { expect(scriptOf('draw')).toBe('print'); expect(scriptOf('draw-hand')).toBe('hand') })
it('strokes are accepted on the handwriting screen, and a pause resumes it in handwriting', async () => {
  // on 'draw-hand' (view.screen.screen === 'draw', script 'hand') a right stroke set completes the round; hide/show the
  // page mid-round → the same word, still script 'hand'; the tally gets 'sc:draw-hand'
})
```

- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement** (handwriting from stage 1: the spec opens both drawing minigames with stage 1).
- [ ] **Step 4: Run** `npx vitest run src/duel2` and `npx tsc --noEmit -p .` — Expected: PASS, no errors.
- [ ] **Step 5: Commit** `git commit -m "Book 2 drawing: print and handwriting are two minigames, after the doors"`

### Task 8: The info lines and the final check

**Files:**
- Modify: `src/duel2/data/lines.ts` (`info-hearts` rewrite), `src/duel2/data/data.test.ts`
- Test: the whole suite

**Interfaces:**
- Produces: `info-hearts` new text: "אֵלֶּה הַלְּבָבוֹת שֶׁלְּךָ. עַל כָּל טָעוּת הוֹלֵךְ לֵב אֶחָד, וּבְסוֹף כָּל סִבּוּב חוֹזֵר לֵב."
  (girl: שֶׁלָּךְ). Check the nikkud in a dictionary (rule).

- [ ] **Step 1:** Update the text and the girl text; run `npx vitest run src/duel2/data` — Expected: PASS.
- [ ] **Step 2:** Run the full suite `npm test` and `npx tsc --noEmit -p .` — Expected: all pass, no errors.
- [ ] **Step 3:** Play one run in the dev server at phone size (the QA rule: levels × sizes, audio log, screenshots):
  lose a heart, finish a pass (heart back), reach ×2 and ×3, run out of hearts mid-flight, see the defeat scene and the
  summary, draw on both drawing screens.
- [ ] **Step 4: Commit** `git commit -m "Book 2: the hearts line says how hearts come back now"`

## Handoff (host steps after the code, not part of the tasks)

- Generate and review the new and changed voice lines on the audio review page, boy and girl forms: `pass-heart`,
  `mult-up`, `defeat`, `info-coins`, `info-hearts`. Record each chosen take's request in `asset-sources/` (CLAUDE.md).
- Deploy a playtest build only after the QA sweep (memory: QA before handoff).
