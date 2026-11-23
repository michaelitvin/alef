// The English path shows no Hebrew, and no Latin text but its learning content (rules: the child cannot read yet; no
// Hebrew on the English path). Every English gallery screen and the cover are rendered with the English course and their
// text nodes are scanned.
import { render, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
// jsdom loads no fonts or pictures
vi.mock('./assets/preload', () => ({ ENGLISH_FONTS: [], preloadEnglishAssets: () => Promise.resolve() }))
import { CourseProvider } from '../course/CourseContext'
import { Cover } from '../screens/Cover'
import { Play } from '../screens/Play'
import { galleryFor } from '../screens/Gallery'
import { installFakeAudio } from '../../shared/gameAudio/fakePlayer'
import { ENGLISH } from './course'
import { HEBREW } from '../course/hebrew'
installFakeAudio()

const HEBREW_LETTER = /[֐-׿]/
const LATIN_LETTER = /[A-Za-z]/

/** the text nodes under `root`, with the element each sits in */
function textNodes(root: Element): { text: string; el: Element }[] {
  const out: { text: string; el: Element }[] = []
  const walk = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  for (let n = walk.nextNode(); n; n = walk.nextNode()) {
    const text = (n.textContent ?? '').trim()
    if (text && n.parentElement) out.push({ text, el: n.parentElement })
  }
  return out
}
/** a learning element: a Latin letter, unit or word drawn as such */
const learning = (el: Element) => !!el.closest('.latin, .nd-rune-text')

const entries = galleryFor('en')
/** the screens that show no text at all (the crystal's light, the merchant's coins); every other one shows learning text */
const NO_TEXT = ['crystal', 'merchant']

/** renders a gallery entry in the English course and waits until its screen is up and, where it has text, its text is drawn */
async function shown(e: (typeof entries)[number]) {
  const r = render(<CourseProvider value={ENGLISH}><Play opts={{ sandbox: true, force: e.force }} onOver={() => {}} /></CourseProvider>)
  await waitFor(() => expect(r.container.querySelector('[data-screen="play"][data-kind]'), e.id).not.toBeNull(), { timeout: 10_000 })
  if (!NO_TEXT.includes(e.id)) await waitFor(() => expect(textNodes(r.container).length, e.id).toBeGreaterThan(0), { timeout: 10_000 })
  return r
}

describe('English child screens', () => {
  it('the gallery has screens to scan', () => { expect(entries.length).toBeGreaterThan(10)
    expect(entries.map((e) => e.id)).not.toContain('draw-hand')
    expect(entries.map((e) => e.id)).toEqual(expect.arrayContaining(['boss-dot', 'boss-shin', 'boss-mimic', 'boss-bat'])) })

  it('the cover shows Latin units, and the Hebrew cover keeps its syllables', () => {
    const en = render(<CourseProvider value={ENGLISH}><Cover onPlay={() => {}} onParent={() => {}} /></CourseProvider>)
    const orbs = [...en.container.querySelectorAll('text[data-glyph]')].map((t) => t.textContent)
    expect(orbs).toEqual(['a', 'm', 's'])
    en.unmount()
    const he = render(<CourseProvider value={HEBREW}><Cover onPlay={() => {}} onParent={() => {}} /></CourseProvider>)
    const heOrbs = [...he.container.querySelectorAll('text[data-glyph]')].map((t) => t.textContent ?? '')
    expect(heOrbs).toHaveLength(3)
    expect(heOrbs.every((t) => HEBREW_LETTER.test(t))).toBe(true)
  })

  it('no Hebrew text on any English child screen', async () => {
    const cover = render(<CourseProvider value={ENGLISH}><Cover onPlay={() => {}} onParent={() => {}} /></CourseProvider>)
    expect(textNodes(cover.container).filter((n) => HEBREW_LETTER.test(n.text))).toEqual([])
    cover.unmount()
    for (const e of entries) {
      const r = await shown(e)
      expect(textNodes(r.container).filter((n) => HEBREW_LETTER.test(n.text)).map((n) => `${e.id}: ${n.text}`)).toEqual([])
      r.unmount()
    }
  })

  it('no Latin text on English screens except learning content', async () => {
    const cover = render(<CourseProvider value={ENGLISH}><Cover onPlay={() => {}} onParent={() => {}} /></CourseProvider>)
    expect(textNodes(cover.container).filter((n) => LATIN_LETTER.test(n.text) && !learning(n.el))).toEqual([])
    cover.unmount()
    for (const e of entries) {
      const r = await shown(e)
      expect(textNodes(r.container).filter((n) => LATIN_LETTER.test(n.text) && !learning(n.el)).map((n) => `${e.id}: ${n.text}`)).toEqual([])
      r.unmount()
    }
  })
})
