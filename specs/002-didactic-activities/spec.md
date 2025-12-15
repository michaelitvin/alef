# Feature Specification: Hebrew Reading Didactic Activities

**Feature Branch**: `002-didactic-activities`
**Created**: 2025-12-15
**Status**: Draft
**Input**: User description: "Add research-backed didactic activities for Hebrew reading instruction based on CV syllable method and multi-sensory learning principles"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - CV Syllable Drilling (Priority: P1)

A first-grade child practices reading CV syllable units (consonant + vowel combinations like בָּ, בַ, בִּ) through systematic drilling exercises. The child sees a CV syllable, hears it pronounced, and must identify or reproduce it correctly. The activity builds automaticity in recognizing these fundamental reading units.

**Why this priority**: Research shows the CV syllable ("tseruf") is the fundamental unit of Hebrew reading instruction. Israeli children perceive CV as an integral unit, not separate consonant + vowel. Mastering CV syllables is the foundation for word reading fluency by end of Grade 1.

**Independent Test**: Can be fully tested by presenting 10-15 CV syllable combinations, having the child listen and identify the matching syllable from options, and measuring recognition accuracy and speed. Delivers value as standalone syllable recognition training.

**Acceptance Scenarios**:

1. **Given** a child enters the syllable drilling activity, **When** a CV syllable (e.g., בָּ) is presented, **Then** the system plays the syllable sound automatically and displays the syllable prominently
2. **Given** a CV syllable is displayed with audio, **When** the child taps on the syllable, **Then** the audio replays so the child can hear it again
3. **Given** a syllable quiz is presented, **When** the child selects the correct syllable from 4 options after hearing the audio, **Then** positive feedback is shown and the next syllable is presented
4. **Given** a child makes an incorrect selection, **When** feedback is shown, **Then** the correct syllable is highlighted and its audio plays before allowing retry
5. **Given** a drilling session is completed, **When** the child finishes, **Then** the system shows which syllables were mastered vs. need more practice

---

### User Story 2 - Syllable Blending (Priority: P2)

The child builds real Hebrew words by selecting and combining CV syllables in the correct order. Given a target word (with audio and optional picture), the child picks the correct syllables from a set of options and arranges them to form the word.

**Why this priority**: Blending syllables into words is the "synthetic" approach recommended by Hebrew reading research (Feitelson). After mastering individual CV units, children need practice combining them into meaningful words.

**Independent Test**: Can be tested by presenting 5-8 target words with syllable options, having the child build each word, and verifying correct syllable selection and ordering.

**Acceptance Scenarios**:

1. **Given** a child enters syllable blending activity, **When** a target word is presented, **Then** the system shows the word picture/image and plays the word audio
2. **Given** a target word is displayed, **When** the syllable options appear, **Then** the child sees 4-6 syllable buttons including the correct syllables needed plus distractors
3. **Given** syllable options are shown, **When** the child taps a syllable, **Then** it moves to a "building area" showing the word being constructed left-to-right (RTL: right-to-left)
4. **Given** the child has placed syllables, **When** they tap a placed syllable, **Then** it can be removed and returned to the options
5. **Given** all correct syllables are placed in order, **When** the word is complete, **Then** celebration feedback plays and the full word audio is spoken
6. **Given** incorrect syllables or wrong order, **When** the child submits, **Then** helpful feedback shows which part is incorrect without revealing the full answer

---

### User Story 3 - Syllable Segmentation (Priority: P3)

The child practices breaking down words into their constituent CV syllables. Given a word, the child identifies the syllable boundaries by tapping between syllables or dragging dividers.

**Why this priority**: Segmentation is the "analytic" approach that complements blending. Research shows syllable deletion (awareness of syllable boundaries) predicts reading fluency by mid-Grade 1. This activity reinforces the CV unit concept from the opposite direction.

**Independent Test**: Can be tested by presenting 5-8 words, having the child mark syllable boundaries, and verifying correct segmentation matches the expected syllable breakdown.

**Acceptance Scenarios**:

1. **Given** a child enters syllable segmentation, **When** a word is presented, **Then** the word appears as a continuous string with audio playback option
2. **Given** a word is displayed, **When** the child taps between letters, **Then** a visual divider appears marking a syllable boundary
3. **Given** dividers are placed, **When** the child taps an existing divider, **Then** it is removed
4. **Given** the child marks all boundaries correctly, **When** they submit, **Then** each syllable animates separately with its individual audio playing in sequence
5. **Given** incorrect segmentation, **When** the child submits, **Then** feedback highlights which boundaries are wrong and allows correction

---

### User Story 4 - Minimal Pair Practice (Priority: P4)

The child practices distinguishing between similar-sounding CV syllables (minimal pairs) that differ by only one phonological feature (e.g., בָּ vs. פָּ, בָּ vs. בַ). This activity sharpens phonological awareness.

**Why this priority**: Phonological awareness, particularly distinguishing similar sounds, is foundational for reading. Minimal pair practice helps children notice subtle differences that matter for accurate decoding.

**Independent Test**: Can be tested by presenting 10 minimal pair comparisons, having the child identify which syllable matches the audio, and measuring discrimination accuracy.

**Acceptance Scenarios**:

1. **Given** a child enters minimal pair practice, **When** a pair is presented, **Then** two similar CV syllables appear side by side
2. **Given** two syllables are shown, **When** the child taps one, **Then** its audio plays
3. **Given** syllables can be heard, **When** a target audio plays, **Then** the child must select which syllable matches
4. **Given** correct selection, **When** feedback is shown, **Then** both syllables are pronounced to reinforce the difference
5. **Given** incorrect selection, **When** feedback is shown, **Then** both syllables are played back-to-back to highlight the distinction

---

### User Story 5 - Fix Vowel Recognition Quiz Issues (Priority: P5)

The existing nikkud quiz has pedagogical issues that confuse children. This story addresses fixes to make vowel recognition activities more effective.

**Why this priority**: Current activities have bugs that undermine learning. Children can "cheat" by visual matching instead of audio recognition, and similar-sounding vowels (patach/kamatz, tsere/segol) create confusion when quizzed on sound.

**Independent Test**: Can be tested by having a child complete nikkud quizzes with improved logic and verifying they must rely on audio discrimination rather than visual matching.

**Current Issues Identified**:

1. **Visual matching bypass**: Quiz options show the nikkud mark visibly, so children can match visually instead of recognizing by sound
2. **Similar vowel confusion**: Patach (ַ) and Kamatz (ָ) make the same "a" sound in modern Israeli Hebrew; Tsere (ֵ) and Segol (ֶ) make the same "e" sound - quizzes asking "which sound does X make?" are confusing
3. **CombinationBuilder shows nikkud names**: Children can read the label instead of recognizing by shape/sound

**Acceptance Scenarios**:

1. **Given** a nikkud quiz is presented, **When** answer options are shown, **Then** options use different letters (not same letter with different nikkud) to prevent visual nikkud matching
2. **Given** a quiz about similar-sounding vowels (patach/kamatz or tsere/segol), **When** the quiz is generated, **Then** the system avoids putting both in the same quiz as distractors OR teaches them as a pair that sounds the same
3. **Given** quiz options are displayed, **When** child must select, **Then** the selection must be based on hearing the target sound, not visually matching nikkud marks
4. **Given** the CombinationBuilder activity, **When** nikkud options are shown, **Then** nikkud names are hidden (show only the mark) to require visual recognition

---

### User Story 6 - Add Missing Full Vowels (Priority: P6)

Add the missing "full vowel" forms that use the letter Vav as a vowel marker. These are extremely common in Hebrew and essential for reading.

**Why this priority**: Holam male (וֹ) and Shuruk (וּ) appear in very common words like תּוֹדָה (toda - thank you), שׁוּק (shuk - market), טוֹב (tov - good). Children cannot read many basic words without knowing these.

**Independent Test**: Can be tested by presenting words containing holam male and shuruk, and verifying children can decode them correctly.

**Missing Vowels to Add**:

1. **Holam Male (חוֹלָם מָלֵא)** - וֹ - Vav with dot above = "o" sound
2. **Shuruk (שׁוּרוּק)** - וּ - Vav with dagesh = "u" sound

**Acceptance Scenarios**:

1. **Given** the nikkud curriculum, **When** a child progresses through vowel learning, **Then** holam male and shuruk are included as vowel options
2. **Given** holam male is introduced, **When** the child sees וֹ, **Then** they learn it makes the "o" sound (same as cholam)
3. **Given** shuruk is introduced, **When** the child sees וּ, **Then** they learn it makes the "u" sound (same as kubutz)
4. **Given** words containing these vowels, **When** presented in word activities, **Then** syllables with וֹ and וּ are correctly broken down and pronounced

---

### User Story 7 - Remove English Instructions from UI (Priority: P7)

Remove all English text from the user-facing game interface. The game should be fully in Hebrew for native-speaking children.

**Why this priority**: English instructions are confusing and inappropriate for Hebrew-speaking first graders who may not read English. The game was specified to be "fully in Hebrew".

**Independent Test**: Can be tested by going through all activities and verifying no English text appears in prompts, hints, or instructions.

**Current Issues Found**:

1. **WordQuiz prompt**: Shows `בחר את המילה: "Mom"` - English word in Hebrew sentence
2. **WordQuiz hint**: Shows English translation in parentheses `(Mom)`
3. **SentenceReader**: Shows English translation in parentheses `(Mom is walking)`
4. **Data files**: `translation` field used for English hints

**Acceptance Scenarios**:

1. **Given** a word quiz activity, **When** the prompt is displayed, **Then** no English words appear - use only Hebrew or rely on images/audio
2. **Given** a word is introduced, **When** hints are shown, **Then** they are in Hebrew or use images instead of English translations
3. **Given** a sentence reading activity, **When** the sentence is displayed, **Then** no English translation is shown
4. **Given** any screen in the game, **When** a user views it, **Then** all visible text is in Hebrew

---

### User Story 8 - Fix Activity Progression Bugs (Priority: P8)

Fix bugs where completing activities doesn't advance to the next item - it loops back or gets stuck:
- **Words/family**: Completing "ima" (mom) loops back to first word
- **Simple sentences**: Cannot advance after completing a sentence

**Why this priority**: These are blocking bugs that prevent children from progressing through learning activities.

**Independent Test**: Can be tested by completing activities in words and sentences levels and verifying the game advances correctly.

**Acceptance Scenarios**:

1. **Given** a child completes a word activity (e.g., "ima"), **When** the success feedback finishes, **Then** the game advances to the next word in the group
2. **Given** a child completes a sentence activity, **When** the success feedback finishes, **Then** the game advances to the next sentence
3. **Given** a child is on the last item in a group, **When** they complete it, **Then** the game shows group completion and advances to next group or level
4. **Given** a child's progress through activities, **When** they return, **Then** they continue from where they left off (not restart)

---

### User Story 9 - Improve Dagesh and Letter Variant Teaching (Priority: P9)

Clarify the teaching of letters that change sound based on dagesh (dot inside): Bet/Vet, Kaf/Chaf, Pe/Fe. Also distinguish Shin from Sin.

**Why this priority**: These letter variants are fundamental to accurate decoding. A child who doesn't know ב vs בּ will mispronounce many words.

**Independent Test**: Can be tested by presenting words with both variants and verifying children apply correct pronunciation.

**Letter Variants to Clarify**:

| Letter | With Dagesh | Without Dagesh |
|--------|-------------|----------------|
| ב | בּ = "b" | ב = "v" |
| כ | כּ = "k" | כ = "ch" |
| פ | פּ = "p" | פ = "f" |
| ש | שׁ (right dot) = "sh" | שׂ (left dot) = "s" |

**Acceptance Scenarios**:

1. **Given** letter introduction for Bet, **When** the child learns it, **Then** both sounds (b and v) are explicitly taught with visual distinction of dagesh
2. **Given** a word with ב without dagesh, **When** the child reads it, **Then** audio plays "v" sound not "b"
3. **Given** shin/sin distinction, **When** the child learns Shin, **Then** both שׁ (shin) and שׂ (sin) are taught as separate sounds
4. **Given** CV syllable activities, **When** presenting bet/kaf/pe syllables, **Then** both dagesh and non-dagesh variants are practiced

---

### Edge Cases

**New Activities**
- What happens when a child repeatedly struggles with the same CV syllable? System flags it for extra practice and presents it more frequently in future sessions
- How does the system handle syllables the child hasn't learned yet in letters/nikkud levels? Activities only use CV combinations from letters and nikkud the child has already mastered
- What happens if the child taps too fast without listening? System requires audio to play before accepting selection; optional "listen first" mode
- How does syllable blending handle words with 3+ syllables? Progressive difficulty from 2-syllable to 3-syllable words based on mastery
- What happens with irregular syllables (CVC, CVCC)? Focus on standard CV patterns first; complex syllable types introduced later

**Existing Activity Fixes**
- How do we quiz patach vs kamatz if they sound the same? Focus on visual shape recognition ("find the kamatz") rather than sound recognition ("which makes 'a' sound?"), or teach them together as "vowels that make 'a'"
- How do we handle words in the database that use holam male/shuruk but weren't tagged correctly? Audit and update existing word syllable breakdowns
- What about words where dagesh is ambiguous or optional? Use standard modern Hebrew pronunciation; note that some words have regional variations
- How do we handle shin/sin when the dot is not rendered in some fonts? Ensure consistent font usage that clearly shows shin/sin dots

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide CV syllable drilling activities that present letter+nikkud combinations as integral units with audio pronunciation
- **FR-002**: System MUST allow children to build words by selecting CV syllables from options and arranging them in correct order
- **FR-003**: System MUST allow children to segment words by marking syllable boundaries with visual dividers
- **FR-004**: System MUST present minimal pair comparisons of similar-sounding CV syllables
- **FR-005**: System MUST play audio for each CV syllable both automatically on presentation and on demand when tapped
- **FR-006**: System MUST provide immediate visual and audio feedback for correct/incorrect responses
- **FR-007**: System MUST use only CV combinations derived from letters and nikkud the child has already learned
- **FR-008**: System MUST track mastery of individual CV syllables to inform adaptive practice
- **FR-009**: System MUST display all syllable activities in proper RTL layout
- **FR-010**: System MUST integrate syllable activities into the existing curriculum progression between nikkud and word levels
- **FR-011**: System MUST support touch interactions for tablet/mobile and mouse/keyboard for desktop
- **FR-012**: System MUST provide gentle, encouraging feedback without negative reinforcement

### Existing Activity Improvements

- **FR-013**: System MUST NOT allow visual nikkud matching in quizzes - answer options must use different base letters so children cannot simply match the nikkud mark visually
- **FR-014**: System MUST group similar-sounding vowels (patach/kamatz, tsere/segol) together in teaching and avoid using them as distractors for each other in sound-based quizzes
- **FR-015**: System MUST hide nikkud names in CombinationBuilder activity to require visual recognition of the mark itself
- **FR-016**: System MUST include Holam Male (וֹ) and Shuruk (וּ) in the nikkud curriculum as full vowel variants
- **FR-017**: System MUST explicitly teach dagesh variants for Bet/Vet (בּ/ב), Kaf/Chaf (כּ/כ), Pe/Fe (פּ/פ) as distinct sounds
- **FR-018**: System MUST distinguish Shin (שׁ) from Sin (שׂ) in letter teaching and CV syllable activities
- **FR-019**: System MUST update word data to correctly represent holam male and shuruk in syllable breakdowns
- **FR-020**: System MUST NOT display any English text in user-facing screens - all prompts, hints, and instructions must be in Hebrew or use images/audio
- **FR-021**: System MUST correctly advance to the next item after completing word and sentence activities (fix progression bugs in both levels)

### Key Entities

- **CVSyllable (tseruf)**: A consonant-vowel combination unit with letter ID, nikkud ID, display text, pronunciation audio, and mastery status
- **SyllableDrill**: A structured practice session containing a set of CV syllables to practice, target accuracy threshold, and progress tracking
- **SyllablePair**: Two similar CV syllables forming a minimal pair for discrimination practice, with distinguishing feature noted (voicing, vowel height, etc.)
- **WordBlend**: A word broken into CV syllables with target order, available syllable options including distractors, and associated image/audio
- **FullVowel**: A vowel represented by Vav (holam male וֹ or shuruk וּ) with sound, teaching sequence position, and audio
- **LetterVariant**: A letter with multiple sounds based on dagesh presence (e.g., Bet has "b" variant and "v" variant)

## Success Criteria *(mandatory)*

### Measurable Outcomes

**Learning Effectiveness**
- **SC-001**: Children can correctly identify 85% of practiced CV syllables in isolation after completing drilling activities
- **SC-002**: Children can successfully build 80% of target words from syllable components in blending activities
- **SC-003**: Children can correctly segment 75% of presented words into syllables in segmentation activities
- **SC-004**: Children show improved word reading accuracy after completing syllable activities compared to before

**Engagement & Usability**
- **SC-005**: Children complete syllable drilling sessions without abandoning mid-activity 80% of the time
- **SC-006**: Average time per syllable recognition response decreases over practice sessions (automaticity)
- **SC-007**: 85% of children can use syllable activities without adult assistance after brief introduction

**Integration**
- **SC-008**: Syllable activities integrate seamlessly with existing progress tracking and reward systems
- **SC-009**: Children who complete syllable level show improved performance on word-level activities

**Existing Activity Improvements**
- **SC-010**: Nikkud quiz accuracy reflects true audio recognition (not visual matching) - verified by children unable to pass quiz with audio muted
- **SC-011**: Children no longer express confusion about patach vs kamatz or tsere vs segol in sound-based quizzes
- **SC-012**: Children can correctly read words containing holam male (וֹ) and shuruk (וּ) after completing nikkud level
- **SC-013**: Children can distinguish and correctly pronounce bet/vet, kaf/chaf, pe/fe, and shin/sin variants in context
- **SC-014**: Zero English text visible in any user-facing screen during normal gameplay
- **SC-015**: Word and sentence activities correctly advance through all items without looping or getting stuck

## Clarifications

*No clarifications yet - awaiting user feedback on specification.*

## Assumptions

- Children using these activities have completed or are progressing through the Letters and Nikkud levels
- The game already has audio files for all letter-nikkud combinations (CV syllables) from existing content
- Multi-sensory feedback can be implemented using existing animation and audio frameworks (Framer Motion, Howler.js)
- Touch/tap interactions will provide sufficient kinesthetic engagement; haptic feedback is optional enhancement
- Activities will use real Hebrew words only (no pseudo-words per user decision)

## Out of Scope

- Pseudo-word reading activities (decided against per user feedback)
- Morphological awareness activities (Phase 2 of Hebrew reading, for Grade 2+)
- Complex syllable types (CVC, CVCC, etc.) - focus is on core CV patterns
- Speech recognition for pronunciation assessment
- Handwriting or tracing activities

## Research Sources

This specification is based on current academic research (2024-2025) on Hebrew reading instruction:

- [Learning to Read and Developmental Dyslexia in Hebrew - Reading Research Quarterly 2025](https://ila.onlinelibrary.wiley.com/doi/full/10.1002/rrq.599)
- [Methods used for teaching reading in Hebrew in Israel's schools](https://www.researchgate.net/publication/340792864_Methods_used_for_teaching_reading_in_Hebrew_as_a_mother_tongue_in_Israels_schools)
- [The Phonology-Morphology Seesaw - Cohen-Mimran 2025](https://ila.onlinelibrary.wiley.com/doi/10.1002/rrq.70020)
- [Orton-Gillingham for Hebrew](https://www.oghebrew.com/)
- [DVASH Program](https://dvashprogram.com/about-dvash/)
- [Predictive Examination of Phonological Awareness Among Hebrew-Speaking Kindergarten Children](https://pmc.ncbi.nlm.nih.gov/articles/PMC6724554/)
