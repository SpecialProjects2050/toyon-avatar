/**
 * Voice sources. Both expose the same shape:
 *   level(): 0..1  — RMS with a noise floor and slow-decay auto-gain
 *   onset(): 0..1  — rising-slope transient, for punchy syllables
 *
 * `createSimulatedVoice` speaks phrases of ~3.6 Hz syllables so `speaking` demos without a mic.
 * `createLevelSource` wraps a level the host app already has (its own mic metering, a TTS
 * envelope) — call setLevel() as often as you can, 30 Hz or better.
 * (The web mic — getUserMedia + AnalyserNode — lives in mic.ts.) No DOM here.
 */

export type VoiceSource = {
  readonly kind: 'mic' | 'simulated'
  level(): number
  onset(): number
  dispose(): void
}

const now = () => performance.now() / 1000
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

/** Rising-slope detector shared by both sources. */
export function createOnsetTracker() {
  let slow = 0
  let env = 0
  return (level: number, dt: number) => {
    const slope = dt > 0 ? (level - slow) / dt : 0
    slow = lerp(slow, level, 1 - Math.exp(-dt * 14))
    env = Math.max(env * Math.exp(-dt * 12), clamp01(slope * 0.12))
    return env
  }
}

function mulberry32(seed: number) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export type SimulatedVoiceOptions = {
  /** Syllable rate, Hz. */
  syllableHz?: number
  /** If set, the level is held constant at this value (for screenshots). */
  hold?: number
  seed?: number
}

export function createSimulatedVoice(opts: SimulatedVoiceOptions = {}): VoiceSource {
  const hz = opts.syllableHz ?? 3.6
  const rand = mulberry32(opts.seed ?? 7)
  const onsetOf = createOnsetTracker()

  // Phrase schedule: [start, end, amplitude] segments alternating talk / pause.
  let phraseStart = now()
  let phraseEnd = phraseStart + 1.8
  let talking = true
  let amp = 0.9
  let syllable = -1
  let sylAmp = 1

  let lastT = now()
  let lvl = 0
  let ons = 0

  function update() {
    const t = now()
    const dt = Math.min(t - lastT, 0.1)
    if (dt < 0.003) return
    lastT = t

    if (t >= phraseEnd) {
      talking = !talking
      phraseStart = t
      phraseEnd = t + (talking ? 1.2 + rand() * 2.2 : 0.5 + rand() * 1.0)
      amp = 0.7 + rand() * 0.3
    }

    let raw = 0
    if (talking) {
      const s = (t - phraseStart) * hz
      const idx = Math.floor(s)
      if (idx !== syllable) {
        syllable = idx
        sylAmp = 0.45 + rand() * 0.55
      }
      const ph = s - idx
      // Fast attack, slower release, per syllable.
      const env = ph < 0.18 ? ph / 0.18 : Math.pow(1 - (ph - 0.18) / 0.82, 1.4)
      const phraseEnv = Math.min(1, (t - phraseStart) / 0.12, (phraseEnd - t) / 0.25)
      raw = clamp01(env * sylAmp * amp * phraseEnv)
    }
    if (opts.hold !== undefined) raw = clamp01(opts.hold)

    lvl = raw
    ons = onsetOf(raw, dt)
  }

  return {
    kind: 'simulated',
    level: () => (update(), lvl),
    onset: () => (update(), ons),
    dispose() {},
  }
}

/**
 * A level the host app pushes in (0..1). Between pushes the last value holds; the onset
 * transient is derived here, so the O gets its syllable punch from any metering source.
 */
export function createLevelSource(): VoiceSource & { setLevel(level: number): void } {
  const onsetOf = createOnsetTracker()
  let lvl = 0
  let ons = 0
  let lastT = now()
  return {
    kind: 'simulated',
    setLevel(level) {
      const t = now()
      const dt = Math.min(Math.max(t - lastT, 0.001), 0.1)
      lastT = t
      lvl = clamp01(level)
      ons = onsetOf(lvl, dt)
    },
    level: () => lvl,
    onset: () => ons,
    dispose() {},
  }
}
