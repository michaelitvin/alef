# Hebrew Spell Quest: rehearse at the last stage (design)

The parent's decision (2026-11-24): the child has reached the last stage (stage 4, `HEBREW_STAGES.maxStage` in
`src/spellquest/logic/run.ts`). Do **not** move him to the English course. Stay on Hebrew, and "rehearse more of the
harder parts: writing, reading whole words, etc."

## What the save shows (production export, 2026-11-23)

- Stage 4, 13 runs. Answers at stage 4: broom 328 (83% right), ladder 178 (89%), cauldron 139 (92%), doors 111 (93%),
  ghosts 133 (96%). Runs end on the broom (10 of 11 run ends): it has the most answers and the most mistakes.
- Drawing: 42 rounds in all (`drawRounds`), against about 900 reading answers. Wrong strokes on א ע ח ת ש, and failed
  marks (shin + cholam male twice, then he left the run). `sc:draw` is 29 wrong in 42: any wrong stroke counts as a miss.
- Whole words: only the doors read a whole word on production (the Hebrew spell book is held back,
  `src/shared/hebrewSpell.ts`). The doors pick their 3 words at random (`doorWords`, not adaptive) from 11 door words,
  so each word came 8 to 22 times. The keys are 2 random other pictures, so the first letter is often enough.
- The doors, the ghosts and the ladder have 12 right answers in a row: the mastery rules (`logic/mastery.ts`) halve
  their visits and skip them in every other cycle. Today the last stage gives **less** time to the doors.
- Weak items: pe/fe, shin/sin, kaf/khaf, gimel; the vowel groups o and u. The picker (`pickTarget`) already aims each
  round at 1 mistake in 5, and at stage 4 the share of rounds for new-stage items (`NEW_SHARE`) is unused (no item is new).

## What changes (at the last stage only; stages 1 to 3 and the English course do not change)

**A. The cycle gives more time to drawing and whole words.** A new optional course member, `stages.lastStage`
(`{ order, visit }`), replaces the cycle order and the visit lengths when `stage >= maxStage`. Hebrew sets it; English
does not (no change there). Proposed Hebrew values (open question 1):
- Order: tower, broom, **draw**, cauldron, ladder, **draw-hand**, ghosts, doors (spell where it is available). An action
  screen and a calm screen take turns, and drawing no longer waits at the end of the cycle.
- Visits: broom 10 → 6 waves; doors 3 → 4 words; draw 3 → 4 words; draw-hand 3 → 4 words. The others stay.
- The doors and the two drawing screens are never halved or skipped at the last stage (`visitLength`, `skipInCycle`).
  The other screens keep the mastery rules.
- Estimate (rule: every screen comes up in a usual run): a cycle has 4 fewer heart rounds (the broom, where he loses
  most hearts), and drawing costs no hearts, so a run reaches as many cycles as today or more. Drawing goes from about
  1 in 6 rounds of a cycle to about 1 in 4, about 40% of its time (a drawing round takes about 20 s).

**B. The doors read the whole word.** At the last stage, `doorWords` picks each word with `pickTarget` on its `w:`
feature (his weakest and least-seen words first), never two times in one visit. A word that he missed comes back in a
later doors visit, not in the same one (rule: growing gaps after a mistake). `doorKeys` gives the two other keys from
words with the same first letter where the pool has one (camel/carrot, ball/dog), else the same first vowel group
(cat/camel, house/ball, carrot/rose/dog). He must read past the first letter. The pictures stay clearly different (rule:
clearly different wrong answers). Below stage 4 the doors do not change.

**C. More rounds for his weak items.** At the last stage, the unused `NEW_SHARE` slot in `broomTarget` (the broom and
the ghosts) becomes a weak share (`WEAK_SHARE` 0.3): the candidates are cut to the items that he mixed up 3 or more times
(`confusions`, `CONFUSION_GROUP_MIN`) or the syllables of his weakest vowel group (the highest predicted `v:`), and
`pickTarget` chooses among them. `drawWords` adds the reading prediction of the slot's letter (`l:`) to its weight, so a
letter that he mixes up when he reads (פ, ש, כ, ג) also comes up to draw. No new content.

## How it stays play, not a test (rules checked)

The same screens, hearts, coins, merchant, crystals and voice lines. No new line, no image, no "practice" mode, no
change that he can see or hear (rule: adapt without letting him see the change). No timer on drawing. The stage does not
go back. The demo and the hand for a wrong stroke or a failed mark stay as they are. The session from the home path
(`SESSION_LENGTH`) does not change. No new asset, so no asset review.

## What the parent sees

The stage line in the parent area (`parent/Settings.tsx`) at stage 4: "Stage 4: whole words. This is the last stage:
each run now gives more time to drawing and to whole words, and more rounds to the letters and vowels he mixes up."
The telemetry does not change: answers, `draw-done` and `skip` already show the shift.

## Save

No change and no migration: the rule follows from `stage >= maxStage`.

## Tasks (parallel; each runs `npx vitest related --run <files>` and `npx tsc --noEmit`)

1. **Cycle and visits at the last stage.** `course/types.ts` (`CourseStages.lastStage?`), `logic/run.ts` (`HEBREW_STAGES`
   values; `cycleOf`, `nextScreen`, `runStart` read `lastStage.order` at `stage >= maxStage`, also with `lastEnded` from
   the old order), `policies/pass.ts` (`visitLength`, `skipInCycle` in `nextOf`: no halving or skip for doors and
   drawing at the last stage). Tests: `logic/run.test.ts`, `policies/pass.test.ts`, `course/seam.test.ts`; update the
   stage-4 snapshots of `hebrewBaseline.test.ts` on purpose and say so in the commit; the English baseline must not move.
2. **Doors.** `logic/rounds.ts` `doorWords` and `doorKeys` (a stage-4 branch; the controller already passes `ctx`).
   Tests: `logic/rounds.test.ts` (adaptive pick, no repeat, keys share the first letter or vowel group, stage 3 as
   before).
3. **Weak items.** `logic/rounds.ts` `broomTarget` (`WEAK_SHARE` in `logic/stages.ts` beside `NEW_SHARE`) and
   `logic/draw.ts` `drawWords`. Tests: `logic/rounds.test.ts`, `logic/draw.test.ts` (seeded rng: weak items come up more
   often at stage 4, the same as before at stage 3). Task 2 and 3 touch other functions of one file; merge 2 first.
4. **Parent line.** `parent/Settings.tsx` stage line; `parent/Settings.test.tsx`.

Then one QA agent: `/verify` at stage 4 (the cycle order, door keys, drawing visits), and the full suite before merge.

## Open questions for the parent

1. How big is the shift? (a) small: broom 8, doors 4, drawing 4 + 4; (b) medium, as above: broom 6, doors 4,
   drawing 4 + 4; (c) large: broom 5, doors 5, drawing 5 + 5. **Recommendation: (b)**; tune it after a week of play.
2. The Hebrew spell book (he builds a whole door word from its syllables: writing whole words) is ready on staging but
   held back from production until its voice files (`demo-spell`, `q-spell`) and its art (`s-book`) pass review.
   (a) release it with this change; (b) later. **Recommendation: (a)**: it is the most direct "writing whole words".

My own decision (no question): drawing counts a round with any wrong stroke as a miss (29 of 42). I do not change the
judge now; more practice with the hand's help is the aim. If the parent sees frustration, we look at it again.

Offer (not in this design): more door words (each needs a picture and a voice take).
