import { useCallback, useEffect, useRef, useState } from 'react'
import {
  get,
  onValue,
  ref,
  runTransaction,
  set,
  update,
  type DataSnapshot,
} from 'firebase/database'
import { db } from '@/lib/firebase'
import { extractVideoId, processSubmissions } from '@/lib/youtube'
import { calculateRoundScores } from '@/lib/scoring'
import { SNIPPET_DURATION_SECONDS } from '@/lib/playerLogic'
import type {
  PlaylistTrack,
  Player,
  RoomState,
  ScoreDelta,
  Submission,
} from '@/types/game'

const ROOM_CODE_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function generateRoomCode(): string {
  let code = ''
  for (let i = 0; i < 4; i++) {
    code += ROOM_CODE_CHARS[Math.floor(Math.random() * ROOM_CODE_CHARS.length)]
  }
  return code
}

function generateId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `id-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function normalizeUrl(url: string): string | null {
  const videoId = extractVideoId(url)
  return videoId ? `https://www.youtube.com/watch?v=${videoId}` : null
}

function computeTracks(
  submissions: Record<string, string[]>,
  players: Record<string, Player>,
): PlaylistTrack[] {
  const raw: Submission[] = []
  for (const [playerId, urls] of Object.entries(submissions)) {
    const name = players[playerId]?.name ?? playerId
    for (const url of urls) {
      raw.push({ youtubeUrl: url, submittedBy: name })
    }
  }
  return processSubmissions(raw)
}

function fromFirestoreRoom(value: unknown | null, roomCode: string): RoomState | null {
  if (!value || typeof value !== 'object') return null
  const data = value as Record<string, unknown>

  const rawPlayers = (data.players as Record<string, unknown>) ?? {}
  const players: Record<string, Player> = {}
  for (const [id, p] of Object.entries(rawPlayers)) {
    const player = p as Partial<Player>
    players[id] = {
      id: player.id ?? id,
      name: player.name ?? 'Unknown',
      score: typeof player.score === 'number' ? player.score : 0,
      hasSubmitted: player.hasSubmitted ?? false,
    }
  }

  return {
    roomCode,
    status: (data.status as RoomState['status']) ?? 'LOBBY',
    hostId: (data.hostId as string) ?? '',
    players,
    tracks: Array.isArray(data.tracks) ? (data.tracks as PlaylistTrack[]) : [],
    currentTrackIndex:
      typeof data.currentTrackIndex === 'number' ? data.currentTrackIndex : 0,
    timerSeconds:
      typeof data.timerSeconds === 'number' ? data.timerSeconds : SNIPPET_DURATION_SECONDS,
    guesses: (data.guesses as Record<string, string>) ?? {},
    scoreDeltas: Array.isArray(data.scoreDeltas) ? (data.scoreDeltas as ScoreDelta[]) : undefined,
    createdAt: typeof data.createdAt === 'number' ? data.createdAt : undefined,
  }
}

export interface UseRoomResult {
  room: RoomState | null
  myPlayerId: string | null
  isHost: boolean
  createRoom: (hostName: string) => Promise<{ roomCode: string; playerId: string }>
  joinRoom: (roomCode: string, playerName: string) => Promise<string>
  submitSongs: (roomCode: string, playerId: string, youtubeUrls: string[]) => Promise<void>
  submitGuess: (roomCode: string, playerId: string, guessedName: string) => Promise<void>
  startSubmission: (roomCode: string) => Promise<void>
  hostReveal: (roomCode: string) => Promise<void>
  hostNext: (roomCode: string) => Promise<void>
  updateGameState: (roomCode: string, updates: Partial<RoomState>) => Promise<void>
}

export function useRoom(roomCode?: string): UseRoomResult {
  const [room, setRoom] = useState<RoomState | null>(null)
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null)
  const roomRef = useRef(room)

  roomRef.current = room

  useEffect(() => {
    if (!roomCode) {
      setRoom(null)
      return
    }
    const roomRefInstance = ref(db, `rooms/${roomCode}`)
    const unsubscribe = onValue(
      roomRefInstance,
      (snapshot: DataSnapshot) => {
        setRoom(fromFirestoreRoom(snapshot.val(), roomCode))
      },
      (error: Error) => {
        console.error('Room listener error:', error)
        setRoom(null)
      },
    )
    return () => unsubscribe()
  }, [roomCode])

  const createRoom = useCallback(
    async (hostName: string): Promise<{ roomCode: string; playerId: string }> => {
      let code = generateRoomCode()
      let exists = (await get(ref(db, `rooms/${code}`))).exists()
      while (exists) {
        code = generateRoomCode()
        exists = (await get(ref(db, `rooms/${code}`))).exists()
      }

      const hostId = generateId()
      const createdAt = Date.now()
      const roomState: RoomState = {
        roomCode: code,
        status: 'LOBBY',
        hostId,
        players: { [hostId]: { id: hostId, name: hostName, score: 0, hasSubmitted: false } },
        tracks: [],
        currentTrackIndex: 0,
        timerSeconds: SNIPPET_DURATION_SECONDS,
        guesses: {},
        createdAt,
      }

      await set(ref(db, `rooms/${code}`), roomState)
      setMyPlayerId(hostId)
      return { roomCode: code, playerId: hostId }
    },
    [],
  )

  const joinRoom = useCallback(
    async (roomCodeInput: string, playerName: string): Promise<string> => {
      const code = roomCodeInput.trim().toUpperCase()
      const playerId = generateId()
      const snapshot = await get(ref(db, `rooms/${code}`))
      const current = fromFirestoreRoom(snapshot.val(), code)
      if (!current) {
        throw new Error('Room not found')
      }
      if (current.status !== 'LOBBY') {
        throw new Error('Room already in progress')
      }
      const player: Player = {
        id: playerId,
        name: playerName,
        score: 0,
        hasSubmitted: false,
      }
      await update(ref(db, `rooms/${code}/players`), { [playerId]: player })
      setMyPlayerId(playerId)
      return playerId
    },
    [],
  )

  const submitSongs = useCallback(
    async (code: string, playerId: string, youtubeUrls: string[]): Promise<void> => {
      const normalized = youtubeUrls
        .map(normalizeUrl)
        .filter((url): url is string => url !== null)

      await runTransaction(ref(db, `rooms/${code}`), (currentVal) => {
        if (currentVal === null) return currentVal
        const data = currentVal as Record<string, unknown>
        const submissions = (data.submissions as Record<string, string[]>) ?? {}
        submissions[playerId] = normalized
        const playersData = (data.players as Record<string, Player>) ?? {}
        const tracks = computeTracks(submissions, playersData)
        return {
          ...data,
          submissions,
          tracks,
          players: {
            ...playersData,
            [playerId]: { ...playersData[playerId], hasSubmitted: true },
          },
        }
      })
    },
    [],
  )

  const submitGuess = useCallback(
    async (code: string, playerId: string, guessedName: string): Promise<void> => {
      await update(ref(db, `rooms/${code}/guesses`), { [playerId]: guessedName })
    },
    [],
  )

  const startSubmission = useCallback(
    async (code: string): Promise<void> => {
      await update(ref(db, `rooms/${code}`), { status: 'SUBMISSION' })
    },
    [],
  )

  const hostReveal = useCallback(async (code: string): Promise<void> => {
    await runTransaction(ref(db, `rooms/${code}`), (currentVal) => {
      if (currentVal === null) return currentVal
      const data = currentVal as Record<string, unknown>
      const players = (data.players as Record<string, Player>) ?? {}
      const tracks = Array.isArray(data.tracks) ? (data.tracks as PlaylistTrack[]) : []
      const currentIndex = (data.currentTrackIndex as number) ?? 0
      const currentTrack = tracks[currentIndex]
      const guesses = (data.guesses as Record<string, string>) ?? {}

      if (!currentTrack) return currentVal

      const currentScores: Record<string, number> = {}
      for (const [id, player] of Object.entries(players)) {
        currentScores[id] = player.score ?? 0
      }

      const { scores, deltas } = calculateRoundScores(currentTrack, guesses, currentScores, players)

      const submitterNames = new Set(currentTrack.submittedBy)
      const scoreDeltas: ScoreDelta[] = Object.entries(deltas).map(([playerId, delta]) => {
        const isSubmitter = submitterNames.has(players[playerId]?.name ?? playerId)
        const reason =
          delta <= 0 ? 'none' : isSubmitter ? 'submitter-bonus' : 'correct-guess'
        return {
          playerId,
          playerName: players[playerId]?.name ?? playerId,
          delta,
          reason,
        }
      })

      const updatedPlayers: Record<string, Player> = {}
      for (const [id, player] of Object.entries(players)) {
        updatedPlayers[id] = { ...player, score: scores[id] ?? player.score ?? 0 }
      }

      const updatedTracks = tracks.map((t, i) =>
        i === currentIndex ? { ...t, played: true } : t,
      )

      return {
        ...data,
        status: 'REVEAL',
        players: updatedPlayers,
        tracks: updatedTracks,
        scoreDeltas,
        guesses,
      }
    })
  }, [])

  const hostNext = useCallback(async (code: string): Promise<void> => {
    await runTransaction(ref(db, `rooms/${code}`), (currentVal) => {
      if (currentVal === null) return currentVal
      const data = currentVal as Record<string, unknown>
      const tracks = Array.isArray(data.tracks) ? (data.tracks as PlaylistTrack[]) : []
      const currentIndex = (data.currentTrackIndex as number) ?? 0

      if (currentIndex + 1 < tracks.length) {
        return {
          ...data,
          status: 'PLAYING',
          currentTrackIndex: currentIndex + 1,
          timerSeconds: SNIPPET_DURATION_SECONDS,
          guesses: {},
          scoreDeltas: null,
        }
      }
      return { ...data, status: 'GAMEOVER', scoreDeltas: null }
    })
  }, [])

  const updateGameState = useCallback(
    async (code: string, updates: Partial<RoomState>): Promise<void> => {
      await update(ref(db, `rooms/${code}`), updates as Record<string, unknown>)
    },
    [],
  )

  const isHost = room !== null && myPlayerId !== null && room.hostId === myPlayerId

  return {
    room,
    myPlayerId,
    isHost,
    createRoom,
    joinRoom,
    submitSongs,
    submitGuess,
    startSubmission,
    hostReveal,
    hostNext,
    updateGameState,
  }
}
