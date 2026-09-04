export interface Submission {
  youtubeUrl: string
  submittedBy: string
}

export interface PlaylistTrack {
  videoId: string
  submittedBy: string[]
  played: boolean
}

export interface Player {
  id: string
  name: string
  score: number
  hasSubmitted?: boolean
}

export type RoomStatus = 'LOBBY' | 'SUBMISSION' | 'PLAYING' | 'REVEAL' | 'GAMEOVER'

export type RoomRole = 'host' | 'client'

export interface Guess {
  playerId: string
  playerName: string
  guessedName: string
}

export interface ScoreDelta {
  playerId: string
  playerName: string
  delta: number
  reason: 'correct-guess' | 'submitter-bonus' | 'none'
}

export interface RoomState {
  roomCode: string
  status: RoomStatus
  hostId: string
  players: Record<string, Player>
  tracks: PlaylistTrack[]
  currentTrackIndex: number
  timerSeconds: number
  guesses: Record<string, string>
  scoreDeltas?: ScoreDelta[]
  createdAt?: number
}
