import { describe, expect, it } from 'vitest'
import {
  createInitialSnippetState,
  getNextTrackIndex,
  getPreviousTrackIndex,
  INTERMISSION_DURATION_SECONDS,
  JUKEBOX_MAX_SECONDS,
  navigateJukebox,
  snippetReducer,
  SNIPPET_DURATION_SECONDS,
} from '@/lib/playerLogic'

describe('snippetReducer — timer transitions', () => {
  it('starts with the full 30-second duration and not running', () => {
    const state = createInitialSnippetState()
    expect(state.secondsRemaining).toBe(SNIPPET_DURATION_SECONDS)
    expect(state.secondsRemaining).toBe(30)
    expect(state.running).toBe(false)
  })

  it('does not tick while paused', () => {
    let state = createInitialSnippetState()
    state = snippetReducer(state, { type: 'TICK' })
    expect(state.secondsRemaining).toBe(30)
    expect(state.running).toBe(false)
  })

  it('decrements by one per tick once started', () => {
    let state = snippetReducer(createInitialSnippetState(), { type: 'START' })
    state = snippetReducer(state, { type: 'TICK' })
    state = snippetReducer(state, { type: 'TICK' })
    state = snippetReducer(state, { type: 'TICK' })
    expect(state.secondsRemaining).toBe(27)
    expect(state.running).toBe(true)
  })

  it('stops at zero and stops running when the countdown elapses', () => {
    let state = snippetReducer(createInitialSnippetState(), { type: 'START' })
    for (let i = 0; i < SNIPPET_DURATION_SECONDS; i++) {
      state = snippetReducer(state, { type: 'TICK' })
    }
    expect(state.secondsRemaining).toBe(0)
    expect(state.running).toBe(false)
  })

  it('clamps to zero even if additional ticks arrive after time is up', () => {
    let state = snippetReducer(createInitialSnippetState(), { type: 'START' })
    for (let i = 0; i < SNIPPET_DURATION_SECONDS + 5; i++) {
      state = snippetReducer(state, { type: 'TICK' })
    }
    expect(state.secondsRemaining).toBe(0)
    expect(state.running).toBe(false)
  })

  it('pauses the countdown without resetting the remaining seconds', () => {
    let state = snippetReducer(createInitialSnippetState(), { type: 'START' })
    state = snippetReducer(state, { type: 'TICK' })
    state = snippetReducer(state, { type: 'TICK' })
    state = snippetReducer(state, { type: 'PAUSE' })
    state = snippetReducer(state, { type: 'TICK' })
    expect(state.secondsRemaining).toBe(28)
    expect(state.running).toBe(false)
  })

  it('reset returns to full duration and stops running', () => {
    let state = snippetReducer(createInitialSnippetState(), { type: 'START' })
    state = snippetReducer(state, { type: 'TICK' })
    state = snippetReducer(state, { type: 'TICK' })
    state = snippetReducer(state, { type: 'RESET' })
    expect(state.secondsRemaining).toBe(SNIPPET_DURATION_SECONDS)
    expect(state.running).toBe(false)
  })

  it('reset accepts a custom duration', () => {
    let state = snippetReducer(createInitialSnippetState(10), { type: 'START' })
    state = snippetReducer(state, { type: 'RESET', duration: 15 })
    expect(state.secondsRemaining).toBe(15)
  })
})

describe('track boundary navigation', () => {
  const tracks = ['a', 'b', 'c']

  it('does not go below the first track', () => {
    expect(getPreviousTrackIndex(0)).toBe(0)
    expect(getPreviousTrackIndex(1)).toBe(0)
    expect(getPreviousTrackIndex(2)).toBe(1)
  })

  it('does not go beyond the last track', () => {
    expect(getNextTrackIndex(0, tracks.length)).toBe(1)
    expect(getNextTrackIndex(1, tracks.length)).toBe(2)
    expect(getNextTrackIndex(2, tracks.length)).toBe(2)
  })

  it('handles a single-track playlist at the boundary', () => {
    expect(getNextTrackIndex(0, 1)).toBe(0)
    expect(getPreviousTrackIndex(0)).toBe(0)
  })

  it('handles an empty playlist', () => {
    expect(getNextTrackIndex(0, 0)).toBe(0)
  })
})

describe('intermission and jukebox constants', () => {
  it('exposes a 7-second intermission duration', () => {
    expect(INTERMISSION_DURATION_SECONDS).toBe(7)
  })

  it('exposes a 180-second jukebox max duration', () => {
    expect(JUKEBOX_MAX_SECONDS).toBe(180)
  })
})

describe('navigateJukebox — casual mode navigation', () => {
  it('NEXT advances by one when not on the last track', () => {
    expect(navigateJukebox(0, 3, { type: 'NEXT' })).toEqual({
      currentTrackIndex: 1,
      finished: false,
    })
    expect(navigateJukebox(1, 3, { type: 'NEXT' })).toEqual({
      currentTrackIndex: 2,
      finished: false,
    })
  })

  it('NEXT on the last track signals finished', () => {
    expect(navigateJukebox(2, 3, { type: 'NEXT' })).toEqual({
      currentTrackIndex: 2,
      finished: true,
    })
  })

  it('PREV steps back by one and never signals finished', () => {
    expect(navigateJukebox(2, 3, { type: 'PREV' })).toEqual({
      currentTrackIndex: 1,
      finished: false,
    })
    expect(navigateJukebox(1, 3, { type: 'PREV' })).toEqual({
      currentTrackIndex: 0,
      finished: false,
    })
  })

  it('PREV clamps at the first track', () => {
    expect(navigateJukebox(0, 3, { type: 'PREV' })).toEqual({
      currentTrackIndex: 0,
      finished: false,
    })
  })

  it('NEXT on a single-track playlist signals finished', () => {
    expect(navigateJukebox(0, 1, { type: 'NEXT' })).toEqual({
      currentTrackIndex: 0,
      finished: true,
    })
  })

  it('PREV on a single-track playlist stays at zero', () => {
    expect(navigateJukebox(0, 1, { type: 'PREV' })).toEqual({
      currentTrackIndex: 0,
      finished: false,
    })
  })

  it('handles an empty playlist as finished regardless of nav', () => {
    expect(navigateJukebox(0, 0, { type: 'NEXT' })).toEqual({
      currentTrackIndex: 0,
      finished: true,
    })
    expect(navigateJukebox(0, 0, { type: 'PREV' })).toEqual({
      currentTrackIndex: 0,
      finished: true,
    })
  })

  it('resets to the first track when currentIndex is out of bounds', () => {
    expect(navigateJukebox(-1, 3, { type: 'NEXT' })).toEqual({
      currentTrackIndex: 0,
      finished: false,
    })
    expect(navigateJukebox(5, 3, { type: 'NEXT' })).toEqual({
      currentTrackIndex: 0,
      finished: false,
    })
    expect(navigateJukebox(5, 3, { type: 'PREV' })).toEqual({
      currentTrackIndex: 0,
      finished: false,
    })
  })
})
