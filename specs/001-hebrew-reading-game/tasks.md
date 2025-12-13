# Tasks: Hebrew Reading Game for First Graders

**Input**: Design documents from `/specs/001-hebrew-reading-game/`
**Prerequisites**: plan.md, spec.md, data-model.md, contracts/, research.md

**Tests**: Not explicitly requested - tests omitted. Add if needed later.

**Organization**: Tasks grouped by user story for independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story (US1-US5)
- File paths relative to repository root

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Project initialization and basic structure

- [ ] T001 Initialize Vite + React + TypeScript project with `npm create vite@latest`
- [ ] T002 Install dependencies: zustand, framer-motion, howler, react-router-dom, js-yaml
- [ ] T003 [P] Configure ESLint and Prettier for TypeScript/React in `.eslintrc.cjs` and `.prettierrc`
- [ ] T004 [P] Configure Vite for GitHub Pages deployment in `vite.config.ts` (base: '/alef/')
- [ ] T005 [P] Setup RTL-first global styles in `src/styles/global.css` (dir: rtl, Hebrew fonts)
- [ ] T006 [P] Configure Hebrew fonts (Hillel, DanaYad) in `src/styles/fonts.css`
- [ ] T007 [P] Create responsive breakpoints in `src/styles/breakpoints.ts` (mobile/tablet/desktop)
- [ ] T008 [P] Create color theme and typography in `src/styles/theme.ts`
- [ ] T009 Setup HashRouter in `src/App.tsx` for GitHub Pages compatibility
- [ ] T010 Create basic folder structure per plan.md (components/, pages/, hooks/, stores/, data/, utils/)

**Checkpoint**: Project builds and runs with Hebrew RTL layout

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core infrastructure that MUST be complete before ANY user story

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

### Data Types & Storage

- [ ] T011 [P] Create Letter type interface in `src/types/entities.ts`
- [ ] T012 [P] Create Nikkud type interface in `src/types/entities.ts`
- [ ] T013 [P] Create Word type interface in `src/types/entities.ts`
- [ ] T014 [P] Create Sentence type interface in `src/types/entities.ts`
- [ ] T015 [P] Create Activity and ActivityItem type interfaces in `src/types/entities.ts`
- [ ] T016 [P] Create Progress, Reward, Settings, Stats type interfaces in `src/types/progress.ts`
- [ ] T017 Create LocalStorage utility functions (save, load, clear) in `src/utils/storage.ts`
- [ ] T018 Create Zustand progress store with persistence in `src/stores/progressStore.ts`
- [ ] T019 [P] Create Zustand settings store in `src/stores/settingsStore.ts`

### Audio Infrastructure

- [ ] T020 Create useAudio hook for Howler.js integration in `src/hooks/useAudio.ts`
- [ ] T021 Create audio preloader utility in `src/utils/audio.ts` (preload next 2 nodes)
- [ ] T022 [P] Create audio manifest type and loader in `src/data/audio-manifest.yaml`

### Core UI Components

- [ ] T023 [P] Create Button component (large touch targets, Hebrew text) in `src/components/common/Button.tsx`
- [ ] T024 [P] Create Card component (content container) in `src/components/common/Card.tsx`
- [ ] T025 [P] Create FeedbackOverlay component (correct/incorrect) in `src/components/common/FeedbackOverlay.tsx`
- [ ] T026 [P] Create LoadingSpinner component in `src/components/common/LoadingSpinner.tsx`
- [ ] T027 Create Navigation component (responsive bottom/sidebar) in `src/components/navigation/Navigation.tsx`
- [ ] T028 [P] Create useResponsive hook for breakpoint detection in `src/hooks/useResponsive.ts`

### Curriculum Data Structure

- [ ] T029 Create letters.yaml with all 27 letters (22 + 5 sofiyot) in `src/data/letters.yaml`
- [ ] T030 [P] Create nikkud.yaml with 8 vowel marks in `src/data/nikkud.yaml`
- [ ] T031 Create YAML loader utility in `src/utils/yaml.ts`

**Checkpoint**: Foundation ready - can load data, play audio, persist progress, show UI

---

## Phase 3: User Story 1 - Learn Hebrew Letters (Priority: P1) 🎯 MVP

**Goal**: Child learns Hebrew letters one at a time through visual/audio presentation and simple activities

**Independent Test**: Launch game, complete letter intro for 3-5 letters, verify quiz identification works

### Letter Components

- [ ] T032 [P] [US1] Create LetterCard component (large letter display with animation) in `src/components/letters/LetterCard.tsx`
- [ ] T033 [P] [US1] Create LetterIntro component (shows letter, plays name + sound) in `src/components/letters/LetterIntro.tsx`
- [ ] T034 [P] [US1] Create LetterQuiz component (tap correct letter from options) in `src/components/letters/LetterQuiz.tsx`
- [ ] T035 [US1] Create LetterMatch component (match letter to sound) in `src/components/letters/LetterMatch.tsx`

### Letter Activities Data

- [ ] T036 [P] [US1] Create letters-intro.yaml activity definition in `src/data/activities/letters-intro.yaml`
- [ ] T037 [P] [US1] Create letters-match.yaml activity definition in `src/data/activities/letters-match.yaml`
- [ ] T038 [P] [US1] Create letters-quiz.yaml activity definition in `src/data/activities/letters-quiz.yaml`

### Letter Page & Flow

- [ ] T039 [US1] Create LettersPage with journey path navigation in `src/pages/Letters/LettersPage.tsx`
- [ ] T040 [US1] Create LetterNodeView (single letter learning flow) in `src/pages/Letters/LetterNodeView.tsx`
- [ ] T041 [US1] Implement letter activity randomization (shuffle items, randomize options) in `src/utils/randomize.ts`
- [ ] T042 [US1] Add letter progress tracking to progressStore (lettersCompleted, current node)

### Journey Path UI

- [ ] T043 [US1] Create JourneyPath component (horizontal scrolling node path) in `src/components/navigation/JourneyPath.tsx`
- [ ] T044 [US1] Create NodeIcon component (locked/available/in-progress/mastered states) in `src/components/navigation/NodeIcon.tsx`

### Audio Generation (MVP subset)

- [ ] T045 [P] [US1] Generate MVP letter audio files (27 names + 27 sounds) using ElevenLabs script in `scripts/generate-audio.ts`
- [ ] T046 [P] [US1] Create UI sound effects (5 essential: success, error, tap, unlock, celebrate) in `src/assets/audio/effects/`

### Home Page

- [ ] T047 [US1] Create HomePage with level selection in `src/pages/Home/HomePage.tsx`
- [ ] T048 [US1] Create LevelCard component (Letters/Nikkud/Words/Sentences) in `src/components/navigation/LevelCard.tsx`

**Checkpoint**: Child can learn letters, hear names/sounds, complete quizzes, see progress on path

---

## Phase 4: User Story 2 - Learn Nikkud (Priority: P2)

**Goal**: Child learns nikkud marks and how they combine with letters to make sounds

**Independent Test**: Access nikkud section, learn 2-3 vowel marks, hear letter+nikkud combinations

### Nikkud Components

- [ ] T049 [P] [US2] Create NikkudCard component (vowel mark display) in `src/components/nikkud/NikkudCard.tsx`
- [ ] T050 [P] [US2] Create NikkudIntro component (shows mark, plays sound) in `src/components/nikkud/NikkudIntro.tsx`
- [ ] T051 [US2] Create CombinationBuilder component (letter + nikkud = sound) in `src/components/nikkud/CombinationBuilder.tsx`
- [ ] T052 [US2] Create NikkudQuiz component (match mark to sound) in `src/components/nikkud/NikkudQuiz.tsx`

### Nikkud Activities Data

- [ ] T053 [P] [US2] Create nikkud-intro.yaml activity definition in `src/data/activities/nikkud-intro.yaml`
- [ ] T054 [P] [US2] Create nikkud-combine.yaml activity definition in `src/data/activities/nikkud-combine.yaml`
- [ ] T055 [P] [US2] Create combinations data (letter+nikkud pairs) in `src/data/combinations.yaml`

### Nikkud Page & Flow

- [ ] T056 [US2] Create NikkudPage with journey path in `src/pages/Nikkud/NikkudPage.tsx`
- [ ] T057 [US2] Create NikkudNodeView (single nikkud learning flow) in `src/pages/Nikkud/NikkudNodeView.tsx`
- [ ] T058 [US2] Add nikkud progress tracking to progressStore (nikkudCompleted, current node)
- [ ] T059 [US2] Implement level unlock logic (80% letters → unlock nikkud) in progressStore

### Audio Generation (Nikkud)

- [ ] T060 [P] [US2] Generate nikkud audio files (8 names) using ElevenLabs script
- [ ] T061 [P] [US2] Generate MVP combination audio (40 common combos) using ElevenLabs script

**Checkpoint**: Child can learn nikkud, see combinations, level unlocks after letter mastery

---

## Phase 5: User Story 3 - Read Simple Words (Priority: P3)

**Goal**: Child reads words broken into syllables with picture matching comprehension

**Independent Test**: Present 3-5 words, sound out syllables, verify picture matching works

### Word Components

- [ ] T062 [P] [US3] Create WordCard component (word with syllable breakdown) in `src/components/words/WordCard.tsx`
- [ ] T063 [P] [US3] Create SyllableView component (tap to hear syllable) in `src/components/words/SyllableView.tsx`
- [ ] T064 [US3] Create WordBuilder component (syllable-by-syllable reading) in `src/components/words/WordBuilder.tsx`
- [ ] T065 [US3] Create PictureMatch component (match word to image) in `src/components/words/PictureMatch.tsx`

### Word Activities Data

- [ ] T066 [P] [US3] Create words.yaml with MVP word list (20 words) in `src/data/words.yaml`
- [ ] T067 [P] [US3] Create words-syllables.yaml activity in `src/data/activities/words-syllables.yaml`
- [ ] T068 [P] [US3] Create words-picture-match.yaml activity in `src/data/activities/words-picture-match.yaml`

### Word Page & Flow

- [ ] T069 [US3] Create WordsPage with journey path in `src/pages/Words/WordsPage.tsx`
- [ ] T070 [US3] Create WordNodeView (word learning flow) in `src/pages/Words/WordNodeView.tsx`
- [ ] T071 [US3] Add word progress tracking to progressStore (wordsLearned, vocabulary list)
- [ ] T072 [US3] Implement level unlock logic (80% nikkud → unlock words) in progressStore

### Assets

- [ ] T073 [P] [US3] Generate MVP word audio files (20 words) using ElevenLabs script
- [ ] T074 [P] [US3] Source/create word illustrations (20 images) in `src/assets/images/words/`

**Checkpoint**: Child can read words syllable by syllable, match words to pictures

---

## Phase 6: User Story 4 - Read Simple Sentences (Priority: P4)

**Goal**: Child reads short sentences and answers comprehension questions

**Independent Test**: Present sentence from learned words, read word by word, verify comprehension quiz

### Sentence Components

- [ ] T075 [P] [US4] Create SentenceCard component (sentence display with word highlighting) in `src/components/sentences/SentenceCard.tsx`
- [ ] T076 [US4] Create SentenceReader component (tap words to hear) in `src/components/sentences/SentenceReader.tsx`
- [ ] T077 [US4] Create SentencePictureMatch component (match sentence to image) in `src/components/sentences/SentencePictureMatch.tsx`
- [ ] T078 [US4] Create ComprehensionQuiz component (yes/no or multiple choice) in `src/components/sentences/ComprehensionQuiz.tsx`

### Sentence Activities Data

- [ ] T079 [P] [US4] Create sentences.yaml with MVP sentences (10 sentences) in `src/data/sentences.yaml`
- [ ] T080 [P] [US4] Create sentences-read.yaml activity in `src/data/activities/sentences-read.yaml`
- [ ] T081 [P] [US4] Create sentences-comprehension.yaml activity in `src/data/activities/sentences-comprehension.yaml`

### Sentence Page & Flow

- [ ] T082 [US4] Create SentencesPage with journey path in `src/pages/Sentences/SentencesPage.tsx`
- [ ] T083 [US4] Create SentenceNodeView (sentence learning flow) in `src/pages/Sentences/SentenceNodeView.tsx`
- [ ] T084 [US4] Add sentence progress tracking to progressStore (sentencesRead)
- [ ] T085 [US4] Implement level unlock logic (80% words → unlock sentences) in progressStore

### Assets

- [ ] T086 [P] [US4] Generate MVP sentence audio files (10 sentences) using ElevenLabs script
- [ ] T087 [P] [US4] Source/create sentence illustrations (10 images) in `src/assets/images/sentences/`

**Checkpoint**: Child can read sentences, answer comprehension questions

---

## Phase 7: User Story 5 - Track Progress and Earn Rewards (Priority: P5)

**Goal**: Child sees progress visualization and earns rewards for achievements

**Independent Test**: Complete activities, verify progress updates, see rewards appear

### Progress Components

- [ ] T088 [P] [US5] Create ProgressPage with overall stats in `src/pages/Progress/ProgressPage.tsx`
- [ ] T089 [P] [US5] Create ProgressBar component (visual progress indicator) in `src/components/rewards/ProgressBar.tsx`
- [ ] T090 [US5] Create StatsDisplay component (total time, accuracy, streak) in `src/components/rewards/StatsDisplay.tsx`

### Reward Components

- [ ] T091 [P] [US5] Create RewardAnimation component (star burst, badge unlock) in `src/components/rewards/RewardAnimation.tsx`
- [ ] T092 [P] [US5] Create RewardBadge component (earned achievement display) in `src/components/rewards/RewardBadge.tsx`
- [ ] T093 [US5] Create CelebrationOverlay component (level complete, full game complete) in `src/components/rewards/CelebrationOverlay.tsx`

### Reward Logic

- [ ] T094 [US5] Create reward definitions in `src/data/rewards.yaml`
- [ ] T095 [US5] Implement reward earning logic in progressStore (letter complete, level unlock, milestone)
- [ ] T096 [US5] Add stats tracking to progressStore (time, accuracy, streaks)

### Completion State

- [ ] T097 [US5] Create CompletionPage (all content finished celebration + free play) in `src/pages/Progress/CompletionPage.tsx`
- [ ] T098 [US5] Implement free play mode (all nodes accessible after completion)

**Checkpoint**: Child sees progress, earns rewards, celebration on completion

---

## Phase 8: Polish & Cross-Cutting Concerns

**Purpose**: Improvements affecting multiple user stories

### Animations & Feedback

- [ ] T099 [P] Add Framer Motion animations to all interactive components
- [ ] T100 [P] Add bounce/wiggle animations to letter/nikkud cards
- [ ] T101 [P] Add smooth page transitions
- [ ] T102 Ensure 100ms feedback on all interactions

### Responsive Design

- [ ] T103 Test and fix mobile layout (320-767px)
- [ ] T104 Test and fix tablet layout (768-1023px)
- [ ] T105 Test and fix desktop layout (1024px+)
- [ ] T106 [P] Add safe area handling for notched devices

### Audio Polish

- [ ] T107 Add background music toggle (settings)
- [ ] T108 Implement audio preloading strategy (next 2 nodes)
- [ ] T109 Add fallback for missing audio (visual-only mode)

### Edge Cases

- [ ] T110 Handle browser refresh (auto-save, restore state)
- [ ] T111 Handle repeated mistakes (gentle encouragement, hints)
- [ ] T112 Handle locked content tap (show unlock requirements)

### Deployment

- [ ] T113 Create GitHub Actions workflow in `.github/workflows/deploy.yml`
- [ ] T114 Configure GitHub Pages deployment
- [ ] T115 Test production build locally
- [ ] T116 Deploy to GitHub Pages

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies - start immediately
- **Phase 2 (Foundational)**: Depends on Setup - BLOCKS all user stories
- **Phases 3-7 (User Stories)**: All depend on Foundational completion
- **Phase 8 (Polish)**: Depends on at least US1 complete

### User Story Dependencies

- **US1 (Letters)**: Can start after Phase 2 - No dependencies on other stories ← MVP
- **US2 (Nikkud)**: Can start after Phase 2 - Gameplay independent, shares components
- **US3 (Words)**: Can start after Phase 2 - Gameplay independent
- **US4 (Sentences)**: Can start after Phase 2 - Gameplay independent
- **US5 (Progress)**: Can start after Phase 2 - Integrates with all stories

### Level Unlock Dependencies (Runtime)

- Letters → always available
- Nikkud → unlocks after 80% letters success
- Words → unlocks after 80% nikkud success
- Sentences → unlocks after 80% words success

---

## Parallel Execution Examples

### Phase 2 Parallel Groups

```bash
# Group 1: Type definitions (all [P])
T011, T012, T013, T014, T015, T016

# Group 2: Stores (after types)
T017, T018, T019

# Group 3: UI Components (all [P])
T023, T024, T025, T026, T028

# Group 4: Data files (all [P])
T029, T030
```

### User Story 1 Parallel Groups

```bash
# Group 1: Components (all [P])
T032, T033, T034

# Group 2: Activity data (all [P])
T036, T037, T038

# Group 3: Audio generation (all [P])
T045, T046
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Complete Phase 1: Setup (~10 tasks)
2. Complete Phase 2: Foundational (~21 tasks)
3. Complete Phase 3: User Story 1 (~17 tasks)
4. **STOP and VALIDATE**: Test letter learning independently
5. Deploy MVP to GitHub Pages

### Incremental Delivery

1. Setup + Foundational → Foundation ready
2. Add US1 (Letters) → Test → Deploy (MVP!)
3. Add US2 (Nikkud) → Test → Deploy
4. Add US3 (Words) → Test → Deploy
5. Add US4 (Sentences) → Test → Deploy
6. Add US5 (Progress/Rewards) → Test → Deploy
7. Polish → Final release

---

## Summary

| Phase | Tasks | Parallel Tasks | Story |
|-------|-------|----------------|-------|
| Setup | 10 | 7 | - |
| Foundational | 21 | 15 | - |
| US1: Letters | 17 | 9 | P1 🎯 MVP |
| US2: Nikkud | 13 | 6 | P2 |
| US3: Words | 13 | 6 | P3 |
| US4: Sentences | 13 | 6 | P4 |
| US5: Progress | 11 | 5 | P5 |
| Polish | 18 | 6 | - |
| **Total** | **116** | **60** | - |

**MVP Scope**: Phases 1-3 (48 tasks) delivers complete letter learning experience
