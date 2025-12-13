# Quickstart: Hebrew Reading Game for First Graders

**Feature Branch**: `001-hebrew-reading-game`
**Created**: 2025-12-13

## Prerequisites

- **Node.js**: v18.x or later
- **npm**: v9.x or later (comes with Node.js)
- **Git**: For version control
- **Modern browser**: Chrome, Firefox, Safari, or Edge (latest 2 versions)

## Initial Setup

### 1. Clone and Switch to Feature Branch

```bash
git clone <repository-url>
cd alef
git checkout 001-hebrew-reading-game
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Start Development Server

```bash
npm run dev
```

The game will be available at `http://localhost:5173` (default Vite port).

## Project Structure Quick Reference

```
src/
├── components/     # Reusable UI components
├── pages/          # Route-based views
├── hooks/          # Custom React hooks
├── stores/         # Zustand state management
├── data/           # Static curriculum JSON
├── utils/          # Helper functions
├── styles/         # Theme and global styles
└── assets/         # Audio, images, fonts
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with HMR |
| `npm run build` | Build production bundle |
| `npm run preview` | Preview production build locally |
| `npm run test` | Run unit tests with Vitest |
| `npm run test:ui` | Run tests with Vitest UI |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | Run ESLint |
| `npm run type-check` | Run TypeScript type checking |

## Development Workflow

### Adding a New Component

1. Create component file in appropriate `src/components/` subdirectory
2. Export from subdirectory index file
3. Write unit tests in `tests/unit/`

Example:
```typescript
// src/components/letters/LetterCard.tsx
export function LetterCard({ letter }: { letter: Letter }) {
  return (
    <div className="letter-card">
      <span className="letter">{letter.character}</span>
    </div>
  );
}
```

### Adding Curriculum Content

1. Edit JSON files in `src/data/`
2. Ensure IDs are unique
3. Add corresponding audio files to `src/assets/audio/`

### Working with RTL

All Hebrew text uses RTL layout by default. Key points:

- HTML `dir="rtl"` is set globally
- Use CSS logical properties (`margin-inline-start`, `padding-inline-end`)
- Flexbox `row` automatically reverses in RTL

### Hebrew Fonts

The project includes two Hebrew fonts in `/fonts/`:

| Font | Style | Primary Use |
|------|-------|-------------|
| **Hillel CLM** | Print/Block | Letter learning, UI text, all educational content |
| **Dana Yad AlefAlefAlef** | Cursive/Handwriting | Decorative elements, future cursive mode |

**Usage in CSS**:
```css
/* Print letters (primary) */
.letter-display {
  font-family: var(--font-hebrew-print); /* Hillel */
}

/* Cursive style (decorative) */
.handwriting-style {
  font-family: var(--font-hebrew-cursive); /* Dana Yad */
}
```

**Font Setup**: Fonts are copied to `public/fonts/` during build and loaded via `@font-face` in `src/styles/global.css`.

### Audio Guidelines

- Format: MP3 (128kbps) with WebM/Opus fallback
- Duration: 2-5 seconds per clip
- Naming: `{id}.mp3` matching entity ID
- Location: `src/assets/audio/{category}/`

## Key Files Reference

| File | Purpose |
|------|---------|
| `src/App.tsx` | Root component, routing setup |
| `src/stores/progressStore.ts` | Progress state management |
| `src/data/letters.json` | Hebrew letters data |
| `src/styles/theme.ts` | Color palette, typography |
| `src/styles/breakpoints.ts` | Responsive breakpoints |
| `src/styles/global.css` | @font-face declarations, RTL setup |
| `fonts/hillel/` | Hillel print font (TTF, WOFF) |
| `fonts/DanaYad*` | Dana Yad cursive font (OTF, WOFF, EOT) |

## Testing Strategy

### Unit Tests (Vitest)

- Test components in isolation
- Test utility functions
- Test state store actions

```bash
npm run test
```

### E2E Tests (Playwright)

- Test complete user flows
- Test across device sizes
- Test progress persistence

```bash
npm run test:e2e
```

## Responsive Development

### Breakpoints

| Name | Range | Usage |
|------|-------|-------|
| mobile | 320-767px | Single column, bottom nav |
| tablet | 768-1023px | Flexible layouts |
| desktop | 1024px+ | Sidebar nav, expanded layouts |

### Testing Responsiveness

Use browser dev tools to test:
- iPhone SE (375px)
- iPad Mini (768px)
- Desktop (1280px)

Or run Playwright tests with device emulation:
```bash
npm run test:e2e -- --project=mobile
```

## Common Tasks

### Reset Local Progress

In browser console:
```javascript
localStorage.removeItem('hebrew-reading-progress');
location.reload();
```

### Add a New Hebrew Letter

1. Add to `src/data/letters.json`:
```json
{
  "id": "alef",
  "character": "א",
  "name": "אָלֶף",
  "nameAudioUrl": "/audio/letters/alef-name.mp3",
  "soundAudioUrl": "/audio/letters/alef-sound.mp3",
  "order": 1,
  "isFinalForm": false
}
```

2. Add audio files to `src/assets/audio/letters/`

### Add a New Word

1. Add to `src/data/words.json`:
```json
{
  "id": "word-bayit",
  "text": "בַּיִת",
  "meaning": "מקום שגרים בו",
  "syllables": [
    { "text": "בַּ", "audioUrl": "/audio/syllables/ba.mp3", "position": 1 },
    { "text": "יִת", "audioUrl": "/audio/syllables/yit.mp3", "position": 2 }
  ],
  "audioUrl": "/audio/words/bayit.mp3",
  "imageUrl": "/images/words/house.webp",
  "difficulty": 1,
  "letterIds": ["bet", "yod", "tav"],
  "nikkudIds": ["patach", "chirik"]
}
```

2. Add audio and image files

## Troubleshooting

### Audio Not Playing

- Check browser audio permissions
- Verify audio files exist at specified paths
- Test in incognito mode (extensions can block audio)

### Progress Not Saving

- Check LocalStorage is not full (5MB limit)
- Verify no browser extensions blocking storage
- Check console for errors

### RTL Layout Issues

- Verify `dir="rtl"` is on html element
- Use CSS logical properties, not `left`/`right`
- Check Flexbox direction isn't explicitly set

### Fonts Not Rendering Hebrew

- Verify font files exist in `public/fonts/` (copied from `/fonts/`)
- Check Network tab for 404 errors on font files
- Verify `@font-face` declarations in `src/styles/global.css`
- Check CSS variable usage: `var(--font-hebrew-print)` or `var(--font-hebrew-cursive)`
- Test with browser dev tools > Elements > Computed > font-family to see which font is active
- Fallback chain: Hillel → Arial Hebrew → Tahoma → sans-serif

## Resources

- [Spec](./spec.md) - Feature specification
- [Plan](./plan.md) - Implementation plan
- [Data Model](./data-model.md) - Entity definitions
- [Contracts](./contracts/) - TypeScript interfaces
- [Research](./research.md) - Technical decisions

## Support

For questions or issues:
1. Check existing documentation
2. Search codebase for similar patterns
3. Create an issue with reproduction steps
