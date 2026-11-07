# Book 2 — flight boss: implementation plan

Spec: [2026-11-07-book2-flight-boss-design.md](../specs/2026-11-07-book2-flight-boss-design.md). Every task is TDD (a failing
vitest first). Code is in `src/duel2/`.

## 1. A gentler flight (`logic/run.ts`, `controller.ts`, `screens/Parent.tsx`)

- `BASE_TRAVEL_MS = 5800`; `travelMs(pace)` loses the per-lap factor (`0.93 ** cycle`).
- `flightPace(pace, 'catch' | 'miss')`: a catch ×0.99, a miss ×1.12, inside `PACE_MIN..PACE_MAX` (Book 2 only; the
  duel's `nextPace` stays). The controller uses it for catches and mistakes.
- Parent text: no "faster each lap" sentence.
- Tests: `run.test.ts` (the old per-cycle test changes with the spec), a pace test.

## 2. Two-orb waves (`logic/rounds.ts`, `logic/run.ts`, `controller.ts`, `components/screens/Broom.tsx`)

- `dotTwinWave(ctx, target)`: a syllable of a dotted letter whose twin is opened (stage 3+) → `[target, twin]` (the twin
  keeps `nearMissOf`). `broomWave` returns it about one time in three.
- A wave carries `lanes?: number[]` (the lane of each orb; default = its index). The controller chooses 2 of 3 lanes for a
  2-orb wave. `orbEvents(k, resolved, lane, isTarget, lanes?)`; Broom draws each orb in its lane.
- Tests: rounds (a third of dotted waves have 2 orbs; never before stage 3), run (`orbEvents` with lanes), screens (an
  orb in its own lane), controller (a 2-orb wave is caught in its lane).

## 3. The boss logic (`logic/boss.ts`)

- `BossKind = 'dot' | 'shin' | 'mimic' | 'bat'`; `BOSS_HITS = 8`, `BOSS_SLOW = 1.3`, `BOSS_COIN_STARS = 30`.
- `isBossVisit(n)`: visit 2, 4, … of the broom in a run.
- `bossScores(confusions)`, `chooseBoss({ stage, confusions, beaten, last, rng })`: stage gates (dot, shin: 3; mimic,
  bat: 2), never `last`, unbeaten kinds get a bonus (close scores prefer unbeaten), null at stage 1.
- `bossTarget(ctx, kind, avoid?)` and `bossWave(ctx, kind, target)`: two orbs, the target and its twin (same vowel; for
  the bat the same letter with o against u).
- Tests: `boss.test.ts`.

## 4. The store (`store.ts`)

- New kept fields: `bossesBeaten: BossKind[]`, `lastBoss`, `potionIntroSeen`. Actions `addStars(n)`, `markBossBeaten`,
  `setLastBoss`, `markPotionIntro`. Reset clears them. Old saves get the defaults (persist merge).
- Tests: `store.test.ts`.

## 5. The boss in the flight (`controller.ts`)

- Broom visits counted per run; a boss visit (chosen kind, never on visit 1) replaces its normal waves. Gallery entries
  force a kind (`force.boss`).
- `BroomView.boss = { kind, hitsLeft, pose, arrived, bolt?, won?, first? }`. Arrival: dark sky, swoop, `boss` music,
  `boss-arrive` then the cue. Each catch: a bolt, the hit pose, a segment out, `boss-hit` telemetry. 8 hits → the win:
  down pose, burst, celebration sound, `boss-win` (praise rule), 3 coins one by one, a first win adds `boss-new` and the
  golden frame; `boss-win` telemetry. Hearts out → `boss-lose` and the run ends.
- A pause keeps the hits and the hearts; only the waves restart (no arrival again).
- `flight` telemetry gets `boss`. `over` gets `bosses` (won this run) and `startStars` (for the coin ring).
- Tests: `useRun.test.tsx` (visit 2 is a boss, visit 1 never; 8 catches win with 3 coins; a pause keeps hits and hearts;
  the boss can end the run; first win marks the kind; telemetry).

## 6. The rescue potion (`controller.ts`, `Broom.tsx`)

- After a lost heart, at most once per visit, one or two waves later: the potion takes a wave slot in a random lane; the
  next wave waits until no orb can reach it. Caught: a heart back (max 3), a gentle sound, a heart flies to the top bar.
  Missed: nothing. Never an answer. First time: slower, glowing, `potion-intro` while he flies, `potionIntroSeen`.
- Telemetry `potion-show`, `potion-catch`, `potion-miss`.
- Tests: controller (shown only after a lost heart, once; catch gives a heart, no star; intro once), screens (drawn).

## 7. The boss and potion on the screen (`Broom.tsx`, `duel2.css`, `audio`)

- Dark sky, the boss on the right facing the wizard (`FACING` mirrors dot/shin/bat), health bar of 8 segments above it,
  bolt, hit pose, burst and the golden frame; the potion sprite with a glow.
- `startMusic('boss')` plays the first duel's `music-boss-1.mp3` (looped). Effects `spell`, `potion` fall back to
  existing ones until the sfx pipeline adds their own.
- Tests: screens (boss mirrored or not by FACING, 8 segments with `hitsLeft` lit, no text), audioFiles (boss music).

## 8. A dagesh he can see (`components/Glyph.tsx`, `screens/GlyphSheet.tsx`)

- `drawnDots(text, px, measure)` (replaces `shinDots`): also removes U+05BC from ב כ פ and returns a dot in the open
  middle of the letter (per-letter fractions of its measured box). The shuruk dot stays.
- Tests: `Glyph.test.tsx`. Visual check on the glyph sheet at orb size.

## 9. End screen and cover (`screens/Summary.tsx`, `screens/Cover.tsx`, `components/BossShelf.tsx`, `InfoTap.tsx`)

- Summary: coins with a progress ring (from the stars before the run or the run's last coin, to now), crystals, a boss
  trophy won this run, the next unbeaten boss as a silhouette, his best, a big glowing play button, no home button.
- Cover: a trophy shelf of 4 slots (golden frame / silhouette). Taps: `info-bosses`, `info-coin-ring`.
- Tests: `shell.test.tsx` (no text, ring, trophy, silhouette, shelf), parts.

## 10. Voice lines, gallery (`data/lines.ts`, `screens/Gallery.tsx`)

- Lines `boss-arrive` (3), `boss-win` (3), `boss-new`, `potion-intro`, `info-bosses`, `info-coin-ring` (text only; the
  parent's pipeline makes the audio). Gallery: one entry per boss kind and one for the potion.
- Tests: `data.test.ts`, `parent.test.tsx`.

## 11. Verify

`npm test`, `npm run build`, a headless test build with screenshots (boss arriving, mid-fight, potion, win, cover shelf,
end screen, dagesh on orbs at 844×390 and 1180×820).
