// The first duel's flow (utils/duel/controller.ts) as a React hook for Book 2's tower: one controller per mount, its view
// through useSyncExternalStore, the newest props read through a ref. The tower starts the visit and pauses it (the
// run's cover); leaving the page mid-visit records an abandon; unmounting stops everything.
import { useEffect, useRef, useState } from 'react'
import { DuelController, type DuelEmbedded, type DuelOpts, type DuelTelemetry } from '../utils/duel/controller'
import type { Choice } from '../types/duel'

type UseDuelGameOpts = Pick<DuelOpts, 'rng' | 'walkOverride' | 'makeRound'> & {
  embedded: DuelEmbedded
  telemetry: DuelTelemetry
}

export function useDuelGame(opts: UseDuelGameOpts) {
  /** the newest props: the options object is new on every render, the controller reads its callbacks at each use */
  const latest = useRef(opts)
  latest.current = opts
  const ref = useRef<DuelController | null>(null)
  ref.current ??= new DuelController({
    rng: opts.rng, walkOverride: opts.walkOverride, makeRound: opts.makeRound,
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
  }
}
