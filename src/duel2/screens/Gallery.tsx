// Screen gallery (parent area; Michael: a way to review the screens before the child plays). Each entry starts one screen at
// once, its demo first, with real audio, in a sandbox that writes no progress.
import type { RunOpts } from '../controller'

export interface GalleryEntry { id: string; label: string; force: NonNullable<RunOpts['force']> }
export const GALLERY: GalleryEntry[] = [
  { id: 'broom-letter', label: 'Broom flight — letters (hear a letter name)', force: { screen: 'broom', stage: 1, kind: 'letter', demo: true } },
  { id: 'broom-syllable', label: 'Broom flight — syllables', force: { screen: 'broom', stage: 2, kind: 'syllable', demo: true } },
  { id: 'cauldron', label: 'Cauldron — put the vowel on the letter', force: { screen: 'cauldron', stage: 2, demo: true } },
  { id: 'ladder-vowel', label: 'Ladder — the letter changes, the vowel stays', force: { screen: 'ladder', stage: 2, fixed: 'vowel', demo: true } },
  { id: 'ladder-letter', label: 'Ladder — the vowel changes, the letter stays', force: { screen: 'ladder', stage: 2, fixed: 'letter', demo: true } },
  { id: 'ladder-dot', label: 'Ladder — the dot changes the sound', force: { screen: 'ladder', stage: 3, fixed: 'dot', demo: true } },
  { id: 'ghosts-letter', label: 'Look-alike ghosts — letters', force: { screen: 'ghosts', stage: 1, kind: 'letter', demo: true } },
  { id: 'ghosts-syllable', label: 'Look-alike ghosts — syllables', force: { screen: 'ghosts', stage: 2, kind: 'syllable', demo: true } },
  { id: 'draw-print', label: 'Drawing — the first letter in print', force: { screen: 'draw', stage: 2, script: 'print', demo: true } },
  { id: 'draw-hand', label: 'Drawing — the first letter in handwriting', force: { screen: 'draw', stage: 3, script: 'hand', demo: true } },
  { id: 'doors', label: 'Door corridor — read the word', force: { screen: 'doors', stage: 4, demo: true } },
  { id: 'crystal', label: 'Crystal (the reward)', force: { screen: 'crystal', stage: 4 } },
  { id: 'dot-intro', label: 'Dotted letters — the introduction (ב/בּ, כ/כּ, פ/פּ, שׂ/שׁ)', force: { screen: 'dot', stage: 3, fixed: 'dot' } },
  { id: 'boss-dot', label: 'Flight boss — the dot thief (בּ/ב, כּ/כ, פּ/פ)', force: { screen: 'broom', stage: 3, kind: 'syllable', boss: 'dot' } },
  { id: 'boss-shin', label: 'Flight boss — the twin-headed bird (שׁ/שׂ)', force: { screen: 'broom', stage: 3, kind: 'syllable', boss: 'shin' } },
  { id: 'boss-mimic', label: 'Flight boss — the mimic (look-alike letters: ד/ר, צ/ע, …)', force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'mimic' } },
  { id: 'boss-bat', label: 'Flight boss — the o/u bat (וֹ against וּ)', force: { screen: 'broom', stage: 2, kind: 'syllable', boss: 'bat' } },
  { id: 'potion', label: 'Rescue potion (the flight starts with a heart lost; its first-time look)', force: { screen: 'broom', stage: 2, kind: 'syllable', potion: true } },
]

export function Gallery({ onBack, onStart }: { onBack: () => void; onStart: (e: GalleryEntry) => void }) {
  return (
    <div className="d2-parent">
      <button onClick={onBack} style={{ float: 'right', fontSize: 18 }}>Back</button>
      <h2>Book 2 — screens</h2>
      <p>Each screen starts at once with its demo. Nothing you do here changes his progress. Use Back (bottom right) to return.</p>
      <ul style={{ listStyle: 'none', padding: 0, display: 'grid', gap: 10, maxWidth: 560 }}>
        {GALLERY.map((e) => (
          <li key={e.id}><button data-entry={e.id} onClick={() => onStart(e)} style={{ width: '100%', padding: '12px 16px', fontSize: 17, textAlign: 'left' }}>{e.label}</button></li>
        ))}
      </ul>
    </div>
  )
}
