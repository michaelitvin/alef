# alef

A Hebrew reading game for one young child who cannot read yet, played on a tablet, with a parent who steers the design.
This file holds the domain words only. How a word is built lives in the code and the specs.

## Books and games

**Book 1** or **Duel** (the first duel):
The first wizard duel (nikkud, by sound), where the wizard reads a mark by its sound to beat a monster. It is now the tower screen of Book 2's run.
_Avoid_: the old app, nikkud duel, wizard duel (when you mean Book 2)

**The lessons**:
The reading course: letters, nikkud, syllables, words, sentences, stories; the home's shelf of older activities.
_Avoid_: Book 1

**Book 2**:
The letters-and-syllables adventure: a run through a fixed cycle of screens, with stakes and a merchant.
_Avoid_: duel2 (that is the code folder), duel v2

**Clock workshop**:
A separate game about reading an analogue clock, played as a workday of customers.
_Avoid_: clock app

**Home**:
The child's first screen: the cards of the games and the path of open stations.

## Book 2: a run

**Run**:
One adventure from the duel card, from the first screen until the hearts run out.

**Screen**:
One minigame of Book 2 (tower, broom, ghosts, cauldron, ladder, doors, draw).
_Avoid_: level, mini-game page

**Cycle**:
The fixed order of the open screens. The tower is always first.

**Pass**:
One trip through all the open screens in cycle order. A full pass gives a heart back, except on stage 0.

**Visit**:
One stay on a screen: a set number of rounds, fewer when the screen is mastered.

**Round**:
One question: a cue, an answer and its feedback.

**Wave**:
A group of choices that fall or fly together (broom, tower). One wave costs at most one heart.

**Checkpoint**:
The moment between two screens where the merchant can come.

**Stage**:
How far Book 2's content has opened. Stage 0 opens only the tower. Passing it opens the book.

**Placement**:
A short check at stage 0 that lets a skilled child move on fast.

**Mastered**:
A screen or mark the child has answered right for a long time. A mastered screen gets a shorter visit, or is skipped every other cycle.

**Station**:
A screen as shown on the home path, with a 0–3 rating of recent accuracy.

**Session**:
One visit opened from a station: no hearts at stake, no merchant, then the summary.
_Avoid_: run (a session is not a run)

## Rewards and stakes

**Stakes**:
What the child can lose: the hearts, and with them the run.

**Heart**:
One life of the run. A run starts with 3, and the hearts do not refill at a new screen.

**Star**:
One right answer, in a total that only grows.

**Coin**:
Spendable money, earned per right answer times the streak multiplier.

**Streak multiplier**:
×1, ×2 or ×3 on coins for right answers in a row. A mistake resets it.

**Merchant**:
A character who sells one heart (a potion) for coins at a checkpoint.

**Potion**:
A heart the merchant sells.

**Crystal**:
The reward moment at the end of a cycle, from stage 4 on.

**Boss**:
A strong opponent at the end of a broom visit or in the tower. Beaten kinds go on the boss shelf.

**Mega spell** (מגה כישוף):
The duel's lightning attack after many right answers. It does not count as reading.

## Teaching moments

**Demo**:
A shown example of how to play a screen, with the pointing hand.

**Dot intro**:
The first meeting with a dotted letter.

**Word link**:
A short moment that ties a syllable to a known word with a picture.

**Explanation**:
A spoken teaching of a mark or a rule, given at first sight and again after repeated mistakes.

**Hint**:
Help the child asks for, or that shows by itself after a long idle time.

**Desirable difficulty**:
Choosing the question nearest a predicted mistake rate of one in five.

## Clock workshop

**Workday**:
One play of the clock workshop: a fixed number of customers, then a summary.

**Customer**:
A character with one clock request that leads into an exercise.

**Exercise**:
A kind of clock task: find, what, set (the short hand, the long hand or both), digital pick, digital set.

**Level** (clock):
A step of the clock course that brings new clock kinds.

**Gear**:
The clock workshop's reward.

**Bonus**:
The short extra game at the end of every workday.

## The English path

**Course**:
What a run teaches: the Hebrew course (letters, nikkud, syllables) or the English course (sound units and words). One
Book 2 engine plays both; the course gives it the content ([ADR 0008](docs/adr/0008-one-engine-two-courses.md)).
_Avoid_: language, mode

**English path**:
The English course on Book 2's page (`?course=en`): reading and spelling with Latin letters in nine stages, with its own
save, its own home path and its own parent section. It is open on staging, and hidden on production until all nine stages are reviewed.
_Avoid_: Book 3, English game

**Sound unit**:
One letter or a group of letters that makes one sound (`s`, `sh`, `a_e`, `igh`). It is the item the English course tracks, as a mark is in Hebrew. A word is a sequence of sound units.
_Avoid_: phoneme, phonogram

**Heart word**:
A word that breaks the sound rules (`the`, `a`, `I`). It is learned whole, never has a picture key, and is not in placement, nonsense rounds, ladder chains or the spell book.

**Nonsense word**:
A word made from a stage's sound units that is not a real word (`vap`). It makes the child read the sounds, not remember a shape. Monsters in the tower carry them.

**Placement walk**:
The English placement check inside the tower: the monsters walk at a fixed pace (no adaptation) and each answer is credited to the sound units of its word, until the child's stage is found.

**Spell book**:
The screen where the child builds a word in boxes from tiles. Both courses have one. The English one also has a written form: he writes the letters of a word on four lines.

**Blend**:
The hint of the English path: the word is said as one stretched sound while its sound units light in turn. It plays after every second miss, and for a made word.
_Avoid_: sounding out

## People

**The child**:
The one player. The child cannot read, so every screen speaks and shows, and never writes.
_Avoid_: user, student

**The parent**:
The person who sets the rules, reviews every asset and reads the parent report.

**Parent area**:
One screen for every game (`src/parent/`), behind the parent gate (a 2-second hold, then the parent's year of birth). Each
entry page opens it at its own game's section; each game declares its part in `src/<game>/parent/index.ts`.

**Gate**:
How a parent enters a parent screen: a 2-second hold on the held button, then the parent's year of birth on a number pad. Nothing is stored; a wrong year closes it with no message.
_Avoid_: age gate, login

**Parent area sections**:
Child, Sound, Progress, the open game's own settings and reset, Data, Developer, top to bottom.

**Device settings**:
The one sound setting of the device (effects, music, volume) for every game. It is not a save of one game.

**Play time**:
Minutes the child played each game per day, kept in a small ledger for the Progress section.

**Production / staging**:
What the child plays, and the merged work before it is released. They share one origin, but never one save.
