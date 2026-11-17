// The review page shell: loads the derived state, renders it, plays items in a row, and posts the parent's decisions.
// Phone first: one bar at the bottom (Play all / Stop, Replay, Reject, OK) acts on the selected item.
import type { PageItem, PageState } from '../pageData.ts'
import type { View } from '../rules.ts'
import { countsHTML, esc, itemHTML, visualHTML } from './render.ts'
import { firstView, nextOpenAfter, pageOrder, runFrom, shownSections } from './flow.ts'
import type { ShownSection } from './flow.ts'
import { createPlayer } from './player.ts'
import { HttpError, sendWithRetry, tapGuard } from './save.ts'

const $ = <T extends HTMLElement = HTMLElement>(s: string) => document.querySelector(s) as T
const PICTURE_PAUSE_MS = 2200
const GAP_MS = 600
/** Waits before each new try of a decision that did not reach the server. */
const RETRY_MS = [1000, 3000, 6000]
/** A second decision tap within this time is the rest of a double tap. */
const DOUBLE_TAP_MS = 600

let state: PageState = { title: '', sections: [], items: [] }
let view: View = 'open'
let secs: ShownSection[] = []
const touched = new Set<string>()
const revealed = new Set<string>()
const collapsed = new Set<string>()
let openAtLoad: Set<string> | null = null

const player = createPlayer(
  new Audio(),
  {
    media(id, take) {
      const it = itemOf(id)
      if (!it) return null
      if (it.kind === 'image') return { kind: 'image' }
      return { kind: 'audio', src: (it.takes.find((x) => x.id === take) ?? curTake(it))?.src ?? null }
    },
    changed: () => markNow(),
    scrollTo: (id) => document.getElementById('i-' + id)?.scrollIntoView({ block: 'center', behavior: 'smooth' }),
  },
  { pictureMs: PICTURE_PAUSE_MS, gapMs: GAP_MS, setTimeout: (fn, ms) => setTimeout(fn, ms), clearTimeout: (t) => clearTimeout(t as number) },
)
const stop = () => player.stop()
const playItem = (id: string, take?: string, scroll = true) => player.playItem(id, take, scroll)
const playRun = (ids: string[]) => player.playRun(ids)
/** Items whose decision is on its way to the server. */
const saving = new Set<string>()
/** Counts the decisions sent, so that a state fetched before one of them is not shown. */
let sent = 0
const decisionTap = tapGuard(() => Date.now(), DOUBLE_TAP_MS)

type SheetMode = 'reject' | 'note' | 'name'
let sheet: { mode: SheetMode; id: string; take: string | null; run: string[] | null; edit: boolean } | null = null

const itemOf = (id: string | null) => state.items.find((i) => i.id === id)
const curTake = (it: PageItem) => it.takes.find((t) => t.current) ?? it.takes[0]

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
  const done = base.filter((id) => itemOf(id)?.status !== 'open').length
  const pct = base.length ? Math.round((100 * done) / base.length) : 0
  $('#glance').innerHTML = `<b>${open}</b> open${wait ? ` · ${wait} waiting for new takes` : ''} · decided <b>${done}</b> of ${base.length} open at load <span class="pbar"><span style="width:${pct}%"></span></span>`
}

function render() {
  secs = shownSections(state, view, touched)
  if (!openAtLoad) openAtLoad = new Set(secs.flatMap((s) => s.shown.filter((i) => i.status === 'open').map((i) => i.id)))
  const html = secs
    .map((s, idx) => {
      const head = `<h2>${esc(s.title)} <small>${s.shown.length} of ${s.all.length} shown</small></h2><span class="counts">${countsHTML(s.all)}</span>`
      if (!s.shown.length) return `<div class="sec-line">${head}</div>`
      return `<details class="sec"${collapsed.has(s.id) ? '' : ' open'} data-sec="${idx}"><summary>${head}<button class="btn" data-playall="${idx}">Play all</button></summary>
      <div class="list">${s.shown.map((i) => itemHTML(i, { revealed: revealed.has(i.id) })).join('')}</div></details>`
    })
    .join('')
  $('#main').innerHTML = html || '<p class="empty">Nothing needs you now. Use "All" to see the decided items.</p>'
  for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) b.setAttribute('aria-pressed', String(b.dataset.view === view))
  glance()
  markNow()
}

function rerenderItem(id: string) {
  const it = itemOf(id)
  const el = document.getElementById('i-' + id)
  if (it && el) {
    const t = document.createElement('div')
    t.innerHTML = itemHTML(it, { revealed: revealed.has(id) })
    el.replaceWith(t.firstElementChild!)
  }
  secs = shownSections(state, view, touched)
  secs.forEach((s, idx) => {
    const c = document.querySelector(`[data-sec="${idx}"] .counts`)
    if (c) c.innerHTML = countsHTML(s.all)
  })
  glance()
  markNow()
}

function markNow() {
  const { cur, playing } = player
  for (const e of document.querySelectorAll('.item.sel,.item.playing')) e.classList.remove('sel', 'playing')
  const it = itemOf(cur)
  const el = cur ? document.getElementById('i-' + cur) : null
  if (el) {
    el.classList.add('sel')
    if (playing) el.classList.add('playing')
  }
  const pb = $<HTMLButtonElement>('#b-play')
  pb.textContent = playing ? 'Stop' : it ? 'Continue from here' : 'Play all'
  for (const b of ['#b-replay', '#b-rej', '#b-ok']) $<HTMLButtonElement>(b).disabled = !it
  const now = $<HTMLButtonElement>('#now')
  now.disabled = !it
  if (!it) {
    now.innerHTML = '<span class="nthumb"></span><span class="ntext"><span class="ncap">Nothing selected</span><span class="nsub">Tap a card to pick the item the buttons act on</span></span>'
    return
  }
  const sec = state.sections.find((s) => s.id === it.section)
  const name = it.hidden && !revealed.has(it.id) ? 'a picture' : it.caption
  now.innerHTML = `<span class="nthumb">${visualHTML(it)}</span><span class="ntext"><span class="ncap">${esc(name)}</span><span class="nsub">${esc(sec?.title ?? '')} · ${it.status}${playing ? ' · playing' : ''}</span></span><span class="nhint">Show item</span>`
}

// ---- playback --------------------------------------------------------------------------------------------------------

function resume() {
  const cur = player.cur
  if (cur) {
    const s = secs.find((x) => x.shown.some((i) => i.id === cur))
    if (s) return playRun(runFrom(s, cur))
    return playItem(cur)
  }
  const s = secs.find((x) => x.shown.length)
  if (s) playRun(runFrom(s))
}

// ---- decisions -------------------------------------------------------------------------------------------------------

/** Send a decision, trying again after a blip. The page has moved on already; a decision that never arrives is said. */
async function post(body: { item: string } & Record<string, unknown>): Promise<PageItem | null> {
  const id = body.item
  saving.add(id)
  sent++
  try {
    const send = () => api<{ item: PageItem }>('api/event', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const r = await sendWithRetry(send, RETRY_MS, (ms) => new Promise((ok) => setTimeout(ok, ms)))
    state.items = state.items.map((i) => (i.id === r.item.id ? r.item : i))
    touched.add(r.item.id)
    rerenderItem(r.item.id)
    return r.item
  } catch (err) {
    alert(`Not saved (${itemOf(id)?.caption ?? id}): ${(err as Error).message}`)
    return null
  } finally {
    saving.delete(id)
  }
}

/**
 * After OK or a submitted Reject: play the next open item at once (the decision goes to the server meanwhile), and
 * carry on with the run if one was going.
 */
function advance(id: string, run: string[] | null) {
  const n = nextOpenAfter(pageOrder(secs), id, (x) => x !== id && itemOf(x)?.status === 'open' && !touched.has(x) && !saving.has(x))
  stop()
  if (!n) return
  const i = run ? run.indexOf(n) : -1
  player.setQueue(i >= 0 ? run!.slice(i + 1) : [])
  playItem(n)
}

function ok(id: string, take?: string, only = false) {
  const it = itemOf(id)
  const t = take ?? (it && curTake(it)?.id)
  if (!it || !t || saving.has(id) || !decisionTap.take()) return
  const run = player.playing || player.queue.length ? player.queue.slice() : null
  void post({ type: 'ok', item: id, take: t, ...(only ? { only: true } : {}) })
  advance(id, run)
}

function openSheet(mode: SheetMode, id: string, take: string | null, text = '', edit = false) {
  const run = mode === 'reject' && !edit && (player.playing || player.queue.length) ? player.queue.slice() : null
  stop()
  player.select(id)
  markNow()
  sheet = { mode, id, take, run, edit }
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
  const { mode, id, take, run, edit } = sheet
  const text = $<HTMLInputElement>('#noteText').value.trim()
  closeSheet()
  const it = itemOf(id)
  if (mode === 'reject') {
    if (saving.has(id)) return
    const p = post({ type: 'reject', item: id, take, text })
    if (!edit) {
      decisionTap.take()
      advance(id, run)
    }
    await p
  } else await post({ type: mode, item: id, text, take: it ? (curTake(it)?.id ?? null) : null })
}

// ---- events ----------------------------------------------------------------------------------------------------------

document.addEventListener('click', (e) => {
  const el = e.target as HTMLElement
  const card = el.closest<HTMLElement>('.item')
  const id = card?.dataset.id ?? null
  const hit = (sel: string) => el.closest<HTMLElement>(sel)
  let b: HTMLElement | null
  if ((b = hit('[data-playall]'))) {
    e.preventDefault()
    const s = secs[Number(b.dataset.playall)]
    return s && playRun(runFrom(s))
  }
  if (!id) return
  player.select(id)
  const it = itemOf(id)!
  if ((b = hit('[data-from]'))) {
    const s = secs.find((x) => x.shown.some((i) => i.id === id))
    return s ? playRun(runFrom(s, id)) : playItem(id)
  }
  if ((b = hit('[data-play]'))) {
    stop()
    return playItem(id, b.dataset.play, false)
  }
  if ((b = hit('[data-pick]'))) return ok(id, b.dataset.pick, true)
  if ((b = hit('[data-rejtake]'))) return openSheet('reject', id, b.dataset.rejtake!)
  if ((b = hit('[data-editnote]'))) {
    const t = it.takes.find((x) => x.id === b!.dataset.editnote)
    return openSheet('reject', id, b.dataset.editnote!, t?.text ?? '', true)
  }
  if (hit('[data-freenote]')) return openSheet('note', id, null, it.itemNote?.text ?? '')
  if (hit('[data-nameobj]')) return openSheet('name', id, null, it.name?.text ?? '')
  if (hit('[data-reset]')) return void post({ type: 'reset', item: id, take: null })
  if (hit('[data-reveal]') && card!.classList.contains('hidecap')) {
    card!.classList.toggle('reveal')
    if (card!.classList.contains('reveal')) revealed.add(id)
    else revealed.delete(id)
  }
  markNow()
})

$('#now').onclick = () => player.cur && document.getElementById('i-' + player.cur)?.scrollIntoView({ block: 'center', behavior: 'smooth' })
$('#b-play').onclick = () => (player.playing || player.queue.length ? stop() : resume())
$('#b-replay').onclick = () => {
  if (player.cur) {
    stop()
    playItem(player.cur)
  }
}
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
  } else if (e.key === 'r' || e.key === 'R') $('#b-replay').click()
  else if (e.key === 'x' || e.key === 'X') {
    e.preventDefault()
    $('#b-rej').click()
  }
})
for (const b of document.querySelectorAll<HTMLButtonElement>('[data-view]')) {
  b.onclick = () => {
    view = b.dataset.view as View
    stop()
    render()
  }
}
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
