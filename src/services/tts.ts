/**
 * TTS Service - ElevenLabs text-to-speech with browser caching
 */

const TTS_ENDPOINT = import.meta.env.VITE_TTS_ENDPOINT || ''

// Bump this version when changing TTS settings (voice, model, etc.)
// This invalidates the browser cache automatically
const TTS_VERSION = 1
const CACHE_NAME = `alef-tts-v${TTS_VERSION}`

// Debug: log TTS status on load
console.log('[TTS] Endpoint:', TTS_ENDPOINT || '(not configured)', '| Cache version:', TTS_VERSION)

/**
 * Check if TTS is enabled (endpoint configured)
 */
export function isTTSEnabled(): boolean {
  return !!TTS_ENDPOINT
}

/**
 * Get TTS audio for given text
 * Returns a blob URL that can be played directly
 * Caches responses in browser Cache API for instant replay
 */
export async function getTTS(text: string): Promise<string> {
  console.log('[TTS] getTTS called for:', text)

  if (!TTS_ENDPOINT) {
    console.error('[TTS] Endpoint not configured!')
    throw new Error('TTS endpoint not configured')
  }

  // Create a cache key based on the text
  const cacheKey = new Request(`${TTS_ENDPOINT}?text=${encodeURIComponent(text)}`)

  // 1. Check browser cache first
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(cacheKey)

  if (cached) {
    const blob = await cached.blob()
    return URL.createObjectURL(blob)
  }

  // 2. Fetch from TTS proxy
  const response = await fetch(TTS_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[TTS] Error response:', response.status, errorText)
    throw new Error(`TTS failed: ${errorText}`)
  }

  // 3. Clone response before consuming (need one for cache, one for blob)
  const responseForCache = response.clone()

  // 4. Cache the response for future use
  await cache.put(cacheKey, responseForCache)

  // 5. Return blob URL for immediate use
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/**
 * Preload TTS audio into cache without playing
 */
export async function preloadTTS(texts: string[]): Promise<void> {
  if (!TTS_ENDPOINT) return

  await Promise.allSettled(
    texts.map(async (text) => {
      try {
        // Just fetch to populate cache, revoke the blob URL immediately
        const url = await getTTS(text)
        URL.revokeObjectURL(url)
      } catch (error) {
        console.warn(`Failed to preload TTS for "${text}":`, error)
      }
    })
  )
}

/**
 * Clear all cached TTS audio
 */
export async function clearTTSCache(): Promise<void> {
  await caches.delete(CACHE_NAME)
}

/**
 * Get cache stats (for debugging)
 */
export async function getTTSCacheStats(): Promise<{ count: number }> {
  if (!('caches' in window)) {
    return { count: 0 }
  }

  const cache = await caches.open(CACHE_NAME)
  const keys = await cache.keys()
  return { count: keys.length }
}
