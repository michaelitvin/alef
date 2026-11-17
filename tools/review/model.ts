// The review kit's data model. Host-free: a game adapter (outside the repo) supplies the items and their takes; the
// decision log holds every decision as an event. Everything else (current take, open notes, the retake work list) is
// derived from these two, in rules.ts.

/** Who wrote an event. The page writes only parent events; the agent CLI writes only agent events. */
export type Actor = 'parent' | 'agent'

/** Events the parent makes on the review page. */
export const PARENT_EVENTS = ['ok', 'reject', 'reset', 'note', 'name', 'retake'] as const
/** Events an agent (pipeline) makes through the CLI. They never stand for a click of the parent. */
export const AGENT_EVENTS = ['accept', 'answer', 'ask', 'withdraw', 'restore', 'retire', 'unretire', 'prefer'] as const

export type ParentEventType = (typeof PARENT_EVENTS)[number]
export type AgentEventType = (typeof AGENT_EVENTS)[number]
export type EventType = ParentEventType | AgentEventType

/**
 * One line of the decision log. Fields by type:
 * - ok: `take` (null = the whole round, old versioned model), optional `text` (a comment), `only` (clear the other OKs:
 *   "pick this one"), `round`.
 * - reject: `take` (null = the whole round), `text` (the note, may be empty), `round`.
 * - reset: `take` (null = every take of the item).
 * - note: item note; `text` ('' clears it), `take` = the take on screen when he wrote it.
 * - name: name objection ("a child would say X"); `text` ('' clears it), `take` as for note.
 * - retake: an explicit retake request (the old pages sent one with every Reject).
 * - accept: the parent approved in a message, relayed by an agent; `take`, `source` = his words.
 * - answer: an agent answered a note; `note` = the note's seq, `text` = what was done, optional `take` (the new take).
 * - ask: the "needs you" line for the item; `text` ('' clears it), optional `take` = the take it asks about (default: the
 *   newest). The item stays in "needs you" until he decides on that take or an agent clears the ask.
 * - withdraw / restore: the pipeline took a take back (failed check, reverted spelling); `take`, `text` = why.
 * - retire / unretire: the item left the game; `text` = why.
 * - prefer: the agent's choice among takes the parent has not decided; `take`.
 */
export interface ReviewEvent {
  seq: number
  /** ISO time, or the original time string of an imported decision; null when the old store did not keep one. */
  at: string | null
  by: Actor
  type: EventType
  item: string
  take?: string | null
  text?: string
  only?: boolean
  round?: number
  note?: number
  source?: string
  /** Provenance of an imported event (the file it came from). */
  src?: string
}

/** An event before the log gives it a number. */
export type NewEvent = Omit<ReviewEvent, 'seq'>

export interface Take {
  /** Opaque and stable: usually the file path relative to the game's media roots ("clips/x/v2.mp3", "art/a.webp#mirrored"). */
  id: string
  label?: string
  /** URL path under the game's media; default: the id without its #fragment. */
  src?: string
  /** Show the picture mirrored; default: the id ends in "#mirrored". */
  mirror?: boolean
  /** Withdrawn in the adapter's own data (a reason, or true). The log's withdraw events count too. */
  withdrawn?: string | boolean
  /** Automatic check results for this take. */
  check?: string
  flags?: string[]
  /** Round (version) of the take, for the old versioned model's round-wide decisions. */
  round?: number
}

export type ItemKind = 'audio' | 'image'

export interface Item {
  id: string
  kind: ItemKind
  takes: Take[]
  caption?: string
  lang?: string
  /** Where the item is used in the game. */
  where?: string
  section?: string
  /** The caption is hidden until a tap (a pictogram's word that the game does not show). */
  hidden?: boolean
  /** Offer a name objection ("a child would say X"). */
  nameCheck?: boolean
  /** A reference picture beside the take (the source of a recolour, the boy's picture beside the girl's). */
  compare?: { src: string; label?: string; mirror?: boolean }
  /** A large glyph as the context visual (a letter, a syllable). */
  glyph?: string
  /** A picture as the context visual of a sound. */
  picture?: string
  /** The adapter's "needs you" line (from the pipeline's focus list). Ask events in the log win. */
  ask?: string
  /** In the sample view (the adapter chooses: one per pattern). */
  sample?: boolean
  /** Retired in the adapter's own data (a reason, or true). */
  retired?: string | boolean
  /** An approval the parent gave in a message, kept in the old pipeline's data. `import-choices --accepted` turns it
   * into an accept event; the rules read only the event. */
  accepted?: string
}

export interface Section {
  id: string
  title: string
  order?: number
}

/**
 * The old review files that tools outside the kit still read (sync, provenance, agents). The server writes them again
 * from the log after each of the parent's decisions; see legacyFiles.ts. Paths are host facts: adapter only.
 */
export interface LegacyFiles {
  /** The old choices file: the "choices" format, or the "versioned" format when `rounds` is given. */
  choices: string
  /** The old retake queue ("choices" format only). */
  queue?: string
  /** Where the pre-switch choices file is kept before the kit first writes over it. */
  frozenChoices: string
  frozenQueue?: string
  /** The versioned format's takes of each item's round (the first nikkud duel). */
  rounds?: () => Record<string, { version: number; takes: string[] }>
}

/** What a game adapter gives the kit. Host facts (paths, ports) live only in the adapter, never in the repo. */
export interface GameAdapter {
  id: string
  title: string
  /** Path of the game's decision log (JSON lines). */
  log: string
  /** URL prefix -> folder: a take "cut/a.webp" is served from media["cut"] + "/a.webp". */
  media: Record<string, string>
  loadItems(): Item[] | Promise<Item[]>
  sections?: Section[]
  /** The old files to keep up to date for tools that still read them. */
  legacy?: LegacyFiles
}
