// The play controller as a React hook (as Spell Quest's useRun): one controller and one canvas engine per mount, the view
// through useSyncExternalStore; the tablet lock or another app pauses it, a page that goes away abandons the run (rule).
import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { realSleeper, type Sleeper } from '../shared/sleeper'
import * as spaceCatAudio from './audio/spaceCatAudio'
import { createEngine, type Engine } from './canvas/engine'
import { PlayController, type EndInfo, type PlayView } from './controller'
import { storeSavePort, type SpaceCatSavePort } from './savePort'
import { spaceCatTelemetry } from './telemetry'

export interface UsePlayOpts {
  onEnd: (info: EndInfo) => void
  /** after the held house: to alef's home screen */
  goHome: () => void
  /** test seams */
  makeEngine?: (canvas: HTMLCanvasElement) => Engine
  save?: SpaceCatSavePort
  sleeper?: Sleeper
}

const IDLE: PlayView = { paused: false, hud: { dots: 0, points: 0, hearts: 3 }, phase: 'between' }
const noSub = () => () => {}

export function usePlay(o: UsePlayOpts) {
  const opts = useRef(o)
  opts.current = o
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [c, setC] = useState<PlayController | null>(null)
  useEffect(() => {
    const canvas = canvasRef.current!
    const make = opts.current.makeEngine ?? ((cv: HTMLCanvasElement) => createEngine(cv, { sfx: (n) => { void spaceCatAudio.playSfx(n) } }))
    const engine = make(canvas)
    const fit = () => engine.setScreen(window.innerWidth, window.innerHeight)
    fit()
    const ctl = new PlayController({
      engine, audio: spaceCatAudio, save: opts.current.save ?? storeSavePort,
      track: spaceCatTelemetry.track, setRun: spaceCatTelemetry.setRun, flush: spaceCatTelemetry.flush, sleeper: opts.current.sleeper ?? realSleeper, rng: Math.random,
      onEnd: (i) => opts.current.onEnd(i),
    })
    setC(ctl)
    const vis = () => { if (document.visibilityState === 'hidden') ctl.pause() }
    const hide = () => ctl.pageHide()
    window.addEventListener('resize', fit)
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pagehide', hide)
    ctl.start()
    return () => {
      window.removeEventListener('resize', fit)
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pagehide', hide)
      ctl.destroy()
    }
  }, [])
  const view = useSyncExternalStore(c?.subscribe ?? noSub, c?.getView ?? (() => IDLE))
  return {
    canvasRef,
    view,
    /** the pause button (a tap): the same pause as a hidden page */
    pause: () => c?.pause(),
    resume: () => c?.resume(),
    /** the held house: the run stops and writes the log (the controller's leave), then alef's home screen */
    leave: () => {
      c?.leave()
      spaceCatAudio.stopAll()
      opts.current.goHome()
    },
  }
}
