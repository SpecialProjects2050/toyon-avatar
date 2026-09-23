/**
 * <ToyonOrb /> — the Toyon O for React Native.
 *
 *   <ToyonOrb state={agentState} size={120} voiceLevel={level} avatar={chef.image} onStateChange={...} />
 *
 * Controlled by `state`: pass the agent's state and the O morphs to it — idle, listening,
 * thinking, compiling, speaking, or chef (speaking with a chef's avatar on the O). Change
 * `avatar` while in chef and the next chef comes in as the current one leaves. `voiceLevel` is
 * the mic (listening) or speech (speaking) level, 0..1, pushed as often as you have it.
 * `onStateChange` fires after each transition the machine accepts, with the new state.
 *
 * Everything visual is src/core (the state machine, the sim, the shader, the numbers). This
 * file wires them to expo-gl and to React Native views.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native'
import { Avatar } from './Avatar'
import { OrbGL } from './OrbGL'
import { createMachine, STATE_EVENT, type AgentState } from './core/machine'
import { OVERSCAN, P } from './core/params'
import type { Reveal } from './core/reveal'
import { createSim } from './core/sim'
import { createLevelSource, type VoiceSource } from './core/source'

/** The page background. The O draws with premultiplied alpha on it. */
export const BACKGROUND = '#FEF9F5'

export type ToyonOrbProps = {
  /** The agent's state. The O morphs to it. */
  state: AgentState
  /** The O's diameter, dp. The component is OVERSCAN (2×) that on each side. */
  size?: number
  /** Voice level 0..1 — the user's mic while listening, the speech envelope while speaking. */
  voiceLevel?: number
  /** Or a full voice source (level + onset), e.g. the simulated voice for demos. Overrides voiceLevel. */
  voice?: VoiceSource
  /** The chef's picture. Change it while in `chef` to swap to the next chef. */
  avatar?: ImageSourcePropType
  /** Show the state's name above the O. */
  label?: boolean
  /** After each accepted transition. */
  onStateChange?: (state: AgentState) => void
  style?: StyleProp<ViewStyle>
}

const LABELS: Record<AgentState, string> = {
  idle: 'Idle', listening: 'Listening', thinking: 'Thinking', compiling: 'Compiling', speaking: 'Speaking', chef: 'Speaking · chef',
}

export function ToyonOrb({ state, size = 120, voiceLevel = 0, voice, avatar, label = false, onStateChange, style }: ToyonOrbProps) {
  const machine = useMemo(() => createMachine(state), []) // eslint-disable-line react-hooks/exhaustive-deps -- initial only
  const sim = useMemo(() => createSim(state, performance.now() / 1000), []) // eslint-disable-line react-hooks/exhaustive-deps
  const level = useMemo(() => createLevelSource(), [])
  const source = voice ?? level
  useEffect(() => { if (!voice) level.setLevel(voiceLevel) }, [voice, voiceLevel, level])

  // the two avatar slots: one on the O, one waiting to come in on a swap
  const [reveals, setReveals] = useState<[Reveal, Reveal]>([{ key: 0, dir: state === 'chef' ? 1 : 0 }, { key: 0, dir: 0 }])
  const [images, setImages] = useState<[ImageSourcePropType | undefined, ImageSourcePropType | undefined]>([avatar, undefined])
  const speaker = useRef(0)
  const wasChef = useRef(state === 'chef')
  const onChange = useRef(onStateChange)
  onChange.current = onStateChange

  const showAvatar = useCallback((image: ImageSourcePropType | undefined) => {
    const s = speaker.current
    setImages((im) => { const n: typeof im = [...im]; n[s] = image; return n })
    setReveals((rs) => { const n: [Reveal, Reveal] = [...rs]; n[s] = { key: rs[s].key + 1, dir: 1 }; return n })
  }, [])
  const hideAvatar = useCallback(() => {
    const s = speaker.current
    setReveals((rs) => { const n: [Reveal, Reveal] = [...rs]; n[s] = { key: rs[s].key + 1, dir: -1, up: -1 }; return n })
  }, [])
  const swapAvatar = useCallback((image: ImageSourcePropType | undefined) => {
    const out = speaker.current
    const inn = 1 - out
    speaker.current = inn
    setImages((im) => { const n: typeof im = [...im]; n[inn] = image; return n })
    setReveals((rs) => {
      const n: [Reveal, Reveal] = [...rs]
      n[out] = { key: rs[out].key + 1, dir: -1, up: -1 }
      n[inn] = { key: rs[inn].key + 1, dir: 1, delay: P.avatarArcDur * P.avatarSwapOverlap }
      return n
    })
  }, [])

  // the machine drives the sim and the avatar; the host drives the machine through `state`
  const latestAvatar = useRef(avatar)
  latestAvatar.current = avatar
  useEffect(() => machine.subscribe((next, again) => {
    if (again) { swapAvatar(latestAvatar.current); return }
    sim.setState(next, performance.now() / 1000)
    if (next === 'chef') showAvatar(latestAvatar.current)
    else if (wasChef.current) hideAvatar()
    wasChef.current = next === 'chef'
    onChange.current?.(next)
  }), [machine, sim, showAvatar, hideAvatar, swapAvatar])

  useEffect(() => { machine.send(STATE_EVENT[state]) }, [machine, state])
  // a new chef while a chef is on: swap
  const prevAvatar = useRef(avatar)
  useEffect(() => {
    if (prevAvatar.current !== avatar && machine.state === 'chef') machine.send('CHEF')
    prevAvatar.current = avatar
  }, [avatar, machine])

  const side = size * OVERSCAN
  const R = size / 2
  return (
    <View style={[styles.box, { width: side, height: side + (label ? 36 : 0) }, style]}>
      {label && <Text style={styles.label}>{LABELS[state]}</Text>}
      <View style={{ width: side, height: side }}>
        <View style={[StyleSheet.absoluteFill, styles.orb]}>
          <OrbGL sim={sim} voice={source} size={size} />
        </View>
        <Avatar sim={sim} reveal={reveals[0]} source={images[0]} R={R} cx={side / 2} cy={side / 2} />
        <Avatar sim={sim} reveal={reveals[1]} source={images[1]} R={R} cx={side / 2} cy={side / 2} />
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  box: { alignItems: 'center', backgroundColor: BACKGROUND },
  orb: { zIndex: 2 },
  label: { height: 36, fontSize: 18, fontWeight: '600', color: '#B3ACA6', textAlign: 'center' },
})
