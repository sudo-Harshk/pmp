import { SNIPPET_DURATION_SECONDS } from '@/lib/playerLogic'
import type { Player, RoomState } from '@/types/game'

export const MIN_SONGS_PER_PLAYER = 1
export const MAX_SONGS_PER_PLAYER = 10
export const DEFAULT_SONGS_PER_PLAYER = 3

/** Clamp any input to a valid per-player song count (1–10, default 3). */
export function clampSongCount(n: unknown): number {
  if (typeof n !== 'number' || !Number.isFinite(n)) return DEFAULT_SONGS_PER_PLAYER
  return Math.min(MAX_SONGS_PER_PLAYER, Math.max(MIN_SONGS_PER_PLAYER, Math.floor(n)))
}

/** Keep only the first `count` items — devtools-proof submission backstop. */
export function limitUrls<T>(items: T[], count: number): T[] {
  return items.slice(0, clampSongCount(count))
}

/** True only when the submission has exactly the required count. */
export function hasExactCount(validCount: number, required: number): boolean {
  return validCount === clampSongCount(required)
}

/** Reset every player's score/ready state for a rematch, keeping id + name. */
export function resetPlayersForPlayAgain(
  players: Record<string, Player>,
): Record<string, Player> {
  const reset: Record<string, Player> = {}
  for (const [id, p] of Object.entries(players)) {
    reset[id] = { ...p, id, score: 0, hasSubmitted: false, bestRound: 0 }
  }
  return reset
}

/** Remove one player; returns null when nobody remains (room should be deleted). */
export function removePlayer(
  players: Record<string, Player>,
  playerId: string,
): Record<string, Player> | null {
  const next = { ...players }
  delete next[playerId]
  return Object.keys(next).length === 0 ? null : next
}

export interface PlayAgainReset {
  status: RoomState['status']
  tracks: RoomState['tracks']
  submissions: null
  guesses: Record<string, string>
  scoreDeltas: null
  currentTrackIndex: number
  timerSeconds: number
  roundStartTime: null
  playbackPaused: boolean
  players: Record<string, Player>
}

/** True when the name is already taken (trimmed, case-insensitive). */
export function isNameTaken(players: Record<string, Player>, name: string): boolean {
  const wanted = name.trim().toLowerCase()
  if (wanted.length === 0) return false
  return Object.values(players).some((p) => p.name.trim().toLowerCase() === wanted)
}

/** Field reset applied by host Play Again — preserves code/name/host/mode. */
export function buildPlayAgainReset(players: Record<string, Player>): PlayAgainReset {
  return {
    status: 'LOBBY',
    tracks: [],
    submissions: null,
    guesses: {},
    scoreDeltas: null,
    currentTrackIndex: 0,
    timerSeconds: SNIPPET_DURATION_SECONDS,
    roundStartTime: null,
    playbackPaused: false,
    players: resetPlayersForPlayAgain(players),
  }
}

export interface JoinResult {
  /** Normalized room code (trimmed, uppercased) — the ONLY value routing may use. */
  roomCode: string
  /** Player identity — session storage only, never a routing value. */
  playerId: string
}

/**
 * Normalize a successful join into session values.
 * The resolved `roomCode` is what `onEntered`/`setRoomCode` must receive so the
 * listener subscribes to `rooms/{roomCode}`; returning the `playerId` instead
 * routes to a nonexistent node and bounces the joiner back home.
 */
export function buildJoinResult(code: string, playerId: string): JoinResult {
  return { roomCode: code.trim().toUpperCase(), playerId }
}
