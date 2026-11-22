# Games get their audio through a player port; Howler is one adapter

Renamed 2026-11-22: Book 2 is Spell Quest, the first duel is its tower, the English path is its English course; old paths and keys below are history (see ADR 0009).

Book 2, the clock and the first duel each had their own copy of the voice queue, the duck, the mute and the effect
takes, and each test file replaced the audio in its own way (a voice seam, a long `vi.mock` list). Now one kit
(`src/shared/gameAudio/kit.ts`) holds that behaviour, and it plays every file through a small port (`port.ts`:
`play`, `preload`, `setMute`, `setVolume`, `unlock`). `howlerPlayer.ts` is the real adapter; `fakePlayer.ts` is the one
fake that every test uses.

## Consequences

- Howler's mute and volume are global, so the player in use, the device's sound setting and the mute on hide live in one
  module for the page (`output.ts`), not in each game. Two games on one page share them.
- The fake ends a stopped sound at once, as Howler does. The old voice seam did not: its promise ran on after a stop.
- Timings stay on `window.setTimeout` (the gap, the fades, the fake's sound lengths), so fake-timer tests see the same
  ticks as before.
- A new game calls `createGameAudio` with its own tables and numbers; it does not copy an audio module.
