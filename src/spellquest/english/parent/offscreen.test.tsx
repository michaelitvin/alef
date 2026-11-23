import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { fireEvent, render } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import Settings from './Settings'
import { englishSavePort } from '../savePort'
import { useEnglishStore } from '../store'
import { englishTelemetry } from '../telemetry'
import { WORDS } from '../content/words'

const real = WORDS.filter((w) => w.kind !== 'nonsense').slice(0, 3)
const el = (c: HTMLElement, sel: string) => c.querySelector(sel) as HTMLElement

describe('the parent\'s off-screen check', () => {
  beforeEach(() => { localStorage.clear(); useEnglishStore.getState().resetProgress() })
  afterEach(() => vi.restoreAllMocks())

  it('shows the last run\'s words', () => {
    englishSavePort().setLastRunWords(real.map((w) => w.id))
    const { container } = render(<Settings goTo={() => {}} />)
    expect(el(container, '[data-check-word]').textContent).toBe(real[0].text)
    expect(el(container, '[data-check-word]').style.fontVariantLigatures).toBe('none')
    fireEvent.click(el(container, '[data-check-ok]'))
    expect(el(container, '[data-check-word]').textContent).toBe(real[1].text)
  })

  it('a tap tracks parent-check', () => {
    const track = vi.spyOn(englishTelemetry, 'track')
    englishSavePort().setLastRunWords(real.map((w) => w.id))
    const { container } = render(<Settings goTo={() => {}} />)
    fireEvent.click(el(container, '[data-check-no]'))
    expect(track).toHaveBeenCalledWith('parent-check', { word: real[0].id, ok: false, run: useEnglishStore.getState().runs })
  })

  it('no child screen links to it', () => {
    const files: string[] = []
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p)
        else if (/\.tsx?$/.test(f) && !/\.test\./.test(f)) files.push(p) } }
    walk('src')
    const users = files.filter((f) => readFileSync(f, 'utf8').includes('OffScreenCheck'))
    expect(users.sort()).toEqual(['src/spellquest/english/parent/OffScreenCheck.tsx', 'src/spellquest/english/parent/Settings.tsx'])
  })
})

describe('the check, to its end', () => {
  beforeEach(() => { localStorage.clear(); useEnglishStore.getState().resetProgress() })
  afterEach(() => vi.restoreAllMocks())

  it('a ✗ is tracked, the end counts the ✓, and "Check again" starts over', () => {
    const track = vi.spyOn(englishTelemetry, 'track')
    englishSavePort().setLastRunWords(real.slice(0, 2).map((w) => w.id))
    const { container } = render(<Settings goTo={() => {}} />)
    fireEvent.click(el(container, '[data-check-no]'))
    fireEvent.click(el(container, '[data-check-ok]'))
    expect(track).toHaveBeenCalledWith('parent-check', expect.objectContaining({ word: real[1].id, ok: true }))
    expect(el(container, '[data-check-done]').textContent).toBe('Done: 1 of 2 read.')
    fireEvent.click(el(container, '[data-check-again]'))
    expect(el(container, '[data-check-word]').textContent).toBe(real[0].text)
  })

  it('with no words it says so', () => {
    const { container } = render(<Settings goTo={() => {}} />)
    expect(el(container, '[data-offscreen-check]').textContent).toContain('No words yet')
    expect(container.querySelector('[data-check-word]')).toBeNull()
  })
})
