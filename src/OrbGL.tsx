/**
 * The O itself: an expo-gl view running the renderer. The only file that touches GL.
 */
import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl'
import { useCallback, useEffect, useRef } from 'react'
import { OVERSCAN } from './core/params'
import { createOrbRenderer } from './core/renderer'
import type { Sim } from './core/sim'
import type { VoiceSource } from './core/source'

type Props = {
  sim: Sim
  voice: VoiceSource
  /** The O's diameter, dp. The view is OVERSCAN × that, so cuts, squash and the avatar have room. */
  size: number
}

export function OrbGL({ sim, voice, size }: Props) {
  const live = useRef(voice)
  live.current = voice
  const stop = useRef<(() => void) | null>(null)

  const onContextCreate = useCallback((gl: ExpoWebGLRenderingContext) => {
    stop.current?.()
    const renderer = createOrbRenderer(gl)
    let raf = 0
    const loop = () => {
      raf = requestAnimationFrame(loop)
      sim.setVoice(live.current.level(), live.current.onset())
      renderer.draw(sim.step(performance.now() / 1000), gl.drawingBufferWidth, gl.drawingBufferHeight)
      gl.endFrameEXP()
    }
    raf = requestAnimationFrame(loop)
    stop.current = () => { cancelAnimationFrame(raf); renderer.dispose(); stop.current = null }
  }, [sim])

  useEffect(() => () => stop.current?.(), [])

  const side = size * OVERSCAN
  return <GLView style={{ width: side, height: side }} onContextCreate={onContextCreate} />
}
