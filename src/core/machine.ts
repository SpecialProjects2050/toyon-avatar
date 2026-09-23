/**
 * The agent state machine. Transitions are data (a lookup table), not ifs.
 */

/**
 * The states the O has:
 *   idle       — resting
 *   listening  — the user is speaking
 *   thinking   — working on it
 *   compiling  — building the answer (after thinking: the cut splits into several)
 *   speaking   — Toyon speaking back, no avatar
 *   chef       — speaking with a chef avatar on the O (the avatar reveals on entry, hides on exit;
 *                CHEF again while in chef swaps to the next chef)
 */
export type AgentState = 'idle' | 'listening' | 'thinking' | 'compiling' | 'speaking' | 'chef'
export const AGENT_STATES: AgentState[] = ['idle', 'listening', 'thinking', 'compiling', 'speaking', 'chef']

export type AgentEvent = 'LISTEN' | 'THINK' | 'BUILD' | 'SPEAK' | 'CHEF' | 'FINISH'

/** Allowed transitions. Anything not listed keeps the current state. */
export const TRANSITIONS: Record<AgentState, Partial<Record<AgentEvent, AgentState>>> = {
  idle: { LISTEN: 'listening', THINK: 'thinking', BUILD: 'compiling', SPEAK: 'speaking', CHEF: 'chef' },
  listening: { FINISH: 'idle', THINK: 'thinking', BUILD: 'compiling', SPEAK: 'speaking', CHEF: 'chef' },
  thinking: { FINISH: 'idle', LISTEN: 'listening', BUILD: 'compiling', SPEAK: 'speaking', CHEF: 'chef' },
  compiling: { FINISH: 'idle', LISTEN: 'listening', THINK: 'thinking', SPEAK: 'speaking', CHEF: 'chef' },
  speaking: { FINISH: 'idle', LISTEN: 'listening', THINK: 'thinking', BUILD: 'compiling', CHEF: 'chef' },
  chef: { FINISH: 'idle', LISTEN: 'listening', THINK: 'thinking', BUILD: 'compiling', SPEAK: 'speaking' },
}

/** The event that a UI control for a given state should send. */
export const STATE_EVENT: Record<AgentState, AgentEvent> = {
  idle: 'FINISH',
  listening: 'LISTEN',
  thinking: 'THINK',
  compiling: 'BUILD',
  speaking: 'SPEAK',
  chef: 'CHEF',
}

export function transition(state: AgentState, event: AgentEvent): AgentState {
  return TRANSITIONS[state][event] ?? state
}

export type Machine = {
  readonly state: AgentState
  send(event: AgentEvent): AgentState
  /** `again` is true when the event re-entered the current state (CHEF while in chef = swap). */
  subscribe(fn: (state: AgentState, again?: boolean) => void): () => void
}

export function createMachine(initial: AgentState = 'idle'): Machine {
  let current = initial
  const listeners = new Set<(s: AgentState, again?: boolean) => void>()
  return {
    get state() {
      return current
    },
    send(event) {
      const next = transition(current, event)
      if (next !== current) {
        current = next
        listeners.forEach((fn) => fn(next))
      } else if (event === 'CHEF' && current === 'chef') {
        listeners.forEach((fn) => fn(next, true)) // another chef: swap
      }
      return current
    },
    subscribe(fn) {
      listeners.add(fn)
      return () => listeners.delete(fn)
    },
  }
}

export function isAgentState(v: unknown): v is AgentState {
  return typeof v === 'string' && (AGENT_STATES as string[]).includes(v)
}
