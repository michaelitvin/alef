# Space Cat — a flying sums game, adapted from Space Cat Math

Status: draft for the parent's approval. Read [docs/minigame-rules.md](../../minigame-rules.md) before building: every
rule there applies. The section *Rule review* below says how this design meets each group of rules and where the
parent decided an exception.

## Why

- A friend's father (Igor, Ray's dad) made *Space Cat Math* for his child: a cat in a rocket flies to the planet that
  carries the answer of a sum. The parent liked it and has the author's permission to adapt it into alef.
- alef has only reading and clock games. Sums are a new subject, and an arcade game breaks the monotony of the duel.
- The original cannot be used as it is: its menus are text, the child chooses his own subject and speed, the sums are
  random and climb to 100 in ten levels, it is portrait only, and a home button sits on the play screen.

## Goals

1. The original's play, kept: four lanes, four planets that come closer, steer under the answer, zoom for a bonus.
2. A child who cannot read can start, play and play again with no help.
3. The game finds his level and aims at 1 mistake in 5, as the other alef games do.
4. The parent sees which sums are hard for him.
5. Landscape on the tablet; the original portrait layout on a phone.

## Non-goals

- Reading content on the planets (words, pictures). The round content is a plug-in so that a second "galaxy" can come
  later; nothing of it is built now.
- A spoken sum. No number is narrated anywhere (the parent: "it's a lot to pre-generate").
- Coins for the merchant. Points stay inside this game until the merchant design exists.
- New art in alef's painted style. The game keeps the original's art.
- A leaderboard, nicknames, more than one saved player.

## Anti-goals (a failure even if it works)

- Any text on a child screen other than the credit line. Any way out of the game on a child screen.
- A game that gets faster until he fails, or that shows him that it got easier.
- A heart lost for clumsy steering when he knew the answer.
- A change to the feel of the original: it must stay a fluent arcade game that does not stop at a mistake.

## What we take from the original

With the author's permission, we reuse:

- **Pictures (9 files, used unchanged):** the space background, three cat ships, four planet surface textures, the
  thumbs-up cat.
- **Code, ported to our structure:** the planet renderer (a sphere lookup table over which a surface texture scrolls),
  the lane and zoom mechanic, the tune and all sound effects (they are WebAudio code, not sound files).
- **Numbers of the design:** 4 lanes, 3 hearts, 7 right answers per level, 1 point for a right answer and 2 for an early
  zoom, a new ship at levels 4 and 7.

**Credit (the parent's decision):** the cover screen shows a small line in a lower corner: `Credit: Igor, Ray's dad`.
It is the one piece of text on a child screen. The child does not need it to play. The no-text scan has an allow-list
with this one string. *My call:* the line is in English, as the parent wrote it; the README and
`asset-sources/spacecat/README.md` carry the same credit and say that the pictures, the tune and the mechanic come from
Space Cat Math by permission of its author. Each ported source file says so in its header comment.

**Before the build starts (the parent):** confirm with Igor that his permission covers a public repository, because his
pictures and his tune will be published there.

## The play screen

One canvas, as in the original, wrapped by React. Logical size 1600×900 in the wide layout, 540×960 in the portrait
layout. The layout follows the other games' rule: a tablet in landscape gets the wide layout; a phone gets the portrait
layout, also when it lies on its side (builder: use the same test as Book 2 for "phone"). The
background fills the whole screen on any shape; the game area keeps its size inside it.

**Top bar.** Left: 7 progress dots for the level. Right: a star with the points of the run, and 3 hearts. All drawn as
shapes, not emoji. During flight the top bar does not take taps: a touch there steers like a touch anywhere. The hearts
and the points speak on a tap where the game stands still: on the cover, on *level done* and on the end screen (see *Voice*). No home button, no pause
button, no speaker.

**The sum box**, top centre, the strongest element after the planets. Digits and the signs + − × ÷ =. The place of the
missing number is an empty dashed ring. There is no "?" and no "_".

- Plain round: `3 + 4 = ◌`.
- Missing-number round: `3 + ◌ = 7` or `◌ + 4 = 7`.

**Planets.** Four planets, one per lane, each with a number on a plain dark disc so that the turning texture does not
hurt the digit. They appear small below the sum box and grow as they come down to the ship's row. *My call:* each
planet has its own spin speed and a small vertical offset (at most about 12 px), so that they do not move as one stiff
row; they still arrive together.

**No timer bar.** The planets coming closer are the clock.

**The ship** sits in a lane at the bottom. It is small enough to see all four planets above it.

### Controls

- **Drag** anywhere: the ship follows the finger's x. When the finger lifts, the ship glides to the nearest lane.
- **Flick up** (more than about 7% of the screen height within 400 ms): zoom. The ship flies up its lane into the planet.
- **Tap a planet:** the ship goes to that lane and zooms when it arrives.
- **Keyboard** (for the parent's desktop tests): left and right arrows move one lane, up arrow zooms.
- The stage is `touch-action: none`.

### How a round ends

- **Zoom:** the round ends when the ship hits the planet of its lane. Right: 2 points if the zoom started before 95% of
  the round's time, otherwise 1.
- **Arrival:** if he does not zoom, the round ends when the planets reach the ship's row. The ship is always in a lane
  (it glides to the nearest one), so there is always exactly one planet in front of it. Right: 1 point.
- **Results**, recorded apart:
  - *right* — the ship's planet carries the answer.
  - *wrong* — he steered or zoomed, and the planet is wrong.
  - *time-out* — he gave no input in this round, and the planet in front of him is wrong.
- Wrong and time-out each cost one heart. One round costs at most one heart.

### Feedback

- **Right:** the planet bursts into particles, its number flies into the ring of the sum box, a right sound plays, the
  points count up, a progress dot fills. An early zoom shows the 2 points with a stronger effect.
- **Wrong:** a red flash, a screen shake, the ship spins, the wrong planet bursts, a heart breaks. A green ring marks
  the right planet, and its number flies into the ring of the sum box. No voice.
- **Time-out:** the planets fly past the ship with a whoosh, a heart breaks, and the same green ring and number show
  the answer. The ship does not spin, because nothing hit it.
- The game does not stop. The mark stays about 0.8 s; then the screen clears and the next sum appears with its own
  arrival sound. No fixed pause longer than about 350 ms beyond that.

### Levels, hearts and the end of a run

- 7 right answers finish a level. The *level done* screen shows the thumbs-up cat, the three hearts filling again, the
  points, and a play triangle. If a ship is new, it flies in at this moment.
- Levels do not set the difficulty (see *Finding his level*). They are progress only, and they go on without an end.
- A run ends when the hearts run out. At 1 mistake in 5 a level needs about 9 answers and about 1.75 mistakes; about
  3 levels in 4 are finished, so a usual run has 3 to 4 levels (about 30 answers, 3 to 4 minutes).
- **The end screen** is built from the same parts as *level done*: the ship, the points of the run, his best, a play
  triangle. A new best has its own moment.

### Rewards at three paces

- Points for each answer, in the top bar.
- All his points so far and his best run, on the cover.
- Ships as the rare prize. Ship 2 unlocks the first time he reaches level 4 in a run (he finished level 3), ship 3 the first time he
  reaches level 7, as in the original: about 4 runs in 10 reach ship 2 and about 1 in 6 reach ship 3. They stay unlocked. The cover has a shelf with the three ships; a locked ship is a dark outline.
  *My call:* a tap on an unlocked ship on the shelf makes it his ship.

## The cover

The space background with turning planets, the current ship (large), a play triangle, all his points with the star,
his best, the ship shelf, the credit line, and the parent button (a 2 s hold, as in Book 2). No way home here; it is
in the parent area. The fonts and pictures load before the cover shows.

## The first time

- The first round of the first run starts with the demo. The planets stand still, alef's own pointing hand drags the
  ship under the right planet and back while the instruction line plays, and when the words end the planets start to
  move: he plays that same round, with the same sum and the same planets, and it counts as a usual round. No button.
  *My call:* this round is `1 + 1`.
- **Zoom** is not in the demo. The first time he is parked under the right planet and waits, the planets stop, the
  hand shows a flick up and the zoom line plays; then the planets go on. This is shown at most two times. (The planets
  stop so that no round-end sound can fall on the voice.)
- **The missing number** is a new element. The first two times a ring is not at the end, the ring pulses and the line
  "which number is missing?" plays before the planets start to move.

## Finding his level

The shared `src/shared/adaptive.ts` does the prediction (target 0.2, recent answers weigh more). This game adds the
ladder and the items.

**An item** is one fact with its hole: `3 + 4 = ◌`, `3 + ◌ = 7` and `◌ + 4 = 7` are three items of one fact. Each item
keeps a tally (seen, wrong, time-out), its recent results, its usual answer time, and what he picked when he was wrong.

**The ladder** (the parent's decision: one ladder, not a child's choice):

1. plus, sums to 5
2. plus, sums to 10
3. minus within 10
4. missing number, plus and minus within 10
5. plus and minus to 20 with no crossing of ten (12 + 5, 18 − 3)
6. plus and minus to 20 with crossing of ten (8 + 5, 13 − 6)
7. *(off until the parent turns it on)* times, tables to 5
8. *(off)* times, tables to 10
9. *(off)* divide, from the tables that are open

Results are never negative. A plus 0 or minus 0 fact is rare (at most 1 round in 15).

- A rung holds only its own new facts; the facts of the rungs below it stay candidates too. Rung 2 holds the sums
  6 to 10, not again the sums to 5.
- `3 + 4` and `4 + 3` are two items. For "not the same fact twice in a row" they are one fact, and so are a fact and
  its missing-number items.
- Missing-number items exist only on rung 4, for the facts of rungs 1 to 3. Rungs 5 to 9 are plain rounds in this
  version.

**Choosing the next sum.** The candidates are all items of the open rungs. The game picks the one whose predicted
mistake rate is nearest to 1 in 5, never the same fact as the round before. A time-out counts as half a mistake for
this prediction, because slow steering is not the same as not knowing.

**Opening a rung.** The next rung opens when, of his last 12 answers on items of the top open rung, at most 2 were
mistakes (a time-out is half a mistake). It does not wait until he has seen every item of the rung. **Fast start:** until he makes his first mistake on a rung, 4 right answers in a row open
the next one, so a strong child is not kept on 1 + 1. An item of a rung that just opened starts with a prior of 0.3.
(Builder: these numbers are a start; keep them as named constants with tests.)

**Wrong answers on the planets.** Three numbers near the answer (the answer ± 1 to 3), all different, none negative,
none above the highest number of the open rungs. If he has a recorded wrong pick for this item, that number is one of
the three. The right answer is in a lane other than the ship's lane in 9 rounds of 10, as in the original.

**Speed.** The time from the planets' start to their arrival adapts apart from the sums, and nothing on the screen
shows the change.

- It starts at 8 s. Its range is 4 s to 10 s.
- The aim is about 1.6 × his usual time to get under the right planet (the median of his last 12 right answers).
- It moves at most 5% per round. A time-out makes it 10% slower at once.
- Only one thing gets harder at a time: in a round after a new rung opened, and for the next 6 rounds, the time does
  not get shorter.
- The parent can fix the time (8, 5 or 4 s) or leave it automatic.

## Voice

No line says a number, and no line addresses the child with a verb, a pronoun or an adjective, so one take serves boys
and girls. The words below are a first draft; the parent approves the takes on the usual review page. The request text has no
"!" (it makes the voice shout); excitement comes from tags. *My call:* the lines use the narrator voice of Book 2, in
the role "the game's narrator"; this game has no speaking character.

| When | Line (draft) | Notes |
| --- | --- | --- |
| The demo round | צָרִיךְ לָטוּס אֶל כּוֹכַב הַלֶּכֶת עִם הַתְּשׁוּבָה הַנְּכוֹנָה. | only in the demo |
| First zoom chance | אֶפְשָׁר לְזַנֵּק לְמַעְלָה וּלְהַגִּיעַ מַהֵר. | at most two times |
| First missing number | אֵיזֶה מִסְפָּר חָסֵר? | the first two times |
| Level done | כָּל הַכָּבוֹד. הַלְּבָבוֹת מְלֵאִים שׁוּב. (3 variations) | the first two times, then only the fanfare |
| New ship | חֲלָלִית חֲדָשָׁה. | each of the two ships |
| Hearts run out | נִגְמְרוּ הַלְּבָבוֹת. אֶפְשָׁר לָטוּס שׁוּב. | the first two times |
| New best | שִׂיא חָדָשׁ. | each time; it is rare |
| Tap on the hearts | אֵלֶּה הַלְּבָבוֹת. טָעוּת לוֹקַחַת לֵב, וּבְסוֹף כָּל שָׁלָב הֵם מִתְמַלְּאִים. | once for a burst of taps |
| Tap on the points | אֵלֶּה הַנְּקֻדּוֹת. תְּשׁוּבָה נְכוֹנָה נוֹתֶנֶת נְקֻדָּה, וְזִנּוּק מַהִיר נוֹתֵן עוֹד אַחַת. | once for a burst of taps |

**One symbol, one meaning.** The points icon is a star, and the answers ride on planets. The voice therefore says
"כּוֹכַב הַלֶּכֶת" for a planet and "נְקֻדּוֹת" for the points, never plain "כּוֹכָב" for either. *My call*; the parent
can ask for another points icon.

Voice lines play through `src/shared/audioCore.ts` at the shared voice rate. Two audio events never overlap or touch:
a voice line waits for the effect before it (about 0.4 s), and a round's arrival sound waits for a voice line of the
screen before it. No voice line plays while planets move.

## Music and sound effects

- Each event has its own sound, all made by WebAudio code. The original has three: right, wrong (a boom with a siren)
  and the level fanfare; they are ported. Six are new and are coded in the same style: new sum, right with zoom,
  time-out, heart lost, new ship, end of run. *My call:* the parent hears the six new ones on a small sound page (a
  button for each) before the first playtest build, and they change on his notes.
- The original's tune plays on the cover, on *level done* and on the end screen.
- During flight the tune is off. A parent setting turns it on. (The rule for calm games does not bind an action game,
  but the parent chose off as the default.)
- *My call:* one tune only in this version. More tracks come if the parent finds it repetitive.

## The parent area

Behind the 2 s hold on the cover, built like Book 2's parent screen. Text is allowed here.

- **Where he is:** the ladder with the open rungs, and for each rung the share of right answers.
- **Sums he finds hard:** a table of items with right of seen, time-outs, the usual time, and his most frequent wrong pick.
- **Range:** automatic (default), or the parent sets the highest open rung. Switches for times and divide.
- **Time for one sum:** automatic (default, with the present value shown), or 8, 5, 4 s.
- **Music during flight:** off (default) or on.
- **Player:** the shared boy/girl setting (it changes nothing in this game today, but the control is on every game).
- **Telemetry export**, and **leave the game** (back to the alef menu).

## Tracking

`createTelemetry` from `src/shared/telemetry.ts`, with its own key and the `about` block that names this document.

- Each round: the item, the four numbers by lane, the ship's lane at the start, the lane and number he ended on, the
  result (right, wrong, time-out), zoom or arrival, the time to his last lane change and to the end, the arrival time
  in force, the rung, the level and the run.
- A demo round and a round cut by a pause are recorded as such and do not count in the tallies.
- Run start and end, level done, ship unlocked, rung opened, pause, and abandon (he leaves in the middle of a run).
- An analysis script in `asset-sources/spacecat/` or `scripts/`, on the pattern of the other games.

## Pause

When the tablet locks or the child changes app, the game pauses, all sound and music stop, and an opaque cover with a
play triangle hides the game. After the pause the same sum starts again from the top with fresh planets.

## Where it lives in the code

```
spacecat/index.html            a new Vite entry (vite.config.ts rollup input), like clock/ and duel2/
src/spacecat/
  logic/     facts and ladder, item choice, wrong answers, speed, round result, levels, points   (pure, tested)
  canvas/    game loop, planet renderer, ship, particles, top bar, sum box, input
  screens/   Cover, Play (wraps the canvas), LevelDone, End, Parent, PauseCover
  audio/     coded effects and tune (ported), voice line table
  store.ts   Zustand + persist: tallies, open rungs, points, best, ships, tips heard, settings
  telemetry.ts
  assets/    the 9 original pictures, voice files
src/components/spacecat/SpaceCatEntryCard.tsx   the card on the alef menu
asset-sources/spacecat/        origin record of the pictures and the tune, voice requests, hub card request
```

- The game is open from the start; the alef menu gets a card for it. The card is the one new picture: a generated
  image in the style of the other menu cards that shows the cat ship. Image budget: this one card, at most 4 attempts.
- Voice budget: the 9 lines above with their variations (about 12 takes before retakes). The parent confirms the limit
  when the plan is written.
- The round content sits behind one interface (`makeRound` → the box content, four planet labels, the right lane, the
  feedback content), so a reading galaxy can come later without a change to the canvas.

## Verification

- Unit tests for all of `logic/`: the ladder, the choice (no fact twice in a row, the 0.2 target), the wrong answers
  (different, in range, the confusion included), the speed limits, the three results, the hearts.
- The no-text scan on all child screens, with digits marked and the credit line on the allow-list.
- Drag, flick and tap tested with real touch events in the headless browser, at tablet landscape, phone upright and phone-on-its-side sizes.
- The full QA pass of the rules before the parent gets a build: a fresh start, each rung reached by a seeded store,
  wrong answers and time-outs, the audio order logged, a screenshot of each step.
- `npm test && npm run lint`, and the build of all four entries.

## Rule review

How the design meets [docs/minigame-rules.md](../../minigame-rules.md), by section.

- **Communication on the screen.** No text but the credit line (the parent's exception). Digits and signs are the
  learning content. The voice does not say what the screen shows; the sum is never read aloud (the parent's decision,
  and the digits are what he practises). The round "says what to do" by the demo and the ring; the instruction is not
  repeated each round.
- **Voice lines: wording, delivery, pronunciation.** No number in any line, no line that addresses the child, three
  variations of the one line that repeats, praise words only the first two times. Takes go through the review page.
- **Music and sound effects.** See above; one tune is a stated limit of this version.
- **Visuals.** Each symbol has one meaning (star = points, planet = answer, heart = life; burst particles are not
  heart-shaped). A time-out and a wrong hit look different (the true cause). A wrong answer is dramatic. Planets do not
  move as one stiff row. Icons are drawn shapes. The cover shows the game's world. Nothing looks like a nikkud mark,
  because the game shows no Hebrew glyphs on child screens.
- **Art generation.** The options mock was built from parts and opened on a phone; the budget is one card.
- **Interaction.** No way out and no floating button on child screens. Points are shown in the run, at the end and on
  the cover. Hearts and points speak on a tap. The action is the answer: no confirm button. A place for the answer (the
  ring) is shown; the answer goes there by flight, not by a drag of a number, because the flight is the game. The demo
  uses a real hand, its round flows into play, and the zoom is explained when he first needs it. Landscape tablet first;
  a phone keeps the portrait layout.
- **Game play and learning.** The 1 in 5 target, recent answers weigh more, wrong answers only from open rungs,
  confusions recorded by direction and brought back, speed adapts unseen, a new element (the missing number) is
  explained at its first show. No state that cannot exist: the ship is always in a lane. The action-game rule replaces
  the "wait after a mistake" rule: flash, a heart, the right answer marked for a moment, and on. No sum twice in a row.
  Hearts fill on each level and the run length is calculated above. A timer is right here: speed is the game. The game
  is open from the start. The story is small: a cat, planets, sums.
  *Near miss:* the rule "forgive a near miss one time" is met by the lane glide (no heart for parking between two
  planets). A number that is one away from the answer is a real mistake and is not forgiven.
- **Parent tracking.** See *Tracking* and *The parent area*.
- **Review of generated assets.** Voice takes on the review page; the chosen requests go to `asset-sources/spacecat/`.
- **Working with the parent.** The work is on its own branch and worktree. No host address, route or password is in
  any committed file.
- **Verification.** See above.

## Decisions and their owners

The parent decided: sums now and reading later; the wide landscape layout; drag with flick, and a tap also works; the
original's art and coded sound; points stay in this game; no narrated numbers; the credit line on the cover; one
adaptive ladder at 1 mistake in 5; all twelve rule changes listed in the chat of 2026-11-12 (among them: no timer bar,
lane glide, our pointing hand, zoom taught later, lines that do not address the child).

My calls, for the parent to check: the credit line in English; the ladder's rungs and its numbers; a time-out counts as
half a mistake; a rung opens at 2 mistakes or fewer in his last 12 answers on it; the speed numbers; `1 + 1` as the demo; a tap on the shelf chooses the ship; levels without an end;
"כּוֹכַב הַלֶּכֶת" and "נְקֻדּוֹת" as the spoken names; one tune; the draft wording of every voice line; the narrator voice;
the six new coded sounds; hearts and points speak only where the game stands still; the planets stop for the zoom tip.

Left to the builder: the canvas structure, the exact sizes and timings of effects, the store shape, the telemetry field
names, the constants' tuning inside the limits above.
