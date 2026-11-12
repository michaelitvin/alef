// The older activities' round icons on the home shelf, redrawn as SVG (rule: no emoji): letters, nikkud and syllables
// are their glyphs in the Sigalit font; words, sentences and stories are small drawings. The lock is an SVG padlock.
export type LevelKind = 'letters' | 'nikkud' | 'syllables' | 'words' | 'sentences' | 'stories'

const GLYPH: Partial<Record<LevelKind, string>> = { letters: 'א', nikkud: 'בָ', syllables: 'בָּ' }
const INK = '#3b1d6e'

/** an open book (words) */
function Book() {
  return (
    <svg viewBox="0 0 40 40" className="home-level-svg" aria-hidden>
      <path d="M20 11 C15 8 9 8 5 9 V31 C9 30 15 30 20 33 Z" fill="#fff8e7" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M20 11 C25 8 31 8 35 9 V31 C31 30 25 30 20 33 Z" fill="#fff8e7" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M9 15 H16 M9 19 H16 M24 15 H31 M24 19 H31 M24 23 H29" stroke="#c9a24a" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  )
}
/** a page with lines (sentences) */
function Page() {
  return (
    <svg viewBox="0 0 40 40" className="home-level-svg" aria-hidden>
      <path d="M10 5 H25 L31 11 V35 H10 Z" fill="#fff8e7" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M25 5 V11 H31" fill="none" stroke={INK} strokeWidth="2" strokeLinejoin="round" />
      <path d="M14 16 H27 M14 21 H27 M14 26 H27 M18 31 H27" stroke="#c9a24a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  )
}
/** a stack of books (stories) */
function Stack() {
  return (
    <svg viewBox="0 0 40 40" className="home-level-svg" aria-hidden>
      <rect x="6" y="27" width="28" height="7" rx="1.5" fill="#c0392b" stroke={INK} strokeWidth="2" />
      <rect x="9" y="19" width="24" height="7" rx="1.5" fill="#1f5fa8" stroke={INK} strokeWidth="2" />
      <rect x="7" y="11" width="25" height="7" rx="1.5" fill="#e0b26a" stroke={INK} strokeWidth="2" transform="rotate(-6 19 14)" />
      <path d="M10 30.5 H28 M13 22.5 H29" stroke="#fff8e7" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

export function LevelIcon({ kind }: { kind: LevelKind }) {
  const g = GLYPH[kind]
  if (g) return <span className="home-level-glyph" data-level-icon={kind}>{g}</span>
  return <span className="home-level-pic" data-level-icon={kind}>{kind === 'words' ? <Book /> : kind === 'sentences' ? <Page /> : <Stack />}</span>
}

/** a small padlock badge on a locked station or activity */
export function LockBadge() {
  return (
    <svg viewBox="0 0 20 22" className="home-lock" data-lock aria-hidden>
      <path d="M5.5 10 V7 a4.5 4.5 0 0 1 9 0 V10" fill="none" stroke="#7a6a4a" strokeWidth="2.4" />
      <rect x="2.5" y="9.5" width="15" height="11" rx="2.5" fill="#e0b26a" stroke="#7a5a1a" strokeWidth="1.5" />
      <circle cx="10" cy="14.5" r="1.7" fill="#5a3417" />
      <path d="M10 15 V17.5" stroke="#5a3417" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  )
}
