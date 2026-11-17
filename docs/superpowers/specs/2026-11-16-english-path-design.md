# The English path — Design

**Date:** 2026-11-16
**Status:** Draft for the parent's review. Brainstormed with the parent on 2026-11-10 to 2026-11-16. A builder check ran on
this document, and a rule-by-rule review against `docs/minigame-rules.md`; their findings are answered here.
**Builds on:** [Book 2](2026-10-19-duel-book-2-design.md), [one duel](2026-11-11-one-duel-design.md),
[Book 2 drawing](2026-11-07-book2-drawing-design.md), [the flight bosses](2026-11-07-book2-flight-boss-design.md),
[girls](2026-11-07-girls-design.md), and the architecture of `docs/superpowers/plans/2026-11-16-improvement.md`
(ADRs 0002–0005). Read [docs/minigame-rules.md](../../minigame-rules.md) first: every rule applies.
**Mockups:** an HTML page built from the game's own parts, reviewed with the parent frame by frame. It is host-local,
outside the repo. This document describes everything it shows.

In this document, **"the parent decided"** marks a decision the parent made, **"my call"** marks a decision made in the
brainstorm that the parent has not confirmed, and *Left to the builder* lists what is open.

## Intent

The parent asked how to adapt the Hebrew reading duels into English, as a separate game path. The child speaks English
(the parent: "he speaks English — so make your suggestions according to UK/US curriculums, not Israel"). He already
knows many letters and reads some words. So the English path is a phonics course for a native speaker, in the American
order, in the same game: the same run, screens, stakes, merchant and rewards, with English content.

What the research found (host-local report, 2026-11-11), and what this design takes from it:
- **Explicit, systematic phonics** works best for beginning readers: letter-sound links taught in a fixed order,
  blending from the first few letters, and spelling taught with reading. The effect is moderate, and it is on word
  reading. No order of letters has been shown to be better than another.
- **Blending is best shown as one stretched sound** ("sssaaat"), not as separate sounds with pauses.
- **Spelling and handwriting help reading.** Writing letters by hand helps letter learning more than looking or
  tracing; spelling practice improves word reading.
- **No reading game works well alone.** The most consistent factor is an adult who is involved. One study found gains in
  the game that did not show on paper. So the game gives the parent a short off-screen check (*Parent area*).
- **Feedback that shows and says the right answer** helps much more than right/wrong only.

## Goals, non-goals, anti-goals

**Goals**
- A second path, English, beside the Hebrew duel: its own card and path on home, its own run.
- The game finds his level in the first run, as the other games do (the parent: "the game needs to quickly learn his
  level. he already knows many letters, and reads some words").
- All nine stages of the American order in the first version (the parent decided).
- Reading and writing together: sounds, blending, reading words, spelling words, writing letters.
- The same reward system on both paths (stars, coins, hearts, the merchant), with a separate balance per path.

**Non-goals**
- English as a foreign language (no oral vocabulary teaching, no Hebrew instructions).
- Comprehension, sentences longer than a short phrase, and stories.
- Cursive writing.
- British English. The voice and the order are American.

**Anti-goals** (a failure even if it works)
- A child who passes stages by remembering word shapes. Nonsense words exist to prevent this.
- A slow start for a child who already reads: walking him through letters he knows.
- An English screen that looks like a mistake beside the Hebrew one (the parent rejected a blue tint as "too close to
  the purple one").
- Anything the Hebrew path loses: the Hebrew path, its saves and its screens behave as before (the Hebrew spell book,
  Part 7, is a separate step if the parent wants it).

## Part 1 — Home

- **The English card** sits under the Hebrew duel card, after a separator, and before the clock card. (The Space Cat
  card, built in parallel by another session, goes after the clock; see *Parallel work*.)
- **Left to right throughout:** the picture on the left, the play button on the right and pointing right, the path
  starting on the left. This is the opposite of the Hebrew card, on purpose.
- **The card's picture** is the Hebrew card's picture (take 3) through the green transformation (Part 2), facing the
  other way. The card's background is a teal-green night sky (the parent: "the main color option is good"). Three
  green orbs carry `a`, `sh`, `m` in Andika. The girl version follows the saved player, as on the Hebrew card.
- **The line for the parent** (English, smaller and fainter than the card): "**What he learns:** the sound of each
  letter, blending sounds into words, spelling, then letter pairs (sh, ch, th), silent e and vowel pairs. The game
  finds his level in the first run." Girl form: "What she learns".
- **The path:** the same zigzag, dotted, sideways-scrolling path of stations as the Hebrew one, running left to right.
  Captions say what is learned, never the minigame's name. They are parent text, as on the Hebrew path: smaller and
  fainter than the station picture, marked for the no-text scan:

  | Station | Picture | Caption |
  |---|---|---|
  | tower | the tower | letter sounds |
  | broom | an orb with `m` | sounds by ear |
  | ghosts | the ghost | look-alikes |
  | cauldron | the cauldron | the missing sound |
  | ladder | the ladder | word chains |
  | doors | the door | reading words |
  | spell book | the book | spelling |
  | drawing | `a` in Andika | writing letters |

  The stations open over time, as on the Hebrew path: each at the stage in Part 5's table. After the first run (Part 4),
  every station whose stage is at or below his found level opens at once (my call). Nothing in the parent area ever
  closes a station or lowers a rating (rule: do not let progress go backwards).
- **The wizard on the path** is the green wizard (Part 2), facing right.

## Part 2 — The look: one transformation of the Hebrew assets

The parent asked for the English assets to be made from the Hebrew ones by a transformation ("rotate hue or something
like that"), because the purple parts did not fit a green background. Decided with the mock:

- **Backgrounds and props** (sky, ground, orbs, word plates, door, key, ladder, cauldron, ghost, crystal): every purple
  hue (235°–325°) moves by −105° to green. Gold, white, skin and the stars stay.
- **The wizard** is fully green (the parent picked it from three options). His sprites need a stricter mapping: every
  blue-to-magenta hue (195°–335°) becomes one family of green around 152°, with 30 % of the original hue spread kept, so
  no patch stays half-changed. The first mapping left blue patches; the parent saw "artifacts on his clothes". The
  tower and the card picture use the same stricter mapping. All wizard sprites get it, the girl wizard's too.
- **Colours drawn in code** (top bar buttons, the tower's runes, letter tiles, panels) get the matching green values,
  one set for the English path.
- **Not changed** (my call): the monsters, the bosses, the merchant, the picture words, the coins, hearts and stars.
  Enemies stand out against green; rewards look the same in both paths, because they are the same reward system.
- The transformation is a script run once. Its output is committed as new image files; the game does not recolour at
  run time. Record each output's source file and the script's parameters in `asset-sources/english/images.json`. The
  script itself is host-local, like the other generation tools.
- **Letters:** Andika (already in the repo for the clock's English captions), lowercase with a single-storey `a` and
  `g`, as children see in early readers. Check a sheet of all letters and sound units at game size (rule: glyph sheet),
  with the capitals and digits beside `l`: capital `I`, lowercase `l` and `1` must look different, since "I" is a heart
  word.
- **Facing:** sprites keep the Hebrew game's facing table. The monsters walk in from the right toward the tower on the
  left, as in Hebrew (the parent: "ok"). The ghosts face the wizard.

## Part 3 — Content: nine stages in the American order

The order follows UFLI Foundations (a US programme). The parent decided all nine stages are in the first version.

| Stage | New sound units | Words like | Nonsense like |
|---|---|---|---|
| 1 | a m s t p f i n | sat, pin, fan | tam |
| 2 | o d c u g b e | dog, cup, bed | bod |
| 3 | k h r l w j y x qu v z | fox, win, zip | vap |
| 4 | ck ff ll ss zz · sh ch th wh ng nk | fish, duck, ring | chim |
| 5 | two consonants together (each letter keeps its own sound): st sp sn sl sk sm sw fr fl tr cr dr br gr pl cl bl gl, and at the end nt nd mp st sk ft lk | tent, frog, stamp | sluk |
| 6 | silent e: a_e i_e o_e u_e | cake, bike, rose | pove |
| 7 | endings: -s -es -ed -ing | jumps, fishing | — |
| 8 | ar or er ir ur | car, horse, bird | zarn |
| 9 | ai ay ee ea oa ow igh oo ou oi oy aw | tree, boat, night | voam |

- **A sound unit** is one letter or a group of letters that makes one sound (`sh`, `a_e`, `igh`). It is the item that the
  game tracks, as a mark or a letter is in Hebrew. A word is a sequence of sound units. `x` (/ks/) and `qu` (/kw/) are
  units by convention.
- **Two consonants together** (stage 5) are not units: each letter has its own box, its own light in the blend and its own
  sound. The game tracks each pattern (`st-`, `-mp`) as a skill for the adaptive choice and the stage pass, so that he
  learns to blend them, not to see them as one sound.
- **A spelling with two sounds** (`oo` in moon/book, `ow` in snow/cow, `ea` in bead/bread, `th` in thin/this, `-ed` in
  jumped/played/wanted, `c` and `g` before e/i): my call — teach the main sound first (`oo` as in moon, `ow` as in snow,
  `ea` as in bead), and the second sound later, as its own item in the same stage, in rounds where only one reading is
  possible. Do not use words with the second reading before then. `c` and `g` are only "hard" (cat, got) in this
  version; soft c/g is out of scope.
- **Words that break the rules** ("heart words"): about 30, two to four per stage, for example: the, a, I, to, is, of,
  was, said, you, are, do, my, he, she, we, they, have, one, what, where, there, come, some, look, put. They are taught
  as whole words in rounds without pictures: he hears the word and picks it among other heart words or decodable words
  (broom, ghosts), and later reads it inside a door's phrase (`a red bus`). A heart word is never a picture key, and never in a placement check, a nonsense round, a word chain or the
  spell book (my call: spelling them is memory, not sound; a later step can add them).
- **Nonsense words** are made from the stage's sound units, are not real words and not rude words, and are never close
  to a heart word. They are the monsters' names in the tower (Part 5) and in the placement check
  (Part 4), and they count in the stage pass, so a stage cannot be passed on remembered shapes alone. They never have a
  picture.
- **Word lists:** the builder makes the full list for all nine stages (about 250 real words and about 100 nonsense
  words in total). The parent
  reviews it before audio generation. A real word must be one a 7-year-old knows; words that need a picture must have
  one obvious picture (rule: "What will the child call this?").
- **Letter names** are not taught as a skill. They appear only where the voice must name a letter (for example "the
  letter b" in a look-alike explanation).
- **Pictures for a first sound** start with that exact unit and its main sound: apple, egg, igloo, octopus, umbrella
  for the short vowels; never shoe for `s`, chair or kite for `c`, knife for `n`, phone for `f`. Units that never start
  a word (`x ck ff ll ss zz ng nk`) are asked by their last sound (fox → `x`, duck → `ck`).
- **Capitals** come after stage 3: in the drawing (Part 6), and as the first letter of names and of the word "I".

## Part 4 — Finding his level

### The first run: the placement check

- The first English run starts at the tower. It looks like a normal duel, with three word runes (the tower's letter
  rounds have four). Two kinds of round alternate:
  - **Picture:** the monster carries a picture (a cape), and the runes carry three words (`cape · cap · cope`); he taps the
    word that fits. After the tap the wizard says the word.
  - **Name:** the wizard says the monster's nonsense name ("vap"), the monster's bubble glows, and he taps it among
    `vap · vip · map`.
- **The words of a round differ only in the part the stage tests**, and every word uses only units of that stage or
  below, so only reading the whole word works. This breaks the
  rule "make wrong answers clearly different" on purpose; the parent decided it is allowed for words on this path
  (record the exception in `docs/minigame-rules.md`, Game play and learning).
- **The walk** (s = the stage asked; each stage keeps its right and wrong counts):

  | Event | Before his first miss | After it |
  |---|---|---|
  | right at s | go to s + 2 (at most 9) | if s has 2 right: go to s + 1; else ask s again |
  | wrong at s | ask s again | if s has 2 wrong: his level is s when s = 1 or s − 1 has a right answer; else go to s − 1 |
  | s = 9 has 2 right | he reads all stages (level 9) | same |

  It starts at stage 4 and stops after 15 answers at the latest (then the stage asked is his level). **Stages it jumped
  over** below his level get one confirming round each at the end; a miss there makes that stage his level. (Simulated
  in the mock: a child who reads everything is placed in 5 answers plus 2 confirmations; one who misses everything in
  7.)
- **No hint in the placement check:** the ? button is hidden. A hint would read the word for him.
- **Stage 7 (endings)** cannot be tested with one picture and three forms of one verb (jumps, jumped, jumping all fit).
  My call: its picture rounds use the plural `-s` and `-es` only, with a picture of several things against the
  singular and a near spelling (`cats · cat · cast`, `boxes · box · fox`).
- **A miss in the placement check costs no heart and no streak** (my call: nobody taught him that yet). The wizard says
  the right word, and it glows, as after any mistake. Right answers earn stars and coins as usual.
- **Credit per sound unit:** a right word counts as one right answer for each sound unit in it. A miss counts against
  the unit the stage tests only.
- **After placement:** every sound unit of the stages below his level is marked known (it seeds the tallies as about
  three right answers each, so the adaptive choice treats them as easy and brings them back only as review). His level
  is the stage the run teaches.
- My call: the placement runs once per child. The parent can run it again from the parent area.

### After the first run

- The stage machine works as in Book 2 (`logic/stages.ts`): the first 5 answers on the new stage's units all right, or 8
  of the last 10, pass the stage.
- **Fast forward inside a stage** (rule: place a skilled child fast): a new unit is asked once before its introduction,
  as in the Hebrew placement check. If he is right, the introduction is skipped, and his next two answers on it decide:
  both right, it is known; a miss brings the introduction.
- **Going back:** a known unit that he starts to miss gets more rounds (the adaptive choice does this already). Nothing
  on his screen steps down (rule: do not let progress go backwards).
- **The parent can set the start stage** in the parent area (like "Already knows nikkud: open Book 2").

## Part 5 — The screens

The same screens as the Hebrew run, in the same cycle, with English content; plus the spell book (Part 7). Everything
the child acts on is in English and runs left to right. Each screen follows every rule the Hebrew screen follows
(questions, demos, mistakes he fixes himself, hints, near misses) unless this part says otherwise.

**When each screen opens** (my call; the English counterpart of `screensOfStage`). A screen uses only sound units of
opened stages (rule: wrong answers only from content he learned).

| Screen | Opens at stage | Why |
|---|---|---|
| tower, broom, cauldron, doors (single words), spell book, drawing | 1 | Stage 1 builds words at once (sat, pin, tan, fit). |
| ladder | 1 | Chains from stage-1 letters: sat → sit → fit → fin → pin. |
| ghosts | 2 | Stage 1 has no look-alike pair. A look-alike set opens only when all its letters are learned: `b d p` at stage 2, `n u` at stage 2, `m w` and `h n` at stage 3. `q` appears only as `qu`. |
| doors with two or three words | 4 | Enough heart words (a, the, is) and words for a phrase. |

The cycle order: tower, broom, cauldron, ladder, ghosts, doors, spell book, drawing.

**Run length** (rule: every screen comes up in a usual run). The English run keeps Book 2's run rules: 3 hearts, a heart
back after a full pass, and the next run starting at the screen after the one where the last run ended (`lastEnded`).
With 8 open screens and visits of about 5 answers (the doors' about 8: my call), a pass is about 43 answers; at 1
mistake in 5 a run of 3 hearts lasts about 15–20 answers, so a run reaches 3–4 screens and two or three runs in a row
reach every screen, as on the Hebrew path. The builder confirms this with the Hebrew run's simulation before the
playtest.

| Screen | Early stages | Later stages |
|---|---|---|
| **Tower** (letter sounds) | The monster carries a picture (fox), or the wizard says a sound ("fff") while the monster's bubble glows; four runes carry letters; he taps the first sound's letter (or the last sound's, for `x ck ff ll ss zz ng nk`). After the tap: "fff. fox." | The runes carry words. Some monsters have a nonsense name: the wizard says it ("vap") and he taps it among `vap · vip · map`. The monsters never speak (rule: each voice one role). The מגה spell works as in Hebrew. |
| **Broom** (sounds by ear) | He hears a sound ("mmm") and flies into its letter. | He hears a word and catches it among `ship · chip · shop`. |
| **Ghosts** (look-alikes) | One look-alike set per visit (the sets in the table above), then his own mix-ups from the data. He hears the sound and picks. Never `I` against `l`. | Look-alike words: `was · saw`, `on · no`, `top · pot`, `tip · pit`. |
| **Cauldron** (the missing sound) | He hears a word (`cat`); the word shows with one empty box (`c_t`); he drags the missing letter into it. Then the word's blend (below) plays: "caaat … cat". | The missing pair (`_ip` → sh/ch/th). Stage 6: he throws `e` in after `cap`, the word turns into `cape`, and the picture changes with it. |
| **Ladder** (word chains) | Each rung changes one sound of the word below it: sat → mat → map → mop. He hears the new word and drags the letter that makes it; the place that changes is marked. | The place is not marked; he finds it. |
| **Doors** (reading words) | A word on the door (`fish`); he takes the key with its picture. "What does the door say?" plays only when he waits. Never a heart word alone on a door. | From stage 4, two or three words (`a red bus`), with heart words inside the phrase. This is the screen closest to real reading: my call — its visits are the longest of the cycle. |
| **Drawing** (writing letters) | He hears a word and its first sound ("dog." then the unit's own sound take, "d", never the letter's name), sees the stroke demo, and writes the letter on four lines from the start dot. | Capitals after stage 3. |

- **Long words fit their places** (rule: place the parts of a word by measured widths; check the longest word): the
  builder names the longest word of each screen and stage (for example `fishing`, `jumping`, `stamp`, `night`) and
  checks orbs, runes, plates and door plates with it at phone size, the broom's no-overlap geometry test included.
- **The tower's monsters keep their colours** and walk in from the right. The runes are green.
- **The bosses** (tower bosses and flight bosses) carry English content: a sound unit of his current stage, or a word.
  Their art and moves stay.
- **The merchant** comes in the English run with English lines (Part 8).

### The hint blends a word

- The hint button is the game's question mark (rule: not a wand; the mock still shows a wand). On a screen that shows a
  word, it plays the word's blend: a spark moves under the word from left to
  right, each sound unit lights up as the voice reaches it, and the voice says the word slowly, then normally. A unit of
  two letters (`sh`) has one line under it and lights up as one.
- **How the slow word is made is open** (the parent, 2026-11-17). The voice's own stretched words "sound weird", and
  the word take at half speed with the pitch kept "sound[s] baddd". In review now: the word at 0.7× (gentle); only the
  vowel and the s/f/sh parts stretched, the stop sounds kept (held); the approved unit sounds in a row, then the word
  (units). If all fail: no slowed audio, the units light in turn while the normal word plays, or each unit's sound plays
  as it lights. Only the parent's ear judges this: a listening model rated the takes he called bad as perfect.
  Whatever the method, the units' light times come from the word's measured alignment.
- **Which word:** on a screen where he hears the target (broom, cauldron, ladder, spell book), the target. On a screen
  where he reads to choose (tower words, doors, ghost words), each word on the screen in turn, left to right; the
  answer then counts as helped. In the placement check there is no hint.
- **After a miss:** the right word glows and its normal recording plays, as on every screen. The blend plays too only
  from time to time (rule: the explanation of a mistake comes from time to time, not every time): my call, after every
  second miss on a word screen, once he has made the right move himself.
- A word read after a hint counts as helped, not as right (rule: count special results separately).
- A hint goes away when he touches an answer (rule).

## Part 6 — Writing letters

- **Order by how the hand starts** (a common practice; it keeps `b` and `d` apart as two different movements):
  `c a d g o q` (start like c), `b h k l t` and `f i j` (a line down), `m n r p u` (down and over), then `e s v w x y z`.
  The stage decides which letters are open; the hand order decides which open letter comes first. A whole word is
  written (Part 6, Part 7) only with letters he has already written alone.
- Lowercase first; capitals after stage 3.
- **Stroke data** for 26 lowercase and 26 capital letters in Andika's shapes, in the format of the Hebrew strokes
  (`data/strokes.ts`). The parent reviews the stroke animations on the stroke review page, as for Hebrew: the letters
  of stages 1–3 before the drawing opens, and every letter before the spell book's written words open (stage 4).
- **Dots and crosses** (`i`, `j`, the bar of `t` and `f`) follow the Hebrew marks rule: accepted in any order, also
  across neighbouring letters, each matched to the nearest missing mark and judged against his own letter. Every stroke
  order the parent approves for a letter is accepted (rule).
- **Four lines** (the top line, the dashed middle line, the base line and a faint descender line), so he learns where
  each letter sits. The Hebrew drawing has none; the lines are English only.
- He writes the first letter of the heard word. My call: from stage 2, sometimes the whole short word (three letters),
  in three boxes, left to right.

## Part 7 — The spell book (a new screen; Hebrew is a question)

**English.** He hears a word ("cat"). An open book shows its picture on the left page and one box for each sound unit
on the right page. He drags a tile into each box, left to right; each drop plays that unit's sound; the full word
"casts the spell" and the picture comes alive. A unit of two letters is one tile in one box.
- Later stages: no picture, only the heard word; then (stage 4 on) he writes the word with his finger instead of
  dragging tiles. My call: the written word is checked letter by letter with the drawing's recognizer.
- **Heart words are not spelled** in the spell book (Part 3).
- Wrong tiles: other sound units he has learned, never another spelling of the same sound (`c`/`k` for "cat") before
  stage 9. From stage 9, the same sound in two spellings (`ee`/`ea`) may meet, as a near miss: forgiven once, and the
  voice says "That sounds right, but this word is spelled with …".
- My call: the spell book enters the cycle after the doors (writing after reading), and opens at stage 1.

**Hebrew** (the parent asked whether it could be used for Hebrew as well). **A question for the parent: is it part of
this build?** My recommendation: yes, as one screen built for both languages. If not, the spell book is English-only and
the Hebrew path does not change. If yes: the same screen, right to left, purple, in Book 2's run; Book 2's cycle,
`screensOfStage`, the home path and the Hebrew run's tests change on purpose.
- Words: the door words, which already store their syllables (`בַּ · יִ · ת`). He builds the consonant-vowel syllables
  that Book 2 teaches. The closing letter (`ת`) is printed, faint, and is not a box.
- Audio: the word and syllable recordings exist; only the screen's instruction lines are new.
- **Same-sound letters and marks** (ת/ט, כּ/ק, ח/כ, ס/שׂ, א/ע, kamatz/patach): by ear alone he cannot know which one a
  word uses. A same-sound syllable is never a wrong choice; the wrong ones differ in sound (`יָ`, `נִ` for `יִ`).
  Same-sound spelling can come later, as its own step.
- It enters the Hebrew cycle after the doors and opens with the doors (stage 4), and gets a station on the Hebrew path
  between the doors and the drawing ("כתיב מילים").

## Part 8 — Language, voice and rewards

- **The wizard speaks English on this path** (the parent decided). **Voice: Gemini TTS, voice Puck**, one voice for all
  of the English path: lines, words, sounds and nonsense words (the parent, 2026-11-17: "Puck voice is great", after the
  ElevenLabs voice Will failed the sounds: letter names, wrong vowels, no clean stretch). Sounds use a bracketed
  direction before the sound ("[phonics sound only, not the letter name] mmm"). Every clip is screened before review:
  the glitch at its end trimmed, length and bursts measured, a listener's transcript checked for a direction that leaked
  into the audio, and a forced-choice vowel check for the sounds. The service allows about one call every 7 seconds, so
  the full set is a paced run or its batch service. The merchant speaks English in a second Gemini voice (the builder
  proposes one; the parent picks it on the review page). Every Hebrew line of the run has an English counterpart, written as an
  English-speaking adult says it to a child (rule: write each line as what an adult says). A native reviewer checks the
  lines in sequence.
- **Girls:** English lines rarely mark gender. Lines with "he/she", "his/her", "wizard/witch" get a girl form. My call:
  the girl is a "wizard" too (the parent's girls design calls her a wizard in Hebrew, קוסמת); the card line says "What
  she learns".
- **A separate purse per path** (the parent decided, 2026-11-16, replacing "one purse"): coins earned in English are
  spent only at the English merchant, and Hebrew coins only at the Hebrew merchant. Reasons: the coins and hearts
  measure the skill of one path, so coins from the path he finds easy cannot buy hearts on the hard one; each path's
  prices fit its own earning. The English balance starts at 0; his Hebrew balance does not change.
- **Stars and bests are per path** (my call): the English run's stars, best run and crystals are its own, shown on its
  cover. The total stars on each cover are that path's.
- **Hearts are per run**, as now; a run is in one language.
- **The merchant** in the English run speaks English. His rules and his line set are the Hebrew merchant's (`m-*` in
  `data/lines.ts`), one for one, with the same number of variations: the long opening on his first visits, the short
  offer once the child knows him (rule: a short opening when the child knows the screen), the walkthrough that his
  help button plays again, the undo shown when first needed. The main lines:

  | When | Line |
  |---|---|
  | Opening | Hello, wizard. I have a potion that gives you a heart back. Do you want one? |
  | Short offer (he knows the merchant) | Want a heart potion? |
  | No answer for 20 s | So, do you want one? |
  | ✗ | All right. Goodbye, wizard. |
  | D1 | This is the price. |
  | D2 | Give me coins to match the price. |
  | D3 | Then touch the potion. |
  | D4 | Don't need it? Touch here. |
  | Exact | Exactly right. Here's your potion. |
  | Not enough | That's not enough. |
  | Too much | That's too much. |
  | Too much, first time | Take a coin back. |
  | Potion tapped, empty hand | Coins first. |

  No numbers are spoken, as in Hebrew.
- **Captions:** none on child screens, as in Hebrew. The rule's exception (a caption whose words light up as spoken)
  is not used here: on this path every written word is learning content.

## Part 9 — Parent area

The English path has its own section in the shared parent area (the registry of the improvement plan):
- **Level found:** the stage, how many answers it took, the date; **Run the placement again**; **Start stage** (a
  choice of 1–9).
- **Sound units:** every unit as a chip: knows / learning now / not seen yet. A tap shows its right, wrong and helped
  counts and its mix-ups.
- **Words:** the words he read with and without a hint, and the nonsense words.
- **The off-screen check** (the research: an involved adult is what makes reading games work): after each run, the
  section shows the run's words in large print for the parent to hear him read from the screen held away from the
  game, with a ✓/✗ per word that the parent taps. My call: optional, never asked of the child by the game, logged as
  `parent-check`.
- **Settings:** the English path on or off (default on); the drawing on or off; the number range (up to 10, 100 or
  1000) is one setting for both paths, because it is about his counting, not his reading.
- **Data:** the English log in the shared export.

## Part 10 — Assets and budget

Record each shipped asset's request in `asset-sources/english/` (CLAUDE.md).
- **Images (a question for the parent: the budget).** Pictures are needed where a round shows one: the tower's first- and
  last-sound rounds (two or three pictures per unit, rule: several pictures per sound), the doors' keys, the cauldron,
  the spell book's early stages and the placement's picture rounds. Choosing words that serve several of these at once,
  that is about 150 pictures, of which about 25 exist (cat, dog, fox, bus, fish, tent, cake, rose, tree, house, book,
  ball, horse…): about 125 new. With 2 takes each and about 20 % made again after review, at about $0.15 an image, that
  is about $40. The $10 agreed earlier counted about 70 pictures with one take each. The spell book sprite (an open
  book) is one more image. Generated in the game's style from the style sheet, one subject on a flat background (rules:
  art generation).
- **Transformed images:** the green set (Part 2), no cost.
- **Voice:** about 45 sound units, about 300 words, about 100 nonsense words, about 30 heart words, and
  the English lines of the run, the merchant, the bosses, demos and info taps; plus girl forms where marked. Generated
  progressively in stage order (rule), reviewed on the review page with the picture or glyph beside each item. Real
  words in a large set get one take (rule: the review exception); sound units and nonsense words get two or more. The
  slow words for the hint are made from the word takes (Part 5) and are not recorded.

### Pronunciation (rules: voice, pronunciation)

- **Sound units:** one short burst (rule: speak a sound one time, short and clear). The spoken text is
  never the bare letter, which the voice reads as the letter's name (rule: "fi." became "F, I"). Each unit gets a
  written spelling of its sound (for example "mmm.", "sss.", "sh.", and for a stop sound a short syllable that the
  check shows has the least vowel), tried in several spellings in the spike. Each take is checked by an open question
  to a listener ("what is said, how many sounds, any letter names?"), and measured (length, voiced bursts).
- **Nonsense words:** written so that the voice cannot spell them out ("vap." may become "V, A, P"): the spike finds a
  spelling that works (for example a respelling, or the word inside quotes), checked the same way.
- **Slow words:** made from approved takes by the method the parent picks (Part 5); not recorded.
- **Short sounds:** keep them short; a cut of the vowel from a word take is acceptable (the parent found the first
  short-a takes "too prolonged").
- **Words:** said once, warmly and clearly, with less play than a narrator line (rule).
- **Sounds and music:** the Hebrew run's, unchanged.

### The voice spike came first (done, 2026-11-17)

The ElevenLabs spike (Will) failed the sounds and the stretched words. A second spike with Gemini TTS (Puck) passed:
the parent approved the nonsense words, the sounds m, s, sh, o, t, b, i, and Puck's words and lines. Short a is being
shortened. The stretched words failed, and so did the half-speed word; the slow-word method is open (Part 5).

### Releases (my call)

The path is built stage by stage and merged into `main` (staging) as each stage's content is reviewed. On production
(`release`) the English card stays hidden until all nine stages are reviewed; then it is released at once (the parent:
all nine stages in the first version). On staging, the placement walk uses only the stages whose content exists.

## Part 11 — How it fits the code

The implementation follows the architecture branch (`feature/improve`, plan `2026-11-16-improvement.md`), and starts
after it is merged into `main`. It may be built in parallel with Space Cat (see *Parallel work*).

- **One engine, two courses.** The run (`RunController`, its policies, its screens, the cover, the summary, the parent
  section) is Book 2's. A *course* gives it what is language-specific: the content (items, stages, word lists), the round
  builders of each screen, the audio table, the direction (right to left or left to right), the colours and the image set,
  the save key and the telemetry game id. The Hebrew course is today's content and must behave exactly as before (its
  tests stay green unchanged). My call: one app (`duel2/`) with the course chosen by the entry link
  (`?course=en`), not a new Vite entry, so that the run, the merchant and the screens exist once.
- **Saves:** the English progress has its own save; the Hebrew save is not migrated. Each save holds its own coin
  balance, as Book 2's does now.
- **The first duel's tower** (ADR 0002) is Hebrew-only code. The English tower is the same screen with English rounds; the
  builder decides whether `DuelController` takes a course or the English tower is a Book 2-style screen with the duel's
  look.
- **Policies** (merchant, pass and hearts, flight boss, drawing round) take their language-specific parts (lines, items)
  from the course; their rules do not change.
- **Telemetry:** the English run logs under its own game id, joined in the shared export.

## Parallel work: Space Cat

Another session builds Space Cat (`feature/spacecat`, spec `2026-11-12-space-cat-design.md`) at the same time. It is a
separate Vite entry. Both add a card to home: the English card goes after the Hebrew duel card, Space Cat after the
clock. Coordinate the home order and the `vite.config.ts` / knip entry lists when the second of the two merges.

## Rule changes to record in `docs/minigame-rules.md` when this is built

- **Communication on the screen:** "Do not use Latin letters for Hebrew sounds" stays; add that on the English path,
  Latin letters are the learning content, and no Hebrew letter or nikkud appears there.
- **Game play and learning:** on the English path, word choices may differ in one letter (the parent, 2026-11-16).
- **Visuals:** a second path gets its look from one colour transformation of the first path's assets; the player's
  character is transformed fully, with a mapping that leaves no half-changed patches (the parent, 2026-11-12/16).

## Left to the builder

- How the course seam is cut through `RunController` and the screens, and whether the English tower reuses
  `DuelController`.
- The exact word lists, heart-word distribution and nonsense words (the parent reviews the lists).
- The placement's numbers (start stage, jumps, the 15-answer cap) after a simulation like the one-duel placement table.
- Visit lengths per screen and the doors' longer visits.

## Verification

As for every Book 2 change (rules: Verification): a full QA pass from a fresh English save (placement at several
simulated levels), at phone and tablet sizes, the audio order logged, a screenshot of each step, the no-text scan
(Latin letters allowed only as learning content on the English path), the glyph sheet of all sound units in Andika,
and a check that the Hebrew run is unchanged.
