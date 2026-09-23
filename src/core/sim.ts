/**
 * The Toyon O's motion: state + voice level + time → a frame of numbers. No DOM, no GL.
 *  - each state is a LOOP (breath, drift, voice weights, and which form: cut / listen / build /
 *    break / think), crossfaded over P.fade with an IN kick that settles as x·e^(1−x);
 *  - every form change rides its own spring: the hole → cut morph, the squash, the listening
 *    turn and cross, the compiling split and stacking, thinking's bloom and spin;
 *  - `step(now)` integrates and returns the Frame the renderer draws.
 * The numbers live in params.ts. Extracted from the lab's sim (flat look only).
 */

import { P } from './params'
import type { AgentState } from './machine'

export type LoopParams = {
  /** Breath amplitude (fraction) and period (seconds) — the voice pulse the avatar breathes with. */
  breathDepth: number
  breathPeriod: number
  /** Drift rate: quickens the cut's sway. */
  driftSpeed: number
  /** How much the voice level drives the pulse (speaking) and the energy (listening). */
  voiceScale: number
  voiceGlow: number
  /** 0 = the O (centre hole), 1 = the cut. */
  cut: number
  /** 1 = listening (the crossed cut). */
  listen: number
  /** 1 = compiling (the cut splits into stacking cuts). */
  build: number
  /** 1 = thinking (the disc breaks into the wedges). */
  break: number
  /** 1 = thinking (deeper sway). */
  think: number
}

export const LOOPS: Record<AgentState, LoopParams> = {
  idle: { breathDepth: 0.014, breathPeriod: 4.2, driftSpeed: 0.08, voiceScale: 0, voiceGlow: 0, cut: 0, listen: 0, build: 0, break: 0, think: 0 },
  listening: { breathDepth: 0.022, breathPeriod: 2.6, driftSpeed: 0.2, voiceScale: 0, voiceGlow: 1, cut: 1, listen: 1, build: 0, break: 0, think: 0 },
  thinking: { breathDepth: 0.018, breathPeriod: 1.7, driftSpeed: 1.25, voiceScale: 0, voiceGlow: 1, cut: 1, listen: 0, build: 0, break: 1, think: 1 },
  // compiling: thinking's loop; no turning — the cut splits into several and the segments stack
  compiling: { breathDepth: 0.018, breathPeriod: 1.7, driftSpeed: 1.25, voiceScale: 0, voiceGlow: 0, cut: 1, listen: 0, build: 1, break: 0, think: 0 },
  // speaking carries thinking's movement (drift, breath, flow): the two states the icon really
  // has are idle and speaking, and thinking's motion felt best. Voice weights stay speaking's.
  speaking: { breathDepth: 0.018, breathPeriod: 1.7, driftSpeed: 1.25, voiceScale: 1, voiceGlow: 0.35, cut: 1, listen: 0, build: 0, break: 0, think: 0 },
  // speaking with a chef avatar on the O: the same loop as speaking
  chef: { breathDepth: 0.018, breathPeriod: 1.7, driftSpeed: 1.25, voiceScale: 1, voiceGlow: 0.35, cut: 1, listen: 0, build: 0, break: 0, think: 0 },
}

export type Frame = {
  /** Seconds. */
  time: number
  /** Breath + voice spring + onset + kick, as a scale delta: the avatar breathes with it. */
  pulse: number
  /** The voice per syllable: the spring on the raw level plus the onset, 0 where the loop has no
   * voice (speaking / chef only). The cut opens a touch on each syllable with it. */
  speech: number
  /** Smoothed voice energy 0..1: quick attack, slow release. */
  energy: number
  /** The sway clock (the cut's bend phase), integrated; quickens with voice and in thinking. */
  sway: number
  /** Hole → cut morph on its own spring (may overshoot past 1), and its velocity. */
  cut: number
  cutVel: number
  /** 1 on a path to / from thinking or listening: the line eases out instead of shooting. */
  calm: number
  /** Squash and stretch of the disc (+ = stretched along the cut), its own spring. */
  squash: number
  /** The morph's turn (rad), relative to the cut's rest pose: 0 with the cut out, −spin as it shrinks. */
  morphSpin: number
  /** The listening turn (rad): fresh from the cut's angle on every change into or out of listening. */
  listenTurn: number
  /** The crossed cut's second cut, 0..1 (may overshoot a little). */
  listenCross: number
  /** Compiling: 0 = one cut, 1 = the cuts apart; and the pattern's offset in slots (the stacking). */
  build: number
  buildShift: number
  /** Thinking: 0 = the disc, 1 = the wedges. */
  brk: number
  /** Thinking: the wedges' turn (rad) — the steady spin plus the way-in burst. */
  lobeSpin: number
  /** The blended thinking amount (deeper sway). */
  think: number
}

export type Sim = {
  state(): AgentState
  setState(state: AgentState, now: number): void
  /** Raw mic level 0..1 and onset transient 0..1 for the upcoming step. */
  setVoice(level: number, onset: number): void
  step(now: number): Frame
  /** The most recent frame from step(), for chrome that follows the O (null before the first). */
  frame(): Frame | null
}

/** The compiling stack counts as merged back into one cut below this: the listening turn waits
 * for it, so the stack never swings round as a rake of lines. */
const STACK_MERGED = 0.15

/** Voice spring: hz ≈ 6, zeta ≈ 0.4. */
const SPRING_HZ = 6
const SPRING_ZETA = 0.4
const SUBSTEP = 1 / 240
const TAU = Math.PI * 2
const DEG = Math.PI / 180

const PARAM_KEYS = Object.keys(LOOPS.idle) as (keyof LoopParams)[]

function lerpParams(a: LoopParams, b: LoopParams, e: number): LoopParams {
  const out = {} as LoopParams
  for (const k of PARAM_KEYS) out[k] = a[k] + (b[k] - a[k]) * e
  return out
}

function easeInOut(x: number): number {
  x = x < 0 ? 0 : x > 1 ? 1 : x
  return x * x * (3 - 2 * x)
}

/** Impulse curve: 0 at 0, peaks at 1 with value 1, decays to ~0 by ~5. */
function impulse(x: number): number {
  return x <= 0 ? 0 : x * Math.exp(1 - x)
}

/** The cross's amount that gives its line the same length as the main cut's at morph amount m
 * (the shader's two formation curves differ: the cut's line starts at 0.35 and grows on the
 * shoot curve, the cross's grows on a smoothstep to 1.25 R) — so both grow / shrink as one. */
function crossFromCut(m: number, shoot: number): number {
  m = Math.min(Math.max(m, 0), 1)
  const g = Math.min(Math.max((m - 0.35) / 0.65, 0), 1)
  const cutLen = (1.3 + 0.9 * shoot) * (g * g * (3 - 2 * g) * (1 - shoot) + g * (2 - g) * shoot)
  if (cutLen <= 0) return Math.min(Math.max((m - 0.12) / 0.3, 0), 1) * 0.15 // the dot, inside the shrinking hole
  const grow = Math.min(cutLen / 1.25, 1)
  const x = 0.5 - Math.sin(Math.asin(1 - 2 * grow) / 3) // inverse smoothstep
  return 0.15 + 0.85 * x
}

export function createSim(initial: AgentState = 'idle', now = 0): Sim {
  let current = initial
  let previous = initial
  let fromParams: LoopParams = { ...LOOPS[initial] }
  let toParams: LoopParams = LOOPS[initial]
  let blended: LoopParams = { ...LOOPS[initial] }
  let fadeStart = -1e9
  let kickStart = -1e9
  let last = now

  // Integrated quantities.
  let breathPhase = 0
  let energy = 0
  let cutX = LOOPS[initial].cut * (1 - LOOPS[initial].break)
  let cutV = 0
  let cutGoal = 0                    // the cut's current target (0 = no cut wanted)
  let calm = 0                       // 1 on a path to / from thinking or listening
  let sqX = 0
  let sqV = 0
  let crossX = LOOPS[initial].listen // the crossed cut's second cut, on its own spring
  let crossV = 0
  // the listening turn: fresh from where the cut is on every change into or out of listening,
  // landing on the nearest pose that works (a plus for listening, flat for the single cut)
  let turnTarget = 0
  let turnX = 0
  let turnV = 0
  let turnPending = false
  let turnKind: 'fromO' | 'enterCut' | 'leaveCut' | 'fromThinking' = 'fromO'
  let brkX = LOOPS[initial].break    // the wedges, 0..1
  // the break runs on a phase that always rises 0 → 1 on a fresh spring, in either direction:
  // entering, break = phase; leaving, break = 1 − phase — so the exit mirrors the entry's pace
  let brkGoal = LOOPS[initial].break > 0 ? 1 : 0
  let brkPhase = 1
  let brkPhaseV = 0
  let morphSpinX = 0
  let lobeSpin = 0                   // the wedges' turn
  let lobeBoostV = 0                 // the way in / out: a burst of spin rate easing into the steady spin
  let buildX = LOOPS[initial].build  // compiling amount, on its own spring
  let buildV = 0
  let shiftTarget = 0                // compiling: the stacking target (slots) the shift spring follows
  let shiftX = 0
  let shiftV = 0
  let shiftClock = -1                // time since the last stack step (-1 = not compiling)
  let sway = 0
  // Voice.
  let level = 0
  let onset = 0
  let springX = 0
  let springV = 0
  let onsetEnv = 0
  let lastFrame: Frame | null = null
  let firstStep = true // the first step settles the springs on the state's targets (no morph on creation)

  return {
    state: () => current,
    frame: () => lastFrame,

    setState(state, at) {
      if (state === current) return
      previous = current
      current = state
      // the listening turn — except to / from thinking, which is one move with no turn
      if ((state === 'listening') !== (previous === 'listening') && state !== 'thinking' && previous !== 'thinking') {
        turnPending = true
        turnKind = LOOPS[state === 'listening' ? previous : state].cut === 0 ? 'fromO' : state === 'listening' ? 'enterCut' : 'leaveCut'
      } else if (state === 'listening' && previous === 'thinking') { turnPending = true; turnKind = 'fromThinking' } // an unseen move onto the plus grid
      fromParams = { ...blended } // snapshot mid-fade so a fast re-trigger never jumps
      toParams = LOOPS[state]
      fadeStart = at
      kickStart = at
    },

    setVoice(l, o) {
      level = l
      onset = o
    },

    step(now) {
      const dt = Math.min(Math.max(now - last, 0), 0.1)
      last = now

      // Crossfade of LOOP parameters.
      const blend = easeInOut(P.fade <= 0 ? 1 : (now - fadeStart) / P.fade)
      blended = lerpParams(fromParams, toParams, blend)
      const p = blended

      // IN kick, settling with x·e^(1−x).
      const kx = (now - kickStart) / Math.max(P.kickDur * 0.2, 1e-3)
      const k = impulse(kx) * P.kick

      // Integrate rates.
      breathPhase += (dt * TAU) / Math.max(p.breathPeriod, 0.05)
      const drift = p.driftSpeed * P.bloomDrift
      // smoothed energy: the voice where the loop wants it, fast attack, slow release
      const voiceIn = Math.min(1, level * Math.max(p.voiceScale, 0.6 * p.voiceGlow))
      const tau = voiceIn > energy ? 0.07 : 0.5
      energy += (voiceIn - energy) * (1 - Math.exp(-dt / tau))
      // flat morph: a damped spring chasing the state's target (leaves quickly, lands softly),
      // on its own timeline rather than the loop crossfade
      {
        // to / from thinking or listening the morph may run at its own pace (× flatMorphCalm),
        // and the line eases out instead of shooting
        const calmPath = current === 'thinking' || current === 'listening' || previous === 'thinking' || previous === 'listening'
        calm = calmPath ? 1 : 0
        const wm = TAU * Math.max(P.flatMorphHz * (calmPath ? P.flatMorphCalm : 1), 0.05)
        const zm = P.flatMorphZeta
        // leaving compiling, the stacks merge back into the one cut before it retracts
        const stacksUp = buildX > 0.1 && LOOPS[current].build === 0
        // a breaking state holds its cut at 0 (the wedges replace it); leaving it, the cut grows
        // while the wedges fold — one move
        const target = stacksUp ? 1 : LOOPS[current].cut * (1 - LOOPS[current].break)
        cutGoal = target
        if (firstStep) { cutX = target; cutV = 0; morphSpinX = (target - 1) * P.flatMorphSpin * TAU; crossX = LOOPS[current].listen }
        let rem = dt
        while (rem > 0) {
          const h = Math.min(SUBSTEP, rem)
          const acc = wm * wm * (target - cutX) - 2 * zm * wm * cutV
          cutV += acc * h
          cutX += cutV * h
          rem -= h
        }
      }
      // the listening turn (crossed cut): every turn is fresh from where the cut is now (an
      // unfinished turn is not carried over). Listening rests as a plus (0° mod 90°, the cross
      // being four-fold), the single cut flat (0° mod 180°): to / from a cut state the turn is
      // `flatListenTurn` (quarter steps, the same way round both ways); to / from the O nothing
      // shows at one end, so that turn is `flatListenTurnO`, its start unseen. The 45° twist on
      // the way from the O or thinking comes from the cut's morph spin as it grows.
      {
        // leaving compiling, the turn waits until the stack has merged back into the one cut
        if (turnPending && buildX < STACK_MERGED) {
          const Q = Math.PI / 2
          const crossGrid = (a: number) => Math.round(a / Q) * Q
          const cutGrid = (a: number) => Math.round(a / Math.PI) * Math.PI
          const A = P.flatListenTurnO * TAU, T = P.flatListenTurn * TAU
          if (turnKind === 'fromThinking') { turnTarget = crossGrid(turnX); turnX = turnTarget; turnV = 0 } // no cut shows in thinking: unseen
          else if (LOOPS[current].listen > 0) {
            if (turnKind === 'fromO') { turnTarget = crossGrid(turnX + A); turnX = turnTarget - A; turnV = 0 }
            else turnTarget = crossGrid(turnX + T)
          } else {
            if (turnKind === 'fromO') turnTarget = turnX - A // settles unseen once nothing shows
            else turnTarget = cutGrid(turnX + T - 0.01) // on round the same way; on a tie (already flat) the shorter way
          }
          turnPending = false
        }
        // with no cut showing and not listening, settle on a whole half turn at once (unseen), so
        // the next cut lands on its own angle whichever route the O took
        if (cutX < 0.02 && cutGoal < 0.02 && LOOPS[current].listen === 0) {
          const snapped = Math.round(turnTarget / Math.PI) * Math.PI
          const delta = snapped - turnX
          if (Math.abs(delta) > 1e-6) {
            // the squash stretches the disc along the cut's axis: an odd quarter turns that axis
            // across, so mirror the squash with it and the disc's shape stays put (no pop)
            if (Math.abs(Math.round(delta / (Math.PI / 2))) % 2 === 1) { sqX = -sqX; sqV = -sqV }
            turnTarget = snapped; turnX = snapped; turnV = 0
          }
        }
        const wt = TAU * Math.max(P.flatListenInHz, 0.05)
        const zt = P.flatListenInZeta
        let rem = dt
        while (rem > 0) {
          const h = Math.min(SUBSTEP, rem)
          const acc = wt * wt * (turnTarget - turnX) - 2 * zt * wt * turnV
          turnV += acc * h
          turnX += turnV * h
          rem -= h
        }
        if (turnTarget >= TAU * 4 && turnX >= TAU * 4 - 0.01) { turnTarget -= TAU * 4; turnX -= TAU * 4 }
        if (turnTarget <= -TAU * 4 && turnX <= -TAU * 4 + 0.01) { turnTarget += TAU * 4; turnX += TAU * 4 }
      }
      const turnDone = !turnPending && turnTarget - turnX < 0.15 * Math.PI
      // listening (crossed cut): the second cut, on its own spring — from a cut state it forms
      // once the turn is mostly done; to / from the O or thinking it follows the main cut exactly,
      // so both lines grow out of the dot together and collapse into it together
      {
        // leaving for a cut state the retract is slow, so the shrinking cross sweeps round with
        // the turn; leaving for the O it is quick, and both lines contract together
        const toCutState = LOOPS[current].listen === 0 && LOOPS[current].cut > 0 && LOOPS[current].break === 0
        const wc = TAU * Math.max(toCutState ? P.flatListenCrossOutHz : P.flatListenCrossHz, 0.05)
        const zc = P.flatListenCrossZeta
        const noCutBefore = previous === 'idle' || previous === 'thinking'
        const target = LOOPS[current].listen > 0 && (turnDone || noCutBefore) ? 1 : 0
        const crossFollowsCut = ((current === 'thinking' || current === 'idle') && previous === 'listening') || (current === 'listening' && (previous === 'thinking' || previous === 'idle'))
        if (crossFollowsCut) { crossX = crossFromCut(cutX, P.flatCutShootCalm); crossV = 0 }
        else {
          let rem = dt
          while (rem > 0) {
            const h = Math.min(SUBSTEP, rem)
            const acc = wc * wc * (target - crossX) - 2 * zc * wc * crossV
            crossV += acc * h
            crossX += crossV * h
            rem -= h
          }
        }
      }
      // the morph's turn, relative to the rest pose: 0 with the cut fully out, −spin·τ as it
      // shrinks to the dot — so any amount lands square, and the angle is continuous whichever
      // route the O took. Into / out of thinking the cut turns less (the form then turns itself).
      {
        const spinTurns = current === 'thinking' || previous === 'thinking' ? P.flatThinkMorphSpin : P.flatMorphSpin
        morphSpinX = (Math.min(cutX, 1.2) - 1) * spinTurns * TAU
      }
      // thinking: the disc breaks into the wedges / gathers back on its own spring. Entering, the
      // lines collapse into the dot first and the bloom follows once they are halfway — one move;
      // leaving runs at once (the cut grows while the wedges fold)
      {
        const wb = TAU * Math.max(P.flatLobeHz, 0.05)
        const zb = P.flatLobeZeta
        const wants = LOOPS[current].break > 0 ? 1 : 0
        const hold = wants > 0 && cutX > 0.5
        if (!hold) {
          if (wants !== brkGoal) {
            // turn round: restart the phase from where the break is now, so it stays continuous
            brkGoal = wants
            brkPhase = wants > 0 ? brkX : 1 - brkX
            brkPhaseV = 0
            // the way in / out: a burst of spin rate that rises with the bloom and decays into
            // the steady spin — one continuous turn, like the speaking cut turning as it grows
            const turnStep = () => { lobeBoostV += P.flatLobeStepDeg * DEG / Math.max(0.05, P.flatLobeSpinEase) }
            if (wants > 0 && P.flatLobeEnterTurn >= 0.5) turnStep()
            if (P.flatLobeIdleTurn >= 0.5 && ((wants > 0 && previous === 'idle') || (wants === 0 && current === 'idle'))) turnStep()
          }
          let rem = dt
          while (rem > 0) {
            const h = Math.min(SUBSTEP, rem)
            const acc = wb * wb * (1 - brkPhase) - 2 * zb * wb * brkPhaseV
            brkPhaseV += acc * h
            brkPhase += brkPhaseV * h
            rem -= h
          }
          brkX = brkGoal > 0 ? brkPhase : 1 - brkPhase
        }
        // the spin rides with the form: the burst's rate rises as it blooms, then eases to the steady spin
        const on = Math.min(Math.max(brkX, 0), 1)
        // the voice quickens the spin (thinking listens to the room)
        lobeSpin += dt * (P.flatLobeSpin * TAU * (1 + P.flatLobeVoiceSpin * energy) + lobeBoostV) * on
        lobeBoostV *= Math.exp(-dt / Math.max(0.05, P.flatLobeSpinEase))
        if (lobeSpin > TAU * 8) lobeSpin -= TAU * 8 // keep the number small (it is only ever an angle)
        if (lobeSpin < -TAU * 8) lobeSpin += TAU * 8
      }
      // compiling: the cuts slide apart / back together on their own spring, and the pattern
      // steps one slot per beat — every segment shifts and lands, like pieces stacking
      {
        if (LOOPS[current].build > 0 && buildX > 0.6) {
          if (shiftClock < 0) shiftClock = 0
          shiftClock += dt
          const every = Math.max(0.15, P.flatBuildEvery)
          while (shiftClock >= every) { shiftClock -= every; shiftTarget += P.flatBuildDir }
        } else shiftClock = -1
        {
          const w = TAU * Math.max(P.flatBuildStepHz, 0.05)
          const z = P.flatBuildStepZeta
          let rem = dt
          while (rem > 0) {
            const h = Math.min(SUBSTEP, rem)
            const acc = w * w * (shiftTarget - shiftX) - 2 * z * w * shiftV
            shiftV += acc * h
            shiftX += shiftV * h
            rem -= h
          }
          // keep the numbers small: the pattern repeats every `flatBuildCuts` slots
          const n = Math.max(2, Math.round(P.flatBuildCuts))
          if (Math.abs(shiftTarget) >= n * 4 && Math.abs(shiftX) >= n * 4) { const k = Math.sign(shiftTarget) * n * 4; shiftTarget -= k; shiftX -= k }
        }
        const wb = TAU * Math.max(P.flatBuildHz, 0.05)
        const zb = P.flatBuildZeta
        // the split waits for the cut to be fully open, so the stacks slide out of the one cut
        // rather than the morph handing over to already-spread cuts
        const target = LOOPS[current].build * (cutX > 0.9 ? 1 : 0)
        let rem = dt
        while (rem > 0) {
          const h = Math.min(SUBSTEP, rem)
          const acc = wb * wb * (target - buildX) - 2 * zb * wb * buildV
          buildV += acc * h
          buildX += buildV * h
          rem -= h
        }
      }
      // squash: a second, looser spring chasing a target set by the morph's motion — it stretches
      // while the morph moves and then wobbles back to round on its own; the listening cross and
      // thinking's bloom kick it too
      {
        const ws = TAU * Math.max(P.flatSquashHz, 0.05)
        const zs = P.flatSquashZeta
        const bloomV = brkPhaseV * (brkGoal > 0 ? 1 : -1) * P.flatLobeEnterKick
        const target = (cutV + crossV * P.flatListenKick + bloomV) * 0.04 * P.flatSquash
        let rem = dt
        while (rem > 0) {
          const h = Math.min(SUBSTEP, rem)
          const acc = ws * ws * (target - sqX) - 2 * zs * ws * sqV
          sqV += acc * h
          sqX += sqV * h
          rem -= h
        }
      }
      // the sway clock: state drift, voice energy and thinking quicken the cut's bend, never jumping
      // (listening: the voice drives the sway harder, at the listening gain)
      const swayVoice = energy * (1 + (P.flatListenVoice - 1) * Math.min(Math.max(crossX, 0), 1))
      sway += dt * (P.tenFlowSpeed * (0.4 + 3 * drift) + swayVoice * (P.tenFlowVoice + P.flatVoiceSway * 0.3) + k * P.tenKick + p.think * P.flatThinkSway)
      // Voice spring chasing the raw level (only where the loop wants it).
      const target = level * p.voiceScale
      const w = TAU * SPRING_HZ
      let remaining = dt
      while (remaining > 0) {
        const h = Math.min(SUBSTEP, remaining)
        const acc = w * w * (target - springX) - 2 * SPRING_ZETA * w * springV
        springV += acc * h
        springX += springV * h
        remaining -= h
      }
      onsetEnv = Math.max(onsetEnv * Math.exp(-dt * 9), onset * p.voiceScale)

      const breath = Math.sin(breathPhase) * p.breathDepth * P.breath * (1 + level * p.voiceGlow * 0.5)
      const pulse = breath + P.swing * springX + 0.05 * onsetEnv + 0.04 * k

      lastFrame = {
        time: now,
        pulse,
        speech: P.swing * springX + 0.05 * onsetEnv,
        energy,
        sway,
        cut: Math.max(cutX, 0),
        cutVel: cutV,
        calm,
        squash: sqX,
        morphSpin: morphSpinX,
        listenTurn: turnX,
        listenCross: Math.min(Math.max(crossX, 0), 1.3),
        build: Math.max(buildX, 0),
        buildShift: shiftX,
        brk: Math.min(Math.max(brkX, 0), 1),
        lobeSpin,
        think: p.think,
      }
      firstStep = false
      return lastFrame
    },
  }
}
