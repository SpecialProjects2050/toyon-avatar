/**
 * The Toyon O — the flat vector look only. One fragment shader, GLSL ES 1.00 (WebGL1 / expo-gl),
 * no extensions, no fwidth (anti-aliasing uses the pixel size from u_outerR). Premultiplied alpha
 * out. Extracted from the lab's shader; the lab is the playground, this is the hand-off.
 *
 * The disc minus a gap field, corners rounded. The gap is the O's hole morphing into the cut
 * (flatGap), joined by listening's second cut (crossCut) and thinking's through-cuts (the wedges).
 */

export const VERT = /* glsl */ `
attribute vec2 a_pos;
void main() {
  gl_Position = vec4(a_pos, 0.0, 1.0);
}
`

export const FRAG = /* glsl */ `
#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform vec2 u_res;
uniform float u_outerR;
uniform float u_hole;
uniform float u_cutCount;
uniform float u_cutSpacing;
uniform float u_cutWidth;
uniform float u_cutBend;
uniform float u_cutAngle;
uniform float u_cutCorner;
uniform float u_cutPhase;
uniform float u_cutSpread;
uniform float u_cutShift;
uniform float u_cutWrap;
uniform float u_cutMorph;         // 0 = the O's hole, 1 = the cut (overshoots a little)
uniform float u_cutShoot;         // how the cut's line grows: 1 shoots out then settles, 0 eases in and out
uniform float u_squash;
uniform float u_break;            // thinking: 0 = the disc, 1 = the wedges
uniform float u_lobeForm;         // thinking: how many through-cuts
uniform float u_lobeRot;          // thinking: the wedges' turn (rad)
uniform float u_lobeOutline;      // thinking: the through-cuts' width (× the cut's)
uniform float u_wedgeBend;        // thinking: the through-cuts' bend
uniform float u_wedgePhase;       // thinking: their sway phase
uniform float u_wedgeCorner;      // thinking: inner-corner rounding where they cross (R)
uniform float u_flatOrganic;
uniform float u_listenCross;      // listening: the second cut, 0..1 (overshoots a little)
uniform float u_innerCorner;      // listening: rounding of the inner corners where the cuts cross (R)
uniform vec3 u_flatFill;

float flatSmax(float a, float b, float k) {
  if (k < 1e-4) return max(a, b);
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(a, b, h) + k * h * (1.0 - h);
}

float smin(float a, float b, float k) {
  if (k < 1e-4) return min(a, b);
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float flatCuts(vec2 q, vec2 dir, vec2 nrm, float count, float phase) {
  float t = dot(q, dir);
  float s = dot(q, nrm);
  float d = 1e9;
  for (float i = 0.0; i < 4.0; i += 1.0) {
    if (i >= count) break;
    float o = (i - (count - 1.0) * 0.5) * u_cutSpacing;
    float slot = i;
    if (u_cutWrap > 0.5) {
      // stacking: the pattern slides along the normal and wraps, so a cut leaving one side
      // comes back in the other; the sway phase follows the slot, not the index, so it's continuous
      float W = count * u_cutSpacing;
      o = mod(o + u_cutShift * u_cutSpacing + W * 0.5, max(W, 1e-5)) - W * 0.5;
      slot = o / max(u_cutSpacing, 1e-4);
    }
    float bend = u_cutBend * 0.35 * sin(t * 2.2 + phase + slot * 1.3 * u_cutSpread);
    d = min(d, abs(s - o - bend) - u_cutWidth);
  }
  return d;
}

float flatGap(vec2 q, vec2 dir, vec2 nrm, float hole, float m, float mo) {
  // two gaps, both signed distances (negative inside the gap): the O's centre hole and the cut.
  // Blending the fields morphs one into the other — the hole stretches into a slot, then opens
  // into the cut — driven by the state's morph amount.
  float dCut = flatCuts(q, dir, nrm, u_cutCount, u_cutPhase);
  float dGap = dCut;
  {
    // (with no hole — closed while the form is broken — the capsule starts as a point, so at
    // morph 0 there is no gap at all, and the cut still grows out of it)
    // the morph travels through a capsule — a slot with round ends — so nothing ever sharpens:
    // its half-length grows from 0 (the round hole) across the disc, its radius thins from the
    // hole's to the cut's, it takes on the cut's bend as it goes, and only at the very end does
    // it hand over to the real (possibly multiple) cut
    // in two beats: first the hole scales down to the cut's width, then the line grows out of it
    float t = dot(q, dir);
    float s = dot(q, nrm);
    // the spring already eases the timeline, so the beats map on nearly linearly, with a soft
    // join between shrinking and growing
    float shrink = clamp((m - 0.12) / 0.3, 0.0, 1.0);
    float g = clamp((m - 0.35) / 0.65, 0.0, 1.0);
    float grow = mix(g * g * (3.0 - 2.0 * g), g * (2.0 - g), u_cutShoot); // 1: shoots, then settles; 0: eases both ends
    // anticipation: the hole swells before it shrinks
    float antic = smoothstep(0.0, 0.12, m) * (1.0 - smoothstep(0.12, 0.3, m));
    float rad = mix(hole * (1.0 + 0.3 * antic * u_flatOrganic), u_cutWidth, shrink);
    // shooting, the line runs well past the rim (so it crosses the disc early); easing, it only
    // just reaches it, so the growth spans the whole morph
    float halfLen = mix(1.3, 2.2, u_cutShoot) * grow;
    // whip: the spring's overshoot past 1 flicks the curve, then settles
    float whip = (mo - 1.0) * 2.5 * u_flatOrganic;
    float bend = u_cutBend * 0.35 * sin(t * 2.2 + u_cutPhase) * grow * (1.0 + whip);
    float dCap = length(vec2(max(abs(t) - halfLen, 0.0), s - bend)) - rad;
    dGap = mix(dCap, dCut, smoothstep(0.85, 1.0, m));
    // with the hole closed there is nothing to round at morph 0: push the gap field clear of the
    // disc so the corner smoothing sees no gap at all
    dGap += (1.0 - smoothstep(0.0, 0.2, m)) * (1.0 - smoothstep(0.0, 0.02, hole)) * 0.6;
  }
  return dGap;
}

// listening's second cut: a dot swells at the centre, then the line grows out across the first
// cut (the spring's overshoot flicks its bend); at 1 it is a full second cut. Retracting, the
// line shrinks back into the dot and the dot closes.
float crossCut(vec2 q, vec2 dir, vec2 nrm, float c) {
  float t2 = dot(q, nrm);
  float s2 = dot(q, -dir);
  float dot01 = smoothstep(0.0, 0.25, c);
  float grow = smoothstep(0.15, 1.0, min(c, 1.0));
  float halfLen = 1.25 * grow;
  float whip = 1.0 + 2.5 * max(c - 1.0, 0.0);
  float bend2 = u_cutBend * 0.35 * sin(t2 * 2.2 + u_cutPhase + 1.7) * grow * whip;
  return length(vec2(max(abs(t2) - halfLen, 0.0), s2 - bend2)) - u_cutWidth * dot01;
}

// thinking: n through-cuts, bent like the speaking cut, growing out from the centre (their
// half-length with the break) and turning. Blended with a smooth union so the wedges' inner
// corners round, like listening's quadrants.
float wedgeCuts(vec2 q, float brk, float m) {
  float e = clamp(brk, 0.0, 1.0);
  float grow = e * e * (3.0 - 2.0 * e);
  float cr = cos(u_lobeRot), sr = sin(u_lobeRot);
  vec2 qr = vec2(q.x * cr + q.y * sr, -q.x * sr + q.y * cr);
  float halfLen = 1.3 * grow;
  float w = u_cutWidth * u_lobeOutline * smoothstep(0.0, 0.2, e) * (1.0 - m);
  float dw = 1e9;
  for (float k = 0.0; k < 6.0; k += 1.0) {
    if (k >= u_lobeForm) break;
    float a = k * 3.14159 / u_lobeForm;
    vec2 dk = vec2(cos(a), sin(a));
    float t = dot(qr, dk);
    float s = qr.x * dk.y - qr.y * dk.x;
    float curve = u_wedgeBend * 0.35 * sin(t * 2.2 + u_wedgePhase + k * 1.7) * grow;
    float dk2 = length(vec2(max(abs(t) - halfLen, 0.0), s - curve)) - w;
    dw = (k < 0.5) ? dk2 : smin(dw, dk2, u_wedgeCorner * e);
  }
  return dw;
}

vec4 flatLook(vec2 q, float px) {
  vec2 dir = vec2(cos(u_cutAngle), sin(u_cutAngle));
  vec2 nrm = vec2(-dir.y, dir.x);
  // squash and stretch: while the morph moves, the disc stretches along the cut's direction
  // and thins across it (area roughly kept), then returns to round
  float sq = clamp(u_squash, -0.18, 0.18) * u_flatOrganic;
  vec2 qd = vec2(dot(q, dir) / (1.0 + sq), dot(q, nrm) * (1.0 + sq));
  float r = length(qd);
  float dDisc = r - 1.0;
  if (dDisc > u_cutCorner + px * 2.0) return vec4(0.0);
  // thinking: the hole closes as the wedges take over
  float brk = clamp(u_break, 0.0, 1.0);
  float hole = u_hole * (1.0 - brk);
  float mo = u_cutMorph;                                  // may run past 1: the overshoot
  float m = clamp(mo, 0.0, 1.0);
  // the extra gaps: thinking's wedges and listening's second cut, joined — so between the two
  // the wedges fold while the cross grows (and the other way round), one motion
  float pieceGap = 1e9;
  if (brk > 0.001) pieceGap = wedgeCuts(q, brk, m);
  pieceGap = min(pieceGap, crossCut(q, dir, nrm, u_listenCross));
  float dGap = flatGap(q, dir, nrm, hole, m, mo);
  // a smooth union of the gaps rounds the quadrants' inner corners while listening
  dGap = smin(dGap, pieceGap, u_innerCorner * u_listenCross);
  // the segments: the disc minus the gap, corners rounded
  float d = flatSmax(dDisc, -dGap, u_cutCorner);
  float a = 1.0 - smoothstep(-px, px, d);
  return vec4(u_flatFill * a, a);
}

void main() {
  vec2 q = (gl_FragCoord.xy - u_res * 0.5) / u_outerR; // unit ring space, y up
  gl_FragColor = flatLook(q, 1.0 / u_outerR);
}
`
