// The run controller as a React hook: one controller per mount; the tablet lock (page hidden) pauses it (rule).
import { useEffect, useRef, useSyncExternalStore } from 'react'
import { RunController, type RunOpts } from './controller'

export function useRun(opts: RunOpts) {
  const ref = useRef<RunController | null>(null)
  ref.current ??= new RunController(opts)
  const c = ref.current
  const view = useSyncExternalStore(c.subscribe, c.getView)
  useEffect(() => {
    c.start()
    const vis = () => { if (document.visibilityState === 'hidden') c.pause() }
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pagehide', vis)
    return () => {
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pagehide', vis)
      c.destroy()
    }
  }, [c])
  return {
    view,
    clock: c.broomClock,
    onGesture: (g: Parameters<RunController['gesture']>[0]) => c.gesture(g),
    onNext: () => c.next(),
    onReplay: () => c.replay(),
    onHint: () => c.hint(),
    resume: () => c.resume(),
  }
}
