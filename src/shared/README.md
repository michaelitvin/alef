# Shared (`src/shared`)

Code that two or more games use. A game may import from here. Code here never imports from a game.

| Module | What it gives |
| --- | --- |
| `stagingStorage.ts` | The `staging:` prefix on every save in the staging build, and `?copy-prod`. Every entry point imports it first ([ADR 0001](../../docs/adr/0001-staging-shares-the-origin.md)). |
| `keyMigration.ts` | The one-time move of the old keys to the Spell Quest names (design 2026-11-22, ADR 0009); every page runs it through `stagingStorage`, and it moves again what a stale old-build page writes after it. `saveKeyFor` is where a save store reads and writes while the save's move waits for space. |
| `adaptive.ts` | Desirable difficulty: `predictedMistakeRate`, `pickNearTarget`, `pushRecent`, `Tally` |
| `gameAudio/` | A game's audio ([ADR 0003](../../docs/adr/0003-audio-through-a-player-port.md)). `kit.ts`: `createGameAudio({ … })` gives the voice queue (`sayParts`, `say`, `sayInfo`, `cancelVoice`, `stopVoice`), `playLine`, the feminine take, effects and music. `output.ts`: the device output, one per page (`useAudioOutput` follows the device setting and mutes on hide; `holdAudio`, `unlockAudioOutput`). `port.ts`: the player port; `howlerPlayer.ts` is the Howler adapter (the Howl cache, `playOnce`), `fakePlayer.ts` the one fake for tests (`installFakeAudio()`). `coded.ts`: coded sound (WebAudio code) plays behind the port as `coded:` urls (`registerCoded`); the Howler adapter plays it into the master gain. |
| `telemetry.ts` | The one entry for telemetry. `createTelemetry(key, { game })`: a game's log the parent can export (`track`, `flush`, `setRun`, `events`, `clear`). Every event has `g` (its game) and the page load's one session id `s`. `readLog`, `logStats`, `filterEvents`, `exportDoc`, `exportFileName` and `clearLog` read, count, export and clear logs without an instance. A game declares its logs as `TelemetryLog`s in its `parent/index.ts`, optionally with a `rollup` (what an evicted chunk keeps); `src/parent/registry.ts` registers them on every game page, so a new game needs no edit here. The tower's old history (`alef-tower-history-telemetry`, once the first duel's log) is frozen: nothing writes, trims or evicts it (ADR 0004). `?copy-prod` copies no `*-telemetry` key. See [ADR 0007](../../docs/adr/0007-compact-telemetry-in-localstorage.md). |
| `telemetryChunks.ts`, `telemetryCodec.ts` | A live log is an open chunk (its own key, `{v:1, events, sealed?}`) and sealed chunks (one page session each, compact and deflated, `<base>~<t0>~<s>-telemetry`). The open chunk is sealed at idle past `OPEN_SEAL_CHARS` (40k); its `sealed` list keeps a cut seal or a second tab from losing or doubling events. The codec is pure and exact: the decoded events stringify byte-equal to the tracked ones. |
| `telemetryBudget.ts`, `telemetryRollup.ts` | One budget for every live log of every game: `LIVE_BUDGET` 0.8 M characters, `ROLLUP_BUDGET` 0.15 M, a `STAGING_SHARE` of a quarter in staging, `RAW_FLOOR_DAYS` 30 (production never evicts a chunk with an event that recent to keep the budget). Past the budget the oldest sealed chunk of any log goes, folded first into its log's roll-up (`<base>~sum-telemetry`: per day and item). A chunk goes only when the stored open chunk holds no copy of it, and it leaves a tombstone in the roll-up, so a copy a stale tab writes back is dropped on read and never sealed or folded again. |
| `saveStorage.ts` | Child saves survive a full storage. `persistSaveStorage()` is the `storage` of every `persist` save; `safeSetItem` is for the small direct writers (player, device settings, play time). On a quota error it evicts live telemetry (sealed chunks first, folded into their roll-ups, then the open chunks' oldest events; never the frozen log, never a save; `freeTelemetrySpace` in `telemetry.ts`) and retries once; if that fails, the state stays in memory, nothing throws, and `saveFailed()` tells the Data section. `requestPersistentStorage(record?)`: the parent area asks once per page to keep the storage, when it opens behind the gate (a browser may prompt, so never on a child screen); the open game's log records `storage-persist`. A new save uses it. |
| `latinText.ts` | `LATIN_TEXT`: the style of Latin learning text (the English course's letters and words in Andika): no ligatures, so ff and fi show two letters. Hebrew text never takes it. |
| `blendSchedule.ts` | When the units of a blended word light (the English hint): `scheduleBlend(plan, clipMs)` stretches an even split to the clip's real length, `BLEND_GAP_MS` is the pause between two words. The arithmetic both the run's screens and the tower's board use; each keeps its own voice and waiting. |
| `download.ts` | `downloadJson(json, filename)`: hands the parent a JSON file (the telemetry export in the parent area's Data section). |
| `player.ts`, `GenderQuestion.tsx`, `PlayerSetting.tsx` | The child's gender (boy or girl forms of every line), asked once |
| `deviceSettings.ts` | The device's one sound setting for every game (`alef-device`: `{ v: 1, sfx, music, volume }`), seeded once from Spell Quest's save, else the clock's, else defaults. `useDeviceSettings()` follows changes from other pages. The lessons' voice follows `volume` only; `sfx` gates effects, never a voice line. The old `settings.sfx/music/volume` fields in Spell Quest's and the clock's saves stay, unread. |
| `shell/` | A game's root. `useGameShell({ preload, askGender?, canStart, onPlay, welcome?, onAsk?, onHide? })` starts the preload on mount, follows the device's sound, mutes while the page is hidden (`usePageHidden`), and runs the play gate (unlock inside the tap, wait for the preload and the welcome, check the cover, ask boy or girl unless the game has no `askGender`, play); it gives `{ play, loading, asking, question }`. `createPreloader({ fonts, images, voices, skipVoice, sfx })` is a game's preload (`READY_MS`). `usePauseHold(paused)` keeps the audio silent under a pause cover. |
| `HoldButton.tsx`, `parentGate/` | The held button (a 2 s hold, its ring fills; a tap only shows the hint). `<ParentGate label className onOpen onCancel? ring? overlay?>`: the gate of every parent screen: the held button, then the year of birth on a number pad under one written question for the parent (`acceptYear`: 18 to 100 years before now). Nothing is stored; a wrong year or a tap beside the pad closes it with no message (`onCancel`). Tests type a year with `parentGate/testing.ts`. |
| `HomeButton.tsx` | The way home to alef's home screen, the same in every game: `<HomeButton onHome className? />`, the house (`HouseGlyph`) in the held button, its look in `holdButton.css` (`.home-btn`); each game places it in its top-left corner. |
| `sleeper.ts` | The time a game's flow waits on (`Sleeper`: `sleep`, `after`, `every`, `frame`, `now`). `realSleeper` is the window's timers (fake timers drive it); `instantSleeper()` is a virtual clock that never waits (callbacks in time order, `now` jumps). Spell Quest's run takes it as `RunOpts.sleeper`. |
| `playtime.ts` | The play-time ledger (`alef-playtime`: milliseconds per game per day, kept 60 days) for the parent area's Progress section. `usePlaytime(game, active)` flushes every 15 s while a screen is visible and running. |
| `rehydrateOnRestore.ts` | Reload a persisted store when the browser restores a page from its back/forward cache, so the page does not write back an old copy of a save that another page changed |

Every game plays through `gameAudio/` (Spell Quest, the clock, and the tower inside Spell Quest); only `gameAudio/howlerPlayer.ts` imports Howler. The lessons' voice (`src/hooks/useAudio.ts`) still uses Howler directly, outside the kit. Each game has its own preload config and pause cover; the root goes through `shell/`, and every parent screen is the one area in `src/parent/`. See the *Known friction* section in
`src/spellquest/README.md` and `src/clock/README.md` before you copy one for a new game.

Retired save keys: `alef-settings` (an old settings store that nothing ever read; removed) stays unused for good. Do
not give the name to a new save, because old browsers can still hold it.

## Terms

These are code words, not words of the games (those are in [GLOSSARY.md](../../GLOSSARY.md)).

- **Game kit**: the code a game takes from here: the audio kit, the shell, the gate, device settings.
- **Page session**: one page load of a game, and the id `s` its telemetry events carry. _Avoid_: session (in the
  glossary, that is a path session).
- **Joined log**: the one export of the parent area's Data section: a file with one part per game's telemetry log.
- **Sleeper**: the seam for the time a flow waits on (`sleeper.ts`). Tests use a virtual one that never waits.

## Known friction

- The lessons' voice (`src/hooks/useAudio.ts`) uses Howler outside the audio kit, so it has its own mute and volume
  path (it follows the device's `volume` only).
