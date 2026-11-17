// The area's Developer section (on production too, behind the gate): the open game's developer tools.
import { Suspense } from 'react'
import type { DevToolsProps, GameParent } from '../types'

export function DeveloperSection({ game, ...props }: DevToolsProps & { game: GameParent }) {
  const Tools = game.DevTools
  if (!Tools) return <p>No developer tools for {game.title}.</p>
  return <Suspense fallback={null}><Tools {...props} /></Suspense>
}
