# alef

A Hebrew reading game for a child who cannot read yet. Vite multi-page app: React 19, TypeScript, Zustand (persisted
saves), Howler (audio). Domain words: [GLOSSARY.md](GLOSSARY.md). Decisions not to re-open: [docs/adr/](docs/adr/).

## Map

| Game | Entry point | Read first |
| --- | --- | --- |
| The lessons and home | `index.html` → `src/main.tsx` → `src/App.tsx` (routes) | `src/stores/progressStore.ts` (save `alef-progress`) |
| Hebrew Spell Quest (the run, with its tower; save `alef-spellquest`; the old `duel2/` and `spellquest/` URLs redirect) | `spellquest-he/index.html` → `src/spellquest/main.he.tsx` (`boot('he')`); the engine and the Hebrew course: `src/spellquest/`; the tower: `src/spellquest/tower/` (flow `logic/controller.ts` as `TowerController`, React bridge `useTower.ts`, `components/`) | [src/spellquest/README.md](src/spellquest/README.md) |
| English Spell Quest (the same engine with the English course; the page, not a query, picks the course) | `spellquest-en/index.html` → `src/spellquest/main.en.tsx` (`boot('en')`); `src/spellquest/english/` (the course, its content, logic, save and parent part); the engine in `src/spellquest/`, the seam in `src/spellquest/course/` | [src/spellquest/english/README.md](src/spellquest/english/README.md) |
| Clock workshop | `clock/index.html` → `src/clock/main.tsx` | [src/clock/README.md](src/clock/README.md) |
| Space Cat (flying sums) | `spacecat/index.html` → `src/spacecat/main.tsx` | [src/spacecat/README.md](src/spacecat/README.md) |
| Code two or more games share (`gameAudio/`, `shell/`, `parentGate/`, device settings, telemetry, saves) | `src/shared/` | [src/shared/README.md](src/shared/README.md) |
| The parent area: one screen for every game, behind the gate | `src/parent/`; each game's part in `src/<game>/parent/index.ts` | [src/parent/README.md](src/parent/README.md) |
| Asset review kit (not a game: node tools and the review page; host adapters give it the items) | `tools/review/` (`server.ts`, `cli.ts`) | [tools/review/README.md](tools/review/README.md) |

- Decisions: [ADR 0001](docs/adr/0001-staging-shares-the-origin.md) staging, [0002](docs/adr/0002-first-duel-is-book-2s-tower.md)
  the tower, [0003](docs/adr/0003-audio-through-a-player-port.md) audio, [0004](docs/adr/0004-one-telemetry-log-per-game.md)
  telemetry, [0005](docs/adr/0005-run-policies-and-the-sleeper.md) run policies, [0006](docs/adr/0006-review-decisions-are-an-event-log.md)
  asset review, [0007](docs/adr/0007-compact-telemetry-in-localstorage.md) compact telemetry and its one budget,
  [0008](docs/adr/0008-one-engine-two-courses.md) one engine for two courses,
  [0009](docs/adr/0009-the-spell-quest-rename-moves-the-saved-keys.md) the Spell Quest rename and the move of the saved keys.
- Designs and build plans: `docs/superpowers/specs/` and `docs/superpowers/plans/`, newest date wins. `specs/` (speckit,
  2025) is history only.
- The TTS worker: `worker/` (deployed by hand with `wrangler deploy`). Audio catalog exports: `scripts/<game>/`.

## Minigame Design Rules

[docs/minigame-rules/](docs/minigame-rules/README.md) holds the parent's rules: speech instead of text, audio
sequencing, symbol ambiguity, adaptive difficulty, parent tracking and asset review, one file per subject. Before you
build or review a child-facing screen, read the files that your task touches (all in `docs/minigame-rules/`):

| Task | Files |
| --- | --- |
| Always | `communication.md`, `working-with-the-parent.md`, `verification.md` |
| Voice lines and pronunciation | `voice-wording.md`, `voice-delivery.md`, `pronunciation.md` |
| Images, layout and art | `visuals.md`, `art-generation.md` |
| Screen and game code | `interaction-controls.md`, `interaction-input.md`, `game-play-learning.md`, `game-play-story.md`, `parent-tracking.md` |
| Sound and music | `music-and-sound.md` |
| Asset review | `asset-review.md` |

A new design, a spec, or a rule-by-rule review of a spec reads the whole folder.

When the parent gives significant steering on a minigame (a correction, a new preference, a review note
that applies to more than one item), add it as a general rule to the file of its subject (see the index in
[docs/minigame-rules/README.md](docs/minigame-rules/README.md)). Write it in ASD-STE100 style
with a reason or an example. Change or remove a rule that the new steering replaces.

For a new minigame, work in this order: brainstorm → mockups built from parts (see `art-generation.md`) →
spec → rule-by-rule review of the spec plus a builder check (see `working-with-the-parent.md`) → plan → build. Agree on the
image budget at the start.

For a feature in an existing game, write one short design (about a page: what changes, the parent's decisions, the
tasks), have it reviewed, and build its independent tasks in parallel. Do not write a separate plan. Do not add
extras that the parent did not ask for; offer them as one line instead.

When you ship a generated asset (voice, sound, music, image), record the request of the chosen take in
`asset-sources/<game>/` (see [asset-sources/spellquest/tower/README.md](asset-sources/spellquest/tower/README.md)).

## Checks

While you work on a task, run the tests of what you changed: `npx vitest related --run <changed files>` and
`npx tsc --noEmit`. Before a push, run `npm run check && npx vitest run --changed origin/main`; CI runs the full suite
and deploys nothing if it fails. Run the full suite locally (`npm run check && npm run test:full`, six workers, about
4 minutes for ~2,900 tests) only before a merge into `main` and before a playtest build. `npm run check` is the type
check, lint, dependency-cruiser (the boundary rules in `.dependency-cruiser.cjs`) and knip (unused code); CI runs it
before the tests and the build. To see a change work in the real build, use the `/verify` skill (it drives the verify
build in a browser with touch on). The test timeout is 20 s (`vite.config.ts`): the run tests are slow under load.
A `*.test.ts` file runs in node, not jsdom: give it `// @vitest-environment jsdom` as its first line if it needs the DOM
(also through an import, such as a store that reads `localStorage`). A slow sweep over every case tests a fixed sample
locally and every case on CI; import `FULL_SWEEP` from `src/test/fullSweep.ts` (`FULL_SWEEP=1` runs all cases locally).

## Working with agents (tokens are the scarce resource)

Every turn re-reads the whole context, so cost is turns × context size.

- Opus plans, orchestrates and reviews: specs, plans, design and code reviews, and the final whole-branch review. Give
  those subagents `model: opus` explicitly.
- Sonnet implements a task that a detailed plan describes. The project settings make it the default subagent model.
  Use Opus for a large engine refactor and for a bug that Sonnet did not fix.
- One subagent does one task in a fresh context. If a task needs more than about 40 tool calls, split it. QA is its
  own agent: it returns a list of findings, and other agents fix them.
- Put several checks in one shell command. Read a line range, not a whole file.
- Do not poll. Agent results arrive by themselves; set at most one fallback timer of an hour or more.
- Screenshots stay in subagents. They return a text verdict; send images to the parent without reading them first.
- At the end of each phase, write the state into the plan or the spec, and start a new session from it.

## Worktrees (several sessions work at the same time)

- Each session that changes files works in its own git worktree under `.claude/worktrees/`, never in the main
  checkout. Keep the main checkout clean on `main`: other sessions read it. The project's Remote Control server starts
  each new session in a new worktree (spawn mode `worktree`), on a new branch from `origin/main`; `node_modules` is
  linked from the main checkout (`worktree.symlinkDirectories` in `.claude/settings.json`). Rename the branch to say
  what it is for (`git branch -m feature/<name>`).
- A session that starts in the main checkout (the server's first session, or `claude` started there) moves into a
  worktree before its first change: the `EnterWorktree` tool, or `claude -w <name>`.
- A subagent that edits files gets its own worktree (`isolation: "worktree"`), unless it works on its parent's branch.
- To merge, merge `origin/main` into your branch in the worktree, run the checks there, and push `HEAD:main`. Do not
  check out or merge in the main checkout; at most `git pull --ff-only` there when it is clean.
- When the work is done (merged, or dropped with the parent's OK), remove your worktree and its branch as the last
  step. From the worktree: `cd ../../.. && git pull --ff-only && git worktree remove .claude/worktrees/<name> && git
  branch -d <branch>`. Remove only your own worktree. Leave another session's worktree alone, also when it looks
  stale; ask the parent about it.

## Deployment (GitHub Pages: production and staging)

| Branch | Served at | Role |
| --- | --- | --- |
| `release` | `/alef/` | production: what the child plays |
| `main` | `/alef/staging/` | staging: merged work, before release |

- Merge feature branches into `main` and check them on staging. A push to either branch rebuilds and deploys both
  (`.github/workflows/deploy.yml`); the tests of both must pass, or nothing deploys.
- To release, fast-forward `release` to a tested commit of `main`: `git push origin main:release` (or `<sha>:release`).
  Never commit to `release`. A fix goes into `main` first.
- Staging prefixes every save with `staging:` ([ADR 0001](docs/adr/0001-staging-shares-the-origin.md)). A new entry point
  must import `src/shared/stagingStorage` first. `?copy-prod` on a staging URL copies the child's real saves into staging; `?copy-to-prod` copies staging's saves back
  over them. The staging tools page `/alef/staging/staging-tools/` (linked from nowhere: type the URL) lists every
  staging route.
