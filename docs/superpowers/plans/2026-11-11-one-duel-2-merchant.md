# One Duel, Plan 2 of 4 — The Merchant — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** At a checkpoint between two minigames of the full adventure, a gnome merchant may come and sell the potion
that gives back a heart: the child pays the exact price from piles of the game's coins, with a first-visit demo, undo,
a counting feedback and a hint, and can always decline with one ✗ card.

**Architecture:** All rules that need no screen (when he comes, prices, the coin composition, counting, the hint's
coins) live in a new tested module `src/duel2/logic/merchant.ts`. The run controller (`src/duel2/controller.ts`) runs a
visit between screens and exposes it as `View.merchant`; a new SVG screen `src/duel2/components/screens/Merchant.tsx`
draws it on the 1600×900 stage. The save gets the parent's number range and the merchant's counters (version 6).

**Tech Stack:** TypeScript 5.9, React 19, Zustand 5 (persist), Vitest 4 (fake timers), Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-11-one-duel-design.md](../specs/2026-11-11-one-duel-design.md) — Part 2 (all of
it), *Parent area*, *Assets*, and the merchant items of *Details settled after the review*. Plan 1
([2026-11-11-one-duel-1-stakes.md](2026-11-11-one-duel-1-stakes.md)) must be built first.

## Global Constraints

- "He pays the exact price. There is no haggling and no change."
- "Only in the full adventure … never in a single minigame from the path." "At checkpoints: between screens, and always
  before a boss. Never at the moment the hearts run out." "Only when the child has fewer than 3 hearts **and** enough
  coins for the price." "On his last heart, the merchant comes at the next checkpoint. With 2 hearts, at every other
  checkpoint" — counted since his last visit; "a declined visit counts as a visit". "One potion per visit."
- Prices: "the first price is about six right answers' coins without the multiplier" (= 6). "Each purchase ×1.5,
  rounded. Prices are capped at the number range's top (10, 100 or 1000)." The price starts low again each run.
- Number range: parent setting "up to 10", "up to 100", "up to 1000", default 100. Coin values: 10 → 1, 2, 5, 10;
  100 → also 20, 50; 1000 → also 100, 200, 500.
- "The piles are all his savings." A pile is drawn up to 6 coins; a taller pile is drawn at 6 ("at least this many").
  "The exact price can always be made"; the composition is re-made "before each visit, never during one".
- "The game's own parts only": Book 2's top bar; `CoinIcon` for every coin (value stamped in the crescent's cream
  colour, a small crescent above it, bigger values bigger); the price tag is parchment with `CoinIcon` and the numeral;
  the ✗ is a choice card styled like `GenderQuestion`'s `.gq-pick`; demos use `HandShape`. No emoji, no text; digits
  `data-num`.
- "**No total is shown while he chooses**." Counting happens only after he taps the potion.
- Undo: "a tap on the merchant's hand sends back the last coin given, to its pile"; shown by the demo hand "the first
  time only" he gives too much.
- Hint: "the wand. After two wrong tries in a row, the wand glows (it does not open by itself)". It shows the top coins
  of the piles that make the price, glowing green; the coins in the merchant's hand go back first.
- "A pause during a visit … keeps the visit as it is, coins in the merchant's hand included."
- Voice lines: exactly the spec's table (no "!"), girl forms in the girl map; "Each line that repeats gets a few
  variations"; the merchant has his own voice (a separate voice id); only the hint line is the narrator's.
- Every commit ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; no host names, paths or passwords in
  repo files or commit messages. Run `npm test` and `npx tsc --noEmit -p .` before each commit (eslint is not
  installed on this host).

## Review Focus

1. **A large balance with a small range** (e.g. 340 coins, "up to 10"): the composition uses only 1/2/5/10, every pile
   draws at most 6 coins, every coin is still givable, and the price is payable. → test in Task 1.
2. **A balance that is exactly the price, or one coin short:** exactly → he comes and the piles make it; short → he
   never comes. → test in Task 1.
3. **A pause during the counting or with coins in the merchant's hand:** after resume, the same coins are in his hand,
   the piles are the same, nothing is spent twice. → test in Task 4.
4. **The pass heart (Plan 1) refills him to 3 at the same checkpoint:** the pass heart comes first, so the merchant does
   not come with 3 hearts. → test in Task 4.
5. **He buys, then loses the run:** the coins spent stay spent, the heart counted; the next run's first price is 6 again.
   → test in Task 4.

---

### Task 1: The merchant's rules (pure)

**Files:**
- Create: `src/duel2/logic/merchant.ts`
- Test: `src/duel2/logic/merchant.test.ts`

**Interfaces:**
- Produces:
  - `type NumberRange = 10 | 100 | 1000`; `COIN_VALUES: Record<NumberRange, number[]>` (ascending).
  - `FIRST_PRICE = 6`, `PRICE_GROWTH = 1.5`, `PILE_CAP = 6`.
  - `priceAt(purchasesThisRun: number, range: NumberRange): number` — `min(range, round(6 × 1.5^n))`.
  - `merchantDue(c: { adventure: boolean; hearts: number; coins: number; price: number; sinceVisit: number; bossNext: boolean }): boolean`
    — false unless adventure, `hearts < 3`, `coins >= price`; then true when `hearts === 1`, or `bossNext`, or
    `sinceVisit >= 2` (2 hearts: every other checkpoint). `sinceVisit` counts checkpoints since his last visit
    (`Infinity` before the first).
  - `composeCoins(balance: number, price: number, range: NumberRange, level: number, rng: Rng): number[]` — a multiset of
    `COIN_VALUES[range]` summing to `balance`, such that `price` is payable. `level` 0–2 (adaptive, my call in the spec):
    0 → some ≤2 coins make the price; 1 → the price needs ≥3 coins; 2 → as 1, and a single coin bigger than the price is
    present. Fall back to the best lower level when a level is impossible for this balance. Big balances are mostly the
    largest value (piles capped when drawn).
  - `payable(coins: number[], price: number): boolean` (subset sum).
  - `hintCoins(coins: number[], price: number): number[]` — a payable subset with the fewest coins.
  - `piles(coins: number[]): { value: number; count: number; drawn: number }[]` — ascending value, `drawn = min(count, PILE_CAP)`.
  - `countSteps(given: number[]): number[]` — the running totals in giving order.
  - `verdict(sum: number, price: number): 'exact' | 'short' | 'over'`.

- [ ] **Step 1: Write the failing tests**

```ts
it('prices: 6, then ×1.5 rounded, capped at the range', () => {
  expect([0, 1, 2, 3].map((n) => priceAt(n, 100))).toEqual([6, 9, 14, 20])
  expect(priceAt(2, 10)).toBe(10)
})
it('he comes only in the adventure, with fewer than 3 hearts and enough coins', () => {
  const base = { adventure: true, hearts: 1, coins: 6, price: 6, sinceVisit: Infinity, bossNext: false }
  expect(merchantDue(base)).toBe(true)
  expect(merchantDue({ ...base, coins: 5 })).toBe(false)
  expect(merchantDue({ ...base, hearts: 3 })).toBe(false)
  expect(merchantDue({ ...base, adventure: false })).toBe(false)
})
it('with 2 hearts every other checkpoint, and always before a boss', () => {
  const two = { adventure: true, hearts: 2, coins: 50, price: 6, bossNext: false }
  expect(merchantDue({ ...two, sinceVisit: 1 })).toBe(false)
  expect(merchantDue({ ...two, sinceVisit: 2 })).toBe(true)
  expect(merchantDue({ ...two, sinceVisit: 1, bossNext: true })).toBe(true)
})
it('a large balance in a small range: only that range’s coins, sums to the balance, payable, piles drawn at most 6', () => {
  const c = composeCoins(340, 7, 10, 2, seq(0.3))
  expect(c.every((v) => [1, 2, 5, 10].includes(v))).toBe(true)
  expect(c.reduce((a, b) => a + b, 0)).toBe(340)
  expect(payable(c, 7)).toBe(true)
  expect(piles(c).every((p) => p.drawn <= 6)).toBe(true)
})
it('the balance equal to the price is payable at every level', () => {
  for (const level of [0, 1, 2]) expect(payable(composeCoins(6, 6, 100, level, seq(0.5)), 6)).toBe(true)
})
it('level 0: two coins or fewer make the price; level 2: there is a coin bigger than the price', () => {
  expect(hintCoins(composeCoins(30, 7, 100, 0, seq(0.1)), 7).length).toBeLessThanOrEqual(2)
  expect(composeCoins(60, 7, 100, 2, seq(0.1)).some((v) => v > 7)).toBe(true)
})
it('counting and the verdict', () => {
  expect(countSteps([5, 2])).toEqual([5, 7])
  expect([verdict(7, 7), verdict(5, 7), verdict(10, 7)]).toEqual(['exact', 'short', 'over'])
})
```

  (`seq` = a fixed-sequence rng helper in the test file.)
- [ ] **Step 2: Run** `npx vitest run src/duel2/logic/merchant.test.ts` — Expected: FAIL (module missing).
- [ ] **Step 3: Implement** the module. `payable`/`hintCoins` by a small dynamic programme over the distinct values and
  their counts (balances reach the thousands; the DP is over `price`, not the balance).
- [ ] **Step 4: Run** the test — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2 merchant rules: when he comes, prices, the coins he can pay with"`

### Task 2: The save and the parent area — the number range and the money counters

**Files:**
- Modify: `src/duel2/store.ts`, `src/duel2/screens/Parent.tsx`
- Test: `src/duel2/store.test.ts`, `src/duel2/screens/parent.test.tsx`

**Interfaces:**
- Consumes: `NumberRange` (Task 1).
- Produces:
  - `Duel2Settings.range: NumberRange` (default 100).
  - `Duel2Save.merchant: { visits: number; purchases: number; declines: number; short: number; over: number; hints: number; level: number; demoSeen: boolean; undoShown: boolean }`
    (fresh: zeros/false). `level` 0–2: +1 after 3 exact payments in a row with no hint, −1 after 2 visits in a row with a
    hint; clamp.
  - `noteMerchant(e: 'visit' | 'purchase' | 'decline' | 'short' | 'over' | 'hint'): void`, `setMerchantFlag(k: 'demoSeen' | 'undoShown'): void`,
    `merchantPaid(exactNoHint: boolean): void` (updates `level`).
  - `Duel2Save.checkpointsSinceVisit: number` — checkpoints since his last visit, **across runs** (fresh: a large
    number, e.g. `999`, meaning "never visited"; JSON cannot store `Infinity`). Saved, not per run.
  - persist `version: 6`; `migrateSave` appends a `< 6` step (in sequence, after Plan 1's): `settings.range = 100` if
    missing, `merchant` and `checkpointsSinceVisit` defaults if missing. Both new fields are in `fresh()`, so
    `resetProgress` resets them (it keeps `settings`, including `range`).
  - Parent page: a "Number range for shopping" radio (up to 10 / 100 / 1000) and a "Money" section: purchases, declines,
    tries that were not enough, too much, hints, the current level.

- [ ] **Step 1: Write the failing tests**

```ts
it('a version-5 save gets the range 100 and empty merchant counters, keeping everything else', () => {
  const out = migrateSave({ coins: 40, settings: { sfx: true, music: true, volume: 1, drawing: true } }, 5)
  expect(out.settings.range).toBe(100)
  expect(out.merchant.purchases).toBe(0)
  expect(out.coins).toBe(40)
})
it('the merchant level goes up after 3 exact payments with no hint and down after 2 with a hint', () => { /* … */ })
it('the parent page sets the number range and shows the money section', () => {
  // render Parent; click the "up to 10" radio → settings.range === 10; [data-money] lists purchases
})
```

- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run src/duel2` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2 save: the shopping number range and the merchant's counters (version 6)"`

### Task 3: The merchant's art and screen

**Files:**
- Create: `src/duel2/assets/img/merchant-sell.webp`, `merchant-shy.webp`, `merchant-insulted.webp` — copied from the
  source path that the session prompt gives (the merchant mock art; the `IMAGES` glob picks them up). If the prompt
  gives no path, draw an SVG placeholder gnome in `Merchant.tsx` instead and leave the copy to the Handoff. `src/duel2/components/ValueCoin.tsx`,
  `src/duel2/components/screens/Merchant.tsx`
- Modify: `src/duel2/components/icons.tsx` (export the `CoinIcon` paths for reuse if needed), `src/duel2/duel2.css`
  (the ✗ card: the `.gq-pick` look — `radial-gradient(ellipse at 50% 60%,#ffffff22,#ffffff08 70%)`, border
  `#ffffff22`, glow `border-color:#ffd34d; box-shadow:0 0 40px #ffd34daa, inset 0 0 30px #ffd34d44`),
  `asset-sources/duel2/images.json` (three entries with the gnome request text, marked "placeholder from the merchant
  mock, to be replaced by final art")
- Test: `src/duel2/components/parts.test.tsx`

**Interfaces:**
- Consumes: `piles` (Task 1), `HandShape` (`components/DemoHand.tsx`), `useWizardArt`.
- Produces:
  - `ValueCoin({ value, size, state }: { value: number; size?: number; state?: 'gone' | 'lit' | 'hint' })` — `CoinIcon`'s
    rim/colours/shine, the value centred in `#fff0d2` with an `#8a4a12` stroke, a small crescent at the top. Size by
    value (1:52, 2:58, 5:66, 10:76, 20:82, 50:88, 100+: 92 stage units).
  - `PriceTag({ price, flash })` — parchment `#f6e6bf` / stroke `#8a6a2a`, a string to the bottle's neck, `CoinIcon` and
    the numeral (`data-num`, `data-price`).
  - `MerchantView` (defined in the controller, Task 4) rendered by `Merchant({ v, onCoin, onHand, onPotion, onDecline })`.
    Layout on the 1600×900 stage (from the approved mock): the wizard left (x≈80, bottom≈780, height≈450); the gnome
    right, mirrored to face left (height≈560, right edge≈1540); the potion in his raised hand (centre ≈ x 1080, y 420)
    with the tag to its left; the open-hand drop zone centred ≈ (1290, 576), radius ≈ 90; the piles left-bottom from
    x≈90, bottom≈870, one column per value, coins overlapping upwards; the ✗ card ≈ (400, 200), 210×210; the count bubble
    above the hand ≈ (1290, 460). The ✗ card has `data-decline`, each pile `data-pile={value}`, the hand
    `data-merchant-hand`, the potion `data-potion`.
  - The gnome pose: `merchant-sell` normally, `merchant-shy` never used now, `merchant-insulted` unused (kept for later).

- [ ] **Step 1: Write the failing tests**

```ts
it('ValueCoin stamps the value and grows with it', () => { /* 1 smaller than 10; [data-num] text '10' */ })
it('a pile of 9 coins draws 6', () => { /* render Merchant with piles [{value:2,count:9,drawn:6}] → 6 coins in [data-pile="2"] */ })
it('the merchant screen has no text other than digits', () => { /* the no-text scan used by other parts tests */ })
it('taps: a pile gives its top coin, the hand undoes, the potion buys, the ✗ declines', () => { /* fireEvent.pointerDown → callbacks */ })
```

- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement** (respond on pointer-down with a bounce: rule; drags from a pile to the hand also give a coin:
  rule "let the child drag the choice there. Accept a tap too").
- [ ] **Step 4: Run** `npx vitest run src/duel2/components` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2 merchant screen: the gnome, the potion with its tag, the open hand, coin piles, the ✗ card"`

### Task 4: The visit in the run

**Files:**
- Modify: `src/duel2/controller.ts` (`View.merchant`, a checkpoint step in `loop` between screens, new gestures),
  `src/duel2/screens/Play.tsx` (render `Merchant` when `view.merchant`), `src/duel2/data/lines.ts` (the merchant lines),
  `src/duel2/audio/duel2Audio.ts` (sfx ids `coin` and `count`, falling back to `lock` and `zap` until recorded)
- Test: `src/duel2/useRun.test.tsx`

**Interfaces:**
- Consumes: Task 1's functions; Task 2's `range`, `merchant`, `noteMerchant`, `merchantPaid`; Plan 1's `coins`,
  `spendCoins`, hearts; `decideBoss` (to know `bossNext`).
- Produces:
  - `View.merchant?: { phase: 'arrive' | 'pay' | 'count' | 'leave' | 'sold'; price: number; coins: number[] (his, composed); given: number[]; counted?: number; verdict?: 'exact' | 'short' | 'over'; glow?: { tag?: boolean; hand?: boolean; potion?: boolean; decline?: boolean; hint?: number[] }; demo?: { step: 'price' | 'give' | 'potion' | 'decline' | 'undo'; t: number } }`.
  - Gestures `{ type: 'coin'; value: number }`, `{ type: 'hand' }`, `{ type: 'potion' }`, `{ type: 'decline' }`.
  - Run state: `purchasesThisRun`, `wrongInRow` (per run); `checkpointsSinceVisit` lives in the save (Task 2).
  - The checkpoint: after a screen ends and after Plan 1's pass heart, before the next screen; skipped under `opts.force`
    and when `opts.session` is set. There is no checkpoint before the crystal (doors → crystal is one step); the
    checkpoint comes after the crystal, before the next screen. The boss: at the checkpoint, after `newVisit()` for the
    next screen, call `decideBoss()` once when the next screen is the broom and store it in `this.visitBoss` (so
    `runScreen` does not decide again); `bossNext = !!this.visitBoss`. This task declares `RunOpts.session?: { screen: ScreenId }` (unused until Plan 4,
    which runs path sessions); the adventure is `!this.opts.force && !this.opts.session`.
  - Line ids (merchant voice): `m-hello` (3 var.), `m-again` (2), `m-bye` (2), `m-price`, `m-give`, `m-tap`, `m-decline`,
    `m-exact` (3), `m-short` (3), `m-over` (3), `m-undo`, `m-empty` (2), and narrator `m-hint` (2). Texts and girl forms
    exactly as the spec's table, no "!". Add `voice?: 'merchant'` to `LineDef` (the host pipeline reads it).
  - Telemetry: `merchant-arrive {price, coins, hearts}`, `merchant-decline {phase}`, `merchant-offer {sum, price, verdict, coins}`,
    `merchant-buy {price, coins}`, `merchant-undo {}`, `merchant-hint {auto}`.

- [ ] **Step 1: Write the failing tests**

```ts
it('with one heart and enough coins the merchant comes at the next checkpoint; paying the exact price buys a heart', async () => {
  // stage 1, coins 20, hearts 1 (lose two on the broom); at the checkpoint view.merchant.phase === 'arrive', price 6;
  // give coins of hintCoins(view.merchant.coins, 6), tap potion → verdict 'exact', hearts 2, store coins 14,
  // view.merchant undefined and the next screen starts
})
it('not enough and too much leave the coins in his hand and cost nothing', async () => { /* … verdict 'short' then 'over'; coins unchanged */ })
it('a tap on the merchant’s hand sends back the last coin given', async () => { /* give 5, 2 → hand → given [5] */ })
it('the ✗ declines at any moment: his coins go back, the run goes on, the visit counts', async () => { /* … */ })
it('with 3 hearts after the pass heart he does not come', async () => { /* Review Focus 4 */ })
it('a lock during a visit keeps the coins in his hand and the piles', async () => { /* Review Focus 3 */ })
it('the price grows with each purchase in a run and starts at 6 in the next run', async () => { /* Review Focus 5 */ })
it('in the gallery the merchant never comes', async () => { /* opts.force */ })
```

- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement.** The composition is made once at arrival (`composeCoins(coins, price, range, merchant.level, rng)`).
  On `exact`: `spendCoins(price)`, hearts +1 (max `HEARTS`), the potion flies to the wizard and a heart to the top bar
  (Plan 1's generic `View.heal` fx), `merchantPaid`, `purchasesThisRun++`. Every visit (bought or declined) resets
  `checkpointsSinceVisit` to 0; other checkpoints add 1. Pause: the visit waits on gestures through the existing
  pause mechanism and its state lives in `view.merchant`, so resume continues it.
- [ ] **Step 4: Run** `npx vitest run src/duel2` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2 merchant in the run: the checkpoint visit, paying, counting, declining"`

### Task 5: The first-visit demo, the undo demo, the hint and the idle line

**Files:**
- Modify: `src/duel2/controller.ts`, `src/duel2/components/screens/Merchant.tsx` (dim everything but the step's target;
  the demo hand), `src/duel2/components/TopBar.tsx` (the wand can glow: `hintGlow?: boolean`)
- Test: `src/duel2/useRun.test.tsx`

**Interfaces:**
- Consumes: Task 4's view and gestures; `merchant.demoSeen`, `merchant.undoShown`; `hintCoins`.
- Produces:
  - First visit (`!demoSeen`), right after `m-hello`: steps D1 `price` (tag glows, `m-price`), D2 `give` (the hand drags
    the top coin of the hint's first pile into the merchant's hand and back, `m-give`), D3 `potion` (`m-tap`), D4
    `decline` (✗ glows, `m-decline`). The ✗ is hidden while the demo plays; `demoSeen` is set when D4 ends. The price
    and piles stay the same afterwards (rule: the demo's round is the first round).
  - Undo demo: the first `over` ever (`!undoShown`): the hand taps the merchant's hand and the last coin flies back;
    `m-undo`; then `undoShown`.
  - Hint: `hint()` while `view.merchant.phase === 'pay'` → the given coins go back, `glow.hint` = `hintCoins(...)` (top
    coins of those piles glow green), `m-hint`, `noteMerchant('hint')`. After two wrong tries in a row, `View.hintGlow`
    is true (the wand glows) until he taps it or pays.
  - Idle: no tap for 20 s after arrival → `m-again` once; never again in that visit; no time limit.
  - Tapping the potion with an empty hand: `glow.hand`, `m-empty`.

- [ ] **Step 1: Write the failing tests**

```ts
it('the first visit shows price, giving, the potion and the ✗, then it is his turn with the same price', async () => { /* order of demo steps and lines; demoSeen */ })
it('the first time he gives too much the hand shows the undo, once', async () => { /* undoShown; second over: no demo */ })
it('two wrong tries make the wand glow; it does not open the hint by itself', async () => { /* view.hintGlow; no m-hint until c.hint() */ })
it('the hint sends his coins back and makes the right top coins glow', async () => { /* glow.hint equals hintCoins */ })
it('he waits 20 s: the merchant asks once more, only once', async () => { /* m-again once after 20 s and 60 s */ })
it('the potion with an empty hand makes the hand glow', async () => { /* … */ })
```

- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run src/duel2` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2 merchant: the first-visit demo, undo when first needed, the hint, the idle line"`

### Task 6: The final check

**Files:**
- Modify: `src/duel2/screens/Gallery.tsx` (an entry "Merchant" that forces a visit with 1 heart and 40 coins — the
  gallery is where the parent reviews it; the visit ends the gallery screen), `src/duel2/data/data.test.ts` (the new
  line ids exist, have girl forms where they address the child, and contain no "!")
- Test: the whole suite

- [ ] **Step 1:** Add the gallery entry and the data checks; run `npx vitest run src/duel2` — Expected: PASS.
- [ ] **Step 2:** `npm test` and `npx tsc --noEmit -p .` — Expected: all pass, no errors.
- [ ] **Step 3:** QA at phone and tablet size in the dev server (memory: QA before handoff): first visit with demo, a
  purchase, short/over/undo/hint, decline, a pause in each phase, ranges 10/100/1000 with a large balance, the girl's
  wizard. Screenshots of each step.
- [ ] **Step 4: Commit** `git commit -m "Book 2 merchant: gallery entry and line checks"`

## Handoff (host steps after the code)

- Choose a merchant voice (warm, playful, unlike the narrator), set it for the `voice: 'merchant'` lines, generate the
  merchant lines (boy and girl forms) and `m-hint`; check the feminine forms by ear before mass recording (spec); record
  the chosen takes in `asset-sources/duel2/audio.json`.
- Sounds `coin` (a clink) and `count` (a counting chime); until then they fall back to existing sounds.
- Final merchant art replaces the three placeholder webps (agree a budget with the parent first).
