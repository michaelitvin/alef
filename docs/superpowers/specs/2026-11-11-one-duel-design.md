# One Duel: stakes, the merchant, the merged duel and the main screen — Design

**Date:** 2026-11-11
**Status:** Draft for the parent's review. Brainstormed with the parent on 2026-11-09 to 2026-11-11. A builder check ran on 2026-11-11; its questions are answered here.
**Builds on:** [the duel](2026-10-05-nikkud-wizard-duel-design.md), [Book 2](2026-10-19-duel-book-2-design.md),
[Book 2 drawing](2026-11-07-book2-drawing-design.md), [the flight bosses](2026-11-07-book2-flight-boss-design.md),
[girls](2026-11-07-girls-design.md). Read [docs/minigame-rules.md](../../minigame-rules.md) first: every rule applies.
**Mockups:** the main screen and the merchant were mocked as HTML pages built from the game's own parts and reviewed
with the parent frame by frame. They live host-local, outside the repo. This document describes everything they show.

In this document, **"the parent decided"** marks a decision the parent made, **"my call"** marks a decision made in the
brainstorm that the parent has not confirmed, and *Left to the builder* lists what is open.

## Intent

Four requests from the parent, in one project because they touch the same run, rewards and home screen:

1. **"Too easy: he can't lose."** The child said so about Book 2. The parent: "He doesn't like losing, but I think he
   should be on his tiptoes considering the possibility of him losing." The questions stay as hard as they are (the
   adaptive 1-in-5 mistake rate). What changes is the stakes.
2. **The drawing screen goes in.** The parent tried it and it is OK.
3. **The main screen tells the parent what each game teaches.**
4. **One duel.** "The new game has all these minigames inside, and I don't see why separate the first duel game from
   the new duel game."

Why he can't lose today (from the code): hearts refill when each screen starts (`heartsOnScreenStart`), the first
near-miss in a round is forgiven, a rescue potion flies in on the broom after a lost heart (at most once per broom
visit), and every mistake slows the flight 12 % (`flightPace`).

## Goals, non-goals, anti-goals

**Goals**
- Losing a run is possible and feels possible, but it is rare, short and funny, and it never costs real progress.
- Coins become a currency he spends, at a calm moment, with real counting.
- One game: the first duel becomes the first minigame of Book 2's run. One reward system. A new player starts with the
  first duel's minigame and the other minigames open over time. An existing player keeps all his progress.
- A home screen where each game says, for the parent, what it teaches; the new games come first.
- Drawing in print and drawing in handwriting are minigames of the run.

**Non-goals**
- Harder questions. The adaptive rate stays.
- Haggling (designed, mocked, and dropped by the parent as too complicated).
- Change and checking change (parked "for later" by the parent; see *Later*).
- Changing the clock game, other than its home card.

**Anti-goals** (a failure even if it works)
- **A compulsive-spending pattern.** This was the parent's biggest concern. Nothing is ever offered when the hearts run
  out. There are no timers, no daily rewards, no "continue?" prompt at the moment of losing, and coins come only from
  reading.
- A loss that costs stars, coins, trophies or learning progress.
- A screen with more parts than he needs. The parent rejected a tray, a handshake button, a wave-goodbye button and a
  play-triangle "no thanks" as unclear. Every part of the merchant screen is something he acts on, or his hearts and
  coins.
- Parts that look different from the rest of the game. The parent rejected new coin, button and hand styles one by one.
  Use the game's own parts (see *The merchant: the screen*).
- Long or stiff voice lines. The parent rewrote several lines. Keep each line as short as the ones below.

## Part 1 — Stakes

The stakes are for the whole adventure, in every minigame (the parent: "I don't think he meant a specific minigame, but
all games, he just can't lose"). This includes the first duel's screen once it is in the run.

The parent decided:
- **3 hearts for the whole run.** They do not refill when a new screen starts. (Replaces `heartsOnScreenStart` per
  screen and the 2026-10-19 decision "hearts refill per screen".)
- **A heart back at the end of each pass** (the parent chose this, 2026-11-11; "maybe increase to 5 hearts later").
  A pass is one trip through all his open minigames in their fixed order; the run then starts the order again. At the
  end of a pass, one heart comes back, up to 3, in its own moment with a sound. Reason: at his 1-in-5 mistake rate,
  3 hearts last about 15 answers, and a pass with everything open is about 40; without it nearly every run would end on
  the second or third screen. Keep the heart count a single constant, so 5 is a one-line change after a playtest.
- **No heart back on stage 0** (the parent, 2026-11-12). A beginner whose only open minigame is the tower (stage 0,
  Part 3) does not get a heart back at the end of a pass. The parent: "the beginner starts over and doesn't lose much
  progress".
- **No free potion.** The rescue potion that flies in after a lost heart is gone. The only way to get a heart back is
  to buy the potion from the merchant (Part 2).
- **A streak multiplier.** Right answers in a row multiply what he earns (×2, then ×3). A mistake resets it.
- **A smaller slowdown.** A mistake slows the flight only a little.
- **No heartbeat, no red pulse** on the last heart ("too stressful").
- **When the hearts run out, nothing is offered.** The run ends with a short, funny defeat scene and an immediate
  "again?". He keeps everything he has earned.

My calls:
- **Earning:** one coin for each right answer, times the streak multiplier. ×1 for a streak of 0–4, ×2 for 5–9, ×3 for
  10 or more. Today's "a coin for each 10 stars" (`COIN_EVERY`) is too slow to pay prices that he must count. Stars stay
  as the record of right answers. Coins become a balance that goes up and down.
  This changes the rule "give rewards at several paces" in `docs/minigame-rules.md`, where coins were the slow count
  (a coin for every 10 points) that the parent asked for. The stars stay the count that is kept between plays and only
  grows; the coins become spending money. Update that rule's example when this is built.
- **The slowdown:** a mistake slows the flight ×1.04 (today ×1.12). A catch still speeds it ×0.99.
- **The near-miss forgiveness stays.** It is a fair rule ("almost right"), not a safety net. Of today's four nets, only the
  other three change.
- **The defeat scene:** the wizard falls off his broom (the existing dizzy sprite) and the boss or a monster gloats.
  Then a big play button for "again?", in the explanation's go-on style. The next run starts after the screen where
  this one ended, as today (`lastEnded`).

## Part 2 — The merchant

A gnome merchant who sells the potion that gives back a heart. He pays the exact price. There is no haggling and no
change.

### When he comes (the parent decided the principle; the details are my calls)

- Only in the full adventure (the run started from the duel card), never in a single minigame from the path.
- At checkpoints: between screens, and always before a boss. Never at the moment the hearts run out.
- Only when the child has fewer than 3 hearts **and** enough coins for the price. The parent: it is fine that he
  doesn't get the merchant when he has no money.
- My call: on his last heart, the merchant comes at the next checkpoint. With 2 hearts, at every other checkpoint, so
  that the merchant doesn't become routine.
- My call (2026-11-13): **his first meeting ever** comes at the first checkpoint where he has fewer than 3 hearts and
  enough coins, with no every-other wait. The save marks "never met" (`checkpointsSinceVisit` starts at `NEVER_VISITED`),
  so the every-other cadence starts only after the first meeting. The faster stage 0 (Part 3) also brings him sooner.
- One potion per visit.

### Prices

- The parent decided: the price goes up within a run, and hearts are not expensive at the beginning.
- My call: the first price is about what one good screen earns. Each purchase in a run multiplies the price ×1.5,
  rounded. The price starts low again in the next run.
- Prices stay inside the parent's number range (below).

### The number range (the parent decided: a parent setting)

Shopping is too rare to *teach* arithmetic. It is a place to practise what he knows. The parent setting is "up to 10",
"up to 100" or "up to 1000", and my call is that the default is "up to 100". Coin values follow the range:
- up to 10: 1, 2, 5, 10;
- up to 100: also 20, 50;
- up to 1000: also 100, 200, 500.

### His coins (the parent picked piles)

- **The game's own coins, never shekels and never paper notes** (the parent: "keep the current currency"). He makes up
  a payment from coins of different values, the way the parent asked ("can the kid compose the bills?").

- His coins lie on the ground in front of the wizard, as **one pile for each kind of coin**. The parent picked piles
  over a row. A tap or a drag takes the top coin of a pile.
- **The piles are all his savings** (the parent decided). The top bar shows the exact total. A pile is drawn up to a
  height cap (my call: 6 coins). A taller pile is drawn at the cap and means "at least this many" (the parent). Taking
  coins from a capped pile lowers it only when fewer than the cap are left, so every coin of his savings can be
  given.
- The game decides which coins his balance is made of, so that **the exact price can always be made** (the parent:
  "the game has to make sure that the wizard has the right change to make the price"). It re-makes the composition
  before each visit, never during one. My call on how
  this adapts: at first one or two coins make the price. Later he needs more coins, and the obvious big coin is too
  much.
- With several coins of the same kind, he chooses how to pay. Example: price 7 from 5 + 5 + 2 + 2 + 2 + 1 + 1 can be
  paid as 5 + 2, 5 + 1 + 1 or 2 + 2 + 2 + 1.

### The screen

The game's own parts only, in the Book 2 layout: the wizard on the left, the merchant on the right.
- **The top bar is Book 2's own,** with one help button on the left: the question mark (the parent: the wand and the
  speaker were unclear; "there should be one button that repeats the walkthrough"). His coins and hearts are on the right.
  There is no speaker on this screen.
- **The potion** is in the merchant's raised hand. **The price tag** is tied to the bottle with a string. It is
  parchment and shows the game's coin icon and the price as a numeral.
- **The merchant's open hand** is where the coins go.
- **His coins are the game's coin** (`CoinIcon`: the copper coin with the rim, the shine and the crescent), with the
  value stamped in the middle in the crescent's cream colour and a small crescent above it. Bigger values are bigger
  coins. The tag and the top bar use the same coin, shine included.
- **No thanks is one ✗ card,** the game's choice card, styled like the boy/girl question (`GenderQuestion`'s `.gq-pick`):
  a soft glass card that glows gold when it is pointed out. It is always there. There is no yes button (the parent
  decided): giving the merchant coins is the yes.
- **Demos use the game's pointing hand** (`HandShape`), with its fingertip on the target.
- No emoji, and no text on the child's screen. Digits are allowed (the price, the values, the count bubble).

### The flow

**Every visit.**
1. The merchant walks in and says the opening line. His piles pulse once, to show where to start.
2. **✗, at any moment:** the coins in the merchant's hand go back to their piles, and the merchant says goodbye and
   walks away. The run goes on.
3. **Nothing for about 20 seconds:** he asks once more, then waits. There is no time limit.

**A child who knows the merchant** (the parent asked for a shorter opening; my call: he knows him once he has bought
a potion from him, the save's purchase count) hears only the short offer, רוֹצֶה [רוֹצָה] שִׁקּוּי לֵב?, and sees no demo. The
explanations that come when a move is first needed (the undo) still come.

**First visit only, the merchant shows how,** right after the opening line. Everything else dims, and the game's
pointing hand shows each step while he says it:
- D1: the price tag glows;
- D2: the hand drags a top coin into the merchant's hand (and it goes back);
- D3: the hand taps the potion;
- D4: the ✗ card glows.

Then it is his turn, with the same price (rule: the demo's round is the first round he plays).

**Paying.**
- **Giving coins:** he drags or taps the top coin of a pile, and it jumps into the merchant's hand with a clink.
  **No total is shown while he chooses** (the parent: counting the plate for him has no benefit). Once there are coins
  in the merchant's hand, the potion pulses.
- **Undo** (the parent decided): a tap on the merchant's hand sends back the last coin given, to its pile. Each tap
  undoes one more coin. There is no "start over" button. Undo is shown only when he first needs it (below).
- **Buying:** he taps the potion. The merchant counts: the coins in his hand light up one by one, each with a chime,
  and a bubble shows the running total. Then the tag lights up, so he sees both numbers together.
  - **Exact:** the potion flies to the wizard, a heart flies to the top bar and the hearts flash (as at the end of a pass),
    and the coins go into the merchant's pouch. Then the merchant says that the child has a heart back (the parent).
  - **Not enough:** the tag flashes. The coins stay, and he adds more.
  - **Too much:** the tag flashes. The coins stay. **The first time only,** the pointing hand taps the merchant's hand
    and the last coin flies back to its pile (the parent liked showing it "just when it's needed").
  - Wrong tries cost nothing, and he can try any number of times.
- **Help: the question mark.** A tap plays the walkthrough again: D1–D4, and the undo step too once he has seen it (the
  hand on the merchant's hand; no coin moves). The deal stays as it is: the price, his piles and the coins in the
  merchant's hand. The button is hidden while the replay plays, and a touch on a coin, the potion or the merchant's hand
  ends the replay at once and counts (rule: a hint goes away when the child acts). After two wrong tries in a row, the ?
  glows (it does not open by itself). A replay counts as a hint in the parent's money section and for the coins' level.
  The green coins of the earlier hint are gone (they showed the answer; the parent asked for one button that repeats the
  walkthrough).
- **He taps the potion with nothing in the merchant's hand:** the merchant's hand glows.

### Voice lines (boy forms; girl forms in brackets)

The merchant speaks all the lines (the narrator's hint line left with the green coins). The parent wrote or changed the opening line and the D2 line.

| When | Line |
|---|---|
| Opening (the parent's line) | שָׁלוֹם קוֹסֵם [קוֹסֶמֶת]. יֵשׁ לִי שִׁקּוּי שֶׁנּוֹתֵן לֵב בַּחֲזָרָה. תִּרְצֶה [תִּרְצִי] לִקְנוֹת אֶחָד? |
| No answer for 20 s | נוּ, תִּרְצֶה [תִּרְצִי] לִקְנוֹת אֶחָד? |
| ✗ (no thanks) | בְּסֵדֶר. לְהִתְרָאוֹת, קוֹסֵם [קוֹסֶמֶת]. |
| D1 (first visit) | זֶה הַמְּחִיר. |
| D2 (the parent's wording) | תֵּן [תְּנִי] לִי מַטְבְּעוֹת, לְפִי הַמְּחִיר. |
| D3 | וְאָז גַּע [גְּעִי] בַּשִּׁקּוּי. |
| D4 | לֹא צָרִיךְ? גַּע [גְּעִי] כָּאן. |
| Exact | בְּדִיּוּק. הִנֵּה הַשִּׁקּוּי. |
| Then, the heart back (the parent asked; no עוֹד, no "!") | עַכְשָׁו יֵשׁ לְךָ [לָךְ] לֵב בַּחֲזָרָה. |
| Opening, a child who knows him (the parent) | רוֹצֶה [רוֹצָה] שִׁקּוּי לֵב? |
| Not enough | זֶה לֹא מַסְפִּיק. |
| Too much | זֶה יוֹתֵר מִדַּי. |
| Too much, first time, with the undo demo | קַח [קְחִי] מַטְבֵּעַ בַּחֲזָרָה. |
| Potion tapped with an empty hand | קֹדֶם מַטְבְּעוֹת. |

- **No numbers are spoken.** Every count is shown. (This solves recording every number.)
- **No "!" in the text** (rule: it makes the voice shout); the playful tone comes from the voice settings. The opening
  line has no comma after שָׁלוֹם (the clock's "שָׁלוֹם, שָׁעָן!" was read as two words). "Not enough" avoids עוֹד and
  קְצָת, which this voice says wrongly (rule). The parent's wording is kept otherwise.
- The girl forms (תִּרְצִי, תְּנִי, גְּעִי, קְחִי) are the kind the rules say the voice mis-stresses: check them on the
  merchant's voice before mass recording, and reword to a neutral form where they fail.
- Each line that repeats gets a few variations (rule).
- My call: the merchant has his own voice, playful and warm, different from the narrator.

### Edge cases (my calls)

- A pause during a visit (the tablet locks) keeps the visit as it is, coins in the merchant's hand included (rule:
  continue with the same question). Only closing the game ends the visit; then the coins go back.
- The merchant's art: the gnome (the raccoon was rejected because it looked like a boss). The mock has three poses:
  selling (open hand and raised hand), embarrassed, and insulted. The insulted pose is not used now.

## Part 3 — One duel

The parent decided:
- **One game.** A new player starts with the first duel's game (nikkud by sound: the tower and the monster). After a
  while the Book 2 minigames open, one by one.
- **One reward system:** stars, coins, hearts and the merchant.
- **מגה כישוף is dropped,** in favour of the new system. The streak multiplier takes over its role (a reward for many
  right in a row). **Changed 2026-11-14:** the parent brought it back (see *The מגה spell is back*).
- **Existing players get a migration:** their progress transfers. Minigames where they excel and make no mistakes come
  up less and less often.
- **Choosing one minigame:** a path of the open minigames under the duel card (Part 4). A session from the path has an
  end; it is not endless play.

My calls:
- **The first duel becomes a screen of the run,** the first station of the path. Its mechanics stay as they are, except
  for three changes: no מגה, hearts are shared with the run, and stars and coins go to the shared count. (**Changed
  2026-11-14:** the מגה spell is back; the other two changes stay.)
- **When a minigame opens:** Book 2's stage machine stays as it is (`stages.ts`, `screensOfStage`, the content mix).
  It still decides which Book 2 screens are open and what content they use. A new **stage 0** comes before it, in which
  only the first duel's screen is open. Stage 0 passes when the first duel's marks are mastered by its own adaptive
  measure (my starting point: every nikkud mark has at least 3 recent answers, and at least 75 % of all the marks' recent
  answers together are right; a player who is right 80 % of the time gets there in about 95 answers, about ten tower
  visits). Then stage 1 opens broom and ghosts, as today. Inside a screen, the content still moves up by stage.
  **Changed 2026-11-13** (see *Placement: a skilled child moves on fast*): that rule is now the slow lane; a placement
  check and a fast lane come before it.
- **The order of a run stays a fixed cycle** (`ORDER`, `nextScreen`, `lastEnded`), with the first duel's screen first.
  "Fewer of the minigames he excels at" means a shorter visit, not a random order. A screen with no recent mistakes
  gets a shorter visit (about half), and a screen he has excelled at for a long time is skipped in every other cycle.
  It is never removed, so it comes back as review. Checkpoints stay between screens.
- **Migration of the first duel:**
  - Its right answers (`correct`, summed over `byMark`) are added to the shared stars. `mega` results are not counted:
    a lightning kill is not reading (rule: count special results separately).
  - Coins: his starting balance is the coins he has today (`coinsOf`), plus the first duel's right answers counted
    the same way (one coin for each 10).
  - Its adaptive data (`byMark`, `recent`, `confusions`, `pace`) seeds the first-duel screen's adaptive state.
  - Its stats stay in the parent report as history.
- **Book 2's own save is kept as is.** The first duel's data moves into it once, and the old data stays where it is
  (read-only).
- **Station ratings on the path** are a 0–3 rating of his recent accuracy on that minigame's content, from the adaptive
  tallies, which exist for every player, so existing players see their progress at once. They are drawn as three small
  dots that fill, not stars, so they are not confused with the star count.
- **The way in:** the duel card opens Book 2's cover, as today (its big play button, his totals and the boss shelf;
  the parent area is reached from there). A station on the path opens that minigame directly, through a link parameter.
  After a path session's summary, the game goes back to the home screen by itself (no button: rule, no way out on a
  child screen).
- **A session from the path:** one visit to that minigame (about 10 questions, or one boss), then the summary screen.
  No hearts at stake and no merchant. Stars and coins are still earned.

### Placement: a skilled child moves on fast (the parent approved, 2026-11-13)

A child who already knows nikkud was held at stage 0 too long: a simulated child with no mistakes needed about 40 tower
answers. The causes: the picker did not cover all ten marks quickly, mastery was checked only at the end of a tower
visit, and after 8 clean answers the visit fell to one wave, so there were more stops per answer. The parent: "a
placement check is a good idea for other things as well".

- **The placement check.** At stage 0, while a mark has no recent answer, the tower asks one of those marks (at random
  among them). With ten marks, the first two waves (10 answers) ask each mark once. Only the tower in the run does this;
  the first duel's own game is as before.
- **Two lanes.** Book 2 opens by the old rule (the slow lane: every mark at least 3 recent answers, 75 % of them right)
  **or** by the fast lane: every mark has a recent answer, each mark's latest answer is right, and his last 10 tower
  answers (in time order) are all right. The save keeps the tower's last 10 answers in time order for this
  (`towerTail`; a new field with a default, so no save migration).
- **The check runs after every wave,** not only at the end of a visit. A pass in the middle of a visit ends the visit at
  that wave's end; then the book opens with the usual celebration.
- **At stage 0 the tower's visit is never shorter.** (After the book opens, the shorter visit is decided by the tower's
  last 8 answers in time order, as on the other screens; before 8 are kept, by every mark's recent answers.)
- **The parent can open the book:** "Already knows nikkud: open Book 2" in the parent area, shown only while the book is
  closed. It is logged (`book-open` with `by: parent`).
- **Measured** (200 simulated players each; answers until the book opens, median, with the 10th and 90th percentiles):

  | Right | Before | Now | By the fast lane |
  | --- | --- | --- | --- |
  | 100 % | 41 (33–46) | 10 (10–10) | all |
  | 95 % | 50 (40–81) | 10 (10–60) | 94 % |
  | 90 % | 63 (42–121) | 46 (10–97) | 71 % |
  | 80 % | 100 (57–182) | 92 (31–170) | 18 % |

  The 80 % child's road is about as before. About 1 in 10 of them gets 10 right in a row in the placement check and
  goes on at once; the stage machine and the shorter-visit rules then adapt to him in Book 2 (tune in a playtest).

### The מגה spell is back (the parent, 2026-11-14)

The child missed it: he asked "why is there no more mega spell?". The parent wants it back on the tower in the run. It
works as in the first duel's own game: after 8 hits the lightning is charged, the wizard says "tap the lightning"
(`line-mega`), the lightning button shows at "בָּרָק", and a tap casts the מגה kill (its sound, its effect; on a boss it
takes two hearts, and the boss's final hit is the big effect as before).

Why it was off, and what is done about each reason (my calls):
- **It is not reading** (rule: count special results separately). A מגה kill is no answer for the run: no star, no coin,
  and the streak and the hearts stay as they were (the duel's own streak does not move either, so its streak line stays
  in step with the top bar's ×2). It is kept out of the mastery data: not in the duel's `recent` (stage 0's slow and fast
  lanes, the station ratings), not in the tower's time-ordered tail (`towerTail`: the fast lane and the shorter visit),
  and it does not move the pace. Its tally (`byMark.mega`) is still kept, for the parent report's מגה column.
- **It counts as a kill toward the wave's 5**, as in the first duel: the monster dies and the wave goes on. So a visit
  with a cast has one reading answer fewer.
- **Telemetry:** the duel's own `outcome` (`result: 'mega'`) and `mega_tap` as before; Book 2's telemetry gets its own
  event, `tower-mega`, never an `answer`.
- **The meter is gone with the HUD;** the wizard's line and the lightning are the signal (as in the first duel, where the
  button shows only after the line). The button sits above the rune row, as in the first duel (a walking monster passes
  behind it there, as in the first duel); it stays clear of the top
  bar and the cue bubble on a phone on its side and on a tablet. It hides under Book 2's pause cover; a tap while paused
  does nothing, and a tap between monsters waits for the next monster (also through a pause). After the run's hearts
  ran out or the visit ended, a tap does nothing.
- **The charge carries over between the tower's visits within a run** (a short visit is one wave, 5 hits: with a fresh
  charge each visit he would never get there). A new run starts with no charge; it is not saved. A charged visit plays
  the line again after its first hit, then the lightning shows.

## Part 4 — The main screen

All of this was mocked and the parent approved the mock ("LGTM").
- **Right to left throughout** (the parent: "Hebrew is RTL, and the mock should adhere"): pictures on the right, play
  buttons on the left pointing left, the path starts on the right.
- **The duel card** (a new, dedicated picture that replaces the old card's two wizards: the tower, for the first duel,
  with the wizard flying out of it on his broom, for Book 2; the parent picked take 3 of four) has three nikkud orbs and a big vector play button in its own column. The card starts the full adventure.
- **Under the card, a line for the parent:** "**מה לומדים:** לשמוע ולקרוא אותיות, ניקוד והברות, ואחר כך מילים; להבחין
  בין אותיות דומות; ואחרי הקריאה — לכתוב בדפוס ובכתב יד. המשחק מתאים את עצמו לילד."
- **The first station's picture is the tower** (the parent: a monster bubble didn't represent the first duel).
- **The path:** a dotted, zigzag, horizontally scrolling path of stations. Open stations come first and locked ones are
  greyed out with a lock (this overrides the rule "make a new minigame available from the start": the parent decided
  that minigames open over time). Each station shows its rating (see Part 3). The wizard stands at the newest open station. A station starts a
  single-minigame session. **Captions say only what is learned, never the minigame's name** (the parent). They are for
  the parent: smaller and fainter than the station picture.

  | Station | Picture | Caption |
  |---|---|---|
  | the first duel | the tower | ניקוד לפי צליל |
  | broom | an orb with בָּ | אותיות והברות לפי צליל |
  | ghosts | the ghost | אותיות דומות |
  | cauldron | the cauldron | בניית הברה |
  | ladder | the ladder | משפחות הברות, דגש |
  | doors | the door | קריאת מילים |
  | print drawing | א in print | אותיות דפוס |
  | handwriting drawing | א in handwriting | אותיות כתב יד |

- **A separator** (a thin gold line with a star) between the reading section and the clock.
- **The clock card,** in the same layout as the duel card, built from the clock game's own art: the workshop
  background, the cuckoo clock with a real face, the cuckoo on its roof and the happy bear. In the middle there are
  three small clock faces (3:00, 3:30, 3:15) and a brass play button. It has its own line: "**מה לומדים:** לקרוא שעון
  מחוגים: שעות שלמות, חצאים ורבעים, ואחר כך כל חמש דקות. בעברית ובאנגלית."
- **A separator, then "פעילויות נוספות":** the six old levels (letters, nikkud, syllables, words, sentences, stories)
  as one row of small round icons, with a lock on locked ones. The icons and the lock are redrawn as SVG (today they
  are emoji; rule: no emoji). My call, accepted with the mock: a shelf, not a
  collapsed section, because he can't read a "more" bar.
- **Fits a phone held upright** (the parent tested on a Galaxy S24) and sideways: the cards shrink, the path scrolls
  only sideways, and no vertical overflow.
- The settings button stays where it is.
- **The settings and stats buttons are redrawn as SVG** (the parent, 2026-11-12; rule: no emoji). The settings button
  is a drawn gear, and the stats link under the shelf has a drawn star, target and bar chart beside its text. They are
  in the shelf icons' ink, gold and cream, with the same size, place and actions as before.
- The old separate duel card and Book 2 card are replaced by the one duel card.

## Part 5 — Drawing in the game

The parent decided:
- **Drawing goes in.**
- **Writing comes after reading.**
- **Print and handwriting are separate minigames.**

The parent approved (2026-11-11):
- **"After reading" is the order, not a gate.** On the path the two drawing stations come last, after the doors. In a
  run, the two drawing screens come at the end of each cycle, after the doors. (Today one drawing screen comes after
  the ghosts and covers both styles.)
- **They open with stage 1,** when the first Book 2 minigames open after the first duel. A child who already has
  drawing (the parent turned it on) keeps it from the first day. Reason: drawing uses the first letter of a word, which
  he knows long before he reads words at the doors' level, and writing a letter's strokes helps him tell look-alike
  letters apart.
- **On by default,** now that the parent has reviewed the strokes. The parent setting stays, to turn it off.

## Details settled after the review (my calls)

- **Earlier specs superseded:** the flight-boss spec's "hearts refill at the start of the screen" and "potion at most once
  per broom visit"; its bonus coins stored as 30 stars (a boss now adds 3 coins to the balance); the end screen's coin
  ring ("how close the next coin is") and `info-coin-ring` are removed, since coins no longer come from stars.
- **Score and best:** the run's score is the stars of the run; "best" is the most stars in a run, as today. The first
  duel's points (combo, `bestScore`, `bestWave`) are retired; they stay in the parent report as history.
- **The end of a run:** the defeat scene, then Book 2's summary as today (the run's stars, his best, crystals, trophy,
  the next-boss teaser, without the coin ring), with the big play button for "again?". The first duel's own game-over
  screen (`RunSummary`) is not used in the run.
- **The hearts run out in the middle of a screen:** the answers already on the screen finish (rule), then the run ends.
- **The streak multiplier is shown:** a small ×2 / ×3 badge next to the star count in the top bar. It rises with a sound
  and a short voice line, in its own moment. It resets when a heart is lost (a forgiven near miss does not reset it). It
  carries across screens, the merchant and bosses. In path sessions it works the same way.
- **Path sessions:** no hearts in the top bar, and mistakes cost nothing but the streak. Stars and coins are earned as
  usual (coins come only from reading, so this is fine).
- **The merchant's timing:** "every other checkpoint" counts checkpoints since his last visit, and a declined visit counts
  as a visit. "Always before a boss" means: when the conditions hold (fewer than 3 hearts, enough coins), the checkpoint
  before a boss always has him. A screen that is skipped (a minigame he excels at) has no checkpoint of its own.
- **Prices:** the first price is about six right answers' coins without the multiplier. Each purchase ×1.5, rounded.
  Prices are capped at the number range's top (10, 100 or 1000).
- **Existing players and stage 0:** a player with a Book 2 save at stage 1 or above has stage 0 passed. The first duel
  opens for him as a station at once. Nothing he has goes back.
- **Drawing for the existing child turns on by itself** (the parent: no manual change). Saves carry an explicit
  `settings.drawing: false` today, so changing the default alone would not reach him: a one-time save migration sets it
  to `true` for every existing save. The parent can turn it off again in the settings.
- **The first duel's screen in a run:** one visit is two waves (10 monsters). Its boss comes every few cycles, in the
  run's boss rhythm. Its HUD (`DuelHud`: hearts, score, מגה meter) is replaced by Book 2's top bar.
- **The home screen and girls:** the card picture and the path's wizard follow the saved player (`shared/player`).
  Before the question has been asked, the boy is shown. The girl versions are needed for both.
- **The ✗ during the first-visit demo:** hidden while the demo plays; the demo counts as seen when it ends.
- **Info lines to re-record** (they state rules that change): `info-hearts` (hearts no longer come back on each
  screen), `info-coins` (coins no longer come from ten stars), and `potion-intro` (no flying potion). Boy and girl forms.

## Parent area

- **The number range** setting: up to 10, 100 or 1000. Default 100 (my call).
- **The drawing** setting stays.
- **The parent report** gains a money section: purchases, declines, tries that were not enough or too much, and hints.
  It also keeps the first duel's history.
- **Telemetry events** for all of these, like the rest of Book 2.

## Assets

Record each shipped asset's request in `asset-sources/` (CLAUDE.md).
- **Art:**
  - The merchant gnome poses (mock art exists; final takes and any missing pose, such as walking away, to be made
    and reviewed).
  - The duel card picture (take 3 chosen).
  - **The girl version of the card picture** (owed; the card budget left is about $0.90).
  - Spent so far, in the art ledger: the card, 4 images (~$0.60 of a $1.50 budget); the merchant mock, 4 images
    (~$0.60 of a $1 budget). Agree a budget with the parent before the final merchant art.
- **Voice:** the merchant's lines above, in boy and girl forms with variations, in a voice of their own, plus the two
  narrator lines. Review on the audio review page, as for the other games.
- **Sounds:** a coin clink, a counting chime, and the tag's flash.

## Left to the builder

- Whether the merged game lives in Book 2's app (my suggestion: yes, it is the newer architecture) or elsewhere, and
  where the home card's path state comes from.
- The exact unlock threshold, screen weights, price table and coin compositions. Tune them in a playtest.
- The defeat scene's details.
- How the first duel's screen fits the run's checkpoint and boss rhythm.

## Later (open, the parent parked them)

- **Change and checking change** (parked: "too complicated, let's keep it open, for later"). What was decided before it
  was parked, so it can be picked up again:
  - He may pay with bigger coins and get change (the parent's example: 2 × 20 + 50 = 90 for a price of 87).
  - The merchant sometimes gives too little (about 1 time in 3). The child must find out when that happened, or he
    learns nothing.
  - Caught: the merchant is ashamed and gives back the coin. Missed: the narrator shows it afterwards, and the coin is
    lost. A false accusation: the merchant counts in front of him, is insulted and leaves, the deal is off, and the coins
    come back (the parent: "a bit offended isn't good enough").
  - Rejected on the way: empty outlines for the missing coins ("it just tells the answer"), and a running total of the
    change.
- **Haggling** (dropped as unclear: its rules are invisible to the child). It was: a counter-offer for a reasonable
  offer, then "my last price"; an insultingly low offer → the merchant is insulted and the deal is off.
