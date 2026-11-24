# Hebrew Spell Quest: rehearse at the last stage (design)

The parent's decision (2026-11-24): the child has reached the last stage (stage 4, `HEBREW_STAGES.maxStage` in
`src/spellquest/logic/run.ts`). Do **not** move him to the English course. Stay on Hebrew, and "rehearse more of the
harder parts: writing, reading whole words, etc."

## What the save shows (production export, 2026-11-23)

- Stage 4, 13 runs. Answers at stage 4: broom 328 (83% right), ladder 178 (89%), cauldron 139 (92%), doors 111 (93%),
  ghosts 133 (96%). Runs end on the broom (10 of 11 run ends): it has the most answers and the most mistakes.
- Drawing: 42 rounds in all (`drawRounds`), against about 900 reading answers. Wrong strokes on א ע ח ת ש, and failed
  marks (shin + cholam male twice, then he left the run). `sc:draw` is 29 wrong in 42 (69%), because any wrong stroke
  or mark makes the round a miss (`policies/draw.ts:328`). This breaks the 1-in-5 rule (`game-play-learning.md`).
- Whole words: only the doors read a whole word on production (the Hebrew spell book is held back,
  `src/shared/hebrewSpell.ts`). The doors pick their 3 words at random (`doorWords`, not adaptive) from 11 door words,
  so each word came 8 to 22 times. The keys are 2 random other pictures, so the first letter is often enough.
- The doors, the ghosts and the ladder have 12 right answers in a row: the mastery rules (`logic/mastery.ts`) halve
  their visits and skip them in every other cycle. Today the last stage gives **less** time to the doors.
- Weak items: pe/fe, shin/sin, kaf/khaf, gimel; the vowel groups o and u. The picker (`pickTarget`) already aims each
  round at 1 mistake in 5, and at stage 4 the share of rounds for new-stage items (`NEW_SHARE`) is unused.

## What changes (at the last stage only, except the drawing judge in D; the English course does not change)

**A. The cycle gives more time to drawing and the doors.** The course stages get two stage-aware functions, like
`screensOfStage`: `orderOf(stage)` and `visitOf(stage)`. `cycleOf`, `nextScreen`, `runStart` (`run.ts`) and
`visitLength` (`policies/pass.ts`) call them instead of `order` and `visit`. English returns its one order and visit
table for every stage (no change). Hebrew, at `stage >= maxStage` (sizes: the medium shift, to tune after play):
- Order: tower, broom, cauldron, **draw**, ladder, **draw-hand**, ghosts, doors (spell where it is available). An
  action screen and a calm screen take turns. Runs end on the broom, so the next run starts on the cauldron, not on
  drawing (`runStart`). With the `drawing` setting off: tower, broom, cauldron, ladder, ghosts, doors (spell).
- Visits: broom 10 → 6 waves; doors 3 → 4 words; draw 3 → 4 words; draw-hand 3 → 4 words. The others stay.
- The doors and the two drawing screens are never halved or skipped at the last stage (`visitLength`, `skipInCycle`
  in `nextOf`). The other screens keep the mastery rules.
- Estimate (rule: every screen comes up in a usual run): a cycle has 4 fewer heart rounds (the broom, where he loses
  most hearts), and drawing costs no hearts, so a run reaches as many cycles as today or more. Drawing goes from about
  1 in 6 rounds of a cycle to about 1 in 4.
- Telemetry: the pass logs a `visit` event at each visit's start: `{ screen, len, rehearse: true }` at the last stage
  (`rehearse` left out below it). The parent's analysis can then tell the rehearse visits from the old ones.

**B. The doors practise the first syllable more, and read past the first letter where they can.** This is honest
about the 11 door words (`data/words.ts:29-39`): only camel/carrot (ג) and ball/dog (כ) share a first letter, so no
key forces reading the whole word. At the last stage:
- `doorWords` picks each word with `pickTarget` on its `w:` feature (his weakest and least-seen words first), never two
  times in one visit. A word that he missed comes back in a later doors visit, not in the same one (rule: growing gaps).
- `doorKeys`: key 2 shares the door word's first letter where the pool has one (camel/carrot, ball/dog); else the same
  first vowel group (a: camel/cat/ball/house; e: carrot/rose/dog). Key 3 is the fallback: another word of that vowel
  group, else a random door word. tent is the only o-word, and fox and cake the only u-words (fox's key 2 is cake and
  cake's is fox); tent and book (the only e-tsere) get two random keys. The pictures stay clearly different.
- Below stage 4 the doors do not change. Real whole-word reading needs more door words: the open question.

**C. More rounds for his weak items.** At the last stage, the unused `NEW_SHARE` slot in `broomTarget` becomes a weak
share (`WEAK_SHARE` 0.3, `logic/stages.ts`). `broomTarget` picks for four screens: the broom, the ghosts
(`rounds.ts:266`), the cauldron's syllable (`:194`) and the ladder's fixed letter (`:221`); the flight boss uses its own
picker and does not change. The weak subset: the items that he mixed up 3 or more times (`confusions`,
`CONFUSION_GROUP_MIN`) and the syllables of his weakest vowel group (the highest predicted `v:`). Gate: the round uses
the subset only when the subset's mean predicted mistake rate is at most 0.25, so the visit stays near 1 in 5; then
`pickTarget` chooses in it as today. `drawWords` gets no extra weight (it already weighs confusions, `draw.ts:71-79`).

**D. Drawing at the 1-in-5 rule.**
- The judge (Hebrew drawing, every stage): a round is a miss only when the hand helped him (after `DRAW_TRIES`) or he
  made 2 or more wrong strokes or mark tries. One wrong stroke that he corrected himself counts as right. (It applies at every stage, and to the Hebrew board only: the English Latin board keeps its own judge.) Reason: the
  adaptive picker (`drawWords`, `needsDemo`) and the 1-in-5 rule read this result; at 69% every letter looks equally
  weak, and the weights say nothing. `draw-done` keeps `wrongStrokes` for the parent.
- A visit's words (`drawWords`, at the last stage): the first word has his best letter (the lowest predicted `dr:`),
  at most 1 weak letter per visit (a recent miss in its last 3), and a letter whose last 2 rounds (either script) were
  misses is held back for 3 drawing visits, then offered again (rule: hold back, then offer again).
- The controller passes `n` = the visit length to `drawWords` (`controller.ts:1776` calls it without `n`, so a visit of
  4 would repeat a word: `DRAW_WORDS` is 3).

## How it stays play, not a test (rules checked)

The same screens, hearts, coins, merchant, crystals and voice lines. No new line, no image, no "practice" mode, no
change that he can see or hear (rule: adapt without letting him see the change). No timer on drawing. The stage does not
go back. The demo and the hand for a wrong stroke or a failed mark stay. The session from the home path
(`SESSION_LENGTH`) does not change. No new asset, so no asset review.

## What the parent sees

The stage line in the parent area (`parent/Settings.tsx`) at stage 4: "Stage 4: whole words. This is the last stage:
each run now gives more time to drawing and to the word doors, and more rounds to the letters and vowels he mixes up."

## Save

One new field: `drawHeld` (letter → drawing visits left), read as `{}` when it is missing, so no migration step and no
version change (`saveFormat.ts` defaults). Old tallies stay; the new judge applies to new rounds only.

## Tasks (each runs `npx vitest related --run <files>` and `npx tsc --noEmit`)

Order: **1 → 2 → 3 → 4** in sequence (each changes `hebrewBaseline.test.ts.snap`, and 2 and 3 share `rounds.ts`);
**5** in parallel. Each updates the Hebrew stage-4 snapshot on purpose and says so in its commit; the English baseline
must not move.

1. **Seam, cycle, visits, telemetry.** `course/types.ts` (`orderOf`, `visitOf` on `CourseStages`), `logic/run.ts`
   (Hebrew values; `cycleOf`, `nextScreen`, `runStart`, also with `lastEnded` from the old order),
   `english/course.ts` (stage-independent functions), `policies/pass.ts` (`visitLength`, `nextOf` skip, the `visit`
   event). Tests: `logic/run.test.ts` (order with drawing on and off, the run after a broom end starts on the
   cauldron), `policies/pass.test.ts`, `course/seam.test.ts`, `course/course.test.ts:18` (the order expectation).
2. **Doors.** `logic/rounds.ts` `doorWords`, `doorKeys` (stage-4 branch). Tests: `logic/rounds.test.ts` (adaptive pick,
   no repeat, key 2 and the fallback for tent, fox, cake, book; stage 3 as before).
3. **Weak share.** `logic/rounds.ts` `broomTarget`, `logic/stages.ts` (`WEAK_SHARE`). Tests: `logic/rounds.test.ts`
   (seeded rng: weak items more often at stage 4 on all four screens; no subset above 0.25; stage 3 as before).
4. **Drawing.** `policies/draw.ts` (the judge), `logic/draw.ts` (the visit's words, the hold), `controller.ts:1776`
   (`n`), `saveFormat.ts` and `store.ts` (`drawHeld`). Tests: `policies/draw.test.ts`, `logic/draw.test.ts`, the
   drawing run test in `useRun.test.tsx` (a visit of 4 has 4 different letters).
5. **Parent line.** `parent/Settings.tsx` stage line; `parent/Settings.test.tsx`.

Then one QA agent: `/verify` at stage 4 on the **production flags** (spell book off: `HEBREW_SPELL_AVAILABLE` false;
staging has it on), with drawing on and off: the cycle order, the door keys, 4 different drawing words, the `visit`
events. Then the full suite before the merge.

## Open question for the parent

More door words, so that the doors ask for the whole word (the image budget). Today no key can make him read past the
first syllable. (a) No new words: B as above. (b) About 10 new door words, chosen in pairs with an existing word's first
syllable (for example a second word that starts גָ like camel), each with a picture and a voice take: 10 images and 10
takes, through the asset review. **Recommendation: (b)**, after A to D are built and played for a week.

My own decisions (no question): the medium shift in A; the drawing judge and plan in D; the Hebrew spell book stays
held back until its voice files and art pass review (it is a separate release step).
