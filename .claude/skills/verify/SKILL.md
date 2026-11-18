---
name: verify
description: Verify alef changes end-to-end in a real browser with touch on. Builds the verify build (test hooks on), drives the home, Book 2, the clock and the parent gate and area at a phone and a tablet size, and saves screenshots. Use after a change to a child-facing screen, before a playtest build or a release.
---

# Verifying alef changes

The driver `drive.mjs` (next to this file) drives the verify build in a browser and prints one `PASS` or `FAIL` line per
check and size. It saves a screenshot of each step. Look at the screenshots: the checks do not see layout.

## Run

```bash
npx vite build --mode verify --outDir dist-verify   # .env.verify turns on the test hooks; never deploy this build
node .claude/skills/verify/drive.mjs [shots-dir]     # exit 0: all passed
```

- **Browser.** Set `ALEF_CDP_URL` to drive a browser that runs already (a CDP websocket or `http` URL). Without it, the
  driver launches playwright's own Chromium: run `npx playwright install chromium` once (`npm ci` downloads no browser).
- **App.** Without `ALEF_VERIFY_URL`, the driver starts `vite preview` of `dist-verify/` and stops it at the end. When
  the browser runs on another machine or in a container, start the preview yourself where that browser can reach it,
  and set `ALEF_VERIFY_URL` to the app's base as the browser sees it (it ends in `/alef/`). Stop that preview by its
  PID when you are done.
- **Fewer checks.** `ALEF_VERIFY_ONLY=book2,clock` runs only those checks (names: `home`, `book2`, `book2Station`,
  `book2Sheets`, `book2Area`, `clock`, `clockArea`, `telemetry`). `telemetry` reads the events the play checks
  left in the same size's storage, so run it with `book2` (and `clock`). `ALEF_VERIFY_SIZES=upright390` runs only
  those sizes (names: `phone`, `tablet`, `upright390`, `upright412`).
- Never write a host, an address or a port into this repo (it is public). Pass them in the environment.

## What it checks

Each size (phone 844×390, tablet 1180×820, both landscape; and a phone held upright, 390×844 and 412×915, for the
parent area's checks only: `home`, `book2Area`, `clockArea`) gets a fresh browser context: own storage, so a fresh save
and no boy or girl yet. Each check gets its own page.

| Check | Does |
| --- | --- |
| `home` | the duel and clock cards, an open station on the path; the gear's gate; every section of the lessons' area |
| `book2` | cover → play → boy or girl → a tower round: taps the right rune (`data-correct`), waits for the hit (up to three rounds: a slow browser can change the pad before the tap); `window.__d2audio` is not empty |
| `book2Station` | the path's first open station link (`?station=`) → its cover → a session of that screen |
| `book2Sheets` | the test-build pages `#/glyphs`, `#/tower-glyphs`, `#/summary` (screenshots to look at) |
| `book2Area`, `clockArea` | the game's gate on its cover, then every section of the area (each nav button brings its section to the top); Book 2's also opens the gallery and the stroke review from its Developer section. Upright, Book 2's gate is passed sideways (its "turn the phone" picture covers the cover), then the phone turns |
| `clock` | cover (a tap on the held house stays) → workshop → a round: the right card (`data-correct`) or the hidden `data-test-solve` for a set-the-clock round → a short hold on the house stays, a 2 s hold leaves to alef's home |
| `telemetry` | last, after the play checks: Book 2's area, the Data section counts Book 2's events (more than none) and the clock's, shows the storage line (telemetry against its budget), and a Download gives an export with Book 2's events |

**Nothing scrolls sideways.** At the year pad and at every section of the area (and Book 2's gallery and stroke
review), the page and the area's own scroll box must be no wider than the screen (`scrollWidth <= clientWidth + 1`); a
failure names the elements that pass the edge. A wide box that scrolls on purpose (a table's `.pa-wide`) is allowed.

**The gate** (2 s hold, then the year of birth) is checked each time: a short hold opens nothing, a child's year closes
the pad, an adult's year (any year 18 to 100 years back) opens the area.

The driver also lists visible Latin or Hebrew text on the play screens (a note, not a failure: compare it with the rule
*speech instead of text*). Text in `[data-parent-text]` and numbers in `[data-num]` are skipped. Any page error fails
the check.

## Rules for any browser check (also when you write your own)

- **Close what you open.** Open your own context (`browser.newContext()`), and close it in a `finally`, also when a
  check fails or throws. A tab left on a shared browser keeps animating and eats its CPU. Never close a browser that you
  did not launch; only disconnect from it. After a run, list the browser's pages and make sure none of yours is left.
- **Real touch.** Tap and hold with CDP touch events (`Input.dispatchTouchEvent`, or playwright's `touchscreen.tap` in
  a `hasTouch` context), not mouse or synthetic pointer events (`docs/minigame-rules.md`, *Verification*).
- Look at every screenshot before you show it: missing-font squares, characters shown two times, sprites that move
  backwards, shapes cut at the edges.
- On a shared browser, another client's tab can come to the front and hide yours: the game pauses (its pause cover)
  and a hidden tab draws no frames, so a screenshot waits forever. With `ALEF_CDP_URL` the driver pins the page
  visible (so the pause on hiding is not checked there) and brings its page to the front before each touch and
  screenshot. A screenshot that times out is printed, not a failure.
- A shared browser can be slow. Measure a hold with the page's own clock (`performance.now()` at pointer down and up),
  not with the driver's wall clock.

## The stories: the `speechSynthesis` recorder

The lessons and the stories speak with the browser's `speechSynthesis` (`SpeechProvider`). The driver's init script
replaces it with a recorder on every page: `window.__spoken` holds each spoken text, `speak(u)` calls `u.onend` soon
after, and one fake voice `{ lang: 'he-IL', localService: true }` is offered. For a story check
(`#/stories/<id>`), assert on `page.evaluate(() => window.__spoken)`: the first tap on a word speaks the word, the second
tap speaks the decode sentence (it contains `" - "`). Leave out the fake voice to see the no-Hebrew-voice banner.
Answer cards: tap near the card's edge padding (outside the word spans) to select it; a tap on a word span speaks and
does not select.

## Gotchas

- `window.speechSynthesis` is a readonly accessor: a plain assignment does nothing and the app uses the real API. Use
  `Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {...} })`.
- Unit tests (jsdom) do not catch RTL/bidi layout bugs. Always look at screenshots of Hebrew screens: a past bug showed
  every word in reverse order while all tests passed (`unicode-bidi: plaintext` + inline-block words → LTR fallback).
- Hebrew string literals: compare by codepoint, never by typing them again (invisible combining marks). `decodeWord`
  output is NFC-normalized.
- Feedback windows: success 1200 ms, error 1000 ms. Wait at least 1300 ms after a right answer before the next tap.
- The story picker's completion badge shows only when the story's node is `mastered` (all questions finished).
- Book 2 is a landscape game: a portrait phone shows the "turn the phone" picture over everything.
- A fresh save opens only the tower (Book 2 opens after the first duel's marks): the full run starts there, and the
  path's only open station is the tower.
- The gender question takes taps only after its voice has played once; the driver keeps tapping until it closes.
