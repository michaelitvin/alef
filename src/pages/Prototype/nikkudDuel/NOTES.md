# PROTOTYPE — Nikkud Wizard Duel

**Question:** does the race-against-the-clock wizard duel feel fun for a 7-year-old, and how big should the effects be?

**Design doc:** https://claude.ai/code/artifact/b7b4518b-0efb-4a0d-a864-ead7332fe7e4

**Route:** `#/prototype/nikkud-duel` (`?variant=A|B|C` sets effect intensity: boom / mega boom / gentle; `?walk=<ms>` fixes the monster walk time).

**Phone build:** `npx vite build --base=/nikkud-duel/play/ --outDir /data/ws/scratch/nikkud-duel/play --emptyOutDir`, served by Caddy at `/nikkud-duel/play/`.

What's in it: screens A–D with shva, endless survival (3 hearts), waves of 5 monsters (wave 3 adds sound and name screens and grows the pad from 4 to 6), a 3-HP boss dragon every 5th wave, MEGA lightning after 8 hits, a run summary listing the most-missed marks (which come up more often). Art is emoji placeholders on the "night sky magic" palette. Speech uses the browser's he-IL voice and SFX are synthesized. The final game uses pre-rendered ElevenLabs audio.

## Verdict

_(fill in after playtesting with him: which preset, walk speed, what he loved or ignored)_
