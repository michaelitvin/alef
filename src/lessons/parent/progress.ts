// The lessons' progress lists for the parent area's Progress section, from the raw save: the per-level progress and the
// achievements. They were the child's progress page (#/progress), which showed them in Hebrew text on a child screen.
// Light on purpose (types only, no store): parent/index.ts imports it.
import { persistedState, type ProgressDetail } from '../../parent/types'
import type { ProgressState } from '../../types/progress'

/** each level's total, as the old progress page counted it (the letters count learned letters, the others mastered nodes) */
const LEVELS = [
  { id: 'letters', title: 'Letters', total: 27 },
  { id: 'nikkud', title: 'Nikkud', total: 8 },
  { id: 'words', title: 'Words', total: 8 },
  { id: 'sentences', title: 'Sentences', total: 6 },
] as const

type Counts = { letters: number; nikkud: number; words: number; accuracy: number; sessions: number }

/** the old page's achievements: a goal on one count */
const ACHIEVEMENTS: { title: string; key: keyof Counts; goal: number }[] = [
  { title: '1 letter', key: 'letters', goal: 1 },
  { title: '5 letters', key: 'letters', goal: 5 },
  { title: '10 letters', key: 'letters', goal: 10 },
  { title: 'All 27 letters', key: 'letters', goal: 27 },
  { title: '1 nikkud mark', key: 'nikkud', goal: 1 },
  { title: 'All 8 nikkud marks', key: 'nikkud', goal: 8 },
  { title: '1 word group', key: 'words', goal: 1 },
  { title: '10 word groups', key: 'words', goal: 10 },
  { title: '90% accuracy', key: 'accuracy', goal: 0.9 },
  { title: '3 sessions', key: 'sessions', goal: 3 },
]

const pct = (x: number) => `${Math.round(x * 100)}%`

export function lessonsDetails(raw: string | null): ProgressDetail[] {
  const s = persistedState<ProgressState>(raw)
  if (!s?.stats) return []
  const mastered = (id: string) => s.levels?.[id]?.nodesMastered ?? 0
  const c: Counts = {
    letters: s.stats.lettersLearned ?? 0, nikkud: mastered('nikkud'), words: mastered('words'),
    accuracy: s.stats.accuracy ?? 0, sessions: s.stats.sessionCount ?? 0,
  }
  const learned = (id: string) => (id === 'letters' ? c.letters : mastered(id))
  const levels = LEVELS.map((l) => `${l.title}: ${learned(l.id)} of ${l.total} (${pct(Math.min(learned(l.id) / l.total, 1))})`)
  const done = ACHIEVEMENTS.filter((a) => c[a.key] >= a.goal).length
  const achievements = ACHIEVEMENTS.map((a) => `${a.title}: ${c[a.key] >= a.goal ? 'done' : a.key === 'accuracy' ? `now ${pct(c.accuracy)}` : `${c[a.key]} of ${a.goal}`}`)
  return [
    { id: 'levels', title: 'Levels', items: levels },
    { id: 'achievements', title: `Achievements: ${done} of ${ACHIEVEMENTS.length}`, items: achievements },
  ]
}
