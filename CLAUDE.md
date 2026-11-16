# alef

A Hebrew reading game for a child who cannot read yet. Vite multi-page app: React 19, TypeScript, Zustand (persisted
saves), Howler (audio). Domain words: [GLOSSARY.md](GLOSSARY.md). Decisions not to re-open: [docs/adr/](docs/adr/).

## Map

| Game | Entry point | Read first |
| --- | --- | --- |
| The lessons and home | `index.html` → `src/main.tsx` → `src/App.tsx` (routes) | `src/stores/progressStore.ts` (save `alef-progress`) |
| Book 1, the first duel (Book 2's tower) | the tower screen of Book 2; no page of its own | `src/hooks/useDuelGame.ts`, `src/utils/duel/`, `src/components/duel/` |
| Book 2 (the run; the first duel is its tower) | `duel2/index.html` → `src/duel2/main.tsx` | [src/duel2/README.md](src/duel2/README.md) |
| Clock workshop | `clock/index.html` → `src/clock/main.tsx` | [src/clock/README.md](src/clock/README.md) |
| Code two or more games share | `src/shared/` | [src/shared/README.md](src/shared/README.md) |

- Designs and build plans: `docs/superpowers/specs/` and `docs/superpowers/plans/`, newest date wins. `specs/` (speckit,
  2025) is history only.
- The TTS worker: `worker/` (deployed by hand with `wrangler deploy`). Audio catalog exports: `scripts/<game>/`.

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

## Checks

`npm test && npm run lint` before every commit. To see a change work in the real build, use the `/verify` skill.

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
  must import `src/shared/stagingStorage` first. `?copy-prod` on a staging URL copies the child's real saves into staging.
