import { describe, expect, it } from 'vitest'
import { calculateRoundScores } from '@/lib/scoring'
import type { PlaylistTrack, Player } from '@/types/game'

function makePlayer(id: string, name: string): Player {
  return { id, name, score: 0 }
}

const players: Record<string, Player> = {
  pAlice: makePlayer('pAlice', 'Alice'),
  pBob: makePlayer('pBob', 'Bob'),
  pCarol: makePlayer('pCarol', 'Carol'),
  pDave: makePlayer('pDave', 'Dave'),
  pEve: makePlayer('pEve', 'Eve'),
  pFrank: makePlayer('pFrank', 'Frank'),
}

function track(submittedBy: string[]): PlaylistTrack {
  return { videoId: 'aaaaaaaaaaa', submittedBy, played: false }
}

describe('calculateRoundScores — single submitter', () => {
  const t = track(['Alice'])

  it('awards +10 to a correct guesser', () => {
    const guesses = { pBob: 'Alice' }
    const { scores, deltas } = calculateRoundScores(t, guesses, {}, players)
    expect(deltas.pBob).toBe(10)
    expect(scores.pBob).toBe(10)
  })

  it('awards +5 submitter bonus for each incorrect guesser', () => {
    const guesses = { pBob: 'Carol', pDave: 'Eve' }
    const { scores, deltas } = calculateRoundScores(t, guesses, {}, players)
    expect(deltas.pAlice).toBe(10) // 2 incorrect guessers x 5
    expect(scores.pAlice).toBe(10)
    expect(deltas.pBob).toBe(0)
  })
})

describe('calculateRoundScores — duplicate submitters', () => {
  const t = track(['Alice', 'Bob'])

  it('splits submitter bonus equally between both submitters', () => {
    const guesses = { pCarol: 'Frank' } // 1 incorrect guesser
    const { scores, deltas } = calculateRoundScores(t, guesses, {}, players)
    expect(deltas.pAlice).toBe(3) // 5 / 2 -> 3 and 2
    expect(deltas.pBob).toBe(2)
    expect(scores.pAlice).toBe(3)
    expect(scores.pBob).toBe(2)
  })

  it('awards correct-guess points per correct guesser', () => {
    const guesses = { pCarol: 'Alice', pDave: 'Bob' }
    const { deltas } = calculateRoundScores(t, guesses, {}, players)
    expect(deltas.pCarol).toBe(10)
    expect(deltas.pDave).toBe(10)
    // No incorrect guessers -> submitters get no bonus delta
    expect(deltas.pAlice).toBeUndefined()
    expect(deltas.pBob).toBeUndefined()
  })
})

describe('calculateRoundScores — all-correct guesses', () => {
  it('gives no submitter bonus when every guess is correct', () => {
    const t = track(['Alice'])
    const guesses = { pBob: 'Alice', pCarol: 'Alice' }
    const { deltas } = calculateRoundScores(t, guesses, {}, players)
    expect(deltas.pBob).toBe(10)
    expect(deltas.pCarol).toBe(10)
    expect(deltas.pAlice).toBeUndefined()
  })
})

describe('calculateRoundScores — zero-correct guesses', () => {
  const t = track(['Alice'])

  it('gives no guesser points, full bonus to the single submitter', () => {
    const guesses = { pBob: 'Carol', pDave: 'Eve', pFrank: 'Dave' }
    const { scores, deltas } = calculateRoundScores(t, guesses, {}, players)
    expect(deltas.pBob).toBe(0)
    expect(deltas.pDave).toBe(0)
    expect(deltas.pFrank).toBe(0)
    expect(deltas.pAlice).toBe(15) // 3 incorrect guessers x 5
    expect(scores.pAlice).toBe(15)
  })
})

describe('calculateRoundScores — accumulates from current scores', () => {
  it('adds deltas onto existing scores', () => {
    const t = track(['Alice'])
    const guesses = { pBob: 'Alice' }
    const current = { pBob: 20, pAlice: 5 }
    const { scores } = calculateRoundScores(t, guesses, current, players)
    expect(scores.pBob).toBe(30)
    expect(scores.pAlice).toBe(5) // no incorrect guessers
  })

  it('keeps players with no participation unchanged', () => {
    const t = track(['Alice'])
    const guesses = { pBob: 'Alice' }
    const current = { pHidden: 7 }
    const { scores } = calculateRoundScores(t, guesses, current, players)
    expect(scores.pHidden).toBe(7)
  })
})

describe('calculateRoundScores — edge cases', () => {
  it('handles empty guesses', () => {
    const t = track(['Alice'])
    const { scores, deltas } = calculateRoundScores(t, guessesEmpty(), {}, players)
    expect(scores).toEqual({})
    expect(deltas).toEqual({})
  })

  it('handles an empty players record without crashing', () => {
    const t = track(['Alice'])
    const guesses = { pBob: 'Carol' }
    expect(() => calculateRoundScores(t, guesses, {}, {})).not.toThrow()
  })
})

function guessesEmpty(): Record<string, string> {
  return {}
}
