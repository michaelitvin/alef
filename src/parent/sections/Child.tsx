// The area's Child section: boy or girl (the player setting every game shares).
import { PlayerSetting } from '../../shared/PlayerSetting'
import type { Track } from '../types'

export function ChildSection({ track }: { track?: Track }) {
  return <PlayerSetting onChange={(g) => track?.('player', { gender: g, by: 'parent' })} />
}
