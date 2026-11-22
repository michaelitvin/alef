import { describe, expect, it } from 'vitest'
import type { PageItem, PageState, PageTake } from '../pageData.ts'
import { firstOpen, firstView, isPickItem, keepCurrent, nextOpenAfter, okTake, otherViews, pageOrder, pickedItem, shownSections } from './flow.ts'
import { captionHTML, esc, itemHTML, markedHTML, statusHTML } from './render.ts'

const take = (id: string, extra: Partial<PageTake> = {}): PageTake => ({ id, src: 'media/' + id, label: id, mirror: false, verdict: null, flags: [], current: false, ...extra })
const pi = (id: string, extra: Partial<PageItem> = {}): PageItem => ({
  id,
  kind: 'audio',
  section: 's',
  caption: id,
  hidden: false,
  nameCheck: false,
  status: 'open',
  current: id + '/v1',
  takes: [take(id + '/v1', { current: true })],
  itemNote: null,
  name: null,
  answered: [],
  ask: null,
  askTake: null,
  flagged: false,
  views: ['open', 'all'],
  ...extra,
})
const dom = (html: string) => {
  const d = document.createElement('div')
  d.innerHTML = html
  return d.firstElementChild as HTMLElement
}

describe('renderers', () => {
  it('escapes text', () => {
    expect(esc('<b a="1">&\'')).toBe('&lt;b a=&quot;1&quot;&gt;&amp;&#39;')
  })

  it('hides a pictogram word until a tap (the card carries the switch)', () => {
    const it = pi('pic-cat', { kind: 'image', caption: 'cat', hidden: true })
    const el = dom(itemHTML(it))
    expect(el.classList.contains('hidecap')).toBe(true)
    expect(el.querySelector('[data-hidden-cap]')?.textContent).toBe('cat')
    expect(el.querySelector('.vis')?.hasAttribute('data-reveal')).toBe(true)
    expect(dom(itemHTML(it, { revealed: true })).classList.contains('reveal')).toBe(true)
    expect(captionHTML(pi('x', { caption: 'רֶבַע', lang: 'he' }))).toContain('dir="rtl"')
  })

  it('shows picture takes side by side, each with Pick and Reject, and the reject note per take', () => {
    const it = pi('pic-duck', {
      kind: 'image',
      takes: [take('t2', { current: true }), take('t1', { verdict: 'rejected', text: 'could be a chick' })],
    })
    const el = dom(itemHTML(it))
    expect([...el.querySelectorAll('[data-pick]')].map((b) => b.getAttribute('data-pick'))).toEqual(['t2', 't1'])
    expect(el.querySelectorAll('[data-rejtake]')).toHaveLength(2)
    expect(el.querySelector('.pk.off .note')?.textContent).toContain('could be a chick')
  })

  it('shows mirrored takes mirrored', () => {
    const el = dom(itemHTML(pi('facing', { kind: 'image', takes: [take('a.webp#mirrored', { current: true, mirror: true })] })))
    expect(el.querySelector('.vis img')?.getAttribute('style')).toContain('scaleX(-1)')
  })

  it('shows the item note, the name objection and the answers to his notes', () => {
    const note = { seq: 1, kind: 'note' as const, item: 'x', take: null, text: 'broom', at: null, state: 'open' as const }
    const answered = [{ ...note, seq: 2, text: 'artifacts', state: 'answered' as const, answer: { seq: 3, text: 'redrawn: 2 new takes', take: null, at: null } }]
    const el = dom(itemHTML(pi('x', { kind: 'image', nameCheck: true, itemNote: note, name: { ...note, kind: 'name', text: 'mop' }, answered })))
    expect(el.querySelector('.freenote')?.textContent).toContain('broom')
    expect(el.querySelector('.nameobj')?.textContent).toContain('mop')
    expect(el.querySelector('.answer')?.textContent).toContain('redrawn: 2 new takes')
    expect(el.querySelector('.xbtns [data-nameobj]')?.textContent).toContain('Edit name objection')
  })

  it('audio: the current take plays; other takes fold away; a rejected take shows its note', () => {
    const it = pi('a', { takes: [take('a/v2', { current: true }), take('a/v1', { verdict: 'rejected', text: 'flat' })] })
    const el = dom(itemHTML(it))
    expect(el.querySelector('.hear [data-play]')?.getAttribute('data-play')).toBe('a/v2')
    expect(el.querySelector('details.tech [data-play]')?.getAttribute('data-play')).toBe('a/v1')
    expect(el.querySelector('details.tech .note')?.textContent).toContain('flat')
  })

  it('a sound card has no placeholder block, and folds the technical label and check into Details', () => {
    const it = pi('s', { caption: 'the sound of a', where: 'Voice: a sound', ask: 'said once?', takes: [take('s/v1', { current: true, label: 'en · flash · trimmed', check: 'a listener heard: “a”' })] })
    const el = dom(itemHTML(it))
    expect(el.querySelector('.vis')).toBeNull()
    expect(el.textContent).not.toMatch(/sound\s*$/m)
    expect(el.querySelector('.hear .cap')?.textContent).toBe('the sound of a')
    expect(el.querySelector('.why')?.textContent).toBe('said once?')
    expect(el.querySelector('.where')?.textContent).toBe('Voice: a sound')
    expect(el.querySelector('details.tech')?.textContent).toContain('en · flash · trimmed')
    expect(el.querySelector('details.tech')?.textContent).toContain('a listener heard')
    expect(el.querySelector('.body > .lbl, .body > .chk')).toBeNull()
    expect(dom(itemHTML(pi('g', { glyph: 'ב' }))).querySelector('.vis .glyph')?.textContent).toBe('ב')
  })

  it('say: the text large with its marks in red, the kind, one line, the speaker; escaped; Hebrew right to left', () => {
    const it = pi('m', { caption: 'moon', say: { text: 'moon', mark: [[1, 3]], kind: 'sound', sub: "not the letter's name" } })
    const el = dom(itemHTML(it))
    expect(el.querySelector('.saytext')?.innerHTML).toBe('m<mark class="m">oo</mark>n')
    expect(el.querySelector('.kchip')?.textContent).toBe('only this sound')
    expect(el.querySelector('.saysub')?.textContent).toBe("not the letter's name")
    const line = dom(itemHTML(pi('l', { say: { text: '<b>Hi</b> & "you"', kind: 'line', speaker: 'the wizard' } })))
    expect(line.querySelector('.saytext')?.innerHTML).toBe('&lt;b&gt;Hi&lt;/b&gt; &amp; "you"')
    expect(line.querySelector('.who')?.textContent).toBe('the wizard')
    expect(markedHTML('abc', [[2, 3], [0, 1], [0, 2], [5, 9], [1, 1]])).toBe('<mark class="m">a</mark>b<mark class="m">c</mark>')
    expect(markedHTML('a<b', [[1, 2]])).toBe('a<mark class="m">&lt;</mark>b')
    const he = dom(itemHTML(pi('h', { lang: 'he', caption: 'שָׁלוֹם', say: { text: 'שָׁלוֹם', mark: [[0, 3]], kind: 'word' } })))
    expect(he.querySelector('.saytext')?.getAttribute('dir')).toBe('rtl')
    expect(he.querySelector('.saytext mark')?.textContent).toBe('שָׁ')
    expect(dom(itemHTML(pi('x', { kind: 'audio', hidden: true, caption: 'cat' }))).querySelector('[data-hidden-cap]')?.textContent).toBe('cat')
  })

  it('a picture with several takes: Picked marks the pick, the others are dimmed, and nothing else can OK', () => {
    const base = pi('pic', { kind: 'image', status: 'open', takes: [take('t3', { current: true }), take('t2'), take('t1')] })
    expect(isPickItem(base)).toBe(true)
    expect(okTake(base)).toBeNull()
    expect(okTake(pi('single', { kind: 'image' }))).toBe('single/v1')
    expect(okTake(pi('snd'))).toBe('snd/v1')
    const done = pickedItem(base, 't1')
    expect(done.status).toBe('ok')
    expect(done.current).toBe('t1')
    const el = dom(itemHTML(done))
    expect(el.classList.contains('decided')).toBe(true)
    expect(el.querySelectorAll('.pk.on')).toHaveLength(1)
    expect(el.querySelector('.pk.on [data-pick]')?.textContent).toBe('Picked')
    expect(el.querySelectorAll('.pk.off')).toHaveLength(2)
    expect(el.querySelectorAll('[data-pick]')).toHaveLength(3)
  })

  it('a reload shows only items that still need a decision; items touched this visit stay', () => {
    const st: PageState = { title: 't', sections: [{ id: 's', title: 'S' }], items: [pi('done', { status: 'ok', askTake: null, views: ['focus', 'open', 'all'] }), pi('open', { views: ['focus', 'open', 'all'] }), pi('asked', { status: 'ok', askTake: 'asked/v1', views: ['focus', 'all'] })] }
    for (const v of ['focus', 'open', 'sample'] as const) expect(pageOrder(shownSections(st, v, new Set())).includes('done')).toBe(false)
    expect(pageOrder(shownSections(st, 'focus', new Set())).sort()).toEqual(['asked', 'open'])
    expect(pageOrder(shownSections(st, 'open', new Set(['done'])))).toContain('done')
    expect(pageOrder(shownSections(st, 'all', new Set()))).toContain('done')
  })

  it('names a relayed approval in the status', () => {
    const it = pi('m', { status: 'ok', takes: [take('m/v1', { current: true, verdict: 'accepted', source: 'your message: OK' })] })
    expect(statusHTML(it)).toContain('your message: OK')
  })
})

describe('flow', () => {
  const state: PageState = {
    title: 't',
    sections: [
      { id: 's', title: 'S' },
      { id: 't', title: 'T' },
    ],
    items: [pi('a'), pi('b', { status: 'ok', views: ['all'] }), pi('c', { ask: 'check', views: ['focus', 'open', 'all'] }), pi('d', { section: 't' })],
  }

  it('shows the view, keeps touched items, puts "needs you" items first', () => {
    const secs = shownSections(state, 'open', new Set(['b']))
    expect(pageOrder(secs)).toEqual(['c', 'a', 'b', 'd'])
    expect(pageOrder(shownSections(state, 'open', new Set()))).toEqual(['c', 'a', 'd'])
  })

  it('opens on the first open item: "needs you" items come first', () => {
    expect(firstOpen(['c', 'a', 'b', 'd'], (id) => id !== 'c')).toBe('a')
    expect(firstOpen(['b'], () => false)).toBeNull()
  })

  it('plays the next open item after a decision, across sections, and goes round to the items left for later', () => {
    const order = ['c', 'a', 'b', 'd']
    const open = (id: string) => id !== 'b'
    expect(nextOpenAfter(order, 'a', open)).toBe('d')
    // at the end: back to the first open item before it (one he left for later, or skipped by a tap further down)
    expect(nextOpenAfter(order, 'd', open)).toBe('c')
    // never the item itself: with nothing else open, the view is done
    expect(nextOpenAfter(order, 'd', (id) => id === 'd')).toBeNull()
    // a decided item he tapped: the next open item after it
    expect(nextOpenAfter(order, 'b', open)).toBe('d')
  })

  it('a refresh keeps the current item while it is on the page, else goes to the first open item', () => {
    const order = ['c', 'a', 'd']
    const open = (id: string) => id !== 'c'
    expect(keepCurrent(order, 'd', open)).toBe('d')
    expect(keepCurrent(order, 'gone', open)).toBe('a')
    expect(keepCurrent(order, null, open)).toBe('a')
  })

  it('the done state links the other views, each with its open count', () => {
    expect(otherViews(state, 'focus')).toEqual([
      { view: 'open', open: 3 },
      { view: 'sample', open: 0 },
      { view: 'all', open: 3 },
    ])
  })

  it('opens on "needs you" only when something is in it', () => {
    expect(firstView(state)).toBe('focus')
    expect(firstView({ ...state, items: [pi('a')] })).toBe('open')
  })
})
