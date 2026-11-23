# Spell Quest — the rename of Book 2, the tower and the English course

Status: approved by the parent (2026-11-22). The names and the answers to the open questions are his decisions (see
`GLOSSARY.md` and *Decisions* below). My own calls are marked *my call*.

## What changes

| Old | New |
| --- | --- |
| Book 2 (`src/duel2`, `duel2/index.html`, save `alef-duel2`) | **Spell Quest** (`src/spellquest`, `spellquest/index.html`, save `alef-spellquest`) |
| Book 1, the first duel (`src/utils/duel`, `src/components/duel`, `src/hooks/useDuelGame.ts`) | **the tower** of Spell Quest (`src/spellquest/tower/`, `TowerController`, `useTower`) |
| English path | **the English course** ("path" stays only for the home's row of stations) |

"duel" stays only as a plain word for one fight. No behaviour changes. The child sees no change, except the new URL.

## Inventory (281 files mention "duel", 202 mention "Book 2")

| Group | What to rename |
| --- | --- |
| Code | `src/duel2/` → `src/spellquest/` (with `assets/`, 16 MB, *my call*: move it, `git mv` is cheap). `src/utils/duel/`, `src/components/duel/`, `src/hooks/useDuelGame.ts`, `src/types/duel.ts`, `src/assets/duel/` (13 MB) → `src/spellquest/tower/{logic,components,assets}/`. Identifiers: `Duel2App`, `useDuel2Store`, `Duel2Save`, `duel2Telemetry`, `duel2Audio`, `BOOK2_LOG`, `book2Parent`, `DUEL2_KEY`, `BOOK2_SAVE_KEY` → `SpellQuest…`; `DuelController`, `DuelState`, `duelReducer`, `duelAudio`, `DUEL_HISTORY_LOG` → `Tower…`. CSS `duel2.css`, `duel.css`. |
| Ids | Game id `'book2'` → `'spellquest'` in `GameId` (`src/parent/types.ts`), `PlaytimeGame`, the course seam (`course/types.ts`, `course/hebrew.ts`), audio and log `game`, the test fixtures. Audio game `'duel'` → `'tower'`. |
| Pages | `duel2/index.html` → `spellquest/index.html`; `vite.config.ts` input `duel2` → `spellquest`, plus a small redirect page at `duel2/index.html` (below). Home: `DuelCard.tsx` → `SpellQuestCard.tsx`, `data-card`, `data-home-part`, `aria-label`, `PlayButton theme`, `DUEL_HREF`; `StationPath.tsx` and `EnglishCard.tsx` station links. |
| Saves (in localStorage) | `alef-duel2` → `alef-spellquest`. `alef-playtime`: its day entries `book2` → `spellquest`. `deviceSettings.ts` seeds from the new key. `alef-english` keeps its key. |
| Telemetry | `alef-duel2-telemetry` → `alef-spellquest-telemetry`, with its sealed chunks `alef-duel2~<t0>~<s>-telemetry` and its roll-up `alef-duel2~sum-telemetry`. The frozen log `alef-duel-telemetry` → `alef-tower-history-telemetry` (D1); `removeStagingFrozenCopy` and every reader of the frozen key follow. |
| Tooling | `.dependency-cruiser.cjs` (6 rules name `duel2` or `utils/duel`), `knip.jsonc` entry, `scripts/duel2/` → `scripts/spellquest/`, `asset-sources/duel*/` → `asset-sources/spellquest/` and `asset-sources/spellquest/tower/` (about 490 path strings in their JSON; a scripted replace), the `/verify` skill (`SKILL.md`, `drive.mjs`: 10 selectors and URLs). `.github/workflows/` has no game names: no change. |
| Review kit | `tools/review/`: comments only. Item ids are relative to a game's media root, so the host-local adapters change only their roots (a host step, not in the repository). |
| Docs | READMEs (`src/duel2/README.md`, `src/english/README.md`, `src/shared/README.md`, `src/parent/README.md`), `CLAUDE.md` map, `docs/minigame-rules/`. Specs and plans are history: no change. |
| ADRs | *My call*: do not rewrite them. Add one line under each title of 0002, 0004, 0007, 0008: "Renamed 2026-11-22: Book 2 is Spell Quest, the first duel is its tower; old paths below are history." Add ADR 0009 for the key migration. |

| Save fields (D2) | Every field whose name says duel, duel2, book or book2 (not the spell book): for example `duel` in `alef-progress` (→ `tower`), `firstDuelImported` (→ `towerImported`) and `bookOpen` (→ `screensOpen`) in the Spell Quest save and in `alef-english` (the same store factory). T1 makes the full list with a grep of the save types. Action names (`recordDuelRound`, …) are code and follow T2/T3. |

## The migration

- **Where.** A new module `src/shared/keyMigration.ts` with one exact list of moves. `stagingStorage.ts` calls it at the
  end of its install, on the storage view the page uses (prefixed on staging, plain on production). Every entry point
  already imports `stagingStorage` first, so the home, Spell Quest, the clock and Space Cat all migrate before any store
  reads. The home must migrate too: it reads Spell Quest's save for the path and the device settings.
- **Run once.** A marker key `alef-migrations` (`{v:1, done:["spellquest-rename"]}`) is written last. Without it, the
  module runs on each load. With it, the module does nothing (one `getItem`).
- **Order.** (1) Saves: `alef-duel2`, then the `book2` entries in `alef-playtime` (rewritten in place). (2) Telemetry: the
  roll-up, the sealed chunks oldest first, then the open chunk last, with its `sealed` list rewritten to the new chunk keys
  (that list holds full keys). (3) The marker `spellquest-rename`. (4) The frozen log, as its own step with its own marker
  `tower-history` (D1): copy, check, delete. It needs about 1 M free for the copy. If the copy fails for space, the old
  key stays, nothing is lost, and the step tries again on the next load; the Data section shows "the tower's old history
  waits for space". Steps 1–3 never wait for step 4.
- **Field names (D2).** They change inside each save's own version step, not in `keyMigration.ts`: raise
  `alef-progress`'s persist version, the Spell Quest `SAVE_VERSION` (`saveFormat.ts` `migrateSave`) and the English
  save's version, each with a pure step that renames the fields and keeps every value. The stores run them on load as
  they do today. The steps are exported pure functions, so the check can call them without a store.
- **Each key: copy, check, delete.** Write the new key, read it back, compare, then remove the old key. One key at a
  time needs only that key's size free: a sealed chunk is one session, the open chunk stays inside the live budget
  (0.8 M for all logs, ADR 0007). The 1 M frozen log does not move, so no copy is ever near the quota (≈2.5 M).
- **Idempotent and resumable.** Old key only: move it. Both keys and equal: delete the old. Both and different: keep
  both, write no marker, record a conflict for the Data section, with both key names. New key only: done.
- **A late write from an old page.** A page of the old build can outlive the release: a tab left open, or Back from the
  new home page restores the old page from the back-forward cache with the old code in memory. It then writes
  `alef-duel2` and `alef-duel2-telemetry` again after the step is done. So each load also reads the old save, the old open
  chunk, the old roll-up and the play time (a few `getItem`s) and, when an old key is back, runs the step's moves again.
  The save: the marker keeps a fingerprint of what the move wrote; if the new save still has it, the late write is newer
  and moves over it; if the new save changed too, both stay (a conflict). The open chunk: when the new one exists, the
  old one's events become sealed chunks of the new log (one per session, `<t0>~<s>`), listed in the new open chunk's
  `sealed`; a sealed chunk or the roll-up moves as above.
- **A save that waits for space.** A failed save copy frees telemetry once (never the frozen log) and tries again. If it
  still fails, the save store reads and writes the old key for the rest of the page (never a fresh save next to it), and
  a later load moves it.
  A quota error stops the run without a marker; the next load continues. Until then, unmoved chunks stay on disk and show
  again after the move. No event is lost.
- **Old ids inside events.** *My call*: do not rewrite compressed history. The codec could re-encode exactly, but that
  writes every chunk again (quota risk) and the frozen log must never be rewritten. Instead the readers (`readLog`,
  `filterEvents`, the export, the playtime and the parent filters) map `book2` → `spellquest` and an old first-duel event
  `duel` → the tower (the frozen tower history, whose events have no `g`, is read and exported as stored, ADR 0004). New events have the new id. One alias table in `telemetry.ts`.
- **Staging.** The same code runs on staging's prefixed view, so staging's own old saves move too. It never sees
  production's keys.
- **Old URL.** `duel2/index.html` stays as a tiny page that redirects to `../spellquest/` with the same query and hash
  (`?course=en`, `?station=…`, `?copy-prod`). It does not import a store. *My call*: keep it for good; it costs one file.

## Staging check: `?migrate-check`

A new staging-only query, next to `?copy-prod` (same confirm dialog). Production ignores it.

1. Remove staging's copies of the keys in the move list (old and new names) and the marker.
2. Copy production's real old keys (the saves, `alef-playtime`, every `alef-duel2*-telemetry` key and the frozen
   `alef-duel-telemetry`) into staging, under their **old** names. A quota error stops the check with "no space" and removes what it copied.
3. Keep an expected snapshot in memory: each save parsed; each log's decoded event count, first and last `t`, and its
   roll-up.
4. Run the migration from `keyMigration.ts`, the same function production runs, then each save's version step (D2).
5. Verify each key: old name gone, new name present; a log with the same event count and first and last `t` (the frozen
   log too); the markers written. A save: its expected value is built by the check's own written-out table of old and
   new field paths (not by calling the migration's map, so a wrong map fails), and it must deep-equal the result. Also
   no field or id named duel, duel2, book or book2 is left in any save.
6. Run the migration a second time and verify that no key changed. Also run a half-done case: put back one old chunk
   key, run, verify that it resumes and gives the same result.
7. Write the result to `alef-migration-check` (staging only) and show it in the parent area's **Data** section, behind
   the gate: "Migration check: PASS" or "FAIL", then one row per key (moved, content equal, counts equal), and the date.

The check only reads production's keys. It never writes them. After the check, staging's telemetry copies stay until
the parent clears them in the Data section (their size shows there).

## Decisions (the parent, 2026-11-22)

- **D1.** The first duel's frozen log moves too, to `alef-tower-history-telemetry` (step 4 above).
- **D2.** Field names inside the saves are renamed too, through each save's version step.
- **D3.** The rename merges into `main` like any branch; the parent decides when to release. Before a release, the
  parent runs `?migrate-check` on staging on the child's device; it must show PASS.
- **D4.** The controller refactor from the architecture review waits; it is not part of this work.

## Tasks

Land the rename alone (D4). Each rename commit is a pure
rename (`git mv`, then the import paths, then the identifiers, in that order), so `git log --follow` and blame stay
useful. Keys and behaviour change only in T6.

| Task | What | Order |
| --- | --- | --- |
| T1 | `keyMigration.ts` + tests (move list, copy-check-delete, resume, conflict, quota stop, idempotent, the frozen-log step; the reader alias table) and the save field version steps (D2) + tests | any time |
| T2 | `src/duel2` → `src/spellquest`, ids and identifiers, depcruise, knip, scripts, `vite.config.ts`, the new page | first rename |
| T3 | the tower: `utils/duel`, `components/duel`, `useDuelGame`, `types/duel`, `assets/duel` → `src/spellquest/tower/` | after T2 (same importers) |
| T4 | `?migrate-check` in `stagingStorage.ts` and its result in the Data section, with tests | after T1's interface |
| T5 | docs, READMEs, `CLAUDE.md` map, ADR notes and ADR 0009, `asset-sources/`, the `/verify` skill | after T3 |
| T6 | switch the keys and ids to the new names, call T1 from `stagingStorage.ts`, the `duel2/` redirect page | last; needs T1–T3 |

T1 and T2 run in parallel; T4 and T5 run in parallel after them. Then a whole-branch review, `npm run check && npm
test`, `/verify`, and the staging check.
