import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DuelCard } from './DuelCard'
import { StationPath } from './StationPath'
import { useProgressStore } from '../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../types/progress'
import { DUEL_MARKS } from '../../utils/duel/marks'
import { setGender } from '../../shared/player'
import { PlayButton } from './PlayButton'
import { Separator } from './Separator'
import { LevelIcon, LockBadge, type LevelKind } from './LevelIcons'

const EMOJI = /\p{Extended_Pictographic}/u
const KINDS: LevelKind[] = ['letters', 'nikkud', 'syllables', 'words', 'sentences', 'stories']

describe('home parts (spec: one duel, Part 4)', () => {
  it('the play button points left', () => {
    for (const theme of ['duel', 'clock'] as const) {
      const { container, unmount } = render(<PlayButton theme={theme} />)
      const d = container.querySelector('[data-tri]')!.getAttribute('d')!
      const xs = [...d.matchAll(/[ML]\s*(\d+)/g)].map((m) => Number(m[1]))
      // the tip (the smallest x) is on the left; the base (two points with the same, larger x) on the right
      expect(Math.min(...xs)).toBeLessThan(35)
      expect(xs.filter((x) => x > 55).length).toBe(2)
      if (theme === 'duel') expect(d.startsWith('M59')).toBe(true)
      unmount()
    }
  })

  it('two play buttons on one page keep their own gradients', () => {
    const { container } = render(<><PlayButton theme="duel" /><PlayButton theme="clock" /></>)
    const ids = [...container.querySelectorAll('radialGradient, linearGradient')].map((g) => g.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('level icons and the lock are SVG, never emoji', () => {
    const { container } = render(<div>{KINDS.map((k) => <LevelIcon key={k} kind={k} />)}<LockBadge /><Separator /></div>)
    expect(container.textContent ?? '').not.toMatch(EMOJI)
    expect(container.querySelector('[data-level-icon="letters"]')!.textContent).toBe('א')
    expect(container.querySelector('[data-level-icon="nikkud"]')!.textContent).toBe('בָ')
    expect(container.querySelector('[data-level-icon="syllables"]')!.textContent).toBe('בָּ')
    for (const k of ['words', 'sentences', 'stories']) expect(container.querySelector(`[data-level-icon="${k}"] svg`)).not.toBeNull()
    expect(container.querySelector('svg[data-lock]')).not.toBeNull()
    expect(container.querySelector('[data-home-part="separator"] svg')).not.toBeNull()
  })
})

const save = (state: Record<string, unknown>) => localStorage.setItem('alef-duel2', JSON.stringify({ state, version: 7 }))
const order = (c: Element) => [...c.querySelectorAll('[data-station]')].map((e) => e.getAttribute('data-station'))
const st = (c: Element, id: string) => c.querySelector(`[data-station="${id}"]`)!

describe('the duel card and the path (spec: one duel, Part 4)', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
  })

  it('a brand-new player: the tower open, the rest locked, no ratings', () => {
    const { container } = render(<StationPath />)
    expect(order(container)).toEqual(['tower', 'broom', 'ghosts', 'cauldron', 'ladder', 'doors', 'draw', 'draw-hand'])
    expect(st(container, 'tower').getAttribute('data-open')).toBe('true')
    for (const id of order(container).slice(1)) {
      expect(st(container, id!).getAttribute('data-open')).toBe('false')
      expect(st(container, id!).querySelector('[data-lock]')).not.toBeNull()
    }
    expect([...container.querySelectorAll('[data-station]')].every((e) => e.getAttribute('data-rating') === '0')).toBe(true)
  })

  it('stage 2 with drawing: open stations first in path order, then the locked doors', () => {
    save({ stage: { stage: 2, newAnswers: '' }, bookOpen: true, settings: { drawing: true } })
    const { container } = render(<StationPath />)
    expect(order(container)).toEqual(['tower', 'broom', 'ghosts', 'cauldron', 'ladder', 'draw', 'draw-hand', 'doors'])
    expect(st(container, 'doors').getAttribute('data-open')).toBe('false')
    expect(st(container, 'draw-hand').getAttribute('data-open')).toBe('true')
  })

  it('ratings come from his recent answers', () => {
    save({ stage: { stage: 2, newAnswers: '' }, bookOpen: true, recent: { 'sc:ghosts': 'oxo', 'sc:broom': 'oooooo' } })
    useProgressStore.setState({ duel: { ...useProgressStore.getState().duel, recent: { kamatz: 'xxo' } } })
    const { container } = render(<StationPath />)
    expect(st(container, 'ghosts').getAttribute('data-rating')).toBe('2')
    expect(st(container, 'ghosts').querySelectorAll('.home-dots i.on').length).toBe(2)
    expect(st(container, 'broom').getAttribute('data-rating')).toBe('3')
    expect(st(container, 'tower').getAttribute('data-rating')).toBe('1')
    expect(st(container, 'cauldron').getAttribute('data-rating')).toBe('0')
  })

  it('the wizard stands at the newest open station, and follows the saved player', () => {
    save({ stage: { stage: 1, newAnswers: '' }, bookOpen: true, settings: { drawing: false } })
    const { container, unmount } = render(<StationPath />)
    expect(container.querySelectorAll('[data-wizard]').length).toBe(1)
    expect(st(container, 'ghosts').querySelector('[data-wizard]')).not.toBeNull()
    expect(st(container, 'ghosts').querySelector('[data-wizard]')!.getAttribute('src')).not.toMatch(/girl/)
    unmount()
    setGender('girl', 'parent')
    const g = render(<StationPath />)
    expect(g.container.querySelector('[data-wizard]')!.getAttribute('src')).toMatch(/girl/)
  })

  it('on load the path scrolls (at once, not smoothly) so the wizard\'s station is in view (RTL: it can start off-screen on a phone)', () => {
    save({ stage: { stage: 2, newAnswers: '' }, bookOpen: true, settings: { drawing: false } })
    // the path is 360px wide; the wizard's station (the ladder) lies off its left edge
    const rect = vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(function (this: HTMLElement) {
      const r = this.hasAttribute('data-path') ? { left: 0, width: 360 } : this.querySelector('[data-wizard]') ? { left: -300, width: 84 } : { left: 100, width: 84 }
      return { ...r, right: r.left + r.width, top: 0, bottom: 100, height: 100, x: r.left, y: 0, toJSON: () => ({}) } as DOMRect
    })
    const by = vi.fn()
    const proto = HTMLElement.prototype as unknown as { scrollBy?: unknown }
    const had = proto.scrollBy
    proto.scrollBy = by
    try {
      const { container } = render(<StationPath />)
      expect(st(container, 'ladder').querySelector('[data-wizard]')).not.toBeNull()
      expect(by).toHaveBeenCalledTimes(1)
      // the station's centre (-258) to the path's centre (180), at once
      expect(by).toHaveBeenCalledWith({ left: -258 - 180, behavior: 'auto' })
      expect(by.mock.contexts[0]).toBe(container.querySelector('[data-path]'))
    } finally {
      proto.scrollBy = had
      rect.mockRestore()
    }
  })

  it('the wizard stands at the newest reading station, not at drawing (which opens with stage 1 and comes last on the path)', () => {
    save({ stage: { stage: 1, newAnswers: '' }, bookOpen: true, settings: { drawing: true } })
    const a = render(<StationPath />)
    expect(st(a.container, 'ghosts').querySelector('[data-wizard]')).not.toBeNull()
    a.unmount()
    save({ stage: { stage: 4, newAnswers: '' }, bookOpen: true, settings: { drawing: true } })
    const b = render(<StationPath />)
    expect(b.container.querySelectorAll('[data-wizard]').length).toBe(1)
    expect(st(b.container, 'doors').querySelector('[data-wizard]')).not.toBeNull()
  })

  it('coming back to the page re-reads the Book 2 save', () => {
    const { container } = render(<StationPath />)
    expect(st(container, 'broom').getAttribute('data-open')).toBe('false')
    save({ stage: { stage: 1, newAnswers: '' }, bookOpen: true, recent: { 'sc:broom': 'ooo' } })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(st(container, 'broom').getAttribute('data-open')).toBe('true')
    expect(st(container, 'broom').getAttribute('data-rating')).toBe('3')
    save({ stage: { stage: 4, newAnswers: '' }, bookOpen: true })
    act(() => { window.dispatchEvent(new Event('pageshow')) })
    expect(st(container, 'doors').getAttribute('data-open')).toBe('true')
  })

  it('an existing player whose Book 2 save is older (version 4): his stations are open and drawing is on, as Book 2 will show them', () => {
    const raw = JSON.stringify({ state: { stage: { stage: 2, newAnswers: '' }, totalStars: 40, settings: { sfx: true, music: true, volume: 0.8, drawing: false } }, version: 4 })
    localStorage.setItem('alef-duel2', raw)
    const { container } = render(<StationPath />)
    for (const id of ['tower', 'broom', 'ghosts', 'cauldron', 'ladder', 'draw', 'draw-hand']) expect(st(container, id).getAttribute('data-open')).toBe('true')
    expect(st(container, 'doors').getAttribute('data-open')).toBe('false')
    // read only: the save is converted by Book 2 itself
    expect(localStorage.getItem('alef-duel2')).toBe(raw)
  })

  it('the home never writes the Book 2 save', () => {
    render(<><DuelCard /><StationPath /></>)
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(localStorage.getItem('alef-duel2')).toBeNull()
  })

  it('an unreadable Book 2 save reads as a fresh one', () => {
    localStorage.setItem('alef-duel2', '{not json')
    const { container } = render(<StationPath />)
    expect(st(container, 'tower').getAttribute('data-open')).toBe('true')
    expect(st(container, 'broom').getAttribute('data-open')).toBe('false')
  })

  it('a first-duel-only player who mastered the tower sees Book 2’s first stations open', () => {
    useProgressStore.setState({ duel: { ...useProgressStore.getState().duel, recent: Object.fromEntries(DUEL_MARKS.map((m) => [m.id, 'ooooo'])) } })
    const { container } = render(<StationPath />)
    expect(st(container, 'broom').getAttribute('data-open')).toBe('true')
    expect(st(container, 'ghosts').getAttribute('data-open')).toBe('true')
    expect(st(container, 'cauldron').getAttribute('data-open')).toBe('false')
    expect(st(container, 'tower').getAttribute('data-rating')).toBe('3')
  })

  it('captions say what is learned, never the minigame’s name', () => {
    const { container } = render(<StationPath />)
    const caps = [...container.querySelectorAll('.home-cap')].map((e) => e.textContent ?? '')
    expect(caps).toEqual(['ניקוד לפי צליל', 'אותיות והברות לפי צליל', 'אותיות דומות', 'בניית הברה', 'משפחות הברות, דגש', 'קריאת מילים', 'אותיות דפוס', 'אותיות כתב יד'])
    for (const c of caps) expect(c).not.toMatch(/מעוף|רוחות|קדרה|סולם|דלתות|דו־קרב|מגדל|כתיבה/)
  })

  it('a station links to its session; the card to the cover; a locked station links nowhere', () => {
    save({ stage: { stage: 1, newAnswers: '' }, bookOpen: true })
    const { container } = render(<><DuelCard /><StationPath /></>)
    expect(container.querySelector('[data-card="duel"]')!.getAttribute('href')).toBe(`${import.meta.env.BASE_URL}duel2/`)
    expect(st(container, 'ghosts').getAttribute('href')).toBe(`${import.meta.env.BASE_URL}duel2/?station=ghosts`)
    expect(st(container, 'tower').getAttribute('href')).toBe(`${import.meta.env.BASE_URL}duel2/?station=tower`)
    expect(st(container, 'doors').tagName).not.toBe('A')
    expect(st(container, 'doors').getAttribute('href')).toBeNull()
  })

  it('the duel card: the mirrored picture, three orbs, the play button, and the parent line', () => {
    const { container } = render(<DuelCard />)
    expect(container.querySelector('.home-card-art')).not.toBeNull()
    expect([...container.querySelectorAll('.home-card-orb span')].map((e) => e.textContent)).toEqual(['בָּ', 'לִ', 'מוּ'])
    expect(container.querySelector('[data-play="duel"]')).not.toBeNull()
    expect(container.querySelector('[data-learn="duel"]')!.textContent).toBe('מה לומדים: לשמוע ולקרוא אותיות, ניקוד והברות, ואחר כך מילים; להבחין בין אותיות דומות; ואחרי הקריאה — לכתוב בדפוס ובכתב יד. המשחק מתאים את עצמו לילד.')
  })
})
