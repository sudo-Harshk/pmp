import { describe, expect, it } from 'vitest'
import {
  buildJoinResult,
  buildPlayAgainReset,
  clampSongCount,
  DEFAULT_SONGS_PER_PLAYER,
  hasExactCount,
  isNameTaken,
  limitUrls,
  MAX_SONGS_PER_PLAYER,
  MIN_SONGS_PER_PLAYER,
  partitionPlayable,
  removePlayer,
  resetPlayersForPlayAgain,
} from '@/lib/roomLifecycle'
import { SNIPPET_DURATION_SECONDS } from '@/lib/playerLogic'
import type { Player, PlaylistTrack } from '@/types/game'

function makeTrack(videoId: string, submittedBy: string[]): PlaylistTrack {
  return { videoId, submittedBy, played: false }
}

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

// WHITE-BOX: isNameTaken branches
describe('WHITE-BOX: isNameTaken branches', () => {
  const players: Record<string, Player> = {
    p1: makePlayer('p1', 'Alice'),
    p2: makePlayer('p2', 'Bob'),
  }

  it('branch: exact match → taken', () => {
    expect(isNameTaken(players, 'Alice')).toBe(true)
  })
  it('branch: case-insensitive match → taken', () => {
    expect(isNameTaken(players, 'alice')).toBe(true)
    expect(isNameTaken(players, 'ALICE')).toBe(true)
    expect(isNameTaken(players, 'bOb')).toBe(true)
  })
  it('branch: surrounding whitespace ignored → taken', () => {
    expect(isNameTaken(players, '  Alice  ')).toBe(true)
  })
  it('branch: distinct name → free', () => {
    expect(isNameTaken(players, 'Carol')).toBe(false)
  })
  it('branch: blank name → free (validated elsewhere)', () => {
    expect(isNameTaken(players, '')).toBe(false)
    expect(isNameTaken(players, '   ')).toBe(false)
  })
  it('branch: empty roster → free', () => {
    expect(isNameTaken({}, 'Alice')).toBe(false)
  })
  it('branch: stored name with whitespace still matches', () => {
    const messy: Record<string, Player> = { p1: makePlayer('p1', '  Alice  ') }
    expect(isNameTaken(messy, 'alice')).toBe(true)
  })
})

// BLACK-BOX: duplicate-name spec
describe('BLACK-BOX: duplicate-name spec', () => {
  it('second Alice blocked, first Alice and Carol pass', () => {
    const players: Record<string, Player> = { p1: makePlayer('p1', 'Alice') }
    expect(isNameTaken(players, 'Alice')).toBe(true)
    expect(isNameTaken(players, 'Carol')).toBe(false)
  })
})

// WHITE-BOX: clampSongCount branches
describe('WHITE-BOX: clampSongCount branches', () => {
  it('branch: valid int passes through', () => {
    expect(clampSongCount(5)).toBe(5)
    expect(clampSongCount(MIN_SONGS_PER_PLAYER)).toBe(MIN_SONGS_PER_PLAYER)
    expect(clampSongCount(MAX_SONGS_PER_PLAYER)).toBe(MAX_SONGS_PER_PLAYER)
  })
  it('branch: below min clamps to min', () => {
    expect(clampSongCount(0)).toBe(MIN_SONGS_PER_PLAYER)
    expect(clampSongCount(-3)).toBe(MIN_SONGS_PER_PLAYER)
  })
  it('branch: above max clamps to max', () => {
    expect(clampSongCount(11)).toBe(MAX_SONGS_PER_PLAYER)
    expect(clampSongCount(100)).toBe(MAX_SONGS_PER_PLAYER)
  })
  it('branch: fractions floor down', () => {
    expect(clampSongCount(4.9)).toBe(4)
  })
  it('branch: non-number/NaN/Infinity → default', () => {
    expect(clampSongCount(undefined)).toBe(DEFAULT_SONGS_PER_PLAYER)
    expect(clampSongCount(null)).toBe(DEFAULT_SONGS_PER_PLAYER)
    expect(clampSongCount('5')).toBe(DEFAULT_SONGS_PER_PLAYER)
    expect(clampSongCount(NaN)).toBe(DEFAULT_SONGS_PER_PLAYER)
    expect(clampSongCount(Infinity)).toBe(DEFAULT_SONGS_PER_PLAYER)
  })
})

// WHITE-BOX: limitUrls branches
describe('WHITE-BOX: limitUrls branches', () => {
  it('branch: extras truncated to count', () => {
    expect(limitUrls(['a', 'b', 'c', 'd', 'e'], 3)).toEqual(['a', 'b', 'c'])
  })
  it('branch: exact count kept whole', () => {
    expect(limitUrls(['a', 'b', 'c'], 3)).toEqual(['a', 'b', 'c'])
  })
  it('branch: short list passes through untouched', () => {
    expect(limitUrls(['a'], 3)).toEqual(['a'])
    expect(limitUrls([], 3)).toEqual([])
  })
  it('branch: garbage count falls back to default clamp', () => {
    expect(limitUrls(['a', 'b', 'c', 'd'], undefined as unknown as number)).toEqual(['a', 'b', 'c'])
  })
})

// WHITE-BOX: hasExactCount branches
describe('WHITE-BOX: hasExactCount branches', () => {
  it('branch: exact → true', () => {
    expect(hasExactCount(3, 3)).toBe(true)
  })
  it('branch: short or long → false', () => {
    expect(hasExactCount(2, 3)).toBe(false)
    expect(hasExactCount(4, 3)).toBe(false)
    expect(hasExactCount(0, 3)).toBe(false)
  })
  it('branch: required clamped before compare', () => {
    expect(hasExactCount(10, 99)).toBe(true)
    expect(hasExactCount(1, 0)).toBe(true)
  })
})

// BLACK-BOX: host-fixed count spec
describe('BLACK-BOX: host-fixed count spec', () => {
  it('submit button enables only at exactly N valid links', () => {
    expect(hasExactCount(5, 5)).toBe(true)
    expect(hasExactCount(4, 5)).toBe(false)
    expect(hasExactCount(6, 5)).toBe(false)
  })
  it('devtools oversubmit is truncated, never stored whole', () => {
    const stored = limitUrls(['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'], 5)
    expect(stored).toHaveLength(5)
    expect(stored).toEqual(['u1', 'u2', 'u3', 'u4', 'u5'])
  })
})

// WHITE-BOX: buildJoinResult branches
describe('WHITE-BOX: buildJoinResult branches', () => {
  it('branch: lowercase code uppercased', () => {
    expect(buildJoinResult('abcd', 'player-1')).toEqual({ roomCode: 'ABCD', playerId: 'player-1' })
  })
  it('branch: surrounding whitespace trimmed', () => {
    expect(buildJoinResult('  abcd  ', 'player-1')).toEqual({ roomCode: 'ABCD', playerId: 'player-1' })
  })
  it('branch: already-normalized code passes through', () => {
    expect(buildJoinResult('ABCD', 'player-1')).toEqual({ roomCode: 'ABCD', playerId: 'player-1' })
  })
  it('branch: mixed case normalized', () => {
    expect(buildJoinResult('aBcD', 'player-1')).toEqual({ roomCode: 'ABCD', playerId: 'player-1' })
  })
  it('branch: playerId preserved untouched (never normalized)', () => {
    const result = buildJoinResult('abcd', '  Mixed-Case-UUID-123  ')
    expect(result.playerId).toBe('  Mixed-Case-UUID-123  ')
    expect(result.roomCode).toBe('ABCD')
  })
})

// BLACK-BOX: join-routing regression spec (join bounced home)
describe('BLACK-BOX: join-routing regression spec', () => {
  it('resolved value is the room code, never the playerId', () => {
    // Regression: handleJoinRoom returned the playerId, so onEntered routed to
    // rooms/<uuid> (nonexistent) and the joiner bounced back to EntryView.
    const playerId = '550e8400-e29b-41d4-a716-446655440000'
    const result = buildJoinResult('abcd', playerId)
    const routedTo = result.roomCode // what onEntered/setRoomCode receives
    expect(routedTo).toBe('ABCD')
    expect(routedTo).not.toBe(playerId)
  })
  it('session stores normalized code with the untouched playerId', () => {
    const result = buildJoinResult(' abcd ', 'player-1')
    expect(result.roomCode).toBe('ABCD')
    expect(result.playerId).toBe('player-1')
  })
})

// WHITE-BOX: partitionPlayable branches
describe('WHITE-BOX: partitionPlayable branches', () => {
  it('branch: all-submitter track → unvotable (the 0-0 dead round)', () => {
    const tracks = [makeTrack('aaaaaaaaaaa', ['dmeo', 'le chelo'])]
    const { playable, unvotable } = partitionPlayable(tracks, ['dmeo', 'le chelo'])
    expect(playable).toEqual([])
    expect(unvotable).toHaveLength(1)
  })
  it('branch: track with any outsider → playable', () => {
    const tracks = [makeTrack('aaaaaaaaaaa', ['dmeo'])]
    const { playable, unvotable } = partitionPlayable(tracks, ['dmeo', 'le chelo'])
    expect(playable).toHaveLength(1)
    expect(unvotable).toEqual([])
  })
  it('branch: departed submitter names do not block eligibility', () => {
    const tracks = [makeTrack('aaaaaaaaaaa', ['dmeo', 'Ghost'])]
    const { playable } = partitionPlayable(tracks, ['dmeo', 'le chelo'])
    expect(playable).toHaveLength(1) // le chelo is live and not a submitter
  })
  it('branch: mixed playlist splits correctly, order preserved', () => {
    const tracks = [
      makeTrack('aaaaaaaaaaa', ['dmeo', 'le chelo']),
      makeTrack('bbbbbbbbbbb', ['dmeo']),
      makeTrack('ccccccccccc', ['le chelo']),
    ]
    const { playable, unvotable } = partitionPlayable(tracks, ['dmeo', 'le chelo'])
    expect(playable.map((t) => t.videoId)).toEqual(['bbbbbbbbbbb', 'ccccccccccc'])
    expect(unvotable.map((t) => t.videoId)).toEqual(['aaaaaaaaaaa'])
  })
  it('branch: empty tracks → both empty', () => {
    expect(partitionPlayable([], ['dmeo'])).toEqual({ playable: [], unvotable: [] })
  })
  it('branch: no live players → nothing marked unvotable', () => {
    const tracks = [makeTrack('aaaaaaaaaaa', ['dmeo'])]
    const { playable, unvotable } = partitionPlayable(tracks, [])
    expect(playable).toHaveLength(1)
    expect(unvotable).toEqual([])
  })
})

// BLACK-BOX: dead-round filter spec
describe('BLACK-BOX: dead-round filter spec', () => {
  it('same-link-both-players game yields zero playable tracks', () => {
    const tracks = [makeTrack('aaaaaaaaaaa', ['dmeo', 'le chelo'])]
    const { playable } = partitionPlayable(tracks, ['dmeo', 'le chelo'])
    expect(playable).toEqual([])
  })
  it('normal game keeps every track playable', () => {
    const tracks = [
      makeTrack('aaaaaaaaaaa', ['dmeo']),
      makeTrack('bbbbbbbbbbb', ['le chelo']),
    ]
    const { playable, unvotable } = partitionPlayable(tracks, ['dmeo', 'le chelo'])
    expect(playable).toHaveLength(2)
    expect(unvotable).toEqual([])
  })
})
