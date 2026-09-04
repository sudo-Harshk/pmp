export const SNIPPET_DURATION_SECONDS = 30

export interface SnippetState {
  secondsRemaining: number
  running: boolean
}

export type SnippetAction =
  | { type: 'START' }
  | { type: 'PAUSE' }
  | { type: 'TICK' }
  | { type: 'RESET'; duration?: number }

export function createInitialSnippetState(duration: number = SNIPPET_DURATION_SECONDS): SnippetState {
  return { secondsRemaining: duration, running: false }
}

export function snippetReducer(state: SnippetState, action: SnippetAction): SnippetState {
  switch (action.type) {
    case 'START':
      return { ...state, running: true }
    case 'PAUSE':
      return { ...state, running: false }
    case 'TICK':
      if (!state.running) return state
      const next = state.secondsRemaining - 1
      if (next <= 0) {
        return { secondsRemaining: 0, running: false }
      }
      return { ...state, secondsRemaining: next }
    case 'RESET':
      return {
        secondsRemaining: action.duration ?? SNIPPET_DURATION_SECONDS,
        running: false,
      }
    default:
      return state
  }
}

export enum SnippetTimeoutEvent {
  TIME_UP = 'TIME_UP',
}

export function getPreviousTrackIndex(currentIndex: number): number {
  return currentIndex <= 0 ? 0 : currentIndex - 1
}

export function getNextTrackIndex(currentIndex: number, trackCount: number): number {
  if (trackCount <= 0) return 0
  if (currentIndex >= trackCount - 1) return trackCount - 1
  return currentIndex + 1
}
