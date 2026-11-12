// "פעילויות נוספות" (spec: one duel, Part 4): the six older activities as one row of small round icons, with a lock on
// the locked ones (a shelf, not a collapsed section: he can't read a "more" bar). The small labels are for the parent.
import { useNavigate } from 'react-router-dom'
import { useProgressStore } from '../../stores/progressStore'
import { LevelIcon, LockBadge, type LevelKind } from './LevelIcons'

const LEVELS: { id: LevelKind; label: string; path: string }[] = [
  { id: 'letters', label: 'אותיות', path: '/letters' },
  { id: 'nikkud', label: 'ניקוד', path: '/nikkud' },
  { id: 'syllables', label: 'צירופים', path: '/syllables' },
  { id: 'words', label: 'מילים', path: '/words' },
  { id: 'sentences', label: 'משפטים', path: '/sentences' },
  { id: 'stories', label: 'סיפורים', path: '/stories' },
]

export function LevelShelf() {
  const navigate = useNavigate()
  const isLevelUnlocked = useProgressStore((s) => s.isLevelUnlocked)
  // subscribe to the nodes so that an unlock shows at once
  useProgressStore((s) => s.nodes)
  return (
    <div data-home-part="shelf">
      <div className="home-shelfh">פעילויות נוספות</div>
      <div className="home-shelf">
        {LEVELS.map((l) => {
          // stories are always open (as before)
          const open = l.id === 'stories' || isLevelUnlocked(l.id)
          return (
            <button key={l.id} type="button" className={`home-si${open ? '' : ' locked'}`} data-level={l.id} data-open={String(open)}
              aria-label={l.label} aria-disabled={!open || undefined} onClick={() => { if (open) navigate(l.path) }}>
              <div className="home-sd"><LevelIcon kind={l.id} />{!open && <LockBadge />}</div>
              <div className="home-sl">{l.label}</div>
            </button>
          )
        })}
      </div>
    </div>
  )
}
