// PROTOTYPE — Nikkud Wizard Duel. Throwaway; see NOTES.md next to this file.
// Self-contained mark data + an SVG rune glyph, so the prototype doesn't depend on
// the real nikkud data model (which will be wired properly if the game is kept).

export type SoundGroup = 'a' | 'e' | 'i' | 'o' | 'u' | 'silent'

export interface Mark {
  id: string
  name: string // Hebrew name with nikkud, spoken on hit/miss
  group: SoundGroup
  vav?: 'holam' | 'shuruk' // holam male / shuruk are written with a vav
}

export const MARKS: Mark[] = [
  { id: 'kamatz', name: 'קָמָץ', group: 'a' },
  { id: 'patach', name: 'פַּתָּח', group: 'a' },
  { id: 'tzeire', name: 'צֵירֶה', group: 'e' },
  { id: 'segol', name: 'סֶגּוֹל', group: 'e' },
  { id: 'chirik', name: 'חִירִיק', group: 'i' },
  { id: 'cholam', name: 'חוֹלָם', group: 'o' },
  { id: 'holam-male', name: 'חוֹלָם מָלֵא', group: 'o', vav: 'holam' },
  { id: 'kubutz', name: 'קֻבּוּץ', group: 'u' },
  { id: 'shuruk', name: 'שׁוּרוּק', group: 'u', vav: 'shuruk' },
  { id: 'shva', name: 'שְׁוָא', group: 'silent' },
]

export const GROUPS: SoundGroup[] = ['a', 'e', 'i', 'o', 'u', 'silent']

// What the speech engine says for a vowel sound (B screens). Shva has no sound.
export const GROUP_SPOKEN: Record<SoundGroup, string> = {
  a: 'אָה',
  e: 'אֶה',
  i: 'אִי',
  o: 'אוֹ',
  u: 'אוּ',
  silent: '',
}

// Each sound is shown as a PICTURE of a Hebrew word that starts with it (he can't read, and English letters
// clash with English phonics: U sounds like "uh" = kamatz). Several words per sound, so he learns the sound,
// not "lion = kamatz". No picture may look like a nikkud mark (dot clusters, short bars) or double as a UI
// signal (ear = listen, finger = tap, lips = shh except shva's own picture) — see the spec's legibility rules. `key` names both the sprite (sprites/word-<key>.webp) and the voice lines (wiz-/mon-word-<key>).
export interface PictureWord {
  key: string
  group: SoundGroup
  he: string // spoken word (with nikkud); '' for the silent "shh" picture
}

export const WORDS: PictureWord[] = [
  { key: 'a', group: 'a', he: 'אַרְיֵה' },
  { key: 'pineapple', group: 'a', he: 'אַנָּנָס' },
  { key: 'mouse', group: 'a', he: 'עַכְבָּר' },
  { key: 'watermelon', group: 'a', he: 'אַבַּטִּיחַ' },
  { key: 'e', group: 'e', he: 'אֶפְרוֹחַ' },
  { key: 'tree', group: 'e', he: 'עֵץ' },
  { key: 'goat', group: 'e', he: 'עֵז' },
  { key: 'i', group: 'i', he: 'עִפָּרוֹן' },
  { key: 'igloo', group: 'i', he: 'אִיגְלוּ' },
  { key: 'island', group: 'i', he: 'אִי' },
  { key: 'mom', group: 'i', he: 'אִמָּא' },
  { key: 'o', group: 'o', he: 'אוֹטוֹ' },
  { key: 'bicycle', group: 'o', he: 'אוֹפַנַּיִם' },
  { key: 'ship', group: 'o', he: 'אוֹנִיָּה' },
  { key: 'hamster', group: 'o', he: 'אוֹגֵר' },
  { key: 'u', group: 'u', he: 'עוּגָה' },
  { key: 'cookie', group: 'u', he: 'עוּגִיָּה' },
  { key: 'silent', group: 'silent', he: '' },
]

export function randomWord(g: SoundGroup): PictureWord {
  const ws = WORDS.filter((w) => w.group === g)
  return ws[Math.floor(Math.random() * ws.length)]
}

const INK = '#fff6d8'
const GUIDE = 'rgba(255, 236, 190, 0.55)'

function Dot({ x, y }: { x: number; y: number }) {
  return <circle cx={x} cy={y} r={3.4} fill={INK} />
}

/** The mark alone on a dotted placeholder (circle or box); vav marks add a vav. */
export function RuneGlyph({ mark, box = false, size = 56 }: { mark: Mark; box?: boolean; size?: number }) {
  const hasVav = Boolean(mark.vav)
  const cx = hasVav ? 40 : 30 // placeholder shifts right when a vav sits to its left
  const c = 25
  const b = c + 18
  const k = mark.id
  return (
    <svg viewBox={hasVav ? '0 0 64 64' : '0 0 60 64'} width={size} height={size} aria-label={mark.name}>
      <g filter="url(#rune-glow)">
        {box ? (
          <rect x={cx - 13} y={c - 13} width={26} height={26} rx={5} fill="none" stroke={GUIDE} strokeWidth={2} strokeDasharray="4 4" />
        ) : (
          <circle cx={cx} cy={c} r={13} fill="none" stroke={GUIDE} strokeWidth={2} strokeDasharray="4 4" />
        )}
        {(k === 'patach' || k === 'kamatz') && <line x1={cx - 11} x2={cx + 11} y1={b} y2={b} stroke={INK} strokeWidth={3.4} strokeLinecap="round" />}
        {k === 'kamatz' && <line x1={cx} x2={cx} y1={b} y2={b + 10} stroke={INK} strokeWidth={3.4} strokeLinecap="round" />}
        {k === 'tzeire' && (<><Dot x={cx - 6} y={b} /><Dot x={cx + 6} y={b} /></>)}
        {k === 'segol' && (<><Dot x={cx - 7} y={b} /><Dot x={cx + 7} y={b} /><Dot x={cx} y={b + 9} /></>)}
        {k === 'chirik' && <Dot x={cx} y={b} />}
        {k === 'cholam' && <Dot x={cx - 17} y={c - 15} />}
        {k === 'kubutz' && (<><Dot x={cx - 8} y={b - 3} /><Dot x={cx} y={b + 3} /><Dot x={cx + 8} y={b + 9} /></>)}
        {k === 'shva' && (<><Dot x={cx} y={b - 3} /><Dot x={cx} y={b + 7} /></>)}
        {mark.vav && (
          // Drawn vav with a clear leftward head (like ו) — font vavs vary (some are a bare bar) and a bar + dot reads as "i".
          <>
            <polygon
              points={`5,${c - 14} 18,${c - 14} 18,${c + 15} 12.5,${c + 15} 12.5,${c - 8.5} 5,${c - 8.5}`}
              fill={INK} stroke={INK} strokeWidth={1.5} strokeLinejoin="round"
            />
            {mark.vav === 'holam' ? <Dot x={5} y={c - 21} /> : <Dot x={7} y={c + 4} />}
          </>
        )}
      </g>
    </svg>
  )
}

/** Shared SVG filter so every rune glows; render once per page. */
export function RuneGlowDefs() {
  return (
    <svg width={0} height={0} style={{ position: 'absolute' }} aria-hidden>
      <defs>
        <filter id="rune-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="1.6" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
}
