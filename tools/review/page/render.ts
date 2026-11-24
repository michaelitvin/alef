// Renderers: pure functions from the derived state to HTML. One per media kind (audio take, picture with takes,
// picture whose word is hidden until a tap), plus the notes per take and per item.
import type { PageItem, PageTake } from '../pageData.ts'
import type { Note } from '../rules.ts'

export const esc = (s: unknown): string =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!)

const img = (src: string, mirror: boolean, cls = '') =>
  `<img class="${cls}" src="${esc(src)}" alt=""${mirror ? ' style="transform:scaleX(-1)"' : ''} loading="lazy">`

const currentTake = (it: PageItem): PageTake | undefined => it.takes.find((t) => t.id === it.askTake) ?? it.takes.find((t) => t.current) ?? it.takes[0]

/** The context visual at the left of the card: the picture, or a sound's glyph or picture. A sound with neither has none. */
export function visualHTML(it: PageItem): string {
  if (it.kind === 'image') {
    const t = currentTake(it)
    return t ? img(t.src, t.mirror) : '<div class="big">no take</div>'
  }
  if (it.glyph) return `<div class="glyph" dir="rtl">${esc(it.glyph)}</div>`
  if (it.picture) return img(it.picture, false)
  return ''
}

export function statusHTML(it: PageItem): string {
  const t = currentTake(it)
  if (it.status === 'ok') {
    const relayed = t?.verdict === 'accepted' ? ` (${esc(t.source)})` : ''
    return `<span class="stat st-ok">OK${relayed}</span>`
  }
  if (it.status === 'rejected') return '<span class="stat st-bad">Rejected: waiting for a new take</span>'
  if (it.status === 'empty') return '<span class="stat st-bad">No take</span>'
  if (it.status === 'checked') return '<span class="stat st-ok">Shipped on its automatic checks (not reviewed)</span>'
  return '<span class="stat st-open">Open</span>'
}

/** The caption. A hidden caption (a pictogram's word) shows only after a tap on the picture. */
export function captionHTML(it: PageItem): string {
  const dir = it.lang === 'he' ? ' dir="rtl" lang="he"' : ''
  if (!it.hidden) return `<p class="cap"${dir}>${esc(it.caption)}</p>`
  return `<p class="tapword">Tap the picture to see the word</p><p class="cap hidden"${dir} data-hidden-cap>${esc(it.caption)}</p>`
}

function verdictText(t: PageTake): string {
  if (t.verdict === 'ok') return ' · OK'
  if (t.verdict === 'accepted') return ' · OK by message'
  if (t.verdict === 'rejected') return ' · rejected'
  return ''
}

function rejectNoteHTML(t: PageTake): string {
  if (t.verdict !== 'rejected') return t.verdict === 'ok' && t.text ? `<div class="okn">${esc(t.text)}</div>` : ''
  return `<div class="note">${t.text ? 'note: ' + esc(t.text) : 'no note'} <button class="btn ghost small" data-editnote="${esc(t.id)}">Edit note</button></div>`
}

/** One audio take: play button, label, automatic check, his verdict and note. */
export function audioTakeHTML(t: PageTake): string {
  const check = t.check || t.flags.length ? `<div class="chk">${esc(t.check ?? '')}${t.flags.length ? ` <b>${t.flags.map(esc).join(', ')}</b>` : ''}</div>` : ''
  return `<div class="take${t.current ? ' cur' : ' old'}"><button class="pl" data-play="${esc(t.id)}" aria-label="Play this take">▶</button>
  <div class="lbl">${esc(t.label)}${t.current ? ' · current' : ''}${verdictText(t)}</div>${check}${rejectNoteHTML(t)}</div>`
}

/** Pictures with several takes: side by side, each with Pick (an exclusive OK) and Reject. */
export function pictureTakesHTML(it: PageItem): string {
  return `<div class="picks">${it.takes
    .map(
      (t) => `<div class="pk${t.verdict === 'ok' || t.verdict === 'accepted' ? ' on' : ''}${t.verdict === 'rejected' || (it.status === 'ok' && t.verdict !== 'ok' && t.verdict !== 'accepted') ? ' off' : ''}">${img(t.src, t.mirror)}
    <div class="pkl">${esc(t.label)}${verdictText(t)}</div>
    <button class="btn ${t.verdict === 'ok' || t.verdict === 'accepted' ? 'ok' : 'ghost'}" data-pick="${esc(t.id)}">${t.verdict === 'ok' || t.verdict === 'accepted' ? 'Picked' : 'Pick this one'}</button>
    <button class="btn ghost" data-rejtake="${esc(t.id)}">Reject</button>${rejectNoteHTML(t)}</div>`,
    )
    .join('')}</div>`
}

function noteLine(n: Note | null, cls: string, lead: string, btn: string, edit: string): string {
  return n ? `<div class="${cls}">${lead}${esc(n.text)} <button class="btn ghost small" data-${btn}>${edit}</button></div>` : ''
}

/** Notes on the item: his free note, his name objection, and the agents' answers to his notes. */
export function itemNotesHTML(it: PageItem): string {
  const answered = it.answered
    .map((n) => `<div class="answer">Your note “${esc(n.text)}”: ${esc(n.answer?.text ?? '')}</div>`)
    .join('')
  return (
    noteLine(it.itemNote, 'freenote', 'Your note: ', 'freenote', 'Edit') +
    noteLine(it.name, 'nameobj', 'A child would say: ', 'nameobj', 'Edit') +
    answered
  )
}

const KIND_CHIPS: Record<string, string> = { sound: 'only this sound', letter: "the letter's name", word: 'one word', 'made-up': 'a made-up word', phrase: 'a phrase', line: 'a line' }

/** The text with its marked ranges in red. Ranges are clamped, sorted and joined; a bad range is dropped. */
export function markedHTML(text: string, mark: [number, number][] = []): string {
  const ranges = mark
    .filter((r) => Array.isArray(r) && Number.isInteger(r[0]) && Number.isInteger(r[1]) && r[0] < r[1] && r[0] >= 0 && r[1] <= text.length)
    .sort((a, b) => a[0] - b[0])
  let at = 0
  let out = ''
  for (const [a, b] of ranges) {
    if (a < at) continue
    out += esc(text.slice(at, a)) + `<mark class="m">${esc(text.slice(a, b))}</mark>`
    at = b
  }
  return out + esc(text.slice(at))
}

/** What to hear, as a picture of it: the text large with its marks, the kind chip, one short line, the speaker. */
export function sayHTML(it: PageItem): string {
  const s = it.say
  if (!s) return `<p class="cap"${it.lang === 'he' ? ' dir="rtl" lang="he"' : ''}>${esc(it.caption)}</p>`
  const dir = it.lang === 'he' ? ' dir="rtl" lang="he"' : ''
  const chip = s.kind ? `<span class="kchip">${esc(KIND_CHIPS[s.kind] ?? s.kind)}</span>` : ''
  const who = s.speaker ? `<span class="who">${esc(s.speaker)}</span>` : ''
  return `<div class="say"><p class="cap saytext ${s.text.length > 40 ? 'long' : s.text.length > 16 ? 'mid' : 'short'}"${dir}>${markedHTML(s.text, s.mark)}</p><p class="saymeta">${chip}${who}</p>${s.sub ? `<p class="saysub"${dir}>${esc(s.sub)}</p>` : ''}</div>`
}

/** A sound card: the words to hear with a big play button, the check question, where it plays; the technical rest is folded. */
function soundBodyHTML(it: PageItem, cur: PageTake | undefined): string {
  const play = cur ? `<button class="pl big" data-play="${esc(cur.id)}" aria-label="Play">▶</button>` : ''
  const tech = cur
    ? `<div class="lbl">${esc(cur.label)}${verdictText(cur)}</div>${cur.check || cur.flags.length ? `<div class="chk">${esc(cur.check ?? '')}${cur.flags.length ? ` <b>${cur.flags.map(esc).join(', ')}</b>` : ''}</div>` : ''}`
    : ''
  const older = it.takes.filter((t) => t !== cur)
  const flagged = cur?.flags.length ? ' flag' : ''
  return `<div class="hear">${play}${sayHTML(it)}</div>
   ${it.ask ? `<p class="why">${esc(it.ask)}</p>` : ''}
   ${it.where ? `<p class="where">${esc(it.where)}</p>` : ''}${statusHTML(it)}${cur ? rejectNoteHTML(cur) : ''}
   <details class="tech${flagged}"><summary>Details</summary>${tech}${older.map(audioTakeHTML).join('')}</details>`
}

const vis0 = (it: PageItem) => visualHTML(it) !== ''

export function itemHTML(it: PageItem, opts: { selected?: boolean; revealed?: boolean } = {}): string {
  const pic = it.kind === 'image'
  const cur = currentTake(it)
  const cls = ['item', pic ? 'picitem' : '', vis0(it) ? '' : 'novis', it.status === 'open' || it.askTake ? '' : 'decided', it.hidden ? 'hidecap' : '', opts.revealed ? 'reveal' : '', opts.selected ? 'sel' : '']
  const compare = it.compare ? `<div class="src">${img(it.compare.src, it.compare.mirror)} ${esc(it.compare.label ?? 'to compare')}</div>` : ''
  const takes = pic
    ? it.takes.length > 1
      ? pictureTakesHTML(it)
      : cur
        ? `<div class="lbl">${esc(cur.label)}${verdictText(cur)}</div>${rejectNoteHTML(cur)}`
        : ''
    : ''
  const vis = visualHTML(it)
  const lead = pic || it.hidden ? `${captionHTML(it)}${it.ask ? `<p class="why">Check: ${esc(it.ask)}</p>` : ''}${compare}<p class="where">${esc(it.where ?? '')}</p>${statusHTML(it)}${takes}` : `${compare}${soundBodyHTML(it, cur)}`
  return `<article class="${cls.filter(Boolean).join(' ')}" id="i-${esc(it.id)}" data-id="${esc(it.id)}">
  ${vis ? `<div class="vis"${pic ? ' data-reveal' : ''}>${vis}</div>` : ''}
  <div class="body">${lead}${itemNotesHTML(it)}
   <div class="xbtns"><button class="btn ghost" data-freenote>${it.itemNote ? 'Edit note' : 'Add a note'}</button>
   ${it.nameCheck ? `<button class="btn ghost" data-nameobj>${it.name ? 'Edit name objection' : 'Object to the name'}</button>` : ''}
   ${it.status !== 'open' && it.status !== 'checked' ? '<button class="btn ghost" data-reset>Change: reset the decision</button>' : ''}</div></div></article>`
}

export function countsHTML(items: PageItem[]): string {
  const n = (s: string) => items.filter((i) => i.status === s).length
  const f = items.filter((i) => i.flagged).length
  return `<span>${n('open')} open</span><span class="c-ok">${n('ok')} ok</span>${n('checked') ? `<span>${n('checked')} shipped on checks</span>` : ''}${n('rejected') ? `<span class="c-bad">${n('rejected')} waiting for new takes</span>` : ''}${f ? `<span class="c-flag">${f} flagged</span>` : ''}`
}
