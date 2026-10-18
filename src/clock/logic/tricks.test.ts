import { describe, expect, it } from 'vitest'
import { HOURS, MINUTES, angleDiff, minutesUpTo, poseOf, sameTime } from './time'
import { TRICK_FAMILIES, makeOptions, mirrorTime, trickOption, type OptionKind } from './tricks'

const seeded = (seed: number) => () => {
  seed = (seed * 16807) % 2147483647
  return (seed - 1) / 2147483646
}
const all = HOURS.flatMap((h) => MINUTES.map((m) => ({ h, m })))

describe('tricks', () => {
  it('mirror keeps the hour word', () => {
    expect(mirrorTime({ h: 3, m: 15 })).toEqual({ h: 2, m: 45 })
    expect(mirrorTime({ h: 3, m: 45 })).toEqual({ h: 4, m: 15 })
    expect(mirrorTime({ h: 3, m: 30 })).toBeNull()
  })
  it('swap on a clock shows the misread time with its hands where they belong (never an impossible clock)', () => {
    const o = trickOption('swap', { h: 3, m: 0 }, 'clock', seeded(1))!
    expect(o.time).toEqual({ h: 12, m: 15 })
    expect(o.pose.minute).toBe(90)
    expect(o.pose.hour).toBe(7.5) // a quarter of the way from 12 to 1
  })
  it('number-as-minutes on a digital card', () => {
    expect(trickOption('numberAsMin', { h: 3, m: 20 }, 'digital', seeded(1))!.digital).toBe('3:04')
  })
  it('not advanced is never a clock picture (an impossible clock, nearly the same as the right one)', () => {
    expect(trickOption('notAdvanced', { h: 3, m: 45 }, 'clock', seeded(1))).toBeNull()
    expect(trickOption('notAdvanced', { h: 9, m: 30 }, 'phrase', seeded(1))!.time).toEqual({ h: 10, m: 30 })
  })
  it('every clock picture among the options is a possible clock: the short hand sits where the long hand puts it', () => {
    const rng = seeded(3)
    for (const t of all) for (const f of TRICK_FAMILIES) {
      const o = trickOption(f, t, 'clock', rng)
      if (!o) continue
      const min = o.pose.minute / 6
      const want = ((((o.pose.hour - (min / 60) * 30) % 30) + 30) % 30)
      expect(Math.min(want, 30 - want), `${f} ${t.h}:${t.m}`).toBeLessThan(0.01)
    }
  })
  it('all 144 times × 3 kinds × every family pair give 3 distinct options, exactly one right', () => {
    const rng = seeded(7)
    const kinds: OptionKind[] = ['clock', 'phrase', 'digital']
    const failures: string[] = []
    for (const t of all)
      for (const kind of kinds)
        for (const a of TRICK_FAMILIES)
          for (const b of TRICK_FAMILIES) {
            const { options, correctIndex } = makeOptions(t, kind, [a, b], rng)
            // Check length
            if (options.length !== 3) failures.push(`${JSON.stringify(t)} ${kind} [${a},${b}]: length ${options.length} !== 3`)
            // Check correctIndex family is null
            if (options[correctIndex].family !== null) failures.push(`${JSON.stringify(t)} ${kind} [${a},${b}]: correctIndex.family is ${options[correctIndex].family}, not null`)
            // Check exactly one null family
            const nullCount = options.filter((o) => o.family === null).length
            if (nullCount !== 1) failures.push(`${JSON.stringify(t)} ${kind} [${a},${b}]: ${nullCount} families are null, not 1`)
            // Check distinctness and kind-specific constraints
            for (let i = 0; i < 3; i++)
              for (let j = i + 1; j < 3; j++) {
                const x = options[i], y = options[j]
                if (kind === 'clock') {
                  const hDiff = angleDiff(x.pose.hour, y.pose.hour)
                  const mDiff = angleDiff(x.pose.minute, y.pose.minute)
                  if (hDiff < 4 && mDiff < 4) failures.push(`${JSON.stringify(t)} ${kind} [${a},${b}] options ${i},${j}: duplicate clock pose`)
                }
                if (kind === 'phrase') {
                  if (x.time && y.time && sameTime(x.time, y.time)) failures.push(`${JSON.stringify(t)} ${kind} [${a},${b}] options ${i},${j}: same phrase time`)
                }
                if (kind === 'digital') {
                  if (x.digital === y.digital) failures.push(`${JSON.stringify(t)} ${kind} [${a},${b}] options ${i},${j}: same digital ${x.digital}`)
                }
              }
            // Check all phrase options have non-null time
            if (kind === 'phrase') {
              options.forEach((o, idx) => {
                if (o.time === null) failures.push(`${JSON.stringify(t)} ${kind} [${a},${b}] option ${idx}: phrase with null time`)
              })
            }
            // Check correctIndex pose matches
            const expectedPose = poseOf(t)
            const actualPose = options[correctIndex].pose
            if (actualPose.hour !== expectedPose.hour || actualPose.minute !== expectedPose.minute) {
              failures.push(`${JSON.stringify(t)} ${kind} [${a},${b}]: correctIndex.pose {hour:${actualPose.hour},minute:${actualPose.minute}} !== {hour:${expectedPose.hour},minute:${expectedPose.minute}}`)
            }
          }
    expect(failures).toEqual([])
  }, 120_000)
  it('a confused time is offered', () => {
    const { options } = makeOptions({ h: 3, m: 15 }, 'phrase', ['far', 'far'], seeded(3), { h: 2, m: 45 })
    expect(options.some((o) => o.family === 'confusion' && o.time && sameTime(o.time, { h: 2, m: 45 }))).toBe(true)
  })
  it('wrong answers use only the minutes he has learned (level 1: o\'clock only), except a hand picture that imitates a misreading', () => {
    const rng = seeded(11)
    const bad: string[] = []
    for (let level = 1; level <= 7; level++) {
      const known = minutesUpTo(level)
      for (const t of all.filter((x) => known.includes(x.m)))
        for (const kind of ['clock', 'phrase', 'digital'] as OptionKind[])
          for (const a of TRICK_FAMILIES)
            for (const b of TRICK_FAMILIES) {
              const { options } = makeOptions(t, kind, [a, b], rng, null, known)
              if (options.length !== 3) bad.push(`L${level} ${JSON.stringify(t)} ${kind} [${a},${b}]: ${options.length} options`)
              for (const o of options) {
                const picture = kind === 'clock' && (o.family === 'swap' || o.family === 'notAdvanced' || o.family === 'seconds')
                if (o.time && !known.includes(o.time.m) && !picture) bad.push(`L${level} ${JSON.stringify(t)} ${kind} ${o.family}: ${o.time.h}:${o.time.m}`)
              }
            }
    }
    expect(bad.slice(0, 10)).toEqual([])
  })
})
