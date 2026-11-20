// Screen gallery (parent area; Michael: a way to review the screens before the child plays). Each entry starts one screen at
// once, its demo first, with real audio, in a sandbox that writes no progress.
import type { RunOpts } from '../controller'
import { useCourse } from '../course/CourseContext'
import type { CourseId } from '../course/types'
import { HEBREW_SPELL_AVAILABLE } from '../../shared/hebrewSpell'

export interface GalleryEntry {
  id: string; label: string; force: NonNullable<RunOpts['force']>
  /** listed only on these courses' pages (unset: every course) */
  courses?: CourseId[]
  /** the English page's own label and force (merged over the entry's): its bosses open at their own stages and their families are English */
  en?: { label?: string; force?: Partial<NonNullable<RunOpts['force']>> }
}
/** the entries listed on `course`'s page, each with that course's label and force */
export const galleryFor = (course: CourseId): GalleryEntry[] => GALLERY
  .filter((e) => !e.courses || e.courses.includes(course))
  // (the Hebrew spell book is listed only where it is out: src/shared/hebrewSpell.ts)
  .filter((e) => course !== 'he' || HEBREW_SPELL_AVAILABLE || e.force.screen !== 'spell')
  .map((e) => (course === 'en' && e.en ? { ...e, label: e.en.label ?? e.label, force: { ...e.force, ...e.en.force } } : e))
export const GALLERY: GalleryEntry[] = [
  { id: 'tower', label: 'Tower — two waves (the first duel, in the run)', force: { screen: 'tower', stage: 1 } },
  { id: 'tower-boss', label: 'Tower — boss', force: { screen: 'tower', stage: 1, towerBoss: true } },
  { id: 'broom-letter', label: 'Broom flight — letters (hear a letter name)', force: { screen: 'broom', stage: 1, kind: 'letter', demo: true } },
  { id: 'broom-syllable', label: 'Broom flight — syllables', force: { screen: 'broom', stage: 2, kind: 'syllable', demo: true } },
  { id: 'cauldron', label: 'Cauldron — put the vowel on the letter', force: { screen: 'cauldron', stage: 2, demo: true } },
  { id: 'ladder-vowel', label: 'Ladder — the letter changes, the vowel stays', force: { screen: 'ladder', stage: 2, fixed: 'vowel', demo: true } },
  { id: 'ladder-letter', label: 'Ladder — the vowel changes, the letter stays', force: { screen: 'ladder', stage: 2, fixed: 'letter', demo: true } },
  { id: 'ladder-dot', label: 'Ladder — the dot changes the sound', force: { screen: 'ladder', stage: 3, fixed: 'dot', demo: true } },
  { id: 'ghosts-letter', label: 'Look-alike ghosts — letters', force: { screen: 'ghosts', stage: 1, kind: 'letter', demo: true } },
  { id: 'ghosts-syllable', label: 'Look-alike ghosts — syllables', force: { screen: 'ghosts', stage: 2, kind: 'syllable', demo: true } },
  { id: 'draw-print', label: 'Drawing — the first letter in print', force: { screen: 'draw', stage: 2, demo: true } },
  { id: 'draw-hand', label: 'Drawing — the first letter in handwriting', force: { screen: 'draw-hand', stage: 3, demo: true }, courses: ['he'] },
  { id: 'doors', label: 'Door corridor — read the word', force: { screen: 'doors', stage: 4, demo: true } },
  { id: 'spell', label: 'Spell book — put each sound in its box', force: { screen: 'spell', stage: 4, demo: true } },
  { id: 'spell-long', label: 'Spell book — the longest word (5 boxes)', force: { screen: 'spell', stage: 4, demo: true, longSpell: true }, courses: ['en'] },
  { id: 'spell-write', label: 'Spell book — a written word, the longest (7 letters)', force: { screen: 'spell', stage: 4, demo: true, longSpell: 'write' }, courses: ['en'] },
  { id: 'crystal', label: 'Crystal (the reward)', force: { screen: 'crystal', stage: 4 } },
  { id: 'dot-intro', label: 'Dotted letters — the introduction (ב/בּ, כ/כּ, פ/פּ, שׂ/שׁ)', force: { screen: 'dot', stage: 3, fixed: 'dot' }, courses: ['he'] },
  { id: 'boss-dot', label: 'Flight boss — the dot thief (בּ/ב, כּ/כ, פּ/פ)', force: { screen: 'broom', stage: 3, kind: 'syllable', boss: 'dot' },
    en: { label: 'Flight boss — the word thief (words one sound apart: ship · chip)' } },
  { id: 'boss-shin', label: 'Flight boss — the twin-headed bird (שׁ/שׂ)', force: { screen: 'broom', stage: 3, kind: 'syllable', boss: 'shin' },
    en: { label: 'Flight boss — the two-headed bird (sh, ch, th)', force: { stage: 4 } } },
  { id: 'boss-mimic', label: 'Flight boss — the mimic (look-alike letters: ד/ר, צ/ע, …)', force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'mimic' },
    en: { label: 'Flight boss — the mimic (look-alike letters: b d p, n u, …)' } },
  { id: 'boss-bat', label: 'Flight boss — the o/u bat (וֹ against וּ)', force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'bat' },
    en: { label: 'Flight boss — the bat (the short vowels a e i o u)' } },
  { id: 'merchant', label: 'Merchant — buy a heart with exact coins (1 heart, 40 coins; his first-visit demo)', force: { screen: 'merchant', stage: 2, demo: true } },
]

export function Gallery({ onBack, onStart }: { onBack: () => void; onStart: (e: GalleryEntry) => void }) {
  const course = useCourse()
  return (
    <div className="d2-parent">
      <button onClick={onBack} style={{ float: 'right', fontSize: 18 }}>Back</button>
      <h2>Book 2 — screens</h2>
      <p>Each screen starts at once with its demo. Nothing you do here changes his progress. Use Back (bottom right) to return.</p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 10, maxWidth: 560 }}>
        {galleryFor(course.id).map((e) => (
          <li key={e.id}><button data-entry={e.id} onClick={() => onStart(e)} style={{ width: '100%', padding: '12px 16px', fontSize: 17, textAlign: 'left' }}>{e.label}</button></li>
        ))}
      </ul>
    </div>
  )
}
