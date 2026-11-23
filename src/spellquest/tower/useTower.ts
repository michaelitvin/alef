// the tower's flow (logic/controller.ts) as a React hook for Spell Quest's tower: one controller per mount, its view
// through useSyncExternalStore, the newest props read through a ref. The tower starts the visit and pauses it (the
// run's cover); leaving the page mid-visit records an abandon; unmounting stops everything.
import { useEffect, useRef, useState } from 'react'
import { TowerController, type TowerEmbedded, type TowerOpts, type TowerTelemetry } from './logic/controller'
import type { Choice } from './types'

type UseTowerOpts = Pick<TowerOpts, 'rng' | 'walkOverride' | 'makeRound' | 'content' | 'tallies' | 'audio'> & {
  embedded: TowerEmbedded
  telemetry: TowerTelemetry
}

export function useTower(opts: UseTowerOpts) {
  /** the newest props: the options object is new on every render, the controller reads its callbacks at each use */
  const latest = useRef(opts)
  latest.current = opts
  const ref = useRef<TowerController | null>(null)
  ref.current ??= new TowerController({
    rng: opts.rng, walkOverride: opts.walkOverride, makeRound: opts.makeRound,
    content: opts.content, tallies: opts.tallies, audio: opts.audio,
    embedded: () => latest.current.embedded,
    telemetry: () => latest.current.telemetry,
    reactOnCommit: true,
  })
  const c = ref.current
  // a plain state (not useSyncExternalStore, whose renders are synchronous): the flow's reactions to a new state run
  // in an effect after React rendered it, at the same moments as when the flow was this hook's own effects
  const [view, setView] = useState(c.getView)
  useEffect(() => {
    setView(c.getView())
    return c.subscribe(() => setView(c.getView()))
  }, [c])
  useEffect(() => c.commit(), [c, view.state])
  useEffect(() => {
    // the tab closed or navigated away mid-visit (no unmount happens then)
    const onHide = () => c.pageHidden()
    window.addEventListener('pagehide', onHide)
    return () => {
      window.removeEventListener('pagehide', onHide)
      c.destroy()
    }
  }, [c])
  return {
    ...view,
    start: () => c.start(),
    choose: (choice: Choice) => c.choose(choice),
    megaCast: c.megaCast,
    pause: () => c.pause(),
    resume: () => c.resume(),
    replayClue: () => c.replay(),
    hint: () => c.hint(),
  }
}
