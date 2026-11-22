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

**A. A demo in three beats (first ladder visit).** The demo uses the first round (as now) and plays in this order.
Each beat waits for its line to end (`voice-delivery.md`, audio sequencing):

1. The foot rung glows. Voice: new line `demo-ladder-look` "This word is:", then the foot word ("sat").
2. The gold box pulses. Voice: `q-ladder` take 1 "Find the letter that makes:", then the new word ("sit"). The hand
   drags the right plate to the gold box. The letter lands **in the box** (the box row now shows `s i t`), the word is
   said again, and the wizard climbs one rung.
3. The top of the ladder glows (see B). Voice: new line `demo-ladder-goal` "Each new word is a step. Build the ladder
   up to the star." Then the demo rung goes back, and the round starts ("sat", "sit") as now.

The old `demo-ladder` line is not used on the English path any more (Book 2 keeps its own).

**B. A goal at the top.** A star sits above the top rung on every English ladder. It glows in beat 3, and at
`ladder-top` the wizard reaches it. It uses the star that the top bar already shows (no new picture).

**C. A clear start on each rung (no new audio).** While the foot word plays, the foot rung glows; while the new word
plays, the gold box glows; the gold box keeps a soft pulse while he can answer. While he drags, the box row glows, and
more when the plate is over it.

No instruction is added to each round: the rules say the demo teaches the screen, and a round plays only its word
(`game-play-learning.md`). No text and no Hebrew is added.

Extras (not in the tasks; one line each):
- At 740×360 the boxes are about 30 px: a larger box row on a phone.
- The `?` button gives the blend of the word, not what to do: it could replay beat 2 on the first visits.

## 3. Decisions for the parent

1. **Who makes the demo rung?** (a) The hand makes it, then he plays the same rung (as the cauldron's demo).
   (b) The hand loops over the right plate while he plays, and he makes the first rung himself.
   **Recommendation: (a).** He must see the result (the new word in the boxes, the climb) one time before he acts.
2. **The goal at the top:** (a) the existing star; (b) a new picture (for example the moon); (c) no picture, voice only.
   **Recommendation: (a).** No image budget, and the star is already his reward for a right answer.
3. **Show the demo again when the rung changes kind?** At stage 4 the gold mark goes away (he finds the place), and at
   stage 5 a new box comes in (`lip → slip`). Today nothing explains either. (a) A short beat-2 demo at the first ladder
   of stage 4 and of stage 5, with one new line each. (b) No. **Recommendation: (a)**, built after the tap fix lands
   (an unmarked rung needs a drop place; a tap gives none).

## 4. Tasks

Tasks 1, 2 and 3 can be built in parallel. Task 2 and task 3 touch only `Ladder.tsx`; task 1 touches the controller
and `Play.tsx`.

1. **Demo beats** (`src/duel2/controller.ts` demo path for the ladder, `src/duel2/screens/Play.tsx` `demoPath`, the
   course seam for the English lines). The three beats of A; the landed letter shows in the box row; the wizard climbs
   in the demo and goes back. Book 2's ladder demo stays as it is. Tests: the order of the audio ids; Book 2 unchanged.
2. **Star at the top** (`src/duel2/components/screens/Ladder.tsx`, English only). Its glow in beat 3; the wizard
   reaches it at `ladder-top`. Check with `englishFit` that it stays clear of the top bar at both sizes.
3. **Rung cues** (`Ladder.tsx`, a screen flag from the controller). The glows of C. Tests: the glow attributes by phase.
4. **Voice lines** (in `src/english/data/lines.ts`; record per `asset-sources/english/README.md`, with `audio.json`
   entries; screen the takes, then the parent's review on the review kit):
   - `demo-ladder-look`: "This word is:" (then the word, recorded alone)
   - `demo-ladder-goal`: "Each new word is a step. Build the ladder up to the star."
   - If decision 3 is (a): `demo-ladder-find`: "Now the new letter has no gold box. Find where it goes, and drag it
     there." and `demo-ladder-grow`: "Sometimes a new letter comes in, and the word grows."
5. **Verify** (after 1–4): a driver check of the first ladder visit (audio order, screenshots of each beat) at
   1024×768 and 740×360.

Images: none new (decision 2 (a)).
