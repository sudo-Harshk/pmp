import { describe, expect, it } from 'vitest'
import {
  buildPlayAgainReset,
  removePlayer,
  resetPlayersForPlayAgain,
} from '@/lib/roomLifecycle'
import { SNIPPET_DURATION_SECONDS } from '@/lib/playerLogic'
import type { Player } from '@/types/game'

function makePlayer(id: string, name: string, score = 0): Player {
  return { id, name, score, hasSubmitted: true, bestRound: 5 }
}

// WHITE-BOX: branch coverage
describe('WHITE-BOX: resetPlayersForPlayAgain branches', () => {
  it('branch: resets score/hasSubmitted/bestRound, keeps id+name', () => {
    const players: Record<string, Player> = {
      p1: makePlayer('p1', 'Alice', 30),
      p2: makePlayer('p2', 'Bob', 10),
    }
    const reset = resetPlayersForPlayAgain(players)
    expect(reset.p1).toEqual({ id: 'p1', name: 'Alice', score: 0, hasSubmitted: false, bestRound: 0 })
    expect(reset.p2).toEqual({ id: 'p2', name: 'Bob', score: 0, hasSubmitted: false, bestRound: 0 })
  })
  it('branch: empty players → empty', () => {
    expect(resetPlayersForPlayAgain({})).toEqual({})
  })
  it('branch: does not mutate input', () => {
    const players: Record<string, Player> = { p1: makePlayer('p1', 'Alice', 30) }
    resetPlayersForPlayAgain(players)
    expect(players.p1.score).toBe(30)
    expect(players.p1.hasSubmitted).toBe(true)
  })
})

describe('WHITE-BOX: removePlayer branches', () => {
  it('branch: others remain → returns map without leaver', () => {
    const players: Record<string, Player> = {
      p1: makePlayer('p1', 'Alice'),
      p2: makePlayer('p2', 'Bob'),
    }
    const next = removePlayer(players, 'p1')
    expect(next).not.toBeNull()
    expect(Object.keys(next!)).toEqual(['p2'])
  })
  it('branch: last player leaves → null (room should be deleted)', () => {
    const players: Record<string, Player> = { p1: makePlayer('p1', 'Alice') }
    expect(removePlayer(players, 'p1')).toBeNull()
  })
  it('branch: unknown id on empty → null', () => {
    expect(removePlayer({}, 'ghost')).toBeNull()
  })
  it('branch: unknown id with others → map unchanged', () => {
    const players: Record<string, Player> = { p1: makePlayer('p1', 'Alice') }
    const next = removePlayer(players, 'ghost')
    expect(Object.keys(next!)).toEqual(['p1'])
  })
})

describe('WHITE-BOX: buildPlayAgainReset branches', () => {
  it('branch: full reset shape, players reset', () => {
    const players: Record<string, Player> = { p1: makePlayer('p1', 'Alice', 42) }
    const reset = buildPlayAgainReset(players)
    expect(reset.status).toBe('LOBBY')
    expect(reset.tracks).toEqual([])
    expect(reset.submissions).toBeNull()
    expect(reset.guesses).toEqual({})
    expect(reset.scoreDeltas).toBeNull()
    expect(reset.currentTrackIndex).toBe(0)
    expect(reset.timerSeconds).toBe(SNIPPET_DURATION_SECONDS)
    expect(reset.roundStartTime).toBeNull()
    expect(reset.playbackPaused).toBe(false)
    expect(reset.players.p1.score).toBe(0)
    expect(reset.players.p1.name).toBe('Alice')
  })
})

// BLACK-BOX: spec
describe('BLACK-BOX: room lifecycle spec', () => {
  it('rematch keeps roster, zeroes everything else', () => {
    const players: Record<string, Player> = {
      p1: makePlayer('p1', 'Alice', 30),
      p2: makePlayer('p2', 'Bob', 10),
    }
    const reset = buildPlayAgainReset(players)
    expect(Object.keys(reset.players).sort()).toEqual(['p1', 'p2'])
    expect(Object.values(reset.players).every((p) => p.score === 0)).toBe(true)
    expect(reset.status).toBe('LOBBY')
  })
  it('last leave deletes room, non-last leave keeps it', () => {
    const solo: Record<string, Player> = { p1: makePlayer('p1', 'Alice') }
    const group: Record<string, Player> = {
      p1: makePlayer('p1', 'Alice'),
      p2: makePlayer('p2', 'Bob'),
    }
    expect(removePlayer(solo, 'p1')).toBeNull()
    expect(removePlayer(group, 'p1')).not.toBeNull()
  })
})
