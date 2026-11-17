// The review page shell: loads the derived state, renders it, and posts the parent's decisions. One item at a time,
// and his decision sets the pace: OK, or Reject with a note, saves in the background and plays the next open item at
// once. Nothing else moves on by itself. Phone first: one bar at the bottom (the Now item, then Replay, Later, Reject,
// OK) acts on the current item.
import type { PageItem, PageState } from '../pageData.ts'
import type { View } from '../rules.ts'
import { countsHTML, esc, itemHTML, visualHTML } from './render.ts'
import { firstOpen, firstView, keepCurrent, nextOpenAfter, otherViews, pageOrder, shownSections } from './flow.ts'
import type { ShownSection } from './flow.ts'
import { createPlayer } from './player.ts'
import { HttpError, sendWithRetry, tapGuard } from './save.ts'

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T
/** Waits before each new try of a decision that did not reach the server. */
const RETRY_MS = [1000, 3000, 6000]
/** A second decision tap within this time is the rest of a double tap. */
const DOUBLE_TAP_MS = 600
const VIEW_NAMES: Record<View, string> = { focus: 'Needs you', open: 'Open', sample: 'Sample', all: 'All' }

let state: PageState = { title: '', sections: [], items: [] }
let view: View = 'open'
let secs: ShownSection[] = []
let order: string[] = []
const touched = new Set<string>()
const revealed = new Set<string>()
const collapsed = new Set<string>()
let openAtLoad: Set<string> | null = null
/** Browsers play audio only after a first tap; until then the first button says Play. */
let tapped = false

const player = createPlayer(new Audio(), {
  media(id, take) {
    const it = itemOf(id)
    if (!it) return null
    if (it.kind === 'image') return { kind: 'image' }
    return { kind: 'audio', src: (it.takes.find((x) => x.id === take) ?? curTake(it))?.src ?? null }
  },
  changed: () => markNow(),
  scrollTo: (id) => document.getElementById('i-' + id)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
})
/** Items whose decision is on its way to the server. */
const saving = new Set<string>()
/** Counts the decisions sent, so that a state fetched before one of them is not shown. */
let sent = 0
const decisionTap = tapGuard(() => Date.now(), DOUBLE_TAP_MS)

type SheetMode = 'reject' | 'note' | 'name'
let sheet: { mode: SheetMode; id: string; take: string | null; edit: boolean } | null = null

const itemOf = (id: string | null) => state.items.find((i) => i.id === id)
const curTake = (it: PageItem) => it.takes.find((t) => t.current) ?? it.takes[0]
/** Open, and no decision on its way: an item the next decision can move on to. */
const isOpen = (id: string) => itemOf(id)?.status === 'open' && !saving.has(id)
const done = () => !order.some(isOpen)

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  // no-cache: the browser asks again each time, and an unchanged state comes back as a short 304
  const r = await fetch(path, { cache: 'no-cache', ...init })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw new HttpError(j.error ?? r.statusText, r.status)
  return j as T
}

// ---- render --------------------------------------------------------------------------------------------------------

function glance() {
  const all = state.items
  const open = all.filter((i) => i.status === 'open').length
  const wait = all.filter((i) => i.status === 'rejected').length
  const base = openAtLoad ? [...openAtLoad] : []
  const decided = base.filter((id) => itemOf(id)?.status !== 'open').length
  const pct = base.length ? Math.round((100 * decided) / base.length) : 0
  $('#glance').innerHTML = `<b>${open}</b> open${wait ? ` · ${wait} waiting for new takes` : ''} · decided <b>${decided}</b> of ${base.length} open at load <span class="pbar"><span style="width:${pct}%"></span></span>`
}

/** The done state: shown at the top when the view has no open item left, with the counts and the other views. */
function doneHTML(): string {
  const mine = [...touched].map((id) => itemOf(id)).filter((i): i is PageItem => !!i)
  const n = (s: string) => mine.filter((i) => i.status === s).length
  const views = otherViews(state, view)
    .map((v) => `<button class="btn ghost" data-goview="${v.view}">${VIEW_NAMES[v.view]} <small>${v.open} open</small></button>`)
    .join('')
  const visit = mine.length ? `You decided ${mine.length} on this visit: ${n('ok')} OK, ${n('rejected')} rejected.` : 'Nothing to decide here.'
  return `<section class="done" id="done"><h2>All done in “${VIEW_NAMES[view]}”</h2><p>${visit}</p><p class="donecounts">${countsHTML(state.items)}</p><div class="doneviews">${views}</div></section>`
}

function render() {
  secs = shownSections(state, view, touched)
  order = pageOrder(secs)
  if (!openAtLoad) openAtLoad = new Set(order.filter(isOpen))
  const html = secs
    .map((s, idx) => {
      const head = `<h2>${esc(s.title)} <small>${s.shown.length} of ${s.all.length} shown</small></h2><span class="counts">${countsHTML(s.all)}</span>`
      if (!s.shown.length) return `<div class="sec-line">${head}</div>`
      return `<details class="sec"${collapsed.has(s.id) ? '' : ' open'} data-sec="${idx}"><summary>${head}</summary>
      <div class="list">${s.shown.map((i) => itemHTML(i, { revealed: revealed.has(i.id) })).join('')}</div></details>`
    })
    .join('')
  $('#main').innerHTML = (done() ? doneHTML() : '') + html
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === view))
  glance()
  markNow()
}

/** After a decision came back: redraw its card, the counts and, when the view has just run out, the done state. */
function rerenderItem(id: string) {
  const it = itemOf(id)
  const el = document.getElementById('i-' + id)
  if (it && el) {
    const t = document.createElement('div')
    t.innerHTML = itemHTML(it, { revealed: revealed.has(id) })
    el.replaceWith(t.firstElementChild!)
  }
  secs = shownSections(state, view, touched)
  order = pageOrder(secs)
  secs.forEach((s, idx) => {
    const c = document.querySelector(`[data-sec="${idx}"] .counts`)
    if (c) c.innerHTML = countsHTML(s.all)
  })
  showDone()
  glance()
  markNow()
}

function showDone() {
  const d = document.getElementById('done')
  if (!done()) return d?.remove()
  const t = document.createElement('div')
  t.innerHTML = doneHTML()
  if (d) d.replaceWith(t.firstElementChild!)
  else $('#main').prepend(t.firstElementChild!)
}

function markNow() {
  const { cur, playing, failed } = player
  const paused = player.paused
  for (const e of document.querySelectorAll('.item.sel,.item.playing')) e.classList.remove('sel', 'playing')
  const it = itemOf(cur)
  const el = cur ? document.getElementById('i-' + cur) : null
  if (el) {
    el.classList.add('sel')
    if (playing) el.classList.add('playing')
  }
  const pic = it?.kind === 'image'
  const pb = $<HTMLButtonElement>('#b-play')
  pb.textContent = pic ? (it.hidden ? (revealed.has(it.id) ? 'Hide word' : 'Show word') : '–') : failed ? 'Try again' : playing ? '⏸ Pause' : '▶ Play'
  pb.disabled = !it || (pic && !it.hidden)
  pb.classList.toggle('first', !!it && !pic && !tapped)
  pb.setAttribute('aria-label', playing ? 'Pause' : paused ? 'Resume' : 'Play')
  $<HTMLButtonElement>('#b-replay').disabled = !it || pic
  $<HTMLButtonElement>('#b-later').disabled = !it || !cur || !nextOpenAfter(order, cur, isOpen)
  for (const b of ['#b-rej', '#b-ok']) $<HTMLButtonElement>(b).disabled = !it || saving.has(it.id)
  const now = $<HTMLButtonElement>('#now')
  now.disabled = !it
  if (!it) {
    const msg = done() ? ['All done in this view', 'Pick another view above'] : ['Nothing is current', 'Tap an item to hear it']
    now.innerHTML = `<span class="nthumb"></span><span class="ntext"><span class="ncap">${msg[0]}</span><span class="nsub">${msg[1]}</span></span>`
    return
  }
  const sec = state.sections.find((s) => s.id === it.section)
  const name = it.hidden && !revealed.has(it.id) ? 'a picture' : it.caption
  const what = failed ? ' · did not load: tap Try again' : playing ? ' · playing' : saving.has(it.id) ? ' · saving' : ''
  now.classList.toggle('failed', failed)
  now.innerHTML = `<span class="nthumb">${visualHTML(it)}</span><span class="ntext"><span class="ncap">${esc(name)}</span><span class="nsub">${esc(sec?.title ?? '')} · ${it.status}${what}</span></span><span class="nhint">Show</span>`
}

// ---- the current item ------------------------------------------------------------------------------------------------

function play(id: string, take?: string, scroll = true) {
  tapped = true
  player.playItem(id, take, scroll)
}

/** After OK, a submitted Reject or Later: play the next open item at once (a decision goes to the server meanwhile). */
function advance(id: string) {
  const n = nextOpenAfter(order, id, isOpen)
  if (n) return play(n)
  player.select(null)
  showDone()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function toggleWord(id: string) {
  const card = document.getElementById('i-' + id)
  if (!card?.classList.contains('hidecap')) return
  card.classList.toggle('reveal')
  if (card.classList.contains('reveal')) revealed.add(id)
  else revealed.delete(id)
  markNow()
}

// ---- decisions -------------------------------------------------------------------------------------------------------

/** Send a decision, trying again after a blip. The page has moved on already; a decision that never arrives is said. */
async function post(body: { item: string } & Record<string, unknown>): Promise<PageItem | null> {
  const id = body.item
  saving.add(id)
  sent++
  markNow()
  try {
    const send = () => api<{ item: PageItem }>('api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const r = await sendWithRetry(send, RETRY_MS, (ms) => new Promise((ok) => setTimeout(ok, ms)))
    state.items = state.items.map((i) => (i.id === r.item.id ? r.item : i))
    touched.add(r.item.id)
    return r.item
  } catch (err) {
    alert(`Not saved (${itemOf(id)?.caption ?? id}): ${(err as Error).message}`)
    return null
  } finally {
    saving.delete(id)
    rerenderItem(id)
  }
}

function ok(id: string, take?: string, only = false) {
  const it = itemOf(id)
  const t = take ?? (it && curTake(it)?.id)
  if (!it || !t || saving.has(id) || !decisionTap.take()) return
  void post({ type: 'ok', item: id, take: t, ...(only ? { only: true } : {}) })
  advance(id)
}

function later() {
  const id = player.cur
  if (id && decisionTap.take()) advance(id)
}

function openSheet(mode: SheetMode, id: string, take: string | null, text = '', edit = false) {
  if (player.cur !== id) player.select(id)
  else player.stop()
  sheet = { mode, id, take, edit }
  const input = $<HTMLInputElement>('#noteText')
  input.value = text
  input.placeholder = mode === 'name' ? 'What would a child call it? (empty: no objection)' : mode === 'note' ? 'Your note (empty: remove it)' : 'What is wrong? (one line)'
  const go = $<HTMLButtonElement>('#noteGo')
  go.textContent = mode === 'reject' && !edit ? 'Reject' : 'Save'
  go.className = 'btn ' + (mode === 'reject' ? 'bad' : 'ok')
  $('#note').classList.add('on')
  input.focus()
}

function closeSheet() {
  sheet = null
  $('#note').classList.remove('on')
  $<HTMLInputElement>('#noteText').blur()
}

async function submitSheet() {
  if (!sheet) return
  const { mode, id, take, edit } = sheet
  const text = $<HTMLInputElement>('#noteText').value.trim()
  const it = itemOf(id)
  if (mode === 'reject' && !edit) {
    if (saving.has(id) || !decisionTap.take()) return
    closeSheet()
    const p = post({ type: 'reject', item: id, take, text })
    advance(id)
    return void (await p)
  }
  closeSheet()
  await post(mode === 'reject' ? { type: 'reject', item: id, take, text } : { type: mode, item: id, text, take: it ? (curTake(it)?.id ?? null) : null })
}

// ---- events ----------------------------------------------------------------------------------------------------------

document.addEventListener('click', (e) => {
  const el = e.target as HTMLElement
  const hit = (sel: string) => el.closest<HTMLElement>(sel)
  let b: HTMLElement | null
  if ((b = hit('[data-goview]'))) return setView(b.dataset.goview as View)
  const card = hit('.item')
  const id = card?.dataset.id ?? null
  if (!id) return
  const it = itemOf(id)!
  if ((b = hit('[data-play]'))) return play(id, b.dataset.play, false)
  if (hit('[data-reveal]')) {
    if (player.cur !== id) player.select(id)
    return toggleWord(id)
  }
  // a control on the card acts on its item and makes it current, without a sound
  const control = hit('button,summary,input')
  if (control && player.cur !== id) player.select(id)
  if ((b = hit('[data-pick]'))) return ok(id, b.dataset.pick, true)
  if ((b = hit('[data-rejtake]'))) return openSheet('reject', id, b.dataset.rejtake!)
  if ((b = hit('[data-editnote]'))) {
    const t = it.takes.find((x) => x.id === b!.dataset.editnote)
    return openSheet('reject', id, b.dataset.editnote!, t?.text ?? '', true)
  }
  if (hit('[data-freenote]')) return openSheet('note', id, null, it.itemNote?.text ?? '')
  if (hit('[data-nameobj]')) return openSheet('name', id, null, it.name?.text ?? '')
  if (hit('[data-reset]')) return void post({ type: 'reset', item: id, take: null })
  // a tap anywhere else on a card: it is current and plays, with nothing after it
  if (!control) play(id, undefined, false)
})

function setView(v: View) {
  view = v
  render()
  const first = firstOpen(order, isOpen)
  player.select(first)
  window.scrollTo({ top: 0 })
}

$('#now').onclick = () => player.cur && document.getElementById('i-' + player.cur)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
$('#b-play').onclick = () => {
  const it = itemOf(player.cur)
  if (!it) return
  if (it.kind === 'image') return toggleWord(it.id)
  tapped = true
  player.toggle()
}
$('#b-replay').onclick = () => {
  const it = itemOf(player.cur)
  if (it && it.kind !== 'image') play(it.id)
}
$('#b-later').onclick = later
$('#b-rej').onclick = () => {
  const it = itemOf(player.cur)
  if (it && !saving.has(it.id)) openSheet('reject', it.id, curTake(it)?.id ?? null)
}
$('#b-ok').onclick = () => player.cur && ok(player.cur)
$('#noteGo').onclick = () => void submitSheet()
$('#noteNo').onclick = closeSheet
$('#noteText').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') void submitSheet()
  if (e.key === 'Escape') closeSheet()
  e.stopPropagation()
})
document.addEventListener('keydown', (e) => {
  if ((e.target as HTMLElement).tagName === 'INPUT' || e.ctrlKey || e.metaKey || e.altKey) return
  if (e.code === 'Space') {
    e.preventDefault()
    $('#b-play').click()
  } else if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    $('#b-replay').click()
  } else if (e.key === 'x' || e.key === 'X') {
    e.preventDefault()
    $('#b-rej').click()
  }
})
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.onclick = () => setView(b.dataset.view as View)
document.addEventListener(
  'toggle',
  (e) => {
    const d = e.target as HTMLDetailsElement
    const s = d.classList?.contains('sec') ? secs[Number(d.dataset.sec)] : null
    if (s && d.open) collapsed.delete(s.id)
    else if (s) collapsed.add(s.id)
  },
  true,
)

// ---- loading: refetch on return to the page and every minute, never while playing or typing ---------------------------

let lastSig = ''
async function load(first: boolean) {
  let s: PageState
  const at = sent
  try {
    // the first state: the page's head fetched it while the modules still loaded
    const early = first ? (window as unknown as { __state?: Promise<Response> }).__state : undefined
    s = early ? await early.then((r) => (r.ok ? (r.json() as Promise<PageState>) : Promise.reject(new HttpError(r.statusText, r.status)))) : await api<PageState>('api/state')
  } catch (err) {
    if (first) $('#main').innerHTML = `<p class="empty">Could not load: ${esc((err as Error).message)}</p>`
    return
  }
  // a decision sent while this state was on its way is not in it: keep the page as it is, the next refresh has it
  if (!first && (sent !== at || saving.size)) return
  const sig = JSON.stringify(s)
  if (sig === lastSig) return
  lastSig = sig
  state = s
  document.title = s.title + ': review'
  $('#title').textContent = s.title
  if (first) view = firstView(s)
  render()
  // the page opens on the first open item; a refresh keeps the current item while it is still on the page
  const cur = keepCurrent(order, player.cur, isOpen)
  if (cur !== player.cur) player.select(cur)
}
const refresh = () => {
  if (!player.playing && !sheet && !saving.size && !document.hidden) void load(false)
}
document.addEventListener('visibilitychange', refresh)
window.addEventListener('focus', refresh)
setInterval(refresh, 60_000)
$('#v-refresh').onclick = () => {
  lastSig = ''
  void load(false)
}
void load(true)
