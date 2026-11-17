import { useCallback, useEffect, useRef, useState } from 'react'
import { Howl, Howler } from 'howler'
import { useDeviceSettings } from '../shared/deviceSettings'

/**
 * Audio playback status
 */
type AudioStatus = 'idle' | 'loading' | 'playing' | 'error'

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

  // For blob URLs (from TTS), we need to specify the format
  // since Howler can't detect it from the URL
  // Also use Web Audio API (html5: false) for blobs to avoid audio pool exhaustion
  const isBlobUrl = src.startsWith('blob:')

  const howl = new Howl({
    src: [src],
    volume,
    html5: !isBlobUrl, // Use Web Audio for blobs, HTML5 for files
    preload: true,
    format: isBlobUrl ? ['mp3'] : undefined,
  })

  audioCache.set(src, howl)
  return howl
}

/**
 * Hook for playing audio files
 */
export function useAudio() {
  return usePlayer(false)
}

/**
 * The player under both hooks. The device's one sound setting (src/shared/deviceSettings.ts) gives the volume to all;
 * `effects` plays only while the device's effects are on. A voice line is never gated by it: the child cannot read.
 */
function usePlayer(effects: boolean) {
  const [status, setStatus] = useState<AudioStatus>('idle')
  const currentHowlRef = useRef<Howl | null>(null)

  const device = useDeviceSettings()
  const volume = device.volume
  const soundEnabled = !effects || device.sfx

  // Set global volume
  useEffect(() => {
    Howler.volume(volume)
  }, [volume])

  /**
   * Play an audio file
   * Accepts either a string path or a Promise that resolves to a string path
   * (useful for TTS which returns blob URLs asynchronously)
   */
  const play = useCallback(
    async (srcOrPromise: string | Promise<string>): Promise<void> => {
      // an effect while the device's effects are off
      if (!soundEnabled) {
        return
      }

      // Check if AudioContext is suspended (browser autoplay policy)
      // If suspended and not unlocked yet, skip playing silently
      // User can tap the speaker button to play manually
      const ctx = Howler.ctx
      if (ctx && ctx.state === 'suspended') {
        try {
          await ctx.resume()
        } catch {
          // Can't resume without user gesture - skip silently
          console.debug('AudioContext suspended - skipping autoplay')
          return
        }
      }

      // Resolve the source if it's a promise (e.g., from TTS)
      let src: string
      try {
        src = typeof srcOrPromise === 'string' ? srcOrPromise : await srcOrPromise
      } catch (error) {
        console.error('Failed to get audio source:', error)
        setStatus('error')
        throw error
      }

      return new Promise((resolve, reject) => {
        // Stop any currently playing audio
        if (currentHowlRef.current) {
          currentHowlRef.current.stop()
        }

        setStatus('loading')

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
        }, 1500)

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
    isPlaying: status === 'playing',
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
  const { play } = usePlayer(true)

  const playSuccess = useCallback(() => {
    return play(`${EFFECTS_BASE}/success.mp3`)
  }, [play])

  const playError = useCallback(() => {
    const variant = Math.floor(Math.random() * 5) + 1
    return play(`${EFFECTS_BASE}/error-${variant}.mp3`)
  }, [play])

  const playCelebrate = useCallback(() => {
    return play(`${EFFECTS_BASE}/celebrate.mp3`)
  }, [play])

  const playPageTurn = useCallback(() => {
    return play(`${EFFECTS_BASE}/page-turn.mp3`)
  }, [play])

  return {
    playSuccess,
    playError,
    playCelebrate,
    playPageTurn,
  }
}

