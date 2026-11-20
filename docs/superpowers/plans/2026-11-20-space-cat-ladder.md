# Space Cat Ladder Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the approved design `docs/superpowers/specs/2026-11-20-space-cat-ladder-design.md`: 31 rungs in three
strands (two new round kinds: comparison and counting in jumps), fast placement, practice at the frontier with strikes,
holds, probation, warm-ups and re-checks, one arrival time per band, the equal-groups dots, four new voice lines, the
parent area's new *Where he is* and settings, the save's migration from version 1 to 2, and the new telemetry.

**Architecture:** The pure rules stay in `src/spacecat/logic/` and grow: `rungs.ts` (the rung table), `facts.ts` (the
items of every kind, classified into exactly one rung), `misconceptions.ts` and `wrongs.ts` (the planets), `fast.ts`,
`speed.ts` (unchanged rules, kept per band) and a new folder `logic/ladder/` (state, frontier, mix, practice rules,
placement, play days, warm-up, re-check) behind one small API: `beginRun`, `chooseRound`, `afterAnswer`, `relevel`.
`content.ts` turns an item into a round for the engine (box tokens, 3 or 4 lane labels, the pods, the comparison's
bigger number). The store keeps the ladder state and its history and migrates version 1; the controller interprets the
ladder's decisions and events (telemetry, intros, glows); the canvas draws 3 lanes, the signs as paths, the jump row
and the pods. Every number the design gives is a named constant with a test.

**Tech Stack:** as the first plan (`docs/superpowers/plans/2026-11-12-space-cat.md`): TypeScript, React 19, Zustand
persist, Canvas 2D, Vitest + Testing Library, ESLint, dependency-cruiser, knip.

**Spec:** the ladder design above (read all of it before any task); it replaces *Finding his level* of
`docs/superpowers/specs/2026-11-12-space-cat-design.md`. Rules: `docs/minigame-rules/`. Map: `CLAUDE.md`,
`src/spacecat/README.md`, `GLOSSARY.md`, ADR 0005 (pure policies, the controller as interpreter), ADR 0007 (telemetry).

## Global Constraints

- Work only in the Space Cat worktree on branch `feature/spacecat`. Keep its commits. Do not push or merge.
- Node may be missing from a non-interactive PATH: put the Node bin directory on PATH at the start of every shell.
- While you work: `npx vitest run <path>`. Before every commit: `npm run check && npm test` (lint, depcruise, knip, all
  tests). Under load a test can time out: run a failing file alone before you conclude that it fails.
- The repository is public: no host names, machine URLs, ports, absolute paths outside the repo or passwords in any file
  or commit message. Write host-local things as `<scratch>`.
- Commit after each task, messages "Space Cat: …", ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
  git is 2.25: multi-line messages via `git commit -F <file>`.
- Every number of the design is a named, exported constant with a test that pins its value (design: "keep them as named
  constants with tests").
- Child screens show only digits, the signs `+ − × ÷ =` and the drawn signs `< = >` (paths, never text). Every string
  drawn on the canvas goes through `drawText()`.
- The boundary rules (`.dependency-cruiser.cjs`) stay: `logic/` imports no UI; `parent/index.ts` stays light (no store,
  audio or telemetry instance); the controller imports no `screens/`.
- Telemetry (ADR 0007): every `track(` call site names its event as a string literal (`track('ladder', …)`), so that the
  golden test (`src/shared/telemetryGoldens.test.ts`) finds it, and the fixture generator
  (`src/shared/__fixtures__/telemetry/generate.ts`) has every event name. Never `track(ev.e, …)`.
- Parent-area labels are English. The Hebrew of the design is reference only.
- Executor tiers: **S** = a small model can do it from the text; **M** = mid-tier; **L** = a large model (the ladder and
  placement logic, the play flow's timing, the canvas feel).

## Review Focus

1. **The needs graph and the frontier:** a rung is offered only when its needs are passed, placed or switched off; a
   switch never blocks another strand; divide is in effect off while times is off. Tests: Task 4 `a switched-off need
   counts as passed`, `divide is off while times is off`.
2. **Never more than 2 mistakes in a row at the frontier**, and nothing visible goes back. Tests: Task 4 `a strike
   after 2 mistakes in the last 3`, `the guard gives sure wins after 2 mistakes in a row`, Task 5 simulation.
3. **An old save:** every old top rung maps to its placed set, the range maps, times and divide turn on, the items and
   points stay, the next run starts the migration placement with no demo. Tests: Task 6 `migrates a v1 save of each old
   top rung`.
4. **Exactly one rung per item:** the design's examples land in their rungs, no id is in two rungs, variants are
   offered only in review. Tests: Task 1.
5. **No text on the canvas:** the signs are paths; the jump row has no commas; the pods have no digits. Tests: Task 8,
   the verify scan.

---

## File map

| File | Responsibility |
|---|---|
| `src/spacecat/logic/rungs.ts` (new) | The 31 rungs: id, order, strand, needs, switch, band; the order list |
| `src/spacecat/logic/facts.ts` | Items of every kind (sum, comparison, jump row), their ids and facts, `classify` (the one rung of an item), `itemsOfRung`, `itemById`, ring variants, rare facts, a rung's highest number |
| `src/spacecat/logic/misconceptions.ts` (new) | The misconception numbers of each rung |
| `src/spacecat/logic/wrongs.ts` | The three wrong planets (misconception, near, place), the 2-digit rule, lanes for 3 or 4 |
| `src/spacecat/logic/predict.ts` | Prediction and the pick (rare facts, large pools sampled, narrowing rolls) |
| `src/spacecat/logic/fast.ts` (new) | Is a right answer fast |
| `src/spacecat/logic/speed.ts` | Unchanged rules; `speedOfBand` |
| `src/spacecat/logic/ladder/*.ts` (new; replaces `logic/ladder.ts`) | `state.ts`, `frontier.ts`, `mix.ts`, `practice.ts`, `placement.ts`, `playDay.ts`, `index.ts` |
| `src/spacecat/logic/round.ts` | String labels, the chosen label, lanes 3 or 4 |
| `src/spacecat/content.ts` | `makeRound` for the three kinds |
| `src/spacecat/saveFormat.ts`, `store.ts`, `savePort.ts` | Save v2, migration of v1, history, play-day counters for the intros |
| `src/spacecat/controller.ts` | The ladder's API in the flow, parts, fast, new telemetry, intros with their cues |
| `src/spacecat/canvas/draw.ts`, `engine.ts`, `effects.ts` (+ `signs.ts`, `pods.ts` new) | 3 lanes, sign paths, jump row, pods, swell, cues, probe |
| `src/spacecat/audio/lines.ts`, `audio/intros.ts` (new) | The four new lines; the cue timelines |
| `src/spacecat/telemetryLog.ts`, `scripts/spacecat/analyse.ts`, `src/shared/__fixtures__/telemetry/*` | Roll-up, analysis, fixtures and goldens |
| `src/spacecat/parent/*` | Summary, details, mix-ups, item text, *Where he is*, settings, *Find his level again* |
| `src/components/home/SpaceCatCard.tsx` (+ tests) | The new "what he learns" line |
| `GLOSSARY.md`, `src/spacecat/README.md` | The new words; the README's map and *Known friction* |
| `.claude/skills/verify/drive.mjs`, `SKILL.md` | QA of the new kinds, placement, migration, settings |

## Order

Tasks 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14, each committed before the next starts. Task 12 (voice)
is host-local work and may run beside Tasks 7 to 11; its repo part (the line table) is in Task 11.

---

### Task 1: The rung table and the items of every kind (M)

**Files:** Create `src/spacecat/logic/rungs.ts`, `src/spacecat/logic/rungs.test.ts`. Modify `src/spacecat/logic/facts.ts`,
`src/spacecat/logic/facts.test.ts`. Keep the old exports that later tasks remove (`RUNGS` of facts.ts is replaced: fix
its importers so that `npm run check && npm test` pass, the old ladder may keep working on the new ids by a thin shim
until Task 4, or Tasks 1 to 4 may be committed together if the shim costs more than it saves; say which in the commit).

**Interfaces (produced):**

```ts
// rungs.ts
export type RungId = '1'|'2'|'3'|'4'|'5'|'6'|'7'|'8'|'9'|'10'|'11'|'12'|'13'|'14'|'15'|'16'|'17'|'18'|'19'
  | 'H1' | 'C1' | 'C2' | 'S1' | 'S2' | 'T1' | 'T2' | 'T3' | 'T4a' | 'T4b' | 'T5' | 'T6'
export type Strand = 'plus' | 'compare' | 'times'          // the design's A, C, M
export type Switch = 'compare' | 'jumps' | 'times' | 'divide' | 'missing100' | 'hundreds'
export type Band = 'small' | 'big' | 'hundreds'
export interface RungDef { id: RungId; order: number; strand: Strand; needs: RungId[]; switch?: Switch; band: Band }
export const RUNGS: readonly RungDef[]            // sorted by order 1..31
export const rungDef: (id: RungId) => RungDef
export const isRungId: (s: unknown) => s is RungId
```

Order (design *The rungs*): 1:`1` 2:`2` 3:`3` 4:`4` 5:`5` 6:`6` 7:`7` 8:`C1` 9:`8` 10:`9` 11:`10` 12:`11` 13:`12`
14:`S1` 15:`T1` 16:`13` 17:`14` 18:`C2` 19:`T2` 20:`15` 21:`16` 22:`S2` 23:`T3` 24:`17` 25:`18` 26:`T4a` 27:`T4b`
28:`19` 29:`H1` 30:`T5` 31:`T6`. Needs: the design's *Needs* columns exactly. Switches: `C1 C2` compare; `S1 S2` jumps;
`T1 T2 T3 T5` times; `T4a T4b T6` divide; `19` missing100; `H1` hundreds. Bands: small = `1`–`12`, `C1`, `S1`,
`T1`–`T4b`; big = `13`–`19`, `C2`, `S2`, `T5`, `T6`; hundreds = `H1`.

```ts
// facts.ts
export type Op = '+' | '−' | '×' | '÷'
export type Hole = 'c' | 'a' | 'b'
export type Sign = '<' | '=' | '>'
export type Kind = 'sum' | 'compare' | 'jumps'
interface ItemBase { id: string; fact: string; rung: RungId; /** a ring variant: no rung of its own; tallied to its fact's rung, offered only in review */ variant?: true }
export interface SumItem extends ItemBase { kind: 'sum'; a: number; op: Op; b: number; c: number; hole: Hole; answer: number; /** T1: a repeated three times (b === a) */ thrice?: true }
export interface CompareItem extends ItemBase { kind: 'compare'; a: number; b: number; answer: Sign }
export interface JumpsItem extends ItemBase { kind: 'jumps'; row: [number, number, number, number]; hole: 0 | 1 | 2 | 3; step: number; answer: number }
export type Item = SumItem | CompareItem | JumpsItem
export function classifySum(a: number, op: Op, b: number, c: number, hole: Hole): RungId | undefined
export function itemsOfRung(r: RungId): Item[]       // native items, built lazily per rung and cached
export function itemById(id: string): Item | undefined   // parses the id; a sum with no native rung is a variant (below) or undefined
export function variantsOf(r: RungId, opts: { b: boolean; a: boolean }): SumItem[]   // the ring variants of a plain rung
export function maxOfRung(r: RungId): number         // the highest number in its native items (cached)
export const isRareFact: (it: Item) => boolean        // + 0, − 0, × 0, × 1, ÷ 1, a × ◯ with a = 1
```

- Ids: sums keep today's `a+b=c/hole` (`-`, `x`, `/` for − × ÷), so old item stats keep their ids; T1 is
  `3+3+3=9/c`; a comparison `7?5`; a jump row `5,10,15,_` (`_` at the ring's place). Facts: sums as today's
  `factKey`; T1 `r3`; a comparison the unordered pair `?5,7`; a jump row `j<step>:<first>` (the same row with the
  ring elsewhere is the same fact).
- `classifySum` reads the design's *Content* column exactly, with its precedence: rung 4 before 6; 8 before 7; 9 before
  7 and 10. A sum belongs to at most one rung. Details the table leaves to the builder (pin each in a test):
  `1` a + b, c ≤ 5 (0 allowed); `2` a − b, a ≤ 5; `3` c 6–10; `4` a + ◯ = 10 with a 1–9 (hole b); `5` a − b with a
  6–10; `6` hole b, every + and − fact with numbers ≤ 10 except rung 4's; `7` + with c 11–20 and the ones not crossing
  (`10 + 6`, `13 + 4`, `4 + 13`), − with a 11–19, b 1–10, no crossing (`17 − 4`, `17 − 10`); `8` both whole tens ≥ 10,
  answer 10–100; `9` a + a with a 6–9, a + (a + 1) and (a + 1) + a with a 5–8; `10` a, b 2–9, c ≥ 11, not `9`; `11` a
  11–18, b 2–9, a's ones < b; `12` hole a, + and − with every number ≤ 20; `13` a 21–99, b 1–9, ones not crossing, c ≤
  99; `14` a 11–99 not a whole ten, b a whole ten, answer 1–99; `15` a 20–99, b 2–9, ones cross, answer ≤ 100; `16`
  a, b 11–99, b not a whole ten, no crossing, a − b > 0; `17` a, b 11–99, the ones carry, c ≤ 100; `18` a, b 11–99,
  a > b, the ones borrow; `19` hole a or b, a sum whose hole-c form is in `8` or `13`–`18`; `H1` a 100–995 a multiple
  of 5, b a whole ten 10–90, a whole hundred 100–800, or (only when a is a whole ten) a 2-digit number 11–99, no
  regrouping in any digit, answer 100–999, hole c; `T2` one factor 2, 5 or 10, the other 1–10; `T3` both factors in
  {3, 4, 6}; `T4a` hole b of a `T2` or `T3` product ≤ 36; `T4b` c ÷ a = ◯ of the same facts; `T5` both factors 2–10,
  not `T2` or `T3`; `T6` c ÷ a = ◯ and a × ◯ = c of `T5` facts. Times with a factor 1 and no 2, 5 or 10 (`1 × 3`) has
  no rung: an old item with such an id keeps its stats and is not shown.
- `C1` every pair 0–20; `C2` every pair 10–99. `S1` jumps of 2 (last ≤ 20), 5 (≤ 50), 10 (≤ 100) from a multiple of the
  jump (0 allowed), ring last; `S2` jumps of 3 (≤ 30) and 4 (≤ 40) from a multiple of the jump, and of 10 from a first
  number 1–9 off the tens (last ≤ 97), the ring at index 1, 2 or 3. `T1` a + a + a with a 2–6.
- **Variants** (design *The ring in every place*, layer 2): for a plain sum rung from order 7 on (`7`, `8`, `9`, `10`,
  `11`, `13`–`18`, `H1`, and `T2`, `T3`, `T5` for ×), the same facts with the ring at b (and at a for + and −). A moved
  item whose id `classifySum` gives to a native rung (`12`, `19`, `T4a`, `T6`) IS that native item (it keeps that
  rung); otherwise it is a variant, `variant: true`, `rung` = the rung of its hole-c form. `variantsOf` returns both
  kinds (de-duplicated).

- [ ] **Step 1: Write the failing tests.** `rungs.test.ts`: `31 rungs in the design's order`; `needs as the design` (one
  row per rung); `every need comes earlier in the order`; `the switches and bands`. `facts.test.ts`: `every example of
  the design is in its rung` (one assertion per example of the three tables, e.g. `classifySum(7,'+',8,15,'c') ===
  '9'`, `itemById('7?5')!.rung === 'C1'`, `itemById('4,8,_,16')!.rung === 'S2'`); `the precedence` (`10 + 10` → `8`, `6 +
  6` → `9`, `3 + 4` → `3`, `1 + 1` → `1`); `no id in two rungs` (build all rungs, every id once); `every item's answer
  is right and no number is negative`; `the old ids keep their meaning` (`3+4=7/c`, `3+4=7/a` → `12`, `3+◯=7` →
  `6`, `12/3=4/c` → `T4b`); `variants`: `13+4=17/b` is a variant of `7`, `◯ + 4 = 27` (`23+4=27/a`) is rung `19`,
  `3x4=12/b` is `T4a`; `rare facts`; `maxOfRung('1') === 5`, `maxOfRung('C1') === 20`.
- [ ] **Step 2:** `npx vitest run src/spacecat/logic` → FAIL. **Step 3:** Implement. **Step 4:** PASS.
- [ ] **Step 5:** `npm run check && npm test`; commit "Space Cat: the 31 rungs and the items of every kind".

---

### Task 2: The planets: misconceptions, near and place, 3 or 4 lanes (M)

**Files:** Create `src/spacecat/logic/misconceptions.ts`, `misconceptions.test.ts`. Modify `logic/wrongs.ts`,
`wrongs.test.ts`.

**Interfaces (produced):**

```ts
export function misconceptions(it: SumItem | JumpsItem): number[]   // the rung's column, in order of preference
export const LANES = 4, COMPARE_LANES = 3
export function wrongAnswers(rng: Rng, it: SumItem | JumpsItem, confusion?: number): number[]   // three numbers
export function placeLanes(rng: Rng, answer: string, wrongs: string[], shipLane: number, lanes: number): { labels: string[]; rightLane: number }
export const SIGNS: readonly Sign[]   // ['<', '=', '>']
```

- Misconceptions: the design's *Misconception planet* column of each rung (rung `1` a shown number; `2` the sum; …;
  `S1` last + 1, then one jump too many; `T4b` the divisor, the difference; …). Where a cell gives two, both are in the
  list. Variants use the misconception of their own hole: the moved-ring rungs' column (`6`, `12`, `19`, `T4a`).
- `wrongAnswers` (design *The planets of every round*): 1. his recorded wrong pick if legal, else the first legal
  misconception; 2. near: answer ± 1; 3. place: answer ≥ 10 → ± 10, below 10 → ± 2. Legal: a different number, ≥ 0,
  ≤ `maxOfRung` of the item's rung. If a planet has no legal number: ± 2, then ± 3, then the nearest unused legal
  number. Rung `8`: the near and place planets are whole tens (± 10, ± 20), never ± 1. Times and divide (`T2`–`T6`, not
  `T1`): the place planet is a neighbour product (a × (b ± 1), (a ± 1) × b) or the quotient ± 1. **2-digit answers**
  (answer ≥ 10, rung order ≥ 7): at least one wrong has the answer's ones digit and one its tens digit; if not, replace
  the near or place planet by a legal one that adds the missing digit (test both digits on `45 + 9`).
- `placeLanes` with `lanes` 3 or 4: the right lane off the ship's lane with `RIGHT_OFF_SHIP`; the rest shuffled. For a
  comparison the labels are the three signs in random lanes (the right lane by the same rule).

- [ ] **Step 1: Write the failing tests**: one per rung group for the misconception (`17` for `7 + ◯ = 10`, `13` for
  `13 − 6`, `16` for `5 10 15 ◯`, `36` and `9` for `3 × ◯ = 12`); `three different legal wrongs for every item of
  every rung` (property test over 200 random items per rung with a seeded rng); `a 2-digit answer has a wrong with its
  ones digit and one with its tens digit`; `rung 8's wrongs are whole tens`; `times' place planet is a neighbour
  product`; `the recorded pick comes first`; `3 lanes for a comparison, the signs each once`.
- [ ] **Step 2:** FAIL. **Step 3:** Implement. **Step 4:** PASS. **Step 5:** check, test, commit "Space Cat: the
  planets of every rung: misconception, near and place".

---

### Task 3: Round content and the round with string labels (S)

**Files:** Modify `src/spacecat/content.ts`, `content.test.ts`, `logic/round.ts`, `round.test.ts`, and their users
(`canvas/engine.ts` only where the types force it).

**Interfaces (produced):**

```ts
export interface RoundContent {
  kind: Kind
  box: (string | null)[]       // sum: today's tokens (T1: a + a + a = ◯); compare: [a, null, b]; jumps: the 4 numbers, null at the ring
  labels: string[]             // 3 (comparison) or 4 lanes
  rightLane: number
  flyNumber: string            // the answer (a sign for a comparison)
  itemId: string; fact: string; rung: RungId
  bigger?: 0 | 2 | 'both'      // comparison: the box index of the bigger number, or both for =
  pods?: { groups: number; each: number; share: boolean }   // rungs T1..T4b: the equal groups (÷: share)
}
export function makeRound(rng: Rng, it: Item, shipLane: number, confusion?: string): RoundContent
// round.ts
RoundState.labels: string[]; RoundResult.number: string     // the label he ended on ('' for a cut round)
export function nearestLane(x: number, current: number, lanes: number): number
```

- Pods: `a × b = c` → `a` groups of `b`; `T1` `a + a + a` → 3 groups of `a`; `a × ◯ = c` → `a` groups of `c / a`;
  `c ÷ a = ◯` → `a` groups of `c / a`, `share: true`. Only rungs `T1`–`T4b` (products ≤ 36).
- The controller and the telemetry keep a number for numeric rounds: `number: Number(label)` when the label is
  digits, else the sign string.

- [ ] Steps: failing tests (`a comparison has 3 labels with each sign once`, `a jump row's box is its numbers with
  one ring`, `T1's box`, `pods only for T1 to T4b`, `bigger`, `nearestLane with 3 lanes`), implement, PASS, check,
  test, commit "Space Cat: round content for comparisons and jump rows".

---

### Task 4: The ladder: state, frontier, mix and the practice rules (L)

**Files:** Create `src/spacecat/logic/ladder/{state,frontier,mix,practice,placement,playDay,index}.ts` with a test file
each; `src/spacecat/logic/fast.ts` + test. Delete `logic/ladder.ts` and its test once nothing imports them. Modify
`logic/predict.ts` (+ test), `logic/speed.ts` (+ test).

**State (produced, `state.ts`):**

```ts
export type Status = 'new' | 'passed' | 'placed' | 'held'
export interface RungState {
  status: Status
  recent: string        // marks o/x/t on its items since it last became the frontier, the warm-up rung or placed; newest last, at most WINDOW (6)
  fastRun: number       // fast right answers in a row on it
  strikes: number       // since it last became the frontier
  holds: number         // times held
  freeOn?: number       // held: the play day on which it is free again
  probation?: number    // placed: right answers since it was placed
}
export interface LadderSettings { range: 'auto' | RungId; compare: boolean; jumps: boolean; times: boolean; divide: boolean; missing100: boolean; hundreds: boolean }
export type Part = 'frontier' | 'below' | 'review' | 'warmup' | 'probe' | 'guard'
export type Mode =
  | { kind: 'practice' }
  | { kind: 'placement'; why: 'first' | 'migration' | 'parent'; at: RungId; jump: number; probes: number; max: number; inRow: number; mistakes: number; confirmed: RungId[]; rights: Partial<Record<RungId, number>>; failed: RungId[] }
  | { kind: 'warmup'; rung: RungId; recent: string; fastRun: number; strikes: number; rounds: number; reviewLeft: number }
  | { kind: 'recheck'; at: RungId; probes: number }
export interface Ladder {
  rungs: Partial<Record<RungId, RungState>>     // a missing rung is 'new'
  day: number                // the play-day counter (0 before the first run)
  lastAt?: number            // ms of his last tallied answer
  checkedOn: number          // the play day of the last placement or re-check
  fastPasses: { today: number; lastDay: number }
  passes: ('fast' | 'slow')[]   // how his last two rungs were passed
  mode: Mode
  strikeLeft: number         // rounds left of "below and review only" after a strike
  guardLeft: number          // rounds left of sure wins
  lastMarks: string          // his last two marks anywhere
  recheckDue: boolean        // a re-check starts when the warm-up ends
}
export const LADDER_START: Ladder   // mode: the first placement from rung 1, jump 8, max 16
export type Change = 'placed' | 'passed' | 'strike' | 'held' | 'free' | 'unpassed'
export type By = 'placement' | 'fast' | 'slow' | 'rejump' | 'recheck' | 'warmup' | 'probation' | 'migration'
export type LadderEvent =
  | { e: 'ladder'; rung: RungId; change: Change; by?: By; days?: number }
  | { e: 'placement'; phase: 'start' | 'end'; kind: 'first' | 'migration' | 'recheck' | 'parent'; probes: number; mistakes: number; frontier: RungId | null }
  | { e: 'warmup'; rung: RungId; how: 'fast' | 'slow' | 'forgot'; rounds: number }
```

**The API (produced, `index.ts`):**

```ts
export function beginRun(l: Ladder, ctx: { now: number; set: LadderSettings }): { ladder: Ladder; events: LadderEvent[]; playDay: boolean; holdSpeed?: Band }
export function chooseRound(l: Ladder, ctx: { rng: Rng; set: LadderSettings; stats: Record<string, ItemStats>; last: { fact?: string; sinceZero: number } }): { item: Item; part: Part; ladder: Ladder }
export function afterAnswer(l: Ladder, a: { item: Item; part: Part; mark: Mark; fast: boolean; now: number; set: LadderSettings }): { ladder: Ladder; events: LadderEvent[]; holdSpeed?: Band }
export function frontier(l: Ladder, set: LadderSettings): RungId | null
export function offered(l: Ladder, set: LadderSettings): RungId[]          // on, in range, not held, in order
export function relevel(l: Ladder): Ladder                                  // "find his level again"
export function statusText(l: Ladder, r: RungId, set: LadderSettings): 'not yet' | 'working on now' | 'passed' | 'placed' | 'held' | 'switched off' | 'above the range'
```

`chooseRound` returns the ladder too: it counts down `strikeLeft`, `guardLeft`, the warm-up's `reviewLeft`. Each
rule below is one exported constant and one test at least.

- **On** (`frontier.ts`): a rung is on when its switch is on (no switch: on) and, for a divide rung, times is on too
  (design: divide has no tables without times). In range: `range === 'auto'` or its order ≤ the range's order.
  **Offered**: on, in range, not held. **Done for the needs**: passed, placed, or not on (switched off). **Frontier**:
  the lowest offered rung in the order with status new whose needs are all done; null if none. `needsClosure(r)`: r's
  needs and theirs, down to rung 1.
- **Fast** (`fast.ts`): `FAST_OF_MEDIAN = 0.75`, `FAST_OF_ARRIVAL = 0.4`, `FAST_MIN_SAMPLES = 5`.
  `isFast(res, band: SpeedState, arrivalMs)`: right, not started under the right planet, and `underMs` < 0.75 × the
  band's median under time; with fewer than 5 samples: `underMs` < 0.4 × arrivalMs, or an early zoom (`points === 2`).
- **Speed per band** (`speed.ts`): `BAND_STEP_MS = 2000`; `speedOfBand(speeds, band)`: the band's state, or a new one
  that starts at the band below's time + 2 s (at most `ARRIVAL_MAX`). The rules of `afterRound` do not change; its
  `rungOpened` is now "hold this band" (`holdSpeed`).
- **The mix** (`mix.ts`): `MIX = { frontier: 0.7, below: 0.2, review: 0.1 }`. Below = the frontier's need highest in the
  order that is on (none: its share goes to the frontier). Review = all other passed and placed offered rungs; empty:
  its share goes to below, then the frontier. The review and the below part take the **lowest placed rung first**
  while one is placed (its 4 answers come first), then items with a recorded mistake whose predicted rate is ≥ 0.1 if
  any, else all. Review items include the ring variants (`variantsOf`: at b once rung `6` is passed or placed, at a once
  `12` is, for × at b once `T4a` is; `REVIEW_VARIANT_SHARE = 1/3` of the review and below parts) but never variants
  or rung `19` above 20 with missing100 off, and never on the frontier part. After a strike (`STRIKE_ROUNDS = 6`) the
  frontier's share goes to below. Nothing free (no frontier): review only, `TOP_SHARE = 0.7` from the top 3 passed
  rungs, the rest from the others. The guard (`GUARD_ROUNDS = 2`, `SURE_RATE = 0.1`): after 2 mistakes in a row
  anywhere, the next 2 rounds from items of done rungs with predicted rate < 0.1 (none: the lowest predicted). Inside a
  part: `pickNext` (the 1-in-5 picker), never the last fact, rare facts at most 1 in `ZERO_EVERY`.
- **Picking** (`predict.ts`): `SAMPLE_MAX = 300`: a pool larger than that is cut to every item with stats plus a seeded
  random sample of the rest. Narrowing rolls before the pick, each a constant: `EQUAL_SHARE = 0.2` (a comparison's `=`
  right in 1 in 5), `C2_TRICKY_SHARE = 0.5` (same tens or swapped digits), `S2_LAST_SHARE = 2/3` (the ring last). A
  pool that a roll empties is used whole.
- **Practice rules** (`practice.ts`), on every tallied answer, for the item's rung r:
  - `lastMarks`, `lastAt`, the guard trigger (2 mistakes in a row → `guardLeft = 2`).
  - r placed: `probation += 1` on a right answer; at `PROBATION_RIGHT = 4` → passed (`passed`, `by: 'probation'`). 2 mistakes in
    its last 3 (`t` is half) → new (`unpassed`, `by: 'probation'`). The probation rule comes before the warm-up's.
  - r the frontier (`recent` its window, at most `WINDOW = 6`): **up** by 3 right in a row all fast
    (`FAST_PASS = 3`, `by: 'fast'`) or 5 right of the last 6 with the last 3 right (`SLOW_PASS = [5, 6]`, a `t` is half a
    mistake; `by: 'slow'`) → passed, `passes` keeps the way, `fastPasses.today += 1` if fast, `holdSpeed` the new
    frontier's band. **Re-jump**: a fast pass when the two passes before were fast also places the next rung of the same
    strand in the order if it is new and its needs are done (`placed`, `by: 'rejump'`). **Strike**: 2 mistakes in the
    last 3 (`t` half), with at least 3 answers on it → `strikes += 1`, window empty, `strikeLeft = 6` (`strike`).
    `HOLD_STRIKES = 2` strikes since it became the frontier → held: `holds += 1`, `freeOn = day + HOLD_DAYS[min(holds, 3)
    − 1]` with `HOLD_DAYS = [2, 4, 7]` (`held`, `days`). The new frontier after a pass or a hold starts with an empty
    window and no strikes.
- **Tests** (`practice.test.ts`, `mix.test.ts`, `frontier.test.ts`): each bullet above; `a switched-off need counts as
  passed`; `divide is off while times is off`; `the range caps the order`; `a held rung is offered nowhere`; `the
  frontier skips a held rung to the next free one in another strand`; `never 3 mistakes in a row on the frontier part
  of a run of 1000 answers of a child who knows nothing` (a seeded child).

- [ ] Steps: failing tests, implement, PASS, check, test, commit "Space Cat: the ladder's frontier, mix and practice
  rules".

### Task 4B: Placement, play days, the warm-up and the re-check (L)

**Files:** `logic/ladder/placement.ts`, `playDay.ts` and their tests; `index.ts`.

- **Placement** (design *Placement*; the simulation `<scratch>/research/sim/proposed2.py` is the reference walk):
  `FIRST_JUMP = 8`, `FIRST_PROBES = 16`, `MIGRATION_JUMP = 4`, `MIGRATION_PROBES = 10`. Positions are indices into
  `offered()` (recomputed at each step; a rung that drops out maps to the nearest offered one below). Each round is a
  probe of the rung `at` (part `probe`). Right and fast: confirmed; `at` += jump. Right and slow: rights[at] += 1;
  jump = max(1, jump / 2, floored); confirmed at 2 rights, then `at` += 1. Wrong or time-out: mistakes += 1, inRow += 1,
  jump halves, `at` −= jump (at least the first). Stop when: 2 mistakes in a row; or jump is 1 and the rung above the
  highest confirmed has failed; or the probes reach the max; or the top offered rung is confirmed. The end: every
  confirmed rung and its `needsClosure` become placed (`placed`, `by: 'placement'`, or `migration` for a migration
  placement), probation 0, mode practice, `checkedOn = day`; events `placement` start (at its first probe) and end.
  A placement that the run's end interrupts goes on in the next run (the mode is saved).
- **Play days** (`playDay.ts`): `PLAY_DAY_GAP_MS = 12 h`, `LONG_GAP_MS = 14 days`. `beginRun`: if `lastAt` is
  undefined (the first run ever, or the first after the migration) → `playDay: true`, `day = max(day, 1)`; else a run
  starting ≥ 12 h after `lastAt` → `day += 1`, `playDay: true`, `fastPasses = { today: 0, lastDay: today }`. On a play
  day: free every held rung whose `freeOn ≤ day` (status new, strikes 0, window empty: `free`); unless a placement is
  pending, start the **warm-up** and set `recheckDue` (below).
- **Warm-up**: the rung = the highest passed or placed rung below the frontier in the order (gap ≥ 14 days: the second
  highest); no frontier: the second-highest passed rung; none: no warm-up. Mix `WARMUP_SHARE = 0.7` from it (part
  `warmup`), the rest review. Back: 3 fast right in a row (`fast`), or 5 of the last 6 with the last 3 right (`slow`).
  A strike on it: `reviewLeft = 6` rounds of review, then it again; `WARMUP_STRIKES = 2` → it is new again (`unpassed`,
  `by: 'warmup'`; warm-up `how: 'forgot'`). A placed warm-up rung's probation runs first. Never in the first run (the
  placement is pending then) and never in the migration run.
- **Re-check**: `RECHECK_DAYS = 5`, `RECHECK_FAST_PASSES = 2`, `RECHECK_PROBES = 3`, `RECHECK_FIRST = 4`. Due on a play
  day when `day − checkedOn ≥ 5` or `fastPasses.lastDay ≥ 2`; it starts when the warm-up ends (or at once when there is
  no warm-up); at most once per play day; never in a run that has a placement. List = offered rungs above the frontier
  with status new. Probe the 4th (or the last if shorter); right and fast → it and its needs are placed (`recheck`),
  then the 2nd of the new list, then the 1st; a wrong or slow answer ends it with no change, no strike and no hold.
  `checkedOn = day` at its end; events `placement` with kind `recheck`.
- **relevel**: every rung new, holds and strikes cleared, the stats untouched; mode a placement `why: 'parent'` (first
  jump and probes); no demo (the controller's demo needs `runs === 0`).
- **Tests**: the placement's walk on scripted answers (fast rights jump 8; a slow right halves; a wrong goes down; each
  stop rule); `the needs of the confirmed rungs are placed, C1 under 14 stays new`; `a run end in the middle continues`;
  the play-day gap at 11 h 59 and 12 h; holds free on their day; each warm-up exit; the 14-day gap; the re-check's
  triggers, its 3 probes and its quiet failure; `relevel`.

- [ ] Steps: failing tests, implement, PASS, check, test, commit "Space Cat: placement, play days, the warm-up and the
  re-check".

---

### Task 5: The design's simulation against the real logic (L)

**Files:** Create `src/spacecat/logic/ladder/simulate.test.ts` (runs only with `SC_SIM=1`:
`describe.skipIf(!process.env.SC_SIM)`), printing a table.

- A simulated child knows every rung through order position K: right 95% and fast 80% there, 60% (fast 20%) one rung
  above, 30% (fast 5%) higher (the design's assumptions). 1000 children each for K = 31 (strong), 20 (typical), 4
  (weak), with a seeded rng. Drive `beginRun`, `chooseRound`, `afterAnswer` as the controller does (the demo round
  skipped; a run ends after 3 mistakes of a level, a level is 7 right).
- Report per child: the rung placed (median, p10), probes (median), mistakes in placement, answers until the frontier
  passes order K (median, p90), and the longest run of mistakes at the frontier part (p90, must be ≤ 2).
- [ ] Steps: write, run `SC_SIM=1 npx vitest run src/spacecat/logic/ladder/simulate.test.ts`, record the numbers in
  the commit message; commit "Space Cat: the placement simulation on the real ladder".

---

### Task 6: The save, version 2, and the migration of version 1 (M)

**Files:** Modify `src/spacecat/saveFormat.ts`, `store.ts`, `store.test.ts`, `savePort.ts`.

**Interfaces (produced):**

```ts
export interface Settings extends LadderSettings { arrival: 'auto' | FixedArrival; flightMusic: boolean }
export const DEFAULT_SETTINGS: Settings   // every switch on, range auto
export interface HistoryEntry { t: number; rung: RungId; change: Change; by?: By; days?: number }
export interface SpaceCatSave {
  items; totalPoints; best; ships; ship; heard; lastFact?; sinceZero; runs; settings   // as today
  ladder: Ladder
  speed: { small: SpeedState } & Partial<Record<Band, SpeedState>>
  history: HistoryEntry[]                 // the last HISTORY_KEEP = 40 ladder changes
  intro: { day: number; mistakes: Record<string, number>; again: string[] }   // the intros' play-day counters (Task 7)
}
export const SAVE_VERSION = 2
// actions
recordRound(it, res, opts?: { demo?; cut?; part?: Part; fast?: boolean; now?: number }): { events: LadderEvent[] }
beginRun(now?: number): { events: LadderEvent[]; playDay: boolean }
takeRound(rng: Rng): { item: Item; part: Part }          // ladder.chooseRound with the save, the counters written back
findLevelAgain(): void                                     // ladder.relevel
```

- `recordRound` tallies the item as today, then `afterAnswer`, then the band's speed (`speedOfBand` of the item's
  rung's band; `holdSpeed` → hold), appends each `ladder` event to `history` with `t`, sets `lastAt`. A demo or cut
  round changes no tally, ladder or speed (as today).
- **Migration** (`migrate(state, version)`, version 1 → 2, design *Migration*): items, points, best, ships, heard,
  runs stay. Speed → `{ small: old }`. Settings: times, divide and every new switch on; range by
  `RANGE_V1 = { 1: '1', 2: '3', 3: '5', 4: '6', 5: '7', 6: '11', 7: 'T2', 8: 'T5', 9: 'T6' }`, auto stays.
  Ladder: `PLACED_V1` by the old `ladder.top` (the design's table; old 6 = `1`–`11` without `8`; old 7 adds `T1`, `T2`,
  `8`, `S1`; old 8 adds `T3`, `T5`, `S2`; old 9 adds `T4a`, `T4b`, `T6`), each placed with probation 0; `day = 1`,
  `checkedOn = 1`, `lastAt` undefined; mode a placement `why: 'migration'` from the offered rung above the highest
  placed (rung `1` for an old top 1), jump 4, 10 probes. `history`: one `placed` entry `by: 'migration'` per placed
  rung is NOT written (40 entries would fill it): one entry for the highest placed rung only. A save that is not an
  object, or has no `ladder`, migrates to the default save with its items kept.
- [ ] **Step 1: Write the failing tests**: `migrates a v1 save of each old top rung` (1 to 9: the placed set, the
  mode, no item lost); `the range maps`; `times and divide turn on`; `the speed becomes the small band's`; `points,
  best, ships, heard and runs stay`; `a fresh save starts the first placement`; `history keeps the last 40`; `a demo or
  cut round changes no ladder`; `findLevelAgain keeps items and points`; `the staging copy migrates the same`
  (`staging:` key through `persistSaveStorage`); `?copy-prod`'s v1 copy migrates (read the existing copy-prod test and
  add a case).
- [ ] Steps 2–5: FAIL, implement, PASS, check, test, commit "Space Cat: save version 2 and the migration of old saves".

---

### Task 7: The play flow: ladder, parts, fast, telemetry, intros (L)

**Files:** Modify `src/spacecat/controller.ts`, `controller.test.ts`, `audio/spaceCatAudio.ts` (`hasLine(id)`),
create `audio/intros.ts` (+ test).

- `start()`: `save.beginRun(now)`; `track('run-start', { ship, rung: frontier, frontier, playDay })` and one
  literal `track('ladder' | 'placement' | 'warmup', …)` per returned event (a `switch` on `ev.e`, each branch a literal
  call). `nextRound()`: demo as today; else `save.takeRound(rng)` → item and part. `roundEnded`: `fast = isFast(res,
  band speed, arrivalMs)`; `recordRound(…, { part, fast })`; the `round` event gains `rung` (id string), `kind`,
  `part`, `fast`, `number` (a number, or the sign for a comparison); the events tracked as above. The old `rung` event
  is gone (remove it from the fixtures in Task 9).
- The arrival time: `arrivalInForce(speedOfBand(s.speed, band), s.settings.arrival)`.
- **Intros** (`audio/intros.ts`): `INTRO_TIMES = 2`, `AGAIN_AFTER = 3`. The four lines `compare`, `jumps`, `times`,
  `divide` and when each plays: the first two rounds of its kind (`compare`: a comparison; `jumps`: a jump row;
  `times`: a `×` with the ring at c, rung `T2` or later; `divide`: a `÷`), counted in `heard` when the line was heard;
  while a line has no take (`!hasLine(id)`), its glows play and nothing is counted, at most `INTRO_TIMES` per run.
  Again before the next round of its kind after `AGAIN_AFTER` of its mistake in one play day (`compare`: the mirrored
  sign; `jumps`: the last number + 1; `times`: the sum a + b; `divide`: the divisor or c − a), at most once per play day
  (the save's `intro`). A jump row with the ring not last uses the missing-number line the first two times (its own
  counter `missing-jumps`).
- **Cues**: `INTRO_CUES: Record<IntroId, { at: number; cue: Cue }[]>` with `Cue = 'signs' | 'open' | 'bigger' |
  'equal' | 'arcs' | 'ring' | 'pods' | 'share'`, nominal times in ms from the line's start (each cue glows until the
  next or the line's end; tune them to the chosen take later). The controller runs them through the `Sleeper`, as the
  line plays after the arrival sound (the line is not cut; he plays meanwhile), and stops them when the round ends.
- **Pods**: `engine.play(c, ms, { frozen, pods })` with `pods` `'start'` for the first `T1_POD_ROUNDS = 5` tallied
  rounds of `T1` and the first `T2_POD_ROUNDS = 2` of `T2`, `'cue'` during the `times` and `divide` intros, else
  `'mistake'` (the engine shows them in the mark of a wrong answer or a time-out, `MARK_POD_MS = 1500`).
- **Jump rows**: the round waits for `engine.boxIn()` (the numbers hop in) before the arrival sound.
- **Tests**: `a fresh save: demo, then probes`; `the round event has rung, kind, part, fast`; `a comparison round's
  number is the sign`; `ladder, placement and warmup events are tracked`; `run-start has playDay and frontier`; `the
  compare intro plays twice, then again after 3 mirrored picks in a play day, once`; `a silent intro still cues its
  glows`; `pods start for T1's first 5 rounds`; `a jump round waits for the hop`; the existing flow tests stay green.

- [ ] Steps: failing tests, implement, PASS, check, test, commit "Space Cat: the play flow on the new ladder, with its
  intros".

---

### Task 8: The canvas: 3 lanes, the signs, the jump row, the pods, the cues (L)

**Files:** Modify `canvas/draw.ts`, `engine.ts`, `effects.ts`, tests; create `canvas/signs.ts`, `canvas/pods.ts` (+ tests).

- **Lanes**: `lanesFor(G, n)`: 4 as today; 3 lanes centred and wider (wide: 300 apart; portrait: 1/6, 1/2, 5/6 of the
  width). The ship glides to the nearest lane of the new count at a round's start; `nearestLane` takes the count.
  Every place that loops over 4 planets loops over `labels.length`. Planet sizes do not change. `PLANET_MIN_PX = 56`
  CSS px stays (test at each verify size).
- **Signs** (`signs.ts`): `drawSign(g, sign, x, y, size, opts)`: `<` and `>` two open strokes, the same path mirrored;
  `=` two bars; never filled; the same colour and stroke for all three. Used on the planets (instead of `numDisc`'s
  text), in the flown answer and in the box. Glows: `signs` (all three planets), `open` (the open side of `<` and `>`),
  `equal` (the `=` planet).
- **Comparison feedback**: when the flown sign reaches the ring (`FLY_MS`), the bigger number swells to
  `SWELL = 1.15` for `SWELL_MS = 400`; both numbers for `=`. Also on a wrong pick (after the green ring). The `bigger`
  cue swells it during the intro.
- **Jump row**: tokens with wide gaps (`JUMP_GAP` × the box's gap), no commas, a faint small arc over each pair of
  neighbours (the `arcs` cue makes them glow in turn); the numbers hop in from the left (`HOP_MS = 250` each), then the
  ring; `boxIn()` resolves when the ring is shown (at once for other kinds). The box shrinks its font so that the
  longest row (`85 90 95 ◯`, and `240 + 35 = ◯`) fits the portrait width (measured every frame, after the font loads).
- **Pods** (`pods.ts`): `podLayout(G, groups, each)`: a row of soft rounded pods under the box (two rows when they do
  not fit), dots in dice patterns up to 6 and two rows of five for 7 to 10, round and filled, in the planets' colours,
  radius ≥ `DOT_MIN = 1/3` of the box's digit height / 2 at the worst case of each layout (`10 × 3`, `3 × 10`, `6 × 6`);
  no digit on a pod. The rounds that may show pods start the planets lower by the pods' height (`y0`), so that the pods
  cover nothing that moves. `share`: the dots of the first number fall into the pods one group at a time.
- **Probe** (`window.__scRound`): add `kind`, `box`, `labels`, `pods` (shown or not), so that the driver can find a
  round of a kind.
- **Tests**: the geometry of 3 lanes at each layout; `the signs are drawn as paths, no text` (the recording context
  draws no `<`, `>` text); `< is > mirrored`; `the jump row fits the portrait width`; `pod dots at least a third of the
  digit height`; `the pods' area does not meet the planets' start`; `the mark holds 1.5 s with pods after a wrong
  answer`; the existing engine tests stay green.

- [ ] Steps: failing tests, implement, PASS, check, test, commit "Space Cat: three lanes, drawn signs, the jump row
  and the equal-groups dots".

---

### Task 9: Telemetry: roll-up, fixtures, goldens, analysis (S)

**Files:** `src/spacecat/telemetryLog.ts` (+ test), `src/shared/__fixtures__/telemetry/generate.ts`, the Space Cat
golden, `scripts/spacecat/analyse.ts`.

- `spaceCatFacts`: a string `number` is what he chose (`'<'`); `about.docs` adds the ladder design.
- The fixture generator's `SPACECAT` table: `round` with string `rung`, `kind`, `part`, `fast`, comparison items with
  a sign `number`; new `ladder`, `placement`, `warmup` events; `run-start` with `playDay` and `frontier`; the `rung`
  event removed. Regenerate the Space Cat golden (`npx vitest run src/shared/telemetryGoldens.test.ts -u`) and read its
  diff: only Space Cat's file changes.
- `analyse.ts`: per rung by the new ids (and the item text of the new kinds), per part, fast share, the ladder changes,
  placements and warm-ups.
- [ ] Steps: failing tests (`a comparison's chosen sign is kept`), implement, PASS, check, test, commit "Space Cat: the
  ladder's telemetry, its fixtures and its analysis".

---

### Task 10: The parent area (M)

**Files:** `src/spacecat/parent/{index.ts,rungs.ts,sumText.ts,Settings.tsx,Settings.test.tsx}`; create
`parent/ladderText.ts` (+ test) if useful.

- `RUNG_TEXT: Record<RungId, { name: string; example: string }>` (English; the design's names), strand titles. Item
  text (`sumText`): sums as today (`3 + ◌ = 7`), T1 `3 + 3 + 3 = ◌`, comparison `7 ◌ 5`, jump row `5, 10, 15, ◌`.
- `summary`: `Working on: <name> · passed N of 31 · runs · best · points` (during a placement: `Working on: finding his
  level`).
- `details`: right answers per rung by the new rungs; `mixups`: also `7 ◌ 5 → <`.
- *Where he is*: a summary line (working on, passed N of 31, held count), the table grouped by strand, each row the
  rung's name, its example, its status (`statusText`; held: `held: back in N play days`) and his share of right
  answers; *Recent changes*: the save's history, newest first, with dates.
- *Settings*: *Highest level* (a select grouped by strand: `automatic` and `up to: <name> (<example>)`); five switches
  with English labels and the Hebrew in brackets, each with its explanation (the design's table; English text shown,
  Hebrew in brackets after the label only); the examples with signs in `<bdi dir="ltr">`; *Find his level again*
  (a button with a confirm; `store.findLevelAgain()`; tracked as `settings` `{ relevel: true, by: 'parent' }`). Every
  change tracked as `settings` `by: 'parent'`. Time for one sum (now: the small band's automatic time) and music stay.
- [ ] Steps: failing tests (each section, each switch, the range list, the button, the summary), implement, PASS,
  check, test, commit "Space Cat: the parent area for the new ladder".

---

### Task 11: The four lines, the home card, the glossary and the README (S)

**Files:** `src/spacecat/audio/lines.ts` (+ test), `src/components/home/SpaceCatCard.tsx` and the two tests that pin its
text, `GLOSSARY.md`, `src/spacecat/README.md`, `asset-sources/spacecat/README.md` if it lists the lines.

- `LINES` gains `compare`, `jumps`, `times`, `divide` with the design's texts, stability 0.5 and tags (`warmly`,
  `playful`, `warmly`, `warmly`). The line test checks no `!` and no digit.
- The card's line: the design's new text. The glossary: Frontier, Passed, Placed, Held, Play day, Probe, Strand (and
  Rung reworded). The README: the new modules in its map; *Known friction*'s "sums only" line replaced.
- [ ] Steps: test, implement, check, test, commit "Space Cat: the four new lines, the home card and the words".

---

### Task 12: Voice takes for the four lines (host-local, M)

- The same voice, model and pipeline as Space Cat's existing takes (`asset-sources/spacecat/audio.json`; the host's
  scripts under `<scratch>`). Plan: 8 takes (2 per line), hard ceiling 30. Log each paid call in `<scratch>`'s ledger.
- Check each take: duration, silence at the ends, clipping, the pause between sentences (0.7–0.9 s, by measurement),
  and an open transcription. Only takes that pass go to the review kit, through the host adapter and
  `node tools/review/cli.ts` (read the kit's switch-over notes first). Never record a pick.
- The repo gets the requests in `asset-sources/spacecat/audio.json` (no file until the parent picks).

### Task 13: QA with the verify driver (L)

- Update `.claude/skills/verify/drive.mjs`: a check `spacecatKinds` (seeded v2 saves with the frontier at `C1`, `S1`,
  `T1` and `15`: a comparison, a jump row, a times round with dots, a 2-digit regrouping round; screenshots; the canvas
  scan with the signs), `spacecatPlacement` (a fresh save: the demo, then probes; the export's `placement` and `round`
  `part: 'probe'`), `spacecatMigration` (a v1 save of old top 6 → the area shows `1`–`11` without `8` placed),
  `spacecatArea` updated (the new settings and *Where he is*). Sizes `phoneUp`, `phoneSide`, `tabletSide`.
- Run, look at every screenshot, fix what you find (each fix its own commit with a test).

### Task 14: The playtest build

- Read `<scratch>/build-play.sh`, check that it does not overwrite committed voice files, run it from the worktree.

> Update: the parent decided the save keeps no `history` list (`HistoryEntry`, `HISTORY_KEEP`, `toHistory`, `keepHistory` are gone). The parent area's *Recent changes* reads the telemetry `ladder` events (`src/spacecat/parent/recentChanges.ts`).
