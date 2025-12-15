# Implementation Plan: Hebrew Reading Didactic Activities

**Branch**: `002-didactic-activities` | **Date**: 2025-12-15 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/002-didactic-activities/spec.md`

## Summary

Add research-backed didactic activities for Hebrew reading instruction based on CV syllable method and multi-sensory learning principles. This includes 4 new activity types (CV syllable drilling, syllable blending, syllable segmentation, minimal pair practice) and fixes to 5 existing issues (vowel quiz logic, missing vowels, English in UI, progression bugs, dagesh teaching).

## Technical Context

**Language/Version**: TypeScript 5.9 with React 19.x
**Primary Dependencies**: React 19, Vite 7, Zustand 5, Framer Motion 12, Howler.js 2.2
**Storage**: localStorage via Zustand persist middleware
**Testing**: Manual testing (no test framework currently configured)
**Target Platform**: Web (GitHub Pages), responsive for tablet/mobile/desktop
**Project Type**: Single-page web application (frontend only)
**Performance Goals**: Smooth 60fps animations, audio playback < 100ms latency
**Constraints**: Must work offline after initial load, child-friendly touch targets
**Scale/Scope**: ~27 letters, ~8 nikkud marks, ~50 words, ~15 sentences, ~1000 CV syllable combinations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The constitution template has not been filled in for this project. No gates to check.

**Status**: PASS (no constitution violations)

## Project Structure

### Documentation (this feature)

```text
specs/002-didactic-activities/
├── plan.md              # This file
├── research.md          # Phase 0 output
├── data-model.md        # Phase 1 output
├── quickstart.md        # Phase 1 output
├── contracts/           # N/A - no backend API
└── tasks.md             # Phase 2 output (/speckit.tasks command)
```

### Source Code (repository root)

```text
src/
├── components/
│   ├── letters/         # Existing letter components
│   ├── nikkud/          # Existing nikkud components (to be modified)
│   ├── words/           # Existing word components (to be modified)
│   ├── sentences/       # Existing sentence components (to be modified)
│   ├── syllables/       # NEW: Syllable activity components
│   │   ├── SyllableDrill.tsx
│   │   ├── SyllableBlend.tsx
│   │   ├── SyllableSegment.tsx
│   │   ├── MinimalPairPractice.tsx
│   │   └── index.ts
│   ├── common/          # Shared components
│   └── rewards/         # Existing reward components
├── data/
│   ├── letters.yaml     # Existing (to add dagesh variants)
│   ├── nikkud.yaml      # Existing (to add holam male, shuruk)
│   ├── words.yaml       # Existing (remove English, fix syllables)
│   ├── sentences.yaml   # Existing (remove English)
│   ├── syllables.yaml   # NEW: CV syllable combinations data
│   └── activities/      # Activity definitions
├── pages/
│   ├── Syllables/       # NEW: Syllable level pages
│   │   ├── SyllablesLevelView.tsx
│   │   └── SyllableNodeView.tsx
│   ├── Words/           # Existing (fix progression bug)
│   └── Sentences/       # Existing (fix progression bug)
├── stores/
│   └── progressStore.ts # Existing (add syllable level support)
├── types/
│   ├── entities.ts      # Existing (add new types)
│   └── progress.ts      # Existing (add syllable tracking)
└── hooks/
    └── useAudio.ts      # Existing audio hook
```

**Structure Decision**: Extends existing frontend-only web application structure. New `syllables/` component directory for the 4 new activity types. No backend needed - all data is static YAML.

## Complexity Tracking

No constitution violations - no complexity justification needed.

## Implementation Phases

### Phase 1: Bug Fixes (P5-P8)

1. **P8: Fix Activity Progression Bugs**
   - Debug WordGroupView.tsx and SentenceGroupView.tsx
   - Fix state management for advancing to next item

2. **P7: Remove English from UI**
   - Remove translationHint from WordQuiz
   - Remove translation display from SentenceReader
   - Update prompts to use images/audio only

3. **P5: Fix Vowel Quiz Issues**
   - Modify NikkudQuiz to use different base letters in options
   - Group patach/kamatz and tsere/segol as same-sound pairs
   - Hide nikkud names in CombinationBuilder

### Phase 2: Data Updates (P6, P9)

4. **P6: Add Missing Vowels**
   - Add holam male (וֹ) and shuruk (וּ) to nikkud.yaml
   - Update word syllable breakdowns

5. **P9: Improve Dagesh Teaching**
   - Add dagesh variants to letters.yaml
   - Add shin/sin distinction

### Phase 3: New Activities (P1-P4)

6. **P1: CV Syllable Drilling**
   - Create SyllableDrill component
   - Generate syllables.yaml with all CV combinations
   - Add to curriculum progression

7. **P2: Syllable Blending**
   - Create SyllableBlend component
   - Word building from syllable options

8. **P3: Syllable Segmentation**
   - Create SyllableSegment component
   - Interactive boundary marking

9. **P4: Minimal Pair Practice**
   - Create MinimalPairPractice component
   - Define minimal pair sets

### Phase 4: Integration

10. **Integrate syllable level into curriculum**
    - Add 'syllables' level between nikkud and words
    - Update progressStore for new level
    - Update routing and navigation
