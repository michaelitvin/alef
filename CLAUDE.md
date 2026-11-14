# alef Development Guidelines

Auto-generated from all feature plans. Last updated: 2025-12-13

## Active Technologies
- TypeScript 5.9 with React 19.x + React 19, Vite 7, Zustand 5, Framer Motion 12, Howler.js 2.2 (002-didactic-activities)
- localStorage via Zustand persist middleware (002-didactic-activities)

- TypeScript 5.x with React 18.x + React, Vite (build tool), Zustand (state management), Framer Motion (animations), Howler.js (audio) (001-hebrew-reading-game)

## Minigame Design Rules

Before you design, build or review a child-facing minigame or screen, read
[docs/minigame-rules.md](docs/minigame-rules.md). It holds the parent's rules: speech instead of text,
audio sequencing, symbol ambiguity, adaptive difficulty, parent tracking and asset review.

When the parent gives significant steering on a minigame (a correction, a new preference, a review note
that applies to more than one item), add it to that file as a general rule. Write it in ASD-STE100 style
with a reason or an example. Change or remove a rule that the new steering replaces.

For a new minigame, work in this order: brainstorm → mockups built from parts (see *Art generation* in the rules) →
spec → rule-by-rule review of the spec plus a builder check (see *Working with the parent*) → plan → build. Agree on the
image budget at the start.

When you ship a generated asset (voice, sound, music, image), record the request of the chosen take in
`asset-sources/<game>/` (see [asset-sources/duel/README.md](asset-sources/duel/README.md)).

## Deployment (GitHub Pages: production and staging)

One Pages site holds two builds, made by `.github/workflows/deploy.yml`:

| Branch | Served at | Role |
| --- | --- | --- |
| `release` | `/alef/` | production: what the child plays |
| `main` | `/alef/staging/` | staging: merged work, before release |

- A push to `main` or `release` rebuilds and deploys both, because each deploy replaces the whole site. The tests of
  both branches must pass, or nothing deploys.
- Merge feature branches into `main` as before. Check them on staging.
- To release, fast-forward `release` to a tested commit of `main`: `git push origin main:release` (or `<sha>:release`).
  Do not commit to `release` directly. A fix goes into `main` first.
- The staging build is `ALEF_STAGING=1 npm run build` (base `/alef/staging/`).
- Staging and production share one origin, so they share one localStorage. `src/shared/stagingStorage.ts` gives every
  key in the staging build a `staging:` prefix, so staging never reads or changes the child's real saves. Each entry
  point (`src/main.tsx`, `src/clock/main.tsx`, `src/duel2/main.tsx`) must import it first. A new entry point must too.
- To test staging with the child's real progress, open a staging URL with `?copy-prod` (for example
  `/alef/staging/?copy-prod`). After a confirmation, it replaces all staging saves with a copy of the production saves.
  Production saves do not change.
- The TTS worker (`worker/`) is not part of this. Deploy it by hand with `wrangler deploy`.

## Project Structure

```text
backend/
frontend/
tests/
```

## Commands

npm test && npm run lint

## Code Style

TypeScript 5.x with React 18.x: Follow standard conventions

## Recent Changes
- 002-didactic-activities: Added TypeScript 5.9 with React 19.x + React 19, Vite 7, Zustand 5, Framer Motion 12, Howler.js 2.2

- 001-hebrew-reading-game: Added TypeScript 5.x with React 18.x + React, Vite (build tool), Zustand (state management), Framer Motion (animations), Howler.js (audio)

<!-- MANUAL ADDITIONS START -->
<!-- MANUAL ADDITIONS END -->
