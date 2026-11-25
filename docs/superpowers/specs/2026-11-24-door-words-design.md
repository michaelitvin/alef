# Door words: ten new words that share a first syllable (addendum)

Date: 2026-11-24. Status: design, for review. No code yet.

## Goal

The parent (2026-11-24): the doors must make him read the whole word, not only the first letter or syllable. Today the
11 door words (`src/spellquest/data/words.ts`) have only two letter pairs (גָמָל / גֶזֶר, כַּדוּר / כֶּלֶב), and no two words
share a first syllable. A key with the right first syllable is always the right key.

## What the engine allows (read from the code)

- A door word has exactly **two** syllables: the door plate lights two parts (`doorParts` in `controller.ts`). A
  three-syllable word needs an engine change. All ten words below have two.
- Syllable 1 is open (no closing letter): the spell book shows only the last syllable's `tail` (`spell.ts`).
- No final forms (ך ם ן ף ץ; `data.test.ts`). Dagesh only in בּ כּ פּ: the game drops other dagesh (as in כַּדוּר).
- Letters and marks: the 26 items and 9 marks of `content.ts`. No shva, no chataf, no chirik male (a yod as a vowel).
  These rule out חֲמוֹר, כַּפִּית, פַּטִּישׁ, תַּפּוּחַ (furtive patach), דְּבַשׁ (shva na).

## The ten words

Each new word shares its first letter **and** its first vowel with at least one other door word.

| # | Word | Say | Gloss | Same first syllable as | Syllables (item + mark, tail) | Stage |
|---|---|---|---|---|---|---|
| 1 | כֶּתֶר | KE-ter | crown | כֶּלֶב, כֶּבֶשׂ | kaf segol · tav segol + ר | 2 |
| 2 | כֶּבֶשׂ | KE-ves | sheep | כֶּלֶב, כֶּתֶר | kaf segol · vet segol + שׂ | 3 |
| 3 | גֶרֶב | GE-rev | sock | גֶזֶר | gimel segol · resh segol + ב | 2 |
| 4 | גָדֵר | ga-DER | fence | גָמָל | gimel kamatz · dalet tsere + ר | 2 |
| 5 | חָלָב | cha-LAV | milk | חָתוּל, חָגָב | het kamatz · lamed kamatz + ב | 2 |
| 6 | חָזִיר | cha-ZIR | pig | חָתוּל, חָלָב | het kamatz · zayin chirik + יר | 2 |
| 7 | נָחָשׁ | na-CHASH | snake | נָמֵר | nun kamatz · het kamatz + שׁ | 2 |
| 8 | נָמֵר | na-MER | tiger | נָחָשׁ | nun kamatz · mem tsere + ר | 2 |
| 9 | פָּרָה | pa-RA | cow | פָּנָס | pe kamatz · resh kamatz + ה | 2 |
| 10 | פָּנָס | pa-NAS | flashlight | פָּרָה | pe kamatz · nun kamatz + ס | 2 |

Stage: a word with a soft form (vet in כֶּבֶשׂ) is stage 3, as כֶּלֶב and סֵפֶר. The others are stage 2, so they also come
in stages 2 and 3 (`doorWords` takes stages 2–3). **Parent decision:** keep that, or show the new words only at stage 4.

Words that I did not take: כּוֹכָב (stars are a collectible on the screen; a picture word must not look like a UI
icon), פֶּרַח (looks like the rose of וֶרֶד), אֹרֶז (rice grains look like nikkud dots), שֶׁלֶג (snow), גַּמָּד (looks like
the merchant gnome), חָמוֹר (it is חֲמוֹר, chataf).

## Picture briefs

Use the prompt of `pw-ball` in `asset-sources/spellquest/images.json` (gemini-3-pro-image, the tower's style sheet B and
concept p3 as the reference, one subject on flat magenta, no text, no dots). The subject sentence for each:

1. `pw-crown`: a golden king's crown, front view, 5 points, big smooth gems or none (no small round gems). Not a tiara.
2. `pw-sheep`: a white woolly cartoon sheep, full body, side view; wool as big soft curls, not dots; no horns, no beard
   (he called a goat "sheep": the sheep must not look like a goat).
3. `pw-sock`: one colourful striped child's sock, side view, toe to the left. (Was גֶשֶׁר / bridge; replaced 2026-11-25 after the parent's second review: "Could be river, or arc".)
4. `pw-fence`: a short piece of a wooden picket fence, 5 pointed boards and 2 rails, front view. No gate (no door).
5. `pw-milk`: a small clear glass of white milk next to a closed blue milk carton with a cow on it, both upright, nothing pours (the pouring take "spills unnaturally"; v7: "put a cow on the carton, glass smaller", 2026-11-25).
6. `pw-pig`: one pink cartoon pig, side view, round snout, curly tail. (Was חָגָב / grasshopper, then חָצִיל / eggplant; the parent dropped the eggplant on 2026-11-25 as innuendo.)
7. `pw-snake`: a green cartoon snake in a loose coil, friendly face, forked tongue. No spots.
8. `pw-tiger`: a cartoon tiger, full body, walking, side view, bold black stripes, large and strong. It must not look
   like the orange cat of `pw-cat` (sitting, front view).
9. `pw-cow`: a black-and-white cartoon cow, full body, side view, pink nose. No bell.
10. `pw-flashlight`: a chunky handheld flashlight, diagonal, switched on, a wide soft yellow beam. No thin bar with a
    dot (it looks like a vav with a mark), no rays as dashes.

Review each picture without its word: what will the child call it? Risks to check: milk ("כּוֹס"), fence, tiger next to
the cat, sheep ("כִּבְשָׂה"). Backup if one fails: חָזִיר and חָלָב cover each other in the חָ group.

## Voice

Make `w-<id>` as the other door words: ElevenLabs `eleven_v4`, `language_code` "he", voice Will, stability 1, seed 1,
text "<word>." (see `w-dog` in `asset-sources/spellquest/audio.json`). One take each (a real word in a set); more takes
only for a rejected one. Steps (`asset-sources/spellquest/tower/README.md`): a batch file with the 10 clips, the
generator, the automatic take check (transcript, length, rhythm) and the stress check, the parent's review page, the sync
into `src/spellquest/assets/audio/voice/` (silence trimmed), the request into `audio.json`. Pronunciation notes (`pronunciation.md`):

- The voice reads ב without a dagesh as "b": check by transcript that חָלָב, גֶרֶב, כֶּבֶשׂ say "v". If not, try the
  plain spelling (חלב), then ו in the spoken text.
- Stress: כֶּתֶר, כֶּבֶשׂ, גֶרֶב on the first syllable (as גֶזֶר, כֶּלֶב); all the others on the last. Check each take by
  measurement. To move the stress, try a meteg first.
- Do not let the voice add a vowel after the last letter (פָּנָס, not "panasa"; פָּרָה ends in "a").

## The keys with 21 words

First-syllable groups: כֶּ {dog, crown, sheep}, חָ {cat, milk, pig}, גֶ {carrot, sock}, גָ {camel, fence},
נָ {snake, tiger}, פָּ {cow, flashlight}. No partner: tent, ball, fox, cake, house, rose, book (7 words).
First-letter groups: ג {camel, carrot, sock, fence}, כ {ball, dog, crown, sheep}.

`doorKeys` (`rounds.ts`) must change. Today key 2 is "same first letter", then "same first vowel group". With the ג
group of four, a camel door picks 2 of {carrot, sock, fence} and misses fence one time in three. New order at stage 4:

1. the same first syllable (same letter and same vowel group),
2. the same first letter,
3. the same first vowel group,
4. any door word.

Example: the dog door gets crown and sheep; the camel door gets fence and one of carrot or sock. Below stage 4 the
keys stay random.

## Tasks

1. Pictures (10 images) and voice (10 clips), screened, then the parent's review. Record each chosen take in
   `asset-sources/spellquest/images.json` and `audio.json`.
2. Add the ten words to `WORDS` (`words.ts`).
3. `doorKeys`: the new order, with a test: at stage 4 a word with a first-syllable partner always gets one as a key.
4. Check on the verify build: the shin and sin dots of the tails (נָחָשׁ, כֶּבֶשׂ) and the width of the plate for the
   widest word (גָדֵר or חָזִיר).

## Cost (from the records)

- Pictures: gemini-3-pro-image, about $0.15 per image (Book 2 ledger: 20 images about $3.0). 10 images with a few
  retakes: about $2. The cheaper gemini-2.5-flash-image (about $0.04 interactive, $0.02 by batch) was used only for
  the English course's own style.
- Voice: `eleven_v4` bills 0.25 credit per character: 10 short words cost almost nothing.
