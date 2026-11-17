// The broom flight's geometry (stage units): the lanes, the wizard, the orbs' path and the boss's box. The view
// (components/screens/Broom.tsx) draws with it, and the run's tests check the orbs' spacing with it.
import { flightView } from './layout'

/** each lane's centre (stage y): far enough apart that two orbs in neighbouring lanes never overlap (LANE_GAP, ORB_JITTER) */
export const LANE_Y = [260, 505, 750]
/** the wizard's centre (stage x) */
export const WIZ_X = 170
/** the parent: 1.5 times the old 150 (big enough to see; a lane is still higher than he is, so he can dodge) */
export const BROOM_WIZARD_H = 225
/** the parent: 1.3 times the old 170 */
export const BROOM_ORB = 221
/** the wizard sprite's width (stage units) */
export const WIZ_W = BROOM_WIZARD_H * (600 / 512)
/** the sprite's box (stage x) */
export const wizardBox = () => ({ left: WIZ_X - WIZ_W / 2, right: WIZ_X + WIZ_W / 2, width: WIZ_W })
/** an orb's centre when it touches the wizard's front (wave position 0) */
export const ORB_FRONT = WIZ_X + WIZ_W / 2 - BROOM_ORB * 0.3

/**
 * The flight on a w×h screen: the view (as wide as the screen, layout.ts flightView) and the start of the orbs' path,
 * just beyond its right edge (with the ring of a marked orb), so every orb flies in and none waits in sight. An orb
 * crosses the whole path in the flight's travel time on every screen. Without a size: a 16:9 screen.
 */
export function flightPath(size?: { w: number; h: number }) {
  const view = flightView(size?.w, size?.h)
  const startX = view.left + view.width + BROOM_ORB * 0.6
  return { view, startX, span: startX - ORB_FRONT }
}
/** the orbs' centre x for a wave position k (1 = the path's start beyond the right edge, 0 = touching the wizard's front) */
export const orbX = (k: number, path = flightPath()) => ORB_FRONT + k * path.span
/** the boss's box on the right (stage units): it faces the wizard */
export const BOSS_BOX = { x: 1060, y: 235, w: 460, h: 490 }
/** the health bar above the boss: below the top bar on a phone */
export const HP = { x: BOSS_BOX.x - 6, y: 168, seg: 46, gap: 8, h: 30 }
