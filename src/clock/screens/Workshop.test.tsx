import { act, fireEvent, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const { log, voices, hold, music } = vi.hoisted(() => ({
  log: [] as string[],
  voices: [] as { id: string; caption: string[]; phase: string | null; visible: string[]; exercise: boolean; burst: boolean }[],
  /** voice ids matching `re`, read while the question is asked, play until stopVoices (a long reading) */
  hold: { re: null as RegExp | null, pending: [] as (() => void)[] },
  music: { on: false, held: false },
}))
/** caption text compared without nikkud and case (as plain() below; the mock runs before the imports) */
const plainOf = (s: string) => s.normalize('NFC').replace(/[\u0591-\u05C7]/g, '').toLowerCase()
/** something to answer is on the bench */
const exerciseShown = () => !!document.querySelector('[data-option], [data-face-input]')
/** the caption texts a child can see right now (not hidden, not inside a hidden card) */
const visibleCaptions = () =>
  [...document.querySelectorAll<HTMLElement>('[data-caption]')]
    .filter((e) => !e.closest('[style*="visibility: hidden"]'))
    .map((e) => [...e.querySelectorAll('span')].map((x) => x.textContent).join(' '))
vi.mock('../audio/clockAudio', () => ({
  playVoice: (id: string, caption: string[] = [], onWord?: (i: number) => void) => {
    log.push(`v:${id}`)
    // the voice is heard a moment after the call (the file loads); React has rendered the state set before the call by then
    // (20 ms: a 0 ms timer can run before React's scheduled render in jsdom, and 5 ms did too in a loaded full run; a real
    // voice file takes longer than that to start)
    return new Promise<void>((resolve) => setTimeout(async () => {
      // a loaded full run can take longer than that to draw the Set the clock screen: allow up to 200 ms (still less
      // than a real voice file takes to start) for the caption the voice reads to show
      const want = plainOf(caption.join(' '))
      for (let t = 0; caption.length && t < 180 && !visibleCaptions().some((c) => plainOf(c) === want); t += 10)
        await new Promise((r) => setTimeout(r, 10))
      const phase = document.querySelector('[data-phase]')?.getAttribute('data-phase') ?? null
      voices.push({ id, caption, phase, visible: visibleCaptions(), exercise: exerciseShown(), burst: !!document.querySelector('[data-burst]') })
      if (hold.re?.test(id) && phase === 'ask') { hold.pending.push(resolve); return }
      for (let i = 0; i < caption.length; i++) onWord?.(i)
      resolve()
    }, 20))
  },
  playSfx: (name: string) => { log.push(`s:${name}`); return Promise.resolve() },
  stopVoices: () => { log.push('stop'); hold.pending.splice(0).forEach((r) => r()) },
  startMusic: () => { music.on = true },
  stopMusic: () => { music.on = false },
  holdClockAudio: (on: boolean) => { music.held = on },
  setClockHidden: () => {},
  preloadVoices: () => {},
  configureClockAudio: () => {},
  unlockClockAudio: () => {},
  muteClockAudio: () => {},
}))

import { Workshop } from './Workshop'
import { useClockStore } from '../store'
import { clockTelemetry } from '../telemetry'
import { dayKey } from '../logic/workday'
import { stripNikkud } from '../logic/phrases'

const plain = (s: string) => stripNikkud(s).toLowerCase()

const answerCorrectly = async (container: HTMLElement) => {
  // first rounds play several explanations (0.7 s each after its voice); the full suite runs files in parallel
  await waitFor(() => expect(container.querySelector('[data-phase="answer"]')).not.toBeNull(), { timeout: 10000 })
  const correct = container.querySelector('[data-correct="1"]')
  if (correct) fireEvent.pointerDown(correct)
  else {
    const btn = container.querySelector('[data-test-solve]') as HTMLElement
    fireEvent.click(btn)
  }
  // wait until the answer is consumed, so the next call cannot click the stale DOM of this round
  await waitFor(() => expect(container.querySelector('[data-phase="answer"]')).toBeNull(), { timeout: 4000 })
}

describe('Workshop', () => {
  // a test that fixes Math.random (captions) never leaks it into the next one, even when it fails
  afterEach(() => { (Math.random as unknown as { mockRestore?: () => void }).mockRestore?.() })
  // an explanation waits for the next button (the parent 2026-10-17): the child taps it when the explanation has played
  let autoNext = 0
  beforeEach(() => {
    autoNext = window.setInterval(() => {
      const b = document.querySelector('[data-phase="explain"] [aria-label="next"]')
      if (b) fireEvent.click(b)
    }, 30)
  })
  afterEach(() => window.clearInterval(autoNext))
  beforeEach(() => {
    useClockStore.getState().resetProgress()
    useClockStore.setState({ welcomed: true, bonusExplained: true })
    log.length = 0
    voices.length = 0
    hold.re = null
    hold.pending.length = 0
    music.on = false
    music.held = false
  })
  const playBonus = async (container: HTMLElement) => {
    await waitFor(() => expect(container.querySelector('[aria-label="stop"]')).not.toBeNull(), { timeout: 6000 })
    for (let i = 0; i < 3; i++) {
      fireEvent.pointerDown(container.querySelector('[aria-label="stop"]') as HTMLElement)
      if (i < 2) await new Promise((r) => setTimeout(r, 1100))
    }
    await waitFor(() => expect(container.querySelector('[data-phase="summary"]')).not.toBeNull(), { timeout: 5000 })
  }

  it('a level up is a cheer over the solved question: burst, fanfare, "you learned something new"; the last level adds the master line and the chime', async () => {
    useClockStore.setState({ progress: { level: 6, newAnswers: 'oooo' } })
    const { container } = render(<Workshop onExit={() => {}} />)
    for (let i = 0; i < 8 && useClockStore.getState().progress.level < 7; i++) await answerCorrectly(container)
    expect(useClockStore.getState().progress.level).toBe(7)
    await waitFor(() => expect(log.some((x) => x.startsWith('v:fb-master'))).toBe(true), { timeout: 6000 })
    await waitFor(() => {
      const at = log.findIndex((x) => x.startsWith('s:fanfare'))
      expect(log.slice(at, at + 4).map((x) => x.replace(/-(he|en)$/, ''))).toEqual(['s:fanfare', 'v:fb-levelup', 'v:fb-master', 's:wallchime'])
    })
    // no new-clock announcement (the parent 2026-10-17 dropped the clock collection); the question stays, with the burst
    expect(log.some((x) => x.startsWith('v:fb-newkind'))).toBe(false)
    const up = voices.find((v) => v.id.startsWith('fb-levelup'))!
    expect(up.burst).toBe(true)
    expect(up.exercise).toBe(true)
  }, 60000)

  it('telemetry: explanations, prompt audio, bonus tries; the real-time question is spent on the first workday', async () => {
    const track = vi.spyOn(clockTelemetry, 'track')
    const { container } = render(<Workshop onExit={() => {}} />)
    await answerCorrectly(container)
    expect(useClockStore.getState().lastRealTimeDay).toBe(dayKey(new Date()))
    const explain = track.mock.calls.filter(([e]) => e === 'explain')
    expect(explain[0][1]).toMatchObject({ id: 'hands', trigger: 'intro', lang: expect.any(String) })
    const round = track.mock.calls.find(([e]) => e === 'round')![1] as { audio: string[]; exercise: string }
    expect(Array.isArray(round.audio)).toBe(true)
    if (round.exercise !== 'digitalPick' && round.exercise !== 'digitalSet') expect(round.audio.length).toBeGreaterThan(0)
    for (let i = 0; i < 7; i++) await answerCorrectly(container)
    await playBonus(container)
    const tries = track.mock.calls.filter(([e]) => e === 'bonus').map(([, d]) => d)
    expect(tries).toHaveLength(3)
    expect(tries[0]).toMatchObject({ try: 1, angle: expect.any(Number), gears: expect.any(Number) })
    track.mockRestore()
  }, 90000)

  it('summary: clocks fixed today; its play button starts the next workday; 10 in a row gets the fanfare and a burst', async () => {
    const onExit = vi.fn()
    const { container } = render(<Workshop onExit={onExit} />)
    for (let i = 0; i < 8; i++) await answerCorrectly(container)
    await playBonus(container)
    // the 8 clocks he fixed today hang in a row (no numbers)
    expect(container.querySelector('[data-fixed]')!.getAttribute('data-fixed')).toBe('8')
    expect(container.querySelectorAll('.ck-summary-clocks .ck-clock').length).toBe(8)
    expect(container.querySelector('[data-served]')).toBeNull()
    fireEvent.click(container.querySelector('.ck-summary [aria-label="play"]') as HTMLElement)
    expect(onExit).not.toHaveBeenCalled()
    await answerCorrectly(container)
    await answerCorrectly(container)
    await waitFor(() => expect(log.some((x) => x.startsWith('v:fb-streak'))).toBe(true), { timeout: 4000 })
    const at = log.findIndex((x) => x.startsWith('v:fb-streak'))
    expect(log[at - 1]).toBe('s:fanfare')
    // the burst is on the screen while the streak voice plays
    await waitFor(() => expect(voices.find((v) => v.id.startsWith('fb-streak'))?.burst).toBe(true))
    expect(useClockStore.getState().roundNo).toBe(10)
  }, 120000)

  // Playtest 2026-10-15: "some shown text is not the thing that is spoken". Rule: text shows only while (or after) the
  // voice reads it, and the words glow on the caption that shows them.
  it('captions: no caption shows before its voice reads it; each captioned voice reads a caption on screen and lights it', async () => {
    // a fixed random sequence: the rounds are the same every run, and they include a What time is it round (with random
    // rounds, about one run in ten had none, and the wrong-answer check below failed)
    let seed = 7
    vi.spyOn(Math, 'random').mockImplementation(() => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646)
    const { container } = render(<Workshop onExit={() => {}} />)
    let wrongWhat = false
    for (let i = 0; i < 8; i++) {
      await waitFor(() => expect(container.querySelector('[data-phase="answer"]')).not.toBeNull(), { timeout: 4000 })
      const wrong = container.querySelector('[data-correct="0"]')
      if (wrong && container.querySelector('[data-exercise="what"]')) {
        const correctCard = container.querySelector('[data-correct="1"] [data-caption]')!
        fireEvent.pointerDown(wrong)
        // after a wrong answer the right phrase is read again, on the right card
        await waitFor(() => expect(container.querySelector('[data-phase="answer"]')).toBeNull(), { timeout: 4000 })
        await waitFor(() => expect(correctCard.querySelectorAll('span.now, span.said').length).toBe(correctCard.querySelectorAll('span').length))
        // the right answer stays until he taps next
        await waitFor(() => expect(container.querySelector('[aria-label="next"]')).not.toBeNull(), { timeout: 6000 })
        fireEvent.click(container.querySelector('[aria-label="next"]') as HTMLElement)
        wrongWhat = true
      } else await answerCorrectly(container)
    }
    expect(wrongWhat).toBe(true)
    for (const v of voices) {
      // nothing is written on the screen while a customer says hello, a new clock is announced or the time is asked
      if (v.phase === 'enter') expect(v.visible, `${v.id} in ${v.phase}`).toEqual([])
      // a captioned voice reads one of the captions on the screen, word for word
      if (v.caption.length) expect(v.visible.map(plain), `${v.id} in ${v.phase} after ${voices[voices.indexOf(v) - 1]?.id}`).toContain(plain(v.caption.join(' ')))
    }
    // the time phrases (prompt, cards, feedback) always come with their caption
    expect(voices.filter((v) => v.id.startsWith('ph-') && v.caption.length === 0).every((v) => v.phase === 'feedback')).toBe(true)
  }, 60000)

  it('workday completes with no audio files: 8 customers, then the bonus', async () => {
    const { container } = render(<Workshop onExit={() => {}} />)
    for (let i = 0; i < 8; i++) await answerCorrectly(container)
    await waitFor(() => expect(container.querySelector('[data-phase="bonus"]')).not.toBeNull(), { timeout: 6000 })
    expect(useClockStore.getState().gears).toBe(8)
    expect(useClockStore.getState().roundNo).toBe(8)
  }, 60000)

  const hide = () => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
  }
  const show = (getByRole: (r: string, o: { name: string }) => HTMLElement) => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    fireEvent.click(getByRole('button', { name: 'play' }))
  }

  const planOf = (container: HTMLElement) => ({
    exercise: container.querySelector('[data-exercise]')?.getAttribute('data-exercise') ?? (container.querySelector('[data-face-input]') ? 'set' : null),
    // the clocks and cards on the bench: their hands (not the ticking seconds hand) and their text
    hands: [...container.querySelectorAll<HTMLElement>('.ck-bench [data-hand="hour"], .ck-bench [data-hand="minute"]')].map((h) => h.style.transform),
    text: [...container.querySelectorAll('.ck-bench [data-option]')].map((o) => o.textContent),
  })

  it('visibility hidden pauses, holds the audio silent, and resume asks the same question again', async () => {
    const { container, getByRole } = render(<Workshop onExit={() => {}} />)
    await waitFor(() => expect(container.querySelector('[data-phase="answer"]')).not.toBeNull(), { timeout: 4000 })
    const before = planOf(container)
    const customer = container.querySelector('.ck-customer img')?.getAttribute('src')
    hide()
    expect(container.querySelector('.ck-pause')).not.toBeNull()
    expect(music.held).toBe(true)
    log.length = 0
    show(getByRole as never)
    expect(music.held).toBe(false)
    await waitFor(() => expect(container.querySelector('[data-phase="answer"]')).not.toBeNull(), { timeout: 4000 })
    // the same customer, with no second entrance, and the same clocks and answers
    expect(log).not.toContain('s:doorbell')
    expect(container.querySelector('.ck-customer img')?.getAttribute('src')).toBe(customer)
    expect(planOf(container)).toEqual(before)
    await answerCorrectly(container)
    await waitFor(() => expect(useClockStore.getState().roundNo).toBe(1))
  }, 20000)

  it('a pause during the narration of the question brings back the same question', async () => {
    useClockStore.setState({ explained: { hands: 0, 'ex-find': 0, 'ex-what': 0, 'ex-set': 0, 'ex-digital': 0, seconds: 0, nonumbers: 0 } })
    const { container, getByRole } = render(<Workshop onExit={() => {}} />)
    hold.re = /^ph-/
    for (let i = 0; i < 8; i++) {
      // a round whose question is read aloud
      await waitFor(() => expect(hold.pending.length > 0 || !!container.querySelector('[data-phase="answer"]')).toBe(true), { timeout: 4000 })
      if (!hold.pending.length) { await answerCorrectly(container); continue }
      expect(container.querySelector('[data-phase="ask"]')).not.toBeNull()
      const before = planOf(container)
      hide()
      hold.pending.length = 0
      show(getByRole as never)
      await waitFor(() => expect(hold.pending.length).toBeGreaterThan(0), { timeout: 4000 })
      expect(planOf(container).exercise).toBe(before.exercise)
      hold.re = null
      hold.pending.splice(0).forEach((r) => r())
      await waitFor(() => expect(container.querySelector('[data-phase="answer"]')).not.toBeNull(), { timeout: 4000 })
      if (before.exercise !== 'what') expect(planOf(container)).toEqual(before)
      expect(useClockStore.getState().roundNo).toBe(i)
      return
    }
    throw new Error('no narrated question in 8 rounds')
  }, 60000)

  it('the bench does not flash at the end of a round with a level up (the parent: "things changed and disappeared")', async () => {
    useClockStore.setState({ progress: { level: 2, newAnswers: 'oooooooo' } })
    const seen: { phase: string | null; exercise: boolean }[] = []
    const { container } = render(<Workshop onExit={() => {}} />)
    const obs = new MutationObserver(() => {
      const s = { phase: container.querySelector('[data-phase]')?.getAttribute('data-phase') ?? null, exercise: exerciseShown() }
      const last = seen[seen.length - 1]
      if (!last || last.phase !== s.phase || last.exercise !== s.exercise) seen.push(s)
    })
    obs.observe(container, { subtree: true, childList: true, attributes: true })
    for (let i = 0; i < 4 && useClockStore.getState().progress.level < 3; i++) await answerCorrectly(container)
    expect(useClockStore.getState().progress.level).toBe(3)
    await waitFor(() => expect(container.querySelector('[data-phase="enter"]')).not.toBeNull(), { timeout: 8000 })
    obs.disconnect()
    const up = seen.findIndex((x) => x.phase === 'levelup')
    expect(up).toBeGreaterThan(-1)
    const next = seen.findIndex((x, i) => i > up && x.phase === 'enter')
    // the solved question stays on the bench through the cheer and the leave: nothing goes away and comes back
    expect(seen.slice(up, next).every((x) => x.exercise), JSON.stringify(seen.slice(up))).toBe(true)
  }, 60000)

  it('the question comes right before the answers: after a first-time explanation it is asked again (the parent: "I don\'t remember the question anymore")', async () => {
    // a fresh player: the first rounds bring explanations; the customer's own question comes before them
    const { container } = render(<Workshop onExit={() => {}} />)
    let checked = 0
    for (let r = 0; r < 6; r++) {
      const from = log.length
      await answerCorrectly(container)
      const round = log.slice(from)
      const lastExp = round.reduce((at, x, i) => (x.startsWith('v:exp-') ? i : at), -1)
      if (lastExp < 0) continue
      // an explanation that is itself the question (Find, What time is it) may come last; any other is followed by a question
      if (/^v:exp-ex-(find|what)/.test(round[lastExp])) continue
      expect(round.slice(lastExp + 1).some((x) => /^v:ask-/.test(x)), round.join(' ')).toBe(true)
      checked++
    }
    expect(checked).toBeGreaterThan(0)
  }, 90000)

  it('after a mistake the right answer stays on the bench until he taps next (no automatic next question)', async () => {
    const { container } = render(<Workshop onExit={() => {}} />)
    for (let r = 0; r < 8; r++) {
      await waitFor(() => expect(container.querySelector('[data-phase="answer"]')).not.toBeNull(), { timeout: 10000 })
      const wrong = container.querySelector('[data-option][data-correct="0"]')
      if (!wrong) { await answerCorrectly(container); continue }
      const served = useClockStore.getState().roundNo
      fireEvent.pointerDown(wrong)
      await waitFor(() => expect(container.querySelector('[aria-label="next"]')).not.toBeNull(), { timeout: 8000 })
      await new Promise((res) => setTimeout(res, 800))
      // still the same round: the answer with its marks on the bench, no new customer
      expect(container.querySelector('[data-phase]')?.getAttribute('data-phase')).toBe('feedback')
      expect(container.querySelector('.ck-option.right')).not.toBeNull()
      expect(useClockStore.getState().roundNo).toBe(served + 1)
      fireEvent.click(container.querySelector('[aria-label="next"]') as HTMLElement)
      await waitFor(() => expect(container.querySelector('[data-phase="enter"]')).not.toBeNull(), { timeout: 5000 })
      expect(container.querySelector('[aria-label="next"]')).toBeNull()
      return
    }
    throw new Error('no choice round in 8 rounds')
  }, 90000)

  it('hints: the hint that fits the time shows by itself at first, later behind the hint button', async () => {
    // level 2: half past times (the quarters hint); he has seen it enough, so it waits behind the button
    useClockStore.setState({ progress: { level: 2, newAnswers: '' }, hintsSeen: { quarters: 99, minutes: 99 } })
    const { container } = render(<Workshop onExit={() => {}} />)
    for (let r = 0; r < 8; r++) {
      await waitFor(() => expect(container.querySelector('[data-phase="answer"]')).not.toBeNull(), { timeout: 10000 })
      const btn = container.querySelector('[aria-label="hint"]')
      if (!btn) { expect(container.querySelector('[data-ring]')).toBeNull(); await answerCorrectly(container); continue }
      expect(container.querySelector('[data-ring]')).toBeNull()
      fireEvent.click(btn)
      await waitFor(() => expect(container.querySelector('[data-ring="quarters"]')).not.toBeNull())
      expect(container.querySelector('[aria-label="hint"]')).toBeNull()
      return
    }
    throw new Error('no round with a hint in 8 rounds')
  }, 90000)

  it('flow: the question appears only after the customer and the explanations; nothing to answer before it', async () => {
    const seen: { phase: string | null; exercise: boolean; explain: boolean }[] = []
    const { container } = render(<Workshop onExit={() => {}} />)
    const obs = new MutationObserver(() => {
      const s = { phase: container.querySelector('[data-phase]')?.getAttribute('data-phase') ?? null, exercise: exerciseShown(), explain: !!container.querySelector('.ck-explain') }
      const last = seen[seen.length - 1]
      if (!last || last.phase !== s.phase || last.exercise !== s.exercise || last.explain !== s.explain) seen.push(s)
    })
    obs.observe(container, { subtree: true, childList: true, attributes: true })
    await answerCorrectly(container)
    obs.disconnect()
    // nothing to answer while the customer comes in or an explanation plays
    expect(seen.filter((s) => s.phase === 'enter' || s.phase === 'explain' || s.explain).every((s) => !s.exercise), JSON.stringify(seen)).toBe(true)
    // once the question shows, no explanation hides it again in this round
    const first = seen.findIndex((s) => s.exercise)
    expect(first).toBeGreaterThan(-1)
    expect(seen.slice(first).some((s) => s.explain)).toBe(false)
    // the order of the voices: the doorbell and the customer's request, the first-time explanation, then the question
    const at = (re: RegExp) => log.findIndex((x) => re.test(x))
    expect(at(/^s:doorbell/)).toBeLessThan(at(/^v:cust-/))
    expect(at(/^v:cust-/)).toBeLessThan(at(/^v:exp-hands/))
    const q = log.findIndex((x) => /^v:ph-/.test(x))
    if (q >= 0) expect(at(/^v:exp-hands/)).toBeLessThan(q)
    for (const v of voices) if (v.id.startsWith('exp-') || v.id.startsWith('cust-')) expect(v.exercise, v.id).toBe(false)
  }, 20000)

  it('a tap while the answers are read is accepted at once and stops the reading', async () => {
    useClockStore.setState({ explained: { hands: 0, 'ex-find': 0, 'ex-what': 0, 'ex-set': 0, 'ex-digital': 0, seconds: 0, nonumbers: 0 } })
    const { container } = render(<Workshop onExit={() => {}} />)
    hold.re = /^ph-/
    let choice = 0
    for (let i = 0; i < 8 && choice === 0; i++) {
      await waitFor(() => expect(hold.pending.length > 0 || !!container.querySelector('[data-phase="answer"]')).toBe(true), { timeout: 4000 })
      if (!hold.pending.length) { await answerCorrectly(container); continue }
      expect(container.querySelector('[data-phase="ask"]')).not.toBeNull()
      const option = [...container.querySelectorAll<HTMLElement>('[data-option]')].find((e) => !e.closest('[style*="visibility: hidden"]'))
      log.length = 0
      if (option) { fireEvent.pointerDown(option); choice++ }
      else fireEvent.click(container.querySelector('[data-test-solve]') as HTMLElement)
      // the reading stops and the answer is graded with no wait for the other answers
      expect(log[0]).toBe('stop')
      await waitFor(() => expect(container.querySelector('[data-phase="feedback"], [data-phase="levelup"], [data-phase="leave"]')).not.toBeNull(), { timeout: 4000 })
      expect(log.filter((x) => x.startsWith('v:ph-')).length).toBeLessThanOrEqual(1) // only the feedback phrase, no more answers read
      await waitFor(() => expect(useClockStore.getState().roundNo).toBe(i + 1))
      hold.pending.splice(0).forEach((r) => r())
    }
    expect(choice).toBe(1)
  }, 60000)

  it('music: off while customers and questions are on; on for the bonus and the summary', async () => {
    const { container } = render(<Workshop onExit={() => {}} />)
    for (let i = 0; i < 8; i++) {
      await waitFor(() => expect(container.querySelector('[data-phase="answer"]')).not.toBeNull(), { timeout: 10000 })
      expect(music.on).toBe(false)
      await answerCorrectly(container)
      expect(music.on).toBe(false)
    }
    await waitFor(() => expect(container.querySelector('[data-phase="bonus"]')).not.toBeNull(), { timeout: 10000 })
    // the music starts in an effect after the bonus renders
    await waitFor(() => expect(music.on).toBe(true), { timeout: 5000 })
    await playBonus(container)
    expect(music.on).toBe(true)
    fireEvent.click(container.querySelector('.ck-summary [aria-label="play"]') as HTMLElement)
    await waitFor(() => expect(container.querySelector('[data-phase="enter"], [data-phase="explain"], [data-phase="ask"], [data-phase="answer"]')).not.toBeNull(), { timeout: 5000 })
    expect(music.on).toBe(false)
  }, 90000)

  it('a pause during feedback commits the round once and the next customer comes', async () => {
    const { container, getByRole } = render(<Workshop onExit={() => {}} />)
    await answerCorrectly(container)
    hide()
    expect(useClockStore.getState().roundNo).toBe(1)
    show(getByRole as never)
    // 1 served before the pause + 7 after = 8 customers, then the bonus (pre-fix it needed 9)
    for (let i = 0; i < 7; i++) await answerCorrectly(container)
    await waitFor(() => expect(container.querySelector('[data-phase="bonus"]')).not.toBeNull(), { timeout: 6000 })
    expect(useClockStore.getState().roundNo).toBe(8)
    expect(useClockStore.getState().gears).toBe(8)
  }, 60000)

  it('a pause during the bonus does not start a ninth round (bonus)', async () => {
    const { container, getByRole } = render(<Workshop onExit={() => {}} />)
    for (let i = 0; i < 8; i++) await answerCorrectly(container)
    await waitFor(() => expect(container.querySelector('[data-phase="bonus"]')).not.toBeNull(), { timeout: 6000 })
    hide()
    show(getByRole as never)
    await waitFor(() => expect(container.querySelector('[data-phase="bonus"]')).not.toBeNull())
    await new Promise((r) => setTimeout(r, 300))
    expect(useClockStore.getState().roundNo).toBe(8)
    expect(useClockStore.getState().gears).toBe(8)
  }, 60000)

  it('a pause during the bonus mounts a fresh bonus that can finish the day', async () => {
    const { container, getByRole } = render(<Workshop onExit={() => {}} />)
    for (let i = 0; i < 8; i++) await answerCorrectly(container)
    await waitFor(() => expect(container.querySelector('[data-phase="bonus"]')).not.toBeNull(), { timeout: 6000 })
    hide()
    expect(container.querySelector('[aria-label="stop"]')).toBeNull()
    show(getByRole as never)
    await waitFor(() => expect(container.querySelector('[aria-label="stop"]')).not.toBeNull())
    for (let i = 0; i < 3; i++) {
      fireEvent.pointerDown(container.querySelector('[aria-label="stop"]') as HTMLElement)
      if (i < 2) await new Promise((r) => setTimeout(r, 1100))
    }
    await waitFor(() => expect(container.querySelector('[data-phase="summary"]')).not.toBeNull(), { timeout: 5000 })
    expect(useClockStore.getState().roundNo).toBe(8)
    // no tower anywhere (the parent 2026-10-16: it had no place in the story)
    expect(container.querySelectorAll('.ck-tower')).toHaveLength(0)
  }, 90000)
})
