// The English card and path on home (English path design, Part 1), left to right: the green card picture on the left, three
// green orbs (a, sh, m in Andika), the play button on the right pointing right; under it the line for the parent, then the
// path of the English stations. The links open the English course (`duel2/?course=en`). The picture and the wizard follow
// the saved player, as on the Hebrew card.
import type { ScreenId } from '../../spellquest/logic/predict'
import cardBoy from '../../english/assets/img/card.webp'
import cardGirl from '../../english/assets/img/card-girl.webp'
import orb from '../../english/assets/img/s-orb.webp'
import tower from '../../english/assets/img/duel-tower.webp'
import ghost from '../../english/assets/img/s-ghost.webp'
import cauldron from '../../english/assets/img/s-cauldron.webp'
import ladder from '../../english/assets/img/s-ladder.webp'
import door from '../../english/assets/img/s-door.webp'
import wizBoy from '../../english/assets/img/s-wizard-cast.webp'
import wizGirl from '../../english/assets/img/s-wizard-cast-girl.webp'
import { useGender, wizardArt } from '../../shared/player'
import { PlayButton } from './PlayButton'
import { StationPath, type PathLook } from './StationPath'
import type { StationState } from './stations'

/** the orbs: text, size (px at --k 1, before the mock's .85), lift (px) */
const ORBS: [string, number, number][] = [['a', 58, -18], ['sh', 46, 16], ['m', 40, -6]]
const href = (q = '') => `${import.meta.env.BASE_URL}duel2/?course=en${q}`
const LEARN = 'the sound of each letter, blending sounds into words, spelling, then letter pairs (sh, ch, th), silent e and vowel pairs. The game finds {his} level in the first run.'

export function EnglishCard() {
  const girl = useGender() === 'girl'
  return (
    <div data-home-part="english">
      <a className="home-card home-card-en" href={href()} aria-label="english" data-card="english">
        <img className="home-card-art" src={girl ? cardGirl : cardBoy} data-card-art={girl ? 'girl' : 'boy'} alt="" draggable={false} />
        <div className="home-orbs" aria-hidden>
          {ORBS.map(([t, z, y]) => (
            <div key={t} className="home-card-orb" style={{ width: `calc(${z * 0.85}px * var(--k))`, height: `calc(${z * 0.85}px * var(--k))`, transform: `translateY(calc(${y}px * var(--k)))` }}>
              <img src={orb} alt="" draggable={false} />
              <span style={{ fontSize: `calc(${(z * (t.length > 1 ? 0.3 : 0.4)).toFixed(1)}px * var(--k))` }}>{t}</span>
            </div>
          ))}
        </div>
        <div className="home-pcol"><PlayButton theme="duel" dir="right" /></div>
      </a>
      <p className="home-learn" data-learn="english" data-parent-text dir="ltr"><b>What {girl ? 'she' : 'he'} learns:</b> {LEARN.replace('{his}', girl ? 'her' : 'his')}</p>
    </div>
  )
}

const IMG: Partial<Record<ScreenId, string>> = { tower, ghosts: ghost, cauldron, ladder, doors: door }

/** a station's picture on the English path: the green props, an orb with m, the book, a in Andika (size: the disc's, home.css) */
function EnglishPic({ id }: { id: ScreenId }) {
  const box = 'var(--home-pic, 54px)'
  if (id === 'broom') {
    return (
      <span className="home-orb" data-pic="orb" style={{ width: box, height: box }}>
        <img src={orb} alt="" draggable={false} />
        <span className="latin" style={{ fontSize: `calc(${box} * 0.55)` }}>m</span>
      </span>
    )
  }
  if (id === 'draw') return <span className="home-glyph latin" data-pic="glyph" style={{ fontSize: `calc(${box} * 0.75)` }}>a</span>
  if (id === 'spell') {
    // the spell book has no art yet: an open book, in the English path's green
    return (
      <svg data-pic="book" viewBox="0 0 120 80" style={{ width: box, height: box }} aria-hidden>
        <rect x="4" y="10" width="112" height="62" rx="8" fill="#2f7a55" stroke="#123d2a" strokeWidth="3" />
        <rect x="10" y="14" width="50" height="52" rx="5" fill="#f6ead0" stroke="#c9b48a" strokeWidth="2" />
        <rect x="60" y="14" width="50" height="52" rx="5" fill="#f6ead0" stroke="#c9b48a" strokeWidth="2" />
        <line x1="60" y1="16" x2="60" y2="64" stroke="#a8905f" strokeWidth="2.5" />
      </svg>
    )
  }
  return <img src={IMG[id]} alt="" draggable={false} data-pic="img" style={{ maxWidth: box, maxHeight: box }} />
}

export function EnglishPath({ stations }: { stations: StationState[] }) {
  const gender = useGender()
  const look: PathLook = {
    dir: 'ltr', href: (id) => href(`&station=${id}`), Pic: EnglishPic, part: 'english-path',
    // the green wizard faces right, the way the path runs
    wizard: wizardArt({ w: wizBoy, 'w-girl': wizGirl }, 'w', gender),
  }
  return <StationPath stations={stations} look={look} />
}
