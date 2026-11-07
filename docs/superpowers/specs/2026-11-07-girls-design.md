# Girls too: לשון נקבה and a girl wizard in every game

Status: approved by the parent in conversation (2026-11-07). Read [docs/minigame-rules.md](../../minigame-rules.md)
first; every rule applies.

## Why

The games speak to the child in the masculine (תִּתְפֹּס, אַתָּה, שֶׁלְּךָ) and show a boy wizard. Other children in the
class will play (the parent is sharing the games with the class). The parent: "Girls should be happy playing any part
of the game."

## Goals

1. One setting, "boy / girl", shared by all the games (Book 2 at /duel2/, the nikkud duel in the main app, the clock
   game at /clock/), kept on the device.
2. If the setting is not set, the game asks the child before the first round: the voice asks "אַתָּה בֵּן אוֹ אַתְּ בַּת?"
   (one take that works for both, e.g. "מִי מְשַׂחֵק? בֵּן אוֹ בַּת?") and shows two big pictures — the boy wizard and the
   girl wizard; the child taps one. No text (rule). The parent can change it in each game's parent area.
3. Every line that speaks to the child has a feminine version (verbs, pronouns, adjectives: תִּתְפְּסִי, אַתְּ, שֶׁלָּךְ,
   עָנִית נָכוֹן…), recorded with the same voice, and the game plays the version that matches the setting. Lines that do
   not address the child (words, letter names, syllables, the narrator talking about itself) stay single.
4. A girl wizard: a girl version of every wizard picture the child sees (Book 2: on the broom, casting, dizzy, idle, and
   the Book 2 menu card; the nikkud duel: idle, casting, dizzy, and its menu card). Same art style, same poses and
   framing as the boy, so every screen works unchanged. A girl sees her wizard everywhere the boy's would be. The clock
   game has no player character: only its voice changes.
5. The parent reviews all of it on the review pages: the new feminine lines (and the question line) on each game's audio
   review page, and the girl wizard pictures where the parent can OK or reject each picture (add image items to the
   Book 2 review page, or the matching review page per game).

## Non-goals

Gendering the narrator or the monsters. English lines of the clock game (English addresses both alike).

## Anti-goals

- A girl hearing a masculine line, or seeing the boy wizard, anywhere (in the game, a demo, an explanation, the end
  screen, the menu card) once she chose "girl".
- Text on a child screen; a way out of a game on a child screen.
- Any host detail in the repo or in commit messages (no host names, routes, passwords, or host paths).

## Decisions

- Store: one small shared key in localStorage (e.g. `alef-player` `{ gender: 'boy' | 'girl' }`), read by all three
  entries (they share the origin). Default: unset → the question. Existing saves keep all progress; until the child
  answers, the game asks once at the next start.
- Audio ids: a feminine take is the masculine id with a suffix (e.g. `q-cauldron-1` → `q-cauldron-1-f`); a missing
  feminine file falls back to the masculine one (never silence), and telemetry notes the fallback.
- Wording: the feminine text of each line is written by the builder with full nikkud, checked against the rules
  (native phrasing, no "!" endings, no "…" moans, words the voice says wrong: עוֹד, קְצָת, בָּאוֹסֶף, קְטַנָּה), and every
  take goes through the existing automatic checks before the parent's review.
- Art budget: up to about $4 of Gemini image calls in total for the girl wizard pictures (reference the boy sprite for
  pose and framing; key and crop exactly like the boy's), logged in the host ledger.
- Telemetry: the setting and when it was chosen (`player {gender, by: child|parent}`).

## Left to the builder

The question screen's layout and animation (within the rules: a demo-like hand is not needed for two big pictures),
the feminine wording, how each game's audio lookup picks the version, the review-page changes.

## Builder decisions (2026-11-07, during the build)

- The setting: `alef-player` `{ gender, by, at }`; the parent's control has a third option, "not set", so the next start
  asks the child again. Each game's parent area shows the same control (the nikkud duel: on the progress page).
- The question: the boy stands on the right (named first; the child reads right to left); each picture glows as the
  voice names it; a tap waits until the question ends (it is an instruction); it asks again after 8 s. The clock game
  shows the wizards of the other games (it has no player character). The nikkud duel plays Book 2's take of the question
  (the same voice); the clock records its own (Charlotte), in Hebrew and in English (for a device set to English only).
- Wording that changed in the feminine because the voice said the masculine in every spelling (rule: change the words):
  Book 2 boss-win-2 "וָואוּ, הַמִּפְלֶצֶת בָּרְחָה מִמֵּךְ" (for הִבְרַחְתְּ); the duel's intro "שִׁמְרִי עַל הַמִּגְדָּל" (for
  הָגֵנִּי) and game over "אַתְּ קוֹסֶמֶת אֲמִיתִית" (for נִלְחַמְתְּ). Other feminine past verbs keep their text and are
  spoken with a final ט (נִצַּחְתְּ → "ניצחט"); the spoken text differs, the caption does not.
- The duel's "new monster" line in the feminine has no "!" (rule), unlike the approved masculine take.
- The girl pictures are the boy's four poses redrawn (the boy sprite is the reference), keyed like the boy, and fitted into
  the boy's exact canvas, so no screen changed its layout. The nikkud duel uses the same three pictures as Book 2.
- Telemetry: `player {gender, by: child|parent}` when it is chosen; `voice-fallback {id}` once per id when a feminine
  file is missing.
