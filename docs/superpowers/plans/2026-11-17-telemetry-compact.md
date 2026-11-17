# Compact telemetry: sealed chunks, one budget, roll-ups — Implementation Plan

> **For agentic workers:** use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.
> Steps use checkbox (`- [ ]`) syntax. One commit per task (or a few), plain-sentence messages like `git log`.

**Goal:** The live telemetry logs take less space, cost less per flush, keep more history, and share one budget that
does not grow with the number of games. The export the parent's analysis scripts read does not change. The frozen
first-duel log does not change.

**Source:** the research proposal "Telemetry storage efficiency" that the parent approved (2026-11-17). Its step 1
(saves survive a full storage: `safeSetItem`, `persistSaveStorage`, `requestPersistentStorage`) is on main. This plan
does its steps 2–8, with the corrections under *Decisions*.

**Words:** *log* = a `TelemetryLog` a game declares (`alef-duel2-telemetry`, `alef-clock-telemetry`). *Open chunk* =
the log's own key, plain `{v:1,events}` as today. *Sealed chunk* = one page session's events, compact and deflated, in
its own key. *Roll-up* = per-day, per-item counts kept after raw events are evicted. *Frozen log* =
`alef-duel-telemetry`.

## Binding constraints (every task)

- The frozen log is never trimmed, rewritten, migrated, evicted or folded. Its stored value stays byte-identical and its
  export part stays byte-identical to today's `exportDoc` output for it.
- No event loses a field at the source. A field may be left out of storage only where the decoder rebuilds it exactly.
  The decoded events, stringified, are byte-equal to the events as tracked (same keys, same key order, same values).
- Raw events stay for at least 30 days in production (the export's default period).
- Every new key ends in `-telemetry`, so `?copy-prod` does not copy it.
- A failed decode never throws into a game and never deletes a chunk. Only the parent's Clear deletes it.
- Staging keeps a quarter of every budget. The lessons have no telemetry.
- A new game (Space Cat) joins by declaring a `TelemetryLog` in its `parent/index.ts`: no edit in `src/shared/`.
- The repo is public: no host names, addresses, ports, local paths or passwords in files or commit messages. Test
  fixtures are synthetic, built from the `track(` call sites. The child's real export is never committed (a local
  check may read it from a path in an env var, see Task 2).
- Each task ends green on `npm run check`, `npm run build` and `npx vitest run` (~8 min, 1411 tests at the start). Put
  your Node's `bin` first on `PATH`.

## Decisions (the corrections to the proposal)

1. **Compression: `fflate` (`deflateSync`/`inflateSync`), not `CompressionStream`.** Sync code keeps `readLog`, the
   instance's `events()` and the Data section sync, needs no `enc:'c'` fallback path, and runs the same in jsdom. Cost:
   one small dependency. Pin it exactly: `"fflate": "0.8.2"` (no caret; 0.8.2 is from 2024, 0.8.3 from 2026-05 is
   also fine). MIT license, compatible with the public repo; the license travels in `node_modules` and the lockfile
   names it. Measured: `deflateSync` + `inflateSync` + `strToU8`/`strFromU8`, tree-shaken and minified, is 9.3 kB,
   **4.6 kB gzipped**; the build check is ≤ 6 kB gzipped added. Deflate bytes, not a JS string: encode the compact
   JSON with `strToU8` (UTF-8, so Hebrew survives), base64 with `btoa` over 32k-byte slices (no spread of a large
   array). Output is base64, so 1 byte per char.
2. **`clock` is not always equal to `t`.** `clock: Date.now()` is computed before `track` reads its own `Date.now()`, so
   they can differ by a millisecond or more. The codec stores `clock` as an offset from `t`; it never drops it.
3. **The tower `line` event keeps its hashed `url`.** The hash changes per build, so the export cannot rebuild it. The
   codec's string dictionary stores each distinct URL once per chunk; that removes most of its cost.
4. **The raw floor is 30 days, not 7.** At ≈10× and the heavy design day (≈150k chars/day of JSON), 30 days are ≈450k
   sealed chars, inside the 800k budget. In staging (200k) the floor yields to the budget.
5. **No `(s, t, e)` dedupe.** Two events of one kind can share a millisecond. A sealed chunk records its session, its
   first `t` (`t0`), its last `t` (`t1`) and its `n`. The open chunk becomes `{v:1, events, sealed:[chunk keys]}`: the
   keys of the sealed chunks whose events it no longer holds (`sealed` is optional; an old `{v:1,events}` reads as
   `sealed: []`). The reader drops events from the open chunk only for a sealed chunk that is NOT in `sealed`: then the
   open chunk still holds that chunk's events, as the first `n` events of its session from the one at `t0`, and they
   are dropped only if that run's first `t` is `t0` and its last is `t1` (else nothing is dropped). The open chunk is
   always written whole from one consistent view (one `setItem`), so each state is exact: before the rewrite the
   events are in it and its `sealed` lacks the key; after, neither. An interrupted seal, a second tab that flushes an
   older view, and a build without this code that rewrote the open chunk can then neither lose nor double an event.
   (A rule that drops "the `n` events of `s` from `t0`" without the `sealed` list is wrong: after the rewrite it drops
   the session's next real events.) `sealed` keeps only keys that still exist.
6. **The open chunk is the log's existing key.** Today's format and key stay; pagehide still flushes it sync; the
   migration is the first seal of an oversized open chunk (Task 5), so there is one code path.
7. **Chunk keys:** `<base>~<t0 base36>~<s>-telemetry`, roll-ups `<base>~sum-telemetry`, where `<base>` is the log key
   without `-telemetry`. A key belongs to a log when it starts with `<base>~`. The `~` matters: `alef-duel~` must never
   match `alef-duel2~…`. The roll-up key also starts with `<base>~`, so a chunk is `ownsKey && isChunkKey` (not
   `~sum-`): never decode a roll-up as a chunk or count it in the live budget.
8. **Logs are registered by the parent registry.** Every game page imports `src/parent/registry.ts` (through
   `ParentArea`), so `registry.ts` calls `registerTelemetryLogs(GAMES.flatMap((g) => g.logs ?? []))`. Core then knows
   every log's base and roll-up on every page. `TelemetryGame` becomes `string`, so a new game needs no core type.
   The instances (`duel2Telemetry`, `clockTelemetry`) are created at module load, possibly before `registry.ts` runs:
   core looks registrations up when it seals, folds or evicts, never when an instance is created. (`src/shared` may not
   import `src/parent`, `.dependency-cruiser.cjs`, so the call stays in `registry.ts`.)
9. **Step 1 left two gaps:** no `save-failed` flag and the `persist()` answer is only logged as an event. Task 8 shows
   both in the Data section with the storage use.
10. **Order is by time, as today.** Today's log is one append-only array, so its events are in `t` order. Chunks break
    that: an own-session seal of session A, then of B, leaves A's rest in the open chunk after B's sealed chunk.
    `readLog` therefore merges its segments (each sealed chunk, and each session's run in the open chunk) by `t`,
    stable, ties in segment order. A test pins A1, B1, A-rest → A1, A-rest, B1.
11. **Nothing a game calls can throw.** `track`, `flush`, `setRun` and every scheduled seal, fold or eviction run in a
    try/catch. A seal that fails leaves the open chunk as it is.
12. **The main thread during play.** A seal (compact + deflate + read-back decode of ≈40k chars) is ≈5–30 ms here and
    plausibly 2–4× that on a low-end tablet. It runs in `requestIdleCallback` (with `{timeout: 10_000}`) where it
    exists. iPadOS Safari may not have it: then the fallback is a timer that fires after 2 s with no `pointerdown` or
    `keydown` (re-armed by each), never a 0 ms timeout during play. One chunk per slot.
13. **Each build budgets its own keys.** The production build sees `staging:` keys too (raw storage); its budget sums
    only unprefixed keys. Staging's quarter is kept by the staging build, which sees only its own keys.
14. **Owner decision (2026-11-17): special clock rounds count apart.** A clock `round` with `real: false` counts in the
    roll-ups as its own counter (`special`), never in the right or wrong tallies. The parent's rule: "Count special
    results separately. Do not count them as correct.
    *Note against the code (2026-11-17):* in `src/clock/useWorkday.ts` `real` is `!!real`, true only for the special
    round (the real-time "what time is it now?" of the first workday of a day); every ordinary round has
    `real: false`. Read literally, the decision would set every ordinary round apart and leave the tallies empty. The
    roll-up follows the parent's rule instead: the round with `real: true` counts in `special`, never as right or
    wrong; ordinary rounds count as usual. To confirm with the owner."
15. **Owner decision (2026-11-17): staging's copy of the frozen log goes, once.** `staging:alef-duel-telemetry` is a
    stale copy from an old `?copy-prod`, not the child's history. The staging build deletes it once and records that
    once in staging's own log (an event `frozen-copy-removed` with its size). The production key `alef-duel-telemetry`
    stays untouched and byte-identical forever (the production build never deletes it, and the staging build cannot
    see it). The Data section shows each log's size.

## Order and parallel work

| Task | Depends on | Parallel with |
| --- | --- | --- |
| 1 Keys, registry, export goldens | — | 2 |
| 2 Codec | — | 1 |
| 3 Exact trimming in the codec (field trimming) | 2 | 1 |
| 4a The chunk store (read side) | 1, 3 | 7 |
| 4b Sealing in `createTelemetry` (write side) | 4a | 7 |
| 5 Migration of the live logs | 4b | 7, 9 (draft) |
| 7 Roll-ups (the fold, pure; no eviction yet) | 1, 2 | 3, 4a, 4b, 5 |
| 6 One shared budget (evicts, folding first) | 5, 7 | 9 (draft) |
| 8 Export and the Data section | 6 | 9 (draft) |
| 9 IndexedDB decision and docs | all (final edit) | drafted any time |

Tasks 4a–6 and 8 edit `src/shared/telemetry*.ts`: run them in the order of the table. Task 7 only adds
`telemetryRollup.ts` and the games' `rollup`, so it runs beside them; Task 6 then wires the fold into eviction. So no
build ever evicts raw events without folding them.

New modules (all in `src/shared/`, `telemetry.ts` stays the one public entry): `telemetryCodec.ts`,
`telemetryChunks.ts`, `telemetryBudget.ts`, `telemetryRollup.ts`.

---

## Task 1: Keys, the log registry, and the export goldens

**Goal:** the key scheme and the registry exist, and today's export is pinned before anything changes.

**Files:** `src/shared/telemetry.ts`, `src/shared/stagingStorage.ts`, `src/parent/registry.ts`,
`src/parent/types.ts`, new `src/shared/__fixtures__/telemetry/` (synthetic events), tests beside each.

- [ ] Capture goldens on the unchanged code: for a synthetic Book 2 log (screens, tower `round`/`line`/`answer`/
      `outcome`/`choice`, `voice-fallback`, old events without `g`), a clock log (`round` with `options`, `abandon`) and
      the frozen-log string from `Data.test.tsx`, write `exportDoc(...)` output (with a fixed `exportedAt`) to fixture
      files. Make `exportDoc` take `now` for that (default `new Date()`). The fixture generator covers every
      `track('<name>'` call site in `src/` (grep them; a test fails when a call-site name is missing from the
      fixtures), with their real optional spreads (`firstAnswer`, `early`/`msFromAsk`, `gallery`, `owed`, `ended`),
      `settings` events with arbitrary keys, `null`s (`picture`, `tapped`), nested arrays/objects (`options`, `pad`),
      and several sessions over 40+ days in `t` order, with `clock` = `t`, `t ± 1..3`.
- [ ] Add `chunkKey(logKey, t0, s)`, `rollupKey(logKey)`, `ownsKey(logKey, k)`, `isChunkKey(k)` in `telemetry.ts`.
      `isTelemetryKey` stays the `?copy-prod` predicate; test it with every new key shape, with and without `staging:`.
- [ ] `TelemetryGame` → `string`; `TelemetryLog` gains optional `rollup` (Task 7 fills it). `registerTelemetryLogs` /
      `registeredLogs()` in core; call it from `registry.ts`. The frozen log stays in `FROZEN_LOG_KEYS`.

**Tests:** goldens exist and today's code matches them; `ownsKey('alef-duel-telemetry', 'alef-duel2~x~y-telemetry')` is
false; `copyUnprefixedOver` skips chunk and roll-up keys; a fake `spacecat` log registers without a core edit.

**Acceptance:** no behaviour change; goldens committed; the three checks green.
**Risks:** low. A golden that hides `exportedAt` badly makes later diffs noisy. **Size:** S.

## Task 2: The codec

**Goal:** a pure, sync codec: events of one session ⇄ a sealed chunk value.

**Files:** new `src/shared/telemetryCodec.ts` + test; `package.json` (`fflate`).

- [ ] Sealed value: a plain JSON header and a payload:
      `{"v":3,"s":"<session>","t0":<ms>,"t1":<ms>,"n":<count>,"enc":"cz1","d":"<base64>"}`. The header gives counts,
      age and eviction order without a decode.
- [ ] Compact form inside `d` (before deflate): a string dictionary; one schema per distinct ordered key list (the
      schema keeps key order, so the rebuilt object stringifies the same); rows of `[schema, dt, …values]` with `t` as
      a delta from the previous event. Strings at the top level go through the dictionary; nested values (arrays,
      objects) stay JSON values. `s` is hoisted to the header (one session per chunk).
- [ ] `encodeChunk(events): string`, `decodeChunk(value): TelemetryEvent[] | null` (null on any error, never throws),
      `chunkHeader(value)` (header only, null on error).
- [ ] An optional local check (`ALEF_TELEMETRY_SAMPLE` env var pointing at a private export): when set, round-trip its
      events and print the ratio; skipped in CI. Never commit the sample.

**Tests:** byte round trip (`JSON.stringify(decode(encode(evs))) === JSON.stringify(evs)`) on every fixture shape: nested
arrays and objects, `null`, a missing optional field, `g` missing on old events, floats, negative and large numbers,
unicode (Hebrew) in a value, an event whose keys come in a new order. A corrupt `d`, a wrong `v`, truncated base64 and
non-JSON each give null and no throw. Ratio on the synthetic fixture ≥ 6× vs today's JSON. Encoding is deterministic
(the same events give the same string: two tabs that seal one session write one value).

**Acceptance:** codec pure (no storage), ≥ 6× on fixtures, build size added ≤ 6 kB gzipped. Synthetic data compresses
about 2× better than real data, so the CI ratio is only a guard: Decision 4's floor assumes ≈10× on real data. Run the
local `ALEF_TELEMETRY_SAMPLE` check once; if a real session chunk gives < 8×, stop and tell the owner before Task 6.
**Risks:** key-order bugs (the round trip catches them); `-0` cannot occur (JSON has none). **Size:** M.

## Task 3: Exact trimming in the codec (the field-trimming step)

**Goal:** remove the envelope's waste in storage only, with an exact rebuild. No event shape changes at the source.

**Files:** `src/shared/telemetryCodec.ts` + test.

- [ ] Time fields: a top-level integer field whose value is ≥ 10¹² in every row of its schema (an epoch-ms time such as
      `clock`) is stored as `t − value` (exact integer arithmetic). Any other value keeps the plain column. Generic: no
      field names in core, so a new game's time fields are covered.
- [ ] Columns constant in a chunk (`g`, `via`) are stored once per schema, with a flag.
- [ ] `run` is a delta column.
- [ ] A doc comment lists what is trimmed and why each rebuild is exact; it says that `line`'s `url` and the `clock`
      field are kept on purpose (Decisions 2, 3).

**Tests:** `clock = t`, `clock = t − 3`, `clock = t + 1`, `clock` missing, `clock: null`, `clock` a float: all rebuild
byte-equal. A schema with mixed time and non-time values falls back. The Task 1 goldens still match after an
encode/decode of their events.

**Acceptance:** byte round trip holds; ratio on fixtures improves vs Task 2 (record both).
**Risks:** an over-clever rule that is not exact; the byte round trip on all fixtures is the guard. **Size:** S.

> **Done, with notes (2026-11-17).** Ratios against today's JSON, one chunk per session:
>
> | | Task 2 | Task 3 (+ column-major rows) |
> | --- | --- | --- |
> | synthetic Book 2 (150 events/session) | 5.0× | 5.5× |
> | synthetic clock | 8.6× | 9.5× |
> | a real first-duel export (local check, 926 events, 5 sessions) | 7.3× (largest session 9.0×) | 9.0× (largest session 11.6×) |
>
> Deviation: the synthetic data compresses *worse* than real data (its values are uniform random picks), not 2× better,
> so the CI guard is ≥ 5× for synthetic Book 2 and ≥ 6× for the clock; the real check passes the ≥ 8× gate of Task 2.
> Added beyond the plan: the rows are stored column by column inside each schema (like values together), which took
> the real export from 7.8× to 9.0×.

## Task 4a: The chunk store (read side)

**Goal:** core can read, count and clear a log made of an open chunk and sealed chunks. Nothing writes chunks yet.

**Files:** new `src/shared/telemetryChunks.ts`; `src/shared/telemetry.ts`; tests; `src/parent/sections/Data.tsx` only
for Clear.

- [ ] Open chunk format `{v:1, events, sealed?}` and the dedupe of Decision 5.
- [ ] `readLog(key)` = the sealed chunks of the log (`ownsKey && isChunkKey`, decoded) + the open chunk, deduped, then
      merged by `t` (Decision 10). A chunk that does not decode is skipped and reported by `logStats(key)`
      (`{events, recent(since), chunks, unreadable, chars}`, from headers and the open chunk; it decodes only a chunk
      that straddles `since`). `readLog` never writes.
- [ ] `clearLog(key)` removes the open key and every owned chunk and roll-up key; never a frozen key. The Data
      section's Clear of another game's log calls it.

**Tests (hand-built storage states, chunks made with the Task 2–3 codec):** each Decision 5 state (sealed + open before
the rewrite; after; an old `{v:1,events}` open chunk next to sealed chunks whose events it lacks; two chunks of one
session; two events of one session in one ms on the chunk boundary) reads with no loss and no doubles; the order case
of Decision 10; an unreadable chunk is skipped, kept and counted; a roll-up key is never read as a chunk;
`alef-duel-telemetry` beside `alef-duel2~…` keys reads byte-equal to today; staging keys carry the prefix.

**Acceptance:** the Task 1 goldens match when their events are stored as chunks + open chunk in several splits.
**Size:** M.

> **Done, with notes.** (1) The copy of a sealed chunk in the open chunk is found by content, not by `t0`/`t1` alone: the
> run of its session that starts at the first event equal to the chunk's first event and matches it event by event. A
> prefix is enough (a tab that loaded the open chunk while the session was still live holds only its start); with the
> `t1` rule that tab's flush would double those events. A later event of the session never matches the chunk's first
> event, so the "old build dropped the `sealed` list" state still loses nothing. (2) The open chunk is one merge segment
> in its stored order (not one per session), so a log with no sealed chunk reads exactly as today, even where two tabs
> interleaved it. (3) The key helpers and the frozen-key list moved to `telemetryChunks.ts` (`telemetry.ts` imports and
> re-exports them), so the modules have no import cycle.

## Task 4b: Sealing in `createTelemetry` (write side)

**Goal:** the open chunk stays small; sealed chunks hold the history; the API games use does not change.

**Files:** `src/shared/telemetryChunks.ts`; `src/shared/telemetry.ts`; tests.

- [ ] `track`, `flush`, `setRun` keep their signatures. `flush` writes the open chunk only (with its `sealed` list).
- [ ] Seal own session at idle (Decision 12) when the open chunk passes `OPEN_SEAL_CHARS = 40_000`. Seal foreign
      sessions on the first `track` of a page when their last event is older than 30 minutes (a session live in
      another tab stays open). Before a seal, re-read the stored open chunk's `sealed` list and the headers of the
      session's chunks, and seal only events after the ones they cover (a tab that slept past 30 minutes still holds
      events another tab sealed). Order: write the sealed key, read it back and compare (decode equals the events),
      then drop them from memory, add the key to `sealed` and rewrite the open chunk. A quota error on the sealed
      write leaves the open chunk as it is.
- [ ] The instance's `events()` returns `readLog`'s merge plus its unflushed events. `clear()` = `clearLog(key)` and
      an empty memory.
- [ ] Remove the unused `exportJson` instance method if `knip` agrees nothing reads it.
- [ ] A frozen key is never opened by `createTelemetry` for writing: it throws in dev (assert) and is a no-op in prod.

**Tests:** flush never writes more than the open chunk (spy on `setItem` lengths); sealing at 40k; with no
`requestIdleCallback`, nothing seals while `pointerdown`s come less than 2 s apart (fake timers); a second page seals
the first page's stale session but not a live one; an interrupted seal (fault-injecting Storage that throws after the
sealed write, then after the open rewrite) loses and doubles nothing; two instances on one key (one seals, the other
flushes its older view after) lose and double nothing; a throwing Storage never throws out of `track`/`flush`.

**Acceptance:** the Task 1 goldens match through the chunked path; the Data section tests pass unchanged except Clear.
**Risks:** two tabs on one log (today's last-writer-wins stays; Decision 5 prevents doubles; idle
callback never firing on a hidden page (the next load seals). **Size:** M.

> **Correction (review, 2026-11-17).** The first risk note said that a tab that flushes an older view after a chunk was
> evicted "costs space, not data". That was wrong: the events came back raw while the roll-up already counted them (a
> double), and the next seal sealed them again under the same key and folded them a second time (`folded` had been
> pruned to keys that exist). The same happened when the open-chunk rewrite after a seal failed on a full storage and the
> budget (or a save's `freeChunks`) evicted the chunk anyway. Now: (1) a chunk is evicted only when the STORED open
> chunk holds no copy of it (its `sealed` lists the chunk, or no run matches); (2) an evicted chunk leaves a tombstone
> in the roll-up's `folded` (`k`, `s`, `t0`, `t1`, `n`, `at`), and `readLog`, `logStats` and `reconcile` drop an open
> run that matches one, so the events count once and are never sealed or folded again; (3) a save's open-chunk trim
> drops such copies first. A tombstone is kept while its chunk exists, while the stored open chunk holds a copy, and for
> 30 days after the eviction (`TOMB_KEEP_MS`). Limit: a tab that keeps a stale view for more than 30 days after the
> eviction and then flushes it can still bring the events back once.
>
> **Also from the review:** a session that cannot be sealed (a `t` that is not a safe integer, or a chunk key that
> already holds another or an unreadable chunk) no longer stops the pass: the page skips it, seals the next one, and
> records the skip once in its own log (`seal-skipped`, with `session` and `reason`: `time` or `taken`). A full storage
> (`write`) still ends the pass.

## Task 5: Migration of the live logs

**Goal:** the existing `v:1` logs of Book 2 and the clock (up to 700k and 500k) become sealed chunks, safely.

**Files:** `src/shared/telemetryChunks.ts` + test.

- [ ] No new code path: on a game page's first `track`, an open chunk over 40k seals every complete session (a foreign
      session idle for more than 30 minutes, as in Task 4b), oldest first, one session per idle slot (Decision 12), so
      a 700k log does not block a frame for long. Reads (`readLog`) never write. The current session's events stay
      open. Until the migration ends, each 1 s flush still writes the large open chunk, as today; it shrinks with each
      session sealed.
- [ ] Each session is removed from the open chunk only after its sealed key is written and read back equal.
- [ ] Idempotent: a re-run finds the sealed keys (same `t0` and `s` give the same key) and only finishes the open
      rewrite.
- [ ] The frozen log is never a candidate (pinned by a test that runs the migration with it present, byte-compares it).

**Tests:** a literal `v:1` string as the old build wrote it (700k, ~20 sessions, events with and without `g`) migrates
with no loss and no doubles; a second run is a no-op; a fault-injecting Storage that throws at each write in turn loses
nothing; a quota error mid-way leaves the remaining sessions in the open chunk; a storage too full for the first sealed
write leaves the log as it is and a save still succeeds (it trims the open chunk, as today); two instances migrating
one log at once (interleaved idle slots) lose and double nothing; staging migrates its own prefixed keys only, and a
`?copy-prod` after the migration copies no chunk; the export after migration equals the export before (golden).

**Acceptance:** the merged events after migration stringify byte-equal to before.
**Risks:** the child's real history is at stake: the read-back check and the fault tests are the guard. A slow tablet
spreads the work over more idle slots. **Size:** M.

## Task 6: One shared budget

**Goal:** all live logs of all games share one budget; per-game caps go.

**Files:** new `src/shared/telemetryBudget.ts`; `src/shared/telemetry.ts`; `src/shared/saveStorage.ts`;
`src/duel2/telemetry.ts`, `src/clock/telemetry.ts` (comments); the budget test in `src/shared/telemetry.test.ts`.

- [ ] Constants: `LIVE_BUDGET = 800_000`, `ROLLUP_BUDGET = 150_000` (Task 7), `STAGING_SHARE = 0.25`,
      `RAW_FLOOR_DAYS = 30`. Remove `TELEMETRY_CAPS`, `telemetryCap`, `maxChars`.
- [ ] After each seal: sum the chars of every live log's open and sealed keys (this build's keys only, Decision 13;
      roll-up keys count in `ROLLUP_BUDGET`, not here; never a frozen key). Past the budget, evict the oldest sealed
      chunk by `t0` across all logs, folding it first (Task 7). Production never evicts a chunk younger than 30 days in
      budget eviction; staging may. Unreadable chunks are never evicted.
- [ ] Fold and evict are idempotent: the roll-up records the chunks it folded (`folded`: tombstones since the review,
      see the correction under Task 4b). Order: write the roll-up with the key in `folded`, then remove the chunk. A crash between the two folds
      nothing twice (the next run sees the key and only removes the chunk).
- [ ] The open chunk keeps a hard cap (`4 × OPEN_SEAL_CHARS`), a guard for a page that never idles: at the cap,
      `flush` seals the own session synchronously (one long frame, rare) instead of dropping events; it drops the
      oldest events only when that seal fails.
- [ ] `freeTelemetrySpace` (a save under quota pressure): staging's sealed chunks first (in the production build),
      then the oldest sealed chunks of any live log, then open chunks' oldest events. Saves come first, so here the
      30-day floor does not hold; the fold runs when the log is registered. Never the frozen log, never an unreadable
      chunk, never a save.
- [ ] The frozen log's size is measured once per page (read only) and shown by Task 8.

**Tests:** the rewritten budget test, with the arithmetic written out: production live 0.8M + roll-ups 0.15M + frozen
(1M worst case) = 1.95M; plus staging's quarters of the live and roll-up budgets (0.2M + 0.0375M) = 2.19M ≤ 2.2M, so
≥ 0.3M is left for saves under the 2.5M-char bound. Staging's own frozen copy (`staging:alef-duel-telemetry`, up to
0.25M, written by old staging builds, also never trimmed) is not in that sum: assert separately that with it at 0.25M
the saves still have ≥ 0.05M, and let Task 8 show its measured size (today's test does not count it either). The budget
is the same with 2 and with 6 registered fake games; oldest-first
across games; the 30-day floor holds in production; a light game keeps its recent chunks when a heavy game seals; a
save under pressure evicts telemetry and succeeds (a fake Storage that counts like WebKit); a fault between the roll-up
write and the chunk removal folds once; the production build's budget ignores `staging:` keys; no eviction removes a
chunk of a registered log without its fold; the frozen log is byte-equal after all of it.

**Acceptance:** live telemetry ≤ 800k (prod) and ≤ 200k (staging) after every seal, except within the floor.
**Risks:** the floor can push production past the budget on a device without the expected ratio; the save path still
wins. **Size:** M.

> **Done, with notes.** (1) The hard cap seals this page's own session only when its own events are a seal's worth
> (> 40k): while an old log migrates, the open chunk is long with other sessions, and trimming it would drop history
> that is about to be sealed. When the sync seal fails, only this page's own oldest events go. (2) Under save pressure a
> roll-up write can find no room: then the chunk goes first and the fold is written after it (saves come first). Budget
> eviction never does that. (3) Decision 15 lives in core: on a page's first `track`, the staging build deletes its
> `alef-duel-telemetry` (the prefixed view, so only `staging:alef-duel-telemetry`) and the log gets one
> `frozen-copy-removed` event with the key and its size. (4) The 30-day floor looks at a chunk's newest event (`t1`).

## Task 7: Roll-ups

**Goal:** an evicted chunk leaves per-day, per-item counts that keep what the parent's analyses need.

**Files:** new `src/shared/telemetryRollup.ts`; `src/duel2/telemetryLog.ts`, `src/clock/telemetryLog.ts` (their
`rollup`); tests. No eviction here: Task 6 calls `foldChunk`.

- [ ] `TelemetryLog.rollup?: (events: TelemetryEvent[]) => RollupFact[]`, called with one chunk's events (one session,
      in order), so a game can join events (the tower's `choice` names a `round`, not its target). `RollupFact =
      { item, ok?, near?, ms?, chosen?, hint?, replay? }`. Core also counts per day `minutes` (sum of the gaps
      between consecutive events of a session that are under 5 minutes, so it adds up across chunks), `runs` (the set
      of `s:run` pairs of the day, so two chunks of one run count once) and `abandons` by `screen`/`phase`. Days are
      the device's local date of `t`. The game decides what an item is; core only folds, so Space Cat declares its
      own function.
- [ ] Book 2 (checked against the call sites in `src/duel2/controller.ts` and `src/utils/duel/controller.ts`):
      `answer` (item = `screen:target`, ok = `result === 'right'`, near = `result === 'near'`, `ms`, chosen =
      `tapped`); the tower answer is Book 2's own `answer` with `screen: 'tower'` (no `ms`, no `via`); the tower's
      `choice` (`via: 'tower'`) joined to its `round`'s `target` gives the tower's latency (`msShown`) and near
      (`twin`); `replay`/`idle`/`hint`/`explain` as hints. Clock: `round` (item = `exercise:time`, ok = `correct`, near
      = `forgiven`, `ms`, chosen = the picked option, `scaffolds` as hint). Skip `gallery: true` events (the screen
      gallery). A clock round with `real: false` counts only in its item's `special` counter (Decision 14). Check each
      field against its call site before writing it.
- [ ] Stored at `<base>~sum-telemetry`: `{v:1, folded:[keys], dropped, days:{"YYYY-MM-DD":{minutes,runs:[…],abandons,
      items:{id:{n,wrong,near,ms:[…],chosen:{id:n}}}}}}}`. `chosen` keeps the mix-ups (the analyses ask for "his real
      mix-ups"), at most 5 per item. Latency is a small fixed histogram (median and p90 come from it, exact enough and
      mergeable). After 90 days, days fold into ISO weeks. Past `ROLLUP_BUDGET` across all logs, the oldest weeks of
      the largest log go.
- [ ] `foldChunk(log, chunkKey, events)` for Task 6: adds to the roll-up and to `folded` (Task 6's idempotency). A chunk
      of an unregistered log evicted under save pressure only adds its `n` to `dropped` in that log's roll-up.
- [ ] The roll-up holds only folded (evicted) events, so a day with both a roll-up and raw events is counted exactly by
      adding them; say so in the export's `about` note (Task 8).

**Tests:** folding a fixture gives the same per-item counts, wrong counts, near counts, mix-ups, abandons and
histogram as computing them from the raw events; folding a session in two chunks equals folding it in one (minutes and
runs too); `gallery` events count nowhere; 6 games × 365 days stay under the roll-up budget; a roll-up key is never
copied by `?copy-prod`; the lessons have no log and no roll-up.

**Acceptance:** each `rollup` covers the per-item accuracy, latency, mix-ups and abandons the design docs' telemetry
sections and `aboutNote`'s `howToAnalyse` ask for.
**Risks:** a wrong item definition loses an analysis for good: review each `rollup` against the design docs' telemetry
sections before merging. **Size:** M.

> **Done, with notes.** Roll-ups also keep `special`, `hints` and `replays` per item, and `tails` (the last folded
> event of the 20 most recent sessions), so a session folded in two chunks counts its minutes exactly once. The tower's
> answer comes from Book 2's `answer` with `screen: 'tower'`; the tower's last `choice` for the same target gives its
> latency, near and pick (so a tower answer counts once). Weeks share the `days` map under `YYYY-Www` keys. Clock
> `real`: see Decision 14's note.

## Task 8: Export and the Data section

**Goal:** the export decodes back to today's JSON; the Data section shows counts, roll-ups and storage.

**Files:** `src/shared/telemetry.ts` (`exportDoc`), `src/parent/sections/Data.tsx` + test, `src/parent/types.ts`.

- [ ] `exportDoc` parts keep `key`, `about`, `events` exactly as today. A part gains `rollups` only when the period
      starts before the log's oldest raw event (by default, never within 30 days). The file name does not change.
- [ ] Counts: "N events" and "M in the last 30 days" span the open and sealed chunks (headers give counts; only a chunk
      that straddles the cut is decoded). Today `rows` calls `live.events()`, which would now decode every chunk on
      each open of the section: counts come from `logStats(key)` instead (after a `flush()` of the live instance, so
      its unflushed events count); `LiveLog` gains `flush`. Only Download decodes. Add "K older days summarized" when
      a roll-up exists, and "U unreadable chunks" when any.
- [ ] Clear removes the log's open, sealed and roll-up keys (`clearLog`, or the instance's `clear` for the open game).
- [ ] A storage line: telemetry chars used / budget, the frozen log's size (and staging's frozen copy, if any), the
      `persist()` answer, and a `save-failed` flag that `safeSetItem` sets in memory when its retry fails (Decision 9).
- [ ] Extend the verify driver (`.claude/skills/verify/drive.mjs`, a new `telemetry` check) to open the Data section
      after play and check the counts, the storage line and a Download. No host, address or port in it.

**Tests:** for each Task 1 golden, the chunked log's export is byte-equal (fixed `exportedAt`); the frozen part is
byte-equal to today's; the 30-day filter spans chunks; opening the section decodes no chunk unless one straddles the
cut (spy on `decodeChunk`); Clear never touches the frozen log; a `spacecat` log declared in a test `GameParent` lists,
exports and clears with no core change.

**Acceptance:** goldens match; the parent sees the same file as today for the default export.
**Risks:** the Data section reads more keys on open (header parse only; measure with 200 chunks < 20 ms). **Size:** M.

## Task 9: The IndexedDB decision, and the docs

**Goal:** record why IndexedDB is not needed now, and update the docs.

**Files:** new `docs/adr/0007-compact-telemetry-in-localstorage.md`; `docs/adr/0004-one-telemetry-log-per-game.md`
(consequences: the budget counts the frozen log at its measured size); `src/shared/README.md`; the comments of
`src/duel2/telemetry.ts` and `src/clock/telemetry.ts`; `CLAUDE.md` only if a rule changes (a new entry point still
imports `stagingStorage.ts` first; a new game declares its log with an optional `rollup`).

**Decision: no IndexedDB now.** Reasons for the ADR:
- It gives the saves no extra durability: localStorage and IndexedDB are in one eviction bucket, evicted all or
  nothing, and the 7-day rule of a browser tab on iPadOS clears both. `persist()` and a Home Screen icon are the
  mitigation either way.
- After Tasks 2–7 telemetry fits: ≤ 0.8M live + 0.15M roll-ups + the frozen log + staging's quarters ≤ 2.2M chars,
  leaving ≥ 0.3M for saves under the strictest bound and ≥ 3M bytes on iPadOS (staging's own frozen copy, if an old
  staging build wrote one, comes on top: see Task 6). Binary blobs would save only ≈1.3×
  more.
- It costs: async open and upgrade, no sync write on `pagehide`, transactions, a test fake, and an async export.
- Revisit when: raw history must stay longer than the budget holds; a sixth game makes the 30-day floor overflow the
  budget; or the Data section reports `save-failed` on a real device.

**Acceptance:** docs say how a new game joins (declare a log, optionally a `rollup`), name the budget constants, and
link ADR 0007. **Risks:** none. **Size:** S.

## Final check

- [ ] Run the `/verify` skill (`npx vite build --mode verify --outDir dist-verify`, then
      `node .claude/skills/verify/drive.mjs`): every check, the new `telemetry` one included, PASS at both sizes; look
      at the screenshots.
- [ ] On the verify build, play a Book 2 run with a tower visit and a clock workday; reload; export "all" and "last 30
      days"; diff the event lists against an export made on main from the same play (field names, event names, order).
- [ ] Migration in a real browser: seed a synthetic 700k `v:1` Book 2 log, a 500k clock log and a frozen log (synthetic,
      from the Task 1 generator) in the browser's storage, load Book 2, play; check that the migration finishes, that
      the export equals the pre-migration export, and that the frozen value's hash is unchanged.
- [ ] Storage full: fill the origin's storage to its quota with a filler key, then play Book 2 and the clock. Check
      that progress survives a reload (the saves won), that telemetry was evicted (never the frozen log), that no error
      reaches the console, and that the Data section shows the storage line. Remove the filler.
- [ ] Main-thread cost: with CDP CPU throttling at 4× (a low-end tablet), record the longest task during play, during a
      seal and during each migration slot (Performance long tasks). Report them with the measured ratio, the seal
      times and the build size change. A long task over 100 ms during play is a finding to fix before release.
- [ ] Put browser URLs, addresses and ports only in environment variables, never in the repo or the report committed.

> **Final check results (2026-11-17, a shared headless Chromium on a slow ARM board).**
> - `/verify`: every check PASS at both sizes, the new `telemetry` one included (Book 2's events counted, the storage
>   line shown, a Download with Book 2's events). No page left open.
> - Migration: a synthetic 697k Book 2 log, a 499k clock log and the frozen log seeded; Book 2 loaded and played at 4×
>   CPU throttling. 21 sessions became 21 chunks in ≈3 min of play; Book 2's keys went from 697k to 151k characters
>   (with the open chunk); the export of the seeded events after migration equals the export before; the frozen value is
>   byte-identical.
> - Storage full (a filler to the quota): Book 2 and a clock round played; both saves survived a reload, telemetry was
>   evicted (never the frozen log), no console error, and the Data section showed the storage line.
> - Main-thread cost at 4× throttling, longest tasks from the play screen on: main build 0.7–1.1 s, this branch with
>   nothing to seal 0.8–0.85 s (the same), this branch while migrating 1.1–1.3 s. So on this board each migration slot
>   adds ≈0.3–0.5 s to the worst task; the game alone is already far over 100 ms here, so the 100 ms line cannot be
>   judged on this board. **Open finding:** measure a migration slot on a real low-end tablet before release; if it is
>   long, split a session's seal (encode, then write and read back) over two idle slots.
> - Build: `fflate` adds ≈4.5 kB gzipped (within the ≤ 6 kB check); with the new telemetry modules the shared
>   ParentArea chunk grows by 11.4 kB gzipped (119.7 → 131.2 kB).
> - The Data section reads `navigator.storage.persisted()` itself, so the line shows the browser's answer even when the
>   area's `persist()` request answers after the section rendered.
