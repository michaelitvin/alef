// The duel card (spec: one duel, Part 4; the approved mock): the tower with the wizard flying out of it on his broom
// (mirrored: the picture reads right to left), three nikkud orbs, and the vector play button in its own column, pointing
// left. The card starts the full adventure: Book 2's cover. Then the line for the parent: what is learned.
// The picture follows the saved player (shared/player): before the boy/girl question has been asked, the boy shows.
import cardBoy from '../../assets/home/card.webp'
import cardGirl from '../../assets/home/card-girl.webp'
import { useGender } from '../../shared/player'
import orb from '../../duel2/assets/img/s-orb.webp'
import { PlayButton } from './PlayButton'

/** the orbs: text, size (px at --k 1, before the mock's .85), lift (px) */
const ORBS: [string, number, number][] = [['בָּ', 58, -18], ['לִ', 46, 16], ['מוּ', 40, -6]]
export const DUEL_HREF = () => `${import.meta.env.BASE_URL}duel2/`
export const DUEL_LEARN = 'לשמוע ולקרוא אותיות, ניקוד והברות, ואחר כך מילים; להבחין בין אותיות דומות; ואחרי הקריאה — לכתוב בדפוס ובכתב יד. המשחק מתאים את עצמו לילד.'

export function DuelCard() {
  const card = useGender() === 'girl' ? cardGirl : cardBoy
  return (
    <div data-home-part="duel">
      <a className="home-card" href={DUEL_HREF()} aria-label="duel" data-card="duel">
        <img className="home-card-art" src={card} data-card-art={card === cardGirl ? 'girl' : 'boy'} alt="" draggable={false} />
        <div className="home-orbs" aria-hidden>
          {ORBS.map(([t, z, y]) => (
            <div key={t} className="home-card-orb" style={{ width: `calc(${z * 0.85}px * var(--k))`, height: `calc(${z * 0.85}px * var(--k))`, transform: `translateY(calc(${y}px * var(--k)))` }}>
              <img src={orb} alt="" draggable={false} />
              <span style={{ fontSize: `calc(${(z * 0.38).toFixed(1)}px * var(--k))` }}>{t}</span>
            </div>
          ))}
        </div>
        <div className="home-pcol"><PlayButton theme="duel" /></div>
      </a>
      <p className="home-learn" data-learn="duel"><b>מה לומדים:</b> {DUEL_LEARN}</p>
    </div>
  )
}
