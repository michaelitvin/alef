# Clock: the "quarter to" mistake gets its name, and setting the clock counts for the level

Date: 2026-11-23. Feature in an existing game (one short design, no separate plan). Base: the clock design
[2026-10-15-clock-workshop-design.md](2026-10-15-clock-workshop-design.md).

## Why: what the production data shows

The parent's export of 2026-11-23 holds 187 clock rounds (Oct 19 – Oct 30), 92 of them at :45.

- **Set the clock, from the spoken time ("set the clock to quarter to four"): 1 right of 18 at :45.** 12 of the 17
  wrong poses are one clear time: **(X+1):15**. For 3:45 he set 4:15, for 5:45 he set 6:15, in Hebrew (7 of 11) and in
  English (5 of 7). He hears the number of the next hour ("quarter *to four*"), and builds "four and a quarter".
- In his last session the long hand went to the 9, but the short hand stayed on X+1 (4 poses). He is half way there.
- **Set the clock from a digital time: 11 right of 14 at :45.** Without the spoken phrase he sets 3:45 correctly. So the
  problem is the "to" phrase, not the hands.
- The grader tags the (X+1):15 pose `other` (`src/clock/logic/grade.ts`, `classify`). No explanation goes with `other`, so
  he never heard an explanation for his most frequent mistake.
- Level 4 (:45) ended after 89 rounds: the level rule (`levels.ts`, `recordNewAnswer`) counts every exercise the same,
  and the choice exercises reached 8 of the last 10. The set rounds stayed at 0/7, 1/6, 0/5 per day. He went to level 5
  on Oct 30 and has not opened the clock since.

## What changes

### 1. A name and an explanation for the "to" read as "past" (the parent: "for sure")

- **The "to" times:** the minutes whose phrase says "to": 45, 50, 55, and 40 when it is not read as "forty" (the
  `saysTo` test in `levels.ts`, `introsFor`; reuse it, do not copy it). :35 never says "to".
- A new mistake tag **`toAsPast`**: for a "to" time X:m, the answer **(X+1):(60−m)**: 3:45 → 4:15, 3:50 → 4:10.
  It applies only to rounds where he **heard** the phrase: `find`, `what`, `setShort`/`setLong`/`setBoth`. Not
  `digitalPick` or `digitalSet` (no phrase there, so the line would make no sense).
  - **Set the clock:** `classify` checks first: the long hand at (60−m)·6 and the short hand within `HOUR_TOLERANCE` of
    `hourAngle({ h: X+1, m: 60−m })`. The hands are geared (`HandSetter.tsx`), so at :45 this pose is `other` today and
    at :50 and :55 it is `mirror` today (the short hand is only 10° or 5° off). It cannot collide with `swap`, `hour1` or
    `notAdvanced`.
  - **Choice exercises:** `mirrorTime` already makes exactly (X+1):(60−m) for every "to" time. When he picks it, the tag
    is `toAsPast` instead of `mirror` or `confusion`. After the change, `fix-mirror` plays only for the "past" side. The
    tag does not feed the tallies or the confusions, so this is safe.
- A new explanation **`fix-toAsPast`**, fixed audio with `example: '3-45'` (like `exp-level-4`), under the same
  cooldown as the other fixes. It shows both clocks from the start (`communication.md`: a comparison shows both): his
  4:15 next to the right 3:45. The wording keeps the approved form of `exp-fix-notAdvanced` and avoids "עוֹד"
  (`pronunciation.md`: "הַשָּׁעָה עוֹד שָׁלוֹשׁ" stressed עוד in every take):
  - he: "רֶבַע לְאַרְבַּע זֶה לִפְנֵי אַרְבַּע. הַשָּׁעָה הִיא שָׁלוֹשׁ, לֹא אַרְבַּע: הַמָּחוֹג {short}הַקָּצָר כִּמְעַט עַל אַרְבַּע, וְהַמָּחוֹג {long}הָאָרוֹךְ עַל תֵּשַׁע."
  - No verb in it shows gender, so there is no `HE_F` entry.
  - en: "Quarter to four is before four. It is three, not four: the {short}short hand is almost on the four, and the
    {long}long hand is on the nine."
- The voice follows the clock voice rules (Charlotte, spoken text without nikkud). One take per language, then the
  `voice-wording.md` checks: the sequence boing → phrase → next → fix, and a native listen (the parent). The asset
  review is non-blocking. The request goes into `asset-sources/clock/`.
- Known and kept: `fixFor` plays the explanation after the first such mistake, then waits out the cooldown.
  `game-play-learning.md` says "after several". That is how all the clock fixes work today.

### 2. The level needs the set rounds too (the parent asked for my view; recommended)

- `recordNewAnswer` gets the exercise of the answer. The level passes when the current window passes (8 of the last
  10 on the new times) **and** 3 of the last 5 set rounds from the spoken time (`setShort`, `setLong`, `setBoth`) on
  the new times are right. `digitalSet` does not count.
- **Fast-forward** (the first 5 all right) also needs at least 1 set round among the 5, so level 6 cannot pass on
  choices alone.
- **No stall:** the round chooser aims at a 20% mistake rate (`pickNearTarget`), so it almost never picks a set round he
  fails. Once the choice window passes and the set window does not, every 3rd round is a set round at a new time
  (`forcedExercise` / `forcedTime` in `rounds.ts`). That keeps him moving and gives the explanation its chance.
  This is the way out that `game-play-learning.md` asks for, so the design needs no automatic level-up.
- The bar for set rounds is lower (3/5) because setting is harder than choosing.
- **Save:** a second string `newSetAnswers` next to `newAnswers`. The store goes to version 2 with a `migrate` that
  adds `''` (Zustand's shallow merge replaces `progress` as a whole, so an old save would have `undefined`). Register
  `'alef-clock'` in `src/shared/migrateCheckSteps.ts`.
- **Parent area:** the clock summary line shows the set progress (for example "set 1/5"), so the parent sees why the
  level stays. The level-up telemetry logs `newSetAnswers`.

### Not in this change (the parent: "no need")

- He does not go back to level 4. His save stays on level 5. The "to" times return at level 6.

## Tasks (independent: build in parallel)

1. **Tag, grading and line:** `toAsPast` in `grade.ts` (set; the type `Evaluation.tag`) and in the choice evaluation,
   limited to the phrase exercises; `fix-toAsPast` in `FIX_FOR`, `ExplainId`, the line table and the id list in
   `lines.test.ts`; the explanation shows both clocks. Tests on geared poses (`poseOf()`): his real poses (3:45 → 4:15,
   10:45 → 11:15) give `toAsPast`; the same at :50 and :55; `digitalPick` keeps its old tag; a past-side mirror stays
   `mirror`.
2. **Level rule:** `newSetAnswers`, the exercise passed into `recordNewAnswer` (`store.ts` `recordRound`), the
   fast-forward rule, the forced set round, store version 2 with `migrate`, the migrate-check step, the parent
   summary, the telemetry field. Tests: his level 4 sequence (choices pass, set 1/18) does not pass; 8/10 plus 3/5
   passes; a set round comes every 3rd round while the set window blocks; an old version 1 save loads.
3. **Voice:** the he and en takes of `fix-toAsPast` through the clock voice pipeline, the request in
   `asset-sources/clock/`, the takes on the review page.

Checks: `npx vitest related --run <files>`, `npx tsc --noEmit`, then `/verify` on the clock (a set round at 3:45 with
the 4:15 pose plays the new explanation with both clocks).
