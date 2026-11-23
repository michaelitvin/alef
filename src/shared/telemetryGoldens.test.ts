// @vitest-environment jsdom

// The export, pinned before the storage changes: each golden is `exportDoc` of a synthetic log, as today's code wrote it.
// Later changes (chunks, codec, roll-ups) must give the same bytes for the same events.
import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { readLog } from './telemetry'
import { SPELLQUEST_LOG } from '../spellquest/telemetryLog'
import { ENGLISH_LOG } from '../spellquest/english/telemetryLog'
import { CLOCK_LOG } from '../clock/telemetryLog'
import { SPACECAT_LOG } from '../spacecat/telemetryLog'
import { TOWER_HISTORY_LOG } from '../spellquest/tower/logic/telemetryHistory'
import { FIXTURE_EVENT_NAMES, FROZEN_HISTORY, GOLDEN_SPELLQUEST, GOLDEN_SPELLQUEST_SPELL, GOLDEN_CLOCK, GOLDEN_ENGLISH, GOLDEN_NOW, GOLDEN_SPACECAT, spellQuestEvents, goldenExport } from './__fixtures__/telemetry/generate'

const SINCE = GOLDEN_NOW.getTime() - 30 * 24 * 60 * 60 * 1000

describe('the export goldens', () => {
  it('Spell Quest: all, and the last 30 days', async () => {
    await expect(goldenExport(SPELLQUEST_LOG, GOLDEN_SPELLQUEST())).toMatchFileSnapshot('./__fixtures__/telemetry/spellquest-all.golden.json')
    await expect(goldenExport(SPELLQUEST_LOG, GOLDEN_SPELLQUEST(), SINCE)).toMatchFileSnapshot('./__fixtures__/telemetry/spellquest-30d.golden.json')
  })

  it('the clock: all', async () => {
    await expect(goldenExport(CLOCK_LOG, GOLDEN_CLOCK())).toMatchFileSnapshot('./__fixtures__/telemetry/clock-all.golden.json')
  })

  it('English: all', async () => {
    await expect(goldenExport(ENGLISH_LOG, GOLDEN_ENGLISH())).toMatchFileSnapshot('./__fixtures__/telemetry/english-all.golden.json')
  })

  it('the Hebrew spell book: all', async () => {
    await expect(goldenExport(SPELLQUEST_LOG, GOLDEN_SPELLQUEST_SPELL())).toMatchFileSnapshot('./__fixtures__/telemetry/spellquest-spell.golden.json')
  })

  it('Space Cat: all', async () => {
    await expect(goldenExport(SPACECAT_LOG, GOLDEN_SPACECAT())).toMatchFileSnapshot('./__fixtures__/telemetry/spacecat-all.golden.json')
  })

  it('the tower\'s frozen history, read from storage', async () => {
    localStorage.setItem(TOWER_HISTORY_LOG.key, FROZEN_HISTORY)
    await expect(goldenExport(TOWER_HISTORY_LOG, readLog(TOWER_HISTORY_LOG.key))).toMatchFileSnapshot('./__fixtures__/telemetry/frozen.golden.json')
    expect(localStorage.getItem(TOWER_HISTORY_LOG.key)).toBe(FROZEN_HISTORY)
    localStorage.clear()
  })

  it('a log stored as today\'s build stores it reads back to the same export', () => {
    const evs = GOLDEN_SPELLQUEST()
    localStorage.setItem(SPELLQUEST_LOG.key, JSON.stringify({ v: 1, events: evs }))
    expect(goldenExport(SPELLQUEST_LOG, readLog(SPELLQUEST_LOG.key))).toBe(goldenExport(SPELLQUEST_LOG, evs))
    localStorage.clear()
  })
})

describe('the fixtures cover every event the games send', () => {
  const files = readdirSync('src', { recursive: true, encoding: 'utf8' })
    .filter((f) => /\.tsx?$/.test(f) && !/\.test\.tsx?$/.test(f) && !f.includes('__fixtures__'))
  const names = new Set<string>()
  for (const f of files) {
    const src = readFileSync(`src/${f}`, 'utf8')
    for (const m of src.matchAll(/track\??\.?\(\s*'([a-z][a-z0-9_-]*)'/g)) names.add(m[1]!)
    for (const m of src.matchAll(/\{ e: '([a-z][a-z0-9_-]*)'/g)) names.add(m[1]!)
    for (const m of src.matchAll(/track\(\w+ \? '([a-z][a-z0-9_-]*)' : '([a-z][a-z0-9_-]*)'/g)) { names.add(m[1]!); names.add(m[2]!) }
  }

  it('finds the call sites', () => expect(names.size).toBeGreaterThan(50))
  it('every call-site name is in the generator', () => {
    expect([...names].filter((n) => !FIXTURE_EVENT_NAMES.has(n))).toEqual([])
  })
  it('every generator name is in a golden log', () => {
    const inLogs = new Set([...GOLDEN_SPELLQUEST(), ...GOLDEN_CLOCK(), ...GOLDEN_SPACECAT(), ...GOLDEN_ENGLISH(), ...GOLDEN_SPELLQUEST_SPELL()].map((e) => e.e))
    expect([...FIXTURE_EVENT_NAMES].filter((n) => !inLogs.has(n))).toEqual([])
  })
  it('the logs span 40+ days in t order, with old events without g, ties in one ms and clock near t', () => {
    for (const evs of [GOLDEN_SPELLQUEST(), GOLDEN_CLOCK(), GOLDEN_SPACECAT(), GOLDEN_ENGLISH(), GOLDEN_SPELLQUEST_SPELL()]) {
      expect(evs.every((e, i) => i === 0 || e.t >= evs[i - 1]!.t)).toBe(true)
      expect(evs[evs.length - 1]!.t - evs[0]!.t).toBeGreaterThan(40 * 24 * 60 * 60 * 1000)
      expect(evs.some((e) => e.g === undefined)).toBe(true)
      expect(evs.some((e, i) => i > 0 && e.t === evs[i - 1]!.t)).toBe(true)
      expect(new Set(evs.map((e) => e.s)).size).toBeGreaterThan(10)
    }
    const clocks = spellQuestEvents().filter((e) => typeof e.clock === 'number').map((e) => e.t - (e.clock as number))
    expect(new Set(clocks)).toEqual(new Set([0, 1, 2, 3, -1]))
  })
})
