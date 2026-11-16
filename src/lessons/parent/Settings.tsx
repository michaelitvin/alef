// The lessons' section in the parent area: the font of the letters (print or handwriting).
import { fonts } from '../../styles/theme'
import type { FontType } from '../../types/progress'
import { useProgressStore } from '../../stores/progressStore'

const FONT_OPTIONS: { id: FontType; name: string }[] = [
  { id: 'default', name: 'Print (דפוס)' },
  { id: 'cursive', name: 'Handwriting (כתב יד)' },
]

export default function LessonsSettings() {
  const font = useProgressStore((s) => s.settings.font)
  const setFont = useProgressStore((s) => s.setFont)
  return (
    <>
      <h3>Font</h3>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {FONT_OPTIONS.map((o) => (
          <button key={o.id} type="button" data-font={o.id} aria-pressed={font === o.id} onClick={() => setFont(o.id)}
            style={{ padding: '10px 16px', borderRadius: 12, border: `2px solid ${font === o.id ? '#6d4cc2' : '#ccc'}`, background: font === o.id ? '#efe9ff' : '#fff', cursor: 'pointer' }}>
            <span style={{ fontFamily: fonts[o.id], fontSize: 30, display: 'block' }} dir="rtl">אָלֶף</span>
            <span>{o.name}</span>
          </button>
        ))}
      </div>
    </>
  )
}
