// Read-along caption (rule: text may show while the voice speaks it, each word glowing as it is said).
// Smaller and fainter than the clock, but legible on a phone. Hebrew alternates print (Sigalit, with nikkud) and
// cursive (Dana Yad, without nikkud: its thin marks blur into a squiggle at caption size);
// English alternates all small (no capital, not even the first letter) and ALL CAPS.
import { type Lang, stripNikkud } from '../logic/phrases'

export type CaptionScript = 'print' | 'cursive' | 'small' | 'caps'

/** The caption script of the round: print and cursive (or small and capital letters) take turns, round by round. */
export function scriptFor(lang: Lang, served: number, s: { heCursiveMix: boolean; enCapsMix: boolean }): CaptionScript {
  const alt = served % 2 === 1
  if (lang === 'he') return s.heCursiveMix && alt ? 'cursive' : 'print'
  return s.enCapsMix && alt ? 'caps' : 'small'
}

export const displayWord = (w: string, script: CaptionScript) =>
  script === 'caps' ? w.toUpperCase() : script === 'small' ? w.toLowerCase() : script === 'cursive' ? stripNikkud(w) : w

const FONT: Record<CaptionScript, string> = {
  print: "'Sigalit', 'David', serif",
  cursive: "'Dana Yad', cursive",
  small: "'Andika', system-ui, sans-serif",
  caps: "'Andika', system-ui, sans-serif",
}

export interface CaptionProps {
  words: string[]
  lang: Lang
  script: CaptionScript
  /** index of the word being spoken; -1 = none yet; >= words.length = all said */
  active: number
  size?: 'prompt' | 'card' | 'explain'
  onTap?: () => void
  /** keeps its place but shows nothing (before the voice reads it) */
  hidden?: boolean
}

export function Caption({ words, lang, script, active, size = 'prompt', onTap, hidden = false }: CaptionProps) {
  return (
    <div data-caption dir={lang === 'he' ? 'rtl' : 'ltr'} lang={lang} className={`ck-caption ck-caption-${size} ck-script-${script}`}
      aria-hidden={hidden || undefined} style={{ fontFamily: FONT[script], ...(hidden ? { visibility: 'hidden' as const } : {}) }}
      onPointerDown={hidden ? undefined : onTap}>
      {words.map((w, i) => (
        <span key={i} className={i === active ? 'now' : i < active ? 'said' : ''}>
          {displayWord(w, script)}
        </span>
      ))}
    </div>
  )
}
