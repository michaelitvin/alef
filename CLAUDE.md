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
