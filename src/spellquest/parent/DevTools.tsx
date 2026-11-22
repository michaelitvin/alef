// Spell Quest's developer tools in the parent area (on production too): the screen gallery, the stroke review and the drawing
// test board open as Spell Quest's own screens; the tower glyph sheet (its own address, read at load) only in test builds.
import type { DevToolsProps } from '../../parent/types'
import { TEST_HOOKS } from '../testHooks'

export default function SpellQuestDevTools({ openDev }: DevToolsProps) {
  return (
    <p>
      <button data-dev="gallery" onClick={() => openDev?.('gallery')}>Screens (review each screen)</button>{' '}
      <button data-dev="strokes" onClick={() => openDev?.('strokes')}>Stroke review</button>{' '}
      <button data-dev="drawtest" onClick={() => openDev?.('drawtest')}>Drawing test board</button>
      {TEST_HOOKS && <>{' '}<a data-dev="tower-glyphs" href="#/tower-glyphs"
        onClick={(e) => { e.preventDefault(); location.hash = '#/tower-glyphs'; location.reload() }}>Tower glyph sheet</a></>}
    </p>
  )
}
