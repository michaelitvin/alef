# One Duel, Plan 4 of 4 — The Home Screen and Path Sessions — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The alef home screen becomes the approved mock — one duel card that starts the adventure, a right-to-left path
of its minigames under it (each station opens one short session of that minigame), the clock card, and the old levels
as a small icon shelf — and Book 2 can run a path session: one visit, no hearts at stake, no merchant, then back home by
itself.

**Architecture:** Book 2's controller gains `RunOpts.session = { screen }` (a one-visit run with no stakes), and
`Duel2App` opens it from the link parameter `?station=<ScreenId>`. The main app's `HomePage` is rebuilt from new
focused components in `src/components/home/`; it reads the Book 2 save (`useDuel2Store`, same origin, re-read when the
page shows) and the first duel's `progressStore.duel` to decide which stations are open and their 0–3 ratings
(Plan 3's `cycleOf`, `screenRecent`, `rating`).

**Tech Stack:** TypeScript 5.9, React 19, React Router (HashRouter in the main app), Zustand 5, Vitest 4, Testing Library.

**Spec:** [docs/superpowers/specs/2026-11-11-one-duel-design.md](../specs/2026-11-11-one-duel-design.md) — Part 4, the
path-session items of Part 3 and of *Details settled after the review*, and the home-screen girls item. Plans 1–3 must be
built first. The approved home mock is host-local; this plan carries its layout values.

## Global Constraints

- "Right to left throughout": pictures on the right; play buttons on the left **pointing left** (rule: "the play
  triangle points in the direction of the motion that the child sees … With no motion, follow the reading direction").
- The duel card: the take-3 picture (tower with the wizard flying out of it on his broom), mirrored (`scaleX(-1)`), three
  nikkud orbs (`בָּ`, `לִ`, `מוּ`), a vector play button in its own column. "The card starts the full adventure" — it opens
  Book 2's cover as today.
- Under the card: "**מה לומדים:** לשמוע ולקרוא אותיות, ניקוד והברות, ואחר כך מילים; להבחין בין אותיות דומות; ואחרי
  הקריאה — לכתוב בדפוס ובכתב יד. המשחק מתאים את עצמו לילד."
- The path, in this order, with "Captions say only what is learned, never the minigame's name", "smaller and fainter
  than the station picture": tower → "ניקוד לפי צליל"; broom (orb `בָּ`) → "אותיות והברות לפי צליל"; ghosts →
  "אותיות דומות"; cauldron → "בניית הברה"; ladder → "משפחות הברות, דגש"; doors → "קריאת מילים"; draw (`א` in print) →
  "אותיות דפוס"; draw-hand (`א` in Dana Yad) → "אותיות כתב יד".
- "Open stations come first and locked ones are greyed out with a lock." Ratings: "three small dots that fill (not
  stars)". "The wizard stands at the newest open station." The first station's picture is the tower.
- Separators: "a thin gold line with a star" between the reading section and the clock, and before "פעילויות נוספות".
- The clock card, same layout as the duel card, from the clock game's art (workshop background, cuckoo clock with a real
  face, the cuckoo on its roof, the happy bear, three small clock faces 3:00 / 3:30 / 3:15, a brass play button), and
  "**מה לומדים:** לקרוא שעון מחוגים: שעות שלמות, חצאים ורבעים, ואחר כך כל חמש דקות. בעברית ובאנגלית."
- The old levels: "one row of small round icons, with a lock on locked ones", redrawn as SVG (no emoji), heading
  "פעילויות נוספות". The settings button stays.
- Phone fit: "the cards shrink, the path scrolls only sideways, and no vertical overflow" (tested at 360×780 and
  780×360).
- Path session: "one visit to that minigame (about 10 questions, or one boss), then the summary screen. No hearts at
  stake and no merchant. Stars and coins are still earned." "No hearts in the top bar, and mistakes cost nothing but the
  streak." "After a path session's summary, the game goes back to the home screen by itself (no button)."
- Girls: "the card picture and the path's wizard follow the saved player (`shared/player`). Before the question has been
  asked, the boy is shown."
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; no host details in the repo. `npm test` and
  `npx tsc --noEmit -p .` before each commit.

## Review Focus

1. **The home screen with no Book 2 save at all** (a brand-new player): the tower is open, every other station locked,
   ratings empty, no crash reading a missing save. → test in Task 4.
2. **Coming back to the home screen after playing Book 2 in the same tab:** the stations and ratings show the new
   progress without a reload. → test in Task 4.
3. **A station link to a locked minigame** (`?station=doors` at stage 1, typed or stale): Book 2 opens its cover instead
   of starting a minigame he has not reached. → test in Task 2.
4. **A tablet lock during a path session's summary:** it still goes home by itself afterwards, once. → test in Task 2.
5. **The path at 360 px wide:** it scrolls sideways only (`scrollHeight === clientHeight`), and the duel card fits
   without overflow. → test in Task 5 (a layout check in the headless browser during QA, plus a jsdom style check).

---

### Task 1: Path sessions in the controller

**Files:**
- Modify: `src/duel2/controller.ts` (`RunOpts.session`, the loop, hearts, the merchant/pass-heart guards, the end),
  `src/duel2/logic/run.ts` (`SESSION_LENGTH`), `src/duel2/components/TopBar.tsx` (hearts hidden when `hearts` is
  `undefined`), `src/duel2/screens/Play.tsx`
- Test: `src/duel2/useRun.test.tsx`, `src/duel2/logic/run.test.ts`

**Interfaces:**
- Consumes: Plan 1 (hearts, streak, coins), Plan 2 (the checkpoint: already skipped when `opts.session`), Plan 3
  (`'tower'`, `towerAnswer`).
- Produces:
  - `RunOpts.session?: { screen: ScreenId }` (declared by Plan 2, whose checkpoint already skips it; this task makes it run).
  - `SESSION_LENGTH: Record<ScreenId, number>` = broom 10 (waves), tower 2 (waves), cauldron 10, ladder 10, ghosts 10,
    doors 6, draw 6, draw-hand 6 (rounds).
  - In a session: one visit of that screen with `SESSION_LENGTH` rounds, then `over` with `View.over.session = true`.
    Hearts are not shown (`View.hearts` stays 3, `TopBar` gets `hearts={undefined}`) and never drop: a wrong answer
    still records, marks the fix, resets the streak. No pass heart, no merchant, no crystal; `lastEnded` and `bestRun` are
    not changed. A broom session is a boss visit when a saved counter `broomSessions` is odd (the run's "every second
    broom visit" rhythm), and then lasts until the boss is beaten (the boss cannot be lost: no hearts).

- [ ] **Step 1: Write the failing tests**

```ts
it('a ghosts session is ten rounds, then over with session: true', async () => { /* … */ })
it('mistakes in a session cost no heart, only the streak', async () => { /* view.hearts stays 3; view.mult back to 1 */ })
it('a session earns stars and coins but changes neither lastEnded nor bestRun', async () => { /* … */ })
it('no merchant, no pass heart and no crystal in a session', async () => { /* doors session → no crystal screen */ })
it('every second broom session is a boss fight', async () => { /* broomSessions 1 → view.screen.boss set */ })
```

- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run src/duel2` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2: path sessions — one visit of one minigame, nothing at stake"`

### Task 2: Opening a station from the link, and going home by itself

**Files:**
- Modify: `src/duel2/Duel2App.tsx`, `src/duel2/screens/Summary.tsx` (the session summary)
- Test: `src/duel2/screens/shell.test.tsx` (or a new `session.test.tsx`)

**Interfaces:**
- Consumes: `RunOpts.session`, `cycleOf(stage, drawing, bookOpen)` (Plan 3).
- Produces:
  - `stationFromUrl(search: string, open: ScreenId[]): ScreenId | null` (exported from `Duel2App.tsx` or a small
    `src/duel2/station.ts`): the `station` parameter when it is one of the open screens, else `null`.
  - With a valid station, `Duel2App` skips the cover: the gender question if unset, then `Play` with
    `{ session: { screen } }`. An invalid or locked station → the cover (Review Focus 3).
  - The session summary: the session's stars, his coins, no best, no play button, no boss teaser; its `run-end` line
    plays, then `HOME_AFTER_MS = 2500` later `location.assign(import.meta.env.BASE_URL)` — once, also after a pause
    (a `visibilitychange` back to visible restarts the wait, never doubles it).

- [ ] **Step 1: Write the failing tests**

```ts
it('?station=ghosts opens a ghosts session without the cover', () => { /* stage 1, bookOpen → [data-screen="play"] */ })
it('a locked or unknown station opens the cover', () => { /* stage 1, ?station=doors → [data-screen="cover"]; ?station=x → cover */ })
it('the session summary has no play button and goes home by itself, once', async () => { /* fake timers; location.assign spied once */ })
it('a lock during the session summary still goes home once', async () => { /* hide/show → one assign */ })
```

- [ ] **Step 2: Run** them — Expected: FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run** `npx vitest run src/duel2` — Expected: PASS.
- [ ] **Step 5: Commit** `git commit -m "Book 2: a station link opens one minigame; the session goes home by itself"`

### Task 3: The home art and the small parts

**Files:**
- Create: `src/assets/home/card.webp` (the take-3 card picture converted to WebP, ≤ 200 KB; the girl version is owed and
  falls back to this), `src/components/home/PlayButton.tsx`, `src/components/home/Separator.tsx`,
  `src/components/home/LevelIcons.tsx`, `asset-sources/home/images.json` (the card request text and its references, as
  the other asset-sources files do)
- Test: `src/components/home/home.test.tsx`

**Interfaces:**
- Produces:
  - `PlayButton({ theme, size }: { theme: 'duel' | 'clock'; size?: string })` — the mock's vector button: rim gradient
    (`#fff1a8 → #ffd34d → #b8860b` for the duel; `#fff1c0 → #e0b26a → #9a6a28` for the clock), centre radial
    (`#8a5cff → #2a1260` / `#b07a3e → #4a2a10`), the triangle **pointing left** (`M59 31 L29 50 L59 69 Z`, fill
    `#fff6d8`), a highlight arc; width `clamp(52px, 15vw, 84px)`; `aria-label="play"`.
  - `Separator()` — a 2 px line `linear-gradient(90deg, transparent, #c9a24a, transparent)` either side of a `✦`-shaped
    SVG star in `#c9a24a`, margin `18px 8px 4px`.
  - `LevelIcon({ kind })` for `'letters' | 'nikkud' | 'syllables' | 'words' | 'sentences' | 'stories'`: the first three
    are the glyphs `א`, `בָ`, `בָּ` in the Sigalit font inside the round icon; the last three are SVG drawings (an open
    book; a page with lines; a stack of books); `LockBadge()` — an SVG padlock.

- [ ] **Step 1: Write the failing tests**

```ts
it('the play button points left', () => { /* the path's d starts with 'M59' (left-pointing) */ })
it('level icons and the lock are SVG, never emoji', () => { /* no text node matches /\p{Extended_Pictographic}/u */ })
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npx vitest run src/components/home` — PASS.
- [ ] **Step 5: Commit** `git commit -m "Home: the card picture, the left-pointing play button, separators, SVG level icons"`

### Task 4: The duel card and the path of stations

**Files:**
- Create: `src/components/home/DuelCard.tsx`, `src/components/home/StationPath.tsx`, `src/components/home/stations.ts`,
  `src/components/home/home.css`
- Test: `src/components/home/home.test.tsx`

**Interfaces:**
- Consumes: `useDuel2Store` (read only; `persist.rehydrate()` on mount and on `visibilitychange` → visible and `pageshow`),
  `useProgressStore` (`duel.recent`), Plan 3's `cycleOf`, `screenRecent`, `rating`; `useGender`/`wizardArt`; duel2 images
  (`s-orb`, `s-ghost`, `s-cauldron`, `s-ladder`, `s-door`, `s-wizard-cast`/`-girl`), the duel's `tower.webp`.
- Produces:
  - `STATIONS: { id: ScreenId; learn: string; pic: 'img' | 'orb' | 'glyph' | 'hand' }[]` in the path order and captions
    of *Global Constraints*.
  - `stationState(save, duelRecent): { id: ScreenId; open: boolean; rating: 0 | 1 | 2 | 3 }[]` — open = in
    `cycleOf(stage, drawing, bookOpen)` (the tower always); a missing save reads as a fresh one (stage 1, bookOpen false,
    drawing true). Open stations first, then locked, each group in path order.
  - `DuelCard({ onPlay })` — the mock's `.cardt`: grid `minmax(0,1.25fr) minmax(0,1fr) auto`, gap 6 px, padding
    `8px 10px 8px 12px`, `direction: rtl`, border `2px solid #ffd34db3`, radius 22 px, background
    `radial-gradient(ellipse at 70% 20%, #a050ff73, transparent 60%), linear-gradient(135deg, #3b1d6e, #1a1240)`, glow
    `0 0 24px #8c5aff73`; the art `max-height: 120px`, mirrored; orbs sized 58/46/40 px × `--k`, lifted −18/16/−6 px; the
    play column with `border-right: 2px solid #ffd34d33`; `@media (max-width: 480px)` `--k: .7`. Then the "מה לומדים"
    line (12.5 px, `#4a3b20`, the bold word `#3b1d6e`). The card links to `${BASE_URL}duel2/`.
  - `StationPath()` — the mock's `.path`: `display:flex; gap:6px; overflow-x:auto; overflow-y:hidden;
    padding:40px 6px 16px; direction:rtl`; a dotted trail SVG behind (`stroke #b08a3a`, width 4, dash `2 12`, round caps,
    mirrored); stations 84 px wide, 72 px white discs with a `3px solid #c9a24a` border, alternating up −14 px / down
    10 px; locked: greyscale, opacity .45, dashed border, `LockBadge`; captions 11 px `#5a4a2a`; three rating dots
    below the disc; the wizard (46 px high) above the newest open station. Each open station links to
    `${BASE_URL}duel2/?station=<id>`; locked stations do nothing. Station elements carry `data-station`, `data-open`,
    `data-rating`.

- [ ] **Step 1: Write the failing tests**

```ts
it('a brand-new player: the tower open, the rest locked, no ratings', () => { /* Review Focus 1 */ })
it('stage 2 with drawing: open stations first in path order, then the locked doors', () => { /* order of [data-station] */ })
it('ratings come from his recent answers', () => { /* recent['sc:ghosts']='oxo' → data-rating 2 */ })
it('the wizard stands at the newest open station', () => { /* … */ })
it('coming back to the page re-reads the Book 2 save', () => { /* change localStorage, dispatch visibilitychange → new state shown (Review Focus 2) */ })
it('captions say what is learned, never the minigame’s name', () => { /* no caption contains מעוף/רוחות/קדרה/סולם/דלתות/דו־קרב */ })
it('a station links to its session; the card to the cover', () => { /* hrefs */ })
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npx vitest run src/components/home` — PASS.
- [ ] **Step 5: Commit** `git commit -m "Home: the duel card and the path of its minigames, right to left"`

### Task 5: The clock card, the shelf, and the new home page

**Files:**
- Create: `src/components/home/ClockCard.tsx`, `src/components/home/LevelShelf.tsx`
- Modify: `src/pages/Home/HomePage.tsx` (header and settings button stay; then `DuelCard`, `StationPath`, `Separator`,
  `ClockCard`, `Separator`, `LevelShelf`; the stats link stays at the bottom; remove `DuelEntryCard`, `ClockEntryCard`,
  `Duel2EntryCard` and the big level cards), `src/components/home/home.css`
- Test: `src/components/home/home.test.tsx`, `src/pages/Home/HomePage.test.tsx` (new)

**Interfaces:**
- Consumes: the clock game's images (`src/clock/assets/img/workshop.webp`, `case-cuckoo.webp`, `cuckoo-idle.webp`,
  `bear-happy.webp`), `PlayButton theme="clock"`, `LevelIcon`, `useProgressStore.isLevelUnlocked`.
- Produces:
  - `ClockCard()` — the mock's `.clk`: same grid as the duel card, border `2px solid #e0b26a`, radius 22 px, background
    `linear-gradient(90deg, #3a200ccc, #5a3417aa 55%, #3a200cdd)` over the workshop picture (cover), glow
    `0 0 22px #e0b26a80`; the art box `124px × --k` high: the cuckoo case with an SVG clock face at
    `left 29.7%, top 32.9%, width 40.6%` showing 10:10, the cuckoo (26 % high, at `left 60%, top -2%`, mirrored, tilted
    −8°), the bear (72 % high) beside it; three small faces 3:00 / 3:30 / 3:15 (56 px × 1 / .85 / .75, lifted −14/12/−4 px;
    red short hand `#c0392b`, blue long hand `#1f5fa8`, numbers 12/3/6/9); the brass play button; links to
    `${BASE_URL}clock/`; then its "מה לומדים" line.
  - `LevelShelf()` — heading "פעילויות נוספות" (12 px, `#7a6a4a`), one non-wrapping row on `#e8dcc2`, radius 14 px; six
    44 px (max `11vw`) round icons with 10 px labels (for the parent); locked: opacity .45, greyscale, `LockBadge`; a tap
    on an open one navigates to its route (`/letters`, `/nikkud`, `/syllables`, `/words`, `/sentences`, `/stories`), as
    `handleLevelClick` does today (stories always open).

- [ ] **Step 1: Write the failing tests**

```ts
it('the home page: duel card, path, separator, clock card, separator, shelf — and none of the old cards', () => { /* order of data-home-part */ })
it('the shelf opens an unlocked level and ignores a locked one', () => { /* navigate spy */ })
it('the path never scrolls vertically', () => { /* computed style overflow-y hidden on [data-path] (Review Focus 5, jsdom part) */ })
```

- [ ] **Step 2: Run** — FAIL. **Step 3: Implement.** **Step 4: Run** `npm test` — PASS (update or remove tests of the
  removed entry cards; keep the components' files only if another page still uses them).
- [ ] **Step 5: Commit** `git commit -m "Home: the clock card, the shelf of older activities, and the new home layout"`

### Task 6: The final check

- [ ] **Step 1:** `npm test` and `npx tsc --noEmit -p .` — Expected: all pass, no errors.
- [ ] **Step 2:** QA with a production build (`vite build`, `vite preview`) in the headless browser at 360×780, 780×360
  and 1280×800: the home screen for a brand-new player, a Book 2 player at stage 2, a girl; the path's
  `scrollHeight === clientHeight`; tap the card (cover), each open station (a session that ends and returns home by
  itself), a locked station (nothing), the clock card, each shelf icon. Screenshots per step (memory: QA before handoff).
- [ ] **Step 3: Commit** any QA fixes: `git commit -m "Home and path sessions: QA fixes"`

## Handoff

- The girl version of the card picture is owed (the card budget left is about $0.90): generate it from take 3 with the
  girl wizard as reference, convert to WebP, add `card-girl.webp`, and switch `DuelCard` on `useGender()`.
- Rebuild the host-local playtest from the branch (not main, not GitHub).
