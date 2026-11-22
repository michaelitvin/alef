# One telemetry log per game; the first duel's old log is frozen history

Renamed 2026-11-22: Book 2 is Spell Quest, the first duel is its tower, the English path is its English course; old paths and keys below are history (see ADR 0009).

The first duel became Book 2's tower (ADR 0002), but its hook still wrote to its own log, `alef-duel-telemetry`, with
its own run counter. So one Book 2 run was split over two logs, and every tower visit reset the counter. Now the tower
writes to Book 2's log, `alef-duel2-telemetry`: the duel's flow (`DuelController`) takes the log it writes to
(`telemetry`), adds `via: 'tower'` and its own visit counter `visit` to every event, and never sets the log's run
number, which stays Book 2's run.

The old `alef-duel-telemetry` is not merged into Book 2's log. Nothing writes it any more, and nothing trims, clears or
rewrites it (owner decision, 2026-11-16: an update does not delete the child's history). The parent area's Data section
exports it as it is, as "First duel (history)".

## Consequences

- Event shapes do not change: the tower's events keep their names and fields and gain `g`, `via` and `visit`. Book 2
  already uses `pause`, `resume`, `replay` and `abandon` for its own screens, so an analysis of Book 2's log must look at
  `via` to tell them apart.
- A merge would have mixed two run counters in one log, and could have pushed Book 2's live events over its cap (the
  frozen log can hold up to 1 M characters). Kept apart, the frozen log costs its own size in the origin's quota for
  good; the budget (`src/shared/telemetryBudget.ts`, ADR 0007) counts it at its old cap, 1 M, and the Data section
  shows its measured size. Staging's copy of it (`staging:alef-duel-telemetry`, from an old `?copy-prod`) is not the
  child's history: the staging build deletes it once (owner decision, 2026-11-17).
- One export (the Data section) writes one file with one part per log, each with its own `about`. The open game's log
  is read and cleared through its instance, so its unflushed events are in the file and a cleared log does not come back
  on its next flush; the other logs are read from storage.
- When the storage is full, a save write evicts live telemetry to make room (`src/shared/saveStorage.ts`, ADR 0007),
  never the frozen log. So the frozen log keeps its size even when the child's saves need the space.
- The tower in Book 2's screen gallery records nothing (no log), as the gallery records nothing else.
