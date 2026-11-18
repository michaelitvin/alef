# Parent area (`src/parent`)

One screen for every game, for the parent only: text and English are allowed. Terms: [GLOSSARY.md](../../GLOSSARY.md).
Every way in is the gate (`src/shared/parentGate/`). Each entry page mounts `ParentArea` and opens it at its own game's
section.

## Where things are

| Concern | Module |
| --- | --- |
| The frame: the sections top to bottom, the history entry that closes it | `ParentArea.tsx`, `parentArea.css` |
| The contract a game fulfils (`GameParent`: save key, logs, settings, developer tools, summary, detail lists, mix-ups, reset) | `types.ts`; a game declares it in `src/<game>/parent/index.ts` |
| The games in the area | `registry.ts` (add a game here) |
| The sections: Child, Sound, Progress, Data, Developer (the open game's own settings sit between Progress and Data) | `sections/*.tsx` |

## Rules

- A game's `parent/index.ts` stays light: it reads its save as raw text and loads its screens with `React.lazy`. The area
  must not create another game's store or telemetry instance (depcruise rules `parent-area-reads-games-only-through-their-parent-index`
  and `game-parent-index-is-light`).
- Only the open game shows its settings, reset and developer tools; every game's logs show in the Data section's one export.
- A phone held upright must not scroll the area sideways. Put every table (also in a game's section) in its own
  sideways-scrolling box, `<div className="pa-wide"><table>…</table></div>`; long strings break by themselves
  (`overflow-wrap: anywhere` on the area). The /verify driver checks every section at 390 and 412 px wide.
- The nav wraps to two rows on a narrow phone. `ParentArea` measures it (ResizeObserver) into `--pa-nav-h`, and a section's `scroll-margin-top` uses that, so a jump lands the heading below the nav at any nav height. Do not hard-code the nav height. The /verify driver checks the heading's top against the nav's bottom after every jump.
- `registry.ts` registers every game's `logs` with core telemetry on every game page (sealing, the shared budget and the
  roll-ups need them all). A new game's log, with an optional `rollup` (what an evicted chunk keeps), needs no other edit.

## Tests

`ParentArea.test.tsx` and `history.test.tsx` render the frame; `sections/*.test.tsx` cover Progress and Data. Open the
gate in a test with `src/shared/parentGate/testing.ts`.
