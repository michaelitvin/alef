// The pause cover keeps all audio silent until he taps play (rule): the output's hold follows `paused`, and ends when
// the game unmounts.
import { useEffect } from 'react'
import { holdAudio } from '../gameAudio/output'

export function usePauseHold(paused: boolean) {
  useEffect(() => { holdAudio(paused) }, [paused])
  useEffect(() => () => holdAudio(false), [])
}
