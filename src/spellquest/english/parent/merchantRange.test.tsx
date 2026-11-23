// The number range is one setting: set from the English section, Spell Quest's merchant (the run controller over the real
// save port, `storeSavePort`) makes his coins from it.
import { act } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RunController } from '../../controller'
import { installFakeAudio } from '../../../shared/gameAudio/fakePlayer'
import { setNumberRange } from '../../../shared/numberRange'
import { stopVoice } from '../../audio/spellQuestAudio'

const fakeAudio = installFakeAudio()

async function merchantCoins(): Promise<number[]> {
  const c = new RunController({ rng: () => 0.37, now: () => Date.now(), force: { screen: 'merchant', stage: 2 }, sandbox: true })
  c.start()
  for (let t = 0; t < 30_000 && !c.view.merchant; t += 50) await act(async () => { await vi.advanceTimersByTimeAsync(50) })
  const coins = [...c.view.merchant!.coins]
  c.destroy()
  return coins
}

describe('Spell Quest\'s merchant reads the shared number range', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    localStorage.clear()
    fakeAudio.onVoice(() => Promise.resolve())
  })
  afterEach(() => { stopVoice(); fakeAudio.onVoice(null); vi.useRealTimers() })

  it('a range set in the shared key changes the coin values the merchant uses', async () => {
    setNumberRange(10)
    const small = await merchantCoins()
    expect(Math.max(...small)).toBeLessThanOrEqual(10)
    setNumberRange(1000)
    const large = await merchantCoins()
    expect(Math.max(...large)).toBeGreaterThan(10)
  }, 60_000)
})
