import { SNIPPET_DURATION_SECONDS } from '@/lib/playerLogic'
import type { Player, RoomState } from '@/types/game'

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
