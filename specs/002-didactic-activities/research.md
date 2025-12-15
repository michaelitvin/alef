# Research: Hebrew Reading Didactic Activities

**Date**: 2025-12-15
**Feature**: 002-didactic-activities

## Technical Decisions

### 1. CV Syllable Data Structure

**Decision**: Generate all CV combinations from existing letters (22) and nikkud (8+2 new) = ~200 core combinations

**Rationale**:
- Hebrew has ~22 consonants × ~10 vowels = ~220 theoretical combinations
- Not all combinations are common or used in real words
- Focus on high-frequency combinations used in first-grade vocabulary
- Store as YAML like existing data files

**Alternatives Considered**:
- Generate dynamically at runtime: Rejected - need audio files for each combination
- Use only combinations from existing words: Rejected - insufficient for drilling practice

### 2. Syllable Level Position in Curriculum

**Decision**: Insert syllables level between nikkud and words (letters → nikkud → syllables → words → sentences)

**Rationale**:
- Research shows CV syllable drilling should happen after learning individual letters and vowel marks
- Children need syllable automaticity before tackling whole words
- Maintains spiral curriculum design - builds on previous learning

**Alternatives Considered**:
- Integrate into nikkud level: Rejected - too much content in one level
- Parallel track with words: Rejected - prerequisite relationship should be enforced

### 3. Audio for CV Syllables

**Decision**: Use TTS service (existing tts.ts) to generate syllable audio, cache in audio files

**Rationale**:
- 200+ audio files needed - manual recording impractical
- Existing TTS service already used for words
- Can pre-generate and bundle, or generate on-demand with caching

**Alternatives Considered**:
- Manual recording: Rejected - too many combinations, consistency issues
- No audio (visual only): Rejected - multi-sensory approach requires audio

### 4. Progression Bug Root Cause

**Decision**: Debug state management in WordGroupView.tsx and SentenceGroupView.tsx

**Research Findings**:
- WordGroupView.tsx line 356 uses `currentWord.translation` in prompt
- State for `currentWordIndex` likely not advancing properly after completion
- Need to trace `onComplete` callback chain

**Files to Investigate**:
- `/src/pages/Words/WordGroupView.tsx`
- `/src/pages/Sentences/SentenceGroupView.tsx`
- Check `useState` for word/sentence index

### 5. Similar-Sounding Vowel Grouping

**Decision**: Group vowels by sound, not by name:
- "a" vowels: patach (ַ) + kamatz (ָ)
- "e" vowels: tsere (ֵ) + segol (ֶ)
- "i" vowel: chirik (ִ)
- "o" vowels: cholam (ֹ) + holam male (וֹ)
- "u" vowels: kubutz (ֻ) + shuruk (וּ)

**Rationale**:
- Modern Israeli Hebrew pronounces patach/kamatz identically
- Same for tsere/segol
- Quiz should test sound recognition, not visual mark recognition
- Grouping prevents confusing "wrong" answers that sound correct

**Alternatives Considered**:
- Distinguish by mark position/shape: Could confuse - sounds are identical
- Teach as separate with disclaimer: Too complex for first graders

### 6. Holam Male and Shuruk Implementation

**Decision**: Add as special nikkud entries that include the vav character

**Rationale**:
- וֹ (holam male) = vav + cholam dot = "o" sound
- וּ (shuruk) = vav + dagesh = "u" sound
- These are not nikkud marks alone - they're letter+mark combinations
- But they function as vowel sounds in Hebrew

**Data Model**:
```yaml
# In nikkud.yaml
- id: holam-male
  mark: וֹ  # Vav with cholam
  name: חוֹלָם מָלֵא
  sound: o
  isFullVowel: true  # Flag to distinguish from regular nikkud

- id: shuruk
  mark: וּ  # Vav with dagesh
  name: שׁוּרוּק
  sound: u
  isFullVowel: true
```

### 7. Dagesh Variant Handling

**Decision**: Add `hasDagesh` boolean to Letter type and create variant entries

**Rationale**:
- ב (vet) vs בּ (bet) are different sounds
- Need to track in CV syllable combinations
- Audio must be different for each variant

**Implementation**:
```typescript
// In entities.ts - extend Letter interface
interface Letter {
  // ... existing fields
  hasDagesh?: boolean
  variantOf?: string  // Points to base letter ID
}
```

### 8. Visual Matching Prevention in Quizzes

**Decision**: Quiz options must use different base letters, not same letter with different nikkud

**Example**:
- BAD: Options are בָּ, בַ, בֵ, בִ (all bet, child matches nikkud visually)
- GOOD: Options are בָּ, מָ, לָ, שָׁ (different letters, same kamatz, must listen)

**Implementation**:
- Modify `generateQuizOptions()` in NikkudQuiz.tsx
- Select random letters for each option while keeping target nikkud
- Play only target syllable audio, not option audio

## Dependencies & Best Practices

### React 19 Patterns
- Use functional components with hooks
- State management via Zustand (existing pattern)
- Framer Motion for animations (existing pattern)

### Howler.js Audio
- Preload audio sprites for fast playback
- Handle mobile audio unlock on first touch
- Existing `useAudio` hook pattern

### YAML Data
- Use existing vite-plugin-yaml for imports
- Type definitions via TypeScript interfaces
- Keep data declarative, logic in components

## Files Requiring Changes

### Bug Fixes
| File | Change |
|------|--------|
| `src/pages/Words/WordGroupView.tsx` | Fix progression state, remove English |
| `src/pages/Sentences/SentenceGroupView.tsx` | Fix progression state, remove English |
| `src/components/words/WordQuiz.tsx` | Remove translationHint display |
| `src/components/sentences/SentenceReader.tsx` | Remove translation display |
| `src/components/nikkud/NikkudQuiz.tsx` | Use different base letters in options |
| `src/components/nikkud/CombinationBuilder.tsx` | Hide nikkud names |

### Data Updates
| File | Change |
|------|--------|
| `src/data/nikkud.yaml` | Add holam male, shuruk |
| `src/data/letters.yaml` | Add dagesh variants, shin/sin |
| `src/data/words.yaml` | Remove English translations from display |
| `src/data/sentences.yaml` | Remove English translations from display |

### New Files
| File | Purpose |
|------|---------|
| `src/data/syllables.yaml` | CV syllable combinations data |
| `src/components/syllables/SyllableDrill.tsx` | Drilling activity |
| `src/components/syllables/SyllableBlend.tsx` | Word building activity |
| `src/components/syllables/SyllableSegment.tsx` | Word segmentation activity |
| `src/components/syllables/MinimalPairPractice.tsx` | Minimal pair activity |
| `src/pages/Syllables/SyllablesLevelView.tsx` | Level page |
| `src/pages/Syllables/SyllableNodeView.tsx` | Node page |

### Type Updates
| File | Change |
|------|--------|
| `src/types/entities.ts` | Add CVSyllable, SyllablePair, FullVowel types |
| `src/types/progress.ts` | Add syllables level to LevelId union |
