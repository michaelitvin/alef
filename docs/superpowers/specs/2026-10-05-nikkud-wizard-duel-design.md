# Nikkud Wizard Duel — Design

**Date:** 2026-10-05
**Status:** Approved by Michael on 2026-10-05; implementation plan next
**Design doc & mock:** https://claude.ai/code/artifact/b7b4518b-0efb-4a0d-a864-ead7332fe7e4
**Game:** `#/duel` (branch `feature/nikkud-duel`). The throwaway prototype it was distilled from was removed once the game shipped (it's in this branch's history).

## Overview

A race-against-the-clock minigame for drilling nikkud, made for a 7-year-old boy who should find it *explosive and magical*. **He can't read yet**, so the game never communicates through writing. Everything he needs is spoken, drawn or animated (see *Non-reader rule*).

A kid wizard stands on a tower on the left. Monsters walk in from the right, each carrying a clue. He taps the matching nikkud **rune** before the monster reaches the tower. A fireball flies, the monster explodes, the screen shakes and the combo grows. A wrong tap, or being too slow, means the monster bonks the tower and he loses a heart. Each run is endless survival: it ends when 3 hearts are gone.

Every hit and miss replays all three links for the mark (the mark, its spoken name and its sound), so the game teaches as well as drills.

## Decisions

| Topic | Decision |
|---|---|
| Core loop | Wizard duel: one monster and one clue at a time; tap the right rune before it arrives |
| Run length | Endless survival, 3 hearts |
| Screen types | **A** picture word → rune · **B** vowel sound (audio) → rune · **C** spoken nikkud name → rune · **D** rune → picture word |
| Picture words | Each sound is a **picture of a Hebrew word that starts with it**, with **several words per sound** (Michael), so he learns the sound rather than one picture. 17 words: a: אַרְיֵה אַנָּנָס עַכְבָּר אַבַּטִּיחַ · e: אֶפְרוֹחַ עֵץ עֵז · i: עִפָּרוֹן אִיגְלוּ אִי אִמָּא · o: אוֹטוֹ אוֹפַנַּיִם אוֹנִיָּה אוֹגֵר · u: עוּגָה עוּגִיָּה (a star-shaped cookie with no chips). Retired for ambiguity: the ear (it's the "listen" icon and hints at mute/shva), the finger ("tap", "one", shh) and the blueberries (a dot cluster). Plus a 🤫 "shh" face for silent shva. Each round picks a random word for its sound; on D all 6 pictures are re-picked and shuffled every round, so position gives nothing away. The feedback word is the one that was on screen. They're drawn in the game's art style. **They replace English letters** (playtest, Michael): English phonics clash with the mapping, since U sounds like "uh" (= kamatz) and American O like "ah", and he can't read anyway |
| Dropped | Audio-only answer buttons (rune → spoken sound/name), too slow against the clock |
| Same-sound marks | On A/B/D both marks of a sound count (kamatz = patach = "a"). On C only the named mark counts; its twin is the trap |
| Twin taps on C | **Forgiving** (Michael): the first twin tap in a round costs no heart and doesn't break the combo. The tapped twin wobbles in blue, the wizard says "כִּמְעַט!" plus that twin's name, and he tries again. A second wrong tap is a normal miss. Twin taps are tracked separately from wrong taps |
| Shva | Treated as *silent*: A shows the "shh" picture, B is a **mute monster** (mouth opens, puff of air), D has the "shh" picture as an answer, C is spoken normally |
| Rune look | The mark alone on a dotted placeholder (circle or box), **not** on a carrier letter; holam male and shuruk include their vav |
| Mark pool | All 10 marks from wave 1. This is intended: the duel is available from the start, and the weighting below brings up the hard ones |
| Practising failures | Weighted random: weight = 1 + 2 × misses this run + min(2, lifetime misses ÷ 5), with lifetime misses from the persisted per-mark stats. No extra "retry" mechanic in v1 |
| Non-reader | No instruction, label or feedback in writing. Spoken by the wizard, plus icons and animation (see *Non-reader rule*) |
| Language & direction | Spoken Hebrew. Tower and wizard on the **left**, monsters walk **right → left**. No Latin letters anywhere in the child-facing UI |
| Art | "Night sky magic" style: purple starry sky, glowing purple and gold. Sprites rendered from the approved style-anchor sheet B |
| Audio | All voice lines pre-rendered with ElevenLabs and **verified by Michael**. No device TTS in the shipped game |
| Voices | **Wizard = Will** (eleven_v4, Hebrew) speaks feedback (name, then sound) and instructions. **Monster = Clyde** speaks clues. Each monster plays the same verified Clyde recordings at its own rate (pitch and speed), so there's no extra review |
| Audio pacing | The next monster appears only after the wizard's line ends, plus a pause. A distinct **arrival sound** means "new question" |
| Clue timing | On B/C the monster stands still while its clue plays; the walk **and the clock** start when the clue ends. A replay doesn't pause the clock |
| Pause | A **⏸ button** in the HUD, and **automatic pause when the tablet locks** (Michael), via `visibilitychange`. While paused, an **opaque cover hides the whole game** (just the wizard and a big ▶) and audio is muted. ▶ resumes, and the interrupted round restarts from the right edge with its clue |
| Abandoned run | Leaving mid-run keeps the time and the per-round tallies already recorded, but doesn't count as a finished run, so bests aren't updated |
| Boss miss | Costs a heart; the boss **keeps** the damage already done (no HP reset) |
| MEGA | A MEGA kill is **not** counted as `correct`; it has its own counter (Michael). The wizard still says the name: every round teaches |
| Music | Several tracks by game speed, boss tracks, victory fanfare at the end of a run. Ducks under speech. On/off toggle |
| Devices | Phone portrait and **Android tablet landscape** (the main device): wide battlefield, one row of runes. A phone on its side keeps the portrait layout |
| Parent tracking | Per-mark and per-screen-type correct, wrong taps, too-slow misses, twin taps and MEGA kills, plus sessions, time and bests, persisted in the progress store |
| Entry point | **Available from the start**: a card on the Home screen plus a button on the Nikkud screen. Not gated by level unlocks |
| Spelling | צֵירֶה (not צֵירֵי) and פַּתָּח (with dagesh) everywhere in the app |

## Gameplay rules

### Screens

| Screen | Monster brings | Pad | Correct |
|---|---|---|---|
| A · Picture sign | The sound's picture word on the monster's sign ("shh" for shva); tap it to hear the monster say the word | Runes | Any mark in the target's sound group |
| B · Sound | Monster voice roars the vowel; tap the bubble to replay. Shva: mute monster plays the puff | Runes | Any mark in the target's sound group |
| C · Spoken name | Monster voice calls the name; tap to replay | Runes, always including the target's same-sound twin when it has one | Only the named mark (twin taps forgiven once) |
| D · Rune on shield | The target rune, box placeholder | 6 pictures, one per sound group, randomly chosen and shuffled each round | The target's sound group |

**Pad generation (A/B/C):** the target, plus (C only) its twin, plus one random mark from each other sound group, shuffled, until the pad size is reached.

### Waves and difficulty

| | Value (prototype start values, tune after playtest) |
|---|---|
| Wave length | 5 **kills**. A miss respawns a monster without advancing the count |
| Walk time | `max(3.5 s, 9 s − 0.65 s × (wave − 1))`; boss × 1.4. On B/C it is measured from the end of the clue |
| Waves 1–2 | Screens A and D only, 4-rune pads |
| Wave 3+ | A, B, C and D; 6-rune pads; the wizard announces "כִּשּׁוּפִים חֲדָשִׁים!" |
| Boss | Every 5th wave, after its 5 kills: 3 HP, a new clue per HP. A miss costs a heart but the boss keeps its damage. Bosses alternate: dragon (wave 5, 15…) and troll king (10, 20…) |
| Monster roster | 8 regular monsters unlocked progressively, each announced by the wizard ("מִפְלֶצֶת חֲדָשָׁה!"): fuzzy and blob (wave 1), imp (2), ghost (3), bat (4), mushroom goblin (6), rock golem (7), octopus (8) |
| Score | Hit = 100 + 20 × combo; MEGA hit + 200 |
| MEGA spell | Meter fills one per answered hit; at 8 a ⚡ button appears and the wizard says it's ready. It destroys the current monster (2 HP against a boss) and resets the meter |
| Run end | 0 hearts → summary (all pictures and numbers): wave, score, best combo, 🏆 personal best, and up to 3 most-missed marks this run. He taps one to hear its name |

### Music

| When | Track |
|---|---|
| Waves 1–2 | calm (wave option 3) |
| Waves 3–5 | mid (wave option 1) |
| Waves 6+ | fast (wave option 2) |
| Boss | the two boss tracks alternate |
| Run summary | victory fanfare (option 1), played once |

### Round timeline (audio pacing)

1. **First time a screen type, or the mute monster, appears in a run:** the wizard explains it (`line-how-*`) with the screen's icon on screen, *before* the monster appears.
2. The monster appears with its arrival sound, rotating between 3 picked variants.
3. **A/D:** the walk and the clock start at once. **B/C:** the arrival sound plays **to the end**, then 450 ms of silence, then the clue plays in the monster voice at this monster's rate. The walk and the clock start when the clue ends. (Playtest: with a fixed delay the vowel ran into the arrival sound and wasn't clear.)
4. Tap or timeout:
   - **Hit:** cast sound and fireball (260 ms), then impact (boom variants rotate, sparkle, shake, particles), +300 ms, then the wizard says **the name, the sound and the picture word** ("קָמָץ… אָ… כְּמוֹ אַרְיֵה"; for shva, the name then the silent puff). Then, if due, the combo line (every 5) and the MEGA-ready line.
   - **Twin tap (C, first in the round):** no heart lost. The twin wobbles, the wizard says "כִּמְעַט!" and the twin's name, and the clock keeps running.
   - **Miss:** the monster lunges at the tower, bonk sound, shake, heart lost, the right rune(s) pulse gold, +700 ms, then the wizard says the name, the sound and the picture word.
5. The next round starts after both the effects (hit 1.3 s, miss 2 s) **and** every wizard line have finished, plus 500 ms. Wave, new-spells and boss announcements play between rounds, each with a picture.

## Non-reader rule

He can't read yet. **Nothing he needs is written.** Nikkud marks appear only as the *content* being learned (the runes); sounds are shown as picture words. Nothing is written to tell him something.

- **Instructions are spoken by the wizard.**
  - At the start of a run: `line-intro`.
  - The first time each screen type appears: `line-how-A`, `line-how-B`, `line-how-C` and `line-how-D`.
  - The first mute monster: `line-how-silent`.
  - Between rounds: new wave, new spells, new monster, boss, MEGA ready, combo, "almost" (twin tap), run over and new record.
- **Icons instead of words:**
  - the screen-type icon above the pad: 👀 for A, 👂 for B and C, 🛡️ for D
  - ▶ to start or resume, ↻ to play again
  - 🎵/🔇 for music, ⚡ for MEGA, 🔥 ×N for the combo
  - wave progress as 5 dots that fill in
  - boss health as hearts above the boss
- **Result banner:** the mark and its picture word, while the wizard says the name, the sound and the word (Michael, from playtesting). The banner has no text.
- **Run summary:** the tower tips over, with the dazed wizard. The spoken line praises only the effort ("נִלְחַמְתָּ כְּמוֹ קוֹסֵם אֲמִיתִי! עוֹד פַּעַם?"). It never pairs a failure with praise: playtesting showed that "the tower fell, well done" sounds like praise *for* losing. The numbers have icons (⚔️ wave, ✨ score, 🔥 combo, 🏆 best). The missed marks are buttons that play their names.
- **Parent-facing UI is the exception:** the parent stats and the 📊 button may use text.
- **Check:** the visual checks in `/verify` include a scan that finds no Hebrew text in the child-facing screens (start, play, summary).

## Legibility rules (no look-alikes)

A child decoding dots and strokes must never meet anything that looks like a nikkud mark but isn't one. These are hard rules, enforced in code and checked visually:

- **No Latin letters in the child-facing UI.** English letters were dropped after playtesting. A lowercase **i** (a stem with a dot) looks like **cholam**, and English phonics clash with the mapping. Sounds are picture words instead.
- **Runes have their own look:** gold-white dot-and-line marks on a dashed placeholder. Nothing else in the UI uses that look.
- **The correct-answer state must keep the mark visible:** a dark gold background, so the cream mark still contrasts. (The first version washed the dots out.)
- **No picture or icon may look like a nikkud mark:** no dot clusters, rows of dots, short bars or small circles in a pattern. That covers the picture words (a chocolate-chip cookie or a bunch of blueberries fails), the HUD (wave progress is one continuous bar, not dots, stars or segments) and the decoration (the tower's band uses stars and moons, not letter-like runes).
- **No picture may double as a UI signal.** Picture words must not resemble the game's own icons or gestures: an ear (= "listen", the B/C icon), a pointing finger (= "tap" or "one"), lips or "shh" (that's shva's own picture only), eyes (= the A icon), stars (wave or score). And no symbol may mean two things.
- **No emoji in the child's UI.** Every icon (hearts, score, pause/play/replay, the screen-type icons, combo flame, MEGA bolt, boss hearts, bonk, music, trophy, sparkle particles) is a drawn SVG in `icons.tsx`. Emoji depend on the device's font: an older Android tablet may lack some (🤐 needs Android 7+), and the headless test browser has none, so they showed as empty squares. They also don't match the art.
- **Vav is drawn, never taken from a font.** Holam male (וֹ) and shuruk (וּ) use an explicit vav shape with a clear leftward head. Some fonts draw vav as a bare bar, and a bar plus a dot reads as "i" or "1".
- **The holam dot sits above the vav at top-left. The shuruk dot sits to the left of the stem, at mid-height.**
- **Mark positions:**
  - *Below the placeholder:* the patach bar, the kamatz T, the tzeire pair, the segol triangle, the chirik dot, the kubutz diagonal and the shva pair.
  - *Above at top-left:* the cholam dot.
- **Check:** a glyph sheet renders every rune in every state (normal, correct, wrong, reveal), every picture word, every HUD icon and the banners, and is reviewed visually before release (it's part of `/verify`). Every new picture or icon gets the same two-question audit: *could it be read as a mark?* and *does it already mean something else in the UI?*

## Sprite facing

Monsters walk **right → left**, so **every monster must face left**, toward the tower. The wizard faces right, toward the monsters. Image models don't reliably follow "facing left", and a monster walking backwards looks wrong immediately (the emoji in the early mock had exactly this problem).

- Each sprite's metadata records `faces: 'left' | 'right' | 'front'`. Sprites that face right are mirrored with `scaleX(-1)` when rendered. Front-facing sprites stay as they are.
- Motion cues count, not just the face. A ghost's trailing tail or a mid-step stride sets its direction too. (In the prototype the fuzzy monster and the ghost needed mirroring.)
- **Check:** the asset pipeline's art review shows every monster walking across the battlefield, and the facing is confirmed before release.

## Presentation

- **Battlefield:** the sky gradient with twinkling stars, a ground band, the tower sprite and the wizard sprite on top of it. The wizard has three poses: idle (gentle bob), cast (on a hit) and dizzy (on a miss).
- **Positions are measured, not assumed:** the tower's right edge and the staff tip are read from the rendered sprites, so the monster's stop point and the fireball origin are correct in every aspect ratio.
- **HUD (no words):** hearts, wave dots, score, MEGA meter, 🔥 ×N combo, and a time bar that drains while the monster walks.
- **Effects:** fireball, flash, shockwave ring, particles, monster flying away, screen shake, "+points". The intensity presets (`gentle`, `boom`, `mega`) are **used interchangeably** (Michael, after playtesting): each hit picks one at random (weights about 25% gentle, 50% boom, 25% mega), so the occasional mega hit is a surprise. A boss's final hit and MEGA kills always use `mega`.
- **Layout:**
  - *Portrait:* centred column up to 480 px wide; pads are 2×2 (4 runes) or 3×2 (6 runes).
  - *Landscape:* `(orientation: landscape) and (min-width: 640px) and (min-height: 500px)` → full-width battlefield and a single row of runes. A phone on its side (about 360 px tall) keeps the portrait layout.
- **Rune glyphs:** drawn in SVG with exact mark geometry, never AI-generated, because accuracy matters. See *Legibility rules*.

## Architecture

The pure game logic is separated from React, so it can be unit-tested. Pages, components, hooks, utils and types follow the app's existing layout. `src/assets/` is **new**: the app has no bundled assets today; everything so far uses `public/` and `BASE_URL`.

```
src/
  pages/Duel/DuelPage.tsx              # route /duel (lazy-loaded); owns the game hook + layout
  components/duel/
    Battlefield.tsx  Monster.tsx  Clue.tsx  SpellPad.tsx  RuneGlyph.tsx
    Explosion.tsx  ResultBanner.tsx  DuelHud.tsx  RunSummary.tsx  DuelStatsCard.tsx
  hooks/useDuelGame.ts                 # useReducer state machine + timers/audio sequencing + pause
  utils/duel/
    marks.ts                           # duel view of nikkud.yaml (id, name, soundGroup, vav)
    rounds.ts                          # makeRound, pad generation, weighted target pick (injectable RNG)
    rules.ts                           # isCorrect, isTwin, scoring, wave/boss/roster progression
    duelAudio.ts                       # Howler: unlock, SFX pools, voice lines, music + ducking
  assets/duel/
    sprites/*.webp + sprites.ts        # wizard ×3, tower, 8 monsters, 2 bosses, 6 picture words; `faces` metadata
    audio/{sfx,music,voice}/*.mp3      # imported as Vite modules (hashed, base-path safe)
  types/duel.ts
```

- **Game state** is a reducer:
  - States: `idle → instructing → playing(round, walking) → resolving(outcome) → playing | over`, plus `paused`, which can be entered from any playing state.
  - Timers and audio live in the hook, so the reducer stays pure and testable.
  - The hook guarantees the pacing rules: the clock starts only once the monster walks, and the next round waits for the effects and every wizard line.
- **Marks** come from `src/data/nikkud.yaml` (id, name, soundGroup). Shva's soundGroup is already `silent`. Holam male and shuruk are flagged for the vav glyph. **No new copy** of nikkud data. Copies already exist in `levelNodes.ts` and `NikkudNodeView.tsx`; consolidating them is out of scope.
- **Audio:**
  - The duel owns its unlock: on the ▶ tap it resumes Howler's AudioContext. The app has no shared unlock today.
  - Howler uses Web Audio, not `html5: true`, because per-monster rates need it. The rate stays within **0.7–1.3**, since the recordings are verified only at rate 1.
  - Every spoken line ducks the music to about 30%. A line that's missing or fails, or that never fires `end`, resolves after a safety timeout, so the game never stalls.
  - It honours the existing `settings.soundEffects` and `settings.volume` (see `useAudio.ts`). Music uses a **new `settings.duelMusic`** field, read as "on unless `false`", and the drawn music toggle writes it. It can't reuse `settings.backgroundMusic`: that defaults to `false`, and existing saves (including the tablet) already persist `false`, so the music would never play.
- **Loading:** about 4 MB of assets.
  - `/duel` is a lazy route.
  - The start screen preloads the voice lines, SFX and sprites while the ▶ button waits.
  - Music loads when its track is first needed.
- **Progress store:** a new `duel` slice in `ProgressState`:
  - Shape: `{ sessions, roundsMs, bestScore, bestWave, lastPlayed, byMark: Record<id, Tally>, byType: Record<A|B|C|D, Tally> }` with `Tally = { seen, correct, wrong, timeout, twin, mega }`.
  - `recordDuelSession()` runs on ▶. It increments `sessions` and sets `lastPlayed`.
  - `recordDuelRound(round, result, ms)` runs when a round ends. `result` is one of `correct | wrong | timeout | mega`. It bumps `seen` and that result for the mark and the screen type, and adds `ms` (the time from the monster appearing to the end of the round) to `roundsMs`.
  - `recordDuelTwin(round)` counts a forgiven twin tap. The round's final result is still recorded once.
  - `recordDuelRunEnd(score, wave)` runs only for finished runs (0 hearts). It updates `bestScore` and `bestWave`.
  - The slice is added to `partialize`. Zustand's default shallow merge already keeps the initial `duel` for saves made before it existed, so no custom merge is needed. That's covered by a test.
- **Parent stats:** a "⚔️ דּוּ־קְרַב" card on `ProgressPage`, which is parent-facing, so text is fine there. It shows sessions, minutes and bests, a per-mark table sorted by misses (correct, wrong, too slow, twin and MEGA), and a per-screen-type table.
- **Entry points:** a Home card (always enabled) and a button on `NikkudPage` above `JourneyPath`, shown whether or not the level is locked. Both are icon-led (⚔️ and the wizard).
- **Spelling pass:**
  - צֵירֵי → צֵירֶה in `nikkud.yaml`, `levelNodes.ts`, `NikkudNodeView.tsx`, `utils/audio.ts` and `syllables.yaml`.
  - פַּתָח → פַּתָּח (with dagesh) in `nikkud.yaml`, `levelNodes.ts`, `NikkudNodeView.tsx`, `syllables.yaml` and `decodeWord.ts`, and the expected strings in `decodeWord.test.ts`. They come from `decodeWord.ts`'s own table, which also covers חֲטַף פַּתָּח.
  - In `utils/audio.ts` `NIKKUD_NAMES_HEBREW`, fix the `tsere`/`tzeire` key mismatch and add the missing `holam-male` entry.

## Asset pipeline (outside the repo)

The tools live in `/data/ws/scratch/nikkud-duel/` on the Jetson, served at `/nikkud-duel/` behind basic auth:

- **Audio:**
  - `audio/gen.py <batch.json>` calls ElevenLabs. Speech uses eleven_v4 with the Hebrew language hint, plus sound-generation and music.
  - Results appear on the review page `/nikkud-duel/review/`. Michael picks or rejects there, and choices are saved to `choices.json`.
  - `sync_voice.py` copies the picks, or defaults for lines not yet reviewed, into the app.
  - **Ship rule: every voice line is Michael-verified before the release build.**
- **Art:**
  - `art/gen_ref.py` uses Gemini with sheet B as the style reference and renders one sprite per image on magenta.
  - `art/export_final.py` keys out the magenta with de-spill, drops the generator's corner mark, crops, and exports WebP at 420 px height or less. `DEHALO=1` recolours magenta-tinted glow edges to a warm glow (needed for the picture words).
- **Budget:** Gemini up to $10, about $6.50 used so far (43 images). ElevenLabs on Michael's plan.
- **Repo size:** sprites about 0.6 MB, music about 2.5 MB, SFX and voice about 1 MB.

## Error handling

- An audio file that fails to load or play doesn't block anything. The visual clue is still shown, and B/C bubbles keep their replay button. Effects and pacing fall back to fixed delays.
- If speech never fires an `end` event, a safety timeout per line resolves it.
- If storage is unavailable (private mode, quota), stats writes are skipped silently and the game still runs.
- Rotating the tablet mid-round re-measures the tower and staff positions. The round continues.
- When the tablet locks or the tab is hidden, the game pauses (see *Decisions*). Rounds scheduled while paused wait until he resumes.

## Testing

- **Unit:**
  - `rounds.ts`, with a seeded or injected RNG: pad composition per screen type, twin inclusion on C, pad sizes per wave, the weighted target pick (this run's and lifetime misses).
  - `rules.ts`: correctness per screen type including shva, `isTwin`, scoring, wave length counting kills, boss damage persisting through a miss, roster unlocks, MEGA.
  - `marks.ts`: mapping from `nikkud.yaml`.
  - Legibility: every sound group has a picture word and a sprite, and every monster sprite id has a `faces` entry.
- **Reducer:** a full run, with hits, misses, timeouts, a twin tap forgiven then a second wrong tap, a MEGA kill, pause and resume, and game over.
- **Store:** each `duel` action, and loading an old save with no `duel` key.
- **Component (RTL, fake timers, mocked Howler):**
  - A tap on the correct rune produces the hit banner and the score.
  - A wrong tap loses a heart and reveals the answer.
  - On B/C the clock doesn't start before the clue promise resolves.
  - The next round waits for the speech promise.
- **End-to-end:** the `/verify` skill drives the production build headless, in portrait and landscape: start → hit → miss → summary, and pause/resume via a forced `visibilitychange`, with no console errors.
  - Test hooks: a `walk` override (as the prototype's `?walk=`) and a `data-correct` attribute on pad buttons. Both exist only in dev and test builds.
  - Visual captures: the glyph sheet and each monster mid-walk. The **no-text scan** is automated: across the start screen and several rounds and results, the child-facing DOM (minus the parent button and stats) must contain no Latin or Hebrew letters. It caught a bug where an icon's internal name ("eye") was printed as text. Screenshots must show no empty squares (missing glyphs).
  - The headless browser has no emoji font, so emoji show as boxes in screenshots. Check the emoji UI on the tablet.

## Out of scope (YAGNI)

- Saying the vowel aloud into the microphone. That's a later feasibility spike.
- Audio-only answer screens (E/F).
- An "escaped monster returns" retry mechanic.
- Distinct recorded voices per monster: rate variants of Clyde cover this.
- Consolidating the existing copies of nikkud data (`levelNodes.ts`, `NikkudNodeView.tsx`).
- Offline/PWA support. The app has no service worker today; the assets are bundled, but the app still needs a network to load.
- Leaderboards, accounts and cloud sync.

## Open items before release

- **Playtest verdict:** walk speed and wave length (effects are decided: presets mixed at random).
- **Michael's review:** all voice lines: the wizard's 10 names, 5 vowel sounds, 17 picture words ("כְּמוֹ אַרְיֵה"), 14 instruction lines and "almost"; Clyde's 17 picture words; Clyde's 10 names and 5 vowels; the mute puff. Defaults are in use until then.
