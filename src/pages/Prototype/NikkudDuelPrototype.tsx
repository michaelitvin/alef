// PROTOTYPE — Nikkud Wizard Duel. Throwaway code to answer one question:
// "Does the race-against-the-clock wizard duel feel fun for a 7-year-old?"
// Three effect-intensity presets via ?variant=A|B|C. Notes + verdict: ./nikkudDuel/NOTES.md
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { motion, useAnimationControls } from 'framer-motion'
import { useSearchParams } from 'react-router-dom'
import { Howler } from 'howler'
import PrototypeSwitcher from '../../components/common/PrototypeSwitcher'
import { GROUP_SPOKEN, MARKS, RuneGlowDefs, RuneGlyph, randomWord, type Mark, type PictureWord } from './nikkudDuel/marks'
import {
  BOSS_EVERY, BOSS_HP, MEGA_MAX, MONSTERS_PER_WAVE, PRESETS, isCorrect, makeRound,
  type Choice, type Juice, type Round,
} from './nikkudDuel/game'
import * as sfx from './nikkudDuel/sfx'
import { Icon, type IconName } from './nikkudDuel/icons'
import * as audio from './nikkudDuel/audioFiles'
import { FLIP, MONSTER_SPRITES, TOWER, WIZARD, WORD_PICTURE } from './nikkudDuel/sprites'
import { MONSTER_RATE, hasLine, playLine } from './nikkudDuel/voice'
import { loadStats, recordRound, recordRunEnd, recordSession, recordTwin, resetStats } from './nikkudDuel/stats'
import './nikkudDuel/nikkudDuel.css'

// Battlefield geometry in % of the field: monster walks start → end (tower edge); fireball leaves from wiz.
interface Geo { start: number; end: number; wizLeft: number; wizBottom: number }
const PORTRAIT: Geo = { start: 78, end: 27, wizLeft: 15, wizBottom: 50 }
const LANDSCAPE: Geo = { start: 90, end: 16, wizLeft: 9, wizBottom: 52 }
const LANDSCAPE_QUERY = '(orientation: landscape) and (min-width: 640px) and (min-height: 500px)' // phone on its side stays portrait

function useLandscape() {
  const [on, setOn] = useState(() => window.matchMedia(LANDSCAPE_QUERY).matches)
  useEffect(() => {
    const mq = window.matchMedia(LANDSCAPE_QUERY)
    const f = () => setOn(mq.matches)
    mq.addEventListener('change', f)
    return () => mq.removeEventListener('change', f)
  }, [])
  return on
}

const delay = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms))

// He can't read yet: nothing he needs is written. Screens get an icon; instructions are spoken by the wizard.
const PROMPT_ICON: Record<Round['type'], IconName> = { A: 'eye', B: 'ear', C: 'ear', D: 'shield' }

// Wizard lines (ElevenLabs, review section 7); the text is only the device-TTS fallback.
const LINE_TEXT: Record<string, string> = {
  'line-intro': 'הַמִּפְלָצוֹת בָּאוֹת! הַגֵּן עַל הַמִּגְדָּל!',
  'line-how-A': 'מָה הַצְּלִיל הָרִאשׁוֹן בַּתְּמוּנָה? בְּחַר אֶת הַנִּקּוּד!',
  'line-how-B': 'הַקְשֵׁב לַמִּפְלֶצֶת, וּבְחַר אֶת הַנִּקּוּד!',
  'line-how-C': 'הַמִּפְלֶצֶת אוֹמֶרֶת שֵׁם שֶׁל נִקּוּד. מְצָא אוֹתוֹ!',
  'line-how-D': 'בְּאֵיזֶה צְלִיל מַתְחִיל הַנִּקּוּד עַל הַמָּגֵן? בְּחַר תְּמוּנָה!',
  'line-how-silent': 'הַמִּפְלֶצֶת הַזֹּאת שְׁקֵטָה... אֵיזֶה נִקּוּד לֹא עוֹשֶׂה צְלִיל?',
  'line-wave': 'גַּל חָדָשׁ!',
  'line-new-spells': 'כִּשּׁוּפִים חֲדָשִׁים!',
  'line-boss': 'מִפְלֶצֶת עֲנָקִית! צָרִיךְ שָׁלוֹשׁ פְּגִיעוֹת!',
  'line-mega': 'כִּשּׁוּף מֶגָה מוּכָן! לְחַץ עַל הַבָּרָק!',
  'line-combo': 'וָאוּ! קוֹמְבּוֹ!',
  'line-over': 'נִלְחַמְתָּ כְּמוֹ קוֹסֵם אֲמִיתִי! עוֹד פַּעַם?',
  'line-record': 'שִׂיא חָדָשׁ!',
  'line-almost': 'כִּמְעַט!',
}
const wizardSays = (id: string) => say(id, LINE_TEXT[id] ?? '', 'wizard')

interface Outcome {
  kind: 'hit' | 'miss'
  x: number
  choiceKey: string | null
  mega: boolean
  final: boolean // hit that destroys the monster (boss hits before the last are not final)
  points: number
}

const keyOf = (c: Choice) => (c.kind === 'rune' ? c.mark.id : `g-${c.group}`)

// Every spoken line ducks the music while it plays. Recorded ElevenLabs line first; device TTS only if missing.
function say(lineId: string, text: string, who: sfx.Speaker, rate = 1) {
  audio.duck(true)
  const p = hasLine(lineId) ? playLine(lineId, rate) : sfx.speak(text, who)
  return p.finally(() => audio.duck(false))
}

/** End-of-screen feedback: name, sound, picture word ("קָמָץ… אָ… כְּמוֹ אַרְיֵה"). Shva: name, then the silent puff. */
function sayNameAndSound(m: Mark, word: PictureWord = randomWord(m.group)) {
  return say(`wiz-${m.id}`, m.name, 'wizard')
    .then(() => delay(250))
    .then(() => (m.group === 'silent' ? playLine('sfx-mute') : say(`wiz-vowel-${m.group}`, GROUP_SPOKEN[m.group], 'wizard')))
    .then(() => (m.group === 'silent' ? undefined : delay(200).then(() => say(`wiz-word-${word.key}`, `כְּמוֹ ${word.he}`, 'wizard'))))
}

// Clues are spoken by the monster (Clyde, at this monster's own rate); feedback by the wizard (Will).
function playPrompt(r: Round): Promise<void> {
  const rate = MONSTER_RATE[r.monster] ?? 1
  if (r.type === 'B') {
    if (r.target.group === 'silent') return playLine('sfx-mute', rate)
    return say(`mon-vowel-${r.target.group}`, GROUP_SPOKEN[r.target.group], 'monster', rate)
  }
  if (r.type === 'C') return say(`mon-name-${r.target.id}`, r.target.name, 'monster', rate)
  return Promise.resolve()
}

export default function NikkudDuelPrototype() {
  const [params] = useSearchParams()
  const variant = params.get('variant') ?? 'A'
  const juice = PRESETS[variant] ?? PRESETS.A
  // ?walk=<ms> overrides monster walk time (slower for a first playtest, or for headless checks)
  const walkOverride = Number(params.get('walk')) || 0
  const landscape = useLandscape()
  // Tower edge + staff tip are measured from the rendered sprites (their % width depends on aspect ratio).
  const fieldRef = useRef<HTMLDivElement>(null)
  const towerRef = useRef<HTMLImageElement>(null)
  const wizardRef = useRef<HTMLImageElement>(null)
  const [measured, setMeasured] = useState<Partial<Geo>>({})
  useLayoutEffect(() => {
    const field = fieldRef.current
    if (!field) return
    const measure = () => {
      const f = field.getBoundingClientRect()
      const t = towerRef.current?.getBoundingClientRect()
      const w = wizardRef.current?.getBoundingClientRect()
      if (!t || !w || !f.width) return
      const monsterHalf = (landscape ? 60 : 48) / f.width * 100
      setMeasured({
        end: ((t.right - f.left) / f.width) * 100 + monsterHalf,
        wizLeft: ((w.right - f.left) / f.width) * 100 - 3,
        wizBottom: ((f.bottom - w.top) / f.height) * 100 - 8,
      })
    }
    measure()
    const ro = new ResizeObserver(measure)
    ro.observe(field)
    window.addEventListener('resize', measure) // sprite onLoad dispatches this too
    return () => {
      ro.disconnect()
      window.removeEventListener('resize', measure)
    }
  }, [landscape])
  const geo: Geo = { ...(landscape ? LANDSCAPE : PORTRAIT), ...measured }
  const { start: START_X, end: END_X } = geo

  const [phase, setPhase] = useState<'start' | 'play' | 'over'>('start')
  const [hearts, setHearts] = useState(3)
  const [score, setScore] = useState(0)
  const [combo, setCombo] = useState(0)
  const [bestCombo, setBestCombo] = useState(0)
  const [wave, setWave] = useState(1)
  const [killed, setKilled] = useState(0)
  const [bossHp, setBossHp] = useState(0)
  const [mega, setMega] = useState(0)
  const [round, setRound] = useState<Round | null>(null)
  const [outcome, setOutcome] = useState<Outcome | null>(null)
  const [banner, setBanner] = useState<React.ReactNode>(null)
  const [newBest, setNewBest] = useState(false)
  const seenScreens = useRef(new Set<string>())
  // The clock starts when the monster starts walking: for B/C only after its clue has played.
  const [walking, setWalking] = useState(false)
  // Twin tap on a name screen: forgiven once per round (the tapped twin's key).
  const [twinKey, setTwinKey] = useState<string | null>(null)
  // Paused while the tablet is locked / the tab hidden; the current round restarts on resume.
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const pending = useRef<{ r: Round; w: number; boss: boolean } | null>(null)
  const runId = useRef(0)
  const [noVoice, setNoVoice] = useState(false)
  const [showStats, setShowStats] = useState(false)
  const [musicOn, setMusicOn] = useState(audio.musicEnabled)
  const speechDone = useRef<Promise<void>>(Promise.resolve())
  const missed = useRef<Record<string, number>>({})
  const highScore = useRef(0)
  const spawnAt = useRef(0)
  const nextId = useRef(1)
  const timers = useRef<number[]>([])
  const shake = useAnimationControls()

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, ms))
  }
  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const stars = useMemo(
    () => Array.from({ length: 70 }, (_, i) => ({ i, x: Math.random() * 100, y: Math.random() * 62, s: Math.random() * 2.2 + 0.8, d: Math.random() * 3 })),
    [],
  )

  // First time a screen type (or the mute monster) shows up in a run, the wizard explains it
  // BEFORE the monster appears, so the explanation never eats into answer time.
  function instructionFor(r: Round) {
    const key = r.type === 'B' && r.target.group === 'silent' ? 'silent' : r.type
    if (seenScreens.current.has(key)) return null
    seenScreens.current.add(key)
    return `line-how-${key}`
  }

  function spawn(w: number, boss: boolean) {
    const r = makeRound(nextId.current++, w, boss, missed.current)
    if (walkOverride) r.walkMs = walkOverride
    const how = instructionFor(r)
    if (!how) return begin(r, w, boss)
    const id = runId.current
    setRound(null)
    setOutcome(null)
    void announce(how, <Icon name={PROMPT_ICON[r.type]} size={96} />).then(() => id === runId.current && begin(r, w, boss))
  }

  function begin(r: Round, w: number, boss: boolean) {
    if (pausedRef.current) {
      pending.current = { r, w, boss }
      return
    }
    const id = runId.current
    setRound(r)
    setOutcome(null)
    setTwinKey(null)
    setWalking(false)
    spawnAt.current = performance.now()
    audio.playMusic(audio.trackForWave(w, boss))
    // A/D: walk at once. B/C: arrival sound ends → silence → clue → then the walk (and the clock) starts.
    const arrived = audio.playArrival()
    if (r.type === 'A' || r.type === 'D') {
      setWalking(true)
      return
    }
    void arrived
      .then(() => delay(450))
      .then(() => (id === runId.current && !pausedRef.current ? playPrompt(r) : undefined))
      .then(() => {
        if (id !== runId.current || pausedRef.current) return
        spawnAt.current = performance.now()
        setWalking(true)
      })
  }

  function pause() {
    if (pausedRef.current || phase !== 'play') return
    pausedRef.current = true
    setPaused(true)
    Howler.mute(true)
    window.speechSynthesis?.cancel()
  }

  function resume() {
    pausedRef.current = false
    setPaused(false)
    Howler.mute(false)
    if (pending.current) {
      const p = pending.current
      pending.current = null
      return begin(p.r, p.w, p.boss)
    }
    // restart the interrupted round from the right edge, clue and all
    if (round && !outcome) begin({ ...round, id: nextId.current++ }, wave, round.boss)
  }

  const pauseRef = useRef(pause)
  pauseRef.current = pause
  useEffect(() => {
    const onVis = () => document.hidden && pauseRef.current()
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [])

  /** A picture on screen while the wizard says the line; resolves when he's done. */
  function announce(lineId: string, visual: React.ReactNode) {
    setBanner(visual)
    return wizardSays(lineId).then(() => delay(250)).then(() => setBanner(null))
  }

  /** Announce, then spawn — unless a new run started meanwhile. */
  function announceThenSpawn(lineId: string, visual: React.ReactNode, w: number, boss: boolean) {
    const id = runId.current
    void announce(lineId, visual).then(() => id === runId.current && spawn(w, boss))
  }

  const bossSprite = (w: number) => MONSTER_SPRITES[w % (BOSS_EVERY * 2) === 0 ? 'troll' : 'dragon']

  function start() {
    sfx.unlockAudio()
    sfx.speak(' ') // unlocks speech on iOS inside the tap
    setNoVoice(!hasLine('wiz-kamatz') && !sfx.hasHebrewVoice())
    recordSession()
    timers.current.forEach(clearTimeout)
    timers.current = []
    missed.current = {}
    setHearts(3)
    setScore(0)
    setCombo(0)
    setBestCombo(0)
    setWave(1)
    setKilled(0)
    setBossHp(0)
    setMega(0)
    setPhase('play')
    setRound(null)
    setOutcome(null)
    setNewBest(false)
    seenScreens.current.clear()
    runId.current += 1
    announceThenSpawn('line-intro', <img className="nd-banner-sprite" src={WIZARD.cast} alt="" />, 1, false)
  }

  function doShake(power: number, delayMs: number) {
    later(delayMs, () => {
      const s = power
      void shake.start({
        x: [0, -s, s, -s * 0.6, s * 0.6, -s * 0.2, 0],
        y: [0, s * 0.5, -s * 0.5, s * 0.3, -s * 0.2, 0, 0],
        transition: { duration: 0.45 },
      })
    })
  }

  function currentX(r: Round) {
    if (!walking) return START_X
    const frac = Math.min(1, (performance.now() - spawnAt.current) / r.walkMs)
    return START_X - (START_X - END_X) * frac
  }

  function resolve(kind: 'hit' | 'miss', choiceKey: string | null, isMega = false) {
    if (!round || outcome || phase !== 'play') return
    const x = currentX(round)
    if (kind === 'hit') {
      const dmg = isMega ? 2 : 1
      const final = !round.boss || bossHp - dmg <= 0
      const points = 100 + 20 * combo + (isMega ? 200 : 0)
      setOutcome({ kind, x, choiceKey, mega: isMega, final, points })
      const impact = 260 + juice.hitstopMs
      if (isMega) audio.playMega()
      else audio.playCast()
      later(impact, () => {
        audio.playBoom(final ? juice.boom * (isMega ? 1.6 : 1) : juice.boom * 0.5)
        audio.playSparkle()
      })
      doShake(final ? juice.shake * (isMega ? 1.5 : 1) : juice.shake * 0.4, impact)
      const comboLine = (combo + 1) % 5 === 0
      const megaLine = !isMega && mega + 1 === MEGA_MAX
      speechDone.current = delay(impact + 300)  // the name is spoken after MEGA kills too: every round teaches
        .then(() => sayNameAndSound(round.target, round.word))
        .then(() => (comboLine ? wizardSays('line-combo') : undefined))
        .then(() => (megaLine ? wizardSays('line-mega') : undefined))
      recordRound(round, isMega ? 'mega' : 'correct', performance.now() - spawnAt.current)
      setScore((s) => s + points)
      setCombo(combo + 1)
      setBestCombo((b) => Math.max(b, combo + 1))
      setMega((m) => (isMega ? 0 : Math.min(MEGA_MAX, m + 1)))
      if (round.boss) setBossHp(final ? 0 : bossHp - dmg)
    } else {
      setOutcome({ kind, x, choiceKey, mega: false, final: false, points: 0 })
      later(380, () => audio.playOuch())
      doShake(8, 380)
      speechDone.current = delay(700).then(() => sayNameAndSound(round.target, round.word))
      recordRound(round, choiceKey ? 'wrong' : 'timeout', performance.now() - spawnAt.current)
      missed.current[round.target.id] = (missed.current[round.target.id] ?? 0) + 1
      setCombo(0)
      setHearts((h) => h - 1) // a boss keeps the damage it already took
    }
  }

  // Latest resolve for timers (timeout = the monster reached the tower).
  const resolveRef = useRef(resolve)
  resolveRef.current = resolve

  useEffect(() => {
    if (!round || phase !== 'play' || !walking || paused || outcome) return
    const left = round.walkMs - (performance.now() - spawnAt.current)
    const t = window.setTimeout(() => resolveRef.current('miss', null), Math.max(0, left))
    return () => clearTimeout(t)
  }, [round, phase, walking, paused, outcome])

  // After a hit/miss plays out, move on.
  useEffect(() => {
    if (!outcome || !round) return
    // Next monster only after the effects AND the wizard's line are done, plus a clear pause.
    const wait = outcome.kind === 'hit' ? 1300 + juice.hitstopMs : 2000
    let cancelled = false
    void Promise.all([delay(wait), speechDone.current]).then(() => delay(500)).then(() => {
      if (cancelled) return
      if (hearts <= 0) {
        recordRunEnd(score, wave)
        audio.playMusic('victory')
        const best = score > highScore.current
        highScore.current = Math.max(highScore.current, score)
        setNewBest(best)
        setPhase('over')
        void wizardSays('line-over').then(() => (best ? wizardSays('line-record') : undefined))
        return
      }
      if (outcome.kind === 'miss') return spawn(wave, round.boss)
      if (round.boss) {
        if (bossHp > 0) return spawn(wave, true)
        const w = wave + 1
        setWave(w)
        setKilled(0)
        return announceThenSpawn('line-wave', <Icon name="swords" size={110} />, w, false)
      }
      const k = killed + 1
      if (k < MONSTERS_PER_WAVE) {
        setKilled(k)
        return spawn(wave, false)
      }
      if (wave % BOSS_EVERY === 0) {
        setKilled(k)
        setBossHp(BOSS_HP)
        return announceThenSpawn('line-boss', <img className="nd-banner-sprite" src={bossSprite(wave)} alt="" />, wave, true)
      }
      const w = wave + 1
      setWave(w)
      setKilled(0)
      if (w === 3) announceThenSpawn('line-new-spells', <span><Icon name="sparkle" size={60} /><Icon name="wand" size={110} /><Icon name="sparkle" size={60} /></span>, w, false)
      else announceThenSpawn('line-wave', <Icon name="swords" size={110} />, w, false)
    })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [outcome])

  function choose(c: Choice) {
    if (!round || outcome || paused) return
    const isTwin = round.type === 'C' && c.kind === 'rune' && c.mark.group === round.target.group && c.mark.id !== round.target.id
    if (isTwin && !twinKey) {
      // Forgiving: same sound, different name. No heart, no combo break; hear which one he tapped, try again.
      setTwinKey(keyOf(c))
      recordTwin(round)
      void wizardSays('line-almost').then(() => say(`wiz-${c.mark.id}`, c.mark.name, 'wizard'))
      return
    }
    resolve(isCorrect(round, c) ? 'hit' : 'miss', keyOf(c))
  }

  const mostMissed = Object.entries(missed.current)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => MARKS.find((m) => m.id === id)!)

  return (
    <div className={`nd-root${landscape ? ' nd-landscape' : ''}`} dir="rtl">
      <RuneGlowDefs />
      <motion.div className="nd-screen" animate={shake}>
        <div className="nd-sky">
          {stars.map((s) => (
            <span key={s.i} className="nd-star" style={{ left: `${s.x}%`, top: `${s.y}%`, width: s.s, height: s.s, animationDelay: `${s.d}s` }} />
          ))}
        </div>

        <div className="nd-hud">
          <div className="nd-hearts">{[0, 1, 2].map((i) => <Icon key={i} name={i < hearts ? 'heart' : 'heartEmpty'} size={26} />)}</div>
          {/* wave progress: one continuous bar (not dots/stars/short bars — those read as nikkud or as picture words) */}
          <div className="nd-wave-bar" aria-label="wave progress">
            <div style={{ width: `${(killed / MONSTERS_PER_WAVE) * 100}%` }} />
          </div>
          <div className="nd-hud-left">
            <button className="nd-pause-btn" onClick={pause} aria-label="pause">
              <Icon name="pause" size={22} />
            </button>
            <div className="nd-score"><Icon name="sparkle" size={20} /> {score.toLocaleString()}</div>
          </div>
        </div>
        <div className="nd-hud2">
          <div className="nd-mega-meter" title="MEGA">
            <div className="nd-mega-fill" style={{ width: `${(mega / MEGA_MAX) * 100}%` }} />
          </div>
          {combo >= 2 && (
            <motion.div key={combo} className="nd-combo" initial={{ scale: 1.8 }} animate={{ scale: 1 }}>
              <Icon name="flame" size={22} /> ×{combo}
            </motion.div>
          )}
        </div>

        <div className="nd-field" ref={fieldRef}>
          <div className="nd-ground" />
          <img ref={towerRef} className="nd-tower" src={TOWER} alt="" draggable={false} onLoad={() => window.dispatchEvent(new Event('resize'))} />
          <motion.img
            ref={wizardRef}
            className="nd-wizard"
            src={outcome?.kind === 'miss' ? WIZARD.dizzy : outcome?.kind === 'hit' ? WIZARD.cast : WIZARD.idle}
            alt=""
            draggable={false}
            animate={outcome?.kind === 'hit' ? { scale: [1, 1.12, 1] } : outcome?.kind === 'miss' ? { rotate: [0, -6, 6, -4, 0] } : { y: [0, -3, 0] }}
            transition={outcome ? { duration: 0.4 } : { repeat: Infinity, duration: 1.8 }}
          />

          {round && phase === 'play' && !outcome && walking && (
            <div className="nd-timebar">
              <motion.div
                key={round.id}
                className="nd-timebar-fill"
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: round.walkMs / 1000, ease: 'linear' }}
              />
            </div>
          )}

          {round && phase === 'play' && !outcome && (
            <motion.div
              key={round.id}
              className={`nd-monster${round.boss ? ' nd-boss' : ''}`}
              style={{ x: '-50%' }}
              initial={{ left: `${START_X}%`, scale: 0 }}
              animate={{ left: walking ? `${END_X}%` : `${START_X}%`, scale: 1 }}
              transition={{ left: { duration: walking ? round.walkMs / 1000 : 0, ease: 'linear' }, scale: { duration: 0.35, type: 'spring' } }}
            >
              <Clue round={round} />
              <motion.span
                className="nd-monster-emoji"
                animate={round.type === 'B' && round.target.group === 'silent' ? { scaleY: [1, 1.25, 1] } : { y: [0, -6, 0] }}
                transition={{ repeat: Infinity, duration: round.type === 'B' && round.target.group === 'silent' ? 0.7 : 0.5 }}
              >
                <img className="nd-sprite" src={MONSTER_SPRITES[round.monster]} style={FLIP.has(round.monster) ? { transform: 'scaleX(-1)' } : undefined} alt="" draggable={false} />
              </motion.span>
              {round.boss && <div className="nd-boss-hp">{Array.from({ length: Math.max(bossHp, 0) }, (_, i) => <Icon key={i} name="bossHeart" size={22} />)}</div>}
            </motion.div>
          )}

          {round && outcome?.kind === 'miss' && (
            <motion.div
              className={`nd-monster${round.boss ? ' nd-boss' : ''}`}
              style={{ x: '-50%' }}
              initial={{ left: `${outcome.x}%` }}
              animate={{ left: [`${outcome.x}%`, `${END_X}%`, `${END_X + 7}%`, `${END_X}%`] }}
              transition={{ duration: 0.6, times: [0, 0.55, 0.8, 1] }}
            >
              <span className="nd-monster-emoji"><img className="nd-sprite" src={MONSTER_SPRITES[round.monster]} style={FLIP.has(round.monster) ? { transform: 'scaleX(-1)' } : undefined} alt="" draggable={false} /></span>
              <motion.span className="nd-bonk" initial={{ scale: 0 }} animate={{ scale: [0, 1.6, 1] }} transition={{ delay: 0.35 }}>
                <Icon name="bonk" size={34} />
              </motion.span>
            </motion.div>
          )}

          {round && outcome?.kind === 'hit' && <Explosion key={round.id} round={round} outcome={outcome} juice={juice} geo={geo} />}

          {round && outcome && <ResolveBanner mark={round.target} word={round.word} kind={outcome.kind} />}

          {banner && (
            <motion.div className="nd-wave-banner" initial={{ scale: 0, rotate: -8 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring' }}>
              {banner}
            </motion.div>
          )}
        </div>

        <div className="nd-pad-area">
          <div className="nd-prompt">{round ? <Icon name={PROMPT_ICON[round.type]} size={32} /> : null}</div>
          {mega >= MEGA_MAX && round && !outcome && phase === 'play' && (
            <motion.button
              className="nd-mega-btn"
              style={{ x: '-50%' }}
              animate={{ scale: [1, 1.1, 1] }}
              transition={{ repeat: Infinity, duration: 0.6 }}
              onClick={() => resolve('hit', null, true)}
            >
              <Icon name="bolt" size={40} />
            </motion.button>
          )}
          {round && <Pad round={round} outcome={outcome} onChoose={choose} oneRow={landscape} twinKey={twinKey} />}
        </div>
      </motion.div>

      {phase === 'start' && (
        <div className="nd-overlay">
          <motion.img className="nd-title-wizard" src={WIZARD.cast} alt="" animate={{ y: [0, -10, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} />
          <button className="nd-big-btn nd-play-btn" onClick={start} aria-label="play">
            <Icon name="play" size={56} />
          </button>
          <button
            className="nd-parent-btn"
            onClick={() => {
              audio.setMusicEnabled(!musicOn)
              setMusicOn(!musicOn)
            }}
          >
            <Icon name={musicOn ? 'music' : 'musicOff'} size={26} />
          </button>
          <button className="nd-parent-btn" onClick={() => setShowStats(true)}>
            <Icon name="chart" size={20} /> לַהוֹרִים
          </button>
        </div>
      )}

      {phase === 'over' && (
        <div className="nd-overlay">
          <div className="nd-over-scene">
            <motion.img className="nd-over-tower" src={TOWER} alt="" initial={{ rotate: 0 }} animate={{ rotate: -14, y: 10 }} transition={{ type: 'spring', stiffness: 60 }} />
            <img className="nd-over-wizard" src={WIZARD.dizzy} alt="" />
          </div>
          <div className="nd-stats" dir="ltr">
            <div><Icon name="swords" size={30} /> {wave}</div>
            <div><Icon name="sparkle" size={30} /> {score.toLocaleString()}</div>
            <div><Icon name="flame" size={30} /> ×{bestCombo}</div>
            <div><Icon name="trophy" size={30} /> {newBest ? <Icon name="sparkle" size={30} /> : highScore.current.toLocaleString()}</div>
          </div>
          {mostMissed.length > 0 && (
            <div className="nd-practice">
              {/* the marks he missed most: tap one to hear its name again */}
              <div className="nd-practice-row">
                {mostMissed.map((m) => (
                  <button key={m.id} className="nd-practice-item" onClick={() => void sayNameAndSound(m)}>
                    <RuneGlyph mark={m} size={56} />
                    <Icon name="speaker" size={24} />
                  </button>
                ))}
              </div>
            </div>
          )}
          <button className="nd-big-btn nd-play-btn" onClick={start} aria-label="play again">
            <Icon name="replay" size={56} />
          </button>
        </div>
      )}

      {paused && phase === 'play' && (
        <div className="nd-overlay nd-pause-cover">
          <motion.img className="nd-title-wizard" src={WIZARD.idle} alt="" animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.6 }} />
          <button className="nd-big-btn nd-play-btn" onClick={resume} aria-label="resume">
            <Icon name="play" size={56} />
          </button>
        </div>
      )}

      {showStats && <ParentStats onClose={() => setShowStats(false)} />}

      {noVoice && phase === 'play' && <div className="nd-novoice">אֵין קוֹל עִבְרִי בַּמַּכְשִׁיר</div>}

      <PrototypeSwitcher variants={['A', 'B', 'C']} labels={{ A: PRESETS.A.label, B: PRESETS.B.label, C: PRESETS.C.label }} />
    </div>
  )
}

function Clue({ round }: { round: Round }) {
  const g = round.target.group
  if (round.type === 'A')
    return (
      // picture word on the monster's sign; tap it to hear the monster say the word
      <button className="nd-clue nd-clue-sign" onClick={() => g !== 'silent' && void say(`mon-word-${round.word.key}`, round.word.he, 'monster', MONSTER_RATE[round.monster] ?? 1)}>
        <img className="nd-word-pic" src={WORD_PICTURE[round.word.key]} alt="" draggable={false} />
      </button>
    )
  if (round.type === 'D')
    return (
      <div className="nd-clue nd-clue-shield">
        <RuneGlyph mark={round.target} box size={54} />
      </div>
    )
  if (round.type === 'B' && g === 'silent') return <div className="nd-clue"><Icon name="speakerOff" size={34} /><Icon name="puff" size={34} /></div>
  return (
    <button className="nd-clue nd-clue-audio" onClick={() => playPrompt(round)}>
      <Icon name={round.type === 'B' ? 'speaker' : 'talk'} size={34} />
      <motion.span animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8 }}>
        )))
      </motion.span>
    </button>
  )
}

function Pad({ round, outcome, onChoose, oneRow, twinKey }: { round: Round; outcome: Outcome | null; onChoose: (c: Choice) => void; oneRow: boolean; twinKey: string | null }) {
  const choices: Choice[] = round.type === 'D' ? round.padWords.map((w) => ({ kind: 'sound', group: w.group })) : round.runes.map((mark) => ({ kind: 'rune', mark }))
  const wordFor = (g: string) => round.padWords.find((w) => w.group === g)!
  const cols = oneRow ? choices.length : choices.length === 4 ? 2 : 3
  return (
    <div className="nd-pad" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
      {choices.map((c) => {
        const k = keyOf(c)
        const right = isCorrect(round, c)
        let state = !outcome && k === twinKey ? 'almost' : ''
        if (outcome) {
          if (k === outcome.choiceKey) state = outcome.kind === 'hit' ? 'hit' : 'miss'
          else if (outcome.kind === 'miss' && right) state = 'reveal'
        }
        return (
          <motion.button
            key={`${round.id}-${k}`}
            className={`nd-rune ${state}`}
            data-correct={right ? '1' : '0'}
            disabled={Boolean(outcome)}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={state === 'miss' ? { x: [0, -8, 8, -5, 5, 0], scale: 1, opacity: 1 } : { scale: state === 'hit' ? 1.12 : 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => onChoose(c)}
          >
            {c.kind === 'rune' ? <RuneGlyph mark={c.mark} size={60} /> : <img className="nd-word-pic nd-word-btn" src={WORD_PICTURE[wordFor(c.group).key]} alt="" draggable={false} />}
          </motion.button>
        )
      })}
    </div>
  )
}

function ResolveBanner({ mark, word, kind }: { mark: Mark; word: PictureWord; kind: 'hit' | 'miss' }) {
  return (
    <motion.div
      className={`nd-resolve ${kind}`}
      style={{ x: '-50%' }}
      initial={{ y: -30, opacity: 0, scale: 0.7 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ delay: kind === 'hit' ? 0.35 : 0.2, type: 'spring' }}
    >
      {/* picture + letter only; the wizard says the name */}
      <RuneGlyph mark={mark} size={58} />
      <img className="nd-word-pic nd-word-banner" src={WORD_PICTURE[word.key]} alt="" draggable={false} />
    </motion.div>
  )
}

// particles: plain coloured squares plus drawn sparkles (no emoji)
const COLORS = ['#ffd34d', '#ff7ae0', '#8fd8ff', '#b48cff', '#ffffff', '#ff9a3c']

function Explosion({ round, outcome, juice, geo }: { round: Round; outcome: Outcome; juice: Juice; geo: Geo }) {
  const delay = 0.26 + juice.hitstopMs / 1000
  const big = outcome.final
  const scale = (big ? 1 : 0.45) * (outcome.mega ? 1.4 : 1)
  const parts = useMemo(() => {
    const n = Math.round(juice.particles * scale)
    return Array.from({ length: n }, (_, i) => {
      const a = Math.random() * Math.PI * 2
      const d = (70 + Math.random() * 160) * scale
      return {
        i,
        dx: Math.cos(a) * d,
        dy: Math.sin(a) * d - 40 * scale,
        rot: Math.random() * 720 - 360,
        sparkle: Math.random() < 0.35,
        color: COLORS[i % COLORS.length],
        size: 6 + Math.random() * 10,
      }
    })
  }, [juice.particles, scale])

  return (
    <>
      {outcome.mega ? (
        <motion.svg
          className="nd-lightning"
          style={{ left: `${outcome.x}%` }}
          viewBox="0 0 60 300"
          initial={{ opacity: 0 }}
          animate={{ opacity: [0, 1, 0.3, 1, 0] }}
          transition={{ duration: 0.6 }}
        >
          <polyline points="30,0 18,70 40,110 14,180 38,215 26,300" fill="none" stroke="#fff" strokeWidth="6" />
          <polyline points="30,0 18,70 40,110 14,180 38,215 26,300" fill="none" stroke="#b48cff" strokeWidth="14" opacity="0.5" />
        </motion.svg>
      ) : (
        <motion.div
          className="nd-fireball"
          initial={{ left: `${geo.wizLeft}%`, bottom: `${geo.wizBottom}%`, scale: 0.5, opacity: 1 }}
          animate={{ left: `${outcome.x}%`, bottom: '20%', scale: 1.2, opacity: [1, 1, 0] }}
          transition={{ duration: 0.26, ease: 'easeIn', opacity: { times: [0, 0.9, 1], duration: 0.3 } }}
        />
      )}
      {outcome.mega && <motion.div className="nd-whiteout" initial={{ opacity: 0.9 }} animate={{ opacity: 0 }} transition={{ duration: 0.5 }} />}
      <div className="nd-blast" style={{ left: `${outcome.x}%` }}>
        <motion.div className="nd-flash" initial={{ scale: 0, opacity: 1 }} animate={{ scale: juice.flash * scale, opacity: 0 }} transition={{ delay, duration: 0.55 }} />
        <motion.div className="nd-ring" initial={{ scale: 0, opacity: 1 }} animate={{ scale: juice.flash * 1.7 * scale, opacity: 0 }} transition={{ delay, duration: 0.7 }} />
        {parts.map((p) => (
          <motion.span
            key={p.i}
            className="nd-particle"
            style={p.sparkle ? undefined : { width: p.size, height: p.size, background: p.color, boxShadow: `0 0 10px ${p.color}` }}
            initial={{ x: 0, y: 0, opacity: 0, rotate: 0 }}
            animate={{ x: p.dx, y: p.dy, opacity: [0, 1, 1, 0], rotate: p.rot }}
            transition={{ delay, duration: 0.9, ease: 'easeOut' }}
          >
            {p.sparkle && <Icon name="sparkle" size={p.size * 2.2} />}
          </motion.span>
        ))}
        {big ? (
          <motion.span
            className="nd-monster-chunk"
            initial={{ y: 0, rotate: 0, opacity: 1 }}
            animate={{ y: -140, x: 60, rotate: 540, opacity: 0, scale: 0.3 }}
            transition={{ delay, duration: 0.8 }}
          >
            <img className="nd-sprite" src={MONSTER_SPRITES[round.monster]} style={FLIP.has(round.monster) ? { transform: 'scaleX(-1)' } : undefined} alt="" draggable={false} />
          </motion.span>
        ) : (
          <motion.span className="nd-monster-chunk" initial={{ x: 0 }} animate={{ x: [0, 40, 30] }} transition={{ delay, duration: 0.4 }}>
            <img className="nd-sprite" src={MONSTER_SPRITES[round.monster]} style={FLIP.has(round.monster) ? { transform: 'scaleX(-1)' } : undefined} alt="" draggable={false} />
          </motion.span>
        )}
        <motion.span className="nd-plus" initial={{ y: 0, opacity: 0 }} animate={{ y: -90, opacity: [0, 1, 0] }} transition={{ delay: delay + 0.1, duration: 1 }}>
          {outcome.mega ? <Icon name="bolt" size={24} /> : null}+{outcome.points}
        </motion.span>
      </div>
    </>
  )
}

const TYPE_NAMES: Record<string, string> = { A: 'A · picture sign', B: 'B · sound', C: 'C · spoken name', D: 'D · rune on shield → picture' }

function pct(t: { seen: number; correct: number }) {
  return t.seen ? `${Math.round((100 * t.correct) / t.seen)}%` : '—'
}

function ParentStats({ onClose }: { onClose: () => void }) {
  const [s, setS] = useState(loadStats)
  const minutes = Math.round(s.roundsMs / 60000)
  const rows = MARKS.map((m) => ({ m, t: s.byMark[m.id] })).sort((a, b) => (b.t?.wrong ?? 0) + (b.t?.timeout ?? 0) - ((a.t?.wrong ?? 0) + (a.t?.timeout ?? 0)))
  return (
    <div className="nd-overlay nd-stats-panel" dir="ltr">
      <div className="nd-stats-head">
        <b>Parent stats</b>
        <span>
          {s.sessions} sessions · ~{minutes} min playing · best score {s.bestScore.toLocaleString()} · best wave {s.bestWave}
          {s.lastPlayed ? ` · last ${new Date(s.lastPlayed).toLocaleString()}` : ''}
        </span>
      </div>
      <table>
        <thead>
          <tr><th>Mark</th><th>Seen</th><th>Correct</th><th>Wrong tap</th><th>Too slow</th><th>Twin (forgiven)</th><th>MEGA</th></tr>
        </thead>
        <tbody>
          {rows.map(({ m, t }) => (
            <tr key={m.id}>
              <td className="nd-stats-mark"><RuneGlyph mark={m} size={30} /> <span dir="rtl">{m.name}</span></td>
              <td>{t?.seen ?? 0}</td><td>{t ? pct(t) : '—'}</td><td>{t?.wrong ?? 0}</td><td>{t?.timeout ?? 0}</td><td>{t?.twin ?? 0}</td><td>{t?.mega ?? 0}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <table>
        <thead>
          <tr><th>Screen</th><th>Seen</th><th>Correct</th><th>Wrong tap</th><th>Too slow</th><th>Twin (forgiven)</th><th>MEGA</th></tr>
        </thead>
        <tbody>
          {['A', 'B', 'C', 'D'].map((k) => {
            const t = s.byType[k]
            return (
              <tr key={k}>
                <td>{TYPE_NAMES[k]}</td><td>{t?.seen ?? 0}</td><td>{t ? pct(t) : '—'}</td><td>{t?.wrong ?? 0}</td><td>{t?.timeout ?? 0}</td><td>{t?.twin ?? 0}</td><td>{t?.mega ?? 0}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      <div className="nd-stats-actions">
        <button onClick={onClose}>Close</button>
        <button
          onClick={() => {
            if (window.confirm('Reset all stats?')) {
              resetStats()
              setS(loadStats())
            }
          }}
        >
          Reset
        </button>
      </div>
    </div>
  )
}
