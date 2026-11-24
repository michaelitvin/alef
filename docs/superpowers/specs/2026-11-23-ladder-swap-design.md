# Ladder: see the swap (design)

The parent's note (2026-11-23), after the two-beat demo of 2026-11-22-english-ladder-clarity-design.md was built: "It's
still not clear what you're supposed to do in the ladder game." An observation of the staging build (fresh save, stage 1
and 4, 1024×768 and 740×360) found, most blocking first:

1. He never sees the change happen. The letter plate vanishes and a whole-word plate appears on the rung.
2. The old and the new word are two bare words about 1 s apart ("map … man"). After a right answer he hears his own
   word, then at once the next target, so his word sounds like the next task.
3. The same word shows two times, stacked: the rung `tap` and above it the box row `t a p`.
4. The plates offer the letter that goes out (`t` when the gold box holds `t`): matching, the easiest move for a child
   who cannot read, is offered and is wrong.
5. At 740×360 the boxes are about 30 px and the wizard about 70 px; the right 40% of the screen is empty. The wizard
   stands in the air beside the ladder.

## Decisions (the parent, 2026-11-23)

- The demo stays as it is: it does **not** make a full swap.
- Build A, C, D below and the small layout changes; keep them simple. Make the Hebrew ladder consistent.
- Not now: a small lifted plate beside the row (E), the hand again after the blend hint (F).

## What changes

**A. The swap happens on the rung (both courses).** Today a right answer empties the plates and adds the rung in one step
(controller: `plates: []` with the new rung), and the wizard's 450 ms climb starts at the same moment, in both courses.
One shared sequence replaces it, driven by a new `LadderView` field (for example `placing: { id, step }`) that the
controller steps:
1. The plate flies to its place: English, into its box (or the gap); Hebrew, onto the rung (about 250 ms).
2. English: the old letter drops out and fades, and the row reads the new word (about 250 ms). Hebrew: none.
3. The word is said, on the ladder **every time** (also after a confident answer: the word is the swap's feedback).
   As it starts, the row turns into the rung's plate in the same place (English) and the wizard climbs while it plays.
4. Then the next rung: its box row rises from the new rung to its place (about 300 ms, keyed by `built.length`, so a
   pause/resume or a re-render does not replay it). The rise is the answer to "the word shows two times": the row is
   seen as a copy of the word below, made to change.
The mistake path (`fix()`: the right plate after a wrong one) plays the same sequence (rule: the right move does what a
right answer does). Overlap the steps; add no fixed pause over about 350 ms (pace rule, `game-play-learning.md`). The
pause handlers clear `placing`.

**C. "And now:" before each new word (both courses).** On every rung after the first one he makes, the voice says
`this.course.lineAudioId('target-new', 1)` ("And now:" / "וְעַכְשָׁו...": takes 2 and 3 say "catch") before the target
word. The answers open and the place glows on the target word's start, not on "And now:". Not on the first rung (English:
`built.length > 1`, the foot counts; Hebrew: `built.length > 0`), not when the demo said the words, not in the idle
replay. Update the line's description in both `lines.ts` files. Both files exist; no new recording (listen once to the
Hebrew take with "...").

**D. No matching trap (both courses).** The plate count stays 3, filled from the same pool.
- English: no plate has the text or the sound of the part that goes out (`below[at]`), in both branches of `partPlates`
  (also the silent-e `letterPool` branch). On a grow rung (lip → slip) nothing goes out. This can drop his confusion
  partner when it is the outgoing letter; that is accepted.
- Hebrew (`ladderPlan`, the rung below is `steps[k-1].target`): letter mode, filter `all` by sound (fall back when fewer
  than 2 are left, `sylFor` can return null); vowel mode, filter `look` and the filler; dot mode, draw the target again
  until its near-miss pair is not the rung below.

**Layout (both courses).** At 740×360 the band view's scale comes from the height (about 0.38), so the empty right side
does not make the scene larger. Instead, within the stage:
- The box row is wider: a box is 125 stage units (about 44 CSS px at 740×360, where the scale is about 0.357) for a word of up to 4 boxes. The
  rule asks for about 56 px; the boxes stay at 44 px as a recorded exception, because the tap strip is the whole row and a
  tap goes to the nearest box. Write the size as a constant.
- The wizard moves left to make room, and stands on the ladder's level: his feet at the y of the rung he made, his right
  edge at the left rail. He never covers a rung's word or the box row; shrink him before the boxes.
- The plates stay at least as large as today.

No new images. No new text on screen. The demo of 2026-11-22, the glows and tap-then-place stay.
Option (one line, not built): dim the rung below while its copy is changed.

## Tasks

They are built in parallel in separate worktrees; task 1 merges first.
1. **A + layout** (`Ladder.tsx`, the controller's answer branch and `fix()`, the pause handlers; run tests in
   `src/spellquest/english/ladderRun.test.tsx` and the Hebrew ladder run tests).
2. **C** (the controller's round start for the ladder only). Its tests check only that `target-new-1` comes right
   before the target cue, and that the first rung and the rung after the demo have none.
3. **D** (`src/spellquest/english/logic/rounds/ladder.ts`, `src/spellquest/logic/rounds.ts` `ladderPlan`; logic tests).
4. **Verify** after the merge: `/verify` ladder checks at 1024×768 and 740×360, both courses, also a confident answer, a
   mistake then the fix, and a Hebrew dot ladder; screenshots of a rung start, the swap and the climb for the parent.

## Addendum (the parent, 2026-11-24): the wizard on the ladder, both courses

The parent wants the wizard the same in both courses, on the ladder, not made small. Mocks: the alef scratch page
`ladder-wizard/` (round 1, option 3, `id: 'top'` in its `index.html`, which holds the exact coordinates). He picked **option 3**:
- The wizard stands in the middle of the ladder, on the newest rung, at about 250 stage units (today 230). He covers no
  rung word: he stands on top of the newest rung, in the empty space where the next rung goes.
- The ladder moves left (centre x about 530) and the plates right (about x 1425).
- The next rung is made **beside the ladder** at the next rung's height: English, the box row (125-unit boxes, or more if
  it fits); Hebrew, an empty dashed rung. The plate flies into it (the swap of part A happens there), then the made rung
  slides into the ladder under his feet and he climbs onto it. The drop zone is that slot; the demo hand goes to it.
- The mock found one fault: on a 740×360 phone the top English rung's box row sits under the top bar. Fix it within the
  option (my call: rungs about 130 apart instead of 150, as the round 2 mock did; or fewer rungs per visit only if 130
  does not fit). Nothing may sit under the top bar.
- Everything else of this design stays (the swap, "And now:", no matching trap, the timings).

Task 5 (one agent, Opus: layout and the swap's last step in `Ladder.tsx` and the controller's swap): build it for both
courses; update the run tests, the layout tests and the `/verify` ladder checks (`englishFit`: the row clear of the
wizard and the top bar). Then a QA agent drives both courses at 740×360 and 1024×768.
