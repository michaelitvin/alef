# Shared (`src/shared`)

Code that two or more games use. A game may import from here. Code here never imports from a game.

| Module | What it gives |
| --- | --- |
| `stagingStorage.ts` | The `staging:` prefix on every save in the staging build, and `?copy-prod`. Every entry point imports it first ([ADR 0001](../../docs/adr/0001-staging-shares-the-origin.md)). |
| `adaptive.ts` | Desirable difficulty: `predictedMistakeRate`, `pickNearTarget`, `pushRecent`, `Tally` |
| `gameAudio/` | A game's audio ([ADR 0003](../../docs/adr/0003-audio-through-a-player-port.md)). `kit.ts`: `createGameAudio({ … })` gives the voice queue (`sayParts`, `say`, `sayInfo`, `cancelVoice`, `stopVoice`), `playLine`, the feminine take, effects and music. `output.ts`: the device output, one per page (`useAudioOutput` follows the device setting and mutes on hide; `holdAudio`, `unlockAudioOutput`). `port.ts`: the player port; `howlerPlayer.ts` is the Howler adapter (the Howl cache, `playOnce`), `fakePlayer.ts` the one fake for tests (`installFakeAudio()`). |
| `telemetry.ts` | `createTelemetry(key, { game })`: the capped log the parent can export. Every event has `g` (its game) and the page load's one session id `s`. `readLog`, `filterEvents`, `exportDoc` and `exportFileName` read and export logs without an instance; a game declares its logs as `TelemetryLog`s for the parent area's Data section (the one export). `TELEMETRY_CAPS` holds the caps (a quarter in staging); the first duel's old log is frozen history: nothing writes it (ADR 0004). `?copy-prod` copies no `*-telemetry` key. |
| `download.ts` | `downloadJson(json, filename)`: hands the parent a JSON file (the telemetry export in the parent area's Data section). |
| `player.ts`, `GenderQuestion.tsx`, `PlayerSetting.tsx` | The child's gender (boy or girl forms of every line), asked once |
| `deviceSettings.ts` | The device's one sound setting for every game (`alef-device`: `{ v: 1, sfx, music, volume }`), seeded once from Book 2's save, else the clock's, else defaults. `useDeviceSettings()` follows changes from other pages. The lessons' voice follows `volume` only; `sfx` gates effects, never a voice line. The old `settings.sfx/music/volume` fields in Book 2's and the clock's saves stay, unread. |
| `shell/` | A game's root. `useGameShell({ preload, askGender, canStart, onPlay, welcome?, onAsk?, onHide? })` starts the preload on mount, follows the device's sound, mutes while the page is hidden (`usePageHidden`), and runs the play gate (unlock inside the tap, wait for the preload and the welcome, check the cover, ask boy or girl, play); it gives `{ play, loading, asking, question }`. `createPreloader({ fonts, images, voices, skipVoice, sfx })` is a game's preload (`READY_MS`). `usePauseHold(paused)` keeps the audio silent under a pause cover. |
| `HoldButton.tsx`, `parentGate/` | The held button (a 2 s hold, its ring fills; a tap only shows the hint). `<ParentGate label className onOpen onCancel? ring? overlay?>`: the gate of every parent screen: the held button, then the year of birth on a number pad under one written question for the parent (`acceptYear`: 18 to 100 years before now). Nothing is stored; a wrong year or a tap beside the pad closes it with no message (`onCancel`). Tests type a year with `parentGate/testing.ts`. |
| `rehydrateOnRestore.ts` | Reload a persisted store when the browser restores a page from its back/forward cache, so the page does not write back an old copy of a save that another page changed |

Every game plays through `gameAudio/` (Book 2, the clock, and the first duel as Book 2's tower); only `gameAudio/howlerPlayer.ts` imports Howler. The lessons' voice (`src/hooks/useAudio.ts`) still uses Howler directly, outside the kit. Each game has its own preload config and pause cover; the root goes through `shell/`, and every parent screen is the one area in `src/parent/`. See the *Known friction* section in
`src/duel2/README.md` and `src/clock/README.md` before you copy one for a new game.

Retired save keys: `alef-settings` (an old settings store that nothing ever read; removed) stays unused for good. Do
not give the name to a new save, because old browsers can still hold it.
