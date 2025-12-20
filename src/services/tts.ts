/**
 * TTS Service - ElevenLabs text-to-speech with browser caching
 */

const TTS_ENDPOINT = import.meta.env.VITE_TTS_ENDPOINT || ''

// Bump this version when changing TTS settings (voice, model, etc.)
// This invalidates the browser cache automatically
const TTS_VERSION = 1
const CACHE_NAME = `alef-tts-v${TTS_VERSION}`

// Concurrency control for API calls (sequential queue to avoid rate limits)
let activeRequests = 0
let requestQueue: Promise<void> = Promise.resolve()

function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  // Chain all requests through a single queue
  const myTurn = requestQueue.then(async () => {
    activeRequests++
    try {
      return await fn()
    } finally {
      activeRequests--
    }
  })

  // Update queue to wait for this request (ignore errors for queue purposes)
  requestQueue = myTurn.then(() => {}, () => {})

  return myTurn
}

// Debug: log TTS status on load
console.log('[TTS] Endpoint:', TTS_ENDPOINT || '(not configured)', '| Cache version:', TTS_VERSION)

/**
 * Check if TTS is enabled (endpoint configured)
 */
export function isTTSEnabled(): boolean {
  return !!TTS_ENDPOINT
}

/**
 * Fetch TTS audio (internal - does the actual work)
 */
async function fetchTTS(
  text: string,
  cache: Cache,
  cacheKey: Request
): Promise<string> {
  console.log('[TTS] Fetching:', text)

  // Fetch from TTS proxy
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

  // Clone response before consuming (need one for cache, one for blob)
  const responseForCache = response.clone()

  // Cache the response for future use
  await cache.put(cacheKey, responseForCache)

  // Return blob URL for immediate use
  const blob = await response.blob()
  return URL.createObjectURL(blob)
}

/**
 * Get TTS audio for given text
 * Returns a blob URL that can be played directly
 * Caches responses in browser Cache API for instant replay
 * @param text - The text to speak
 * @param _context - Deprecated, no longer used (eleven_v3 doesn't support previous_text)
 * @param priority - If true, skip queue for immediate playback
 * @param isPreload - If true, this is a preload request (no logging)
 */
export async function getTTS(text: string, _context?: unknown, priority = false, isPreload = false): Promise<string> {
  if (!TTS_ENDPOINT) {
    console.error('[TTS] Endpoint not configured!')
    throw new Error('TTS endpoint not configured')
  }

  // Log the TTS prompt (including any square bracket context markers) - only for actual playback
  if (!isPreload) {
    console.log('[TTS] Playing:', text)
  }

  // Create a cache key based on the text
  const cacheKeyUrl = `${TTS_ENDPOINT}?text=${encodeURIComponent(text)}`
  const cacheKey = new Request(cacheKeyUrl)

  // 1. Check cache first (instant)
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(cacheKey)

  if (cached) {
    const blob = await cached.blob()
    return URL.createObjectURL(blob)
  }

  // 2. Priority requests skip the queue (for immediate playback)
  if (priority) {
    return fetchTTS(text, cache, cacheKey)
  }

  // 3. Non-priority requests go through the queue
  return withSlot(async () => {
    // Double-check cache (another request might have fetched it)
    const cachedAgain = await cache.match(cacheKey)
    if (cachedAgain) {
      const blob = await cachedAgain.blob()
      return URL.createObjectURL(blob)
    }

    return fetchTTS(text, cache, cacheKey)
  })
}

/**
 * Preload TTS audio into cache without playing
 * Runs concurrently - rate limiting is handled by getTTS semaphore
 */
export async function preloadTTS(texts: string[]): Promise<void> {
  if (!TTS_ENDPOINT) return

  await Promise.allSettled(
    texts.map(async (text) => {
      try {
        // Just fetch to populate cache, revoke the blob URL immediately
        // Pass isPreload=true to suppress logging
        const url = await getTTS(text, undefined, false, true)
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
