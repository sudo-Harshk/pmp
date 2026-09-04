import { describe, expect, it } from 'vitest'
import {
  createInitialSnippetState,
  getNextTrackIndex,
  getPreviousTrackIndex,
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
