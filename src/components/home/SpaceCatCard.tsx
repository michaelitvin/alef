// The Space Cat card (spec: Space Cat, *Where it lives*; the approved mock), in the clock card's layout and built from the
// game's own parts (Space Cat Math by Igor, Ray's dad; used by permission): the space background, his current ship,
// three small planets with 3, 4, 7, and a silver-blue play button pointing left. Then what is learned, and the credit.
// The ship is read from the raw save (savedShip): creating Space Cat's store would write its save, and the home never does.
import bg from '../../spacecat/assets/img/space-bg.png'
import ship1 from '../../spacecat/assets/img/cat-ship-1.png'
import ship2 from '../../spacecat/assets/img/cat-ship-2.png'
import ship3 from '../../spacecat/assets/img/cat-ship-3.png'
import surface1 from '../../spacecat/assets/img/surface-1.png'
import surface2 from '../../spacecat/assets/img/surface-2.png'
import surface4 from '../../spacecat/assets/img/surface-4.png'
import { SAVE_KEY, savedShip } from '../../spacecat/saveFormat'
import { PlayButton } from './PlayButton'

const SPACECAT_HREF = () => `${import.meta.env.BASE_URL}spacecat/`
const SPACECAT_LEARN = 'חיבור וחיסור עד 100, השוואת מספרים, ספירה בקפיצות, כפל וחילוק. המשחק מוצא לבד את הרמה של הילד ומתאים את עצמו, גם במהירות.'
/** the parent's credit, exactly */
const SPACECAT_CREDIT = 'קרדיט: איגור אבא של ריי'
const SHIPS = [ship1, ship2, ship3]

/** the small planets, right to left (the card reads right to left): digit, surface, scale, lift (px) */
const PLANETS: [string, string, number, number][] = [['3', surface1, 1, -12], ['4', surface2, 0.82, 12], ['7', surface4, 0.68, -2]]

function currentShip(): 1 | 2 | 3 {
  try { return savedShip(localStorage.getItem(SAVE_KEY)) } catch { return 1 }
}

export function SpaceCatCard() {
  return (
    <div data-home-part="spacecat">
      <a className="home-sc" href={SPACECAT_HREF()} aria-label="space cat" data-card="spacecat"
        style={{ backgroundImage: `linear-gradient(90deg, #070b1f88, #0a144055 55%, #070b1f99), url(${bg})` }}>
        <div className="home-sc-art" aria-hidden>
          <img className="home-sc-ship" src={SHIPS[currentShip() - 1]} alt="" draggable={false} data-ship={currentShip()} />
        </div>
        <div className="home-sc-planets" aria-hidden>
          {PLANETS.map(([d, surface, z, y]) => (
            <div key={d} className="home-sc-planet" data-planet={d}
              style={{ width: `calc(${Math.round(z * 54)}px * var(--k))`, transform: `translateY(calc(${y}px * var(--k)))`, backgroundImage: `url(${surface})` }}>
              <span data-num>{d}</span>
            </div>
          ))}
        </div>
        <div className="home-pcol"><PlayButton theme="spacecat" /></div>
      </a>
      <p className="home-learn" data-learn="spacecat"><b>מה לומדים:</b> {SPACECAT_LEARN}</p>
      <p className="home-credit" data-credit="spacecat">{SPACECAT_CREDIT}</p>
    </div>
  )
}
