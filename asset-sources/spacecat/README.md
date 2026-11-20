# Space Cat asset sources

Space Cat is adapted from **Space Cat Math** by Igor (Ray's dad). He gave permission to use its pictures, its tune,
its sound effects and its lane-and-zoom mechanic in alef. The permission covers this public repository.

The credit line on the home card is `קרדיט: איגור אבא של ריי`. No screen of the game shows it.

## The original's pictures

These 9 files are the original's pictures, byte for byte. They are in `src/spacecat/assets/img/`.

| File | SHA-256 | Where it is used |
| --- | --- | --- |
| `space-bg.png` | `a4380a6e7e88c1041e38cccdca26385cea69cb2bff08a9c1153caef50a293689` | the background of every screen; the home card |
| `cat-ship-1.png` | `2b568ef9161a79d2e0910c292ad79821de6e604d89ba3d1f9923bb1b0a54f0ed` | the first ship (play, cover shelf, home card) |
| `cat-ship-2.png` | `fd51aff1640fbbe4338733401e1bbcba4c396087e5d6094183f6ec2f4b7473cf` | the second ship, unlocked at level 4 |
| `cat-ship-3.png` | `006614ab2c5415ba2009ee072ee976ed83511955d88d147ea177e934dbd91fba` | the third ship, unlocked at level 7 |
| `surface-1.png` | `3e655f4144cc661f988f65e34779f0a65d43a783134ef30beff6d698aa9ae29c` | the surface of the planet in lane 1 (and the home card) |
| `surface-2.png` | `b2a7f869d01e9cd05eef00d78f84a0204d7c8bb34f9bd818e8bda95cdc98b813` | the surface of the planet in lane 2 |
| `surface-3.png` | `fab8db333477e1d68eb3fd616b42c9341078497a4ea711e93a1744a37e6747d6` | the surface of the planet in lane 3 |
| `surface-4.png` | `e7538ba45cf4320745bbc4529a20e438ac1a8a8add8a175c062eb214034a43b4` | the surface of the planet in lane 4 |
| `cat-thumbs-up.png` | `42dc9d3552f738ed0e5db2db760dd0b28931ab86d7219b52f13d6d32db68b8f0` | the level-done screen |

## Code

The code ports (the planet renderer, the coded sound effects and the tune) are marked in their headers:
`// Ported from Space Cat Math by Igor (Ray's dad), used by permission. See asset-sources/spacecat/README.md.`
The original's code is not in this repository.

## Voice requests

The voice lines use Book 2's narrator voice. The text of each line is in `src/spacecat/audio/lines.ts`;
`scripts/spacecat/export-audio-catalog.ts` makes the catalogue for the voice pipeline (see
[../duel/README.md](../duel/README.md), *Make audio*). `audio.json` holds the request of every take (2 takes for each
line); `chosen` names the take that the parent picked, and only a chosen take is copied into the game. The spoken text
of three lines differs from the caption: שִׂיא is spoken from "שִׂי", and the kamatz katan of כָּל from "כֹּל".
`new-best` reuses Book 2's take `new-best-1.mp3`.

## Home card picture

None yet. The home card is built from the game's own pictures. If a painted card picture is made, record its request here.
