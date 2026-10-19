// Book 2: letters and syllables, a separate app in the alef repo (spec: docs/superpowers/specs/2026-10-19-duel-book-2-design.md).
import { GlyphSheet } from './screens/GlyphSheet'
import { TEST_HOOKS } from './testHooks'

export default function Duel2App() {
  if (TEST_HOOKS && location.hash === '#/glyphs') return <div className="d2-root"><GlyphSheet /></div>
  return <div className="d2-root" data-screen="cover" />
}
