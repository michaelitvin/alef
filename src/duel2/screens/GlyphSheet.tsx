// Legibility sheet (test builds only): every syllable and letter at game size on an orb, to look for shapes that read as a
// Latin letter, a digit or punctuation (rule).
import { ITEMS, syllablesOfStage } from '../logic/content'
import { Glyph, GlyphDefs, latinOrbPx } from '../components/Glyph'
import { useCourse } from '../course/CourseContext'

export function GlyphSheet() {
  const course = useCourse()
  const latin = !!course.sheetTexts
  const texts = course.sheetTexts ?? [...ITEMS.map((i) => i.glyph), ...syllablesOfStage(3).map((s) => s.text)]
  const per = 10
  const cell = 160
  const rows = Math.ceil(texts.length / per)
  return (
    <div data-course={course.id} style={{ overflow: 'auto', height: '100%', background: '#160a35' }}>
      <svg data-sheet viewBox={`0 0 ${per * cell} ${rows * cell}`} width={per * cell} height={rows * cell}>
        <GlyphDefs />
        {texts.map((t, i) => {
          const x = (latin ? i % per : per - 1 - (i % per)) * cell + cell / 2
          const y = Math.floor(i / per) * cell + cell / 2
          return (
            <g key={i}>
              <circle cx={x} cy={y} r={cell * 0.42} fill="#2a1660" stroke="#ffd34d" strokeWidth={4} />
              <Glyph text={t} px={latin ? latinOrbPx(t, cell * 0.84, 92) : 92} x={x} y={y} alphabet={latin ? 'latin' : 'hebrew'} />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
