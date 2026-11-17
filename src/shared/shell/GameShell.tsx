// The game shell: what every game's root does around its screens. It starts the preload on mount, follows the device's
// sound setting, mutes while the page is hidden, and owns the play gate: unlock the audio inside the tap, wait for the
// preload (and the game's welcome line), check that the child is still on the cover, ask boy or girl if it is unset, then
// play. Each game keeps its own screens, cover and pause cover; the shell gives it `play`, `loading` and the question.
//
//   const shell = useGameShell({ preload, askGender, canStart: () => screenRef.current === 'cover', onPlay })
//   if (shell.asking) return shell.question
//   … <Cover onPlay={shell.play} loading={shell.loading} />
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { GenderQuestion } from '../GenderQuestion'
import { getGender, setGender, type Gender } from '../player'
import { unlockAudioOutput, useAudioOutput } from '../gameAudio/output'
import { usePageHidden } from './usePageHidden'

export interface AskGender {
  boySrc: string
  girlSrc: string
  /** the question's voice id */
  line: string
  /** when (s, real time) the question says boy and girl */
  cues: { boy: number; girl: number }
  play: (id: string) => Promise<unknown>
  stop: () => void
  /** after the child chose (the game's telemetry) */
  onChosen?: (g: Gender) => void
  /** the question's wrapper class (Book 2 draws it in its root) */
  className?: string
}

export interface GameShellOptions {
  /** the game's preload: starts on mount; play waits for it */
  preload: () => Promise<void>
  askGender: AskGender
  /** the child is still where play was tapped (a tap that left the cover meanwhile starts nothing) */
  canStart: () => boolean
  /** the game starts (its play screen) */
  onPlay: () => void
  /** a line that plays while the preload waits, when boy or girl is set (the clock's welcome); play waits for it too.
   *  After the question, the gate runs again with it. */
  welcome?: () => Promise<void>
  /** the question is about to show (the clock stops its door music) */
  onAsk?: () => void
  /** the page hides (Book 2 holds the audio when the run's pause cover will show) */
  onHide?: () => void
}

export interface GameShell {
  /** the play button's tap: call it inside the tap (iOS: the audio unlocks synchronously in the handler) */
  play: () => void
  /** the play gate waits (the play button shows its turning ring) */
  loading: boolean
  /** the boy/girl question shows: render `question` instead of the game's screen */
  asking: boolean
  question: ReactNode
}

export function useGameShell(o: GameShellOptions): GameShell {
  const opts = useRef(o)
  opts.current = o
  const busy = useRef(false)
  const [loading, setLoading] = useState(false)
  const [asking, setAsking] = useState(false)
  useEffect(() => { void opts.current.preload() }, [])
  useAudioOutput()
  usePageHidden(() => opts.current.onHide?.())

  const play = () => {
    if (busy.current) return
    const c = opts.current
    unlockAudioOutput()
    busy.current = true
    setLoading(true)
    const gendered = !!getGender()
    const welcome = gendered && c.welcome ? c.welcome() : Promise.resolve()
    void Promise.all([welcome, c.preload()]).finally(() => {
      busy.current = false
      setLoading(false)
      const now = opts.current
      if (!now.canStart()) return
      // boy or girl is not set yet: ask the child first (spec 2026-11-07 girls)
      if (!gendered) {
        now.onAsk?.()
        setAsking(true)
        return
      }
      now.onPlay()
    })
  }

  const a = o.askGender
  const question = asking ? (
    <GenderQuestion boySrc={a.boySrc} girlSrc={a.girlSrc} line={a.line} play={a.play} stop={a.stop} cues={a.cues}
      onChoose={(g) => {
        setGender(g, 'child')
        opts.current.askGender.onChosen?.(g)
        setAsking(false)
        // a game with a welcome goes through the gate again (the welcome now speaks to him or her)
        if (opts.current.welcome) play()
        else opts.current.onPlay()
      }} />
  ) : null
  return { play, loading, asking, question: question && a.className ? <div className={a.className}>{question}</div> : question }
}
