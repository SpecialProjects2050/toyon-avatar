/**
 * The chef's avatar on the O: revealed on an arc from behind the O, hidden the same way, swapped
 * when another chef starts talking. The motion is the shared stepper (reveal.ts); this file only
 * writes it to an Animated.View each frame.
 */
import { useEffect, useRef, useState } from 'react'
import { Animated, Image, StyleSheet, type ImageSourcePropType } from 'react-native'
import { AVATAR_FRAC, createAvatarReveal, REST_U, type AvatarRevealCfg, type Reveal } from './core/reveal'
import { P } from './core/params'
import type { Sim } from './core/sim'

const BACKGROUND = '#FEF9F5'

type Props = {
  sim: Sim
  reveal: Reveal
  source?: ImageSourcePropType
  /** The O's radius, dp, and the centre of the O within the parent. */
  R: number
  cx: number
  cy: number
}

export function Avatar({ sim, reveal, source, R, cx, cy }: Props) {
  const tx = useRef(new Animated.Value(0)).current
  const ty = useRef(new Animated.Value(0)).current
  const sc = useRef(new Animated.Value(0)).current
  const op = useRef(new Animated.Value(0)).current
  const [front, setFront] = useState(false)

  // the resting spot: to the lower-right of the O, the design's proportions
  const d = P.avatarOrbSize * R
  const k = P.avatarOrbOffset / Math.hypot(REST_U.x, REST_U.y)
  const left = cx + REST_U.x * k * R - d / 2
  const top = cy + REST_U.y * k * R - d / 2

  useEffect(() => {
    if (reveal.dir === 0) {
      sc.setValue(0)
      op.setValue(0)
      setFront(false)
      return
    }
    const t0 = performance.now() / 1000
    const hiding = reveal.dir < 0
    const stepper = createAvatarReveal()
    const cfg: AvatarRevealCfg = {
      hiding, arc: P.avatarReveal >= 0.5, up: reveal.up ?? 1,
      hz: P.avatarHz, zeta: P.avatarZeta, out: P.avatarArcOut,
      dur: Math.max(0.05, P.avatarArcDur), amp: P.avatarBounce, fadeT: Math.max(0.01, P.avatarFade),
      size: P.avatarScale, diameterR: AVATAR_FRAC * (P.avatarOrbSize / AVATAR_FRAC),
    }
    // the entry's own delay (the state-change beat) is skipped on a swap, which sets its own
    const delay = (hiding || reveal.delay !== undefined ? 0 : P.avatarDelay) + (reveal.delay ?? 0)
    let wasFront = hiding
    setFront(hiding)
    let raf = 0
    const tick = () => {
      const pose = stepper.at(performance.now() / 1000 - t0 - delay, cfg)
      // while speaking the avatar breathes with the O's voice pulse
      const voice = 1 + P.avatarVoice * (sim.frame()?.pulse ?? 0)
      tx.setValue(pose.x * R)
      ty.setValue(pose.y * R)
      sc.setValue(pose.scale * cfg.size * voice)
      op.setValue(pose.opacity)
      if (pose.front !== wasFront) { wasFront = pose.front; setFront(pose.front) }
      if (!(pose.done && hiding)) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [reveal, sim, R, tx, ty, sc, op])

  if (!source) return null // nothing to reveal without a picture
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.avatar,
        { left, top, width: d, height: d, borderRadius: d / 2, borderWidth: Math.max(1.5, d * 0.06), zIndex: front ? 3 : 1 },
        { opacity: op, transform: [{ translateX: tx }, { translateY: ty }, { scale: sc }] },
      ]}
    >
      <Image source={source} style={styles.image} resizeMode="cover" />
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  avatar: { position: 'absolute', overflow: 'hidden', borderColor: BACKGROUND, backgroundColor: BACKGROUND },
  image: { width: '100%', height: '100%' },
})
