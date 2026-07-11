import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import type { SpeechEngine } from '../../utils/speech/types'
import { WebSpeechEngine } from '../../utils/speech/webSpeechEngine'
import {
  INITIAL_TAP_STATE,
  nextTap,
  type TapState,
} from '../../utils/speech/tapCycle'
import { decodeWord, stripPunctuation } from '../../utils/decodeWord'
import { useProgressStore } from '../../stores/progressStore'

interface SpeechContextValue {
  /** Handle a tap on a word. wordKey identifies the word's location on screen. */
  tapWord: (wordKey: string, word: string) => void
  /** wordKey currently being spoken (for highlight), or null */
  speakingKey: string | null
  /** False when the device has no Hebrew voice */
  hebrewVoiceAvailable: boolean
}

const SpeechContext = createContext<SpeechContextValue | null>(null)

export function SpeechProvider({
  engine,
  children,
}: {
  engine?: SpeechEngine
  children: ReactNode
}) {
  const engineRef = useRef<SpeechEngine | null>(null)
  if (engineRef.current === null) {
    engineRef.current = engine ?? new WebSpeechEngine()
  }
  const tapStateRef = useRef<TapState>(INITIAL_TAP_STATE)
  const [speakingKey, setSpeakingKey] = useState<string | null>(null)
  const [hebrewVoiceAvailable, setHebrewVoiceAvailable] = useState(true)

  useEffect(() => {
    const currentEngine = engineRef.current
    if (!currentEngine) return
    let mounted = true
    void currentEngine.whenReady().then(() => {
      if (mounted) setHebrewVoiceAvailable(currentEngine.isAvailable())
    })
    return () => {
      mounted = false
      currentEngine.cancel()
    }
  }, [])

  const speakText = useCallback(async (key: string | null, text: string) => {
    const volume = useProgressStore.getState().settings.volume
    setSpeakingKey(key)
    try {
      await engineRef.current?.speak(text, { volume })
    } finally {
      setSpeakingKey((current) => (current === key ? null : current))
    }
  }, [])

  const tapWord = useCallback(
    (wordKey: string, word: string) => {
      const { mode, state } = nextTap(tapStateRef.current, wordKey)
      tapStateRef.current = state
      const text = mode === 'word' ? stripPunctuation(word) || word : decodeWord(word)
      void speakText(wordKey, text)
    },
    [speakText]
  )

  return (
    <SpeechContext.Provider
      value={{ tapWord, speakingKey, hebrewVoiceAvailable }}
    >
      {children}
    </SpeechContext.Provider>
  )
}

export function useSpeech(): SpeechContextValue {
  const ctx = useContext(SpeechContext)
  if (!ctx) throw new Error('useSpeech must be used inside SpeechProvider')
  return ctx
}
