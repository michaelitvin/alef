# Data Model: Hebrew Reading Game for First Graders

**Feature Branch**: `001-hebrew-reading-game`
**Created**: 2025-12-13
**Purpose**: Define data structures for curriculum content and user progress

## Entity Relationship Overview

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Letter    │────▶│   Nikkud    │────▶│ Combination │
│   (אות)     │     │   (ניקוד)    │     │   (צירוף)   │
└─────────────┘     └─────────────┘     └─────────────┘
                                              │
                                              ▼
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Word      │◀────│  Syllable   │◀────│ Combination │
│   (מילה)    │     │   (הברה)    │     │             │
└─────────────┘     └─────────────┘     └─────────────┘
       │
       ▼
┌─────────────┐
│  Sentence   │
│   (משפט)    │
└─────────────┘

┌─────────────┐     ┌─────────────┐
│  Progress   │────▶│   Reward    │
│ (התקדמות)   │     │   (פרס)     │
└─────────────┘     └─────────────┘
```

## Core Entities

### Letter (אות)

Represents a Hebrew consonant letter.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | string | Unique identifier | `"alef"` |
| character | string | Hebrew letter | `"א"` |
| name | string | Letter name in Hebrew | `"אָלֶף"` |
| nameAudioUrl | string | Audio file for letter name | `"/audio/letters/alef-name.mp3"` |
| soundAudioUrl | string | Audio file for letter sound | `"/audio/letters/alef-sound.mp3"` |
| order | number | Learning sequence order | `1` |
| finalForm | string? | Final form if applicable | `"ך"` for כ |
| isFinalForm | boolean | Whether this is a final form | `false` |

**Validation Rules**:
- `id` must be unique across all letters
- `character` must be a single Hebrew letter
- `order` must be 1-27 (22 letters + 5 final forms)

### Nikkud (ניקוד)

Represents a Hebrew vowel mark (diacritic).

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | string | Unique identifier | `"kamatz"` |
| mark | string | Unicode nikkud character | `"ָ"` |
| name | string | Nikkud name in Hebrew | `"קָמָץ"` |
| soundDescription | string | How to pronounce | `"כמו 'אָ' במילה אָב"` |
| audioUrl | string | Audio file | `"/audio/nikkud/kamatz.mp3"` |
| order | number | Learning sequence order | `1` |

**Validation Rules**:
- `id` must be unique across all nikkud
- `mark` must be a valid Hebrew nikkud Unicode character

### Combination (צירוף)

Represents a letter with a nikkud mark.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | string | Unique identifier | `"bet-kamatz"` |
| letterId | string | Reference to Letter | `"bet"` |
| nikkudId | string | Reference to Nikkud | `"kamatz"` |
| combined | string | Letter + nikkud rendered | `"בָּ"` |
| audioUrl | string | Combined pronunciation | `"/audio/combinations/bet-kamatz.mp3"` |

**Validation Rules**:
- `letterId` must reference existing Letter
- `nikkudId` must reference existing Nikkud
- Combination of letterId + nikkudId must be unique

### Syllable (הברה)

Represents a syllable within a word.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| text | string | Syllable text with nikkud | `"בַּ"` |
| audioUrl | string | Syllable pronunciation | `"/audio/syllables/ba.mp3"` |
| position | number | Order in word (1-indexed) | `1` |

### Word (מילה)

Represents a Hebrew word for reading practice.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | string | Unique identifier | `"word-bayit"` |
| text | string | Full word with nikkud | `"בַּיִת"` |
| meaning | string | Hebrew meaning hint | `"מקום שגרים בו"` |
| syllables | Syllable[] | Broken into syllables | `[{text:"בַּ"}, {text:"יִת"}]` |
| audioUrl | string | Full word pronunciation | `"/audio/words/bayit.mp3"` |
| imageUrl | string? | Optional illustration | `"/images/words/house.webp"` |
| difficulty | number | 1-3 difficulty level | `1` |
| letterIds | string[] | Letters used (for prerequisites) | `["bet", "yod", "tav"]` |
| nikkudIds | string[] | Nikkud used (for prerequisites) | `["patach", "chirik"]` |

**Validation Rules**:
- `id` must be unique across all words
- `syllables` must reconstruct to `text` when joined
- `difficulty` must be 1, 2, or 3
- All `letterIds` must reference existing Letters
- All `nikkudIds` must reference existing Nikkud

### Sentence (משפט)

Represents a simple sentence for reading comprehension.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | string | Unique identifier | `"sentence-001"` |
| text | string | Full sentence | `"אַבָּא בַּבַּיִת"` |
| wordIds | string[] | References to Words | `["word-aba", "word-bayit"]` |
| audioUrl | string | Full sentence audio | `"/audio/sentences/001.mp3"` |
| imageUrl | string? | Accompanying illustration | `"/images/sentences/dad-home.webp"` |
| comprehensionQuestion | string? | Optional question | `"אֵיפֹה אַבָּא?"` |
| comprehensionAnswer | string? | Expected answer | `"בַּבַּיִת"` |
| difficulty | number | 1-3 difficulty level | `1` |

**Validation Rules**:
- `id` must be unique across all sentences
- All `wordIds` must reference existing Words
- `difficulty` must be 1, 2, or 3
- If `comprehensionQuestion` exists, `comprehensionAnswer` must also exist

## Progress Entities

### Progress (התקדמות)

Tracks user's learning state.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| version | number | Schema version for migrations | `1` |
| lettersCompleted | string[] | Completed letter IDs | `["alef", "bet", "gimel"]` |
| lettersInProgress | string? | Currently learning letter | `"dalet"` |
| nikkudCompleted | string[] | Completed nikkud IDs | `["kamatz", "patach"]` |
| nikkudInProgress | string? | Currently learning nikkud | `"tzeirei"` |
| wordsLearned | string[] | Successfully read word IDs | `["word-av", "word-em"]` |
| sentencesRead | string[] | Completed sentence IDs | `["sentence-001"]` |
| currentLevel | LevelType | Current curriculum stage | `"nikkud"` |
| rewards | Reward[] | Earned rewards | `[{type:"star", count:5}]` |
| settings | Settings | User preferences | `{soundEnabled: true}` |
| stats | Stats | Usage statistics | `{totalTimeMinutes: 45}` |
| lastUpdated | string | ISO timestamp | `"2025-12-13T10:30:00Z"` |

**Level Types**: `"letters"` | `"nikkud"` | `"words"` | `"sentences"`

**State Transitions**:
- `letters` → `nikkud`: When 10+ letters completed
- `nikkud` → `words`: When 5+ nikkud completed
- `words` → `sentences`: When 10+ words learned

### Reward (פרס)

Represents earned rewards and achievements.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | string | Unique reward instance ID | `"reward-001"` |
| type | RewardType | Category of reward | `"star"` |
| earnedAt | string | ISO timestamp | `"2025-12-13T10:30:00Z"` |
| reason | string | Why earned | `"Completed letter א"` |
| metadata | object? | Additional data | `{letterId: "alef"}` |

**Reward Types**: `"star"` | `"badge"` | `"character"` | `"milestone"`

### Settings (הגדרות)

User preferences.

| Field | Type | Description | Default |
|-------|------|-------------|---------|
| soundEnabled | boolean | Audio playback on/off | `true` |
| musicEnabled | boolean | Background music on/off | `true` |
| effectsEnabled | boolean | UI sound effects on/off | `true` |
| autoAdvance | boolean | Auto-proceed after correct answer | `true` |
| hintDelay | number | Seconds before showing hint | `10` |

### Stats (סטטיסטיקות)

Usage and engagement statistics.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| totalTimeMinutes | number | Cumulative play time | `45` |
| sessionsCount | number | Number of sessions | `5` |
| lastSessionDate | string | ISO date of last visit | `"2025-12-13"` |
| longestStreak | number | Max consecutive days | `3` |
| currentStreak | number | Current consecutive days | `2` |
| correctAnswers | number | Total correct responses | `87` |
| totalAttempts | number | Total response attempts | `102` |

## Activity Entities

### Activity (פעילות)

Represents a learning activity/game.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| id | string | Activity identifier | `"letter-match"` |
| type | ActivityType | Category of activity | `"matching"` |
| title | string | Display name in Hebrew | `"התאם את האות"` |
| description | string | Instructions | `"לחץ על האות שאתה שומע"` |
| targetLevel | LevelType | Which curriculum level | `"letters"` |
| items | ActivityItem[] | Content for this activity | `[...]` |

**Activity Types**: `"introduction"` | `"matching"` | `"quiz"` | `"listening"` | `"reading"`

### ActivityItem (פריט פעילות)

Individual item within an activity.

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| prompt | string | What to show/ask | `"איפה האות א?"` |
| promptAudioUrl | string? | Audio for prompt | `"/audio/prompts/where-alef.mp3"` |
| correctAnswer | string | Expected response | `"alef"` |
| options | string[]? | Multiple choice options | `["alef", "bet", "gimel"]` |
| feedbackCorrect | string | Success message | `"כל הכבוד!"` |
| feedbackIncorrect | string | Encouragement message | `"נסה שוב!"` |

## Data Files Structure

```
src/data/
├── letters.json       # Letter[] - all 22 letters + 5 finals
├── nikkud.json        # Nikkud[] - 8 primary vowel marks
├── combinations.json  # Combination[] - letter+nikkud pairs
├── words.json         # Word[] - curriculum word list
├── sentences.json     # Sentence[] - reading sentences
├── activities.json    # Activity[] - game definitions
└── rewards.json       # Reward definitions and unlock criteria
```

## Indexing and Queries

### Common Access Patterns

1. **Get next item to learn**: Filter by not in `completed` array, sort by `order`
2. **Check prerequisites**: Verify `letterIds`/`nikkudIds` are subset of `completed`
3. **Calculate progress %**: `completed.length / total.length * 100`
4. **Get unlocked rewards**: Filter rewards by criteria met in Progress

### Derived State (computed, not stored)

- `progressPercentage`: Overall completion percentage
- `currentStreak`: Calculated from session dates
- `unlockedActivities`: Activities where prerequisites met
- `nextMilestone`: Next reward criteria to achieve
