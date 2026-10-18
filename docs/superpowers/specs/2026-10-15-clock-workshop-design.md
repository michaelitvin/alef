# Clockmaker's Workshop — Design

**Date:** 2026-10-15
**Status:** Brainstormed with Michael on 2026-10-14/15. He approved the structure and asked not to block on his review: build everything, fix what he rejects later. He reviews this spec in parallel with the implementation.
**Branch:** `feature/clock`
**Rules:** follow [docs/minigame-rules.md](../../minigame-rules.md). This spec lists only what is particular to this game.

## Overview

A game that teaches a 7-year-old boy to read an analogue clock, in Hebrew and English. He cannot read yet (he is learning, with alef). He reads digits and numbers. Today he knows o'clock and half past, and is learning the quarters. The game takes him to five-minute steps ("עֶשְׂרִים לְשֵׁשׁ", "twenty to six").

He is the clockmaker. Animal customers come into his workshop one by one, each with a broken clock. Some customers speak Hebrew and some speak English. Each customer is one exercise. When he answers correctly, the clock comes to life: it ticks, the cuckoo pops out, it chimes. The customer pays him a gear. The kinds of clock add variety (a new kind can come once its level is reached); they are not a collection. The game is calm and cosy, with no time limit and no lives. It must not feel like the duel, which is fast and has monsters.

## Decisions

| Topic | Decision |
|---|---|
| App | A **separate app in the alef repo**: a second Vite entry `clock/index.html`, built to `dist/clock/`, deployed with alef at `/alef/clock/`. A card on alef's Home opens it; an SVG home button goes back |
| Range | Levels go up to five-minute steps (level D in the brainstorm). Seconds are not read in v1 |
| Languages | Hebrew and English. Each round has one language (its customer's language). Rounds alternate. A parent setting selects the languages (at least one) |
| Story | Clockmaker's Workshop: customers who each ask for the round's task, clocks that come alive, gears. No tower (parent 2026-10-16: it had no place in the story) and no clock collection (parent 2026-10-17: the kinds were not special, so collecting them did not matter) |
| Exercises | 1 Find the clock · 2 What time is it (narrated answers) · 3 Set the clock (drag or draw the hands) · 4 Clock ↔ digital |
| Difficulty | Each round aims at a predicted mistake rate of 1 in 5. Wrong answers become more tricky as he improves (trick families below) |
| Start | Level 1, with **fast-forward**: 5 correct in a row on a level's new times pass the level (Michael chose this over a placement test) |
| Levels | 7 levels (below). The parent can reset |
| Captions | Read-along: spoken text shows as a caption, and each word glows when it is spoken. Hebrew alternates **print with nikkud** (Sigalit) and **cursive** (Dana Yad) round by round. English alternates **all small with no capital** ("half past three") and **ALL CAPS** ("HALF PAST THREE"). Both mixes are settings, on by default. No English cursive |
| Seconds hand | A thin ticking seconds hand from level 5 on some clocks, as realism and as a trap (read as the minute hand). The bonus game shows what it does |
| Scaffolds | Numbers on the face, a light past/to slice, and an outer minute ring (5, 10, 15…). They fade as levels advance |
| Explanations | Explain each new element when it first appears, and again after a repeated mistake (rule in minigame-rules.md) |
| Audio | ElevenLabs, 1 take per item, automatic speech-to-text and length checks, generated progressively. Michael reviews a sample of each pattern and every flagged take. A full review is an option |
| Review | Not blocking: the game uses generated takes at once. Rejected takes are replaced later |
| Budget | Images up to $10 (Gemini). Voice, music and effects within the ElevenLabs plan credits. Stop and ask if either looks like running out |
| Devices | Android tablet in landscape (main), phone in portrait |

## Levels

| Level | New times | Example |
|---|---|---|
| 1 | o'clock (:00) | שָׁלוֹשׁ · three o'clock |
| 2 | half past (:30) | שָׁלוֹשׁ וָחֵצִי · half past three |
| 3 | quarter past (:15) | שָׁלוֹשׁ וָרֶבַע · quarter past three |
| 4 | quarter to (:45) | רֶבַע לְאַרְבַּע · quarter to four |
| 5 | five-minute steps, past side (:05 :10 :20 :25) | שָׁלוֹשׁ וְעֶשְׂרִים · twenty past three |
| 6 | five-minute steps, to side (:35 :40 :50 :55) | עֲשָׂרָה לְאַרְבַּע · ten to four |
| 7 | all of them, on faces with no numbers | — |

**Passing a level:** fast-forward (the first 5 rounds on the level's new times all correct), or 80% correct over the last 10 rounds on the new times, with at least 10 such rounds. When he passes, the tower builds a floor at once, with its own celebration, and the next customer brings the next level's clock kind.

**Mix:** about 70% of rounds use the current level's new times and 30% use earlier levels' times, adjusted by the predictor. After level 7, the game stays in level 7 (all times, predictor-driven).

**Reset:** the parent can reset all clock progress. It does not touch alef's progress.

## Phrases

One phrase per time per language, and a second form for :40. The narrator speaks every phrase. Hours use the Hebrew feminine numbers.

| Minutes | Hebrew (3:mm) | English |
|---|---|---|
| :00 | שָׁלוֹשׁ | three o'clock |
| :05 | שָׁלוֹשׁ וַחֲמִשָּׁה | five past three |
| :10 | שָׁלוֹשׁ וַעֲשָׂרָה | ten past three |
| :15 | שָׁלוֹשׁ וָרֶבַע | quarter past three |
| :20 | שָׁלוֹשׁ וְעֶשְׂרִים | twenty past three |
| :25 | שָׁלוֹשׁ עֶשְׂרִים וְחָמֵשׁ | twenty-five past three |
| :30 | שָׁלוֹשׁ וָחֵצִי | half past three |
| :35 | שָׁלוֹשׁ שְׁלוֹשִׁים וְחָמֵשׁ | three thirty-five |
| :40 | עֶשְׂרִים לְאַרְבַּע, or שָׁלוֹשׁ אַרְבָּעִים | twenty to four, or three forty |
| :45 | רֶבַע לְאַרְבַּע | quarter to four |
| :50 | עֲשָׂרָה לְאַרְבַּע | ten to four |
| :55 | חֲמִשָּׁה לְאַרְבַּע | five to four |

- The "to" forms use the next hour (12:45 → רֶבַע לְאַחַת, quarter to one).
- The prefix לְ takes the correct vowel for each hour (לִשְׁתַּיִם, לִשְׁמוֹנֶה, לִשְׁתֵּים־עֶשְׂרֵה). Check every spelling in a dictionary before generating, as the rules say.
- :35 is read as on a digital clock, and :40 has that form too (parent review 2026-10-16: nobody says עֶשְׂרִים וְחָמֵשׁ לְשֶׁבַע; "twenty-five to eight" sounds unnatural too). Each round picks one :40 form at random; its question, answer cards, replay and feedback all use it.
- 12 hours × 12 times = 144 phrases per language, plus 12 digital :40 forms: 312 in all.
- The caption text and the spoken text can differ, as the pronunciation rules allow. The caption always shows the correct spelling.

## Exercises

All exercises show the customer's clock kind. The shapes on the clock (hands, numbers, ticks) are SVG, so that they are crisp and interactive. The clock kind gives the case and decoration around the face (an image).

**The question (playtest 2026-10-15):** every round starts with a short narrator question for its exercise, with no caption: Find the clock "Which clock shows…" + the phrase; What time is it "What time does the clock show?" + the answers; Set the clock "Set the clock to…" + the phrase; Clock → digital "Which digital clock shows the same time?"; Digital → clock "Set the clock to the same time." The first-time explanation of Find and What asks it already, so that round has no second question. The real-time round asks "What time is it now?".

### 1 · Find the clock

The narrator says the time. The caption shows it, read-along. Three clocks of the same kind stand on the workbench shelf. He taps one. He can tap the caption to hear it again.

### 2 · What time is it?

One big clock. Three answer cards, each with the phrase as a caption and a speaker button. The narrator reads the three cards in order. Each card glows while it is spoken, and its words light up. Taps on the cards do not count while the narration plays (rule). After that, a tap on a card body chooses it. A tap on a card's speaker button reads that card again.

### 3 · Set the clock

The narrator says the time (caption read-along), or, in the digital variant, a digital time card shows it. The face shows the hands at a neutral start. He sets the hand or hands, then taps the big check button (SVG, no text).

**Hand interface (must be obvious for him):**
- The hand to move pulses on the face. When both hands are needed, two large hand buttons under the face show the two hands as pictures (the short thick hand and the long thin hand, in their face colors), to switch hand; with one movable hand there is no hand button (parent 2026-10-16).
- A finger anywhere on the face makes the active hand point at the finger. It follows while the finger moves. This works for both meanings of "draw": a drag, and a stroke drawn out from the centre.
- When he lifts his finger, the long hand snaps to the nearest five-minute mark. The short hand moves an hour at a time, only to the place that belongs with the long hand, with a click per step (parent 2026-10-16: free short-hand moves made impossible states).
- When both hands are needed, the short hand is active first. After he lifts his finger, the long hand becomes active. A tap on a hand button makes that hand active.
- The first time he meets this exercise, an animated finger shows the gesture while the narrator explains.

**Variants by level:**
- Level 1: only the short hand (the long hand stays on 12).
- Level 2: only the long hand, with **linked hands**: the short hand creeps as the long hand moves, as in a real clock. The short hand starts on the correct hour.
- Levels 3–4: both hands, linked. He sets the hour and then the minutes, and the short hand creeps.
- Levels 5–7: both hands, linked like levels 3–4 (parent 2026-10-16: no impossible states). He chooses the hour; the short hand's place between the numbers comes from the long hand.

**Grading:** the long hand must be on the exact five-minute mark. The short hand must be within ±12° of its true angle ((h mod 12 + m/60) × 30°). At half past, a short hand exactly on a number is 15° off and fails. At quarter to, a short hand on the next number passes.

### 4 · Clock ↔ digital

- **Clock → digital:** one big clock and three digital time cards ("3:45", 12-hour, no AM/PM). He taps one. There is no speech before he answers, so the round works in any language. After the answer, the narrator says the phrase in the round's language.
- **Digital → clock:** the Set the clock exercise with a digital card instead of speech.

## Trick families (wrong answers)

From easiest to hardest. Each family has a base difficulty. Each round chooses the families that bring the predicted mistake rate nearest to 1 in 5.

1. **Far:** a clearly different time.
2. **Hour ±1:** the right minutes, the hour off by one.
3. **Past/to mirror:** quarter past ↔ quarter to, twenty past ↔ twenty to (same hour word).
4. **Swapped hands:** 3:00 ↔ 12:15.
5. **Hour not advanced:** the short hand drawn exactly on the hour number when it should have moved on (3:45 with the short hand on 3), or the "to" phrase with the wrong hour (רֶבַע לְשָׁלוֹשׁ for 3:45).
6. **Number as minutes:** the long hand on the 4 read as "four past" instead of "twenty past". On choice exercises, this is the clock whose long hand is on the number in the phrase.
7. **Five off:** five minutes before or after.
8. **Seconds trap** (level 5 and up, only on clocks with a seconds hand): the seconds hand is placed where the minute hand would be for a wrong answer.

A wrong answer uses only minutes that his levels cover (playtest 2026-10-15: "ten to eleven" on level 1). Exception: on Find the clock, a clock whose hands imitate a misreading (swapped hands, hour not advanced, seconds trap) may read as another time. A family may only make an answer that differs from the right one and from the other options. A family that cannot apply (for example, "half past" has no past/to mirror) is skipped.

**Set the clock error classes** (graded from what he set, for telemetry and explanations): swapped hands, hour not advanced, past/to mirror, number as minutes, five off, hour ±1, other.

**Near miss:** in Set the clock, five off is forgiven one time per round. The narrator says "כִּמְעַט" or "almost", and he tries again. It is tracked separately and does not count as correct.

## Round choice (difficulty)

The duel's predictor (recent answers weighted most, blended with the lifetime rate, aiming at 1 in 5) moves to `src/shared/` and is used here per feature:

- Features: the minute kind (:00, :15 …), the exercise and variant, each trick family, the scaffold state (numbers or none, slice or none, ring or none), and the seconds hand.
- For each round, generate about 20 candidate rounds from the level mix. Predict each candidate's mistake rate by combining its features' rates (noisy-or over the features' predicted rates, each feature with a prior from its base difficulty). Choose by the duel's bell-shaped weight around 1 in 5; if no candidate is that hard, choose the hardest.
- Confusions are recorded by direction (the right time, the time he chose). A confused time comes back as a wrong answer when its pair is asked.
- **Scaffolds:** numbers show on levels 1–6. On level 6 they start to drop (round by round, by the predictor). Level 7 has none. The past/to slice shows on levels 3–6 and drops as he masters each time kind. The minute ring shows on levels 5–6 and drops in level 7.

## Explanations

A short narrated animation, in the round's language. Each one plays once at first appearance, and again after a repeated mistake.

| Trigger | Explanation |
|---|---|
| First round ever | The two hands: the short hand shows the hour, the long hand shows the minutes. Each hand glows as it is named |
| New level | That level's idea: half past (the long hand goes half way round, half the face fills), quarter past (a quarter fills on the right), quarter to (a quarter left before the next hour, on the left), fives (the long hand counts 5, 10, 15 around the ring), fives to |
| First time of each exercise | How to answer it (Set the clock: the animated finger) |
| First digital card | The digital clock shows the same time in numbers |
| First seconds hand | The thin fast hand counts seconds; for the time, look at the other two |
| First face with no numbers | The places of 12, 3, 6, 9 glow |
| Same mistake 2 times in the last 8 rounds | The explanation for that trick or error class (swapped hands → the short hand is the hour; hour not advanced → the short hand moves on towards the next number; mirror → past is on the right, to is on the left; number as minutes → count by fives) |

After a repeat explanation, that explanation waits at least 10 rounds before it can repeat. Then feedback goes back to short.

## Feedback

- **Correct:** the clock comes alive: it ticks, plays its kind's sound (cuckoo, alarm bell, chime, tower bong), and its hands turn a little. A gear flies to the gear counter. The customer is happy, says thank you in its language (short, and not every time), and leaves with the clock. After a confident answer (fast and correct), skip the phrase. Otherwise the narrator says the phrase once more as the hands glow.
- **Wrong:** a soft "boing". The chosen answer wobbles and the correct one glows. In Set the clock, the hands glide to the correct position. The narrator says the correct phrase, read-along. The customer still gets its clock, but no gear is paid.
- **Streak:** every 5 correct in a row, the shop's clocks chime together. 10 in a row gets a bigger moment (voice + effect).
- No lives, no clock, no failure screen.

## Workday, rewards and bonus

- **Workday:** 8 customers. Then the bonus game, then a short day summary: gears earned (digits are allowed) and the clocks fixed today. A big play button starts another day.
- **The real time:** on his first workday each day, the first customer asks "what time is it now?". The clock shows the device's real time, rounded to the nearest five minutes, as a What time is it round. Only when the rounded time is a time his levels cover; else skip this for the day.
- **Clock kinds**, one new kind per level (variety, not announced): 1 wall clock and alarm clock, 2 cuckoo clock, 3 pocket watch, 4 grandfather clock, 5 station clock (with seconds hand), 6 wristwatch, 7 golden tower clock. Customers bring any kind that he has unlocked.
- **Gears:** the counter at the top right is a heap of gold gears in a wooden tray, with the count (parent 2026-10-17: a single gear looked like a settings button).
- **Level passed:** a cheer over the solved question: a burst of rays, a fanfare, and "you learned something new". At level 7 he also hears "now you are a real clockmaker" and the clocks chime.
- **Languages:** a workday is one block per enabled language, Hebrew first (4 Hebrew customers, then 4 English), not a switch every round (parent 2026-10-16).
- **Bonus game, "stop on the 12":** a big clock whose seconds hand sweeps round (one turn in about 3 s). Its long and short hands start at the time now and move with the sweep, a minute per turn, so the clock is never in an impossible state. He taps to stop it, three tries. Gears by closeness: on the 12 = 3 gears, within 2 seconds = 2, within 5 seconds = 1, else none but a friendly sound. No failure.
- **Achievements he can say:** the number of clocks fixed, the gears, the clock kinds.

## Characters and voices

- **Narrator:** the workshop's cuckoo bird, who lives in the big cuckoo clock on the workshop wall. It speaks all instructions, explanations, phrases, answers and feedback, in both languages. Voice: Will (eleven_v4), language code per line ("he" or "en"). One voice for both languages keeps the role clear.
- **Customers:** 8 animals, 4 speak Hebrew and 4 speak English (for example: hedgehog, cat, bear and turtle in Hebrew; owl, fox, rabbit and penguin in English). Each speaks short lines in its language with its own premade voice: a request as it comes in, which matches the round's task, and sometimes thank you. Set: "my clock is broken" (5 variations). What time is it: "what time does my clock show?" (3; the narrator does not ask again). Find: "I came to pick up my clock" (2). Clock to digital: "which digital clock shows the same as my clock?" (2; no narrator question). Digital to clock: "set my clock like my digital clock" (2). The real time: "excuse me, what time is it now?". Never the same variation twice in a row (parent 2026-10-16: the hello had no connection to the question). Customers never speak the time, so the 288 phrases stay with one voice.
- **Customer names:** none. The child names them himself.

## Screens and layout

- **Workshop (main screen):** the workbench with the customer's clock, the customer at the door side, and the gear counter. Landscape: the customer beside the bench. Portrait: the customer under it. The fixed clocks are not on this screen (parent 2026-10-16: unexplained, they looked like animals staring at them); they have their own moments:
  - **Level passed:** the solved question stays on the bench, with the burst and the level-up lines.
  - **Day summary:** the clocks he fixed today hang in a row (no numbers).
  - **Start screen:** the cuckoo clock, the play button and two waiting customers.
- **Captions** sit next to the clock (above or below, whichever fits), smaller and fainter than the clock (rule: the learning content is the strongest element). The caption's direction follows its language. A caption shows only from the moment its voice starts to read it: the prompt caption appears with the prompt, and the What time is it cards appear one by one as the narrator reads them. Nothing is written while a customer speaks or a line with no caption plays. The words glow from the audio's playback position, mapped from the spoken words onto the caption words (playtest 2026-10-15).
- **Phones:** the answer cards get smaller (at least 64 px tall) and the main clock's case is cut off around the face, so the clock face stays clearly larger than any card in portrait and on its side (playtest 2026-10-15: the clock was much smaller than the answers).
- **Home cover:** the big cuckoo clock showing the time now, a big play button between two waiting customers (one from each language, both looking at the button). Pause cover on tablet lock (rule), with an opaque workshop door.
- **Parent area:** a 2-second press on a small gear icon opens it (text is allowed for the parent). It holds the languages, the cursive and capitals mixes, sound, music and volume, reset, telemetry export and the stats.
- No emoji. All icons are SVG.

## Art

- Style: warm, cosy wooden workshop with brass and lamplight. It is far from the duel's purple night sky. Make 3 concepts, choose one without waiting (Michael asked not to block), and record the choice. Michael can change it later.
- A style sheet from the chosen concept is the reference image for every image (rule).
- Images: workshop background, cuckoo narrator (idle, speak, pop), 8 customers (idle, happy), 8 clock-kind cases (face area empty, so the SVG face shows), 7 tower stages, bonus game clock case, gear. About 35–45 images, ≤ $10.
- Faces, hands, numbers, ticks, slices, rings and digital cards are SVG.
- Check: no shape that looks like a nikkud mark near the captions (rule).

## Audio

| Group | Count (approx.) | Notes |
|---|---|---|
| Phrases | 288 | Narrator, one per time per language |
| Narrator lines | ~45 per language | Explanations, first-time instructions, almost, cheers (3, rotated), level up, new clock kind, streak, bonus intro, day end, "what time is it now?" |
| Customer lines | 16 | 2 per customer |
| Effects | ~15 | Tick, chimes, cuckoo, alarm bell, tower bong, gear, boing, check, door bell, hand snap |
| Music | 4 | Calm workshop tracks, about 75 s, rotated by workday. Ducked under speech |

- **Word timing** for the read-along: ElevenLabs text-to-speech with timestamps (character alignment, grouped into words). If the key does not allow it, estimate the timings from the text and the measured length.
- **Automatic check:** speech-to-text of each take (ElevenLabs Scribe if the key allows it, else a local Whisper), compared with the text after normalisation, plus length and voiced-burst measurements. Flag mismatches for Michael.
- **Progressive order:** levels 1–2 phrases (48) and the core narrator lines first; then levels 3–4; then the fives. Customers and effects with the first batch. Parallel requests within the rate limits.
- Speech plays at 1.15× with the pitch kept, with the silence trimmed (shared code from the duel).

## Review page

- Host-local, like the duel's: pipeline in `/data/ws/scratch/clock/`, a small review server, a Caddy route with its own realm and username. The repo never names the host, route or password.
- Built with the frontend-design skill. Large buttons. **Play all:** plays the items of a section in a row with no click; Michael clicks only to stop, replay or reject (with an optional note).
- Each item shows its context: the SVG clock at that time for a phrase, the customer picture for a customer line, the clock kind for its sound. Each item says where it plays in the game.
- Default view: a sample of each pattern plus every flagged take. A "full review" view lists everything.
- Picks and rejects save to `choices.json`. A rejected take gets a new take; the current take stays first. A sync script copies the approved and pending takes into `src/clock/assets/`.
- Chosen-take requests go to `asset-sources/clock/`.

## Code structure

- `clock/index.html` → `src/clock/main.tsx`. Vite `build.rollupOptions.input` has both entries.
- `src/clock/`: app, screens, components, store, logic, assets. Alef does not import from it, except the Home card component link.
- `src/shared/`: speech playback, the predictor, telemetry, moved from the duel only where the clock game uses them. The duel's tests must still pass.
- **Logic modules (pure, unit-tested):** `time.ts` (time model, angles), `phrases.ts` (phrase id, caption text and audio id per language), `tricks.ts` (trick families → wrong answers), `grade.ts` (hand grading, error classes), `rounds.ts` (candidates, prediction, choice, scaffolds), `levels.ts` (mastery, fast-forward, explanation triggers), `workday.ts` (customers, bonus, real-time round).
- **Store:** Zustand persist key `alef-clock`: level, per-feature tallies and recent answers, confusions, gears, explanations seen, settings. Telemetry key `alef-clock-telemetry` (size-limited).

## Parent tracking

Record each round: exercise and variant, language, time, level, clock kind, scaffolds, seconds hand, options and their positions, trick families, answer, set-hand angles, error class, correct or wrong or near miss, time to answer, caption script (print, cursive, small, caps), clock time, assets used. Also explanations, level-ups, bonus results, workdays, abandons (pagehide) and settings changes. Export from the parent area. An analysis script in `/data/ws/scratch/clock/telemetry/`.

## Testing and verification

- Unit tests for every logic module (phrases for all 144 times in both languages, trick validity, grading angles, mastery and fast-forward, predictor choice).
- Component tests for the exercises and the hand interface (pointer events).
- A headless check (system browser, like the duel's verify script) that plays a full workday, finds Latin or Hebrew text on child screens outside captions, and checks every audio id has a file.
- Before handing a build to Michael: play it to the end and listen to all audio (rule).
- Playtest build on the Jetson behind its own Caddy route. Merge to main and push only when Michael asks.

## Judgement calls (made without Michael)

| Call | Why |
|---|---|
| O'clock in Hebrew is the hour alone ("שָׁלוֹשׁ"), not "שָׁלוֹשׁ בְּדִיּוּק" | It is how people answer "מה השעה?" |
| :25 is "שָׁלוֹשׁ עֶשְׂרִים וְחָמֵשׁ" and :35 is "עֶשְׂרִים וְחָמֵשׁ לְאַרְבַּע" | The common spoken forms |
| English uses "quarter past", without "a" | Short and parallel to the Hebrew |
| Customers do not speak the time | Keeps the 288 phrases in one voice, and the customer lines few |
| The narrator is a cuckoo bird | It belongs in a clock workshop and is a single, clear role |
| No lives and no time limit | Calm game, distinct from the duel. Drawing tasks must not have a clock (rule) |
| Near miss only for five off in Set the clock | It is the closest miss with a clear fix |
| Linked hands on every level | Shows why the short hand moves between the numbers, and no pose is impossible (parent 2026-10-16) |
| Workday of 8 customers | A short, complete session with an end and a reward |
| Art style chosen without waiting | Michael asked not to block |

## Playtest changes 2026-10-17

- **Answer options:** no clock with the short hand still on the hour number (an impossible clock, and nearly the same as
  the right one); a swapped-hands option shows the misread time with its hands where they belong.
- **Set the clock:** a speaker button beside the time (Digital to clock: beside the card; it says the question, not the
  time). The short-hand and long-hand buttons stay (the child wanted them; a "nearest hand moves" version was reverted);
  the short hand never starts under the long hand.
- **After a mistake:** the right answer stays (right and wrong marked, with the hint) until he taps the next button; the
  explanation of that mistake plays on its first time and then at most every 6 rounds.
- **Hints:** the quarters hint (:15, :30, :45) or the minutes hint (other five-minute times), none on the hour. It shows
  by itself in his first 6 rounds with it, then behind a light-bulb button under the gear counter.
- **Explanations wait:** an explanation stays on the screen when it ends, with a speaker that plays it again, until he
  taps next. After a mistake: first the right answer (until next), then the mistake's explanation when it is due.
- **Speakers:** every caption that plays on a tap has a speaker beside it (Find the clock's time, Set the clock's time,
  the explanations, the What time is it cards).
- **Hint button:** in the top bar, beside the gear counter (under it, it covered the question).
