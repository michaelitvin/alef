# Story Reading Game Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A new "Stories" game where a child reads a short vocalized Hebrew story and answers comprehension questions; every word on screen is tappable — first tap reads the word aloud, second tap decodes it (letter names + niqqud), further taps alternate.

**Architecture:** New `Stories` module following the existing per-game convention. All speech goes through a swappable `SpeechEngine` interface (default: Web Speech API) — components never touch `speechSynthesis` directly. A pure `decodeWord()` function turns a vocalized word into a Hebrew decode sentence. A `TappableText` component + screen-wide `SpeechProvider` context implement the tap cycle everywhere.

**Tech Stack:** React 19 + TypeScript 5 (strict), Vite 7, Zustand, Framer Motion, react-router-dom (HashRouter), YAML data via `@rollup/plugin-yaml`. New dev deps: Vitest, jsdom, @testing-library/react.

**Spec:** `docs/superpowers/specs/2026-07-11-story-reading-game-design.md`

## Global Constraints

- TypeScript `strict` is on; `noUnusedLocals` and `noUnusedParameters` are on — unused imports/params fail `tsc`.
- Styling convention: inline `style={{}}` objects using tokens from `src/styles/theme.ts` (`colors, typography, spacing, borderRadius, shadows`). No CSS modules, no Tailwind.
- All Hebrew UI copy is fully vocalized (with niqqud) where children read it.
- Hebrew text containers need `direction: 'rtl'` and `fontFamily: typography.fontFamily.hebrew`.
- Speech: components NEVER call `window.speechSynthesis` directly — only via `SpeechEngine` / `useSpeech` (POC finding: Hebrew TTS is good on Android, poor on Windows/Edge; the backend must stay swappable).
- Data files live in `src/data/*.yaml`, imported as modules (typed via cast), NOT fetched.
- 5 stories, each ~40–80 words, 3–4 questions, 3 options each, `correctIndex` varies (not always 0).
- Run commands from repo root `D:\code\alef` (PowerShell-compatible commands shown).
- Commit after every task. Never use `--no-verify`.

---

### Task 1: Vitest infrastructure + `decodeWord` pure function

**Files:**
- Modify: `package.json` (add `test` script; dev deps installed via npm)
- Modify: `vite.config.ts` (vitest config block)
- Create: `src/utils/decodeWord.ts`
- Test: `src/utils/decodeWord.test.ts`

**Interfaces:**
- Consumes: `src/data/letters.yaml` (`letters[].character`, `letters[].name`), `src/data/nikkud.yaml` (`nikkud[].mark`, `nikkud[].name`) — already exist.
- Produces: `decodeWord(word: string): string` and `stripPunctuation(word: string): string` from `src/utils/decodeWord.ts`. Later tasks import both.

- [ ] **Step 1: Install test dependencies**

Run:
```
npm install -D vitest jsdom @testing-library/react @testing-library/dom
```
Expected: packages added to `devDependencies` without errors.

- [ ] **Step 2: Add test script and vitest config**

In `package.json` scripts, add:
```json
"test": "vitest run"
```

Replace `vite.config.ts` with:
```ts
/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import yaml from '@rollup/plugin-yaml'

// https://vitejs.dev/config/
export default defineConfig({
  base: '/alef/',
  plugins: [react(), yaml()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
  test: {
    environment: 'jsdom',
  },
})
```
Note: the `yaml()` plugin also runs for Vitest, so tests can import `.yaml` files.

- [ ] **Step 3: Write the failing tests**

Create `src/utils/decodeWord.test.ts`:
```ts
import { describe, it, expect, vi, afterEach } from 'vitest'
import { decodeWord, stripPunctuation } from './decodeWord'

afterEach(() => {
  vi.restoreAllMocks()
})

describe('stripPunctuation', () => {
  it('keeps Hebrew letters and niqqud, drops punctuation', () => {
    expect(stripPunctuation('אַבָּא!')).toBe('אַבָּא')
    expect(stripPunctuation('שֶׁר־חָאן')).toBe('שֶׁרחָאן')
  })
})

describe('decodeWord', () => {
  it('decodes אַבָּא (patach, dagesh+kamatz, bare final alef)', () => {
    expect(decodeWord('אַבָּא')).toBe(
      'אָלֶף עִם פַּתָח, בֵּית עִם דָּגֵשׁ וְקָמָץ, אָלֶף - אַבָּא'
    )
  })

  it('decodes יַלְדָּה (shva, final he)', () => {
    expect(decodeWord('יַלְדָּה')).toBe(
      'יוֹד עִם פַּתָח, לָמֶד עִם שְׁוָא, דָּלֶת עִם דָּגֵשׁ וְקָמָץ, הֵא - יַלְדָּה'
    )
  })

  it('decodes שֻׁלְחָן (shin dot, kubutz, final nun)', () => {
    expect(decodeWord('שֻׁלְחָן')).toBe(
      'שִׁין עִם קֻבּוּץ, לָמֶד עִם שְׁוָא, חֵית עִם קָמָץ, נוּן סוֹפִית - שֻׁלְחָן'
    )
  })

  it('decodes דּוֹב with holam male', () => {
    expect(decodeWord('דּוֹב')).toBe('דָּלֶת עִם דָּגֵשׁ, חוֹלָם מָלֵא, בֵּית - דּוֹב')
  })

  it('decodes שׁוּב with shuruk', () => {
    expect(decodeWord('שׁוּב')).toBe('שִׁין, שׁוּרוּק, בֵּית - שׁוּב')
  })

  it('decodes שָׂם with sin (left dot)', () => {
    expect(decodeWord('שָׂם')).toBe('שִׁין שְׂמָאלִית עִם קָמָץ, מֵם סוֹפִית - שָׂם')
  })

  it('decodes חֲתוּל with chataf-patach', () => {
    expect(decodeWord('חֲתוּל')).toBe('חֵית עִם חֲטַף פַּתָח, תָּו, שׁוּרוּק, לָמֶד - חֲתוּל')
  })

  it('treats consonant vav with shva normally (not shuruk)', () => {
    expect(decodeWord('וְגַם')).toBe('וָו עִם שְׁוָא, גִּימֶל עִם פַּתָח, מֵם סוֹפִית - וְגַם')
  })

  it('ignores punctuation and decodes the bare word', () => {
    expect(decodeWord('אַבָּא!')).toBe(
      'אָלֶף עִם פַּתָח, בֵּית עִם דָּגֵשׁ וְקָמָץ, אָלֶף - אַבָּא'
    )
  })

  it('falls back to the word itself for undecodable input, with a warning', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(decodeWord('hello')).toBe('hello')
    expect(warn).toHaveBeenCalled()
  })
})
```

- [ ] **Step 4: Run tests to verify they fail**

Run: `npx vitest run src/utils/decodeWord.test.ts`
Expected: FAIL — cannot resolve `./decodeWord`.

- [ ] **Step 5: Write the implementation**

Create `src/utils/decodeWord.ts`:
```ts
import lettersYaml from '../data/letters.yaml'
import nikkudYaml from '../data/nikkud.yaml'

interface LetterEntry {
  character: string
  name: string
}

interface NikkudEntry {
  mark: string
  name: string
}

const { letters } = lettersYaml as { letters: LetterEntry[] }
const { nikkud } = nikkudYaml as { nikkud: NikkudEntry[] }

/** Letter character -> vocalized letter name (e.g. א -> אָלֶף) */
const LETTER_NAMES = new Map(letters.map((l) => [l.character, l.name]))

/** Niqqud combining mark -> vocalized name (e.g. kamatz -> קָמָץ) */
const NIKKUD_NAMES = new Map(nikkud.map((n) => [n.mark, n.name]))

/** Marks that appear in vocalized text but are not in nikkud.yaml */
const EXTRA_MARK_NAMES = new Map<string, string>([
  ['\u05B1', 'חֲטַף סֶגּוֹל'],
  ['\u05B2', 'חֲטַף פַּתָח'],
  ['\u05B3', 'חֲטַף קָמָץ'],
  ['\u05C7', 'קָמָץ קָטָן'],
])

const DAGESH = '\u05BC'
const METEG = '\u05BD'
const SHIN_DOT = '\u05C1'
const SIN_DOT = '\u05C2'
const CHOLAM = '\u05B9'
const CHOLAM_HASER_FOR_VAV = '\u05BA'
const DAGESH_NAME = 'דָּגֵשׁ' // "dagesh" vocalized

const HEBREW_LETTER = /[\u05D0-\u05EA]/
// Niqqud (U+05B0-U+05BB) + dagesh + meteg + shin/sin dots + kamatz katan (U+05C7).
// Deliberately EXCLUDES maqaf (U+05BE), rafe (U+05BF), paseq (U+05C0).
const HEBREW_MARK = /[\u05B0-\u05BD\u05C1\u05C2\u05C7]/

/** Keep only Hebrew letters and combining marks (drops punctuation, Latin, maqaf) */
export function stripPunctuation(word: string): string {
  return Array.from(word)
    .filter((ch) => HEBREW_LETTER.test(ch) || HEBREW_MARK.test(ch))
    .join('')
}

interface Cluster {
  letter: string
  marks: string[]
}

function toClusters(text: string): Cluster[] | null {
  const clusters: Cluster[] = []
  for (const ch of text) {
    if (HEBREW_LETTER.test(ch)) {
      clusters.push({ letter: ch, marks: [] })
    } else if (clusters.length > 0) {
      clusters[clusters.length - 1].marks.push(ch)
    } else {
      return null // mark before any letter
    }
  }
  return clusters.length > 0 ? clusters : null
}

/** Vocalic vav: shuruk (וּ) or holam male (וֹ) */
function vavPhrase(c: Cluster): string | null {
  if (c.letter !== 'ו') return null
  const marks = c.marks.filter((m) => m !== METEG)
  if (marks.length === 1 && marks[0] === DAGESH) return 'שׁוּרוּק'
  if (marks.length === 1 && (marks[0] === CHOLAM || marks[0] === CHOLAM_HASER_FOR_VAV)) {
    return 'חוֹלָם מָלֵא'
  }
  return null
}

function clusterPhrase(c: Cluster): string | null {
  let letterName: string | undefined
  if (c.letter === 'ש' && c.marks.includes(SIN_DOT)) {
    letterName = 'שִׁין שְׂמָאלִית'
  } else {
    letterName = LETTER_NAMES.get(c.letter)
  }
  if (!letterName) return null

  let hasDagesh = false
  const vowelNames: string[] = []
  for (const mark of c.marks) {
    if (mark === DAGESH) {
      hasDagesh = true
    } else if (mark === SHIN_DOT || mark === SIN_DOT || mark === METEG) {
      continue
    } else {
      const name = NIKKUD_NAMES.get(mark) ?? EXTRA_MARK_NAMES.get(mark)
      if (!name) return null
      vowelNames.push(name)
    }
  }

  const extras = [...(hasDagesh ? [DAGESH_NAME] : []), ...vowelNames]
  if (extras.length === 0) return letterName
  return `${letterName} עִם ${extras.join(' וְ')}`
}

/**
 * Turn a vocalized Hebrew word into a decode sentence:
 * "אָלֶף עִם פַּתָח, בֵּית עִם דָּגֵשׁ וְקָמָץ, אָלֶף - אַבָּא"
 * Falls back to the word itself if any cluster can't be decoded.
 */
export function decodeWord(word: string): string {
  const bare = stripPunctuation(word)
  const clusters = toClusters(bare)
  if (!clusters) {
    console.warn(`decodeWord: cannot decode "${word}"`)
    return word
  }

  const phrases: string[] = []
  for (const cluster of clusters) {
    const phrase = vavPhrase(cluster) ?? clusterPhrase(cluster)
    if (!phrase) {
      console.warn(`decodeWord: cannot decode "${word}"`)
      return bare
    }
    phrases.push(phrase)
  }
  return `${phrases.join(', ')} - ${bare}`
}
```

- [ ] **Step 6: Run tests to verify they pass**

Run: `npx vitest run src/utils/decodeWord.test.ts`
Expected: all tests PASS. If a Hebrew-string expectation fails, diff the actual vs expected character-by-character (niqqud mark order in the algorithm output is deterministic: dagesh first, then vowels).

- [ ] **Step 7: Verify tsc passes**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: no errors. (`*.yaml` imports are typed `unknown` via `src/vite-env.d.ts` and cast at import sites.)

- [ ] **Step 8: Commit**

```
git add package.json package-lock.json vite.config.ts src/utils/decodeWord.ts src/utils/decodeWord.test.ts
git commit -m "Add Vitest infra and decodeWord for Hebrew word decoding"
```

---

### Task 2: `SpeechEngine` interface + `WebSpeechEngine`

**Files:**
- Create: `src/utils/speech/types.ts`
- Create: `src/utils/speech/webSpeechEngine.ts`
- Test: `src/utils/speech/webSpeechEngine.test.ts`

**Interfaces:**
- Consumes: nothing from other tasks.
- Produces:
  ```ts
  // src/utils/speech/types.ts
  export interface SpeakOptions { rate?: number; volume?: number }
  export interface SpeechEngine {
    speak(text: string, opts?: SpeakOptions): Promise<void>
    cancel(): void
    isAvailable(): boolean
    whenReady(): Promise<void>
  }
  ```
  and `class WebSpeechEngine implements SpeechEngine` with constructor `(synth?: SpeechSynthesis)`.

- [ ] **Step 1: Write the interface**

Create `src/utils/speech/types.ts`:
```ts
export interface SpeakOptions {
  /** Playback rate; default 0.85 (kid-friendly) */
  rate?: number
  /** Volume 0-1; default 1 */
  volume?: number
}

/**
 * Speech backend abstraction. Components never touch speechSynthesis
 * directly — Hebrew TTS quality varies by platform, so the backend
 * must be swappable (pre-generated audio, cloud TTS, ...).
 */
export interface SpeechEngine {
  /** Speak text; resolves when done (or on error). Cancels prior speech. */
  speak(text: string, opts?: SpeakOptions): Promise<void>
  /** Stop any in-flight speech */
  cancel(): void
  /** True if the engine can actually produce Hebrew speech */
  isAvailable(): boolean
  /** Resolves once availability is known (voice loading is async) */
  whenReady(): Promise<void>
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/utils/speech/webSpeechEngine.test.ts`:
```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { WebSpeechEngine } from './webSpeechEngine'

interface FakeUtteranceShape {
  text: string
  voice: unknown
  lang: string
  rate: number
  volume: number
  onend: (() => void) | null
  onerror: (() => void) | null
}

class FakeUtterance implements FakeUtteranceShape {
  voice: unknown = null
  lang = ''
  rate = 1
  volume = 1
  onend: (() => void) | null = null
  onerror: (() => void) | null = null
  constructor(public text: string) {}
}

class FakeSynth {
  voices: Array<{ lang: string; localService: boolean; name: string }> = []
  spoken: FakeUtterance[] = []
  cancelCount = 0
  private listeners: Array<() => void> = []

  getVoices() {
    return this.voices
  }
  addEventListener(type: string, cb: () => void) {
    if (type === 'voiceschanged') this.listeners.push(cb)
  }
  fireVoicesChanged() {
    this.listeners.forEach((cb) => cb())
  }
  speak(u: FakeUtterance) {
    this.spoken.push(u)
    u.onend?.() // finish immediately
  }
  cancel() {
    this.cancelCount++
  }
}

const HEBREW_VOICE = { lang: 'he-IL', localService: true, name: 'Carmit' }
const ENGLISH_VOICE = { lang: 'en-US', localService: true, name: 'Alex' }

beforeEach(() => {
  vi.stubGlobal('SpeechSynthesisUtterance', FakeUtterance)
})

function makeEngine(synth: FakeSynth): WebSpeechEngine {
  return new WebSpeechEngine(synth as unknown as SpeechSynthesis)
}

describe('WebSpeechEngine', () => {
  it('is available when a Hebrew voice exists at construction', async () => {
    const synth = new FakeSynth()
    synth.voices = [ENGLISH_VOICE, HEBREW_VOICE]
    const engine = makeEngine(synth)
    await engine.whenReady()
    expect(engine.isAvailable()).toBe(true)
  })

  it('finds the Hebrew voice after voiceschanged fires', async () => {
    const synth = new FakeSynth()
    const engine = makeEngine(synth)
    synth.voices = [HEBREW_VOICE]
    synth.fireVoicesChanged()
    await engine.whenReady()
    expect(engine.isAvailable()).toBe(true)
  })

  it('is unavailable without a Hebrew voice and speak() resolves silently', async () => {
    const synth = new FakeSynth()
    synth.voices = [ENGLISH_VOICE]
    const engine = makeEngine(synth)
    synth.fireVoicesChanged()
    await engine.speak('שָׁלוֹם')
    expect(engine.isAvailable()).toBe(false)
    expect(synth.spoken).toHaveLength(0)
  })

  it('speaks with slow rate and cancels prior speech', async () => {
    const synth = new FakeSynth()
    synth.voices = [HEBREW_VOICE]
    const engine = makeEngine(synth)
    await engine.speak('אַבָּא', { volume: 0.5 })
    expect(synth.cancelCount).toBe(1) // cancel before each speak
    expect(synth.spoken).toHaveLength(1)
    expect(synth.spoken[0].text).toBe('אַבָּא')
    expect(synth.spoken[0].rate).toBeCloseTo(0.85)
    expect(synth.spoken[0].volume).toBeCloseTo(0.5)
  })
})
```

Note on the voiceschanged test: the engine also has a fallback timeout, but the test resolves via the event, so no fake timers are needed. The `whenReady()` promise must resolve as soon as a Hebrew voice is found.

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/utils/speech/webSpeechEngine.test.ts`
Expected: FAIL — cannot resolve `./webSpeechEngine`.

- [ ] **Step 4: Write the implementation**

Create `src/utils/speech/webSpeechEngine.ts`:
```ts
import type { SpeakOptions, SpeechEngine } from './types'

const VOICE_LOAD_TIMEOUT_MS = 2000
const DEFAULT_RATE = 0.85

/**
 * Web Speech API backend. Picks a Hebrew voice (preferring local ones).
 * getVoices() often returns [] until the async 'voiceschanged' event.
 */
export class WebSpeechEngine implements SpeechEngine {
  private voice: SpeechSynthesisVoice | null = null
  private readonly synth: SpeechSynthesis | null
  private readonly ready: Promise<void>

  constructor(synth?: SpeechSynthesis) {
    this.synth =
      synth ?? (typeof window !== 'undefined' ? window.speechSynthesis ?? null : null)
    this.ready = this.synth ? this.loadVoice(this.synth) : Promise.resolve()
  }

  private loadVoice(synth: SpeechSynthesis): Promise<void> {
    return new Promise((resolve) => {
      const pick = (): boolean => {
        const hebrew = synth
          .getVoices()
          .filter((v) => v.lang.toLowerCase().startsWith('he'))
        this.voice = hebrew.find((v) => v.localService) ?? hebrew[0] ?? null
        return this.voice !== null
      }

      if (pick()) {
        resolve()
        return
      }
      const timer = setTimeout(() => {
        pick()
        resolve()
      }, VOICE_LOAD_TIMEOUT_MS)
      synth.addEventListener('voiceschanged', () => {
        if (pick()) {
          clearTimeout(timer)
          resolve()
        }
      })
    })
  }

  whenReady(): Promise<void> {
    return this.ready
  }

  isAvailable(): boolean {
    return this.voice !== null
  }

  cancel(): void {
    this.synth?.cancel()
  }

  async speak(text: string, opts: SpeakOptions = {}): Promise<void> {
    await this.ready
    const synth = this.synth
    const voice = this.voice
    if (!synth || !voice) return
    synth.cancel()
    await new Promise<void>((resolve) => {
      const utterance = new SpeechSynthesisUtterance(text)
      utterance.voice = voice
      utterance.lang = voice.lang
      utterance.rate = opts.rate ?? DEFAULT_RATE
      utterance.volume = opts.volume ?? 1
      utterance.onend = () => resolve()
      utterance.onerror = () => resolve()
      synth.speak(utterance)
    })
  }
}
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/utils/speech/webSpeechEngine.test.ts`
Expected: all 4 tests PASS.

- [ ] **Step 6: Commit**

```
git add src/utils/speech/types.ts src/utils/speech/webSpeechEngine.ts src/utils/speech/webSpeechEngine.test.ts
git commit -m "Add swappable SpeechEngine interface with Web Speech backend"
```

---

### Task 3: Tap-cycle reducer + `SpeechProvider` + `useSpeech`

**Files:**
- Create: `src/utils/speech/tapCycle.ts`
- Test: `src/utils/speech/tapCycle.test.ts`
- Create: `src/components/stories/SpeechProvider.tsx`

**Interfaces:**
- Consumes: `SpeechEngine`, `WebSpeechEngine` (Task 2); `decodeWord`, `stripPunctuation` (Task 1); `useProgressStore` from `src/stores/progressStore.ts` (existing — `useProgressStore.getState().settings.volume` is a number 0-1).
- Produces:
  ```ts
  // tapCycle.ts
  export type TapMode = 'word' | 'decode'
  export interface TapState { wordKey: string | null; lastMode: TapMode | null }
  export const INITIAL_TAP_STATE: TapState
  export function nextTap(state: TapState, wordKey: string): { mode: TapMode; state: TapState }

  // SpeechProvider.tsx
  export function SpeechProvider(props: { engine?: SpeechEngine; children: ReactNode }): JSX.Element
  export function useSpeech(): {
    tapWord: (wordKey: string, word: string) => void
    speakingKey: string | null
    hebrewVoiceAvailable: boolean
  }
  ```

- [ ] **Step 1: Write the failing reducer tests**

Create `src/utils/speech/tapCycle.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import { INITIAL_TAP_STATE, nextTap } from './tapCycle'

describe('nextTap', () => {
  it('first tap on a word plays the word', () => {
    const { mode } = nextTap(INITIAL_TAP_STATE, 'p0:2')
    expect(mode).toBe('word')
  })

  it('second tap on the same word plays the decode', () => {
    const first = nextTap(INITIAL_TAP_STATE, 'p0:2')
    const second = nextTap(first.state, 'p0:2')
    expect(second.mode).toBe('decode')
  })

  it('third tap on the same word alternates back to the word', () => {
    const first = nextTap(INITIAL_TAP_STATE, 'p0:2')
    const second = nextTap(first.state, 'p0:2')
    const third = nextTap(second.state, 'p0:2')
    expect(third.mode).toBe('word')
  })

  it('tapping a different word resets to word mode', () => {
    const first = nextTap(INITIAL_TAP_STATE, 'p0:2')
    const other = nextTap(first.state, 'q1:0')
    expect(other.mode).toBe('word')
    const otherAgain = nextTap(other.state, 'q1:0')
    expect(otherAgain.mode).toBe('decode')
  })

  it('same word text at a different location is a different word', () => {
    const first = nextTap(INITIAL_TAP_STATE, 'p0:2')
    const sameTextElsewhere = nextTap(first.state, 'p1:5')
    expect(sameTextElsewhere.mode).toBe('word')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/utils/speech/tapCycle.test.ts`
Expected: FAIL — cannot resolve `./tapCycle`.

- [ ] **Step 3: Implement the reducer**

Create `src/utils/speech/tapCycle.ts`:
```ts
export type TapMode = 'word' | 'decode'

export interface TapState {
  /** Identity of the last-tapped word (location key, not text) */
  wordKey: string | null
  lastMode: TapMode | null
}

export const INITIAL_TAP_STATE: TapState = { wordKey: null, lastMode: null }

/**
 * Tap cycle: first tap on a word -> 'word', tap again -> 'decode',
 * then alternate. Tapping a different word starts over at 'word'.
 */
export function nextTap(
  state: TapState,
  wordKey: string
): { mode: TapMode; state: TapState } {
  const mode: TapMode =
    state.wordKey === wordKey && state.lastMode === 'word' ? 'decode' : 'word'
  return { mode, state: { wordKey, lastMode: mode } }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/utils/speech/tapCycle.test.ts`
Expected: all 5 tests PASS.

- [ ] **Step 5: Implement SpeechProvider (verified by Task 4's component test)**

Create `src/components/stories/SpeechProvider.tsx`:
```tsx
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { SpeechEngine } from '../../utils/speech/types'
import { WebSpeechEngine } from '../../utils/speech/webSpeechEngine'
import {
  INITIAL_TAP_STATE,
  nextTap,
  type TapState,
} from '../../utils/speech/tapCycle'
import { decodeWord, stripPunctuation } from '../../utils/decodeWord'
import { useProgressStore } from '../../stores/progressStore'

interface SpeechContextValue {
  /** Handle a tap on a word. wordKey identifies the word's location on screen. */
  tapWord: (wordKey: string, word: string) => void
  /** wordKey currently being spoken (for highlight), or null */
  speakingKey: string | null
  /** False when the device has no Hebrew voice */
  hebrewVoiceAvailable: boolean
}

const SpeechContext = createContext<SpeechContextValue | null>(null)

export function SpeechProvider({
  engine,
  children,
}: {
  engine?: SpeechEngine
  children: ReactNode
}) {
  const engineRef = useRef<SpeechEngine | null>(null)
  if (engineRef.current === null) {
    engineRef.current = engine ?? new WebSpeechEngine()
  }
  const tapStateRef = useRef<TapState>(INITIAL_TAP_STATE)
  const [speakingKey, setSpeakingKey] = useState<string | null>(null)
  const [hebrewVoiceAvailable, setHebrewVoiceAvailable] = useState(true)

  useEffect(() => {
    const currentEngine = engineRef.current
    if (!currentEngine) return
    let mounted = true
    void currentEngine.whenReady().then(() => {
      if (mounted) setHebrewVoiceAvailable(currentEngine.isAvailable())
    })
    return () => {
      mounted = false
      currentEngine.cancel()
    }
  }, [])

  const speakText = useCallback(async (key: string | null, text: string) => {
    const volume = useProgressStore.getState().settings.volume
    setSpeakingKey(key)
    try {
      await engineRef.current?.speak(text, { volume })
    } finally {
      setSpeakingKey((current) => (current === key ? null : current))
    }
  }, [])

  const tapWord = useCallback(
    (wordKey: string, word: string) => {
      const { mode, state } = nextTap(tapStateRef.current, wordKey)
      tapStateRef.current = state
      const text = mode === 'word' ? stripPunctuation(word) || word : decodeWord(word)
      void speakText(wordKey, text)
    },
    [speakText]
  )

  return (
    <SpeechContext.Provider
      value={{ tapWord, speakingKey, hebrewVoiceAvailable }}
    >
      {children}
    </SpeechContext.Provider>
  )
}

export function useSpeech(): SpeechContextValue {
  const ctx = useContext(SpeechContext)
  if (!ctx) throw new Error('useSpeech must be used inside SpeechProvider')
  return ctx
}
```

- [ ] **Step 6: Verify tsc and full test suite pass**

Run: `npx tsc --noEmit -p tsconfig.json && npm test`
Expected: no type errors; all tests pass.

- [ ] **Step 7: Commit**

```
git add src/utils/speech/tapCycle.ts src/utils/speech/tapCycle.test.ts src/components/stories/SpeechProvider.tsx
git commit -m "Add tap-cycle reducer and SpeechProvider context"
```

---

### Task 4: `TappableText` component

**Files:**
- Create: `src/components/stories/TappableText.tsx`
- Create: `src/components/stories/index.ts`
- Test: `src/components/stories/TappableText.test.tsx`

**Interfaces:**
- Consumes: `useSpeech` from `./SpeechProvider` (Task 3); `decodeWord` (Task 1, in test).
- Produces:
  ```tsx
  export interface TappableTextProps {
    text: string
    /** Unique per text block on screen; word keys are `${blockId}:${index}` */
    blockId: string
    fontSize?: string
    fontWeight?: number | string
    color?: string
  }
  export function TappableText(props: TappableTextProps): JSX.Element
  ```

- [ ] **Step 1: Write the failing component test**

Create `src/components/stories/TappableText.test.tsx`:
```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, fireEvent, screen, waitFor } from '@testing-library/react'
import { SpeechProvider } from './SpeechProvider'
import { TappableText } from './TappableText'
import { decodeWord } from '../../utils/decodeWord'
import type { SpeechEngine } from '../../utils/speech/types'

function makeMockEngine(): SpeechEngine & { spoken: string[] } {
  const spoken: string[] = []
  return {
    spoken,
    speak: vi.fn(async (text: string) => {
      spoken.push(text)
    }),
    cancel: vi.fn(),
    isAvailable: () => true,
    whenReady: () => Promise.resolve(),
  }
}

describe('TappableText', () => {
  it('renders each word as a separate tappable element', () => {
    const engine = makeMockEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="אַבָּא אוֹכֵל תַּפּוּחַ" blockId="t" />
      </SpeechProvider>
    )
    expect(screen.getByText('אַבָּא')).toBeTruthy()
    expect(screen.getByText('אוֹכֵל')).toBeTruthy()
    expect(screen.getByText('תַּפּוּחַ')).toBeTruthy()
  })

  it('first tap speaks the word, second tap speaks the decode, third the word again', async () => {
    const engine = makeMockEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="אַבָּא אוֹכֵל" blockId="t" />
      </SpeechProvider>
    )
    fireEvent.click(screen.getByText('אַבָּא'))
    await waitFor(() => expect(engine.spoken).toHaveLength(1))
    expect(engine.spoken[0]).toBe('אַבָּא')

    fireEvent.click(screen.getByText('אַבָּא'))
    await waitFor(() => expect(engine.spoken).toHaveLength(2))
    expect(engine.spoken[1]).toBe(decodeWord('אַבָּא'))

    fireEvent.click(screen.getByText('אַבָּא'))
    await waitFor(() => expect(engine.spoken).toHaveLength(3))
    expect(engine.spoken[2]).toBe('אַבָּא')
  })

  it('tapping a different word resets the cycle', async () => {
    const engine = makeMockEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="אַבָּא אוֹכֵל" blockId="t" />
      </SpeechProvider>
    )
    fireEvent.click(screen.getByText('אַבָּא'))
    fireEvent.click(screen.getByText('אוֹכֵל'))
    await waitFor(() => expect(engine.spoken).toHaveLength(2))
    expect(engine.spoken[1]).toBe('אוֹכֵל')
  })

  it('strips punctuation when speaking the word', async () => {
    const engine = makeMockEngine()
    render(
      <SpeechProvider engine={engine}>
        <TappableText text="בֹּקֶר טוֹב, מוֹתֶק!" blockId="t" />
      </SpeechProvider>
    )
    fireEvent.click(screen.getByText('מוֹתֶק!'))
    await waitFor(() => expect(engine.spoken).toHaveLength(1))
    expect(engine.spoken[0]).toBe('מוֹתֶק')
  })
})
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/components/stories/TappableText.test.tsx`
Expected: FAIL — cannot resolve `./TappableText`.

- [ ] **Step 3: Implement TappableText**

Create `src/components/stories/TappableText.tsx`:
```tsx
import { Fragment } from 'react'
import { motion } from 'framer-motion'
import { typography } from '../../styles/theme'
import { useSpeech } from './SpeechProvider'

export interface TappableTextProps {
  /** Text to render; split into tappable words on whitespace */
  text: string
  /** Unique per text block on screen; word keys are `${blockId}:${index}` */
  blockId: string
  fontSize?: string
  fontWeight?: number | string
  color?: string
}

/**
 * Renders Hebrew text as individually tappable words.
 * First tap on a word speaks it; second tap speaks its decode
 * (via the screen-wide tap cycle in SpeechProvider).
 */
export function TappableText({
  text,
  blockId,
  fontSize,
  fontWeight,
  color,
}: TappableTextProps) {
  const { tapWord, speakingKey } = useSpeech()
  const words = text.split(/\s+/).filter(Boolean)

  return (
    <span
      style={{
        direction: 'rtl',
        unicodeBidi: 'plaintext',
        fontFamily: typography.fontFamily.hebrew,
        fontSize,
        fontWeight,
        color,
      }}
    >
      {words.map((word, index) => {
        const wordKey = `${blockId}:${index}`
        const isActive = speakingKey === wordKey
        return (
          <Fragment key={wordKey}>
            <motion.span
              onClick={(event) => {
                event.stopPropagation()
                tapWord(wordKey, word)
              }}
              animate={isActive ? { scale: [1, 1.12, 1] } : { scale: 1 }}
              transition={{ duration: 0.35 }}
              style={{
                cursor: 'pointer',
                display: 'inline-block',
                borderRadius: '8px',
                padding: '0 3px',
                backgroundColor: isActive
                  ? 'rgba(255, 213, 79, 0.65)'
                  : 'transparent',
                transition: 'background-color 0.2s',
              }}
            >
              {word}
            </motion.span>{' '}
          </Fragment>
        )
      })}
    </span>
  )
}

export default TappableText
```

Create `src/components/stories/index.ts`:
```ts
export { SpeechProvider, useSpeech } from './SpeechProvider'
export { TappableText } from './TappableText'
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/components/stories/TappableText.test.tsx`
Expected: all 4 tests PASS.

- [ ] **Step 5: Commit**

```
git add src/components/stories/TappableText.tsx src/components/stories/TappableText.test.tsx src/components/stories/index.ts
git commit -m "Add TappableText with word/decode tap cycle"
```

---

### Task 5: Story types + `stories.yaml` (5 stories) + data validation test

**Files:**
- Create: `src/types/story.ts`
- Create: `src/data/stories.yaml`
- Test: `src/data/stories.test.ts`

**Interfaces:**
- Consumes: `decodeWord`, `stripPunctuation` (Task 1).
- Produces:
  ```ts
  // src/types/story.ts
  export interface StoryQuestion { question: string; options: string[]; correctIndex: number }
  export interface Story {
    id: string
    title: string
    difficulty: number
    emoji: string
    paragraphs: string[]
    questions: StoryQuestion[]
  }
  export interface StoriesData { stories: Story[] }
  ```
  and `src/data/stories.yaml` matching `StoriesData`.

- [ ] **Step 1: Create the types**

Create `src/types/story.ts`:
```ts
/**
 * Story reading game types (see src/data/stories.yaml)
 */
export interface StoryQuestion {
  /** Fully vocalized Hebrew question */
  question: string
  /** Exactly 3 short vocalized answer options */
  options: string[]
  /** Index (0-2) of the correct option */
  correctIndex: number
}

export interface Story {
  id: string
  /** Fully vocalized Hebrew title */
  title: string
  /** 1-3; controls ordering in the picker */
  difficulty: number
  /** Cover icon for the story list */
  emoji: string
  /** Fully vocalized paragraphs */
  paragraphs: string[]
  questions: StoryQuestion[]
}

export interface StoriesData {
  stories: Story[]
}
```

- [ ] **Step 2: Write the failing validation test**

Create `src/data/stories.test.ts`:
```ts
import { describe, it, expect } from 'vitest'
import storiesYaml from './stories.yaml'
import type { StoriesData } from '../types/story'
import { decodeWord, stripPunctuation } from '../utils/decodeWord'

const { stories } = storiesYaml as StoriesData

describe('stories.yaml', () => {
  it('has 5 stories', () => {
    expect(stories).toHaveLength(5)
  })

  it('has unique ids', () => {
    const ids = stories.map((s) => s.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it.each(stories.map((s) => [s.id, s] as const))(
    '%s has valid questions',
    (_id, story) => {
      expect(story.questions.length).toBeGreaterThanOrEqual(3)
      expect(story.questions.length).toBeLessThanOrEqual(4)
      for (const q of story.questions) {
        expect(q.options).toHaveLength(3)
        expect(q.correctIndex).toBeGreaterThanOrEqual(0)
        expect(q.correctIndex).toBeLessThanOrEqual(2)
      }
    }
  )

  it.each(stories.map((s) => [s.id, s] as const))(
    'every word in %s decodes without fallback',
    (_id, story) => {
      const texts = [
        story.title,
        ...story.paragraphs,
        ...story.questions.flatMap((q) => [q.question, ...q.options]),
      ]
      for (const text of texts) {
        for (const word of text.split(/\s+/).filter(Boolean)) {
          if (stripPunctuation(word).length === 0) continue // pure punctuation like "—"
          const decoded = decodeWord(word)
          // fallback output contains no " - " separator
          expect(decoded, `word "${word}" did not decode`).toContain(' - ')
        }
      }
    }
  )
})
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `npx vitest run src/data/stories.test.ts`
Expected: FAIL — cannot resolve `./stories.yaml`.

- [ ] **Step 4: Create the story content**

Create `src/data/stories.yaml` with EXACTLY this content (fully vocalized, ~40-80 words each, 5 themes: pets, adventure, funny, magic, Jungle Book):
```yaml
# Short Hebrew stories with comprehension questions
# All text fully vocalized for first graders

stories:
  - id: hakelev-shel-dani
    title: הַכֶּלֶב שֶׁל דָּנִי
    difficulty: 1
    emoji: 🐶
    paragraphs:
      - דָּנִי מָצָא כֶּלֶב קָטָן בַּגַּן. הַכֶּלֶב הָיָה עָצוּב וְרָעֵב. דָּנִי נָתַן לוֹ מַיִם וְלֶחֶם. הַכֶּלֶב אָכַל וְשָׂמַח.
      - דָּנִי קָרָא לַכֶּלֶב מוֹתֶק. עַכְשָׁו מוֹתֶק גָּר בַּבַּיִת שֶׁל דָּנִי. בַּבֹּקֶר מוֹתֶק נוֹבֵחַ הַב הַב! דָּנִי צוֹחֵק וְאוֹמֵר בֹּקֶר טוֹב, מוֹתֶק!
    questions:
      - question: מָה מָצָא דָּנִי בַּגַּן?
        options: [חָתוּל גָּדוֹל, כֶּלֶב קָטָן, צִפּוֹר קְטַנָּה]
        correctIndex: 1
      - question: מָה נָתַן דָּנִי לַכֶּלֶב?
        options: [מַיִם וְלֶחֶם, עוּגָה וּגְלִידָה, כַּדּוּר אָדֹם]
        correctIndex: 0
      - question: אֵיךְ קוֹרְאִים לַכֶּלֶב?
        options: [שׁוֹקוֹ, רֶקְס, מוֹתֶק]
        correctIndex: 2
      - question: מָה עוֹשֶׂה מוֹתֶק בַּבֹּקֶר?
        options: [יָשֵׁן בַּמִּטָּה, נוֹבֵחַ הַב הַב, אוֹכֵל עוּגָה]
        correctIndex: 1

  - id: hamapa-hasodit
    title: הַמַּפָּה הַסּוֹדִית
    difficulty: 2
    emoji: 🗺️
    paragraphs:
      - יוֹם אֶחָד נוֹעָה מָצְאָה מַפָּה יְשָׁנָה בֶּחָצֵר. עַל הַמַּפָּה הָיָה חֵץ אָדֹם וְגַם אִיקְס גָּדוֹל. נוֹעָה קָרְאָה לְיוֹנָתָן בּוֹא מַהֵר! יֵשׁ פֹּה סוֹד!
      - הֵם הָלְכוּ אַחֲרֵי הַחֵץ עַד הָעֵץ הַגָּדוֹל. שָׁם הֵם חָפְרוּ בּוֹר קָטָן וּמָצְאוּ קֻפְסָה. בַּקֻּפְסָה הָיוּ מַטְבְּעוֹת שֶׁל שׁוֹקוֹלָד וּפֶתֶק מִסַּבָּא כָּל הַכָּבוֹד, בַּלָּשִׁים קְטַנִּים!
    questions:
      - question: מָה מָצְאָה נוֹעָה בֶּחָצֵר?
        options: [מַפָּה יְשָׁנָה, כַּדּוּר חָדָשׁ, סֵפֶר גָּדוֹל]
        correctIndex: 0
      - question: לְאָן הוֹבִיל הַחֵץ?
        options: [אֶל הַבַּיִת, אֶל הָעֵץ הַגָּדוֹל, אֶל הַגַּן]
        correctIndex: 1
      - question: מָה הָיָה בַּקֻּפְסָה?
        options: [מַטְבְּעוֹת שֶׁל שׁוֹקוֹלָד, אֲבָנִים קְטַנּוֹת, מַיִם קָרִים]
        correctIndex: 0
      - question: מִי כָּתַב אֶת הַפֶּתֶק?
        options: [אִמָּא, יוֹנָתָן, סַבָּא]
        correctIndex: 2

  - id: hakarich-hamuzar
    title: הַכְּרִיךְ הַמּוּזָר
    difficulty: 2
    emoji: 🥪
    paragraphs:
      - בַּבֹּקֶר אַבָּא הָיָה עָיֵף מְאֹד. הוּא הֵכִין כְּרִיךְ לְרוֹנִי לְבֵית הַסֵּפֶר. הוּא שָׂם בַּכְּרִיךְ גְּבִינָה צְהֻבָּה, וְגַם... גֶּרֶב אָדֹם!
      - בַּהַפְסָקָה רוֹנִי פָּתְחָה אֶת הַתִּיק וְצָחֲקָה בְּקוֹל גָּדוֹל אַבָּא שָׂם לִי גֶּרֶב בַּכְּרִיךְ! כָּל הַיְּלָדִים צָחֲקוּ. בָּעֶרֶב אַבָּא אָמַר סְלִיחָה, רוֹנִי. מָחָר אַתְּ מְכִינָה אֶת הַכְּרִיךְ!
    questions:
      - question: מָה שָׂם אַבָּא בַּכְּרִיךְ?
        options: [רַק גְּבִינָה, שׁוֹקוֹלָד וּבָנָנָה, גְּבִינָה וְגֶרֶב]
        correctIndex: 2
      - question: לָמָּה אַבָּא שָׂם גֶּרֶב בַּכְּרִיךְ?
        options: [כִּי הוּא הָיָה עָיֵף, כִּי זֶה טָעִים, כִּי רוֹנִי בִּקְּשָׁה]
        correctIndex: 0
      - question: מָה עָשְׂתָה רוֹנִי בַּהַפְסָקָה?
        options: [בָּכְתָה, צָחֲקָה בְּקוֹל, יָשְׁנָה]
        correctIndex: 1
      - question: מִי מֵכִין אֶת הַכְּרִיךְ מָחָר?
        options: [אַבָּא, אִמָּא, רוֹנִי]
        correctIndex: 2

  - id: haiparon-hakasum
    title: הָעִפָּרוֹן הַקָּסוּם
    difficulty: 3
    emoji: ✏️
    paragraphs:
      - לְמַיָּה יֵשׁ עִפָּרוֹן קָסוּם. כָּל מָה שֶׁמַּיָּה מְצַיֶּרֶת נִהְיֶה אֲמִתִּי! מַיָּה צִיְּרָה פַּרְפַּר, וְהַפַּרְפַּר עָף בַּחֶדֶר.
      - אַחַר כָּךְ מַיָּה צִיְּרָה עוּגָה גְּדוֹלָה עִם שׁוֹקוֹלָד. הָעוּגָה הָיְתָה טְעִימָה מְאֹד! בַּסּוֹף מַיָּה צִיְּרָה מַתָּנָה לְאִמָּא פֶּרַח גָּדוֹל וְיָפֶה. אִמָּא חִבְּקָה אֶת מַיָּה וְאָמְרָה אַתְּ יַלְדָּה מְתוּקָה!
    questions:
      - question: מָה יֵשׁ לְמַיָּה?
        options: [עִפָּרוֹן קָסוּם, כֶּלֶב קָטָן, כַּדּוּר גָּדוֹל]
        correctIndex: 0
      - question: מָה קוֹרֶה כְּשֶׁמַּיָּה מְצַיֶּרֶת?
        options: [הַצִּיּוּר נֶעְלָם, הַצִּיּוּר נִהְיֶה אֲמִתִּי, כְּלוּם לֹא קוֹרֶה]
        correctIndex: 1
      - question: מָה צִיְּרָה מַיָּה לְאִמָּא?
        options: [עוּגָה גְּדוֹלָה, פַּרְפַּר קָטָן, פֶּרַח גָּדוֹל]
        correctIndex: 2
      - question: מִי חִבְּקָה אֶת מַיָּה?
        options: [אִמָּא, סַבְתָּא, רוֹנִי]
        correctIndex: 0

  - id: mogli-vehanamer
    title: מוֹגְלִי וְהַנָּמֵר
    difficulty: 3
    emoji: 🐯
    paragraphs:
      - מוֹגְלִי הוּא יֶלֶד שֶׁגָּר בַּיַּעַר עִם הַזְּאֵבִים. הַזְּאֵבִים הֵם הַמִּשְׁפָּחָה שֶׁלּוֹ. בַּיַּעַר גָּר גַּם נָמֵר גָּדוֹל וְרַע שְׁמוֹ שֶׁר־חָאן. שֶׁר־חָאן לֹא אוֹהֵב אֶת מוֹגְלִי.
      - לַיְלָה אֶחָד שֶׁר־חָאן בָּא אֶל הַכְּפָר. מוֹגְלִי לֹא בָּרַח וְלֹא בָּכָה. הוּא הֵרִים עָנָף עִם אֵשׁ. שֶׁר־חָאן פָּחַד מִן הָאֵשׁ וּבָרַח מַהֵר אֶל הַיַּעַר. כָּל הַזְּאֵבִים קָרְאוּ מוֹגְלִי גִּבּוֹר!
    questions:
      - question: אֵיפֹה גָּר מוֹגְלִי?
        options: [בַּיַּעַר עִם הַזְּאֵבִים, בַּבַּיִת עִם אַבָּא, בַּגַּן הַגָּדוֹל]
        correctIndex: 0
      - question: מִי הוּא שֶׁר־חָאן?
        options: [זְאֵב קָטָן, נָמֵר גָּדוֹל וְרַע, יֶלֶד מִן הַכְּפָר]
        correctIndex: 1
      - question: מִמָּה פָּחַד שֶׁר־חָאן?
        options: [מִן הַמַּיִם, מִן הַזְּאֵבִים, מִן הָאֵשׁ]
        correctIndex: 2
      - question: מָה קָרְאוּ הַזְּאֵבִים?
        options: [מוֹגְלִי גִּבּוֹר, בֹּקֶר טוֹב, לַיְלָה טוֹב]
        correctIndex: 0
```

- [ ] **Step 5: Run tests to verify they pass**

Run: `npx vitest run src/data/stories.test.ts`
Expected: all tests PASS. If a "did not decode" failure appears, the failing word contains a character outside the letter/mark maps — fix the word's niqqud in the YAML (do NOT weaken `decodeWord`); if the character is a legitimate niqqud missing from `EXTRA_MARK_NAMES`, add it there with its vocalized Hebrew name.

- [ ] **Step 6: Commit**

```
git add src/types/story.ts src/data/stories.yaml src/data/stories.test.ts
git commit -m "Add 5 vocalized stories with comprehension questions"
```

---

### Task 6: Routes, Home entry, story picker page

**Files:**
- Modify: `src/stores/progressStore.ts` (line ~22: widen `initializeNode` level union)
- Modify: `src/App.tsx` (add 2 routes + imports)
- Modify: `src/pages/Home/HomePage.tsx` (add stories level card)
- Create: `src/pages/Stories/StoriesPage.tsx`

**Interfaces:**
- Consumes: `StoriesData` (Task 5); existing `useProgressStore` (`getNodeProgress(nodeId)` returns `NodeProgress | undefined` with `state: 'locked' | 'available' | 'in_progress' | 'mastered'`).
- Produces: route `/stories` (picker) and `/stories/:storyId` (Task 7's `StoryView`); node-id convention `stories-<storyId>`; completed = `getNodeProgress(\`stories-${id}\`)?.state === 'mastered'`.

- [ ] **Step 1: Widen the progress store level union**

In `src/stores/progressStore.ts`, change:
```ts
  initializeNode: (nodeId: string, level: 'letters' | 'nikkud' | 'words' | 'sentences') => void
```
to:
```ts
  initializeNode: (nodeId: string, level: 'letters' | 'nikkud' | 'words' | 'sentences' | 'stories') => void
```
(The implementation ignores the `level` param, so nothing else changes.)

- [ ] **Step 2: Create StoriesPage**

Create `src/pages/Stories/StoriesPage.tsx`:
```tsx
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { useProgressStore } from '../../stores/progressStore'
import storiesYaml from '../../data/stories.yaml'
import type { StoriesData } from '../../types/story'

const { stories } = storiesYaml as StoriesData

/**
 * StoriesPage - story picker for the story reading game
 */
export function StoriesPage() {
  const navigate = useNavigate()
  const getNodeProgress = useProgressStore((state) => state.getNodeProgress)
  const sorted = [...stories].sort((a, b) => a.difficulty - b.difficulty)

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: spacing[4],
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: spacing[3],
          width: '100%',
          maxWidth: '600px',
          padding: `${spacing[4]} 0`,
        }}
      >
        <motion.button
          onClick={() => navigate('/')}
          style={{
            border: 'none',
            backgroundColor: colors.neutral[100],
            borderRadius: borderRadius.full,
            width: '44px',
            height: '44px',
            fontSize: '1.25rem',
            cursor: 'pointer',
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          →
        </motion.button>
        <h1
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize['3xl'],
            fontWeight: typography.fontWeight.bold,
            color: colors.primary[600],
            margin: '0 auto',
            direction: 'rtl',
          }}
        >
          📚 סִפּוּרִים
        </h1>
        <div style={{ width: '44px' }} />
      </header>

      <main
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: spacing[4],
          width: '100%',
          maxWidth: '600px',
        }}
      >
        {sorted.map((story, index) => {
          const completed =
            getNodeProgress(`stories-${story.id}`)?.state === 'mastered'
          return (
            <motion.button
              key={story.id}
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.08 * index }}
              onClick={() => navigate(`/stories/${story.id}`)}
              style={{
                display: 'flex',
                flexDirection: 'row-reverse',
                alignItems: 'center',
                gap: spacing[4],
                padding: spacing[4],
                borderRadius: borderRadius['2xl'],
                border: `2px solid ${colors.primary[200]}`,
                backgroundColor: colors.surface,
                boxShadow: shadows.md,
                cursor: 'pointer',
                width: '100%',
              }}
              whileHover={{ scale: 1.02, boxShadow: shadows.lg }}
              whileTap={{ scale: 0.98 }}
            >
              <span style={{ fontSize: '3rem', lineHeight: 1 }}>{story.emoji}</span>
              <span
                style={{
                  flex: 1,
                  fontFamily: typography.fontFamily.hebrew,
                  fontSize: typography.fontSize['2xl'],
                  fontWeight: typography.fontWeight.semibold,
                  color: colors.text.primary,
                  direction: 'rtl',
                  textAlign: 'right',
                }}
              >
                {story.title}
              </span>
              <span style={{ fontSize: typography.fontSize.sm }}>
                {'⭐'.repeat(story.difficulty)}
              </span>
              {completed && <span style={{ fontSize: '1.5rem' }}>✅</span>}
            </motion.button>
          )
        })}
      </main>
    </div>
  )
}

export default StoriesPage
```

- [ ] **Step 3: Add routes in App.tsx**

In `src/App.tsx` add imports after the `SentenceGroupView` import:
```ts
import StoriesPage from './pages/Stories/StoriesPage'
import StoryView from './pages/Stories/StoryView'
```
and routes after the sentences routes:
```tsx
        <Route path="/stories" element={<StoriesPage />} />
        <Route path="/stories/:storyId" element={<StoryView />} />
```
NOTE: `StoryView` doesn't exist until Task 7. To keep this task independently buildable, create a placeholder `src/pages/Stories/StoryView.tsx`:
```tsx
import { Navigate } from 'react-router-dom'

/** Placeholder until the story reading view lands (next task) */
export function StoryView() {
  return <Navigate to="/stories" replace />
}

export default StoryView
```

- [ ] **Step 4: Add the Home screen card**

In `src/pages/Home/HomePage.tsx`:

1. Widen the `LevelInfo` union:
```ts
interface LevelInfo {
  id: 'letters' | 'nikkud' | 'words' | 'sentences' | 'stories'
  name: string
  description: string
  icon: string
  path: string
}
```
2. Append to the `LEVELS` array:
```ts
  {
    id: 'stories',
    name: 'סיפורים',
    description: 'קרא סיפור וענה על שאלות',
    icon: '📚',
    path: '/stories',
  },
```
3. Stories is always unlocked. Change `handleLevelClick`:
```ts
  const handleLevelClick = (level: LevelInfo) => {
    if (level.id === 'stories' || isLevelUnlocked(level.id)) {
      navigate(level.path)
    }
  }
```
and inside the `LEVELS.map` change the `unlocked` line to:
```ts
          const unlocked = level.id === 'stories' || isLevelUnlocked(level.id)
```
(`levels[level.id]` is `Record<string, LevelProgress>` so `levels['stories']` is safely `undefined` → progress 0.)

- [ ] **Step 5: Verify build, types, tests**

Run: `npx tsc --noEmit -p tsconfig.json && npm test && npm run build`
Expected: all pass; build outputs `dist/`.

- [ ] **Step 6: Manual smoke check (dev server)**

Run: `npm run dev` (background), open `http://localhost:5173/alef/` — Home shows a 5th card "סיפורים" (unlocked); clicking it shows the 5 story cards; clicking a story bounces back to the picker (placeholder). Stop the dev server.

- [ ] **Step 7: Commit**

```
git add src/stores/progressStore.ts src/App.tsx src/pages/Home/HomePage.tsx src/pages/Stories/StoriesPage.tsx src/pages/Stories/StoryView.tsx
git commit -m "Add stories route, picker page, and Home entry"
```

---

### Task 7: StoryView — reading phase, quiz phase, celebration, progress

**Files:**
- Modify: `src/pages/Stories/StoryView.tsx` (replace placeholder)
- Create: `src/pages/Stories/StoryReadView.tsx`
- Create: `src/pages/Stories/StoryQuizView.tsx`

**Interfaces:**
- Consumes: `SpeechProvider`, `useSpeech`, `TappableText` from `src/components/stories` (Tasks 3-4); `Story`, `StoriesData` (Task 5); existing `useSoundEffects` from `src/hooks/useAudio.ts` (`playSuccess/playError/playCelebrate: () => Promise<void>`); existing `FeedbackOverlay` from `src/components/common/FeedbackOverlay.tsx` (props: `visible: boolean`, `type: 'success' | 'error' | 'celebration'`, `autoHideMs?: number`); existing progress store actions `initializeNode(nodeId, 'stories')`, `recordAttempt(nodeId, { itemId, correct, timeMs, timestamp })`, `setNodeState(nodeId, 'mastered')`.
- Produces: working `/stories/:storyId` flow: read → quiz → celebration → back to picker; completion recorded so the picker's ✅ appears.

- [ ] **Step 1: Create StoryReadView**

Create `src/pages/Stories/StoryReadView.tsx`:
```tsx
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { TappableText } from '../../components/stories'
import type { Story } from '../../types/story'

export interface StoryReadViewProps {
  story: Story
  onFinished: () => void
}

/**
 * StoryReadView - the reading screen. Title + paragraphs, every word tappable.
 */
export function StoryReadView({ story, onFinished }: StoryReadViewProps) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[5],
        width: '100%',
        maxWidth: '600px',
      }}
    >
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        style={{
          padding: spacing[5],
          backgroundColor: colors.surface,
          borderRadius: borderRadius['2xl'],
          boxShadow: shadows.lg,
        }}
      >
        <h1 style={{ textAlign: 'center', margin: 0, marginBottom: spacing[4] }}>
          <TappableText
            text={`${story.emoji} ${story.title}`}
            blockId="title"
            fontSize={typography.fontSize['3xl']}
            fontWeight={typography.fontWeight.bold}
            color={colors.primary[600]}
          />
        </h1>
        {story.paragraphs.map((paragraph, index) => (
          <p
            key={index}
            style={{
              direction: 'rtl',
              textAlign: 'right',
              lineHeight: 2.4,
              margin: 0,
              marginBottom: spacing[4],
            }}
          >
            <TappableText
              text={paragraph}
              blockId={`p${index}`}
              fontSize={typography.fontSize['2xl']}
              color={colors.text.primary}
            />
          </p>
        ))}
      </motion.div>

      <motion.button
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        onClick={onFinished}
        style={{
          padding: `${spacing[3]} ${spacing[4]}`,
          borderRadius: borderRadius.xl,
          border: 'none',
          backgroundColor: colors.primary[500],
          boxShadow: shadows.md,
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: colors.surface,
          cursor: 'pointer',
        }}
        whileHover={{ scale: 1.02, backgroundColor: colors.primary[600] }}
        whileTap={{ scale: 0.98 }}
      >
        סִיַּמְתִּי לִקְרֹא ←
      </motion.button>
    </div>
  )
}

export default StoryReadView
```

- [ ] **Step 2: Create StoryQuizView**

Create `src/pages/Stories/StoryQuizView.tsx`:
```tsx
import { useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { TappableText } from '../../components/stories'
import { FeedbackOverlay, type FeedbackType } from '../../components/common/FeedbackOverlay'
import { useSoundEffects } from '../../hooks/useAudio'
import type { Story } from '../../types/story'

export interface StoryQuizViewProps {
  story: Story
  /** Called with per-question first-try correctness when all questions are answered */
  onComplete: (firstTryCorrect: boolean[]) => void
}

/**
 * StoryQuizView - one multiple-choice question at a time.
 * Tapping a word in the question/answers speaks it (stopPropagation in
 * TappableText); tapping an answer card outside a word selects the answer.
 */
export function StoryQuizView({ story, onComplete }: StoryQuizViewProps) {
  const [questionIndex, setQuestionIndex] = useState(0)
  const [storyOpen, setStoryOpen] = useState(false)
  const [wrongThisQuestion, setWrongThisQuestion] = useState(false)
  const [feedback, setFeedback] = useState<FeedbackType | null>(null)
  const firstTryRef = useRef<boolean[]>([])
  const { playSuccess, playError } = useSoundEffects()

  const question = story.questions[questionIndex]

  const handleAnswer = (optionIndex: number) => {
    if (feedback === 'success') return

    if (optionIndex === question.correctIndex) {
      void playSuccess()
      firstTryRef.current[questionIndex] = !wrongThisQuestion
      setFeedback('success')
      setTimeout(() => {
        setFeedback(null)
        setWrongThisQuestion(false)
        if (questionIndex + 1 < story.questions.length) {
          setQuestionIndex(questionIndex + 1)
        } else {
          onComplete(firstTryRef.current)
        }
      }, 1200)
    } else {
      void playError()
      setWrongThisQuestion(true)
      setFeedback('error')
      setTimeout(() => setFeedback(null), 1000)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: spacing[4],
        width: '100%',
        maxWidth: '600px',
      }}
    >
      {/* Collapsible story panel for peeking back */}
      <div
        style={{
          backgroundColor: colors.primary[50],
          borderRadius: borderRadius.xl,
          padding: spacing[3],
        }}
      >
        <button
          onClick={() => setStoryOpen(!storyOpen)}
          style={{
            border: 'none',
            background: 'none',
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.lg,
            color: colors.primary[700],
            cursor: 'pointer',
            width: '100%',
            direction: 'rtl',
            textAlign: 'right',
          }}
        >
          📖 הַסִּפּוּר {storyOpen ? '▲' : '▼'}
        </button>
        <AnimatePresence>
          {storyOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              style={{ overflow: 'hidden' }}
            >
              {story.paragraphs.map((paragraph, index) => (
                <p
                  key={index}
                  style={{
                    direction: 'rtl',
                    textAlign: 'right',
                    lineHeight: 2.2,
                    margin: `${spacing[3]} 0 0 0`,
                  }}
                >
                  <TappableText
                    text={paragraph}
                    blockId={`peek-p${index}`}
                    fontSize={typography.fontSize.lg}
                    color={colors.text.primary}
                  />
                </p>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Question */}
      <motion.div
        key={questionIndex}
        initial={{ x: -30, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        style={{
          padding: spacing[4],
          backgroundColor: colors.surface,
          borderRadius: borderRadius['2xl'],
          boxShadow: shadows.lg,
        }}
      >
        <p
          style={{
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.sm,
            color: colors.text.secondary,
            direction: 'rtl',
            margin: 0,
            marginBottom: spacing[2],
          }}
        >
          שְׁאֵלָה {questionIndex + 1} מִתּוֹךְ {story.questions.length}
        </p>
        <h2 style={{ direction: 'rtl', textAlign: 'right', margin: 0 }}>
          <TappableText
            text={question.question}
            blockId={`q${questionIndex}`}
            fontSize={typography.fontSize['2xl']}
            fontWeight={typography.fontWeight.bold}
            color={colors.text.primary}
          />
        </h2>
      </motion.div>

      {/* Answer cards */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: spacing[3] }}>
        {question.options.map((option, optionIndex) => (
          <motion.button
            key={`${questionIndex}-${optionIndex}`}
            onClick={() => handleAnswer(optionIndex)}
            initial={{ y: 15, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 * optionIndex }}
            style={{
              padding: spacing[4],
              borderRadius: borderRadius.xl,
              border: `2px solid ${colors.primary[200]}`,
              backgroundColor: colors.surface,
              boxShadow: shadows.sm,
              cursor: 'pointer',
              direction: 'rtl',
              textAlign: 'right',
            }}
            whileHover={{ scale: 1.02, backgroundColor: colors.primary[50] }}
            whileTap={{ scale: 0.97 }}
          >
            <TappableText
              text={option}
              blockId={`q${questionIndex}-o${optionIndex}`}
              fontSize={typography.fontSize.xl}
              color={colors.primary[700]}
            />
          </motion.button>
        ))}
      </div>

      <FeedbackOverlay
        visible={feedback !== null}
        type={feedback ?? 'success'}
        autoHideMs={0}
      />
    </div>
  )
}

export default StoryQuizView
```

- [ ] **Step 3: Replace the StoryView placeholder**

Replace `src/pages/Stories/StoryView.tsx` with:
```tsx
import { useCallback, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams, Navigate } from 'react-router-dom'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { SpeechProvider, useSpeech } from '../../components/stories'
import { useProgressStore } from '../../stores/progressStore'
import { useSoundEffects } from '../../hooks/useAudio'
import storiesYaml from '../../data/stories.yaml'
import type { StoriesData, Story } from '../../types/story'
import { StoryReadView } from './StoryReadView'
import { StoryQuizView } from './StoryQuizView'

const { stories } = storiesYaml as StoriesData

/**
 * StoryView - a full story session: read -> quiz -> celebration.
 * Wraps everything in SpeechProvider so the tap cycle spans the screen.
 */
export function StoryView() {
  const { storyId } = useParams()
  const story = stories.find((s) => s.id === storyId)
  if (!story) return <Navigate to="/stories" replace />
  return (
    <SpeechProvider>
      <StorySession story={story} />
    </SpeechProvider>
  )
}

type Phase = 'read' | 'quiz' | 'done'

function StorySession({ story }: { story: Story }) {
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('read')
  const { hebrewVoiceAvailable } = useSpeech()
  const initializeNode = useProgressStore((state) => state.initializeNode)
  const recordAttempt = useProgressStore((state) => state.recordAttempt)
  const setNodeState = useProgressStore((state) => state.setNodeState)

  const handleQuizComplete = useCallback(
    (firstTryCorrect: boolean[]) => {
      const nodeId = `stories-${story.id}`
      initializeNode(nodeId, 'stories')
      firstTryCorrect.forEach((correct, index) => {
        recordAttempt(nodeId, {
          itemId: `${story.id}-q${index}`,
          correct,
          timeMs: 0,
          timestamp: Date.now(),
        })
      })
      setNodeState(nodeId, 'mastered')
      setPhase('done')
    },
    [story.id, initializeNode, recordAttempt, setNodeState]
  )

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: colors.background,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: spacing[4],
        gap: spacing[4],
      }}
    >
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          width: '100%',
          maxWidth: '600px',
        }}
      >
        <motion.button
          onClick={() => navigate('/stories')}
          style={{
            border: 'none',
            backgroundColor: colors.neutral[100],
            borderRadius: borderRadius.full,
            width: '44px',
            height: '44px',
            fontSize: '1.25rem',
            cursor: 'pointer',
          }}
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.95 }}
        >
          →
        </motion.button>
      </header>

      {!hebrewVoiceAvailable && (
        <div
          style={{
            backgroundColor: colors.primary[50],
            borderRadius: borderRadius.xl,
            padding: spacing[3],
            maxWidth: '600px',
            width: '100%',
            fontFamily: typography.fontFamily.hebrew,
            fontSize: typography.fontSize.base,
            color: colors.text.secondary,
            direction: 'rtl',
            textAlign: 'center',
          }}
        >
          🔇 אֵין קוֹל עִבְרִי בַּמַּכְשִׁיר הַזֶּה — אֶפְשָׁר לִקְרֹא בְּלִי שֶׁמַע
        </div>
      )}

      {phase === 'read' && (
        <StoryReadView story={story} onFinished={() => setPhase('quiz')} />
      )}
      {phase === 'quiz' && (
        <StoryQuizView story={story} onComplete={handleQuizComplete} />
      )}
      {phase === 'done' && (
        <StoryCelebration onBack={() => navigate('/stories')} />
      )}
    </div>
  )
}

function StoryCelebration({ onBack }: { onBack: () => void }) {
  const { playCelebrate } = useSoundEffects()

  useEffect(() => {
    void playCelebrate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <motion.div
      initial={{ scale: 0.6, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: spacing[5],
        padding: spacing[8],
        backgroundColor: colors.surface,
        borderRadius: borderRadius['2xl'],
        boxShadow: shadows.lg,
        maxWidth: '600px',
        width: '100%',
        textAlign: 'center',
      }}
    >
      <motion.span
        style={{ fontSize: '5rem', lineHeight: 1 }}
        animate={{ rotate: [0, -10, 10, 0] }}
        transition={{ repeat: 2, duration: 0.6 }}
      >
        🎉
      </motion.span>
      <h1
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize['4xl'],
          fontWeight: typography.fontWeight.bold,
          color: colors.primary[600],
          margin: 0,
        }}
      >
        כָּל הַכָּבוֹד!
      </h1>
      <p
        style={{
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.xl,
          color: colors.text.secondary,
          margin: 0,
        }}
      >
        סִיַּמְתָּ אֶת הַסִּפּוּר וְעָנִיתָ עַל כָּל הַשְּׁאֵלוֹת!
      </p>
      <motion.button
        onClick={onBack}
        style={{
          padding: `${spacing[3]} ${spacing[6]}`,
          borderRadius: borderRadius.xl,
          border: 'none',
          backgroundColor: colors.primary[500],
          boxShadow: shadows.md,
          fontFamily: typography.fontFamily.hebrew,
          fontSize: typography.fontSize.xl,
          fontWeight: typography.fontWeight.semibold,
          color: colors.surface,
          cursor: 'pointer',
        }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        עוֹד סִפּוּר 📚
      </motion.button>
    </motion.div>
  )
}

export default StoryView
```
Note: if `eslint-disable-next-line react-hooks/exhaustive-deps` is flagged as an unused disable directive by the lint setup, remove the comment line entirely (the empty dep array is intentional: celebrate exactly once on mount).

- [ ] **Step 4: Verify build, types, tests**

Run: `npx tsc --noEmit -p tsconfig.json && npm test && npm run build`
Expected: all pass.

- [ ] **Step 5: Manual smoke check (dev server)**

Run: `npm run dev` (background), open `http://localhost:5173/alef/#/stories`:
1. Open a story → title + 2 paragraphs render RTL with niqqud.
2. Click a word → it highlights (yellow pulse). Click it again → highlight again (decode is longer). On Windows/Edge speech may be poor or absent — layout/highlight behavior is what's being verified here.
3. Click "סִיַּמְתִּי לִקְרֹא" → question 1 of N with 3 answer cards appears; "📖 הַסִּפּוּר" expands/collapses the story.
4. Click a wrong answer → error overlay, question stays. Click the right answer → success overlay, advances.
5. Finish all questions → 🎉 celebration → "עוֹד סִפּוּר" returns to picker; the story card now shows ✅.
Stop the dev server.

- [ ] **Step 6: Commit**

```
git add src/pages/Stories/StoryView.tsx src/pages/Stories/StoryReadView.tsx src/pages/Stories/StoryQuizView.tsx
git commit -m "Add story reading, quiz, and celebration flow"
```

---

### Task 8: Full verification + publish to GitHub Pages

**Files:**
- No source changes expected (fix-ups only if verification fails).

**Interfaces:**
- Consumes: everything above; `.github/workflows/deploy.yml` (existing — deploys `dist/` to GitHub Pages on push to `main`).
- Produces: the new version live at https://michaelitvin.github.io/alef/

- [ ] **Step 1: Run the full verification suite**

Run: `npx tsc --noEmit -p tsconfig.json && npm test && npm run build`
Expected: zero type errors, all tests pass, build succeeds. (`npm run lint` requires eslint which is not installed in this repo — pre-existing condition, do not fix here.)

- [ ] **Step 2: Push the feature branch**

```
git push origin 001-hebrew-reading-game
```

- [ ] **Step 3: Publish to main (triggers the Pages deploy)**

The deploy workflow (`.github/workflows/deploy.yml`) runs on push to `main`. Check whether `main` exists on the remote:
```
git fetch origin
git branch -r
```
- If `origin/main` does NOT exist: `git push origin 001-hebrew-reading-game:main`
- If `origin/main` exists: `git checkout -B main origin/main && git merge --no-ff 001-hebrew-reading-game -m "Merge story reading game" && git push origin main && git checkout 001-hebrew-reading-game`

- [ ] **Step 4: Verify the deployment**

```
gh run list --workflow=deploy.yml --limit 1
```
Wait for completion (`gh run watch <run-id>` or re-list). Expected: `completed success`.
Then verify the site responds:
```
curl -s -o /dev/null -w "%{http_code}" https://michaelitvin.github.io/alef/
```
Expected: `200`. If the workflow fails on Pages configuration (first deploy), report the error — repo Pages settings may need "GitHub Actions" as the source, which only the user can change.
