# Specification Quality Checklist: Hebrew Reading Didactic Activities

**Purpose**: Validate specification completeness and quality before proceeding to planning
**Created**: 2025-12-15
**Updated**: 2025-12-15 (added existing activity improvements + English removal)
**Feature**: [spec.md](../spec.md)

## Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

## Requirement Completeness

- [x] No [NEEDS CLARIFICATION] markers remain
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Success criteria are technology-agnostic (no implementation details)
- [x] All acceptance scenarios are defined
- [x] Edge cases are identified
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

## Feature Readiness

- [x] All functional requirements have clear acceptance criteria
- [x] User scenarios cover primary flows
- [x] Feature meets measurable outcomes defined in Success Criteria
- [x] No implementation details leak into specification

## Notes

- All items pass validation
- Specification is ready for `/speckit.clarify` or `/speckit.plan`
- Research basis from 2024-2025 academic sources documented
- User decisions recorded: CV syllable drilling YES, pseudo-words NO

### User Stories Summary

| Priority | Story | Type |
|----------|-------|------|
| P1 | CV Syllable Drilling | New Activity |
| P2 | Syllable Blending | New Activity |
| P3 | Syllable Segmentation | New Activity |
| P4 | Minimal Pair Practice | New Activity |
| P5 | Fix Vowel Recognition Quiz Issues | Bug Fix |
| P6 | Add Missing Full Vowels (holam male, shuruk) | Enhancement |
| P7 | Remove English Instructions from UI | Bug Fix |
| P8 | Fix Activity Progression Bugs (words + sentences) | Bug Fix |
| P9 | Improve Dagesh and Letter Variant Teaching | Enhancement |

### Issues Addressed

1. **Visual matching bypass** - Quiz options allow visual nikkud matching instead of audio recognition
2. **Similar vowel confusion** - Patach/kamatz and tsere/segol sound identical in modern Hebrew
3. **Missing vowels** - Holam male (וֹ) and shuruk (וּ) not in curriculum
4. **Dagesh teaching** - Bet/vet, kaf/chaf, pe/fe variants not clearly distinguished
5. **Shin/sin distinction** - Not explicitly taught as separate sounds
6. **CombinationBuilder labels** - Shows nikkud names allowing reading instead of recognition
7. **English in UI** - WordQuiz and SentenceReader show English translations to Hebrew-speaking children
8. **Activity progression bugs** - Words: completing "ima" loops back; Sentences: cannot advance after completion

### Files with English Text to Fix

| File | Issue |
|------|-------|
| `src/pages/Words/WordGroupView.tsx:356` | `בחר את המילה: "${currentWord.translation}"` |
| `src/pages/Words/WordGroupView.tsx:361` | `translationHint={currentWord.translation}` |
| `src/components/words/WordQuiz.tsx:125` | Shows `({translationHint})` |
| `src/components/sentences/SentenceReader.tsx:89` | Shows `({translation})` |
| `src/data/words.yaml` | `translation` field (keep for data, remove from UI) |
| `src/data/sentences.yaml` | `translation` field (keep for data, remove from UI) |
