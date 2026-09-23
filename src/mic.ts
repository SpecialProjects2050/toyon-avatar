/**
 * The microphone for the web demo: getUserMedia + AnalyserNode → a VoiceSource (level / onset).
 * Web only — in the app, meter the mic with your audio stack and push `voiceLevel` (or wrap it in
 * `createLevelSource`). Same metering as the lab's mic: a noise floor that creeps, slow auto-gain.
 */
import { createOnsetTracker, type VoiceSource } from './core/source'

const now = () => performance.now() / 1000
const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v)
const lerp = (a: number, b: number, t: number) => a + (b - a) * t

export async function createMic(): Promise<VoiceSource> {
  const stream = await navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: false },
  })
  const ctx = new AudioContext()
  await ctx.resume()
  const source = ctx.createMediaStreamSource(stream)
  const analyser = ctx.createAnalyser()
  analyser.fftSize = 1024
  analyser.smoothingTimeConstant = 0
  source.connect(analyser)
  const buf = new Float32Array(analyser.fftSize)

  let floor = 0.005
  let peak = 0.03
  let lvl = 0
  let ons = 0
  let lastT = now()
  const onsetOf = createOnsetTracker()

  function update() {
    const t = now()
    const dt = Math.min(t - lastT, 0.1)
    if (dt < 0.003) return
    lastT = t
    analyser.getFloatTimeDomainData(buf)
    let sum = 0
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i]
    const rms = Math.sqrt(sum / buf.length)
    // noise floor: follows quickly downward, creeps upward
    floor = rms < floor ? lerp(floor, rms, 1 - Math.exp(-dt * 3)) : lerp(floor, rms, 1 - Math.exp(-dt * 0.04))
    const sig = Math.max(0, rms - floor * 1.8)
    // auto-gain: the peak jumps up at once, decays slowly, never below a floor
    peak = Math.max(sig, lerp(peak, sig, 1 - Math.exp(-dt * 0.2)), 0.012)
    const raw = clamp01(sig / peak)
    lvl = lerp(lvl, raw, 1 - Math.exp(-dt * 40))
    ons = onsetOf(raw, dt)
  }

  return {
    kind: 'mic',
    level: () => (update(), lvl),
    onset: () => (update(), ons),
    dispose() {
      source.disconnect()
      stream.getTracks().forEach((tr) => tr.stop())
      void ctx.close()
    },
  }
}
