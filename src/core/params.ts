/**
 * Every number the Toyon O uses, in one place. Tuned in the lab (the web playground) and copied
 * here; nothing in the app edits them. Units: R = the O's radius; hz / zeta = spring frequency
 * and damping; angles in degrees; times in seconds.
 *
 * The forms: idle is the O (a centre hole); speaking / chef one bent cut; listening the crossed
 * cut (a plus, quadrants with rounded inner corners); compiling the cut split into stacking cuts;
 * thinking the wedges — three bent through-cuts dividing the whole disc into six, turning slowly.
 */

/** The fill. Draws with premultiplied alpha on the page's cream (#FEF9F5). */
export const FLAT_FILL = '#FF4D24'
/** The GL view is this many O-diameters on each side (room for the cuts, squash and the avatar). */
export const OVERSCAN = 2

export const P = {
  // the loop crossfade and the IN kick
  bloomDrift: 1,
  breath: 1,
  fade: 0.8,
  kick: 0.3,
  kickDur: 1.5,
  swing: 0.14,
  // the O and the cut
  hole: 0.19,
  // the cut opens a touch on each syllable while speaking (× the voice spring and onset)
  flatSwing: 0.8,
  cutAngle: 0,
  cutBend: 0.44,
  cutCorner: 0.23,
  cutCount: 1,
  cutSpacing: 0.76,
  cutWidth: 0.065,
  flatOrganic: 1,
  flatVoice: 1.12,
  flatVoiceBend: 1.16,
  flatVoiceSway: 2.92,
  flatThinkBend: 0.4,
  flatThinkSway: 1.6,
  flatSway: 1.35,
  tenFlowSpeed: 0.12,
  tenFlowVoice: 0.6,
  tenKick: 0.3,
  // the hole → cut morph: its spring, its turn (relative to the cut's rest pose, so it always
  // lands square), and how the line grows — 1 shoots past the rim then settles (speaking), the
  // calm value eases in and out on a line that only just reaches it (to / from thinking or listening)
  flatMorphHz: 0.85,
  flatMorphZeta: 0.66,
  flatMorphCalm: 1,
  flatMorphSpin: 0.125,
  flatThinkMorphSpin: 0.12,
  flatCutShoot: 1,
  flatCutShootCalm: 0.2,
  // squash and stretch of the disc while anything moves
  flatSquash: 0.54,
  flatSquashHz: 1.75,
  flatSquashZeta: 0.3,
  // listening: the crossed cut — its width / bend / corners (the voice deepens the bend and drives
  // the sway at flatListenVoice × speaking's gain; the width holds still), the second line's spring, and the
  // turns (in turns: from a cut state a quarter, so the cross lands as a plus; from the O none —
  // the morph's own twist covers it)
  listenCutWidth: 0.06,
  listenCutBend: 0.25,
  listenCutCorner: 0.3,
  listenInnerCorner: 0.12,
  flatListenCrossHz: 1.6,
  flatListenCrossOutHz: 0.9,
  flatListenCrossZeta: 0.55,
  flatListenInHz: 1.4,
  flatListenInZeta: 0.55,
  flatListenKick: 0.3,
  flatListenVoice: 2.2,
  flatListenTurn: 0.25,
  flatListenTurnO: 0,
  // thinking: the wedges — how many through-cuts, their width (× the cut's), bend, sway and
  // inner-corner rounding; the bloom's spring; the steady spin (turns / s, − = clockwise,
  // quickening × (1 + flatLobeVoiceSpin · voice) — and the voice widens the gaps and deepens
  // the bend, as it does the speaking cut) and
  // the way in: a burst of spin (a step of `flatLobeStepDeg`, easing over `flatLobeSpinEase`)
  // as the form blooms from the O and again as it folds back, plus a wobble of the disc
  flatLobeForm: 3,
  flatLobeOutline: 0.95,
  flatLobeAngle: 0,
  flatWedgeBend: 0.1,
  flatWedgeSway: 0.49,
  flatWedgeCorner: 0.185,
  flatLobeHz: 1.5,
  flatLobeZeta: 0.78,
  flatLobeSpin: -0.18,
  flatLobeSpinEase: 0.45,
  flatLobeVoiceSpin: 1.5,
  flatLobeStepDeg: -35,
  flatLobeEnterTurn: 0,
  flatLobeIdleTurn: 1,
  flatLobeEnterKick: 0.6,
  // compiling: the cut splits into stacking cuts
  flatBuildBend: 0.45,
  flatBuildCuts: 4,
  flatBuildDir: 1,
  flatBuildEvery: 0.8,
  flatBuildHz: 1.4,
  flatBuildOffset: 0,
  flatBuildSpacing: 0.55,
  flatBuildStepHz: 1.8,
  flatBuildStepZeta: 0.7,
  flatBuildTilt: -12,
  flatBuildZeta: 0.6,
  // the chef's avatar
  avatarScale: 1.04,
  avatarHz: 2.4,
  avatarZeta: 0.65,
  avatarDelay: 0.15,
  avatarOrbSize: 0.92,
  avatarOrbOffset: 0.83,
  avatarReveal: 1,
  avatarArcOut: 1.55,
  avatarBounce: 0.08,
  avatarArcDur: 0.65,
  avatarSwapOverlap: 0.15,
  avatarFade: 0.14,
  avatarVoice: 0.83,
} as const
