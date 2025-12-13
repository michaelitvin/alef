# Implementation Plan: Hebrew Reading Game for First Graders

**Branch**: `001-hebrew-reading-game` | **Date**: 2025-12-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-hebrew-reading-game/spec.md`

## Summary

Build an interactive browser-based game that teaches Hebrew reading to first graders (ages 6-7). The curriculum progresses from letter recognition through nikkud (vowel marks) to reading words and sentences. The game features a playful, child-friendly UI with illustrated characters, delightful animations, and a reward system. It runs entirely in the browser with local progress persistence, supports RTL layout throughout, and is fully responsive across mobile, tablet, and desktop devices.

## Technical Context

**Language/Version**: TypeScript 5.x with React 18.x
**Primary Dependencies**: React, Vite (build tool), Zustand (state management), Framer Motion (animations), Howler.js (audio)
**Storage**: LocalStorage for progress persistence (no backend required)
**Testing**: Vitest + React Testing Library + Playwright (E2E)
**Target Platform**: Modern web browsers (Chrome, Firefox, Safari, Edge - last 2 versions)
**Project Type**: Single frontend web application (no backend)
**Performance Goals**: 60fps animations, <5s initial load, <100ms interaction feedback
**Constraints**: Must work offline after initial load, <5MB initial bundle, RTL-first layout
**Scale/Scope**: Single-user local app, ~10 screens/views, ~100 audio files, ~50 illustrations

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

The project constitution is not yet customized (contains template placeholders). For this greenfield project, we establish the following baseline principles:

| Principle | Status | Notes |
|-----------|--------|-------|
| Simple Architecture | PASS | Single frontend app, no backend complexity |
| Test Coverage | PASS | Unit tests for logic, E2E for user flows |
| Accessibility | PARTIAL | Basic keyboard/touch support; full a11y out of scope per spec |
| Performance | PASS | 60fps target, lazy loading, optimized assets |
| Maintainability | PASS | Component-based architecture, typed data models |

**No violations requiring justification.**

## Project Structure

### Documentation (this feature)

```text
specs/001-hebrew-reading-game/
├── spec.md              # Feature specification
├── plan.md              # This file
├── research.md          # Phase 0: Technology decisions
├── data-model.md        # Phase 1: Data structures
├── quickstart.md        # Phase 1: Developer setup guide
├── contracts/           # Phase 1: TypeScript interfaces
│   ├── entities.ts      # Core data types
│   ├── progress.ts      # Progress/state types
│   └── curriculum.ts    # Learning content types
├── checklists/          # Quality validation
│   └── requirements.md  # Spec quality checklist
└── tasks.md             # Phase 2: Implementation tasks (created by /speckit.tasks)
```

### Source Code (repository root)

```text
src/
├── components/          # Reusable UI components
│   ├── common/          # Buttons, cards, modals, feedback
│   ├── letters/         # Letter display, letter card, letter quiz
│   ├── nikkud/          # Nikkud display, combination builder
│   ├── words/           # Word display, syllable breakdown
│   ├── sentences/       # Sentence display, comprehension
│   ├── navigation/      # Header, bottom nav, sidebar
│   └── rewards/         # Stars, badges, animations
├── pages/               # Top-level views/screens
│   ├── Home/            # Landing/dashboard
│   ├── Letters/         # Letter learning module
│   ├── Nikkud/          # Nikkud learning module
│   ├── Words/           # Word reading module
│   ├── Sentences/       # Sentence reading module
│   └── Progress/        # Progress/rewards view
├── hooks/               # Custom React hooks
│   ├── useAudio.ts      # Audio playback management
│   ├── useProgress.ts   # Progress state access
│   └── useResponsive.ts # Breakpoint detection
├── stores/              # Zustand state stores
│   ├── progressStore.ts # Learning progress state
│   └── settingsStore.ts # App settings (audio on/off, etc.)
├── data/                # Static curriculum data (YAML)
│   ├── letters.yaml     # Hebrew letters with metadata
│   ├── nikkud.yaml      # Nikkud marks with metadata
│   ├── words.yaml       # Word list with syllables
│   ├── sentences.yaml   # Sentence content
│   └── activities/      # One file per activity
│       ├── letters-intro.yaml
│       ├── letters-match.yaml
│       ├── letters-quiz.yaml
│       ├── nikkud-intro.yaml
│       ├── nikkud-combine.yaml
│       ├── words-syllables.yaml
│       ├── words-picture-match.yaml
│       ├── sentences-read.yaml
│       └── sentences-comprehension.yaml
├── utils/               # Helper functions
│   ├── rtl.ts           # RTL layout helpers
│   ├── audio.ts         # Audio file management
│   └── storage.ts       # LocalStorage helpers
├── styles/              # Global styles, theme
│   ├── theme.ts         # Color palette, typography
│   ├── breakpoints.ts   # Responsive breakpoints
│   └── global.css       # Base styles, RTL setup
├── assets/              # Static assets
│   ├── audio/           # Pronunciation files
│   │   ├── letters/     # Letter name + sound audio
│   │   ├── nikkud/      # Nikkud pronunciation
│   │   ├── words/       # Word pronunciation
│   │   └── effects/     # UI sound effects
│   └── images/          # Illustrations, backgrounds
│       ├── characters/  # Mascot illustrations
│       ├── rewards/     # Badge/star graphics
│       └── words/       # Word illustrations
├── App.tsx              # Root component, routing
├── main.tsx             # Entry point
└── index.html           # HTML shell

fonts/                   # Hebrew fonts (project root)
├── hillel/              # Print/block letter font
│   ├── hillelclm-medium-webfont.ttf
│   ├── hillelclm-medium-webfont.woff
│   └── GNU-GPL          # License file
└── danayad/             # Cursive font
    ├── DanaYadAlefAlefAlef-Normal.otf
    ├── DanaYadAlefAlefAlef-Normal.woff
    ├── DanaYadAlefAlefAlef-Normal.eot
    └── free-font-license.pdf

tests/
├── unit/                # Component and utility tests
├── integration/         # Store and hook tests
└── e2e/                 # Playwright end-to-end tests
    ├── letters.spec.ts  # Letter learning flows
    ├── progress.spec.ts # Progress persistence
    └── responsive.spec.ts # Device size tests

public/
├── fonts/               # Fonts copied here for serving
├── manifest.json        # PWA manifest (optional)
└── favicon.ico          # App icon
```

**Structure Decision**: Single frontend application using Vite + React. No backend required as all data is static (curriculum content) and progress is stored locally. This minimizes complexity while meeting all requirements.

## Complexity Tracking

> No violations to justify. Architecture is minimal for requirements.

| Aspect | Decision | Rationale |
|--------|----------|-----------|
| No backend | LocalStorage only | Single-user app, no sync needed |
| No database | JSON files | Static curriculum, ~100 items |
| Single bundle | Code-split by route | Simple deploy, lazy load pages |

## Deployment

**Platform**: GitHub Pages (free static hosting)
**URL**: `https://<username>.github.io/alef/` (or custom domain if configured)

### Vite Configuration

```typescript
// vite.config.ts
export default defineConfig({
  base: '/alef/',  // Repository name for GitHub Pages subpath
  plugins: [react()],
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
  },
})
```

### GitHub Actions Workflow

```yaml
# .github/workflows/deploy.yml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: 'pages'
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
          cache: 'npm'
      - run: npm ci
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: './dist'

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
        id: deployment
```

### Repository Settings

1. Go to repository **Settings** → **Pages**
2. Under **Source**, select **GitHub Actions**
3. The workflow will auto-deploy on push to `main`

### Router Configuration

Use hash-based routing for GitHub Pages compatibility (avoids 404 on direct URL access):

```typescript
// src/App.tsx
import { HashRouter } from 'react-router-dom'
// Use <HashRouter> instead of <BrowserRouter>
```

## Audio Strategy

**Provider**: ElevenLabs TTS API
**Model**: `eleven_v3` (latest, best Hebrew pronunciation)
**Voice**: Jessica (`cgSgspJ2msm6clMCkdW9`)
**Alternative**: Sarah (`EXAVITQu4vr4xnSDxMaL`) - also good Hebrew pronunciation

### API Configuration

```typescript
const ELEVENLABS_CONFIG = {
  voiceId: 'cgSgspJ2msm6clMCkdW9', // Jessica
  modelId: 'eleven_v3',
  apiEndpoint: 'https://api.elevenlabs.io/v1/text-to-speech'
}
```

### Audio Generation

**Approach**: Pre-generate all audio files during development, commit to repository. No runtime TTS.

Benefits:
- Zero API costs during gameplay
- Instant playback (no latency)
- Works fully offline
- No API key needed in production

**Generation Script**: `scripts/generate-audio.ts`
- Reads curriculum data (letters, nikkud, words, sentences)
- Calls ElevenLabs API for each item
- Saves MP3 files to `src/assets/audio/`
- Requires `ELEVENLABS_API_KEY` in `.env`

```bash
# One-time generation during development
npm run generate-audio
```

### Content to Generate

| Category | Count | Examples |
|----------|-------|----------|
| Letter names | 27 | אָלֶף, בֵּית, ... כָּף סוֹפִית |
| Letter sounds | 27 | א, ב, ג... ך, ם, ן, ף, ץ |
| Nikkud names | 8 | קָמָץ, פַּתָח, צֵירֵי... |
| Letter+nikkud combos | ~216 | בָּ, בַּ, בִּ, בֵּ... (27×8) |
| Words | ~400 | אִמָּא, אַבָּא, כֶּלֶב... |
| Sentences | ~200 | הַכֶּלֶב רָץ בַּגַּן... |
| UI sounds | ~10 | Success, error, click... |

**Estimated total**: ~900 audio files

### Audio Rollout

**Phase 1 - MVP** (~100 files):
| Category | Count | Scope |
|----------|-------|-------|
| Letter names | 27 | All letters + sofiyot |
| Letter sounds | 27 | All letters + sofiyot |
| Nikkud names | 8 | All nikkud |
| Letter+nikkud | 40 | Common combos (בּ with all nikkud, + 4 other letters) |
| Words | 20 | First 2 word nodes |
| Sentences | 10 | First sentence node |
| UI sounds | 5 | Essential feedback |

**Phase 2 - Full** (~800 remaining files):
- Generate after validation with real user
- Track recorded vs. pending in `src/data/audio-manifest.yaml`

```yaml
# audio-manifest.yaml
letters:
  alef:
    name: { file: "alef-name.mp3", status: "recorded" }
    sound: { file: "alef-sound.mp3", status: "recorded" }
  bet:
    name: { file: "bet-name.mp3", status: "recorded" }
    sound: { file: "bet-sound.mp3", status: "pending" }  # not yet generated
```

**Fallback**: If audio missing, show visual-only mode (no crash).

### Audio Loading Strategy

**Approach**: Per-node loading with background preloading.

```
App start → Load node 1 audio (~1MB)
Playing   → Preload next 2 nodes in background
Advance   → Audio already cached
Jump back → Check cache, load if missing
```

**Implementation**:
- Service worker for persistent caching
- Preload next 2 nodes while playing current node
- Cache persists between sessions
- Subtle loading indicator only on cache miss
- Target: zero audio delay during gameplay

## Activity Randomness

**Level**: Moderate - enough variety to prevent memorization, predictable enough to build confidence.

| Aspect | Behavior |
|--------|----------|
| Item order | Shuffled each session |
| Option positions | Randomized (correct answer not always first) |
| Item selection | All items from activity file |
| Distractors | Fixed per item (defined in YAML) |
| Difficulty | Static (no adaptive adjustment) |

## Progress Visualization

**Style**: Journey Path - child moves along a visual path, unlocking sections.

```
[א]──[ב]──[ג]──[ד]──🔒──🔒──🔒
 ✓    ✓    ●
```

### Progression Model

**Philosophy**: Mastery-based with player agency. Large item pools, child chooses when ready to advance.

```
Level: Letters ────────────────────────────────────────
  Node: א ──→ Node: ב ──→ Node: ג ──→ ... ──→ Node: ת
         │
         └── Activities (large item pool, ~20-30 items each)
             Child practices until confident, then moves on
```

### Level Unlock Rules

| Level | Unlock Condition |
|-------|------------------|
| Letters | Always unlocked (starting level) |
| Nikkud | 80% success rate across all letter nodes |
| Words | 80% success rate across all nikkud nodes |
| Sentences | 80% success rate across all word nodes |

### Node Progression

- **Sequential**: Must complete nodes in order within a level
- **Jump back**: Can replay any previous node anytime
- **Self-paced**: Child decides when to move to next node (no forced completion)
- **Success tracked**: Each node tracks success rate from all attempts

### Item Pool Size

| Level | Nodes | Items per activity | Activities/node | Total Items |
|-------|-------|-------------------|-----------------|-------------|
| Letters | 27 (22 + 5 sofiyot) | 25 | 3 | 2,025 |
| Nikkud | 8 | 30 | 3 | 720 |
| Words | 25 | 30 | 2 | 1,500 |
| Sentences | 15 | 25 | 2 | 750 |
| **Total** | **75** | - | **155** | **~5,000** |

**Sofiyot (final letters)**: ך ם ן ף ץ - taught as separate nodes after their regular forms.

### Node States

| State | Visual | Meaning |
|-------|--------|---------|
| Locked | 🔒 (greyed, padlock) | Previous node not started |
| Available | Glowing, bouncing | Ready to learn |
| In Progress | Pulsing, partial fill | Started, can continue |
| Mastered | ✓ checkmark, star | High success rate |

### Interaction
- Tap any unlocked node to practice
- "Next" button appears when child is ready to advance
- Progress bar shows success rate per node
- Level unlock celebration when threshold reached
- Path scrolls horizontally (RTL direction)
