# Space Cat — a flying sums game, adapted from Space Cat Math

Status: approved by the parent (2026-11-12). A review pass on his behalf ran the same day and fixed the points that a
builder could not settle; it also fits the design to the home screen of *one duel*, which merges first. Read [docs/minigame-rules.md](../../minigame-rules.md) before building: every
rule there applies. The section *Rule review* below says how this design meets each group of rules and where the
parent decided an exception.

## Why

- A friend's father (Igor, Ray's dad) made *Space Cat Math* for his child: a cat in a rocket flies to the planet that
  carries the answer of a sum. The parent liked it and has the author's permission to adapt it into alef, in this public repository.
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

- Any text on a child screen. A way out of the game that a tap opens (the way home needs a 2 s hold; see *The cover*).
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

**Credit (the parent's decision):** the credit is a line of text on the home screen, under the Space Cat card, in Hebrew:
`קרדיט: איגור אבא של ריי`. It is the parent's side of the home page; no screen of the game itself shows it, so the game
has no text at all and the no-text scan needs no exception. *My call:* the line sits below the card's "מה לומדים" text,
in the same style but smaller and lighter; `asset-sources/spacecat/README.md` (the repository
has no root README) carries the same credit and says that the pictures, the tune and the mechanic come from
Space Cat Math by permission of its author. Each ported source file says so in its header comment.

## The play screen

One canvas, as in the original, wrapped by React. Logical size 1600×900 in the wide layout, 540×960 in the portrait
layout. The layout follows the other games' rule: a tablet in landscape gets the wide layout; a phone gets the portrait
layout, also when it lies on its side. *My call:* a screen whose shorter side is less than 600 CSS px is a phone; a
screen that is wider than it is high and not a phone gets the wide layout; every other screen gets the portrait layout. The
background fills the whole screen on any shape; the game area keeps its size inside it.

**Top bar.** Left: the held house button first (the way home, a 2 s hold with a ring that fills; rule), then 7 progress
dots for the level. Right: a star with the points of the run, and 3 hearts. All drawn as shapes, not emoji. During
flight the top bar does not take taps, except the house: a touch elsewhere on it steers like a touch anywhere. The hearts
and the points speak on a tap where the game stands still: the points and his best on the cover, on *level done* and on
the end screen, the hearts on *level done*, and a locked ship on the cover's shelf (see *Voice*). No plain home button, no
pause button, no speaker.

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
  points, and a play triangle. If a ship is new, it flies in and takes the thumbs-up cat's place (rule: each character
  one time on a screen). The order of the sounds: the fanfare, then the level line, then the new ship's sound and its line.
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
  *My call:* a tap on an unlocked ship on the shelf makes it his ship. A tap on a locked ship says how he gets it.

## The cover

The space background with turning planets, the ship shelf with his current ship large in its middle (it is not shown a
second time), a play triangle, all his points with the star, his best, the parent button (the shared parent gate: a 2 s
hold, then the parent's year of birth; rule), and the held house button (as on Book 2's cover), both inset from the
rounded screen corner (rule: keep things away from the corners). The fonts and pictures load before the cover shows.
The held house is also on the pause cover and on the end screen, in the same corner (rule: *A way out of the game … must
need a 2 s hold*; this replaces the older rule "no way out on a child screen" that this design first followed).

**The play triangle** points left on every screen of this game. Reason (rule): the ship moves up, not to a side, so
the triangle follows the reading direction. *My call.*

## The first time

- The first round of the first run starts with the demo. The planets stand still, alef's own pointing hand drags the
  ship under the right planet and back while the instruction line plays, and when the words end the planets start to
  move: he plays that same round, with the same sum and the same planets, and it counts as a usual round of the run
  (points, a progress dot, a heart). Its answer does not go into the tallies, because the hand showed it (see
  *Tracking*). No button.
  *My call:* this round is `1 + 1`. While the line plays, his touches do nothing (rule: no answers during an instruction).
- **Zoom** is not in the demo. The first time he is parked under the right planet and waits, the planets stop, the
  hand shows a flick up and the zoom line plays; then the planets go on. This is shown at most two times. (The planets
  stop so that no round-end sound can fall on the voice.) The tip is a hint: a flick during it stops the line, and the
  zoom counts.
- **The missing number** is a new element. The first two times a ring is not at the end, the ring pulses and the line
  "which number is missing?" plays before the planets start to move. His touches wait until the line ends.

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
7. *(off until the parent turns it on)* times, tables to 5. A switch makes a rung reachable; it still opens by the
   usual rule, after the rung below it
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
this prediction, because slow steering is not the same as not knowing. The shared module is not changed for this: the
game keeps its own recent string (`o` right, `x` wrong, `t` time-out) and takes the mean of two shared predictions, one
with every time-out as a mistake and one with every time-out as right. The shared formula is linear in the mistakes, so
the mean is exactly "a time-out is half a mistake".

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
- The aim is about 1.6 × his usual time to get under the right planet (the median of his last 12 right answers). A round
  in which the right planet starts in his lane does not count for this. With fewer than 5 such answers, the time stays.
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
| Level done | כָּל הַכָּבוֹד. הַלְּבָבוֹת מְלֵאִים שׁוּב. / יֹפִי שֶׁל טִיסָה. הַלְּבָבוֹת מְלֵאִים שׁוּב. | the first two times, then only the fanfare; it plays only two times, so 2 variations are enough |
| New ship | חֲלָלִית חֲדָשָׁה. | each of the two ships |
| Hearts run out | נִגְמְרוּ הַלְּבָבוֹת. אֶפְשָׁר לָטוּס שׁוּב. | the first two times |
| New best | שִׂיא חָדָשׁ. | each time; it is rare. Book 2's approved take `new-best-1` (the same narrator, no gender) is reused: no new take |
| Tap on the hearts | אֵלֶּה הַלְּבָבוֹת. טָעוּת לוֹקַחַת לֵב, וּבְסוֹף כָּל שָׁלָב הֵם מִתְמַלְּאִים. | once for a burst of taps |
| Tap on the points | אֵלֶּה הַנְּקֻדּוֹת. תְּשׁוּבָה נְכוֹנָה נוֹתֶנֶת נְקֻדָּה, וְזִנּוּק מַהִיר נוֹתֵן יוֹתֵר. | once for a burst of taps; no עוֹד (its stress is wrong in this voice) |
| Tap on his best | זֶה הַשִּׂיא: הֲכִי הַרְבֵּה נְקֻדּוֹת בְּטִיסָה אַחַת. | once for a burst of taps |
| Tap on a locked ship | אֶת הַחֲלָלִית הַזֹּאת מְקַבְּלִים בְּטִיסָה אֲרֻכָּה. | once for a burst of taps |

**One symbol, one meaning.** The points icon is a star, and the answers ride on planets. The voice therefore says
"כּוֹכַב הַלֶּכֶת" for a planet and "נְקֻדּוֹת" for the points, never plain "כּוֹכָב" for either. *My call*; the parent
can ask for another points icon.

Voice lines play through `src/shared/audioCore.ts` at the shared voice rate. Two audio events never overlap or touch:
a voice line waits for the effect before it (about 0.4 s), and a round's arrival sound waits for a voice line of the
screen before it. No voice line plays while planets move. The tune gets quieter under every voice line (rule).

## Music and sound effects

- Each event has its own sound, all made by WebAudio code. The original has three: right, wrong (a boom with a siren)
  and the level fanfare; they are ported. Six are new and are coded in the same style: new sum, right with zoom,
  time-out, heart lost, new ship, end of run. *My call:* the parent hears the six new ones in Space Cat's section of the
  parent area (a button for each) before the first playtest build, and they change on his notes.
- The coded sounds follow the device's one sound setting (effects on or off, music on or off, the volume), as every
  game's sound does.
- The original's tune plays on the cover, on *level done* and on the end screen.
- During flight the tune is off. A parent setting turns it on. (The rule for calm games does not bind an action game,
  but the parent chose off as the default.)
- *My call:* one tune only in this version. More tracks come if the parent finds it repetitive.

## The parent area

Space Cat's part of alef's one parent area, behind the parent gate on the cover (a 2 s hold, then the year of birth).
The area opens at Space Cat's section. Text is allowed here. The area's own sections give boy or girl, the device's
sound, minutes played and the mix-ups of every game, the one telemetry export, and the way to the alef menu. Space Cat's
section holds:

- **Where he is:** the ladder with the open rungs, and for each rung the share of right answers.
- **Sums he finds hard:** a table of items with right of seen, time-outs, the usual time, and his most frequent wrong pick.
- **Range:** automatic (default), or the parent sets the highest open rung. Switches for times and divide.
- **Time for one sum:** automatic (default, with the present value shown), or 8, 5, 4 s.
- **Music during flight:** off (default) or on.
- **The game's sounds:** a button for each coded effect and the tune.
- The player (boy/girl; it changes nothing in this game today), the telemetry export and the way back to the alef menu
  are the area's own sections. The game does not ask boy or girl before play, because no line has a boy or girl form.

## Tracking

`createTelemetry` from `src/shared/telemetry.ts` with `game: 'spacecat'`, its own key and the `about` block that names
this document. Its cap is a share of the one storage budget of all logs (the parent decides the split). The export is the
parent area's one export.

- Each round: the item, the four numbers by lane, the ship's lane at the start, the lane and number he ended on, the
  result (right, wrong, time-out), zoom or arrival, the time to his last lane change and to the end, the arrival time
  in force, the rung, the level, the run and the ship in use.
- A demo round and a round cut by a pause are recorded as such and do not count in the tallies.
- Run start and end, level done, ship unlocked, rung opened, pause, and abandon (he leaves in the middle of a run).
- An analysis script in `asset-sources/spacecat/` or `scripts/`, on the pattern of the other games.

## Pause

When the tablet locks or the child changes app, the game pauses, all sound and music stop, and an opaque cover with a
play triangle hides the game. After the pause the same sum starts again from the top with fresh planets.

## Where it lives in the code

```
spacecat/index.html            a new Vite entry (vite.config.ts rollup input, knip entry), like clock/ and duel2/
src/spacecat/
  main.tsx, SpaceCatApp.tsx  the root on the shared game shell (src/shared/shell); the staging import comes first
  logic/     facts and ladder, item choice, wrong answers, speed, round result (a pure step), levels, points   (pure, tested)
  controller.ts, usePlay.ts   the play flow as a framework-free controller (time through a Sleeper), and its thin hook
  canvas/    game loop, planet renderer, ship, particles, top bar, sum box, input
  screens/   Cover, Play (wraps the canvas), LevelDone, End, PauseCover
  parent/    Space Cat's part of the one parent area (src/parent): index.ts (light), Settings, reset
  audio/     voice on the shared game-audio kit; coded effects and tune (ported) on the player port's WebAudio output; line table
  saveFormat.ts, store.ts, savePort.ts   save key and light read; Zustand + persist (tallies, open rungs, points, best, ships, tips heard, settings); the controller's port
  telemetry.ts, telemetryLog.ts
  assets/    the 9 original pictures, voice files
  README.md  where things are, tests, known friction
src/components/home/SpaceCatCard.tsx            the card on the home screen (one duel's layout)
asset-sources/spacecat/        origin record of the pictures and the tune, voice requests, hub card request
```

- The game is open from the start; the home screen gets a card for it. *One duel* (merged first) rebuilds the home
  screen: the duel card and its path, a separator, the clock card, a separator, and the shelf of older activities. The
  Space Cat card goes after the clock card, with its own separator before it. *My call:* it is built like the clock card,
  from the game's own parts (rule: build from the game's own parts; non-goal: no art in alef's painted style): the space
  background, the current cat ship, three small planets with digits, and the home's play button pointing left. Under it,
  the line for the parent: "**מה לומדים:** חיבור וחיסור עד 10, מספר חסר בתרגיל, ואחר כך חיבור וחיסור עד 20. המשחק
  מתאים את עצמו לילד, גם במהירות." Below it, the credit line `קרדיט: איגור אבא של ריי`, in the same style, smaller
  and lighter (see *Credit*).
- Image budget (the parent approved): a generated card picture, plan 4 attempts, ceiling 8. With the card from the
  game's own parts, it is used only if the parent asks for a painted picture after he sees the card.
- Voice budget (the parent approved): plan about 12 takes, ceiling about 24. The lines above are 11 items with their
  variations (the new-best line is reused). The first round makes one take of each item; a second take is made only for
  an item that fails the automatic checks or that the parent rejects. This is a stated exception to "2 or more takes for
  each item", for the budget.
- The round content sits behind one interface (`makeRound` → the box content, four planet labels, the right lane, the
  feedback content), so a reading galaxy can come later without a change to the canvas.

## Verification

- Unit tests for all of `logic/`: the ladder, the choice (no fact twice in a row, the 0.2 target), the wrong answers
  (different, in range, the confusion included), the speed limits, the three results, the hearts.
- The no-text scan on all child screens, with digits marked and no allow-list.
- Drag, flick and tap tested with real touch events in the headless browser, at tablet landscape, phone upright and phone-on-its-side sizes.
- The full QA pass of the rules before the parent gets a build: a fresh start, each rung reached by a seeded store,
  wrong answers and time-outs, the audio order logged, a screenshot of each step.
- `npm test && npm run lint`, and the build of all four entries.

## Rule review

How the design meets [docs/minigame-rules.md](../../minigame-rules.md), by section.

- **Communication on the screen.** No text at all (the credit is on the home page, not in the game). Digits and signs are the
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
- **Art generation.** The options mock was built from parts and opened on a phone. The home card is built from parts
  too; the image budget is kept for the case that the parent wants a painted card.
- **Interaction.** The only way out on a child screen is the held house (2 s, a ring; cover, top bar, pause cover, end
  screen); the parent button is the parent gate (2 s hold, then the year of birth). No other floating button. The
  planets of neighbouring lanes never overlap, each is at least about 56 CSS px at the ship's row on a phone on its side,
  and they glow softly only while he can steer. A touch ends the zoom tip at once. Points are shown in the run, at the end and on
  the cover. Hearts, points, his best and a locked ship speak on a tap. The play triangle points left. The screens are
  built from the original's parts and alef's demo hand. The action is the answer: no confirm button. A place for the answer (the
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

The parent decided: a held house button as the way home, on the cover, the top bar, the pause cover and the end screen (the rule on `main`); no boy-or-girl question before play (no line speaks to him); sums now and reading later; the wide landscape layout; drag with flick, and a tap also works; the
original's art and coded sound; points stay in this game; no narrated numbers; the credit under the home card, in Hebrew; one
adaptive ladder at 1 mistake in 5; all twelve rule changes listed in the chat of 2026-11-12 (among them: no timer bar,
lane glide, our pointing hand, zoom taught later, lines that do not address the child). Igor's permission covers this
public repository. The budgets: image plan 4, ceiling 8; voice plan about 12 takes, ceiling about 24.

My calls, for the parent to check: the credit's style under the home card; the ladder's rungs and its numbers; a time-out counts as
half a mistake; a rung opens at 2 mistakes or fewer in his last 12 answers on it; the speed numbers; `1 + 1` as the demo; a tap on the shelf chooses the ship; levels without an end;
"כּוֹכַב הַלֶּכֶת" and "נְקֻדּוֹת" as the spoken names; one tune; the draft wording of every voice line; the narrator voice;
the six new coded sounds; hearts and points speak only where the game stands still; the planets stop for the zoom tip;
the phone test (shorter side under 600 px); the play triangle points left; the home card from the game's own parts and
its line; the current ship shown once on the cover; one first take per voice item; the telemetry
cap's share (proposal: Space Cat 200 k characters, Book 2 600 k, clock 400 k).

Left to the builder: the canvas structure, the exact sizes and timings of effects, the store shape, the telemetry field
names, the constants' tuning inside the limits above.
