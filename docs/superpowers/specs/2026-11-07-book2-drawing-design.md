# Book 2 — drawing letters (print and handwriting)

Status: approved by the parent in conversation (2026-11-07: "implement ... your recommendation for strokes and
drawing"). Builds on [the Book 2 design](2026-10-19-duel-book-2-design.md). Read
[docs/minigame-rules.md](../../minigame-rules.md) first: every rule applies (speech instead of text, demos that do the
gesture with a hand, no way out on child screens, effects before the voice, praise words only twice, …).

## Why

The child reads well but mixes up how letters are written: stroke order and direction (the parent: "he often mixes
them up"), and he does not yet sense the writing lines (letters too high, low, tall or short). He needs both print
(כתב דפוס) and handwriting (כתב יד): Israeli first grade starts in print and moves to handwriting during the year.

## Goals

1. A drawing screen in Book 2's lap where he draws the first letter of a word, from memory, in print or handwriting.
2. Correct his strokes early: each stroke is checked when he lifts his finger; a wrong one is shown again by a glowing
   hand, his right strokes stay, and he redraws only the wrong one.
3. Teach the writing lines without failing him for them.
4. Marks too: the dagesh (בּ כּ פּ), the dot of שׁ/שׂ, and the vowel of the first syllable, checked by place and count.
5. A stroke-order review page for the parent (every letter animated) and a test board in the parent area, so the check
   is tuned before the child meets it.

## Non-goals

Matching print with handwritten letters (its own game, later). Whole words. Final letters inside words (a first letter
is never final; finals appear only on the review page and the test board, for completeness).

## Anti-goals

- Rejecting a correct letter because it is wobbly, small, big, or has a gap — frustration kills it.
- Teaching a wrong stroke order. Every letter's strokes are checked by the parent on the review page before the screen
  goes to the child (the screen stays out of the child's lap until the parent approves the stroke data: a parent setting
  "drawing in the game" off by default, on after review).
- Hearts lost for drawing. Text on a child screen.

## The screen (decided with the parent)

- **Place in the lap:** after the ghosts, before the doors (my call). Each visit: 3 words (my call), one after another.
- **Layout:** the word's picture, and the word on writing lines with its first letter missing: an empty slot, framed,
  where he draws. The rest of the word is shown in the script he must use — print (the game's print font) or
  handwriting (a free Hebrew handwriting font, e.g. an OFL school-style cursive; the builder finds one with a licence
  that allows shipping in a public repo and records it). The script of the slot is the script of the word.
- **Writing lines** across the slot: the top line, the middle line, the baseline, and the line below (for ק ך ן ף ץ
  and the handwriting descenders). Marks go under the baseline / above the top line as the stroke data says.
- **Words:** from `WORDS` (they have pictures and the voice already has the word). Prefer words whose first letter he
  mixes up (confusion tallies); print and handwriting alternate, handwriting only from stage 3 (my call).
- **A round:**
  1. The voice says the word (`w-<id>`), then the instruction on the first rounds (`q-draw`, only when he waits after
     the first visits — same idle rule as other screens).
  2. **Demo first** (the parent: "start from showing him the tracing order"): a glowing hand draws the letter in the
     slot stroke by stroke (each stroke a glowing line that follows the hand), then fades. On later visits the demo
     plays only for a letter he got wrong recently or has not drawn yet (my call), and the hint button replays it.
  3. He draws from memory in the empty slot (the parent wants memory drawing from the start).
  4. Each stroke is judged when the finger lifts (see Checking). A right stroke turns gold and stays. A wrong stroke
     fades out, the hand shows that one stroke, and he draws it again. After 3 wrong tries of the same stroke the hand
     draws it for him and the round goes on (no dead end).
  5. If the word needs a mark (the first syllable's vowel; a dagesh; the שׁ/שׂ dot), the voice asks for it after the
     letter ("עַכְשָׁו הַנִּקּוּד"), and he draws it: dots are taps or short strokes, judged by place and count.
  6. Done: the letter glows, a sound, the voice says the word again, a star (as everywhere: the run's points).
- **No hearts** are lost on this screen. The hearts row stays visible but unchanged.
- **Lines** (the parent: too tall/short "should let him know, but not invalidate the character"): after the letter is
  accepted, if it pokes above the top line, sinks below the baseline (a letter that should not), or is much too small,
  the part outside the lines glows orange for a moment and the voice says a short line ("קְצָת גָּבוֹהַּ מִדַּי",
  "קְצָת נָמוּךְ", "קְצָת קָטָן") — the letter still counts.

## Checking (the recognizer)

- **Stroke data:** for each letter (22 + 5 finals) × script (print, handwriting): an ordered list of strokes, each a
  polyline in the slot's normalized box (x right to left is NOT assumed: plain x/y, origin top-left), with the
  start point first. Authored from `stroke-order` research (host-local notes, summarized in the data file's header
  with sources). Where sources disagree (print ם ע; handwriting א ס ע ש ף ץ) the data holds both variants and either
  passes. A pen lift that splits one stroke into two is accepted when the two together match the stroke.
- **Per stroke, when the finger lifts:** resample his stroke and the expected stroke to N points and compare:
  1. start point near the expected start (tolerance relative to the letter size),
  2. direction (the start is nearer the expected start than the end is),
  3. shape (mean point distance after normalizing position/scale of the stroke within the letter's box, or a $1-style
     path distance),
  4. order: it must match the next expected stroke (a stroke that matches a later stroke is "wrong order": the hand
     shows the stroke that comes first).
  Tolerances are forgiving (wobble, size and position inside the slot do not matter); only start, direction, order and
  rough shape do. ד and ר differ in their strokes (the parent): ד is two strokes (top line, then the down line from
  its right end, with a corner); ר is one curved stroke — the data and the check must tell them apart by stroke count
  and the corner.
- **Marks:** place (under the letter / inside it / above the right or left arm / left of a vav at mid-height) and count
  (1 dot, 2 dots side by side, 3 dots in a triangle or a diagonal, a short line, a T) — order inside a mark is not
  checked.
- The recognizer is plain TypeScript, no model, no network; unit-tested with synthetic strokes (right, wobbly, reversed,
  wrong order, ד drawn as ר and back).

## Parent area

- **Stroke review page** (`#/strokes` in the parent area): every letter in both scripts animated with the glowing hand,
  stroke by stroke, with the stroke numbers, next to the printed letter; a speaker for the letter name. The parent
  checks every letter here. A per-letter "looks right / wrong" mark is a nice-to-have (stored locally, exported with
  telemetry).
- **Test board:** a parent screen where the parent draws any letter (chosen from a list) in either script and sees the
  check's verdict for each stroke and the line feedback, to tune the tolerances.
- **Setting:** "drawing screen in the game" (off until the parent has reviewed; the gallery can always open it).
- **Gallery:** an entry for the drawing screen (print, handwriting).

## Voice lines (new; Hebrew with nikkud, generated with the existing pipeline; the parent reviews on the review page)

`demo-draw` (1), `q-draw` (3: draw the first letter of the word), `draw-again` (3: "let's draw this line again"),
`draw-mark` (1: now the nikkud / the dot), `line-tall`, `line-low`, `line-small` (1 each). Praise: reuse `streak`.
The builder adds them to `src/duel2/data/lines.ts`; generation is done after the merge (not by the builder).

## Telemetry

`draw-start {word, letter, script}`, `draw-stroke {letter, script, n, ok, why: start|direction|shape|order}`,
`draw-done {letter, script, ms, wrongStrokes, helped}`, `draw-lines {letter, kind}`, `draw-mark {mark, ok}`.

## Left to the builder

The handwriting font choice (licence), N and the tolerances (tuned on the test board and in tests), the glow and hand
animation, exact layout, how marks are entered (tap vs short stroke), the review page layout.

## My calls (for the parent to check)

Place in the lap, 3 words a visit, handwriting from stage 3, demo only when needed after the first visits, 3 tries per
stroke then the hand draws it, the setting off until review.
