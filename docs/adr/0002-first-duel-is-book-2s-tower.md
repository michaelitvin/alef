# The first duel runs inside Book 2 as the tower screen

The parent wanted one game with one reward system. So Book 1's nikkud duel became the first screen of Book 2's run
(spec: `docs/superpowers/specs/2026-11-11-one-duel-design.md`, Part 3), and it was not rewritten in Book 2's style.
`src/duel2/components/screens/Tower.tsx` embeds the duel's own board and its flow hook (`src/hooks/useDuelGame.ts`, in
embedded mode). The run owns the hearts, stars and coins.

## Consequences

- `useDuelGame` and `src/utils/duel/*` are Book 2 code too: a change there needs Book 2's tower tests (`Tower.test.tsx`,
  the tower part of `useRun.test.tsx`) as well as Book 1's.
- The duel's old data moved into Book 2's save once. The progress save still holds it, read-only, and Book 2 reads its
  recent answers for placement.
