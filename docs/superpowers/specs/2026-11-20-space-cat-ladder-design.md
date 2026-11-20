# Space Cat — a longer ladder, fast placement and adaptivity that holds back

Status: draft for the parent (2026-11-20). It replaces the section *Finding his level* of
[the Space Cat design](2026-11-12-space-cat-design.md) and adds to its *Voice*, *The parent area* and *Tracking*.
Everything else in that design stays. Read [docs/minigame-rules/](../../minigame-rules/README.md) before building: every
rule there applies. The section *Rule review* at the end says how this design meets them.

The research behind it (the curriculum sources, the simulations) was given to the parent on 2026-11-20 and is not in
this repository. The parent answered its eight open questions; the answers are decisions and are marked "the parent"
below. My own calls are marked *my call*.

**Words.** This design keeps the glossary word **rung** for one step of the ladder (the research said "step"). New
words, for the builder to add to `GLOSSARY.md`:

- **Frontier**: the rung he works on now. Most sums come from it.
- **Passed**: a rung he showed that he knows. Its sums come back as review.
- **Placed**: a rung that placement jumped over or confirmed; passed, but on probation until he answers it again.
- **Held**: a rung he clearly failed. It is not offered for a number of play days.
- **Play day**: a visit that starts 12 hours or more after his last answer. All holds and re-checks count play days, not
  calendar days.
- **Probe**: a round that tests a rung above the frontier. It looks like any other round.
- **Strand**: a line of rungs that build on each other (plus and minus; comparison; counting and times).

## Why

- The parent: "The game should learn the kid's level more quickly. Also, it should take him to more advanced skills
  (I only got to 2-digit addition and subtraction after a while playing)."
- Today the ladder ends at sums to 20 (rung 6). Times and divide are off unless the parent turns them on. A strong child
  needs about 52 answers, a typical child about 105, to reach the top, and then the game has nothing new.
- Every child starts at `1 + 1` and climbs one rung at a time. Only about 42% of a strong child's answers are on the top
  rung, so the climb is slow. One slip ends the fast start. He never moves down.
- The wrong planets are always the answer ± 1 to 3. For 2-digit sums the ones digit alone gives the answer, and the
  planets catch none of the usual errors (forgot the ten, took the smaller digit from the larger).

## Goals

1. **Quick placement.** A child who knows a lot reaches his real level inside his first run (about 30 answers).
2. **More advanced skills.** The ladder goes from `3 + 2` to 2-digit plus and minus with regrouping, comparison,
   counting in jumps, times and divide to 10 × 10, and mental sums with hundreds (Israeli grades 1 to 3).
3. **Everything on, the game adapts** (the parent). All content is on by default. Placement and the up and down rules
   decide what he sees. A rung that he clearly fails is held back for a while and then offered again.
4. **Practice one rung above what he knows, never two.** The sums come mostly from the frontier.
5. **The parent sees his level**: the rungs, which are passed, placed or held, and how it changed over the days.

## Non-goals

- No new art in the painted style. The equal-groups dots are drawn in code.
- No new round shape beyond the two new kinds (comparison, counting in jumps). No word problems, no remainders, no
  column sums, no 4-digit answers (they do not fit a planet).
- No counting down in jumps in this version (`40, 30, 20, ◯`); see *Left to the builder* for why.
- No change to levels, hearts, points, ships or the controls. The speed rules stay; only their state is kept per band
  of difficulty (see *Practice*).
- No change of the signs: `×` and `÷` stay (the parent).

## Anti-goals (a failure even if it works)

- **A frustrated child.** Never more than 2 mistakes in a row at the frontier; a rung he fails is taken away, not
  repeated until he cries.
- **Text that the child must read.** Digits and the signs `+ − × ÷ = < >` are the learning content. Nothing else is
  written on a child screen.
- **A narrated number.** No voice line says a number. The new lines explain a sign or a kind of round, with no number.
- **A visible test.** Placement and re-checks look exactly like normal play. Nothing shows or says that it got easier or
  harder. Visible progress (levels, points, ships) never goes back.

## The rungs

31 rungs in one fixed **order**. Each rung belongs to a strand and names the rungs it **needs**. The order is the one the
frontier and placement walk; the needs say what a rung builds on.

**The planets of every round (the general rule).** One planet has the answer, three are wrong:

1. *Misconception planet:* his recorded wrong pick for this item if he has one, else the rung's misconception number
   (column *Misconception* below).
2. *Near planet:* the answer ± 1 (a counting slip).
3. *Place planet:* for an answer of 10 or more, the answer ± 10; below 10, the answer ± 2.

All four are different, not negative, and not above the highest number of **that rung** (rule: wrong answers only from
content he learned). On rungs with 2-digit answers, at least one wrong planet has the answer's ones digit and one has its
tens digit, so that neither digit alone gives the answer. If a planet has no legal number, use ± 2, then ± 3 (today's
rule). The right planet's lane follows today's rule (off the ship's lane in 9 rounds of 10).

**Items.** An item is still one fact with its ring (`3 + 4 = ◯`, `3 + ◯ = 7` are two items). An item belongs to exactly
one rung, by the *Content* column read exactly. Where two rows could take the same fact, this list decides: rung 4
(make ten) before rung 6; rung 8 (whole tens: `10 + 10`, `20 − 10`) before rung 7; rung 9 (doubles) before rungs 7 and
10. Rungs 1, 2, 3 and 5 keep all their small facts: `3 + 4`, `2 + 2` and the demo `1 + 1` stay in rungs 1 and 3, because
rungs 7 and 9 hold only sums of 11 or more.

### Strand A: plus and minus

| Order | Rung | Content | Example | Misconception planet | Needs |
| --- | --- | --- | --- | --- | --- |
| 1 | **1** plus, sum to 5 | a + b, sum ≤ 5 | `3 + 2 = ◯` | a shown number (`3`) | — |
| 2 | **2** minus within 5 | a − b, a ≤ 5 | `5 − 2 = ◯` | the sum (`7`): wrong sign | 1 |
| 3 | **3** plus, sum 6 to 10 | sum 6 to 10 | `6 + 3 = ◯` | a shown number; answer − 1 (counted the start twice) | 2 |
| 4 | **4** make ten | a + ◯ = 10, a 1 to 9 | `7 + ◯ = 10` | `17` (added the shown numbers), else `7` | 3 |
| 5 | **5** minus within 10 | a − b, a 6 to 10 | `9 − 4 = ◯` | a shown number (`9` or `4`) | 4 |
| 6 | **6** missing number within 10 | ring at b, all + and − facts to 10 except rung 4's | `4 + ◯ = 9`, `9 − ◯ = 5` | the two shown numbers added (`13`, `14`) | 5 |
| 7 | **7** the second ten, no crossing | + with a sum 11 to 20 and the ones not crossing (`10 + b` too); − from 11 to 20 with no crossing | `13 + 4`, `17 − 4`, `10 + 6` | answer − 10 (dropped the ten: `7`) | 6 |
| 9 | **8** whole tens | tens ± tens, answer 10 to 100 | `30 + 40`, `70 − 20` | the dropped zero (`7`); the other two planets whole tens (± 10), never ± 1 | 7 |
| 10 | **9** doubles and near doubles | a + a with a 6 to 9, and a + (a + 1) or (a + 1) + a with a 5 to 8 (sums 11 to 18) | `6 + 6`, `7 + 8` | the next double (`14` or `16` for `7 + 8`) | 7 |
| 11 | **10** plus, crossing ten | a, b 2 to 9, sum ≥ 11, not rung 9 | `8 + 5` | the ones only (`3`) | 9 |
| 12 | **11** minus, crossing ten | a 11 to 18, b 2 to 9, the ones cross | `13 − 6` | smaller from larger: `10 + (b − a's ones)` (`13`) | 10 |
| 13 | **12** missing number first, within 20 | ring at a, + and − facts with numbers ≤ 20 | `◯ + 4 = 9`, `◯ − 3 = 8` | the inverse slip: `5` for `◯ − 3 = 8`; `13` for `◯ + 4 = 9` | 11 |
| 16 | **13** 2-digit ± 1-digit, no regrouping | a 21 to 99, b 1 to 9, the ones do not cross | `23 + 4`, `37 − 5` | `63` (added to the tens), or ± 10 when that is illegal | 12, 8 |
| 17 | **14** 2-digit ± tens | a 11 to 99 not a whole ten, b a whole ten, answer ≤ 99 | `45 + 30`, `62 − 20`, `57 + 10` | ones instead of tens (`48`) | 13 |
| 20 | **15** 2-digit ± 1-digit, regrouping | a 20 to 99, b 2 to 9, the ones cross, answer ≤ 100 | `45 + 9`, `65 + 5`, `72 − 6`, `30 − 7` | plus: no carry (answer − 10); minus: smaller from larger (`74`) | 14 |
| 21 | **16** 2-digit ± 2-digit, no regrouping | both 11 to 99, b not a whole ten, no crossing | `17 + 12`, `27 − 15` | minus: the sum (`42`); plus: ± 10 | 15 |
| 24 | **17** 2-digit + 2-digit, regrouping | sum ≤ 100 with a carry | `26 + 34`, `38 + 45` | no carry (answer − 10: `73`) | 16 |
| 25 | **18** 2-digit − 2-digit, regrouping | a ≤ 99 with a borrow | `85 − 19`, `70 − 18` | smaller from larger in the ones (`74`); the tens not lowered (answer + 10) | 17 |
| 28 | **19** missing number within 100 | ring at a or b, items of rungs 8 and 13 to 18 | `37 + ◯ = 50`, `◯ − 20 = 15` | the shown numbers added (`87`) | 18 |
| 29 | **H1** hundreds and tens, in the head | hundreds or tens added to or taken from a 3-digit number, no regrouping, answer ≤ 999 | `240 + 30`, `240 + 35`, `375 + 100`, `500 − 200` | the place slip: `540` for `240 + 30` (tens added as hundreds); ± 100 and ± 10 | 14, 16 |

### Strand C: comparison (a new round kind)

| Order | Rung | Content | Example | Planets | Needs |
| --- | --- | --- | --- | --- | --- |
| 8 | **C1** compare to 20 | two numbers 0 to 20 | `7 ◯ 5`, `12 ◯ 17`, `7 ◯ 17` | `<`, `=`, `>` | 7 |
| 18 | **C2** compare to 100 | two numbers 10 to 99; half the pairs have the same tens (`43 ◯ 47`) or swapped digits (`38 ◯ 83`) | `38 ◯ 83` | `<`, `=`, `>` | C1, 13 |

`=` is right in 1 comparison round in 5 (*my call*); `<` and `>` share the rest. The round is described under *The two
new round kinds*.

### Strand M: counting in jumps, times, divide

| Order | Rung | Content | Example | Misconception planet | Needs |
| --- | --- | --- | --- | --- | --- |
| 14 | **S1** counting in jumps of 2, 5, 10 | three numbers with an equal jump from a multiple of the jump, then the ring; to 20 (2s), 50 (5s), 100 (10s) | `5  10  15  ◯` | the last number + 1 (counted by ones: `16`); one jump too many (`25`) | 8 |
| 15 | **T1** the same number added | 3 equal addends, 2 to 6 | `3 + 3 + 3 = ◯` | one group too few or too many (`6`, `12`) | 10, S1 |
| 19 | **T2** times 2, 5, 10 | one factor 2, 5 or 10, the other 1 to 10 | `4 × 5 = ◯` | the sum (`9`): wrong sign; one group off (`15`, `25`) | T1 |
| 22 | **S2** counting in jumps of 3, 4, and 10 off the tens | 3s to 30, 4s to 40, 10s from a number that is not a whole ten (`7  17  27  ◯`, to 97); the ring last in 2 rounds of 3, else in the second or third place | `4  8  ◯  16` | the neighbour by ones (± 1); one jump off | S1 |
| 23 | **T3** tables to 6 × 6 | both factors 2 to 6, not in T2 | `4 × 6 = ◯` | the sum (`10`); a neighbour product (`18`, `20`) | T2, S2 |
| 26 | **T4a** missing factor to 6 × 6 | `a × ◯ = c` from T2 and T3 facts with c ≤ 36 | `3 × ◯ = 12` | the product of the shown numbers (`36`); the difference (`9`); ± 1 | T3, 6 |
| 27 | **T4b** divide to 6 × 6 | `c ÷ a = ◯` from the same facts | `12 ÷ 3 = ◯` | the divisor (`3`); the difference (`9`); ± 1 | T4a |
| 30 | **T5** tables to 10 × 10 | both factors 2 to 10, not in T2 or T3 | `7 × 8 = ◯` | a neighbour product (`48`, `63`); a near product (`54`) | T3 |
| 31 | **T6** divide to 10 × 10 | `c ÷ a = ◯` and `a × ◯ = c` from T5 facts | `56 ÷ 8 = ◯` | the divisor (`8`); the difference (`48`); ± 1 | T4b, T5 |

For times and divide the place planet is a neighbour product or quotient ± 1, not ± 10 (*my call*: ± 10 on `7 × 8` gives
`46` and `66`, which are not products and are too easy to reject).

The research called T4a and T4b one rung "T4"; it is cut in two here so that the missing factor comes before the `÷`
sign, as the sources ask (*my call*).

### The ring in every place at every size (the parent: "your best judgement")

The sources want the missing number in every place at every size. *My call*, in three layers:

1. **Rungs of their own** for the first meeting with a new ring place: 4 and 6 (ring at b, within 10), 12 (ring at a,
   within 20), 19 (ring at a or b, to 100), T4a (missing factor).
2. **Ring variants in review.** Once rung 6 is passed, every passed plain rung from 7 on also gives items with the ring
   at b; once rung 12 is passed, also at a (for times: the ring at b after T4a). They come only in the review and
   "rung below" parts of the mix (see *Practice*), at 1 round in 3 of those parts. They belong to the rung of their
   fact, for the tallies.
3. **Never on the frontier.** A new size of number and a moved ring together would be two new things at once. So the
   frontier of 13 to 18 has the ring at the end only; the moved ring at that size comes in review and in rung 19.

The missing-number line ("which number is missing?") still plays only the first two times a ring is not at the end.

### Old numbers

Results are never negative. A plus 0 or minus 0 fact stays rare (at most 1 round in 15). Times 1 and times 0 are also
rare (the same counter). No sum twice in a row: comparison pairs and jump rows count as facts too.

## The two new round kinds

The round content stays behind `makeRound` (the box, the planet labels, the right lane, the number that flies). Two kinds
join the sum.

### Comparison: `7 ◯ 5` (the parent: 3 planets, a short voice intro, a parent setting on by default)

- **The box:** two numbers with the ring between them, written left to right like every sum (`7 ◯ 5`).
- **Three planets, three lanes.** A comparison round has 3 lanes, not 4: the lanes are wider, the ship glides to the
  nearest of the 3 at the start, and the next sum round has 4 lanes again. *My call:* an empty fourth lane would be a
  state with no answer (rule: no state that cannot exist), and a doubled sign would give one sign two planets. The lane
  geometry test covers 3 lanes at each screen size.
- **The signs are drawn shapes, not text.** `<` and `>` are two open strokes, `=` two bars. Draw them as paths on the
  canvas. Reason: a `<` drawn as text in a right-to-left context can be mirrored by the browser, which would swap the
  meaning (rule: *Give each symbol only one meaning*). The no-text scan marks them as learning content.
- **`<` and `>` look exactly alike except their direction**, the same colour and stroke. Their direction is the whole
  meaning, so nothing else may tell them apart. The signs are never filled, so that `>` does not look like the play
  triangle (which points right).
- **The lanes of the signs are random**, so that he cannot learn a lane instead of a sign.
- **Feedback shows the rule, with no word:** when the right sign flies into the ring, the bigger number in the box
  swells for a moment (about 1.15 times, 0.4 s) and the open side of the sign faces it. For `=`, both numbers pulse
  together. On a wrong pick the same happens after the green ring marks the right sign. *My call.*
- **The intro**, the first two comparison rounds, before the planets move: the line *compare* (see *Voice*). On "סִימָן"
  the three sign planets glow; on "הַצַּד הַפָּתוּחַ" the open side of `<` and `>` glows; on "הַגָּדוֹל" the bigger number
  swells; on "שָׁוֶה" the `=` planet glows. As with the missing-number line today (the parent, 2026-11-20), he can start to
  play while it plays; it is not cut.
- **Explained again:** after 3 wrong picks of the mirrored sign (`<` for `>` or the other way) in one play day, the intro
  plays again before the next comparison round, at most once per play day (rule: *Explain again after the same mistake
  several times*).
- **Recorded by direction:** the item (`7?5`), the sign he picked. The parent's mix-up list shows `7 ◯ 5 → <`.

### Counting in jumps: `5  10  15  ◯` (the parent: before times, a clear parent setting)

- **The box:** three numbers and the ring, left to right, with wide gaps and a faint small arc from each number to the
  next (the "jump"). No commas. *My call:* the arcs carry "in jumps" without a word, and commas would be one more sign.
- **The numbers appear one by one**, from the left, each with a small hop along its arc (about 0.25 s each), then the
  ring. Reason: the order of the row is shown, not read, so a child who reads Hebrew right to left still sees which end
  is the start. Left to right agrees with the sum box and with the parent's note that play runs left to right
  (2026-11-20).
- **Four planets**, as in a sum. The right number flies into the ring.
- **The intro**, the first two jump rounds: the line *jumps*. On "קְפִיצוֹת" the arcs glow in turn; on "עַכְשָׁו" the ring
  pulses. A jump row with the ring in the middle (rung S2) uses the existing missing-number line the first two times.
- Not too wide: the box shrinks its font to fit the longest row (`85  90  95  ◯`) in the portrait layout, measured after
  the font loads (rule: make the glyphs smaller when they do not fit).

## Placement, practice, and the way up and down

All numbers are first values: keep them as named constants with tests (as the first design asks).

### Fast

A right answer is **fast** when he did not start under the right planet and got under it in less than **0.75** of his
own median "under" time (`speed.ts` keeps it). Until he has 5 samples: in less than **0.4** of the arrival time in force,
or by an early zoom. Fast right answers are the strongest sign that he knows a sum; a slow right answer may be counting.
A right answer in a round where the right planet started in his lane is right, not fast.

### Placement (the first run; also after the update, see *Migration*)

It looks like normal play (the parent). A probe costs a heart like any mistake.

- The demo round stays (`1 + 1`, not counted). Then each round is a **probe**: one item of the probe rung, the usual
  planets, never the same fact as the round before. The intro of a new kind or sign plays at its first probe as it
  would in normal play.
- The first probe is on rung 1, with a **jump of 8** positions in the order. The walk counts only rungs that can be
  offered (switched on, inside the range, not held); the last of them is the top of the order.
- *Right and fast:* the rung is confirmed; the next probe is the jump higher.
- *Right but slow:* halve the jump (at least 1). A rung is confirmed by one fast right answer or by 2 right answers.
- *Wrong* (a time-out counts as wrong here): halve the jump and go down by it.
- **Stop** when: 2 mistakes in a row; or the jump is 1 and the rung above the highest confirmed one has failed; or
  **16 probes**; or the top of the order is confirmed.
- **The result:** the highest confirmed rung, **all the rungs it needs** (and what those need, down to rung 1) are
  **placed**. Rungs that placement jumped over and that the confirmed rungs do not need (for example C1 under a
  confirmed rung 14) stay "not yet": the frontier rule offers them next, lowest first, and a strong child passes each in
  about 3 rounds.
- Placement stops after 2 mistakes in a row, so the first run (3 hearts) survives it. If the run ends during placement,
  or he leaves, placement goes on in the next run from where it stopped.
- Simulated with 31 rungs (1000 children each; right 95% and fast 80% on what he knows, 60% one rung above, 30% higher):
  a child who knows everything is placed at the top in a median of 10 probes with no mistake; a child who knows through
  order position 20 is placed at 20 (p10: 16) in 9 probes with 2 mistakes; a child who knows through position 4 at 4 in
  5 probes. With the research's first jump of 4 and 14 probes, the strong child stopped at 19 of 31; the jump of 8 is
  *my call* for the longer ladder.

### Practice at the frontier

- **The frontier** is the lowest rung in the order that is switched on, inside the parent's range, not passed, not held,
  and whose needs are all passed or placed. (A rung that is switched off counts as passed for the needs of others, so a
  switch never blocks another strand.)
- **The mix:** **70%** of rounds from the frontier, **20%** from the rung below (the frontier's nearest need in the
  order, which can be in another strand; for rung 1, which has none, this part goes to the frontier), **10%** review from all other passed and placed rungs. Inside each part the existing 1-in-5 picker chooses.
  When review has nothing, its part goes to the rung below, then to the frontier.
  The review part and the rung-below part take **placed rungs first** (lowest first) until each has 4 answers, then
  items with recorded mistakes first.
- **Up by one** (the frontier is passed): 3 right answers in a row on the frontier, all fast; or 5 right of his last 6
  on the frontier with the last 3 right (a time-out is half a mistake).
- **Re-jump:** if his last 2 rungs were both passed by the fast way, the next fast pass also places the next rung in the
  order of the same strand, if it is not yet passed. It catches a placement that ended low by bad luck.
- **A strike:** 2 mistakes in his last 3 answers on the frontier (a time-out is half a mistake), with at least 3 answers
  on it. After a strike, the next **6 rounds** come from the rung below and review only (the "rung below" part takes
  the frontier's 70%), then the frontier comes back with an empty window. Nothing on the screen shows it.
- **Held** (the parent: "hold it back for a while if the kid clearly doesn't know the item yet"): **2 strikes** on one
  rung, since it last became the frontier, hold it. It is not offered at all, not even in review, for **2 play days**
  the first time, **4** the second time, **7** the third time and after. Then it is free again and, as the lowest free
  rung, becomes the frontier again with no strikes. While a rung is held, the frontier moves to the next free rung in
  the order (usually in another strand); the rungs that need the held rung wait. *My call:* the numbers. At one play day
  every one to three days, the first hold is about 2 to 6 calendar days.
- **Nothing free:** if every rung is passed, held, switched off or above the range, the mix is review only: 70% from the
  top 3 passed rungs, 30% from the rest.
- **Placed rungs on probation:** a placed rung becomes passed after **4 right answers** on it. If he makes 2 mistakes in
  his last 3 answers on a placed rung, it goes back to "not yet" and, as the lowest free rung, becomes the frontier.
- **Frustration guard:** after 2 mistakes in a row anywhere, the next 2 rounds come from items whose predicted mistake
  rate is under 0.1 (sure wins). With the strike rule, he never has more than 2 mistakes in a row at the frontier.
- **The arrival time** keeps its hold: after a rung is passed, and for the next 6 rounds, it does not get shorter
  (`speed.ts` `HOLD_ROUNDS`). A rung that becomes the frontier after a hold ends also starts this hold.
- **One arrival time per band** (*my call*). `38 + 45` needs more thinking than `3 + 4`, and one time for all rungs
  would make the hard sums a race (rule: a timer only where speed is the game, not for slow thinking). The speed state
  (`speed.ts`, unchanged rules) is kept apart for three bands: **small** (rungs 1 to 12, C1, S1, T1 to T4b), **big**
  (13 to 19, C2, S2, T5, T6) and **hundreds** (H1). A band's first round starts at the time of the band below + 2 s
  (at most 10 s). Each round uses, and teaches, the time of its own band; "fast" uses the band's own median. The
  parent's fixed time (8, 5 or 4 s) is for all bands.
- **A new sign or kind is explained the first time:** `×`, `÷`, comparison and jumps have an intro line; a moved ring
  keeps its missing-number line.

### The warm-up (the parent)

Every play day (a run that starts 12 hours or more after his last answer) begins **one rung below his saved level**: the
highest passed or placed rung below the frontier in the order. Answers on a placed warm-up rung count for its probation
too, and the probation rule (2 mistakes in the last 3) comes before the warm-up's strike rule. *My call:* after a gap of **14 days** or more, two rungs below.

- During the warm-up the mix is 70% from the warm-up rung and 30% review.
- **3 fast right answers in a row** on the warm-up rung take him back to the frontier at once (the parent). Else 5 right
  of his last 6 with the last 3 right also take him back.
- A strike on the warm-up rung gives 6 rounds of review, then the warm-up rung again. **2 strikes** on it mean he forgot
  it: it goes back to "not yet" and becomes the frontier. That is the only way an earned rung goes back.
- No warm-up in the first run (it has the demo and placement). If he has no frontier (all free rungs passed), the warm-up
  is the second-highest passed rung, and the way back leads to review.
- At one play day every one to three days nearly every visit starts with a short warm-up, which is what the parent wants.
  A strong child spends about 3 rounds in it.

### Re-placement now and then (the parent: "placement should be updated once in a while")

A short probe upward, which looks like normal play.

- **When:** on a play day, right after the warm-up ends (whichever way), if **5 play days** have passed since the last
  placement or re-check, **or** if on his last play day he passed **2 or more rungs by the fast way** (he breezed
  through). At most once per play day; never in the first run.
- **How:** list the rungs above the frontier in the order that are switched on, inside the range, not passed and not
  held. Probe the **4th** of that list. Right and fast: it is placed with all it needs, and the next probe is the 2nd of
  the new list, then the 1st. **At most 3 probes.** A wrong or slow answer ends the re-check with no change, no strike
  and no hold. So it costs at most one heart.
- Then play goes on at the (maybe new) frontier.

### The parent's range and switches

- **The range** caps the order: rungs after the chosen rung are never offered (as today, "automatic" means no cap).
- **A switch off** removes its rungs from the game: from the frontier, placement, re-checks and review. It counts as
  passed for the needs of other rungs, so it blocks nothing.
- A setting change takes effect at the next round. A rung that was the frontier and is now switched off simply drops
  out; its stats stay.

## The equal-groups dots (the parent: allowed, up to $5; prefer code)

Drawn in code on the canvas: free, crisp at every size, and they need no review of a generated picture. **No money is
spent**; no image is generated.

- **What:** the product as equal groups. Each group is a **pod**, a soft rounded shape in a faint colour, with its dots
  inside in a fixed pattern that he can see at a glance: dice faces up to 6, two rows of five for 7 to 10. The dots are
  round, filled, in the planets' colours, at least about a third of the box's digit height, so that they are big and
  clearly content (rule: no small dot clusters that look like a nikkud mark or crumbs). Not stars: the star means
  points.
- **Where:** in a row under the sum box, above the planets' path, inside the box's area (it grows down by one row). The
  builder checks at each screen size that the pods cover nothing that moves.
- **When** (*my call*):
  - during the intro line, the first two rounds with `×` and the first two with `÷`;
  - the first 5 rounds of rung T1, so that `3 + 3 + 3` and its pods are seen together; when T2 opens, its first two
    rounds show the same pods for `3 × 3`;
  - after a wrong answer or a time-out on a `×` or `÷` round: while the green ring marks the right planet, the pods
    appear (for `÷`: the dots of the first number fall into the pods one group at a time, the sharing picture). The
    mark stays **1.5 s** instead of 0.8 s for these rounds, so that the groups can be seen.
- **Only for products up to 36** (rungs T1 to T4b). Above that the pods are too many to see at once; T5 and T6 have no
  dots.
- They do not count for him (rule): no number is written on a pod, and they are not on every round.

If the builder finds that code cannot draw pods that look right, stop and report with screenshots before any paid
generation.

## Voice

New lines, in the style of `src/spacecat/audio/lines.ts`: the narrator of Book 2, no number, no line that addresses the
child (impersonal forms such as "בּוֹחֲרִים", as the existing lines use "צָרִיךְ" and "אֶפְשָׁר"), so one take serves boys and
girls. No "!". Drafts for the parent's review on the review kit.

| id | Where | Line (draft) | Stability, tag |
| --- | --- | --- | --- |
| `compare` | the first two comparison rounds, before the planets move; again after 3 mirrored-sign mistakes in a play day | אֵיזֶה סִימָן מַתְאִים? הַצַּד הַפָּתוּחַ פּוֹנֶה אֶל הַמִּסְפָּר הַגָּדוֹל. וְאִם הַמִּסְפָּרִים שָׁוִים, בּוֹחֲרִים בְּסִימַן שָׁוֶה. | 0.5, warmly |
| `jumps` | the first two jump rounds, after the numbers have hopped in; again after 3 picks of "the last number + 1" in a play day | סוֹפְרִים בִּקְפִיצוֹת שָׁווֹת. אֵיזֶה מִסְפָּר בָּא עַכְשָׁו? | 0.5, playful |
| `times` | the first two `×` rounds, with the pods; again after 3 picks of the sum (he added) in a play day | כָּפוּל זֶה קְבוּצוֹת שָׁווֹת. כַּמָּה יֵשׁ בְּכֻלָּן יַחַד? | 0.5, warmly |
| `divide` | the first two `÷` rounds, while the dots fall into the pods; again after 3 picks of the divisor or the difference in a play day | חִלּוּק זֶה לְחַלֵּק לִקְבוּצוֹת שָׁווֹת. כַּמָּה יֵשׁ בְּכָל קְבוּצָה? | 0.5, warmly |

- **Sequences** (rule: write out each sequence and read it aloud): *compare*: the arrival sound, the box with `7 ◯ 5` and
  the three sign planets, then the line; the planets move while it plays. *jumps*: the arrival sound, the numbers hop in
  one by one, the ring appears, then the line. *times*: the arrival sound, the box `3 × 4 = ◯`, the pods appear on
  "קְבוּצוֹת", then the line ends and he plays. *divide*: the box `12 ÷ 3 = ◯`, the dots fall into 3 pods on "לְחַלֵּק".
- An intro that plays again is at most once per play day for each line, and it plays the same take (no new
  variation is needed: it plays rarely).
- The pause between the sentences of one line is 0.7 to 0.9 s (rule).
- "זֶה" in *times* and *divide* points at the sign, which is on the screen and glows on that word (rule: no pointing at
  a thing that is not shown).
- To check with the native reviewer before generation (rule): "כָּפוּל זֶה ..." and "חִלּוּק זֶה ..." are the spoken
  form, not the book form; "סִימַן שָׁוֶה" is the school name of `=`; whether the voice reads "בְּכֻלָּן" right.
- **Budget** (*my call*, for the parent to approve): 4 items, 2 takes each (rule) = 8 takes; ceiling 10 with retakes.
  Generating and reviewing them is part of this build, on the shared review kit. Until the parent keeps a take, its line
  is silent (no device text-to-speech, rule) and its glows still play; the build can go to a playtest that way, but not
  to `release`.
- The home card's "מה לומדים" line (parent text) changes to: "חיבור וחיסור עד 100, השוואת מספרים, ספירה בקפיצות,
  כפל וחילוק. המשחק מוצא לבד את הרמה של הילד ומתאים את עצמו, גם במהירות."

## The parent area

Space Cat's section stays in its order. Its labels are in English today (parent text, English allowed). *My call:* each
new or changed setting keeps an English label, with the Hebrew name in brackets as the lessons' font setting does
("Print (דפוס)"), and an explanation of one or two lines under it. The Hebrew text is given in full here, so that the
builder can switch the section to Hebrew if the parent asks. Rule (new): a parent must understand each setting from its
label and explanation, without this document; no rung numbers or ids in a label.

### Where he is

- **A summary line** at the top: "Working on: 2-digit ± 1-digit with regrouping (45 + 9). Passed 19 of 31 rungs. 1 held."
- **The table of rungs**, in the order, grouped by strand, each with its name and an example (`45 + 9 = ◯`), its status
  and his share of right answers:
  - *not yet*, *working on now*, *passed*, *placed (unchecked)*, *held: back in 2 play days*, *switched off*,
    *above the range*.
- **Recent changes**: the last 20 changes of the ladder with their date: placed, passed (fast or slow), strike, held,
  back from hold, back to "not yet", re-check. Read from the save (see *Tracking*), so that it stays when old telemetry
  is evicted.
- The summary in the parent area's home list names the frontier, with no rung number: "Working on: 2-digit ± 1-digit
  with regrouping · passed 19 of 31 · runs 12 · best 40 · points 512".

### Settings

| Setting | Label (English · Hebrew) | Explanation (English) | Explanation (Hebrew) | Default |
| --- | --- | --- | --- | --- |
| Range | Highest level · (הרמה הגבוהה ביותר) | Automatic: the game finds his level and moves him up and down by itself. Or choose the highest kind of sum he may get; nothing above it comes. | אוטומטי: המשחק מוצא את הרמה שלו ומעלה ומוריד אותה לבד. אפשר גם לבחור את סוג התרגיל הגבוה ביותר שיקבל; שום דבר מעליו לא יופיע. | automatic |
| Comparison | Compare two numbers · (השוואת מספרים) | Rounds like 7 ◯ 5: three planets with <, = and >, and he flies to the sign that fits. First numbers to 20, later to 100. | סיבובים כמו 7 ◯ 5: שלושה כוכבי לכת עם <, = ו־>, והילד טס אל הסימן המתאים. קודם מספרים עד 20, אחר כך עד 100. | on |
| Jumps | Counting in jumps · (ספירה בקפיצות) | Rounds with a row of numbers that grow by the same jump, like 5, 10, 15, and he flies to the next number. First jumps of 2, 5 and 10, later 3 and 4. It comes before times. | סיבובים עם שורת מספרים שגדלים באותה קפיצה, כמו 5, 10, 15, והילד טס אל המספר הבא. קודם קפיצות של 2, 5 ו־10, אחר כך 3 ו־4. זה בא לפני כפל. | on |
| Times | Times (×) · (כפל) | From 3 + 3 + 3 to the tables up to 10 × 10. The first times rounds show the sum as equal groups of dots. | מ־3 + 3 + 3 ועד לוח הכפל עד 10 × 10. בסיבובי הכפל הראשונים התרגיל מופיע גם כקבוצות שוות של נקודות. | on (was off) |
| Divide | Divide (÷) · (חילוק) | First 3 × ◯ = 12, then 12 ÷ 3 = ◯, only from times tables he already knows. | קודם 3 × ◯ = 12, אחר כך 12 ÷ 3 = ◯, רק מלוח הכפל שהוא כבר יודע. | on (was off) |
| Missing above 20 | Missing number above 20 · (מספר חסר מעל 20) | Sums to 100 with the empty ring in the place of a number, like 37 + ◯ = 50. Off: the ring moves only in sums to 20. | תרגילים עד 100 שבהם העיגול הריק במקום אחד המספרים, כמו 37 + ◯ = 50. כבוי: העיגול זז רק בתרגילים עד 20. | on |
| Hundreds | Hundreds in the head · (מאות בעל פה) | Sums with 3-digit numbers that need no carrying, like 240 + 30 or 500 − 200. | תרגילים עם מספרים תלת־ספרתיים בלי המרה, כמו 240 + 30 או 500 − 200. | on |
| Check again | Find his level again · (למצוא שוב את הרמה) — a button | His next run starts with the short check of the first run again, and the game finds his level from the start. His points, ships and the sums he found hard stay. | הטיסה הבאה תתחיל שוב בבדיקה הקצרה של הטיסה הראשונה. הנקודות, החלליות והתרגילים שהיו לו קשים נשמרים. | — |

- **Signs in Hebrew text:** in a right-to-left paragraph the browser mirrors `<` and `>`. Wrap every example with a
  sign (`7 ◯ 5`, `<, = ו־>`, `45 + 9`) in a left-to-right span (`<bdi dir="ltr">`), and check the Hebrew text on the
  screen, not in the source.
- **Find his level again** sets every rung back to "not yet" and clears the holds, but keeps every item's stats; the
  next run (no demo) starts with the first-run placement (from rung 1, a jump of 8, 16 probes). Nothing he can see goes
  back.
- "Times" covers T1 to T5; "Divide" T4a, T4b and T6 (with divide on and times off, divide has no tables and is in effect
  off: the explanation says "only from times tables he already knows"). "Missing above 20" covers rung 19 and the ring
  variants above 20. "Hundreds" covers H1. "Jumps" covers S1 and S2; with jumps off, T1 needs only rung 10.
- The range list names each rung by its name and example ("up to: 2-digit ± tens (45 + 30)"), grouped by strand, not
  by number.
- "Time for one sum" and "Music during flight" are unchanged.
- Every change is tracked as `settings` by the parent, as today.

### Migration of an existing save

The save `alef-spacecat` goes from version 1 to 2 (`store.ts` `migrate`; rule: never drop his progress).

- **Item stats stay** as they are: the item ids of sums do not change (`3+4=7/c`). Each item is put in its new rung by
  its fact (for example an old rung-4 item with the ring at a goes to rung 12).
- **The old top rung becomes placed rungs** (on probation, so a lucky old rung is checked again). Each listed rung
  brings everything it needs (the needs are always closed: no rung is placed or passed while a rung it needs is "not
  yet"):

  | Old top rung | Placed |
  | --- | --- |
  | 1 | — (rung 1 is the frontier) |
  | 2 | 1, 2, 3 |
  | 3 | 1 to 5 |
  | 4 | 1 to 6 |
  | 5 | 1 to 7 |
  | 6 | 1 to 11, without 8 (whole tens to 100 are new; rungs 9 to 11 do not need it) |
  | 7 (times to 5) | as 6, and T1, T2, with their needs 8 and S1 |
  | 8 (times to 10) | as 7, and T3, T5, with S2 (T3 needs it) |
  | 9 (divide) | as 8, and T4a, T4b, T6 |

  Below old rung 7, C1, S1, 8 and 12 stay "not yet": the frontier offers them first, and a child who knows them passes each in about
  3 rounds.
- **Then a short placement** at the start of his next run: from the rung above the highest placed one, with a jump of
  **4** and at most **10 probes** (*my call*: a child stuck at old rung 6 moves on in his first run after the update).
  The probes walk only the plus and minus rungs that have no switch (the strand he played in version 1). They never
  probe the new strands (C1, C2, S1, S2, T*, H1) or a rung of a switch: those stay unplaced until normal practice, the
  re-check or the parent's "find his level again" reaches them.
  No demo. That run counts as a play day and as his last placement (the play-day counter starts at 1), and, like the
  first run ever, it has no warm-up and no re-check. The time of his last answer is unknown in a v1 save; it is set at
  the end of that run.
- **Settings:** times and divide turn **on**, and the new switches are on (the parent: everything on by default). *My
  call:* the old save cannot tell a parent's "off" from the old default "off", and the parent decided on; the parent can
  turn them off again. A numeric range maps to the new rung of the old one: 1 → 1, 2 → 3, 3 → 5, 4 → 6, 5 → 7, 6 → 11,
  7 → T2, 8 → T5, 9 → T6. "Automatic" stays.
- The speed state, points, best, ships, heard lines and runs stay.
- Staging migrates its own `staging:` copy in the same way; `?copy-prod` copies a v1 save that then migrates.

## Tracking

The log stays Space Cat's one log (`SPACECAT_LOG`), with no cap of its own: every live log shares one budget
([ADR 0007](../../adr/0007-compact-telemetry-in-localstorage.md)). The new fields are short, and a ladder event is rare
(a few per run), so the growth is small: a round event gains about 30 characters before compression.

- **`round`** gains: `rung` (now the rung id string, `"15"`, `"C1"`, `"T4b"`), `kind` (`sum`, `compare`, `jumps`),
  `part` (`frontier`, `below`, `review`, `warmup`, `probe`, `guard`), `fast` (true when the answer was fast), and for a
  comparison round `number` is the sign he ended on (`"<"`). The roll-up (`spaceCatFacts`) must take a string `number`
  as what he chose.
- **`ladder`**, one event for each change: `{ rung, change, by }` with `change` one of `placed`, `passed`, `strike`,
  `held` (with `days`), `free` (a hold ended), `unpassed`, and `by` one of `placement`, `fast`, `slow`, `rejump`,
  `recheck`, `warmup`, `probation`, `migration`. It replaces today's `rung` event.
- **`placement`** at the start and the end of a placement or re-check: `{ phase: 'start' | 'end', kind: 'first' |
  'migration' | 'recheck' | 'parent', probes, mistakes, frontier }`.
- **`warmup`** at its end: `{ rung, how: 'fast' | 'slow' | 'forgot', rounds }`.
- **`run-start`** gains `playDay` (true when the run starts a play day) and `frontier`; `rung` is sent only when a placement probes a rung.
- **The save keeps the last 40 ladder changes** (`{ t, rung, change, by }`), for the parent area's *Recent changes*. The
  telemetry has the same events for the export and the analysis script (`scripts/spacecat/analyse.ts` learns the new
  events).
- `about.docs` names this document too.

## Left to the builder

- The store shape for the ladder (per rung: status, strikes, hold count, held-until play day; the frontier window; the
  placement state that survives a run end; the play-day counter and the time of his last answer; the last 40 changes).
- The rung table as data (order, strand, needs, the item generator, the misconception function) and the item ids of the
  new kinds (*my call* for the shape: `7?5` for a comparison, `5,10,15,_` for a jump row, ring as `_`).
- The exact pod drawing (shape, colours, the dice patterns), the 3-lane geometry, the box font shrink, the hop and swell
  timings, within the limits above; geometry tests at each screen size.
- Tuning of the constants inside the limits above, kept as named constants with tests: the jump, the probe caps, the
  fast thresholds, the mix (70/20/10), the strike and hold numbers, the re-check interval.
- The glossary entries listed under *Words*, the README's "Known friction" line about sums only, and the analysis
  script.
- **Why no counting down:** a falling row (`40, 30, 20, ◯`) asks him to see the direction of the row; with the one-by-one
  hop it would work, but it doubles S1 and S2 for little value now. Add it when the data shows S2 is passed easily.

## Rule review

How the design meets [docs/minigame-rules/](../../minigame-rules/README.md), section by section. I checked each rule
against the draft; where the check found a gap, it says *Found* and what changed.

- **Communication on the screen.** No text: digits and the signs `+ − × ÷ = < >` are the learning content, drawn as
  shapes and marked for the no-text scan. The pods have no digits. Each new line makes its object glow on its word (the
  sign planets on "סִימָן", the open side on "הַצַּד הַפָּתוּחַ", the pods on "קְבוּצוֹת"). Each new kind says what to do in
  its first two rounds (rule: each round says what to do); after that the round needs no question, as the sums today.
- **Voice lines: wording.** No number in any line, so no number-and-noun agreement to check, and no number the logic can
  change. No line addresses the child (impersonal forms), so one take for boys and girls. No game words ("rung" and
  "level" are never spoken). "זֶה" points at a sign that is on the screen. The lines are to be read in sequence and
  checked by a native reviewer before generation (listed under *Voice*).
- **Voice: delivery and pronunciation.** Instruction lines at stability 0.5 with one tag; 0.7 to 0.9 s between
  sentences; nikkud on every word, to check in a dictionary; the spoken forms "כָּפוּל" and "חִלּוּק" to check by an open
  transcription.
- **Music and sound effects.** No change: the new kinds use the arrival, right and wrong sounds, so each event keeps its
  one sound, and no two audio events touch.
- **Visuals.** One meaning per symbol: `<` and `>` drawn as shapes, so the browser cannot mirror them, alike except
  their direction, never filled, so not the play triangle; the dots are not stars (points) and not small clusters
  (nikkud look-alikes). The pods and arcs are faint helpers; the digits stay the strongest element. The box is measured
  for the longest item. Three lanes keep the planets apart (the geometry test).
  *Found:* "Make wrong answers clearly different; do not offer two answers that differ only in a small detail."
  `<` and `>` differ only in direction, and 2-digit planets such as `54` and `44` differ in one digit. Both are the
  skill itself (the parent asked for comparison; the place planet tests the tens), not a detail beside the skill, so
  they stay. The feedback (the bigger number swells) makes the difference of `<` and `>` visible; the rule's case (two
  nearly equal pictures of one answer) does not happen.
  *Found:* the Hebrew parent text mirrors `<` and `>` in a right-to-left paragraph; examples are now wrapped
  left to right.
- **Art generation.** No generated picture; the dots are code. The $5 limit is not touched; the builder reports before
  any spend.
- **Interaction.** The action is the answer; no new child button. The new lines do not block play (the Space Cat
  exception of 2026-11-20). Each planet stays at least 56 CSS px. Nothing new in the corners.
- **Game play and learning.** 1 in 5 inside each part of the mix; recent answers weigh more; wrong planets only from the
  rung's own range; confusions recorded by direction (the mirrored sign too) and brought back; the speed adapts unseen;
  no state that cannot exist (3 lanes, not an empty lane); whole tens and products as wrong planets where ± 1 would be
  too easy; no sum twice in a row, also in placement (it picks after each answer, it does not plan ahead); placement
  fast; progress he can see never goes back. Comparison is at order 8, so every child gets to the new kind early (rule:
  a new mechanic where every child gets to it). The run length stays about 30 answers: the mix aims at 1 mistake in 5,
  placement stops at 2 mistakes in a row, the guard gives sure wins after 2.
  *Found:* "Use a timer only where speed is the game; not for slow tasks." One arrival time for `3 + 4` and `38 + 45`
  would make the big sums a race against a time learnt on small ones. The speed is now kept per band.
  *Found:* "Explain again after the same mistake several times." The draft did so only for comparison. Now each of the
  four intros plays again after its own typical mistake 3 times in a play day.
  *Noted:* "Start with a simple version; add a mechanic only when the data shows a need." This design adds a lot, but
  the parent asked for each part, after the data of his playtests (he reached the top too soon).
- **Parent tracking.** Every round with its rung, kind, part of the mix and speed; every ladder change; the parent area reads
  the level history from these `ladder` events (the save keeps no history list: the parent's decision); the one budget of ADR 0007; the roll-up takes the
  new ids and the signs. The old rung names and the old `rung` event retire (rule: remove retired items from the
  parent's stats): the table shows the new rungs only, the old stats are in them.
- **Parent settings (new rule).** Each new setting has a label and an explanation with an example round; no rung number
  in a label.
- **Review of generated assets.** Four new voice items on the review kit, 2 takes each; the chosen requests go to
  `asset-sources/spacecat/`.
- **Working with the parent.** My calls are marked and listed below. The playtest fixes on this branch were read: the
  lines no longer block play, and play runs left to right, which the new kinds follow. No host, route or password in
  this document.
- **Verification.** The QA pass seeds a save at each strand's first rung, at a held rung, and a v1 save of each old top
  rung; plays a fresh first run with its placement, a play day with its warm-up, and a re-check; takes screenshots of a
  comparison, a jump row and the pods at phone and tablet sizes; logs the audio order of each intro; and runs the
  no-text scan with the new signs marked.

## Decisions and their owners

The parent decided (2026-11-20): all content on by default, with the game holding back what he clearly does not know;
`×` and `÷` stay; comparison as its own round kind with 3 planets, an intro line and a setting on by default; counting in
jumps as a round kind before times, with a clear setting; the ring above 20 by my judgement; equal-groups dots allowed
(up to $5, code preferred); placement costs hearts and looks like normal play, and is updated now and then; every play
day after a gap of 12 hours starts one rung below, and 3 fast right answers take him back.

My calls, for the parent to glance at:

1. The order of the 31 rungs, with comparison and times interleaved by Israeli grade, and T4 cut in two.
2. Three lanes for comparison rounds; `=` right in 1 round in 5; the bigger number swells as feedback.
3. Jump rows left to right, no commas, faint arcs, the numbers hop in one by one.
4. The ring above 20: own rungs for each new ring place, ring variants in review, never on the frontier.
5. Placement's first jump of 8 and cap of 16 probes; the migration placement with a jump of 4 and 10 probes.
6. The hold: 2 strikes hold a rung for 2, then 4, then 7 play days.
7. The re-check every 5 play days or after a play day with 2 fast passes; 3 probes at most, no strike if it fails.
8. A gap of 14 days or more starts two rungs below.
9. The dots: during the intro, in T1's first 5 rounds, and after a mistake (the mark held 1.5 s); only to 36.
10. English labels with the Hebrew in brackets; a "find his level again" button.
13. One arrival time per band (small, big, hundreds), each band starting 2 s slower than the one below.
11. The migration turns times and divide on.
12. The voice budget: 8 takes, ceiling 10.
