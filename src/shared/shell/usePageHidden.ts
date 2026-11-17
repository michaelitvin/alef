// The page is hidden (another app, the tablet locked, the page leaving) or shown again: the audio output mutes while it
// is hidden (rule: switching apps silences the game). Listens to visibilitychange, pagehide and pageshow (a page shown
// again from the back/forward cache is read again).
import { useEffect, useRef } from 'react'
import { setHidden } from '../gameAudio/output'

/** `onHide` runs as the page hides (a game holds the audio there when its pause cover shows). */
export function usePageHidden(onHide?: () => void) {
  const hideRef = useRef(onHide)
  hideRef.current = onHide
  useEffect(() => {
    const vis = () => {
      const isHidden = document.visibilityState === 'hidden'
      setHidden(isHidden)
      if (isHidden) hideRef.current?.()
    }
    // a page that is leaving is silent whatever its visibility says
    const leave = () => {
      vis()
      setHidden(true)
    }
    document.addEventListener('visibilitychange', vis)
    window.addEventListener('pagehide', leave)
    window.addEventListener('pageshow', vis)
    return () => {
      document.removeEventListener('visibilitychange', vis)
      window.removeEventListener('pagehide', leave)
      window.removeEventListener('pageshow', vis)
    }
  }, [])
}
