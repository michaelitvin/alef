# Shared (`src/shared`)

Code that two or more games use. A game may import from here. Code here never imports from a game.

| Module | What it gives |
| --- | --- |
| `stagingStorage.ts` | The `staging:` prefix on every save in the staging build, and `?copy-prod`. Every entry point imports it first ([ADR 0001](../../docs/adr/0001-staging-shares-the-origin.md)). |
| `adaptive.ts` | Desirable difficulty: `predictedMistakeRate`, `pickNearTarget`, `pushRecent`, `Tally` |
| `audioCore.ts` | One Howl cache, `playOnce` with a safety timeout, `unlockAudio`, `VOICE_RATE` |
| `telemetry.ts` | `createTelemetry(key, { game })`: the capped log the parent can export. Every event has `g` (its game) and the page load's one session id `s`. `readLog`, `filterEvents` and `exportDoc` read and export logs without an instance. `TELEMETRY_CAPS` holds the caps (a quarter in staging); the first duel's log is append-only and is never trimmed. `?copy-prod` copies no `*-telemetry` key. |
| `player.ts`, `GenderQuestion.tsx`, `PlayerSetting.tsx` | The child's gender (boy or girl forms of every line), asked once |
| `deviceSettings.ts` | The device's one sound setting for every game (`alef-device`: `{ v: 1, sfx, music, volume }`), seeded once from Book 2's save, else the clock's, else defaults. `useDeviceSettings()` follows changes from other pages. The lessons' voice follows `volume` only; `sfx` gates effects, never a voice line. The old `settings.sfx/music/volume` fields in Book 2's and the clock's saves stay, unread. |
| `rehydrateOnRestore.ts` | Reload a persisted store when the browser restores a page from its back/forward cache, so the page does not write back an old copy of a save that another page changed |

Each game still has its own audio layer, preload, pause cover and parent screen. See the *Known friction* section in
`src/duel2/README.md` and `src/clock/README.md` before you copy one for a new game.

Retired save keys: `alef-settings` (an old settings store that nothing ever read; removed) stays unused for good. Do
not give the name to a new save, because old browsers can still hold it.
