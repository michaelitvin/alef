interface Env {
  ELEVENLABS_KEY: string
}

const VOICE_ID = 'cgSgspJ2msm6clMCkdW9' // Jessica voice
const MODEL_ID = 'eleven_v3' // Latest model, best Hebrew pronunciation

// CORS headers to include on ALL responses
const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST',
  'Access-Control-Allow-Headers': 'Content-Type',
}

// Helper to create response with CORS headers
function corsResponse(body: BodyInit | null, init: ResponseInit = {}): Response {
  return new Response(body, {
    ...init,
    headers: {
      ...CORS_HEADERS,
      ...init.headers,
    },
  })
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // CORS preflight
    if (request.method === 'OPTIONS') {
      return corsResponse(null)
    }

    if (request.method !== 'POST') {
      return corsResponse('Method not allowed', { status: 405 })
    }

    try {
      const { text } = await request.json<{ text: string }>()

      if (!text || typeof text !== 'string') {
        return corsResponse('Invalid text', { status: 400 })
      }

      if (text.length > 500) {
        return corsResponse('Text too long (max 500 chars)', { status: 400 })
      }

      const response = await fetch(
        `https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}`,
        {
          method: 'POST',
          headers: {
            'xi-api-key': env.ELEVENLABS_KEY,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            text,
            model_id: MODEL_ID,
            voice_settings: {
              stability: 1.0, // Robust - clearest pronunciation (valid: 0.0, 0.5, 1.0)
              similarity_boost: 0.75,
            },
          }),
        }
      )

      if (!response.ok) {
        const errorText = await response.text()
        console.error('ElevenLabs error:', response.status, errorText)
        return corsResponse(`TTS failed (${response.status}): ${errorText}`, { status: 502 })
      }

      return corsResponse(response.body, {
        status: 200,
        headers: {
          'Content-Type': 'audio/mpeg',
          'Cache-Control': 'public, max-age=31536000', // 1 year
        },
      })
    } catch (error) {
      console.error('Worker error:', error)
      return corsResponse('Internal error', { status: 500 })
    }
  },
}
