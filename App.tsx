/**
 * The demo: the O on its own, or in context (the three Rincon screens), with a row of state
 * chips, a next-chef button and a mic button (web: the browser's microphone drives the O — talk
 * to it while listening or speaking). Keys on web: 1–6 states, c next chef, m mic, x view.
 * The client app replaces this file; the component and its API are in src/.
 */
import { StatusBar } from 'expo-status-bar'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform, Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native'
import { ContextStage } from './demo/context/ContextStage'
import { AGENT_STATES, type AgentState } from './src/core/machine'
import type { VoiceSource } from './src/core/source'
import { createMic } from './src/mic'
import { BACKGROUND, ToyonOrb } from './src/ToyonOrb'

const CHEFS = [require('./assets/chef-1.png'), require('./assets/chef-2.png')]
const KEYS: Record<string, AgentState> = { '1': 'idle', '2': 'listening', '3': 'thinking', '4': 'compiling', '5': 'speaking', '6': 'chef' }

export default function App() {
  const [view, setView] = useState<'orb' | 'context'>('context')
  const [state, setState] = useState<AgentState>('idle')
  const [chef, setChef] = useState(0)
  // the mic: off until asked for (the browser prompts on the first press); web only
  const [mic, setMic] = useState<VoiceSource | null>(null)
  const [micError, setMicError] = useState<string | null>(null)
  const micRef = useRef<VoiceSource | null>(null)
  useEffect(() => () => micRef.current?.dispose(), [])
  const toggleMic = useCallback(async () => {
    if (micRef.current) { micRef.current.dispose(); micRef.current = null; setMic(null); return }
    try {
      const m = await createMic()
      micRef.current = m
      setMic(m)
      setMicError(null)
    } catch (e) {
      setMicError(e instanceof Error && e.name === 'NotAllowedError' ? 'mic blocked' : 'no mic')
    }
  }, [])
  // next chef: into chef, or swap the chef while there
  const nextChef = useCallback(() => {
    setState((s) => { if (s === 'chef') setChef((c) => 1 - c); return 'chef' })
  }, [])

  useEffect(() => {
    if (Platform.OS !== 'web') return
    const onKey = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      if (KEYS[e.key]) setState(KEYS[e.key])
      else if (e.key === 'c') nextChef()
      else if (e.key === 'm') void toggleMic()
      else if (e.key === 'x') setView((v) => (v === 'orb' ? 'context' : 'orb'))
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [nextChef, toggleMic])

  const voice = mic ?? undefined
  return (
    <SafeAreaView style={styles.page}>
      <StatusBar style="dark" />
      {view === 'orb' ? (
        <View style={styles.stage}>
          <ToyonOrb state={state} size={140} label voice={voice} avatar={CHEFS[chef]} onStateChange={(s) => console.log('orb →', s)} />
        </View>
      ) : (
        <ContextStage state={state} voice={voice} avatar={CHEFS[chef]} />
      )}
      <View style={styles.chips}>
        {AGENT_STATES.map((s) => (
          <Pressable key={s} onPress={() => setState(s)} style={[styles.chip, state === s && styles.chipOn]}>
            <Text style={[styles.chipText, state === s && styles.chipTextOn]}>{s}</Text>
          </Pressable>
        ))}
      </View>
      <View style={[styles.chips, styles.chipsLast]}>
        <Pressable onPress={nextChef} style={styles.chip}><Text style={styles.chipText}>next chef</Text></Pressable>
        {Platform.OS === 'web' && (
          <Pressable onPress={toggleMic} style={[styles.chip, mic && styles.chipOn]}>
            <Text style={[styles.chipText, mic && styles.chipTextOn]}>{mic ? 'mic on' : micError ?? 'mic'}</Text>
          </Pressable>
        )}
        <Pressable onPress={() => setView((v) => (v === 'orb' ? 'context' : 'orb'))} style={styles.chip}>
          <Text style={styles.chipText}>{view === 'orb' ? 'in context' : 'the O'}</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: BACKGROUND },
  stage: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  chips: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 8, paddingHorizontal: 16, paddingBottom: 12 },
  chipsLast: { paddingBottom: 40 },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, backgroundColor: '#F1E9E3' },
  chipOn: { backgroundColor: '#FF4D24' },
  chipText: { fontSize: 14, color: '#1c1815' },
  chipTextOn: { color: '#fff', fontWeight: '600' },
})
