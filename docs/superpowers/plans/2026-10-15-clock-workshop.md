# Clockmaker's Workshop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the analogue-clock reading game "Clockmaker's Workshop" as a second app in the alef repo, with its generated voice, art and review pipeline.

**Architecture:** A second Vite entry (`clock/index.html` → `src/clock/`) deployed with alef at `/alef/clock/`. Pure, unit-tested logic modules (time, phrases, tricks, grading, levels, workday, round choice) feed a React UI (SVG clock face, hand setter, read-along captions, exercise screens, a workday controller hook). Code the duel already has (the difficulty predictor, telemetry, audio playback core) moves to `src/shared/`. Assets are generated host-locally in `/data/ws/scratch/clock/` and synced into `src/clock/assets/`.

**Tech Stack:** TypeScript 5.9, React 19, Vite 7, Zustand 5 (persist), Framer Motion 12, Howler 2.2, Vitest 4 + Testing Library (jsdom). Host pipeline: Python 3.8 stdlib, ElevenLabs API, Gemini API.

**Spec:** `docs/superpowers/specs/2026-10-15-clock-workshop-design.md` (read it before any task). Rules: `docs/minigame-rules.md`.

## Global Constraints

- Node is not on the non-interactive PATH: start every shell with `export PATH=/data/node/current/bin:$PATH` and `cd /data/ws/alef`.
- Tests: `npx vitest run <path>`; full suite `npm test`. Type check: `npx tsc --noEmit -p .`. Build: `npm run build`. (`npm run lint` has no eslint installed; do not use it.)
- No written text on child screens except read-along captions (`[data-caption]`), digital time cards (`[data-digital]`, digits only) and the digits on clock faces and counters. Parent area may use text.
- No emoji anywhere. All icons are inline SVG.
- The repo is public: never commit host names, Caddy routes, ports of host services, passwords or API keys. Host-local files live in `/data/ws/scratch/clock/`, `~/.config/systemd/user/` and `~/ws/caddy/Caddyfile`.
- Alef code must not import from `src/clock/` (the only link is the Home card's URL).
- Clock logic files that the export script loads with plain Node (`time.ts`, `phrases.ts`, `workday.ts`, `src/clock/data/lines.ts`) import each other with explicit `.ts` extensions and use only erasable TypeScript syntax (no enums, no namespaces, no parameter properties).
- Angles are degrees clockwise from 12 o'clock. Hand colors: hour `#c0392b`, minute `#1f5fa8`, seconds `#e67e22`.
- Voice ids: phrases `ph-<lang>-<h>-<mm>` (e.g. `ph-he-3-45`); narrator lines `<lineId>-<lang>` (e.g. `exp-hands-en`); customer lines `cust-<customer>-hello|thanks`.
- Commit after each task with a message ending in `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. git here is 2.25: write multi-line messages to a file and use `git commit -F <file>`. Stay on branch `feature/clock`. Do not push or merge.
- Budget: Gemini images ≤ $10 total (log every paid call in `/data/ws/scratch/clock/ledger.md`); ElevenLabs within plan credits; stop and report if a 401/402/quota error appears.

## Review Focus

1. **Wrap-around at 12** (12:45 → "quarter to one", hand angles crossing 0°, linked hands dragged past 12): expect correct phrases and an hour hand that creeps across 12 without jumping a full turn. Tests in Task 3 (`phrase 12:45`, `addMinutes wrap`) and Task 9 (`linked drag across 12`).
2. **Duplicate or impossible wrong answers** (a trick that yields the right answer, two identical options, "half past" with no mirror): expect exactly 3 distinct options with one correct, every round. Test in Task 4 (`all 144 times × 3 kinds × every family pair give 3 distinct options`).
3. **Missing assets** (no voice file, no timings, no image yet — the normal state while generation is progressive): expect the game to keep flowing silently with fallback SVG art, never stall. Tests in Task 11 (`playVoice resolves for unknown id`) and Task 14 (`workday completes with no audio files`).
4. **Tablet lock mid-round**: expect audio to stop, an opaque cover, and the round to restart on resume without double answers. Test in Task 14 (`visibility hidden pauses and resume restarts the round`).
5. **Only one language enabled / settings changed mid-day**: expect every round in that language and no crash when the list changes. Tests in Task 6 (`langForRound with one language`) and Task 16 (`cannot untick the last language`).

---

## File map

| File | Responsibility |
|---|---|
| `clock/index.html` | Second HTML entry |
| `vite.config.ts` | Adds the second rollup input |
| `src/components/clock/ClockEntryCard.tsx` | alef Home card that links to `clock/` |
| `src/shared/adaptive.ts` | Predicted mistake rate + pick-near-target (moved from duel) |
| `src/shared/telemetry.ts` | `createTelemetry(key)` (moved from duel) |
| `src/shared/audioCore.ts` | Howl cache, `playOnce`, `VOICE_RATE`, unlock (moved from duel) |
| `src/clock/logic/time.ts` | Time model, angles, levels' minutes |
| `src/clock/logic/phrases.ts` | Hebrew/English phrase per time |
| `src/clock/logic/tricks.ts` | Trick families, option generation |
| `src/clock/logic/grade.ts` | Set-the-clock grading, error classes, evaluation |
| `src/clock/logic/types.ts` | `Exercise`, `Scaffolds`, `RoundPlan` |
| `src/clock/logic/levels.ts` | Level progress, fast-forward, explanation triggers |
| `src/clock/logic/workday.ts` | Clock kinds, customers, languages, bonus, real time |
| `src/clock/logic/rounds.ts` | Candidates, prediction, round choice |
| `src/clock/data/lines.ts` | Narrator + customer line texts, cue parsing |
| `src/clock/store.ts` | Zustand persisted save + actions |
| `src/clock/telemetry.ts` | Clock telemetry instance |
| `src/clock/audio/clockAudio.ts` | Voice with word callbacks, sfx, music |
| `src/clock/assets/audioFiles.ts`, `images.ts`, `voiceWords.json` | Asset manifests (globs) |
| `src/clock/components/*` | ClockFace, HandSetter, Caption, DigitalCard, exercises, workshop pieces |
| `src/clock/useWorkday.ts` | The round/workday controller |
| `src/clock/screens/*` | Cover, Workshop, Bonus, Summary, Parent |
| `src/clock/ClockApp.tsx`, `main.tsx`, `clock.css` | App shell |
| `scripts/clock/export-audio-catalog.ts` | Writes the audio catalogue JSON for the pipeline |
| `/data/ws/scratch/clock/**` (host-local) | Generation, checks, review, sync, art, verify |

---

### Task 1: Second app entry and alef Home card

**Files:**
- Create: `clock/index.html`, `src/clock/main.tsx`, `src/clock/ClockApp.tsx`, `src/clock/clock.css`, `src/clock/ClockApp.test.tsx`, `src/components/clock/ClockEntryCard.tsx`
- Modify: `vite.config.ts`, `src/pages/Home/HomePage.tsx` (render the card next to `DuelEntryCard`)

**Interfaces:**
- Produces: `ClockApp` default export (screens are filled in by Task 15); `ClockEntryCard` component.

- [ ] **Step 1: Write the failing test** `src/clock/ClockApp.test.tsx`

```tsx
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import ClockApp from './ClockApp'

describe('ClockApp', () => {
  it('shows the cover with a play button', () => {
    render(<ClockApp />)
    expect(screen.getByRole('button', { name: 'play' })).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it and see it fail**

Run: `npx vitest run src/clock/ClockApp.test.tsx` → FAIL (cannot resolve `./ClockApp`).

- [ ] **Step 3: Create the entry files**

`clock/index.html`:
```html
<!DOCTYPE html>
<html lang="he">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/alef/favicon.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover" />
    <meta name="theme-color" content="#6b3e1f" />
    <title>שָׁעוֹן · Clock</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/clock/main.tsx"></script>
  </body>
</html>
```

`src/clock/main.tsx`:
```tsx
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ClockApp from './ClockApp'
import '../styles/fonts.css'
import './clock.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ClockApp />
  </StrictMode>,
)
```

`src/clock/ClockApp.tsx` (temporary shell; Task 15 replaces the body):
```tsx
// Clockmaker's Workshop: a separate app in the alef repo (spec: docs/superpowers/specs/2026-10-15-clock-workshop-design.md).
export default function ClockApp() {
  return (
    <div className="ck-root">
      <button className="ck-play" aria-label="play">
        <svg viewBox="0 0 100 100" width="96" height="96" aria-hidden>
          <circle cx="50" cy="50" r="46" fill="#3c8d2f" />
          <path d="M40 30 L72 50 L40 70 Z" fill="#fff" />
        </svg>
      </button>
    </div>
  )
}
```

`src/clock/clock.css`:
```css
html, body, #root { margin: 0; height: 100%; }
.ck-root {
  position: fixed; inset: 0; overflow: hidden;
  background: radial-gradient(ellipse at 50% 30%, #f6d9a8, #b9814a 70%, #6b3e1f);
  font-family: system-ui, sans-serif; user-select: none; -webkit-user-select: none;
  touch-action: manipulation;
  display: flex; align-items: center; justify-content: center;
}
.ck-play { background: none; border: 0; cursor: pointer; padding: 0; }
```

- [ ] **Step 4: Add the Vite input** — in `vite.config.ts` add the import and `rollupOptions`:

```ts
import { fileURLToPath } from 'node:url'
// …
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: fileURLToPath(new URL('./index.html', import.meta.url)),
        clock: fileURLToPath(new URL('./clock/index.html', import.meta.url)),
      },
    },
  },
```

- [ ] **Step 5: Add the alef Home card** `src/components/clock/ClockEntryCard.tsx`

```tsx
// Entry to the Clockmaker's Workshop, a separate app at <base>/clock/. No text: a clock face says "clocks".
import { motion } from 'framer-motion'
import { borderRadius, spacing } from '../../styles/theme'

export function ClockEntryCard() {
  return (
    <motion.a
      aria-label="clock"
      href={`${import.meta.env.BASE_URL}clock/`}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.96 }}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: '100%', maxWidth: 520, margin: `0 auto ${spacing[4]}`, padding: spacing[3],
        border: '2px solid #e0b26a', borderRadius: borderRadius.xl,
        background: 'linear-gradient(135deg, #8a5a2b, #5a3417)', boxShadow: '0 0 18px rgba(224, 178, 106, 0.5)',
      }}
    >
      <svg viewBox="-50 -50 100 100" width="88" height="88" aria-hidden>
        <circle r="46" fill="#fff8e7" stroke="#c99a4b" strokeWidth="6" />
        <line x1="0" y1="0" x2="0" y2="-24" stroke="#c0392b" strokeWidth="7" strokeLinecap="round" transform="rotate(90)" />
        <line x1="0" y1="0" x2="0" y2="-36" stroke="#1f5fa8" strokeWidth="4" strokeLinecap="round" />
        <circle r="4" fill="#333" />
      </svg>
    </motion.a>
  )
}
```

In `src/pages/Home/HomePage.tsx`, import it and render `<ClockEntryCard />` directly after the existing `<DuelEntryCard … />` element.

- [ ] **Step 6: Run test, type check and build**

Run: `npx vitest run src/clock/ClockApp.test.tsx` → PASS. Run `npx tsc --noEmit -p .` → no errors. Run `npm run build` → `dist/clock/index.html` exists (`ls dist/clock/index.html`).

- [ ] **Step 7: Commit** — `git add -A clock src/clock src/components/clock vite.config.ts src/pages/Home/HomePage.tsx` and commit "Clock app: second Vite entry and the alef Home card".

---

### Task 2: Move the predictor, telemetry and audio core to `src/shared/`

**Files:**
- Create: `src/shared/adaptive.ts`, `src/shared/adaptive.test.ts`, `src/shared/telemetry.ts`, `src/shared/audioCore.ts`
- Modify: `src/utils/duel/rounds.ts`, `src/utils/duel/telemetry.ts`, `src/utils/duel/duelAudio.ts`

**Interfaces:**
- Produces:
  - `type Rng = () => number`; `interface Tally { seen?: number; wrong?: number; timeout?: number }`
  - `TARGET_MISTAKE_RATE = 0.2`, `RECENT_DECAY`, `HISTORY_WEIGHT`, `RECENT_KEEP`
  - `predictedMistakeRate(t: Tally | undefined, recent?: string, prior?: number): number` (prior default 0.25 = the duel's current behaviour)
  - `pickNearTarget(rng: Rng, predicted: number[], target?: number): number` (returns an index)
  - `pushRecent(recent: string | undefined, miss: boolean): string`
  - `createTelemetry(key: string, maxChars?: number): { track, flush, count, exportJson, clear, setRun }`
  - `VOICE_RATE = 1.15`, `getHowl(src, loop?, html5?)`, `playOnce(h, rate, timeout)`, `unlockAudio()`

- [ ] **Step 1: Write the failing test** `src/shared/adaptive.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { pickNearTarget, predictedMistakeRate, pushRecent, RECENT_KEEP } from './adaptive'

describe('predictedMistakeRate', () => {
  it('returns the prior with no data', () => {
    expect(predictedMistakeRate(undefined, '', 0.1)).toBeCloseTo(0.1)
    expect(predictedMistakeRate(undefined)).toBeCloseTo(0.25)
  })
  it('falls with correct answers and rises with misses', () => {
    expect(predictedMistakeRate({ seen: 10, wrong: 0 }, 'oooo', 0.2)).toBeLessThan(0.1)
    expect(predictedMistakeRate({ seen: 4, wrong: 3 }, 'xxo', 0.2)).toBeGreaterThan(0.4)
  })
})

describe('pickNearTarget', () => {
  it('prefers the candidate nearest 0.2', () => {
    let hits = 0
    for (let i = 0; i < 400; i++) if (pickNearTarget(Math.random, [0.01, 0.2, 0.9]) === 1) hits++
    expect(hits).toBeGreaterThan(300)
  })
  it('takes the hardest when none reaches the target', () => {
    let hits = 0
    for (let i = 0; i < 400; i++) if (pickNearTarget(Math.random, [0.01, 0.02, 0.08]) === 2) hits++
    expect(hits).toBeGreaterThan(250)
  })
})

describe('pushRecent', () => {
  it('keeps the newest answers', () => {
    expect(pushRecent('o'.repeat(RECENT_KEEP), true)).toBe('o'.repeat(RECENT_KEEP - 1) + 'x')
    expect(pushRecent(undefined, false)).toBe('o')
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/shared/adaptive.test.ts` → FAIL (module missing).

- [ ] **Step 3: Create `src/shared/adaptive.ts`** (code moved from `src/utils/duel/rounds.ts`, generalised with a prior):

```ts
// Desirable difficulty, shared by the minigames: predict the chance of a mistake from recent answers (decaying)
// blended with the lifetime rate, then choose the candidate nearest one mistake in five.
export type Rng = () => number
export interface Tally { seen?: number; wrong?: number; timeout?: number }

/** Desirable difficulty: aim each round at about one mistake in five. */
export const TARGET_MISTAKE_RATE = 0.2
/** How fast older answers fade: the newest counts 1, the one before 0.75, then 0.56… */
export const RECENT_DECAY = 0.75
/** The lifetime rate counts like this many recent answers: recent results lead, history is remembered. */
export const HISTORY_WEIGHT = 3
/** Answers kept per item (x = wrong or too slow, o = right), newest last. */
export const RECENT_KEEP = 12

/** Predicted chance of a miss. `prior` is the rate assumed before any answer (worth 2 answers). */
export function predictedMistakeRate(t: Tally | undefined, recent = '', prior = 0.25) {
  const history = ((t?.wrong ?? 0) + (t?.timeout ?? 0) + 2 * prior) / ((t?.seen ?? 0) + 2)
  let weight = 0
  let missed = 0
  let w = 1
  for (let i = recent.length - 1; i >= 0; i--) {
    weight += w
    if (recent[i] === 'x') missed += w
    w *= RECENT_DECAY
  }
  return (missed + HISTORY_WEIGHT * history) / (weight + HISTORY_WEIGHT)
}

/**
 * Index of the candidate to use: the one whose predicted rate is closest to the target; when none is that hard,
 * the hardest. Weight = 0.03 (variety) + a bell around the aim whose width scales with it.
 */
export function pickNearTarget(rng: Rng, predicted: number[], target = TARGET_MISTAKE_RATE): number {
  const aim = Math.min(target, Math.max(...predicted))
  const width = Math.max(0.03, aim * 0.35)
  const w = predicted.map((x) => 0.03 + Math.exp(-(((x - aim) / width) ** 2)))
  let r = rng() * w.reduce((s, x) => s + x, 0)
  for (let i = 0; i < w.length; i++) {
    r -= w[i]
    if (r <= 0) return i
  }
  return w.length - 1
}

export const pushRecent = (recent: string | undefined, miss: boolean) => ((recent ?? '') + (miss ? 'x' : 'o')).slice(-RECENT_KEEP)
```

- [ ] **Step 4: Point the duel at it.** In `src/utils/duel/rounds.ts`: delete the local `TARGET_MISTAKE_RATE`, `RECENT_DECAY`, `HISTORY_WEIGHT`, `RECENT_KEEP` and `predictedMistakeRate` definitions, add

```ts
import { pickNearTarget, predictedMistakeRate } from '../../shared/adaptive'
export { TARGET_MISTAKE_RATE, RECENT_DECAY, HISTORY_WEIGHT, RECENT_KEEP, predictedMistakeRate } from '../../shared/adaptive'
```

and replace the body of `pickTarget` with:

```ts
  const p = DUEL_MARKS.map((m) => predictedMistakeRate(lifetime[m.id], recent[m.id]))
  return DUEL_MARKS[pickNearTarget(rng, p)]
```

Keep `LifetimeTally` as is. Run `grep -rn "RECENT_KEEP\|predictedMistakeRate\|TARGET_MISTAKE_RATE" src --include=*.ts --include=*.tsx` and make sure every importer still resolves.

- [ ] **Step 5: Create `src/shared/telemetry.ts`** by moving the body of `src/utils/duel/telemetry.ts` into a factory (same logic, the module-level state becomes closure state):

```ts
// Telemetry: an event log in localStorage (it survives closing the tab) so a parent can export it and analyse play
// offline. Capped so it can never crowd out the progress save, and it never throws.
export interface TelemetryEvent { t: number; s: string; run: number; e: string; [field: string]: unknown }

export function createTelemetry(key: string, maxChars = 1_000_000) {
  const FLUSH_MS = 1000
  const session = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
  let run = 0
  let events: TelemetryEvent[] | null = null
  let timer: number | undefined

  const load = (): TelemetryEvent[] => {
    try {
      const doc = JSON.parse(localStorage.getItem(key) ?? 'null')
      return Array.isArray(doc?.events) ? doc.events : []
    } catch {
      return []
    }
  }
  const all = () => (events ??= load())

  function flush() {
    window.clearTimeout(timer)
    timer = undefined
    const evs = all()
    let json = JSON.stringify({ v: 1, events: evs })
    while (json.length > maxChars && evs.length > 1) {
      evs.splice(0, Math.max(1, Math.ceil(evs.length * ((json.length - maxChars) / json.length + 0.02))))
      json = JSON.stringify({ v: 1, events: evs })
    }
    for (let attempt = 0; attempt < 4; attempt++) {
      try {
        localStorage.setItem(key, json)
        return
      } catch {
        if (evs.length <= 1) return
        evs.splice(0, Math.ceil(evs.length / 2))
        json = JSON.stringify({ v: 1, events: evs })
      }
    }
  }

  function track(e: string, data: Record<string, unknown> = {}) {
    all().push({ t: Date.now(), s: session, run, e, ...data })
    if (timer === undefined) timer = window.setTimeout(flush, FLUSH_MS)
  }

  if (typeof window !== 'undefined') {
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
  }

  return {
    track,
    flush,
    setRun: (n: number) => { run = n },
    count: () => all().length,
    exportJson: () => {
      flush()
      return JSON.stringify({ v: 1, exportedAt: new Date().toISOString(), events: all() }, null, 1)
    },
    clear: () => {
      events = []
      window.clearTimeout(timer)
      timer = undefined
      try { localStorage.removeItem(key) } catch { /* nothing to clear */ }
    },
  }
}
```

Rewrite `src/utils/duel/telemetry.ts` as a thin wrapper that keeps every existing export name:

```ts
// Duel telemetry (see src/shared/telemetry.ts).
import { createTelemetry } from '../../shared/telemetry'
export type { TelemetryEvent } from '../../shared/telemetry'

/** ≈2 MB of the origin's ~5 MB localStorage (UTF-16); the progress save needs far less. */
export const TELEMETRY_MAX_CHARS = 1_000_000
const t = createTelemetry('alef-duel-telemetry', TELEMETRY_MAX_CHARS)
export const track = t.track
export const flushTelemetry = t.flush
export const setTelemetryRun = t.setRun
export const telemetryCount = t.count
export const exportTelemetry = t.exportJson
export const clearTelemetry = t.clear
```

- [ ] **Step 6: Create `src/shared/audioCore.ts`** and use it from `duelAudio.ts`:

```ts
// Audio core shared by the minigames: one Howl per file, play-once with a safety timeout, speech rate.
import { Howl, Howler } from 'howler'

/** Playtest (duel): the recorded speech felt slow and made the whole game feel slow. */
export const VOICE_RATE = 1.15
const howls = new Map<string, Howl>()

export function getHowl(src: string, loop = false, html5 = false): Howl {
  let h = howls.get(src)
  if (!h) {
    h = new Howl({ src: [src], loop, preload: true, html5 })
    howls.set(src, h)
  }
  return h
}
export const peekHowl = (src: string) => howls.get(src)

/** Play once; resolve on end, stop or error, or after `timeout`. */
export function playOnce(h: Howl, rate: number, timeout: number): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (done) return
      done = true
      resolve()
    }
    const id = h.play()
    h.rate(rate, id)
    h.once('end', finish, id)
    h.once('stop', finish, id)
    h.once('playerror', finish, id)
    h.once('loaderror', finish)
    window.setTimeout(finish, timeout)
  })
}

/** Call inside a user tap: resumes the AudioContext (autoplay policies). */
export function unlockAudio() {
  const ctx = (Howler as unknown as { ctx?: AudioContext }).ctx
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}
```

In `src/utils/duel/duelAudio.ts`: delete its local `howls` map, `howl()`, `playOnce()` and `VOICE_RATE`; import `{ VOICE_RATE, getHowl, peekHowl, playOnce, unlockAudio }` from `../../shared/audioCore`; replace calls `howl(` with `getHowl(`, `howls.get(u)` with `peekHowl(u)`; keep `export { VOICE_RATE }` re-exported (`export { VOICE_RATE } from '../../shared/audioCore'`) and make `unlockDuelAudio` call `unlockAudio()`.

- [ ] **Step 7: Run everything**

Run: `npm test` → all suites PASS (duel tests unchanged). Run `npx tsc --noEmit -p .` → clean.

- [ ] **Step 8: Commit** "Shared predictor, telemetry and audio core (moved from the duel)".

---

### Task 3: Time model and phrases

**Files:**
- Create: `src/clock/logic/time.ts`, `src/clock/logic/time.test.ts`, `src/clock/logic/phrases.ts`, `src/clock/logic/phrases.test.ts`

**Interfaces:**
- Produces (`time.ts`): `ClockTime {h,m}`, `HandPose {hour, minute, second?}`, `MINUTES`, `HOURS`, `timeId`, `parseTimeId`, `sameTime`, `nextHour`, `prevHour`, `addMinutes`, `norm`, `angleDiff`, `angleDelta`, `hourAngle`, `minuteAngle`, `poseOf`, `readPose`, `digital`, `LEVEL_MINUTES`, `MAX_LEVEL`, `minutesUpTo`.
- Produces (`phrases.ts`): `Lang`, `LANGS`, `Phrase {id, lang, text, words, audioId}`, `phraseText`, `phrase`, `phraseMinuteNumber`, `stripNikkud`.

- [ ] **Step 1: Write the failing tests**

`src/clock/logic/time.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { addMinutes, angleDelta, angleDiff, digital, hourAngle, minutesUpTo, minuteAngle, parseTimeId, readPose, timeId } from './time'

describe('time', () => {
  it('ids round-trip', () => {
    expect(timeId({ h: 3, m: 5 })).toBe('3-05')
    expect(parseTimeId('12-45')).toEqual({ h: 12, m: 45 })
  })
  it('addMinutes wraps round 12', () => {
    expect(addMinutes({ h: 12, m: 55 }, 5)).toEqual({ h: 1, m: 0 })
    expect(addMinutes({ h: 1, m: 0 }, -5)).toEqual({ h: 12, m: 55 })
    expect(addMinutes({ h: 11, m: 30 }, 45)).toEqual({ h: 12, m: 15 })
  })
  it('hand angles', () => {
    expect(hourAngle({ h: 3, m: 0 })).toBe(90)
    expect(hourAngle({ h: 3, m: 30 })).toBe(105)
    expect(hourAngle({ h: 12, m: 45 })).toBe(22.5)
    expect(minuteAngle({ h: 1, m: 45 })).toBe(270)
  })
  it('angle helpers', () => {
    expect(angleDiff(350, 10)).toBe(20)
    expect(angleDelta(350, 10)).toBe(20)
    expect(angleDelta(10, 350)).toBe(-20)
  })
  it('readPose reads the nearest hour below and the nearest five minutes', () => {
    expect(readPose({ hour: 0, minute: 90 })).toEqual({ h: 12, m: 15 })
    expect(readPose({ hour: 112, minute: 270 })).toEqual({ h: 3, m: 45 })
  })
  it('digital', () => expect(digital(3, 5)).toBe('3:05'))
  it('minutesUpTo', () => {
    expect(minutesUpTo(2)).toEqual([0, 30])
    expect(minutesUpTo(0)).toEqual([])
    expect(minutesUpTo(7)).toHaveLength(12)
  })
})
```

`src/clock/logic/phrases.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { HOURS, MINUTES } from './time'
import { phrase, phraseText, stripNikkud } from './phrases'

const all = HOURS.flatMap((h) => MINUTES.map((m) => ({ h, m })))

describe('phrases', () => {
  it('Hebrew examples', () => {
    expect(phraseText({ h: 3, m: 0 }, 'he')).toBe('שָׁלוֹשׁ')
    expect(phraseText({ h: 3, m: 15 }, 'he')).toBe('שָׁלוֹשׁ וָרֶבַע')
    expect(phraseText({ h: 3, m: 25 }, 'he')).toBe('שָׁלוֹשׁ עֶשְׂרִים וְחָמֵשׁ')
    expect(phraseText({ h: 3, m: 45 }, 'he')).toBe('רֶבַע לְאַרְבַּע')
    expect(phraseText({ h: 12, m: 45 }, 'he')).toBe('רֶבַע לְאַחַת')
    expect(phraseText({ h: 1, m: 50 }, 'he')).toBe('עֲשָׂרָה לִשְׁתַּיִם')
  })
  it('English examples', () => {
    expect(phraseText({ h: 3, m: 0 }, 'en')).toBe("three o'clock")
    expect(phraseText({ h: 3, m: 25 }, 'en')).toBe('twenty-five past three')
    expect(phraseText({ h: 12, m: 45 }, 'en')).toBe('quarter to one')
    expect(phraseText({ h: 11, m: 50 }, 'en')).toBe('ten to twelve')
  })
  it('144 distinct phrases per language, English all small letters', () => {
    for (const lang of ['he', 'en'] as const) {
      const texts = new Set(all.map((t) => phraseText(t, lang)))
      expect(texts.size).toBe(144)
    }
    for (const t of all) expect(phraseText(t, 'en')).toBe(phraseText(t, 'en').toLowerCase())
  })
  it('Hebrew uses only Hebrew letters, nikkud, maqaf and spaces', () => {
    for (const t of all) expect(phraseText(t, 'he')).toMatch(/^[֑-ׇא-ת ]+$/)
  })
  it('phrase ids, words and audio ids', () => {
    const p = phrase({ h: 11, m: 35 }, 'he')
    expect(p.id).toBe('he-11-35')
    expect(p.audioId).toBe('ph-he-11-35')
    expect(p.words).toEqual(['עֶשְׂרִים', 'וְחָמֵשׁ', 'לִשְׁתֵּים־עֶשְׂרֵה'])
  })
  it('stripNikkud keeps the maqaf', () => expect(stripNikkud('אַחַת־עֶשְׂרֵה')).toBe('אחת־עשרה'))
})
```

- [ ] **Step 2: Run** `npx vitest run src/clock/logic` → FAIL (modules missing).

- [ ] **Step 3: Write `src/clock/logic/time.ts`**

```ts
// Clock time model: 12-hour times on five-minute steps, and the hand angles that show them.
// Angles are degrees clockwise from 12 o'clock. Loaded by plain Node (export script): erasable TS only.

export interface ClockTime {
  /** 1..12 */
  h: number
  /** 0..55, a multiple of 5 */
  m: number
}

/** Where the hands point. A pose need not be a real time: tricks bend it. */
export interface HandPose {
  hour: number
  minute: number
  /** the seconds hand, when the clock shows one */
  second?: number
}

export const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55]
export const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

export const timeId = (t: ClockTime) => `${t.h}-${String(t.m).padStart(2, '0')}`
export function parseTimeId(id: string): ClockTime {
  const [h, m] = id.split('-').map(Number)
  return { h, m }
}
export const sameTime = (a: ClockTime, b: ClockTime) => a.h === b.h && a.m === b.m
export const nextHour = (h: number) => (h % 12) + 1
export const prevHour = (h: number) => ((h + 10) % 12) + 1

/** Adds minutes (may be negative), wrapping round the 12 hours. */
export function addMinutes(t: ClockTime, d: number): ClockTime {
  const total = ((((t.h % 12) * 60 + t.m + d) % 720) + 720) % 720
  const h = Math.floor(total / 60)
  return { h: h === 0 ? 12 : h, m: total % 60 }
}

export const norm = (a: number) => ((a % 360) + 360) % 360
/** Smallest difference between two angles, 0..180. */
export function angleDiff(a: number, b: number) {
  const d = Math.abs(norm(a) - norm(b))
  return d > 180 ? 360 - d : d
}
/** Signed change from a to b, in (-180, 180]. */
export function angleDelta(a: number, b: number) {
  let d = norm(b) - norm(a)
  if (d > 180) d -= 360
  if (d <= -180) d += 360
  return d
}

export const hourAngle = (t: ClockTime) => norm(((t.h % 12) + t.m / 60) * 30)
export const minuteAngle = (t: ClockTime) => t.m * 6
export const poseOf = (t: ClockTime): HandPose => ({ hour: hourAngle(t), minute: minuteAngle(t) })

/** How a pose reads: the hour number the short hand has passed, the long hand to the nearest five minutes. */
export function readPose(p: HandPose): ClockTime {
  const h = Math.floor(norm(p.hour) / 30)
  return { h: h === 0 ? 12 : h, m: (Math.round(norm(p.minute) / 30) * 5) % 60 }
}

/** "3:05": 12-hour, no AM/PM, minutes always two digits. */
export const digital = (h: number, m: number) => `${h}:${String(m).padStart(2, '0')}`

/** The new times each level teaches (level 7 = all of them, on faces with no numbers). */
export const LEVEL_MINUTES: Record<number, number[]> = {
  1: [0], 2: [30], 3: [15], 4: [45], 5: [5, 10, 20, 25], 6: [35, 40, 50, 55], 7: [...MINUTES],
}
export const MAX_LEVEL = 7

/** Every minute value that levels 1..level teach, ascending. */
export function minutesUpTo(level: number): number[] {
  const s = new Set<number>()
  for (let l = 1; l <= Math.min(level, MAX_LEVEL); l++) LEVEL_MINUTES[l].forEach((m) => s.add(m))
  return [...s].sort((a, b) => a - b)
}
```

- [ ] **Step 4: Write `src/clock/logic/phrases.ts`**

```ts
// The spoken time for every clock time, in Hebrew and English (spec: Phrases). One phrase per time per language.
// Loaded by plain Node (export script): erasable TS only, explicit .ts imports.
import { type ClockTime, nextHour, timeId } from './time.ts'

export type Lang = 'he' | 'en'
export const LANGS: Lang[] = ['he', 'en']

export interface Phrase {
  /** "he-3-45" */
  id: string
  lang: Lang
  /** the caption: the correct spelling, with nikkud in Hebrew; English in small letters */
  text: string
  /** caption words in reading order (a maqaf or hyphen keeps a compound as one word) */
  words: string[]
  /** the voice file id */
  audioId: string
}

const HE_HOUR = ['', 'אַחַת', 'שְׁתַּיִם', 'שָׁלוֹשׁ', 'אַרְבַּע', 'חָמֵשׁ', 'שֵׁשׁ', 'שֶׁבַע', 'שְׁמוֹנֶה', 'תֵּשַׁע', 'עֶשֶׂר', 'אַחַת־עֶשְׂרֵה', 'שְׁתֵּים־עֶשְׂרֵה']
/** "to <hour>": the prefix לְ, which becomes לִ before a shva. */
const HE_TO_HOUR = ['', 'לְאַחַת', 'לִשְׁתַּיִם', 'לְשָׁלוֹשׁ', 'לְאַרְבַּע', 'לְחָמֵשׁ', 'לְשֵׁשׁ', 'לְשֶׁבַע', 'לִשְׁמוֹנֶה', 'לְתֵשַׁע', 'לְעֶשֶׂר', 'לְאַחַת־עֶשְׂרֵה', 'לִשְׁתֵּים־עֶשְׂרֵה']
const HE_PAST: Record<number, string> = { 5: 'וַחֲמִשָּׁה', 10: 'וַעֲשָׂרָה', 15: 'וָרֶבַע', 20: 'וְעֶשְׂרִים', 25: 'עֶשְׂרִים וְחָמֵשׁ', 30: 'וָחֵצִי' }
const HE_TO: Record<number, string> = { 35: 'עֶשְׂרִים וְחָמֵשׁ', 40: 'עֶשְׂרִים', 45: 'רֶבַע', 50: 'עֲשָׂרָה', 55: 'חֲמִשָּׁה' }

const EN_HOUR = ['', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve']
const EN_MIN: Record<number, string> = { 5: 'five', 10: 'ten', 15: 'quarter', 20: 'twenty', 25: 'twenty-five', 30: 'half' }

export function phraseText(t: ClockTime, lang: Lang): string {
  const { h, m } = t
  if (lang === 'he') {
    if (m === 0) return HE_HOUR[h]
    if (m <= 30) return `${HE_HOUR[h]} ${HE_PAST[m]}`
    return `${HE_TO[m]} ${HE_TO_HOUR[nextHour(h)]}`
  }
  if (m === 0) return `${EN_HOUR[h]} o'clock`
  if (m <= 30) return `${EN_MIN[m]} past ${EN_HOUR[h]}`
  return `${EN_MIN[60 - m]} to ${EN_HOUR[nextHour(h)]}`
}

export function phrase(t: ClockTime, lang: Lang): Phrase {
  const text = phraseText(t, lang)
  const id = `${lang}-${timeId(t)}`
  return { id, lang, text, words: text.split(' '), audioId: `ph-${id}` }
}

/** The minutes number a phrase names: "twenty past" → 20, "quarter to" → 15, "half" → 30, o'clock → 0. */
export const phraseMinuteNumber = (m: number) => (m <= 30 ? m : 60 - m)

/** Hebrew points and cantillation, but not the maqaf (U+05BE). */
const NIKKUD = /[֑-ֽֿ-ׇ]/g
export const stripNikkud = (s: string) => s.replace(NIKKUD, '')
```

- [ ] **Step 5: Run** `npx vitest run src/clock/logic` → PASS.

- [ ] **Step 6: Commit** "Clock: time model and Hebrew/English phrases".

---

### Task 4: Trick families, options and grading

**Files:**
- Create: `src/clock/logic/tricks.ts`, `src/clock/logic/tricks.test.ts`, `src/clock/logic/grade.ts`, `src/clock/logic/grade.test.ts`

**Interfaces:**
- Consumes: Task 3 `time.ts`, `phrases.ts`; Task 2 `Rng` from `src/shared/adaptive`.
- Produces (`tricks.ts`): `TrickFamily`, `TRICK_FAMILIES`, `TRICK_PRIOR`, `OptionKind = 'clock'|'phrase'|'digital'`, `Option {family, pose, time: ClockTime|null, digital}`, `mirrorTime(t)`, `trickOption(f, t, kind, rng)`, `makeOptions(t, kind, families, rng, confusion?) → {options, correctIndex, used}`, `shuffle(rng, xs)`.
- Produces (`grade.ts`): `HOUR_TOLERANCE = 12`, `SetError`, `snapMinute(a)`, `gradeSet(t, set, check) → {correct, error}`, `Evaluation {correct, nearMiss, tag, chosen}`, `evaluateChoice(options, correctIndex, index)`, `evaluateSet(t, set, check, nearMissUsed)`.

- [ ] **Step 1: Write the failing tests**

`src/clock/logic/tricks.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { HOURS, MINUTES, angleDiff, poseOf, sameTime } from './time'
import { TRICK_FAMILIES, makeOptions, mirrorTime, trickOption, type OptionKind } from './tricks'

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
const all = HOURS.flatMap((h) => MINUTES.map((m) => ({ h, m })))

describe('tricks', () => {
  it('mirror keeps the hour word', () => {
    expect(mirrorTime({ h: 3, m: 15 })).toEqual({ h: 2, m: 45 })
    expect(mirrorTime({ h: 3, m: 45 })).toEqual({ h: 4, m: 15 })
    expect(mirrorTime({ h: 3, m: 30 })).toBeNull()
  })
  it('swap on a clock swaps the hands', () => {
    const o = trickOption('swap', { h: 3, m: 0 }, 'clock', seeded(1))!
    expect(o.pose.hour).toBe(0)
    expect(o.pose.minute).toBe(90)
    expect(o.time).toEqual({ h: 12, m: 15 })
  })
  it('number-as-minutes on a digital card', () => {
    expect(trickOption('numberAsMin', { h: 3, m: 20 }, 'digital', seeded(1))!.digital).toBe('3:04')
  })
  it('not advanced on a clock leaves the short hand on the number', () => {
    const o = trickOption('notAdvanced', { h: 3, m: 45 }, 'clock', seeded(1))!
    expect(o.pose.hour).toBe(90)
  })
  it('all 144 times × 3 kinds × every family pair give 3 distinct options, exactly one right', () => {
    const rng = seeded(7)
    const kinds: OptionKind[] = ['clock', 'phrase', 'digital']
    for (const t of all)
      for (const kind of kinds)
        for (const a of TRICK_FAMILIES)
          for (const b of TRICK_FAMILIES) {
            const { options, correctIndex } = makeOptions(t, kind, [a, b], rng)
            expect(options).toHaveLength(3)
            expect(options[correctIndex].family).toBeNull()
            expect(options.filter((o) => o.family === null)).toHaveLength(1)
            for (let i = 0; i < 3; i++)
              for (let j = i + 1; j < 3; j++) {
                const x = options[i], y = options[j]
                if (kind === 'clock') expect(angleDiff(x.pose.hour, y.pose.hour) < 4 && angleDiff(x.pose.minute, y.pose.minute) < 4).toBe(false)
                if (kind === 'phrase') expect(x.time && y.time && sameTime(x.time, y.time)).toBeFalsy()
                if (kind === 'digital') expect(x.digital).not.toBe(y.digital)
              }
            if (kind === 'phrase') options.forEach((o) => expect(o.time).not.toBeNull())
            expect(options[correctIndex].pose).toEqual(poseOf(t))
          }
  })
  it('a confused time is offered', () => {
    const { options } = makeOptions({ h: 3, m: 15 }, 'phrase', ['far', 'far'], seeded(3), { h: 2, m: 45 })
    expect(options.some((o) => o.family === 'confusion' && o.time && sameTime(o.time, { h: 2, m: 45 }))).toBe(true)
  })
})
```

`src/clock/logic/grade.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { evaluateChoice, evaluateSet, gradeSet, snapMinute } from './grade'
import type { Option } from './tricks'

const both = { hour: true, minute: true }

describe('gradeSet', () => {
  it('accepts the right pose', () => expect(gradeSet({ h: 3, m: 30 }, { hour: 105, minute: 180 }, both)).toEqual({ correct: true, error: null }))
  it('half past with the short hand on the number fails as not advanced', () =>
    expect(gradeSet({ h: 3, m: 30 }, { hour: 90, minute: 180 }, both)).toEqual({ correct: false, error: 'notAdvanced' }))
  it('quarter to with the short hand on the next number passes', () =>
    expect(gradeSet({ h: 3, m: 45 }, { hour: 120, minute: 270 }, both).correct).toBe(true))
  it('classifies swapped hands', () => expect(gradeSet({ h: 3, m: 0 }, { hour: 0, minute: 90 }, both).error).toBe('swap'))
  it('classifies the mirror', () => expect(gradeSet({ h: 3, m: 15 }, { hour: 97.5, minute: 270 }, both).error).toBe('mirror'))
  it('classifies five off', () => expect(gradeSet({ h: 3, m: 20 }, { hour: 100, minute: 150 }, both).error).toBe('five'))
  it('classifies number as minutes', () => expect(gradeSet({ h: 3, m: 5 }, { hour: 92.5, minute: 150 }, both).error).toBe('numberAsMin'))
  it('classifies hour off by one', () => expect(gradeSet({ h: 3, m: 0 }, { hour: 120, minute: 0 }, both).error).toBe('hour1'))
  it('checks only the hand asked for', () => expect(gradeSet({ h: 3, m: 0 }, { hour: 90, minute: 200 }, { hour: true, minute: false }).correct).toBe(true))
  it('snaps the long hand to five minutes', () => {
    expect(snapMinute(44)).toBe(30)
    expect(snapMinute(352)).toBe(0)
  })
})

describe('evaluate', () => {
  const opts: Option[] = [
    { family: null, pose: { hour: 90, minute: 0 }, time: { h: 3, m: 0 }, digital: '3:00' },
    { family: 'hour1', pose: { hour: 120, minute: 0 }, time: { h: 4, m: 0 }, digital: '4:00' },
    { family: 'far', pose: { hour: 270, minute: 180 }, time: { h: 9, m: 30 }, digital: '9:30' },
  ]
  it('choice', () => {
    expect(evaluateChoice(opts, 0, 0)).toEqual({ correct: true, nearMiss: false, tag: null, chosen: { h: 3, m: 0 } })
    expect(evaluateChoice(opts, 0, 1)).toEqual({ correct: false, nearMiss: false, tag: 'hour1', chosen: { h: 4, m: 0 } })
  })
  it('five off is a near miss once', () => {
    expect(evaluateSet({ h: 3, m: 20 }, { hour: 100, minute: 150 }, both, false).nearMiss).toBe(true)
    expect(evaluateSet({ h: 3, m: 20 }, { hour: 100, minute: 150 }, both, true).nearMiss).toBe(false)
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/clock/logic` → FAIL.

- [ ] **Step 3: Write `src/clock/logic/tricks.ts`**

```ts
// Wrong answers that trick (spec: Trick families). Each family imitates one real misunderstanding; the round
// chooser picks families to keep him near one mistake in five.
import type { Rng } from '../../shared/adaptive'
import { type ClockTime, type HandPose, MINUTES, addMinutes, angleDiff, digital, hourAngle, minuteAngle, nextHour, poseOf, prevHour, readPose, sameTime } from './time'
import { phraseMinuteNumber } from './phrases'

export type TrickFamily = 'far' | 'hour1' | 'mirror' | 'swap' | 'notAdvanced' | 'numberAsMin' | 'five' | 'seconds'
export const TRICK_FAMILIES: TrickFamily[] = ['far', 'hour1', 'mirror', 'swap', 'notAdvanced', 'numberAsMin', 'five', 'seconds']
/** Prior chance he falls for each family, before any data (easiest first). */
export const TRICK_PRIOR: Record<TrickFamily, number> = {
  far: 0.02, hour1: 0.06, swap: 0.1, mirror: 0.12, seconds: 0.12, notAdvanced: 0.15, numberAsMin: 0.15, five: 0.18,
}

/** What the options are: clocks (find the clock), spoken phrases (what time is it) or digital cards. */
export type OptionKind = 'clock' | 'phrase' | 'digital'

export interface Option {
  /** null = the right answer; 'confusion' = a time he chose for this one before */
  family: TrickFamily | 'confusion' | null
  /** the clock drawn for this option (clock options) */
  pose: HandPose
  /** the time the option says or reads as; null when it is not a five-minute time (e.g. the "3:04" card) */
  time: ClockTime | null
  /** the digital card text */
  digital: string
}
type Made = Omit<Option, 'family'>

export function shuffle<T>(rng: Rng, xs: T[]): T[] {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

const of = (time: ClockTime, pose: HandPose = poseOf(time)): Made => ({ time, pose, digital: digital(time.h, time.m) })
const hourDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 12 - Math.abs(a - b))

/** The twin with the same hour word: quarter past three ↔ quarter to three. None for o'clock and half past. */
export function mirrorTime(t: ClockTime): ClockTime | null {
  if (t.m === 0 || t.m === 30) return null
  return t.m < 30 ? { h: prevHour(t.h), m: 60 - t.m } : { h: nextHour(t.h), m: 60 - t.m }
}

/** One wrong answer of family `f`, or null when the family cannot apply here. */
export function trickOption(f: TrickFamily, t: ClockTime, kind: OptionKind, rng: Rng): Made | null {
  switch (f) {
    case 'far': {
      for (let i = 0; i < 30; i++) {
        const c = { h: 1 + Math.floor(rng() * 12), m: MINUTES[Math.floor(rng() * 12)] }
        if (hourDistance(c.h, t.h) >= 3 && c.m !== t.m) return of(c)
      }
      return of(addMinutes(t, 6 * 60 + 25))
    }
    case 'hour1':
      return of({ h: rng() < 0.5 ? nextHour(t.h) : prevHour(t.h), m: t.m })
    case 'mirror': {
      const mt = mirrorTime(t)
      return mt && of(mt)
    }
    case 'swap': {
      const pose = { hour: minuteAngle(t), minute: (Math.round(hourAngle(t) / 30) * 30) % 360 }
      if (angleDiff(pose.hour, hourAngle(t)) < 10 && angleDiff(pose.minute, minuteAngle(t)) < 10) return null
      const read = readPose(pose)
      if (sameTime(read, t)) return null
      return kind === 'clock' ? { ...of(read), pose } : of(read)
    }
    case 'notAdvanced': {
      if (t.m < 30) return null
      // a clock with the short hand still on the hour number; read aloud, the nearest number taken as the hour
      if (kind === 'clock') return { ...of(t), pose: { hour: (t.h % 12) * 30, minute: minuteAngle(t) }, time: null }
      return of({ h: nextHour(t.h), m: t.m })
    }
    case 'numberAsMin': {
      if (kind === 'digital') return t.m === 0 ? null : { ...of(t), time: null, digital: digital(t.h, t.m / 5) }
      if (kind === 'phrase') return null
      const n = phraseMinuteNumber(t.m)
      if (n !== 5 && n !== 10) return null
      const c = { h: t.h, m: (n * 5) % 60 }
      return sameTime(c, t) ? null : of(c)
    }
    case 'five':
      return of(addMinutes(t, rng() < 0.5 ? 5 : -5))
    case 'seconds': {
      // wrong minutes; on a clock the seconds hand sits where the right long hand would be
      const w = addMinutes(t, (rng() < 0.5 ? 1 : -1) * (10 + 5 * Math.floor(rng() * 3)))
      return kind === 'clock' ? { ...of(w), pose: { ...poseOf(w), second: minuteAngle(t) } } : of(w)
    }
  }
}

/**
 * Three options: the right one, a confused time if he has one, then the families in order, then 'far' to fill.
 * Options are distinct in what the child compares: the hands (clock), the time (phrase) or the card (digital).
 */
export function makeOptions(t: ClockTime, kind: OptionKind, families: TrickFamily[], rng: Rng, confusion?: ClockTime | null) {
  const out: Option[] = [{ family: null, ...of(t) }]
  const used: TrickFamily[] = []
  const distinct = (o: Made) =>
    out.every((x) =>
      kind === 'clock'
        ? !(angleDiff(x.pose.hour, o.pose.hour) < 4 && angleDiff(x.pose.minute, o.pose.minute) < 4)
        : kind === 'phrase'
          ? !(x.time && o.time && sameTime(x.time, o.time))
          : x.digital !== o.digital,
    )
  const usable = (o: Made | null): o is Made => !!o && (kind !== 'phrase' || o.time !== null) && distinct(o)

  if (confusion && !sameTime(confusion, t)) {
    const c = of(confusion)
    if (usable(c)) out.push({ family: 'confusion', ...c })
  }
  for (const f of families) {
    if (out.length >= 3) break
    const o = trickOption(f, t, kind, rng)
    if (usable(o)) {
      out.push({ family: f, ...o })
      used.push(f)
    }
  }
  for (let guard = 0; out.length < 3 && guard < 60; guard++) {
    const o = trickOption('far', t, kind, rng)
    if (usable(o)) {
      out.push({ family: 'far', ...o })
      used.push('far')
    }
  }
  const options = shuffle(rng, out)
  return { options, correctIndex: options.findIndex((o) => o.family === null), used }
}
```

- [ ] **Step 4: Write `src/clock/logic/grade.ts`**

```ts
// Grading a set clock, and naming the mistake (spec: Set the clock error classes, Near miss).
import { type ClockTime, type HandPose, angleDiff, hourAngle, minuteAngle, norm, readPose } from './time'
import { phraseMinuteNumber } from './phrases'
import type { Option, TrickFamily } from './tricks'

/** The short hand passes within this many degrees of its true angle (half past on a number is 15° off: fails). */
export const HOUR_TOLERANCE = 12
export type SetError = 'swap' | 'notAdvanced' | 'mirror' | 'numberAsMin' | 'five' | 'hour1' | 'other'

/** The long hand snaps to five-minute marks. */
export const snapMinute = (a: number) => (Math.round(norm(a) / 30) * 30) % 360

export function gradeSet(t: ClockTime, set: HandPose, check: { hour: boolean; minute: boolean }): { correct: boolean; error: SetError | null } {
  const hourOk = !check.hour || angleDiff(set.hour, hourAngle(t)) <= HOUR_TOLERANCE
  const minOk = !check.minute || angleDiff(set.minute, minuteAngle(t)) < 1
  if (hourOk && minOk) return { correct: true, error: null }
  return { correct: false, error: classify(t, set, hourOk, minOk) }
}

function classify(t: ClockTime, set: HandPose, hourOk: boolean, minOk: boolean): SetError {
  const ma = minuteAngle(t)
  const ha = hourAngle(t)
  if (angleDiff(set.minute, ha) <= 15 && angleDiff(set.hour, ma) <= 15) return 'swap'
  if (hourOk && !minOk) {
    if (t.m !== 0 && t.m !== 30 && angleDiff(set.minute, 360 - ma) < 1) return 'mirror'
    if (angleDiff(set.minute, ma) <= 31) return 'five'
    const n = phraseMinuteNumber(t.m)
    if (n >= 1 && n <= 12 && angleDiff(set.minute, n * 30) < 1) return 'numberAsMin'
    return 'other'
  }
  if (minOk && !hourOk) {
    if (t.m >= 15 && angleDiff(set.hour, (t.h % 12) * 30) <= 3) return 'notAdvanced'
    if (angleDiff(set.hour, ha) <= 30 + HOUR_TOLERANCE) return 'hour1'
  }
  return 'other'
}

export interface Evaluation {
  correct: boolean
  /** five off in Set the clock, the first time in this round: he may try again */
  nearMiss: boolean
  /** what the mistake was: the chosen option's family, or the set-clock error class */
  tag: TrickFamily | SetError | 'confusion' | null
  /** the time he chose (or set), when it is a real time; for confusions */
  chosen: ClockTime | null
}

export function evaluateChoice(options: Option[], correctIndex: number, index: number): Evaluation {
  const o = options[index]
  const correct = index === correctIndex
  return { correct, nearMiss: false, tag: correct ? null : o.family, chosen: o.time }
}

export function evaluateSet(t: ClockTime, set: HandPose, check: { hour: boolean; minute: boolean }, nearMissUsed: boolean): Evaluation {
  const g = gradeSet(t, set, check)
  return { correct: g.correct, nearMiss: !g.correct && g.error === 'five' && !nearMissUsed, tag: g.error, chosen: g.correct ? null : readPose(set) }
}
```

- [ ] **Step 5: Run** `npx vitest run src/clock/logic` → PASS. If the exhaustive test finds a duplicate, fix the family in `trickOption` (return null when it cannot make a different answer), never the test.

- [ ] **Step 6: Commit** "Clock: trick families, options and set-clock grading".

---

### Task 5: Types, levels and explanation triggers

**Files:**
- Create: `src/clock/logic/types.ts`, `src/clock/logic/levels.ts`, `src/clock/logic/levels.test.ts`

**Interfaces:**
- Consumes: Task 3, Task 4 types.
- Produces (`types.ts`): `Exercise = 'find'|'what'|'digitalPick'|'setShort'|'setLong'|'setBoth'|'digitalSet'`; `Scaffolds {numbers: 'all'|'quarters'|'none'; slice: boolean; ring: boolean; seconds: boolean}`; `RoundPlan` (below).
- Produces (`levels.ts`): `FAST_FORWARD`, `PASS_WINDOW`, `PASS_CORRECT`, `LevelProgress {level, newAnswers}`, `START_PROGRESS`, `isNewTime(level, m)`, `recordNewAnswer(p, correct) → {progress, passed}`, `ExplainId`, `exerciseIntro(e)`, `introsFor(s, plan)`, `fixFor(s)`, `FIX_FOR`, `ExplainState`.

- [ ] **Step 1: Write `src/clock/logic/types.ts`** (types only, no test):

```ts
import type { ClockTime } from './time'
import type { Lang } from './phrases'
import type { Option, TrickFamily } from './tricks'
import type { ClockKind } from './workday'

export type Exercise = 'find' | 'what' | 'digitalPick' | 'setShort' | 'setLong' | 'setBoth' | 'digitalSet'

export interface Scaffolds {
  /** the numbers on the face: all 12, only 12/3/6/9, or none */
  numbers: 'all' | 'quarters' | 'none'
  /** the light past (right) / to (left) shading */
  slice: boolean
  /** the outer minute ring 5, 10, 15 … */
  ring: boolean
  /** a ticking seconds hand */
  seconds: boolean
}

export interface RoundPlan {
  exercise: Exercise
  time: ClockTime
  /** the time is one of the current level's new times (counts for passing the level) */
  isNew: boolean
  lang: Lang
  level: number
  kind: ClockKind
  scaffolds: Scaffolds
  /** choice exercises: three options; set exercises: [] */
  options: Option[]
  correctIndex: number
  families: TrickFamily[]
  /** the short hand creeps with the long hand (levels 2–4) */
  linked: boolean
  /** where the seconds hand starts on the main clock (what / digitalPick with seconds) */
  secondsAt?: number
  features: string[]
  predicted: number
}
```

- [ ] **Step 2: Write the failing test** `src/clock/logic/levels.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { START_PROGRESS, fixFor, introsFor, isNewTime, recordNewAnswer, type LevelProgress } from './levels'
import type { Scaffolds } from './types'

const run = (p: LevelProgress, answers: string) => {
  let passed = false
  for (const c of answers) ({ progress: p, passed } = recordNewAnswer(p, c === 'o'))
  return { p, passed }
}
const plain: Scaffolds = { numbers: 'all', slice: false, ring: false, seconds: false }

describe('levels', () => {
  it('fast-forward: the first 5 new answers right pass the level', () => {
    expect(run(START_PROGRESS, 'ooooo')).toEqual({ p: { level: 2, newAnswers: '' }, passed: true })
  })
  it('a slip blocks fast-forward; 8 of the last 10 then pass', () => {
    expect(run(START_PROGRESS, 'ooxoo').passed).toBe(false)
    expect(run(START_PROGRESS, 'ooxooooxoo').passed).toBe(true)
    expect(run(START_PROGRESS, 'ooxoooxxoo').passed).toBe(false)
  })
  it('level 7 never passes', () => expect(run({ level: 7, newAnswers: '' }, 'oooooooooooo').passed).toBe(false))
  it('isNewTime', () => {
    expect(isNewTime(3, 15)).toBe(true)
    expect(isNewTime(3, 30)).toBe(false)
  })
  it('intros: hands first, then the level idea and the exercise', () => {
    const s = { explained: {}, roundNo: 0, mistakes: [] }
    expect(introsFor(s, { level: 1, isNew: true, exercise: 'find', scaffolds: plain })).toEqual(['hands', 'ex-find'])
    const s2 = { explained: { hands: 0, 'ex-find': 0, 'ex-set': 3 }, roundNo: 9, mistakes: [] }
    expect(introsFor(s2, { level: 3, isNew: true, exercise: 'setBoth', scaffolds: { ...plain, seconds: true } })).toEqual(['level-3', 'seconds'])
    expect(introsFor(s2, { level: 3, isNew: false, exercise: 'digitalPick', scaffolds: plain })).toEqual(['ex-digital'])
  })
  it('a repeated mistake brings its explanation, then a cooldown', () => {
    const mistakes = [{ round: 3, tag: 'mirror' }, { round: 6, tag: 'mirror' }]
    expect(fixFor({ explained: {}, roundNo: 7, mistakes })).toBe('fix-mirror')
    expect(fixFor({ explained: { 'fix-mirror': 5 }, roundNo: 7, mistakes })).toBeNull()
    expect(fixFor({ explained: {}, roundNo: 20, mistakes })).toBeNull()
    expect(fixFor({ explained: {}, roundNo: 7, mistakes: [{ round: 5, tag: 'far' }, { round: 6, tag: 'far' }] })).toBeNull()
  })
})
```

- [ ] **Step 3: Run** `npx vitest run src/clock/logic/levels.test.ts` → FAIL.

- [ ] **Step 4: Write `src/clock/logic/levels.ts`**

```ts
// Levels and explanations (spec: Levels, Explanations).
import { LEVEL_MINUTES, MAX_LEVEL } from './time'
import type { Exercise, Scaffolds } from './types'

/** Michael chose fast-forward over a placement test: the first 5 rounds on a level's new times all right pass it. */
export const FAST_FORWARD = 5
export const PASS_WINDOW = 10
export const PASS_CORRECT = 8

export interface LevelProgress {
  level: number
  /** answers on this level's new times, oldest first (o right, x wrong) */
  newAnswers: string
}
export const START_PROGRESS: LevelProgress = { level: 1, newAnswers: '' }

export const isNewTime = (level: number, m: number) => LEVEL_MINUTES[Math.min(level, MAX_LEVEL)].includes(m)

export function recordNewAnswer(p: LevelProgress, correct: boolean): { progress: LevelProgress; passed: boolean } {
  const newAnswers = p.newAnswers + (correct ? 'o' : 'x')
  if (p.level >= MAX_LEVEL) return { progress: { ...p, newAnswers: newAnswers.slice(-PASS_WINDOW) }, passed: false }
  const fast = newAnswers.length === FAST_FORWARD && !newAnswers.includes('x')
  const last = newAnswers.slice(-PASS_WINDOW)
  const steady = newAnswers.length >= PASS_WINDOW && [...last].filter((c) => c === 'o').length >= PASS_CORRECT
  if (fast || steady) return { progress: { level: p.level + 1, newAnswers: '' }, passed: true }
  return { progress: { ...p, newAnswers: newAnswers.slice(-50) }, passed: false }
}

export type ExplainId =
  | 'hands' | 'level-2' | 'level-3' | 'level-4' | 'level-5' | 'level-6' | 'nonumbers'
  | 'ex-find' | 'ex-what' | 'ex-set' | 'ex-digital' | 'seconds'
  | 'fix-swap' | 'fix-notAdvanced' | 'fix-mirror' | 'fix-numberAsMin' | 'fix-hour1' | 'fix-five'

export interface ExplainState {
  /** round number at which each explanation last played */
  explained: Partial<Record<ExplainId, number>>
  roundNo: number
  mistakes: { round: number; tag: string }[]
}

export const exerciseIntro = (e: Exercise): ExplainId =>
  e === 'find' ? 'ex-find' : e === 'what' ? 'ex-what' : e === 'digitalPick' || e === 'digitalSet' ? 'ex-digital' : 'ex-set'

/** Explanations to play before this round, in order: first appearance of each element. */
export function introsFor(s: ExplainState, plan: { level: number; isNew: boolean; exercise: Exercise; scaffolds: Scaffolds }): ExplainId[] {
  const out: ExplainId[] = []
  const fresh = (id: ExplainId) => s.explained[id] === undefined
  if (fresh('hands')) out.push('hands')
  if (plan.isNew && plan.level >= 2 && plan.level <= 6) {
    const id = `level-${plan.level}` as ExplainId
    if (fresh(id)) out.push(id)
  }
  if (plan.scaffolds.numbers === 'none' && fresh('nonumbers')) out.push('nonumbers')
  if (plan.scaffolds.seconds && fresh('seconds')) out.push('seconds')
  const ex = exerciseIntro(plan.exercise)
  if (fresh(ex)) out.push(ex)
  return out
}

export const FIX_WINDOW = 8
export const FIX_REPEAT = 2
export const FIX_COOLDOWN = 10
export const FIX_FOR: Record<string, ExplainId | undefined> = {
  swap: 'fix-swap', notAdvanced: 'fix-notAdvanced', mirror: 'fix-mirror', numberAsMin: 'fix-numberAsMin',
  hour1: 'fix-hour1', five: 'fix-five', seconds: 'seconds',
}

/** The explanation for a mistake made FIX_REPEAT times in the last FIX_WINDOW rounds, unless it played recently. */
export function fixFor(s: ExplainState): ExplainId | null {
  const counts = new Map<string, number>()
  for (const m of s.mistakes) if (m.round > s.roundNo - FIX_WINDOW) counts.set(m.tag, (counts.get(m.tag) ?? 0) + 1)
  for (const [tag, n] of counts) {
    const id = FIX_FOR[tag]
    if (!id || n < FIX_REPEAT) continue
    const last = s.explained[id]
    if (last === undefined || s.roundNo - last >= FIX_COOLDOWN) return id
  }
  return null
}
```

- [ ] **Step 5: Run** `npx vitest run src/clock/logic/levels.test.ts` → PASS (types.ts compiles once Task 6 adds `workday.ts`; if running this task before Task 6, temporarily ignore the tsc error for the `ClockKind` import — vitest does not type-check).

- [ ] **Step 6: Commit** "Clock: level progress, fast-forward and explanation triggers".

---

### Task 6: Workday: clock kinds, customers, languages, bonus, real time

**Files:**
- Create: `src/clock/logic/workday.ts`, `src/clock/logic/workday.test.ts`

**Interfaces:**
- Consumes: `time.ts`, `phrases.ts` (`Lang`).
- Produces: `ClockKind`, `ClockSfx`, `KindInfo`, `KINDS`, `kindInfo`, `kindsUpTo`, `newKindsAt`, `Customer`, `CUSTOMERS`, `NARRATOR_VOICE`, `WORKDAY_LENGTH = 8`, `langForRound(roundNo, langs)`, `pickCustomer(rng, lang, lastId?)`, `pickKind(rng, level, forced?)`, `BONUS_TRIES = 3`, `BONUS_TURN_MS = 3000`, `bonusGears(angle)`, `realTimeFor(now, minutes)`, `dayKey(d)`.

- [ ] **Step 1: Write the failing test** `src/clock/logic/workday.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { CUSTOMERS, bonusGears, kindsUpTo, langForRound, pickCustomer, pickKind, realTimeFor } from './workday'

describe('workday', () => {
  it('langForRound alternates, and with one language always uses it', () => {
    expect([0, 1, 2, 3].map((r) => langForRound(r, ['he', 'en']))).toEqual(['he', 'en', 'he', 'en'])
    expect([0, 1, 2].map((r) => langForRound(r, ['en']))).toEqual(['en', 'en', 'en'])
  })
  it('customers speak the round language and do not repeat back to back', () => {
    for (let i = 0; i < 50; i++) {
      const c = pickCustomer(Math.random, 'en', 'owl')
      expect(c.lang).toBe('en')
      expect(c.id).not.toBe('owl')
    }
    expect(CUSTOMERS.filter((c) => c.lang === 'he')).toHaveLength(4)
  })
  it('kinds unlock by level and a forced kind wins', () => {
    expect(kindsUpTo(1).map((k) => k.id)).toEqual(['wall', 'alarm'])
    expect(pickKind(Math.random, 1, 'cuckoo')).toBe('cuckoo')
    for (let i = 0; i < 30; i++) expect(['wall', 'alarm']).toContain(pickKind(Math.random, 1))
  })
  it('bonus gears by closeness to 12', () => {
    expect(bonusGears(3)).toBe(3)
    expect(bonusGears(350)).toBe(2)
    expect(bonusGears(25)).toBe(1)
    expect(bonusGears(180)).toBe(0)
  })
  it('real time rounds to five minutes and only when covered', () => {
    expect(realTimeFor(new Date(2026, 9, 15, 15, 28, 40), [0, 30])).toEqual({ h: 3, m: 30 })
    expect(realTimeFor(new Date(2026, 9, 15, 0, 1, 0), [0])).toEqual({ h: 12, m: 0 })
    expect(realTimeFor(new Date(2026, 9, 15, 15, 20, 0), [0, 30])).toBeNull()
    expect(realTimeFor(new Date(2026, 9, 15, 23, 58, 0), [0])).toEqual({ h: 12, m: 0 })
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Write `src/clock/logic/workday.ts`**

```ts
// The workshop's cast and the shape of a workday (spec: Workday, rewards and bonus; Characters and voices).
// Loaded by plain Node (export script): erasable TS only, explicit .ts imports.
import { type ClockTime, angleDiff } from './time.ts'
import type { Lang } from './phrases.ts'

type Rng = () => number

export type ClockKind = 'wall' | 'alarm' | 'cuckoo' | 'pocket' | 'grandfather' | 'station' | 'wrist' | 'tower'
export type ClockSfx =
  | 'tick' | 'chime' | 'cuckoo' | 'alarm' | 'bong' | 'beep' | 'gear' | 'boing' | 'doorbell' | 'snap' | 'build'
  | 'fanfare' | 'ding' | 'wallchime'

export interface KindInfo {
  id: ClockKind
  /** the level that brings it */
  level: number
  /** shows a seconds hand (from level 5) */
  seconds: boolean
  /** the sound it makes when it comes alive */
  sound: ClockSfx
}

export const KINDS: KindInfo[] = [
  { id: 'wall', level: 1, seconds: false, sound: 'chime' },
  { id: 'alarm', level: 1, seconds: false, sound: 'alarm' },
  { id: 'cuckoo', level: 2, seconds: false, sound: 'cuckoo' },
  { id: 'pocket', level: 3, seconds: true, sound: 'chime' },
  { id: 'grandfather', level: 4, seconds: false, sound: 'bong' },
  { id: 'station', level: 5, seconds: true, sound: 'chime' },
  { id: 'wrist', level: 6, seconds: true, sound: 'beep' },
  { id: 'tower', level: 7, seconds: false, sound: 'bong' },
]
export const kindInfo = (k: ClockKind) => KINDS.find((x) => x.id === k)!
export const kindsUpTo = (level: number) => KINDS.filter((k) => k.level <= level)
export const newKindsAt = (level: number) => KINDS.filter((k) => k.level === level)

export interface Customer {
  id: string
  lang: Lang
  /** ElevenLabs premade voice */
  voice: string
}
export const CUSTOMERS: Customer[] = [
  { id: 'hedgehog', lang: 'he', voice: 'cgSgspJ2msm6clMCkdW9' },
  { id: 'cat', lang: 'he', voice: 'XrExE9yKIg1WjnnlVkGX' },
  { id: 'bear', lang: 'he', voice: 'nPczCjzI2devNBz1zQrb' },
  { id: 'turtle', lang: 'he', voice: 'JBFqnCBsd6RMkjVDRZzb' },
  { id: 'owl', lang: 'en', voice: 'Xb7hH8MSUJpSbSDYk0k2' },
  { id: 'fox', lang: 'en', voice: 'IKne3meq5aSn9XLyUdCD' },
  { id: 'rabbit', lang: 'en', voice: 'FGY2WhTYpPnrIDTdsKH5' },
  { id: 'penguin', lang: 'en', voice: 'N2lVS1w4EtoT3dr4eOWO' },
]
/** The cuckoo narrator: Will, the duel's approved Hebrew voice (eleven_v4). */
export const NARRATOR_VOICE = 'bIHbv24MWmeRgasZH58o'

export const WORKDAY_LENGTH = 8

/** Rounds alternate between the enabled languages. */
export const langForRound = (roundNo: number, langs: Lang[]): Lang => langs[roundNo % langs.length]

export function pickCustomer(rng: Rng, lang: Lang, lastId?: string): Customer {
  const pool = CUSTOMERS.filter((c) => c.lang === lang && c.id !== lastId)
  return pool[Math.floor(rng() * pool.length)]
}

export function pickKind(rng: Rng, level: number, forced?: ClockKind): ClockKind {
  if (forced) return forced
  const pool = kindsUpTo(level)
  return pool[Math.floor(rng() * pool.length)].id
}

export const BONUS_TRIES = 3
/** one turn of the bonus game's seconds hand */
export const BONUS_TURN_MS = 3000

/** Gears for stopping the sweeping hand: within 1 s of 12 → 3, 2 s → 2, 5 s → 1. */
export function bonusGears(stopAngle: number): number {
  const d = angleDiff(stopAngle, 0)
  return d <= 6 ? 3 : d <= 12 ? 2 : d <= 30 ? 1 : 0
}

/** The device time rounded to five minutes, if his levels cover that minute value. */
export function realTimeFor(now: Date, minutes: number[]): ClockTime | null {
  const r = Math.round((now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60) / 5) * 5
  const h24 = Math.floor(r / 60) % 24
  const m = r % 60
  const h = h24 % 12 === 0 ? 12 : h24 % 12
  return minutes.includes(m) ? { h, m } : null
}

export const dayKey = (d: Date) => `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`
```

- [ ] **Step 4: Run** `npx vitest run src/clock/logic` and `npx tsc --noEmit -p .` → PASS / clean.

- [ ] **Step 5: Commit** "Clock: clock kinds, customers, workday, bonus scoring and the real-time round".

---

### Task 7: Round choice

**Files:**
- Create: `src/clock/logic/rounds.ts`, `src/clock/logic/rounds.test.ts`

**Interfaces:**
- Consumes: Tasks 2–6.
- Produces: `EXERCISE_PRIOR`, `MINUTE_PRIOR`, `SCAFFOLD_PRIOR`, `CANDIDATES = 24`, `NEW_SHARE = 0.7`, `exercisesFor(level)`, `linkedHands(level)`, `optionKind(e)`, `scaffoldsFor(level, kind, rng)`, `pickTime(rng, level)`, `features(p)`, `featurePrior(id)`, `predict(features, tallies, recent)`, `confusionPartner(confusions, t)`, `RoundContext`, `planRound(ctx): RoundPlan`, `checkFor(e)` (which hands Set grades).

- [ ] **Step 1: Write the failing test** `src/clock/logic/rounds.test.ts`

```ts
import { describe, expect, it } from 'vitest'
import { exercisesFor, features, planRound, predict, scaffoldsFor, checkFor, type RoundContext } from './rounds'
import type { Tally } from '../../shared/adaptive'

const ctx = (over: Partial<RoundContext> = {}): RoundContext => ({
  level: 1, lang: 'he', rng: Math.random, tallies: {}, recent: {}, confusions: {}, ...over,
})

describe('rounds', () => {
  it('exercises by level', () => {
    expect(exercisesFor(1)).toEqual(['find', 'what', 'digitalPick', 'setShort'])
    expect(exercisesFor(2)).toContain('setLong')
    expect(exercisesFor(5)).toEqual(['find', 'what', 'digitalPick', 'setBoth', 'digitalSet'])
  })
  it('scaffolds by level', () => {
    expect(scaffoldsFor(1, 'wall', Math.random)).toEqual({ numbers: 'all', slice: false, ring: false, seconds: false })
    expect(scaffoldsFor(7, 'tower', Math.random).numbers).toBe('none')
    expect(scaffoldsFor(5, 'station', Math.random).seconds).toBe(true)
    expect(scaffoldsFor(4, 'pocket', Math.random).seconds).toBe(false)
  })
  it('plans are consistent', () => {
    for (let level = 1; level <= 7; level++)
      for (let i = 0; i < 40; i++) {
        const p = planRound(ctx({ level }))
        expect(p.level).toBe(level)
        if (['find', 'what', 'digitalPick'].includes(p.exercise)) {
          expect(p.options).toHaveLength(3)
          expect(p.options[p.correctIndex].family).toBeNull()
        } else expect(p.options).toHaveLength(0)
        expect(p.features).toContain(`m:${p.time.m}`)
        expect(p.predicted).toBeGreaterThan(0)
        expect(p.predicted).toBeLessThan(1)
      }
  })
  it('level 1 plays only o\'clock', () => {
    for (let i = 0; i < 30; i++) expect(planRound(ctx()).time.m).toBe(0)
  })
  it('about 70% of rounds use the new times', () => {
    let fresh = 0
    for (let i = 0; i < 300; i++) if (planRound(ctx({ level: 3 })).isNew) fresh++
    expect(fresh).toBeGreaterThan(150)
    expect(fresh).toBeLessThan(270)
  })
  it('forced exercise and time', () => {
    const p = planRound(ctx({ level: 2, forcedExercise: 'what', forcedTime: { h: 4, m: 30 } }))
    expect(p.exercise).toBe('what')
    expect(p.time).toEqual({ h: 4, m: 30 })
  })
  it('predict rises with misses on a feature', () => {
    const f = features({ exercise: 'find', time: { h: 3, m: 15 }, families: ['mirror'], scaffolds: { numbers: 'all', slice: true, ring: false, seconds: false }, level: 3 })
    const fresh = predict(f, {}, {})
    const bad: Record<string, Tally> = { 'tr:mirror': { seen: 6, wrong: 5 } }
    expect(predict(f, bad, { 'tr:mirror': 'xxxxo' })).toBeGreaterThan(fresh)
  })
  it('checkFor', () => {
    expect(checkFor('setShort')).toEqual({ hour: true, minute: false })
    expect(checkFor('setLong')).toEqual({ hour: false, minute: true })
    expect(checkFor('setBoth')).toEqual({ hour: true, minute: true })
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Write `src/clock/logic/rounds.ts`**

```ts
// Choosing the next round (spec: Round choice): sample candidates from the level mix, predict each candidate's
// mistake rate from its features, and take the one nearest one mistake in five.
import { pickNearTarget, predictedMistakeRate, type Rng, type Tally } from '../../shared/adaptive'
import { type ClockTime, HOURS, LEVEL_MINUTES, MAX_LEVEL, minutesUpTo, parseTimeId, timeId } from './time'
import type { Lang } from './phrases'
import { TRICK_FAMILIES, TRICK_PRIOR, makeOptions, shuffle, type Option, type OptionKind, type TrickFamily } from './tricks'
import { isNewTime } from './levels'
import { kindInfo, pickKind, type ClockKind } from './workday'
import type { Exercise, RoundPlan, Scaffolds } from './types'

export const EXERCISE_PRIOR: Record<Exercise, number> = {
  find: 0.04, what: 0.06, digitalPick: 0.06, setShort: 0.06, setLong: 0.08, setBoth: 0.12, digitalSet: 0.12,
}
export const MINUTE_PRIOR: Record<number, number> = {
  0: 0.02, 30: 0.04, 15: 0.06, 45: 0.1, 5: 0.1, 10: 0.1, 20: 0.1, 25: 0.12, 35: 0.14, 40: 0.14, 50: 0.14, 55: 0.14,
}
export const SCAFFOLD_PRIOR: Record<string, number> = { nonum: 0.1, quarters: 0.05, noslice: 0.04, noring: 0.05, sec: 0.04 }
export const CANDIDATES = 24
export const NEW_SHARE = 0.7

const pick = <T,>(rng: Rng, xs: T[]) => xs[Math.floor(rng() * xs.length)]

export function exercisesFor(level: number): Exercise[] {
  const set: Exercise = level === 1 ? 'setShort' : level === 2 ? 'setLong' : 'setBoth'
  const out: Exercise[] = ['find', 'what', 'digitalPick', set]
  if (level >= 3) out.push('digitalSet')
  return out
}
export const linkedHands = (level: number) => level >= 2 && level <= 4
export const optionKind = (e: Exercise): OptionKind | null =>
  e === 'find' ? 'clock' : e === 'what' ? 'phrase' : e === 'digitalPick' ? 'digital' : null
/** Which hands a Set exercise grades. */
export const checkFor = (e: Exercise) =>
  e === 'setShort' ? { hour: true, minute: false } : e === 'setLong' ? { hour: false, minute: true } : { hour: true, minute: true }

export function scaffoldsFor(level: number, kind: ClockKind, rng: Rng): Scaffolds {
  const numbers: Scaffolds['numbers'] = level <= 5 ? 'all' : level === 6 ? pick(rng, ['all', 'quarters', 'none'] as const) : 'none'
  return {
    numbers,
    slice: level >= 3 && level <= 6 ? rng() < 0.5 : false,
    ring: level === 5 || level === 6 ? rng() < 0.5 : false,
    seconds: level >= 5 && kindInfo(kind).seconds,
  }
}

export function pickTime(rng: Rng, level: number): { time: ClockTime; isNew: boolean } {
  const fresh = LEVEL_MINUTES[Math.min(level, MAX_LEVEL)]
  const old = minutesUpTo(level - 1)
  const useNew = level >= MAX_LEVEL || old.length === 0 || rng() < NEW_SHARE
  const m = pick(rng, useNew ? fresh : old)
  return { time: { h: pick(rng, HOURS), m }, isNew: isNewTime(level, m) }
}

export function features(p: { exercise: Exercise; time: ClockTime; families: TrickFamily[]; scaffolds: Scaffolds; level: number }): string[] {
  const f = [`m:${p.time.m}`, `ex:${p.exercise}`]
  p.families.forEach((t) => f.push(`tr:${t}`))
  if (p.scaffolds.numbers === 'none') f.push('sc:nonum')
  else if (p.scaffolds.numbers === 'quarters') f.push('sc:quarters')
  if (p.level >= 3 && p.level <= 6 && !p.scaffolds.slice && p.time.m !== 0) f.push('sc:noslice')
  if ((p.level === 5 || p.level === 6) && !p.scaffolds.ring && p.time.m % 15 !== 0) f.push('sc:noring')
  if (p.scaffolds.seconds) f.push('sc:sec')
  return f
}

export function featurePrior(id: string): number {
  const [k, v] = id.split(':')
  if (k === 'm') return MINUTE_PRIOR[Number(v)] ?? 0.1
  if (k === 'ex') return EXERCISE_PRIOR[v as Exercise] ?? 0.08
  if (k === 'tr') return TRICK_PRIOR[v as TrickFamily] ?? 0.08
  return SCAFFOLD_PRIOR[v] ?? 0.05
}

/** Noisy-or: the round is missed if any of its features trips him. */
export function predict(feats: string[], tallies: Record<string, Tally>, recent: Record<string, string>): number {
  let ok = 1
  for (const f of feats) ok *= 1 - predictedMistakeRate(tallies[f], recent[f], featurePrior(f))
  return 1 - ok
}

/** The time he most often chose when `t` was asked (2+ times), if any. */
export function confusionPartner(confusions: Record<string, Record<string, number>>, t: ClockTime): ClockTime | null {
  const row = confusions[timeId(t)]
  if (!row) return null
  let best: [string, number] | null = null
  for (const [k, n] of Object.entries(row)) if (n >= 2 && (!best || n > best[1])) best = [k, n]
  return best ? parseTimeId(best[0]) : null
}

export interface RoundContext {
  level: number
  lang: Lang
  rng: Rng
  tallies: Record<string, Tally>
  recent: Record<string, string>
  confusions: Record<string, Record<string, number>>
  forcedKind?: ClockKind
  forcedTime?: ClockTime
  forcedExercise?: Exercise
}

function candidate(c: RoundContext): RoundPlan {
  const { level, rng } = c
  const kind = pickKind(rng, level, c.forcedKind)
  const exercise = c.forcedExercise ?? pick(rng, exercisesFor(level))
  const { time, isNew } = c.forcedTime ? { time: c.forcedTime, isNew: isNewTime(level, c.forcedTime.m) } : pickTime(rng, level)
  const scaffolds = scaffoldsFor(level, kind, rng)
  const ok = optionKind(exercise)
  let options: Option[] = []
  let correctIndex = -1
  let families: TrickFamily[] = []
  if (ok) {
    const pool = TRICK_FAMILIES.filter((f) => f !== 'seconds' || scaffolds.seconds)
    const r = makeOptions(time, ok, shuffle(rng, pool).slice(0, 2), rng, confusionPartner(c.confusions, time))
    ;({ options, correctIndex } = r)
    families = r.used
  }
  const trap = options.find((o) => o.family === 'seconds')
  const secondsAt = scaffolds.seconds ? (trap ? trap.pose.second ?? trap.pose.minute : rng() * 360) : undefined
  const feats = features({ exercise, time, families, scaffolds, level })
  return {
    exercise, time, isNew, lang: c.lang, level, kind, scaffolds, options, correctIndex, families,
    linked: linkedHands(level), secondsAt, features: feats, predicted: predict(feats, c.tallies, c.recent),
  }
}

export function planRound(c: RoundContext): RoundPlan {
  const cands = Array.from({ length: CANDIDATES }, () => candidate(c))
  return cands[pickNearTarget(c.rng, cands.map((x) => x.predicted))]
}
```

Note on `secondsAt` for the phrase/digital seconds trap: the trap option's `pose.minute` is where the wrong answer's long hand would be; starting the main clock's seconds hand there is the trap.

- [ ] **Step 4: Run** `npx vitest run src/clock/logic` and `npx tsc --noEmit -p .` → PASS / clean.

- [ ] **Step 5: Commit** "Clock: round choice aimed at one mistake in five".

---

### Task 8: Lines, store and telemetry

**Files:**
- Create: `src/clock/data/lines.ts`, `src/clock/data/lines.test.ts`, `src/clock/store.ts`, `src/clock/store.test.ts`, `src/clock/telemetry.ts`

**Interfaces:**
- Consumes: Tasks 2–7.
- Produces (`lines.ts`): `Cue`, `LineDef {id, where, he, en, tag?, stability, example?}`, `LINES`, `lineById(id)`, `parseLine(text) → {words, cues: {word, cue}[], spoken}`, `lineAudioId(id, lang)`, `CUSTOMER_LINES`, `customerAudioId(cust, what)`.
- Produces (`store.ts`): `ClockSettings`, `ClockSave`, `useClockStore` with actions `recordRound(plan, ev, forgiven) → {levelUp}`, `markExplained(id)`, `addGears(n)`, `hangClock(k)`, `seeKind(k)`, `finishWorkday()`, `setRealTimeDay(d)`, `setSettings(s)`, `resetProgress()`, `noteStreak(n)`.
- Produces (`telemetry.ts`): `clockTelemetry` (a `createTelemetry('alef-clock-telemetry')` instance).

- [ ] **Step 1: Write `src/clock/data/lines.ts`**

```ts
// Everything the cuckoo narrator and the customers say, except the time phrases (src/clock/logic/phrases.ts).
// {cue} before a word fires an animation as that word is spoken (rule: things glow when the voice names them).
// Spelling: check every Hebrew word's nikkud in a dictionary before generating (rule). Loaded by plain Node.
import type { Lang } from '../logic/phrases.ts'

export type Cue =
  | 'short' | 'long' | 'seconds' | 'half' | 'quarterRight' | 'quarterLeft' | 'ring' | 'fives' | 'quarters'
  | 'digital' | 'finger' | 'creep' | 'past' | 'to' | 'check'

export interface LineDef {
  id: string
  /** where it plays in the game (shown on the review page) */
  where: string
  he: string
  en: string
  /** ElevenLabs v4 audio tag, e.g. "excited" (needs stability 0) */
  tag?: string
  /** 0 Creative (dramatic), 0.5 Natural (calm), 1 Robust (short) */
  stability: number
  /** the clock the explanation shows, as a time id */
  example?: string
}

export const LINES: LineDef[] = [
  { id: 'welcome', where: 'First launch, on the workshop door', stability: 0.5, tag: 'warmly',
    he: 'בָּרוּךְ הַבָּא לַסַּדְנָה. אַתָּה הַשָּׁעָן.', en: 'Welcome to the workshop. You are the clockmaker.' },
  { id: 'exp-hands', where: 'Explanation: the first round ever', stability: 0.5, example: '3-00',
    he: 'לַשָּׁעוֹן יֵשׁ שְׁנֵי מְחוֹגִים. הַמָּחוֹג {short}הַקָּצָר מַרְאֶה אֶת הַשָּׁעָה. הַמָּחוֹג {long}הָאָרֹךְ מַרְאֶה אֶת הַדַּקּוֹת.',
    en: 'The clock has two hands. The {short}short hand shows the hour. The {long}long hand shows the minutes.' },
  { id: 'exp-level-2', where: 'Explanation: first half past (level 2)', stability: 0.5, example: '3-30',
    he: 'שָׁלוֹשׁ וָחֵצִי: הַמָּחוֹג הָאָרֹךְ עָשָׂה {half}חֲצִי סִיבוּב.', en: 'Half past three: the long hand has gone {half}half way round.' },
  { id: 'exp-level-3', where: 'Explanation: first quarter past (level 3)', stability: 0.5, example: '3-15',
    he: 'שָׁלוֹשׁ וָרֶבַע: הַמָּחוֹג הָאָרֹךְ עָשָׂה {quarterRight}רֶבַע סִיבוּב.', en: 'Quarter past three: the long hand has gone a {quarterRight}quarter of the way round.' },
  { id: 'exp-level-4', where: 'Explanation: first quarter to (level 4)', stability: 0.5, example: '3-45',
    he: 'רֶבַע לְאַרְבַּע: עוֹד {quarterLeft}רֶבַע סִיבוּב, וְתִהְיֶה אַרְבַּע.', en: 'Quarter to four: one more {quarterLeft}quarter of the way round, and it will be four o\'clock.' },
  { id: 'exp-level-5', where: 'Explanation: first five-minute step, past side (level 5)', stability: 0.5, example: '3-20',
    he: 'כָּל מִסְפָּר עַל הַשָּׁעוֹן הוּא {ring}חָמֵשׁ דַּקּוֹת. {fives}חָמֵשׁ, עֶשֶׂר, חֲמֵשׁ־עֶשְׂרֵה, עֶשְׂרִים.',
    en: 'Each number on the clock is {ring}five minutes. {fives}Five, ten, fifteen, twenty.' },
  { id: 'exp-level-6', where: 'Explanation: first five-minute step, to side (level 6)', stability: 0.5, example: '3-50',
    he: 'בַּצַּד {to}הַשֵּׁנִי סוֹפְרִים כַּמָּה דַּקּוֹת חֲסֵרוֹת לַשָּׁעָה הַבָּאָה. עֲשָׂרָה לְאַרְבַּע.',
    en: 'On the {to}other side, we count the minutes left to the next hour. Ten to four.' },
  { id: 'exp-nonumbers', where: 'Explanation: first clock with no numbers (level 6–7)', stability: 0.5, example: '3-00',
    he: 'גַּם בְּלִי מִסְפָּרִים: {quarters}לְמַעְלָה שְׁתֵּים־עֶשְׂרֵה, בַּצַּד שָׁלוֹשׁ, לְמַטָּה שֵׁשׁ, וּבַצַּד הַשֵּׁנִי תֵּשַׁע.',
    en: 'Even with no numbers: {quarters}twelve is at the top, three on the side, six at the bottom, and nine on the other side.' },
  { id: 'exp-ex-find', where: 'Explanation: first Find the clock round', stability: 0.5,
    he: 'תַּקְשִׁיב לַשָּׁעָה, וְתִבְחַר אֶת הַשָּׁעוֹן הַנָּכוֹן.', en: 'Listen to the time, and pick the right clock.' },
  { id: 'exp-ex-what', where: 'Explanation: first What time is it round', stability: 0.5,
    he: 'מָה הַשָּׁעָה? תַּקְשִׁיב לַתְּשׁוּבוֹת, וְתִבְחַר אֶת הַנְּכוֹנָה.', en: 'What time is it? Listen to the answers, and pick the right one.' },
  { id: 'exp-ex-set', where: 'Explanation: first Set the clock round (animated finger)', stability: 0.5,
    he: 'תָּזִיז אֶת הַמָּחוֹג {finger}עִם הָאֶצְבַּע, וְאַחַר כָּךְ תִּלְחַץ {check}עַל הַוִּי.',
    en: 'Move the hand {finger}with your finger. Then press the {check}check mark.' },
  { id: 'exp-ex-digital', where: 'Explanation: first digital clock card', stability: 0.5, example: '3-45',
    he: 'זֶה שָׁעוֹן {digital}דִּיגִיטָלִי. הוּא מַרְאֶה אֶת אוֹתָהּ שָׁעָה בְּמִסְפָּרִים.', en: 'This is a {digital}digital clock. It shows the same time in numbers.' },
  { id: 'exp-seconds', where: 'Explanation: first seconds hand, and after mistakes with it', stability: 0.5, example: '3-00',
    he: 'הַמָּחוֹג {seconds}הַדַּק וְהַמָּהִיר סוֹפֵר שְׁנִיּוֹת. כְּדֵי לָדַעַת מָה הַשָּׁעָה, תִּסְתַּכֵּל עַל {short}שְׁנֵי {long}הָאֲחֵרִים.',
    en: 'The {seconds}thin, fast hand counts seconds. To tell the time, look at the {short}other {long}two.' },
  { id: 'exp-fix-swap', where: 'After repeated mistakes: swapped hands', stability: 0.5, example: '3-00',
    he: 'הַמָּחוֹג {short}הַקָּצָר הוּא הַשָּׁעָה. {long}הָאָרֹךְ הוּא הַדַּקּוֹת.', en: 'The {short}short hand is the hour. The {long}long one is the minutes.' },
  { id: 'exp-fix-notAdvanced', where: 'After repeated mistakes: short hand not moved on', stability: 0.5, example: '3-45',
    he: 'הַמָּחוֹג הַקָּצָר {creep}זָז לְאַט לְאַט לַמִּסְפָּר הַבָּא. כְּשֶׁהוּא בֵּין שָׁלוֹשׁ לְאַרְבַּע, הַשָּׁעָה עוֹד שָׁלוֹשׁ.',
    en: 'The short hand {creep}moves slowly towards the next number. When it is between three and four, it is still three.' },
  { id: 'exp-fix-mirror', where: 'After repeated mistakes: past and to swapped', stability: 0.5, example: '3-15',
    he: 'אַחֲרֵי הַשָּׁעָה, הַמָּחוֹג {past}בַּצַּד הַזֶּה: שָׁלוֹשׁ וָרֶבַע. לִפְנֵי הַשָּׁעָה הַבָּאָה, הוּא {to}בַּצַּד הַזֶּה: רֶבַע לְאַרְבַּע.',
    en: 'Past the hour, the long hand is {past}on this side: quarter past three. Before the next hour, it is {to}on this side: quarter to four.' },
  { id: 'exp-fix-numberAsMin', where: 'After repeated mistakes: the number read as minutes', stability: 0.5, example: '3-20',
    he: 'כְּשֶׁהַמָּחוֹג הָאָרֹךְ עַל אַרְבַּע, סוֹפְרִים {fives}בְּחָמֵשׁ: חָמֵשׁ, עֶשֶׂר, חֲמֵשׁ־עֶשְׂרֵה, עֶשְׂרִים.',
    en: 'When the long hand is on the four, count {fives}by fives: five, ten, fifteen, twenty.' },
  { id: 'exp-fix-hour1', where: 'After repeated mistakes: the hour off by one', stability: 0.5,
    he: 'תִּסְתַּכֵּל טוֹב עַל הַמָּחוֹג {short}הַקָּצָר.', en: 'Look closely at the {short}short hand.' },
  { id: 'exp-fix-five', where: 'After repeated mistakes: five minutes off', stability: 0.5, example: '3-20',
    he: '{fives}תִּסְפֹּר בְּחָמֵשׁ עַד הַמָּחוֹג הָאָרֹךְ.', en: '{fives}Count by fives up to the long hand.' },
  { id: 'fb-almost', where: 'Set the clock: five minutes off, first time (he tries again)', stability: 0.5, tag: 'encouraging',
    he: 'כִּמְעַט.', en: 'Almost.' },
  { id: 'fb-cheer-1', where: 'Correct answer (rotates)', stability: 0, tag: 'happy', he: 'יֹפִי.', en: 'Great.' },
  { id: 'fb-cheer-2', where: 'Correct answer (rotates)', stability: 0, tag: 'happy', he: 'מְעֻלֶּה.', en: 'Well done.' },
  { id: 'fb-cheer-3', where: 'Correct answer (rotates)', stability: 0, tag: 'happy', he: 'בְּדִיּוּק.', en: 'Exactly right.' },
  { id: 'fb-streak', where: 'Ten correct in a row (all wall clocks chime)', stability: 0, tag: 'excited',
    he: 'וָאוּ, עֶשֶׂר בְּרֶצֶף.', en: 'Wow, ten in a row.' },
  { id: 'fb-levelup', where: 'Level passed: the tower gets a new floor', stability: 0, tag: 'excited',
    he: 'בָּנִיתָ קוֹמָה חֲדָשָׁה בַּמִּגְדָּל.', en: 'You built a new floor on the tower.' },
  { id: 'fb-newkind', where: 'Before the first customer with a new kind of clock', stability: 0, tag: 'amazed',
    he: 'תִּרְאֶה, שָׁעוֹן חָדָשׁ.', en: 'Look, a new kind of clock.' },
  { id: 'fb-tower-done', where: 'Level 7 reached: the tower is complete and chimes', stability: 0, tag: 'excited',
    he: 'הַמִּגְדָּל גָּמוּר. כָּל הַכָּבוֹד, אַתָּה שָׁעָן אֲמִתִּי.', en: 'The tower is finished. Well done, you are a real clockmaker.' },
  { id: 'bonus-intro', where: 'Bonus game, first time only', stability: 0.5, tag: 'playfully',
    he: 'תַּעֲצֹר אֶת הַמָּחוֹג עַל הַשְּׁתֵּים־עֶשְׂרֵה.', en: 'Stop the hand on the twelve.' },
  { id: 'day-end', where: 'End of the workday, on the summary', stability: 0, tag: 'happy',
    he: 'יוֹם עֲבוֹדָה נֶהְדָּר.', en: 'What a great day at work.' },
  { id: 'ask-now', where: 'First customer of the day: the real time on the clock', stability: 0.5, tag: 'curious',
    he: 'מָה הַשָּׁעָה עַכְשָׁיו?', en: 'What time is it now?' },
]

const BY_ID = new Map(LINES.map((l) => [l.id, l]))
export const lineById = (id: string) => BY_ID.get(id)

/** Splits a line into caption words and cues; `spoken` is the text without cue marks. */
export function parseLine(text: string): { words: string[]; cues: { word: number; cue: Cue }[]; spoken: string } {
  const words: string[] = []
  const cues: { word: number; cue: Cue }[] = []
  for (const tok of text.split(/\s+/).filter(Boolean)) {
    const m = /^\{(\w+)\}(.*)$/.exec(tok)
    if (m) {
      cues.push({ word: words.length, cue: m[1] as Cue })
      words.push(m[2])
    } else words.push(tok)
  }
  return { words, cues, spoken: words.join(' ') }
}

export const lineAudioId = (id: string, lang: Lang) => `${id}-${lang}`

export const CUSTOMER_LINES: Record<Lang, { hello: string; thanks: string }> = {
  he: { hello: 'שָׁלוֹם, הַשָּׁעוֹן שֶׁלִּי הִתְקַלְקֵל.', thanks: 'תּוֹדָה רַבָּה.' },
  en: { hello: 'Hello. My clock is broken.', thanks: 'Thank you so much.' },
}
export const customerAudioId = (customer: string, what: 'hello' | 'thanks') => `cust-${customer}-${what}`
```

- [ ] **Step 2: Write the failing tests**

`src/clock/data/lines.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { LINES, parseLine } from './lines'

describe('lines', () => {
  it('parses cues onto the following word', () => {
    expect(parseLine('The {short}short hand.')).toEqual({ words: ['The', 'short', 'hand.'], cues: [{ word: 1, cue: 'short' }], spoken: 'The short hand.' })
  })
  it('ids are unique and every line has both languages without "!"', () => {
    expect(new Set(LINES.map((l) => l.id)).size).toBe(LINES.length)
    for (const l of LINES) {
      expect(l.he.length).toBeGreaterThan(0)
      expect(l.en.length).toBeGreaterThan(0)
      expect(l.he + l.en).not.toContain('!')
    }
  })
  it('every explanation id from levels.ts has a line', async () => {
    const ids = ['hands', 'level-2', 'level-3', 'level-4', 'level-5', 'level-6', 'nonumbers', 'ex-find', 'ex-what', 'ex-set', 'ex-digital', 'seconds', 'fix-swap', 'fix-notAdvanced', 'fix-mirror', 'fix-numberAsMin', 'fix-hour1', 'fix-five']
    for (const id of ids) expect(LINES.some((l) => l.id === `exp-${id}`)).toBe(true)
  })
})
```

`src/clock/store.test.ts`:
```ts
import { beforeEach, describe, expect, it } from 'vitest'
import { useClockStore } from './store'
import type { RoundPlan } from './logic/types'

const plan = (over: Partial<RoundPlan> = {}): RoundPlan => ({
  exercise: 'what', time: { h: 3, m: 0 }, isNew: true, lang: 'he', level: 1, kind: 'wall',
  scaffolds: { numbers: 'all', slice: false, ring: false, seconds: false }, options: [], correctIndex: 0,
  families: ['hour1'], linked: false, features: ['m:0', 'ex:what', 'tr:hour1'], predicted: 0.1, ...over,
})
const right = { correct: true, nearMiss: false, tag: null, chosen: { h: 3, m: 0 } }
const wrong = { correct: false, nearMiss: false, tag: 'hour1' as const, chosen: { h: 4, m: 0 } }

describe('clock store', () => {
  beforeEach(() => useClockStore.getState().resetProgress())
  it('records tallies, recent answers and the round number', () => {
    useClockStore.getState().recordRound(plan(), wrong, false)
    const s = useClockStore.getState()
    expect(s.tallies['tr:hour1']).toEqual({ seen: 1, wrong: 1 })
    expect(s.recent['m:0']).toBe('x')
    expect(s.confusions['3-00']['4-00']).toBe(1)
    expect(s.mistakes).toEqual([{ round: 0, tag: 'hour1' }])
    expect(s.roundNo).toBe(1)
  })
  it('five right on new times level up', () => {
    let up = false
    for (let i = 0; i < 5; i++) up = useClockStore.getState().recordRound(plan(), right, false).levelUp
    expect(up).toBe(true)
    expect(useClockStore.getState().progress.level).toBe(2)
  })
  it('a forgiven round does not count toward the level', () => {
    useClockStore.getState().recordRound(plan(), right, true)
    expect(useClockStore.getState().progress.newAnswers).toBe('')
    expect(useClockStore.getState().recent['m:0']).toBe('x')
  })
  it('reset keeps the settings', () => {
    useClockStore.getState().setSettings({ langs: ['en'] })
    useClockStore.getState().addGears(5)
    useClockStore.getState().resetProgress()
    expect(useClockStore.getState().gears).toBe(0)
    expect(useClockStore.getState().settings.langs).toEqual(['en'])
  })
})
```

- [ ] **Step 3: Run** `npx vitest run src/clock/data src/clock/store.test.ts` → FAIL (store missing).

- [ ] **Step 4: Write `src/clock/store.ts`**

```ts
// The clock game's own save (localStorage 'alef-clock'); reset never touches alef's progress.
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'
import { pushRecent, type Tally } from '../shared/adaptive'
import { sameTime, timeId } from './logic/time'
import type { Lang } from './logic/phrases'
import type { Evaluation } from './logic/grade'
import { START_PROGRESS, recordNewAnswer, type ExplainId, type LevelProgress } from './logic/levels'
import type { ClockKind } from './logic/workday'
import type { RoundPlan } from './logic/types'

export interface ClockSettings {
  langs: Lang[]
  /** Hebrew captions alternate print and cursive */
  heCursiveMix: boolean
  /** English captions alternate small letters and capitals */
  enCapsMix: boolean
  sfx: boolean
  music: boolean
  volume: number
}

export interface ClockSave {
  progress: LevelProgress
  tallies: Record<string, Tally>
  recent: Record<string, string>
  confusions: Record<string, Record<string, number>>
  mistakes: { round: number; tag: string }[]
  explained: Partial<Record<ExplainId, number>>
  roundNo: number
  gears: number
  wall: Partial<Record<ClockKind, number>>
  kindsSeen: ClockKind[]
  workdays: number
  bestStreak: number
  lastRealTimeDay: string
  welcomed: boolean
  bonusExplained: boolean
  settings: ClockSettings
}

interface Actions {
  /** One finished round. `forgiven` = he used the near miss: no level answer, a miss for the predictor. */
  recordRound: (plan: RoundPlan, ev: Evaluation, forgiven: boolean) => { levelUp: boolean }
  markExplained: (id: ExplainId) => void
  addGears: (n: number) => void
  hangClock: (k: ClockKind) => void
  seeKind: (k: ClockKind) => void
  finishWorkday: () => void
  setRealTimeDay: (d: string) => void
  setWelcomed: () => void
  setBonusExplained: () => void
  noteStreak: (n: number) => void
  setSettings: (s: Partial<ClockSettings>) => void
  resetProgress: () => void
}

export const DEFAULT_SETTINGS: ClockSettings = { langs: ['he', 'en'], heCursiveMix: true, enCapsMix: true, sfx: true, music: true, volume: 0.8 }
const fresh = (): Omit<ClockSave, 'settings'> => ({
  progress: START_PROGRESS, tallies: {}, recent: {}, confusions: {}, mistakes: [], explained: {}, roundNo: 0,
  gears: 0, wall: {}, kindsSeen: [], workdays: 0, bestStreak: 0, lastRealTimeDay: '', welcomed: false, bonusExplained: false,
})

export const useClockStore = create<ClockSave & Actions>()(
  persist(
    (set, get) => ({
      ...fresh(),
      settings: DEFAULT_SETTINGS,
      recordRound: (plan, ev, forgiven) => {
        const s = get()
        const miss = !ev.correct || forgiven
        const tallies = { ...s.tallies }
        const recent = { ...s.recent }
        for (const f of plan.features) {
          const t = tallies[f] ?? {}
          tallies[f] = { seen: (t.seen ?? 0) + 1, wrong: (t.wrong ?? 0) + (miss ? 1 : 0) }
          recent[f] = pushRecent(recent[f], miss)
        }
        const confusions = { ...s.confusions }
        if (!ev.correct && ev.chosen && !sameTime(ev.chosen, plan.time)) {
          const row = { ...(confusions[timeId(plan.time)] ?? {}) }
          row[timeId(ev.chosen)] = (row[timeId(ev.chosen)] ?? 0) + 1
          confusions[timeId(plan.time)] = row
        }
        const mistakes = !ev.correct && ev.tag ? [...s.mistakes, { round: s.roundNo, tag: ev.tag }].slice(-20) : s.mistakes
        let progress = s.progress
        let levelUp = false
        if (plan.isNew && !forgiven) ({ progress, passed: levelUp } = recordNewAnswer(s.progress, ev.correct))
        set({ tallies, recent, confusions, mistakes, progress, roundNo: s.roundNo + 1 })
        return { levelUp }
      },
      markExplained: (id) => set((s) => ({ explained: { ...s.explained, [id]: s.roundNo } })),
      addGears: (n) => set((s) => ({ gears: s.gears + n })),
      hangClock: (k) => set((s) => ({ wall: { ...s.wall, [k]: (s.wall[k] ?? 0) + 1 } })),
      seeKind: (k) => set((s) => (s.kindsSeen.includes(k) ? s : { kindsSeen: [...s.kindsSeen, k] })),
      finishWorkday: () => set((s) => ({ workdays: s.workdays + 1 })),
      setRealTimeDay: (d) => set({ lastRealTimeDay: d }),
      setWelcomed: () => set({ welcomed: true }),
      setBonusExplained: () => set({ bonusExplained: true }),
      noteStreak: (n) => set((s) => (n > s.bestStreak ? { bestStreak: n } : s)),
      setSettings: (p) => set((s) => ({ settings: { ...s.settings, ...p } })),
      resetProgress: () => set((s) => ({ ...fresh(), settings: s.settings })),
    }),
    { name: 'alef-clock', version: 1, storage: createJSONStorage(() => localStorage) },
  ),
)
```

`src/clock/telemetry.ts`:
```ts
// Clock telemetry (localStorage 'alef-clock-telemetry'), exported from the parent area.
import { createTelemetry } from '../shared/telemetry'
export const clockTelemetry = createTelemetry('alef-clock-telemetry')
```

- [ ] **Step 5: Run** `npx vitest run src/clock` and `npx tsc --noEmit -p .` → PASS / clean.

- [ ] **Step 6: Commit** "Clock: narrator and customer lines, persisted save, telemetry".

---

### Task 9: ClockFace and HandSetter

**Files:**
- Create: `src/clock/components/ClockFace.tsx`, `src/clock/components/ClockFace.test.tsx`, `src/clock/components/HandSetter.tsx`, `src/clock/components/HandSetter.test.tsx`, `src/clock/components/icons.tsx`, `src/clock/assets/images.ts`, `src/clock/assets/img/.gitkeep`

**Interfaces:**
- Consumes: `time.ts` (`HandPose`, `norm`, `angleDelta`), `grade.ts` (`snapMinute`), `workday.ts` (`ClockKind`).
- Produces:
  - `HAND_COLORS = { hour: '#c0392b', minute: '#1f5fa8', second: '#e67e22' }`
  - `ClockFace(props: { pose: HandPose; numbers?: 'all'|'quarters'|'none'; ring?: boolean; slice?: boolean; sectors?: Sector[]; secondsFrom?: number | null; glow?: 'hour'|'minute'|'second'|'quarters'|null; kind?: ClockKind; size: number; glide?: boolean; children?: ReactNode })`; `Sector = { from: number; to: number; color: string }`
  - `angleFromPointer(clientX, clientY, rect): number`
  - `HandSetter(props: { mode: 'short'|'long'|'both'; linked: boolean; initial: HandPose; numbers; ring; slice; kind; size: number; locked: boolean; reveal: HandPose | null; onSubmit(pose: HandPose): void; onSnap?(): void })`
  - `IMAGES: Record<string, string>` (`img/<name>.webp` → url); `Icon` components `CheckIcon`, `SpeakerIcon`, `PlayIcon`, `HomeIcon`, `GearIcon`, `HandShortIcon`, `HandLongIcon`.

- [ ] **Step 1: Write the failing tests**

`src/clock/components/ClockFace.test.tsx`:
```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ClockFace, angleFromPointer } from './ClockFace'

describe('ClockFace', () => {
  it('draws 12 numbers, or 4, or none', () => {
    const count = (n: 'all' | 'quarters' | 'none') =>
      render(<ClockFace pose={{ hour: 90, minute: 0 }} numbers={n} size={200} />).container.querySelectorAll('[data-num]').length
    expect(count('all')).toBe(12)
    expect(count('quarters')).toBe(4)
    expect(count('none')).toBe(0)
  })
  it('rotates the hands to the pose', () => {
    const { container } = render(<ClockFace pose={{ hour: 105, minute: 180 }} size={200} />)
    expect(container.querySelector('[data-hand="hour"]')!.getAttribute('style')).toContain('rotate(105deg)')
    expect(container.querySelector('[data-hand="minute"]')!.getAttribute('style')).toContain('rotate(180deg)')
  })
  it('draws the ring and the seconds hand only when asked', () => {
    const plain = render(<ClockFace pose={{ hour: 0, minute: 0 }} size={200} />).container
    expect(plain.querySelector('[data-ring]')).toBeNull()
    expect(plain.querySelector('[data-hand="second"]')).toBeNull()
    const full = render(<ClockFace pose={{ hour: 0, minute: 0 }} ring secondsFrom={30} size={200} />).container
    expect(full.querySelector('[data-ring]')).not.toBeNull()
    expect(full.querySelector('[data-hand="second"]')).not.toBeNull()
  })
  it('angleFromPointer: 12 is 0°, 3 is 90°', () => {
    const rect = { left: 0, top: 0, width: 200, height: 200 } as DOMRect
    expect(angleFromPointer(100, 0, rect)).toBeCloseTo(0)
    expect(angleFromPointer(200, 100, rect)).toBeCloseTo(90)
    expect(angleFromPointer(0, 100, rect)).toBeCloseTo(270)
  })
})
```

`src/clock/components/HandSetter.test.tsx`:
```tsx
import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { HandSetter } from './HandSetter'

const base = { numbers: 'all' as const, ring: false, slice: false, kind: 'wall' as const, size: 200, locked: false, reveal: null }
const at = (deg: number) => {
  const r = (deg * Math.PI) / 180
  return { clientX: 100 + 80 * Math.sin(r), clientY: 100 - 80 * Math.cos(r), pointerId: 1 }
}

describe('HandSetter', () => {
  beforeEach(() => {
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockReturnValue({ left: 0, top: 0, width: 200, height: 200, right: 200, bottom: 200, x: 0, y: 0, toJSON: () => ({}) } as DOMRect)
  })
  it('long hand follows the finger and snaps to five minutes; the check submits', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="long" linked={false} initial={{ hour: 90, minute: 0 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(100))
    fireEvent.pointerUp(face, at(100))
    fireEvent.click(getByRole('button', { name: 'check' }))
    expect(onSubmit).toHaveBeenCalledWith({ hour: 90, minute: 90 })
  })
  it('both: the short hand first, then the long hand', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="both" linked={false} initial={{ hour: 0, minute: 0 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(97))
    fireEvent.pointerUp(face, at(97))
    fireEvent.pointerDown(face, at(178))
    fireEvent.pointerUp(face, at(178))
    fireEvent.click(getByRole('button', { name: 'check' }))
    const pose = onSubmit.mock.calls[0][0]
    expect(pose.hour).toBeCloseTo(97, 0)
    expect(pose.minute).toBe(180)
  })
  it('linked drag across 12 creeps the short hand forward, not a full turn back', () => {
    const onSubmit = vi.fn()
    const { container, getByRole } = render(<HandSetter {...base} mode="long" linked initial={{ hour: 90, minute: 300 }} onSubmit={onSubmit} />)
    const face = container.querySelector('[data-face-input]')!
    fireEvent.pointerDown(face, at(330))
    fireEvent.pointerMove(face, at(10))
    fireEvent.pointerMove(face, at(60))
    fireEvent.pointerUp(face, at(60))
    fireEvent.click(getByRole('button', { name: 'check' }))
    const pose = onSubmit.mock.calls[0][0]
    expect(pose.minute).toBe(60)
    expect(pose.hour).toBeCloseTo(90 + (120 / 12), 0)
  })
  it('the check is disabled before any move and while locked', () => {
    const { getByRole } = render(<HandSetter {...base} mode="long" linked={false} initial={{ hour: 90, minute: 0 }} onSubmit={() => {}} />)
    expect((getByRole('button', { name: 'check' }) as HTMLButtonElement).disabled).toBe(true)
  })
})
```

- [ ] **Step 2: Run** `npx vitest run src/clock/components` → FAIL.

- [ ] **Step 3: Write `src/clock/assets/images.ts`** and create the empty `src/clock/assets/img/.gitkeep`

```ts
// Workshop art (generated, see asset-sources/clock/). Missing images fall back to simple SVG in the components.
const files = import.meta.glob('./img/*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export const IMAGES: Record<string, string> = Object.fromEntries(
  Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.webp', ''), url]),
)
```

- [ ] **Step 4: Write `src/clock/components/icons.tsx`**

```tsx
// All icons are SVG (rule: no emoji; the old tablet shows missing emoji as squares).
import { HAND_COLORS } from './ClockFace'

type P = { size?: number }
export const CheckIcon = ({ size = 72 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <circle cx="50" cy="50" r="46" fill="#3c8d2f" stroke="#fff" strokeWidth="4" />
    <path d="M28 52 L44 68 L74 34" fill="none" stroke="#fff" strokeWidth="11" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)
export const SpeakerIcon = ({ size = 36 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <path d="M18 38 H36 L58 20 V80 L36 62 H18 Z" fill="#5a3417" />
    <path d="M68 34 Q80 50 68 66 M76 24 Q96 50 76 76" fill="none" stroke="#5a3417" strokeWidth="7" strokeLinecap="round" />
  </svg>
)
export const PlayIcon = ({ size = 96 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <circle cx="50" cy="50" r="46" fill="#3c8d2f" stroke="#fff" strokeWidth="4" />
    <path d="M40 30 L72 50 L40 70 Z" fill="#fff" />
  </svg>
)
export const HomeIcon = ({ size = 48 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <path d="M14 50 L50 18 L86 50 V86 H60 V62 H40 V86 H14 Z" fill="#fff8e7" stroke="#5a3417" strokeWidth="6" strokeLinejoin="round" />
  </svg>
)
export const GearIcon = ({ size = 32 }: P) => (
  <svg viewBox="-50 -50 100 100" width={size} height={size} aria-hidden>
    {Array.from({ length: 8 }, (_, i) => (
      <rect key={i} x="-8" y="-46" width="16" height="20" rx="3" fill="#c99a4b" transform={`rotate(${i * 45})`} />
    ))}
    <circle r="32" fill="#c99a4b" />
    <circle r="12" fill="#7a5222" />
  </svg>
)
export const HandShortIcon = ({ size = 64 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <line x1="50" y1="78" x2="50" y2="40" stroke={HAND_COLORS.hour} strokeWidth="14" strokeLinecap="round" />
    <circle cx="50" cy="78" r="8" fill="#333" />
  </svg>
)
export const HandLongIcon = ({ size = 64 }: P) => (
  <svg viewBox="0 0 100 100" width={size} height={size} aria-hidden>
    <line x1="50" y1="88" x2="50" y2="10" stroke={HAND_COLORS.minute} strokeWidth="8" strokeLinecap="round" />
    <circle cx="50" cy="88" r="7" fill="#333" />
  </svg>
)
```

- [ ] **Step 5: Write `src/clock/components/ClockFace.tsx`**

```tsx
// The clock face: SVG so hands, numbers and scaffolds stay crisp and interactive (spec: Exercises).
// The clock kind's case image (when generated) frames it; until then a plain wooden rim.
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { type HandPose, angleDelta } from '../logic/time'
import type { ClockKind } from '../logic/workday'
import { IMAGES } from '../assets/images'

export const HAND_COLORS = { hour: '#c0392b', minute: '#1f5fa8', second: '#e67e22' }
export interface Sector { from: number; to: number; color: string }

const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180
  return [r * Math.sin(a), -r * Math.cos(a)] as const
}
export function angleFromPointer(clientX: number, clientY: number, rect: Pick<DOMRect, 'left' | 'top' | 'width' | 'height'>) {
  const x = clientX - (rect.left + rect.width / 2)
  const y = clientY - (rect.top + rect.height / 2)
  return ((Math.atan2(x, -y) * 180) / Math.PI + 360) % 360
}
function sectorPath({ from, to }: Sector, r: number) {
  const [x1, y1] = pt(from, r)
  const [x2, y2] = pt(to, r)
  const large = ((to - from + 360) % 360) > 180 ? 1 : 0
  return `M0 0 L${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} Z`
}

/** Keeps a displayed angle continuous, so a glide from 350° to 10° turns 20° forward, not 340° back. */
function useContinuous(angle: number) {
  const ref = useRef(angle)
  ref.current = ref.current + angleDelta(ref.current, angle)
  return ref.current
}

export interface ClockFaceProps {
  pose: HandPose
  numbers?: 'all' | 'quarters' | 'none'
  ring?: boolean
  /** the past (right) / to (left) shading */
  slice?: boolean
  sectors?: Sector[]
  /** a ticking seconds hand starting at this angle; null/undefined = none */
  secondsFrom?: number | null
  glow?: 'hour' | 'minute' | 'second' | 'quarters' | null
  kind?: ClockKind
  size: number
  /** animate hand moves (feedback, explanations) */
  glide?: boolean
  children?: ReactNode
}

export function ClockFace({ pose, numbers = 'all', ring, slice, sectors = [], secondsFrom, glow, kind, size, glide, children }: ClockFaceProps) {
  const hour = useContinuous(pose.hour)
  const minute = useContinuous(pose.minute)
  const [sec, setSec] = useState(secondsFrom ?? 0)
  useEffect(() => {
    if (secondsFrom == null) return
    setSec(secondsFrom)
    const id = window.setInterval(() => setSec((s) => s + 6), 1000)
    return () => window.clearInterval(id)
  }, [secondsFrom])
  const shownNums = numbers === 'all' ? [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11] : numbers === 'quarters' ? [12, 3, 6, 9] : []
  const caseImg = kind ? IMAGES[`case-${kind}`] : undefined
  const handStyle = (deg: number) => ({ transform: `rotate(${deg}deg)`, transition: glide ? 'transform 0.9s ease-in-out' : undefined })
  const glowFilter = (on: boolean) => (on ? 'drop-shadow(0 0 6px #ffd54a) drop-shadow(0 0 12px #ffd54a)' : undefined)

  return (
    <div className="ck-face" style={{ width: size, height: size, position: 'relative' }}>
      {caseImg && <img src={caseImg} alt="" draggable={false} className="ck-case" />}
      <svg viewBox="-110 -110 220 220" width={size} height={size} style={{ position: 'absolute', inset: 0 }}>
        {!caseImg && <circle r="104" fill="#8a5a2b" />}
        <circle r="92" fill="#fff8e7" />
        {slice && (
          <>
            <path d={sectorPath({ from: 0, to: 180, color: '' }, 90)} fill="rgba(255, 196, 120, 0.28)" data-slice="past" />
            <path d={sectorPath({ from: 180, to: 360, color: '' }, 90)} fill="rgba(120, 170, 255, 0.22)" data-slice="to" />
          </>
        )}
        {sectors.map((s, i) => (
          <path key={i} d={sectorPath(s, 90)} fill={s.color} />
        ))}
        {Array.from({ length: 60 }, (_, i) => {
          const big = i % 5 === 0
          const [x1, y1] = pt(i * 6, big ? 80 : 85)
          const [x2, y2] = pt(i * 6, 90)
          return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#5a3417" strokeWidth={big ? 3 : 1} />
        })}
        {shownNums.map((n) => {
          const [x, y] = pt(n * 30, 66)
          const lit = glow === 'quarters' && n % 3 === 0
          return (
            <text key={n} data-num={n} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="700"
              fill={lit ? '#d35400' : '#3b2412'} style={{ filter: glowFilter(lit) }}>
              {n}
            </text>
          )
        })}
        {numbers !== 'all' && glow === 'quarters' &&
          [0, 90, 180, 270].map((a) => {
            const [x, y] = pt(a, 66)
            return <circle key={a} cx={x} cy={y} r="9" fill="#ffd54a" />
          })}
        {ring && (
          <g data-ring>
            {Array.from({ length: 12 }, (_, i) => {
              const [x, y] = pt(i * 30, 101)
              return (
                <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="11" fill="#1f5fa8" fontWeight="700">
                  {String(i * 5).padStart(2, '0')}
                </text>
              )
            })}
          </g>
        )}
        <g data-hand="hour" style={{ ...handStyle(hour), filter: glowFilter(glow === 'hour') }}>
          <line x1="0" y1="10" x2="0" y2="-46" stroke={HAND_COLORS.hour} strokeWidth="10" strokeLinecap="round" />
        </g>
        <g data-hand="minute" style={{ ...handStyle(minute), filter: glowFilter(glow === 'minute') }}>
          <line x1="0" y1="12" x2="0" y2="-74" stroke={HAND_COLORS.minute} strokeWidth="6" strokeLinecap="round" />
        </g>
        {secondsFrom != null && (
          <g data-hand="second" style={{ transform: `rotate(${sec}deg)`, filter: glowFilter(glow === 'second') }}>
            <line x1="0" y1="16" x2="0" y2="-82" stroke={HAND_COLORS.second} strokeWidth="2" strokeLinecap="round" />
          </g>
        )}
        <circle r="7" fill="#333" />
        {children}
      </svg>
    </div>
  )
}
```

Note: the number glyphs are digits only (allowed); there is no circle-dot cluster near numbers except the quarter markers, which appear only during the `nonumbers` explanation (not near captions).

- [ ] **Step 6: Write `src/clock/components/HandSetter.tsx`**

```tsx
// Set the clock (spec: Hand interface). A finger anywhere on the face points the active hand at it — a drag
// or a stroke drawn out from the centre both work. The long hand snaps to five minutes on release.
import { useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { type HandPose, angleDelta, norm } from '../logic/time'
import { snapMinute } from '../logic/grade'
import type { ClockKind } from '../logic/workday'
import { ClockFace, angleFromPointer } from './ClockFace'
import { CheckIcon, HandLongIcon, HandShortIcon } from './icons'

export interface HandSetterProps {
  mode: 'short' | 'long' | 'both'
  linked: boolean
  initial: HandPose
  numbers: 'all' | 'quarters' | 'none'
  ring: boolean
  slice: boolean
  kind: ClockKind
  size: number
  locked: boolean
  /** after a wrong answer: the right pose, the hands glide there */
  reveal: HandPose | null
  onSubmit: (pose: HandPose) => void
  onSnap?: () => void
}

export function HandSetter({ mode, linked, initial, numbers, ring, slice, kind, size, locked, reveal, onSubmit, onSnap }: HandSetterProps) {
  const [pose, setPose] = useState(initial)
  const [active, setActive] = useState<'hour' | 'minute'>(mode === 'long' ? 'minute' : 'hour')
  const [moved, setMoved] = useState(false)
  const dragging = useRef(false)
  const last = useRef(pose)
  last.current = pose

  const apply = (angle: number) => {
    const p = last.current
    if (active === 'minute') {
      const hour = linked ? norm(p.hour + angleDelta(p.minute, angle) / 12) : p.hour
      setPose({ hour, minute: angle })
    } else setPose({ ...p, hour: angle })
    setMoved(true)
  }
  const fromEvent = (e: React.PointerEvent) => angleFromPointer(e.clientX, e.clientY, e.currentTarget.getBoundingClientRect())

  const down = (e: React.PointerEvent) => {
    if (locked) return
    e.currentTarget.setPointerCapture?.(e.pointerId)
    dragging.current = true
    apply(fromEvent(e))
  }
  const move = (e: React.PointerEvent) => {
    if (dragging.current && !locked) apply(fromEvent(e))
  }
  const up = () => {
    if (!dragging.current) return
    dragging.current = false
    if (active === 'minute') {
      const p = last.current
      const snapped = snapMinute(p.minute)
      const hour = linked ? norm(p.hour + angleDelta(p.minute, snapped) / 12) : p.hour
      setPose({ hour, minute: snapped })
      onSnap?.()
    } else if (mode === 'both') setActive('minute')
  }

  const shown = reveal ?? pose
  return (
    <div className="ck-setter">
      <div style={{ position: 'relative', width: size, height: size }}>
        <ClockFace pose={shown} numbers={numbers} ring={ring} slice={slice} kind={kind} size={size} glide={!!reveal}
          glow={reveal ? null : active} />
        <div data-face-input className="ck-face-input" onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
          style={{ position: 'absolute', inset: 0, borderRadius: '50%', touchAction: 'none' }} />
      </div>
      <div className="ck-hand-buttons">
        {mode !== 'long' && (
          <motion.button aria-label="short hand" className={`ck-hand-btn ${active === 'hour' ? 'on' : ''}`}
            onPointerDown={() => !locked && setActive('hour')} animate={active === 'hour' ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={{ repeat: active === 'hour' ? Infinity : 0, duration: 1.2 }}>
            <HandShortIcon />
          </motion.button>
        )}
        {mode !== 'short' && (
          <motion.button aria-label="long hand" className={`ck-hand-btn ${active === 'minute' ? 'on' : ''}`}
            onPointerDown={() => !locked && setActive('minute')} animate={active === 'minute' ? { scale: [1, 1.1, 1] } : { scale: 1 }}
            transition={{ repeat: active === 'minute' ? Infinity : 0, duration: 1.2 }}>
            <HandLongIcon />
          </motion.button>
        )}
        <motion.button aria-label="check" className="ck-check" disabled={locked || !moved}
          animate={moved && !locked ? { scale: [1, 1.08, 1] } : { scale: 1 }} transition={{ repeat: moved ? Infinity : 0, duration: 1.4 }}
          onClick={() => onSubmit({ hour: pose.hour, minute: snapMinute(pose.minute) })}>
          <CheckIcon />
        </motion.button>
      </div>
    </div>
  )
}
```

- [ ] **Step 7: Run** `npx vitest run src/clock/components` → PASS. If jsdom's `fireEvent.pointerDown` does not carry `clientX`, construct the event with `new MouseEvent('pointerdown', { bubbles: true, clientX, clientY })` in a helper inside the test; keep the assertions.

- [ ] **Step 8: Commit** "Clock: SVG clock face and the hand setter".

---

### Task 10: Captions and digital cards

**Files:**
- Create: `src/clock/components/Caption.tsx`, `src/clock/components/Caption.test.tsx`, `src/clock/components/DigitalCard.tsx`, `public/fonts/andika/` (font files)
- Modify: `src/styles/fonts.css` (add Andika)

**Interfaces:**
- Consumes: `phrases.ts` (`Lang`), store settings type.
- Produces: `CaptionScript = 'print'|'cursive'|'small'|'caps'`; `scriptFor(lang, roundNo, langCount, settings)`; `displayWord(word, script)`; `Caption(props: { words: string[]; lang: Lang; script: CaptionScript; active: number; size?: 'prompt'|'card'|'explain'; onTap?: () => void })`; `DigitalCard(props: { text: string; size?: number; glow?: boolean })`.

- [ ] **Step 1: Write the failing test** `src/clock/components/Caption.test.tsx`

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Caption, displayWord, scriptFor } from './Caption'

const settings = { heCursiveMix: true, enCapsMix: true }

describe('Caption', () => {
  it('scripts alternate per language round', () => {
    expect([0, 2, 4, 6].map((r) => scriptFor('he', r, 2, settings))).toEqual(['print', 'cursive', 'print', 'cursive'])
    expect([1, 3, 5].map((r) => scriptFor('en', r, 2, settings))).toEqual(['small', 'caps', 'small'])
    expect(scriptFor('en', 3, 2, { heCursiveMix: true, enCapsMix: false })).toBe('small')
  })
  it('English small has no capital at all; caps are all capitals', () => {
    expect(displayWord('Hello.', 'small')).toBe('hello.')
    expect(displayWord("o'clock", 'caps')).toBe("O'CLOCK")
  })
  it('marks spoken words and the active word, with the language direction', () => {
    const { container } = render(<Caption words={['רֶבַע', 'לְאַרְבַּע']} lang="he" script="print" active={1} />)
    const root = container.querySelector('[data-caption]')!
    expect(root.getAttribute('dir')).toBe('rtl')
    const spans = root.querySelectorAll('span')
    expect(spans[0].className).toContain('said')
    expect(spans[1].className).toContain('now')
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Add the English font.** Download Andika (SIL OFL, designed for beginning readers) into `public/fonts/andika/`:

```bash
mkdir -p public/fonts/andika
curl -fsSL -o /tmp/andika.zip https://github.com/silnrsi/font-andika/releases/download/v7.000/Andika-7.000.zip \
  && unzip -o -j /tmp/andika.zip '*/web/Andika-Regular.woff2' '*/OFL.txt' -d public/fonts/andika/
ls public/fonts/andika
```

If the download fails, find the current release asset at `https://github.com/silnrsi/font-andika/releases` and use its `web/Andika-Regular.woff2`. Append to `src/styles/fonts.css`:

```css
/* Andika - SIL font for beginning readers (OFL), used for English read-along captions in the clock game */
@font-face {
  font-family: 'Andika';
  src: url('/fonts/andika/Andika-Regular.woff2') format('woff2');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}
```

- [ ] **Step 4: Write `src/clock/components/Caption.tsx`**

```tsx
// Read-along caption (rule: text may show while the voice speaks it, each word glowing as it is said).
// Smaller and fainter than the clock. Hebrew alternates print (Sigalit, with nikkud) and cursive (Dana Yad);
// English alternates all small (no capital, not even the first letter) and ALL CAPS.
import type { Lang } from '../logic/phrases'

export type CaptionScript = 'print' | 'cursive' | 'small' | 'caps'

export function scriptFor(lang: Lang, roundNo: number, langCount: number, s: { heCursiveMix: boolean; enCapsMix: boolean }): CaptionScript {
  const alt = Math.floor(roundNo / Math.max(1, langCount)) % 2 === 1
  if (lang === 'he') return s.heCursiveMix && alt ? 'cursive' : 'print'
  return s.enCapsMix && alt ? 'caps' : 'small'
}

export const displayWord = (w: string, script: CaptionScript) =>
  script === 'caps' ? w.toUpperCase() : script === 'small' ? w.toLowerCase() : w

const FONT: Record<CaptionScript, string> = {
  print: "'Sigalit', 'David', serif",
  cursive: "'Dana Yad', cursive",
  small: "'Andika', system-ui, sans-serif",
  caps: "'Andika', system-ui, sans-serif",
}

export interface CaptionProps {
  words: string[]
  lang: Lang
  script: CaptionScript
  /** index of the word being spoken; -1 = none yet; >= words.length = all said */
  active: number
  size?: 'prompt' | 'card' | 'explain'
  onTap?: () => void
}

export function Caption({ words, lang, script, active, size = 'prompt', onTap }: CaptionProps) {
  return (
    <div data-caption dir={lang === 'he' ? 'rtl' : 'ltr'} lang={lang} className={`ck-caption ck-caption-${size}`}
      style={{ fontFamily: FONT[script] }} onPointerDown={onTap}>
      {words.map((w, i) => (
        <span key={i} className={i === active ? 'now' : i < active ? 'said' : ''}>
          {displayWord(w, script)}
        </span>
      ))}
    </div>
  )
}
```

`src/clock/components/DigitalCard.tsx`:
```tsx
// A digital clock card: digits only (he reads digits), LCD style.
export function DigitalCard({ text, size = 1, glow = false }: { text: string; size?: number; glow?: boolean }) {
  return (
    <div data-digital className={`ck-digital ${glow ? 'glow' : ''}`} style={{ fontSize: `${2.6 * size}rem` }} dir="ltr">
      {text}
    </div>
  )
}
```

- [ ] **Step 5: Run** `npx vitest run src/clock/components` → PASS.

- [ ] **Step 6: Commit** "Clock: read-along captions, digital cards and the Andika font".

---

### Task 11: Clock audio

**Files:**
- Create: `src/clock/assets/audioFiles.ts`, `src/clock/assets/voiceWords.json` (`{}`), `src/clock/assets/audio/voice/.gitkeep`, `src/clock/assets/audio/sfx/.gitkeep`, `src/clock/assets/audio/music/.gitkeep`, `src/clock/audio/clockAudio.ts`, `src/clock/audio/clockAudio.test.ts`, `src/clock/assets/assets.test.ts`

**Interfaces:**
- Consumes: `src/shared/audioCore.ts`, `workday.ts` (`ClockSfx`).
- Produces: `VOICE_URLS`, `VOICE_WORDS: Record<string, number[]>` (start time in seconds at 1.0× of each caption word), `SFX_URLS: Record<string, string[]>`, `MUSIC_URLS: string[]`; `configureClockAudio({sfx, music, volume})`, `unlockClockAudio()`, `preloadVoices(ids)`, `playVoice(id, onWord?) → Promise<void>`, `stopVoices()`, `playSfx(name) → Promise<void>`, `startMusic(day)`, `stopMusic()`, `muteClockAudio(on)`, `WORD_ESTIMATE_S = 0.45`.

- [ ] **Step 1: Write the failing tests**

`src/clock/audio/clockAudio.test.ts`:
```ts
import { describe, expect, it, vi } from 'vitest'
import { playSfx, playVoice } from './clockAudio'

describe('clockAudio', () => {
  it('playVoice resolves for an unknown id and reports every word', async () => {
    vi.useFakeTimers()
    const words: number[] = []
    const p = playVoice('ph-he-99-99', (i) => words.push(i), 3)
    await vi.runAllTimersAsync()
    await p
    expect(words).toEqual([0, 1, 2])
    vi.useRealTimers()
  })
  it('playSfx resolves for a missing effect', async () => {
    await expect(playSfx('cuckoo')).resolves.toBeUndefined()
  })
})
```

`src/clock/assets/assets.test.ts`:
```ts
import { describe, expect, it } from 'vitest'
import { HOURS, MINUTES } from '../logic/time'
import { LANGS, phrase } from '../logic/phrases'
import { LINES, lineAudioId, customerAudioId } from '../data/lines'
import { CUSTOMERS } from '../logic/workday'
import { VOICE_URLS, VOICE_WORDS } from './audioFiles'

const known = new Set<string>([
  ...HOURS.flatMap((h) => MINUTES.flatMap((m) => LANGS.map((l) => phrase({ h, m }, l).audioId))),
  ...LINES.flatMap((l) => LANGS.map((lang) => lineAudioId(l.id, lang))),
  ...CUSTOMERS.flatMap((c) => [customerAudioId(c.id, 'hello'), customerAudioId(c.id, 'thanks')]),
])

describe('clock assets', () => {
  it('every voice file belongs to a known line (files arrive progressively, so none may be missing yet)', () => {
    for (const id of Object.keys(VOICE_URLS)) expect(known.has(id), id).toBe(true)
  })
  it('word timings exist only for files, and are ascending', () => {
    for (const [id, t] of Object.entries(VOICE_WORDS)) {
      expect(VOICE_URLS[id], id).toBeTruthy()
      for (let i = 1; i < t.length; i++) expect(t[i]).toBeGreaterThanOrEqual(t[i - 1])
    }
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Write `src/clock/assets/audioFiles.ts`** (and the `.gitkeep` files, and `voiceWords.json` containing `{}`)

```ts
// Clock game audio, generated host-locally and copied in by the pipeline's sync script (asset-sources/clock/).
// Files arrive progressively: anything missing simply does not play.
import words from './voiceWords.json'

const byName = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.mp3', ''), url]))

export const VOICE_URLS: Record<string, string> = byName(
  import.meta.glob('./audio/voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
)
/** Start time (s, at normal speed, after trimming) of each caption word. */
export const VOICE_WORDS: Record<string, number[]> = words as Record<string, number[]>

const sfx = byName(import.meta.glob('./audio/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
/** Effect name → its approved takes (files "<name>-<n>.mp3" rotate). */
export const SFX_URLS: Record<string, string[]> = {}
for (const [file, url] of Object.entries(sfx)) {
  const name = file.replace(/-\d+$/, '')
  ;(SFX_URLS[name] ??= []).push(url)
}
export const MUSIC_URLS: string[] = Object.values(
  import.meta.glob('./audio/music/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
)
```

- [ ] **Step 4: Write `src/clock/audio/clockAudio.ts`**

```ts
// Clock audio: voice on html5 audio at VOICE_RATE (pitch kept) with a callback per caption word; effects and
// calm music on Web Audio. Music ducks under every voice line. Missing files resolve at once (never stall).
import { Howler } from 'howler'
import { VOICE_RATE, getHowl, peekHowl, playOnce, unlockAudio } from '../../shared/audioCore'
import { MUSIC_URLS, SFX_URLS, VOICE_URLS, VOICE_WORDS } from '../assets/audioFiles'
import type { ClockSfx } from '../logic/workday'

const MUSIC_VOL = 0.3
const DUCK_VOL = 0.08
const LINE_TIMEOUT_MS = 12000
const SFX_TIMEOUT_MS = 4000
/** Word spacing assumed when a line has no timings yet (s). */
export const WORD_ESTIMATE_S = 0.45

let cfg = { sfx: true, music: true, volume: 0.8 }
export function configureClockAudio(o: { sfx: boolean; music: boolean; volume: number }) {
  cfg = o
  Howler.volume(o.volume)
  if (!o.music) stopMusic()
}
export const unlockClockAudio = unlockAudio
export const muteClockAudio = (on: boolean) => Howler.mute(on)

export function preloadVoices(ids: string[]) {
  for (const id of ids) if (VOICE_URLS[id]) getHowl(VOICE_URLS[id], false, true)
}

/**
 * Plays a voice line; `onWord(i)` fires as caption word i is spoken (from the timings, or estimated).
 * `wordCount` is used when there are no timings. Every word fires by the end, even if the file is missing.
 */
export function playVoice(id: string, onWord?: (i: number) => void, wordCount = 0): Promise<void> {
  const times = VOICE_WORDS[id] ?? Array.from({ length: wordCount }, (_, i) => i * WORD_ESTIMATE_S)
  const fired = new Set<number>()
  const fire = (i: number) => {
    if (fired.has(i) || !onWord) return
    fired.add(i)
    onWord(i)
  }
  const fireRest = () => times.forEach((_, i) => fire(i))
  const url = VOICE_URLS[id]
  if (!url) {
    // no file yet: walk the caption at the estimated pace so the child still sees it read
    return new Promise((resolve) => {
      times.forEach((t, i) => window.setTimeout(() => fire(i), (t / VOICE_RATE) * 1000))
      window.setTimeout(() => {
        fireRest()
        resolve()
      }, ((times.at(-1) ?? 0) / VOICE_RATE) * 1000 + 300)
    })
  }
  duck(true)
  const timers = times.map((t, i) => window.setTimeout(() => fire(i), (t / VOICE_RATE) * 1000))
  return playOnce(getHowl(url, false, true), VOICE_RATE, LINE_TIMEOUT_MS).finally(() => {
    timers.forEach((t) => window.clearTimeout(t))
    fireRest()
    duck(false)
  })
}

export function stopVoices() {
  Object.values(VOICE_URLS).forEach((u) => peekHowl(u)?.stop())
}

const lastSfx: Record<string, number> = {}
/** Plays an effect; approved takes rotate. */
export function playSfx(name: ClockSfx): Promise<void> {
  const takes = SFX_URLS[name]
  if (!cfg.sfx || !takes?.length) return Promise.resolve()
  const i = ((lastSfx[name] ?? -1) + 1) % takes.length
  lastSfx[name] = i
  const h = getHowl(takes[i])
  h.volume(0.8)
  return playOnce(h, 1, SFX_TIMEOUT_MS)
}

let music: ReturnType<typeof getHowl> | null = null
let ducks = 0
/** Starts the calm workshop music; each workday moves to the next track. */
export function startMusic(day: number) {
  if (!cfg.music || MUSIC_URLS.length === 0) return
  stopMusic()
  music = getHowl(MUSIC_URLS[day % MUSIC_URLS.length], true)
  music.volume(0)
  music.play()
  music.fade(0, ducks > 0 ? DUCK_VOL : MUSIC_VOL, 800)
}
export function stopMusic() {
  if (!music) return
  const h = music
  music = null
  h.fade(h.volume(), 0, 300)
  window.setTimeout(() => h.stop(), 320)
}
function duck(on: boolean) {
  ducks = Math.max(0, ducks + (on ? 1 : -1))
  if (music?.playing()) music.fade(music.volume(), ducks > 0 ? DUCK_VOL : MUSIC_VOL, 200)
}
```

- [ ] **Step 5: Run** `npx vitest run src/clock` and `npx tsc --noEmit -p .` → PASS / clean. (If `resolveJsonModule` complains about the JSON import, it is already enabled in `tsconfig.json`.)

- [ ] **Step 6: Commit** "Clock: audio layer with word-timed callbacks and progressive asset manifests".

---

### Task 12: Exercise components

**Files:**
- Create: `src/clock/components/ChoiceExercise.tsx`, `src/clock/components/SetExercise.tsx`, `src/clock/components/exercises.test.tsx`

**Interfaces:**
- Consumes: Tasks 3–11.
- Produces:
  - `TEST_HOOKS = import.meta.env.MODE === 'test' || import.meta.env.VITE_CLOCK_TEST === '1'` (exported from `ChoiceExercise.tsx`)
  - `ChoiceExercise(props: { plan: RoundPlan; script: CaptionScript; locked: boolean; glowCard: number | null; word: { target: 'prompt' | number; index: number } | null; reveal: { chosen: number; correct: number } | null; onChoose(i: number): void; onReplay(target: 'prompt' | number): void; size: number })`
  - `SetExercise(props: { plan: RoundPlan; script: CaptionScript; locked: boolean; word: { target: 'prompt'; index: number } | null; reveal: HandPose | null; onSubmit(pose: HandPose): void; onReplay(): void; onSnap(): void; size: number })`
  - `initialPose(plan): HandPose`, `setterMode(e): 'short'|'long'|'both'`

- [ ] **Step 1: Write the failing test** `src/clock/components/exercises.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { ChoiceExercise } from './ChoiceExercise'
import { SetExercise, initialPose, setterMode } from './SetExercise'
import { planRound } from '../logic/rounds'

const mk = (exercise: Parameters<typeof planRound>[0]['forcedExercise'], level = 3) =>
  planRound({ level, lang: 'en', rng: Math.random, tallies: {}, recent: {}, confusions: {}, forcedExercise: exercise })

describe('ChoiceExercise', () => {
  for (const ex of ['find', 'what', 'digitalPick'] as const)
    it(`${ex}: three options, the right one marked in test builds, taps choose`, () => {
      const plan = mk(ex)
      const onChoose = vi.fn()
      const { container } = render(
        <ChoiceExercise plan={plan} script="small" locked={false} glowCard={null} word={null} reveal={null} onChoose={onChoose} onReplay={() => {}} size={600} />,
      )
      const opts = container.querySelectorAll('[data-option]')
      expect(opts).toHaveLength(3)
      fireEvent.pointerDown(container.querySelector('[data-correct="1"]')!)
      expect(onChoose).toHaveBeenCalledWith(plan.correctIndex)
    })
  it('ignores taps while locked', () => {
    const onChoose = vi.fn()
    const { container } = render(
      <ChoiceExercise plan={mk('what')} script="small" locked glowCard={0} word={null} reveal={null} onChoose={onChoose} onReplay={() => {}} size={600} />,
    )
    fireEvent.pointerDown(container.querySelectorAll('[data-option]')[0])
    expect(onChoose).not.toHaveBeenCalled()
  })
  it('the speaker button replays without choosing', () => {
    const onChoose = vi.fn()
    const onReplay = vi.fn()
    const { getAllByRole } = render(
      <ChoiceExercise plan={mk('what')} script="small" locked={false} glowCard={null} word={null} reveal={null} onChoose={onChoose} onReplay={onReplay} size={600} />,
    )
    fireEvent.pointerDown(getAllByRole('button', { name: 'listen' })[1])
    expect(onReplay).toHaveBeenCalledWith(1)
    expect(onChoose).not.toHaveBeenCalled()
  })
})

describe('SetExercise', () => {
  it('modes and initial poses', () => {
    expect(setterMode('setShort')).toBe('short')
    expect(setterMode('digitalSet')).toBe('both')
    const p = mk('setLong', 2)
    expect(initialPose(p)).toEqual({ hour: (p.time.h % 12) * 30, minute: 0 })
  })
  it('shows a digital card for digitalSet and a caption otherwise', () => {
    const d = render(<SetExercise plan={mk('digitalSet', 5)} script="small" locked={false} word={null} reveal={null} onSubmit={() => {}} onReplay={() => {}} onSnap={() => {}} size={500} />)
    expect(d.container.querySelector('[data-digital]')).not.toBeNull()
    const s = render(<SetExercise plan={mk('setBoth', 5)} script="small" locked={false} word={null} reveal={null} onSubmit={() => {}} onReplay={() => {}} onSnap={() => {}} size={500} />)
    expect(s.container.querySelector('[data-caption]')).not.toBeNull()
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Write `src/clock/components/ChoiceExercise.tsx`**

```tsx
// Find the clock · What time is it · Clock → digital (spec: Exercises 1, 2, 4).
import { motion } from 'framer-motion'
import { phrase } from '../logic/phrases'
import { poseOf } from '../logic/time'
import type { RoundPlan } from '../logic/types'
import { ClockFace } from './ClockFace'
import { Caption, type CaptionScript } from './Caption'
import { DigitalCard } from './DigitalCard'
import { SpeakerIcon } from './icons'

export const TEST_HOOKS = import.meta.env.MODE === 'test' || import.meta.env.VITE_CLOCK_TEST === '1'

export interface ChoiceExerciseProps {
  plan: RoundPlan
  script: CaptionScript
  locked: boolean
  /** the card being read aloud (What time is it) */
  glowCard: number | null
  word: { target: 'prompt' | number; index: number } | null
  reveal: { chosen: number; correct: number } | null
  onChoose: (i: number) => void
  onReplay: (target: 'prompt' | number) => void
  size: number
}

const wordAt = (word: ChoiceExerciseProps['word'], target: 'prompt' | number) => (word && word.target === target ? word.index : -1)

export function ChoiceExercise({ plan, script, locked, glowCard, word, reveal, onChoose, onReplay, size }: ChoiceExerciseProps) {
  const { exercise, options, lang, scaffolds, kind } = plan
  const face = { numbers: scaffolds.numbers, ring: scaffolds.ring, slice: scaffolds.slice, kind }
  const choose = (i: number) => {
    if (!locked && !reveal) onChoose(i)
  }
  const state = (i: number) => (reveal ? (i === reveal.correct ? 'right' : i === reveal.chosen ? 'wrong' : 'dim') : glowCard === i ? 'reading' : '')
  const optionProps = (i: number) => ({
    'data-option': i,
    ...(TEST_HOOKS ? { 'data-correct': i === plan.correctIndex ? '1' : '0' } : {}),
    className: `ck-option ${state(i)}`,
    onPointerDown: () => choose(i),
    animate: state(i) === 'wrong' ? { x: [0, -10, 10, -6, 6, 0] } : state(i) === 'right' ? { scale: [1, 1.08, 1] } : { scale: glowCard === i ? 1.05 : 1 },
    transition: { duration: 0.5 },
  })

  if (exercise === 'find') {
    const p = phrase(plan.time, lang)
    return (
      <div className="ck-ex ck-ex-find">
        <Caption words={p.words} lang={lang} script={script} active={wordAt(word, 'prompt')} onTap={() => onReplay('prompt')} />
        <div className="ck-shelf">
          {options.map((o, i) => (
            <motion.div key={i} {...optionProps(i)}>
              <ClockFace pose={o.pose} {...face} size={size * 0.28}
                secondsFrom={scaffolds.seconds ? (o.pose.second ?? (i * 97) % 360) : null} />
            </motion.div>
          ))}
        </div>
      </div>
    )
  }

  const main = (
    <ClockFace pose={poseOf(plan.time)} {...face} size={size * 0.5} secondsFrom={scaffolds.seconds ? (plan.secondsAt ?? 0) : null} />
  )
  if (exercise === 'what')
    return (
      <div className="ck-ex ck-ex-what">
        {main}
        <div className="ck-cards">
          {options.map((o, i) => {
            const p = phrase(o.time!, lang)
            return (
              <motion.div key={i} {...optionProps(i)}>
                <Caption words={p.words} lang={lang} script={script} active={wordAt(word, i)} size="card" />
                <button aria-label="listen" className="ck-listen"
                  onPointerDown={(e) => { e.stopPropagation(); onReplay(i) }}>
                  <SpeakerIcon />
                </button>
              </motion.div>
            )
          })}
        </div>
      </div>
    )

  return (
    <div className="ck-ex ck-ex-digital">
      {main}
      <div className="ck-cards">
        {options.map((o, i) => (
          <motion.div key={i} {...optionProps(i)}>
            <DigitalCard text={o.digital} />
          </motion.div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Write `src/clock/components/SetExercise.tsx`**

```tsx
// Set the clock, by voice or by a digital card (spec: Exercise 3, Variants by level).
import { phrase } from '../logic/phrases'
import { digital, type HandPose } from '../logic/time'
import type { Exercise, RoundPlan } from '../logic/types'
import { Caption, type CaptionScript } from './Caption'
import { DigitalCard } from './DigitalCard'
import { HandSetter } from './HandSetter'

export const setterMode = (e: Exercise): 'short' | 'long' | 'both' => (e === 'setShort' ? 'short' : e === 'setLong' ? 'long' : 'both')

/** Level 1: long hand on 12, short hand away from the answer. Level 2: short hand on the hour. Else 12:00. */
export function initialPose(plan: RoundPlan): HandPose {
  if (plan.exercise === 'setShort') return { hour: ((plan.time.h % 12) * 30 + 150) % 360, minute: 0 }
  if (plan.exercise === 'setLong') return { hour: (plan.time.h % 12) * 30, minute: 0 }
  return { hour: 0, minute: 0 }
}

export interface SetExerciseProps {
  plan: RoundPlan
  script: CaptionScript
  locked: boolean
  word: { target: 'prompt'; index: number } | null
  reveal: HandPose | null
  onSubmit: (pose: HandPose) => void
  onReplay: () => void
  onSnap: () => void
  size: number
}

export function SetExercise({ plan, script, locked, word, reveal, onSubmit, onReplay, onSnap, size }: SetExerciseProps) {
  const p = phrase(plan.time, plan.lang)
  return (
    <div className="ck-ex ck-ex-set">
      {plan.exercise === 'digitalSet' ? (
        <DigitalCard text={digital(plan.time.h, plan.time.m)} />
      ) : (
        <Caption words={p.words} lang={plan.lang} script={script} active={word ? word.index : -1} onTap={onReplay} />
      )}
      <HandSetter key={`${plan.time.h}-${plan.time.m}-${plan.exercise}`} mode={setterMode(plan.exercise)} linked={plan.linked}
        initial={initialPose(plan)} numbers={plan.scaffolds.numbers} ring={plan.scaffolds.ring} slice={plan.scaffolds.slice}
        kind={plan.kind} size={size * 0.55} locked={locked} reveal={reveal} onSubmit={onSubmit} onSnap={onSnap} />
    </div>
  )
}
```

- [ ] **Step 5: Run** `npx vitest run src/clock/components` → PASS.

- [ ] **Step 6: Commit** "Clock: exercise components (choice and set the clock)".

---

### Task 13: Explanation player

**Files:**
- Create: `src/clock/components/ExplainPlayer.tsx`, `src/clock/components/ExplainPlayer.test.tsx`

**Interfaces:**
- Consumes: `lines.ts` (`Cue`, `lineById`, `parseLine`), `ClockFace`, `Caption`, `DigitalCard`, `time.ts`.
- Produces: `ExplainPlayer(props: { id: ExplainId; lang: Lang; script: CaptionScript; word: number; cues: Cue[]; fallback: ClockTime; size: number })` — purely presentational; the controller passes the cues fired so far. `explainLineId(id: ExplainId) => 'exp-' + id`.

- [ ] **Step 1: Write the failing test** `src/clock/components/ExplainPlayer.test.tsx`

```tsx
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { ExplainPlayer } from './ExplainPlayer'

describe('ExplainPlayer', () => {
  it('glows the short hand on its cue and shows the caption', () => {
    const { container } = render(<ExplainPlayer id="hands" lang="en" script="small" word={4} cues={['short']} fallback={{ h: 3, m: 0 }} size={400} />)
    expect(container.querySelector('[data-hand="hour"]')!.getAttribute('style')).toContain('drop-shadow')
    expect(container.querySelector('[data-caption]')!.textContent).toContain('short')
  })
  it('half fills the right half and moves the long hand to 6', () => {
    const { container } = render(<ExplainPlayer id="level-2" lang="he" script="print" word={6} cues={['half']} fallback={{ h: 3, m: 0 }} size={400} />)
    expect(container.querySelector('[data-hand="minute"]')!.getAttribute('style')).toContain('rotate(180deg)')
  })
  it('digital cue shows a digital card', () => {
    const { container } = render(<ExplainPlayer id="ex-digital" lang="en" script="small" word={4} cues={['digital']} fallback={{ h: 3, m: 45 }} size={400} />)
    expect(container.querySelector('[data-digital]')!.textContent).toBe('3:45')
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Write `src/clock/components/ExplainPlayer.tsx`**

```tsx
// A narrated explanation (rule: explain new elements and repeated mistakes). Each cue fires when its word is
// spoken, so the thing named glows or moves at that moment.
import { motion } from 'framer-motion'
import { lineById, parseLine, type Cue } from '../data/lines'
import type { ExplainId } from '../logic/levels'
import type { Lang } from '../logic/phrases'
import { type ClockTime, type HandPose, digital, parseTimeId, poseOf } from '../logic/time'
import { ClockFace, type Sector } from './ClockFace'
import { Caption, type CaptionScript } from './Caption'
import { DigitalCard } from './DigitalCard'
import { CheckIcon } from './icons'

export const explainLineId = (id: ExplainId) => `exp-${id}`

export interface ExplainPlayerProps {
  id: ExplainId
  lang: Lang
  script: CaptionScript
  /** caption word being spoken */
  word: number
  /** cues fired so far, in order */
  cues: Cue[]
  /** the clock to show when the line has no example time (the current round's time) */
  fallback: ClockTime
  size: number
}

export function ExplainPlayer({ id, lang, script, word, cues, fallback, size }: ExplainPlayerProps) {
  const line = lineById(explainLineId(id))!
  const { words } = parseLine(line[lang])
  const t = line.example ? parseTimeId(line.example) : fallback
  const has = (c: Cue) => cues.includes(c)
  const lastCue = cues.at(-1)

  let pose: HandPose = poseOf(t)
  const sectors: Sector[] = []
  if (id === 'level-2' || id === 'level-3' || id === 'level-4' || id === 'level-6') pose = poseOf({ h: t.h, m: 0 })
  if (has('half')) { pose = poseOf({ h: t.h, m: 30 }); sectors.push({ from: 0, to: 180, color: 'rgba(255, 196, 120, 0.45)' }) }
  if (has('quarterRight')) { pose = poseOf({ h: t.h, m: 15 }); sectors.push({ from: 0, to: 90, color: 'rgba(255, 196, 120, 0.45)' }) }
  if (has('quarterLeft')) { pose = poseOf({ h: t.h, m: 45 }); sectors.push({ from: 270, to: 360, color: 'rgba(120, 170, 255, 0.45)' }) }
  if (has('to') && id === 'level-6') pose = poseOf(t)
  if (has('past')) sectors.push({ from: 0, to: 180, color: 'rgba(255, 196, 120, 0.4)' })
  if (has('to')) sectors.push({ from: 180, to: 360, color: 'rgba(120, 170, 255, 0.4)' })
  if (has('fives')) pose = { ...pose, minute: Math.min(4, Math.max(1, word - words.findIndex((_, i) => i >= 0) - 3)) * 30 }
  if (has('creep')) pose = poseOf(t)
  else if (id === 'fix-notAdvanced') pose = poseOf({ h: t.h, m: 0 })

  const glow = lastCue === 'short' ? 'hour' : lastCue === 'long' ? 'minute' : lastCue === 'seconds' ? 'second' : lastCue === 'quarters' ? 'quarters' : null
  return (
    <div className="ck-explain">
      <div className="ck-explain-row">
        <ClockFace pose={pose} sectors={sectors} glow={glow} glide size={size * 0.55}
          numbers={id === 'nonumbers' ? 'none' : 'all'} ring={has('ring') || has('fives')}
          secondsFrom={has('seconds') ? 0 : null} />
        {has('digital') && <DigitalCard text={digital(t.h, t.m)} glow />}
        {has('check') && (
          <motion.div animate={{ scale: [1, 1.15, 1] }} transition={{ repeat: Infinity, duration: 1 }}>
            <CheckIcon />
          </motion.div>
        )}
      </div>
      {has('finger') && <FingerDemo size={size * 0.55} />}
      <Caption words={words} lang={lang} script={script} active={word} size="explain" />
    </div>
  )
}

/** An animated finger that drags round the face (first Set the clock). */
function FingerDemo({ size }: { size: number }) {
  const r = size * 0.32
  return (
    <motion.svg viewBox="0 0 60 80" width={56} height={74} className="ck-finger" style={{ position: 'absolute' }}
      animate={{ x: [0, r, r * 0.7, 0], y: [-r, -r * 0.2, r * 0.6, -r] }} transition={{ repeat: Infinity, duration: 2.6, ease: 'easeInOut' }}>
      <path d="M22 4 Q30 0 34 6 L36 40 L46 36 Q56 36 54 48 L48 70 Q44 78 34 78 L22 78 Q12 76 10 64 L8 44 Q8 36 16 38 L20 42 Z"
        fill="#ffd9b3" stroke="#7a5222" strokeWidth="3" />
    </motion.svg>
  )
}
```

The `fives` cue steps the long hand one number per spoken word after the cue (five → 1, ten → 2, fifteen → 3, twenty → 4). Replace the `has('fives')` line with this exact computation, which uses the cue's word index from `parseLine`:

```ts
  const fivesAt = parseLine(line[lang]).cues.find((c) => c.cue === 'fives')?.word
  if (has('fives') && fivesAt !== undefined) pose = { ...pose, minute: Math.min(4, Math.max(1, word - fivesAt + 1)) * 30 }
```

- [ ] **Step 4: Run** `npx vitest run src/clock/components/ExplainPlayer.test.tsx` → PASS.

- [ ] **Step 5: Commit** "Clock: narrated explanation player with word cues".

---

### Task 14: The workday controller and the Workshop screen

**Files:**
- Create: `src/clock/useWorkday.ts`, `src/clock/screens/Workshop.tsx`, `src/clock/screens/Workshop.test.tsx`, `src/clock/components/Customer.tsx`, `src/clock/components/Tower.tsx`, `src/clock/components/Wall.tsx`, `src/clock/components/PauseCover.tsx`

**Interfaces:**
- Consumes: everything above.
- Produces:
  - `Phase = 'enter'|'explain'|'ask'|'answer'|'feedback'|'levelup'|'leave'|'bonus'|'summary'`
  - `useWorkday(opts: { rng?: Rng; now?: () => Date }) → { view: WorkdayView; choose(i: number); submit(pose: HandPose); replay(target: 'prompt'|number); snap(); bonusDone(gears: number); paused: boolean; resume() }`
  - `WorkdayView { phase; plan; customer; script; served; gearsToday; streak; glowCard; word; explain: { id; lang; cues: Cue[]; word } | null; reveal: { chosen: number; correct: number } | null; revealPose: HandPose | null; mood: 'idle'|'happy'; locked: boolean; levelUpTo: number | null }`
  - `Workshop(props: { onExit(): void })`, `Customer({ id, mood })`, `Tower({ floors, size })`, `Wall({ wall })`, `PauseCover({ onResume })`

- [ ] **Step 1: Write the failing test** `src/clock/screens/Workshop.test.tsx`

```tsx
import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../audio/clockAudio', () => ({
  playVoice: (_id: string, onWord?: (i: number) => void, n = 0) => {
    for (let i = 0; i < n; i++) onWord?.(i)
    return Promise.resolve()
  },
  playSfx: () => Promise.resolve(),
  stopVoices: () => {},
  startMusic: () => {},
  stopMusic: () => {},
  preloadVoices: () => {},
  configureClockAudio: () => {},
  unlockClockAudio: () => {},
  muteClockAudio: () => {},
}))

import { Workshop } from './Workshop'
import { useClockStore } from '../store'

const answerCorrectly = async (container: HTMLElement) => {
  await waitFor(() => expect(container.querySelector('[data-phase="answer"]')).not.toBeNull(), { timeout: 4000 })
  const correct = container.querySelector('[data-correct="1"]')
  if (correct) fireEvent.pointerDown(correct)
  else {
    const btn = container.querySelector('[data-test-solve]') as HTMLElement
    fireEvent.click(btn)
  }
}

describe('Workshop', () => {
  beforeEach(() => {
    useClockStore.getState().resetProgress()
    useClockStore.setState({ welcomed: true, bonusExplained: true })
  })

  it('workday completes with no audio files: 8 customers, then the bonus', async () => {
    const { container } = render(<Workshop onExit={() => {}} />)
    for (let i = 0; i < 8; i++) await answerCorrectly(container)
    await waitFor(() => expect(container.querySelector('[data-phase="bonus"]')).not.toBeNull(), { timeout: 6000 })
    expect(useClockStore.getState().gears).toBe(8)
    expect(useClockStore.getState().roundNo).toBe(8)
  }, 60000)

  it('visibility hidden pauses and resume restarts the round', async () => {
    const { container, getByRole } = render(<Workshop onExit={() => {}} />)
    await waitFor(() => expect(container.querySelector('[data-phase="answer"]')).not.toBeNull(), { timeout: 4000 })
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(container.querySelector('.ck-pause')).not.toBeNull()
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    fireEvent.click(getByRole('button', { name: 'play' }))
    await answerCorrectly(container)
    await waitFor(() => expect(useClockStore.getState().roundNo).toBe(1))
  }, 20000)
})
```

The set exercises have no `data-correct`; in test builds `SetExercise`'s parent (Workshop) renders a hidden `<button data-test-solve>` that submits the right pose (`poseOf(plan.time)`) — add it in Step 4 behind `TEST_HOOKS`.

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Write `src/clock/useWorkday.ts`**

```ts
// The workday controller (spec: Exercises, Feedback, Explanations, Workday). One async script per round drives
// what is spoken and what glows; answers resolve a promise the script awaits. A pause cancels the script and
// restarts the round. Rule: answer taps do not count while the narration plays.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { Rng } from '../shared/adaptive'
import { useClockStore } from './store'
import { clockTelemetry } from './telemetry'
import { type HandPose, minutesUpTo, poseOf, timeId } from './logic/time'
import { phrase, type Lang } from './logic/phrases'
import { evaluateChoice, evaluateSet, type Evaluation } from './logic/grade'
import { fixFor, introsFor, type ExplainId } from './logic/levels'
import { checkFor, planRound } from './logic/rounds'
import { WORKDAY_LENGTH, dayKey, kindInfo, langForRound, newKindsAt, pickCustomer, realTimeFor, type ClockKind, type Customer } from './logic/workday'
import type { RoundPlan } from './logic/types'
import { CUSTOMER_LINES, customerAudioId, lineAudioId, lineById, parseLine, type Cue } from './data/lines'
import { playSfx, playVoice, preloadVoices, stopVoices } from './audio/clockAudio'
import { scriptFor, type CaptionScript } from './components/Caption'
import { explainLineId } from './components/ExplainPlayer'

export type Phase = 'enter' | 'explain' | 'ask' | 'answer' | 'feedback' | 'levelup' | 'leave' | 'bonus' | 'summary'
export interface WorkdayView {
  phase: Phase
  plan: RoundPlan
  customer: Customer
  script: CaptionScript
  served: number
  gearsToday: number
  streak: number
  glowCard: number | null
  word: { target: 'prompt' | number; index: number } | null
  explain: { id: ExplainId; lang: Lang; cues: Cue[]; word: number } | null
  reveal: { chosen: number; correct: number } | null
  revealPose: HandPose | null
  mood: 'idle' | 'happy'
  locked: boolean
  levelUpTo: number | null
}
type Answer = { kind: 'choice'; index: number } | { kind: 'set'; pose: HandPose }

const CANCEL = Symbol('cancel')
const CONFIDENT_MS = 6000

export function useWorkday({ rng = Math.random, now = () => new Date() }: { rng?: Rng; now?: () => Date } = {}) {
  const [view, setView] = useState<WorkdayView | null>(null)
  const [paused, setPaused] = useState(false)
  const [roundKey, setRoundKey] = useState(0)
  const answerRef = useRef<((a: Answer) => void) | null>(null)
  const bonusRef = useRef<((g: number) => void) | null>(null)
  const day = useRef({ served: 0, gears: 0, streak: 0, lastCustomer: undefined as string | undefined, pendingKind: undefined as ClockKind | undefined })
  const viewRef = useRef<WorkdayView | null>(null)
  viewRef.current = view

  const patch = (p: Partial<WorkdayView>) => setView((v) => (v ? { ...v, ...p } : v))

  useEffect(() => {
    if (paused) return
    const token = { alive: true }
    const live = () => { if (!token.alive) throw CANCEL }
    const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms)).then(live)
    const say = async (id: string, words: number, onWord?: (i: number) => void) => {
      live()
      await playVoice(id, (i) => token.alive && onWord?.(i), words)
      live()
    }
    const waitAnswer = () => new Promise<Answer>((resolve) => { answerRef.current = resolve }).then((a) => { live(); return a })

    const explain = async (id: ExplainId, lang: Lang) => {
      const line = lineById(explainLineId(id))!
      const { words, cues } = parseLine(line[lang])
      const fired: Cue[] = []
      patch({ phase: 'explain', explain: { id, lang, cues: [], word: -1 } })
      await say(lineAudioId(explainLineId(id), lang), words.length, (i) => {
        cues.filter((c) => c.word === i).forEach((c) => fired.push(c.cue))
        patch({ explain: { id, lang, cues: [...fired], word: i } })
      })
      patch({ explain: { id, lang, cues: [...fired], word: words.length } })
      await wait(700)
      useClockStore.getState().markExplained(id)
      patch({ explain: null })
    }

    const round = async () => {
      const st = useClockStore.getState()
      const d = day.current
      const level = st.progress.level
      const lang = langForRound(st.roundNo, st.settings.langs)
      const today = dayKey(now())
      const real = d.served === 0 && st.lastRealTimeDay !== today ? realTimeFor(now(), minutesUpTo(level)) : null
      const plan = planRound({
        level, lang, rng, tallies: st.tallies, recent: st.recent, confusions: st.confusions,
        forcedKind: d.pendingKind, forcedTime: real ?? undefined, forcedExercise: real ? 'what' : undefined,
      })
      const customer = pickCustomer(rng, lang, d.lastCustomer)
      d.lastCustomer = customer.id
      const script = scriptFor(lang, st.roundNo, st.settings.langs.length, st.settings)
      preloadVoices([phrase(plan.time, lang).audioId, ...plan.options.filter((o) => o.time).map((o) => phrase(o.time!, lang).audioId)])
      setView({
        phase: 'enter', plan, customer, script, served: d.served, gearsToday: d.gears, streak: d.streak, glowCard: null,
        word: null, explain: null, reveal: null, revealPose: null, mood: 'idle', locked: true, levelUpTo: null,
      })

      // the customer comes in
      await playSfx('doorbell'); live()
      if (d.served % 3 === 0) await say(customerAudioId(customer.id, 'hello'), CUSTOMER_LINES[lang].hello.split(' ').length)
      if (d.pendingKind) {
        await say(lineAudioId('fb-newkind', lang), 3)
        useClockStore.getState().seeKind(d.pendingKind)
        d.pendingKind = undefined
      }
      for (const id of introsFor(useClockStore.getState(), plan)) await explain(id, lang)
      if (real) {
        useClockStore.getState().setRealTimeDay(today)
        await say(lineAudioId('ask-now', lang), 3)
      }

      // the question
      patch({ phase: 'ask', locked: true })
      const ask = async () => {
        if (plan.exercise === 'what') {
          for (let i = 0; i < plan.options.length; i++) {
            const p = phrase(plan.options[i].time!, lang)
            patch({ glowCard: i, word: { target: i, index: -1 } })
            await say(p.audioId, p.words.length, (w) => patch({ word: { target: i, index: w } }))
            patch({ word: { target: i, index: p.words.length } })
            await wait(350)
          }
          patch({ glowCard: null, word: null })
        } else if (plan.exercise !== 'digitalPick' && plan.exercise !== 'digitalSet') {
          const p = phrase(plan.time, lang)
          await say(p.audioId, p.words.length, (w) => patch({ word: { target: 'prompt', index: w } }))
          patch({ word: { target: 'prompt', index: p.words.length } })
        }
      }
      await ask()

      // the answer (one near miss allowed in Set the clock)
      patch({ phase: 'answer', locked: false })
      const t0 = performance.now()
      let forgiven = false
      let a = await waitAnswer()
      let ev = grade(plan, a, false)
      if (ev.nearMiss) {
        forgiven = true
        patch({ locked: true })
        await say(lineAudioId('fb-almost', lang), 1)
        patch({ locked: false })
        a = await waitAnswer()
        ev = grade(plan, a, true)
      }
      const ms = Math.round(performance.now() - t0)
      answerRef.current = null
      const { levelUp } = useClockStore.getState().recordRound(plan, ev, forgiven)
      clockTelemetry.track('round', {
        exercise: plan.exercise, lang, time: timeId(plan.time), level, kind: plan.kind, scaffolds: plan.scaffolds,
        options: plan.options.map((o) => ({ f: o.family, t: o.time && timeId(o.time), d: o.digital })),
        families: plan.families, answer: a, correct: ev.correct, forgiven, tag: ev.tag, ms, script,
        predicted: Math.round(plan.predicted * 100) / 100, real: !!real, customer: customer.id,
      })

      // feedback
      patch({ phase: 'feedback', locked: true, word: null })
      const p = phrase(plan.time, lang)
      if (ev.correct) {
        d.streak++
        d.gears++
        useClockStore.getState().addGears(1)
        useClockStore.getState().hangClock(plan.kind)
        useClockStore.getState().noteStreak(d.streak)
        patch({
          mood: 'happy', streak: d.streak, gearsToday: d.gears, revealPose: poseOf(plan.time),
          reveal: a.kind === 'choice' ? { chosen: a.index, correct: plan.correctIndex } : null,
        })
        await playSfx(kindInfo(plan.kind).sound); live()
        await playSfx('gear'); live()
        const confident = ms < CONFIDENT_MS && !forgiven
        if (!confident || plan.exercise === 'digitalPick') {
          await say(p.audioId, p.words.length, (w) => patch({ word: { target: 'prompt', index: w } }))
        }
        if (d.streak % 10 === 0) await say(lineAudioId('fb-streak', lang), 4)
        else if (d.streak % 5 === 0) { await playSfx('wallchime'); live() }
        else if (rng() < 0.3) await say(customerAudioId(customer.id, 'thanks'), CUSTOMER_LINES[lang].thanks.split(' ').length)
        else if (rng() < 0.3) await say(lineAudioId(`fb-cheer-${1 + (d.served % 3)}`, lang), 2)
      } else {
        d.streak = 0
        patch({
          streak: 0, revealPose: poseOf(plan.time),
          reveal: a.kind === 'choice' ? { chosen: a.index, correct: plan.correctIndex } : null,
        })
        await playSfx('boing'); live()
        await wait(500)
        await say(p.audioId, p.words.length, (w) => patch({ word: { target: 'prompt', index: w } }))
        await wait(400)
        const fix = fixFor(useClockStore.getState())
        if (fix) await explain(fix, lang)
      }

      if (levelUp) {
        const to = useClockStore.getState().progress.level
        patch({ phase: 'levelup', levelUpTo: to })
        await playSfx('build'); live()
        await say(lineAudioId(to >= 7 ? 'fb-tower-done' : 'fb-levelup', lang), 6)
        clockTelemetry.track('levelup', { to })
        d.pendingKind = newKindsAt(to)[0]?.id
      }

      patch({ phase: 'leave', mood: 'happy' })
      await wait(800)
      d.served++
      if (d.served >= WORKDAY_LENGTH) {
        patch({ phase: 'bonus', served: d.served })
        const g = await new Promise<number>((r) => { bonusRef.current = r }).then((x) => { live(); return x })
        d.gears += g
        useClockStore.getState().addGears(g)
        useClockStore.getState().finishWorkday()
        clockTelemetry.track('workday', { gears: d.gears, bonus: g })
        patch({ phase: 'summary', gearsToday: d.gears })
        await say(lineAudioId('day-end', lang), 3)
        return
      }
      setRoundKey((k) => k + 1)
    }

    round().catch((e) => { if (e !== CANCEL) throw e })
    return () => {
      token.alive = false
      answerRef.current = null
      stopVoices()
    }
  }, [roundKey, paused]) // eslint-disable-line react-hooks/exhaustive-deps

  // pause when the tablet locks (rule); resume restarts the round
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'hidden') {
        if (viewRef.current && viewRef.current.phase !== 'summary') clockTelemetry.track('pause', { phase: viewRef.current.phase })
        setPaused(true)
      }
    }
    const onHide = () => clockTelemetry.track('abandon', { served: day.current.served, phase: viewRef.current?.phase })
    document.addEventListener('visibilitychange', onVis)
    window.addEventListener('pagehide', onHide)
    return () => {
      document.removeEventListener('visibilitychange', onVis)
      window.removeEventListener('pagehide', onHide)
    }
  }, [])

  const choose = useCallback((index: number) => answerRef.current?.({ kind: 'choice', index }), [])
  const submit = useCallback((pose: HandPose) => answerRef.current?.({ kind: 'set', pose }), [])
  const snap = useCallback(() => { void playSfx('snap') }, [])
  const bonusDone = useCallback((g: number) => bonusRef.current?.(g), [])
  const resume = useCallback(() => setPaused(false), [])
  const replay = useCallback((target: 'prompt' | number) => {
    const v = viewRef.current
    if (!v || v.locked) return
    const t = target === 'prompt' ? v.plan.time : v.plan.options[target].time
    if (!t) return
    const p = phrase(t, v.plan.lang)
    void playVoice(p.audioId, (w) => setView((x) => (x ? { ...x, word: { target, index: w } } : x)), p.words.length)
  }, [])

  return { view, choose, submit, replay, snap, bonusDone, paused, resume }
}

function grade(plan: RoundPlan, a: Answer, nearMissUsed: boolean): Evaluation {
  if (a.kind === 'choice') return evaluateChoice(plan.options, plan.correctIndex, a.index)
  return evaluateSet(plan.time, a.pose, checkFor(plan.exercise), nearMissUsed)
}
```

- [ ] **Step 4: Write the workshop pieces and the screen**

`src/clock/components/Customer.tsx`:
```tsx
// A customer at the door. Uses the generated picture when it exists, else a simple SVG animal head.
import { motion } from 'framer-motion'
import { IMAGES } from '../assets/images'

const COLORS: Record<string, string> = {
  hedgehog: '#8d6e63', cat: '#ffb74d', bear: '#795548', turtle: '#66bb6a', owl: '#a1887f', fox: '#ff7043', rabbit: '#e0e0e0', penguin: '#455a64',
}
export function Customer({ id, mood }: { id: string; mood: 'idle' | 'happy' }) {
  const img = IMAGES[`${id}-${mood}`] ?? IMAGES[`${id}-idle`]
  return (
    <motion.div className="ck-customer" key={id} initial={{ x: 120, opacity: 0 }} animate={{ x: 0, opacity: 1, y: mood === 'happy' ? [0, -14, 0] : 0 }}
      transition={{ duration: 0.6 }}>
      {img ? (
        <img src={img} alt="" draggable={false} />
      ) : (
        <svg viewBox="0 0 100 100" aria-hidden>
          <circle cx="50" cy="55" r="38" fill={COLORS[id] ?? '#aaa'} />
          <circle cx="36" cy="48" r="6" fill="#222" />
          <circle cx="64" cy="48" r="6" fill="#222" />
          <path d={mood === 'happy' ? 'M34 66 Q50 82 66 66' : 'M38 70 Q50 74 62 70'} stroke="#222" strokeWidth="4" fill="none" strokeLinecap="round" />
        </svg>
      )}
    </motion.div>
  )
}
```

`src/clock/components/Tower.tsx`:
```tsx
// The town clock tower: one floor per passed level (spec: The tower). Generated art when present.
import { IMAGES } from '../assets/images'

export function Tower({ floors, size }: { floors: number; size: number }) {
  const img = IMAGES[`tower-${Math.min(floors, 7)}`]
  if (img) return <img className="ck-tower" src={img} alt="" draggable={false} style={{ height: size }} />
  return (
    <svg className="ck-tower" viewBox="0 0 60 200" style={{ height: size }} aria-hidden>
      <rect x="10" y="190" width="40" height="10" fill="#6b4f2a" />
      {Array.from({ length: Math.min(floors, 7) }, (_, i) => (
        <rect key={i} x="12" y={164 - i * 24} width="36" height="24" fill={i % 2 ? '#c9a46b' : '#b38b52'} stroke="#6b4f2a" strokeWidth="2" />
      ))}
      {floors >= 7 && <circle cx="30" cy="10" r="10" fill="#fff8e7" stroke="#6b4f2a" strokeWidth="3" />}
    </svg>
  )
}
```

`src/clock/components/Wall.tsx`:
```tsx
// The workshop wall: every kind he has fixed, with a count in digits (it only grows).
import { KINDS, type ClockKind } from '../logic/workday'
import { ClockFace } from './ClockFace'

export function Wall({ wall, size = 54 }: { wall: Partial<Record<ClockKind, number>>; size?: number }) {
  return (
    <div className="ck-wall">
      {KINDS.filter((k) => wall[k.id]).map((k, i) => (
        <div key={k.id} className="ck-wall-item">
          <ClockFace pose={{ hour: (i * 47) % 360, minute: (i * 113) % 360 }} kind={k.id} size={size} numbers="none" />
          <span className="ck-count">{wall[k.id]}</span>
        </div>
      ))}
    </div>
  )
}
```

`src/clock/components/PauseCover.tsx`:
```tsx
// Opaque cover while paused (rule): the workshop door and a big play button.
import { PlayIcon } from './icons'
export function PauseCover({ onResume }: { onResume: () => void }) {
  return (
    <div className="ck-pause">
      <button aria-label="play" className="ck-play" onClick={onResume}>
        <PlayIcon size={140} />
      </button>
    </div>
  )
}
```

`src/clock/screens/Workshop.tsx`:
```tsx
// The workshop screen: wall and tower at the sides, the bench in the middle (spec: Screens and layout).
import { useEffect, useState } from 'react'
import { useWorkday } from '../useWorkday'
import { useClockStore } from '../store'
import { poseOf } from '../logic/time'
import { ChoiceExercise, TEST_HOOKS } from '../components/ChoiceExercise'
import { SetExercise } from '../components/SetExercise'
import { ExplainPlayer } from '../components/ExplainPlayer'
import { Customer } from '../components/Customer'
import { Tower } from '../components/Tower'
import { Wall } from '../components/Wall'
import { PauseCover } from '../components/PauseCover'
import { GearIcon, HomeIcon } from '../components/icons'
import { Bonus } from './Bonus'
import { Summary } from './Summary'
import { startMusic, stopMusic, stopVoices } from '../audio/clockAudio'

function useBenchSize() {
  const get = () => Math.min(window.innerWidth * (window.innerWidth > window.innerHeight ? 0.6 : 0.95), window.innerHeight * 0.9)
  const [s, setS] = useState(get)
  useEffect(() => {
    const on = () => setS(get())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])
  return s
}

export function Workshop({ onExit }: { onExit: () => void }) {
  const { view, choose, submit, replay, snap, bonusDone, paused, resume } = useWorkday()
  const level = useClockStore((s) => s.progress.level)
  const gears = useClockStore((s) => s.gears)
  const wall = useClockStore((s) => s.wall)
  const workdays = useClockStore((s) => s.workdays)
  const size = useBenchSize()
  useEffect(() => {
    startMusic(workdays)
    return () => { stopMusic(); stopVoices() }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  if (!view) return <div className="ck-root" />
  const { plan } = view
  const isSet = !['find', 'what', 'digitalPick'].includes(plan.exercise)

  return (
    <div className="ck-root ck-workshop" data-phase={view.phase}>
      <button aria-label="home" className="ck-home" onClick={onExit}><HomeIcon /></button>
      <div className="ck-gears"><GearIcon /><span className="ck-count">{gears}</span></div>
      <aside className="ck-side ck-side-wall"><Wall wall={wall} /></aside>
      <main className="ck-bench">
        {view.phase === 'bonus' ? (
          <Bonus onDone={bonusDone} />
        ) : view.phase === 'summary' ? (
          <Summary gears={view.gearsToday} served={view.served} floors={level - 1} onAgain={onExit} />
        ) : view.explain ? (
          <ExplainPlayer id={view.explain.id} lang={view.explain.lang} script={view.script} word={view.explain.word}
            cues={view.explain.cues} fallback={plan.time} size={size} />
        ) : isSet ? (
          <>
            <SetExercise plan={plan} script={view.script} locked={view.locked} reveal={view.reveal === null && view.phase === 'feedback' ? view.revealPose : null}
              word={view.word && view.word.target === 'prompt' ? { target: 'prompt', index: view.word.index } : null}
              onSubmit={submit} onReplay={() => replay('prompt')} onSnap={snap} size={size} />
            {TEST_HOOKS && <button data-test-solve style={{ display: 'none' }} onClick={() => submit(poseOf(plan.time))} />}
          </>
        ) : (
          <ChoiceExercise plan={plan} script={view.script} locked={view.locked} glowCard={view.glowCard} word={view.word}
            reveal={view.reveal} onChoose={choose} onReplay={replay} size={size} />
        )}
      </main>
      <aside className="ck-side ck-side-door">
        {view.phase !== 'bonus' && view.phase !== 'summary' && <Customer id={view.customer.id} mood={view.mood} />}
        <Tower floors={level - 1} size={size * 0.45} />
      </aside>
      {paused && <PauseCover onResume={resume} />}
    </div>
  )
}
```

Create minimal `src/clock/screens/Bonus.tsx` and `src/clock/screens/Summary.tsx` stubs that Task 15 fills in (so this task compiles):

```tsx
// src/clock/screens/Bonus.tsx (Task 15 replaces this)
export function Bonus({ onDone }: { onDone: (gears: number) => void }) {
  return <button data-bonus-skip aria-label="play" onClick={() => onDone(0)} />
}
```
```tsx
// src/clock/screens/Summary.tsx (Task 15 replaces this)
export function Summary({ onAgain }: { gears: number; served: number; floors: number; onAgain: () => void }) {
  return <button aria-label="play" onClick={onAgain} />
}
```

- [ ] **Step 5: Run** `npx vitest run src/clock/screens` → PASS. Then `npm test` and `npx tsc --noEmit -p .`.

- [ ] **Step 6: Commit** "Clock: the workday controller and the workshop screen".

---

### Task 15: Cover, bonus game, summary, app shell and layout

**Files:**
- Create: `src/clock/screens/Cover.tsx`, `src/clock/screens/screens.test.tsx`
- Modify: `src/clock/screens/Bonus.tsx`, `src/clock/screens/Summary.tsx`, `src/clock/ClockApp.tsx`, `src/clock/clock.css`, `src/clock/ClockApp.test.tsx`

**Interfaces:**
- Consumes: Task 14, store, audio, workday (`BONUS_TRIES`, `BONUS_TURN_MS`, `bonusGears`).
- Produces: `Cover({ onPlay, onParent })`, `Bonus({ onDone })`, `Summary({ gears, served, floors, onAgain })`, `ClockApp` with screens `'cover'|'work'|'parent'`.

- [ ] **Step 1: Write the failing test** `src/clock/screens/screens.test.tsx`

```tsx
import { act, fireEvent, render } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
vi.mock('../audio/clockAudio', () => ({
  playVoice: () => Promise.resolve(), playSfx: () => Promise.resolve(), stopVoices: () => {}, startMusic: () => {}, stopMusic: () => {},
  preloadVoices: () => {}, configureClockAudio: () => {}, unlockClockAudio: () => {}, muteClockAudio: () => {},
}))
import { Bonus } from './Bonus'
import { Cover } from './Cover'

describe('Bonus', () => {
  it('three taps stop the hand and report the gears', () => {
    vi.useFakeTimers()
    const onDone = vi.fn()
    const { getByRole } = render(<Bonus onDone={onDone} />)
    for (let i = 0; i < 3; i++) {
      act(() => { vi.advanceTimersByTime(1500) })
      fireEvent.pointerDown(getByRole('button', { name: 'stop' }))
      act(() => { vi.advanceTimersByTime(1200) })
    }
    act(() => { vi.advanceTimersByTime(2000) })
    expect(onDone).toHaveBeenCalledTimes(1)
    expect(onDone.mock.calls[0][0]).toBeGreaterThanOrEqual(0)
    vi.useRealTimers()
  })
})

describe('Cover', () => {
  it('a 2-second press on the gear opens the parent area; a tap does not', () => {
    vi.useFakeTimers()
    const onParent = vi.fn()
    const { getByLabelText } = render(<Cover onPlay={() => {}} onParent={onParent} />)
    const gear = getByLabelText('parent')
    fireEvent.pointerDown(gear)
    act(() => { vi.advanceTimersByTime(500) })
    fireEvent.pointerUp(gear)
    expect(onParent).not.toHaveBeenCalled()
    fireEvent.pointerDown(gear)
    act(() => { vi.advanceTimersByTime(2100) })
    expect(onParent).toHaveBeenCalled()
    vi.useRealTimers()
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Write the screens**

`src/clock/screens/Bonus.tsx`:
```tsx
// Bonus game "stop on the 12" (spec): the seconds hand sweeps; three taps; gears by closeness. No failure.
import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ClockFace } from '../components/ClockFace'
import { BONUS_TRIES, BONUS_TURN_MS, bonusGears } from '../logic/workday'
import { playSfx, playVoice } from '../audio/clockAudio'
import { useClockStore } from '../store'
import { lineAudioId } from '../data/lines'
import { langForRound } from '../logic/workday'
import { GearIcon } from '../components/icons'

export function Bonus({ onDone }: { onDone: (gears: number) => void }) {
  const [angle, setAngle] = useState(0)
  const [stopped, setStopped] = useState(false)
  const [tries, setTries] = useState<number[]>([])
  const start = useRef(performance.now())
  const raf = useRef(0)

  useEffect(() => {
    const st = useClockStore.getState()
    if (!st.bonusExplained) {
      void playVoice(lineAudioId('bonus-intro', langForRound(st.roundNo, st.settings.langs)), undefined, 5)
      st.setBonusExplained()
    }
  }, [])
  useEffect(() => {
    if (stopped) return
    start.current = performance.now() - (angle / 360) * BONUS_TURN_MS
    const tick = () => {
      setAngle((((performance.now() - start.current) % BONUS_TURN_MS) / BONUS_TURN_MS) * 360)
      raf.current = requestAnimationFrame(tick)
    }
    raf.current = requestAnimationFrame(tick)
    const iv = window.setInterval(() => void playSfx('tick'), 1000)
    return () => { cancelAnimationFrame(raf.current); window.clearInterval(iv) }
  }, [stopped]) // eslint-disable-line react-hooks/exhaustive-deps

  const stop = () => {
    if (stopped || tries.length >= BONUS_TRIES) return
    const g = bonusGears(angle)
    const next = [...tries, g]
    setStopped(true)
    setTries(next)
    void playSfx(g > 0 ? 'ding' : 'boing')
    window.setTimeout(() => {
      if (next.length >= BONUS_TRIES) window.setTimeout(() => onDone(next.reduce((s, x) => s + x, 0)), 1200)
      else setStopped(false)
    }, 1000)
  }

  return (
    <div className="ck-bonus">
      <div className="ck-bonus-tries">
        {Array.from({ length: BONUS_TRIES }, (_, i) => (
          <motion.span key={i} animate={{ scale: tries[i] ? [1, 1.3, 1] : 1, opacity: i < tries.length ? 1 : 0.3 }}>
            {Array.from({ length: Math.max(1, tries[i] ?? 1) }, (_, j) => <GearIcon key={j} size={28} />)}
          </motion.span>
        ))}
      </div>
      <button aria-label="stop" className="ck-bonus-face" onPointerDown={stop}>
        <ClockFace pose={{ hour: 0, minute: 0 }} sectors={[{ from: 354, to: 6, color: 'rgba(60, 141, 47, 0.45)' }]} size={320} />
        <svg viewBox="-110 -110 220 220" width={320} height={320} style={{ position: 'absolute', inset: 0 }} aria-hidden>
          <line x1="0" y1="16" x2="0" y2="-86" stroke="#e67e22" strokeWidth="4" strokeLinecap="round" transform={`rotate(${angle})`} />
        </svg>
      </button>
    </div>
  )
}
```

Note: the bonus face's own hour and minute hands both point at 12 under the seconds hand; draw the bonus `ClockFace` with `pose={{ hour: 0, minute: 0 }}` so they stack at 12 as the target marker.

`src/clock/screens/Summary.tsx`:
```tsx
// End of the workday: gears today and the tower, then play again (spec: Workday).
import { motion } from 'framer-motion'
import { GearIcon, PlayIcon } from '../components/icons'
import { Tower } from '../components/Tower'

export function Summary({ gears, served, floors, onAgain }: { gears: number; served: number; floors: number; onAgain: () => void }) {
  return (
    <div className="ck-summary">
      <motion.div className="ck-summary-row" initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>
        <GearIcon size={64} /><span className="ck-count big">{gears}</span>
      </motion.div>
      <div className="ck-summary-row" aria-hidden data-served={served} />
      <Tower floors={floors} size={260} />
      <button aria-label="play" className="ck-play" onClick={onAgain}><PlayIcon size={110} /></button>
    </div>
  )
}
```

`src/clock/screens/Cover.tsx`:
```tsx
// The workshop door: play, the tower, and a hidden 2-second press for the parent area.
import { useRef } from 'react'
import { GearIcon, PlayIcon } from '../components/icons'
import { Tower } from '../components/Tower'
import { useClockStore } from '../store'
import { IMAGES } from '../assets/images'

export function Cover({ onPlay, onParent }: { onPlay: () => void; onParent: () => void }) {
  const level = useClockStore((s) => s.progress.level)
  const timer = useRef<number | undefined>(undefined)
  const press = () => { timer.current = window.setTimeout(onParent, 2000) }
  const release = () => window.clearTimeout(timer.current)
  return (
    <div className="ck-root ck-cover" style={IMAGES.workshop ? { backgroundImage: `url(${IMAGES.workshop})` } : undefined}>
      <Tower floors={level - 1} size={300} />
      <button aria-label="play" className="ck-play" onClick={onPlay}><PlayIcon size={150} /></button>
      <span aria-label="parent" className="ck-parent-btn" onPointerDown={press} onPointerUp={release} onPointerLeave={release}>
        <GearIcon size={28} />
      </span>
    </div>
  )
}
```

`src/clock/ClockApp.tsx` (replace):
```tsx
// Clockmaker's Workshop: a separate app in the alef repo (spec: docs/superpowers/specs/2026-10-15-clock-workshop-design.md).
import { useEffect, useState } from 'react'
import { Cover } from './screens/Cover'
import { Workshop } from './screens/Workshop'
import { Parent } from './screens/Parent'
import { useClockStore } from './store'
import { configureClockAudio, playVoice, unlockClockAudio } from './audio/clockAudio'
import { lineAudioId } from './data/lines'

export default function ClockApp() {
  const [screen, setScreen] = useState<'cover' | 'work' | 'parent'>('cover')
  const settings = useClockStore((s) => s.settings)
  useEffect(() => configureClockAudio(settings), [settings])
  const play = () => {
    unlockClockAudio()
    const st = useClockStore.getState()
    if (!st.welcomed) {
      st.setWelcomed()
      void playVoice(lineAudioId('welcome', st.settings.langs[0]), undefined, 7).then(() => setScreen('work'))
    } else setScreen('work')
  }
  if (screen === 'work') return <Workshop onExit={() => setScreen('cover')} />
  if (screen === 'parent') return <Parent onClose={() => setScreen('cover')} />
  return <Cover onPlay={play} onParent={() => setScreen('parent')} />
}
```

Create a stub `src/clock/screens/Parent.tsx` (Task 16 replaces it):
```tsx
export function Parent({ onClose }: { onClose: () => void }) {
  return <button onClick={onClose}>Close</button>
}
```

- [ ] **Step 4: Write the layout CSS** — append to `src/clock/clock.css`:

```css
.ck-cover { flex-direction: column; gap: 2rem; background-size: cover; background-position: center; }
.ck-parent-btn { position: absolute; top: 12px; right: 12px; opacity: 0.45; padding: 8px; }
.ck-workshop { display: grid; grid-template-columns: minmax(80px, 16vw) 1fr minmax(110px, 20vw); align-items: center; }
@media (orientation: portrait) {
  .ck-workshop { grid-template-columns: 1fr; grid-template-rows: auto 1fr auto; }
  .ck-side-wall { order: 0; } .ck-bench { order: 1; } .ck-side-door { order: 2; flex-direction: row; justify-content: space-around; }
}
.ck-side { display: flex; flex-direction: column; align-items: center; gap: 1rem; height: 100%; justify-content: center; }
.ck-bench { display: flex; align-items: center; justify-content: center; height: 100%; position: relative; }
.ck-home { position: absolute; top: 10px; left: 10px; background: none; border: 0; z-index: 5; }
.ck-gears { position: absolute; top: 12px; right: 16px; display: flex; align-items: center; gap: 6px; z-index: 5; }
.ck-count { font: 700 1.6rem/1 system-ui, sans-serif; color: #fff8e7; text-shadow: 0 2px 3px #3b2412; }
.ck-count.big { font-size: 3rem; }
.ck-ex { display: flex; flex-direction: column; align-items: center; gap: 1.2rem; width: 100%; }
.ck-ex-what, .ck-ex-digital { flex-direction: row; justify-content: center; gap: 2rem; }
@media (orientation: portrait) { .ck-ex-what, .ck-ex-digital { flex-direction: column; } }
.ck-shelf { display: flex; gap: 2.5rem; justify-content: center; }
.ck-cards { display: flex; flex-direction: column; gap: 1rem; }
.ck-option { cursor: pointer; border-radius: 22px; padding: 10px 16px; background: rgba(255, 248, 231, 0.5); border: 4px solid transparent;
  display: flex; align-items: center; gap: 12px; min-height: 64px; touch-action: manipulation; }
.ck-option.reading { border-color: #ffd54a; box-shadow: 0 0 22px #ffd54a; }
.ck-option.right { border-color: #3c8d2f; box-shadow: 0 0 26px #7ed957; }
.ck-option.wrong { border-color: #c0392b; }
.ck-option.dim { opacity: 0.45; }
.ck-listen { background: none; border: 0; padding: 8px; }
.ck-caption { color: rgba(59, 36, 18, 0.72); font-size: 1.7rem; display: flex; gap: 0.5em; flex-wrap: wrap; justify-content: center; }
.ck-caption-card { font-size: 1.5rem; }
.ck-caption-explain { font-size: 1.4rem; max-width: 90%; }
.ck-caption span { transition: color 0.15s, text-shadow 0.15s; }
.ck-caption span.said { color: #3b2412; }
.ck-caption span.now { color: #000; text-shadow: 0 0 10px #ffd54a, 0 0 18px #ffd54a; }
.ck-digital { font-family: 'Courier New', monospace; font-weight: 700; color: #7dff8a; background: #1b2a1b; padding: 0.2em 0.6em;
  border-radius: 12px; letter-spacing: 0.05em; box-shadow: inset 0 0 12px #000; }
.ck-digital.glow { box-shadow: 0 0 20px #7dff8a, inset 0 0 12px #000; }
.ck-setter { display: flex; align-items: center; gap: 1.5rem; }
@media (orientation: portrait) { .ck-setter { flex-direction: column; } }
.ck-hand-buttons { display: flex; flex-direction: column; gap: 1rem; align-items: center; }
@media (orientation: portrait) { .ck-hand-buttons { flex-direction: row; } }
.ck-hand-btn { background: rgba(255, 248, 231, 0.6); border: 4px solid transparent; border-radius: 18px; padding: 6px; }
.ck-hand-btn.on { border-color: #ffd54a; box-shadow: 0 0 18px #ffd54a; }
.ck-check { background: none; border: 0; padding: 0; }
.ck-check:disabled { opacity: 0.35; }
.ck-face { flex: none; }
.ck-case { position: absolute; inset: -12%; width: 124%; height: 124%; object-fit: contain; pointer-events: none; }
.ck-customer { width: 100%; max-width: 180px; }
.ck-customer img, .ck-customer svg { width: 100%; height: auto; }
.ck-wall { display: grid; grid-template-columns: repeat(2, auto); gap: 10px; }
.ck-wall-item { position: relative; }
.ck-wall-item .ck-count { position: absolute; bottom: -6px; right: -6px; font-size: 1rem; }
.ck-pause { position: fixed; inset: 0; background: #5a3417; display: flex; align-items: center; justify-content: center; z-index: 50; }
.ck-explain { display: flex; flex-direction: column; align-items: center; gap: 1rem; position: relative; }
.ck-explain-row { display: flex; align-items: center; gap: 2rem; }
.ck-bonus { display: flex; flex-direction: column; align-items: center; gap: 1rem; }
.ck-bonus-face { position: relative; width: 320px; height: 320px; background: none; border: 0; padding: 0; }
.ck-bonus-tries { display: flex; gap: 1.5rem; min-height: 40px; }
.ck-summary { display: flex; flex-direction: column; align-items: center; gap: 1.2rem; }
.ck-summary-row { display: flex; align-items: center; gap: 12px; }
```

- [ ] **Step 5: Update `src/clock/ClockApp.test.tsx`** to mock the audio module (same `vi.mock` block as in Task 14) and keep the "shows the cover with a play button" assertion.

- [ ] **Step 6: Run** `npx vitest run src/clock` and `npx tsc --noEmit -p .` → PASS / clean.

- [ ] **Step 7: Commit** "Clock: cover, bonus game, day summary, app shell and layout".

---

### Task 16: Parent area

**Files:**
- Modify: `src/clock/screens/Parent.tsx`
- Create: `src/clock/screens/Parent.test.tsx`

**Interfaces:**
- Consumes: store, telemetry.
- Produces: `Parent({ onClose })` with: language checkboxes (cannot untick the last one), Hebrew cursive mix, English capitals mix, sound, music, volume slider, stats (level, gears, workdays, best streak, per-feature table seen/wrong/predicted, top confusions), export telemetry (download JSON), clear telemetry, reset progress (confirm).

- [ ] **Step 1: Write the failing test** `src/clock/screens/Parent.test.tsx`

```tsx
import { fireEvent, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Parent } from './Parent'
import { useClockStore } from '../store'

describe('Parent', () => {
  beforeEach(() => {
    useClockStore.getState().resetProgress()
    useClockStore.getState().setSettings({ langs: ['he', 'en'] })
  })
  it('cannot untick the last language', () => {
    const { getByLabelText } = render(<Parent onClose={() => {}} />)
    fireEvent.click(getByLabelText('עברית / Hebrew'))
    expect(useClockStore.getState().settings.langs).toEqual(['en'])
    fireEvent.click(getByLabelText('English'))
    expect(useClockStore.getState().settings.langs).toEqual(['en'])
  })
  it('reset asks first', () => {
    useClockStore.getState().addGears(4)
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(true)
    const { getByText } = render(<Parent onClose={() => {}} />)
    fireEvent.click(getByText('Reset clock progress'))
    expect(confirm).toHaveBeenCalled()
    expect(useClockStore.getState().gears).toBe(0)
  })
})
```

- [ ] **Step 2: Run** → FAIL.

- [ ] **Step 3: Write `src/clock/screens/Parent.tsx`**

```tsx
// Parent area (text allowed): languages, caption mixes, sound, stats, telemetry export, reset.
import { useClockStore } from '../store'
import { clockTelemetry } from '../telemetry'
import { predictedMistakeRate } from '../../shared/adaptive'
import { featurePrior } from '../logic/rounds'
import type { Lang } from '../logic/phrases'

const LANG_LABEL: Record<Lang, string> = { he: 'עברית / Hebrew', en: 'English' }

export function Parent({ onClose }: { onClose: () => void }) {
  const s = useClockStore()
  const toggleLang = (l: Lang) => {
    const on = s.settings.langs.includes(l)
    const langs = on ? s.settings.langs.filter((x) => x !== l) : (['he', 'en'] as Lang[]).filter((x) => x === l || s.settings.langs.includes(x))
    if (langs.length) s.setSettings({ langs })
  }
  const download = () => {
    const blob = new Blob([clockTelemetry.exportJson()], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `clock-telemetry-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
  }
  const rows = Object.entries(s.tallies).sort(([a], [b]) => a.localeCompare(b))
  const confusions = Object.entries(s.confusions)
    .flatMap(([asked, row]) => Object.entries(row).map(([chosen, n]) => ({ asked, chosen, n })))
    .sort((a, b) => b.n - a.n)
    .slice(0, 10)

  return (
    <div className="ck-parent" style={{ position: 'fixed', inset: 0, overflow: 'auto', background: '#fff8e7', padding: 24, fontFamily: 'system-ui', color: '#222' }}>
      <button onClick={onClose} style={{ float: 'right', fontSize: 18 }}>Close</button>
      <h2>Clock workshop — parent</h2>
      <h3>Languages</h3>
      {(['he', 'en'] as Lang[]).map((l) => (
        <label key={l} style={{ display: 'block', fontSize: 18 }}>
          <input type="checkbox" aria-label={LANG_LABEL[l]} checked={s.settings.langs.includes(l)} onChange={() => toggleLang(l)} /> {LANG_LABEL[l]}
        </label>
      ))}
      <h3>Captions</h3>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={s.settings.heCursiveMix} onChange={(e) => s.setSettings({ heCursiveMix: e.target.checked })} /> Hebrew: mix print and cursive
      </label>
      <label style={{ display: 'block' }}>
        <input type="checkbox" checked={s.settings.enCapsMix} onChange={(e) => s.setSettings({ enCapsMix: e.target.checked })} /> English: mix small letters and CAPITALS
      </label>
      <h3>Sound</h3>
      <label style={{ display: 'block' }}><input type="checkbox" checked={s.settings.sfx} onChange={(e) => s.setSettings({ sfx: e.target.checked })} /> Effects</label>
      <label style={{ display: 'block' }}><input type="checkbox" checked={s.settings.music} onChange={(e) => s.setSettings({ music: e.target.checked })} /> Music</label>
      <label style={{ display: 'block' }}>Volume <input type="range" min={0} max={1} step={0.05} value={s.settings.volume} onChange={(e) => s.setSettings({ volume: Number(e.target.value) })} /></label>
      <h3>Progress</h3>
      <p>Level {s.progress.level} (recent new-time answers: {s.progress.newAnswers || '—'}) · rounds {s.roundNo} · gears {s.gears} · workdays {s.workdays} · best streak {s.bestStreak}</p>
      <table style={{ borderCollapse: 'collapse' }}>
        <thead><tr><th align="left">Feature</th><th>Seen</th><th>Wrong</th><th>Recent</th><th>Predicted miss</th></tr></thead>
        <tbody>
          {rows.map(([f, t]) => (
            <tr key={f}>
              <td>{f}</td><td align="center">{t.seen ?? 0}</td><td align="center">{t.wrong ?? 0}</td>
              <td style={{ fontFamily: 'monospace' }}>{s.recent[f] ?? ''}</td>
              <td align="center">{Math.round(predictedMistakeRate(t, s.recent[f], featurePrior(f)) * 100)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      <h3>Top confusions (asked → chosen)</h3>
      <ul>{confusions.map((c) => <li key={c.asked + c.chosen}>{c.asked} → {c.chosen} ×{c.n}</li>)}</ul>
      <h3>Data</h3>
      <button onClick={download}>Export telemetry ({clockTelemetry.count()} events)</button>{' '}
      <button onClick={() => window.confirm('Clear the clock telemetry log?') && clockTelemetry.clear()}>Clear telemetry</button>
      <p>
        <button style={{ color: '#a00' }} onClick={() => window.confirm('Reset all clock progress? (alef progress is not touched)') && s.resetProgress()}>
          Reset clock progress
        </button>
      </p>
    </div>
  )
}
```

- [ ] **Step 4: Run** `npx vitest run src/clock` → PASS. `npm test`, `npx tsc --noEmit -p .`, `npm run build` → all clean.

- [ ] **Step 5: Commit** "Clock: parent area (languages, captions, sound, stats, export, reset)".

---

### Task 17: Audio catalogue export (repo)

**Files:**
- Create: `scripts/clock/export-audio-catalog.ts`

**Interfaces:**
- Consumes: `time.ts`, `phrases.ts`, `workday.ts`, `src/clock/data/lines.ts` (plain Node, `.ts` imports).
- Produces: JSON on stdout: `{ items: CatalogItem[] }` with `CatalogItem = { id, group: 'phrase'|'line'|'customer', lang, text, spoken, voice, model: 'eleven_v4', stability, tag?, where, context: { type: 'clock', time } | { type: 'customer', customer } | { type: 'explain', line, example? } | { type: 'line' }, level? }`. Phrases carry `level` (the level that first teaches the minute) for progressive batches.

- [ ] **Step 1: Write the script**

```ts
// Writes the clock game's audio catalogue (every voice line with its text, voice and where it plays) as JSON for
// the host-local generation pipeline. Run: node scripts/clock/export-audio-catalog.ts > catalog.json
import { HOURS, LEVEL_MINUTES, MINUTES, timeId } from '../../src/clock/logic/time.ts'
import { LANGS, phrase } from '../../src/clock/logic/phrases.ts'
import { CUSTOMERS, NARRATOR_VOICE } from '../../src/clock/logic/workday.ts'
import { CUSTOMER_LINES, LINES, customerAudioId, lineAudioId, parseLine } from '../../src/clock/data/lines.ts'

const levelOf = (m: number) => Number(Object.keys(LEVEL_MINUTES).find((l) => LEVEL_MINUTES[Number(l)].includes(m)))
const items: unknown[] = []

for (const lang of LANGS)
  for (const m of MINUTES)
    for (const h of HOURS) {
      const p = phrase({ h, m }, lang)
      items.push({
        id: p.audioId, group: 'phrase', lang, text: p.text, spoken: p.text, voice: NARRATOR_VOICE, model: 'eleven_v4', stability: 0.5,
        where: `Time phrase: spoken in Find the clock / Set the clock, read on answer cards, and repeated in feedback`,
        context: { type: 'clock', time: timeId({ h, m }) }, level: levelOf(m),
      })
    }

for (const l of LINES)
  for (const lang of LANGS) {
    const { spoken } = parseLine(l[lang])
    items.push({
      id: lineAudioId(l.id, lang), group: 'line', lang, text: spoken, spoken, voice: NARRATOR_VOICE, model: 'eleven_v4',
      stability: l.stability, tag: l.tag, where: l.where,
      context: l.id.startsWith('exp-') ? { type: 'explain', line: l.id, example: l.example } : { type: 'line' },
    })
  }

for (const c of CUSTOMERS)
  for (const what of ['hello', 'thanks'] as const) {
    const text = CUSTOMER_LINES[c.lang][what]
    items.push({
      id: customerAudioId(c.id, what), group: 'customer', lang: c.lang, text, spoken: text, voice: c.voice, model: 'eleven_v4',
      stability: 0.5, tag: what === 'thanks' ? 'happy' : 'friendly',
      where: what === 'hello' ? `Customer (${c.id}) comes in, every third customer` : `Customer (${c.id}) thanks him after a right answer, sometimes`,
      context: { type: 'customer', customer: c.id },
    })
  }

process.stdout.write(JSON.stringify({ items }, null, 1))
```

- [ ] **Step 2: Run it**

Run: `mkdir -p /data/ws/scratch/clock/audio && node scripts/clock/export-audio-catalog.ts > /data/ws/scratch/clock/audio/catalog.json && python3 -c "import json;d=json.load(open('/data/ws/scratch/clock/audio/catalog.json'));print(len(d['items']))"`
Expected: `364` (288 phrases + 30 lines × 2 + 16 customer lines). If Node rejects a syntax in an imported file, make that file erasable-only (Global Constraints) rather than adding a loader.

- [ ] **Step 3: Commit** "Clock: audio catalogue export for the generation pipeline".

---

### Task 18: Host pipeline — generate, check, sync, provenance (host-local, not committed except asset-sources)

**Files (host-local, `/data/ws/scratch/clock/audio/`):**
- Create: `gen.py`, `make_batch.py`, `check.py`, `sync.py`, `provenance.py`, `sfx_music.json`, `ledger.md` (at `/data/ws/scratch/clock/ledger.md`)
- Repo: `asset-sources/clock/README.md`, `asset-sources/clock/audio.json` (written by provenance.py)

**Interfaces:**
- `make_batch.py --group phrase --levels 1,2 [--lang he]` → `batch-<name>.json` (`{clips: [{id, kind:'tts', where, context, options:[{label, voice, text, model, lang, stability, seed}]}]}`); `--group line|customer` for the others.
- `gen.py <batch.json> [--only id] [--retake]` → `clips/<id>/v<N>.mp3` + `clips/<id>/v<N>.words.json` (word start times from the ElevenLabs character alignment), updates `manifest.json` (`{clips: [{id, kind, version, takes: [{file, words, label, source, request}], where, context, generated}]}`); sfx/music kinds as in the duel's gen.py.
- `check.py [--all]` → `checks.json` (`{<file>: {transcript, score, seconds, voiced, bursts, flags: [...]}}`), Gemini transcription.
- `sync.py` → copies the current take of every clip into `src/clock/assets/audio/{voice,sfx,music}/`, trims silence, writes `src/clock/assets/voiceWords.json`.
- `provenance.py` → `asset-sources/clock/audio.json`.

- [ ] **Step 1: Write `gen.py`** — copy `/data/ws/scratch/nikkud-duel/audio/gen.py` to `/data/ws/scratch/clock/audio/gen.py`, then change:
  1. `MANIFEST`/paths stay relative to the new dir; key reading stays `<key file>`.
  2. TTS goes to `/text-to-speech/{voice}/with-timestamps?output_format=mp3_44100_128`; decode `audio_base64`; compute word starts from `alignment.characters` / `character_start_times_seconds` (a word starts at the first non-space character after a space; drop leading `[tag]` characters by skipping a bracketed run at the start):

```python
def word_starts(alignment):
    chars = alignment["characters"]
    starts = alignment["character_start_times_seconds"]
    out, in_word, in_tag = [], False, False
    for ch, t in zip(chars, starts):
        if ch == "[" and not out and not in_word:
            in_tag = True
            continue
        if in_tag:
            if ch == "]":
                in_tag = False
            continue
        if ch.isspace():
            in_word = False
        elif not in_word:
            out.append(round(t, 3))
            in_word = True
    return out

def render_tts(opt, k):
    body = {"text": opt["text"], "model_id": opt.get("model", "eleven_v4")}
    if opt.get("lang"):
        body["language_code"] = opt["lang"]
    if opt.get("stability") is not None:
        body["voice_settings"] = {"stability": opt["stability"]}
    if opt.get("seed") is not None:
        body["seed"] = opt["seed"]
    raw = post(f"/text-to-speech/{opt['voice']}/with-timestamps?output_format=mp3_44100_128", body, k)
    doc = json.loads(raw)
    return base64.b64decode(doc["audio_base64"]), word_starts(doc.get("alignment") or {"characters": [], "character_start_times_seconds": []})
```

  3. One take per clip (`options` has one entry). `--retake` makes version N+1 with `seed = 100 + N` and keeps the earlier takes in `takes` (newest last); the review page shows the current take first.
  4. Parallelism: run clips concurrently with `ThreadPoolExecutor(max_workers=4)` (across clips, not within), saving the manifest under a `threading.Lock` after each clip. On HTTP 429 back off 4 s, 8 s, 16 s; on 401/402 stop the whole run and print the error (quota or permission).
  5. Each take records `request` = the exact body sent (minus the key) so `provenance.py` can write it.

- [ ] **Step 2: Write `make_batch.py`**

```python
#!/usr/bin/env python3
"""Build a generation batch from catalog.json (exported from the repo by scripts/clock/export-audio-catalog.ts).

  python3 make_batch.py --group phrase --levels 1,2        # phrases of levels 1-2, both languages
  python3 make_batch.py --group line                      # narrator lines
  python3 make_batch.py --group customer                  # customer lines
Spoken-text overrides (pronunciation fixes, rule: spoken text may differ from the caption) live in spoken.json: {id: text}.
"""
import argparse, json, os
HERE = os.path.dirname(os.path.abspath(__file__))
ap = argparse.ArgumentParser()
ap.add_argument("--group", required=True, choices=["phrase", "line", "customer"])
ap.add_argument("--levels", default="")
ap.add_argument("--lang", default="")
ap.add_argument("--out", default="")
a = ap.parse_args()
cat = json.load(open(os.path.join(HERE, "catalog.json"), encoding="utf-8"))["items"]
over = json.load(open(os.path.join(HERE, "spoken.json"), encoding="utf-8")) if os.path.exists(os.path.join(HERE, "spoken.json")) else {}
levels = {int(x) for x in a.levels.split(",") if x}
clips = []
for it in cat:
    if it["group"] != a.group or (a.lang and it["lang"] != a.lang) or (levels and it.get("level") not in levels):
        continue
    text = over.get(it["id"], it["spoken"])
    if it.get("tag"):
        text = f"[{it['tag']}] {text}"
    clips.append({"id": it["id"], "kind": "tts", "where": it["where"], "context": it["context"], "caption": it["text"],
                  "options": [{"label": f"{it['lang']} · v4 · take 1", "voice": it["voice"], "text": text, "model": it["model"],
                               "lang": it["lang"], "stability": it["stability"], "seed": 1}]})
name = a.out or f"batch-{a.group}{('-L' + a.levels.replace(',', '')) if a.levels else ''}{('-' + a.lang) if a.lang else ''}.json"
json.dump({"clips": clips}, open(os.path.join(HERE, name), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(name, len(clips))
```

- [ ] **Step 3: Write `check.py`** — transcribes each take with Gemini (`gemini-2.5-flash`, key from `<key file>` `GOOGLE_AI_STUDIO_API_KEY`, never printed), measures with `/data/ws/scratch/voiced.py`, and flags:

```python
#!/usr/bin/env python3
"""Automatic check of generated takes (rule: check each take; the parent reviews a sample + flagged).
Flags: 'text' (transcript differs from the caption), 'long'/'short' (length), 'bursts' (odd rhythm).
  python3 check.py          # only takes not yet checked
  python3 check.py --all
"""
import base64, difflib, json, os, re, subprocess, sys, unicodedata, urllib.request
from concurrent.futures import ThreadPoolExecutor
HERE = os.path.dirname(os.path.abspath(__file__))
KEY = next(l.split("=", 1)[1].strip().strip("'\"") for l in open("<key file>") if l.startswith("GOOGLE_AI_STUDIO_API_KEY="))
URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" + KEY
NIKKUD = re.compile(r"[֑-ֽֿ-ׇ]")

def norm(s):
    s = NIKKUD.sub("", unicodedata.normalize("NFC", s)).lower()
    s = re.sub(r"\[[^\]]*\]", " ", s)
    s = re.sub(r"[־\-]", " ", s)
    s = re.sub(r"[^\w\s']", " ", s)
    return " ".join(s.split())

def transcribe(path, lang):
    audio = base64.b64encode(open(path, "rb").read()).decode()
    prompt = ("Transcribe this audio exactly, in Hebrew script without nikkud." if lang == "he"
              else "Transcribe this audio exactly in English. Write numbers as words.") + " Output only the words."
    body = {"contents": [{"parts": [{"text": prompt}, {"inline_data": {"mime_type": "audio/mpeg", "data": audio}}]}]}
    req = urllib.request.Request(URL, data=json.dumps(body).encode(), headers={"Content-Type": "application/json"})
    with urllib.request.urlopen(req, timeout=120) as r:
        doc = json.load(r)
    return doc["candidates"][0]["content"]["parts"][0]["text"].strip()

def measure(path):
    out = subprocess.run([sys.executable, "/data/ws/scratch/voiced.py", path], capture_output=True, text=True).stdout
    nums = [float(x) for x in re.findall(r"[\d.]+", out)[:3]]
    return (nums + [0, 0, 0])[:3]  # total s, voiced s, bursts

def main():
    man = json.load(open(os.path.join(HERE, "manifest.json"), encoding="utf-8"))
    path = os.path.join(HERE, "checks.json")
    checks = json.load(open(path, encoding="utf-8")) if os.path.exists(path) else {}
    jobs = []
    for c in man["clips"]:
        if c["kind"] != "tts":
            continue
        t = c["takes"][-1]
        if t.get("file") and (t["file"] not in checks or "--all" in sys.argv):
            jobs.append((c, t))

    def job(ct):
        c, t = ct
        f = os.path.join(HERE, t["file"])
        lang = c["id"].split("-")[1] if c["id"].startswith("ph-") else ("he" if c["id"].endswith("-he") else "en" if c["id"].endswith("-en") else c.get("lang", "he"))
        try:
            tr = transcribe(f, lang)
        except Exception as e:
            tr = f"ERROR {e}"
        total, voiced, bursts = measure(f)
        score = difflib.SequenceMatcher(None, norm(tr), norm(c.get("caption", t["source"]))).ratio()
        words = len(norm(c.get("caption", t["source"])).split())
        flags = []
        if score < 0.85: flags.append("text")
        if total > 1.2 + 0.75 * words: flags.append("long")
        if total < 0.25 * words: flags.append("short")
        if bursts > 3 * words + 2: flags.append("bursts")
        return t["file"], {"transcript": tr, "score": round(score, 2), "seconds": total, "voiced": voiced, "bursts": bursts, "flags": flags}

    with ThreadPoolExecutor(max_workers=6) as ex:
        for f, res in ex.map(job, jobs):
            checks[f] = res
            if res["flags"]:
                print("FLAG", f, res["flags"], res["transcript"])
    json.dump(checks, open(path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"checked {len(jobs)}; flagged {sum(1 for f, _ in jobs if checks.get(_['file'], {}).get('flags'))}")

if __name__ == "__main__":
    main()
```

Make each clip record its `lang` and `caption` in the manifest (copy them from the batch in `gen.py`) so `check.py` does not have to guess.

- [ ] **Step 4: Write `sync.py`** — copies into the repo and writes word timings. Trim leading/trailing silence with GStreamer (no ffmpeg on the host) the same way as `/data/ws/scratch/nikkud-duel/audio/sync_voice.py` does (read that script and reuse its trim function verbatim); subtract the trimmed lead from every word time:

```python
#!/usr/bin/env python3
"""Copy the current take of every clip into the clock app and write word timings.
Current take = the newest take that the parent has not rejected (choices.json); rejected-only clips are skipped
until a retake exists. Sound effects: sfx-<name>-<n>; music: music-<n>."""
import json, os, shutil
HERE = os.path.dirname(os.path.abspath(__file__))
DEST = "/data/ws/alef/src/clock/assets"
man = json.load(open(os.path.join(HERE, "manifest.json"), encoding="utf-8"))
choices = json.load(open(os.path.join(HERE, "choices.json"), encoding="utf-8")) if os.path.exists(os.path.join(HERE, "choices.json")) else {}
words = {}
for sub in ("voice", "sfx", "music"):
    os.makedirs(os.path.join(DEST, "audio", sub), exist_ok=True)

def current(clip):
    rejected = {r["file"] for r in choices.get(clip["id"], {}).get("rejected", [])}
    ok = [t for t in clip["takes"] if t.get("file") and t["file"] not in rejected]
    return ok[-1] if ok else None

copied = 0
for clip in man["clips"]:
    t = current(clip)
    if not t:
        continue
    src = os.path.join(HERE, t["file"])
    if clip["kind"] == "tts":
        out = os.path.join(DEST, "audio", "voice", clip["id"] + ".mp3")
        lead = trim(src, out)          # reuse the duel's trim: returns seconds removed at the start
        words[clip["id"]] = [max(0.0, round(w - lead, 3)) for w in t.get("words", [])]
    else:
        sub = "sfx" if clip["kind"] == "sfx" else "music"
        shutil.copyfile(src, os.path.join(DEST, "audio", sub, clip["id"].split("-", 1)[1] + ".mp3"))
    copied += 1
json.dump(words, open(os.path.join(DEST, "voiceWords.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=0)
print("copied", copied)
```

If the duel's trim cannot report the lead, extend it to return the seconds removed (measure the leading silence before trimming).

- [ ] **Step 5: Write `sfx_music.json`** (effects and music batch, kinds `sfx`/`music`, ids `sfx-<name>-<n>` / `music-<n>`), one take each, with these prompts:

| id | prompt | seconds |
|---|---|---|
| sfx-tick-1 | single soft wooden clock tick, close, dry | 0.5 |
| sfx-chime-1 | small brass clock chime, two gentle notes, warm | 1.5 |
| sfx-cuckoo-1 | cuckoo clock: little door clacks open and the cuckoo calls twice, playful | 2.0 |
| sfx-alarm-1 | old mechanical alarm clock bell ringing briefly, cheerful, not harsh | 1.5 |
| sfx-bong-1 | grandfather clock single deep bong, warm and round | 2.0 |
| sfx-beep-1 | wristwatch double beep, soft and friendly | 0.6 |
| sfx-gear-1 | small brass gear coin drops into a wooden box, clink | 0.6 |
| sfx-boing-1 | soft cartoon boing, gentle and friendly, not mocking | 0.6 |
| sfx-doorbell-1 | shop door bell jingles as a door opens, cosy workshop | 1.2 |
| sfx-snap-1 | tiny mechanical click as a clock hand clicks into place | 0.3 |
| sfx-build-1 | wooden blocks stack and a hammer taps, a short magical sparkle at the end | 2.0 |
| sfx-ding-1 | bright small bell ding, success | 0.8 |
| sfx-wallchime-1 | many small clocks chiming together in a happy cascade | 2.5 |
| sfx-fanfare-1 | short warm brass and bells fanfare, celebration | 2.5 |
| music-1 | cosy clockmaker workshop music, gentle ticking percussion, music box and plucked strings, calm and warm, loopable, no vocals | 75000 ms |
| music-2 | calm playful workshop tune, marimba and soft clarinet, steady clock-like rhythm, loopable, no vocals | 75000 ms |
| music-3 | warm lullaby-like music box waltz with soft strings, gentle, loopable, no vocals | 75000 ms |
| music-4 | light curious pizzicato strings and glockenspiel, tick-tock rhythm, loopable, no vocals | 75000 ms |

Each sfx/music clip's `where` says where it plays (e.g. "Cuckoo clock comes alive after a right answer").

- [ ] **Step 6: Write `provenance.py`** — like the duel's (`/data/ws/scratch/nikkud-duel/audio/provenance.py`): for every clip's current take, write `{id, kind, where, request}` into `/data/ws/alef/asset-sources/clock/audio.json`. Write `asset-sources/clock/README.md` explaining the files (copy the structure of `asset-sources/duel/README.md`, without host names, routes or passwords).

- [ ] **Step 7: Smoke test with 2 clips** — `python3 make_batch.py --group phrase --levels 1 --lang en --out batch-smoke.json`, edit it down to 2 clips, `python3 gen.py batch-smoke.json`, `python3 check.py`, `python3 sync.py`; confirm two mp3s and their word lists in `src/clock/assets/voiceWords.json`, then `npx vitest run src/clock/assets` → PASS. Log the run in `ledger.md`.

- [ ] **Step 8: Commit (repo part only)** `asset-sources/clock/` and the two synced files: "Clock: asset sources and the first generated phrases".

---

### Task 19: Review page and service (host-local)

**Files (host-local, not in the repo):** the review server and page next to the audio pipeline, a service that keeps the server running, and a password-protected route on the host's web server.

- Server: copy `/data/ws/scratch/nikkud-duel/audio/review_server.py`, serving `review.html`, `manifest.json`, `checks.json`, `choices.json`, `clips/`, and `/art/` (read-only, `../art/final/`). `POST /choice` body `{id, file, action: 'ok'|'reject'|'reset', note?}` → `choices.json` `{<id>: {ok: [file], rejected: [{file, note, at}]}}`. `POST /retake` body `{id}` appends the id to `retake-queue.json` (the agent processes the queue with `gen.py --retake`). Writes are locked and backed up hourly (`choices.backup-<ts>.json`).

- The service unit and the web-server route are host setup. They are documented on the host, not here (the repo is public: no host paths, service units, routes, ports or passwords).

- [ ] **Step 1:** Write the server; test it locally: fetch `manifest.json` from the local server; post a choice to a **copy** of `choices.json` (set `CHOICES` via an env var `CLOCK_CHOICES` for tests) — rule: automated checks never write live review data.
- [ ] **Step 2:** Invoke the frontend-design skill and build `review.html` to the requirements above. Check it in the headless browser (the headless browser, with the route's password): play-all advances on its own (stub `HTMLMediaElement.prototype.play` to resolve and fire `ended` after 50 ms), Sample shows fewer items than Full, no buttons click pick/reset on the live page.
- [ ] **Step 3:** Enable the service and the protected route (host setup); check that the page loads with the password and is refused without it.
- [ ] **Step 4:** No repo commit (host-local). Note the URL and credentials for the report to Michael.

---

### Task 20: Art — concepts, style sheet, sprites (host-local generation, repo images)

**Files:**
- Host: `/data/ws/scratch/clock/art/` (prompts, raw renders, cutouts), reuse `/data/ws/scratch/nikkud-duel/art/gen_ref.py` and `cutout.py` by path.
- Repo: `src/clock/assets/img/*.webp`, `asset-sources/clock/images.json`

- [ ] **Step 1: Concepts.** Generate 3 concept images (16:9, `gemini-3-pro-image`, no reference) of the workshop scene with a cuckoo narrator, a customer animal, the workbench with a clock, and the tower through the window, in three styles: (a) warm watercolor storybook, (b) soft 3D clay, (c) cosy flat vector with wood textures. Save to `art/concepts/`. Choose one (judge: warm, readable shapes at tablet size, no fine dotted textures that look like nikkud); record the choice and why in `ledger.md` and in the spec's Judgement calls table. Copy the 3 to `/data/ws/scratch/clock/site/art/` so Michael can see them at `/clock/art/`.
- [ ] **Step 2: Style sheet.** From the chosen concept, generate one style sheet (the cuckoo, two customers, two clock cases, a tower floor) with the concept as reference (`gen_ref.py --ref`). It is the reference for every later image.
- [ ] **Step 3: Sprites.** With the style sheet as reference, one subject per image on a flat magenta (#FF00FF) background, no text (rule):
  - `workshop` (background, 16:9, no characters, empty bench), `cuckoo-idle`, `cuckoo-speak`
  - customers ×8 (`<id>-idle`, `<id>-happy`): hedgehog, cat, bear, turtle, owl, fox, rabbit, penguin — friendly, facing left (towards the bench, which is to their left in landscape)
  - clock cases ×8 (`case-<kind>`): the case and decoration only, with the round face area left as a plain flat cream disc (the SVG face is drawn on top): wall, alarm, cuckoo, pocket, grandfather, station, wrist, tower
  - tower stages `tower-0` … `tower-7` (foundation, then one more floor each; `tower-7` complete with its clock)
  Budget check before each batch (≤ $10 total incl. concepts): log the count and cost estimate in `ledger.md`.
- [ ] **Step 4: Cut out and export.** Remove magenta, specks and halos (`cutout.py`), crop, export `webp` (q 85, longest side ≤ 768 px; workshop ≤ 1600 px) into `src/clock/assets/img/`. Write `asset-sources/clock/images.json` (`{name, prompt, reference, model}` per image).
- [ ] **Step 5: Look at them.** Build a contact sheet (`/data/ws/scratch/clock/site/art/sheet.html`) and look at every image: no nikkud-like dots near where captions sit, cases leave the face disc clear, customers face left. Redo any that fail (counts toward the budget).
- [ ] **Step 6:** `npx vitest run src/clock` → PASS (components now use images). Commit "Clock: workshop art (generated; sources in asset-sources/clock)".

---

### Task 21: Generate the audio progressively

**Interfaces:** uses Task 18–19 tools.

- [ ] **Step 1: Batch 1 (levels 1–2 and the core).** Before generating Hebrew, check every Hebrew word's nikkud in a dictionary (rule) — the phrase words come from `phrases.ts` and the line words from `lines.ts`; fix spellings in the repo first (and the tests), then re-export the catalogue. Then:

```bash
cd /data/ws/scratch/clock/audio
node /data/ws/alef/scripts/clock/export-audio-catalog.ts > catalog.json
python3 make_batch.py --group phrase --levels 1,2
python3 make_batch.py --group line
python3 make_batch.py --group customer
python3 gen.py batch-phrase-L12.json && python3 gen.py batch-line.json && python3 gen.py batch-customer.json && python3 gen.py sfx_music.json
python3 check.py && python3 sync.py && python3 provenance.py
```

Expected: 48 phrases, 60 lines, 16 customer lines, 14 effects, 4 music tracks. Fix flagged takes yourself first when the cause is obvious (a spelling to adjust in `spoken.json`, then `gen.py --only <id> --retake`).
- [ ] **Step 2:** `npx vitest run src/clock && npm run build`; commit the synced audio and `asset-sources/clock/audio.json`: "Clock: voice and sound, batch 1 (levels 1–2, lines, customers, effects, music)".
- [ ] **Step 3: Batch 2 (levels 3–4)**: `make_batch.py --group phrase --levels 3,4`, gen, check, sync, provenance, test, commit.
- [ ] **Step 4: Batch 3 (levels 5–6)**: same with `--levels 5,6`, commit.
- [ ] **Step 5:** Process `retake-queue.json` whenever Michael rejects takes (`gen.py --only <id> --retake`, check, sync, commit). Read `choices.json` notes and apply them to similar items not yet reviewed (rule).

---

### Task 22: Playtest builds and headless verification

**Files (host-local):** `/data/ws/scratch/clock/site/` (play builds), `~/ws/scratch/cdp/verify-clock.js`

- [ ] **Step 1: Builds.**

```bash
cd /data/ws/alef
npx vite build --base <play route> --outDir /data/ws/scratch/clock/site/play --emptyOutDir
VITE_CLOCK_TEST=1 npx vite build --base <verify route> --outDir /data/ws/scratch/clock/site/play-verify --emptyOutDir
```

The game is at `<play route>clock/` (and the verify build at `<verify route>clock/`). Delete stray `tsbuildinfo`/`vite.config.{js,d.ts}` files in the repo root if a build leaves any.
- [ ] **Step 2: Verify script** `~/ws/scratch/cdp/verify-clock.js` (puppeteer-core via hshell, modelled on `verify-duel.js`; base `https://<host><verify route>clock/`, auth <user>/<password>), at 1280×800 (tablet landscape) and 412×915 (phone portrait):
  - clear `localStorage` for a fresh run; click play; for 8 rounds wait for `[data-phase="answer"]`, scan for text, screenshot the first of each exercise type, then answer: `[data-correct="1"]` or the hidden `[data-test-solve]` button (`page.evaluate(() => document.querySelector('[data-test-solve]').click())`);
  - text scan: clone `.ck-root`, remove `[data-caption]`, `[data-digital]`, `.ck-count`, `.ck-parent-btn`, SVG `<text>`; then `textContent.match(/[A-Za-zא-ת]+/g)` must be empty;
  - after 8 rounds `[data-phase="bonus"]` appears; tap `[aria-label="stop"]` 3 times; `[data-phase="summary"]` appears;
  - no `pageerror`, no console errors (ignore 404s for audio that is not generated yet only if batch 3 is not done — print them);
  - force each exercise once by setting `localStorage['alef-clock']` with a level-5 save before reload (so set, digital, seconds and slices appear), screenshot each;
  - exit code 0 only when every check passes.
- [ ] **Step 3: Look at the screenshots** (rule): missing-font squares, Hebrew word order (bidi), cursive caption rendering with nikkud (if Dana Yad draws nikkud badly, change `Caption` to strip nikkud for `cursive` and note it in the spec), duplicate characters, sprites facing the wrong way, case art covering the face, caption fainter than the clock.
- [ ] **Step 4: Play it to the end and listen** (rule): play a full workday on level 1 and a level-5 save in the playtest build, with sound, compare with the spec; fix what is wrong (each fix is a normal TDD change with a commit).
- [ ] **Step 5:** `npm test && npx tsc --noEmit -p . && npm run build` on the branch → all green. Commit any fixes. Do not merge or push.

---

## Self-review notes

- Spec coverage: app/entry (T1), shared code (T2), levels & phrases (T3, T5), exercises & hand interface (T9, T12), tricks (T4), round choice & scaffolds (T7), explanations (T5, T13, T14), feedback/streaks/near miss (T14), workday/bonus/real time/kinds/wall/tower (T6, T14, T15), characters & voices (T6, T8, T17), captions & scripts (T10), audio (T11, T17, T18, T21), review page (T19), art (T20), parent tracking & area (T14 telemetry, T16), testing & verification (all tasks, T22).
- Review Focus tests: wrap-around (T3, T9), duplicate options (T4), missing assets (T11, T14), tablet lock (T14), one language (T6, T16).
