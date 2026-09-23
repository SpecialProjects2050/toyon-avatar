/**
 * Reveal springs for chrome that appears next to the O. Pure functions, no DOM.
 *
 * `springReveal(t, hz, zeta)`: the step response of a damped spring, 0 at t = 0 rising to 1,
 * overshooting when zeta < 1 (the bounce). t in seconds, hz the natural frequency, zeta the
 * damping ratio (0.5 = a soft bounce, 1 = no overshoot).
 */
export function springReveal(t: number, hz: number, zeta: number): number {
  if (t <= 0) return 0
  const w = 2 * Math.PI * Math.max(hz, 0.01)
  const z = Math.min(Math.max(zeta, 0.01), 0.999)
  const wd = w * Math.sqrt(1 - z * z)
  const e = Math.exp(-z * w * t)
  return 1 - e * (Math.cos(wd * t) + ((z * w) / wd) * Math.sin(wd * t))
}

/** True once the spring has settled (within 0.1%) — used to stop the frame loop. */
export function springSettled(t: number, hz: number, zeta: number): boolean {
  const w = 2 * Math.PI * Math.max(hz, 0.01)
  return Math.exp(-Math.min(Math.max(zeta, 0.01), 0.999) * w * t) < 0.001
}

export type Vec2 = { x: number; y: number }

/** Quadratic Bézier point at u ∈ [0, 1]. */
export function bezier2(p0: Vec2, p1: Vec2, p2: Vec2, u: number): Vec2 {
  const v = 1 - u
  return {
    x: v * v * p0.x + 2 * v * u * p1.x + u * u * p2.x,
    y: v * v * p0.y + 2 * v * u * p1.y + u * u * p2.y,
  }
}

/** Cubic Bézier point at u ∈ [0, 1]. */
export function bezier3(p0: Vec2, c1: Vec2, c2: Vec2, p3: Vec2, u: number): Vec2 {
  const v = 1 - u
  const a = v * v * v, b = 3 * v * v * u, c = 3 * v * u * u, d = u * u * u
  return { x: a * p0.x + b * c1.x + c * c2.x + d * p3.x, y: a * p0.y + b * c1.y + c * c2.y + d * p3.y }
}

/**
 * The avatar's paths, in units of the O's radius with y down (CSS). `rest` is the resting
 * spot (lower-right); `out` is how far the swing reaches.
 *   up = 1  ENTRY: starts hidden behind the O's right side at hole height, comes out through
 *           the rim at three o'clock, swings out and round clockwise, and settles into rest.
 *   up = -1 EXIT: from rest, swings out and down away from the O, then curves back in and
 *           tucks under the O's lower edge (well away from the cut's gap).
 * Both are cubic, so the swing genuinely leaves the ring (≈1.3 R at the far point).
 */
export function arcPath(rest: Vec2, out: number, u: number, up = 1): Vec2 {
  if (up < 0) {
    // a wide swing: out and down far enough that the whole avatar clears the O (≈1.55 R at the
    // far point), then back in and under the lower body
    const c1: Vec2 = { x: 0.55 * out + 0.6, y: 1.25 }
    const c2: Vec2 = { x: 0.4, y: 1.9 }
    const p3: Vec2 = { x: 0.15, y: 0.55 }      // under the ring's lower body
    return bezier3(rest, c1, c2, p3, u)
  }
  const p0: Vec2 = { x: 0.45, y: 0.0 }         // behind the ring, right of centre
  const c1: Vec2 = { x: out, y: -0.2 }         // out through three o'clock
  const c2: Vec2 = { x: out * 0.95, y: 0.8 }   // round and down
  return bezier3(p0, c1, c2, rest, u)
}

export function easeOutCubic(x: number): number {
  const c = Math.min(Math.max(x, 0), 1)
  return 1 - Math.pow(1 - c, 3)
}

export function easeInOutCubic(x: number): number {
  const c = Math.min(Math.max(x, 0), 1)
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2
}

/**
 * A landing wobble: a decaying oscillation starting at t = 0 (0 before), amplitude `amp`.
 * Added on top of a settled value so the thing arrives, overshoots a little, and settles.
 */
export function landingBounce(t: number, hz: number, zeta: number, amp: number): number {
  if (t <= 0) return 0
  const w = 2 * Math.PI * Math.max(hz, 0.01)
  const z = Math.min(Math.max(zeta, 0.01), 0.999)
  const wd = w * Math.sqrt(1 - z * z)
  return amp * Math.exp(-z * w * t) * Math.sin(wd * t)
}

/** The profile design: the O's radius and the avatar's resting centre / size, from Figma. */
export const PROFILE_O = { cx: 371, cy: 869, r: 36 }
export const AVATAR_REST = { cx: 393.5, cy: 888.5 }
/** The avatar's resting centre in units of the O's radius (to the lower-right). */
export const REST_U: Vec2 = { x: (AVATAR_REST.cx - PROFILE_O.cx) / PROFILE_O.r, y: (AVATAR_REST.cy - PROFILE_O.cy) / PROFILE_O.r }
/** Avatar diameter as a fraction of the O's radius (33 px on a 36 px radius). */
export const AVATAR_FRAC = 33 / PROFILE_O.r

/** What an avatar slot is doing: dir 1 = revealing, -1 = leaving, 0 = hidden; key restarts. */
export type Reveal = {
  /** Bump to play again. */
  key: number
  /** 1 = show (the reveal), -1 = hide (the path played backwards), 0 = sit hidden. */
  dir: 1 | -1 | 0
  /** Extra delay before this one starts, seconds (the incoming speaker waits for the outgoing). */
  delay?: number
  /** Arc direction: 1 = up and round (the reveal), -1 = down and round (a speaker leaving). */
  up?: 1 | -1
}

export type AvatarRevealCfg = {
  /** true = the avatar is leaving. */
  hiding: boolean
  /** true = the arc reveal; false = pop in place. */
  arc: boolean
  /** Arc direction: 1 = up and round (the reveal), -1 = down and round (leaving). */
  up: 1 | -1
  hz: number
  zeta: number
  /** Arc: how far it swings out, in R. */
  out: number
  /** Arc: seconds of travel. */
  dur: number
  /** Landing wobble amplitude. */
  amp: number
  /** Crossfade at the O's edge, seconds. */
  fadeT: number
  /** The avatar's resting scale (the Size dial) and its diameter at scale 1, in R. */
  size: number
  diameterR: number
}
export type AvatarPose = {
  /** Offset from the resting spot, in R. */
  x: number
  y: number
  /** The animation's own scale 0..1 (multiply by size and the voice pulse). */
  scale: number
  /** In front of the O (true) or behind it. */
  front: boolean
  opacity: number
  done: boolean
}

/**
 * The avatar reveal / hide as a pure stepper: at(t, cfg) → pose, t in seconds from the start
 * (negative while a delay runs). Keeps the two latches (in front, crossfade start) so it can
 * be driven by any frame loop — the web lab writes it to a CSS transform, React Native to an
 * Animated.View. Shared so the two can't drift.
 *   arc: from behind the O's right edge, out and round, scaling from 0.3 to 1, landing with a
 *   small wobble; invisible while behind (the O's cut is a see-through gap), fading in over
 *   fadeT once in front. Leaving: out, down and under, receding, fading once under the rim.
 *   pop: scale from 0 in place on the spring; leaving, an ease back to 0.
 */
export function createAvatarReveal() {
  let inFront = false
  let flipAt = -1
  let settled = false
  let init = false
  const sm = (a: number, b: number, x: number) => { const c = Math.min(1, Math.max(0, (x - a) / (b - a))); return c * c * (3 - 2 * c) }
  return {
    at(t: number, cfg: AvatarRevealCfg): AvatarPose {
      if (!init) { init = true; inFront = cfg.hiding }
      const restPose = (): AvatarPose => ({ x: 0, y: 0, scale: cfg.hiding ? 0 : 1, front: !cfg.hiding, opacity: cfg.hiding ? 0 : 1, done: true })
      if (settled) return restPose()
      let pose: AvatarPose
      if (cfg.arc) {
        const prog = easeInOutCubic(t / cfg.dur)
        const land = t - cfg.dur * 0.9
        const scale = cfg.hiding ? 1 - 0.7 * sm(0.2, 0.75, prog) : 0.3 + 0.7 * sm(0, 0.75, prog) + landingBounce(land, cfg.hz, cfg.zeta, cfg.amp)
        const q = arcPath(REST_U, cfg.out, prog, cfg.up)
        const dist = Math.hypot(q.x, q.y)
        const avR = cfg.diameterR * 0.5 * scale * cfg.size
        if (!cfg.hiding && !inFront && dist > 1.02) { inFront = true; flipAt = t }
        if (cfg.hiding && inFront && prog > 0.5 && dist < 1 + avR) inFront = false
        if (cfg.hiding && flipAt < 0 && dist < 0.98 && prog > 0.5) flipAt = t
        const since = flipAt < 0 ? 0 : t - flipAt
        const opacity = !cfg.hiding ? (inFront ? Math.min(1, since / cfg.fadeT) : 0) : (flipAt < 0 ? 1 : Math.max(0, 1 - since / cfg.fadeT))
        const done = cfg.hiding ? t >= cfg.dur : t >= cfg.dur && springSettled(land, cfg.hz, cfg.zeta)
        pose = { x: q.x - REST_U.x, y: q.y - REST_U.y, scale, front: inFront, opacity, done }
      } else {
        const p = cfg.hiding ? 1 - easeInOutCubic(t / 0.35) : Math.max(0, springReveal(t, cfg.hz, cfg.zeta))
        const done = cfg.hiding ? t >= 0.35 : t >= 0 && springSettled(t, cfg.hz, cfg.zeta)
        pose = { x: 0, y: 0, scale: p, front: true, opacity: 1, done }
      }
      if (pose.done) { settled = true; return restPose() }
      return pose
    },
  }
}
