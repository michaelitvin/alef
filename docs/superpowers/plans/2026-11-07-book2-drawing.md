# Book 2 — drawing letters: implementation plan

Spec: [2026-11-07-book2-drawing-design.md](../specs/2026-11-07-book2-drawing-design.md). Rules: [minigame-rules.md](../../minigame-rules.md).
Work test-first (vitest): a failing test, watch it fail, the code, the test passes. Keep every existing test green.

## Coordinates (shared by data, recognizer and screen)

A letter's **normalized box**: plain x/y, origin top-left, y = 0 on the top line, y = 1 on the baseline, x in the same
unit (1 = the distance between the top line and the baseline). Descenders go below 1 (to about 1.5 in print, 2.2 in the
handwriting font), ascenders above 0 (ל). The screen maps it to the stage: `(x, y) → (x0 + x·u, top + y·u)`.

## Tasks

### 1. Handwriting font (public/fonts/ktavyad/)
- Ktav Yad CLM (Culmus, Maxim Iorsh), GNU GPL v2: Type 1 source from the Culmus project (Debian `culmus-fancy`),
  converted to WOFF2 with fontTools (outlines unchanged). Ship the WOFF2, the Type 1 source (`.pfa` + `.afm`, the GPL's
  source), `GNU-GPL` and a `README.txt` with the origin and the conversion.
- `@font-face 'Ktav Yad'` in `duel2.css`; preload it with Sigalit (`assets/preload.ts`).
- The font has no nikkud: handwriting words show their letters without marks.

### 2. Stroke data — `src/duel2/data/strokes.ts` (erasable TS, data only)
- `type Pt = [number, number]`; `interface StrokeDef { pts: Pt[]; either?: boolean }` (either: both directions pass).
- `interface LetterDef { letter: string; script: 'print' | 'hand'; w: number; variants: StrokeDef[][]; strict?: boolean }`
  (`strict`: a pen lift may not split a stroke — ד and ר must differ by stroke count).
- `STROKES: LetterDef[]` — 27 letters × 2 scripts; both variants where sources disagree (print ם ע; hand א ס ע ש ף ץ),
  lenient directions where the research says so. Header: the sources (URLs) and the rules ("like resh", the arch family).
- `strokesOf(letter, script)`.
- Tests (`data/strokes.test.ts`): every letter in both scripts; points inside a sane box; ד print has 2 strokes and ר 1,
  both strict; first point is the start.

### 3. Recognizer — `src/duel2/logic/recognizer.ts`
- Geometry: `resample(pts, n)`, `pathLength`, `bbox`, `ownNorm` (centre and max side), `meanDist`.
- `judgeStroke(drawn, def, frame, first)` → `{ ok, why?: 'start'|'direction'|'shape', score }`:
  shape = mean distance of the own-normalized resampled paths (N = 32), forward and reversed; direction = the reversed path
  fits clearly better; start (not on the first stroke: the position in the slot does not matter) = the start point in the
  fitted frame, tolerance relative to the letter size; plus the place of the stroke (centroid) and a size ratio.
- `class LetterChecker(def)`: `add(stroke) → { kind: 'ok'|'partial'|'wrong', index, why?, done }`; keeps every variant
  alive that agrees so far; fits the frame (uniform scale + shift) to the accepted strokes; a stroke that fails the next
  stroke but passes a later one is `order`; a piece that fits the first part of the next stroke is `partial` and is joined
  with the next piece (not for `strict` letters); `force()` accepts the expected stroke (the hand drew it); `expected()`
  gives the next stroke (variant 0 of the living ones) in normalized units.
- Marks: `MarkSpec { zone: 'under'|'inside'|'above-right'|'above-left'|'above-left-of-letter'|'vav-left'|'vav-above', shape: 'dot'|'dots2'|'dots3-tri'|'dots3-diag'|'bar'|'T' }`;
  `classify(strokes)` (dot / bar / tick by extent), `judgeMarks(strokes, specs, boxes)` → `{ state: 'more'|'ok'|'wrong' }`,
  `markTargets(specs, boxes)` (where the hand taps).
- `lineFeedback(inkBox, def, frame)` → `'tall' | 'low' | 'small' | null` and the part outside the lines.
- Tests (`logic/recognizer.test.ts`), synthetic strokes from the data: right; wobbly (noise); scaled ½× and 2×; shifted;
  reversed → direction; wrong order → order; ד drawn as ר and ר drawn as ד → wrong; a pen lift that splits a stroke →
  accepted (not for ר); every letter of both scripts passes its own data; a few cross-letter pairs fail; marks by place
  and count (צירי vs סגול vs קובוץ, dagesh inside, shin/sin dot side, shuruk left of the vav); line feedback.

### 4. Round logic — `src/duel2/logic/draw.ts`
- `drawWords(ctx)`: 3 words a visit from `WORDS`, weighted to letters he mixes up (confusions) and to letters he drew
  wrong (`dr:` tallies); no letter twice in a visit.
- `scriptFor(stage, n)`: print below stage 3; from stage 3 print and handwriting alternate.
- `splitWord(word, script)`: the slot's letter, the bare vav when the first vowel sits on it, the rest of the word (no
  marks in handwriting; the asked marks removed).
- `marksFor(word, stage)`: none at stage 1; from stage 2 dagesh, then the ש dot, then the vowel (research order).
- `needsDemo(letter, script, save)`: the first visit, a letter not drawn yet in that script, or drawn wrong recently.
- Tests (`logic/draw.test.ts`).

### 5. Run and save
- `ScreenId` gets `'draw'`; `VISIT.draw = 3`; `cycleOf(stage, draw)` puts `draw` after `ghosts` only when the setting
  is on (`nextScreen`, `runStart` take the flag). Tests in `run.test.ts`.
- `Duel2Settings.drawing` (default false; an old save without it reads as off). `strokeMarks: Record<string, 'ok'|'wrong'>`
  in the save (review page marks), exported with telemetry.

### 6. Controller — `runDraw` in `controller.ts`
- `DrawView { screen: 'draw', word, script, letter, slot: {...}, strokes, pending, wrong, mode: 'letter'|'mark'|'done',
  demo?: { id, strokes: Pt[][] , taps?: Pt[] }, marks, lineFx?, glowZone? }`.
- Gesture `{ type: 'stroke', pts }` (stage units). Round: the word (`w-<id>`); the demo (`demo-draw` the first time;
  later only when `needsDemo`); he draws; each stroke judged on lift; a right stroke turns gold (sfx); a wrong one fades
  and the hand shows that one stroke (`draw-again`, the first wrong stroke of a round only); after 3 wrong tries of the
  same stroke the hand draws it and the round goes on; line feedback after the letter (`line-*`, the letter counts);
  then the marks (`draw-mark`, the zone glows); done: glow, sound, the word again, a star.
- No hearts lost. Idle 8 s: `q-draw` + the word; 16 s: the hint (the demo of the next stroke). The hint button replays the
  demo. Replay says the word. Pause: the round restarts.
- Telemetry: `draw-start`, `draw-stroke`, `draw-done`, `draw-lines`, `draw-mark`; tallies `dr:<letter>:<script>`, `sc:draw`.
- Tests in `useRun.test.tsx` with fake timers and strokes made from the data.

### 7. Components
- `components/StrokeAnim.tsx`: draws strokes one by one as glowing lines that follow the hand (shared `HandShape` from
  `DemoHand.tsx`), with optional stroke numbers; `strokeTiming(strokes)` shared with the controller.
- `components/screens/Draw.tsx`: the picture, the board with the writing lines (top, middle, baseline, below), the word in
  its script with the framed slot (pulsing on his turn), his strokes (white live, gold accepted, fading wrong, orange line
  feedback), the mark zone glow; pointer/touch capture on the board → `onStroke`.
- `screens/Play.tsx`: the `draw` case; the hearts stay visible.

### 8. Parent area
- `screens/Strokes.tsx` (`#/strokes` and a button): every letter in both scripts animated with the hand and the stroke
  numbers next to the font's letter; a speaker for the letter name (`ln-<id>` where one exists); looks right / wrong marks.
- `screens/DrawTest.tsx`: choose a letter and a script, draw it, see each stroke's verdict (ok / why) and the line feedback.
- Setting "Drawing screen in the game" (off by default). Gallery entries: drawing — print, drawing — handwriting.
- Tests in `parent.test.tsx`.

### 9. Voice lines (`data/lines.ts`; no audio generated)
`demo-draw` (1), `q-draw` (3), `draw-again` (3), `draw-mark` (1), `line-tall`, `line-low`, `line-small` (1 each).
Short, full nikkud, no "!" and no "…" endings.

### 10. Verify
`npm test`, `npm run build`, the verify build, screenshots at 844×390 and 1180×820 (print, handwriting, demo hand mid
stroke, a wrong stroke corrected, line feedback, a mark asked, the review page, the test board), real touch strokes.
