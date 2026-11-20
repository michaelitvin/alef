import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { applySound } from '../../shared/gameAudio/output'
import { setDeviceSettings } from '../../shared/deviceSettings'
import { ParentArea } from '../../parent/ParentArea'
import { SFX_NAMES } from '../audio/sfx'
import { LADDER_START, NEW_RUNG, withRung, type Ladder } from '../logic/ladder/state'
import type { RungId } from '../logic/rungs'
import { DEFAULT_SAVE, DEFAULT_SETTINGS, SAVE_KEY } from '../saveFormat'
import { useSpaceCatStore } from '../store'
import { SPACECAT_LOG } from '../telemetryLog'
import { spaceCatParent } from '.'
import { sumText } from './sumText'
import SpaceCatSettings from './Settings'

const audio = installFakeAudio()
const initial = useSpaceCatStore.getState()
const stat = (seen: number, wrong: number, timeout: number, picks: Record<string, number> = {}, times: number[] = []) =>
  ({ seen, wrong, timeout, recent: 'o'.repeat(seen - wrong - timeout) + 'x'.repeat(wrong) + 't'.repeat(timeout), times, picks })
const literal = (state: object) => JSON.stringify({ state, version: 1 })

beforeEach(() => {
  useSpaceCatStore.setState({ ...initial, ...DEFAULT_SAVE }, true)
  setDeviceSettings({ sfx: true, music: true })
  applySound({ sfx: true, music: true, volume: 0.8 })
})

describe('Space Cat\'s section in the parent area', () => {
  it('the hard sums table sorts by predicted mistake', () => {
    useSpaceCatStore.setState({ items: { '2+2=4/c': stat(8, 0, 0), '3+4=7/b': stat(6, 4, 1, { 5: 3, 2: 1 }, [2000, 3000, 4000]), '1+3=4/c': stat(5, 1, 0) } })
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    const rows = [...container.querySelectorAll('[data-hard] [data-item]')]
    expect(rows.map((r) => r.getAttribute('data-item'))).toEqual(['3+4=7/b', '1+3=4/c', '2+2=4/c'])
    expect(rows[0].textContent).toContain('3 + ◌ = 7')
    expect(rows[0].textContent).toContain('1 / 6')
    expect(rows[0].textContent).toContain('3.0 s')
    expect(rows[0].lastElementChild!.textContent).toBe('5')
  })

  it('Where he is: a summary line, the table by strand with examples, statuses and shares', () => {
    let l: Ladder = { ...LADDER_START, mode: { kind: 'practice' }, day: 5 }
    for (const r of ['1', '2'] as const) l = withRung(l, r, { status: 'passed' })
    l = withRung(l, '4', { status: 'placed' })
    l = withRung(l, '3', { status: 'held', holds: 1, freeOn: 7 })
    useSpaceCatStore.setState({ ladder: l, items: { '3+2=5/c': stat(4, 1, 0) }, settings: { ...DEFAULT_SETTINGS, divide: false, range: '9' } })
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    expect(container.querySelector('[data-where]')!.textContent).toBe('Working on: minus within 10 (9 − 4 = ◌). Passed 3 of 31 rungs. 1 held.')
    const strands = [...container.querySelectorAll('[data-strand]')]
    expect(strands.map((t) => t.querySelector('th')!.textContent)).toEqual(['Plus and minus', 'Comparison', 'Counting in jumps, times and divide'])
    const row = (r: string) => container.querySelector(`[data-rung="${r}"]`)!
    expect(row('1').textContent).toBe('plus, sum to 53 + 2 = ◌passed75% of 4')
    expect(row('1').querySelector('bdi')!.getAttribute('dir')).toBe('ltr')
    expect(row('4').getAttribute('data-status')).toBe('placed')
    expect(row('4').textContent).toContain('placed (unchecked)')
    expect(row('3').textContent).toContain('held: back in 2 play days')
    expect(row('5').getAttribute('data-status')).toBe('working on now')
    expect(row('6').getAttribute('data-status')).toBe('not yet')
    expect(row('T4b').getAttribute('data-status')).toBe('switched off')
    expect(row('10').getAttribute('data-status')).toBe('above the range')
    expect(strands[1].querySelector('[data-rung="C1"]')!.textContent).toContain('7 ◌ 5')
    expect(strands[2].querySelector('[data-rung="S1"]')!.textContent).toContain('5, 10, 15, ◌')
  })

  it('a rung that is working on now says so; a placement says he is being found', () => {
    useSpaceCatStore.setState({ ladder: { ...LADDER_START, mode: { kind: 'practice' } } })
    const { container, unmount } = render(<SpaceCatSettings goTo={() => {}} />)
    expect(container.querySelector('[data-rung="1"]')!.getAttribute('data-status')).toBe('working on now')
    unmount()
    useSpaceCatStore.setState({ ladder: LADDER_START })
    const r = render(<SpaceCatSettings goTo={() => {}} />)
    expect(r.container.querySelector('[data-where]')!.textContent).toMatch(/^Working on: finding his level\. Passed 0 of 31 rungs\. 0 held\.$/)
  })

  it('Recent changes: newest first, with the date and a plain line', () => {
    const t = (d: string) => new Date(`${d}T12:00:00`).getTime()
    const ladder = (d: string, f: Record<string, unknown>) => ({ t: t(d), s: 'a', run: 0, e: 'ladder', ...f })
    localStorage.setItem(SPACECAT_LOG.key, JSON.stringify({ v: 1, events: [
      ladder('2026-11-01', { rung: '14', change: 'passed', by: 'fast' }),
      { t: t('2026-11-01') + 1, s: 'a', run: 0, e: 'round', item: '1+1=2/c' },
      ladder('2026-11-02', { rung: '15', change: 'strike' }),
      ladder('2026-11-03', { rung: '15', change: 'held', days: 2 }),
      ladder('2026-11-04', { rung: 'C1', change: 'placed', by: 'placement' }),
      ladder('2026-11-05', { rung: '15', change: 'free' }),
      ladder('2026-11-06', { rung: '13', change: 'unpassed', by: 'recheck' }),
    ] }))
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    expect([...container.querySelectorAll('[data-recent] li')].map((x) => x.textContent)).toEqual([
      '2026-11-06: back to "not yet" (re-check): 2-digit ± 1-digit, no regrouping',
      '2026-11-05: back from hold: 2-digit ± 1-digit with regrouping',
      '2026-11-04: placed (placement): compare to 20',
      '2026-11-03: held for 2 play days: 2-digit ± 1-digit with regrouping',
      '2026-11-02: a strike on: 2-digit ± 1-digit with regrouping',
      '2026-11-01: passed (fast): 2-digit ± tens',
    ])
  })

  it('Recent changes: one placement is one row, "Placed: N rungs, up to <rung>"', () => {
    const t0 = new Date('2026-11-07T12:00:00').getTime()
    const rungs = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', 'H1', 'C1', 'C2', 'S1', 'S2', 'T1', 'T2', 'T3', 'T4a']
    localStorage.setItem(SPACECAT_LOG.key, JSON.stringify({ v: 1, events: [
      { t: t0, s: 'a', run: 0, e: 'placement', phase: 'start', kind: 'first', probes: 0, mistakes: 0, frontier: null },
      ...rungs.map((rung, i) => ({ t: t0 + i * 1000, s: 'a', run: 0, e: 'ladder', rung, change: 'placed', by: 'placement' })),
      { t: t0 + 60_000, s: 'a', run: 0, e: 'ladder', rung: '15', change: 'strike' },
    ] }))
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    const rows = [...container.querySelectorAll('[data-recent] li')].map((x) => x.textContent)
    expect(rows).toHaveLength(2)
    expect(rows[0]).toBe('2026-11-07: a strike on: 2-digit ± 1-digit with regrouping')
    expect(rows[1]).toMatch(/^2026-11-07: Placed: 28 rungs, up to \S/)
  })

  it('a rung\'s example stays on one line (a phone held upright broke "3 + 2 = ◌" before the ring)', () => {
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    const cell = container.querySelector('[data-rungs] [data-rung="1"]')!.children[1] as HTMLElement
    expect(cell.textContent).toBe('3 + 2 = ◌')
    expect(cell.style.whiteSpace).toBe('nowrap')
  })

  it('the range list is never wider than the area (its longest option is wider than a phone held upright)', () => {
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    expect((container.querySelector('select[aria-label="range"]') as HTMLElement).style.maxWidth).toBe('100%')
  })

  it('the range list is grouped by strand and changes the range', () => {
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    const groups = [...container.querySelectorAll('select[aria-label="range"] optgroup')]
    expect(groups.map((g) => g.getAttribute('label'))).toEqual(['Plus and minus', 'Comparison', 'Counting in jumps, times and divide'])
    expect(groups.reduce((n, g) => n + g.children.length, 0)).toBe(31)
    expect(container.querySelector('select[aria-label="range"] > option')!.textContent).toBe('automatic')
    expect(groups[1].children[0].textContent).toBe('up to: compare to 20 (7 ◌ 5)')
    fireEvent.change(screen.getByLabelText('range'), { target: { value: 'C2' } })
    expect(useSpaceCatStore.getState().settings.range).toBe('C2')
    fireEvent.change(screen.getByLabelText('range'), { target: { value: 'auto' } })
    expect(useSpaceCatStore.getState().settings.range).toBe('auto')
  })

  it.each([
    ['compare', 'Compare two numbers (השוואת מספרים)', /three planets/],
    ['jumps', 'Counting in jumps (ספירה בקפיצות)', /comes before times/],
    ['times', 'Times (×) (כפל)', /equal groups of dots/],
    ['divide', 'Divide (÷) (חילוק)', /only from times tables/],
    ['missing100', 'Missing number above 20 (מספר חסר מעל 20)', /ring moves only in sums to 20/],
    ['hundreds', 'Hundreds in the head (מאות בעל פה)', /need no carrying/],
  ] as const)('the %s switch has its label, its explanation and a tracked change', (key, label, explain) => {
    const track = vi.fn()
    const { container } = render(<SpaceCatSettings goTo={() => {}} track={track} />)
    const box = container.querySelector(`[data-switch="${key}"]`)!
    expect(box.querySelector('label')!.textContent!.trim()).toBe(label)
    expect(box.querySelector('[data-explain]')!.textContent).toMatch(explain)
    expect(useSpaceCatStore.getState().settings[key]).toBe(true)
    fireEvent.click(screen.getByLabelText(key))
    expect(useSpaceCatStore.getState().settings[key]).toBe(false)
    expect(track).toHaveBeenCalledWith('settings', { [key]: false, by: 'parent' })
  })

  it('signs in the explanations sit in left-to-right spans', () => {
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    const spans = [...container.querySelectorAll('[data-switch="compare"] [data-explain] bdi[dir="ltr"]')].map((x) => x.textContent)
    expect(spans).toEqual(['7 ◌ 5', '<', '=', '>'])
  })

  it('Find his level again asks first, then starts a placement and tracks it', () => {
    const track = vi.fn()
    useSpaceCatStore.setState({ ladder: withRung({ ...LADDER_START, mode: { kind: 'practice' } }, '1', { status: 'passed' }), totalPoints: 7 })
    render(<SpaceCatSettings goTo={() => {}} track={track} />)
    const confirm = vi.spyOn(window, 'confirm')
    confirm.mockReturnValue(false)
    fireEvent.click(screen.getByText(/Find his level again/))
    expect(confirm).toHaveBeenCalledTimes(1)
    expect(useSpaceCatStore.getState().ladder.mode.kind).toBe('practice')
    expect(track).not.toHaveBeenCalled()
    confirm.mockReturnValue(true)
    fireEvent.click(screen.getByText(/Find his level again/))
    const st = useSpaceCatStore.getState()
    expect(st.ladder.mode.kind).toBe('placement')
    expect(st.ladder.rungs).toEqual({})
    expect(st.totalPoints).toBe(7)
    expect(track).toHaveBeenCalledWith('settings', { relevel: true, by: 'parent' })
    confirm.mockRestore()
  })

  it('a fixed time shows and the automatic value is kept', () => {
    useSpaceCatStore.setState({ speed: { small: { arrivalMs: 6400, underMs: [], hold: 0 } } })
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    expect(container.querySelector('[data-arrival-auto]')!.textContent).toBe('6.4 s')
    fireEvent.click(screen.getByLabelText('4 s'))
    expect(useSpaceCatStore.getState().settings.arrival).toBe(4000)
    expect(useSpaceCatStore.getState().speed.small.arrivalMs).toBe(6400)
    expect(container.querySelector('[data-arrival-auto]')!.textContent).toBe('6.4 s')
  })

  it('each of the 9 effects and the tune has a button', async () => {
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    for (const n of SFX_NAMES) fireEvent.click(container.querySelector(`[data-sfx="${n}"]`)!)
    expect(audio.log().filter((e) => e.kind === 'sfx').map((e) => e.url)).toEqual(SFX_NAMES.map((n) => `coded:spacecat/${n}`))
    fireEvent.click(container.querySelector('[data-sfx="tune"]')!)
    expect(audio.live().find((e) => e.kind === 'music')?.url).toBe('coded:spacecat/tune')
    fireEvent.click(container.querySelector('[data-sfx="tune"]')!)
  })

  it('with effects off on the device the sound buttons say so', () => {
    setDeviceSettings({ sfx: false })
    applySound({ sfx: false, music: true, volume: 0.8 })
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    expect(container.querySelector('[data-sfx-off]')).not.toBeNull()
    expect(container.querySelector('[data-sfx="right"]')!.textContent).toMatch(/effects off/)
    fireEvent.click(container.querySelector('[data-sfx="right"]')!)
    expect(audio.log().filter((e) => e.kind === 'sfx')).toEqual([])
  })

  it('the flight-music switch notes the device\'s music', () => {
    setDeviceSettings({ music: false })
    const { container } = render(<SpaceCatSettings goTo={() => {}} />)
    expect(container.querySelector('[data-flight-music-note]')!.textContent).toMatch(/only while music is on for this device/)
    expect(container.querySelector('[data-flight-music-note]')!.textContent).toMatch(/Music is off on this device now/)
    fireEvent.click(screen.getByLabelText('music during flight'))
    expect(useSpaceCatStore.getState().settings.flightMusic).toBe(true)
  })

  it('a change tracks settings by the parent', () => {
    const track = vi.fn()
    render(<SpaceCatSettings goTo={() => {}} track={track} />)
    fireEvent.click(screen.getByLabelText('divide'))
    expect(track).toHaveBeenCalledWith('settings', { divide: false, by: 'parent' })
  })

  const ladderOf = (rungs: Ladder['rungs'], mode: Ladder['mode'] = { kind: 'practice' }): Ladder => ({ ...LADDER_START, mode, rungs })
  const passed = (...ids: RungId[]) => Object.fromEntries(ids.map((id) => [id, { ...NEW_RUNG, status: 'passed' as const }]))

  it('the summary names the frontier and counts the passed rungs that are on', () => {
    const base = { runs: 3, best: 12, totalPoints: 40, settings: DEFAULT_SETTINGS }
    const raw = literal({ ...base, ladder: ladderOf(passed('1', '2', '3')) })
    expect(spaceCatParent.summary(raw)).toBe('Working on: make ten · passed 3 of 31 · runs 3 · best 12 · points 40')
    // a switched-off rung does not count toward the 31
    const off = literal({ ...base, ladder: ladderOf(passed('1', 'C1')), settings: { ...DEFAULT_SETTINGS, compare: false } })
    expect(spaceCatParent.summary(off)).toBe('Working on: minus within 5 · passed 1 of 31 · runs 3 · best 12 · points 40')
    const placing = literal({ ...base, ladder: LADDER_START })
    expect(spaceCatParent.summary(placing)).toBe('Working on: finding his level · passed 0 of 31 · runs 3 · best 12 · points 40')
    for (const bad of [null, '{x']) expect(spaceCatParent.summary(bad)).toBeNull()
  })

  it('the summary survives a save with no ladder yet', () => {
    expect(spaceCatParent.summary(literal({ runs: 1 }))).toBe('Working on: plus, sum to 5 · passed 0 of 31 · runs 1 · best 0 · points 0')
  })

  it('mixups read every kind of item, a comparison too, and give [] for none or bad JSON', () => {
    const raw = literal({ items: {
      '3+4=7/c': stat(4, 2, 0, { 8: 2 }), '5-2=3/a': stat(2, 1, 0, { 6: 1 }), '7?5': stat(3, 1, 0, { '<': 4 }),
      '5,10,15,_': stat(2, 1, 0, { 16: 1 }), '3+3+3=9/c': stat(2, 1, 0, { 6: 1 }),
    } })
    expect(spaceCatParent.mixups(raw)).toEqual([
      { asked: '7 ◌ 5', chosen: '<', n: 4 }, { asked: '3 + 4 = ◌', chosen: '8', n: 2 },
      { asked: '◌ − 2 = 3', chosen: '6', n: 1 }, { asked: '5, 10, 15, ◌', chosen: '16', n: 1 }, { asked: '3 + 3 + 3 = ◌', chosen: '6', n: 1 },
    ])
    for (const bad of [null, '{x']) expect(spaceCatParent.mixups(bad)).toEqual([])
  })

  it('sumText reads every kind of item', () => {
    expect(sumText('3+4=7/b')).toBe('3 + ◌ = 7')
    expect(sumText('12/3=4/c')).toBe('12 ÷ 3 = ◌')
    expect(sumText('7x8=56/a')).toBe('◌ × 8 = 56')
    expect(sumText('9-4=5/c')).toBe('9 − 4 = ◌')
    expect(sumText('3+3+3=9/c')).toBe('3 + 3 + 3 = ◌')
    expect(sumText('7?5')).toBe('7 ◌ 5')
    expect(sumText('5,10,15,_')).toBe('5, 10, 15, ◌')
    expect(sumText('4,_,12,16')).toBe('4, ◌, 12, 16')
    expect(sumText('nonsense')).toBe('nonsense')
  })

  it('details list the right share of each rung he played, by the new rungs, and nothing for none or bad JSON', () => {
    const raw = literal({ items: { '3+4=7/c': stat(4, 1, 1, {}), '2+5=7/c': stat(6, 0, 0, {}), '7?5': stat(2, 1, 0, {}), '3+3+3=9/c': stat(3, 0, 0, {}) } })
    expect(spaceCatParent.details!(raw)).toEqual([{
      id: 'spacecat-rungs', title: 'Right answers per rung',
      items: ['plus, sum 6 to 10: 80% of 10 right', 'compare to 20: 50% of 2 right', 'the same number added: 100% of 3 right'],
    }])
    for (const bad of [null, '{x', literal({ items: {} })]) expect(spaceCatParent.details!(bad)).toEqual([])
  })

  it('declares its log for the Data section and the registry', () => {
    expect(spaceCatParent.logs).toEqual([SPACECAT_LOG])
  })

  it('reset clears only alef-spacecat', async () => {
    localStorage.setItem('alef-clock', '{"keep":1}')
    useSpaceCatStore.setState({ best: 9, runs: 2 })
    useSpaceCatStore.getState().setSettings({ times: true })
    await spaceCatParent.reset()
    expect(useSpaceCatStore.getState().best).toBe(0)
    expect(useSpaceCatStore.getState().runs).toBe(0)
    expect(useSpaceCatStore.getState().settings.times).toBe(true)
    expect(JSON.parse(localStorage.getItem(SAVE_KEY)!).state.best).toBe(0)
    expect(localStorage.getItem('alef-clock')).toBe('{"keep":1}')
  })

  it('the area opens at Space Cat\'s section', async () => {
    const { container } = render(<ParentArea game="spacecat" onClose={() => {}} />)
    expect(await screen.findByText(/Sums he finds hard/, {}, { timeout: 3000 })).toBeTruthy()
    expect(container.querySelector('[data-spacecat-settings]')).not.toBeNull()
  })
})
