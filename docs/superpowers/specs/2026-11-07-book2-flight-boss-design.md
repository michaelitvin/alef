# Book 2 — flight boss, rescue potion, gentler flight, end screen that pulls him back

Status: draft for the parent's approval. Builds on [the Book 2 design](2026-10-19-duel-book-2-design.md). Read
[docs/minigame-rules.md](../../minigame-rules.md) before building: every rule there applies (speech instead of text,
audio order, no way out on child screens, effects ring before the voice, praise words only twice, and so on).

## Why

- The child loved the bosses of the first duel. What he liked (the parent): each boss is different and there are
  several to discover, he hits it many times, and the win feels great.
- When he loses he gives up. Telemetry (Oct 24 – Nov 6, 13 runs): 10 of 11 ended runs ended on the broom flight, which
  is also his weakest screen (78% right, against 88–95% on the others). The flight gets faster on every catch (×0.97)
  and on every lap (×0.93 per cycle), so a good run speeds up until the broom beats him.
- His real mix-ups (same telemetry): dotted pairs פּ/פ, כּ/כ, בּ/ב, שׁ/שׂ (the most); o against u (חוֹלָם against
  שׁוּרוּק/קֻבּוּץ); i against e; ד/ר and צ/ע.

## Goals

1. A boss on the broom flight, in 4 kinds he discovers one by one, each made of one of his real mix-ups.
2. A rescue potion that gives a heart back.
3. A flight that follows him instead of speeding up until he fails.
4. Two-orb dot waves: the dotted letter and its twin only.
5. A dagesh he can see on an orb.
6. An end screen and a cover that show what he keeps and what waits for him, so he wants to play again.

## Non-goals

- Drawing letters (its own design, later). Matching print and handwritten letters (later).
- Bosses on other screens.

## Anti-goals (a failure even if it works)

- A boss he cannot beat in about a minute of good flying, or that feels scary.
- Any text on a child screen. Any way out of the game on a child screen.
- A potion that looks like a bomb or an enemy (the parent: "it needs to look like rescue ... intuitive").

## The boss (decided with the parent)

- **When:** on the broom flight, every second visit to the broom screen, never on the first broom visit of a run
  (builder: count broom visits per run; visit 2, 4, … is a boss visit). A boss visit replaces that visit's normal
  waves. Hearts refill at the start of the screen as on every screen.
- **Kinds** (art ready, see Assets):

  | kind | sprite | what it throws (the two sounds of each wave) |
  |---|---|---|
  | dot thief (raccoon with a sack of dots) | `boss-dot-*` | a dotted letter and its twin: בּ/ב, כּ/כ, פּ/פ, same vowel |
  | twin-headed bird | `boss-shin-*` | שׁ/שׂ, same vowel |
  | mimic (turquoise jelly) | `boss-mimic-*` | look-alike letters, same vowel: ד/ר, צ/ע (and other look-alike pairs the game already knows) |
  | o/u bat | `boss-bat-*` | one letter with o against u (חוֹלָם/חוֹלָם מָלֵא against שׁוּרוּק/קֻבּוּץ) |

  Each wave has **two orbs only** (two of the three lanes), and boss waves fly **slower** than normal waves (×1.3
  travel time). The sound to catch changes inside the pair (either member), announced as in the normal flight.
- **Which kind:** the kind whose mix-up he makes most now (from the game's confusion tallies), but prefer a kind he has
  not beaten yet when the scores are close, and never the same kind twice in a row. Stage gates: dot and shin kinds
  need stage 3 (dotted letters), the others stage 2.
- **Hits:** 8. Each right catch sends a spell bolt from the wizard to the boss; the boss shows its hit pose for a
  moment and one segment of its health bar goes out. The bar sits above the boss (no numbers).
- **Mistakes:** a mistake costs a heart, as in the normal flight (one heart per wave at most). The boss can end the run
  (the parent decided). The near-miss forgiveness of the normal flight applies.
- **Arrival:** the sky darkens, the boss swoops in from the right, boss music starts (the first duel's
  `music-boss-1.mp3`), and the voice says a short boss line (3 variations), then the first sound.
- **The win:** the defeated pose, a big burst of light, a celebration sound, the congratulation line (3 variations,
  spoken only the first 2 times as every praise), **3 bonus coins** that pop one by one into the top bar (stored as 30 stars on his kept total: coins stay
  `stars / 10`, one source of truth; the cover shows coins, not the star total). The first win
  against a kind is a bigger moment: the boss falls into a golden frame, which flies to the trophy shelf (the cover
  shows it from then on).
- **A pause** during a boss keeps the boss's hits and his hearts; only the waves start again (losing the hits would be
  the "gives up" problem again).
- **Facing:** the bosses sit on the right and face the wizard. `boss-dot`, `boss-shin` and `boss-bat` are drawn facing
  right and must be mirrored; `boss-mimic` faces left (recorded in `src/duel2/assets/facing.ts`).

## The rescue potion

- A heart-shaped glass bottle with little wings (`s-potion`), clearly a gift. It floats across the flight in one lane
  like an orb, on normal and boss flights.
- It appears only when he has lost a heart on this screen, at most once per broom visit (builder's call when, e.g. after
  the wave that cost the heart, with a gap of a wave or two). Catching it plays a gentle sound and a heart flies from the
  bottle into the top bar. Missing it costs nothing.
- It never counts as an answer (no star, no tally) and never collides with an orb's lane at the same moment.
- **The first time** it appears (a new element, rule): it flies slower, glows, and the voice says `potion-intro` while he
  flies (the flight does not stop). Saved as `potionIntroSeen`.

## A gentler flight

- Remove the per-lap speed-up (the `0.93 ** cycle` factor in `travelMs`).
- A catch speeds the flight up by 1% (not 3%); a mistake slows it as now (×1.12). Keep the pace limits.
- Base travel time 5800 ms (was 5200).
- The parent's flight-speed control and its reset in the parent area stay.

## Two-orb dot waves in the normal flight

- When the sound to catch is a syllable of a dotted letter that has a twin (בּ/ב, כּ/כ, פּ/פ, שׁ/שׂ), about a third of its
  waves show only the target and its twin (two orbs, two lanes).

## A dagesh he can see

- The font (Sigalit) puts the dagesh of פּ inside the curl, where it looks like part of the letter; on an orb פּ and פ
  look the same. Draw our own dagesh for בּ, כּ, פּ: remove U+05BC from the text and draw a filled circle in the open
  middle of the letter, measured per letter, the same way the shin dot is drawn today (`shinDots` in `Glyph.tsx`).
- Check every dagesh letter with every vowel on the glyph sheet at orb size before shipping.

## End screen and cover

- **End screen** (after a run): his coins with a ring around the coin that shows how close the next coin is (the stars
  toward it; it fills from where it stood before the run's last coin to now — the coins of the run already popped during
  play, so none pops twice); his crystals; the trophy of a boss won in this run; the next boss he has not beaten, as a
  dark silhouette (a teaser); his best. The play button is big and glowing. No home button (rule).
- **Cover:** a trophy shelf of 4 slots next to the crystal shelf: a beaten boss in a golden frame, an unbeaten one as a
  dark silhouette.
- **Taps:** every new thing answers a tap with a short line (rule): the trophies and silhouettes ("these are the
  monsters you beat; the dark ones still wait for you"), the coin progress ring.

## Voice lines (new; Hebrew with nikkud, checked as the rules say, generated with the existing pipeline)

- `boss-arrive` (3): a boss is here, e.g. "מִפְלֶצֶת! תִּתְפֹּס אֶת מָה שֶׁאֲנִי אוֹמֵר כְּדֵי לְנַצֵּחַ אוֹתָהּ."
- `boss-win` (3): e.g. "נִצַּחְתָּ אֶת הַמִּפְלֶצֶת."
- `boss-new` (1): the first win against a kind, e.g. "מִפְלֶצֶת חֲדָשָׁה בָּאוֹסֶף שֶׁלְּךָ."
- `potion-intro` (1): e.g. "שִׁקּוּי קֶסֶם! תִּתְפֹּס אוֹתוֹ, וְתְקַבֵּל לֵב."
- `info-bosses` (1), `info-coin-ring` (1).
- Final wording goes through the native-wording check of the rules; the parent reviews them on the review page (non-blocking).

## Telemetry (add)

`boss-start {kind}`, `boss-hit {kind, left}`, `boss-win {kind, ms, first}`, `boss-lose {kind, left}`,
`potion-show`, `potion-catch`, `potion-miss`; the `flight` event gets `boss: kind | null`.

## Parent area

- The screen gallery gets one entry per boss kind and one for the potion.

## Assets (ready, host-generated; provenance must be added to `asset-sources/duel2/images.json`)

`src/duel2/assets/img/boss-{dot,shin,mimic,bat}-{fly,hit,down}.webp`, `s-potion.webp` (gemini-3-pro-image, 6 images
incl. one retake, about $0.90 of the Book 2 image budget). Music: the first duel's `music-boss-1.mp3`. Sound effects:
reuse the existing set (`catch`, `hit`, `streak`, `crystal`, `lock`); a spell sound may be added from the sfx pipeline.

## Left to the builder

The boss's idle motion, the bolt and burst animation, the exact screen positions, how the potion lane is chosen, the
silhouette rendering (e.g. the fly sprite with a dark fill filter), the tap areas — all within the rules.

## My calls (not discussed with the parent; listed for him to check)

- Boss every second broom visit, never the first; 8 hits; boss waves ×1.3 slower; 3 bonus coins.
- Base travel 5800 ms, catch speed-up 1%; two-orb dot waves about one in three.
- Potion at most once per broom visit, only after a lost heart.
- Kind choice: most-confused (letter mix-up counts; o/u vowel counts for the bat), preferring unbeaten, never twice in a
  row; stage gates.
- Bonus coins stored as stars; the coin ring shows the progress to the next coin.
- A pause keeps the boss's hits; the potion's first appearance is explained while he flies.
- The 1% catch speed-up is Book 2 only (the first duel keeps its pace rule). The drawn dagesh covers בּ כּ פּ; the shuruk
  dot is left alone.
