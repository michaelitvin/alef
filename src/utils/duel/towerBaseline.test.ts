// The baseline of the tower (Book 2's first duel) before the course seam: two waves and a boss on a seeded rng, an
// instant clock and the fake audio kit, embedded as Book 2 embeds it. A later diff in these snapshots is a regression.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DuelController, type DuelEmbedded } from './controller'
import { setDuelAudioLog } from './duelAudio'
import { isTwin } from './rules'
import type { Choice } from '../../types/duel'
import { instantSleeper } from '../../shared/sleeper'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { useProgressStore } from '../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../types/progress'
import { seeded } from '../../duel2/testing/runHarness'

const audio = installFakeAudio()

beforeEach(() => {
  // only the date is fixed (the save stamps `lastPlayed`); the timers stay real
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date('2026-11-18T09:00:00Z'))
  localStorage.clear()
  useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
})

afterEach(() => { vi.useRealTimers() })

async function until(pred: () => boolean, what: string) {
  for (let i = 0; i < 20_000 && !pred(); i++) await new Promise((r) => setTimeout(r, 0))
  if (!pred()) throw new Error(`condition not met: ${what}`)
}

interface Visit { rounds: { type: string; target: string; runes: string[] }[]; events: unknown[]; done: number[]; answers: string[] }

/** one visit as Book 2 embeds it (nothing seen yet, nothing owed): right, right, wrong (a twin first when the round has one), right, … */
async function visit(emb: Pick<DuelEmbedded, 'wave' | 'waves' | 'boss'>): Promise<Visit> {
  const v: Visit = { rounds: [], events: [], done: [], answers: [] }
  const seen: string[] = []
  const c = new DuelController({
    embedded: {
      ...emb, seen, onSeen: (k) => { seen.push(k) },
      onAnswer: (r, m) => { v.answers.push(`${r}:${m}`); return 'on' },
      onDone: (w) => { v.done.push(w) },
    },
    rng: seeded(7), sleeper: instantSleeper(),
    telemetry: { track: (e, data = {}) => { v.events.push({ e, data }) }, flush: () => {} },
  })
  setDuelAudioLog({ track: (e, data = {}) => { v.events.push({ e, data, from: 'audio' }) } })
  let last = ''
  const roundIds = new Set<number>()
  let n = 0
  const stop = c.subscribe(() => {
    const s = c.getView().state
    const r = s.round
    if (!r || s.outcome || s.preview || s.paused) return
    const key = `${r.id}:${s.bossHp}`
    if (key === last) return
    last = key
    if (!roundIds.has(r.id)) { roundIds.add(r.id); v.rounds.push({ type: r.type, target: r.target.id, runes: r.runes.map((m) => m.id) }) }
    const wrong = ++n % 3 === 0
    const right: Choice = r.type === 'D' ? { kind: 'sound', group: r.target.group } : { kind: 'rune', mark: r.target }
    const others: Choice[] = r.type === 'D'
      ? r.padWords.filter((w) => w.group !== r.target.group).map((w) => ({ kind: 'sound', group: w.group }) as Choice)
      : r.runes.filter((m) => m.id !== r.target.id).map((m) => ({ kind: 'rune', mark: m }) as Choice)
    queueMicrotask(() => {
      if (!wrong) { c.choose(right); return }
      const twin = others.find((o) => isTwin(r, o))
      if (twin) { c.choose(twin); c.choose(right) } else c.choose(others[0])
    })
  })
  c.start()
  try { await until(() => v.done.length > 0, 'the visit ends') } finally { stop(); c.destroy() }
  return v
}

describe('the tower baseline', () => {
  it('two waves, then a boss: the lines, the rounds, the events and the first duel\'s save', async () => {
    const log = { lines: [] as string[], rounds: [] as Visit['rounds'], events: [] as unknown[], answers: [] as string[], done: [] as number[] }
    for (const emb of [{ wave: 1, waves: 2, boss: false }, { wave: 5, waves: 1, boss: true }]) {
      const v = await visit(emb)
      log.rounds.push(...v.rounds)
      log.events.push(...v.events)
      log.answers.push(...v.answers)
      log.done.push(...v.done)
    }
    setDuelAudioLog(null)
    log.lines = audio.said()
    expect(log.answers.length).toBeGreaterThan(10)
    expect(log).toMatchSnapshot()
    expect(useProgressStore.getState().duel).toMatchSnapshot()
  }, 120_000)
})
