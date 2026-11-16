// The time a game's flow waits on: a seam, so that the flow can run on the browser's timers (the game) or on a virtual
// clock that never waits (tests of the flow's rules). The flow asks only this; it never calls a window timer itself.

/** cancels a callback that has not run yet (no effect after it ran) */
export type Cancel = () => void

export interface Sleeper {
  /** resolves after `ms` */
  sleep(ms: number): Promise<void>
  /** calls `fn` once after `ms` */
  after(ms: number, fn: () => void): Cancel
  /** calls `fn` every `ms` until cancelled (the broom's tick) */
  every(ms: number, fn: () => void): Cancel
  /** calls `fn` before the next paint */
  frame(fn: () => void): Cancel
  /** the clock in ms (only differences mean something) */
  now(): number
}

/**
 * The browser's timers. Each call looks the timer function up when it is made, so that a test's fake timers (installed
 * after this module loads) drive it.
 */
export const realSleeper: Sleeper = {
  sleep: (ms) => new Promise<void>((r) => { setTimeout(r, ms) }),
  after: (ms, fn) => {
    const id = setTimeout(fn, ms)
    return () => clearTimeout(id)
  },
  every: (ms, fn) => {
    const id = setInterval(fn, ms)
    return () => clearInterval(id)
  },
  frame: (fn) => {
    const id = requestAnimationFrame(() => fn())
    return () => cancelAnimationFrame(id)
  },
  now: () => performance.now(),
}

/** a frame on the virtual clock: 60 per second */
const FRAME_MS = 16
/** microtask turns between two callbacks, so that the code a callback woke up schedules its next wait first */
const SETTLE_TURNS = 10
/** callbacks in a row without the queue emptying: a timer that is never cancelled (an `every`) would run forever */
const RUNAWAY = 100_000

/**
 * A virtual clock that never waits: the queued callbacks run one by one in time order (ties in the order they were
 * asked), a few microtasks apart, and `now` jumps to each one's time. A `sleep(ms)` resolves as soon as everything due
 * before it has run. An `every` must be cancelled, or the queue never empties (it stops with an error after RUNAWAY
 * callbacks).
 */
export function instantSleeper(start = 0): Sleeper {
  let clock = start
  let seq = 0
  let pumping = false
  const queue: { at: number; seq: number; fn: () => void }[] = []
  const pump = async () => {
    pumping = true
    try {
      for (let n = 0; queue.length; n++) {
        for (let i = 0; i < SETTLE_TURNS; i++) await null
        if (!queue.length) break
        if (n >= RUNAWAY) throw new Error('instantSleeper: the timers never stop (an `every` was not cancelled)')
        let k = 0
        for (let i = 1; i < queue.length; i++) if (queue[i].at < queue[k].at || (queue[i].at === queue[k].at && queue[i].seq < queue[k].seq)) k = i
        const [next] = queue.splice(k, 1)
        clock = Math.max(clock, next.at)
        next.fn()
      }
    } finally {
      pumping = false
    }
  }
  const add = (ms: number, fn: () => void): Cancel => {
    const entry = { at: clock + Math.max(0, ms), seq: seq++, fn }
    queue.push(entry)
    if (!pumping) void pump()
    return () => {
      const i = queue.indexOf(entry)
      if (i >= 0) queue.splice(i, 1)
    }
  }
  return {
    sleep: (ms) => new Promise<void>((r) => { add(ms, r) }),
    after: add,
    every: (ms, fn) => {
      let cancel: Cancel = () => {}
      let live = true
      const tick = () => {
        if (!live) return
        cancel = add(ms, tick)
        fn()
      }
      cancel = add(ms, tick)
      return () => { live = false; cancel() }
    },
    frame: (fn) => add(FRAME_MS, fn),
    now: () => clock,
  }
}
