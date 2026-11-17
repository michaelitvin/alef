// Saving a decision from a phone: a short network blip must not lose it, and a double tap must not decide twice.

/** An answer from the server that is not OK. */
export class HttpError extends Error {
  readonly status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

/** A blip (no answer at all) or a server failure is worth another try; a refused decision (4xx) is not. */
export const retryable = (err: unknown): boolean => !(err instanceof HttpError) || err.status >= 500

/**
 * Send, and send again after each delay while the failure is retryable. Sending a decision twice is safe: the second
 * copy of an OK, a Reject with the same note, a note or a reset leaves the item as the first copy left it.
 */
export async function sendWithRetry<T>(send: () => Promise<T>, delays: number[], sleep: (ms: number) => Promise<void>): Promise<T> {
  for (let i = 0; ; i++) {
    try {
      return await send()
    } catch (err) {
      if (i >= delays.length || !retryable(err)) throw err
      await sleep(delays[i])
    }
  }
}

/**
 * Ignores a decision tap that comes right after the previous one. Without it, the second tap of a double tap lands on
 * the item that the first tap just started, which he has not heard.
 */
export function tapGuard(now: () => number, ms: number) {
  let last = -Infinity
  return {
    /** True when the tap counts; it then starts the quiet time. */
    take(): boolean {
      const t = now()
      if (t - last < ms) return false
      last = t
      return true
    },
  }
}
