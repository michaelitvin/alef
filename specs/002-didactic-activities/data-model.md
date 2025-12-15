# Data Model: Hebrew Reading Didactic Activities

**Date**: 2025-12-15
**Feature**: 002-didactic-activities

## Entity Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Letter    │────▶│  CVSyllable │◀────│   Nikkud    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                           ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│SyllablePair │     │ SyllableDrill│     │  WordBlend  │
└─────────────┘     └─────────────┘     └─────────────┘
```

## New Entities

### CVSyllable (צֵרוּף)

A consonant-vowel combination unit - the fundamental reading unit in Hebrew.

```typescript
interface CVSyllable {
  /** Unique identifier (e.g., 'bet-kamatz') */
  id: string

  /** Reference to letter */
  letterId: string

  /** Reference to nikkud */
  nikkudId: string

  /** Display string with combined character (e.g., 'בָּ') */
  display: string

  /** Pronunciation (e.g., 'ba') */
  sound: string

  /** Audio file path */
  audio: string

  /** Whether letter has dagesh in this combination */
  hasDagesh?: boolean

  /** Frequency in first-grade vocabulary (1-5, 5=most common) */
  frequency: number

  /** Order for introduction in curriculum */
  order: number
}
```

**Validation Rules**:
- `letterId` must reference valid Letter
- `nikkudId` must reference valid Nikkud
- `display` must be non-empty Hebrew string
- `frequency` must be 1-5
- `audio` path must exist or be generatable

### SyllableDrill

A structured practice session for CV syllable recognition.

```typescript
interface SyllableDrill {
  /** Unique identifier */
  id: string

  /** Display name in Hebrew */
  name: string

  /** CV syllables included in this drill */
  syllableIds: string[]

  /** Minimum number to complete */
  minItems: number

  /** Success threshold (0-1) */
  successThreshold: number

  /** Difficulty level (1-5) */
  difficulty: number

  /** Prerequisite drills */
  prerequisiteIds?: string[]
}
```

### SyllablePair

Two similar CV syllables for minimal pair discrimination practice.

```typescript
interface SyllablePair {
  /** Unique identifier */
  id: string

  /** First syllable ID */
  syllable1Id: string

  /** Second syllable ID */
  syllable2Id: string

  /** What distinguishes them */
  contrastType: 'consonant' | 'vowel' | 'dagesh' | 'shin-sin'

  /** Description of the contrast for teaching */
  contrastDescription: string

  /** Difficulty (1-5) */
  difficulty: number
}
```

**Example Pairs**:
- בָּ vs פָּ (consonant contrast: b/p)
- בָּ vs בַ (vowel contrast: kamatz/patach - but same sound!)
- בּ vs ב (dagesh contrast: b/v)
- שָׁ vs שָׂ (shin/sin contrast: sh/s)

### FullVowel

A vowel represented by vav with a diacritic (holam male or shuruk).

```typescript
interface FullVowel {
  /** Unique identifier */
  id: 'holam-male' | 'shuruk'

  /** Display character (וֹ or וּ) */
  mark: string

  /** Hebrew name */
  name: string

  /** Transliteration */
  nameTranslit: string

  /** Sound it produces */
  sound: 'o' | 'u'

  /** Related simple nikkud (cholam or kubutz) */
  relatedNikkudId: string

  /** Audio for name */
  audioName: string

  /** Audio for sound */
  audioSound: string

  /** Teaching order */
  order: number
}
```

### LetterVariant

A letter with alternate sound based on dagesh or shin/sin dot.

```typescript
interface LetterVariant {
  /** Unique identifier (e.g., 'bet-dagesh', 'bet-no-dagesh') */
  id: string

  /** Base letter ID */
  baseId: string

  /** Display character */
  character: string

  /** Sound for this variant */
  sound: string

  /** Whether this variant has dagesh */
  hasDagesh: boolean

  /** For shin/sin: position of dot */
  dotPosition?: 'right' | 'left'

  /** Audio for this variant sound */
  audioSound: string
}
```

## Modified Entities

### Letter (Extended)

Add variant tracking to existing Letter interface:

```typescript
interface Letter {
  // ... existing fields ...

  /** IDs of variant forms (e.g., bet has bet-dagesh, bet-no-dagesh) */
  variantIds?: string[]

  /** For shin: has sin variant */
  hasSinVariant?: boolean
}
```

### Nikkud (Extended)

Add full vowel flag and sound grouping:

```typescript
interface Nikkud {
  // ... existing fields ...

  /** True for holam male and shuruk (vav-based vowels) */
  isFullVowel?: boolean

  /** Sound group for quiz logic ('a', 'e', 'i', 'o', 'u') */
  soundGroup: 'a' | 'e' | 'i' | 'o' | 'u' | 'silent'
}
```

### Activity (Extended)

Add new activity types:

```typescript
interface Activity {
  // ... existing fields ...

  type: 'intro' | 'match' | 'quiz' | 'combine' | 'syllable' | 'picture' | 'comprehension'
        | 'syllable-drill' | 'syllable-blend' | 'syllable-segment' | 'minimal-pair'

  level: 'letters' | 'nikkud' | 'syllables' | 'words' | 'sentences'
}
```

### ActivityItem (Extended)

Add new item types:

```typescript
interface ActivityItem {
  // ... existing fields ...

  type: 'letter-identify' | 'letter-sound' | 'letter-match' |
        'nikkud-identify' | 'nikkud-sound' | 'combination-build' |
        'syllable-drill' | 'syllable-blend' | 'syllable-segment' | 'minimal-pair' |
        'word-syllable' | 'word-picture' | 'word-sound' |
        'sentence-read' | 'sentence-picture' | 'sentence-comprehension'
}
```

## State Transitions

### CVSyllable Mastery

```
[unknown] → [introduced] → [practicing] → [mastered]
     │            │              │             │
     │            ▼              ▼             │
     │      First drill    <80% accuracy      │
     │                          │             │
     │                          ▼             │
     │                    ≥80% accuracy ──────┘
     │
     └──► Skip if letter/nikkud not yet learned
```

### Syllables Level Unlock

```
[locked] ──────────────────────────────────► [unlocked]
              │
              │ Condition: nikkud level ≥80% success
              │
              ▼
        Level becomes available
```

## Data Files

### syllables.yaml (NEW)

```yaml
# CV Syllable Combinations
syllables:
  # Bet combinations
  - id: bet-kamatz
    letterId: bet
    nikkudId: kamatz
    display: בָּ
    sound: ba
    audio: syllables/bet-kamatz.mp3
    hasDagesh: true
    frequency: 5
    order: 1

  - id: bet-patach
    letterId: bet
    nikkudId: patach
    display: בַּ
    sound: ba
    audio: syllables/bet-patach.mp3
    hasDagesh: true
    frequency: 4
    order: 2

  # ... ~200 more combinations

# Syllable Drills
drills:
  - id: drill-bet-all
    name: תרגול בֵּית
    syllableIds: [bet-kamatz, bet-patach, bet-tzeire, bet-segol, bet-chirik, bet-cholam, bet-kubutz]
    minItems: 5
    successThreshold: 0.8
    difficulty: 1

# Minimal Pairs
pairs:
  - id: pair-bet-pet
    syllable1Id: bet-kamatz
    syllable2Id: pe-kamatz
    contrastType: consonant
    contrastDescription: ב ופ - צליל דומה אבל שונה
    difficulty: 2
```

### nikkud.yaml (MODIFIED)

Add full vowels:

```yaml
nikkud:
  # ... existing entries with soundGroup added ...

  - id: holam-male
    mark: וֹ
    name: חוֹלָם מָלֵא
    nameTranslit: Holam Male
    sound: o
    soundGroup: o
    order: 9
    isFullVowel: true
    exampleCombo: טוֹב
    audioName: nikkud/holam-male-name.mp3
    audioSound: nikkud/holam-male-sound.mp3
    position: inline

  - id: shuruk
    mark: וּ
    name: שׁוּרוּק
    nameTranslit: Shuruk
    sound: u
    soundGroup: u
    order: 10
    isFullVowel: true
    exampleCombo: שׁוּק
    audioName: nikkud/shuruk-name.mp3
    audioSound: nikkud/shuruk-sound.mp3
    position: inline
```

### letters.yaml (MODIFIED)

Add variant references and shin/sin:

```yaml
letters:
  - id: bet
    # ... existing fields ...
    variantIds: [bet-dagesh, bet-no-dagesh]

  - id: shin
    # ... existing fields ...
    hasSinVariant: true
    variantIds: [shin-dot, sin-dot]

# Letter Variants
variants:
  - id: bet-dagesh
    baseId: bet
    character: בּ
    sound: b
    hasDagesh: true
    audioSound: letters/bet-b-sound.mp3

  - id: bet-no-dagesh
    baseId: bet
    character: ב
    sound: v
    hasDagesh: false
    audioSound: letters/bet-v-sound.mp3

  - id: shin-dot
    baseId: shin
    character: שׁ
    sound: sh
    dotPosition: right
    audioSound: letters/shin-sound.mp3

  - id: sin-dot
    baseId: shin
    character: שׂ
    sound: s
    dotPosition: left
    audioSound: letters/sin-sound.mp3
```

## Indexes & Relationships

### By Sound Group (for quiz logic)

```typescript
const syllablesBySoundGroup = {
  'a': ['bet-kamatz', 'bet-patach', 'mem-kamatz', ...],
  'e': ['bet-tzeire', 'bet-segol', ...],
  'i': ['bet-chirik', ...],
  'o': ['bet-cholam', 'bet-holam-male', ...],
  'u': ['bet-kubutz', 'bet-shuruk', ...]
}
```

### Prerequisites

```typescript
const levelPrerequisites = {
  'syllables': { requires: 'nikkud', threshold: 0.8 },
  'words': { requires: 'syllables', threshold: 0.8 },  // Updated
  'sentences': { requires: 'words', threshold: 0.8 }
}
```
