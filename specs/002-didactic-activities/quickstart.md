# Quickstart: Hebrew Reading Didactic Activities

**Feature**: 002-didactic-activities
**Date**: 2025-12-15

## Prerequisites

- Node.js 18+
- npm or pnpm

## Setup

```bash
# Clone and enter directory
cd /home/ml/projects/alef

# Install dependencies
npm install

# Start dev server
npm run dev
```

App runs at `http://localhost:5173`

## Project Structure Quick Reference

```
src/
├── components/         # React components by feature
│   ├── syllables/      # NEW: Add here
├── data/               # YAML data files
│   ├── syllables.yaml  # NEW: Create this
├── pages/              # Route pages
│   ├── Syllables/      # NEW: Add here
├── stores/             # Zustand stores
├── types/              # TypeScript types
└── hooks/              # Custom React hooks
```

## Key Files to Modify

### Bug Fixes First

1. **Fix progression bugs**:
   - `src/pages/Words/WordGroupView.tsx`
   - `src/pages/Sentences/SentenceGroupView.tsx`

2. **Remove English**:
   - `src/components/words/WordQuiz.tsx` - remove `translationHint`
   - `src/components/sentences/SentenceReader.tsx` - remove `translation`

3. **Fix nikkud quiz**:
   - `src/components/nikkud/NikkudQuiz.tsx` - different letters in options
   - `src/components/nikkud/CombinationBuilder.tsx` - hide names

### Data Updates

4. **Add missing vowels**:
   - `src/data/nikkud.yaml` - add holam male, shuruk

5. **Add letter variants**:
   - `src/data/letters.yaml` - add dagesh variants, shin/sin

### New Features

6. **Create syllables data**:
   - `src/data/syllables.yaml`

7. **Create syllable components**:
   - `src/components/syllables/SyllableDrill.tsx`
   - `src/components/syllables/SyllableBlend.tsx`
   - `src/components/syllables/SyllableSegment.tsx`
   - `src/components/syllables/MinimalPairPractice.tsx`

8. **Create syllables pages**:
   - `src/pages/Syllables/SyllablesLevelView.tsx`
   - `src/pages/Syllables/SyllableNodeView.tsx`

9. **Update types**:
   - `src/types/entities.ts` - add CVSyllable, etc.
   - `src/types/progress.ts` - add syllables level

10. **Update progress store**:
    - `src/stores/progressStore.ts` - add syllables level unlock

## Development Commands

```bash
# Development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Lint
npm run lint
```

## Testing

Currently manual testing only. To test:

1. Start dev server
2. Navigate through activities
3. Verify:
   - Progression advances correctly (no loops)
   - No English text visible
   - Nikkud quiz uses different letters
   - New syllable activities work

## Audio Files

Audio for syllables can be generated using:
- `scripts/generate-audio.ts` (existing TTS script)
- Or manually recorded and placed in `public/audio/syllables/`

## Existing Patterns to Follow

### Component Structure
```tsx
// Follow existing pattern from src/components/nikkud/NikkudQuiz.tsx
export interface ComponentProps {
  // Props interface
}

export function Component({ prop1, prop2 }: ComponentProps) {
  // State
  const [state, setState] = useState()

  // Audio hook
  const { play } = useAudio()

  // Render
  return (
    <motion.div>
      {/* Framer Motion animations */}
    </motion.div>
  )
}
```

### Data Loading
```tsx
// YAML imports via vite plugin
import lettersData from '../data/letters.yaml'
import nikkudData from '../data/nikkud.yaml'
```

### Progress Tracking
```tsx
// Use Zustand store
const { recordAttempt, getNodeProgress } = useProgressStore()
```
