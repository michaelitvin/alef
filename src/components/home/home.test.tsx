import { act, render } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SpellQuestCard } from './SpellQuestCard'
import { StationPath } from './StationPath'
import { useProgressStore } from '../../stores/progressStore'
import { INITIAL_PROGRESS_STATE } from '../../types/progress'
import { TOWER_MARKS } from '../../spellquest/tower/logic/marks'
import { setGender } from '../../shared/player'
import { PlayButton } from './PlayButton'
import { Separator } from './Separator'
import { LevelIcon, LockBadge, type LevelKind } from './LevelIcons'

const EMOJI = /\p{Extended_Pictographic}/u
const KINDS: LevelKind[] = ['letters', 'nikkud', 'syllables', 'words', 'sentences', 'stories']

describe('home parts (spec: one duel, Part 4)', () => {
  it('the play button points left', () => {
    for (const theme of ['spellquest', 'clock', 'spacecat'] as const) {
      const { container, unmount } = render(<PlayButton theme={theme} />)
      const d = container.querySelector('[data-tri]')!.getAttribute('d')!
      const xs = [...d.matchAll(/[ML]\s*(\d+)/g)].map((m) => Number(m[1]))
      // the tip (the smallest x) is on the left; the base (two points with the same, larger x) on the right
      expect(Math.min(...xs)).toBeLessThan(35)
      expect(xs.filter((x) => x > 55).length).toBe(2)
      if (theme === 'spellquest') expect(d.startsWith('M59')).toBe(true)
      unmount()
    }
  })

  it('two play buttons on one page keep their own gradients', () => {
    const { container } = render(<><PlayButton theme="spellquest" /><PlayButton theme="clock" /></>)
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

const save = (state: Record<string, unknown>) => localStorage.setItem('alef-spellquest', JSON.stringify({ state, version: 7 }))
const order = (c: Element) => [...c.querySelectorAll('[data-station]')].map((e) => e.getAttribute('data-station'))
const st = (c: Element, id: string) => c.querySelector(`[data-station="${id}"]`)!

describe('the Spell Quest card and the path (spec: one duel, Part 4)', () => {
  beforeEach(() => {
    localStorage.clear()
    useProgressStore.setState({ ...INITIAL_PROGRESS_STATE })
  })

  it('a brand-new player: the tower open, the rest locked, no ratings', () => {
    const { container } = render(<StationPath />)
    expect(order(container)).toEqual(['tower', 'broom', 'ghosts', 'cauldron', 'ladder', 'doors', 'spell', 'draw', 'draw-hand'])
    expect(st(container, 'tower').getAttribute('data-open')).toBe('true')
    for (const id of order(container).slice(1)) {
      expect(st(container, id!).getAttribute('data-open')).toBe('false')
      expect(st(container, id!).querySelector('[data-lock]')).not.toBeNull()
    }
    expect([...container.querySelectorAll('[data-station]')].every((e) => e.getAttribute('data-rating') === '0')).toBe(true)
  })

  it('the home path shows the spell station between doors and drawing', () => {
    const { container } = render(<StationPath />)
    const ids = order(container)
    const before = ids.slice(0, ids.indexOf('draw')).filter((id) => id !== 'spell')
    expect(ids).toEqual([...before, 'spell', 'draw', ...ids.slice(ids.indexOf('draw') + 1)])
    expect(before[before.length - 1]).toBe('doors')
    expect(st(container, 'spell').textContent).toContain('כתיב מילים')
    // its picture is a book (drawn until its art lands), never an empty image
    expect(st(container, 'spell').querySelector('[data-pic="book"]')).not.toBeNull()
    expect(st(container, 'spell').querySelector('img:not([src])')).toBeNull()
    // it opens with the doors (stage 4)
    save({ stage: { stage: 3, newAnswers: '' }, screensOpen: true, settings: { drawing: true } })
    act(() => { window.dispatchEvent(new Event('pageshow')) })
    expect(st(container, 'spell').getAttribute('data-open')).toBe('false')
    save({ stage: { stage: 4, newAnswers: '' }, screensOpen: true, settings: { drawing: true } })
    act(() => { window.dispatchEvent(new Event('pageshow')) })
    expect(st(container, 'spell').getAttribute('data-open')).toBe('true')
    expect(st(container, 'spell').getAttribute('href')).toBe(`${import.meta.env.BASE_URL}spellquest/?station=spell`)
    // the wizard stays at the doors: the spell book opens with them and follows them (writing after reading)
    expect(container.querySelectorAll('[data-wizard]').length).toBe(1)
    expect(st(container, 'doors').querySelector('[data-wizard]')).not.toBeNull()
    expect(st(container, 'spell').querySelector('[data-wizard]')).toBeNull()
  })

  it('stage 2 with drawing: open stations first in path order, then the locked doors and spell book', () => {
    save({ stage: { stage: 2, newAnswers: '' }, screensOpen: true, settings: { drawing: true } })
    const { container } = render(<StationPath />)
    expect(order(container)).toEqual(['tower', 'broom', 'ghosts', 'cauldron', 'ladder', 'draw', 'draw-hand', 'doors', 'spell'])
    expect(st(container, 'doors').getAttribute('data-open')).toBe('false')
    expect(st(container, 'draw-hand').getAttribute('data-open')).toBe('true')
  })

  it('ratings come from his recent answers', () => {
    save({ stage: { stage: 2, newAnswers: '' }, screensOpen: true, recent: { 'sc:ghosts': 'oxo', 'sc:broom': 'oooooo' } })
    useProgressStore.setState({ tower: { ...useProgressStore.getState().tower, recent: { kamatz: 'xxo' } } })
    const { container } = render(<StationPath />)
    expect(st(container, 'ghosts').getAttribute('data-rating')).toBe('2')
    expect(st(container, 'ghosts').querySelectorAll('.home-dots i.on').length).toBe(2)
    expect(st(container, 'broom').getAttribute('data-rating')).toBe('3')
    expect(st(container, 'tower').getAttribute('data-rating')).toBe('1')
    expect(st(container, 'cauldron').getAttribute('data-rating')).toBe('0')
  })

  it('the wizard stands at the newest open station, and follows the saved player', () => {
    save({ stage: { stage: 1, newAnswers: '' }, screensOpen: true, settings: { drawing: false } })
    const { container, unmount } = render(<StationPath />)
    expect(container.querySelectorAll('[data-wizard]').length).toBe(1)
    expect(st(container, 'ghosts').querySelector('[data-wizard]')).not.toBeNull()
    expect(st(container, 'ghosts').querySelector('[data-wizard]')!.getAttribute('src')).not.toMatch(/girl/)
    unmount()
    setGender('girl', 'parent')
    const g = render(<StationPath />)
    expect(g.container.querySelector('[data-wizard]')!.getAttribute('src')).toMatch(/girl/)
  })

  it('the path goes right to left: the wizard and the ghost, drawn facing right, are mirrored to face left (the parent, 2026-11-14)', async () => {
    save({ stage: { stage: 1, newAnswers: '' }, screensOpen: true, settings: { drawing: false } })
    const { container } = render(<StationPath />)
    const ghost = st(container, 'ghosts').querySelector<HTMLImageElement>('[data-pic="img"]')!
    expect(ghost.style.transform).toBe('scaleX(-1)')
    expect(st(container, 'tower').querySelector<HTMLImageElement>('[data-pic="img"]')!.style.transform).toBe('')
    const fs = (await import(/* @vite-ignore */ 'node:' + 'fs')) as { readFileSync: (p: string, enc: string) => string }
    const css = fs.readFileSync('src/components/home/home.css', 'utf8')
    expect(css).toMatch(/\.home-wizhere \{[^}]*transform: translateX\(-50%\) scaleX\(-1\);/)
  })

  it('on load the path scrolls (at once, not smoothly) so the wizard\'s station is in view (RTL: it can start off-screen on a phone)', () => {
    save({ stage: { stage: 2, newAnswers: '' }, screensOpen: true, settings: { drawing: false } })
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
    save({ stage: { stage: 1, newAnswers: '' }, screensOpen: true, settings: { drawing: true } })
    const a = render(<StationPath />)
    expect(st(a.container, 'ghosts').querySelector('[data-wizard]')).not.toBeNull()
    a.unmount()
    save({ stage: { stage: 4, newAnswers: '' }, screensOpen: true, settings: { drawing: true } })
    const b = render(<StationPath />)
    expect(b.container.querySelectorAll('[data-wizard]').length).toBe(1)
    expect(st(b.container, 'doors').querySelector('[data-wizard]')).not.toBeNull()
  })

  it('coming back to the page re-reads the Spell Quest save', () => {
    const { container } = render(<StationPath />)
    expect(st(container, 'broom').getAttribute('data-open')).toBe('false')
    save({ stage: { stage: 1, newAnswers: '' }, screensOpen: true, recent: { 'sc:broom': 'ooo' } })
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(st(container, 'broom').getAttribute('data-open')).toBe('true')
    expect(st(container, 'broom').getAttribute('data-rating')).toBe('3')
    save({ stage: { stage: 4, newAnswers: '' }, screensOpen: true })
    act(() => { window.dispatchEvent(new Event('pageshow')) })
    expect(st(container, 'doors').getAttribute('data-open')).toBe('true')
  })

  it('an existing player whose Spell Quest save is older (version 4): his stations are open and drawing is on, as Spell Quest will show them', () => {
    const raw = JSON.stringify({ state: { stage: { stage: 2, newAnswers: '' }, totalStars: 40, settings: { sfx: true, music: true, volume: 0.8, drawing: false } }, version: 4 })
    localStorage.setItem('alef-spellquest', raw)
    const { container } = render(<StationPath />)
    for (const id of ['tower', 'broom', 'ghosts', 'cauldron', 'ladder', 'draw', 'draw-hand']) expect(st(container, id).getAttribute('data-open')).toBe('true')
    expect(st(container, 'doors').getAttribute('data-open')).toBe('false')
    // read only: the save is converted by Spell Quest itself
    expect(localStorage.getItem('alef-spellquest')).toBe(raw)
  })

  it('the home never writes the Spell Quest save', () => {
    render(<><SpellQuestCard /><StationPath /></>)
    act(() => { document.dispatchEvent(new Event('visibilitychange')) })
    expect(localStorage.getItem('alef-spellquest')).toBeNull()
  })

  it('an unreadable Spell Quest save reads as a fresh one', () => {
    localStorage.setItem('alef-spellquest', '{not json')
    const { container } = render(<StationPath />)
    expect(st(container, 'tower').getAttribute('data-open')).toBe('true')
    expect(st(container, 'broom').getAttribute('data-open')).toBe('false')
  })

  it('a tower-only player who mastered the tower sees Spell Quest’s first stations open', () => {
    useProgressStore.setState({ tower: { ...useProgressStore.getState().tower, recent: Object.fromEntries(TOWER_MARKS.map((m) => [m.id, 'ooooo'])) } })
    const { container } = render(<StationPath />)
    expect(st(container, 'broom').getAttribute('data-open')).toBe('true')
    expect(st(container, 'ghosts').getAttribute('data-open')).toBe('true')
    expect(st(container, 'cauldron').getAttribute('data-open')).toBe('false')
    expect(st(container, 'tower').getAttribute('data-rating')).toBe('3')
  })

  it('captions say what is learned, never the minigame’s name', () => {
    const { container } = render(<StationPath />)
    const caps = [...container.querySelectorAll('.home-cap')].map((e) => e.textContent ?? '')
    expect(caps).toEqual(['ניקוד לפי צליל', 'אותיות והברות לפי צליל', 'אותיות דומות', 'בניית הברה', 'משפחות הברות, דגש', 'קריאת מילים', 'כתיב מילים', 'אותיות דפוס', 'אותיות כתב יד'])
    for (const c of caps) expect(c).not.toMatch(/מעוף|רוחות|קדרה|סולם|דלתות|דו־קרב|מגדל|כתיבה|ספר|לחשים/)
  })

  it('a station links to its session; the card to the cover; a locked station links nowhere', () => {
    save({ stage: { stage: 1, newAnswers: '' }, screensOpen: true })
    const { container } = render(<><SpellQuestCard /><StationPath /></>)
    expect(container.querySelector('[data-card="spellquest"]')!.getAttribute('href')).toBe(`${import.meta.env.BASE_URL}spellquest/`)
    expect(st(container, 'ghosts').getAttribute('href')).toBe(`${import.meta.env.BASE_URL}spellquest/?station=ghosts`)
    expect(st(container, 'tower').getAttribute('href')).toBe(`${import.meta.env.BASE_URL}spellquest/?station=tower`)
    expect(st(container, 'doors').tagName).not.toBe('A')
    expect(st(container, 'doors').getAttribute('href')).toBeNull()
  })

  it('the Spell Quest card: the mirrored picture, three orbs, the play button, and the parent line', () => {
    const { container } = render(<SpellQuestCard />)
    expect(container.querySelector('.home-card-art')).not.toBeNull()
    expect([...container.querySelectorAll('.home-card-orb span')].map((e) => e.textContent)).toEqual(['בָּ', 'לִ', 'מוּ'])
    expect(container.querySelector('[data-play="spellquest"]')).not.toBeNull()
    expect(container.querySelector('[data-learn="spellquest"]')!.textContent).toBe('מה לומדים: לשמוע ולקרוא אותיות, ניקוד והברות, ואחר כך מילים; להבחין בין אותיות דומות; ואחרי הקריאה — לכתוב בדפוס ובכתב יד. המשחק מתאים את עצמו לילד.')
  })

  it('the Spell Quest card picture follows the saved player: girl → the girl card; boy or not asked yet → the boy card', () => {
    const art = (c: Element) => c.querySelector('.home-card-art')!
    const unset = render(<SpellQuestCard />)
    expect(art(unset.container).getAttribute('data-card-art')).toBe('boy')
    const boySrc = art(unset.container).getAttribute('src')
    unset.unmount()
    setGender('boy', 'child')
    const boy = render(<SpellQuestCard />)
    expect(art(boy.container).getAttribute('data-card-art')).toBe('boy')
    expect(art(boy.container).getAttribute('src')).toBe(boySrc)
    boy.unmount()
    setGender('girl', 'child')
    const girl = render(<SpellQuestCard />)
    expect(art(girl.container).getAttribute('data-card-art')).toBe('girl')
    expect(art(girl.container).getAttribute('src')).toMatch(/card-girl/)
    expect(art(girl.container).getAttribute('src')).not.toBe(boySrc)
  })
})
