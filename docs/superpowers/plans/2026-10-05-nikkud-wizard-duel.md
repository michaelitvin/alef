# Nikkud Wizard Duel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship the Nikkud Wizard Duel as a real alef game at `#/duel`: endless survival, four screen types, picture words, pre-rendered voices, drawn icons, parent stats. It replaces the throwaway prototype.

**Architecture:**
- **Pure logic in `src/utils/duel/`** (marks, words, rules, rounds, and a reducer state machine) is fully unit-tested.
- **The `useDuelGame` hook** owns timers, audio sequencing and pause, and drives the reducer.
- **The UI** is ported from the playtested prototype into `src/components/duel/`.
- **Assets** (WebP sprites, MP3 voice/SFX/music) are bundled from `src/assets/duel/`.
- **Stats** persist in a new `duel` slice of the existing Zustand progress store.

**Tech Stack:** TypeScript 5.9, React 19, Vite 7, Zustand 5 (persist), Framer Motion 12, Howler 2.2, Vitest 4 + jsdom + React Testing Library, `@rollup/plugin-yaml`.

**Spec:** `docs/superpowers/specs/2026-10-05-nikkud-wizard-duel-design.md` (approved 2026-10-05). The prototype it was distilled from is `src/pages/Prototype/NikkudDuelPrototype.tsx` and `src/pages/Prototype/nikkudDuel/*`. It's committed in Task 0, used as the porting source, and deleted in Task 14.

## Global Constraints

- **Child UI has no writing:** no Hebrew or Latin text on child-facing screens (start, play, pause, summary). Only the parent stats card and the parent button may contain text. Nikkud runes and picture words are content, not text.
- **No emoji in the child UI:** every icon is a drawn SVG from `src/components/duel/Icon.tsx`.
- **Legibility:**
  - No picture or icon may look like a nikkud mark (dot clusters, rows of dots, short bars).
  - No symbol may mean two things. The ear is only the B/C screen icon, the "shh" face only shva, and stars only tower decoration.
  - Vav is drawn as a shape, never taken from a font.
  - The correct-answer state uses a dark gold background (`radial-gradient(#d98a1a, #8a3f00)`).
- **Direction:** tower and wizard on the left, monsters walk right → left and must face left (`faces` metadata; mirror right-facing sprites).
- **Spelling:** צֵירֶה (not צֵירֵי) and פַּתָּח (with dagesh) everywhere in the app.
- **Voices:**
  - Wizard (Will) speaks feedback (name → sound → "כְּמוֹ <word>") and instructions. Monster (Clyde) speaks clues.
  - Monster voice rate is clamped to 0.7–1.3.
  - No device TTS in the duel.
- **Pacing:**
  - The next round starts only after the effects **and** every wizard line, plus 500 ms.
  - B/C: the arrival sound plays to the end, then 450 ms of silence, then the clue; the clock starts when the clue ends.
  - A first-time screen type gets its spoken instruction **before** the monster appears.
- **Starting values:**
  - 3 hearts; 5 **kills** per wave.
  - Walk time `max(3500, 9000 − 650 × (wave − 1))` ms, × 1.4 for a boss.
  - Waves 1–2: screens A and D only, 4-rune pads. Wave 3+: all four screen types, 6-rune pads.
  - A boss every 5th wave with 3 HP, keeping its damage after a miss. Dragon on waves 5, 15, …; troll king on 10, 20, ….
  - MEGA meter: 8 answered hits.
  - Score: 100 + 20 × combo, MEGA + 200.
- **Twin taps (screen C):** the first twin tap in a round costs no heart and keeps the combo; it says "כִּמְעַט!" plus the twin's name. A second wrong tap is a normal miss.
- **MEGA kills** count as `mega`, not `correct`. The name is still spoken.
- **Effects:** each hit picks a preset at random: gentle 25%, boom 50%, mega 25%. A boss's final hit and MEGA kills always use `mega`.
- **Layout:** landscape is `(orientation: landscape) and (min-width: 640px) and (min-height: 500px)`; otherwise the portrait column (max 480 px wide).
- **Pause:** a ⏸ button plus `visibilitychange` (hidden). An opaque cover shows only the wizard and ▶; audio is muted. ▶ restarts the interrupted round.
- **Music** uses the new `settings.duelMusic` (on unless `false`). SFX honour `settings.soundEffects`; everything honours `settings.volume`.
- **Test hooks** (`?walk=<ms>` and `data-correct` on pad buttons) exist only when `import.meta.env.MODE === 'verify'` or `'test'`.
- **Pre-commit:** run `npx vitest run` before every commit that touches code. Before every commit that changes app code, also do the headless check from Task 13's `verify-duel.mjs`, or for earlier tasks, `npm run build` must succeed. Lint is unavailable in this repo: `npm run lint` fails on a missing ESLint flat config, which predates this work, so skip it.
- **Node:** `export PATH=/data/node/node-v24.16.0-linux-arm64/bin:$PATH` before any `npm`/`npx`.
- **Commit trailer:** every commit message ends with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.

## Review Focus

1. **Tab hidden mid-announcement or mid-outcome:** speech promises resolve while paused. Expected: no round starts until ▶; on resume exactly one round is on screen. Covered by a test in Task 10.
2. **Rapid double tap on a rune (or a tap during the 260 ms fireball):** expected one outcome, one heart change, one stats record. Covered in Task 4 (the reducer ignores `CHOOSE` once an outcome exists) and Task 10.
3. **An old save without `duel` / `settings.duelMusic`:** expected the stats card to show zeros and music to be on, with no crash. Covered in Task 5.
4. **A voice file missing or failing to decode:** expected the round sequence to continue (the safety timeout), never stall on a black screen. Covered in Task 7.
5. **The tablet rotated between portrait and landscape mid-round:** expected the tower and staff positions to re-measure and the monster to keep walking toward the new tower edge, with no stuck timer. Covered in Task 9's Battlefield test (the measure callback re-runs on resize).

---

## File Structure

```
src/types/duel.ts                         # all duel types (DuelMark, PictureWord, Round, Choice, Outcome, DuelState, DuelStats, …)
src/utils/duel/marks.ts                   # DUEL_MARKS from nikkud.yaml, SOUND_GROUPS, twinOf
src/utils/duel/words.ts                   # PICTURE_WORDS (17 + silent), wordsFor
src/utils/duel/rules.ts                   # constants, roster, walkMs, isCorrect, isTwin, points, pickEffect, bossFor
src/utils/duel/rounds.ts                  # pickTarget (weighted), makeRound (RNG-injectable)
src/utils/duel/reducer.ts                 # duelReducer + initialDuelState (pure state machine)
src/utils/duel/duelAudio.ts               # Howler: unlock, SFX, voice lines (+rate clamp, ducking, timeouts), music
src/utils/duel/*.test.ts                  # unit tests per module
src/assets/duel/sprites/*.webp            # 14 sprites + 18 picture words (copied from the prototype)
src/assets/duel/audio/{sfx,music,voice}/*.mp3
src/assets/duel/sprites.ts                # WIZARD, TOWER, MONSTER_SPRITES{src,faces,rate}, WORD_PICTURE
src/assets/duel/audioFiles.ts             # url maps for sfx/music/voice (import.meta.glob)
src/components/duel/Icon.tsx              # drawn SVG icons (port of prototype icons.tsx)
src/components/duel/RuneGlyph.tsx         # SVG rune (port of prototype marks.tsx RuneGlyph + RuneGlowDefs)
src/components/duel/{Clue,SpellPad,ResultBanner,DuelHud}.tsx
src/components/duel/{Battlefield,Monster,Explosion}.tsx
src/components/duel/{StartCover,PauseCover,RunSummary}.tsx
src/components/duel/DuelEntryCard.tsx     # Home + Nikkud entry
src/components/duel/DuelStatsCard.tsx     # parent stats on ProgressPage
src/components/duel/duel.css              # port of prototype nikkudDuel.css (nd-* classes)
src/hooks/useDuelGame.ts                  # timers, audio sequencing, pause, announcements
src/pages/Duel/DuelPage.tsx               # route #/duel (lazy)
```

Modified:
- `src/stores/progressStore.ts`, `src/types/progress.ts` (duel slice + `duelMusic`)
- `src/App.tsx` (lazy route; prototype route removed in Task 14)
- `src/pages/Home/HomePage.tsx`, `src/pages/Nikkud/NikkudPage.tsx`, `src/pages/Progress/ProgressPage.tsx`
- The spelling files from Task 1

---

### Task 0: Branch and baseline commit

**Files:** the prototype files and the spec/plan (already on disk), `src/App.tsx`

- [ ] **Step 1: Rename the branch and commit the prototype plus docs as the baseline**

```bash
cd /data/ws/alef
git branch -m prototype/nikkud-duel feature/nikkud-duel
export PATH=/data/node/node-v24.16.0-linux-arm64/bin:$PATH
npx vitest run            # expect: 65 passed
npm run build             # expect: ✓ built
git add docs/superpowers/specs/2026-10-05-nikkud-wizard-duel-design.md docs/superpowers/plans/2026-10-05-nikkud-wizard-duel.md \
        src/pages/Prototype src/components/common/PrototypeSwitcher.tsx src/App.tsx
git commit -m "Add nikkud duel spec, plan and playtested prototype

The prototype is the porting source for the real game and is removed once it ships.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 1: Spelling pass (צֵירֶה, פַּתָּח, audio name table)

**Files:**
- Modify: `src/data/nikkud.yaml` (tzeire `name`, patach `name`), `src/data/levelNodes.ts:11-12`, `src/pages/Nikkud/NikkudNodeView.tsx:19-20`, `src/data/syllables.yaml:399,406`, `src/utils/audio.ts:41-55`, `src/utils/decodeWord.ts:26` (+ its patach entry wherever the table maps `ַ`), `src/utils/decodeWord.test.ts`
- Test: `src/utils/spelling.test.ts` (new)

**Interfaces:**
- Produces: `nikkud.yaml` names `צֵירֶה` (id `tzeire`) and `פַּתָּח` (id `patach`). `NIKKUD_NAMES_HEBREW` keyed by the yaml ids, including `tzeire` and `holam-male`.

- [ ] **Step 1: Write the failing test** `src/utils/spelling.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import nikkudYaml from '../data/nikkud.yaml'
import { NIKKUD_NAMES_HEBREW } from './audio'
import { decodeWord } from './decodeWord'

const TZEIRE = 'צֵירֶה'.normalize('NFC')
const PATACH = 'פַּתָּח'.normalize('NFC')
type Y = { nikkud: { id: string; name: string }[] }
const byId = (id: string) => (nikkudYaml as Y).nikkud.find((n) => n.id === id)!.name.normalize('NFC')

describe('nikkud spelling', () => {
  it('uses צֵירֶה and פַּתָּח in nikkud.yaml', () => {
    expect(byId('tzeire')).toBe(TZEIRE)
    expect(byId('patach')).toBe(PATACH)
  })
  it('names table is keyed by yaml ids and complete', () => {
    for (const n of (nikkudYaml as Y).nikkud) expect(NIKKUD_NAMES_HEBREW[n.id], n.id).toBeTruthy()
    expect(NIKKUD_NAMES_HEBREW.tzeire.normalize('NFC')).toBe(TZEIRE)
    expect(NIKKUD_NAMES_HEBREW.patach.normalize('NFC')).toBe(PATACH)
  })
  it('decodeWord says פַּתָּח with dagesh', () => {
    expect(decodeWord('אַבָּא')).toContain(PATACH)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `npx vitest run src/utils/spelling.test.ts`
Expected: FAIL on all three cases (old spellings; `NIKKUD_NAMES_HEBREW.tzeire` is undefined, because the key is `tsere`).

- [ ] **Step 3: Apply the renames.** Use a Python script with codepoint-exact replacements; never retype Hebrew by hand in an editor:

```bash
python3 - <<'PY'
import re
OLD_TZ='צֵירֵי'; NEW_TZ='צֵירֶה'; OLD_PA='פַּתָח'; NEW_PA='פַּתָּח'
files=['src/data/nikkud.yaml','src/data/levelNodes.ts','src/pages/Nikkud/NikkudNodeView.tsx','src/data/syllables.yaml',
       'src/utils/audio.ts','src/utils/decodeWord.ts','src/utils/decodeWord.test.ts']
for f in files:
    s=open(f,encoding='utf-8').read(); n=s.replace(OLD_TZ,NEW_TZ).replace(OLD_PA,NEW_PA)
    if n!=s: open(f,'w',encoding='utf-8').write(n); print('updated',f)
PY
```

Then edit `src/utils/audio.ts` `NIKKUD_NAMES_HEBREW`: rename the key `tsere:` to `tzeire:`, and add `'holam-male': 'חוֹלָם מָלֵא',`. Check with `grep -n "tsere\|holam" src/utils/audio.ts` and fix any reference to `NIKKUD_NAMES_HEBREW.tsere` / `['tsere']` (`grep -rn "tsere" src`).

- [ ] **Step 4: Run the whole suite**

Run: `npx vitest run`
Expected: all pass (65 + 3). `decodeWord.test.ts` expectations now contain פַּתָּח, because the script updated them.

- [ ] **Step 5: Build and commit**

```bash
npm run build
git add -A src/data src/utils src/pages/Nikkud
git commit -m "Spell tzeire as צירה and patach with dagesh across the app

Matches the recorded voice lines; fixes the tsere/tzeire key and adds holam-male to the names table.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Duel types, marks and picture words

**Files:**
- Create: `src/types/duel.ts`, `src/utils/duel/marks.ts`, `src/utils/duel/words.ts`
- Test: `src/utils/duel/marks.test.ts`

**Interfaces:**
- Produces:
  - all types below
  - `DUEL_MARKS: DuelMark[]` (10, yaml order)
  - `SOUND_GROUPS: SoundGroup[]`
  - `markById(id): DuelMark`
  - `twinOf(m): DuelMark | undefined`
  - `PICTURE_WORDS: PictureWord[]`
  - `wordsFor(g): PictureWord[]`

- [ ] **Step 1: Create `src/types/duel.ts`**

```ts
export type SoundGroup = 'a' | 'e' | 'i' | 'o' | 'u' | 'silent'
export type ScreenType = 'A' | 'B' | 'C' | 'D'
export type EffectPreset = 'gentle' | 'boom' | 'mega'
export type RoundResult = 'correct' | 'wrong' | 'timeout' | 'mega'
/** Random source in [0, 1); injectable for tests. */
export type Rng = () => number

export interface DuelMark {
  id: string
  name: string // Hebrew name with nikkud (from nikkud.yaml)
  group: SoundGroup
  vav?: 'holam' | 'shuruk'
}

/** A picture of a Hebrew word that starts with its sound. key → sprites/word-<key>.webp and voice lines wiz-word-<key>, mon-word-<key>. */
export interface PictureWord {
  key: string
  group: SoundGroup
  he: string // '' for the silent "shh" picture
}

export interface Round {
  id: number
  type: ScreenType
  target: DuelMark
  runes: DuelMark[] // A/B/C pad; [] for D
  word: PictureWord // A's sign, D's right answer, the feedback word
  padWords: PictureWord[] // D pad (one per sound group, shuffled); [] otherwise
  monster: string // sprite id
  boss: boolean
  walkMs: number
}

export type Choice = { kind: 'rune'; mark: DuelMark } | { kind: 'sound'; group: SoundGroup }

export interface Outcome {
  kind: 'hit' | 'miss'
  choiceKey: string | null // keyOf(choice); null for timeout / MEGA
  mega: boolean
  final: boolean // destroys the monster (boss hits before the last are not final)
  points: number
  effect: EffectPreset
}

/** What the hook must do after an outcome has played out. */
export type Next =
  | { kind: 'over' }
  | { kind: 'spawn'; wave: number; boss: boolean; announce: Announcement | null }

export type Announcement = 'wave' | 'new-spells' | 'boss' | 'new-monster'

export interface DuelState {
  phase: 'idle' | 'playing' | 'over'
  paused: boolean
  hearts: number
  score: number
  combo: number
  bestCombo: number
  wave: number
  kills: number // kills in the current wave
  bossHp: number // > 0 while a boss is on the field
  mega: number // MEGA meter 0..MEGA_MAX
  round: Round | null
  walking: boolean
  twinTried: string | null // choiceKey of the forgiven twin tap this round
  outcome: Outcome | null
  runMisses: Record<string, number> // mark id → misses this run
  seenScreens: string[] // 'A' | 'B' | 'C' | 'D' | 'silent' already explained this run
  next: Next | null
}

export interface Tally {
  seen: number
  correct: number
  wrong: number
  timeout: number
  twin: number
  mega: number
}

export interface DuelStats {
  sessions: number
  roundsMs: number
  bestScore: number
  bestWave: number
  lastPlayed: number | null
  byMark: Record<string, Tally>
  byType: Partial<Record<ScreenType, Tally>>
}
```

- [ ] **Step 2: Write the failing test** `src/utils/duel/marks.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { DUEL_MARKS, SOUND_GROUPS, markById, twinOf } from './marks'
import { PICTURE_WORDS, wordsFor } from './words'

describe('duel marks', () => {
  it('has the 10 marks from nikkud.yaml with groups', () => {
    expect(DUEL_MARKS.map((m) => m.id)).toEqual(['kamatz', 'patach', 'tzeire', 'segol', 'chirik', 'cholam', 'kubutz', 'shva', 'holam-male', 'shuruk'])
    expect(markById('shva').group).toBe('silent')
    expect(markById('holam-male').vav).toBe('holam')
    expect(markById('shuruk').vav).toBe('shuruk')
    expect(markById('cholam').vav).toBeUndefined()
  })
  it('twins share a sound group', () => {
    expect(twinOf(markById('kamatz'))!.id).toBe('patach')
    expect(twinOf(markById('tzeire'))!.id).toBe('segol')
    expect(twinOf(markById('chirik'))).toBeUndefined()
    expect(twinOf(markById('shva'))).toBeUndefined()
  })
})

describe('picture words', () => {
  it('every sound group has at least 2 words, silent exactly one', () => {
    for (const g of SOUND_GROUPS.filter((g) => g !== 'silent')) expect(wordsFor(g).length, g).toBeGreaterThanOrEqual(2)
    expect(wordsFor('silent').map((w) => w.key)).toEqual(['silent'])
  })
  it('keys are unique and retired ambiguous words are absent', () => {
    const keys = PICTURE_WORDS.map((w) => w.key)
    expect(new Set(keys).size).toBe(keys.length)
    for (const retired of ['ear', 'finger', 'blueberries']) expect(keys).not.toContain(retired)
  })
})
```

- [ ] **Step 3: Run it and confirm it fails**

Run: `npx vitest run src/utils/duel/marks.test.ts` → FAIL (module not found).

- [ ] **Step 4: Implement `src/utils/duel/marks.ts`**

```ts
import nikkudYaml from '../../data/nikkud.yaml'
import type { DuelMark, SoundGroup } from '../../types/duel'

type YamlNikkud = { id: string; name: string; soundGroup: SoundGroup }

export const SOUND_GROUPS: SoundGroup[] = ['a', 'e', 'i', 'o', 'u', 'silent']

const VAV: Record<string, DuelMark['vav']> = { 'holam-male': 'holam', shuruk: 'shuruk' }

/** The duel's view of nikkud.yaml — no new copy of the data. */
export const DUEL_MARKS: DuelMark[] = (nikkudYaml as { nikkud: YamlNikkud[] }).nikkud.map((n) => ({
  id: n.id,
  name: n.name,
  group: n.soundGroup,
  ...(VAV[n.id] ? { vav: VAV[n.id] } : {}),
}))

export function markById(id: string): DuelMark {
  const m = DUEL_MARKS.find((x) => x.id === id)
  if (!m) throw new Error(`unknown mark ${id}`)
  return m
}

/** The other plain (non-vav) mark with the same sound, e.g. kamatz ↔ patach. */
export function twinOf(m: DuelMark): DuelMark | undefined {
  return DUEL_MARKS.find((x) => x.group === m.group && x.id !== m.id && !x.vav && !m.vav)
}
```

Note on `twinOf`: cholam's same-group mark is holam male (with a vav), and kubutz's is shuruk. Those pairs look different, so they aren't "twins". Only kamatz/patach and tzeire/segol are.

- [ ] **Step 5: Implement `src/utils/duel/words.ts`**

```ts
import type { PictureWord, SoundGroup } from '../../types/duel'

/**
 * Picture words: a Hebrew word that STARTS with the sound, drawn in the game's style (sprites/word-<key>.webp).
 * Several per sound so he learns the sound, not one picture. Retired for ambiguity: ear (= "listen" icon,
 * hints at mute/shva), finger (tap / one / shh), blueberries (dot cluster). See the spec's legibility rules.
 */
export const PICTURE_WORDS: PictureWord[] = [
  { key: 'a', group: 'a', he: 'אַרְיֵה' },
  { key: 'pineapple', group: 'a', he: 'אַנָּנָס' },
  { key: 'mouse', group: 'a', he: 'עַכְבָּר' },
  { key: 'watermelon', group: 'a', he: 'אַבַּטִּיחַ' },
  { key: 'e', group: 'e', he: 'אֶפְרוֹחַ' },
  { key: 'tree', group: 'e', he: 'עֵץ' },
  { key: 'goat', group: 'e', he: 'עֵז' },
  { key: 'i', group: 'i', he: 'עִפָּרוֹן' },
  { key: 'igloo', group: 'i', he: 'אִיגְלוּ' },
  { key: 'island', group: 'i', he: 'אִי' },
  { key: 'mom', group: 'i', he: 'אִמָּא' },
  { key: 'o', group: 'o', he: 'אוֹטוֹ' },
  { key: 'bicycle', group: 'o', he: 'אוֹפַנַּיִם' },
  { key: 'ship', group: 'o', he: 'אוֹנִיָּה' },
  { key: 'hamster', group: 'o', he: 'אוֹגֵר' },
  { key: 'u', group: 'u', he: 'עוּגָה' },
  { key: 'cookie', group: 'u', he: 'עוּגִיָּה' },
  { key: 'silent', group: 'silent', he: '' },
]

export const wordsFor = (g: SoundGroup) => PICTURE_WORDS.filter((w) => w.group === g)
```

- [ ] **Step 6: Run the tests** (`npx vitest run src/utils/duel/marks.test.ts` → PASS) **and commit**

```bash
git add src/types/duel.ts src/utils/duel/marks.ts src/utils/duel/words.ts src/utils/duel/marks.test.ts
git commit -m "Add duel types, marks from nikkud.yaml and picture words

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Rules and round generation

**Files:**
- Create: `src/utils/duel/rules.ts`, `src/utils/duel/rounds.ts`
- Test: `src/utils/duel/rules.test.ts`, `src/utils/duel/rounds.test.ts`

**Interfaces:**
- Consumes: Task 2 (`DUEL_MARKS`, `SOUND_GROUPS`, `twinOf`, `wordsFor`, types).
- Produces:
  - **Constants:** `HEARTS=3`, `MONSTERS_PER_WAVE=5`, `BOSS_EVERY=5`, `BOSS_HP=3`, `MEGA_MAX=8`, `ROSTER`.
  - **Wave and monster rules:** `unlockedMonsters(wave): string[]`, `newMonsterAt(wave): string | null`, `bossFor(wave): 'dragon' | 'troll'`, `walkMs(wave, boss): number`, `screenTypesFor(wave): ScreenType[]`, `padSize(wave): number`.
  - **Answer and scoring rules:** `keyOf(choice): string`, `isCorrect(round, choice): boolean`, `isTwin(round, choice): boolean`, `points(combo, mega): number`, `pickEffect(rng, {final, mega}): EffectPreset`.
  - **From `rounds.ts`:** `pickTarget(rng, runMisses, lifetimeMisses): DuelMark`, `makeRound(opts): Round`.

- [ ] **Step 1: Write the failing tests** `src/utils/duel/rules.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { markById } from './marks'
import { wordsFor } from './words'
import {
  bossFor, isCorrect, isTwin, keyOf, newMonsterAt, padSize, pickEffect, points, screenTypesFor, unlockedMonsters, walkMs,
} from './rules'
import type { Round } from '../../types/duel'

const round = (type: Round['type'], targetId: string): Round => ({
  id: 1, type, target: markById(targetId), runes: [], word: wordsFor(markById(targetId).group)[0], padWords: [],
  monster: 'fuzzy', boss: false, walkMs: 9000,
})
const rune = (id: string) => ({ kind: 'rune' as const, mark: markById(id) })

describe('rules', () => {
  it('A/B/D accept any mark of the sound; C only the named one', () => {
    expect(isCorrect(round('A', 'kamatz'), rune('patach'))).toBe(true)
    expect(isCorrect(round('B', 'cholam'), rune('holam-male'))).toBe(true)
    expect(isCorrect(round('C', 'kamatz'), rune('patach'))).toBe(false)
    expect(isCorrect(round('C', 'kamatz'), rune('kamatz'))).toBe(true)
    expect(isCorrect(round('D', 'shva'), { kind: 'sound', group: 'silent' })).toBe(true)
    expect(isCorrect(round('D', 'shva'), { kind: 'sound', group: 'a' })).toBe(false)
  })
  it('a twin is a same-sound rune on C only', () => {
    expect(isTwin(round('C', 'kamatz'), rune('patach'))).toBe(true)
    expect(isTwin(round('C', 'kamatz'), rune('segol'))).toBe(false)
    expect(isTwin(round('A', 'kamatz'), rune('patach'))).toBe(false)
    expect(isTwin(round('C', 'cholam'), rune('holam-male'))).toBe(false) // a vav pair is not a look-alike twin
  })
  it('keys distinguish runes and sounds', () => {
    expect(keyOf(rune('kamatz'))).toBe('kamatz')
    expect(keyOf({ kind: 'sound', group: 'a' })).toBe('g-a')
  })
  it('waves: speed floor, screen types, pad sizes', () => {
    expect(walkMs(1, false)).toBe(9000)
    expect(walkMs(2, false)).toBe(8350)
    expect(walkMs(30, false)).toBe(3500)
    expect(walkMs(1, true)).toBe(12600)
    expect(screenTypesFor(1)).toEqual(['A', 'D'])
    expect(screenTypesFor(3)).toEqual(['A', 'B', 'C', 'D'])
    expect(padSize(2)).toBe(4)
    expect(padSize(3)).toBe(6)
  })
  it('roster unlocks progressively; bosses alternate', () => {
    expect(unlockedMonsters(1)).toEqual(['fuzzy', 'blob'])
    expect(unlockedMonsters(4)).toEqual(['fuzzy', 'blob', 'imp', 'ghost', 'bat'])
    expect(unlockedMonsters(8)).toHaveLength(8)
    expect(newMonsterAt(1)).toBeNull()
    expect(newMonsterAt(2)).toBe('imp')
    expect(newMonsterAt(5)).toBeNull()
    expect(bossFor(5)).toBe('dragon')
    expect(bossFor(10)).toBe('troll')
    expect(bossFor(15)).toBe('dragon')
  })
  it('points and effects', () => {
    expect(points(0, false)).toBe(100)
    expect(points(3, false)).toBe(160)
    expect(points(0, true)).toBe(300)
    expect(pickEffect(() => 0.1, { final: true, mega: false })).toBe('gentle')
    expect(pickEffect(() => 0.5, { final: true, mega: false })).toBe('boom')
    expect(pickEffect(() => 0.9, { final: true, mega: false })).toBe('mega')
    expect(pickEffect(() => 0.1, { final: true, mega: true })).toBe('mega')
  })
})
```

`src/utils/duel/rounds.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { makeRound, pickTarget } from './rounds'
import { DUEL_MARKS, markById, twinOf } from './marks'

/** Deterministic RNG (mulberry32) for repeatable tests. */
function seeded(seed: number) {
  return () => {
    seed |= 0; seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}
const base = { runMisses: {}, lifetimeMisses: {} }

describe('makeRound', () => {
  it('pads: target present, right size, one mark per other sound group, no duplicates', () => {
    const rng = seeded(1)
    for (let i = 0; i < 300; i++) {
      const wave = 1 + (i % 6)
      const r = makeRound({ id: i, wave, boss: false, rng, ...base })
      if (r.type === 'D') {
        expect(r.runes).toEqual([])
        expect(r.padWords.map((w) => w.group).sort()).toEqual(['a', 'e', 'i', 'o', 'silent', 'u'])
        expect(r.padWords.find((w) => w.group === r.target.group)).toBe(r.word)
        continue
      }
      expect(r.runes).toHaveLength(wave < 3 ? 4 : 6)
      expect(r.runes.map((m) => m.id)).toContain(r.target.id)
      expect(new Set(r.runes.map((m) => m.id)).size).toBe(r.runes.length)
      const twin = twinOf(r.target)
      if (r.type === 'C' && twin) expect(r.runes.map((m) => m.id)).toContain(twin.id)
      expect(r.word.group).toBe(r.target.group)
    }
  })
  it('waves 1-2 only use A and D; boss rounds use the wave boss and slower walk', () => {
    const rng = seeded(2)
    for (let i = 0; i < 100; i++) expect(['A', 'D']).toContain(makeRound({ id: i, wave: 2, boss: false, rng, ...base }).type)
    const boss = makeRound({ id: 1, wave: 10, boss: true, rng, ...base })
    expect(boss.monster).toBe('troll')
    expect(boss.walkMs).toBe(Math.max(3500, 9000 - 650 * 9) * 1.4)
  })
  it('monsters come from the unlocked roster', () => {
    const rng = seeded(3)
    for (let i = 0; i < 100; i++) expect(['fuzzy', 'blob']).toContain(makeRound({ id: i, wave: 1, boss: false, rng, ...base }).monster)
  })
})

describe('pickTarget weighting', () => {
  it('missed marks come up more; lifetime misses count, capped', () => {
    const rng = seeded(4)
    const count = (runMisses: Record<string, number>, lifetimeMisses: Record<string, number>) => {
      let n = 0
      for (let i = 0; i < 4000; i++) if (pickTarget(rng, runMisses, lifetimeMisses).id === 'segol') n++
      return n / 4000
    }
    const plain = count({}, {})
    expect(plain).toBeGreaterThan(0.07)
    expect(plain).toBeLessThan(0.13) // ~1/10
    expect(count({ segol: 2 }, {})).toBeGreaterThan(0.3) // weight 5 of 14
    const capped = count({}, { segol: 1000 }) // min(2, 1000/5)=2 → weight 3 of 12
    expect(capped).toBeGreaterThan(0.18)
    expect(capped).toBeLessThan(0.32)
  })
  it('only returns real marks', () => {
    const rng = seeded(5)
    for (let i = 0; i < 50; i++) expect(DUEL_MARKS).toContain(pickTarget(rng, {}, {}))
    expect(markById('segol')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run them and confirm they fail**

Run: `npx vitest run src/utils/duel/rules.test.ts src/utils/duel/rounds.test.ts` → FAIL (modules missing).

- [ ] **Step 3: Implement `src/utils/duel/rules.ts`**

```ts
import type { Choice, EffectPreset, Rng, Round, ScreenType } from '../../types/duel'
import { twinOf } from './marks'

export const HEARTS = 3
export const MONSTERS_PER_WAVE = 5 // kills per wave
export const BOSS_EVERY = 5
export const BOSS_HP = 3
export const MEGA_MAX = 8

/** Regular monsters and the wave each one joins (a "new monster!" announcement plays then). */
export const ROSTER: { id: string; fromWave: number }[] = [
  { id: 'fuzzy', fromWave: 1 },
  { id: 'blob', fromWave: 1 },
  { id: 'imp', fromWave: 2 },
  { id: 'ghost', fromWave: 3 },
  { id: 'bat', fromWave: 4 },
  { id: 'mushroom', fromWave: 6 },
  { id: 'golem', fromWave: 7 },
  { id: 'octopus', fromWave: 8 },
]

export const unlockedMonsters = (wave: number) => ROSTER.filter((m) => m.fromWave <= wave).map((m) => m.id)
export const newMonsterAt = (wave: number) => (wave > 1 ? ROSTER.find((m) => m.fromWave === wave)?.id ?? null : null)
export const bossFor = (wave: number): 'dragon' | 'troll' => (wave % (BOSS_EVERY * 2) === 0 ? 'troll' : 'dragon')

export const walkMs = (wave: number, boss: boolean) => Math.max(3500, 9000 - 650 * (wave - 1)) * (boss ? 1.4 : 1)
export const screenTypesFor = (wave: number): ScreenType[] => (wave < 3 ? ['A', 'D'] : ['A', 'B', 'C', 'D'])
export const padSize = (wave: number) => (wave < 3 ? 4 : 6)

export const keyOf = (c: Choice) => (c.kind === 'rune' ? c.mark.id : `g-${c.group}`)

/** A/B/D: any mark with the right sound. C: only the named mark. */
export function isCorrect(round: Round, c: Choice): boolean {
  if (c.kind === 'sound') return c.group === round.target.group
  if (round.type === 'C') return c.mark.id === round.target.id
  return c.mark.group === round.target.group
}

/** Tapping the same-sound look-alike on a name screen (kamatz ↔ patach, tzeire ↔ segol). */
export function isTwin(round: Round, c: Choice): boolean {
  return round.type === 'C' && c.kind === 'rune' && twinOf(round.target)?.id === c.mark.id
}

export const points = (combo: number, mega: boolean) => 100 + 20 * combo + (mega ? 200 : 0)

/** Presets used interchangeably: ~25% gentle, 50% boom, 25% mega; finishing blows on a boss and MEGA always mega. */
export function pickEffect(rng: Rng, o: { final: boolean; mega: boolean; boss?: boolean }): EffectPreset {
  if (o.mega || (o.boss && o.final)) return 'mega'
  const r = rng()
  return r < 0.25 ? 'gentle' : r < 0.75 ? 'boom' : 'mega'
}
```

Update the `pickEffect` test's last line accordingly (it already asserts `mega: true → 'mega'`). Also add `expect(pickEffect(() => 0.1, { final: true, mega: false, boss: true })).toBe('mega')`.

- [ ] **Step 4: Implement `src/utils/duel/rounds.ts`**

```ts
import type { DuelMark, Rng, Round } from '../../types/duel'
import { DUEL_MARKS, SOUND_GROUPS, twinOf } from './marks'
import { wordsFor } from './words'
import { bossFor, padSize, screenTypesFor, unlockedMonsters, walkMs } from './rules'

const pick = <T>(rng: Rng, xs: T[]) => xs[Math.floor(rng() * xs.length)]
function shuffle<T>(rng: Rng, xs: T[]) {
  const a = [...xs]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/** Weight = 1 + 2 × misses this run + min(2, lifetime misses ÷ 5). */
export function pickTarget(rng: Rng, runMisses: Record<string, number>, lifetimeMisses: Record<string, number>): DuelMark {
  const w = DUEL_MARKS.map((m) => 1 + 2 * (runMisses[m.id] ?? 0) + Math.min(2, (lifetimeMisses[m.id] ?? 0) / 5))
  let r = rng() * w.reduce((s, x) => s + x, 0)
  for (let i = 0; i < DUEL_MARKS.length; i++) {
    r -= w[i]
    if (r <= 0) return DUEL_MARKS[i]
  }
  return DUEL_MARKS[DUEL_MARKS.length - 1]
}

export interface MakeRoundOpts {
  id: number
  wave: number
  boss: boolean
  rng: Rng
  runMisses: Record<string, number>
  lifetimeMisses: Record<string, number>
}

export function makeRound({ id, wave, boss, rng, runMisses, lifetimeMisses }: MakeRoundOpts): Round {
  const type = pick(rng, screenTypesFor(wave))
  const target = pickTarget(rng, runMisses, lifetimeMisses)
  const word = pick(rng, wordsFor(target.group))

  let runes: DuelMark[] = []
  if (type !== 'D') {
    runes = [target]
    const twin = twinOf(target)
    if (type === 'C' && twin) runes.push(twin) // the trap on name screens
    for (const g of shuffle(rng, SOUND_GROUPS.filter((g) => g !== target.group))) {
      if (runes.length >= padSize(wave)) break
      runes.push(pick(rng, DUEL_MARKS.filter((m) => m.group === g)))
    }
    runes = shuffle(rng, runes)
  }
  const padWords = type === 'D' ? shuffle(rng, SOUND_GROUPS.map((g) => (g === target.group ? word : pick(rng, wordsFor(g))))) : []

  return {
    id, type, target, runes, word, padWords,
    monster: boss ? bossFor(wave) : pick(rng, unlockedMonsters(wave)),
    boss,
    walkMs: walkMs(wave, boss),
  }
}
```

- [ ] **Step 5: Run the tests** → PASS. If the weighting thresholds are borderline, check the arithmetic in the comments rather than loosening the bounds. **Commit:**

```bash
git add src/utils/duel/rules.ts src/utils/duel/rounds.ts src/utils/duel/rules.test.ts src/utils/duel/rounds.test.ts
git commit -m "Add duel rules and round generation

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: The duel reducer (state machine)

**Files:**
- Create: `src/utils/duel/reducer.ts`
- Test: `src/utils/duel/reducer.test.ts`

**Interfaces:**
- Consumes: Tasks 2–3.
- Produces:
  - `initialDuelState: DuelState`
  - `duelReducer(state, action): DuelState`
  - `type DuelAction`

  Actions:
  - `{type:'START'}`
  - `{type:'ROUND_READY', round}`: shows the monster; `walking` is true for A/D
  - `{type:'WALK_START'}`: B/C, after the clue
  - `{type:'CHOOSE', choice, effect}`
  - `{type:'TIMEOUT'}`
  - `{type:'MEGA', effect}`
  - `{type:'SCREEN_EXPLAINED', key}`
  - `{type:'ADVANCE'}`: after the outcome has played out; computes `next` (or `phase:'over'`)
  - `{type:'PAUSE'}`, `{type:'RESUME'}`

  On `CHOOSE` with a forgiven twin, the state sets `twinTried` and leaves `outcome` null.

- [ ] **Step 1: Write the failing test** `src/utils/duel/reducer.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { duelReducer, initialDuelState } from './reducer'
import { markById } from './marks'
import { wordsFor } from './words'
import type { DuelState, Round } from '../../types/duel'

const mk = (over: Partial<Round> = {}): Round => ({
  id: 1, type: 'A', target: markById('kamatz'), runes: [markById('kamatz'), markById('segol')], word: wordsFor('a')[0],
  padWords: [], monster: 'fuzzy', boss: false, walkMs: 9000, ...over,
})
const start = () => duelReducer(initialDuelState, { type: 'START' })
const ready = (s: DuelState, r = mk()) => duelReducer(s, { type: 'ROUND_READY', round: r })
const tap = (s: DuelState, id: string) => duelReducer(s, { type: 'CHOOSE', choice: { kind: 'rune', mark: markById(id) }, effect: 'boom' })

describe('duelReducer', () => {
  it('starts a run', () => {
    const s = start()
    expect(s).toMatchObject({ phase: 'playing', hearts: 3, wave: 1, score: 0, round: null })
    expect(s.next).toEqual({ kind: 'spawn', wave: 1, boss: false, announce: null })
  })
  it('A/D walk at once; B/C wait for WALK_START', () => {
    expect(ready(start()).walking).toBe(true)
    const b = ready(start(), mk({ type: 'B' }))
    expect(b.walking).toBe(false)
    expect(duelReducer(b, { type: 'WALK_START' }).walking).toBe(true)
  })
  it('hit: score, combo, mega meter, one outcome only (double tap ignored)', () => {
    const s = tap(ready(start()), 'patach')
    expect(s.outcome).toMatchObject({ kind: 'hit', final: true, points: 100, effect: 'boom' })
    expect(s).toMatchObject({ score: 100, combo: 1, mega: 1, hearts: 3 })
    const again = tap(s, 'segol')
    expect(again).toBe(s)
  })
  it('miss: heart lost, combo reset, miss counted', () => {
    const s = tap(ready(start()), 'segol')
    expect(s.outcome).toMatchObject({ kind: 'miss', choiceKey: 'segol' })
    expect(s).toMatchObject({ hearts: 2, combo: 0 })
    expect(s.runMisses.kamatz).toBe(1)
  })
  it('timeout counts as a miss with no choice', () => {
    const s = duelReducer(ready(start()), { type: 'TIMEOUT' })
    expect(s.outcome).toMatchObject({ kind: 'miss', choiceKey: null })
  })
  it('twin on C is forgiven once, second wrong tap is a miss', () => {
    const c = ready(start(), mk({ type: 'C', runes: [markById('kamatz'), markById('patach')] }))
    const t1 = tap(c, 'patach')
    expect(t1.outcome).toBeNull()
    expect(t1).toMatchObject({ twinTried: 'patach', hearts: 3 })
    const t2 = tap(t1, 'patach')
    expect(t2.outcome).toMatchObject({ kind: 'miss' })
    expect(t2.hearts).toBe(2)
  })
  it('wave advances on 5 kills; misses do not count', () => {
    let s = start()
    for (let i = 0; i < 5; i++) {
      s = tap(ready(s, mk({ id: i })), 'kamatz')
      if (i === 2) s = duelReducer(ready(duelReducer(s, { type: 'ADVANCE' }), mk({ id: 99 })), { type: 'TIMEOUT' })
      s = duelReducer(s, { type: 'ADVANCE' })
    }
    expect(s.wave).toBe(2)
    expect(s.kills).toBe(0)
    expect(s.next).toEqual({ kind: 'spawn', wave: 2, boss: false, announce: 'new-monster' }) // imp joins on wave 2
  })
  it('wave 3 announces new spells; wave 5 ends in a boss that keeps damage through a miss', () => {
    let s: DuelState = { ...start(), wave: 2, kills: 4, round: mk(), walking: true }
    s = duelReducer(tap(s, 'kamatz'), { type: 'ADVANCE' })
    expect(s.next).toEqual({ kind: 'spawn', wave: 3, boss: false, announce: 'new-spells' })
    s = { ...s, wave: 5, kills: 4, round: mk(), walking: true, outcome: null }
    s = duelReducer(tap(s, 'kamatz'), { type: 'ADVANCE' })
    expect(s).toMatchObject({ bossHp: 3 })
    expect(s.next).toEqual({ kind: 'spawn', wave: 5, boss: true, announce: 'boss' })
    s = tap(ready(s, mk({ boss: true, monster: 'dragon' })), 'kamatz')
    expect(s.outcome).toMatchObject({ final: false })
    expect(s.bossHp).toBe(2)
    s = duelReducer(s, { type: 'ADVANCE' })
    s = tap(ready(s, mk({ boss: true, monster: 'dragon', id: 7 })), 'segol')
    expect(s.bossHp).toBe(2) // keeps damage
    expect(s.hearts).toBe(2)
  })
  it('MEGA kills, resets meter, scores +200', () => {
    let s: DuelState = { ...ready(start()), mega: 8, combo: 2 }
    s = duelReducer(s, { type: 'MEGA', effect: 'mega' })
    expect(s.outcome).toMatchObject({ kind: 'hit', mega: true, points: 340, effect: 'mega' })
    expect(s.mega).toBe(0)
  })
  it('MEGA is ignored until the meter is full', () => {
    const s = ready(start())
    expect(duelReducer(s, { type: 'MEGA', effect: 'mega' })).toBe(s)
  })
  it('game over after the last heart', () => {
    let s: DuelState = { ...ready(start()), hearts: 1 }
    s = duelReducer(tap(s, 'segol'), { type: 'ADVANCE' })
    expect(s.phase).toBe('over')
    expect(s.next).toEqual({ kind: 'over' })
  })
  it('pause blocks choices; resume clears it', () => {
    const p = duelReducer(ready(start()), { type: 'PAUSE' })
    expect(tap(p, 'kamatz')).toBe(p)
    expect(duelReducer(p, { type: 'RESUME' }).paused).toBe(false)
  })
  it('records explained screens', () => {
    const s = duelReducer(start(), { type: 'SCREEN_EXPLAINED', key: 'silent' })
    expect(s.seenScreens).toContain('silent')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails** (`npx vitest run src/utils/duel/reducer.test.ts`).

- [ ] **Step 3: Implement `src/utils/duel/reducer.ts`**

```ts
import type { Choice, DuelState, EffectPreset, Next, Round } from '../../types/duel'
import { BOSS_EVERY, BOSS_HP, HEARTS, MEGA_MAX, MONSTERS_PER_WAVE, isCorrect, isTwin, keyOf, newMonsterAt, points } from './rules'

export type DuelAction =
  | { type: 'START' }
  | { type: 'ROUND_READY'; round: Round }
  | { type: 'WALK_START' }
  | { type: 'CHOOSE'; choice: Choice; effect: EffectPreset }
  | { type: 'TIMEOUT' }
  | { type: 'MEGA'; effect: EffectPreset }
  | { type: 'SCREEN_EXPLAINED'; key: string }
  | { type: 'ADVANCE' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }

export const initialDuelState: DuelState = {
  phase: 'idle', paused: false, hearts: HEARTS, score: 0, combo: 0, bestCombo: 0, wave: 1, kills: 0, bossHp: 0, mega: 0,
  round: null, walking: false, twinTried: null, outcome: null, runMisses: {}, seenScreens: [], next: null,
}

const canAnswer = (s: DuelState) => s.phase === 'playing' && !s.paused && s.round !== null && s.outcome === null

function hit(s: DuelState, choiceKey: string | null, mega: boolean, effect: EffectPreset): DuelState {
  const round = s.round!
  const dmg = mega ? 2 : 1
  const final = !round.boss || s.bossHp - dmg <= 0
  const pts = points(s.combo, mega)
  const combo = s.combo + 1
  return {
    ...s,
    outcome: { kind: 'hit', choiceKey, mega, final, points: pts, effect },
    score: s.score + pts,
    combo,
    bestCombo: Math.max(s.bestCombo, combo),
    mega: mega ? 0 : Math.min(MEGA_MAX, s.mega + 1),
    bossHp: round.boss ? Math.max(0, s.bossHp - dmg) : s.bossHp,
  }
}

function miss(s: DuelState, choiceKey: string | null): DuelState {
  const id = s.round!.target.id
  return {
    ...s,
    outcome: { kind: 'miss', choiceKey, mega: false, final: false, points: 0, effect: 'gentle' },
    hearts: s.hearts - 1,
    combo: 0,
    runMisses: { ...s.runMisses, [id]: (s.runMisses[id] ?? 0) + 1 },
    // a boss keeps the damage it already took
  }
}

function nextAfter(s: DuelState): { state: Partial<DuelState>; next: Next } {
  const o = s.outcome!
  const r = s.round!
  if (s.hearts <= 0) return { state: { phase: 'over' }, next: { kind: 'over' } }
  if (o.kind === 'miss') return { state: {}, next: { kind: 'spawn', wave: s.wave, boss: r.boss, announce: null } }
  if (r.boss) {
    if (s.bossHp > 0) return { state: {}, next: { kind: 'spawn', wave: s.wave, boss: true, announce: null } }
    return newWave(s.wave + 1)
  }
  const kills = s.kills + 1
  if (kills < MONSTERS_PER_WAVE) return { state: { kills }, next: { kind: 'spawn', wave: s.wave, boss: false, announce: null } }
  if (s.wave % BOSS_EVERY === 0) return { state: { kills, bossHp: BOSS_HP }, next: { kind: 'spawn', wave: s.wave, boss: true, announce: 'boss' } }
  return newWave(s.wave + 1)
}

function newWave(wave: number): { state: Partial<DuelState>; next: Next } {
  const announce = wave === 3 ? 'new-spells' : newMonsterAt(wave) ? 'new-monster' : 'wave'
  return { state: { wave, kills: 0 }, next: { kind: 'spawn', wave, boss: false, announce } }
}

export function duelReducer(s: DuelState, a: DuelAction): DuelState {
  switch (a.type) {
    case 'START':
      return { ...initialDuelState, phase: 'playing', next: { kind: 'spawn', wave: 1, boss: false, announce: null } }
    case 'ROUND_READY':
      return { ...s, round: a.round, outcome: null, twinTried: null, next: null, walking: a.round.type === 'A' || a.round.type === 'D' }
    case 'WALK_START':
      return s.round && !s.outcome ? { ...s, walking: true } : s
    case 'CHOOSE': {
      if (!canAnswer(s)) return s
      const r = s.round!
      if (isCorrect(r, a.choice)) return hit(s, keyOf(a.choice), false, a.effect)
      if (isTwin(r, a.choice) && !s.twinTried) return { ...s, twinTried: keyOf(a.choice) }
      return miss(s, keyOf(a.choice))
    }
    case 'TIMEOUT':
      return canAnswer(s) ? miss(s, null) : s
    case 'MEGA':
      return canAnswer(s) && s.mega >= MEGA_MAX ? hit(s, null, true, a.effect) : s
    case 'SCREEN_EXPLAINED':
      return s.seenScreens.includes(a.key) ? s : { ...s, seenScreens: [...s.seenScreens, a.key] }
    case 'ADVANCE': {
      if (!s.outcome || s.phase !== 'playing') return s
      const { state, next } = nextAfter(s)
      return { ...s, ...state, next, round: next.kind === 'over' ? s.round : null }
    }
    case 'PAUSE':
      return s.phase === 'playing' ? { ...s, paused: true } : s
    case 'RESUME':
      return { ...s, paused: false }
  }
}
```

Note: `ADVANCE` keeps `outcome` (the summary needs the last round) but nulls `round` for spawns. `ROUND_READY` resets `outcome`.

- [ ] **Step 4: Run the tests** → PASS. The "wave advances" test interleaves a miss; if it fails, check that `nextAfter` doesn't bump `kills` on a miss. **Commit:**

```bash
git add src/utils/duel/reducer.ts src/utils/duel/reducer.test.ts
git commit -m "Add duel state machine reducer

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: Progress store, the duel slice and `duelMusic`

**Files:**
- Modify: `src/types/progress.ts` (`Settings.duelMusic?`, `ProgressState.duel`, `INITIAL_PROGRESS_STATE.duel`, `DEFAULT_SETTINGS.duelMusic = true`), `src/stores/progressStore.ts` (actions + `partialize`)
- Test: `src/stores/duelSlice.test.ts`

**Interfaces:**
- Consumes: `DuelStats`, `Tally`, `ScreenType`, `RoundResult` from `src/types/duel.ts`.
- Produces store actions:
  - `recordDuelSession(): void`
  - `recordDuelRound(markId: string, type: ScreenType, result: RoundResult, ms: number): void`
  - `recordDuelTwin(markId: string, type: ScreenType): void`
  - `recordDuelRunEnd(score: number, wave: number): void`
  - `setDuelMusic(on: boolean): void`
  - the selector helper `export const duelMusicOn = (s: Settings) => s.duelMusic !== false`
  - `export const EMPTY_DUEL_STATS: DuelStats`

- [ ] **Step 1: Write the failing test** `src/stores/duelSlice.test.ts`

```ts
import { describe, it, expect, beforeEach } from 'vitest'
import { useProgressStore, duelMusicOn } from './progressStore'
import { INITIAL_PROGRESS_STATE } from '../types/progress'

beforeEach(() => {
  localStorage.clear()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
})

describe('duel slice', () => {
  it('records sessions, rounds, twins, run ends', () => {
    const st = useProgressStore.getState()
    st.recordDuelSession()
    st.recordDuelRound('kamatz', 'A', 'correct', 1200)
    st.recordDuelRound('kamatz', 'C', 'wrong', 800)
    st.recordDuelRound('segol', 'D', 'mega', 500)
    st.recordDuelTwin('kamatz', 'C')
    st.recordDuelRunEnd(900, 4)
    st.recordDuelRunEnd(300, 2)
    const d = useProgressStore.getState().duel
    expect(d.sessions).toBe(1)
    expect(d.roundsMs).toBe(2500)
    expect(d.byMark.kamatz).toEqual({ seen: 2, correct: 1, wrong: 1, timeout: 0, twin: 1, mega: 0 })
    expect(d.byMark.segol.mega).toBe(1)
    expect(d.byMark.segol.correct).toBe(0)
    expect(d.byType.C).toEqual({ seen: 1, correct: 0, wrong: 1, timeout: 0, twin: 1, mega: 0 })
    expect(d.bestScore).toBe(900)
    expect(d.bestWave).toBe(4)
    expect(d.lastPlayed).toBeTypeOf('number')
  })
  it('persists the duel slice', () => {
    useProgressStore.getState().recordDuelSession()
    const saved = JSON.parse(localStorage.getItem('alef-progress')!)
    expect(saved.state.duel.sessions).toBe(1)
  })
  it('an old save without duel/duelMusic loads with empty stats and music on', async () => {
    localStorage.setItem('alef-progress', JSON.stringify({ state: { ...INITIAL_PROGRESS_STATE, duel: undefined,
      settings: { ...INITIAL_PROGRESS_STATE.settings, duelMusic: undefined, backgroundMusic: false } }, version: 0 }))
    await useProgressStore.persist.rehydrate()
    const s = useProgressStore.getState()
    expect(s.duel.sessions).toBe(0)
    expect(duelMusicOn(s.settings)).toBe(true)
  })
  it('setDuelMusic toggles', () => {
    useProgressStore.getState().setDuelMusic(false)
    expect(duelMusicOn(useProgressStore.getState().settings)).toBe(false)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement**
  - **Types** in `src/types/progress.ts`:
    - add `duelMusic?: boolean` to `Settings`, with the doc comment `/** Duel music; undefined (old saves) means on */`
    - add `duelMusic: true` to `DEFAULT_SETTINGS`
    - `import type { DuelStats } from './duel'`
    - add `duel: DuelStats` to `ProgressState`
    - in `INITIAL_PROGRESS_STATE`, `duel: EMPTY_DUEL_STATS`, defined in `progress.ts` as `export const EMPTY_DUEL_STATS: DuelStats = { sessions: 0, roundsMs: 0, bestScore: 0, bestWave: 0, lastPlayed: null, byMark: {}, byType: {} }`
  - **Store** in `src/stores/progressStore.ts`:
    - add the action signatures to `ProgressActions`
    - add `duel: state.duel` to `partialize`
    - add the implementations next to the other setters, plus `export const duelMusicOn = (s: Settings) => s.duelMusic !== false` and the `Settings` type import

```ts
      recordDuelSession: () => {
        set((state) => ({ duel: { ...state.duel, sessions: state.duel.sessions + 1, lastPlayed: Date.now() } }))
      },
      recordDuelRound: (markId, type, result, ms) => {
        const bump = (t: Tally | undefined): Tally => {
          const base = { seen: 0, correct: 0, wrong: 0, timeout: 0, twin: 0, mega: 0, ...t }
          return { ...base, seen: base.seen + 1, [result]: base[result] + 1 }
        }
        set((state) => ({
          duel: {
            ...state.duel,
            roundsMs: state.duel.roundsMs + Math.max(0, Math.round(ms)),
            lastPlayed: Date.now(),
            byMark: { ...state.duel.byMark, [markId]: bump(state.duel.byMark[markId]) },
            byType: { ...state.duel.byType, [type]: bump(state.duel.byType[type]) },
          },
        }))
      },
      recordDuelTwin: (markId, type) => {
        const twin = (t: Tally | undefined): Tally => {
          const base = { seen: 0, correct: 0, wrong: 0, timeout: 0, twin: 0, mega: 0, ...t }
          return { ...base, twin: base.twin + 1 }
        }
        set((state) => ({
          duel: { ...state.duel, byMark: { ...state.duel.byMark, [markId]: twin(state.duel.byMark[markId]) },
            byType: { ...state.duel.byType, [type]: twin(state.duel.byType[type]) } },
        }))
      },
      recordDuelRunEnd: (score, wave) => {
        set((state) => ({ duel: { ...state.duel, bestScore: Math.max(state.duel.bestScore, score), bestWave: Math.max(state.duel.bestWave, wave) } }))
      },
      setDuelMusic: (on) => {
        set((state) => ({ settings: { ...state.settings, duelMusic: on } }))
      },
```

  - **Old saves:** zustand's default shallow merge only fills top-level keys that are *missing*, but this save has `duel: undefined` as an explicit key, which would win. Guard with an explicit `merge` in the persist options:

```ts
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<ProgressStore>
        return { ...current, ...p, duel: p.duel ?? current.duel, settings: { ...current.settings, ...p.settings } }
      },
```

  Merging `settings` also gives old saves `duelMusic: true` (from current) unless they persisted `duelMusic`. Note that `{...current.settings, ...p.settings}` with `p.settings.duelMusic === undefined` sets it to `undefined`, which `duelMusicOn` reads as on. Both paths are covered by the test.

- [ ] **Step 4: Run** `npx vitest run` → all PASS (the new tests and the existing ones). **Build, then commit:**

```bash
npm run build
git add src/types/progress.ts src/stores/progressStore.ts src/stores/duelSlice.test.ts
git commit -m "Add duel stats slice and duelMusic setting to the progress store

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Bundled assets and their metadata

**Files:**
- Create: `src/assets/duel/sprites/*.webp`, `src/assets/duel/audio/{sfx,music,voice}/*.mp3` (copied), `src/assets/duel/sprites.ts`, `src/assets/duel/audioFiles.ts`
- Modify (outside repo): `/data/ws/scratch/nikkud-duel/audio/sync_voice.py` `DEST`
- Test: `src/assets/duel/assets.test.ts`

**Interfaces:**
- Produces:
  - `WIZARD: {idle, cast, dizzy}`
  - `TOWER`
  - `MONSTERS: Record<string, {src: string; faces: 'left'|'right'|'front'; rate: number}>`, covering the 8 regular monsters plus dragon and troll
  - `WORD_PICTURE: Record<string, string>`, keyed by `PictureWord.key`
  - `SFX_URLS: Record<'arrival1'|'arrival2'|'arrival3'|'cast'|'boom1'|'boom2'|'ouch'|'mega'|'sparkle', string>`
  - `MUSIC_URLS: Record<'calm'|'mid'|'fast'|'boss1'|'boss2'|'victory', string>`
  - `VOICE_URLS: Record<string, string>`, keyed by line id (`wiz-kamatz`, `mon-vowel-a`, `line-intro`, `sfx-mute`, …)

- [ ] **Step 1: Copy the assets**

```bash
P=src/pages/Prototype/nikkudDuel; A=src/assets/duel
mkdir -p $A/sprites $A/audio/sfx $A/audio/music $A/audio/voice
cp $P/sprites/*.webp $A/sprites/
cp $P/audio/arrival-*.mp3 $P/audio/cast.mp3 $P/audio/boom-*.mp3 $P/audio/ouch.mp3 $P/audio/mega.mp3 $P/audio/sparkle.mp3 $A/audio/sfx/
cp $P/audio/music-*.mp3 $A/audio/music/
cp $P/audio/voice/*.mp3 $A/audio/voice/
ls $A/sprites | wc -l     # expect 32 (14 sprites + 18 picture words)
ls $A/audio/voice | wc -l # expect ≥ 80
sed -i 's#^DEST = .*#DEST = "/data/ws/alef/src/assets/duel/audio/voice"#' /data/ws/scratch/nikkud-duel/audio/sync_voice.py
```

- [ ] **Step 2: Write the failing test** `src/assets/duel/assets.test.ts`

```ts
import { describe, it, expect } from 'vitest'
import { MONSTERS, WORD_PICTURE, WIZARD, TOWER } from './sprites'
import { MUSIC_URLS, SFX_URLS, VOICE_URLS } from './audioFiles'
import { PICTURE_WORDS } from '../../utils/duel/words'
import { DUEL_MARKS, SOUND_GROUPS } from '../../utils/duel/marks'
import { ROSTER } from '../../utils/duel/rules'

describe('duel assets', () => {
  it('every monster (roster + bosses) has a sprite, facing and a safe voice rate', () => {
    for (const id of [...ROSTER.map((m) => m.id), 'dragon', 'troll']) {
      const m = MONSTERS[id]
      expect(m, id).toBeTruthy()
      expect(['left', 'right', 'front']).toContain(m.faces)
      expect(m.rate).toBeGreaterThanOrEqual(0.7)
      expect(m.rate).toBeLessThanOrEqual(1.3)
    }
    expect(WIZARD.idle && WIZARD.cast && WIZARD.dizzy && TOWER).toBeTruthy()
  })
  it('every picture word has a picture', () => {
    for (const w of PICTURE_WORDS) expect(WORD_PICTURE[w.key], w.key).toBeTruthy()
  })
  it('every voice line the game uses exists', () => {
    const needed = [
      ...DUEL_MARKS.flatMap((m) => [`wiz-${m.id}`, `mon-name-${m.id}`]),
      ...SOUND_GROUPS.filter((g) => g !== 'silent').flatMap((g) => [`wiz-vowel-${g}`, `mon-vowel-${g}`]),
      ...PICTURE_WORDS.filter((w) => w.group !== 'silent').flatMap((w) => [`wiz-word-${w.key}`, `mon-word-${w.key}`]),
      'sfx-mute', 'line-intro', 'line-how-A', 'line-how-B', 'line-how-C', 'line-how-D', 'line-how-silent', 'line-wave',
      'line-new-spells', 'line-new-monster', 'line-boss', 'line-mega', 'line-combo', 'line-over', 'line-record', 'line-almost',
    ]
    for (const id of needed) expect(VOICE_URLS[id], id).toBeTruthy()
    expect(Object.keys(SFX_URLS)).toHaveLength(9)
    expect(Object.keys(MUSIC_URLS)).toHaveLength(6)
  })
})
```

- [ ] **Step 3: Implement `src/assets/duel/sprites.ts`**

```ts
// Duel sprites: Gemini renders in the approved "night sky magic" style (sheet B), magenta keyed out by
// /data/ws/scratch/nikkud-duel/art/export_final.py. Monsters walk right → left: `faces` records the drawing's
// direction and right-facing ones are mirrored (motion cues count — the ghost's trailing tail).
import wizardIdle from './sprites/wizard-idle.webp'
import wizardCast from './sprites/wizard-cast.webp'
import wizardDizzy from './sprites/wizard-dizzy.webp'
import tower from './sprites/tower.webp'
import fuzzy from './sprites/mon-fuzzy.webp'
import blob from './sprites/mon-blob.webp'
import imp from './sprites/mon-imp.webp'
import ghost from './sprites/mon-ghost.webp'
import bat from './sprites/mon-bat.webp'
import mushroom from './sprites/mon-mushroom.webp'
import golem from './sprites/mon-golem.webp'
import octopus from './sprites/mon-octopus.webp'
import dragon from './sprites/boss-dragon.webp'
import troll from './sprites/boss-troll.webp'

export const WIZARD = { idle: wizardIdle, cast: wizardCast, dizzy: wizardDizzy }
export const TOWER = tower

type Faces = 'left' | 'right' | 'front'
/** rate: the one verified Clyde recording, played faster (higher) or slower (deeper) per monster; 0.7–1.3. */
export const MONSTERS: Record<string, { src: string; faces: Faces; rate: number }> = {
  fuzzy: { src: fuzzy, faces: 'right', rate: 1.0 },
  blob: { src: blob, faces: 'front', rate: 1.12 },
  imp: { src: imp, faces: 'left', rate: 1.25 },
  ghost: { src: ghost, faces: 'right', rate: 0.92 },
  bat: { src: bat, faces: 'left', rate: 1.3 },
  mushroom: { src: mushroom, faces: 'front', rate: 1.05 },
  golem: { src: golem, faces: 'front', rate: 0.85 },
  octopus: { src: octopus, faces: 'front', rate: 1.15 },
  dragon: { src: dragon, faces: 'left', rate: 0.8 },
  troll: { src: troll, faces: 'left', rate: 0.72 },
}

const wordFiles = import.meta.glob('./sprites/word-*.webp', { eager: true, query: '?url', import: 'default' }) as Record<string, string>
export const WORD_PICTURE: Record<string, string> = Object.fromEntries(
  Object.entries(wordFiles).map(([p, url]) => [p.replace(/^.*word-/, '').replace('.webp', ''), url]),
)
```

- [ ] **Step 4: Implement `src/assets/duel/audioFiles.ts`**

```ts
// Duel audio, picked by Michael on the review page (/nikkud-duel/review/) and synced by sync_voice.py.
// SFX picks: arrival 1–3 rotate, cast 3, boom r2 options 1+3 rotate, ouch r2 option 4, mega 1, sparkle 1.
// Music: calm/mid/fast by wave, two boss tracks alternate, victory 1.
const glob = (files: Record<string, string>) =>
  Object.fromEntries(Object.entries(files).map(([p, url]) => [p.split('/').pop()!.replace('.mp3', ''), url]))

const sfx = glob(import.meta.glob('./audio/sfx/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)
const music = glob(import.meta.glob('./audio/music/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>)

export const SFX_URLS = {
  arrival1: sfx['arrival-1'], arrival2: sfx['arrival-2'], arrival3: sfx['arrival-3'], cast: sfx.cast,
  boom1: sfx['boom-1'], boom2: sfx['boom-2'], ouch: sfx.ouch, mega: sfx.mega, sparkle: sfx.sparkle,
}
export const MUSIC_URLS = {
  calm: music['music-calm'], mid: music['music-mid'], fast: music['music-fast'],
  boss1: music['music-boss-1'], boss2: music['music-boss-2'], victory: music['music-victory'],
}
export const VOICE_URLS: Record<string, string> = glob(
  import.meta.glob('./audio/voice/*.mp3', { eager: true, query: '?url', import: 'default' }) as Record<string, string>,
)
```

- [ ] **Step 5: Run the tests** (`npx vitest run src/assets/duel/assets.test.ts`) → PASS. If a voice line is missing, run `python3 /data/ws/scratch/nikkud-duel/audio/sync_voice.py` (which now writes to `src/assets/duel/audio/voice`) and re-run. **Commit:**

```bash
git add src/assets/duel
git commit -m "Bundle duel sprites, picture words, voice lines, SFX and music

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Duel audio engine

**Files:**
- Create: `src/utils/duel/duelAudio.ts`
- Test: `src/utils/duel/duelAudio.test.ts`

**Interfaces:**
- Consumes: `SFX_URLS`, `MUSIC_URLS`, `VOICE_URLS` (Task 6).
- Produces:
  - **Setup:** `unlockDuelAudio(): void`, `preloadDuelAudio(): void`, `configureDuelAudio(o: {sfx: boolean; music: boolean; volume: number}): void`
  - **Sounds and lines:** `playSfx(name: SfxName, power?: number): Promise<void>` (resolves when it ends; arrival is awaited), `playLine(id: string, rate?: number): Promise<void>` (ducks the music; resolves on end, stop, load error or the safety timeout)
  - **Music:** `type MusicTrack = 'calm'|'mid'|'fast'|'boss'|'victory'`, `trackForWave(wave, boss): MusicTrack`, `playMusic(t: MusicTrack): void`, `stopMusic(): void`
  - **Control:** `muteDuelAudio(on: boolean): void`, `stopAllLines(): void`
  - `type SfxName = 'arrival'|'cast'|'boom'|'ouch'|'mega'|'sparkle'`. `arrival` and `boom` rotate between their variants.

- [ ] **Step 1: Write the failing test** `src/utils/duel/duelAudio.test.ts`

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest'

type Handler = (...a: unknown[]) => void
const instances: FakeHowl[] = []
class FakeHowl {
  src: string[]; handlers: Record<string, Handler[]> = {}; _vol = 1; _rate = 1; playing_ = false; loadError = false
  constructor(o: { src: string[]; onloaderror?: Handler }) { this.src = o.src; instances.push(this); if (o.onloaderror) this.on('loaderror', o.onloaderror) }
  on(ev: string, fn: Handler) { (this.handlers[ev] ||= []).push(fn); return this }
  once(ev: string, fn: Handler) { return this.on(ev, fn) }
  emit(ev: string) { (this.handlers[ev] || []).forEach((f) => f(1)) }
  play() { this.playing_ = true; return 1 }
  stop() { this.playing_ = false; this.emit('stop'); return this }
  rate(r?: number) { if (r !== undefined) this._rate = r; return this._rate }
  volume(v?: number) { if (v !== undefined) this._vol = v; return this._vol }
  fade(_a: number, b: number) { this._vol = b; return this }
  playing() { return this.playing_ }
  state() { return 'loaded' }
  load() { return this }
}
vi.mock('howler', () => ({ Howl: FakeHowl, Howler: { mute: vi.fn(), volume: vi.fn(), ctx: { state: 'running', resume: vi.fn() } } }))
vi.mock('../../assets/duel/audioFiles', () => ({
  SFX_URLS: { arrival1: 'a1', arrival2: 'a2', arrival3: 'a3', cast: 'c', boom1: 'b1', boom2: 'b2', ouch: 'o', mega: 'm', sparkle: 's' },
  MUSIC_URLS: { calm: 'mc', mid: 'mm', fast: 'mf', boss1: 'mb1', boss2: 'mb2', victory: 'mv' },
  VOICE_URLS: { 'wiz-kamatz': 'wk', 'mon-vowel-a': 'mva' },
}))

beforeEach(() => { vi.useFakeTimers(); instances.length = 0; vi.resetModules() })

describe('duelAudio', () => {
  it('playLine resolves on end and clamps the rate', async () => {
    const audio = await import('./duelAudio')
    const p = audio.playLine('mon-vowel-a', 2)
    const h = instances.find((i) => i.src[0] === 'mva')!
    expect(h._rate).toBe(1.3)
    h.emit('end')
    await expect(p).resolves.toBeUndefined()
  })
  it('a missing line resolves immediately', async () => {
    const audio = await import('./duelAudio')
    await expect(audio.playLine('nope')).resolves.toBeUndefined()
  })
  it('a line that never ends resolves after the safety timeout', async () => {
    const audio = await import('./duelAudio')
    let done = false
    void audio.playLine('wiz-kamatz').then(() => { done = true })
    await vi.advanceTimersByTimeAsync(5100)
    expect(done).toBe(true)
  })
  it('ducks music while a line plays and restores it after', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: true, music: true, volume: 1 })
    audio.playMusic('calm')
    const m = instances.find((i) => i.src[0] === 'mc')!
    const p = audio.playLine('wiz-kamatz')
    expect(m._vol).toBeLessThan(0.2)
    instances.find((i) => i.src[0] === 'wk')!.emit('end')
    await p
    expect(m._vol).toBeGreaterThan(0.2)
  })
  it('music off: playMusic does nothing; tracks by wave', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: true, music: false, volume: 1 })
    audio.playMusic('calm')
    expect(instances.find((i) => i.src[0] === 'mc')?.playing() ?? false).toBe(false)
    expect(audio.trackForWave(2, false)).toBe('calm')
    expect(audio.trackForWave(4, false)).toBe('mid')
    expect(audio.trackForWave(7, false)).toBe('fast')
    expect(audio.trackForWave(5, true)).toBe('boss')
  })
  it('sfx off: playSfx resolves without playing', async () => {
    const audio = await import('./duelAudio')
    audio.configureDuelAudio({ sfx: false, music: true, volume: 1 })
    await expect(audio.playSfx('arrival')).resolves.toBeUndefined()
    expect(instances.filter((i) => i.playing())).toHaveLength(0)
  })
})
```

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement `src/utils/duel/duelAudio.ts`**

```ts
// Duel audio: Howler on Web Audio (html5 off — per-monster playback rates need it).
// Every spoken line ducks the music; anything missing, failing or silent resolves via a safety timeout
// so the game can never stall waiting for audio.
import { Howl, Howler } from 'howler'
import { MUSIC_URLS, SFX_URLS, VOICE_URLS } from '../../assets/duel/audioFiles'

export type SfxName = 'arrival' | 'cast' | 'boom' | 'ouch' | 'mega' | 'sparkle'
export type MusicTrack = 'calm' | 'mid' | 'fast' | 'boss' | 'victory'

const MUSIC_VOL = 0.35
const DUCK_VOL = 0.1
const LINE_TIMEOUT_MS = 5000
const SFX_TIMEOUT_MS = 3000

let cfg = { sfx: true, music: true, volume: 0.8 }
const howls = new Map<string, Howl>()
const howl = (src: string, loop = false) => {
  let h = howls.get(src)
  if (!h) {
    h = new Howl({ src: [src], loop, preload: true, html5: false })
    howls.set(src, h)
  }
  return h
}

export function configureDuelAudio(o: { sfx: boolean; music: boolean; volume: number }) {
  cfg = o
  Howler.volume(o.volume)
  if (!o.music) stopMusic()
}

/** Call inside the ▶ tap: resumes the AudioContext (autoplay policies). */
export function unlockDuelAudio() {
  const ctx = (Howler as unknown as { ctx?: AudioContext }).ctx
  if (ctx && ctx.state === 'suspended') void ctx.resume()
}

export function preloadDuelAudio() {
  Object.values(SFX_URLS).forEach((u) => howl(u))
  Object.values(VOICE_URLS).forEach((u) => howl(u))
}

/** Play once; resolve on end/stop/error or after `timeout`. */
function playOnce(h: Howl, rate = 1, timeout = LINE_TIMEOUT_MS): Promise<void> {
  return new Promise((resolve) => {
    let done = false
    const finish = () => {
      if (!done) {
        done = true
        resolve()
      }
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

const VARIANTS: Record<SfxName, string[]> = {
  arrival: [SFX_URLS.arrival1, SFX_URLS.arrival2, SFX_URLS.arrival3],
  cast: [SFX_URLS.cast],
  boom: [SFX_URLS.boom1, SFX_URLS.boom2],
  ouch: [SFX_URLS.ouch],
  mega: [SFX_URLS.mega],
  sparkle: [SFX_URLS.sparkle],
}

export function playSfx(name: SfxName, power = 1): Promise<void> {
  if (!cfg.sfx) return Promise.resolve()
  const vs = VARIANTS[name]
  const h = howl(vs[Math.floor(Math.random() * vs.length)])
  h.volume(name === 'boom' ? Math.min(1, 0.6 + 0.3 * power) : 0.8)
  return playOnce(h, 1, SFX_TIMEOUT_MS)
}

export function playLine(id: string, rate = 1): Promise<void> {
  const url = VOICE_URLS[id]
  if (!url) return Promise.resolve()
  duck(true)
  const r = Math.min(1.3, Math.max(0.7, rate))
  return playOnce(howl(url), r).finally(() => duck(false))
}

export function stopAllLines() {
  Object.values(VOICE_URLS).forEach((u) => howls.get(u)?.stop())
}

// ---- music ----
let current: Howl | null = null
let ducks = 0
let bossToggle = false

export const trackForWave = (wave: number, boss: boolean): MusicTrack => (boss ? 'boss' : wave <= 2 ? 'calm' : wave <= 5 ? 'mid' : 'fast')

export function playMusic(track: MusicTrack) {
  if (!cfg.music) return
  let url: string
  if (track === 'boss') {
    bossToggle = !bossToggle
    url = bossToggle ? MUSIC_URLS.boss1 : MUSIC_URLS.boss2
  } else url = MUSIC_URLS[track]
  const next = howl(url, track !== 'victory')
  if (current === next && next.playing()) return
  stopMusic()
  current = next
  next.volume(0)
  next.play()
  next.fade(0, ducks > 0 ? DUCK_VOL : MUSIC_VOL, 800)
}

export function stopMusic() {
  if (!current) return
  const h = current
  current = null
  h.fade(h.volume(), 0, 300)
  window.setTimeout(() => h.stop(), 320)
}

function duck(on: boolean) {
  ducks = Math.max(0, ducks + (on ? 1 : -1))
  if (current?.playing()) current.fade(current.volume(), ducks > 0 ? DUCK_VOL : MUSIC_VOL, 200)
}

export function muteDuelAudio(on: boolean) {
  Howler.mute(on)
}
```

- [ ] **Step 4: Run the tests** → PASS. **Commit:**

```bash
git add src/utils/duel/duelAudio.ts src/utils/duel/duelAudio.test.ts
git commit -m "Add duel audio engine: lines with ducking and timeouts, SFX, music by wave

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: Pad-level components (Icon, RuneGlyph, Clue, SpellPad, ResultBanner, DuelHud) and the stylesheet

**Files:**
- Create: `src/components/duel/Icon.tsx`, `RuneGlyph.tsx`, `Clue.tsx`, `SpellPad.tsx`, `ResultBanner.tsx`, `DuelHud.tsx`, `duel.css`
- Test: `src/components/duel/SpellPad.test.tsx`, `src/components/duel/legibility.test.tsx`

**Porting sources** (copy, then apply the listed changes):
- `Icon.tsx` ← `src/pages/Prototype/nikkudDuel/icons.tsx`, verbatim.
- `RuneGlyph.tsx` ← `RuneGlyph`, `Dot`, `RuneGlowDefs` from `src/pages/Prototype/nikkudDuel/marks.tsx`. Change `mark: Mark` to `mark: DuelMark` (from `types/duel`); the rendering is unchanged, including the drawn-vav polygon.
- `duel.css` ← `src/pages/Prototype/nikkudDuel/nikkudDuel.css`, verbatim (the `nd-` class prefix is kept). Imported once by `DuelPage`.

**Interfaces:**
- Consumes: types, `keyOf`/`isCorrect` (Task 3), `MONSTERS`, `WORD_PICTURE` (Task 6), `playLine` (Task 7).
- Produces:
  - `<Icon name size? style? className?/>`
  - `<RuneGlyph mark box? size?/>`, `<RuneGlowDefs/>`
  - `<Clue round onReplay/>`
  - `<SpellPad round outcome twinTried oneRow onChoose showTestHooks/>`
  - `<ResultBanner mark word kind/>`
  - `<DuelHud hearts score combo mega megaMax kills killsPerWave onPause/>`

- [ ] **Step 1: Write the failing tests**

`src/components/duel/SpellPad.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { SpellPad } from './SpellPad'
import { markById } from '../../utils/duel/marks'
import { wordsFor } from '../../utils/duel/words'
import type { Round } from '../../types/duel'

const round: Round = {
  id: 1, type: 'C', target: markById('kamatz'), runes: [markById('kamatz'), markById('patach'), markById('segol'), markById('chirik')],
  word: wordsFor('a')[0], padWords: [], monster: 'fuzzy', boss: false, walkMs: 9000,
}

describe('SpellPad', () => {
  it('renders one button per rune and reports choices', () => {
    const onChoose = vi.fn()
    render(<SpellPad round={round} outcome={null} twinTried={null} oneRow={false} onChoose={onChoose} showTestHooks />)
    const buttons = screen.getAllByRole('button')
    expect(buttons).toHaveLength(4)
    fireEvent.click(buttons[0])
    expect(onChoose).toHaveBeenCalledTimes(1)
    expect(buttons.filter((b) => b.getAttribute('data-correct') === '1')).toHaveLength(1)
  })
  it('marks the forgiven twin as almost, and reveals the answer on a miss', () => {
    const { rerender, container } = render(<SpellPad round={round} outcome={null} twinTried="patach" oneRow={false} onChoose={() => {}} showTestHooks={false} />)
    expect(container.querySelectorAll('.nd-rune.almost')).toHaveLength(1)
    rerender(<SpellPad round={round} outcome={{ kind: 'miss', choiceKey: 'segol', mega: false, final: false, points: 0, effect: 'gentle' }} twinTried={null} oneRow={false} onChoose={() => {}} showTestHooks={false} />)
    expect(container.querySelectorAll('.nd-rune.miss')).toHaveLength(1)
    expect(container.querySelectorAll('.nd-rune.reveal')).toHaveLength(1)
    expect(container.querySelector('[data-correct]')).toBeNull()
  })
  it('D pad shows six pictures', () => {
    const d: Round = { ...round, type: 'D', runes: [], padWords: ['a', 'e', 'i', 'o', 'u', 'silent'].map((g) => wordsFor(g as never)[0]) }
    const { container } = render(<SpellPad round={d} outcome={null} twinTried={null} oneRow onChoose={() => {}} showTestHooks={false} />)
    expect(container.querySelectorAll('img.nd-word-btn')).toHaveLength(6)
  })
})
```

`src/components/duel/legibility.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { SpellPad } from './SpellPad'
import { ResultBanner } from './ResultBanner'
import { DuelHud } from './DuelHud'
import { Clue } from './Clue'
import { markById, DUEL_MARKS } from '../../utils/duel/marks'
import { wordsFor } from '../../utils/duel/words'
import type { Round } from '../../types/duel'

const LETTERS = /[A-Za-zא-ת]/ // Latin or Hebrew letters (nikkud marks are not letters)
const EMOJI = /\p{Extended_Pictographic}/u

describe('child UI has no writing and no emoji', () => {
  it('pad, banner, hud and clues render no letters or emoji', () => {
    for (const type of ['A', 'B', 'C', 'D'] as const) {
      for (const m of DUEL_MARKS) {
        const r: Round = { id: 1, type, target: m, runes: type === 'D' ? [] : [m], word: wordsFor(m.group)[0],
          padWords: type === 'D' ? (['a', 'e', 'i', 'o', 'u', 'silent'] as const).map((g) => wordsFor(g)[0]) : [],
          monster: 'fuzzy', boss: false, walkMs: 9000 }
        const { container, unmount } = render(<>
          <Clue round={r} onReplay={() => {}} />
          <SpellPad round={r} outcome={null} twinTried={null} oneRow={false} onChoose={() => {}} showTestHooks={false} />
          <ResultBanner mark={m} word={r.word} kind="hit" />
          <DuelHud hearts={2} score={1234} combo={3} mega={4} megaMax={8} kills={2} killsPerWave={5} onPause={() => {}} />
        </>)
        expect(container.textContent ?? '', `${type}/${m.id}`).not.toMatch(LETTERS)
        expect(container.textContent ?? '').not.toMatch(EMOJI)
        unmount()
      }
    }
    expect(markById('shva')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run them and confirm they fail** (the modules are missing).

- [ ] **Step 3: Implement the components.** Port the prototype JSX from `NikkudDuelPrototype.tsx`: the `Clue`, `Pad`, `ResultBanner` functions and the HUD markup (`.nd-hud`, `.nd-hud2`). Changes:
  - **`Clue.tsx`** exports `Clue({ round, onReplay }: { round: Round; onReplay: () => void })`:
    - **A:** a `<button className="nd-clue nd-clue-sign" onClick={onReplay}>` around `<img className="nd-word-pic" src={WORD_PICTURE[round.word.key]}/>`. Replay is a no-op for silent.
    - **D:** a shield with `<RuneGlyph mark={round.target} box size={54}/>`.
    - **B silent:** `<div className="nd-clue"><Icon name="speakerOff" size={34}/><Icon name="puff" size={34}/></div>`.
    - **B or C:** `<button className="nd-clue nd-clue-audio" onClick={onReplay}><Icon name={round.type === 'B' ? 'speaker' : 'talk'} size={34}/></button>`. Drop the prototype's `)))` text pulse, because `)` would fail no test but is writing-like noise; keep only the icon.
  - **`SpellPad.tsx`** exports `SpellPad({ round, outcome, twinTried, oneRow, onChoose, showTestHooks })`:
    - `choices = round.type === 'D' ? round.padWords.map(w => ({kind:'sound', group: w.group})) : round.runes.map(mark => ({kind:'rune', mark}))`
    - `cols = oneRow ? choices.length : choices.length === 4 ? 2 : 3`
    - Button state: `'almost'` when `!outcome && keyOf(c) === twinTried`. When there is an outcome: `hit`/`miss` for the chosen key, and `reveal` for the correct ones after a miss.
    - `data-correct` is rendered **only** when `showTestHooks`.
    - Picture buttons render `<img className="nd-word-pic nd-word-btn" src={WORD_PICTURE[word.key]}/>`, where `word` is the `padWords` entry for that group.
  - **`ResultBanner.tsx`** exports `ResultBanner({ mark, word, kind })`: a `motion.div` with `className={`nd-resolve ${kind}`}`, `style={{ x: '-50%' }}`, `<RuneGlyph mark={mark} size={58}/>` and `<img className="nd-word-pic nd-word-banner" src={WORD_PICTURE[word.key]}/>`. No text.
  - **`DuelHud.tsx`** exports `DuelHud({ hearts, score, combo, mega, megaMax, kills, killsPerWave, onPause })`:
    - hearts as `Icon heart/heartEmpty` ×3
    - the continuous wave bar `.nd-wave-bar` with the width `kills / killsPerWave`
    - the pause button `.nd-pause-btn` with `aria-label="pause"` containing `<Icon name="pause"/>`
    - the score as `<Icon name="sparkle"/> {score.toLocaleString('en-US')}`: digits and `,` only. `en-US` avoids locale-specific separators.
    - the MEGA meter `.nd-mega-meter`
    - the combo as `<Icon name="flame"/> ×{combo}` when `combo >= 2`

    `×` is U+00D7, not a letter, so it passes the LETTERS regex.

- [ ] **Step 4: Run the tests** → PASS. If `legibility.test.tsx` flags a letter, find which component emits it via the failure message (`type/markId`) and remove it. Never weaken the regex. **Commit:**

```bash
git add src/components/duel
git commit -m "Add duel pad, clue, banner, HUD, drawn icons and rune glyphs

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: The battlefield (tower, wizard, monster, explosion, measured geometry)

**Files:**
- Create: `src/components/duel/Battlefield.tsx`, `Monster.tsx`, `Explosion.tsx`
- Test: `src/components/duel/Battlefield.test.tsx`

**Porting source:** `NikkudDuelPrototype.tsx`: the `.nd-field` block (ground, tower img, wizard `motion.img`, timebar, walking monster, lunging monster, explosion, banner slot, announcement banner), the `useLandscape` hook, the `useLayoutEffect` measuring code, and the `Explosion` function.

**Interfaces:**
- Consumes: `MONSTERS`, `WIZARD`, `TOWER` (Task 6); `Icon`, `ResultBanner` (Task 8); types.
- Produces:
  - `useLandscape(): boolean` (exported from `Battlefield.tsx`), using the query `(orientation: landscape) and (min-width: 640px) and (min-height: 500px)`
  - `<Battlefield round outcome walking paused landscape banner effectPresets shakeKey/>`, which renders the field and owns geometry measurement
  - `<Monster round walking startX endX/>`
  - `<Explosion round outcome geo preset/>`, where `preset: { particles, shake, flash, hitstopMs, boom }`
  - `EFFECT_PRESETS: Record<EffectPreset, Juice>`: gentle `{10, 4, 1.6, 0, 0.6}`, boom `{24, 12, 2.8, 0, 1}`, mega `{48, 24, 4.2, 140, 1.5}`

- [ ] **Step 1: Write the failing test** `src/components/duel/Battlefield.test.tsx`

```tsx
import { describe, it, expect } from 'vitest'
import { render } from '@testing-library/react'
import { Battlefield } from './Battlefield'
import { markById } from '../../utils/duel/marks'
import { wordsFor } from '../../utils/duel/words'
import type { Round } from '../../types/duel'

const r = (monster: string): Round => ({ id: 1, type: 'A', target: markById('kamatz'), runes: [], word: wordsFor('a')[0], padWords: [], monster, boss: false, walkMs: 9000 })

describe('Battlefield', () => {
  it('mirrors right-facing monsters only', () => {
    const { container, rerender } = render(<Battlefield round={r('ghost')} outcome={null} walking paused={false} landscape={false} banner={null} />)
    expect((container.querySelector('.nd-sprite') as HTMLElement).style.transform).toBe('scaleX(-1)')
    rerender(<Battlefield round={r('imp')} outcome={null} walking paused={false} landscape={false} banner={null} />)
    expect((container.querySelector('.nd-sprite') as HTMLElement).style.transform).toBe('')
  })
  it('shows the time bar only while walking', () => {
    const { container, rerender } = render(<Battlefield round={r('imp')} outcome={null} walking={false} paused={false} landscape={false} banner={null} />)
    expect(container.querySelector('.nd-timebar')).toBeNull()
    rerender(<Battlefield round={r('imp')} outcome={null} walking paused={false} landscape={false} banner={null} />)
    expect(container.querySelector('.nd-timebar')).not.toBeNull()
  })
  it('re-measures on window resize without throwing (rotation)', () => {
    render(<Battlefield round={r('imp')} outcome={null} walking paused={false} landscape={false} banner={null} />)
    expect(() => window.dispatchEvent(new Event('resize'))).not.toThrow()
  })
})
```

(jsdom has no `ResizeObserver`. In `Battlefield`, guard with `typeof ResizeObserver !== 'undefined'` and always add the window `resize` listener.)

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement.** Port the prototype markup with these changes:
  - The monster `<img>` uses `MONSTERS[round.monster].src`, with `style={MONSTERS[id].faces === 'right' ? { transform: 'scaleX(-1)' } : undefined}`.
  - The geometry constants `PORTRAIT {start: 78, end: 27, wizLeft: 15, wizBottom: 50}` and `LANDSCAPE {start: 90, end: 16, wizLeft: 9, wizBottom: 52}` are overridden by measured values, exactly as in the prototype's `useLayoutEffect`.
  - `Battlefield` also exposes the current `x` of the walking monster for outcomes via a prop callback `onGeometry?: (g: Geo) => void`. The hook stores it.
  - `Explosion` takes `preset: Juice` instead of reading the URL variant; `EFFECT_PRESETS` is exported from `Explosion.tsx`. Particle sparkles use `<Icon name="sparkle"/>`; there's no `BITS` emoji array.
  - The miss lunge and `Icon name="bonk"` come straight from the prototype.

- [ ] **Step 4: Run the tests** → PASS. **Commit:**

```bash
git add src/components/duel/Battlefield.tsx src/components/duel/Monster.tsx src/components/duel/Explosion.tsx src/components/duel/Battlefield.test.tsx
git commit -m "Add duel battlefield: tower, wizard poses, monsters, explosions, measured geometry

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: `useDuelGame` hook, DuelPage, covers and the route

**Files:**
- Create: `src/hooks/useDuelGame.ts`, `src/pages/Duel/DuelPage.tsx`, `src/components/duel/StartCover.tsx`, `PauseCover.tsx`, `RunSummary.tsx`
- Modify: `src/App.tsx` (lazy route `/duel`)
- Test: `src/hooks/useDuelGame.test.tsx`

**Interfaces:**
- Consumes: the reducer (Task 4), `makeRound`/`pickEffect` (Task 3), store actions (Task 5), audio (Task 7), components (Tasks 8–9).
- Produces: `useDuelGame(opts: { rng?: Rng; walkOverride?: number }) → { state, start, choose(choice), megaCast(), pause(), resume(), replayClue(), sayMark(mark, word?) , currentX(): number, setGeometry(g) }` and the `<DuelPage/>` route component.

**Sequencing the hook implements** (the spec's Round timeline; port the prototype's `spawn`/`begin`/`announce`/`resolve`/advance-effect logic, rewritten around the reducer):

1. **`start()`:**
   - `unlockDuelAudio()`, `configureDuelAudio({ sfx: settings.soundEffects, music: duelMusicOn(settings), volume: settings.volume })` and `recordDuelSession()`
   - dispatch `START`
   - show the wizard banner while `playLine('line-intro')` plays, then handle `state.next`
2. **On `state.next.kind === 'spawn'`** (an effect keyed on `state.next`):
   1. If `announce` is set, play the line (`line-wave` / `line-new-spells` / `line-boss` / `line-new-monster`) with the banner visual. The visuals are `Icon swords`, `sparkle`+`wand`+`sparkle`, the boss sprite, or the new monster's sprite.
   2. `makeRound({ id, wave, boss, rng, runMisses: state.runMisses, lifetimeMisses })`, where `lifetimeMisses[id] = byMark[id].wrong + byMark[id].timeout` from the store.
   3. **First-time screen:** compute `key = type === 'B' && target.group === 'silent' ? 'silent' : type`. If it isn't in `seenScreens`, dispatch `SCREEN_EXPLAINED` and play `line-how-<key>` with `Icon` (eye/ear/shield) as the banner **before** `ROUND_READY`.
   4. Dispatch `ROUND_READY`, then `playMusic(trackForWave(wave, boss))` and `playSfx('arrival')` (awaited).
   5. **B/C:** `await arrival; await delay(450)`, then the clue (`mon-vowel-<g>`, `sfx-mute` via `playLine('sfx-mute')` for silent, or `mon-name-<id>`) at `MONSTERS[monster].rate`. Then record `walkStartedAt = now` and dispatch `WALK_START`. **A/D:** `walkStartedAt = now` immediately.
   6. Every async continuation checks a `runId` ref and `pausedRef`. If paused, stash the round in `pendingRound` and don't dispatch.
3. **Timer:** while `walking && !paused && !outcome`, `setTimeout(TIMEOUT, round.walkMs − elapsed)`.
4. **`choose(c)`:**
   - Compute `effect = pickEffect(rng, { final, mega: false, boss: round.boss })`, where `final = !round.boss || bossHp <= 1`, then dispatch `CHOOSE`.
   - **Twin:** detect it the same way as the reducer (`isTwin(round, c) && !twinTried`). Then `recordDuelTwin(target.id, type)` and `playLine('line-almost')` followed by `playLine('wiz-<twin id>')`.
   - **Hit or miss:** the outcome effect handles it.
5. **Outcome effect** (keyed on `state.outcome` becoming non-null):
   1. Record `recordDuelRound(target.id, type, mega ? 'mega' : hit ? 'correct' : choiceKey ? 'wrong' : 'timeout', now − spawnedAt)`.
   2. **Hit:** `playSfx(mega ? 'mega' : 'cast')`. After `260 + preset.hitstopMs` ms, `playSfx('boom', preset.boom)`, `playSfx('sparkle')` and the shake.
   3. **Miss:** after 380 ms, `playSfx('ouch')` and a shake of 8.
   4. **Speech chain:** `sayMark(target, round.word)` (name → 250 ms → vowel, or `sfx-mute` for shva → 200 ms → `wiz-word-<key>`, skipped for silent). Then `line-combo` if `combo % 5 === 0`, and `line-mega` if the meter just reached `MEGA_MAX`.
   5. `await Promise.all([delay(hit ? 1300 + hitstopMs : 2000), speech])`, then `delay(500)`, then dispatch `ADVANCE`, unless the run changed or the game is paused. If paused, set a `resumeAction = 'advance'` and do it on resume.
6. **`next.kind === 'over'`:**
   1. `recordDuelRunEnd(score, wave)`, after computing `newBest` as `score > duel.bestScore` read **before** recording
   2. `playMusic('victory')`
   3. `playLine('line-over')`, then `line-record` if `newBest`
7. **Pause/resume:**
   - **Pause:** `document` `visibilitychange` with `document.hidden` calls `pause()`: dispatch `PAUSE`, `muteDuelAudio(true)`, `stopAllLines()`.
   - **`resume()`:** dispatch `RESUME` and `muteDuelAudio(false)`. Then, in order:
     1. If there's a `pendingRound`, begin it.
     2. Else if `resumeAction === 'advance'`, dispatch `ADVANCE`.
     3. Else if `round && !outcome`, restart the round: re-dispatch `ROUND_READY` with `{...round, id: newId}` and rerun steps 4–5 of the spawn sequence.

**Unmount:** clear timers, `stopMusic()`, `stopAllLines()`.

- [ ] **Step 1: Write the failing test** `src/hooks/useDuelGame.test.tsx`. Mock the audio module so lines resolve on demand, then drive the hook with fake timers:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'

const pending: { id: string; resolve: () => void }[] = []
vi.mock('../utils/duel/duelAudio', () => ({
  unlockDuelAudio: vi.fn(), preloadDuelAudio: vi.fn(), configureDuelAudio: vi.fn(), muteDuelAudio: vi.fn(), stopAllLines: vi.fn(),
  playMusic: vi.fn(), stopMusic: vi.fn(), trackForWave: () => 'calm',
  playSfx: vi.fn(() => Promise.resolve()),
  playLine: vi.fn((id: string) => new Promise<void>((resolve) => pending.push({ id, resolve }))),
}))
import { useDuelGame } from './useDuelGame'
import { playLine } from '../utils/duel/duelAudio'
import { useProgressStore } from '../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../types/progress'

const flushLines = async () => { while (pending.length) { await act(async () => { pending.shift()!.resolve(); await vi.advanceTimersByTimeAsync(600) }) } }
const rngConst = (v: number) => () => v

beforeEach(() => { vi.useFakeTimers(); pending.length = 0; vi.mocked(playLine).mockClear(); localStorage.clear(); useProgressStore.setState({ ...INITIAL_PROGRESS_STATE }) })

describe('useDuelGame', () => {
  it('intro and first-screen instruction play before the monster appears', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    expect(result.current.state.round).toBeNull()
    await flushLines()
    expect(vi.mocked(playLine).mock.calls.map((c) => c[0]).slice(0, 2)).toEqual(['line-intro', 'line-how-A'])
    expect(result.current.state.round?.type).toBe('A')
    expect(useProgressStore.getState().duel.sessions).toBe(1)
  })
  it('next round waits for every wizard line', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await flushLines()
    const r = result.current.state.round!
    act(() => result.current.choose({ kind: 'rune', mark: r.target }))
    await act(async () => { await vi.advanceTimersByTimeAsync(5000) })
    expect(result.current.state.outcome?.kind).toBe('hit') // still showing: wizard line not finished
    await flushLines()
    expect(result.current.state.round?.id).not.toBe(r.id)
    expect(useProgressStore.getState().duel.byMark[r.target.id].correct).toBe(1)
  })
  it('pausing during an announcement holds the round until resume; exactly one round after resume', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    act(() => result.current.pause())
    await flushLines()
    expect(result.current.state.round).toBeNull()
    act(() => result.current.resume())
    await flushLines()
    expect(result.current.state.round).not.toBeNull()
    expect(result.current.state.paused).toBe(false)
  })
  it('double tap yields one outcome and one stats record', async () => {
    const { result } = renderHook(() => useDuelGame({ rng: rngConst(0.01) }))
    act(() => result.current.start())
    await flushLines()
    const r = result.current.state.round!
    act(() => { result.current.choose({ kind: 'rune', mark: r.target }); result.current.choose({ kind: 'rune', mark: r.target }) })
    await flushLines()
    expect(useProgressStore.getState().duel.byMark[r.target.id].seen).toBe(1)
  })
})
```

`rngConst(0.01)` makes every `pick` choose the first option: the screen type is `A`, the target is `kamatz`, the monster is `fuzzy`. If the weighted pick lands elsewhere with that RNG, use a tiny seeded RNG instead and assert by type only.

- [ ] **Step 2: Run it and confirm it fails.**

- [ ] **Step 3: Implement `useDuelGame.ts`** following the sequencing above. Implement **`DuelPage.tsx`**:

```tsx
import { useSearchParams } from 'react-router-dom'
import { useEffect } from 'react'
import { useDuelGame } from '../../hooks/useDuelGame'
import { Battlefield, useLandscape } from '../../components/duel/Battlefield'
import { SpellPad } from '../../components/duel/SpellPad'
import { DuelHud } from '../../components/duel/DuelHud'
import { Clue } from '../../components/duel/Clue'
import { StartCover } from '../../components/duel/StartCover'
import { PauseCover } from '../../components/duel/PauseCover'
import { RunSummary } from '../../components/duel/RunSummary'
import { RuneGlowDefs } from '../../components/duel/RuneGlyph'
import { preloadDuelAudio } from '../../utils/duel/duelAudio'
import '../../components/duel/duel.css'

const TEST_HOOKS = import.meta.env.MODE === 'verify' || import.meta.env.MODE === 'test'

export default function DuelPage() {
  const [params] = useSearchParams()
  const walkOverride = TEST_HOOKS ? Number(params.get('walk')) || undefined : undefined
  const game = useDuelGame({ walkOverride })
  const landscape = useLandscape()
  useEffect(() => preloadDuelAudio(), [])
  // layout: nd-root > nd-screen (shake) > DuelHud + Battlefield + pad area (icon prompt, MEGA button, SpellPad);
  // covers: StartCover (phase idle), PauseCover (paused), RunSummary (phase over). Port from the prototype JSX.
  // …
}
```

Ported from the prototype JSX:
- **`StartCover`:** the wizard cast sprite, the ▶ button with `Icon play` and `aria-label="play"`, the music toggle (`Icon music/musicOff`, writes `setDuelMusic`), and a parent button labelled "📊 לַהוֹרִים". That's the only text, and it's parent-facing; replace the 📊 emoji with `Icon chart` and navigate to `/progress`.
- **`PauseCover`:** the opaque `.nd-overlay.nd-pause-cover` with the wizard idle sprite and ▶ (`aria-label="resume"`).
- **`RunSummary`:** the tower tipping over and the dizzy wizard, the stats with icons, the most-missed marks as buttons calling `sayMark`, and ↻ replay.

**`App.tsx`:** add a lazy route:

```tsx
import { lazy, Suspense } from 'react'
const DuelPage = lazy(() => import('./pages/Duel/DuelPage'))
// inside <Routes>:
<Route path="/duel" element={<Suspense fallback={null}><DuelPage /></Suspense>} />
```

- [ ] **Step 4: Run** `npx vitest run` → all PASS. `npm run build` → OK, and the build output shows a separate `DuelPage-*.js` chunk. **Commit:**

```bash
git add src/hooks/useDuelGame.ts src/hooks/useDuelGame.test.tsx src/pages/Duel src/components/duel/StartCover.tsx src/components/duel/PauseCover.tsx src/components/duel/RunSummary.tsx src/App.tsx
git commit -m "Add the playable duel at #/duel: game hook, pacing, pause, covers

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Entry points (Home and Nikkud)

**Files:**
- Create: `src/components/duel/DuelEntryCard.tsx`
- Modify: `src/pages/Home/HomePage.tsx` (above the levels grid), `src/pages/Nikkud/NikkudPage.tsx` (above `<JourneyPath>`, **and** in the locked branch, so it shows whether or not the level is locked)
- Test: `src/components/duel/DuelEntryCard.test.tsx`

**Interfaces:** `<DuelEntryCard compact?: boolean />` navigates to `/duel`. It shows the wizard cast sprite, `Icon swords` and a glowing purple card. Its `aria-label="duel"` has no visible text.

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { DuelEntryCard } from './DuelEntryCard'

describe('DuelEntryCard', () => {
  it('navigates to /duel and shows no text', () => {
    render(<MemoryRouter><Routes><Route path="/" element={<DuelEntryCard />} /><Route path="/duel" element={<div>DUEL</div>} /></Routes></MemoryRouter>)
    const btn = screen.getByRole('button', { name: 'duel' })
    expect(btn.textContent).toBe('')
    fireEvent.click(btn)
    expect(screen.getByText('DUEL')).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run it and confirm it fails.** **Step 3: Implement.** Use a `motion.button` with inline styles from `styles/theme` like the rest of the app: `background: 'linear-gradient(135deg, #3b1d6e, #1a1240)'`, `borderRadius: borderRadius.xl`, the wizard image at height 96 (64 when compact), and the swords icon at size 40. Add it to `HomePage` directly above the levels grid, and to `NikkudPage` before `<JourneyPath>` in the unlocked branch and before the lock message in the locked branch.

- [ ] **Step 4: Run** `npx vitest run` → PASS; `npm run build` → OK. **Commit** (`git add src/components/duel/DuelEntryCard* src/pages/Home/HomePage.tsx src/pages/Nikkud/NikkudPage.tsx`, message "Add duel entry cards to Home and Nikkud screens").

---

### Task 12: Parent stats card on ProgressPage

**Files:**
- Create: `src/components/duel/DuelStatsCard.tsx`
- Modify: `src/pages/Progress/ProgressPage.tsx` (a new `motion.section` after the level-progress section)
- Test: `src/components/duel/DuelStatsCard.test.tsx`

**Interfaces:**
- Consumes: `useProgressStore((s) => s.duel)`, `DUEL_MARKS`, `RuneGlyph`.
- Renders (parent-facing, Hebrew text allowed):
  - the heading "⚔️ דּוּ־קְרַב"
  - summary line: sessions, minutes (`Math.round(roundsMs/60000)`), best score and best wave
  - the per-mark table: rune glyph + name, then seen, correct %, wrong, too slow, twin, MEGA. It's sorted by `wrong + timeout` descending, and marks never seen are listed last as "—".
  - the per-screen table (A picture → rune, B sound, C name, D rune → picture)
  - the empty state "עוד לא שיחקו" when `sessions === 0`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DuelStatsCard } from './DuelStatsCard'
import { useProgressStore } from '../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../types/progress'

beforeEach(() => useProgressStore.setState({ ...INITIAL_PROGRESS_STATE }))

describe('DuelStatsCard', () => {
  it('empty state', () => {
    render(<DuelStatsCard />)
    expect(screen.getByText('עוד לא שיחקו')).toBeTruthy()
  })
  it('sorts marks by misses and shows twin and MEGA columns', () => {
    const st = useProgressStore.getState()
    st.recordDuelSession()
    st.recordDuelRound('segol', 'A', 'wrong', 1000)
    st.recordDuelRound('segol', 'A', 'timeout', 1000)
    st.recordDuelRound('kamatz', 'C', 'correct', 1000)
    st.recordDuelTwin('kamatz', 'C')
    st.recordDuelRound('chirik', 'D', 'mega', 1000)
    const { container } = render(<DuelStatsCard />)
    const rows = [...container.querySelectorAll('tbody tr')].map((r) => r.getAttribute('data-mark'))
    expect(rows[0]).toBe('segol')
    expect(container.querySelector('tr[data-mark="kamatz"] [data-col="twin"]')!.textContent).toBe('1')
    expect(container.querySelector('tr[data-mark="chirik"] [data-col="mega"]')!.textContent).toBe('1')
    expect(container.querySelector('tr[data-mark="chirik"] [data-col="correct"]')!.textContent).toBe('0%')
  })
})
```

- [ ] **Step 2: Run it and confirm it fails.** **Step 3: Implement** with the app's inline-style theme tokens. Rows get `data-mark` and cells `data-col` (`seen`, `correct`, `wrong`, `timeout`, `twin`, `mega`). Add `<DuelStatsCard/>` to ProgressPage. **Step 4: Run tests and build. Commit** ("Add duel parent stats to the progress page").

---

### Task 13: Headless verification (host-local) and the asset/glyph sheet

**Files** (outside the repo, host-local, like the existing hshell scripts):
- Create: `~/ws/scratch/cdp/verify-duel.mjs`
- Build target: `/data/ws/scratch/nikkud-duel/play/` (served at `https://jetson.tail22a204.ts.net/nikkud-duel/play/`, basic auth `guest`/`abracadabra`)

- [ ] **Step 1: Build in verify mode** (test hooks on) to the served directory:

```bash
cd /data/ws/alef && npx vite build --mode verify --base=/nikkud-duel/play/ --outDir /data/ws/scratch/nikkud-duel/play --emptyOutDir
```

- [ ] **Step 2: Write `verify-duel.mjs`** (puppeteer-core via the warm hshell at `127.0.0.1:9222`; see `~/ws/scratch/cdp/nd-*.js` for the patterns). It must, for both the 390×780 portrait and 1024×600 landscape viewports:
  1. Open `…/play/#/duel?walk=120000` and click `button[aria-label="play"]`.
  2. **No-text scan** on the start screen, then for 6 rounds: wait for `.nd-rune:not([disabled])`, scan, click `[data-correct="1"]`, wait 900 ms, scan. The scan removes `.nd-parent-btn` from a clone of `.nd-root` and fails if `/[A-Za-zא-ת]/` matches its `textContent`.
  3. One deliberate miss (`[data-correct="0"]`), then check that one heart icon turned empty.
  4. Pause via `button[aria-label="pause"]`: assert `.nd-pause-cover` is visible, click `button[aria-label="resume"]`, then assert it's gone.
  5. Pause via a forced `visibilitychange` (override `document.hidden`): same assertions.
  6. Play to game over (3 misses): assert the `RunSummary` replay button exists.
  7. Assert zero `pageerror`/console errors.
  8. Save screenshots to `/data/ws/scratch/nikkud-duel/shots/verify-<viewport>-<step>.png`.

- [ ] **Step 3: Write the glyph/asset sheet page** at `src/pages/Duel/DuelGlyphSheet.tsx`, routed only when `TEST_HOOKS` (`#/duel/glyphs`). It renders:
  - every `DUEL_MARKS` rune in the states normal / hit / miss / reveal / almost
  - every picture word
  - every monster sprite with its mirroring applied, on a strip of battlefield
  - all icons

  The verify script screenshots it to `shots/verify-glyphs.png`.

- [ ] **Step 4: Run** `node ~/ws/scratch/cdp/verify-duel.mjs` and **look at every screenshot**:
  - no empty squares (missing glyphs)
  - monsters facing left
  - marks visible on the dark-gold "hit" buttons
  - no clipping in landscape

  Fix anything found (and commit the fix) before continuing.

- [ ] **Step 5: Commit the glyph sheet:** `git add src/pages/Duel/DuelGlyphSheet.tsx src/App.tsx`, message "Add verify-mode glyph sheet for visual checks".

---

### Task 14: Remove the prototype, deploy for playtesting, update the review tooling

**Files:**
- Delete: `src/pages/Prototype/`, `src/components/common/PrototypeSwitcher.tsx`, and the prototype route and import in `src/App.tsx`
- Modify (outside the repo): `/data/ws/scratch/nikkud-duel/index.html` (the Play link → `play/#/duel`), the NOTES content moved into the spec's "Open items"
- Modify: `docs/superpowers/specs/2026-10-05-nikkud-wizard-duel-design.md` (the **Playable prototype** header line → "removed; the game is at `#/duel`")

- [ ] **Step 1: Delete and verify that nothing references the prototype**

```bash
git rm -r -q src/pages/Prototype src/components/common/PrototypeSwitcher.tsx
python3 - <<'PY'
p='src/App.tsx'; s=open(p).read()
s='\n'.join(l for l in s.split('\n') if 'NikkudDuelPrototype' not in l)
open(p,'w').write(s)
PY
grep -rn "Prototype" src && exit 1 || echo "no references"
npx vitest run && npm run build
```

- [ ] **Step 2: Deploy the playtest build** (production mode, no test hooks) and repoint the gallery:

```bash
npx vite build --base=/nikkud-duel/play/ --outDir /data/ws/scratch/nikkud-duel/play --emptyOutDir
sed -i 's#play/\#/prototype/nikkud-duel#play/\#/duel#g' /data/ws/scratch/nikkud-duel/index.html
curl -s -o /dev/null -w '%{http_code}\n' -u guest:abracadabra https://jetson.tail22a204.ts.net/nikkud-duel/play/
```

Then run `verify-duel.mjs` once more. The production build has no `data-correct` and ignores `?walk=`. For this run, point the script at a verify-mode build in `/data/ws/scratch/nikkud-duel/play-verify/` (`--base=/nikkud-duel/play-verify/`), so the production deploy stays clean.

- [ ] **Step 3: Commit**

```bash
git add -A src docs
git commit -m "Remove the nikkud duel prototype now that #/duel ships

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 4: Final whole-branch review.** Dispatch one fresh reviewer (`superpowers:requesting-code-review`) over `git diff main...feature/nikkud-duel`. Its prompt names the Global Constraints and the Review Focus list explicitly. Fix the confirmed findings, then re-run tests, build and verify.

---

## Self-Review Notes (planner)

- **Spec coverage:**
  - screens A–D (Tasks 3, 8)
  - picture words (Tasks 2, 6, 8)
  - twin forgiveness (Tasks 3, 4, 10)
  - shva/mute (Tasks 8, 10)
  - waves, boss, roster (Tasks 3, 4)
  - MEGA (Tasks 4, 10)
  - weighting incl. lifetime misses (Tasks 3, 10)
  - non-reader, no-emoji and legibility (Tasks 8, 13)
  - sprite facing (Tasks 6, 9, 13)
  - pacing, clue-then-clock and instructions (Task 10)
  - pause (Tasks 4, 10, 13)
  - music, ducking and settings (Tasks 5, 7, 10)
  - landscape (Tasks 9, 13)
  - parent stats (Tasks 5, 12)
  - entry points (Task 11)
  - the spelling pass (Task 1)
  - lazy route and preload (Task 10)
  - test hooks only in verify mode (Tasks 8, 10, 13)
  - prototype cleanup (Task 14)
- **Types:** `keyOf`, `isTwin`, `Outcome.effect`, `Next`, `DuelStats`/`Tally` are defined in Tasks 2–4 and used with the same names in Tasks 5–12.
- **Review Focus** tests live in Tasks 4, 5, 7, 9 and 10, as listed.
