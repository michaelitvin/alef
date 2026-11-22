# Compact telemetry in localStorage, with one budget; no IndexedDB for now

Renamed 2026-11-22: Book 2 is Spell Quest, the first duel is its tower, the English path is its English course; old paths and keys below are history (see ADR 0009).

Each game's log was one JSON array in localStorage with its own cap (Book 2 0.7 M characters, the clock 0.5 M), and every
flush rewrote the whole of it. A new game added a cap, so the sum grew with the games, and it had to stay under the
origin's quota (≈2.5 M characters in the strictest browsers) beside the saves, the frozen first-duel log (up to 1 M,
ADR 0004) and staging's copies (ADR 0001).

Now a live log is an **open chunk** (its own key, `{v:1, events, sealed?}`, the same format as before) and **sealed
chunks**: one page session's events each, in a compact form (a string dictionary, one schema per key list, columns,
exact trims of the envelope) deflated with `fflate` and stored as base64 under `<base>~<t0>~<s>-telemetry`. A flush
writes only the open chunk; a seal runs at idle once the open chunk passes 40k characters. The migration of the old
logs is that first seal. Every live log of every game shares **one budget** (`LIVE_BUDGET` 0.8 M, a quarter in
staging); past it, the oldest sealed chunk across all logs goes, folded first into its log's **roll-up**
(`<base>~sum-telemetry`: per day and item, counts, mix-ups, a latency histogram; `ROLLUP_BUDGET` 0.15 M). Production
keeps every chunk of the last 30 days (`RAW_FLOOR_DAYS`). The export decodes back to the same events as before.

## Why not IndexedDB

- It gives the saves no extra durability: localStorage and IndexedDB of one origin are in one eviction bucket, evicted
  all or nothing, and the 7-day rule of a browser tab on iPadOS clears both. `persist()` and a Home Screen icon are the
  mitigation either way.
- After this change telemetry fits: 0.8 M live + 0.15 M roll-ups + the frozen log (1 M at worst) + staging's quarters
  (0.2 M + 0.0375 M) ≈ 2.19 M characters, which leaves ≥ 0.3 M for the saves under the strictest bound, and ≥ 3 M bytes
  on iPadOS. Staging's own copy of the frozen log is deleted once by the staging build (owner decision, 2026-11-17).
  Binary blobs would save only ≈1.3× more than base64 text.
- It costs: an async open and upgrade, no sync write on `pagehide`, transactions, a test fake, and an async export.

## Consequences

- A game joins by declaring a `TelemetryLog` in its `parent/index.ts`, optionally with a `rollup` (what an evicted
  chunk of its log keeps: its items). `src/parent/registry.ts` registers every log on every game page, so core can seal,
  fold and evict any of them. No edit in `src/shared/`.
- Measured on a real first-duel export: ≈9× smaller than the old JSON (≈11.6× on its largest session). The synthetic
  test logs compress less (their values are uniform random), so the CI guard is lower.
- No event loses a field: the decoded events stringify byte-equal to the tracked ones. The `clock` field and the
  tower's hashed `url` are kept on purpose.
- Two tabs on one log stay last-writer-wins on the open chunk, as before; the open chunk's `sealed` list keeps a cut
  seal, an older view or an old build from losing or doubling events.
- A save under quota pressure evicts telemetry first (staging's chunks, then the oldest of any log, then open chunks'
  oldest events), never the frozen log, never an unreadable chunk.
- The Data section shows each log's size, the live telemetry against its budget, the browser's answer to `persist()`
  and a save that failed on the page.

**Revisit when:** raw history must stay longer than the budget holds; a sixth game makes the 30-day floor overflow the
budget; or the Data section reports a failed save on a real device.
