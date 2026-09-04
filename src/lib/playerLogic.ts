export const SNIPPET_DURATION_SECONDS = 30
export const INTERMISSION_DURATION_SECONDS = 7
export const JUKEBOX_MAX_SECONDS = 180

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

export type JukeboxNav = { type: 'PREV' } | { type: 'NEXT' }

export interface JukeboxNavigationResult {
  currentTrackIndex: number
  finished: boolean
}

export function navigateJukebox(
  currentIndex: number,
  trackCount: number,
  nav: JukeboxNav,
): JukeboxNavigationResult {
  if (trackCount <= 0) return { currentTrackIndex: 0, finished: true }
  if (currentIndex < 0 || currentIndex >= trackCount) {
    return { currentTrackIndex: 0, finished: false }
  }
  if (nav.type === 'PREV') {
    return { currentTrackIndex: Math.max(0, currentIndex - 1), finished: false }
  }
  if (currentIndex >= trackCount - 1) {
    return { currentTrackIndex: currentIndex, finished: true }
  }
  return { currentTrackIndex: currentIndex + 1, finished: false }
}
