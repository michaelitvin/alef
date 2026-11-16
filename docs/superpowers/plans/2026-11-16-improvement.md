# Improvement: guardrails, the game kit, one parent area, and the run's policies — Implementation Plan

> **For agentic workers:** use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans.
> Steps use checkbox (`- [ ]`) syntax. One commit per task (or a few), plain-sentence messages like `git log`.

**Goal:** Make the repo safe to change (lint, boundaries, no dead code), give every game one audio layer, one shell,
one sound setting, one parent area behind one gate and one telemetry export, then cut Book 2's `RunController` and the
first duel's `useDuelGame` into testable parts. The child sees no change, except the gate and one sound setting.

**Decided (the parent accepted all of it):** every item below. Do not re-open a decision; record a surprise in the
task's report and go on.

**Words:** *Book 1* = the first wizard duel (`src/hooks/useDuelGame.ts`, `src/utils/duel/*`, `src/components/duel/*`,
`src/pages/Duel/`), now Book 2's tower. *Book 2* = `src/duel2`. *The lessons* = the reading course (`src/pages/*` except
Duel, the home's shelf). *The area* = the shared parent area. *The gate* = 2 s hold + year of birth.

## Global constraints (every task)

- **The repo is public.** No host names, addresses, ports, local paths, passwords or names of local tools in files or
  commit messages. The pre-push hook rejects them. Use env vars and placeholders in docs (`$ALEF_CDP_URL`).
- **Saves are the child's real progress.** Every save-format change: a migration plus a test that loads an old save
  (a literal JSON string as the old build wrote it). New localStorage keys are covered by the `staging:` prefix
  automatically (`src/shared/stagingStorage.ts`); do not special-case them.
- **Child-facing behaviour does not change** in a refactor: same voice order, same timings, same saves. When a test
  needs a change of expectation, stop and say why in the report.
- **Checks:** run the targeted tests while you work (`npx vitest run <paths>`), then the full suite at the end of each
  task (`npx vitest run`, ~6 min, 104 files / 1197 tests at the start). After Task 3 also `npm run lint`. Node may not
  be on PATH in agent shells: put your Node's `bin` first.
- Update the touched README's *Known friction* when a friction goes. Write an ADR only for a hard-to-reverse,
  surprising trade-off (Tasks 9, 17, 18 name candidates).

## Order and parallel work

| Phase | Tasks | Parallel |
| --- | --- | --- |
| 0 | 1 docs · 2 lesson bugs · 3 lint · 4 speckit · 5 dead code · 6 guardrails | 1, 2 and 4 in parallel; 3 after 2; 5 after 3; 6 after 5 |
| 1 | 7 telemetry core · 8 device settings · 9 audio kit + Book 2 · 10 clock audio · 11 Book 1 audio · 12 shell · 13 gate · 14 area frame · 15 game sections · 16 progress section · 17 telemetry join + export | 7 ∥ 8; 9 after 8; 10 and 11 after 9 (10 ∥ 11); 12 after 10 and 11; 13 ∥ 12; 14 after 12 and 13; 15 and 16 after 14 (15 ∥ 16); 17 after 7, 11 and 15 (15 and 17 both edit the games' `parent/` files) |
| 2 | 18 seams · 19 merchant · 20 draw · 21 broom boss · 22 pass and hearts | starts after all of Phase 1 is in (Task 9 and 17 edit `useRun.test.tsx` and `Tower.tsx`); serial (all edit `controller.ts`) |
| 3 | 23 duel controller · 24 duel hook and tests | after 18; may run beside 19–22 (they never touch `controller.ts` or `useRun.test.tsx`) |
| — | 25 verify skill · 26 docs sweep · 27 final QA | 25 after 15, 16 and 17 (any time beside Phase 2/3); 26 after all others; 27 last |

Shared files that several tasks touch (`src/shared/README.md`, `GLOSSARY.md`, `package.json`, the CI workflow): edit
them only at the end of a task, in small hunks, so parallel tasks rebase cleanly.

---

## Phase 0

### Task 1: The naming correction in the docs (S)

**Goal:** *Book 1* means the first duel; the reading course is *the lessons*.
**Files:** `GLOSSARY.md`, `CLAUDE.md` (map), `docs/adr/0002-first-duel-is-book-2s-tower.md`, `src/duel2/README.md`,
`src/clock/README.md`, `src/shared/README.md`.
- [ ] GLOSSARY: replace the *Book 1* entry: "The first wizard duel (nikkud, by sound), now Book 2's tower screen.
  _Avoid_: the old app." Merge it with the *Duel* entry. Add *The lessons*: "The reading course: letters, nikkud,
  syllables, words, sentences, stories; the home's shelf of older activities. _Avoid_: Book 1." Fix *Parent area*
  (one shared area, see Task 14) only when Task 14 lands.
- [ ] CLAUDE.md map: split row 1 into "The lessons and home" (`src/App.tsx`, `progressStore` `alef-progress`) and
  "Book 1, the first duel (Book 2's tower)" (`src/hooks/useDuelGame.ts`, `src/utils/duel/`, `src/components/duel/`).
- [ ] ADR 0002 and the READMEs: "Book 1's duel" stays correct; "Book 1's save" (`useProgressStore`) becomes "the
  lessons' save, which also holds the first duel's history". Grep: `grep -rn "Book 1" --include=*.md .`
**Accept:** no doc says Book 1 = the reading course. **Risk:** none. Docs only: no full suite needed.

### Task 2: Bugs in the lessons, test first (M)

**Goal:** fix four lesson bugs, each with a failing test first.
**Files:** `src/pages/Nikkud/NikkudNodeView.tsx`, `src/pages/Syllables/SyllableNodeView.tsx`,
`src/stores/progressStore.ts`, `src/pages/{Letters,Nikkud,Syllables,Words,Sentences}/*Page.tsx`; new tests
`src/stores/progressStore.test.ts`, `src/pages/lessons.test.tsx`.
- [ ] **Hooks after an early return.** `NikkudNodeView` returns at the "not found" branch (L146) before 3 `useMemo`, a
  `useEffect` and a `useCallback` (L158–309); `SyllableNodeView` returns at L238 before 2 `useCallback` and 2 `useMemo`
  (L320–342). Test: render each view at a valid id, then rerender at an unknown id in one `MemoryRouter` (React throws
  "Rendered fewer hooks"). Fix: move the hooks above the return and make them tolerate a missing item (return `[]`).
- [ ] **`recordAttempt` drops progress for an unknown node** (L117: `if (!node) return state`). `LetterNodeView`,
  `WordGroupView`, `SentenceGroupView` never call `initializeNode`; they rely on the list page having done it during
  render, so a deep link (or a reload on the node) records nothing. Test: on a fresh store, `recordAttempt('words-x',
  …)` keeps the attempt and the stats. Fix: create the node inside `recordAttempt` with the same fields as
  `initializeNode` (one private `newNode(id)` helper used by both). `setNodeState` has the same early return (L159)
  and the node views call `setNodeState(nodeId, 'mastered')` at the end: create the node there too, and test it.
- [ ] **Mastery demotes** (L147: `state: successRate >= 0.8 ? 'mastered' : 'in_progress'`). Test: a mastered node
  gets one wrong attempt and stays mastered. Fix: `node.state === 'mastered' ? 'mastered' : …`.
- [ ] **`initializeNode` during render** in the five list pages (Letters L66/77, Nikkud, Syllables, Words, Sentences
  L42/53). Test: render a list page with a spy on the store's `setState`: no write during render (React warns "Cannot
  update a component while rendering"; assert on `console.error` too). Fix: compute the display state purely; call
  `initializeNode` for the open nodes in one `useEffect`.
**Accept:** the four tests fail before and pass after; the full suite is green. **Risk:** the save shape is unchanged
(no migration). The demotion fix changes what the lesson map shows for a node that fell under 80 % — that is the fix.

### Task 3: ESLint, and lint in CI (M)

**Goal:** `npm run lint` works and is green, and CI runs it.
**Files:** `package.json`, new `eslint.config.js`, `.github/workflows/deploy.yml`, the files with violations.
- [ ] Dev-install `eslint@9`, `@eslint/js@9`, `typescript-eslint@8`, `eslint-plugin-react-hooks@5`, `globals`. Pin
  react-hooks to v5: v6+ adds the React Compiler rules, which are a separate decision.
- [ ] Flat config: `js.configs.recommended` + `tseslint.configs.recommended` for `src/**/*.{ts,tsx}`, browser globals;
  `react-hooks/rules-of-hooks: error`, `react-hooks/exhaustive-deps: error` (it is on; with `--max-warnings 0` warn and
  error are the same). `@typescript-eslint/no-unused-vars` with `argsIgnorePattern: '^_'`. Ignore `dist`.
- [ ] Script: `"lint": "eslint src --report-unused-disable-directives --max-warnings 0"` (`--ext` is gone in v9).
- [ ] Fix the violations. A dry run on f72a7ca found 26 (after Task 2, 17 are left): unused vars (5: `tts.ts`
  `activeRequests`, `useRun.test.tsx` `links`, …), `no-explicit-any` (2, `duel2/logic/dbg.test.ts`), one stale disable
  (`clock/useWorkday.ts` L397), `exhaustive-deps` (8: `useDuelGame.ts` ×3 `say`/`onCue`, `Glyph.tsx` ×3 `tick`,
  `Battlefield.tsx` `mq`, `SyllableBlend.tsx` `playError`), and `no-dupe-else-if` at `clock/useWorkday.ts` L285.
  - The `useWorkday` case is a false positive: two `rng() < 0.3` calls are two draws. Rewrite without changing the
    draw order (`else { if (rng() < 0.3) … else if (rng() < 0.3) … }` flattened into a nested `if`), not a disable.
  - `exhaustive-deps`: add the dependency when it is stable (a `useCallback`/ref); where adding it would re-run an
    effect that must run once, use a ref and say why in a comment. `Glyph.tsx`'s `tick` is a deliberate re-measure
    trigger: one justified `// eslint-disable-next-line` per line is allowed there; nowhere a file-wide disable.
- [ ] CI: `npm ci && npm run lint && npm test && npm run build` in the **staging (main) step only**. The workflow
  also builds `release`, whose `package.json` has no eslint until `release` is fast-forwarded: `npm run lint` there
  fails and then nothing deploys. The production step stays `npm ci && npm test && npm run build` (`release` only gets
  commits that passed the staging step). The same holds for `npm run check` (Task 6).
**Accept:** `npm run lint` exits 0; CI runs it. **Risk:** an `exhaustive-deps` fix in `useDuelGame` can change when a
line plays: run `useDuelGame.test.tsx` and `Tower.test.tsx` after each one.

### Task 4: Retire speckit (S)

- [ ] `git rm -r .specify .claude/commands/speckit.*.md`. Keep `specs/` (history). Check nothing references them:
  `grep -rn "specify\|speckit" --exclude-dir=specs --exclude-dir=node_modules .`
**Accept:** the grep finds only history. Docs only.

### Task 5: Remove all dead code (L)

**Goal:** nothing unused stays; the first duel's standalone page goes.
- [ ] **Evidence for `#/duel`.** No UI path reaches it: the home's duel card links to `duel2/` (`DuelCard.tsx`
  `DUEL_HREF`); no `navigate('/duel')` or `href` exists (grep `"/duel\b"` in `src`); `RoutesPage` does not list it; the
  one-duel plan 3 kept it "reachable by its address" only until Plan 4 removed its card, which it did. So delete:
  the `/duel` route, `pages/Duel/DuelPage.tsx` + test, and what only it uses: `components/duel/{DuelHud,StartCover,
  PauseCover,RunSummary,ResultBanner?}` (check each with grep: `ResultBanner`, `Explosion`, `Clue`, `Monster` may be
  used by `Battlefield`, which the tower uses), `preloadDuelAudio`, `duelMusicOn`/`setDuelMusic`, `Settings.duelMusic`
  (keep the field in the type as optional: old saves hold it). `#/duel/glyphs` (`DuelGlyphSheet`, verify builds only)
  is a QA tool for the tower's runes and monsters: move it to Book 2's test-hook routes as `#/tower-glyphs` (next to
  `#/glyphs`), not delete. Replace the `/duel` route with `<Navigate to="/" replace />` (a HashRouter with no match
  shows a blank page, not the home) and test it.
- [ ] Then `useDuelGame`'s standalone branches (no `embedded`) are dead: remove them (music tiers stay if the tower
  uses them — it passes `music: false`, so `playMusic`/`trackForWave`/hush go too; verify with the tests).
  `embedded` becomes required (Task 23 turns it into controller options). **Do not delete the standalone tests in
  `useDuelGame.test.tsx` wholesale**: ~25 of them (L44–403: voice order, the 800 ms gap, pause during an
  announcement, double tap, twin, "almost" before the outcome, pace, confusions, shorter feedback, boss, timeout,
  mute after leave, unlock on resume, telemetry) test flow the tower still runs, and they are the characterization
  tests for Tasks 11, 17, 23 and 24. Port each to embedded options (first, in its own commit, with the standalone code
  still there: green on both); delete only the cases for removed features (music, session/run-end records, the
  hook's own visibility pause). List the ported and the deleted cases in the report.
- [ ] Known dead: `src/utils/storage.ts`, `src/stores/settingsStore.ts` (its key `alef-settings` stays unused forever:
  note it in the shared README), `src/data/audio-manifest.yaml`, `src/data/activities/*.yaml`, `src/utils/audio.ts`
  (keep `getLetterNameAudio`, `getSyllableSoundTTS`, `preloadLetterNamesByIds` and what they need; ~19 of 22 exports
  go), `unlockAudio`, `isAudioUnlocked`, `clearAudioCache`, `playSequence` in `src/hooks/useAudio.ts`.
- [ ] knip: add `knip.json` with entries `src/main.tsx`, `src/duel2/main.tsx`, `src/clock/main.tsx` (the HTML entries
  are not found on their own), `scripts/**/*.ts`, `worker/src/index.ts`; project `src/**`; `ignoreExportsUsedInFile:
  true`. A dry run lists unused files `components/common/{Card,LoadingSpinner}.tsx`, `components/sentences/
  SentenceCard.tsx`, the five `components/*/index.ts` barrels, `utils/randomize.ts`; unused deps
  `@modyfi/vite-plugin-yaml`; `wrangler` is used by `worker/` (keep: add it to `ignoreDependencies` with a comment);
  ~110 unused exports. Verify each by hand (`import.meta.glob`, yaml imports, `?url`, tests, `worker/`, `scripts/`).
  Remove dead code; for an export used only in its file, drop `export`. A duplicate default+named export: keep the
  named one and change the importers.
- [ ] Not sure, so keep and list in the report: `pages/Debug/RoutesPage.tsx` (`#/debug/routes`, a developer tool; Task
  15 links it from Developer).
- [ ] The `devMode` URL param and Ctrl+Shift+D (`App.tsx` L60–89) turn on dev mode with no gate, which the gate
  rule forbids on production. Keep both only when `import.meta.env.MODE !== 'production'` (dev, test, verify); on
  production, dev mode is switched only in the area's Developer section (Task 14). Check that no test or verify
  script needs `?devMode=true` on a production build.
**Accept:** `npx knip` is clean; lint and the full suite green; the build works. **Risk:** high-ish: delete in small
commits (one per area) so a bad deletion reverts alone; build after each.

### Task 6: Guardrails in CI (M)

**Files:** `package.json`, new `.dependency-cruiser.cjs`, new `src/shared/entryPoints.test.ts`, `vite.config.ts`, CI.
- [ ] dependency-cruiser rules (errors): `logic/` (`src/duel2/logic`, `src/clock/logic`, `src/utils/duel`) never
  imports `components/` or `screens/`; `src/shared/` never imports outside `src/shared/` (tests excluded:
  `rehydrateOnRestore.test.ts` imports the progress store); `src/clock` never imports
  `src/duel2` except `src/duel2/assets/img/` (the wizards; or move them to `src/shared/assets/` — preferred, then no
  exception); `src/duel2` imports the first duel only through `src/hooks/useDuelGame.ts`, `src/utils/duel/`,
  `src/components/duel/`, `src/assets/duel/`, `src/types/duel.ts`, `src/types/progress.ts` (the store imports it),
  `src/stores/progressStore.ts` (it stays: `Duel2App` reads it for `?station=` and `importFirstDuel`; only the
  controller loses it in Task 18), `src/components/home/StationPic.tsx`; home (`src/components/home/`) imports Book 2
  only through `saveFormat.ts`, `station.ts`, `logic/{mastery,predict}.ts`, `assets/img/` (today `stations.ts` also
  has `import type { Duel2Save } from '../../duel2/store'`: move that type to `saveFormat.ts`, or set
  `tsPreCompilationDeps: true` and allow it). No cycles. Today's known violation
  `utils/duel/flow.ts → components/duel/Explosion` goes in a commented `known` list that Task 23 empties.
- [ ] Test: every `src/**/main.tsx` (glob with `node:fs`) has `shared/stagingStorage` as its first import line.
- [ ] knip in CI (`npx knip`); `npm run check` = lint + depcruise + knip, in the staging step only (see Task 3).
- [ ] `vite.config.ts` test: `maxWorkers: process.env.CI ? undefined : 2` (several agents share one small host).
**Accept:** CI runs `npm run check` before the tests; a deliberate violation fails each check (try once, revert).

---

## Phase 1: the game kit, settings, the parent area, telemetry

### Task 7: Telemetry core (M)

**Goal:** every event says its game; one session id per page load; the export can filter.
**Files:** `src/shared/telemetry.ts` + test, `src/duel2/telemetry.ts`, `src/clock/telemetry.ts`,
`src/utils/duel/telemetry.ts`.
- [ ] Move `session` to module scope (today each `createTelemetry` makes its own, so a Book 2 page has two sessions).
- [ ] `createTelemetry(key, { game, maxChars, about })`: every event gets `g: game` (`'book2' | 'clock' | 'duel'`).
  Keep `t, s, run, e` and every existing field: add, never rename (the parent's analysis reads them).
- [ ] Pure helpers for the export: `readLog(key): TelemetryEvent[]` (no instance, no listeners: the area reads logs of
  games not loaded on this page), `filterEvents(events, { since?: number })`, `exportDoc(parts: { about, events }[])`.
- [ ] Budget test: the sum of the caps stays under the origin quota with room for the saves. Today three logs of
  1,000,000 chars each (≈2 MB each in UTF-16) can reach ≈6 MB, over a 5 MB quota, and then a save write fails. Set
  live caps that make the total strictly lower than today: Book 2 0.7 M, clock 0.5 M, plus the frozen duel log as it
  stands (≤1 M, untouched): ≤2.2 M in all, against ≈3 M today. Live logs trim oldest first, as `flush` does now.
  - **Staging shares the quota** (ADR 0001: one origin, one localStorage): staging's logs and saves count against the
    same ≈5 MB as the child's. In the staging build, use a quarter of each cap. `?copy-prod` (`copyUnprefixedOver`)
    must skip the `*-telemetry` keys: a copy of 1.5 M chars can fill the origin, and then the child's next save write
    on production fails. Test both.
  - **The frozen duel log is never trimmed or rewritten** (owner decision, 2026-11-16: the child's history is not deleted
    by an update). It stays at its current size, read-only, exportable. The budget above already counts it at its cap.
**Accept:** old events read unchanged; new ones carry `g`. **Risk:** lowering a cap trims old events on the next
flush: the parent should export once before release (say so in the release note of the report).

### Task 8: Device settings (M)

**Goal:** volume, effects, music are one device setting for all games.
**Files:** new `src/shared/deviceSettings.ts` + test; `src/duel2/store.ts`, `src/clock/store.ts`,
`src/hooks/useAudio.ts`, `src/components/stories/SpeechProvider.tsx`.
- [ ] Key `alef-device` (not `alef-settings`: old devices may hold the dead settingsStore's data there):
  `{ v: 1, sfx, music, volume }`. API like `shared/player.ts`: `getDeviceSettings()`, `setDeviceSettings(p)`,
  `useDeviceSettings()` (`useSyncExternalStore`, reacts to the `storage` event and re-reads on `pageshow`: a page
  restored from the back-forward cache gets no `storage` event for a change made on another page meanwhile; see
  `rehydrateOnRestore`).
- [ ] One-time seed when the key is missing: read the raw `alef-duel2` JSON (`state.settings.{sfx,music,volume}`);
  if absent, the raw `alef-clock` settings; else defaults (`true, true, 0.8`). Write the key at once.
- [ ] Readers switch to it: Book 2 and the clock (their `settings.sfx/music/volume` fields stay in the saves, unread:
  no save migration), the lessons' `useAudio` and `SpeechProvider` (today `alef-progress` `settings.volume /
  soundEffects`, which no screen can change). Game-specific settings stay in each save.
  **Careful:** `useAudio().play` (the lessons' voice, `src/hooks/useAudio.ts` L140) returns early when
  `soundEffects` is false. Do not map the device `sfx` onto that: "effects off" set in Book 2 would make the lessons
  silent, and the child cannot read. Voice follows `volume` only; `sfx` gates only `useSoundEffects` (page turn,
  success, error, celebrate). Test it.
- [ ] Tests: seed from an old Book 2 save literal; from a clock-only save; defaults; a later Book 2 save change does not
  re-seed; staging reads its prefixed copy.
**Accept:** each game plays at the one setting. **Risk:** a parent who set the clock's music off and Book 2's on gets
music in the clock (decided: one setting). Note it for the release.

### Task 9: The game-audio kit, and Book 2 on it (L)

**Goal:** one audio module in `src/shared/gameAudio/`, built from `src/duel2/audio/duel2Audio.ts`.
**Files:** new `src/shared/gameAudio/{kit.ts,howlerPlayer.ts,fakePlayer.ts,kit.test.ts}`; `src/shared/audioCore.ts`
(moves in); `src/duel2/audio/duel2Audio.ts` (becomes a thin table file); `src/duel2/useRun.test.tsx`,
`src/duel2/screens/{shell,session}.test.tsx`, `src/duel2/components/parts.test.tsx`, `Tower.test.tsx`.
- [ ] A player port: `interface AudioPlayer { play(url, { rate, html5, loop, volume, onPlay }): Sound; preload(url,
  html5); setMute(on); setVolume(v) }`, `Sound = { done: Promise<void>; stop(); pause(); resume(); fade(to, ms);
  position(): number | null; playing() }`. `howlerPlayer` wraps `audioCore` (Howl cache, html5 LRU, safety timeout).
  `fakePlayer` (one, shared by all tests): records `{ kind, id, url, at }`, resolves a voice after `voiceMs` (default
  0) or holds it until `release(id)`, a configurable `exists` set, `log()` / `reset()`.
- [ ] `createGameAudio({ game, voices, sfx, sfxFallback, sfxPick: 'rotate' | 'random', music, feminine, telemetry,
  lineTimeoutMs, sfxTimeoutMs, gapMs, musicVol, duckVol, dramatic? })` gives `sayParts`, `say`, `sayInfo`,
  `voiceSignal`, `cancelVoice`, `stopVoice`, `voiceIdle`, `playLine(id, { cues?, onWord?, caption? })` (one file, no
  queue: Book 1 and the clock), `playSfx(name, { volume? })`, `startMusic(kind)`, `stopMusic`, `preloadVoices`. The
  feminine fallback (`voiceFor`) and its once-per-id `voice-fallback` event live here.
- [ ] Device output in one place (`src/shared/gameAudio/output.ts`): `useDeviceSettings` → volume/sfx/music, mute on
  page hide, `holdAudio` (the pause cover), `unlock`. Howler's mute and volume are global, so this is one singleton.
- [ ] `duel2Audio.ts` keeps its exported names (`sayParts`, `say`, …) as re-exports of its kit instance, so the
  controller and the screens do not change. `setVoicePlayer`/`setVoiceExists` go: tests call
  `useFakeAudio()` (a helper beside `fakePlayer` that installs it in `beforeEach` and resets it).
- [ ] Tests: move `duel2Audio.test.ts`'s cases to `kit.test.ts` on the fake player (queue order, 800 ms gap, cancel
  one speaker, stop drops the queue, fallback logged once, sfx rotation and fallback table, music duck). Keep
  `__d2audio` (the QA audio log in test builds): the kit takes an `onSay(id)` hook.
**Accept:** `useRun.test.tsx` passes unchanged except the seam import; `duel2Audio.ts` < 60 lines. **Risk:** timing.
The real queue awaits `setTimeout(gapMs)`: keep it on `window.setTimeout` so the fake-timer tests see the same ticks.
ADR candidate: "games get audio through a player port; Howler is one adapter".

### Task 10: The clock on the kit (M)

**Files:** `src/clock/audio/clockAudio.ts`, `wordTiming.ts` (stays), `src/clock/screens/Workshop.test.tsx`,
`screens.test.tsx`, `ClockApp.test.tsx`, `components/ExplainPlayer.test.tsx`, `src/clock/README.md`.
- [ ] A clock kit instance; `playVoice(id, caption, onWord)` = kit `playLine` with `onWord`: the kit follows the
  sound's `position()` with `followPlayback`; a missing file walks the caption at `WORD_ESTIMATE_S` (keep that code
  path and its test). Music: `startMusic(day)` → the kit's track rotation by an index.
- [ ] `Workshop.test.tsx`: replace the 13-function `vi.mock('../audio/clockAudio')` with the fake player. Its voice
  mock waits for the caption to show and holds chosen ids (`hold.re`): the fake player's `holdUntil(re)` and an
  `onPlay` hook give the same; keep the 20 ms start delay as `voiceMs: 20`.
- [ ] README: delete the "copy its mock list" note.
**Accept:** all clock tests green with no `vi.mock` of the audio module. **Risk:** Workshop's tests are timing-
sensitive (comments at L24–29): run that file 5× in a row before the full suite.

### Task 11: Book 1's audio on the kit (M)

**Files:** `src/utils/duel/duelAudio.ts` + test, `src/hooks/useDuelGame.ts`, `useDuelGame.test.tsx`, `Tower.test.tsx`.
- [ ] A duel kit instance: `sfxPick: 'random'` (today it picks a random variant: keep it), boom volume by power
  (`playSfx('boom', { volume })`), `LINE_CUES` timed from the call (as today, not from playback), the dramatic set.
  After Task 5 the music code is gone (the tower plays no duel music); if it is not, port `hush` into the kit's music.
- [ ] `configureDuelAudio({ sfx, volume })` from the run goes: the device settings feed it (Task 8).
- [ ] Delete `duelAudio`'s copies of play/duck/mute code. (Task 9 deletes `duel2Audio`'s and Task 10 `clockAudio`'s,
  each in its own task: Task 10 runs beside this one, so this task does not edit `src/clock/`.)
**Accept:** `grep -rn "from 'howler'" src` (non-test files) finds only `src/shared/gameAudio/howlerPlayer.ts` (and
the lessons' `useAudio.ts`, out of scope: list it in the shared README); check it again in Task 12, once 10 and 11
are both in.

### Task 12: The game shell (M)

**Goal:** one shell in `src/shared/shell/` that Duel2App and ClockApp use.
**Files:** new `src/shared/shell/{GameShell.tsx,preload.ts,usePageHidden.ts}` + tests; `src/duel2/Duel2App.tsx`,
`src/duel2/assets/preload.ts`, `src/clock/ClockApp.tsx`, `src/clock/assets/preload.ts`, the PauseCovers.
- [ ] `preload.ts`: `createPreloader({ fonts, images, voices, skipVoice })` with the shared `READY_MS = 8000`,
  `loadImage` (decoded images kept), `warm` (4 parallel fetches). Both `assets/preload.ts` become 5-line configs.
- [ ] `usePageHidden(onHide)`: visibilitychange + pagehide + pageshow (the clock listens to pageshow too; Book 2 does
  not: use the union, it is harmless) → `output.setHidden`.
- [ ] `GameShell` props: `preload`, `askGender` (pictures, line, cues, play/stop), `onPlay`, `pauseCover` (a render
  prop: each game keeps its own picture), `parent` (the area, Task 14). It owns: preload on mount, the play gate
  (unlock audio → wait for preload → ask boy/girl if unset → play), the pause cover's `holdAudio`.
- [ ] Keep each game's own differences as props: the clock's welcome line plays during the preload; the clock's cover
  music after the first tap; Book 2's station cover and gallery.
- [ ] Do not lose what `Duel2App` does around the screens today: the `?station=` deep link read once at mount (and
  the `onExit`/`onHome` difference for a path session), `importFirstDuel` on mount, the test-build hashes
  (`#/glyphs`, `#/summary`, `#/summary-session`, `#/strokes`), `RotateHint` (hidden on parent screens), `leave()`
  (stop voice and music, flush telemetry, then home), and the screen-ref check after the preload (a tap that left the
  cover meanwhile does not start a run). Add a test for each that has none (at least the station link and the
  screen-ref check) **before** moving the code.
- [ ] The staging import stays the first line of each `main.tsx` (Task 6's test guards it).
**Accept:** `shell.test.tsx`, `ClockApp.test.tsx` green; both apps lost their own visibility/preload code.
**Risk:** the play gate's order (unlock inside the tap) matters on iOS: keep `unlock()` synchronous in the handler.

### Task 13: The gate (S–M)

**Goal:** one gate for every way into a parent screen (rule: *Interaction*, after the home-button rule).
**Files:** new `src/shared/parentGate/{ParentGate.tsx,YearPad.tsx,acceptYear.ts}` + tests; move
`src/duel2/components/HoldButton.tsx` to `src/shared/` (the clock's cover has its own hold code: replace it);
`src/components/settings/AgeGate.tsx` (delete: it stores `alef-settings-verified` in sessionStorage and shows error
text; the new rule says store nothing, fail silently).
- [ ] `acceptYear(y, now)`: an integer with `now.year − 100 ≤ y ≤ now.year − 18`. Test the edges.
- [ ] `ParentGate`: the held button (2 s ring) → a number pad (digits, delete, no text for the child beyond the
  digits; a parent screen may show text, the pad screen is the parent's) → on 4 digits: accept → `onOpen()`, else
  `onCancel()` silently, back to where the child was. A tap outside cancels. Nothing is stored.
- [ ] Every entrance uses it: Book 2's cover sliders button, the clock's cover parent button, the home gear (today a
  plain tap to `#/settings`), and the home's stats box when it leads to parent content (Task 15 decides what stays
  child-facing on `ProgressPage`).
**Accept:** tests: hold < 2 s does nothing; wrong year → no area and no message; right year → area; no storage write.

### Task 14: The parent area's frame (M)

**Goal:** one area component, mounted in every entry page, opened at the current game's section.
**Files:** new `src/parent/` (its own module: it may import each game's declared `parent/` files, nothing else of a
game: add the rule to depcruise): `ParentArea.tsx`, `sections/{Child,Sound,Data,Developer}.tsx`, `registry.ts`;
`src/duel2/Duel2App.tsx`, `src/clock/ClockApp.tsx`, `src/App.tsx` (route `/settings` → the area).
- [ ] Sections in order: Child (boy/girl: `PlayerSetting`) · Sound (device settings) · Progress (Task 16) · this game's
  settings (Task 15) · Data (Task 17) · Developer. Text and English are allowed (parent screen).
- [ ] The registry: each game gives `src/<game>/parent/index.ts` with `{ id, title, Settings?, summary(raw), mixups(raw),
  reset() , devTools? }`. `summary`/`mixups` read the raw save (like `duel2/saveFormat.ts`), so the area shows all games
  without creating other games' stores (creating a store writes its save). Only the current game's `Settings` and
  `reset` show. Keep each `parent/index.ts` light: it must not import its game's store, audio or telemetry module
  (a telemetry instance adds `pagehide` listeners that rewrite its log; an audio module builds a kit). Load
  `Settings` with `React.lazy`, only for the current game. depcruise rule: `src/<game>/parent/index.ts` imports
  no `store.ts`, `audio/`, `telemetry.ts`.
- [ ] Developer (on production too): the lessons' dev mode, `#/debug/routes`, Book 2's screen gallery, stroke review,
  drawing test board, tower glyph sheet (test builds only, as today).
- [ ] Each app's "parent" screen state opens `<ParentArea game="book2" … onClose>`; Close goes back. Book 2's
  developer screens (gallery, strokes, draw test) go back to the area, as they go back to `Parent` today; the
  `RotateHint` stays hidden on the area. The clock keeps stopping its music when the area opens (`ClockApp` L52).
- [ ] **No way past the gate by history.** In the main app the area is a route (`#/settings`): after the gate the
  child can come back to it with the browser's Back/Forward or a reload. So the route itself shows the gate first on
  every mount (the gear just navigates), and Close uses `navigate('/', { replace: true })`. Test: open via the gate,
  close, `history.forward()` → the gate, not the area.
**Accept:** the area opens from each app behind the gate; Close returns to the cover; the history test above.

### Task 15: The game sections (M)

**Goal:** every existing parent capability is in the area; the old parent screens go.
**Files:** `src/duel2/parent/`, `src/clock/parent/`, `src/lessons/parent/` (new folder for the lessons' part, or
`src/pages/parent/`); delete `src/duel2/screens/Parent.tsx`, `src/clock/screens/Parent.tsx`,
`src/pages/Settings/SettingsPage.tsx`, the parent parts of `src/pages/Progress/ProgressPage.tsx`
(`DuelStatsCard`, `PlayerSetting`), `components/duel/DuelStatsCard.tsx`; move their tests
(`duel2/screens/parent.test.tsx`, `clock/screens/Parent.test.tsx`, `DuelStatsCard.test.tsx`).
- [ ] Book 2: stage line, the "open Book 2" placement control (`data-open-book`), drawing on/off + stroke count,
  shopping range, money table, per-screen/letter/vowel tables, top mix-ups, the first duel's history (sessions, best,
  per-mark table: today in both Book 2's Parent and `DuelStatsCard`; keep one), flight speed + reset, Reset (Book 2
  only). Keep every `data-*` hook the tests and verify scripts use.
- [ ] Clock: languages, caption mixes, level/rounds/gears, feature table with predicted miss, confusions, Reset (clock
  only). Lessons: font, Reset (lessons only: today `resetProgress` also wipes the first duel's history in
  `alef-progress.duel` — keep `duel` on a lessons reset, and test it).
- [ ] The settings-change events (`settings`, `book-open`, `player` with `by: 'parent'`) keep their names and fields.
- [ ] `ProgressPage` keeps only the child's achievements (it has Hebrew text: out of scope; list it in the report).
**Accept:** a checklist in the PR body maps each old control to its new place; old tests pass at the new path.

### Task 16: The progress section: time played and mix-ups (M)

**Files:** new `src/shared/playtime.ts` + test; `src/parent/sections/Progress.tsx`; the shell (Task 12) and
`src/App.tsx` record time.
- [ ] Telemetry cannot give minutes reliably (logs are trimmed; the lessons have none), so add a small ledger
  `alef-playtime`: `{ v: 1, days: { 'YYYY-MM-DD': { book2: ms, clock: ms, lessons: ms } } }`, kept 60 days. The shell
  adds the time a play screen is visible and not paused (flush each 15 s and on hide); the main app adds time on a
  lesson route. The main page and Book 2's page both write this key (and a page can come back from the
  back-forward cache): each flush reads the key, adds its own unflushed ms, and writes (no in-memory copy written
  back), so one page never overwrites the other's minutes. Test: two writers interleaved keep both totals.
- [ ] The section opens with a 7-day table (minutes per day per game), then each game's top 5 mix-ups (registry
  `mixups`), then each game's summary line.
**Accept:** tests with a fake clock: a hidden page adds nothing; midnight splits; 61-day-old entries drop.

### Task 17: The telemetry join and one export (M)

**Goal:** the tower's events go to Book 2's log; one export with a picker.
**Files:** `src/hooks/useDuelGame.ts` (a `telemetry` option, required in embedded mode), `Tower.tsx`,
`src/utils/duel/telemetry.ts`, `src/parent/sections/Data.tsx` + test, ADR `docs/adr/0003-one-telemetry-log-per-game.md`.
- [ ] The tower passes Book 2's telemetry; the duel's events get `via: 'tower'` (Book 2 already uses `pause`,
  `resume`, `replay`, `abandon`, so the field tells them apart). The duel's `run` counter becomes Book 2's run
  number: the hook must stop calling `setTelemetryRun(runId)` (`useDuelGame.ts` L457) on the instance it is given,
  or every tower visit resets Book 2's run number. Keep the hook's own visit counter as a field (`visit`). This fixes the bug that a Book 2 run writes the tower to `alef-duel-telemetry`.
- [ ] Old `alef-duel-telemetry`: keep it as is, frozen (nothing writes it any more), listed in the picker as "First
  duel (history)". Reason: its events have the old shapes the analysis scripts read; rewriting them into Book 2's log
  would mix two run counters and could push Book 2's events over its cap. Its cap is the budget of Task 7.
- [ ] Data section: game checkboxes (default: the game the area was opened from), period (last 30 days | all), one
  Download (`alef-telemetry-<games>-<date>.json`, one doc with one `about` per game), per-game Clear, event counts.
  The game sections link to it (Book 2 and clock lose their own Export buttons). For the game whose page is open,
  read and clear through its instance (`flush()` first; `clear()` empties its in-memory events too), not through
  `readLog`/`removeItem`: otherwise unflushed events are missing from the export, or a cleared log comes back on
  the next flush. Test both.
**Accept:** a test runs a Book 2 tower visit with the fake player and finds the duel's `round` events in
`alef-duel2-telemetry` with `g: 'book2'`, `via: 'tower'`, the page's one session id; none in the old key.
**Risk:** the parent's analysis script may filter on `e` only: tell the parent in the report to also filter `via`.

---

## Phase 2: RunController (behaviour must not change)

Before starting: run `useRun.test.tsx` and note its time; it must not slow down.

### Task 18: Seams: the sleeper and the save port (M)

**Files:** new `src/shared/sleeper.ts` + test, new `src/duel2/savePort.ts`, `src/duel2/controller.ts`,
`src/duel2/layout.ts`, new `src/duel2/broomLayout.ts`, `components/screens/{Doors,Broom}.tsx`, `useRun.test.tsx`.
- [ ] `Sleeper = { sleep(ms): Promise<void>; after(ms, fn): () => void; frame(fn): () => void; now(): number }`;
  `realSleeper` (window timers, rAF) and `instantSleeper` (resolves on the next microtask; `now` advances by the
  asked time). Replace the controller's 14 raw `setTimeout`/rAF uses (L550, 784, 1381, 1387, 1665–1668, 1720, 1742,
  1754, 1760, 2093, 2257, the broom timer) with `this.time`. `RunOpts.sleeper` defaults to real; existing tests keep
  fake timers + real sleeper (no change of expectations).
- [ ] `SavePort`: the reads and writes the controller does (`stage`, `settings.drawing`, `bookOpen`, `merchant`, …,
  every `useDuel2Store.getState().x()` call) plus the first duel's recent answers (today `useProgressStore` at L655,
  L677, L1134). `storeSavePort` (Book 2 store + progress store) and `memorySavePort(initial)`. The sandbox flag's
  "write nothing" becomes `memorySavePort` for the gallery.
- [ ] Move `ZOOM_MS` from `components/screens/Doors` to `layout.ts`; `BROOM_ORB`, `LANE_Y`, `flightPath`, `orbX` from
  `components/screens/Broom` to `broomLayout.ts` (the view and the tests import them there). The controller also
  has `import type { Highlight } from './components/ExplainPanel'` (L24): move `Highlight` to a non-component file
  (e.g. `src/duel2/viewTypes.ts`), or the depcruise rule below fails.
**Accept:** controller has no `window.` timer and no `useProgressStore`; depcruise rule "controller imports no
`components/`" added; full suite green.

### Task 19: The merchant policy (L)

**Files:** new `src/duel2/policies/merchant.ts` + test; `controller.ts` (~L702–1065); the merchant `describe` in
`useRun.test.tsx` (L1820–2463).
- [ ] Shape for every policy: `step(state, event) → { state, view?: Partial<MerchantView>, say: LineRequest[], sfx:
  Sfx[], save: SaveOp[], track: TelemetryEvent[], wait?: Wait }`. Pure: no store, no time. The controller interprets
  the result (say through the kit, sleep through the sleeper, write through the save port).
- [ ] Move the visit, the demo, the walkthrough/help, pay loop, count verdict, undo, buy, decline, idle and the level
  adaptation (`merchantPaid`) into it. Events: `arrive`, `coin`, `hand`, `potion`, `decline`, `idle`, `heard`.
- [ ] Order (the same for Tasks 20–22): (1) write `policies/merchant.test.ts` and the policy; (2) switch the
  controller to it with the merchant `describe` in `useRun.test.tsx` **unchanged** — it is the characterization test,
  and it must be green on the new code before any of it is removed; commit; (3) only then, in a separate commit,
  remove from `useRun.test.tsx` the cases the policy test now covers, keeping those that check voice order and timing
  end to end. Never change and remove an end-to-end case in the same commit as the code it covers.
**Accept:** step (2) green with the old describe; the merchant describe in `useRun.test.tsx` is ≤ ⅓ of its size after
step (3); the policy test has no fake timers.

### Task 20: The draw-round policy (L)

**Files:** new `src/duel2/policies/draw.ts` + test; `controller.ts` (~L1675–1930); `useRun.test.tsx` "drawing
screen" describe (L2712–3050).
- [ ] State: strokes, checker, marks, help count; events: `stroke(pts)`, `settle`, `idle`, `hint`. `LetterChecker`
  and `judgeMarks` stay in `logic/recognizer.ts`; the policy sequences them.
- [ ] Move the pure cases as in Task 19.
**Accept:** as Task 19, for drawing.

### Task 21: The broom boss policy (M)

**Files:** new `src/duel2/policies/broomBoss.ts` + test; `controller.ts` (~L1931–2153, `bossView`, `bossHit`,
`bossWin`, `decideBoss`); "the flight boss" describe (L2464–2605).
**Accept:** as Task 19, for the boss.

### Task 22: Pass and hearts (M)

**Files:** new `src/duel2/policies/pass.ts` + test; `controller.ts` (`loop`, `nextOf`, `lenFor`, `runPassHeart`,
`runCheckpoint`, `endRun`); "the end of a pass" and "shorter visits" describes.
- [ ] Policy: the cycle position, pass hearts, the full-pass heart (not at stage 0), skip and short visits, the
  checkpoint decision (`merchantDue`), the run end. The controller keeps the loop and the time.
- [ ] Measure: `controller.ts` under ~1200 lines. If not, list what is left and why in the report (do not force it).
- [ ] README: replace the *Known friction* lines; ADR candidate `0004-run-policies-and-the-sleeper.md` (pure policies,
  the controller as interpreter; why not a state machine library).
**Accept:** merchant and draw describes test their modules directly; the controller < ~1200 lines; full suite green.

## Phase 3: the first duel's flow

### Task 23: The duel controller (L)

**Files:** new `src/utils/duel/controller.ts` (framework-free) + test; `src/utils/duel/flow.ts`;
`src/components/duel/{Explosion,Icon}.tsx`; new `src/utils/duel/effects.ts`, `src/types/duel.ts`.
- [ ] Move `EFFECT_PRESETS` to `utils/duel/effects.ts` and `IconName` to `types/duel.ts`; empty the depcruise `known`
  list.
- [ ] `DuelController(opts)`: the embedded options (wave, waves, boss, seen/onSeen, onAnswer, onMega, mega/onCharge,
  onDone, dry, owed/onIntroduced, placement, onWaveEnd, telemetry), `rng`, `walkOverride`, `makeRound`, `sleeper`,
  `audio` (a kit instance). It owns what the hook's refs own today (L97–140: tokens, answered round, twin, almost,
  mega queue, boss start, pending spawn) and dispatches into `duelReducer`. A snapshot: `getView()` returns
  `{ state, banner, newBest, shake, cue, lightning, celebrate, speaking, hidden, fx, feedback }`; `subscribe`.
  Methods: `start`, `choose`, `mega`, `replay`, `pause`, `resume`, `destroy`.
- [ ] In this task the hook already delegates to the controller (no second copy of the flow), and
  `useDuelGame.test.tsx` (as Task 5 left it), `Tower.test.tsx` and the tower `describe` of `useRun.test.tsx` stay
  unchanged: they are the characterization tests. Task 24 then moves the tests.
**Accept:** the controller test drives one wave with `instantSleeper` and the fake player; the three test files
above unchanged and green.

### Task 24: The thin hook and its tests (M)

**Files:** `src/hooks/useDuelGame.ts` (< ~80 lines, like `src/duel2/useRun.ts`), `useDuelGame.test.tsx`,
`Tower.tsx`, `Tower.test.tsx`.
- [ ] The hook: one controller per mount, `useSyncExternalStore`, latest embedded callbacks through a ref (today's
  `emb` ref), `destroy` on unmount.
- [ ] `useDuelGame.test.tsx` constructs `DuelController` directly (no `renderHook`), on the sleeper and the fake
  player; keep a few render tests for the hook bridge.
- [ ] ADR 0002's consequence line: the tower's tests now include the controller test.
**Accept:** `Tower.test.tsx` and the tower part of `useRun.test.tsx` unchanged and green.

## Also

### Task 25: Rewrite the `/verify` skill (M)

**Files:** `.claude/skills/verify/SKILL.md` (+ a committed driver script, e.g. `.claude/skills/verify/drive.mjs`).
- [ ] Browser: if `ALEF_CDP_URL` is set, `chromium.connectOverCDP(url)`; else `chromium.launch()` (playwright's own
  Chromium, `npx playwright install chromium` once). Every run: `browser.newContext()` (own storage, touch on, a phone
  and a tablet viewport), `context.close()` in `finally`; never close a browser it did not launch.
- [ ] Build with `vite build --mode verify` (turns on `TEST_HOOKS`), serve with `vite preview`. Cover: home (cards,
  path, the gear gate with a year), Book 2 (cover → play → a round, `window.__d2audio` audio log, `#/glyphs`,
  `#/tower-glyphs`, `#/summary`), the clock (cover → workshop → a round), the area (each section opens).
- [ ] Keep the rules from `docs/minigame-rules.md` *Verification*: real touch events (CDP `Input.dispatchTouchEvent`),
  look at screenshots, scan child screens for text. Drop the Edge recipe. Keep the `speechSynthesis` recorder as the
  recipe for the stories (`SpeechProvider` still speaks with it) and keep the current *Gotchas* (bidi, Hebrew literals
  by codepoint, feedback windows).
- [ ] Add `playwright` as a dev dependency (it gives `npx playwright install chromium`; `npm ci` downloads no
  browser) and add the driver script to knip's entries, or Task 6's knip check fails.
**Accept:** the skill runs green against the built app with and without `ALEF_CDP_URL`. Commit no host detail.

### Task 26: Docs sweep (S)

- [ ] GLOSSARY: *Gate*, *Device settings*, *Parent area* (one area, sections), *Game kit*, *Policy*, *Sleeper*,
  *Session id* vs *Session* (a path session: rename the telemetry one "page session" to avoid the clash).
- [ ] CLAUDE.md map: `src/parent/`, `src/shared/gameAudio/`, `src/shared/shell/`; Checks line: `npm run check && npm
  test`. The READMEs' *Known friction*: delete what went, keep what is left (the clock's flow in React closures; the
  lessons' own audio).
- [ ] ADRs written by Tasks 9, 17, 22: link them from the map.
**Accept:** every README's tables match the code (spot-check each module path exists).

### Task 27: Final QA in a real browser, and the release note (M)

Unit tests cannot show audio order, layout or touch on a real screen. Before the branch merges to `main`, run the
whole sweep with the Task 25 driver on a `--mode verify` build, at a phone and a tablet size, with screenshots and
the audio log (rule: *Verification*; QA before any playtest build):
- [ ] Book 2: a full run from a fresh save (placement at stage 0), and from a copy of a real save (a literal fixture
  from an old build) — doors, the tower (intro, a wave, a hit, a miss, a timeout, מגה), the merchant (pay, undo,
  buy, decline), the broom boss, a drawing round, pause and resume on each, a heart lost, the summary. Audio log order
  equal to the same run on `main` before this work (record it at the start of Phase 1).
- [ ] `?station=<screen>` from the home's path: one session, then home. The clock: cover → workshop → a full day.
- [ ] The gate and the area from all three entries (Book 2 cover, clock cover, home gear): a short hold does
  nothing; a wrong year goes back silently; the right year opens the area at that game's section; Back/Forward does
  not reopen it; each section; the sound setting set in one game holds in the other two and in the lessons (voice
  still plays with effects off); the export with 1, 2 and all games, both periods; Clear.
- [ ] Old saves: load fixtures of `alef-progress`, `alef-duel2`, `alef-clock` and the three telemetry keys as the
  release build writes them today; nothing lost (stage, stars, coins, history, lessons nodes); the telemetry total
  under the Task 7 budget; staging with `?copy-prod` copies saves and skips telemetry.
- [ ] Scan every child screen for text (none new except the gate's digits on the parent's pad).
- [ ] Release note for the parent (in the merge report, not in the repo): export all telemetry on production
  before the release (the caps trim old events); one sound setting now (the clock may play music where it was off);
  filter tower events by `via`; the year-of-birth gate.
**Accept:** every item checked, with screenshots; any difference from `main` is either fixed or listed for the parent.

## Open risks

1. **Storage quota.** Three telemetry logs at today's caps can exceed a 5 MB origin quota and make a save write fail
   (Task 7 budget); staging's copies share the same quota. The new caps make the total lower than today without
   deleting the frozen duel log; the live logs' lower caps trim their oldest events, so the parent exports once before
   the release.
2. **Timing in tests.** The audio kit (Task 9/10) and the sleeper (Task 18) touch every timing test; Workshop's tests
   are already sensitive. Keep real timers behind the seams until a task is green, then switch tests.
3. **One sound setting** can turn music on in the clock where the parent had turned it off (Task 8).
4. **The tower's events** gain `via: 'tower'` in Book 2's log; an analysis that filters on `e` only mixes them.
5. **Deleting `#/duel`** removes a page reachable by address only (bookmarks would 404 into the home's hash router:
   the route falls to no match; add a redirect `#/duel` → home in Task 5 to be safe).
6. **`ProgressPage`** stays a child screen with Hebrew text, against the speech rule: out of scope, listed.
