# Research: Hebrew Reading Game for First Graders

**Feature Branch**: `001-hebrew-reading-game`
**Created**: 2025-12-13
**Purpose**: Resolve technical decisions and research findings for implementation

## Technology Stack Decisions

### Frontend Framework

**Decision**: React 18.x with TypeScript 5.x

**Rationale**:
- Mature ecosystem with extensive child-friendly UI libraries
- Strong TypeScript support for type-safe development
- Large community and documentation in both English and Hebrew
- Excellent support for animations via Framer Motion
- Component-based architecture ideal for reusable game elements

**Alternatives Considered**:
- Vue 3: Good option but smaller ecosystem for educational games
- Svelte: Excellent performance but less mature tooling
- Vanilla JS: More control but significantly more development time

### Build Tool

**Decision**: Vite 5.x

**Rationale**:
- Fast development server with HMR (Hot Module Replacement)
- Optimized production builds with code splitting
- Native TypeScript support
- Simple configuration for asset handling (audio, images)
- Modern ESM-first approach

**Alternatives Considered**:
- Create React App: Slower, less flexible, maintenance mode
- Next.js: Overkill for static SPA, adds server complexity
- Parcel: Good but less ecosystem support

### State Management

**Decision**: Zustand

**Rationale**:
- Minimal boilerplate compared to Redux
- Built-in persistence middleware for LocalStorage
- TypeScript-first design
- Small bundle size (~1KB)
- Simple mental model for learning progress state

**Alternatives Considered**:
- Redux Toolkit: More powerful but overkill for single-user app
- Jotai: Good atomic approach but less suited for nested state
- React Context: Sufficient but Zustand adds persistence easily

### Animation Library

**Decision**: Framer Motion

**Rationale**:
- Declarative animation API ideal for React
- Built-in gesture support (drag, tap, hover)
- Exit animations for smooth transitions
- Spring physics for playful, bouncy animations
- Good performance with GPU acceleration

**Alternatives Considered**:
- React Spring: Similar capability but more complex API
- GSAP: Powerful but larger bundle, imperative style
- CSS animations: Limited interactivity, harder to orchestrate

### Audio Library

**Decision**: Howler.js

**Rationale**:
- Cross-browser audio compatibility
- Sprite support for multiple sounds in single file
- Simple API for play, pause, volume control
- Mobile audio unlock handling built-in
- Good TypeScript definitions

**Alternatives Considered**:
- Web Audio API directly: More control but complex
- use-sound hook: Limited features, Howler wrapper anyway
- Tone.js: Overkill, designed for music synthesis

### Testing Stack

**Decision**: Vitest + React Testing Library + Playwright

**Rationale**:
- Vitest: Fast, Vite-native, Jest-compatible API
- React Testing Library: Tests user behavior, not implementation
- Playwright: Cross-browser E2E, good mobile emulation

**Alternatives Considered**:
- Jest: Slower, requires separate config from Vite
- Cypress: Good E2E but heavier, less cross-browser

## Hebrew Typography & RTL

### Font Selection

**Decision**: Use project-provided Hebrew fonts with system fallbacks

**Primary Fonts** (located in `/fonts/`):

| Font | Style | Use Case | Formats | License |
|------|-------|----------|---------|---------|
| **Hillel CLM** | Print/Block | Letter learning, UI text, headings | TTF, WOFF | GNU-GPL |
| **Dana Yad AlefAlefAlef** | Cursive/Handwriting | Future cursive mode, decorative | EOT, OTF, WOFF | Free Font License |

**Rationale**:
- Hillel CLM: Clean, clear print-style Hebrew letters ideal for teaching letter recognition
- Dana Yad: Authentic handwriting style for potential cursive learning mode
- Both fonts have clear nikkud rendering essential for first-grade reading
- Pre-bundled fonts ensure consistent rendering across all devices
- Licensed fonts can be freely distributed with the application

**Font Files**:
```
fonts/
├── hillel/
│   ├── hillelclm-medium-webfont.ttf
│   ├── hillelclm-medium-webfont.woff
│   └── GNU-GPL (license)
├── DanaYadAlefAlefAlef-Normal.otf
├── DanaYadAlefAlefAlef-Normal.woff
├── DanaYadAlefAlefAlef-Normal.eot
└── free-font-license.pdf
```

**Implementation**:
```css
/* Primary font for letters and learning content */
@font-face {
  font-family: 'Hillel';
  src: url('/fonts/hillel/hillelclm-medium-webfont.woff') format('woff'),
       url('/fonts/hillel/hillelclm-medium-webfont.ttf') format('truetype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* Cursive font for handwriting style (optional/future use) */
@font-face {
  font-family: 'DanaYad';
  src: url('/fonts/DanaYadAlefAlefAlef-Normal.woff') format('woff'),
       url('/fonts/DanaYadAlefAlefAlef-Normal.otf') format('opentype');
  font-weight: normal;
  font-style: normal;
  font-display: swap;
}

/* Font stacks */
:root {
  --font-hebrew-print: 'Hillel', 'Arial Hebrew', 'Tahoma', sans-serif;
  --font-hebrew-cursive: 'DanaYad', 'Hillel', cursive;
  --font-ui: 'Hillel', system-ui, sans-serif;
}
```

**Usage Guidelines**:
- Use `--font-hebrew-print` (Hillel) for all letter displays, educational content, and UI
- Reserve `--font-hebrew-cursive` (Dana Yad) for decorative elements or future cursive mode
- Hillel provides excellent nikkud visibility at all sizes

### Nikkud Rendering

**Decision**: Use dedicated large font sizes with explicit line-height

**Rationale**:
- Nikkud (vowel points) render below consonants
- Small font sizes make nikkud illegible
- Minimum 48px on mobile per spec requirement
- Extra line-height prevents nikkud clipping

**Implementation Notes**:
- Use `line-height: 1.8` minimum for nikudded text
- Test with full nikkud combinations (בָּ, בֵּ, בִּ, etc.)
- Consider separate display component for learning context vs. regular text

### RTL Layout Strategy

**Decision**: HTML `dir="rtl"` with CSS logical properties

**Rationale**:
- Native RTL support via `dir` attribute
- CSS logical properties (`margin-inline-start`) adapt automatically
- Flexbox `row` becomes right-to-left automatically
- Reduces conditional RTL styling

**Implementation**:
```html
<html lang="he" dir="rtl">
```
```css
.container {
  margin-inline-start: 1rem; /* Right margin in RTL */
  padding-inline-end: 1rem;  /* Left padding in RTL */
}
```

## Audio Content Strategy

### Audio File Format

**Decision**: MP3 with WebM/Opus fallback

**Rationale**:
- MP3: Universal browser support, good compression
- WebM/Opus: Better quality at lower bitrates for modern browsers
- Both formats for optimal compatibility and size

**Specifications**:
- Sample rate: 44.1kHz
- Bit rate: 128kbps MP3, 96kbps Opus
- Mono channel (speech doesn't need stereo)
- ~2-5 seconds per pronunciation clip

### Audio Organization

**Decision**: Individual files per item, loaded on demand

**Rationale**:
- Easier to update individual pronunciations
- Progressive loading as child advances
- Audio sprites add complexity without major benefit at this scale

**File Structure**:
```
assets/audio/
├── letters/
│   ├── alef-name.mp3      # "אָלֶף" (letter name)
│   ├── alef-sound.mp3     # "ah" (letter sound)
│   ├── bet-name.mp3
│   └── ...
├── nikkud/
│   ├── kamatz.mp3         # Vowel sound
│   ├── patach.mp3
│   └── ...
├── combinations/
│   ├── bet-kamatz.mp3     # "ba" (בָּ)
│   └── ...
├── words/
│   ├── word-001.mp3       # Full word pronunciation
│   └── ...
└── effects/
    ├── correct.mp3        # Success sound
    ├── try-again.mp3      # Gentle encouragement
    ├── tap.mp3            # Button tap
    └── celebrate.mp3      # Achievement sound
```

## Responsive Design Strategy

### Breakpoint System

**Decision**: Three breakpoints matching spec requirements

| Name | Range | Target Devices |
|------|-------|----------------|
| mobile | 320-767px | Phones (iPhone SE to iPhone Pro Max) |
| tablet | 768-1023px | Tablets (iPad Mini to iPad Air) |
| desktop | 1024px+ | Laptops, desktops, large tablets |

### Navigation Adaptation

| Device | Navigation Pattern |
|--------|-------------------|
| Mobile | Bottom tab bar (4-5 items) |
| Tablet | Bottom tab bar or side navigation |
| Desktop | Sidebar navigation (expanded) |

### Touch Target Sizing

| Device | Minimum Size | Recommended Size |
|--------|--------------|------------------|
| Mobile | 44x44px | 48x48px |
| Tablet | 44x44px | 48x48px |
| Desktop | 32x32px | 40x40px |

## Progress Persistence

### Storage Strategy

**Decision**: LocalStorage with Zustand persist middleware

**Rationale**:
- Simple, synchronous API
- 5-10MB limit sufficient for progress data
- No server required
- Zustand persist handles serialization

**Data Structure**:
```typescript
interface ProgressState {
  version: number;                    // For migrations
  lettersCompleted: string[];         // Letter IDs
  nikkudCompleted: string[];          // Nikkud IDs
  wordsLearned: string[];             // Word IDs
  sentencesRead: string[];            // Sentence IDs
  currentLevel: 'letters' | 'nikkud' | 'words' | 'sentences';
  rewards: Reward[];                  // Earned badges/stars
  lastSessionDate: string;            // ISO date
  totalTimeMinutes: number;           // Engagement tracking
}
```

### Migration Strategy

**Decision**: Version field with migration functions

**Rationale**:
- LocalStorage data persists across updates
- Schema changes need migration path
- Version check on app load, migrate if needed

## Curriculum Content

### Hebrew Letters (22)

Standard order with final forms noted:
א, ב, ג, ד, ה, ו, ז, ח, ט, י, כ (ך), ל, מ (ם), נ (ן), ס, ע, פ (ף), צ (ץ), ק, ר, ש, ת

### Nikkud Marks (8 primary)

| Nikkud | Name | Sound | Example |
|--------|------|-------|---------|
| ָ | קָמָץ (Kamatz) | "a" as in "father" | בָּ |
| ַ | פַּתָח (Patach) | "a" as in "father" | בַּ |
| ֵ | צֵירֵי (Tzeirei) | "e" as in "they" | בֵּ |
| ֶ | סֶגּוֹל (Segol) | "e" as in "bed" | בֶּ |
| ִ | חִירִיק (Chirik) | "i" as in "ski" | בִּ |
| ֹ | חוֹלָם (Cholam) | "o" as in "go" | בֹּ |
| ֻ | קֻבּוּץ (Kubutz) | "u" as in "flute" | בֻּ |
| ְ | שְׁוָא (Shva) | Silent or brief "e" | בְּ |

### Word List Criteria

- 2-4 letters per word for beginners
- Common first-grade vocabulary
- Words children know orally
- Examples: אָב (father), אֵם (mother), יָד (hand), בַּיִת (house)

## Performance Optimization

### Initial Load

- Code-split by route (lazy load pages)
- Preload critical fonts
- Defer non-critical audio loading
- Target: <5 seconds to interactive

### Runtime

- Preload next lesson's audio during current activity
- Use CSS transforms for animations (GPU-accelerated)
- Virtualize long lists if needed (unlikely at this scale)
- Target: 60fps animations

### Asset Optimization

- Images: WebP with PNG fallback
- Audio: Compressed MP3/Opus
- Fonts: Subset to Hebrew + common punctuation
- Target: <5MB initial bundle
