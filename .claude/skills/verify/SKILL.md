---
name: verify
description: Verify alef app changes end-to-end by driving the production build headless in system Edge with a stubbed speechSynthesis recorder
---

# Verifying alef changes

Build + serve the production bundle, then drive it with playwright-core through system Edge (no browser download needed).

## Recipe

```bash
npm i --no-save playwright-core     # if not present; do NOT commit package.json changes
npm run build
npx vite preview --port 4173 &      # serves dist at http://localhost:4173/alef/
node <drive-script>.mjs <shots-dir>
```

Drive script essentials (see git history / past sessions for a full example):

- `chromium.launch({ channel: 'msedge', headless: true })` — uses installed Edge.
- The app uses HashRouter under base `/alef/` — URLs look like `http://localhost:4173/alef/#/stories/<id>`.
- **Speech is observable via a stub**: before navigation, `page.addInitScript` replacing `window.speechSynthesis` with a recorder (`window.__spoken` array, `speak(u)` pushes `u.text` and fires `u.onend` async) plus a fake voice `{ lang: 'he-IL', localService: true }` and a `SpeechSynthesisUtterance` stub class. Then assert on `page.evaluate(() => window.__spoken)` — first tap on a word speaks the word, second tap speaks the decode sentence (contains " - ").
- Omit the fake voice to exercise the no-Hebrew-voice banner path.
- Answer cards: click near the card's left-edge padding (outside word spans) to SELECT; clicking a word span inside the card must speak, not select.

## Gotchas

- `window.speechSynthesis` is a readonly accessor — plain assignment in the init script silently no-ops and the app hits the native API (native `speak` then throws on the stub utterance class). Install the recorder with `Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: {...} })`.
- Unit tests (jsdom) cannot catch RTL/bidi layout bugs — ALWAYS eyeball screenshots of Hebrew screens; a past bug rendered every word in reverse order while all tests passed (`unicode-bidi: plaintext` + inline-block words → LTR fallback).
- Hebrew string literals: compare via codepoints, never by retyping (invisible combining marks). decodeWord output is NFC-normalized.
- Success feedback window is 1200ms, error window 1000ms — sleep ≥1300ms after a correct answer before the next interaction.
- Completion badge on the picker requires the story node to reach 'mastered' (finish all questions).
