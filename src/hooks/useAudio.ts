import { useCallback, useEffect, useRef, useState } from 'react'
import { Howl, Howler } from 'howler'
import { useProgressStore } from '../stores/progressStore'

/**
 * Audio playback status
 */
export type AudioStatus = 'idle' | 'loading' | 'playing' | 'paused' | 'error'

/**
 * Audio cache to prevent re-loading the same files
 */
const audioCache = new Map<string, Howl>()

/**
 * Get or create a Howl instance for a given audio path
 */
function getHowl(src: string, volume: number): Howl {
  const cached = audioCache.get(src)
  if (cached) {
    // Don't use cached instance if it failed to load
    if (cached.state() !== 'unloaded') {
      cached.volume(volume)
      return cached
    }
    // Remove failed instance from cache
    audioCache.delete(src)
  }

  const howl = new Howl({
    src: [src],
    volume,
    html5: true, // Use HTML5 Audio for better mobile support
    preload: true,
  })

  audioCache.set(src, howl)
  return howl
}

/**
 * Preload audio files into cache
 */
export function preloadAudio(paths: string[], volume: number = 0.8): void {
  paths.forEach((path) => {
    if (!audioCache.has(path)) {
      getHowl(path, volume)
    }
  })
}

/**
 * Clear audio cache
 */
export function clearAudioCache(): void {
  audioCache.forEach((howl) => howl.unload())
  audioCache.clear()
}

/**
 * Hook for playing audio files
 */
export function useAudio() {
  const [status, setStatus] = useState<AudioStatus>('idle')
  const [currentSrc, setCurrentSrc] = useState<string | null>(null)
  const currentHowlRef = useRef<Howl | null>(null)

  const settings = useProgressStore((state) => state.settings)
  const volume = settings.volume
  const soundEnabled = settings.soundEffects

  // Set global volume
  useEffect(() => {
    Howler.volume(volume)
  }, [volume])

  /**
   * Play an audio file
   */
  const play = useCallback(
    (src: string): Promise<void> => {
      return new Promise((resolve, reject) => {
        // Check if sound is enabled
        if (!soundEnabled) {
          resolve()
          return
        }

        // Stop any currently playing audio
        if (currentHowlRef.current) {
          currentHowlRef.current.stop()
        }

        setStatus('loading')
        setCurrentSrc(src)

        // Track if promise is already settled
        let settled = false
        const safeResolve = () => {
          if (!settled) {
            settled = true
            setStatus('idle')
            resolve()
          }
        }
        const safeReject = (err: Error) => {
          if (!settled) {
            settled = true
            setStatus('error')
            reject(err)
          }
        }

        // Timeout to prevent hanging if audio fails silently
        const timeout = setTimeout(() => {
          console.warn(`Audio load timeout: ${src}`)
          safeResolve() // Resolve anyway to not block UI
        }, 3000)

        const howl = getHowl(src, volume)
        currentHowlRef.current = howl

        // Set up event handlers
        const onEnd = () => {
          clearTimeout(timeout)
          safeResolve()
        }

        const onError = () => {
          clearTimeout(timeout)
          console.error(`Failed to play audio: ${src}`)
          safeReject(new Error(`Failed to play audio: ${src}`))
        }

        const onPlay = () => {
          setStatus('playing')
        }

        const onLoad = () => {
          // Play once loaded
          howl.play()
        }

        // Remove old listeners and add new ones
        howl.off('end').on('end', onEnd)
        howl.off('playerror').on('playerror', onError)
        howl.off('loaderror').on('loaderror', onError)
        howl.off('play').on('play', onPlay)

        // Check current state - might have already errored
        const state = howl.state()
        if (state === 'loaded') {
          howl.play()
        } else if (state === 'unloaded') {
          // File already failed to load - reject immediately
          clearTimeout(timeout)
          safeReject(new Error(`Audio file not available: ${src}`))
        } else {
          // Still loading
          howl.off('load').on('load', onLoad)
        }
      })
    },
    [soundEnabled, volume]
  )

  /**
   * Play multiple audio files in sequence
   */
  const playSequence = useCallback(
    async (srcs: string[]): Promise<void> => {
      for (const src of srcs) {
        await play(src)
      }
    },
    [play]
  )

  /**
   * Stop current audio
   */
  const stop = useCallback(() => {
    if (currentHowlRef.current) {
      currentHowlRef.current.stop()
      setStatus('idle')
    }
  }, [])

  /**
   * Pause current audio
   */
  const pause = useCallback(() => {
    if (currentHowlRef.current && status === 'playing') {
      currentHowlRef.current.pause()
      setStatus('paused')
    }
  }, [status])

  /**
   * Resume paused audio
   */
  const resume = useCallback(() => {
    if (currentHowlRef.current && status === 'paused') {
      currentHowlRef.current.play()
      setStatus('playing')
    }
  }, [status])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentHowlRef.current) {
        currentHowlRef.current.stop()
      }
    }
  }, [])

  return {
    play,
    playSequence,
    stop,
    pause,
    resume,
    status,
    currentSrc,
    isPlaying: status === 'playing',
    isLoading: status === 'loading',
  }
}

/**
 * Base path for effects audio (uses Vite's base URL)
 */
const EFFECTS_BASE = `${import.meta.env.BASE_URL}assets/audio/effects`

/**
 * Hook for playing UI sound effects
 */
export function useSoundEffects() {
  const { play } = useAudio()

  const playSuccess = useCallback(() => {
    return play(`${EFFECTS_BASE}/success.mp3`)
  }, [play])

  const playError = useCallback(() => {
    return play(`${EFFECTS_BASE}/error.mp3`)
  }, [play])

  const playTap = useCallback(() => {
    return play(`${EFFECTS_BASE}/tap.mp3`)
  }, [play])

  const playUnlock = useCallback(() => {
    return play(`${EFFECTS_BASE}/unlock.mp3`)
  }, [play])

  const playCelebrate = useCallback(() => {
    return play(`${EFFECTS_BASE}/celebrate.mp3`)
  }, [play])

  return {
    playSuccess,
    playError,
    playTap,
    playUnlock,
    playCelebrate,
  }
}

export default useAudio
