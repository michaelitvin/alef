// Pure rules over the decision log: the take to ship, each item's state, the notes and the retake work list.
// One implementation for the page, the sync, provenance and the agent CLI.
import type { Item, ReviewEvent, Take } from './model.ts'

export type Verdict = 'ok' | 'accepted' | 'rejected'
export type Status = 'open' | 'ok' | 'rejected' | 'empty' | 'retired'
export type NoteKind = 'reject' | 'note' | 'name'
export type NoteState = 'open' | 'answered' | 'closed'

export interface Note {
  /** The seq of the event that holds the note. */
  seq: number
  kind: NoteKind
  item: string
  /** The take the note is about: the rejected take, or the take on screen for an item note. */
  take: string | null
  text: string
  at: string | null
  state: NoteState
  /** Why a closed note closed. */
  closedBy?: 'edited' | 'cleared' | 'changed-mind' | 'decided' | 'retired'
  answer?: { seq: number; text: string; take: string | null; at: string | null }
}

export interface TakeState {
  take: Take
  verdict: Verdict | null
  /** The relayed approval's words, for an accepted take. */
  source?: string
  /** The OK comment, or the note of a rejected take. */
  text?: string
  at?: string | null
  withdrawn: string | null
}

export interface ItemState {
  item: Item
  status: Status
  current: Take | null
  takes: TakeState[]
  /** Every note ever written on the item, oldest first, with its state now. */
  notes: Note[]
  itemNote: Note | null
  name: Note | null
  ask: string | null
  /** The open ask's take: the take named in the ask, else the newest. Null when there is no open ask. */
  askTake: string | null
  retired: string | null
  /** The current take has a failed automatic check. */
  flagged: boolean
}

const reason = (v: string | boolean | undefined): string | null => (v ? (v === true ? 'yes' : v) : null)

/** The latest withdraw/restore and retire/unretire events win over the adapter's own marks. */
function marks(item: Item, events: ReviewEvent[]) {
  const withdrawn = new Map<string, string | null>()
  for (const t of item.takes) withdrawn.set(t.id, reason(t.withdrawn))
  let retired = reason(item.retired)
  let prefer: string | null = null
  let ask = item.ask || null
  let askTake: string | null = null
  let askSeq = 0
  for (const e of events) {
    if (e.type === 'withdraw' && e.take) withdrawn.set(e.take, e.text || 'withdrawn')
    else if (e.type === 'restore' && e.take) withdrawn.set(e.take, null)
    else if (e.type === 'retire') retired = e.text || 'retired'
    else if (e.type === 'unretire') retired = null
    else if (e.type === 'prefer') prefer = e.take ?? null
    else if (e.type === 'ask') {
      ask = e.text || null
      askTake = e.take ?? null
      askSeq = e.seq
    }
  }
  return { withdrawn, retired, prefer, ask, askTake, askSeq }
}

/** Fold the take decisions: the last ok / accept / reject / reset on a take decides it. */
function verdicts(item: Item, events: ReviewEvent[]) {
  const out = new Map<string, { verdict: Verdict; text?: string; source?: string; at: string | null }>()
  const inRound = (t: Take, round?: number) => round == null || t.round == null || t.round === round
  for (const e of events) {
    if (e.type === 'ok' || e.type === 'accept') {
      const v: Verdict = e.type === 'ok' ? 'ok' : 'accepted'
      if (e.only) for (const [id, d] of out) if (id !== e.take && d.verdict !== 'rejected') out.delete(id)
      if (e.take) out.set(e.take, { verdict: v, text: e.text, source: e.source, at: e.at })
      else for (const t of item.takes) if (inRound(t, e.round)) out.set(t.id, { verdict: v, text: e.text, at: e.at })
    } else if (e.type === 'reject') {
      if (e.take) out.set(e.take, { verdict: 'rejected', text: e.text ?? '', at: e.at })
      else for (const t of item.takes) if (inRound(t, e.round)) out.set(t.id, { verdict: 'rejected', text: e.text ?? '', at: e.at })
    } else if (e.type === 'reset') {
      if (e.take) out.delete(e.take)
      else out.clear()
    }
  }
  return out
}

/**
 * The take to ship. "Ship the take that the parent approved; a newer take he has not heard never replaces it."
 * 1. The newest approved take (his OK, or his approval relayed from a message), not withdrawn.
 * 2. Else, among the takes newer than the newest rejected take and not rejected: the agent's preferred take, or the
 *    newest (the game uses unreviewed takes while the review is open).
 * 3. Else the newest take (rejected, waiting for its retake). Null when every take is withdrawn.
 */
export function takeToShip(
  takes: Take[],
  verdictOf: (id: string) => Verdict | null,
  isWithdrawn: (id: string) => boolean,
  prefer: string | null = null,
): Take | null {
  const live = takes.filter((t) => !isWithdrawn(t.id))
  if (!live.length) return null
  const approved = live.filter((t) => {
    const v = verdictOf(t.id)
    return v === 'ok' || v === 'accepted'
  })
  if (approved.length) return approved[approved.length - 1]
  let lastRejected = -1
  live.forEach((t, i) => {
    if (verdictOf(t.id) === 'rejected') lastRejected = i
  })
  const candidates = live.filter((_t, i) => i > lastRejected)
  if (candidates.length) return candidates.find((t) => t.id === prefer) ?? candidates[candidates.length - 1]
  return live[live.length - 1]
}

const DECISIONS = new Set(['ok', 'reject', 'reset', 'note', 'name'])

/** Every note of the item with its state now. */
function notesOf(item: Item, events: ReviewEvent[], retired: string | null): Note[] {
  const notes: Note[] = []
  const byKind = (n: Note, kind: NoteKind, take: string | null) => n.kind === kind && (kind !== 'reject' || n.take === take)
  const close = (pred: (n: Note) => boolean, why: Note['closedBy']) => {
    for (const n of notes) if (n.state !== 'closed' && pred(n)) Object.assign(n, { state: 'closed', closedBy: why })
  }
  for (const e of events) {
    if (e.type === 'answer') {
      const n = notes.find((x) => x.seq === e.note)
      if (n && n.state === 'open') {
        n.state = 'answered'
        n.answer = { seq: e.seq, text: e.text ?? '', take: e.take ?? null, at: e.at }
      }
      continue
    }
    if (e.by !== 'parent' || !DECISIONS.has(e.type)) continue
    // a decision after an answer closes the answered notes: he has seen the answer and decided again
    close((n) => n.state === 'answered', 'decided')
    if (e.type === 'reject') {
      close((n) => byKind(n, 'reject', e.take ?? null), 'edited')
      notes.push({ seq: e.seq, kind: 'reject', item: item.id, take: e.take ?? null, text: e.text ?? '', at: e.at, state: 'open' })
    } else if (e.type === 'ok' || e.type === 'reset') {
      close((n) => n.kind === 'reject' && (e.take == null || n.take === e.take), 'changed-mind')
    } else {
      const kind = e.type as NoteKind
      close((n) => byKind(n, kind, null), e.text ? 'edited' : 'cleared')
      if (e.text) notes.push({ seq: e.seq, kind, item: item.id, take: e.take ?? null, text: e.text, at: e.at, state: 'open' })
    }
  }
  if (retired) close(() => true, 'retired')
  return notes
}

/** The whole derived state of one item. `events` may hold other items' events; they are skipped. */
export function deriveItem(item: Item, allEvents: ReviewEvent[]): ItemState {
  const events = allEvents.filter((e) => e.item === item.id).sort((a, b) => a.seq - b.seq)
  const m = marks(item, events)
  const v = verdicts(item, events)
  const isWithdrawn = (id: string) => !!m.withdrawn.get(id)
  const current = takeToShip(item.takes, (id) => v.get(id)?.verdict ?? null, isWithdrawn, m.prefer)
  const takes: TakeState[] = item.takes.map((take) => {
    const d = v.get(take.id)
    return { take, verdict: d?.verdict ?? null, text: d?.text, source: d?.source, at: d?.at, withdrawn: m.withdrawn.get(take.id) ?? null }
  })
  const cv = current ? (v.get(current.id)?.verdict ?? null) : null
  const status: Status = m.retired
    ? 'retired'
    : !current
      ? 'empty'
      : cv === 'rejected'
        ? 'rejected'
        : cv
          ? 'ok'
          : 'open'
  // An open ask surfaces the item whatever its status, on the asked-about take (the newest, or the one the ask names),
  // until the parent decides on that take or an agent clears the ask. The take to ship does not change.
  const newestLive = [...item.takes].reverse().find((t) => !isWithdrawn(t.id))
  const named = m.askTake && !isWithdrawn(m.askTake) && item.takes.some((t) => t.id === m.askTake) ? m.askTake : null
  const askedId = named ?? newestLive?.id ?? null
  const decidedAsked = events.some((e) => e.seq > m.askSeq && e.by === 'parent' && (e.type === 'ok' || e.type === 'reject') && (e.take == null || e.take === askedId))
  const askTake = m.ask && !m.retired && askedId && !decidedAsked ? askedId : null
  const notes = notesOf(item, events, m.retired)
  // A note on a take that has a newer live take is answered by that take, even with no answer event: the old pipelines
  // answered notes only by making new takes.
  const order = item.takes.map((t) => t.id)
  const newest = [...item.takes].reverse().find((t) => !isWithdrawn(t.id))
  for (const n of notes) {
    if (n.state !== 'open' || !n.take || !newest) continue
    const at = order.indexOf(n.take)
    if (at >= 0 && order.indexOf(newest.id) > at) {
      n.state = 'answered'
      n.answer = { seq: 0, text: 'a newer take', take: newest.id, at: null }
    }
  }
  const live = (kind: NoteKind) => [...notes].reverse().find((n) => n.kind === kind && n.closedBy !== 'edited' && n.closedBy !== 'cleared') ?? null
  return {
    item,
    status,
    current,
    takes,
    notes,
    itemNote: live('note'),
    name: live('name'),
    ask: m.ask,
    askTake,
    retired: m.retired,
    flagged: !!current?.flags?.length,
  }
}

export function deriveAll(items: Item[], events: ReviewEvent[]): ItemState[] {
  const byItem = new Map<string, ReviewEvent[]>()
  for (const e of events) {
    const list = byItem.get(e.item)
    if (list) list.push(e)
    else byItem.set(e.item, [e])
  }
  return items.map((it) => deriveItem(it, byItem.get(it.id) ?? []))
}

/** The work list for agents: items with open (unanswered) notes, the current take beside them. */
export function retakeList(states: ItemState[]) {
  return states
    .filter((s) => s.status !== 'retired')
    .map((s) => ({ item: s.item.id, current: s.current?.id ?? null, status: s.status, notes: s.notes.filter((n) => n.state === 'open') }))
    .filter((w) => w.notes.length)
}

/** Open notes across items (state 'open'), or every note with `all`. */
export function openNotes(states: ItemState[], all = false): Note[] {
  return states.flatMap((s) => s.notes.filter((n) => all || n.state === 'open'))
}

export type View = 'focus' | 'open' | 'sample' | 'all'

/** Does the item belong in the view? Retired items are in no view. */
export function inView(s: ItemState, view: View): boolean {
  if (s.status === 'retired') return false
  if (view === 'all') return true
  if (view === 'focus' && s.askTake) return true
  if (s.status !== 'open') return false
  if (view === 'open') return true
  if (view === 'focus') return !!s.ask || s.flagged
  return !!s.item.sample || s.flagged || !!s.ask || s.notes.some((n) => n.state === 'answered')
}

/** Item id -> take id to ship, for the items still in the game. */
export function shipList(states: ItemState[]): Record<string, string | null> {
  const out: Record<string, string | null> = {}
  for (const s of states) if (s.status !== 'retired') out[s.item.id] = s.current?.id ?? null
  return out
}

/**
 * The adapter's items, plus a retired stand-in for every item that has events in the log but is no longer in the
 * adapter's list (a picture dropped after a note, an old voice test). Their history stays readable and their notes
 * close as retired.
 */
export function withOrphans(items: Item[], events: ReviewEvent[]): Item[] {
  const known = new Set(items.map((i) => i.id))
  const orphans: Item[] = []
  for (const e of events) {
    if (known.has(e.item)) continue
    known.add(e.item)
    orphans.push({ id: e.item, kind: 'audio', takes: [], retired: "not in the game's item list" })
  }
  return [...items, ...orphans]
}
