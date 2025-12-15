# Tasks: Hebrew Reading Didactic Activities

**Input**: Design documents from `/specs/002-didactic-activities/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md

**Tests**: Manual testing only (no test framework configured)

**Organization**: Tasks grouped by user story. Bug fixes (P5-P8) prioritized first as they block existing functionality.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US5-US9 for fixes, US1-US4 for new features)
- File paths relative to repository root

---

## Phase 1: Setup

**Purpose**: Prepare project structure for new syllable components

- [x] T001 Create syllables component directory at src/components/syllables/
- [x] T002 Create syllables page directory at src/pages/Syllables/
- [x] T003 [P] Create syllables data file at src/data/syllables.yaml (empty scaffold)

---

## Phase 2: Foundational (Type Updates)

**Purpose**: Update type definitions that all user stories depend on

**⚠️ CRITICAL**: These type changes must be complete before implementing any user story

- [ ] T004 Add CVSyllable interface to src/types/entities.ts per data-model.md
- [ ] T005 [P] Add SyllableDrill interface to src/types/entities.ts
- [ ] T006 [P] Add SyllablePair interface to src/types/entities.ts
- [ ] T007 [P] Add FullVowel interface to src/types/entities.ts
- [ ] T008 [P] Add LetterVariant interface to src/types/entities.ts
- [ ] T009 Extend Nikkud interface with soundGroup and isFullVowel fields in src/types/entities.ts
- [ ] T010 Extend Letter interface with variantIds and hasSinVariant fields in src/types/entities.ts
- [ ] T011 Extend Activity interface with new types (syllable-drill, syllable-blend, syllable-segment, minimal-pair) in src/types/entities.ts
- [ ] T012 Add 'syllables' to level union type in src/types/entities.ts
- [ ] T013 Update src/types/progress.ts to add 'syllables' to LevelId union and LEVEL_UNLOCK_THRESHOLDS

**Checkpoint**: Foundation ready - user story implementation can begin

---

## Phase 3: User Story 8 - Fix Activity Progression Bugs (Priority: P8) 🎯 MVP

**Goal**: Fix blocking bugs where completing activities doesn't advance to next item

**Independent Test**: Complete words/family "ima" activity and verify it advances to next word; complete simple sentences and verify it advances to next sentence

### Implementation for User Story 8

- [ ] T014 [US8] Debug and fix word progression in src/pages/Words/WordGroupView.tsx - trace currentWordIndex state management
- [ ] T015 [US8] Debug and fix sentence progression in src/pages/Sentences/SentenceGroupView.tsx - trace currentSentenceIndex state management
- [ ] T016 [US8] Verify onComplete callback chain correctly advances to next item in both files
- [ ] T017 [US8] Test manually: complete all words in family group and verify no loops

**Checkpoint**: Activity progression works correctly - users can advance through all items

---

## Phase 4: User Story 7 - Remove English from UI (Priority: P7)

**Goal**: Remove all English text from user-facing screens

**Independent Test**: Navigate through all word and sentence activities, verify zero English text visible

### Implementation for User Story 7

- [ ] T018 [P] [US7] Remove translationHint prop usage from src/components/words/WordQuiz.tsx (lines ~117-127)
- [ ] T019 [P] [US7] Remove translation display from src/components/sentences/SentenceReader.tsx (line ~89)
- [ ] T020 [US7] Update prompt in src/pages/Words/WordGroupView.tsx to use Hebrew only or image/audio (remove English translation)
- [ ] T021 [US7] Remove translationHint prop pass from src/pages/Words/WordGroupView.tsx (line ~361)
- [ ] T022 [US7] Test manually: verify no English text in word quiz and sentence reader

**Checkpoint**: All user-facing text is Hebrew only

---

## Phase 5: User Story 5 - Fix Vowel Recognition Quiz Issues (Priority: P5)

**Goal**: Fix nikkud quiz to prevent visual matching and handle similar-sounding vowels

**Independent Test**: Complete nikkud quiz with audio muted - verify cannot pass by visual matching alone

### Implementation for User Story 5

- [ ] T023 [US5] Modify quiz option generation in src/components/nikkud/NikkudQuiz.tsx to use different base letters for each option
- [ ] T024 [US5] Add soundGroup to each nikkud in src/data/nikkud.yaml (a, e, i, o, u, silent)
- [ ] T025 [US5] Update quiz logic to avoid patach/kamatz and tsere/segol as distractors for each other
- [ ] T026 [US5] Hide nikkud names in src/components/nikkud/CombinationBuilder.tsx (remove name labels, show only marks)
- [ ] T027 [US5] Test manually: verify quiz requires audio recognition, not visual matching

**Checkpoint**: Nikkud quiz tests true sound recognition

---

## Phase 6: User Story 6 - Add Missing Full Vowels (Priority: P6)

**Goal**: Add holam male (וֹ) and shuruk (וּ) to nikkud curriculum

**Independent Test**: Navigate to nikkud level, verify holam male and shuruk appear as learnable vowels

### Implementation for User Story 6

- [ ] T028 [US6] Add holam male entry to src/data/nikkud.yaml with isFullVowel: true, soundGroup: o
- [ ] T029 [US6] Add shuruk entry to src/data/nikkud.yaml with isFullVowel: true, soundGroup: u
- [ ] T030 [US6] Create placeholder audio files or TTS entries for holam male and shuruk in public/audio/nikkud/
- [ ] T031 [US6] Update NikkudIntro component to handle full vowels display (inline position)
- [ ] T032 [US6] Audit src/data/words.yaml for words using holam male/shuruk and update syllable breakdowns
- [ ] T033 [US6] Test manually: verify holam male and shuruk appear in nikkud learning flow

**Checkpoint**: Full vowels are part of curriculum

---

## Phase 7: User Story 9 - Improve Dagesh and Letter Variant Teaching (Priority: P9)

**Goal**: Explicitly teach dagesh variants (bet/vet, kaf/chaf, pe/fe) and shin/sin distinction

**Independent Test**: View letter introduction for Bet, verify both b and v sounds are taught

### Implementation for User Story 9

- [ ] T034 [P] [US9] Add variants section to src/data/letters.yaml with bet-dagesh, bet-no-dagesh entries
- [ ] T035 [P] [US9] Add kaf-dagesh, kaf-no-dagesh variant entries to src/data/letters.yaml
- [ ] T036 [P] [US9] Add pe-dagesh, pe-no-dagesh variant entries to src/data/letters.yaml
- [ ] T037 [P] [US9] Add shin-dot, sin-dot variant entries to src/data/letters.yaml
- [ ] T038 [US9] Update Letter entries to include variantIds references in src/data/letters.yaml
- [ ] T039 [US9] Update LetterIntro component to show both variants when letter has variantIds in src/components/letters/LetterIntro.tsx
- [ ] T040 [US9] Create audio files or TTS entries for variant sounds in public/audio/letters/
- [ ] T041 [US9] Test manually: verify Bet introduction shows both b and v sounds

**Checkpoint**: Letter variants are properly taught

---

## Phase 8: User Story 1 - CV Syllable Drilling (Priority: P1)

**Goal**: Create syllable drilling activity for CV combination practice

**Independent Test**: Enter syllable drill, hear syllable audio, identify correct syllable from 4 options, receive feedback

### Implementation for User Story 1

- [ ] T042 [US1] Populate src/data/syllables.yaml with CV syllable combinations (start with bet + all vowels, ~50 initial syllables)
- [ ] T043 [US1] Add drill definitions to src/data/syllables.yaml (drill-bet-all, etc.)
- [ ] T044 [US1] Create SyllableDrill component in src/components/syllables/SyllableDrill.tsx following NikkudQuiz pattern
- [ ] T045 [US1] Implement syllable audio playback on presentation and on tap in SyllableDrill
- [ ] T046 [US1] Implement 4-option quiz with correct/incorrect feedback in SyllableDrill
- [ ] T047 [US1] Add mastery tracking - show which syllables need more practice at end
- [ ] T048 [US1] Create SyllablesLevelView page in src/pages/Syllables/SyllablesLevelView.tsx
- [ ] T049 [US1] Create SyllableNodeView page in src/pages/Syllables/SyllableNodeView.tsx
- [ ] T050 [US1] Add syllables level to progressStore in src/stores/progressStore.ts (unlock after nikkud 80%)
- [ ] T051 [US1] Add syllables routes to router (App.tsx or router config)
- [ ] T052 [US1] Create src/components/syllables/index.ts export file
- [ ] T053 [US1] Test manually: complete syllable drill activity end-to-end

**Checkpoint**: CV syllable drilling is fully functional

---

## Phase 9: User Story 2 - Syllable Blending (Priority: P2)

**Goal**: Create activity to build words from CV syllables

**Independent Test**: See target word image/audio, select correct syllables in RTL order, receive feedback

### Implementation for User Story 2

- [ ] T054 [US2] Create SyllableBlend component in src/components/syllables/SyllableBlend.tsx
- [ ] T055 [US2] Implement target word display with image and audio playback
- [ ] T056 [US2] Implement syllable option buttons (4-6 options with distractors)
- [ ] T057 [US2] Implement RTL building area where selected syllables appear
- [ ] T058 [US2] Implement tap-to-remove for placed syllables
- [ ] T059 [US2] Implement submission validation and feedback (partial feedback for wrong parts)
- [ ] T060 [US2] Add blend activity definitions to src/data/syllables.yaml (link words to syllable breakdowns)
- [ ] T061 [US2] Integrate SyllableBlend into SyllableNodeView
- [ ] T062 [US2] Test manually: build 3 words from syllables, verify feedback

**Checkpoint**: Syllable blending activity works

---

## Phase 10: User Story 3 - Syllable Segmentation (Priority: P3)

**Goal**: Create activity to segment words into CV syllables

**Independent Test**: See word, tap between letters to place dividers, submit and hear syllables separately

### Implementation for User Story 3

- [ ] T063 [US3] Create SyllableSegment component in src/components/syllables/SyllableSegment.tsx
- [ ] T064 [US3] Implement word display with tap-between-letters interaction
- [ ] T065 [US3] Implement visual divider placement/removal on tap
- [ ] T066 [US3] Implement submission validation against expected syllable boundaries
- [ ] T067 [US3] Implement success animation: syllables separate and play audio sequentially
- [ ] T068 [US3] Implement feedback for incorrect boundaries (highlight wrong ones)
- [ ] T069 [US3] Add segment activity definitions to src/data/syllables.yaml
- [ ] T070 [US3] Integrate SyllableSegment into SyllableNodeView
- [ ] T071 [US3] Test manually: segment 3 words, verify feedback and animations

**Checkpoint**: Syllable segmentation activity works

---

## Phase 11: User Story 4 - Minimal Pair Practice (Priority: P4)

**Goal**: Create activity to distinguish similar-sounding syllables

**Independent Test**: See two similar syllables, hear target audio, select correct match

### Implementation for User Story 4

- [ ] T072 [US4] Create MinimalPairPractice component in src/components/syllables/MinimalPairPractice.tsx
- [ ] T073 [US4] Implement side-by-side syllable display
- [ ] T074 [US4] Implement tap-to-hear for each syllable
- [ ] T075 [US4] Implement target audio playback and selection requirement
- [ ] T076 [US4] Implement feedback: play both syllables to reinforce distinction
- [ ] T077 [US4] Add minimal pair definitions to src/data/syllables.yaml (consonant, vowel, dagesh, shin-sin contrasts)
- [ ] T078 [US4] Integrate MinimalPairPractice into SyllableNodeView
- [ ] T079 [US4] Test manually: complete 5 minimal pair comparisons

**Checkpoint**: Minimal pair practice activity works

---

## Phase 12: Polish & Integration

**Purpose**: Final integration and cross-cutting improvements

- [ ] T080 [P] Update curriculum progression: words level now requires syllables 80% in src/stores/progressStore.ts
- [ ] T081 [P] Add syllables level to level selection/navigation UI
- [ ] T082 Ensure all syllable activities save progress correctly via progressStore
- [ ] T083 Add syllable-related rewards to reward system if applicable
- [ ] T084 [P] Review and update public/audio/ directory structure for new audio files
- [ ] T085 Run full app test: letters → nikkud → syllables → words → sentences flow
- [ ] T086 Verify responsive layout for all new components (tablet/mobile/desktop)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 - BLOCKS all user stories
- **Phases 3-7 (Bug Fixes)**: Depend on Phase 2 - can run in parallel
- **Phases 8-11 (New Features)**: Depend on Phase 2 - can run in parallel with each other
- **Phase 12 (Polish)**: Depends on all feature phases

### User Story Dependencies

| Story | Depends On | Can Run Parallel With |
|-------|------------|----------------------|
| US8 (Progression bugs) | Phase 2 only | US5, US6, US7, US9 |
| US7 (Remove English) | Phase 2 only | US5, US6, US8, US9 |
| US5 (Fix vowel quiz) | Phase 2 only | US6, US7, US8, US9 |
| US6 (Full vowels) | Phase 2 only | US5, US7, US8, US9 |
| US9 (Dagesh teaching) | Phase 2 only | US5, US6, US7, US8 |
| US1 (CV drilling) | Phase 2 + US6 (for full vowels) | US2, US3, US4 |
| US2 (Blending) | Phase 2 + US1 (uses syllables data) | US3, US4 |
| US3 (Segmentation) | Phase 2 + US1 (uses syllables data) | US2, US4 |
| US4 (Minimal pairs) | Phase 2 + US1 (uses syllables data) | US2, US3 |

### Recommended Order

1. **Phase 1-2**: Setup + Types (foundation)
2. **Phase 3 (US8)**: Fix progression bugs FIRST (most blocking)
3. **Phases 4-7 (US5-US9)**: Bug fixes in parallel if capacity, else priority order
4. **Phase 8 (US1)**: CV Drilling (required for other new activities)
5. **Phases 9-11 (US2-US4)**: New activities can run in parallel
6. **Phase 12**: Integration and polish

---

## Parallel Opportunities

### Within Bug Fix Phase (US5-US9)

```
All can run in parallel after Phase 2:
- T014-T017 (US8 progression)
- T018-T022 (US7 English)
- T023-T027 (US5 vowel quiz)
- T028-T033 (US6 full vowels)
- T034-T041 (US9 dagesh)
```

### Within New Features Phase (US1-US4)

```
After US1 core (T042-T053):
- T054-T062 (US2 blending)
- T063-T071 (US3 segmentation)
- T072-T079 (US4 minimal pairs)
```

---

## Implementation Strategy

### MVP First (Bug Fixes Only)

1. Complete Phase 1-2 (Setup + Types)
2. Complete Phase 3 (US8 - progression bugs) ← **Critical user-blocking bugs**
3. Complete Phase 4 (US7 - remove English)
4. **STOP and VALIDATE**: Existing app works without bugs
5. Deploy fix to users immediately

### Incremental Feature Delivery

1. After MVP bug fixes deployed
2. Add US1 (CV Drilling) → Test → Deploy
3. Add US2 (Blending) → Test → Deploy
4. Add US3 (Segmentation) → Test → Deploy
5. Add US4 (Minimal Pairs) → Test → Deploy

---

## Summary

| Phase | Stories | Task Count |
|-------|---------|------------|
| Phase 1 (Setup) | - | 3 |
| Phase 2 (Types) | - | 10 |
| Phase 3 | US8 | 4 |
| Phase 4 | US7 | 5 |
| Phase 5 | US5 | 5 |
| Phase 6 | US6 | 6 |
| Phase 7 | US9 | 8 |
| Phase 8 | US1 | 12 |
| Phase 9 | US2 | 9 |
| Phase 10 | US3 | 9 |
| Phase 11 | US4 | 8 |
| Phase 12 (Polish) | - | 7 |
| **Total** | **9 stories** | **86 tasks** |

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story
- Bug fixes (US5-US9) prioritized before new features (US1-US4)
- US8 (progression bugs) is most critical - blocks user progress
- No automated tests included (manual testing only per project setup)
- Audio files may need TTS generation or manual recording
