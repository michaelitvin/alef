# Wizard Duel, Book 2 — Letters and Syllables — Design

**Date:** 2026-10-19
**Status:** Draft for Michael's review. Michael decided the three open choices on 2026-10-19 (hearts refill per screen, a new $10 image budget, the crystal moment only).
**Game:** a new minigame next to the Nikkud Wizard Duel (which stays as it is). Working name "Book 2"; a separate app at `duel2/`, like the clock game (plan's call; rename freely). **Available from the start** on Home, not locked behind the duel or levels (rule).
**Mockups:** five screen mockups (painted pieces in the duel's art style, glyphs placed by code) were shown to Michael on 2026-10-19 and accepted as the direction. They live host-local, outside the repo.

## Intent

The player is Michael's son, about 7. He cannot read words yet. He knows most letters and most nikkud marks, but sometimes forgets a letter or mixes two letters up; nobody knows yet which pairs. He reads a syllable in **two steps**: he names the letter, then the vowel, then blends them. Blending is not one step for him yet.

Book 2 is the next volume in a series of books: the duel taught the marks alone; Book 2 teaches **letters** and **letter + vowel syllables**. Success looks like:

- He blends a syllable faster, until seeing בָּ gives "ba" in one step.
- His letter mix-ups go away. The game finds the pairs he mixes up and drills those.
- He reads his first two-syllable words.
- He wants to keep playing. **The challenge itself is what keeps him engaged** (Michael), not a story.

## Goals, non-goals, anti-goals

**Goals**
- Five screens that each drill a different step of reading a syllable (see *Screens*).
- Runs that string the screens together, get faster, and reach every screen regularly.
- Adaptive content: the 1-in-5 predicted mistake rule, recorded confusions, and his real mix-ups on the look-alike screen.
- A parent screen gallery to start any screen and stage directly, for review.
- Telemetry the parent can export, as in the duel and the clock.

**Non-goals**
- A story. Keep it minimal and abstract (Michael): no characters to talk to, no plot, no library or quest. Build the screens as separate parts so that one story can wrap them later without a rebuild.
- Final letter forms (ך ם ן ף ץ) as content: they do not start a syllable.
- Shva syllables (בְּ alone is not a syllable he blends) and chataf vowels.
- Voice input (saying the syllable aloud).
- Replacing or changing the duel. Book 2 keeps its own saved data; it does not read the duel's stats (my call: the duel measures marks alone, a different skill).

**Anti-goals** (a failure even if it works)
- **Any element that he does not act on.** "Don't add elements to the game that are not directly related to something that he needs to do" (Michael). Every thing on a screen is a target, a choice, the player, or the feedback.
- Written instructions or feedback (he cannot read; see `docs/minigame-rules.md`).
- A slow game: long waits between rounds, feedback that takes longer than the task.
- Letters or marks that look like Latin letters or punctuation (in the mockup, יִ in one font looked like "!").
- Half the game that he never reaches because runs end early (see *Run*).

## Rules

`docs/minigame-rules.md` applies in full. The rules that shape this design most are quoted where they apply. Two rules change meaning for this game (Michael, 2026-10-19):

- "Show a learning mark on a neutral placeholder, not on a carrier letter" applies to the duel. In Book 2 the letter carries the mark: that is the content. A mark shown **alone** (the cauldron's vowel orbs) still sits on a dotted placeholder.
- "Make wrong answers clearly different from the right one" does not apply to the letter or the vowel in a choice: here the small difference **is** the skill (the ladder and the look-alike ghosts put look-alikes side by side on purpose). It still applies to everything else.

## Content

**Letters:** the 22 letters. No final forms.

**Sound forms:** the dot changes the sound of four letters. Each form is its own item:

| Letter | Forms |
|---|---|
| ב | בּ "b" · ב "v" |
| כ | כּ "k" · כ "ch" |
| פ | פּ "p" · פ "f" |
| ש | שׁ "sh" · שׂ "s" |

That makes 26 consonant items. Dagesh in other letters does not change the sound, so the game shows it only on בּ כּ פּ (plan's call: "the dot changes the sound" stays clean).

**Vowels:** five sound groups, as in the duel: a (kamatz, patach), e (tsere, segol), i (chirik), o (cholam, cholam male), u (kubutz, shuruk). Marks that sound the same count as one sound. **A choice holds at most one mark per sound group**; which mark of the group appears rotates between rounds, so he sees both. (So there is no "twin mark" trap in Book 2; the duel already drills that.) Cholam male and shuruk include their vav: on a letter they show as בּוֹ / בּוּ; alone, on a cauldron orb, as the vav with its mark next to the dotted placeholder, so that the shuruk dot never shows alone (alone it looks like a dagesh).

**Syllables:** consonant item × vowel group, about 130. Silent letters (א, ע) + vowel sound like the vowel alone; they are valid items.

**Same-sound letters:** some syllables sound the same with two spellings: וָ/בָ "va", תָּ/טָ "ta", כּ/ק "ka", כ/ח "cha", ס/שׂ "sa", א/ע "a". On every screen where he **hears** the target, a choice never contains two items that sound the same (my call; the conversation also accepted "both count", but never offering both is simpler and teaches nothing wrong).

**Stages** (content kinds, opened in order; an opened stage stays in the mix):
1. **Letters**: letter shapes, cued by the letter's name. The sound forms by their names (בֵּית / וֵית, כַּף / כָף, פֵּא / פֵא, שִׁין / שִׂין).
2. **Syllables, plain**: all consonant items except the soft forms ב כ פ (no dot) and שׂ.
3. **Syllables, the dot changes the sound**: adds ב כ פ (no dot) and שׂ, and the dot contrasts (בָּ / בָ).
4. **Words**: two-syllable words on the doors (see *§5*). Opens when every syllable of at least 6 door words (builder: tune) is at or under the 1-in-5 predicted mistake rate.

A stage opens when the predicted mistake rate over the previous stage is at or under 1 in 5 (builder: tune; the clock game's level-pass rule is a model). **Wrong answers and ghost groups use only items of opened stages** (rule: wrong answers only from content he learned). The parent gallery can start any stage.

**Which screens run at which stage** (my call): at stage 1 the cycle has the broom flight (letter flight) and the ghosts (letter ghosts); the cauldron and the ladder join at stage 2; the door corridor and the crystal join at stage 4. Before stage 4 a cycle ends after the ghosts with a short celebration. He knows most letters, so stage 1 should be short.

**Predicted mistake rate — the unit** (my call): keep a rate for each **letter part** (26) and each **vowel group** (5), and for each syllable. A syllable's predicted rate combines its own history with its letter's and its vowel's rates, weighted towards its own history as answers accumulate (so 130 items do not need 130 separate histories before the model works). Letter-name answers at stage 1 feed the letter parts. All screens feed the same rates; telemetry keeps each screen type apart. The shared predictor in `src/shared/adaptive.ts` (moved from the duel for the clock) is the base.

**Confusions:** recorded by direction (asked → tapped), for letters and for vowels separately. The ladder tells them apart, because only one part changes there.

**Introducing the dotted letters:** the first time a pair comes up, **both letters stand side by side from the start** (rule: in a comparison, show both). ב glows while "va" plays; then בּ glows, its dot drops in with a click, and "ba" plays. The same for כ/כּ, פ/פּ, and שׁ/שׂ. The explanation stays on the screen, with a replay speaker, until he taps next (rule). Then the round's question.

## Run

A run uses the duel's frame: **3 hearts**, it gets faster, it ends at 0 hearts with a summary. The screens come in a fixed cycle, so every screen comes up regularly (rule):

**broom flight → cauldron → ladder → look-alike ghosts → door corridor → crystal**, then again, a little faster.

**Hearts and run length** (Michael, 2026-10-19): at the 1-in-5 target, 3 hearts last about 15 answers, and one cycle has about 25. So **the hearts refill when a new screen starts**, and **a new run starts at the screen after the one where the last run ended**. He reaches every screen, and a good run goes on for many cycles. The run ends when the hearts run out inside one screen.

**Visit lengths** (my guess; tune in playtest): broom flight 10 waves, cauldron 4 rounds, ladder 5 rungs, ghosts 4 rounds, door corridor 3 doors. About 25 answers per cycle.

**Time pressure only in the broom flight** (rule: do not use a clock for slow tasks). The cauldron, ladder, ghosts and doors have no timer and no time-out. "Faster" means the broom speed (the duel's hidden adaptive pace) and shorter feedback after confident answers on the other screens.

**Each round:**
- **The question first**, a short line in rotated variations, before the content: every round, not only every screen (rule). After a demo or an explanation, the question plays again before the answers (rule; clock lesson). After a celebration (ladder top, crystal), the old round never comes back on the screen (rule).
- **Lines never contain the learning sound** (rule: record a word alone, no carrier phrase). A question line plays, then a pause of about 0.8 s, then the separate syllable or letter-name file.
- **No answer taps while an instruction plays**; a tap during the cue itself is accepted and stops it (rules).
- **Audio never overlaps** (rule): speech, arrival sounds and announcements queue.

**Right answer:** the syllable (or letter name) is spoken, short. After a confident correct answer, shorter still (rule). In one encounter the same feedback does not repeat many times (rule): in a flight, the syllable is spoken on the first catch of a target, later catches of the same target get the catch sound.

**Mistake:** costs a heart, except a near miss.
- **Near miss**, forgiven one time per round: tapping the other form of a dotted letter (ב for בּ). No heart; the voice says "כִּמְעַט" (in variations), and the dot glows on the right answer, outside the ink so it never covers a mark (rule). Tracked separately.
- **After a mistake the game does not go on by itself** (rule, clock lesson): the right answer stays, marked, with the wrong one marked, until he taps next. This includes the broom flight: the flight stops.
- **Explanation**, after he has looked at the right answer: from time to time, and always after the same mistake several times, the voice splits the syllable into his two steps: the letter's name, the vowel's name, then the syllable (בֵּית · חִירִיק · בִּי), each part glowing as it is spoken. It is built from the approved letter-name, vowel-name and syllable files with 0.7–0.9 s pauses, not recorded as one line. It stays on the screen with a replay speaker until he taps next (rule). Then back to short feedback.

**Hints** (rule: hints that fit the question): the hint is the two steps: the letter glows and its name plays, then the vowel glows and its name plays. It shows by itself in his first rounds on a screen and stage, then behind a hint button in the top bar, and again on the right answer after a mistake. On the doors the hint shows the syllables one at a time, slower, without saying them (the door is the reading screen).

**The word link** (Michael): sometimes, after a right answer, a word that starts with the syllable appears with its picture, and the voice says it (בָּ → בָּנָנָה). Only for syllables that have a good picture word (one obvious name; the first vowel sounds as written: rules), at most about 1 in 4 right answers, never twice in a row, and it does not add a pause: it plays while the next round gets ready. The written word may show with the syllable highlighted while the voice says it (the caption exception), highlighted right to left.

**Brisk pace** (rule): between the answer and the next question, no fixed pause longer than about 350 ms; animations (a rung flying in, a key turning, a door opening, the camera zoom) play together with the feedback, and the next question starts during the zoom.

**Celebrations** (rule: celebrate big wins and streaks): a streak, the ladder top, a door opening, the crystal, a new best each get a voice line (in variations) and an effect. The run-end line neither praises a loss nor sounds disappointed (rule).

**Summary:** the crystals won this run, a best. No numbers in voice lines that the logic can change (rule).

**Pause:** on the tablet lock or an app switch, everything stops (music too), an opaque cover hides the game; after the pause the same round continues (rule).

## Screens

All screens: landscape tablet first, the player on the **left**, things come from the **right** (the duel's layout); sprites face the way they move (rule): the wizard on the broom faces right, the ghosts face left towards the wizard. The **top bar** holds the hearts, the cue's replay speaker, the hint button and (after a mistake) next; no floating button over the content (rule; check at phone size). Every speaking thing shows a speaker (rule), except the door's word, which must not speak. No voice caption on the screen; the mockups had one for the parent only (Michael). Everything the child taps responds on finger-down, with a large tap area and a bounce (rule); moving items have hit areas larger than their drawing. **The glyph is the strongest element on every screen, at every size**: larger than the wizard, the ghost, the key's picture (rule).

**Demo round:** the first time he meets a screen (and the first time he meets a new stage of it), one round plays by itself: the voice explains while a hand that he recognizes as a hand does the gesture, and the object moves with it (rule). It ends on a still screen with a replay speaker and next (rule). Then the round's question, and he plays.

### 1 · Broom flight — hear, catch the one he hears

- The wizard sits astride a broom on the left, in one of **3 lanes**. He drags the wizard up or down, or taps a lane. The wizard is small: about half a lane high, so dodging is clear (Michael).
- Items fly in from the right in **waves of 3**, one per lane. Each wave holds exactly **one target**, so he always meets something and must choose.
- The voice gives the target (question line, pause, then the syllable or, at stage 1, the letter name). The first wave after a new target arrives only after the target has been spoken. He catches the target (it bursts into sparkles) and dodges the rest.
- A flight lasts a while (Michael: "let him play for a while"); the target changes every 3 catches, with an announcement line (variations) and the new target.
- Wrong items in a wave: the same letter with another vowel; a look-alike letter with the same vowel; when known, his recorded confusions.
- **Hitting a wrong item** is a mistake (the flight stops until next). **A missed target is not possible** (every lane holds an item, so he always meets one); if he dodges into an empty moment between waves nothing happens.
- Music plays and **ducks under the cue** (rule), so he always hears it.

### 2 · Cauldron — put the vowel on the letter

- A letter floats over a bubbling cauldron. **3 vowel orbs** float above it, one mark each on a dotted placeholder, one per sound group.
- He hears a syllable and drags the right orb into the cauldron (a tap also works). The mark joins the letter with a green puff, and the voice says the syllable.
- This is his two-step reading (letter, then vowel) done with his hands.

### 3 · Spell ladder — one part stays, one part changes

- The wizard stands at the foot of an **empty** ladder. Next to the next empty rung, **3 plates** float.
- He hears a syllable, taps the plate, and it flies into place as the rung; the wizard climbs onto it. **The ladder is built from his right answers** (Michael asked what the climbing means; this is the answer).
- In one ladder, one part stays the same: all plates are one letter with different vowels (לָ לִ לוּ), or one vowel with different letters (לָ מָ נָ). At stage 3 a ladder can be the dot contrast (בָּ / בָ / כָּ).
- Because only one part changes, the game learns whether a mistake was the letter or the vowel.
- At the top: a short celebration, then the run goes on. Nothing waits on top (no extra elements).

### 4 · Look-alike ghosts — find the real one

- **3 ghosts** float in from the right, each holding a round sign with a letter (or a syllable). The wizard stands on the left.
- One kind per visit, never mixed: ghosts with **letters** → he hears the **letter name**; ghosts with **syllables** → he hears the **syllable** (Michael asked; the ghosts show the kind).
- He taps the ghost he heard: the wizard zaps it; the others fade away.
- The groups start from shape: ב/כ, ד/ר, ה/ח/ת, ו/ז, ג/נ, ט/מ, ע/צ, ו/י (builder: refine; only opened-stage items). **When the data knows his real mix-ups, the groups come from those** (Michael): a confused pair with enough recorded confusions (builder: threshold) replaces the shape group.

### 5 · Door corridor — read, open, go through

- A magic door with a plate that shows a **two-syllable word**. The syllables light up one at a time, **right to left** (the first syllable is the right one). **No voice says the word before he chooses**: this is the one screen where he reads before he hears. The question does not say the word either ("which picture is the word on the door?", in variations).
- Under the door hang **3 keys**; each key's handle is a **picture** (Michael). He taps the key with the picture of the word he read; it flies into the keyhole and turns, the door swings open, and the voice says the word.
- The camera zooms through the door to the **next door** (Michael). **3 doors** per corridor (my guess).
- **A wrong key** is a mistake like any other (heart, right key marked, next).
- Words: two syllables built from opened items (rule), the first vowel sounds as written, no final forms. **No people words** and nothing with an obvious other name (rule: one obvious name; the duel's "mom" was called "woman"). The picture distractors are other door words. Every picture goes to review first.
- The door scene must not show the answer (in the mockup, the word "door" on a door gave it away).

### 6 · Crystal

- Behind the last door: a glowing **crystal, quartz or amethyst** (Michael), in its own moment, with a burst of light and an excited voice line.
- **No collection in v1** (Michael, 2026-10-19): the crystal moment only (rule: start simple; add a mechanic when the data shows a need).

### Start screen

It shows the game's world and its learning content, not a cropped background with a button (rule): for example, the wizard on his broom and glowing syllable orbs drifting by, and a big play button.

## Glyphs

- Letters with nikkud are text in a Hebrew font, not AI art and not hand-drawn shapes. **Start from Sigalit**, the app's print font for nikkud (the app moved off Hillel CLM because of its nikkud support; the mockup used Hillel and turned יִ into "!").
- **Load the font and all pictures before the first game screen** (rule), and measure glyphs only after the font has loaded: a fallback font gives wrong measures.
- **Center each glyph by its ink box** (letter plus marks), measured in the font, on its orb, plate or sign. Line-box centering puts syllables with a mark below off center (seen in the mockups). The mockup did this with `canvas.measureText` (`actualBoundingBox*`).
- A mark shown alone (cauldron orbs) is drawn in SVG on a dotted placeholder, as in the duel.
- **Legibility sheet:** render all ~130 syllables and 26 letters in the chosen font at game size, and check each one for a look-alike to a Latin letter, a digit or punctuation (rule). Put the sheet in review.
- No dot-like particles or background specks near glyphs (rule). The painted backgrounds in the mockups have round dots in the sky: regenerate or clean them.
- RTL text: render each syllable and each word as one isolated run (the story game had a bidi ordering bug, fixed with an isolate).

## Audio

- **Voice:** the duel's wizard voice (Will, eleven_v4, language "he") speaks instructions, feedback, the learning sounds (syllables, letter names, words) and the celebrations. One voice, one role: the player's guide (my call, as in the duel, where the wizard also said the vowels).
- **Learning sounds:** ~130 syllables (record once per sound; same-sound spellings share the file), 26 letter names, the vowel names (reuse the duel's approved files), the word-link and door words. Each said one time, short and clear: one voiced burst (rule); stability 1.0 for a single syllable (rule).
- **Syllables get 2 or more takes each and a full review** (rule: hard items get more takes; a wrong "ba" teaches wrong reading; speech-to-text is not reliable on lone syllables). Letter names, door words and word-link words can use one take plus automatic checks (the rules' large-set exception for real words).
- **Lines:** each screen's question, the target-change announcement, "almost", each celebration, the run end: several variations each, never the same twice in a row (rule); each line correct in its moment (rule). Demo narrations, the dotted-letter explanations. Exciting lines at stability 0 with a tag; instructions warm; learning content warm and clear, less playful (rules). No "!" in the spoken text (rule).
- **Music:** the broom flight and the celebrations have music (rotating tracks, ducked under all speech, stopped for dramatic lines: rules). The cauldron, ladder, ghosts and doors are quiet while he listens (rule for calm play). My call.
- **SFX:** each repeated event has its own sound (rule): a wave arriving, a catch, a hit, the puff, a plate locking in, a ghost zap, a key turning, a door opening, the crystal.
- Speech plays at 1.15× with the pitch kept, silence trimmed (rule). Reuse `src/shared/audioCore.ts`.

## Art

- The duel's style ("night sky magic"), from the same style sheet. **Build screens from pieces**, not baked scenes: backgrounds (a clean sky; a sky with ground), sprites on a flat background color keyed out, and glyphs placed by code. Baked scenes put glyph areas in the wrong places and fix the sprite sizes (both seen in the mockups; Michael called the first version ugly).
- Sprites: the wizard astride a broom, the wizard climbing, the orb, the plate, the cauldron, the ghost with its arms forward, the ladder rails, the door (and its open state), the key with an empty handle (the picture goes in the handle), the crystal(s), the backgrounds. Reuse the duel's wizard poses and picture words where they fit.
- New picture words for the word link and the doors, with the duel's picture-word rules (one obvious name, no dots near the picture, several words per sound where possible).
- Key each sprite on a color far from its own colors: purple pieces lose their edges on magenta; use green behind them.

## Parent features

- **Screen gallery** (Michael: a way to review the screens before the child plays). A parent route lists every screen × stage: broom (letters / syllables), cauldron, ladder (vowel changes / letter changes / dot), ghosts (letters / syllables), door corridor, crystal, the dotted-letter explanations, the demo rounds. A tap starts that screen at once with real audio; a back button returns to the list. It sits in the parent area, reached as in the clock game (a parent button on the cover with a hold ring), and does not change the child's progress (builder: a sandbox or a flag on its telemetry).
- **Telemetry:** per item and per screen type: correct, wrong, near miss, time to answer, positions, the clock time, the assets used (rule), the confusion matrix (asked → tapped; letters and vowels separately), demos and explanations seen, abandons. In localStorage with a size limit (rule); reuse `src/shared/telemetry.ts`. Export from the parent area, and an analysis script like the duel's.
- **Stats card** in the parent area (parent-facing; text is fine). Retired items leave the stats (rule).
- Saved progress uses a versioned store with a migrate step (clock lesson).

## Review and release

- Michael does **not** block the build on reviews (2026-10-19): build the full game with the generated takes, and replace what he rejects later (the rules' exception). He still sees this design and the plan before the build.
- The review page shows the glyph (בָּ) next to each syllable and letter take, and where in the game the sound is used (rule). New picture words show without their word (rule). Ship only approved takes once he has reviewed; a withdrawn take is marked so the game skips it (rule).
- Record the request of each chosen take in `asset-sources/duel2/` (CLAUDE.md).
- Before the playtest build: a full own QA pass: each screen and stage from a fresh start, at phone and tablet sizes, with wrong answers, with an audio log and a screenshot per step, checking the screenshot edges for cut shapes (rules). When a playtest note names one case, fix all similar places (rule).

## Left to the builder

- Code layout. Follow the duel's split (pure logic and reducer, a hook for timers and audio, components), and reuse `src/shared/` (adaptive, audioCore, telemetry) and the duel's pieces where they fit rather than copy them. The clock game lives as a separate Vite entry; the duel is a route in the main app. Either fits; a route next to the duel is my default.
- Exact numbers: waves per flight, rounds per visit, rungs, doors, stage-open rules, the confusion threshold for ghost groups.
- The phone portrait layout for each screen (with the glyph still the strongest element).
- The font, after the legibility sheet.
- The word lists for the doors and the word link.

## Decided by Michael (2026-10-19)

1. **Hearts:** refill when a new screen starts; the next run starts at the screen after the one where the last run ended (option A of three).
2. **Image budget:** a new $10 Gemini budget for Book 2 (about $0.15 per image; record the spend). The mockups used about $2.85 of the duel's budget.
3. **Crystal:** the crystal moment only; no collection in v1.
