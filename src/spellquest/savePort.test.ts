import { beforeEach, describe, expect, it } from 'vitest'
import { memorySavePort, readOnlySavePort, storeSavePort } from './savePort'
import { FRESH_MERCHANT, useSpellQuestStore } from './store'
import { useProgressStore } from '../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../types/progress'
import { RunController, type View } from './controller'
import { instantSleeper } from '../shared/sleeper'
import { installFakeAudio } from '../shared/gameAudio/fakePlayer'

installFakeAudio()

beforeEach(() => {
  useSpellQuestStore.getState().resetProgress()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
})

describe('storeSavePort', () => {
  it('reads and writes the real saves', () => {
    useProgressStore.setState({ tower: { ...INITIAL_PROGRESS_STATE.tower, recent: { patah: 'oox' } } })
    storeSavePort.addCoins(3)
    storeSavePort.noteMerchant('visit')
    expect(useSpellQuestStore.getState().coins).toBe(3)
    expect(storeSavePort.read().merchant.visits).toBe(1)
    expect(storeSavePort.firstDuelRecent()).toEqual({ patah: 'oox' })
  })
})

describe('memorySavePort', () => {
  it('starts as a fresh save with the given fields, and its writes work as in the real save', () => {
    const save = memorySavePort({ coins: 10, stage: { stage: 2, newAnswers: '' } }, { qamatz: 'ooo' })
    expect(save.read().coins).toBe(10)
    expect(save.read().stage.stage).toBe(2)
    expect(save.read().merchant).toEqual(FRESH_MERCHANT)
    expect(save.spendCoins(4)).toBe(true)
    expect(save.spendCoins(40)).toBe(false)
    save.recordAnswer({ features: ['l:bet'], miss: true, newStage: false })
    save.merchantPaid(true); save.merchantPaid(true); save.merchantPaid(true)
    expect(save.read().coins).toBe(6)
    expect(save.read().tallies['l:bet']).toEqual({ seen: 1, wrong: 1 })
    expect(save.read().roundNo).toBe(1)
    expect(save.read().merchant.level).toBe(1)
    expect(save.firstDuelRecent()).toEqual({ qamatz: 'ooo' })
  })

  it('never touches the real save, and two of them are separate', () => {
    const a = memorySavePort()
    const b = memorySavePort()
    a.addCoins(5)
    a.markScreensOpen()
    expect(a.read().coins).toBe(5)
    expect(b.read().coins).toBe(0)
    expect(useSpellQuestStore.getState().coins).toBe(0)
    expect(useSpellQuestStore.getState().screensOpen).toBe(false)
  })

  it('a read is a snapshot: it does not change after a write', () => {
    const save = memorySavePort()
    const before = save.read()
    save.addCrystal()
    expect(before.crystals).toBe(0)
    expect(save.read().crystals).toBe(1)
  })
})

describe('readOnlySavePort (the gallery)', () => {
  it('reads its base as it is now and writes nothing', () => {
    const base = memorySavePort({ coins: 7 })
    const ro = readOnlySavePort(base)
    ro.addCoins(5)
    ro.setMerchantFlag('undoShown')
    expect(ro.recordAnswer({ features: ['l:bet'], miss: false, newStage: true })).toEqual({ passed: false })
    expect(ro.spendCoins(1)).toBe(false)
    expect(base.read().coins).toBe(7)
    expect(base.read().tallies).toEqual({})
    base.addCoins(1)
    expect(ro.read().coins).toBe(8)
  })
})

describe('the run on the seams', () => {
  /** lets the run go on: the instant clock pumps on microtasks, the audio kit on the real timers */
  async function until(c: RunController, pred: (v: View) => boolean) {
    for (let i = 0; i < 2000 && !pred(c.view); i++) await new Promise((r) => setTimeout(r, 0))
    if (!pred(c.view)) throw new Error(`condition not met; phase=${c.view.phase} screen=${c.view.screen?.screen}`)
  }

  it('plays a round on a save in memory and a clock that never waits', async () => {
    const save = memorySavePort({ screensOpen: true, demosSeen: ['demo-ghosts-letter'] })
    const time = instantSleeper()
    const c = new RunController({ save, sleeper: time, rng: () => 0.3, force: { screen: 'ghosts', stage: 2, kind: 'letter' } })
    c.start()
    await until(c, (v) => v.screen?.screen === 'ghosts' && v.phase === 'answer')
    const s = c.view.screen as { target: { id: string } }
    c.gesture({ type: 'pick', id: s.target.id })
    await until(c, () => save.read().roundNo === 1)
    expect(save.read().totalStars).toBe(1)
    expect(useSpellQuestStore.getState().roundNo).toBe(0)
    expect(useSpellQuestStore.getState().totalStars).toBe(0)
    c.destroy()
  })
})
