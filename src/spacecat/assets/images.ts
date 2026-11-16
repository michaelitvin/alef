// The original game's 9 pictures (Space Cat Math by Igor, Ray's dad; used by permission, see asset-sources/spacecat/README.md).
import bg from './img/space-bg.png'
import ship1 from './img/cat-ship-1.png'
import ship2 from './img/cat-ship-2.png'
import ship3 from './img/cat-ship-3.png'
import surface1 from './img/surface-1.png'
import surface2 from './img/surface-2.png'
import surface3 from './img/surface-3.png'
import surface4 from './img/surface-4.png'
import thumbs from './img/cat-thumbs-up.png'

export const IMAGES: { bg: string; ships: [string, string, string]; surfaces: [string, string, string, string]; thumbs: string } = {
  bg, ships: [ship1, ship2, ship3], surfaces: [surface1, surface2, surface3, surface4], thumbs,
}
