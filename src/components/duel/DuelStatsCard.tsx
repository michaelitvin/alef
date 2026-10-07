// Parent stats for the Nikkud Wizard Duel (ProgressPage). Parent-facing, so text is fine here.
import { motion } from 'framer-motion'
import { colors, typography, spacing, borderRadius, shadows } from '../../styles/theme'
import { useProgressStore } from '../../stores/progressStore'
import { DUEL_MARKS } from '../../utils/duel/marks'
import type { ScreenType, Tally } from '../../types/duel'
import { RuneGlyph } from './RuneGlyph'
import { exportTelemetry, telemetryCount } from '../../utils/duel/telemetry'

// Screens in the game (the picture-choice screen D was dropped, so it has no row).
const TYPE_NAMES: Partial<Record<ScreenType, string>> = { A: 'תמונה ← ניקוד', B: 'צליל ← ניקוד', C: 'שם ← ניקוד' }
const COLS: { key: keyof Tally | 'correctPct'; label: string }[] = [
  { key: 'seen', label: 'הופיע' },
  { key: 'correctPct', label: 'נכון' },
  { key: 'wrong', label: 'טעות' },
  { key: 'timeout', label: 'איטי מדי' },
  { key: 'twin', label: 'תאום (נסלח)' },
  { key: 'mega', label: 'מגה' },
]

const cell = (t: Tally | undefined, key: (typeof COLS)[number]['key']) => {
  if (key === 'correctPct') return t && t.seen ? `${Math.round((100 * t.correct) / t.seen)}%` : '—'
  return String(t?.[key] ?? 0)
}
const misses = (t?: Tally) => (t ? t.wrong + t.timeout : -1)

/** Download the duel telemetry log (every round, tap, latency and asset) for offline analysis. */
function downloadTelemetry() {
  const url = URL.createObjectURL(new Blob([exportTelemetry()], { type: 'application/json' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `alef-duel-telemetry-${new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-')}.json`
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

const th: React.CSSProperties = { padding: spacing[1], fontWeight: typography.fontWeight.semibold, color: colors.text.secondary, fontSize: typography.fontSize.sm }
const td: React.CSSProperties = { padding: spacing[1], textAlign: 'center', fontSize: typography.fontSize.sm, borderTop: `1px solid ${colors.neutral[200]}` }

export function DuelStatsCard() {
  const d = useProgressStore((s) => s.duel)
  const rows = [...DUEL_MARKS].sort((a, b) => misses(d.byMark[b.id]) - misses(d.byMark[a.id]))
  return (
    <motion.section
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ delay: 0.35 }}
      style={{ backgroundColor: colors.surface, borderRadius: borderRadius.xl, padding: spacing[4], boxShadow: shadows.md }}
    >
      <h2 style={{ fontFamily: typography.fontFamily.hebrew, fontSize: typography.fontSize.xl, fontWeight: typography.fontWeight.bold, color: colors.text.primary, marginBottom: spacing[3], textAlign: 'center' }}>
        ⚔️ דּוּ־קְרַב
      </h2>
      {d.sessions === 0 ? (
        <p style={{ textAlign: 'center', color: colors.text.secondary, fontFamily: typography.fontFamily.hebrew }}>עוד לא שיחקו</p>
      ) : (
        <>
          <p style={{ textAlign: 'center', color: colors.text.secondary, fontFamily: typography.fontFamily.hebrew, marginBottom: spacing[3] }}>
            {d.sessions} משחקים · {Math.round(d.roundsMs / 60000)} דקות · שיא {d.bestScore.toLocaleString('en-US')} נקודות · גל {d.bestWave}
          </p>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: typography.fontFamily.hebrew }}>
              <thead>
                <tr>
                  <th style={th}>ניקוד</th>
                  {COLS.map((c) => <th key={c.key} style={th}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {rows.map((m) => {
                  const t = d.byMark[m.id]
                  return (
                    <tr key={m.id} data-mark={m.id}>
                      <td style={{ ...td, textAlign: 'start', whiteSpace: 'nowrap', background: '#1f1546', color: '#fff6d8' }}>
                        <RuneGlyph mark={m} size={28} /> {m.name}
                      </td>
                      {COLS.map((c) => <td key={c.key} style={td} data-col={c.key === 'correctPct' ? 'correct' : c.key}>{cell(t, c.key)}</td>)}
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontFamily: typography.fontFamily.hebrew, marginTop: spacing[4] }}>
              <thead>
                <tr>
                  <th style={th}>מסך</th>
                  {COLS.map((c) => <th key={c.key} style={th}>{c.label}</th>)}
                </tr>
              </thead>
              <tbody>
                {(['A', 'B', 'C'] as const).map((k) => (
                  <tr key={k} data-type={k}>
                    <td style={{ ...td, textAlign: 'start' }}>{TYPE_NAMES[k]}</td>
                    {COLS.map((c) => <td key={c.key} style={td} data-col={c.key === 'correctPct' ? 'correct' : c.key}>{cell(d.byType[k], c.key)}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ textAlign: 'center', marginTop: spacing[3] }}>
            <button
              onClick={downloadTelemetry}
              style={{ fontFamily: typography.fontFamily.hebrew, fontSize: typography.fontSize.sm, padding: `${spacing[1]} ${spacing[3]}`, borderRadius: borderRadius.lg, border: `1px solid ${colors.neutral[300]}`, background: colors.surface, color: colors.text.secondary, cursor: 'pointer' }}
            >
              ⬇ ייצוא נתוני משחק ({telemetryCount().toLocaleString('en-US')} אירועים)
            </button>
          </div>
        </>
      )}
    </motion.section>
  )
}
