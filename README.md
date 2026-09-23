# Toyon Avatar — React Native

The Toyon O, the voice agent's avatar, as one React Native component: `<ToyonOrb />`. It draws
the O with a single fragment shader through [expo-gl](https://docs.expo.dev/versions/latest/sdk/gl-view/)
and morphs between the agent's states. Nothing is tunable at run time — every number is fixed in
`src/core/params.ts`; the app only changes the state and feeds it a voice level.

```tsx
import { ToyonOrb } from './src'

<ToyonOrb
  state={agentState}          // 'idle' | 'listening' | 'thinking' | 'compiling' | 'speaking' | 'chef'
  size={120}                  // the O's diameter, dp
  voiceLevel={level}          // 0..1 — the mic while listening, the speech envelope while speaking
  avatar={chef.image}         // the chef's picture; change it while in 'chef' to swap chefs
  onStateChange={(s) => …}    // after each accepted transition
/>
```

## Running the demo

```sh
pnpm install
pnpm start          # then i / a / w for iOS simulator, Android, web
```

`App.tsx` is the demo. It opens on the O **in context** — the three Rincon Explore screens
(onboarding, search, profile) built at 1:1 from the Figma file, each with a live O on the design's
node bounds — side by side in a wide window, one at a time with paging on a phone. The chips at
the bottom set the state; **next chef** enters `chef` (and swaps chefs while there); **mic**
(web only) asks for the microphone so you can talk to the O; **the O** / **in context** switches
to the O on its own. Keys on web: `1`–`6` states, `c` next chef, `m` mic, `x` view.

The demo (`App.tsx`, `demo/`, `assets/context/`) is not part of the component and needs
`expo-image`, `expo-blur` and `expo-linear-gradient`; the component itself needs only `expo-gl`.

## Putting it in the app

1. Copy `src/` into the app.
2. Add the dependencies: `expo-gl` (and `react-native-web` if the app runs on web). Not on Expo?
   `expo-gl` installs into a bare React Native app through
   [Expo modules](https://docs.expo.dev/bare/installing-expo-modules/).
3. Render `<ToyonOrb state={…} />` and drive `state` from the agent.
4. Meter the audio with your own stack and push `voiceLevel` (0..1) as often as you have it —
   30 Hz or better reads smoothly. If you already have a level + onset source, pass `voice`
   instead. `src/mic.ts` is the web demo's microphone and is not meant for the app.

## The states

| State | When | What the O does |
| --- | --- | --- |
| `idle` | resting | the O at rest |
| `listening` | the user is speaking | opens toward the voice |
| `thinking` | working on it | the hole stretches into a cut and turns |
| `compiling` | building the answer | the cut splits into several |
| `speaking` | Toyon speaking back | the cut opens with the voice, a touch on each syllable |
| `chef` | speaking with a chef | as speaking, with the chef's avatar on the O |

Any state can go to any other. The component is controlled: pass the state and the O morphs to
it; `onStateChange` reports the state actually entered.

The machine itself is in `src/core/machine.ts` and is also exported on its own — `createMachine`,
`transition`, `AGENT_STATES`, `TRANSITIONS` — with events `LISTEN`, `THINK`, `BUILD`, `SPEAK`,
`CHEF`, `FINISH`. `CHEF` while already in `chef` swaps to the next chef.

## Props

| Prop | Type | Notes |
| --- | --- | --- |
| `state` | `AgentState` | required |
| `size` | `number` | diameter in dp, default in `params.ts` |
| `voiceLevel` | `number` | 0..1 |
| `voice` | `VoiceSource` | level + onset; overrides `voiceLevel` |
| `avatar` | `ImageSourcePropType` | shown in `chef` |
| `label` | `boolean` | the state's name above the O (demo) |
| `onStateChange` | `(s: AgentState) => void` | |
| `style` | `ViewStyle` | |

## Layout

- `src/ToyonOrb.tsx` — the component: the state machine, the sim, the avatar slots.
- `src/OrbGL.tsx` — the GL view and frame loop (the only file touching GL).
- `src/Avatar.tsx` — the chef's avatar on the O.
- `src/core/` — the O itself, no DOM, no React:
  - `machine.ts` — the agent state machine (states, events, transitions).
  - `sim.ts` — state + voice + time → a frame of numbers (the springs and clocks).
  - `shader.ts` — the one fragment shader (GLSL ES 1.00, no extensions).
  - `renderer.ts` — sets the frame on the shader, on any WebGLRenderingContext.
  - `params.ts` — every number, in one place.
  - `reveal.ts` — the avatar's reveal / hide / swap motion, as a pure stepper.
  - `source.ts` — voice sources: a level you push in, and a simulated voice for tests.
- `src/mic.ts` — the web demo's microphone (getUserMedia).
- `demo/context/` — the three Rincon screens (`Screens.tsx`), the stage that scales them to the
  window (`ContextStage.tsx`), and the design tokens and asset map. Demo only.

## Notes

- Size the component to the O, not the screen. The GL view is 2× the O on each side (room for
  the cuts, the squash and the avatar's swing); a full-screen GL view would cost fill rate for
  nothing.
- The shader is GLSL ES 1.00 with no extensions; it runs on any OpenGL ES 2 device.
- Background is `#FEF9F5` (exported as `BACKGROUND`) and the O draws with premultiplied alpha,
  so it sits on any view of that colour.
