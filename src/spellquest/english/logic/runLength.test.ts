// The run's length on the English cycle (design Part 5, Run length): with the English visit lengths, a child who misses
// 1 answer in 5 sees at least 3 screens a run on average, and three runs in a row reach every screen most of the time.
// The run's own rules (logic/run.ts): the hearts of a run, a heart back at the end of a full pass, the next run starting
// after the screen where the last one ended.
import { describe, expect, it } from 'vitest'
import { cycleOf, heartsAtRunStart, nextScreen, onAnswer, passEndHeart, runStart } from '../../logic/run'
import type { ScreenId } from '../../logic/predict'
import { ENGLISH } from '../course'

/** mulberry32 */
function seeded(seed: number): () => number {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const STAGE = 4
const MISTAKE = 1 / 5
/** the tower's wave has 5 monsters: 5 answers */
const WAVE = 5
const stages = ENGLISH.stages
const answersOf = (s: ScreenId) => stages.visit[s] * (s === 'tower' ? WAVE : 1)

/** one run from where the last one ended: the screens it visited and the screen where it ended */
function run(rng: () => number, lastEnded: ScreenId | null): { screens: ScreenId[]; ended: ScreenId } {
  let screen = runStart(STAGE, lastEnded, true, true, stages)
  let hearts = heartsAtRunStart()
  let full = screen === cycleOf(STAGE, true, true, stages)[0]
  const screens: ScreenId[] = []
  for (;;) {
    screens.push(screen)
    for (let i = 0; i < answersOf(screen); i++) {
      const o = onAnswer(hearts, rng() < MISTAKE ? 'wrong' : 'right')
      hearts = o.hearts
      if (o.over) return { screens, ended: screen }
    }
    const nx = nextScreen(STAGE, screen, true, true, stages)
    if (nx.newCycle) {
      if (full) hearts = passEndHeart(hearts).hearts
      full = true
    }
    screen = nx.screen
  }
}

const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length
const share = (xs: boolean[]) => xs.filter(Boolean).length / xs.length

describe('the English run length', () => {
  it('stage 4 has 8 open screens', () => expect(cycleOf(STAGE, true, true, stages)).toHaveLength(8))

  it('at 1 mistake in 5: at least 3 screens a run, and three runs reach every screen', () => {
    const rng = seeded(11)
    const all = cycleOf(STAGE, true, true, stages)
    const screensPerRun: number[] = []
    const threeRunsReachAll: boolean[] = []
    // 2,000 runs, in groups of three in a row from a fresh save (the last group has two)
    for (let n = 0; n < 2000; n += 3) {
      let lastEnded: ScreenId | null = null
      const seen = new Set<ScreenId>()
      for (let k = 0; k < 3 && n + k < 2000; k++) {
        const r = run(rng, lastEnded)
        screensPerRun.push(r.screens.length)
        r.screens.forEach((s) => seen.add(s))
        lastEnded = r.ended
      }
      threeRunsReachAll.push(all.every((s) => seen.has(s)))
    }
    expect(screensPerRun).toHaveLength(2000)
    expect(mean(screensPerRun)).toBeGreaterThanOrEqual(3)
    expect(share(threeRunsReachAll)).toBeGreaterThan(0.8)
  }, 60_000)
})
