# The Spell Quest rename moves the saved keys, with a one-time migration

## Context

The names grew by accident. Book 2 was the second book of the Hebrew course, but it became a game with a run, a merchant
and a tower. The first duel (Book 1) became its tower (ADR 0002). The English course was called the English path, as if it
were a row of stations. The code, the pages, the save keys and the telemetry keys kept these old names: `duel2`,
`book2`, `alef-duel2`, `alef-duel-telemetry`. The parent decided (2026-11-22) on one set of words: Spell Quest, the
tower, the English course (see `GLOSSARY.md`). The design is `docs/superpowers/specs/2026-11-22-spell-quest-rename-design.md`.

The child has real saves on one device. A rename of a save key without a move would reset her progress.

## Decision

Rename everything, with no half measures: the folders and ids in the code, the page URL, the save keys, the telemetry
keys, the frozen log, and the field names inside the saves.

- **A one-time migration.** `src/shared/keyMigration.ts` has one exact list of moves. Every page runs it first, through
  `stagingStorage`. It copies a key, reads it back, compares it, and only then deletes the old key. It can stop at any
  point and continue on the next load. A marker key (`alef-migrations`) is written last.
- **Field names** change in each save's own version step (`alef-progress`, the Spell Quest save, the English save). A step
  is a pure function that keeps every value.
- **Old game ids inside old events stay.** The readers map the old ids to the new ones (`book2` to `spellquest`; an old
  first-duel event to `tower`). We do not rewrite compressed history.
- **The old URL** `duel2/` stays for good as a small page that redirects, with the query and hash, to `spellquest/`.
- **The check.** `?migrate-check` on staging runs the same migration on a copy of the child's real data and shows PASS or
  FAIL in the parent's Data section. It must show PASS before a release.

## Consequences

- The frozen log of the first duel (now `alef-tower-history-telemetry`) is about 1 M. Its move needs that much free
  space. Its step waits for space and tries again on each load. It never blocks the other steps, and no data is lost
  while it waits.
- A page of the old build can outlive the release (a tab left open, or Back to it from the back-forward cache) and write
  the old keys again after the move. Each load looks for them (a few `getItem`s) and moves them again: a late save moves
  over the new one if the new one is unchanged since the move (a fingerprint in the marker), else both stay and the Data
  section shows a conflict with both key names; a late open chunk becomes sealed chunks of the new log. A save whose
  move waits for space is read and written under its old key until it moves.
- The names changed once more (addendum of 2026-11-23: `-he` and `-en`). One step, `spellquest-two-names`, takes every
  earlier name as a source: the original names of production and the in-between names (`alef-spellquest`) that staging
  got from the first build. It runs once on every device, also where the first step is done. A page of either older build
  can write its old key late. Two sources of one save resolve oldest first, each against the next one that exists, by the
  same fingerprint rule; a conflict keeps both and stops that save there, and the store goes on with the newer old key.
- `?migrate-check` ends on a plain page with the result and two downloads: production's keys as copied (before) and the
  migrated keys (after), in the `?export-prod` file format. The two snapshots stay in memory only. "Continue" opens the app.
- Old ids live on inside old events. Each reader has to use the alias table in `telemetry.ts`.
- The old names stay in the old ADRs, in the specs and plans, and in the git history. They are history, not errors. Each
  affected ADR has a note that says so.
- Old links to `duel2/` keep working.
- 2026-11-23: two games, Hebrew Spell Quest and English Spell Quest; see the addendum of the rename design (`docs/superpowers/specs/2026-11-22-spell-quest-rename-design.md`).
