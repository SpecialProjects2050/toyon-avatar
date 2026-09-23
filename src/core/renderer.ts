/**
 * Draws a Frame with the flat-O shader on any WebGLRenderingContext (expo-gl or a browser canvas).
 *   createOrbRenderer(gl) → { draw(frame, w, h), dispose() }
 * The canvas / GL view is OVERSCAN × the O on each side; the O's radius is half the shorter side
 * over OVERSCAN. No DOM.
 */
import { P, FLAT_FILL, OVERSCAN } from './params'
import { FRAG, VERT } from './shader'
import type { Frame } from './sim'

const UNIFORMS = [
  'u_break',
  'u_cutAngle',
  'u_cutBend',
  'u_cutCorner',
  'u_cutCount',
  'u_cutMorph',
  'u_cutPhase',
  'u_cutShift',
  'u_cutShoot',
  'u_cutSpacing',
  'u_cutSpread',
  'u_cutWidth',
  'u_cutWrap',
  'u_flatFill',
  'u_flatOrganic',
  'u_hole',
  'u_innerCorner',
  'u_listenCross',
  'u_lobeForm',
  'u_lobeOutline',
  'u_lobeRot',
  'u_outerR',
  'u_res',
  'u_squash',
  'u_wedgeBend',
  'u_wedgeCorner',
  'u_wedgePhase',
] as const
type UniformName = (typeof UNIFORMS)[number]
const DEG = Math.PI / 180

export type OrbRenderer = {
  draw(frame: Frame, w: number, h: number): void
  dispose(): void
}

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader {
  const sh = gl.createShader(type)!
  gl.shaderSource(sh, src)
  gl.compileShader(sh)
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    const log = gl.getShaderInfoLog(sh) ?? ''
    gl.deleteShader(sh)
    throw new Error(`[orb] shader failed to compile:\n${log}`)
  }
  return sh
}

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255]
}

export function createOrbRenderer(gl: WebGLRenderingContext): OrbRenderer {
  const program = gl.createProgram()!
  gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERT))
  gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAG))
  gl.linkProgram(program)
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(`[orb] program failed to link: ${gl.getProgramInfoLog(program) ?? ''}`)
  const buffer = gl.createBuffer()
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW) // one triangle over clip space
  const aPos = gl.getAttribLocation(program, 'a_pos')
  const u = {} as Record<UniformName, WebGLUniformLocation | null>
  for (const name of UNIFORMS) u[name] = gl.getUniformLocation(program, name)
  const fill = hexToRgb(FLAT_FILL)

  return {
    draw(frame, w, h) {
      gl.viewport(0, 0, w, h)
      gl.disable(gl.DEPTH_TEST)
      gl.disable(gl.BLEND)
      gl.clearColor(0, 0, 0, 0)
      gl.clear(gl.COLOR_BUFFER_BIT)
      gl.useProgram(program)
      gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
      gl.enableVertexAttribArray(aPos)
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0)

      const outerR = (Math.min(w, h) / OVERSCAN) * 0.5 // the disc never scales: the voice lives in the form
      gl.uniform2f(u.u_res, w, h)
      gl.uniform1f(u.u_outerR, outerR)
      gl.uniform1f(u.u_hole, P.hole)
      gl.uniform3f(u.u_flatFill, fill[0], fill[1], fill[2])

      // compiling: the cut splits — extra cuts slide out from the single one (spacing and their
      // sway phases grow from 0, so at 0 they coincide exactly and the count can switch unseen)
      const building = frame.build > 0.002
      gl.uniform1f(u.u_cutCount, building ? P.flatBuildCuts : P.cutCount)
      gl.uniform1f(u.u_cutSpacing, building ? P.flatBuildSpacing * frame.build : P.cutSpacing)
      gl.uniform1f(u.u_cutSpread, building ? Math.min(1, frame.build) : 1)
      gl.uniform1f(u.u_cutShift, building ? -(frame.buildShift + P.flatBuildOffset) : 0) // ring space is y-up; +1 stacks down the screen
      gl.uniform1f(u.u_cutWrap, building ? 1 : 0)
      // listening (the crossed cut): the cut's width, bend and corner ease to the listening values
      const toCross = Math.min(1, frame.listenCross)
      const cutWidth = P.cutWidth + (P.listenCutWidth - P.cutWidth) * toCross
      const cutBend = P.cutBend + (P.listenCutBend - P.cutBend) * toCross
      const cutCorner = P.cutCorner + (P.listenCutCorner - P.cutCorner) * toCross
      // listening: the voice goes into the bend (at its own gain) and the sway, not the width
      const voice = frame.energy * (1 + (P.flatListenVoice - 1) * toCross)
      const widthVoice = frame.energy * (1 - toCross)
      // speaking: the phrase widens the gap (energy) and each syllable opens it a touch (speech)
      gl.uniform1f(u.u_cutWidth, cutWidth * 0.5 * (1 + P.flatVoice * widthVoice + P.flatSwing * 3 * frame.speech * (1 - toCross)))
      // thinking: deeper sway; compiling: calmer
      gl.uniform1f(u.u_cutBend, cutBend * (1 + P.flatVoiceBend * voice + P.flatThinkBend * frame.think) * (1 - Math.min(1, frame.build) * (1 - P.flatBuildBend)))
      gl.uniform1f(u.u_cutAngle, P.cutAngle * DEG + frame.morphSpin + frame.listenTurn + frame.build * P.flatBuildTilt * DEG)
      gl.uniform1f(u.u_cutCorner, cutCorner)
      gl.uniform1f(u.u_cutPhase, frame.sway * P.flatSway * 3)
      gl.uniform1f(u.u_cutMorph, frame.cut)
      // to / from thinking or listening the line eases out instead of shooting
      gl.uniform1f(u.u_cutShoot, P.flatCutShoot * (1 - frame.calm) + P.flatCutShootCalm * frame.calm)
      gl.uniform1f(u.u_squash, frame.squash)
      gl.uniform1f(u.u_listenCross, frame.listenCross)
      gl.uniform1f(u.u_innerCorner, P.listenInnerCorner)
      // thinking: the wedges
      gl.uniform1f(u.u_break, frame.brk)
      gl.uniform1f(u.u_lobeForm, P.flatLobeForm)
      gl.uniform1f(u.u_lobeRot, frame.lobeSpin + P.flatLobeAngle * DEG)
      gl.uniform1f(u.u_lobeOutline, P.flatLobeOutline)
      gl.uniform1f(u.u_wedgeBend, P.flatWedgeBend)
      gl.uniform1f(u.u_wedgePhase, frame.sway * P.flatWedgeSway * 3)
      gl.uniform1f(u.u_wedgeCorner, P.flatWedgeCorner)
      gl.uniform1f(u.u_flatOrganic, P.flatOrganic)

      gl.drawArrays(gl.TRIANGLES, 0, 3)
    },
    dispose() {
      gl.deleteBuffer(buffer)
      gl.deleteProgram(program)
    },
  }
}
