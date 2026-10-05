// PROTOTYPE — synthesized sound effects (Web Audio) + Hebrew speech via speechSynthesis.
// Final game will use pre-rendered ElevenLabs audio; this is only for feel-testing.

let ctx: AudioContext | null = null

export function unlockAudio() {
  if (!ctx) ctx = new AudioContext()
  if (ctx.state === 'suspended') void ctx.resume()
}

function ac() {
  if (!ctx) ctx = new AudioContext()
  return ctx
}

function noise(seconds: number) {
  const a = ac()
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate)
  const d = buf.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  const src = a.createBufferSource()
  src.buffer = buf
  return src
}

function env(gain: GainNode, peak: number, attack: number, decay: number) {
  const t = ac().currentTime
  gain.gain.setValueAtTime(0.0001, t)
  gain.gain.exponentialRampToValueAtTime(peak, t + attack)
  gain.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
}

export function sfxCast() {
  const a = ac()
  const src = noise(0.4)
  const bp = a.createBiquadFilter()
  bp.type = 'bandpass'
  bp.Q.value = 3
  bp.frequency.setValueAtTime(500, a.currentTime)
  bp.frequency.exponentialRampToValueAtTime(3000, a.currentTime + 0.3)
  const g = a.createGain()
  env(g, 0.5, 0.03, 0.35)
  src.connect(bp).connect(g).connect(a.destination)
  src.start()
}

export function sfxBoom(power = 1) {
  const a = ac()
  const t = a.currentTime
  const src = noise(1.4)
  const lp = a.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.setValueAtTime(2400, t)
  lp.frequency.exponentialRampToValueAtTime(80, t + 0.9 * power)
  const g = a.createGain()
  env(g, Math.min(1, 0.7 * power), 0.005, 0.9 * power)
  src.connect(lp).connect(g).connect(a.destination)
  src.start()
  // sub thump
  const o = a.createOscillator()
  o.type = 'sine'
  o.frequency.setValueAtTime(140, t)
  o.frequency.exponentialRampToValueAtTime(35, t + 0.5)
  const og = a.createGain()
  env(og, 0.9, 0.005, 0.55)
  o.connect(og).connect(a.destination)
  o.start()
  o.stop(t + 0.7)
}

export function sfxSparkle() {
  const a = ac()
  ;[1047, 1319, 1568, 2093].forEach((f, i) => {
    const o = a.createOscillator()
    o.type = 'triangle'
    o.frequency.value = f
    const g = a.createGain()
    const t = a.currentTime + 0.25 + i * 0.06
    g.gain.setValueAtTime(0.0001, t)
    g.gain.exponentialRampToValueAtTime(0.18, t + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25)
    o.connect(g).connect(a.destination)
    o.start(t)
    o.stop(t + 0.3)
  })
}

export function sfxOuch() {
  const a = ac()
  const t = a.currentTime
  const o = a.createOscillator()
  o.type = 'square'
  o.frequency.setValueAtTime(260, t)
  o.frequency.exponentialRampToValueAtTime(90, t + 0.35)
  const g = a.createGain()
  env(g, 0.18, 0.01, 0.35)
  o.connect(g).connect(a.destination)
  o.start()
  o.stop(t + 0.4)
}

export function sfxZap() {
  const a = ac()
  const t = a.currentTime
  const src = noise(0.8)
  const hp = a.createBiquadFilter()
  hp.type = 'highpass'
  hp.frequency.value = 1500
  const g = a.createGain()
  g.gain.setValueAtTime(0.0001, t)
  for (let i = 0; i < 6; i++) {
    g.gain.exponentialRampToValueAtTime(0.6, t + i * 0.09 + 0.01)
    g.gain.exponentialRampToValueAtTime(0.02, t + i * 0.09 + 0.07)
  }
  src.connect(hp).connect(g).connect(a.destination)
  src.start()
}

let heVoice: SpeechSynthesisVoice | null | undefined

function hebrewVoice() {
  if (heVoice !== undefined && heVoice !== null) return heVoice
  const voices = window.speechSynthesis?.getVoices() ?? []
  heVoice = voices.find((v) => v.lang.toLowerCase().startsWith('he')) ?? null
  return heVoice
}

export function hasHebrewVoice() {
  return Boolean(hebrewVoice())
}

export type Speaker = 'wizard' | 'monster'

// Two "voices" faked by pitch until the ElevenLabs voices land: wizard high, monster deep.
// Resolves when speech ends (or after a length-based timeout — Android doesn't always fire onend).
export function speak(text: string, who: Speaker = 'wizard'): Promise<void> {
  if (!text.trim() || !window.speechSynthesis) return Promise.resolve()
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = 'he-IL'
  const v = hebrewVoice()
  if (v) u.voice = v
  u.rate = who === 'monster' ? 0.75 : 0.9
  u.pitch = who === 'monster' ? 0.45 : 1.3
  return new Promise((resolve) => {
    const t = window.setTimeout(resolve, 900 + text.length * 260)
    u.onend = () => {
      clearTimeout(t)
      resolve()
    }
    window.speechSynthesis.speak(u)
  })
}

/** "A new monster is here" — heavy stomp + growl; the only sound that means "new question". */
export function sfxStomp() {
  const a = ac()
  const t = a.currentTime
  ;[0, 0.22].forEach((dt) => {
    const o = a.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(110, t + dt)
    o.frequency.exponentialRampToValueAtTime(40, t + dt + 0.18)
    const g = a.createGain()
    g.gain.setValueAtTime(0.0001, t + dt)
    g.gain.exponentialRampToValueAtTime(0.9, t + dt + 0.01)
    g.gain.exponentialRampToValueAtTime(0.0001, t + dt + 0.25)
    o.connect(g).connect(a.destination)
    o.start(t + dt)
    o.stop(t + dt + 0.3)
  })
  const growl = a.createOscillator()
  growl.type = 'sawtooth'
  growl.frequency.setValueAtTime(75, t + 0.3)
  growl.frequency.linearRampToValueAtTime(55, t + 0.75)
  const lfo = a.createOscillator()
  lfo.frequency.value = 22
  const lfoGain = a.createGain()
  lfoGain.gain.value = 12
  lfo.connect(lfoGain).connect(growl.frequency)
  const lp = a.createBiquadFilter()
  lp.type = 'lowpass'
  lp.frequency.value = 500
  const gg = a.createGain()
  gg.gain.setValueAtTime(0.0001, t + 0.3)
  gg.gain.exponentialRampToValueAtTime(0.25, t + 0.38)
  gg.gain.exponentialRampToValueAtTime(0.0001, t + 0.8)
  growl.connect(lp).connect(gg).connect(a.destination)
  growl.start(t + 0.3)
  lfo.start(t + 0.3)
  growl.stop(t + 0.85)
  lfo.stop(t + 0.85)
}
