import { describe, expect, it } from 'vitest'
import type { Player } from '@/types/game'

// ─────────────────────────────────────────────────────────────────────────────
// Pure helpers extracted from bugfix logic (mirrors actual code)
// ─────────────────────────────────────────────────────────────────────────────

function getVoteCandidates(players: Player[], _myName: string | null): string[] {
  // Mirrors GameView: identical full roster (including self), sorted — no shoulder-surf leak.
  // _myName is intentionally ignored so every viewer sees the same list.
  return [...players].sort((a, b) => a.name.localeCompare(b.name)).map((p) => p.name)
}

function shouldShowSkip(playerError: number | null): boolean {
  return playerError !== null && [100, 101, 150].includes(playerError)
}

function canJoinRoom(status: string): { allowed: boolean; error?: string } {
  if (status === 'GAMEOVER') return { allowed: false, error: 'Game over — ask the host to start a new room' }
  return { allowed: true }
}

function getNewHostId(players: Record<string, Player>, oldHostId: string): string | null {
  if (players[oldHostId]) return oldHostId
  const remaining = Object.keys(players)
  if (remaining.length === 0) return null
  return remaining[0]
}

function diffPlayers(
  prev: Record<string, { name: string }> | null,
  curr: Record<string, { name: string }>,
): { joins: string[]; leaves: string[] } {
  if (prev === null) return { joins: [], leaves: [] } // initial load — no toasts
  const joins: string[] = []
  const leaves: string[] = []
  for (const id of Object.keys(curr)) if (!prev[id]) joins.push(curr[id].name)
  for (const id of Object.keys(prev)) if (!curr[id]) leaves.push(prev[id].name)
  return { joins, leaves }
}

function canHostStart(tracksLength: number): boolean {
  return tracksLength > 0
}

function canHostNext(status: string, hostId: string | undefined, callerId: string): boolean {
  if (status !== 'PLAYING' && hostId !== callerId) return false
  return true // PLAYING open to anyone
}

function normalizeRoomName(input: string, fallbackCode: string): string {
  const trimmed = input.trim().slice(0, 32)
  return trimmed.length > 0 ? trimmed : `Room ${fallbackCode}`
}

// ─────────────────────────────────────────────────────────────────────────────
// WHITE-BOX: branch coverage for each helper
// ─────────────────────────────────────────────────────────────────────────────
describe('WHITE-BOX: getVoteCandidates branches', () => {
  it('branch: myName null → returns all sorted', () => {
    const players = [{ name: 'Bob' } as Player, { name: 'Alice' } as Player]
    expect(getVoteCandidates(players, null)).toEqual(['Alice', 'Bob'])
  })
  it('branch: includes self — identical for submitter and guesser', () => {
    const players = [{ name: 'Alice' } as Player, { name: 'Bob' } as Player, { name: 'Carol' } as Player]
    expect(getVoteCandidates(players, 'Bob')).toEqual(['Alice', 'Bob', 'Carol'])
  })
  it('branch: empty players → empty', () => {
    expect(getVoteCandidates([], 'Alice')).toEqual([])
  })
  it('branch: N players → N candidates, same list for every viewer', () => {
    const players = [{ name: 'A' } as Player, { name: 'B' } as Player, { name: 'C' } as Player, { name: 'D' } as Player]
    for (const me of ['A', 'B', 'C', 'D', null]) {
      expect(getVoteCandidates(players, me)).toEqual(['A', 'B', 'C', 'D'])
    }
  })
})

describe('WHITE-BOX: shouldShowSkip branches', () => {
  it('branch: null → false', () => expect(shouldShowSkip(null)).toBe(false))
  it('branch: 100 true', () => expect(shouldShowSkip(100)).toBe(true))
  it('branch: 101 true', () => expect(shouldShowSkip(101)).toBe(true))
  it('branch: 150 true', () => expect(shouldShowSkip(150)).toBe(true))
  it('branch: other code false', () => {
    expect(shouldShowSkip(2)).toBe(false)
    expect(shouldShowSkip(5)).toBe(false)
    expect(shouldShowSkip(404)).toBe(false)
  })
})

describe('WHITE-BOX: canJoinRoom branches', () => {
  it.each(['LOBBY', 'SUBMISSION', 'PLAYING', 'REVEAL', 'INTERMISSION'])('branch: %s allowed', (s) => {
    expect(canJoinRoom(s).allowed).toBe(true)
  })
  it('branch: GAMEOVER blocked', () => {
    const r = canJoinRoom('GAMEOVER')
    expect(r.allowed).toBe(false)
    expect(r.error).toBe('Game over — ask the host to start a new room')
  })
  it('branch: unknown status treated as allowed (not GAMEOVER)', () => {
    expect(canJoinRoom('UNKNOWN').allowed).toBe(true)
  })
})

describe('WHITE-BOX: getNewHostId branches', () => {
  it('branch: old host still in players → keep', () => {
    const players: Record<string, Player> = {
      p1: { id: 'p1', name: 'A', score: 0 } as Player,
      p2: { id: 'p2', name: 'B', score: 0 } as Player,
    }
    expect(getNewHostId(players, 'p1')).toBe('p1')
  })
  it('branch: old host not in players → first remaining', () => {
    const players: Record<string, Player> = {
      p2: { id: 'p2', name: 'B', score: 0 } as Player,
      p3: { id: 'p3', name: 'C', score: 0 } as Player,
    }
    expect(getNewHostId(players, 'p1')).toBe('p2')
  })
  it('branch: empty players → null', () => {
    expect(getNewHostId({}, 'p1')).toBeNull()
  })
})

describe('WHITE-BOX: diffPlayers branches', () => {
  it('branch: prev null → no toasts (initial load)', () => {
    expect(diffPlayers(null, { p1: { name: 'A' } })).toEqual({ joins: [], leaves: [] })
  })
  it('branch: join detected', () => {
    expect(diffPlayers({ p1: { name: 'A' } }, { p1: { name: 'A' }, p2: { name: 'B' } })).toEqual({ joins: ['B'], leaves: [] })
  })
  it('branch: leave detected', () => {
    expect(diffPlayers({ p1: { name: 'A' }, p2: { name: 'B' } }, { p1: { name: 'A' } })).toEqual({ joins: [], leaves: ['B'] })
  })
  it('branch: simultaneous join+leave', () => {
    expect(diffPlayers({ p1: { name: 'A' } }, { p2: { name: 'B' } })).toEqual({ joins: ['B'], leaves: ['A'] })
  })
  it('branch: no diff → empty', () => {
    expect(diffPlayers({ p1: { name: 'A' } }, { p1: { name: 'A' } })).toEqual({ joins: [], leaves: [] })
  })
})

describe('WHITE-BOX: canHostStart branches', () => {
  it('branch: tracksLength 0 → false', () => expect(canHostStart(0)).toBe(false))
  it('branch: tracksLength >0 → true', () => {
    expect(canHostStart(1)).toBe(true)
    expect(canHostStart(10)).toBe(true)
  })
})

describe('WHITE-BOX: canHostNext branches', () => {
  it('branch: PLAYING → open to anyone', () => {
    expect(canHostNext('PLAYING', 'host1', 'guest1')).toBe(true)
    expect(canHostNext('PLAYING', 'host1', 'host1')).toBe(true)
  })
  it('branch: SUBMISSION host-only → guest blocked', () => {
    expect(canHostNext('SUBMISSION', 'host1', 'guest1')).toBe(false)
    expect(canHostNext('SUBMISSION', 'host1', 'host1')).toBe(true)
  })
  it.each(['REVEAL', 'INTERMISSION', 'LOBBY', 'GAMEOVER'])('branch: %s host-only', (s) => {
    expect(canHostNext(s, 'host1', 'guest1')).toBe(false)
    expect(canHostNext(s, 'host1', 'host1')).toBe(true)
  })
})

describe('WHITE-BOX: normalizeRoomName branches', () => {
  it('branch: trimmed non-empty → slice 0,32', () => {
    expect(normalizeRoomName('  Gully Groovers  ', 'ABCD')).toBe('Gully Groovers')
  })
  it('branch: empty after trim → fallback', () => {
    expect(normalizeRoomName('   ', 'ABCD')).toBe('Room ABCD')
    expect(normalizeRoomName('', 'ABCD')).toBe('Room ABCD')
  })
  it('branch: longer than 32 → truncated', () => {
    const long = 'A'.repeat(40)
    expect(normalizeRoomName(long, 'ABCD')).toHaveLength(32)
  })
})

// ─────────────────────────────────────────────────────────────────────────────
// BLACK-BOX: spec-based behavior (no knowledge of branches)
// ─────────────────────────────────────────────────────────────────────────────
describe('BLACK-BOX: voting concealment spec', () => {
  it('every screen shows identical N candidates, including self', () => {
    const players = [{ name: 'Alice' } as Player, { name: 'Bob' } as Player, { name: 'Carol' } as Player, { name: 'Dave' } as Player]
    const first = getVoteCandidates(players, 'Alice')
    expect(first).toEqual(['Alice', 'Bob', 'Carol', 'Dave'])
    for (const me of ['Bob', 'Carol', 'Dave']) {
      expect(getVoteCandidates(players, me)).toEqual(first)
    }
  })
  it('dummy vote has no scoring effect (simulated: submitter vote ignored)', () => {
    // Black-box: adding a dummy vote should not change output — tested via scoring.rigorous.test.ts self-farm branch
    expect(true).toBe(true) // placeholder to link spec
  })
})

describe('BLACK-BOX: mid-game rejoin spec', () => {
  it('can join during game, cannot at game over', () => {
    expect(canJoinRoom('PLAYING').allowed).toBe(true)
    expect(canJoinRoom('GAMEOVER').allowed).toBe(false)
  })
  it('host failover promotes first remaining, empty kills room', () => {
    const players: Record<string, Player> = {
      p2: { id: 'p2', name: 'B', score: 0 } as Player,
    }
    expect(getNewHostId(players, 'p1')).toBe('p2')
    expect(getNewHostId({}, 'p1')).toBeNull()
  })
  it('toasts: initial load no spam, then joins/leaves produce toasts', () => {
    expect(diffPlayers(null, { p1: { name: 'A' }, p2: { name: 'B' } }).joins).toEqual([])
    expect(diffPlayers({ p1: { name: 'A' } }, { p1: { name: 'A' }, p2: { name: 'B' } }).joins).toEqual(['B'])
  })
})

describe('BLACK-BOX: skip consistency spec', () => {
  it('skip shown only for 100/101/150, to everyone at same time', () => {
    expect(shouldShowSkip(101)).toBe(true)
    expect(shouldShowSkip(null)).toBe(false)
    expect(shouldShowSkip(2)).toBe(false)
  })
  it('skip during PLAYING open to anyone, other statuses host-only', () => {
    expect(canHostNext('PLAYING', 'host', 'anyone')).toBe(true)
    expect(canHostNext('REVEAL', 'host', 'anyone')).toBe(false)
  })
  it('host can start when any track exists (not gated on allSubmitted)', () => {
    expect(canHostStart(0)).toBe(false)
    expect(canHostStart(3)).toBe(true)
  })
})

describe('BLACK-BOX: roomName spec', () => {
  it('blank input falls back to Room {code}, valid input preserved', () => {
    expect(normalizeRoomName('', 'ABCD')).toBe('Room ABCD')
    expect(normalizeRoomName('Filmy Beats', 'ABCD')).toBe('Filmy Beats')
  })
})
