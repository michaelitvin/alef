# English ladder: what to do (design)

The parent's note (2026-11-22): "The ladder screen UX isn't clear." Asked what is unclear, he chose only **what to do**:
the child does not understand the goal or what to do first. This design changes only that.

Out of scope: the tap bug (a tap on the right plate says "Really close"; a drag works) is fixed on
`fix/english-ladder-tap`. This design does not depend on the tap: the demo shows a drag, and every step works with a drag.

## 1. What the child sees and hears now

Seen in the staging verify build, a fresh English save at stage 1, the ladder station, at 1024×768 and 740×360
(audio ids from the verify build's log `__d2audio`). Times are from the touch on play.

| Time | He sees | He hears |
| --- | --- | --- |
| 0.3 s | The demo. The foot rung `sat`. Above it a row of boxes `s a t`, the `a` faded in a gold box. Three plates `p i a`. A hand drags `i` to the gold box, over and over. | `demo-ladder`: "Drag up the letter that makes the word I say, and the wizard climbs." |
| 5.3 s | The demo ends by itself. The same screen, with the top bar. | "sat" |
| 6.1 s | The plates open. | "sit" |
| 6–14 s | Nothing changes. | Silence. |
| 14.8 s | — | "Which letter makes:" "sit" (the idle line) |
| 22.6 s | The hint card. | "s · i · t · sit" |
| drag | The plate becomes the rung `sit`; the wizard steps up. | "sit" |
| +1.3 s | The next box row `s i t` (gold `s`), plates `t n f`. | "fit". No other words. |

Where "what to do" breaks:

1. **The demo says "the word I say" before any word is said.** The words come after the demo ends. The demo never says
   the new word, and never shows it: the dragged plate covers the box row (screenshot 1), and the hand loops back
   before the letter lands. The wizard does not climb in the demo.
2. **The first thing on the screen is the old word two times.** The foot says `sat`; the box row also shows `s a t`
   (screenshot 2). The new word `sit` is only heard, and it comes 0.8 s after `sat`, with nothing that says which word is
   which.
3. **There is no goal on the screen.** The ladder's top is empty. Nothing says or shows "climb to the top" until the
   end line `ladder-top`.
4. **The gold box is not explained.** Nothing says that the gold box is the place where the new letter goes. It does
   not glow, and the drop place does not glow while he drags (rule `interaction-input.md`, *Drag and drop*).
5. **He sees the demo one time in his life, for 5 s, and it does not come back.** After it, an unsure child waits 8 s
   in silence.

## 2. What changes

**A. A demo in two beats (first ladder visit).** The demo uses the first round (as now) and plays in this order.
Each beat waits for its line to end (`voice-delivery.md`, audio sequencing):

1. The foot rung glows. Voice: new line `demo-ladder-look` "This word is:", then the foot word ("sat").
2. The gold box pulses. Voice: `q-ladder` take 1 "Find the letter that makes:", then the new word ("sit"). The hand
   drags the right plate to the gold box, over and over, while he plays. The demo does not make the rung (D1): he makes
   the first rung himself. The hand must not cover the box row or the foot rung.

The old `demo-ladder` line is not used on the English path any more (Spell Quest's Hebrew course keeps its own).

**B. A clear start on each rung (no new audio).** While the foot word plays, the foot rung glows; while the new word
plays, the gold box glows; the gold box keeps a soft pulse while he can answer. While he drags, the box row glows, and
more when the plate is over it.

**C. Tap, then tap the place, on an unmarked rung (stage 4 and up; D4).** A tap on a plate lifts it above the box row,
and the boxes glow. A tap on a box answers with that plate in that place: the right plate in the right place makes the
rung; the right plate in another place is "almost" (no answer, no heart, the plate goes back); a wrong plate is wrong.
A tap on another plate lifts that one instead; a tap on the lifted plate puts it back. The drag stays as it is. On a
marked rung (the gold box) a tap answers at once, as today. This replaces the fix on `fix/english-ladder-tap`, which
let a tap count anywhere.

No instruction is added to each round: the rules say the demo teaches the screen, and a round plays only its word
(`game-play-learning.md`). No text and no Hebrew is added.

Extras (not in the tasks; one line each):
- At 740×360 the boxes are about 30 px: a larger box row on a phone.
- The `?` button gives the blend of the word, not what to do: it could replay beat 2 on the first visits.

## 3. Decisions (the parent, 2026-11-22)

- **D1.** The demo shows only the drag. The child makes the first rung.
- **D2.** No goal picture at the top: a ladder is plainly there to be climbed. No `demo-ladder-goal` line.
- **D3.** No extra demos at stage 4 and stage 5. Stage 5's new box reads like the gold box; stage 4's change (find the
  place) is carried by D4 and the glows of B.
- **D4.** On an unmarked rung, a tap lifts the plate and a second tap on a box places it (C).

## 4. Tasks

Both touch the controller and `Ladder.tsx`, so they are built one after the other on one branch from `main`.

1. **Tap, then the place** (C): the controller's ladder answer and `Ladder.tsx` (the lifted plate, the glowing boxes),
   with run tests in `src/english/ladderRun.test.tsx`. Hebrew baselines unchanged. Replaces commit f30ad5c's rule.
2. **Demo and cues** (A, B): the two-beat demo for the English course, the hand clear of the rows, the glows. One new
   voice line `demo-ladder-look` "This word is:" in `src/english/data/lines.ts`, recorded per
   `asset-sources/english/README.md`; screen the takes, then the parent's review on the review kit (non-blocking).
   Tests: the order of the audio ids; the glow attributes by phase; the Hebrew course unchanged.
3. **Verify**: a driver check of the first ladder visit and of an unmarked rung by taps, at 1024×768 and 740×360.

Images: none.
