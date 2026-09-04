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
}

export type RoomStatus = 'LOBBY' | 'SUBMISSION' | 'PLAYING'

export interface RoomState {
  roomCode: string
  status: RoomStatus
  players: Record<string, Player>
  tracks: PlaylistTrack[]
}
